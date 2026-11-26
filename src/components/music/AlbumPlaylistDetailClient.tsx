"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, ListMusic, Play, Shuffle } from "lucide-react";
import type { Track } from "@/types/music";
import { usePlayer } from "@/context/PlayerContext";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import { formatDate, formatTotalDuration } from "@/lib/format";
import { EmptyLibraryState, TrackRow } from "./CollectionCards";

export function CollectionDetailView({
  kind,
  title,
  description,
  coverUrl,
  artistName,
  artistSlug,
  releaseDate,
  tracks,
  downloadPolicy = "track_level",
}: {
  kind: "Album" | "Playlist";
  title: string;
  description: string | null;
  coverUrl: string | null;
  artistName?: string | null;
  artistSlug?: string | null;
  releaseDate?: string | null;
  tracks: Track[];
  downloadPolicy?: "track_level" | "disabled";
}) {
  const { playQueue } = usePlayer();
  const totalDurationLabel = formatTotalDuration(tracks.map((t) => t.duration_seconds));

  return (
    <div className="space-y-8">
      <div className="gm-surface gm-rainbow-border rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row items-center md:items-end gap-7">
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl shrink-0">
          <Image
            src={coverUrl || BRAND_CONFIG.defaultCoverPath}
            alt={title}
            fill
            sizes="224px"
            className="object-cover"
            priority
          />
        </div>

        <div className="space-y-3 text-center md:text-left flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider">
            <ListMusic className="h-3.5 w-3.5 text-purple-400" />
            {kind}
          </span>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{title}</h1>

          {description && (
            <p className="text-sm text-[var(--gm-text-muted)] max-w-2xl">{description}</p>
          )}

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-[var(--gm-text-muted)]">
            {artistName && (
              <span className="font-semibold text-[var(--gm-text)]">
                {artistSlug ? (
                  <Link href={`/artists/${artistSlug}`} className="hover:underline">
                    {artistName}
                  </Link>
                ) : (
                  artistName
                )}
              </span>
            )}
            <span>{tracks.length} songs</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {totalDurationLabel}
            </span>
            {releaseDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(releaseDate)}
              </span>
            )}
          </div>

          {tracks.length > 0 && (
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={() => playQueue(tracks, 0, false)}
                className="px-6 py-2.5 rounded-full gm-rainbow-gradient text-white text-sm font-bold inline-flex items-center gap-2 shadow-lg shadow-purple-500/20"
              >
                <Play className="h-4 w-4 fill-current" />
                Play All
              </button>
              <button
                type="button"
                onClick={() => playQueue(tracks, 0, true)}
                className="px-5 py-2.5 rounded-full gm-surface hover:bg-[var(--gm-surface-hover)] text-sm font-semibold inline-flex items-center gap-2"
              >
                <Shuffle className="h-4 w-4 text-emerald-400" />
                Shuffle All
              </button>
            </div>
          )}
        </div>
      </div>

      {tracks.length === 0 ? (
        <EmptyLibraryState
          title={`No Tracks in This ${kind} Yet`}
          subtitle={`Tracks added to this ${kind.toLowerCase()} in the Admin Control Center will appear here automatically.`}
        />
      ) : (
        <div className="gm-surface rounded-2xl p-2 divide-y divide-[var(--gm-border)]">
          {tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              queue={tracks}
              downloadPolicy={downloadPolicy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
