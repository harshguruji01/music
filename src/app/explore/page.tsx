"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Flame, Sparkles, TrendingUp } from "lucide-react";
import {
  DEFAULT_GENRES,
  getGenresClient,
  getPublishedAlbumsClient,
  getPublishedArtistsClient,
  getPublishedTracksClient,
  getSiteSettingsClient,
} from "@/lib/public-api";
import { TrackCard } from "@/components/music/TrackCard";
import {
  AlbumCard,
  ArtistCard,
  CardGridSkeleton,
  EmptyLibraryState,
  GenreCard,
} from "@/components/music/CollectionCards";
import type { Album, Artist, Genre, Track } from "@/types/music";

export default function ExplorePage() {
  const [genres, setGenres] = useState<Genre[]>(DEFAULT_GENRES);
  const [trending, setTrending] = useState<Track[]>([]);
  const [recent, setRecent] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [policy, setPolicy] = useState<"track_level" | "disabled">("track_level");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getGenresClient(),
      getPublishedTracksClient({ limit: 12, sortBy: "trending" }),
      getPublishedTracksClient({ limit: 12, sortBy: "recent" }),
      getPublishedArtistsClient(6),
      getPublishedAlbumsClient(6),
      getSiteSettingsClient(),
    ])
      .then(([g, tr, rec, art, alb, st]) => {
        if (!active) return;
        setGenres(g);
        setTrending(tr);
        setRecent(rec);
        setArtists(art);
        setAlbums(alb);
        setPolicy(st.public_download_policy);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <CardGridSkeleton count={12} />;

  return (
    <div className="space-y-10">
      <div className="border-b border-[var(--gm-border)] pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Compass className="h-7 w-7 text-blue-400" />
            Explore Guru Music
          </h1>
          <p className="text-sm text-[var(--gm-text-muted)] mt-1">
            Discover genres, rising independent creators, trending hits, and fresh releases.
          </p>
        </div>
        <Link
          href="/search/"
          className="px-4 py-2 rounded-full gm-surface hover:bg-white/10 text-xs font-semibold"
        >
          Search Catalog
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          Browse by Mood & Genre
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {genres.map((genre) => (
            <GenreCard key={genre.id} genre={genre} />
          ))}
        </div>
      </section>

      {trending.length === 0 && recent.length === 0 ? (
        <EmptyLibraryState />
      ) : (
        <>
          {trending.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Trending Now
                </h2>
                <Link href="/trending/" className="text-xs font-semibold text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]">
                  See all
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {trending.slice(0, 6).map((t) => (
                  <TrackCard key={t.id} track={t} contextQueue={trending} downloadPolicy={policy} />
                ))}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  Fresh Releases
                </h2>
                <Link href="/recent/" className="text-xs font-semibold text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]">
                  See all
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {recent.slice(0, 6).map((t) => (
                  <TrackCard key={t.id} track={t} contextQueue={recent} downloadPolicy={policy} />
                ))}
              </div>
            </section>
          )}

          {artists.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold">Featured Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {artists.map((a) => (
                  <ArtistCard key={a.id} artist={a} />
                ))}
              </div>
            </section>
          )}

          {albums.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold">New Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {albums.map((al) => (
                  <AlbumCard key={al.id} album={al} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
