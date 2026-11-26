import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "./supabase/server";
import { getSupabaseAdminClient } from "./supabase/admin";
import { isSupabaseAdminConfigured, isSupabasePublicConfigured } from "./supabase/config";
import {
  getAdminSessionMaxAgeSeconds,
  getClientIp,
  hashIp,
  isEmailAllowlisted,
  scrubAuditDetails,
  verifySameOrigin,
} from "./security";

export const ADMIN_SESSION_COOKIE = "gm_admin_session_at";

export interface AdminContext {
  userId: string;
  email: string;
  role: "admin";
}

export type AdminAuthResult =
  | { ok: true; admin: AdminContext }
  | { ok: false; status: number; error: string };

/**
 * Verifies administrator identity on the server:
 * 1. Valid Supabase Auth session
 * 2. Active admin session timestamp within ADMIN_SESSION_MAX_AGE_SECONDS
 * 3. Email present in ADMIN_ALLOWLIST_EMAILS (harshguruji01@gmail.com)
 * 4. Explicit role='admin' record in public.user_roles (via service_role)
 *
 * Email match alone NEVER grants administrative privileges.
 */
export async function requireAdmin(request?: Request): Promise<AdminAuthResult> {
  if (!isSupabasePublicConfigured() || !isSupabaseAdminConfigured()) {
    return { ok: false, status: 503, error: "Backend authentication is not configured." };
  }

  if (request && !verifySameOrigin(request)) {
    return { ok: false, status: 403, error: "Cross-origin admin mutation rejected." };
  }

  const supabase = await getSupabaseServerClient();
  const adminDb = getSupabaseAdminClient();
  if (!supabase || !adminDb) {
    return { ok: false, status: 503, error: "Supabase client unavailable." };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return { ok: false, status: 401, error: "Authentication required." };
  }

  const email = user.email.toLowerCase();
  if (!isEmailAllowlisted(email)) {
    return { ok: false, status: 403, error: "Account is not on the authorized administrator allowlist." };
  }

  // Enforce explicit admin session expiration window
  const cookieStore = await cookies();
  const sessionAtRaw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!sessionAtRaw) {
    return { ok: false, status: 401, error: "Admin session expired. Please sign in again." };
  }
  const sessionAt = Number(sessionAtRaw);
  const maxAgeMs = getAdminSessionMaxAgeSeconds() * 1000;
  if (!Number.isFinite(sessionAt) || Date.now() - sessionAt > maxAgeMs) {
    return { ok: false, status: 401, error: "Admin session expired. Please sign in again." };
  }

  // Verify explicit role='admin' in database (email alone NEVER grants access)
  const { data: roleRow, error: roleError } = await adminDb
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || !roleRow || roleRow.role !== "admin") {
    return { ok: false, status: 403, error: "Administrator role not provisioned for this account." };
  }

  return {
    ok: true,
    admin: {
      userId: user.id,
      email,
      role: "admin",
    },
  };
}

export function unauthorizedAdminResponse(result: Extract<AdminAuthResult, { ok: false }>) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}

export async function logAdminActivity(params: {
  adminId?: string | null;
  adminEmail?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown>;
  status?: "success" | "failure" | "blocked";
  request?: Request;
}) {
  const adminDb = getSupabaseAdminClient();
  if (!adminDb) return;

  const ip = params.request ? getClientIp(params.request) : "unknown";
  const userAgent = params.request?.headers.get("user-agent")?.slice(0, 200) || null;

  try {
    await adminDb.from("admin_activity_logs").insert({
      admin_id: params.adminId || null,
      admin_email: params.adminEmail || null,
      action: params.action,
      resource_type: params.resourceType || null,
      resource_id: params.resourceId || null,
      details: scrubAuditDetails(params.details || {}),
      ip_hash: ip !== "unknown" ? hashIp(ip) : null,
      user_agent: userAgent,
      status: params.status || "success",
    });
  } catch {
    // Do not crash primary flow if audit table insert fails
  }
}
