"use client";

import { getSupabaseBrowserClient } from "./supabase/client";
import { BRAND_CONFIG, isSupabasePublicConfigured } from "./supabase/config";
import { sanitizeFilename, sanitizeText } from "./security";
import type { Album, Artist, Genre, Playlist, SiteSettings, Track } from "@/types/music";

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  id: 1,
  site_title: BRAND_CONFIG.name,
  site_description: "Discover your sound. Explore your world. Feel every beat.",
  brand_tagline: BRAND_CONFIG.tagline,
  secondary_tagline: BRAND_CONFIG.secondaryTagline,
  logo_url: BRAND_CONFIG.logoPath,
  default_artwork_url: BRAND_CONFIG.defaultCoverPath,
  homepage_sections: [
    { key: "recently_played", label: "Recently Played", enabled: true },
    { key: "trending_songs", label: "Trending Songs", enabled: true },
    { key: "recommended", label: "Recommended For You", enabled: true },
    { key: "popular_artists", label: "Popular Artists", enabled: true },
    { key: "new_releases", label: "New Releases", enabled: true },
    { key: "featured_albums", label: "Featured Albums", enabled: true },
    { key: "trending_playlists", label: "Trending Playlists", enabled: true },
    { key: "genre_hindi", label: "Hindi Music", enabled: true },
    { key: "genre_english", label: "English Music", enabled: true },
    { key: "genre_bollywood", label: "Bollywood", enabled: true },
    { key: "genre_independent", label: "Independent Artists", enabled: true },
    { key: "genre_hip_hop_rap", label: "Hip-Hop and Rap", enabled: true },
    { key: "genre_electronic_edm", label: "Electronic and EDM", enabled: true },
    { key: "genre_instrumental", label: "Instrumental", enabled: true },
    { key: "genre_chill", label: "Chill and Relax", enabled: true },
    { key: "genre_romantic", label: "Romantic Music", enabled: true },
    { key: "genre_cinematic", label: "Cinematic Music", enabled: true },
  ],
  homepage_order: [
    "recently_played",
    "trending_songs",
    "recommended",
    "popular_artists",
    "new_releases",
    "featured_albums",
    "trending_playlists",
    "genre_hindi",
    "genre_english",
    "genre_bollywood",
    "genre_independent",
    "genre_hip_hop_rap",
    "genre_electronic_edm",
    "genre_instrumental",
    "genre_chill",
    "genre_romantic",
    "genre_cinematic",
  ],
  public_download_policy: "track_level",
  maintenance_mode: false,
  updated_by: null,
  updated_at: new Date(0).toISOString(),
};

export const DEFAULT_GENRES: Genre[] = [
  { id: "g-hindi", name: "Hindi Music", slug: "hindi", description: "Melodic Hindi tracks, modern hits, and timeless voices.", color_accent: "#f59e0b", cover_url: null, display_order: 1, is_featured: true, created_at: "", updated_at: "" },
  { id: "g-english", name: "English Music", slug: "english", description: "Global pop, soul, indie, and chart-topping English releases.", color_accent: "#3b82f6", cover_url: null, display_order: 2, is_featured: true, created_at: "", updated_at: "" },
  { id: "g-bollywood", name: "Bollywood", slug: "bollywood", description: "Iconic cinema soundtracks and chartbusters.", color_accent: "#ef4444", cover_url: null, display_order: 3, is_featured: true, created_at: "", updated_at: "" },
  { id: "g-independent", name: "Independent Artists", slug: "independent", description: "Original independent creators and fresh underground sounds.", color_accent: "#10b981", cover_url: null, display_order: 4, is_featured: true, created_at: "", updated_at: "" },
  { id: "g-hiphop", name: "Hip-Hop and Rap", slug: "hip-hop-rap", description: "Hard-hitting beats, bars, and street anthems.", color_accent: "#8b5cf6", cover_url: null, display_order: 5, is_featured: true, created_at: "", updated_at: "" },
  { id: "g-edm", name: "Electronic and EDM", slug: "electronic-edm", description: "High-energy synth waves, festival drops, and basslines.", color_accent: "#06b6d4", cover_url: null, display_order: 6, is_featured: true, created_at: "", updated_at: "" },
  { id: "g-instrumental", name: "Instrumental", slug: "instrumental", description: "Pure compositions, acoustic arrangements, and focus scores.", color_accent: "#ec4899", cover_url: null, display_order: 7, is_featured: true, created_at: "", updated_at: "" },
  { id: "g-chill", name: "Chill and Relax", slug: "chill", description: "Lo-fi textures, ambient grooves, and late-night calm.", color_accent: "#14b8a6", cover_url: null, display_order: 8, is_featured: true, created_at: "", updated_at: "" },
  { id: "g-romantic", name: "Romantic Music", slug: "romantic", description: "Heartfelt melodies and soulful love ballads.", color_accent: "#f43f5e", cover_url: null, display_order: 9, is_featured: true, created_at: "", updated_at: "" },
  { id: "g-cinematic", name: "Cinematic Music", slug: "cinematic", description: "Epic orchestral scores and atmospheric soundscapes.", color_accent: "#eab308", cover_url: null, display_order: 10, is_featured: true, created_at: "", updated_at: "" },
];

