import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-creator-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashPasswordScrypt(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `scrypt$16384$8$1$${salt}$${derived}`;
}

function verifyPasswordScrypt(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nStr, rStr, pStr, salt, expectedHex] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!salt || !expectedHex || !Number.isFinite(N)) return false;

  const actual = scryptSync(password, salt, 64, { N, r, p });
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function validatePasswordStrength(password: string): string | null {
  if (typeof password !== "string" || password.length < 10) {
    return "Password must be at least 10 characters long.";
  }
  if (password.length > 128) {
    return "Password must be 128 characters or fewer.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include uppercase, lowercase, and at least one number.";
  }
  return null;
}

function extractGoogleSub(
  user: {
    identities?: Array<{ provider?: string; id?: string; identity_data?: Record<string, unknown> }>;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  },
  jwtToken: string
): { googleSub: string | null; hasGoogleOAuthSession: boolean } {
  const googleIdentity = (user.identities || []).find((i) => i.provider === "google");
  const googleSub =
    (googleIdentity?.identity_data?.sub as string | undefined) ||
    googleIdentity?.id ||
    (user.user_metadata?.sub as string | undefined) ||
    null;

  let isOAuthAmr = false;
  try {
    const seg = jwtToken.split(".")[1];
    if (seg) {
      const b64 = seg.replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
      const claims = JSON.parse(atob(padded)) as { amr?: Array<{ method?: string }> };
      isOAuthAmr = Array.isArray(claims.amr) && claims.amr.some((a) => a.method === "oauth");
    }
  } catch {
    isOAuthAmr = false;
  }

  const providers = Array.isArray(user.app_metadata?.providers)
    ? (user.app_metadata?.providers as string[])
    : [];
  const hasGoogleIdentity = Boolean(googleIdentity) || providers.includes("google");

  return {
    googleSub: hasGoogleIdentity ? googleSub : null,
    hasGoogleOAuthSession:
      hasGoogleIdentity &&
      Boolean(googleSub) &&
      (isOAuthAmr || user.app_metadata?.provider === "google" || Boolean(googleIdentity)),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(500, { error: "Edge Function environment is not configured." });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Authentication required. Please sign in with Google." });
  }
  const jwtToken = authHeader.slice(7).trim();

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) {
    return json(401, { error: "Your session has expired or been revoked. Please sign in again." });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON request body." });
  }

  const action = String(payload.action || "");
  const { googleSub, hasGoogleOAuthSession } = extractGoogleSub(user, jwtToken);

  if (action === "check-username") {
    const username = String(payload.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      return json(400, {
        available: false,
        error: "Username must be 3-32 lowercase letters, numbers, or underscores.",
      });
    }
    const [{ data: c1 }, { data: c2 }] = await Promise.all([
      adminClient.from("creators").select("id").eq("username", username).maybeSingle(),
      adminClient.from("creator_auth_credentials").select("creator_id").eq("username", username).maybeSingle(),
    ]);
    const available = !c1 && !c2;
    return json(200, { available });
  }

  if (action === "enroll-creator") {
    if (!googleSub || !hasGoogleOAuthSession) {
      return json(403, { error: "An active Google-authenticated session is required to become a creator." });
    }

    const username = String(payload.username || "").trim().toLowerCase();
    const stageName = String(payload.stageName || user.user_metadata?.full_name || user.email?.split("@")[0] || "Creator")
      .trim()
      .slice(0, 120);
    const password = String(payload.password || "");
    const confirmPassword = String(payload.confirmPassword || "");
    const bio = typeof payload.bio === "string" ? payload.bio.trim().slice(0, 1500) : null;
    const country = typeof payload.country === "string" ? payload.country.trim().slice(0, 80) : null;
    const primaryGenre = typeof payload.primaryGenre === "string" ? payload.primaryGenre.trim().slice(0, 80) : null;

    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      return json(400, { error: "Username must be 3-32 lowercase letters, numbers, or underscores." });
    }
    if (stageName.length < 2) {
      return json(400, { error: "Stage name must be at least 2 characters." });
    }
    if (password !== confirmPassword) {
      return json(400, { error: "Password and confirmation password do not match." });
    }
    const strengthErr = validatePasswordStrength(password);
    if (strengthErr) {
      return json(400, { error: strengthErr });
    }

    const [{ data: existingCreator }, { data: existingUsername }] = await Promise.all([
      adminClient.from("creators").select("id").eq("user_id", user.id).maybeSingle(),
      adminClient.from("creators").select("id").eq("username", username).maybeSingle(),
    ]);

    if (existingCreator) {
      return json(409, { error: "This Google account is already enrolled as a Creator." });
    }
    if (existingUsername) {
      return json(409, { error: "This creator username is already taken." });
    }

    const { data: createdCreator, error: createErr } = await adminClient
      .from("creators")
      .insert({
        user_id: user.id,
        username,
        stage_name: stageName,
        bio,
        country,
        primary_genre: primaryGenre,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
        verification_status: "unverified",
        is_verified: false,
      })
      .select("*")
      .single();

    if (createErr || !createdCreator) {
      return json(500, { error: createErr?.message || "Failed to create creator account." });
    }

    const passwordHash = hashPasswordScrypt(password);
    const { error: credErr } = await adminClient.from("creator_auth_credentials").insert({
      creator_id: createdCreator.id,
      user_id: user.id,
      username,
      password_hash: passwordHash,
    });

    if (credErr) {
      await adminClient.from("creators").delete().eq("id", createdCreator.id);
      return json(500, { error: credErr.message || "Failed to secure creator credentials." });
    }

    const rawSessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await adminClient.from("creator_sessions").insert({
      creator_id: createdCreator.id,
      user_id: user.id,
      google_sub: googleSub,
      token_hash: sha256Hex(rawSessionToken),
      expires_at: expiresAt,
      user_agent: (req.headers.get("user-agent") || "").slice(0, 200),
    });

    return json(200, {
      creator: createdCreator,
      creatorSessionToken: rawSessionToken,
      expiresAt,
    });
  }

  if (action === "creator-login") {
    if (!googleSub || !hasGoogleOAuthSession) {
      return json(401, {
        error: "Active Google sign-in is required before signing in to Creator Studio.",
      });
    }

    const username = String(payload.username || "").trim().toLowerCase();
    const password = String(payload.password || "");
    if (!username || !password) {
      return json(400, { error: "Creator username and password are required." });
    }

    const { data: cred } = await adminClient
      .from("creator_auth_credentials")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (!cred) {
      return json(401, { error: "Invalid creator username or password." });
    }
    if (cred.user_id !== user.id) {
      return json(403, {
        error: "This creator username belongs to a different Google account.",
      });
    }

    if (cred.locked_until && new Date(cred.locked_until).getTime() > Date.now()) {
      return json(429, { error: "Too many failed creator login attempts. Please wait 15 minutes." });
    }

    const ok = verifyPasswordScrypt(password, cred.password_hash);
    if (!ok) {
      const nextFails = Number(cred.failed_attempts || 0) + 1;
      const lockedUntil = nextFails >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      await adminClient
        .from("creator_auth_credentials")
        .update({ failed_attempts: nextFails, locked_until: lockedUntil })
        .eq("creator_id", cred.creator_id);
      return json(401, { error: "Invalid creator username or password." });
    }

    await adminClient
      .from("creator_auth_credentials")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("creator_id", cred.creator_id);

    const { data: creator } = await adminClient
      .from("creators")
      .select("*")
      .eq("id", cred.creator_id)
      .single();

    if (!creator || creator.verification_status === "suspended") {
      return json(403, { error: "This creator account is currently suspended." });
    }

    const rawSessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await adminClient.from("creator_sessions").insert({
      creator_id: creator.id,
      user_id: user.id,
      google_sub: googleSub,
      token_hash: sha256Hex(rawSessionToken),
      expires_at: expiresAt,
      user_agent: (req.headers.get("user-agent") || "").slice(0, 200),
    });

    return json(200, {
      creator,
      creatorSessionToken: rawSessionToken,
      expiresAt,
    });
  }

  if (action === "verify-creator-session") {
    if (!googleSub || !hasGoogleOAuthSession) {
      return json(401, { valid: false, reason: "google_required" });
    }

    const token =
      req.headers.get("x-creator-session") ||
      (typeof payload.creatorSessionToken === "string" ? payload.creatorSessionToken : "");
    if (!token) {
      return json(401, { valid: false, reason: "creator_login_required" });
    }

    const tokenHash = sha256Hex(token);
    const { data: sessionRow } = await adminClient
      .from("creator_sessions")
      .select("*")
      .eq("token_hash", tokenHash)
      .eq("user_id", user.id)
      .eq("google_sub", googleSub)
      .is("revoked_at", null)
      .maybeSingle();

    if (!sessionRow || new Date(sessionRow.expires_at).getTime() <= Date.now()) {
      return json(401, { valid: false, reason: "creator_session_expired" });
    }

    const { data: creator } = await adminClient
      .from("creators")
      .select("*")
      .eq("id", sessionRow.creator_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!creator || creator.verification_status === "suspended") {
      return json(403, { valid: false, reason: "creator_suspended" });
    }

    return json(200, {
      valid: true,
      creator,
      expiresAt: sessionRow.expires_at,
    });
  }

  if (action === "creator-logout") {
    const token =
      req.headers.get("x-creator-session") ||
      (typeof payload.creatorSessionToken === "string" ? payload.creatorSessionToken : "");
    const nowIso = new Date().toISOString();
    if (token) {
      await adminClient
        .from("creator_sessions")
        .update({ revoked_at: nowIso })
        .eq("token_hash", sha256Hex(token))
        .eq("user_id", user.id);
    } else {
      await adminClient
        .from("creator_sessions")
        .update({ revoked_at: nowIso })
        .eq("user_id", user.id)
        .is("revoked_at", null);
    }
    return json(200, { ok: true });
  }

  if (action === "request-creator-recovery") {
    if (!googleSub || !hasGoogleOAuthSession) {
      return json(401, { error: "Active Google sign-in is required to recover creator credentials." });
    }
    const { data: cred } = await adminClient
      .from("creator_auth_credentials")
      .select("creator_id, username")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!cred) {
      return json(404, { error: "No enrolled creator account found for this Google user." });
    }

    const code = randomBytes(4).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await adminClient
      .from("creator_auth_credentials")
      .update({
        recovery_code_hash: sha256Hex(code),
        recovery_expires_at: expiresAt,
      })
      .eq("creator_id", cred.creator_id);

    return json(200, {
      username: cred.username,
      verifiedEmail: user.email,
      recoveryToken: code,
      expiresAt,
    });
  }

  if (action === "reset-creator-password") {
    if (!googleSub || !hasGoogleOAuthSession) {
      return json(401, { error: "Active Google sign-in is required to reset your creator password." });
    }
    const recoveryToken = String(payload.recoveryToken || "").trim().toUpperCase();
    const newPassword = String(payload.newPassword || "");
    const confirmPassword = String(payload.confirmPassword || "");

    if (!recoveryToken) return json(400, { error: "Recovery verification code is required." });
    if (newPassword !== confirmPassword) {
      return json(400, { error: "New password and confirmation do not match." });
    }
    const strengthErr = validatePasswordStrength(newPassword);
    if (strengthErr) return json(400, { error: strengthErr });

    const { data: cred } = await adminClient
      .from("creator_auth_credentials")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!cred || !cred.recovery_code_hash || !cred.recovery_expires_at) {
      return json(400, { error: "No active recovery request found." });
    }
    if (new Date(cred.recovery_expires_at).getTime() <= Date.now()) {
      return json(400, { error: "Recovery code has expired. Request a new code." });
    }
    if (sha256Hex(recoveryToken) !== cred.recovery_code_hash) {
      return json(401, { error: "Invalid recovery code." });
    }

    await adminClient
      .from("creator_auth_credentials")
      .update({
        password_hash: hashPasswordScrypt(newPassword),
        failed_attempts: 0,
        locked_until: null,
        recovery_code_hash: null,
        recovery_expires_at: null,
        password_updated_at: new Date().toISOString(),
      })
      .eq("creator_id", cred.creator_id);

    await adminClient
      .from("creator_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("revoked_at", null);

    return json(200, { ok: true });
  }

  if (action === "delete-account") {
    const confirmEmail = String(payload.confirmEmail || "").trim().toLowerCase();
    if (!user.email || confirmEmail !== user.email.toLowerCase()) {
      return json(400, { error: "Please enter your exact account email to confirm deletion." });
    }

    await Promise.all([
      adminClient.from("creator_sessions").delete().eq("user_id", user.id),
      adminClient.from("creator_auth_credentials").delete().eq("user_id", user.id),
      adminClient.from("creators").delete().eq("user_id", user.id),
      adminClient.from("user_favorites").delete().eq("user_id", user.id),
      adminClient.from("listening_history").delete().eq("user_id", user.id),
      adminClient.from("music_user_preferences").delete().eq("user_id", user.id),
      adminClient.from("music_login_logs").delete().eq("user_id", user.id),
      adminClient.from("music_users").delete().eq("id", user.id),
    ]);

    const { error: delErr } = await adminClient.auth.admin.deleteUser(user.id);
    if (delErr) {
      return json(500, { error: delErr.message || "Failed to delete authentication account." });
    }
    return json(200, { ok: true });
  }

  return json(400, { error: `Unknown action: ${action}` });
});
