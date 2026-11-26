import { NextRequest, NextResponse } from "next/server";
import { logAdminActivity, requireAdmin, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeText, slugify } from "@/lib/security";
import { isValidUuid } from "@/lib/format";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb
    .from("genres")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ genres: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const body = await request.json().catch(() => ({}));
  const name = sanitizeText(body.name, 80);
  const description = sanitizeText(body.description, 400) || null;
  const colorAccent = sanitizeText(body.color_accent || "#8b5cf6", 20);
  const displayOrder = Number(body.display_order || 0);
  const isFeatured = Boolean(body.is_featured ?? true);

  if (!name) return NextResponse.json({ error: "Genre name is required." }, { status: 400 });

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb
    .from("genres")
    .insert({
      name,
      slug: slugify(name),
      description,
      color_accent: colorAccent,
      display_order: displayOrder,
      is_featured: isFeatured,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.genre.create",
    resourceType: "genre",
    resourceId: data.id,
    details: { name },
    request,
  });

  return NextResponse.json({ ok: true, genre: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const body = await request.json().catch(() => ({}));
  const id = sanitizeText(body.id || "", 60);
  if (!isValidUuid(id)) return NextResponse.json({ error: "Invalid genre ID." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) updates.name = sanitizeText(body.name, 80);
  if (typeof body.description === "string") updates.description = sanitizeText(body.description, 400) || null;
  if (typeof body.color_accent === "string") updates.color_accent = sanitizeText(body.color_accent, 20);
  if (typeof body.display_order === "number") updates.display_order = body.display_order;
  if (typeof body.is_featured === "boolean") updates.is_featured = body.is_featured;

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb.from("genres").update(updates).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.genre.update",
    resourceType: "genre",
    resourceId: id,
    details: { updatedFields: Object.keys(updates) },
    request,
  });

  return NextResponse.json({ ok: true, genre: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const { searchParams } = new URL(request.url);
  const id = sanitizeText(searchParams.get("id") || "", 60);
  if (!isValidUuid(id)) return NextResponse.json({ error: "Invalid genre ID." }, { status: 400 });

  const adminDb = getSupabaseAdminClient()!;
  await adminDb.from("genres").delete().eq("id", id);

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.genre.delete",
    resourceType: "genre",
    resourceId: id,
    request,
  });

  return NextResponse.json({ ok: true });
}
