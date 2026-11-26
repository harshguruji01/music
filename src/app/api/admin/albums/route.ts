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
    .from("albums")
    .select("*, artist:artists(id, name, slug), tracks(id, title)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ albums: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const formData = await request.formData();
  const title = sanitizeText(formData.get("title"), 200);
  const artistId = sanitizeText(formData.get("artist_id"), 60) || null;
  const description = sanitizeText(formData.get("description"), 2000) || null;
  const releaseDate = sanitizeText(formData.get("release_date"), 20) || null;
  const isPublished = String(formData.get("is_published")) === "true";
  const isFeatured = String(formData.get("is_featured")) === "true";
  const coverFile = formData.get("cover") as File | null;

  if (!title) return NextResponse.json({ error: "Album title is required." }, { status: 400 });

  const slug = uniqueSlug(title);
  let coverUrl: string | null = null;
  let coverPath: string | null = null;

  if (coverFile && coverFile.size > 0) {
    const buf = Buffer.from(await coverFile.arrayBuffer());
    const check = validateImageUpload(coverFile.name, coverFile.type, buf);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    coverPath = `${slug}${check.extension}`;
    const { error: upErr } = await adminDb.storage
      .from("album-covers")
      .upload(coverPath, buf, { contentType: check.canonicalMime });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    coverUrl = adminDb.storage.from("album-covers").getPublicUrl(coverPath).data.publicUrl;
  }

  const { data, error } = await adminDb
    .from("albums")
    .insert({
      title,
      slug,
      artist_id: artistId && isValidUuid(artistId) ? artistId : null,
      description,
      release_date: releaseDate,
      cover_url: coverUrl,
      cover_path: coverPath,
      is_published: isPublished,
      is_featured: isFeatured,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.album.create",
    resourceType: "album",
    resourceId: data.id,
    details: { title, isPublished },
    request,
  });

  return NextResponse.json({ ok: true, album: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    const id = sanitizeText(body.id || "", 60);
    if (!isValidUuid(id)) return NextResponse.json({ error: "Invalid album ID." }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) updates.title = sanitizeText(body.title, 200);
    if (typeof body.description === "string") updates.description = sanitizeText(body.description, 2000) || null;
    if (typeof body.is_published === "boolean") updates.is_published = body.is_published;
    if (typeof body.is_featured === "boolean") updates.is_featured = body.is_featured;
    if (body.artist_id !== undefined) {
      updates.artist_id = isValidUuid(String(body.artist_id)) ? body.artist_id : null;
    }

    const { data, error } = await adminDb
      .from("albums")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (Array.isArray(body.trackIds)) {
      await adminDb.from("tracks").update({ album_id: null }).eq("album_id", id);
      const validTrackIds = body.trackIds.filter((tid: unknown): tid is string => typeof tid === "string" && isValidUuid(tid));
      if (validTrackIds.length > 0) {
        await adminDb.from("tracks").update({ album_id: id }).in("id", validTrackIds);
      }
    }

    await logAdminActivity({
      adminId: auth.admin.userId,
      adminEmail: auth.admin.email,
      action: "admin.album.update",
      resourceType: "album",
      resourceId: id,
      details: { updatedFields: Object.keys(updates) },
      request,
    });

    return NextResponse.json({ ok: true, album: data });
  }

  const formData = await request.formData();
  const id = sanitizeText(formData.get("id"), 60);
  if (!isValidUuid(id)) return NextResponse.json({ error: "Invalid album ID." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  const title = formData.get("title");
  if (typeof title === "string" && title.trim()) updates.title = sanitizeText(title, 200);
  const description = formData.get("description");
  if (typeof description === "string") updates.description = sanitizeText(description, 2000) || null;
  if (formData.has("is_published")) updates.is_published = String(formData.get("is_published")) === "true";
  if (formData.has("is_featured")) updates.is_featured = String(formData.get("is_featured")) === "true";

  const coverFile = formData.get("cover") as File | null;
  if (coverFile && coverFile.size > 0) {
    const buf = Buffer.from(await coverFile.arrayBuffer());
    const check = validateImageUpload(coverFile.name, coverFile.type, buf);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    const { data: prev } = await adminDb.from("albums").select("cover_path").eq("id", id).maybeSingle();
    const nextPath = `${uniqueSlug(String(updates.title || "album"))}${check.extension}`;
    const { error: upErr } = await adminDb.storage
      .from("album-covers")
      .upload(nextPath, buf, { contentType: check.canonicalMime });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    if (prev?.cover_path) await adminDb.storage.from("album-covers").remove([prev.cover_path]);

    updates.cover_path = nextPath;
    updates.cover_url = adminDb.storage.from("album-covers").getPublicUrl(nextPath).data.publicUrl;
  }

  const { data, error } = await adminDb.from("albums").update(updates).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.album.update",
    resourceType: "album",
    resourceId: id,
    details: { updatedFields: Object.keys(updates) },
    request,
  });

  return NextResponse.json({ ok: true, album: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const { searchParams } = new URL(request.url);
  const id = sanitizeText(searchParams.get("id") || "", 60);
  if (!isValidUuid(id)) return NextResponse.json({ error: "Invalid album ID." }, { status: 400 });

  const adminDb = getSupabaseAdminClient()!;
  const { data: album } = await adminDb
    .from("albums")
    .select("id, title, cover_path")
    .eq("id", id)
    .maybeSingle();

  if (!album) return NextResponse.json({ error: "Album not found." }, { status: 404 });
  if (album.cover_path) await adminDb.storage.from("album-covers").remove([album.cover_path]);

  await adminDb.from("albums").delete().eq("id", id);

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.album.delete",
    resourceType: "album",
    resourceId: id,
    details: { title: album.title },
    request,
  });

  return NextResponse.json({ ok: true });
}
