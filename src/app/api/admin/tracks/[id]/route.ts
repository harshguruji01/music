import { NextRequest, NextResponse } from "next/server";
import { logAdminActivity, requireAdmin, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/format";
import { sanitizeText } from "@/lib/security";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid track ID." }, { status: 400 });
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data: existing, error: fetchErr } = await adminDb
    .from("tracks")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Track not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body.title === "string" && body.title.trim()) {
    updates.title = sanitizeText(body.title, 200);
  }
  if (body.artist_id !== undefined) {
    updates.artist_id = isValidUuid(String(body.artist_id)) ? body.artist_id : null;
  }
  if (body.album_id !== undefined) {
    updates.album_id = isValidUuid(String(body.album_id)) ? body.album_id : null;
  }
  if (body.genre_id !== undefined) {
    updates.genre_id = isValidUuid(String(body.genre_id)) ? body.genre_id : null;
  }
  if (typeof body.description === "string") {
    updates.description = sanitizeText(body.description, 2000) || null;
  }
  if (typeof body.language === "string") {
    updates.language = sanitizeText(body.language, 60) || "Hindi";
  }
  if (typeof body.lyrics === "string") {
    updates.lyrics = sanitizeText(body.lyrics, 15000) || null;
  }
  if (typeof body.release_date === "string") {
    updates.release_date = sanitizeText(body.release_date, 20) || null;
  }
  if (typeof body.is_featured === "boolean") updates.is_featured = body.is_featured;
  if (typeof body.is_downloadable === "boolean") updates.is_downloadable = body.is_downloadable;

  // Handle publish/unpublish transition securely across draft-audio <-> published-audio
  if (typeof body.is_published === "boolean" && body.is_published !== existing.is_published) {
    const targetBucket = body.is_published ? "published-audio" : "draft-audio";
    const sourceBucket = existing.audio_bucket || (existing.is_published ? "published-audio" : "draft-audio");

    if (sourceBucket !== targetBucket && existing.audio_path) {
      const { data: fileBlob, error: dlErr } = await adminDb.storage
        .from(sourceBucket)
        .download(existing.audio_path);
      if (dlErr || !fileBlob) {
        return NextResponse.json(
          { error: `Could not move audio file from ${sourceBucket}: ${dlErr?.message}` },
          { status: 500 }
        );
      }
      const buf = Buffer.from(await fileBlob.arrayBuffer());
      const { error: upErr } = await adminDb.storage
        .from(targetBucket)
        .upload(existing.audio_path, buf, {
          contentType: existing.mime_type || "audio/mpeg",
          upsert: true,
        });
      if (upErr) {
        return NextResponse.json(
          { error: `Failed to place audio in ${targetBucket}: ${upErr.message}` },
          { status: 500 }
        );
      }
      await adminDb.storage.from(sourceBucket).remove([existing.audio_path]);
    }

    updates.is_published = body.is_published;
    updates.audio_bucket = targetBucket;
    updates.audio_url = body.is_published
      ? adminDb.storage.from("published-audio").getPublicUrl(existing.audio_path).data.publicUrl
      : null;
  }

  const { data: updated, error: updateErr } = await adminDb
    .from("tracks")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.track.update",
    resourceType: "track",
    resourceId: id,
    details: { updatedFields: Object.keys(updates) },
    request,
  });

  return NextResponse.json({ ok: true, track: updated });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid track ID." }, { status: 400 });
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data: track } = await adminDb
    .from("tracks")
    .select("id, title, audio_bucket, audio_path, cover_path")
    .eq("id", id)
    .maybeSingle();

  if (!track) {
    return NextResponse.json({ error: "Track not found." }, { status: 404 });
  }

  // Clean up associated storage objects safely
  const cleanupPromises: Promise<unknown>[] = [];
  if (track.audio_path) {
    cleanupPromises.push(
      adminDb.storage.from(track.audio_bucket || "draft-audio").remove([track.audio_path])
    );
  }
  if (track.cover_path) {
    cleanupPromises.push(adminDb.storage.from("song-artwork").remove([track.cover_path]));
  }
  await Promise.all(cleanupPromises);

  const { error: deleteErr } = await adminDb.from("tracks").delete().eq("id", id);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.track.delete",
    resourceType: "track",
    resourceId: id,
    details: { title: track.title },
    request,
  });

  return NextResponse.json({ ok: true });
}
