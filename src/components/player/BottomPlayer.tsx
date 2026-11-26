"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  Download,
  Gauge,
  Heart,
  ListMusic,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import { formatDuration } from "@/lib/format";

export function BottomPlayer({
  downloadPolicy = "track_level",
}: {
  downloadPolicy?: "track_level" | "disabled";
}) {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    hasError,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    playbackRate,
    isQueueOpen,
    favorites,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setPlaybackRate,
    setFullScreenOpen,
    setQueueOpen,
    toggleFavorite,
  } = usePlayer();

  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const speedMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setSpeedMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (!currentTrack) {
    return null;
  }

  const isFav = favorites.includes(currentTrack.id);
  const canDownload =
    downloadPolicy !== "disabled" &&
    currentTrack.is_published &&
    currentTrack.is_downloadable;

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      role="region"
      aria-label="Global music player"
      className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 gm-glass border-t border-[var(--gm-border)] px-3 md:px-5 py-2 md:py-2.5"
    >
      {/* Interactive top progress line for mobile & quick glance */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-0.5 bg-white/10">
        <div
          className="h-full gm-rainbow-gradient transition-all duration-150"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
        {/* Left: Track artwork & info */}
        <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-none md:w-[280px] lg:w-[320px]">
          <button
            type="button"
            onClick={() => setFullScreenOpen(true)}
            className="relative h-11 w-11 md:h-12 md:w-12 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/10 group"
            aria-label="Open full-screen player"
          >
            <Image
              src={currentTrack.cover_url || BRAND_CONFIG.defaultCoverPath}
              alt={currentTrack.title}
              fill
              sizes="48px"
              className="object-cover group-hover:scale-105 transition-transform"
            />
            {isPlaying && (
              <span className="absolute bottom-1 right-1 flex items-end gap-0.5 h-3 px-1 rounded bg-black/65">
                <span className="w-0.5 h-full bg-blue-400 gm-eq-1 origin-bottom" />
                <span className="w-0.5 h-full bg-emerald-400 gm-eq-2 origin-bottom" />
                <span className="w-0.5 h-full bg-amber-400 gm-eq-3 origin-bottom" />
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/songs/${currentTrack.slug}`}
                className="text-sm font-semibold truncate hover:underline text-[var(--gm-text)]"
              >
                {currentTrack.title}
              </Link>
              {hasError && (
                <span title={hasError} className="text-rose-400 shrink-0">
                  <AlertCircle className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--gm-text-muted)] truncate">
              {currentTrack.artist ? (
                <Link href={`/artists/${currentTrack.artist.slug}`} className="hover:underline">
                  {currentTrack.artist.name}
                </Link>
              ) : (
                BRAND_CONFIG.owner
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => toggleFavorite(currentTrack.id)}
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            className={`hidden sm:inline-flex p-1.5 rounded-lg transition-colors ${
              isFav ? "text-rose-500" : "text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
            }`}
          >
            <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Center: Playback controls & seek bar */}
        <div className="flex flex-col items-center gap-1 md:flex-1 md:max-w-xl">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-label="Toggle shuffle"
              className={`hidden md:inline-flex p-1.5 rounded-lg transition-colors ${
                isShuffle ? "text-emerald-400" : "text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
              }`}
            >
              <Shuffle className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={prevTrack}
              aria-label="Previous track"
              className="hidden sm:inline-flex p-1.5 text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] transition-colors"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="h-9 w-9 md:h-10 md:w-10 rounded-full gm-rainbow-gradient p-[1.5px] shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 transition-transform"
            >
              <span className="h-full w-full rounded-full bg-[var(--gm-bg)] flex items-center justify-center text-[var(--gm-text)]">
                {isBuffering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" />
                ) : (
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={nextTrack}
              aria-label="Next track"
              className="p-1.5 text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] transition-colors"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={cycleRepeat}
              aria-label={`Repeat mode: ${repeatMode}`}
              className={`hidden md:inline-flex p-1.5 rounded-lg transition-colors ${
                repeatMode !== "off"
                  ? "text-blue-400"
                  : "text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
              }`}
            >
              {repeatMode === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setFullScreenOpen(true)}
              aria-label="Expand player"
              className="md:hidden p-1.5 text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2.5 w-full">
            <span className="text-[11px] tabular-nums text-[var(--gm-text-muted)] w-10 text-right">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={Math.min(currentTime, duration || 100)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek track progress"
              className="w-full h-1.5 accent-purple-500 cursor-pointer rounded-full"
            />
            <span className="text-[11px] tabular-nums text-[var(--gm-text-muted)] w-10">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Right: Speed, Download, Queue, Volume, Fullscreen */}
        <div className="hidden md:flex items-center justify-end gap-2 lg:w-[320px]">
          <div className="relative" ref={speedMenuRef}>
            <button
              type="button"
              onClick={() => setSpeedMenuOpen((v) => !v)}
              aria-label="Playback speed"
              className="px-2 py-1 rounded-lg text-xs font-medium text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] hover:bg-white/5 flex items-center gap-1"
            >
              <Gauge className="h-3.5 w-3.5" />
              {playbackRate}x
            </button>
            {speedMenuOpen && (
              <div className="absolute bottom-9 right-0 gm-surface rounded-xl p-1.5 shadow-2xl min-w-[84px] z-50">
                {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      setPlaybackRate(rate);
                      setSpeedMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1 rounded-lg text-xs transition-colors ${
                      playbackRate === rate
                        ? "bg-purple-500/20 text-purple-300 font-semibold"
                        : "hover:bg-white/5 text-[var(--gm-text)]"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {canDownload && (
            <a
              href={`/api/tracks/${currentTrack.id}/download`}
              download
              aria-label={`Download ${currentTrack.title}`}
              className="p-2 rounded-lg text-[var(--gm-text-muted)] hover:text-emerald-400 hover:bg-white/5 transition-colors"
              title="Download track"
            >
              <Download className="h-4 w-4" />
            </a>
          )}

          <button
            type="button"
            onClick={() => setQueueOpen(!isQueueOpen)}
            aria-label="Toggle playback queue"
            className={`p-2 rounded-lg transition-colors ${
              isQueueOpen
                ? "text-purple-400 bg-purple-500/15"
                : "text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] hover:bg-white/5"
            }`}
            title="Queue (Q)"
          >
            <ListMusic className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5 w-28">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="p-1.5 text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="w-full h-1 accent-blue-500 cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => setFullScreenOpen(true)}
            aria-label="Open full-screen player"
            className="p-2 rounded-lg text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] hover:bg-white/5"
            title="Full screen (F)"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
