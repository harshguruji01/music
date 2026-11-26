import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/config";
import { isValidUuid } from "@/lib/format";
import { getClientIp, hashIp, sanitizeFilename } from "@/lib/security";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid track identifier." }, { status: 400 });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Download service unavailable." }, { status: 503 });
  }

  const adminDb = getSupabaseAdminClient();
  if (!adminDb) {
    return NextResponse.json({ error: "Download service unavailable." }, { status: 503 });
  }

  // Enforce global download policy
  const { data: settings } = await adminDb
    .from("site_settings")
    .select("public_download_policy")
    .eq("id", 1)
    .maybeSingle();

  if (settings?.public_download_policy === "disabled") {
    return NextResponse.json({ error: "Public downloads are currently disabled." }, { status: 403 });
  }

  const { data: track, error } = await adminDb
    .from("tracks")
    .select("id, title, audio_bucket, audio_path, mime_type, is_published, is_downloadable, artist:artists(name)")
    .eq("id", id)
    .maybeSingle();

  if (error || !track) {
    return NextResponse.json({ error: "Track not found." }, { status: 404 });
  }

  if (!track.is_published || track.audio_bucket !== "published-audio") {
    return NextResponse.json({ error: "This track is not publicly available." }, { status: 403 });
  }

  if (!track.is_downloadable) {
    return NextResponse.json({ error: "Downloads are not enabled for this track." }, { status: 403 });
  }

  const { data: fileBlob, error: downloadError } = await adminDb.storage
    .from("published-audio")
    .download(track.audio_path);

  if (downloadError || !fileBlob) {
    return NextResponse.json({ error: "Audio file is currently unavailable." }, { status: 404 });
  }

  const ip = getClientIp(request);
  await Promise.all([
    adminDb.from("download_events").insert({
      track_id: id,
      ip_hash: hashIp(ip),
    }),
    adminDb.rpc("increment_download_count", { target_track_id: id }),
  ]);

  const artistObj = Array.isArray(track.artist) ? track.artist[0] : track.artist;
  const artistName = (artistObj as { name?: string } | null)?.name;
  const baseName = artistName ? `${artistName} - ${track.title}` : track.title;
  const extMatch = track.audio_path.match(/\.(mp3|m4a|wav|ogg)$/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : ".mp3";
  const safeName = `${sanitizeFilename(baseName)}${ext}`;

  const arrayBuffer = await fileBlob.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": track.mime_type || "audio/mpeg",
      "Content-Length": String(arrayBuffer.byteLength),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
