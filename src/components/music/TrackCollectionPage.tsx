"use client";

import React, { useState } from "react";
import { LayoutGrid, List, Play, Shuffle } from "lucide-react";
import type { Track } from "@/types/music";
import { usePlayer } from "@/context/PlayerContext";
import { TrackCard } from "./TrackCard";
import { EmptyLibraryState, TrackRow } from "./CollectionCards";

export function TrackCollectionView({
  title,
  subtitle,
  tracks,
  downloadPolicy = "track_level",
  emptyTitle,
  emptySubtitle,
}: {
  title: string;
  subtitle: string;
  tracks: Track[];
  downloadPolicy?: "track_level" | "disabled";
  emptyTitle?: string;
  emptySubtitle?: string;
}) {
  const { playQueue } = usePlayer();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--gm-border)] pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{title}</h1>
          <p className="text-sm text-[var(--gm-text-muted)] mt-1">{subtitle}</p>
        </div>

        {tracks.length > 0 && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => playQueue(tracks, 0, false)}
              className="px-4 py-2 rounded-full gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Play All
            </button>
            <button
              type="button"
              onClick={() => playQueue(tracks, 0, true)}
              className="px-4 py-2 rounded-full gm-surface hover:bg-[var(--gm-surface-hover)] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Shuffle className="h-3.5 w-3.5 text-emerald-400" />
              Shuffle
            </button>
            <div className="flex items-center gm-surface rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`p-1.5 rounded-lg ${
                  viewMode === "grid" ? "bg-white/15 text-[var(--gm-text)]" : "text-[var(--gm-text-muted)]"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`p-1.5 rounded-lg ${
                  viewMode === "list" ? "bg-white/15 text-[var(--gm-text)]" : "text-[var(--gm-text-muted)]"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {tracks.length === 0 ? (
        <EmptyLibraryState title={emptyTitle} subtitle={emptySubtitle} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              contextQueue={tracks}
              downloadPolicy={downloadPolicy}
            />
          ))}
        </div>
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
