"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Download,
  ExternalLink,
  Heart,
  ListPlus,
  MoreHorizontal,
  Pause,
  Play,
  PlusCircle,
} from "lucide-react";
import type { Track } from "@/types/music";
import { usePlayer } from "@/context/PlayerContext";
import { useToast } from "@/context/ToastContext";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import { downloadAuthorizedTrackClient } from "@/lib/public-api";
import { formatDuration } from "@/lib/format";

export function TrackCard({
  track,
  contextQueue,
  downloadPolicy = "track_level",
}: {
  track: Track;
  contextQueue?: Track[];
  downloadPolicy?: "track_level" | "disabled";
}) {
  const {
    currentTrack,
    isPlaying,
    favorites,
    localPlaylists,
    playTrack,
    togglePlayPause,
    addToQueue,
    playNext,
    toggleFavorite,
    addTrackToLocalPlaylist,
    createLocalPlaylist,
  } = usePlayer();

  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const isActive = currentTrack?.id === track.id;
  const isFav = favorites.includes(track.id);
  const canDownload =
    downloadPolicy !== "disabled" && track.is_published && track.is_downloadable;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="group relative gm-surface rounded-2xl p-3 hover:bg-[var(--gm-surface-hover)] transition-colors"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40 mb-3">
        <Image
          src={track.cover_url || BRAND_CONFIG.defaultCoverPath}
          alt={track.title}
          fill
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 24vw, 220px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Gradient & Play trigger */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent transition-opacity ${
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        />

        <button
          type="button"
          onClick={() => (isActive ? togglePlayPause() : playTrack(track, contextQueue))}
          aria-label={isActive && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className={`absolute bottom-2.5 right-2.5 h-11 w-11 rounded-full gm-rainbow-gradient p-[1.5px] shadow-xl transition-all duration-200 ${
            isActive
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
          }`}
        >
          <span className="h-full w-full rounded-full bg-black/90 text-white flex items-center justify-center">
            {isActive && isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </span>
        </button>

        {track.genre && (
          <span
            className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/70 text-white backdrop-blur-md border border-white/10"
          >
            {track.genre.name}
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/songs/view/?slug=${encodeURIComponent(track.slug)}`}
            className={`block text-sm font-semibold truncate hover:underline ${
              isActive ? "gm-rainbow-text" : "text-[var(--gm-text)]"
            }`}
          >
            {track.title}
          </Link>
          <p className="text-xs text-[var(--gm-text-muted)] truncate mt-0.5">
            {track.artist ? (
              <Link
                href={`/artists/view/?slug=${encodeURIComponent(track.artist.slug)}`}
                className="hover:underline"
              >
                {track.artist.name}
              </Link>
            ) : (
              BRAND_CONFIG.owner
            )}
          </p>
        </div>

        <div className="relative flex items-center gap-0.5" ref={menuRef}>
          {canDownload && (
            <button
              type="button"
              onClick={async () => {
                const res = await downloadAuthorizedTrackClient(track, downloadPolicy);
                if (!res.ok && res.error) showToast(res.error, "error");
              }}
              aria-label={`Download ${track.title}`}
              className="p-1.5 rounded-lg text-[var(--gm-text-muted)] hover:text-emerald-400 hover:bg-white/5"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`More options for ${track.title}`}
            className="p-1.5 rounded-lg text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] hover:bg-white/5"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 bottom-8 z-50 w-52 gm-surface rounded-xl p-1.5 shadow-2xl text-xs">
              <button
                type="button"
                onClick={() => {
                  playNext(track);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left"
              >
                <Play className="h-3.5 w-3.5 text-blue-400" />
                Play next
              </button>
              <button
                type="button"
                onClick={() => {
                  addToQueue(track);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left"
              >
                <ListPlus className="h-3.5 w-3.5 text-purple-400" />
                Add to queue
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleFavorite(track.id);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left"
              >
                <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                {isFav ? "Remove favorite" : "Save to favorites"}
              </button>

              {localPlaylists.length > 0 ? (
                <div className="border-t border-[var(--gm-border)] my-1 pt-1">
                  <p className="px-2.5 py-1 text-[10px] uppercase tracking-wider text-[var(--gm-text-muted)]">
                    Add to playlist
                  </p>
                  {localPlaylists.slice(0, 4).map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => {
                        addTrackToLocalPlaylist(pl.id, track.id);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-left truncate"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{pl.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const pl = createLocalPlaylist("My Mix");
                    addTrackToLocalPlaylist(pl.id, track.id);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Save to new playlist
                </button>
              )}

              <Link
                href={`/songs/view/?slug=${encodeURIComponent(track.slug)}`}
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Song details ({formatDuration(track.duration_seconds)})
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
