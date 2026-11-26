import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAdminActivity, requireAdmin, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  sanitizeText,
  uniqueSlug,
  validateAudioUpload,
  validateImageUpload,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const formData = await request.formData();

  const title = sanitizeText(formData.get("title"), 200);
  const artistId = sanitizeText(formData.get("artist_id"), 60) || null;
  const genreId = sanitizeText(formData.get("genre_id"), 60) || null;
  const albumId = sanitizeText(formData.get("album_id"), 60) || null;
  const description = sanitizeText(formData.get("description"), 2000) || null;
  const releaseDate = sanitizeText(formData.get("release_date"), 20) || null;
  const language = sanitizeText(formData.get("language"), 60) || "Hindi";
  const lyrics = sanitizeText(formData.get("lyrics"), 15000) || null;
  const durationSeconds = Math.max(0, Math.round(Number(formData.get("duration_seconds") || 0)));
  const isPublished = String(formData.get("is_published")) === "true";
  const isFeatured = String(formData.get("is_featured")) === "true";
  const isDownloadable = String(formData.get("is_downloadable")) === "true";
  const allowDuplicate = String(formData.get("allow_duplicate")) === "true";

  const audioFile = formData.get("audio") as File | null;
  const coverFile = formData.get("cover") as File | null;

  if (!title) {
    return NextResponse.json({ error: "Song title is required." }, { status: 400 });
  }
  if (!artistId) {
    return NextResponse.json({ error: "Artist selection is required." }, { status: 400 });
  }
  if (!genreId) {
    return NextResponse.json({ error: "Genre selection is required." }, { status: 400 });
  }
  if (!audioFile) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }
  if (!coverFile) {
    return NextResponse.json({ error: "Cover artwork image is required." }, { status: 400 });
  }

  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
  const audioCheck = validateAudioUpload(audioFile.name, audioFile.type, audioBuffer);
  if (!audioCheck.ok) {
    return NextResponse.json({ error: audioCheck.error }, { status: 400 });
  }

  const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
  const coverCheck = validateImageUpload(coverFile.name, coverFile.type, coverBuffer);
  if (!coverCheck.ok) {
    return NextResponse.json({ error: coverCheck.error }, { status: 400 });
  }

  // Duplicate check by SHA-256 hash
  const fileHash = crypto.createHash("sha256").update(audioBuffer).digest("hex");
  if (!allowDuplicate) {
    const { data: duplicate } = await adminDb
      .from("tracks")
      .select("id, title")
      .eq("file_hash", fileHash)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json(
        {
          error: `Duplicate audio detected (matches "${duplicate.title}"). Enable "Allow duplicate" to upload anyway.`,
          duplicateTrack: duplicate,
        },
        { status: 409 }
      );
    }
  }

  const slug = uniqueSlug(title);
  const audioBucket = isPublished ? "published-audio" : "draft-audio";
  const audioPath = `${slug}${audioCheck.extension}`;
  const coverPath = `${slug}-cover${coverCheck.extension}`;

  // Upload audio to appropriate bucket (draft-audio is private; published-audio is public)
  const { error: audioUploadErr } = await adminDb.storage
    .from(audioBucket)
    .upload(audioPath, audioBuffer, {
      contentType: audioCheck.canonicalMime,
      upsert: false,
    });

  if (audioUploadErr) {
    return NextResponse.json(
      { error: `Failed to upload audio: ${audioUploadErr.message}` },
      { status: 500 }
    );
  }

  // Upload artwork to song-artwork bucket
  const { error: coverUploadErr } = await adminDb.storage
    .from("song-artwork")
    .upload(coverPath, coverBuffer, {
      contentType: coverCheck.canonicalMime,
      upsert: false,
    });

  if (coverUploadErr) {
    // Cleanup uploaded audio on failure
    await adminDb.storage.from(audioBucket).remove([audioPath]);
    return NextResponse.json(
      { error: `Failed to upload cover artwork: ${coverUploadErr.message}` },
      { status: 500 }
    );
  }

  const audioUrl = isPublished
    ? adminDb.storage.from("published-audio").getPublicUrl(audioPath).data.publicUrl
    : null;
  const coverUrl = adminDb.storage.from("song-artwork").getPublicUrl(coverPath).data.publicUrl;

  const { data: inserted, error: insertErr } = await adminDb
    .from("tracks")
    .insert({
      title,
      slug,
      artist_id: artistId,
      album_id: albumId,
      genre_id: genreId,
      audio_bucket: audioBucket,
      audio_path: audioPath,
      audio_url: audioUrl,
      cover_url: coverUrl,
      cover_path: coverPath,
      duration_seconds: durationSeconds,
      file_size_bytes: audioBuffer.byteLength,
      mime_type: audioCheck.canonicalMime,
      file_hash: fileHash,
      description,
      release_date: releaseDate,
      language,
      lyrics,
      is_published: isPublished,
      is_featured: isFeatured,
      is_downloadable: isDownloadable,
      created_by: auth.admin.userId,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    await Promise.all([
      adminDb.storage.from(audioBucket).remove([audioPath]),
      adminDb.storage.from("song-artwork").remove([coverPath]),
    ]);
    return NextResponse.json(
      { error: `Database insert failed: ${insertErr?.message || "Unknown error"}` },
      { status: 500 }
    );
  }

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.track.upload",
    resourceType: "track",
    resourceId: inserted.id,
    details: {
      title,
      audioBucket,
      isPublished,
      isDownloadable,
      sizeBytes: audioBuffer.byteLength,
    },
    request,
  });

  return NextResponse.json({ ok: true, track: inserted }, { status: 201 });
}
