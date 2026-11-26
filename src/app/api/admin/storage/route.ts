import { NextRequest, NextResponse } from "next/server";
import { logAdminActivity, requireAdmin, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKETS = [
  { id: "published-audio", label: "Published Audio", visibility: "Public" },
  { id: "draft-audio", label: "Draft Audio", visibility: "Private (Admin Only)" },
  { id: "song-artwork", label: "Song Artwork", visibility: "Public" },
  { id: "album-covers", label: "Album Covers", visibility: "Public" },
  { id: "artist-images", label: "Artist Images", visibility: "Public" },
  { id: "playlist-covers", label: "Playlist Covers", visibility: "Public" },
] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;

  const bucketStats = await Promise.all(
    BUCKETS.map(async (bucket) => {
      const { data: files, error } = await adminDb.storage
        .from(bucket.id)
        .list("", { limit: 1000 });

      if (error || !files) {
        return {
          ...bucket,
          fileCount: 0,
          totalBytes: 0,
          files: [],
        };
      }

      const validFiles = files.filter((f) => f.name && !f.name.endsWith("/"));
      const totalBytes = validFiles.reduce(
        (acc, f) => acc + Number((f.metadata as { size?: number } | null)?.size || 0),
        0
      );

      return {
        ...bucket,
        fileCount: validFiles.length,
        totalBytes,
        files: validFiles.slice(0, 50).map((f) => ({
          name: f.name,
          size: Number((f.metadata as { size?: number } | null)?.size || 0),
          updatedAt: f.updated_at,
        })),
      };
    })
  );

  return NextResponse.json({ buckets: bucketStats });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;

  // Find orphaned audio/artwork files not referenced by any DB row
  const [{ data: tracks }, { data: artists }, { data: albums }, { data: playlists }] =
    await Promise.all([
      adminDb.from("tracks").select("audio_bucket, audio_path, cover_path"),
      adminDb.from("artists").select("image_path"),
      adminDb.from("albums").select("cover_path"),
      adminDb.from("playlists").select("cover_path"),
    ]);

  const refMap: Record<string, Set<string>> = {
    "published-audio": new Set(),
    "draft-audio": new Set(),
    "song-artwork": new Set(),
    "album-covers": new Set(),
    "artist-images": new Set(),
    "playlist-covers": new Set(),
  };

  for (const t of tracks || []) {
    if (t.audio_path) refMap[t.audio_bucket || "draft-audio"]?.add(t.audio_path);
    if (t.cover_path) refMap["song-artwork"].add(t.cover_path);
  }
  for (const a of artists || []) if (a.image_path) refMap["artist-images"].add(a.image_path);
  for (const al of albums || []) if (al.cover_path) refMap["album-covers"].add(al.cover_path);
  for (const pl of playlists || []) if (pl.cover_path) refMap["playlist-covers"].add(pl.cover_path);

  let removedCount = 0;
  for (const bucket of BUCKETS) {
    const { data: files } = await adminDb.storage.from(bucket.id).list("", { limit: 1000 });
    const orphans = (files || [])
      .map((f) => f.name)
      .filter((name) => name && !refMap[bucket.id].has(name));
    if (orphans.length > 0) {
      await adminDb.storage.from(bucket.id).remove(orphans);
      removedCount += orphans.length;
    }
  }

  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: "admin.storage.cleanup",
    resourceType: "storage",
    details: { removedOrphanFiles: removedCount },
    request,
  });

  return NextResponse.json({ ok: true, removedCount });
}
