"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./supabase/client";
import { isSupabasePublicConfigured } from "./supabase/config";
import { AppError } from "./errors";
import { sanitizeText } from "./security";
import type { Creator, MusicLoginLog, MusicUser, MusicUserPreferences } from "@/types/music";

const CREATOR_SESSION_KEY = "gm_creator_session_token_v1";
const CREATOR_SESSION_AT_KEY = "gm_creator_session_at_v1";
const CREATOR_SESSION_MAX_AGE_MS = 3600 * 1000; // 1 hour auto-logout

export function validateCreatorUsername(username: string): string | null {
  const clean = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(clean)) {
    return "Username must be 3-32 lowercase letters, numbers, or underscores.";
  }
  return null;
}

export function validateCreatorPasswordStrength(password: string): string | null {
  if (typeof password !== "string" || password.length < 10) {
    return "Password must be at least 10 characters long.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must contain uppercase, lowercase, and at least one number.";
  }
  return null;
}

export function hasGoogleIdentity(user: User | null | undefined): boolean {
  if (!user) return false;
  const identities = user.identities || [];
  const providers = Array.isArray(user.app_metadata?.providers)
    ? (user.app_metadata?.providers as string[])
    : [];
  return (
    identities.some((i) => i.provider === "google") ||
    providers.includes("google") ||
    user.app_metadata?.provider === "google"
  );
}

function getStoredCreatorToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const token = sessionStorage.getItem(CREATOR_SESSION_KEY) || "";
    const ts = Number(sessionStorage.getItem(CREATOR_SESSION_AT_KEY) || "0");
    if (!token || !Number.isFinite(ts) || Date.now() - ts > CREATOR_SESSION_MAX_AGE_MS) {
      sessionStorage.removeItem(CREATOR_SESSION_KEY);
      sessionStorage.removeItem(CREATOR_SESSION_AT_KEY);
      return "";
    }
    return token;
  } catch {
    return "";
  }
}

function setStoredCreatorToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      sessionStorage.setItem(CREATOR_SESSION_KEY, token);
      sessionStorage.setItem(CREATOR_SESSION_AT_KEY, String(Date.now()));
    } else {
      sessionStorage.removeItem(CREATOR_SESSION_KEY);
      sessionStorage.removeItem(CREATOR_SESSION_AT_KEY);
    }
  } catch {
    // ignore
  }
}

async function invokeMusicAuth<T = Record<string, unknown>>(
  body: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new AppError("Supabase connection unavailable.", "UNCONFIGURED");

  const { data, error } = await supabase.functions.invoke("music-auth", {
    body,
    headers: extraHeaders,
  });

  if (error) {
    let detailed = error.message || "Authentication server error.";
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const errBody = (await ctx.json()) as { error?: string };
        if (errBody?.error) detailed = errBody.error;
      } catch {
        // ignore parse failure
      }
    }
    throw new AppError(detailed, "AUTH_GATEWAY_ERROR");
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new AppError(String(data.error), "AUTH_REJECTED");
  }
  return data as T;
}

export async function syncMusicLoginSession(
  authMethod: "email" | "google" | "oauth" | "session_resume" = "google",
  displayName?: string
): Promise<MusicUser | null> {
  if (!isSupabasePublicConfigured()) return null;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("sync_music_login", {
    p_auth_method: authMethod,
    p_display_name: displayName ? sanitizeText(displayName, 120) : null,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 250) : null,
  });

  if (error || !data) return null;
  return data as MusicUser;
}

export async function signInMusicWithGoogle(nextPath = "/profile/"): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Supabase connection unavailable." };

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback/?next=${encodeURIComponent(nextPath)}`
      : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function completeGoogleOAuthCallback(code: string | null): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Supabase connection unavailable." };

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { ok: false, error: error.message };
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, error: userErr?.message || "Google authentication session could not be established." };
  }
  if (!hasGoogleIdentity(user)) {
    return { ok: false, error: "Google provider identity could not be verified." };
  }

  await syncMusicLoginSession("google");
  return { ok: true };
}

export async function signUpMusicUser(params: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<
  | { ok: true; user: MusicUser | null; needsEmailConfirmation?: boolean }
  | { ok: false; error: string }
> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Supabase connection unavailable." };

  const email = sanitizeText(params.email, 160).toLowerCase();
  const displayName = sanitizeText(params.displayName || "", 120);
  const emailRedirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/` : undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      emailRedirectTo,
      data: {
        app_source: "guru_music",
        full_name: displayName || email.split("@")[0],
      },
    },
  });

  if (error || !data.user) {
    return { ok: false, error: error?.message || "Unable to create music account." };
  }

  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      ok: false,
      error: "An account with this email already exists. Please sign in or reset your password.",
    };
  }

  if (!data.session) {
    return { ok: true, user: null, needsEmailConfirmation: true };
  }

  const synced = await syncMusicLoginSession("email", displayName).catch(() => null);
  return { ok: true, user: synced, needsEmailConfirmation: false };
}

