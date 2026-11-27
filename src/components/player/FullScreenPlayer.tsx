"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Download,
  Heart,
  ListMusic,
  Loader2,
  Mic2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useToast } from "@/context/ToastContext";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import { downloadAuthorizedTrackClient } from "@/lib/public-api";
import { formatDuration } from "@/lib/format";

export function FullScreenPlayer({
  downloadPolicy = "track_level",
}: {
  downloadPolicy?: "track_level" | "disabled";
}) {
  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    playbackRate,
    isFullScreenOpen,
    favorites,
    setFullScreenOpen,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setPlaybackRate,
    toggleFavorite,
    playTrack,
    removeFromQueue,
  } = usePlayer();

  const { showToast } = useToast();
  const [tab, setTab] = useState<"artwork" | "lyrics" | "queue">("artwork");

  if (!currentTrack) return null;

  const isFav = favorites.includes(currentTrack.id);
  const canDownload =
    downloadPolicy !== "disabled" &&
    currentTrack.is_published &&
    currentTrack.is_downloadable;

  return (
    <AnimatePresence>
      {isFullScreenOpen && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="fixed inset-0 z-[70] bg-[var(--gm-bg)] flex flex-col overflow-hidden"
        >
          {/* Ambient rainbow aura */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />
            <div className="absolute top-1/3 right-0 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />
            <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-emerald-500/15 blur-[120px]" />
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-[var(--gm-border)]">
            <button
              type="button"
              onClick={() => setFullScreenOpen(false)}
              className="p-2 rounded-xl hover:bg-white/10 text-[var(--gm-text)]"
              aria-label="Minimize player"
            >
              <ChevronDown className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-[var(--gm-border)]">
              {(["artwork", "lyrics", "queue"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    tab === t
                      ? "bg-white/15 text-[var(--gm-text)]"
                      : "text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {canDownload && (
                <button
                  type="button"
                  onClick={async () => {
                    const res = await downloadAuthorizedTrackClient(currentTrack, downloadPolicy);
                    if (!res.ok && res.error) showToast(res.error, "error");
                  }}
                  className="p-2 rounded-xl hover:bg-white/10 text-emerald-400"
                  aria-label="Download track"
                >
                  <Download className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
            {tab === "artwork" && (
              <div className="flex flex-col items-center text-center w-full max-w-md">
                <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden gm-rainbow-border shadow-2xl shadow-purple-500/20 mb-7">
                  <Image
                    src={currentTrack.cover_url || BRAND_CONFIG.defaultCoverPath}
                    alt={currentTrack.title}
                    fill
                    sizes="320px"
                    className="object-cover"
                    priority
                  />
                </div>

                <div className="w-full flex items-center justify-between gap-4 mb-2">
                  <div className="text-left min-w-0">
                    <Link
                      href={`/songs/view/?slug=${encodeURIComponent(currentTrack.slug)}`}
                      onClick={() => setFullScreenOpen(false)}
                      className="text-xl sm:text-2xl font-bold truncate block hover:underline"
                    >
                      {currentTrack.title}
                    </Link>
                    <p className="text-sm text-[var(--gm-text-muted)] truncate">
                      {currentTrack.artist?.name || BRAND_CONFIG.owner}
                      {currentTrack.album ? ` • ${currentTrack.album.title}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(currentTrack.id)}
                    className={`p-2.5 rounded-full bg-white/5 hover:bg-white/10 ${
                      isFav ? "text-rose-500" : "text-[var(--gm-text-muted)]"
                    }`}
                    aria-label="Toggle favorite"
                  >
                    <Heart className={`h-5 w-5 ${isFav ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* Animated Equalizer indicator */}
                <div className="flex items-end justify-center gap-1 h-5 my-2">
                  {[
                    "bg-blue-400",
                    "bg-red-400",
                    "bg-amber-400",
                    "bg-emerald-400",
                    "bg-purple-400",
                  ].map((color, i) => (
                    <span
                      key={color}
                      className={`w-1 rounded-full ${color} ${
                        isPlaying ? `h-full gm-eq-${(i % 4) + 1}` : "h-1.5 opacity-40"
                      } origin-bottom transition-all`}
                    />
                  ))}
                </div>
              </div>
            )}

            {tab === "lyrics" && (
              <div className="w-full max-w-xl gm-surface rounded-2xl p-6 max-h-[52vh] overflow-y-auto gm-scrollbar">
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-purple-300">
                  <Mic2 className="h-4 w-4" />
                  <span>Lyrics & Notes</span>
                </div>
                {currentTrack.lyrics ? (
                  <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-[var(--gm-text)]">
                    {currentTrack.lyrics}
                  </pre>
                ) : (
                  <p className="text-sm text-[var(--gm-text-muted)]">
                    Lyrics have not been added for this track yet.
                  </p>
                )}
              </div>
            )}

            {tab === "queue" && (
              <div className="w-full max-w-xl gm-surface rounded-2xl p-4 max-h-[52vh] overflow-y-auto gm-scrollbar">
                <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                  <ListMusic className="h-4 w-4 text-blue-400" />
                  <span>Up Next ({queue.length})</span>
                </div>
                <div className="space-y-1.5">
                  {queue.map((t, idx) => (
                    <div
                      key={`${t.id}-${idx}`}
                      className={`flex items-center justify-between gap-3 p-2 rounded-xl transition-colors ${
                        idx === currentIndex ? "bg-purple-500/20" : "hover:bg-white/5"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => playTrack(t, queue)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      >
                        <Image
                          src={t.cover_url || BRAND_CONFIG.defaultCoverPath}
                          alt={t.title}
                          width={40}
                          height={40}
                          className="rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.title}</p>
                          <p className="text-xs text-[var(--gm-text-muted)] truncate">
                            {t.artist?.name || BRAND_CONFIG.owner}
                          </p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromQueue(idx)}
                        className="p-1.5 text-[var(--gm-text-muted)] hover:text-rose-400"
                        aria-label="Remove from queue"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seek & Primary Controls */}
            <div className="w-full max-w-md mt-6 space-y-5">
              <div>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={Math.min(currentTime, duration || 100)}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-label="Seek track"
                  className="w-full h-2 accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs tabular-nums text-[var(--gm-text-muted)] mt-1">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  aria-label="Shuffle"
                  className={`p-2 rounded-xl ${
                    isShuffle ? "text-emerald-400" : "text-[var(--gm-text-muted)]"
                  }`}
                >
                  <Shuffle className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={prevTrack}
                  aria-label="Previous"
                  className="p-3 rounded-full hover:bg-white/10"
                >
                  <SkipBack className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="h-16 w-16 rounded-full gm-rainbow-gradient p-[2px] shadow-xl shadow-purple-500/30 hover:scale-105 active:scale-95 transition-transform"
                >
                  <span className="h-full w-full rounded-full bg-[var(--gm-bg)] flex items-center justify-center">
                    {isBuffering ? (
                      <Loader2 className="h-7 w-7 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-7 w-7 fill-current" />
                    ) : (
                      <Play className="h-7 w-7 fill-current ml-1" />
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={nextTrack}
                  aria-label="Next"
                  className="p-3 rounded-full hover:bg-white/10"
                >
                  <SkipForward className="h-6 w-6" />
                </button>

                <button
                  type="button"
                  onClick={cycleRepeat}
                  aria-label="Repeat"
                  className={`p-2 rounded-xl ${
                    repeatMode !== "off" ? "text-blue-400" : "text-[var(--gm-text-muted)]"
                  }`}
                >
                  {repeatMode === "one" ? (
                    <Repeat1 className="h-5 w-5" />
                  ) : (
                    <Repeat className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Volume & Speed row */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                    className="text-[var(--gm-text-muted)]"
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
                    className="w-full h-1.5 accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {[1, 1.25, 1.5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPlaybackRate(r)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        playbackRate === r
                          ? "bg-purple-500/25 text-purple-300"
                          : "text-[var(--gm-text-muted)] hover:bg-white/5"
                      }`}
                    >
                      {r}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
