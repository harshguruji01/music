"use client";

import { getSupabaseBrowserClient } from "./supabase/client";
import { isSupabasePublicConfigured } from "./supabase/config";
import {
  ALLOWED_AUDIO_EXTENSIONS,
  ALLOWED_AUDIO_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_AUDIO_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  checkInMemoryRateLimit,
  getAdminSessionMaxAgeSeconds,
  isEmailAllowlisted,
  recordInMemoryRateLimitFailure,
  resetInMemoryRateLimit,
  sanitizeText,
  scrubAuditDetails,
  slugify,
  uniqueSlug,
} from "./security";
import type {
  AdminActivityLog,
  Album,
  Artist,
  Creator,
  CreatorCredential,
  Genre,
  ModerationLog,
  MusicLoginLog,
  MusicUser,
  SiteSettings,
  SongStatus,
  SongSubmission,
  Track,
} from "@/types/music";

export const ADMIN_SESSION_KEY = "gm_admin_session_at";

export function hasPasswordAuthMethod(accessToken: string | null | undefined): boolean {
  if (!accessToken) return false;
  const parts = accessToken.split(".");
  if (parts.length < 2) return false;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const claims = JSON.parse(json) as { amr?: Array<{ method?: string }> };
    return Array.isArray(claims.amr) && claims.amr.some((entry) => entry?.method === "password");
  } catch {
    return false;
  }
}

async function detectBrowserAudioSignature(file: File): Promise<"mp3" | "m4a" | "wav" | "ogg" | null> {
  const slice = await file.slice(0, 16).arrayBuffer();
  const b = new Uint8Array(slice);
  if (b.length < 12) return null;
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return "mp3";
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return "mp3";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "m4a";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45) return "wav";
  if (b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return "ogg";
  return null;
}

async function detectBrowserImageSignature(file: File): Promise<"png" | "jpeg" | "webp" | null> {
  const slice = await file.slice(0, 16).arrayBuffer();
  const b = new Uint8Array(slice);
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;
}

async function computeFileSha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function verifyAdminSessionClient(): Promise<
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: "unconfigured" | "expired" | "unauthorized" | "forbidden" }
> {
  if (!isSupabasePublicConfigured()) return { ok: false, reason: "unconfigured" };
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, reason: "unconfigured" };

  try {
    const rawTs = localStorage.getItem(ADMIN_SESSION_KEY);
    const ts = Number(rawTs || "0");
    const maxAgeMs = getAdminSessionMaxAgeSeconds() * 1000;
    if (!rawTs || !Number.isFinite(ts) || Date.now() - ts > maxAgeMs) {
      return { ok: false, reason: "expired" };
    }
  } catch {
    return { ok: false, reason: "expired" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return { ok: false, reason: "expired" };
  if (!isEmailAllowlisted(user.email)) return { ok: false, reason: "unauthorized" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!hasPasswordAuthMethod(session?.access_token)) {
    await supabase.auth.signOut();
    return { ok: false, reason: "unauthorized" };
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleRow || roleRow.role !== "admin") return { ok: false, reason: "forbidden" };
  return { ok: true, userId: user.id, email: user.email.toLowerCase() };
}

export async function logAdminActionClient(params: {
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  status?: "success" | "failure" | "blocked";
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("admin_activity_logs").insert({
    admin_id: user.id,
    admin_email: user.email?.toLowerCase() || null,
    action: params.action,
    resource_type: params.resourceType || null,
    resource_id: params.resourceId || null,
    details: scrubAuditDetails(params.details || {}),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
    status: params.status || "success",
  });
}

export async function signInAdminClient(
  rawEmail: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabasePublicConfigured()) {
    return { ok: false, error: "Supabase URL and Anon Key are not configured yet." };
  }
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable." };

  const email = sanitizeText(rawEmail, 160).toLowerCase();
  const rateKey = `client-login:${email}`;
  const rate = checkInMemoryRateLimit(rateKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
  if (!rate.allowed) {
    return { ok: false, error: `Too many failed attempts. Try again in ${rate.retryAfterSeconds}s.` };
  }

  if (!isEmailAllowlisted(email)) {
    recordInMemoryRateLimitFailure(rateKey);
    await supabase.rpc("log_failed_admin_login", {
      attempted_email: email,
      reason: "Email not on allowlist",
    });
    return { ok: false, error: "Unauthorized administrator email." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    recordInMemoryRateLimitFailure(rateKey);
    await supabase.rpc("log_failed_admin_login", {
      attempted_email: email,
      reason: "Invalid credentials",
    });
    return { ok: false, error: error?.message || "Invalid email or password." };
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!roleRow || roleRow.role !== "admin") {
    await supabase.auth.signOut();
    recordInMemoryRateLimitFailure(rateKey);
    return { ok: false, error: "Administrator role is not provisioned for this account." };
  }

  resetInMemoryRateLimit(rateKey);
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, String(Date.now()));
  } catch {
    // ignore
  }
  await logAdminActionClient({ action: "admin.login.success", resourceType: "auth" });
  return { ok: true };
}

export async function signOutAdminClient() {
  await logAdminActionClient({ action: "admin.logout", resourceType: "auth" }).catch(() => {});
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // ignore
  }
  const supabase = getSupabaseBrowserClient();
  if (supabase) await supabase.auth.signOut();
}

