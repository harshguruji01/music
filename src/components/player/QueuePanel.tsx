"use client";

import React from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ListMusic, Trash2, X } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import { formatDuration } from "@/lib/format";

export function QueuePanel() {
  const {
    queue,
    currentIndex,
    isQueueOpen,
    setQueueOpen,
    playTrack,
    removeFromQueue,
    reorderQueue,
    clearQueue,
  } = usePlayer();

  if (!isQueueOpen) return null;

  return (
    <aside
      aria-label="Playback queue"
      className="fixed top-0 right-0 bottom-16 md:bottom-[74px] w-full sm:w-80 z-30 gm-glass border-l border-[var(--gm-border)] flex flex-col shadow-2xl"
    >
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--gm-border)]">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <ListMusic className="h-4 w-4 text-purple-400" />
          <span>Queue ({queue.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {queue.length > 0 && (
            <button
              type="button"
              onClick={clearQueue}
              className="text-xs text-[var(--gm-text-muted)] hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-white/5"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setQueueOpen(false)}
            className="p-1.5 rounded-lg text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] hover:bg-white/5"
            aria-label="Close queue panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 gm-scrollbar">
        {queue.length === 0 ? (
          <div className="text-center py-12 px-4">
            <ListMusic className="h-8 w-8 mx-auto text-[var(--gm-text-muted)] mb-2 opacity-60" />
            <p className="text-sm font-medium">Your queue is empty</p>
            <p className="text-xs text-[var(--gm-text-muted)] mt-1">
              Click play on any song or choose &ldquo;Add to queue&rdquo; to build your session.
            </p>
          </div>
        ) : (
          queue.map((track, idx) => {
            const active = idx === currentIndex;
            return (
              <div
                key={`${track.id}-${idx}`}
                className={`group flex items-center gap-2.5 p-2 rounded-xl transition-colors ${
                  active
                    ? "bg-purple-500/15 ring-1 ring-purple-500/30"
                    : "hover:bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => playTrack(track, queue)}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                >
                  <Image
                    src={track.cover_url || BRAND_CONFIG.defaultCoverPath}
                    alt={track.title}
                    width={40}
                    height={40}
                    className="rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold truncate ${
                        active ? "text-purple-300" : "text-[var(--gm-text)]"
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-[11px] text-[var(--gm-text-muted)] truncate">
                      {track.artist?.name || BRAND_CONFIG.owner} •{" "}
                      {formatDuration(track.duration_seconds)}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => reorderQueue(idx, idx - 1)}
                      aria-label="Move up"
                      className="p-1 text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {idx < queue.length - 1 && (
                    <button
                      type="button"
                      onClick={() => reorderQueue(idx, idx + 1)}
                      aria-label="Move down"
                      className="p-1 text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFromQueue(idx)}
                    aria-label="Remove track from queue"
                    className="p-1 text-[var(--gm-text-muted)] hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
