import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { sanitizeText } from "@/lib/security";
import { DEFAULT_GENRES } from "@/lib/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = sanitizeText(searchParams.get("q") || "", 100);
  const type = sanitizeText(searchParams.get("type") || "all", 20);
  const genreSlug = sanitizeText(searchParams.get("genre") || "", 60);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || "24"), 1), 50);

  if (!isSupabasePublicConfigured()) {
    const matchedGenres = rawQuery
      ? DEFAULT_GENRES.filter((g) => g.name.toLowerCase().includes(rawQuery.toLowerCase()))
      : DEFAULT_GENRES;
    return NextResponse.json({
      query: rawQuery,
      tracks: [],
      artists: [],
      albums: [],
      playlists: [],
      genres: matchedGenres,
    });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ query: rawQuery, tracks: [], artists: [], albums: [], playlists: [], genres: [] });
  }

  const likePattern = rawQuery ? `%${rawQuery.replace(/[%_]/g, "")}%` : null;

  const shouldSearch = (target: string) => type === "all" || type === target;

  const [tracksRes, artistsRes, albumsRes, playlistsRes, genresRes] = await Promise.all([
    shouldSearch("songs")
      ? (() => {
          let q = supabase
            .from("tracks")
            .select(
              "*, artist:artists(id, name, slug, image_url), album:albums(id, title, slug, cover_url), genre:genres(id, name, slug, color_accent)"
            )
            .eq("is_published", true)
            .order("play_count", { ascending: false })
            .limit(limit);
          if (likePattern) {
            q = q.or(`title.ilike.${likePattern},description.ilike.${likePattern},language.ilike.${likePattern}`);
          }
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

  let tracks = (tracksRes.data || []) as Array<Record<string, unknown>>;

  // Also include published tracks whose artist, album, or genre name matches the query
  if (likePattern && shouldSearch("songs") && tracks.length < limit) {
    const artistIds = ((artistsRes.data || []) as Array<{ id: string }>).map((a) => a.id);
    if (artistIds.length > 0) {
      const { data: artistTracks } = await supabase
        .from("tracks")
        .select(
          "*, artist:artists(id, name, slug, image_url), album:albums(id, title, slug, cover_url), genre:genres(id, name, slug, color_accent)"
        )
        .eq("is_published", true)
        .in("artist_id", artistIds)
        .limit(limit);

      const seen = new Set(tracks.map((t) => String(t.id)));
      for (const t of (artistTracks || []) as Array<Record<string, unknown>>) {
        if (!seen.has(String(t.id))) {
          tracks.push(t);
          seen.add(String(t.id));
        }
      }
    }
  }

  if (genreSlug) {
    tracks = tracks.filter((t) => {
      const g = t.genre as { slug?: string } | null | undefined;
      return g?.slug === genreSlug;
    });
  }

  return NextResponse.json({
    query: rawQuery,
    tracks,
    artists: artistsRes.data || [],
    albums: albumsRes.data || [],
    playlists: playlistsRes.data || [],
    genres: genresRes.data && genresRes.data.length > 0 ? genresRes.data : [],
  });
}