const TRACK_SELECT = `
  *,
  artist:artists(id, name, slug, image_url),
  album:albums(id, title, slug, cover_url),
  genre:genres(id, name, slug, color_accent)
`;

export async function getSiteSettingsClient(): Promise<SiteSettings> {
  if (!isSupabasePublicConfigured()) return DEFAULT_SITE_SETTINGS;
  try {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return DEFAULT_SITE_SETTINGS;
    const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return DEFAULT_SITE_SETTINGS;
    return { ...DEFAULT_SITE_SETTINGS, ...(data as Partial<SiteSettings>) };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function getPublishedTracksClient(options?: {
  limit?: number;
  featuredOnly?: boolean;
  genreSlug?: string;
  sortBy?: "recent" | "trending" | "title";
}): Promise<Track[]> {
  if (!isSupabasePublicConfigured()) return [];
  try {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return [];

    let query = supabase
      .from("tracks")
      .select(TRACK_SELECT)
      .eq("is_published", true);

    if (options?.featuredOnly) query = query.eq("is_featured", true);

    if (options?.sortBy === "trending") {
      query = query.order("play_count", { ascending: false }).order("created_at", { ascending: false });
    } else if (options?.sortBy === "title") {
      query = query.order("title", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error || !data) return [];

    let tracks = data as unknown as Track[];
    if (options?.genreSlug) {
      tracks = tracks.filter((t) => t.genre?.slug === options.genreSlug);
    }
    return tracks;
  } catch {
    return [];
  }
}

export async function getPublishedTrackBySlugClient(slug: string): Promise<{ track: Track | null; related: Track[] }> {
  if (!isSupabasePublicConfigured() || !slug) return { track: null, related: [] };
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { track: null, related: [] };

  const { data } = await supabase
    .from("tracks")
    .select(TRACK_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!data) return { track: null, related: [] };
  const track = data as unknown as Track;

  let relatedQuery = supabase
    .from("tracks")
    .select(TRACK_SELECT)
    .eq("is_published", true)
    .neq("id", track.id)
    .limit(8);
  if (track.genre_id) relatedQuery = relatedQuery.eq("genre_id", track.genre_id);

  const { data: relatedData } = await relatedQuery;
  return { track, related: (relatedData || []) as unknown as Track[] };
}

export async function getPublishedArtistsClient(limit = 60): Promise<Artist[]> {
  if (!isSupabasePublicConfigured()) return [];
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("artists")
    .select("*")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("monthly_listeners", { ascending: false })
    .limit(limit);
  return (data || []) as Artist[];
}

export async function getPublishedArtistBySlugClient(slug: string): Promise<{ artist: Artist | null; tracks: Track[]; albums: Album[] }> {
  if (!isSupabasePublicConfigured() || !slug) return { artist: null, tracks: [], albums: [] };
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { artist: null, tracks: [], albums: [] };

  const { data: artist } = await supabase
    .from("artists")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!artist) return { artist: null, tracks: [], albums: [] };

  const [{ data: tracks }, { data: albums }] = await Promise.all([
    supabase
      .from("tracks")
      .select(TRACK_SELECT)
      .eq("artist_id", artist.id)
      .eq("is_published", true)
      .order("play_count", { ascending: false }),
    supabase
      .from("albums")
      .select("*, artist:artists(id, name, slug, image_url)")
      .eq("artist_id", artist.id)
      .eq("is_published", true)
      .order("release_date", { ascending: false }),
  ]);

  return {
    artist: artist as Artist,
    tracks: (tracks || []) as unknown as Track[],
    albums: (albums || []) as unknown as Album[],
  };
}

export async function getPublishedAlbumsClient(limit = 60): Promise<Album[]> {
  if (!isSupabasePublicConfigured()) return [];
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("albums")
    .select("*, artist:artists(id, name, slug, image_url)")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as unknown as Album[];
}

export async function getPublishedAlbumBySlugClient(slug: string): Promise<{ album: Album | null; tracks: Track[] }> {
  if (!isSupabasePublicConfigured() || !slug) return { album: null, tracks: [] };
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { album: null, tracks: [] };

  const { data: album } = await supabase
    .from("albums")
    .select("*, artist:artists(id, name, slug, image_url)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!album) return { album: null, tracks: [] };

  const { data: tracks } = await supabase
    .from("tracks")
    .select(TRACK_SELECT)
    .eq("album_id", album.id)
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  return { album: album as unknown as Album, tracks: (tracks || []) as unknown as Track[] };
}

export async function getGenresClient(): Promise<Genre[]> {
  if (!isSupabasePublicConfigured()) return DEFAULT_GENRES;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return DEFAULT_GENRES;
  const { data } = await supabase.from("genres").select("*").order("display_order", { ascending: true });
  return data && data.length > 0 ? (data as Genre[]) : DEFAULT_GENRES;
}

export async function getPublishedPlaylistsClient(limit = 60): Promise<Playlist[]> {
  if (!isSupabasePublicConfigured()) return [];
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("playlists")
    .select("*, playlist_tracks(count)")
    .eq("is_published", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  return (data as Array<Record<string, unknown>>).map((row) => ({
    ...(row as unknown as Playlist),
    track_count: Array.isArray(row.playlist_tracks)
      ? ((row.playlist_tracks[0] as { count?: number })?.count ?? 0)
      : 0,
  }));
}

export async function getPublishedPlaylistBySlugClient(slug: string): Promise<{ playlist: Playlist | null; tracks: Track[] }> {
  if (!isSupabasePublicConfigured() || !slug) return { playlist: null, tracks: [] };
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { playlist: null, tracks: [] };

  const { data: playlist } = await supabase
    .from("playlists")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!playlist) return { playlist: null, tracks: [] };

  const { data: items } = await supabase
    .from("playlist_tracks")
    .select(`position, track:tracks(${TRACK_SELECT})`)
    .eq("playlist_id", playlist.id)
    .order("position", { ascending: true });

  const tracks = ((items || []) as unknown as Array<{ position: number; track: Track | Track[] | null }>)
    .map((i) => (Array.isArray(i.track) ? i.track[0] ?? null : i.track))
    .filter((t): t is Track => Boolean(t && t.is_published));

  return { playlist: playlist as Playlist, tracks };
}

export async function resolvePublishedTracksByIdsClient(ids: string[]): Promise<Track[]> {
  if (!isSupabasePublicConfigured() || ids.length === 0) return [];
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tracks")
    .select(TRACK_SELECT)
    .in("id", ids.slice(0, 60))
    .eq("is_published", true);
  return (data || []) as unknown as Track[];
}

export async function searchPublishedCatalogClient(opts: {
  q?: string;
  type?: "all" | "songs" | "artists" | "albums" | "playlists" | "genres";
  genreSlug?: string;
  limit?: number;
}) {
  const rawQuery = sanitizeText(opts.q || "", 100);
  const type = opts.type || "all";
  const limit = opts.limit || 24;

  if (!isSupabasePublicConfigured()) {
    const matchedGenres = rawQuery
      ? DEFAULT_GENRES.filter((g) => g.name.toLowerCase().includes(rawQuery.toLowerCase()))
      : DEFAULT_GENRES;
    return {
      query: rawQuery,
      tracks: [] as Track[],
      artists: [] as Artist[],
      albums: [] as Album[],
      playlists: [] as Playlist[],
      genres: type === "all" || type === "genres" ? matchedGenres : [],
    };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { query: rawQuery, tracks: [], artists: [], albums: [], playlists: [], genres: [] };
  }

  const likePattern = rawQuery ? `%${rawQuery.replace(/[%_]/g, "")}%` : null;
  const shouldSearch = (target: string) => type === "all" || type === target;

  const [tracksRes, artistsRes, albumsRes, playlistsRes, genresRes] = await Promise.all([
    shouldSearch("songs")
      ? (() => {
          let q = supabase
            .from("tracks")
            .select(TRACK_SELECT)
            .eq("is_published", true)
            .order("play_count", { ascending: false })
            .limit(limit);
          if (likePattern) q = q.or(`title.ilike.${likePattern},description.ilike.${likePattern},language.ilike.${likePattern}`);
          return q;
        })()
      : Promise.resolve({ data: [] }),
    shouldSearch("artists")
      ? (() => {
          let q = supabase
            .from("artists")
            .select("*")
            .eq("is_published", true)
            .order("monthly_listeners", { ascending: false })
            .limit(limit);
          if (likePattern) q = q.ilike("name", likePattern);
          return q;
        })()
      : Promise.resolve({ data: [] }),
    shouldSearch("albums")
      ? (() => {
          let q = supabase
            .from("albums")
            .select("*, artist:artists(id, name, slug, image_url)")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(limit);
          if (likePattern) q = q.ilike("title", likePattern);
          return q;
        })()
      : Promise.resolve({ data: [] }),
    shouldSearch("playlists")
      ? (() => {
          let q = supabase
            .from("playlists")
            .select("*")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(limit);
          if (likePattern) q = q.ilike("title", likePattern);
          return q;
        })()
      : Promise.resolve({ data: [] }),
    shouldSearch("genres")
      ? (() => {
          let q = supabase.from("genres").select("*").order("display_order", { ascending: true });
          if (likePattern) q = q.ilike("name", likePattern);
          return q;
        })()
      : Promise.resolve({ data: [] }),
  ]);

  let tracks = (tracksRes.data || []) as unknown as Track[];
  if (likePattern && shouldSearch("songs") && tracks.length < limit) {
    const artistIds = ((artistsRes.data || []) as Artist[]).map((a) => a.id);
    if (artistIds.length > 0) {
      const { data: artistTracks } = await supabase
        .from("tracks")
        .select(TRACK_SELECT)
        .eq("is_published", true)
        .in("artist_id", artistIds)
        .limit(limit);
      const seen = new Set(tracks.map((t) => t.id));
      for (const t of (artistTracks || []) as unknown as Track[]) {
        if (!seen.has(t.id)) {
          tracks.push(t);
          seen.add(t.id);
        }
      }
    }
  }

  if (opts.genreSlug) {
    tracks = tracks.filter((t) => t.genre?.slug === opts.genreSlug);
  }

  return {
    query: rawQuery,
    tracks,
    artists: (artistsRes.data || []) as Artist[],
    albums: (albumsRes.data || []) as unknown as Album[],
    playlists: (playlistsRes.data || []) as Playlist[],
    genres: (genresRes.data && genresRes.data.length > 0 ? genresRes.data : []) as Genre[],
  };
}

export async function recordTrackPlayClient(trackId: string): Promise<void> {
  if (!isSupabasePublicConfigured()) return;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.rpc("record_play_event", {
    target_track_id: trackId,
    p_session_id: "web-listener",
  });
}

export async function downloadAuthorizedTrackClient(
  track: Track,
  policy: "track_level" | "disabled" = "track_level"
): Promise<{ ok: boolean; error?: string }> {
  if (policy === "disabled") {
    return { ok: false, error: "Public downloads are currently disabled." };
  }
  if (!track.is_published || !track.is_downloadable || !track.audio_url) {
    return { ok: false, error: "Downloads are not enabled for this track." };
  }

  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    const { data: allowed } = await supabase.rpc("record_download_event", {
      target_track_id: track.id,
    });
    if (allowed === false) {
      return { ok: false, error: "Download permission denied." };
    }
  }

  const artistName = track.artist?.name;
  const baseName = artistName ? `${artistName} - ${track.title}` : track.title;
  const extMatch = (track.audio_path || track.audio_url).match(/\.(mp3|m4a|wav|ogg)/i);
  const ext = extMatch ? extMatch[0].toLowerCase() : ".mp3";
  const filename = `${sanitizeFilename(baseName)}${ext}`;

  try {
    const res = await fetch(track.audio_url);
    if (!res.ok) throw new Error("Failed to fetch audio");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    return { ok: true };
  } catch {
    const a = document.createElement("a");
    a.href = track.audio_url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { ok: true };
  }
}
