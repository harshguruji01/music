import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured, isSupabasePublicConfigured } from "@/lib/supabase/config";
import { ADMIN_SESSION_COOKIE, logAdminActivity } from "@/lib/admin-auth";
import {
  checkInMemoryRateLimit,
  getAdminSessionMaxAgeSeconds,
  getClientIp,
  hashIp,
  isEmailAllowlisted,
  recordInMemoryRateLimitFailure,
  resetInMemoryRateLimit,
  sanitizeText,
  verifySameOrigin,
} from "@/lib/security";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  if (!verifySameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin login request rejected." }, { status: 403 });
  }

  if (!isSupabasePublicConfigured() || !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "Supabase credentials are not configured yet. Please check .env.local." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = sanitizeText(body?.email || "", 160).toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const ipHash = hashIp(ip);
  const rateKey = `login:${ipHash}:${email}`;

  // Check in-memory + DB rate limit
  const memRate = checkInMemoryRateLimit(rateKey, MAX_ATTEMPTS, WINDOW_MS, LOCK_MS);
  if (!memRate.allowed) {
    await logAdminActivity({
      adminEmail: email,
      action: "admin.login.rate_limited",
      status: "blocked",
      details: { retryAfterSeconds: memRate.retryAfterSeconds },
      request,
    });
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${memRate.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data: dbLimit } = await adminDb
    .from("auth_rate_limits")
    .select("*")
    .eq("key", rateKey)
    .maybeSingle();

  if (dbLimit?.locked_until && new Date(dbLimit.locked_until).getTime() > Date.now()) {
    const retryAfter = Math.ceil((new Date(dbLimit.locked_until).getTime() - Date.now()) / 1000);
    await logAdminActivity({
      adminEmail: email,
      action: "admin.login.rate_limited",
      status: "blocked",
      details: { retryAfterSeconds: retryAfter },
      request,
    });
    return NextResponse.json(
      { error: `Account login temporarily locked. Try again in ${retryAfter}s.` },
      { status: 429 }
    );
  }

  const recordFailure = async (action: string, reason: string, userId?: string | null) => {
    recordInMemoryRateLimitFailure(rateKey, MAX_ATTEMPTS, WINDOW_MS, LOCK_MS);
    const prevAttempts =
      dbLimit && Date.now() - new Date(dbLimit.first_attempt_at).getTime() <= WINDOW_MS
        ? Number(dbLimit.attempts || 0)
        : 0;
    const nextAttempts = prevAttempts + 1;
    const lockedUntil =
      nextAttempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MS).toISOString() : null;

    await adminDb.from("auth_rate_limits").upsert({
      key: rateKey,
      attempts: nextAttempts,
      first_attempt_at:
        prevAttempts === 0 ? new Date().toISOString() : dbLimit.first_attempt_at,
      locked_until: lockedUntil,
      updated_at: new Date().toISOString(),
    });

    await logAdminActivity({
      adminId: userId || null,
      adminEmail: email,
      action,
      status: "failure",
      details: { reason, attempt: nextAttempts },
      request,
    });
  };

  if (!isEmailAllowlisted(email)) {
    await recordFailure("admin.login.unauthorized_email", "Email not on allowlist");
    return NextResponse.json(
      { error: "Unauthorized administrator identity." },
      { status: 403 }
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Authentication service unavailable." }, { status: 503 });
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !signInData.user) {
    await recordFailure("admin.login.failed", "Invalid credentials");
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Verify explicit role='admin' in database (email alone NEVER grants admin privileges)
  const { data: roleRow } = await adminDb
    .from("user_roles")
    .select("role")
    .eq("user_id", signInData.user.id)
    .maybeSingle();

  if (!roleRow || roleRow.role !== "admin") {
    await supabase.auth.signOut();
    await recordFailure(
      "admin.login.missing_role",
      "Allowlisted email lacks role=admin in user_roles",
      signInData.user.id
    );
    return NextResponse.json(
      { error: "Administrator role is not provisioned for this account." },
      { status: 403 }
    );
  }

  // Clear rate limit and set explicit admin session expiration cookie
  resetInMemoryRateLimit(rateKey);
  await adminDb.from("auth_rate_limits").delete().eq("key", rateKey);

  await logAdminActivity({
    adminId: signInData.user.id,
    adminEmail: email,
    action: "admin.login.success",
    status: "success",
    request,
  });

  const maxAge = getAdminSessionMaxAgeSeconds();
  const response = NextResponse.json({
    ok: true,
    admin: {
      id: signInData.user.id,
      email,
      role: "admin",
    },
  });

  response.cookies.set(ADMIN_SESSION_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return response;
}
