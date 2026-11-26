import { NextRequest, NextResponse } from "next/server";
import { logAdminActivity, requireAdmin, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeText } from "@/lib/security";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {
    updated_by: auth.admin.userId,
  };

  if (typeof body.site_title === "string" && body.site_title.trim()) {
    updates.site_title = sanitizeText(body.site_title, 120);
  }
  if (typeof body.site_description === "string") {
    updates.site_description = sanitizeText(body.site_description, 500);
  }
  if (typeof body.brand_tagline === "string") {
    updates.brand_tagline = sanitizeText(body.brand_tagline, 120);
  }
  if (typeof body.secondary_tagline === "string") {
    updates.secondary_tagline = sanitizeText(body.secondary_tagline, 160);
  }
  if (typeof body.logo_url === "string" && body.logo_url.trim()) {
    updates.logo_url = sanitizeText(body.logo_url, 300);
  }
  if (typeof body.default_artwork_url === "string" && body.default_artwork_url.trim()) {
    updates.default_artwork_url = sanitizeText(body.default_artwork_url, 300);
  }
  if (Array.isArray(body.homepage_sections)) {
    updates.homepage_sections = body.homepage_sections;
  }
  if (Array.isArray(body.homepage_order)) {
    updates.homepage_order = body.homepage_order;
  }
  if (body.public_download_policy === "track_level" || body.public_download_policy === "disabled") {
    updates.public_download_policy = body.public_download_policy;
  }
  if (typeof body.maintenance_mode === "boolean") {
    updates.maintenance_mode = body.maintenance_mode;
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb
    .from("site_settings")
    .upsert({ id: 1, ...updates }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.settings.update",
    resourceType: "site_settings",
    resourceId: "1",
    details: { updatedFields: Object.keys(updates) },
    request,
  });

  return NextResponse.json({ ok: true, settings: data });
}
