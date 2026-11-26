import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeText } from "@/lib/security";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const { searchParams } = new URL(request.url);
  const status = sanitizeText(searchParams.get("status") || "", 20);
  const action = sanitizeText(searchParams.get("action") || "", 60);
  const limit = Math.min(200, Math.max(10, Number(searchParams.get("limit") || "100")));

  const adminDb = getSupabaseAdminClient()!;
  let query = adminDb
    .from("admin_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && ["success", "failure", "blocked"].includes(status)) {
    query = query.eq("status", status);
  }
  if (action) {
    query = query.ilike("action", `%${action.replace(/[%_]/g, "")}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data || [] });
}
