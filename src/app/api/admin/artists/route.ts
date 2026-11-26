import { NextRequest, NextResponse } from "next/server";
import { logAdminActivity, requireAdmin, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeText, uniqueSlug, validateImageUpload } from "@/lib/security";
import { isValidUuid } from "@/lib/format";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const { data, error } = await adminDb
    .from("artists")
    .select("*, tracks(count)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ artists: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const formData = await request.formData();
  const name = sanitizeText(formData.get("name"), 160);
  const bio = sanitizeText(formData.get("bio"), 2000) || null;
  const isPublished = String(formData.get("is_published")) === "true";
  const isFeatured = String(formData.get("is_featured")) === "true";
  const imageFile = formData.get("image") as File | null;

  if (!name) return NextResponse.json({ error: "Artist name is required." }, { status: 400 });

  const slug = uniqueSlug(name);
  let imageUrl: string | null = null;
  let imagePath: string | null = null;

  if (imageFile && imageFile.size > 0) {
    const buf = Buffer.from(await imageFile.arrayBuffer());
    const check = validateImageUpload(imageFile.name, imageFile.type, buf);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    imagePath = `${slug}${check.extension}`;
    const { error: upErr } = await adminDb.storage
      .from("artist-images")
      .upload(imagePath, buf, { contentType: check.canonicalMime });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    imageUrl = adminDb.storage.from("artist-images").getPublicUrl(imagePath).data.publicUrl;
  }

  const { data, error } = await adminDb
    .from("artists")
    .insert({
      name,
      slug,
      bio,
      image_url: imageUrl,
      image_path: imagePath,
      is_published: isPublished,
      is_featured: isFeatured,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.artist.create",
    resourceType: "artist",
    resourceId: data.id,
    details: { name, isPublished },
    request,
  });

  return NextResponse.json({ ok: true, artist: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const formData = await request.formData();
  const id = sanitizeText(formData.get("id"), 60);
  if (!isValidUuid(id)) return NextResponse.json({ error: "Invalid artist ID." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  const name = formData.get("name");
  if (typeof name === "string" && name.trim()) updates.name = sanitizeText(name, 160);
  const bio = formData.get("bio");
  if (typeof bio === "string") updates.bio = sanitizeText(bio, 2000) || null;
  if (formData.has("is_published")) updates.is_published = String(formData.get("is_published")) === "true";
  if (formData.has("is_featured")) updates.is_featured = String(formData.get("is_featured")) === "true";

  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const buf = Buffer.from(await imageFile.arrayBuffer());
    const check = validateImageUpload(imageFile.name, imageFile.type, buf);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    const { data: prev } = await adminDb
      .from("artists")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();

    const nextPath = `${uniqueSlug(String(updates.name || "artist"))}${check.extension}`;
    const { error: upErr } = await adminDb.storage
      .from("artist-images")
      .upload(nextPath, buf, { contentType: check.canonicalMime });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    if (prev?.image_path) {
      await adminDb.storage.from("artist-images").remove([prev.image_path]);
    }
    updates.image_path = nextPath;
    updates.image_url = adminDb.storage.from("artist-images").getPublicUrl(nextPath).data.publicUrl;
  }

  const { data, error } = await adminDb
    .from("artists")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.artist.update",
    resourceType: "artist",
    resourceId: id,
    details: { updatedFields: Object.keys(updates) },
    request,
  });

  return NextResponse.json({ ok: true, artist: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const { searchParams } = new URL(request.url);
  const id = sanitizeText(searchParams.get("id") || "", 60);
  if (!isValidUuid(id)) return NextResponse.json({ error: "Invalid artist ID." }, { status: 400 });

  const adminDb = getSupabaseAdminClient()!;
  const { data: artist } = await adminDb
    .from("artists")
    .select("id, name, image_path")
    .eq("id", id)
    .maybeSingle();

  if (!artist) return NextResponse.json({ error: "Artist not found." }, { status: 404 });

  if (artist.image_path) {
    await adminDb.storage.from("artist-images").remove([artist.image_path]);
  }
  await adminDb.from("artists").delete().eq("id", id);

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.artist.delete",
    resourceType: "artist",
    resourceId: id,
    details: { name: artist.name },
    request,
  });

  return NextResponse.json({ ok: true });
}
