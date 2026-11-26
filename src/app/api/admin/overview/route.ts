import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;

  const [
    tracksRes,
    artistsRes,
    albumsRes,
    playlistsRes,
    genresRes,
    logsRes,
    playEventsRes,
    downloadEventsRes,
  ] = await Promise.all([
    adminDb
      .from("tracks")
      .select(
        "id, title, is_published, is_featured, is_downloadable, file_size_bytes, play_count, download_count, created_at, genre_id, genre:genres(name, color_accent)"
      )
      .order("created_at", { ascending: false }),
    adminDb.from("artists").select("id, is_published", { count: "exact" }),
    adminDb.from("albums").select("id, is_published", { count: "exact" }),
    adminDb.from("playlists").select("id, is_published", { count: "exact" }),
    adminDb.from("genres").select("id, name, slug, color_accent"),
    adminDb
      .from("admin_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    adminDb
      .from("play_events")
      .select("played_at")
      .gte("played_at", new Date(Date.now() - 14 * 86400_000).toISOString()),
    adminDb
      .from("download_events")
      .select("downloaded_at")
      .gte("downloaded_at", new Date(Date.now() - 14 * 86400_000).toISOString()),
  ]);

  const tracks = ((tracksRes.data || []) as unknown) as Array<{
    id: string;
    title: string;
    is_published: boolean;
    is_featured: boolean;
    is_downloadable: boolean;
    file_size_bytes: number;
    play_count: number;
    download_count: number;
    created_at: string;
    genre: { name: string; color_accent: string } | { name: string; color_accent: string }[] | null;
  }>;

  const resolveGenre = (
    g: { name: string; color_accent: string } | { name: string; color_accent: string }[] | null
  ) => (Array.isArray(g) ? g[0] ?? null : g);

  const totalSongs = tracks.length;
  const publishedSongs = tracks.filter((t) => t.is_published).length;
  const draftSongs = totalSongs - publishedSongs;
  const eligibleDownloads = tracks.filter((t) => t.is_published && t.is_downloadable).length;
  const totalPlays = tracks.reduce((acc, t) => acc + Number(t.play_count || 0), 0);
  const totalDownloads = tracks.reduce((acc, t) => acc + Number(t.download_count || 0), 0);
  const totalStorageBytes = tracks.reduce((acc, t) => acc + Number(t.file_size_bytes || 0), 0);

  // Build 14-day activity series from genuine play/download/upload events
  const dayMap = new Map<string, { date: string; plays: number; downloads: number; uploads: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { date: key, plays: 0, downloads: 0, uploads: 0 });
  }

  for (const t of tracks) {
    const key = t.created_at.slice(0, 10);
    const entry = dayMap.get(key);
    if (entry) entry.uploads += 1;
  }
  for (const ev of (playEventsRes.data || []) as Array<{ played_at: string }>) {
    const key = ev.played_at.slice(0, 10);
    const entry = dayMap.get(key);
    if (entry) entry.plays += 1;
  }
  for (const ev of (downloadEventsRes.data || []) as Array<{ downloaded_at: string }>) {
    const key = ev.downloaded_at.slice(0, 10);
    const entry = dayMap.get(key);
    if (entry) entry.downloads += 1;
  }

  // Genre distribution
  const genreCounts = new Map<string, { name: string; color: string; count: number }>();
  for (const t of tracks) {
    const g = resolveGenre(t.genre);
    const name = g?.name || "Uncategorized";
    const color = g?.color_accent || "#64748b";
    const prev = genreCounts.get(name) || { name, color, count: 0 };
    prev.count += 1;
    genreCounts.set(name, prev);
  }

  return NextResponse.json({
    stats: {
      totalSongs,
      publishedSongs,
      draftSongs,
      totalArtists: artistsRes.count ?? (artistsRes.data?.length || 0),
      totalAlbums: albumsRes.count ?? (albumsRes.data?.length || 0),
      totalPlaylists: playlistsRes.count ?? (playlistsRes.data?.length || 0),
      totalGenres: genresRes.data?.length || 0,
      eligibleDownloads,
      totalPlays,
      totalDownloads,
      totalStorageBytes,
    },
    activitySeries: Array.from(dayMap.values()),
    genreBreakdown: Array.from(genreCounts.values()),
    topTracks: [...tracks].sort((a, b) => b.play_count - a.play_count).slice(0, 8),
    recentTracks: tracks.slice(0, 6),
    recentLogs: logsRes.data || [],
  });
}
