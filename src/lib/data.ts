import { getSupabaseServerClient } from "./supabase/server";
import { BRAND_CONFIG, isSupabasePublicConfigured } from "./supabase/config";
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

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isSupabasePublicConfigured()) return DEFAULT_SITE_SETTINGS;
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return DEFAULT_SITE_SETTINGS;
    const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return DEFAULT_SITE_SETTINGS;
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...(data as Partial<SiteSettings>),
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export async function getPublishedTracks(options?: {
  limit?: number;
  featuredOnly?: boolean;
  genreSlug?: string;
  sortBy?: "recent" | "trending" | "title";
}): Promise<Track[]> {
  if (!isSupabasePublicConfigured()) return [];
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return [];

    let query = supabase
      .from("tracks")
      .select(TRACK_SELECT)
      .eq("is_published", true);

    if (options?.featuredOnly) {
      query = query.eq("is_featured", true);
    }

    if (options?.sortBy === "trending") {
      query = query.order("play_count", { ascending: false }).order("created_at", { ascending: false });
    } else if (options?.sortBy === "title") {
      query = query.order("title", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

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

export async function getPublishedTrackBySlug(slug: string): Promise<{ track: Track | null; related: Track[] }> {
  if (!isSupabasePublicConfigured()) return { track: null, related: [] };
  try {
    const supabase = await getSupabaseServerClient();
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

    if (track.genre_id) {
      relatedQuery = relatedQuery.eq("genre_id", track.genre_id);
    }

    const { data: relatedData } = await relatedQuery;
    return {
      track,
      related: (relatedData || []) as unknown as Track[],
    };
  } catch {
    return { track: null, related: [] };
  }
}

export async function getPublishedArtists(limit = 30): Promise<Artist[]> {
  if (!isSupabasePublicConfigured()) return [];
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("artists")
      .select("*")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("monthly_listeners", { ascending: false })
      .limit(limit);
    return (data || []) as Artist[];
  } catch {
    return [];
  }
}

export async function getPublishedArtistBySlug(slug: string): Promise<{ artist: Artist | null; tracks: Track[]; albums: Album[] }> {
  if (!isSupabasePublicConfigured()) return { artist: null, tracks: [], albums: [] };
  try {
    const supabase = await getSupabaseServerClient();
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
  } catch {
    return { artist: null, tracks: [], albums: [] };
  }
}

export async function getPublishedAlbums(limit = 30): Promise<Album[]> {
  if (!isSupabasePublicConfigured()) return [];
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("albums")
      .select("*, artist:artists(id, name, slug, image_url)")
      .eq("is_published", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data || []) as unknown as Album[];
  } catch {
    return [];
  }
}

export async function getPublishedAlbumBySlug(slug: string): Promise<{ album: Album | null; tracks: Track[] }> {
  if (!isSupabasePublicConfigured()) return { album: null, tracks: [] };
  try {
    const supabase = await getSupabaseServerClient();
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

    return {
      album: album as unknown as Album,
      tracks: (tracks || []) as unknown as Track[],
    };
  } catch {
    return { album: null, tracks: [] };
  }
}

export async function getGenres(): Promise<Genre[]> {
  if (!isSupabasePublicConfigured()) return DEFAULT_GENRES;
  try {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return DEFAULT_GENRES;
    const { data } = await supabase
      .from("genres")
      .select("*")
      .order("display_order", { ascending: true });
    if (!data || data.length === 0) return DEFAULT_GENRES;
    return data as Genre[];
  } catch {
    return DEFAULT_GENRES;
  }
}

export async function getPublishedPlaylists(limit = 30): Promise<Playlist[]> {
  if (!isSupabasePublicConfigured()) return [];
  try {
    const supabase = await getSupabaseServerClient();
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
  } catch {
    return [];
  }
}

export async function getPublishedPlaylistBySlug(slug: string): Promise<{ playlist: Playlist | null; tracks: Track[] }> {
  if (!isSupabasePublicConfigured()) return { playlist: null, tracks: [] };
  try {
    const supabase = await getSupabaseServerClient();
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

    return {
      playlist: playlist as Playlist,
      tracks,
    };
  } catch {
    return { playlist: null, tracks: [] };
  }
}
