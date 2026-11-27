"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Search as SearchIcon, Trash2, X } from "lucide-react";
import type { Album, Artist, Genre, Playlist, Track } from "@/types/music";
import { searchPublishedCatalogClient } from "@/lib/public-api";
import { TrackCard } from "@/components/music/TrackCard";
import {
  AlbumCard,
  ArtistCard,
  CardGridSkeleton,
  GenreCard,
  PlaylistCard,
} from "@/components/music/CollectionCards";

type SearchFilterType = "all" | "songs" | "artists" | "albums" | "playlists" | "genres";

interface SearchResultsPayload {
  query: string;
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  genres: Genre[];
}

function SearchClientInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [filterType, setFilterType] = useState<SearchFilterType>("all");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultsPayload>({
    query: "",
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
    genres: [],
  });

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setQuery(searchParams.get("q") || "");
    });
    return () => {
      active = false;
    };
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = JSON.parse(localStorage.getItem("gm_recent_searches") || "[]");
        if (Array.isArray(saved)) setRecentSearches(saved);
      } catch {
        // ignore
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      searchPublishedCatalogClient({
        q: query.trim(),
        type: filterType,
        genreSlug: selectedGenre || undefined,
      })
        .then((data) => {
          if (active) setResults(data);
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 80);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, filterType, selectedGenre]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = query.trim();
    if (cleaned) {
      const next = [cleaned, ...recentSearches.filter((s) => s !== cleaned)].slice(0, 8);
      setRecentSearches(next);
      try {
        localStorage.setItem("gm_recent_searches", JSON.stringify(next));
      } catch {
        // ignore
      }
      router.replace(`/search/?q=${encodeURIComponent(cleaned)}`);
    } else {
      router.replace("/search/");
    }
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("gm_recent_searches");
    } catch {
      // ignore
    }
  };

  const totalMatches =
    results.tracks.length +
    results.artists.length +
    results.albums.length +
    results.playlists.length +
    results.genres.length;

  return (
    <div className="space-y-7">
      <div className="space-y-4">
        <h1 className="text-3xl font-black tracking-tight">Search Guru Music</h1>

        <form onSubmit={handleSubmit} className="relative max-w-2xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--gm-text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums, playlists, or genres..."
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl gm-surface text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "all", label: "All" },
              { id: "songs", label: "Songs" },
              { id: "artists", label: "Artists" },
              { id: "albums", label: "Albums" },
              { id: "playlists", label: "Playlists" },
              { id: "genres", label: "Genres" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterType === f.id
                  ? "gm-rainbow-gradient text-white shadow"
                  : "gm-surface text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
              }`}
            >
              {f.label}
            </button>
          ))}

          {selectedGenre && (
            <button
              type="button"
              onClick={() => setSelectedGenre("")}
              className="px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold inline-flex items-center gap-1"
            >
              Genre: {selectedGenre} <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {recentSearches.length > 0 && !query && (
        <section className="space-y-3">
          <div className="flex items-center justify-between max-w-2xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--gm-text-muted)] flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Searches
            </h2>
            <button
              type="button"
              onClick={clearRecent}
              className="text-xs text-[var(--gm-text-muted)] hover:text-rose-400 inline-flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="px-3.5 py-1.5 rounded-full gm-surface hover:bg-[var(--gm-surface-hover)] text-xs font-medium"
              >
                {term}
              </button>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : totalMatches === 0 ? (
        <div className="gm-surface rounded-3xl p-10 text-center max-w-lg mx-auto">
          <SearchIcon className="h-10 w-10 mx-auto text-[var(--gm-text-muted)] mb-3 opacity-60" />
          <h2 className="text-lg font-bold">
            {query ? `No matches for "${query}"` : "No published results yet"}
          </h2>
          <p className="text-sm text-[var(--gm-text-muted)] mt-1">
            Try another song title, artist name, album, or publish tracks from the Admin Control Center.
          </p>
        </div>
      ) : (
        <div className="space-y-9">
          {results.tracks.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">Songs ({results.tracks.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {results.tracks.map((track) => (
                  <TrackCard key={track.id} track={track} contextQueue={results.tracks} />
                ))}
              </div>
            </section>
          )}

          {results.artists.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">Artists ({results.artists.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.artists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </section>
          )}

          {results.albums.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">Albums ({results.albums.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.albums.map((album) => (
                  <AlbumCard key={album.id} album={album} />
                ))}
              </div>
            </section>
          )}

          {results.playlists.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">Playlists ({results.playlists.length})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {results.playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </section>
          )}

          {results.genres.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold">Categories & Genres</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {results.genres.map((genre) => (
                  <GenreCard key={genre.id} genre={genre} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={6} />}>
      <SearchClientInner />
    </Suspense>
  );
}
