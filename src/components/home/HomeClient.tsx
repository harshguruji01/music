"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Compass, Headphones, Play, Sparkles } from "lucide-react";
import type { Album, Artist, Genre, Playlist, SiteSettings, Track } from "@/types/music";
import { usePlayer } from "@/context/PlayerContext";
import { TrackCard } from "@/components/music/TrackCard";
import {
  AlbumCard,
  ArtistCard,
  EmptyLibraryState,
  GenreCard,
  PlaylistCard,
} from "@/components/music/CollectionCards";

interface HomeClientProps {
  settings: SiteSettings;
  allTracks: Track[];
  trendingTracks: Track[];
  featuredTracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  genres: Genre[];
}

const GENRE_SECTION_MAP: Record<string, { slug: string; title: string }> = {
  genre_hindi: { slug: "hindi", title: "Hindi Music" },
  genre_english: { slug: "english", title: "English Music" },
  genre_bollywood: { slug: "bollywood", title: "Bollywood" },
  genre_independent: { slug: "independent", title: "Independent Artists" },
  genre_hip_hop_rap: { slug: "hip-hop-rap", title: "Hip-Hop and Rap" },
  genre_electronic_edm: { slug: "electronic-edm", title: "Electronic and EDM" },
  genre_instrumental: { slug: "instrumental", title: "Instrumental" },
  genre_chill: { slug: "chill", title: "Chill and Relax" },
  genre_romantic: { slug: "romantic", title: "Romantic Music" },
  genre_cinematic: { slug: "cinematic", title: "Cinematic Music" },
};

