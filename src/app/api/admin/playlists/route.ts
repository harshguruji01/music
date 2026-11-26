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
    .from("playlists")
    .select("*, playlist_tracks(position, track:tracks(id, title, cover_url, artist:artists(name)))")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlists: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const formData = await request.formData();
  const title = sanitizeText(formData.get("title"), 200);
  const description = sanitizeText(formData.get("description"), 2000) || null;
  const isPublished = String(formData.get("is_published")) === "true";
  const isFeatured = String(formData.get("is_featured")) === "true";
  const coverFile = formData.get("cover") as File | null;

  if (!title) return NextResponse.json({ error: "Playlist title is required." }, { status: 400 });

  const slug = uniqueSlug(title);
  let coverUrl: string | null = null;
  let coverPath: string | null = null;

  if (coverFile && coverFile.size > 0) {
    const buf = Buffer.from(await coverFile.arrayBuffer());
    const check = validateImageUpload(coverFile.name, coverFile.type, buf);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

    coverPath = `${slug}${check.extension}`;
    const { error: upErr } = await adminDb.storage
      .from("playlist-covers")
      .upload(coverPath, buf, { contentType: check.canonicalMime });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    coverUrl = adminDb.storage.from("playlist-covers").getPublicUrl(coverPath).data.publicUrl;
  }

  const { data, error } = await adminDb
    .from("playlists")
    .insert({
      title,
      slug,
      description,
      cover_url: coverUrl,
      cover_path: coverPath,
      is_published: isPublished,
      is_featured: isFeatured,
      is_official: true,
      owner_id: auth.admin.userId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.playlist.create",
    resourceType: "playlist",
    resourceId: data.id,
    details: { title, isPublished },
    request,
  });

  return NextResponse.json({ ok: true, playlist: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const body = await request.json().catch(() => ({}));
  const id = sanitizeText(body.id || "", 60);
  if (!isValidUuid(id)) return NextResponse.json({ error: "Invalid playlist ID." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) updates.title = sanitizeText(body.title, 200);
  if (typeof body.description === "string") updates.description = sanitizeText(body.description, 2000) || null;
  if (typeof body.is_published === "boolean") updates.is_published = body.is_published;
  if (typeof body.is_featured === "boolean") updates.is_featured = body.is_featured;

  if (Object.keys(updates).length > 0) {
    const { error } = await adminDb.from("playlists").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Replace ordered track list when trackIds array is supplied
  if (Array.isArray(body.trackIds)) {
    const validIds = body.trackIds.filter((tid: unknown): tid is string => typeof tid === "string" && isValidUuid(tid));
    await adminDb.from("playlist_tracks").delete().eq("playlist_id", id);
    if (validIds.length > 0) {
      const rows = validIds.map((trackId: string, idx: number) => ({
        playlist_id: id,
        track_id: trackId,
        position: idx,
      }));
      await adminDb.from("playlist_tracks").insert(rows);
    }
  }

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.playlist.update",
    resourceType: "playlist",
    resourceId: id,
    details: { updatedFields: Object.keys(updates), tracksReordered: Array.isArray(body.trackIds) },
    request,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const { searchParams } = new URL(request.url);
  const id = sanitizeText(searchParams.get("id") || "", 60);
  if (!isValidUuid(id)) return NextResponse.json({ error: "Invalid playlist ID." }, { status: 400 });

  const adminDb = getSupabaseAdminClient()!;
  const { data: playlist } = await adminDb
    .from("playlists")
    .select("id, title, cover_path")
    .eq("id", id)
    .maybeSingle();

  if (!playlist) return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
  if (playlist.cover_path) await adminDb.storage.from("playlist-covers").remove([playlist.cover_path]);

  await adminDb.from("playlists").delete().eq("id", id);

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.playlist.delete",
    resourceType: "playlist",
    resourceId: id,
    details: { title: playlist.title },
    request,
  });

  return NextResponse.json({ ok: true });
}