export async function fetchAdminOverviewClient() {
  const supabase = getSupabaseBrowserClient()!;
  const [tracksRes, artistsRes, albumsRes, playlistsRes, genresRes, logsRes, playRes, dlRes] =
    await Promise.all([
      supabase
        .from("tracks")
        .select("id, title, is_published, is_featured, is_downloadable, file_size_bytes, play_count, download_count, created_at, genre:genres(name, color_accent)")
        .order("created_at", { ascending: false }),
      supabase.from("artists").select("id", { count: "exact" }),
      supabase.from("albums").select("id", { count: "exact" }),
      supabase.from("playlists").select("id", { count: "exact" }),
      supabase.from("genres").select("id"),
      supabase.from("admin_activity_logs").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("play_events").select("played_at").gte("played_at", new Date(Date.now() - 14 * 86400_000).toISOString()),
      supabase.from("download_events").select("downloaded_at").gte("downloaded_at", new Date(Date.now() - 14 * 86400_000).toISOString()),
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

  const dayMap = new Map<string, { date: string; plays: number; downloads: number; uploads: number }>();
  for (let i = 13; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    dayMap.set(key, { date: key, plays: 0, downloads: 0, uploads: 0 });
  }
  for (const t of tracks) {
    const entry = dayMap.get(t.created_at.slice(0, 10));
    if (entry) entry.uploads += 1;
  }
  for (const ev of (playRes.data || []) as Array<{ played_at: string }>) {
    const entry = dayMap.get(ev.played_at.slice(0, 10));
    if (entry) entry.plays += 1;
  }
  for (const ev of (dlRes.data || []) as Array<{ downloaded_at: string }>) {
    const entry = dayMap.get(ev.downloaded_at.slice(0, 10));
    if (entry) entry.downloads += 1;
  }

  const genreCounts = new Map<string, { name: string; color: string; count: number }>();
  for (const t of tracks) {
    const g = Array.isArray(t.genre) ? t.genre[0] : t.genre;
    const name = g?.name || "Uncategorized";
    const color = g?.color_accent || "#64748b";
    const prev = genreCounts.get(name) || { name, color, count: 0 };
    prev.count += 1;
    genreCounts.set(name, prev);
  }

  return {
    stats: {
      totalSongs: tracks.length,
      publishedSongs: tracks.filter((t) => t.is_published).length,
      draftSongs: tracks.filter((t) => !t.is_published).length,
      totalArtists: artistsRes.count ?? (artistsRes.data?.length || 0),
      totalAlbums: albumsRes.count ?? (albumsRes.data?.length || 0),
      totalPlaylists: playlistsRes.count ?? (playlistsRes.data?.length || 0),
      totalGenres: genresRes.data?.length || 0,
      eligibleDownloads: tracks.filter((t) => t.is_published && t.is_downloadable).length,
      totalPlays: tracks.reduce((a, b) => a + Number(b.play_count || 0), 0),
      totalDownloads: tracks.reduce((a, b) => a + Number(b.download_count || 0), 0),
      totalStorageBytes: tracks.reduce((a, b) => a + Number(b.file_size_bytes || 0), 0),
    },
    activitySeries: Array.from(dayMap.values()),
    genreBreakdown: Array.from(genreCounts.values()),
    topTracks: [...tracks].sort((a, b) => b.play_count - a.play_count).slice(0, 8),
    recentTracks: tracks.slice(0, 6),
    recentLogs: (logsRes.data || []) as AdminActivityLog[],
  };
}

export async function uploadTrackClient(params: {
  title: string;
  artistId: string;
  genreId: string;
  albumId?: string;
  description?: string;
  releaseDate?: string;
  language?: string;
  lyrics?: string;
  durationSeconds: number;
  isPublished: boolean;
  isFeatured: boolean;
  isDownloadable: boolean;
  allowDuplicate: boolean;
  audioFile: File;
  coverFile: File;
  onProgress?: (pct: number) => void;
}) {
  const supabase = getSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { audioFile, coverFile } = params;
  const audioExt = audioFile.name.slice(audioFile.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_AUDIO_EXTENSIONS.has(audioExt)) {
    throw new Error("Unsupported audio extension. Allowed: MP3, M4A, WAV, OGG.");
  }
  if (audioFile.type && !ALLOWED_AUDIO_MIME_TYPES.has(audioFile.type.toLowerCase())) {
    throw new Error("Unsupported audio MIME type.");
  }
  if (audioFile.size > MAX_AUDIO_SIZE_BYTES) {
    throw new Error("Audio file exceeds 100 MB limit.");
  }
  const detectedAudio = await detectBrowserAudioSignature(audioFile);
  if (!detectedAudio) {
    throw new Error("File signature does not match MP3, M4A, WAV, or OGG.");
  }

  const coverExt = coverFile.name.slice(coverFile.name.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(coverExt)) {
    throw new Error("Unsupported cover extension. Allowed: JPG, PNG, WEBP.");
  }
  if (coverFile.type && !ALLOWED_IMAGE_MIME_TYPES.has(coverFile.type.toLowerCase())) {
    throw new Error("Unsupported cover MIME type.");
  }
  if (coverFile.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Cover image exceeds 10 MB limit.");
  }
  const detectedCover = await detectBrowserImageSignature(coverFile);
  if (!detectedCover) {
    throw new Error("Cover image signature is invalid.");
  }

  params.onProgress?.(15);
  const fileHash = await computeFileSha256(audioFile);
  if (!params.allowDuplicate) {
    const { data: dup } = await supabase
      .from("tracks")
      .select("id, title")
      .eq("file_hash", fileHash)
      .maybeSingle();
    if (dup) {
      throw new Error(`Duplicate audio detected (matches "${dup.title}"). Enable "Allow duplicate" to proceed.`);
    }
  }

  const slug = uniqueSlug(params.title);
  const audioBucket = params.isPublished ? "published-audio" : "draft-audio";
  const audioPath = `${slug}.${detectedAudio}`;
  const coverPath = `${slug}-cover.${detectedCover === "jpeg" ? "jpg" : detectedCover}`;
  const audioMimeMap = { mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg" };
  const imageMimeMap = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };

  params.onProgress?.(35);
  const { error: audioErr } = await supabase.storage
    .from(audioBucket)
    .upload(audioPath, audioFile, { contentType: audioMimeMap[detectedAudio], upsert: false });
  if (audioErr) throw new Error(`Audio upload failed: ${audioErr.message}`);

  params.onProgress?.(70);
  const { error: coverErr } = await supabase.storage
    .from("song-artwork")
    .upload(coverPath, coverFile, { contentType: imageMimeMap[detectedCover], upsert: false });
  if (coverErr) {
    await supabase.storage.from(audioBucket).remove([audioPath]);
    throw new Error(`Artwork upload failed: ${coverErr.message}`);
  }

  const audioUrl = params.isPublished
    ? supabase.storage.from("published-audio").getPublicUrl(audioPath).data.publicUrl
    : null;
  const coverUrl = supabase.storage.from("song-artwork").getPublicUrl(coverPath).data.publicUrl;

  params.onProgress?.(90);
  const { data: inserted, error: insertErr } = await supabase
    .from("tracks")
    .insert({
      title: sanitizeText(params.title, 200),
      slug,
      artist_id: params.artistId,
      album_id: params.albumId || null,
      genre_id: params.genreId,
      audio_bucket: audioBucket,
      audio_path: audioPath,
      audio_url: audioUrl,
      cover_url: coverUrl,
      cover_path: coverPath,
      duration_seconds: params.durationSeconds,
      file_size_bytes: audioFile.size,
      mime_type: audioMimeMap[detectedAudio],
      file_hash: fileHash,
      description: sanitizeText(params.description || "", 2000) || null,
      release_date: params.releaseDate || null,
      language: sanitizeText(params.language || "Hindi", 60) || "Hindi",
      lyrics: sanitizeText(params.lyrics || "", 15000) || null,
      is_published: params.isPublished,
      is_featured: params.isFeatured,
      is_downloadable: params.isDownloadable,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    await Promise.all([
      supabase.storage.from(audioBucket).remove([audioPath]),
      supabase.storage.from("song-artwork").remove([coverPath]),
    ]);
    throw new Error(insertErr?.message || "Failed to save track record.");
  }

  await logAdminActionClient({
    action: "admin.track.upload",
    resourceType: "track",
    resourceId: inserted.id,
    details: { title: params.title, audioBucket, isPublished: params.isPublished },
  });

  params.onProgress?.(100);
  return inserted as Track;
}

export async function fetchAdminTracksClient(opts: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  sort?: string;
}) {
  const supabase = getSupabaseBrowserClient()!;
  const page = opts.page || 1;
  const pageSize = opts.pageSize || 15;
  let query = supabase
    .from("tracks")
    .select("*, artist:artists(id, name, slug), album:albums(id, title, slug), genre:genres(id, name, slug, color_accent)", {
      count: "exact",
    });

  if (opts.q?.trim()) query = query.ilike("title", `%${opts.q.trim().replace(/[%_]/g, "")}%`);
  if (opts.status === "published") query = query.eq("is_published", true);
  if (opts.status === "draft") query = query.eq("is_published", false);
  if (opts.status === "featured") query = query.eq("is_featured", true);
  if (opts.status === "downloadable") query = query.eq("is_downloadable", true);

  const sortCol = opts.sort || "created_at";
  query = query.order(sortCol, { ascending: sortCol === "title" });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count } = await query;
  return { tracks: (data || []) as unknown as Track[], total: count ?? 0 };
}

export async function updateAdminTrackClient(id: string, updates: Record<string, unknown>) {
  const supabase = getSupabaseBrowserClient()!;
  const { data: existing } = await supabase.from("tracks").select("*").eq("id", id).maybeSingle();
  if (!existing) throw new Error("Track not found.");

  const nextUpdates: Record<string, unknown> = { ...updates };

  if (typeof updates.is_published === "boolean" && updates.is_published !== existing.is_published) {
    const destBucket = updates.is_published ? "published-audio" : "draft-audio";
    const srcBucket = existing.audio_bucket || (existing.is_published ? "published-audio" : "draft-audio");
    if (srcBucket !== destBucket && existing.audio_path) {
      const { data: blob, error: dlErr } = await supabase.storage.from(srcBucket).download(existing.audio_path);
      if (dlErr || !blob) throw new Error(`Failed moving audio: ${dlErr?.message}`);
      const { error: upErr } = await supabase.storage
        .from(destBucket)
        .upload(existing.audio_path, blob, { contentType: existing.mime_type || "audio/mpeg", upsert: true });
      if (upErr) throw new Error(`Failed placing audio: ${upErr.message}`);
      await supabase.storage.from(srcBucket).remove([existing.audio_path]);
    }
    nextUpdates.audio_bucket = destBucket;
    nextUpdates.audio_url = updates.is_published
      ? supabase.storage.from("published-audio").getPublicUrl(existing.audio_path).data.publicUrl
      : null;
  }

  const { error } = await supabase.from("tracks").update(nextUpdates).eq("id", id);
  if (error) throw new Error(error.message);

  await logAdminActionClient({
    action: "admin.track.update",
    resourceType: "track",
    resourceId: id,
    details: { updatedFields: Object.keys(nextUpdates) },
  });
}

export async function deleteAdminTrackClient(id: string) {
  const supabase = getSupabaseBrowserClient()!;
  const { data: track } = await supabase
    .from("tracks")
    .select("id, title, audio_bucket, audio_path, cover_path")
    .eq("id", id)
    .maybeSingle();
  if (!track) return;

  if (track.audio_path) await supabase.storage.from(track.audio_bucket || "draft-audio").remove([track.audio_path]);
  if (track.cover_path) await supabase.storage.from("song-artwork").remove([track.cover_path]);
  await supabase.from("tracks").delete().eq("id", id);

  await logAdminActionClient({
    action: "admin.track.delete",
    resourceType: "track",
    resourceId: id,
    details: { title: track.title },
  });
}

export async function getAdminTrackPreviewUrlClient(track: Track): Promise<string | null> {
  const supabase = getSupabaseBrowserClient()!;
  const { data } = await supabase.storage
    .from(track.audio_bucket || "draft-audio")
    .createSignedUrl(track.audio_path, 120);
  return data?.signedUrl || null;
}

// Artists, Albums, Playlists, Genres, Settings, Storage, Activity
export async function fetchAdminArtistsClient(): Promise<Artist[]> {
  const supabase = getSupabaseBrowserClient()!;
  const { data } = await supabase.from("artists").select("*").order("created_at", { ascending: false });
  return (data || []) as Artist[];
}

export async function createAdminArtistClient(params: {
  name: string;
  bio: string;
  isPublished: boolean;
  imageFile: File | null;
}) {
  const supabase = getSupabaseBrowserClient()!;
  const slug = uniqueSlug(params.name);
  let imageUrl: string | null = null;
  let imagePath: string | null = null;

  if (params.imageFile) {
    const sig = await detectBrowserImageSignature(params.imageFile);
    if (!sig) throw new Error("Invalid artist image format.");
    imagePath = `${slug}.${sig === "jpeg" ? "jpg" : sig}`;
    const { error } = await supabase.storage.from("artist-images").upload(imagePath, params.imageFile);
    if (error) throw new Error(error.message);
    imageUrl = supabase.storage.from("artist-images").getPublicUrl(imagePath).data.publicUrl;
  }

  const { data, error } = await supabase
    .from("artists")
    .insert({
      name: sanitizeText(params.name, 160),
      slug,
      bio: sanitizeText(params.bio, 2000) || null,
      image_url: imageUrl,
      image_path: imagePath,
      is_published: params.isPublished,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await logAdminActionClient({ action: "admin.artist.create", resourceType: "artist", resourceId: data.id });
  return data as Artist;
}

export async function toggleAdminArtistPublishClient(artist: Artist) {
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from("artists").update({ is_published: !artist.is_published }).eq("id", artist.id);
  await logAdminActionClient({ action: "admin.artist.update", resourceType: "artist", resourceId: artist.id });
}

export async function deleteAdminArtistClient(artist: Artist) {
  const supabase = getSupabaseBrowserClient()!;
  if (artist.image_path) await supabase.storage.from("artist-images").remove([artist.image_path]);
  await supabase.from("artists").delete().eq("id", artist.id);
  await logAdminActionClient({ action: "admin.artist.delete", resourceType: "artist", resourceId: artist.id });
}

export async function fetchAdminAlbumsClient(): Promise<Album[]> {
  const supabase = getSupabaseBrowserClient()!;
  const { data } = await supabase
    .from("albums")
    .select("*, artist:artists(id, name, slug)")
    .order("created_at", { ascending: false });
  return (data || []) as unknown as Album[];
}

export async function createAdminAlbumClient(params: {
  title: string;
  artistId?: string;
  description: string;
  releaseDate?: string;
  isPublished: boolean;
  coverFile: File | null;
}) {
  const supabase = getSupabaseBrowserClient()!;
  const slug = uniqueSlug(params.title);
  let coverUrl: string | null = null;
  let coverPath: string | null = null;

  if (params.coverFile) {
    const sig = await detectBrowserImageSignature(params.coverFile);
    if (!sig) throw new Error("Invalid album cover format.");
    coverPath = `${slug}.${sig === "jpeg" ? "jpg" : sig}`;
    const { error } = await supabase.storage.from("album-covers").upload(coverPath, params.coverFile);
    if (error) throw new Error(error.message);
    coverUrl = supabase.storage.from("album-covers").getPublicUrl(coverPath).data.publicUrl;
  }

  const { data, error } = await supabase
    .from("albums")
    .insert({
      title: sanitizeText(params.title, 200),
      slug,
      artist_id: params.artistId || null,
      description: sanitizeText(params.description, 2000) || null,
      release_date: params.releaseDate || null,
      cover_url: coverUrl,
      cover_path: coverPath,
      is_published: params.isPublished,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await logAdminActionClient({ action: "admin.album.create", resourceType: "album", resourceId: data.id });
}

export async function toggleAdminAlbumPublishClient(album: Album) {
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from("albums").update({ is_published: !album.is_published }).eq("id", album.id);
}

export async function deleteAdminAlbumClient(album: Album) {
  const supabase = getSupabaseBrowserClient()!;
  if (album.cover_path) await supabase.storage.from("album-covers").remove([album.cover_path]);
  await supabase.from("albums").delete().eq("id", album.id);
}

export async function fetchAdminPlaylistsClient() {
  const supabase = getSupabaseBrowserClient()!;
  const { data } = await supabase
    .from("playlists")
    .select("*, playlist_tracks(position, track:tracks(id, title))")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function createAdminPlaylistClient(params: {
  title: string;
  description: string;
  isPublished: boolean;
  coverFile: File | null;
}) {
  const supabase = getSupabaseBrowserClient()!;
  const { data: { user } } = await supabase.auth.getUser();
  const slug = uniqueSlug(params.title);
  let coverUrl: string | null = null;
  let coverPath: string | null = null;

  if (params.coverFile) {
    const sig = await detectBrowserImageSignature(params.coverFile);
    if (!sig) throw new Error("Invalid playlist cover format.");
    coverPath = `${slug}.${sig === "jpeg" ? "jpg" : sig}`;
    const { error } = await supabase.storage.from("playlist-covers").upload(coverPath, params.coverFile);
    if (error) throw new Error(error.message);
    coverUrl = supabase.storage.from("playlist-covers").getPublicUrl(coverPath).data.publicUrl;
  }

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      title: sanitizeText(params.title, 200),
      slug,
      description: sanitizeText(params.description, 2000) || null,
      cover_url: coverUrl,
      cover_path: coverPath,
      is_published: params.isPublished,
      is_official: true,
      owner_id: user?.id || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await logAdminActionClient({ action: "admin.playlist.create", resourceType: "playlist", resourceId: data.id });
}

export async function updateAdminPlaylistClient(id: string, payload: Record<string, unknown>, trackIds?: string[]) {
  const supabase = getSupabaseBrowserClient()!;
  if (Object.keys(payload).length > 0) {
    await supabase.from("playlists").update(payload).eq("id", id);
  }
  if (trackIds) {
    await supabase.from("playlist_tracks").delete().eq("playlist_id", id);
    if (trackIds.length > 0) {
      await supabase.from("playlist_tracks").insert(
        trackIds.map((tid, idx) => ({ playlist_id: id, track_id: tid, position: idx }))
      );
    }
  }
  await logAdminActionClient({ action: "admin.playlist.update", resourceType: "playlist", resourceId: id });
}

export async function deleteAdminPlaylistClient(id: string, coverPath?: string | null) {
  const supabase = getSupabaseBrowserClient()!;
  if (coverPath) await supabase.storage.from("playlist-covers").remove([coverPath]);
  await supabase.from("playlists").delete().eq("id", id);
}

export async function fetchAdminGenresClient(): Promise<Genre[]> {
  const supabase = getSupabaseBrowserClient()!;
  const { data } = await supabase.from("genres").select("*").order("display_order", { ascending: true });
  return (data || []) as Genre[];
}

export async function createAdminGenreClient(params: {
  name: string;
  description: string;
  colorAccent: string;
  displayOrder: number;
}) {
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from("genres").insert({
    name: sanitizeText(params.name, 80),
    slug: slugify(params.name),
    description: sanitizeText(params.description, 400) || null,
    color_accent: params.colorAccent,
    display_order: params.displayOrder,
    is_featured: true,
  });
}

export async function deleteAdminGenreClient(id: string) {
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from("genres").delete().eq("id", id);
}

export async function saveSiteSettingsClient(updates: Partial<SiteSettings>) {
  const supabase = getSupabaseBrowserClient()!;
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("site_settings")
    .upsert({ id: 1, ...updates, updated_by: user?.id || null }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await logAdminActionClient({ action: "admin.settings.update", resourceType: "site_settings", resourceId: "1" });
  return data as SiteSettings;
}

export async function fetchAdminLogsClient(status?: string, action?: string): Promise<AdminActivityLog[]> {
  const supabase = getSupabaseBrowserClient()!;
  let query = supabase.from("admin_activity_logs").select("*").order("created_at", { ascending: false }).limit(100);
  if (status) query = query.eq("status", status);
  if (action?.trim()) query = query.ilike("action", `%${action.trim().replace(/[%_]/g, "")}%`);
  const { data } = await query;
  return (data || []) as AdminActivityLog[];
}

const STORAGE_BUCKETS = [
  { id: "published-audio", label: "Published Audio", visibility: "Public" },
  { id: "draft-audio", label: "Draft Audio", visibility: "Private (Admin Only)" },
  { id: "artist-uploads", label: "Creator Uploads", visibility: "Private (Owner + Admin)" },
  { id: "pending-submissions", label: "Pending Submissions", visibility: "Private (Owner + Admin)" },
  { id: "creator-verification-docs", label: "Verification Docs", visibility: "Private (Owner + Admin)" },
  { id: "song-artwork", label: "Song Artwork", visibility: "Public" },
  { id: "album-covers", label: "Album Covers", visibility: "Public" },
  { id: "artist-images", label: "Artist Images", visibility: "Public" },
  { id: "playlist-covers", label: "Playlist Covers", visibility: "Public" },
] as const;

export async function fetchAdminStorageClient() {
  const supabase = getSupabaseBrowserClient()!;
  return Promise.all(
    STORAGE_BUCKETS.map(async (b) => {
      const { data: files } = await supabase.storage.from(b.id).list("", { limit: 1000 });
      const valid = (files || []).filter((f) => f.name && !f.name.endsWith("/"));
      const totalBytes = valid.reduce(
        (acc, f) => acc + Number((f.metadata as { size?: number } | null)?.size || 0),
        0
      );
      return { ...b, fileCount: valid.length, totalBytes };
    })
  );
}

export async function cleanupOrphanStorageClient(): Promise<number> {
  const supabase = getSupabaseBrowserClient()!;
  const [{ data: tracks }, { data: artists }, { data: albums }, { data: playlists }] =
    await Promise.all([
      supabase.from("tracks").select("audio_bucket, audio_path, cover_path"),
      supabase.from("artists").select("image_path"),
      supabase.from("albums").select("cover_path"),
      supabase.from("playlists").select("cover_path"),
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

  let removed = 0;
  for (const b of STORAGE_BUCKETS) {
    const { data: files } = await supabase.storage.from(b.id).list("", { limit: 1000 });
    const orphans = (files || []).map((f) => f.name).filter((n) => n && !refMap[b.id].has(n));
    if (orphans.length > 0) {
      await supabase.storage.from(b.id).remove(orphans);
      removed += orphans.length;
    }
  }
  await logAdminActionClient({
    action: "admin.storage.cleanup",
    resourceType: "storage",
    details: { removedOrphanFiles: removed },
  });
  return removed;
}

// ============================================================================
// Super Admin Console: Moderation Queue, Creators, Users & Audit Logs
// ============================================================================

export async function fetchAdminSubmissionsClient(statusFilter?: string): Promise<SongSubmission[]> {
  const supabase = getSupabaseBrowserClient()!;
  let query = supabase
    .from("song_submissions")
    .select(
      "*, track:tracks(*, artist:artists(id, name, slug), genre:genres(id, name, slug, color_accent)), creator:creators(id, username, stage_name, is_verified)"
    )
    .order("submitted_at", { ascending: false })
    .limit(100);

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  const { data } = await query;
  return (data || []) as unknown as SongSubmission[];
}

export async function moderateSongViaGatewayClient(params: {
  trackId: string;
  newStatus: Exclude<SongStatus, "PENDING_REVIEW">;
  reason?: string;
}): Promise<Track> {
  const supabase = getSupabaseBrowserClient()!;
  const { data, error } = await supabase.functions.invoke("music-gateway", {
    body: {
      action: "moderate-song",
      trackId: params.trackId,
      newStatus: params.newStatus,
      reason: params.reason || null,
    },
  });
  if (error) throw new Error(error.message || "Moderation gateway failed.");
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new Error(String(data.error));
  }
  return (data as { track: Track }).track;
}

export async function fetchAdminModerationLogsClient(): Promise<ModerationLog[]> {
  const supabase = getSupabaseBrowserClient()!;
  const { data } = await supabase
    .from("moderation_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data || []) as ModerationLog[];
}

export async function fetchAdminCreatorVerificationsClient(): Promise<CreatorCredential[]> {
  const supabase = getSupabaseBrowserClient()!;
  const { data } = await supabase
    .from("creator_credentials")
    .select("*, creator:creators(*)")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data || []) as unknown as CreatorCredential[];
}

export async function reviewCreatorVerificationClient(params: {
  credentialId: string;
  creatorId: string;
  decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  notes?: string;
}) {
  const supabase = getSupabaseBrowserClient()!;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const nowIso = new Date().toISOString();

  const { error: credErr } = await supabase
    .from("creator_credentials")
    .update({
      status: params.decision,
      reviewer_id: user?.id || null,
      reviewer_notes: params.notes || null,
      reviewed_at: nowIso,
    })
    .eq("id", params.credentialId);
  if (credErr) throw new Error(credErr.message);

  const creatorStatus =
    params.decision === "APPROVED"
      ? "verified"
      : params.decision === "REJECTED"
        ? "rejected"
        : "pending";

  const { error: crErr } = await supabase
    .from("creators")
    .update({
      verification_status: creatorStatus,
      is_verified: params.decision === "APPROVED",
      verified_at: params.decision === "APPROVED" ? nowIso : null,
      verified_by: params.decision === "APPROVED" ? user?.id || null : null,
    })
    .eq("id", params.creatorId);
  if (crErr) throw new Error(crErr.message);

  await logAdminActionClient({
    action: `admin.creator.verification.${params.decision.toLowerCase()}`,
    resourceType: "creator",
    resourceId: params.creatorId,
    details: { credentialId: params.credentialId },
  });
}

export async function fetchAdminMusicUsersClient(): Promise<{
  users: MusicUser[];
  loginLogs: MusicLoginLog[];
}> {
  const supabase = getSupabaseBrowserClient()!;
  const [{ data: users }, { data: loginLogs }] = await Promise.all([
    supabase.from("music_users").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("music_login_logs").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  return {
    users: (users || []) as MusicUser[],
    loginLogs: (loginLogs || []) as MusicLoginLog[],
  };
}

export async function toggleAdminMusicUserActiveClient(userId: string, nextActive: boolean) {
  const supabase = getSupabaseBrowserClient()!;
  const { error } = await supabase
    .from("music_users")
    .update({ is_active: nextActive })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  await logAdminActionClient({
    action: nextActive ? "admin.user.activate" : "admin.user.suspend",
    resourceType: "music_users",
    resourceId: userId,
  });
}

export async function fetchAdminCreatorsDirectoryClient(): Promise<Creator[]> {
  const supabase = getSupabaseBrowserClient()!;
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data || []) as Creator[];
}

export async function setAdminCreatorStatusClient(params: {
  creatorId: string;
  nextStatus: "verified" | "unverified" | "suspended" | "rejected";
  actionLabel: "restore" | "suspend" | "ban";
}) {
  const supabase = getSupabaseBrowserClient()!;
  const { error } = await supabase
    .from("creators")
    .update({
      verification_status: params.nextStatus,
      is_verified: params.nextStatus === "verified",
    })
    .eq("id", params.creatorId);
  if (error) throw new Error(error.message);

  if (params.nextStatus === "suspended" || params.nextStatus === "rejected") {
    await supabase
      .from("creator_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("creator_id", params.creatorId)
      .is("revoked_at", null);
  }

  await logAdminActionClient({
    action: `admin.creator.${params.actionLabel}`,
    resourceType: "creator",
    resourceId: params.creatorId,
    details: { status: params.nextStatus },
  });
}

export async function deleteAdminCreatorClient(creatorId: string) {
  const supabase = getSupabaseBrowserClient()!;
  await supabase.from("creator_sessions").delete().eq("creator_id", creatorId);
  await supabase.from("creator_auth_credentials").delete().eq("creator_id", creatorId);
  await supabase.from("creator_credentials").delete().eq("creator_id", creatorId);
  const { error } = await supabase.from("creators").delete().eq("id", creatorId);
  if (error) throw new Error(error.message);

  await logAdminActionClient({
    action: "admin.creator.delete",
    resourceType: "creator",
    resourceId: creatorId,
  });
}
