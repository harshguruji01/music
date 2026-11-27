"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, Disc3, Download, Heart, ListPlus, Music2, Pause, Play, User } from "lucide-react";
import type { Track } from "@/types/music";
import { usePlayer } from "@/context/PlayerContext";
import { useToast } from "@/context/ToastContext";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import { downloadAuthorizedTrackClient } from "@/lib/public-api";
import { formatCount, formatDate, formatDuration } from "@/lib/format";
import { TrackCard } from "./TrackCard";

export function SongDetailClient({
  track,
  related,
  downloadPolicy = "track_level",
}: {
  track: Track;
  related: Track[];
  downloadPolicy?: "track_level" | "disabled";
}) {
  const { currentTrack, isPlaying, favorites, playTrack, togglePlayPause, addToQueue, toggleFavorite } =
    usePlayer();
  const { showToast } = useToast();

  const isActive = currentTrack?.id === track.id;
  const isFav = favorites.includes(track.id);
  const canDownload =
    downloadPolicy !== "disabled" && track.is_published && track.is_downloadable;

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl gm-surface gm-rainbow-border p-6 sm:p-10">
        <div className="grid md:grid-cols-[260px_1fr] gap-8 items-center">
          <div className="relative aspect-square w-full max-w-[260px] mx-auto md:mx-0 rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/20">
            <Image
              src={track.cover_url || BRAND_CONFIG.defaultCoverPath}
              alt={track.title}
              fill
              sizes="260px"
              className="object-cover"
              priority
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              {track.genre && (
                <Link
                  href={`/genres/view/?slug=${encodeURIComponent(track.genre.slug)}`}
                  className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/15"
                >
                  {track.genre.name}
                </Link>
              )}
              {track.language && (
                <span className="px-3 py-1 rounded-full bg-white/5 text-[var(--gm-text-muted)]">
                  {track.language}
                </span>
              )}
              {track.is_featured && (
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300">
                  Featured
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{track.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--gm-text-muted)]">
              <span className="inline-flex items-center gap-1.5 text-[var(--gm-text)] font-semibold">
                <User className="h-4 w-4 text-blue-400" />
                {track.artist ? (
                  <Link href={`/artists/view/?slug=${encodeURIComponent(track.artist.slug)}`} className="hover:underline">
                    {track.artist.name}
                  </Link>
                ) : (
                  BRAND_CONFIG.owner
                )}
              </span>

              {track.album && (
                <span className="inline-flex items-center gap-1.5">
                  <Disc3 className="h-4 w-4 text-purple-400" />
                  <Link href={`/albums/view/?slug=${encodeURIComponent(track.album.slug)}`} className="hover:underline">
                    {track.album.title}
                  </Link>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(track.duration_seconds)}
              </span>

              {track.release_date && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(track.release_date)}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5">
                <Music2 className="h-4 w-4 text-emerald-400" />
                {formatCount(track.play_count)} plays
              </span>
            </div>

            {track.description && (
              <p className="text-sm text-[var(--gm-text-muted)] leading-relaxed max-w-2xl">
                {track.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => (isActive ? togglePlayPause() : playTrack(track, [track, ...related]))}
                className="px-6 py-3 rounded-full gm-rainbow-gradient text-white font-bold text-sm inline-flex items-center gap-2 shadow-xl shadow-purple-500/25"
              >
                {isActive && isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 fill-current" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Play Song
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => addToQueue(track)}
                className="px-4 py-3 rounded-full gm-surface hover:bg-[var(--gm-surface-hover)] text-sm font-semibold inline-flex items-center gap-2"
              >
                <ListPlus className="h-4 w-4" />
                Add to Queue
              </button>

              <button
                type="button"
                onClick={() => toggleFavorite(track.id)}
                className={`px-4 py-3 rounded-full gm-surface hover:bg-[var(--gm-surface-hover)] text-sm font-semibold inline-flex items-center gap-2 ${
                  isFav ? "text-rose-400" : ""
                }`}
              >
                <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                {isFav ? "Favorited" : "Favorite"}
              </button>

              {canDownload && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await downloadAuthorizedTrackClient(track, downloadPolicy);
                    if (!res.ok && res.error) showToast(res.error, "error");
                  }}
                  className="px-5 py-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {track.lyrics && (
        <section className="gm-surface rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-3">Lyrics & Credits</h2>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--gm-text-muted)]">
            {track.lyrics}
          </pre>
        </section>
      )}

      {related.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Related Tracks</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {related.map((t) => (
              <TrackCard key={t.id} track={t} contextQueue={related} downloadPolicy={downloadPolicy} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