export async function resendMusicSignupConfirmation(email: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Supabase connection unavailable." };
  const cleanEmail = sanitizeText(email, 160).toLowerCase();
  const emailRedirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/` : undefined;
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: cleanEmail,
    options: { emailRedirectTo },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signInMusicUser(params: {
  email: string;
  password: string;
}): Promise<{ ok: true; user: MusicUser | null } | { ok: false; error: string; emailNotConfirmed?: boolean }> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Supabase connection unavailable." };

  const email = sanitizeText(params.email, 160).toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: params.password,
  });

  if (error || !data.user) {
    const msg = error?.message || "Invalid email or password.";
    const isUnconfirmed = msg.toLowerCase().includes("email not confirmed");
    return {
      ok: false,
      error: isUnconfirmed
        ? "Please confirm your email address first (check your inbox/spam) before signing in."
        : msg,
      emailNotConfirmed: isUnconfirmed,
    };
  }

  const synced = await syncMusicLoginSession("email").catch(() => null);
  return { ok: true, user: synced };
}

export async function signOutMusicUser(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  const creatorToken = getStoredCreatorToken();
  setStoredCreatorToken(null);

  if (creatorToken) {
    await invokeMusicAuth({ action: "creator-logout" }, { "x-creator-session": creatorToken }).catch(() => {});
  }

  try {
    await supabase.rpc("record_music_logout", {
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 250) : null,
    });
  } catch {
    // ignore
  }
  await supabase.auth.signOut({ scope: "global" }).catch(() => supabase.auth.signOut());
}

export async function checkCreatorUsernameAvailabilityClient(username: string): Promise<{
  available: boolean;
  error?: string;
}> {
  const fmtErr = validateCreatorUsername(username);
  if (fmtErr) return { available: false, error: fmtErr };

  try {
    const res = await invokeMusicAuth<{ available: boolean; error?: string }>({
      action: "check-username",
      username: username.trim().toLowerCase(),
    });
    return { available: Boolean(res.available), error: res.error };
  } catch (err) {
    return { available: false, error: err instanceof Error ? err.message : "Check failed." };
  }
}

export async function enrollCreatorWithPasswordClient(params: {
  username: string;
  stageName: string;
  password: string;
  confirmPassword: string;
  bio?: string;
  country?: string;
  primaryGenre?: string;
}): Promise<Creator> {
  const res = await invokeMusicAuth<{
    creator: Creator;
    creatorSessionToken: string;
  }>({
    action: "enroll-creator",
    username: params.username.trim().toLowerCase(),
    stageName: sanitizeText(params.stageName, 120),
    password: params.password,
    confirmPassword: params.confirmPassword,
    bio: params.bio,
    country: params.country,
    primaryGenre: params.primaryGenre,
  });

  if (res.creatorSessionToken) {
    setStoredCreatorToken(res.creatorSessionToken);
  }
  return res.creator;
}

export async function loginCreatorWithPasswordClient(
  username: string,
  password: string
): Promise<Creator> {
  const res = await invokeMusicAuth<{
    creator: Creator;
    creatorSessionToken: string;
  }>({
    action: "creator-login",
    username: username.trim().toLowerCase(),
    password,
  });

  if (res.creatorSessionToken) {
    setStoredCreatorToken(res.creatorSessionToken);
  }
  return res.creator;
}

export async function verifyCreatorSessionClient(): Promise<
  | { ok: true; creator: Creator }
  | {
      ok: false;
      reason:
        | "google_required"
        | "creator_enrollment_required"
        | "creator_login_required"
        | "creator_session_expired"
        | "creator_suspended";
    }
> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, reason: "google_required" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !hasGoogleIdentity(user)) {
    setStoredCreatorToken(null);
    return { ok: false, reason: "google_required" };
  }

  const { data: enrolled } = await supabase
    .from("creators")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!enrolled) {
    setStoredCreatorToken(null);
    return { ok: false, reason: "creator_enrollment_required" };
  }

  const token = getStoredCreatorToken();
  if (!token) {
    return { ok: false, reason: "creator_login_required" };
  }

  try {
    const res = await invokeMusicAuth<{ valid: boolean; creator: Creator; reason?: string }>(
      { action: "verify-creator-session" },
      { "x-creator-session": token }
    );
    if (!res.valid || !res.creator) {
      setStoredCreatorToken(null);
      return { ok: false, reason: "creator_session_expired" };
    }
    return { ok: true, creator: res.creator };
  } catch {
    setStoredCreatorToken(null);
    return { ok: false, reason: "creator_session_expired" };
  }
}

export async function requestCreatorPasswordRecoveryClient(): Promise<{
  username: string;
  verifiedEmail: string;
  recoveryToken: string;
  expiresAt: string;
}> {
  return invokeMusicAuth({ action: "request-creator-recovery" });
}

export async function resetCreatorPasswordClient(params: {
  recoveryToken: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  await invokeMusicAuth({
    action: "reset-creator-password",
    recoveryToken: params.recoveryToken,
    newPassword: params.newPassword,
    confirmPassword: params.confirmPassword,
  });
  setStoredCreatorToken(null);
}

export async function deleteMusicAccountClient(confirmEmail: string): Promise<void> {
  await invokeMusicAuth({
    action: "delete-account",
    confirmEmail: confirmEmail.trim().toLowerCase(),
  });
  setStoredCreatorToken(null);
  const supabase = getSupabaseBrowserClient();
  if (supabase) await supabase.auth.signOut().catch(() => {});
}

export async function getCurrentMusicUserState(): Promise<{
  musicUser: MusicUser | null;
  preferences: MusicUserPreferences | null;
  recentLogins: MusicLoginLog[];
}> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { musicUser: null, preferences: null, recentLogins: [] };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { musicUser: null, preferences: null, recentLogins: [] };

  const [userRes, prefRes, logsRes] = await Promise.all([
    supabase.from("music_users").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("music_user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("music_login_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    musicUser: (userRes.data as MusicUser | null) || null,
    preferences: (prefRes.data as MusicUserPreferences | null) || null,
    recentLogins: (logsRes.data as MusicLoginLog[] | null) || [],
  };
}

export async function updateMusicPreferencesClient(
  updates: Partial<Pick<MusicUserPreferences, "theme" | "preferred_language" | "audio_quality" | "autoplay">>
): Promise<MusicUserPreferences | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("music_user_preferences")
    .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) return null;
  return data as MusicUserPreferences;
}