function SectionHeader({
  title,
  href,
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <h2 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-xs font-semibold text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] inline-flex items-center gap-1"
        >
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export function HomeClient({
  settings,
  allTracks,
  trendingTracks,
  featuredTracks,
  artists,
  albums,
  playlists,
  genres,
}: HomeClientProps) {
  const { recentTracks, playQueue } = usePlayer();
  const policy = settings.public_download_policy;

  const startListeningList = trendingTracks.length > 0 ? trendingTracks : allTracks;
  const recommendedTracks =
    featuredTracks.length > 0 ? featuredTracks : allTracks.slice(0, 12);

  const enabledMap = new Map(
    (settings.homepage_sections || []).map((s) => [s.key, s])
  );
  const orderedKeys =
    settings.homepage_order && settings.homepage_order.length > 0
      ? settings.homepage_order
      : (settings.homepage_sections || []).map((s) => s.key);

  const hasAnyLibraryContent =
    allTracks.length > 0 || artists.length > 0 || albums.length > 0 || playlists.length > 0;

  return (
    <div className="space-y-10">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl gm-surface gm-rainbow-border p-6 sm:p-10 lg:p-12">
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-purple-600/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-blue-600/20 blur-[100px]" />

        <div className="relative z-10 grid lg:grid-cols-[1fr_auto] items-center gap-8">
          <div className="space-y-5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-[var(--gm-border)] text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="tracking-wider uppercase">
                GURU MUSIC • BY HARSHGURUJI
              </span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]"
            >
              Music <span className="gm-rainbow-text">Beyond Limits.</span>
            </motion.h1>

            <p className="text-base sm:text-lg text-[var(--gm-text-muted)] leading-relaxed max-w-xl">
              {settings.site_description ||
                "Discover your sound. Explore your world. Feel every beat."}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/songs"
                className="px-6 py-3 rounded-full gm-rainbow-gradient text-white font-bold text-sm shadow-xl shadow-purple-500/25 hover:opacity-95 transition-opacity inline-flex items-center gap-2"
              >
                <Compass className="h-4 w-4" />
                Explore Music
              </Link>

              {startListeningList.length > 0 ? (
                <button
                  type="button"
                  onClick={() => playQueue(startListeningList, 0, false)}
                  className="px-6 py-3 rounded-full gm-surface hover:bg-[var(--gm-surface-hover)] font-bold text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Play className="h-4 w-4 fill-current text-emerald-400" />
                  Start Listening
                </button>
              ) : (
                <Link
                  href="/genres"
                  className="px-6 py-3 rounded-full gm-surface hover:bg-[var(--gm-surface-hover)] font-bold text-sm inline-flex items-center gap-2 transition-colors"
                >
                  <Headphones className="h-4 w-4 text-blue-400" />
                  Start Listening
                </Link>
              )}
            </div>
          </div>

          <div className="hidden lg:flex flex-col items-center">
            <div className="relative p-1.5 rounded-3xl gm-rainbow-border shadow-2xl shadow-blue-500/20">
              <Image
                src="/brand/guru-music-logo.png"
                alt="Guru Music Official Logo"
                width={220}
                height={220}
                className="rounded-2xl object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Genre Quick Strip */}
      {genres.length > 0 && (
        <section>
          <SectionHeader title="Explore Sounds & Moods" href="/genres" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {genres.slice(0, 10).map((genre) => (
              <GenreCard key={genre.id} genre={genre} />
            ))}
          </div>
        </section>
      )}

      {/* Elegant Empty Library State until actual music is uploaded in Admin CMS */}
      {!hasAnyLibraryContent ? (
        <EmptyLibraryState />
      ) : (
        orderedKeys.map((key) => {
          const cfg = enabledMap.get(key);
          if (cfg && !cfg.enabled) return null;

          if (key === "recently_played") {
            if (recentTracks.length === 0) return null;
            return (
              <section key={key}>
                <SectionHeader title={cfg?.label || "Recently Played"} href="/library" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {recentTracks.slice(0, 6).map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      contextQueue={recentTracks}
                      downloadPolicy={policy}
                    />
                  ))}
                </div>
              </section>
            );
          }

          if (key === "trending_songs") {
            if (trendingTracks.length === 0) return null;
            return (
              <section key={key}>
                <SectionHeader title={cfg?.label || "Trending Songs"} href="/trending" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {trendingTracks.slice(0, 6).map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      contextQueue={trendingTracks}
                      downloadPolicy={policy}
                    />
                  ))}
                </div>
              </section>
            );
          }

          if (key === "recommended") {
            if (recommendedTracks.length === 0) return null;
            return (
              <section key={key}>
                <SectionHeader title={cfg?.label || "Recommended For You"} href="/featured" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {recommendedTracks.slice(0, 6).map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      contextQueue={recommendedTracks}
                      downloadPolicy={policy}
                    />
                  ))}
                </div>
              </section>
            );
          }

          if (key === "popular_artists") {
            if (artists.length === 0) return null;
            return (
              <section key={key}>
                <SectionHeader title={cfg?.label || "Popular Artists"} href="/artists" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {artists.slice(0, 6).map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}
                </div>
              </section>
            );
          }

          if (key === "new_releases") {
            if (allTracks.length === 0) return null;
            return (
              <section key={key}>
                <SectionHeader title={cfg?.label || "New Releases"} href="/recent" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {allTracks.slice(0, 6).map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      contextQueue={allTracks}
                      downloadPolicy={policy}
                    />
                  ))}
                </div>
              </section>
            );
          }

          if (key === "featured_albums") {
            if (albums.length === 0) return null;
            return (
              <section key={key}>
                <SectionHeader title={cfg?.label || "Featured Albums"} href="/albums" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {albums.slice(0, 6).map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
                </div>
              </section>
            );
          }

          if (key === "trending_playlists") {
            if (playlists.length === 0) return null;
            return (
              <section key={key}>
                <SectionHeader title={cfg?.label || "Trending Playlists"} href="/playlists" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {playlists.slice(0, 6).map((playlist) => (
                    <PlaylistCard key={playlist.id} playlist={playlist} />
                  ))}
                </div>
              </section>
            );
          }

          const genreInfo = GENRE_SECTION_MAP[key];
          if (genreInfo) {
            const matched = allTracks.filter(
              (t) => t.genre?.slug === genreInfo.slug
            );
            if (matched.length === 0) return null;
            return (
              <section key={key}>
                <SectionHeader
                  title={cfg?.label || genreInfo.title}
                  href={`/genres/view/?slug=${encodeURIComponent(genreInfo.slug)}`}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {matched.slice(0, 6).map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      contextQueue={matched}
                      downloadPolicy={policy}
                    />
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })
      )}
    </div>
  );
}
