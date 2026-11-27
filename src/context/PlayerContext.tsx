"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LocalPlaylist, Track } from "@/types/music";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import {
  getCloudFavoritesClient,
  recordTrackPlayClient,
  resolvePublishedTracksByIdsClient,
  syncCloudFavoriteClient,
} from "@/lib/public-api";
import { useToast } from "./ToastContext";

export type RepeatMode = "off" | "all" | "one";

interface PlayerContextValue {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  hasError: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  playbackRate: number;
  isFullScreenOpen: boolean;
  isQueueOpen: boolean;
  favorites: string[];
  recentTracks: Track[];
  localPlaylists: LocalPlaylist[];
  isOnline: boolean;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  playQueue: (tracks: Track[], startIndex?: number, shuffle?: boolean) => void;
  togglePlayPause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setPlaybackRate: (rate: number) => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  setFullScreenOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  toggleFavorite: (trackId: string) => void;
  createLocalPlaylist: (title: string, description?: string) => LocalPlaylist;
  renameLocalPlaylist: (playlistId: string, newTitle: string) => void;
  updateLocalPlaylist: (playlistId: string, updates: { title?: string; description?: string }) => void;
  addTrackToLocalPlaylist: (playlistId: string, trackId: string) => void;
  removeTrackFromLocalPlaylist: (playlistId: string, trackId: string) => void;
  deleteLocalPlaylist: (playlistId: string) => void;
  removeFromRecent: (trackId: string) => void;
  clearRecentHistory: () => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

const STORAGE_PLAYER_KEY = "gm_player_state_v1";
const STORAGE_FAVS_KEY = "gm_favorites_v1";
const STORAGE_RECENT_KEY = "gm_recent_ids_v1";
const STORAGE_LOCAL_PLAYLISTS_KEY = "gm_local_playlists_v1";

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldPlayOnLoadRef = useRef(false);
  const lastRecordedPlayIdRef = useRef<string | null>(null);

  const [queue, setQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isFullScreenOpen, setFullScreenOpen] = useState(false);
  const [isQueueOpen, setQueueOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [localPlaylists, setLocalPlaylists] = useState<LocalPlaylist[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  // Monitor online/offline state
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active && typeof navigator !== "undefined") {
        setIsOnline(navigator.onLine);
      }
    });
    const onOnline = () => {
      setIsOnline(true);
      showToast("Back online. Audio streaming restored.", "success");
    };
    const onOffline = () => {
      setIsOnline(false);
      showToast("You are offline. Network streaming may pause.", "error");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      active = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [showToast]);

  // Restore saved preferences, queue (without auto-playing!), favorites, recent IDs, local playlists
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const savedFavs = JSON.parse(localStorage.getItem(STORAGE_FAVS_KEY) || "[]");
        if (Array.isArray(savedFavs)) setFavorites(savedFavs);

        const savedRecent = JSON.parse(localStorage.getItem(STORAGE_RECENT_KEY) || "[]");
        if (Array.isArray(savedRecent)) setRecentIds(savedRecent);

        const savedPlaylists = JSON.parse(localStorage.getItem(STORAGE_LOCAL_PLAYLISTS_KEY) || "[]");
        if (Array.isArray(savedPlaylists)) setLocalPlaylists(savedPlaylists);

        const savedState = JSON.parse(localStorage.getItem(STORAGE_PLAYER_KEY) || "null");
        if (savedState && typeof savedState === "object") {
          if (typeof savedState.volume === "number") setVolumeState(savedState.volume);
          if (typeof savedState.isMuted === "boolean") setIsMuted(savedState.isMuted);
          if (typeof savedState.isShuffle === "boolean") setIsShuffle(savedState.isShuffle);
          if (savedState.repeatMode) setRepeatMode(savedState.repeatMode);
          if (typeof savedState.playbackRate === "number") setPlaybackRateState(savedState.playbackRate);
          if (Array.isArray(savedState.queue) && savedState.queue.length > 0) {
            setQueue(savedState.queue);
            const idx = typeof savedState.currentIndex === "number" ? savedState.currentIndex : 0;
            setCurrentIndex(Math.min(Math.max(idx, 0), savedState.queue.length - 1));
          }
        }
      } catch {
        // ignore storage errors
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Resolve recently played IDs against live published tracks so deleted/unpublished songs are never stale
  useEffect(() => {
    if (recentIds.length === 0) return;
    let active = true;
    resolvePublishedTracksByIdsClient(recentIds)
      .then((tracks) => {
        if (!active) return;
        const map = new Map<string, Track>();
        for (const t of tracks) map.set(t.id, t);
        const ordered = recentIds.map((id) => map.get(id)).filter((t): t is Track => Boolean(t));
        setRecentTracks(ordered);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [recentIds]);

  // Persist player preferences & queue metadata
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_PLAYER_KEY,
        JSON.stringify({
          queue: queue.slice(0, 50),
          currentIndex,
          volume,
          isMuted,
          isShuffle,
          repeatMode,
          playbackRate,
        })
      );
    } catch {
      // ignore
    }
  }, [queue, currentIndex, volume, isMuted, isShuffle, repeatMode, playbackRate]);

  const recordRecent = useCallback((track: Track) => {
    setRecentIds((prev) => {
      const next = [track.id, ...prev.filter((id) => id !== track.id)].slice(0, 20);
      try {
        localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const recordPlayEvent = useCallback((trackId: string) => {
    if (lastRecordedPlayIdRef.current === trackId) return;
    lastRecordedPlayIdRef.current = trackId;
    recordTrackPlayClient(trackId).catch(() => {});
  }, []);

  // Load new track into single persistent <audio> element only when track ID/URL changes
  const activeSrc = currentTrack?.audio_url || "";
  const activeId = currentTrack?.id || "";

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!activeSrc) {
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setHasError(null);
      setCurrentTime(0);
      setDuration(currentTrack?.duration_seconds || 0);
    });

    if (audio.src !== activeSrc) {
      audio.src = activeSrc;
      audio.load();
    }
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;

    if (shouldPlayOnLoadRef.current) {
      shouldPlayOnLoadRef.current = false;
      Promise.resolve().then(() => {
        if (!cancelled) setIsBuffering(true);
      });
      audio
        .play()
        .then(() => {
          if (cancelled) return;
          setIsPlaying(true);
          setIsBuffering(false);
          if (currentTrack) {
            recordRecent(currentTrack);
            recordPlayEvent(currentTrack.id);
          }
        })
        .catch(() => {
          if (cancelled) return;
          setIsPlaying(false);
          setIsBuffering(false);
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, activeSrc]);

  // Sync volume & playback rate without resetting audio source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  const playTrack = useCallback(
    (track: Track, newQueue?: Track[]) => {
      if (!track.audio_url) {
        showToast("Audio stream unavailable for this track.", "error");
        return;
      }
      shouldPlayOnLoadRef.current = true;
      setHasError(null);

      if (newQueue && newQueue.length > 0) {
        const idx = newQueue.findIndex((t) => t.id === track.id);
        setQueue(newQueue);
        setCurrentIndex(idx >= 0 ? idx : 0);
        if (currentTrack?.id === track.id && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          shouldPlayOnLoadRef.current = false;
        }
        return;
      }

      const existingIdx = queue.findIndex((t) => t.id === track.id);
      if (existingIdx >= 0) {
        setCurrentIndex(existingIdx);
        if (currentTrack?.id === track.id && audioRef.current) {
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          shouldPlayOnLoadRef.current = false;
        }
      } else {
        setQueue((prev) => [...prev, track]);
        setCurrentIndex(queue.length);
      }
    },
    [queue, currentTrack?.id, showToast]
  );

  const playQueue = useCallback(
    (tracks: Track[], startIndex = 0, shuffle = false) => {
      const playable = tracks.filter((t) => Boolean(t.audio_url));
      if (playable.length === 0) {
        showToast("No playable tracks found in this collection.", "info");
        return;
      }
      const list = shuffle
        ? [...playable].sort(() => Math.random() - 0.5)
        : playable;
      setIsShuffle(shuffle);
      shouldPlayOnLoadRef.current = true;
      setQueue(list);
      setCurrentIndex(Math.min(Math.max(startIndex, 0), list.length - 1));
    },
    [showToast]
  );

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (!audio.src && currentTrack.audio_url) {
      audio.src = currentTrack.audio_url;
    }
    if (audio.paused) {
      setIsBuffering(true);
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
          recordRecent(currentTrack);
          recordPlayEvent(currentTrack.id);
        })
        .catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
          showToast("Playback could not start. Check audio source or connection.", "error");
        });
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrack, recordPlayEvent, recordRecent, showToast]);

  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;
    if (repeatMode === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      return;
    }

    let nextIdx = currentIndex + 1;
    if (isShuffle && queue.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * queue.length);
      } while (nextIdx === currentIndex);
    } else if (nextIdx >= queue.length) {
      if (repeatMode === "all") {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    shouldPlayOnLoadRef.current = true;
    setCurrentIndex(nextIdx);
  }, [queue.length, currentIndex, isShuffle, repeatMode]);

  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (queue.length === 0) return;
    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeatMode === "all" ? queue.length - 1 : 0;
    }
    shouldPlayOnLoadRef.current = true;
    setCurrentIndex(prevIdx);
  }, [queue.length, currentIndex, repeatMode]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(seconds, audio.duration || duration || 0));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) setIsMuted(false);
  }, [isMuted]);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);
  const toggleShuffle = useCallback(() => setIsShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === "off" ? "all" : m === "all" ? "one" : "off"));
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
  }, []);

  const addToQueue = useCallback(
    (track: Track) => {
      if (!track.audio_url) {
        showToast("Track audio is unavailable.", "error");
        return;
      }
      setQueue((prev) => {
        if (prev.length === 0) {
          setCurrentIndex(0);
          shouldPlayOnLoadRef.current = false;
          return [track];
        }
        return [...prev, track];
      });
      showToast(`Added "${track.title}" to queue`, "success");
    },
    [showToast]
  );

  const playNext = useCallback(
    (track: Track) => {
      if (!track.audio_url) {
        showToast("Track audio is unavailable.", "error");
        return;
      }
      setQueue((prev) => {
        if (prev.length === 0) {
          setCurrentIndex(0);
          return [track];
        }
        const copy = [...prev];
        copy.splice(Math.max(0, currentIndex + 1), 0, track);
        return copy;
      });
      showToast(`"${track.title}" will play next`, "success");
    },
    [currentIndex, showToast]
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      setQueue((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        const copy = prev.filter((_, i) => i !== index);
        if (index < currentIndex) {
          setCurrentIndex((ci) => Math.max(0, ci - 1));
        } else if (index === currentIndex) {
          if (copy.length === 0) setCurrentIndex(-1);
          else if (currentIndex >= copy.length) setCurrentIndex(copy.length - 1);
        }
        return copy;
      });
    },
    [currentIndex]
  );

  const reorderQueue = useCallback(
    (fromIndex: number, toIndex: number) => {
      setQueue((prev) => {
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= prev.length ||
          toIndex >= prev.length ||
          fromIndex === toIndex
        ) {
          return prev;
        }
        const copy = [...prev];
        const [moved] = copy.splice(fromIndex, 1);
        copy.splice(toIndex, 0, moved);

        if (currentIndex === fromIndex) setCurrentIndex(toIndex);
        else if (fromIndex < currentIndex && toIndex >= currentIndex)
          setCurrentIndex(currentIndex - 1);
        else if (fromIndex > currentIndex && toIndex <= currentIndex)
          setCurrentIndex(currentIndex + 1);

        return copy;
      });
    },
    [currentIndex]
  );

  const clearQueue = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setQueue([]);
    setCurrentIndex(-1);
  }, []);

  const toggleFavorite = useCallback(
    (trackId: string) => {
      setFavorites((prev) => {
        const exists = prev.includes(trackId);
        const next = exists ? prev.filter((id) => id !== trackId) : [trackId, ...prev];
        try {
          localStorage.setItem(STORAGE_FAVS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        void syncCloudFavoriteClient(trackId, !exists);
        showToast(exists ? "Removed from Favorites" : "Saved to Favorites", "success");
        return next;
      });
    },
    [showToast]
  );

  useEffect(() => {
    getCloudFavoritesClient()
      .then((cloudIds) => {
        if (cloudIds.length === 0) return;
        setFavorites((prev) => {
          const merged = Array.from(new Set([...cloudIds, ...prev]));
          try {
            localStorage.setItem(STORAGE_FAVS_KEY, JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
      })
      .catch(() => {});
  }, []);

  const createLocalPlaylist = useCallback(
    (title: string, description = "") => {
      const playlist: LocalPlaylist = {
        id: `lp-${Date.now()}`,
        title: title.trim() || "Untitled Playlist",
        description: description.trim(),
        trackIds: [],
        createdAt: new Date().toISOString(),
      };
      setLocalPlaylists((prev) => {
        const next = [playlist, ...prev];
        try {
          localStorage.setItem(STORAGE_LOCAL_PLAYLISTS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showToast(`Created playlist "${playlist.title}"`, "success");
      return playlist;
    },
    [showToast]
  );

  const addTrackToLocalPlaylist = useCallback(
    (playlistId: string, trackId: string) => {
      setLocalPlaylists((prev) => {
        const next = prev.map((p) =>
          p.id === playlistId && !p.trackIds.includes(trackId)
            ? { ...p, trackIds: [...p.trackIds, trackId] }
            : p
        );
        try {
          localStorage.setItem(STORAGE_LOCAL_PLAYLISTS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showToast("Added track to your playlist", "success");
    },
    [showToast]
  );

  const removeTrackFromLocalPlaylist = useCallback((playlistId: string, trackId: string) => {
    setLocalPlaylists((prev) => {
      const next = prev.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId) }
          : p
      );
      try {
        localStorage.setItem(STORAGE_LOCAL_PLAYLISTS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const renameLocalPlaylist = useCallback(
    (playlistId: string, newTitle: string) => {
      const cleaned = newTitle.trim();
      if (!cleaned) return;
      setLocalPlaylists((prev) => {
        const next = prev.map((p) =>
          p.id === playlistId ? { ...p, title: cleaned } : p
        );
        try {
          localStorage.setItem(STORAGE_LOCAL_PLAYLISTS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showToast("Playlist renamed", "success");
    },
    [showToast]
  );

  const updateLocalPlaylist = useCallback(
    (playlistId: string, updates: { title?: string; description?: string }) => {
      setLocalPlaylists((prev) => {
        const next = prev.map((p) =>
          p.id === playlistId
            ? {
                ...p,
                title: updates.title?.trim() || p.title,
                description:
                  updates.description !== undefined ? updates.description.trim() : p.description,
              }
            : p
        );
        try {
          localStorage.setItem(STORAGE_LOCAL_PLAYLISTS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showToast("Playlist updated", "success");
    },
    [showToast]
  );

  const removeFromRecent = useCallback(
    (trackId: string) => {
      setRecentIds((prev) => {
        const next = prev.filter((id) => id !== trackId);
        try {
          localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      setRecentTracks((prev) => prev.filter((t) => t.id !== trackId));
      showToast("Removed from recently played", "info");
    },
    [showToast]
  );

  const clearRecentHistory = useCallback(() => {
    setRecentIds([]);
    setRecentTracks([]);
    try {
      localStorage.removeItem(STORAGE_RECENT_KEY);
    } catch {
      // ignore
    }
    showToast("Listening history cleared", "info");
  }, [showToast]);

  const deleteLocalPlaylist = useCallback(
    (playlistId: string) => {
      setLocalPlaylists((prev) => {
        const next = prev.filter((p) => p.id !== playlistId);
        try {
          localStorage.setItem(STORAGE_LOCAL_PLAYLISTS_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      showToast("Playlist deleted", "info");
    },
    [showToast]
  );

  // Media Session API for OS/background/lock-screen playback
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!currentTrack) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist?.name || BRAND_CONFIG.owner,
        album: currentTrack.album?.title || BRAND_CONFIG.name,
        artwork: [
          {
            src: currentTrack.cover_url || BRAND_CONFIG.defaultCoverPath,
            sizes: "512x512",
            type: "image/png",
          },
        ],
      });
      navigator.mediaSession.setActionHandler("play", togglePlayPause);
      navigator.mediaSession.setActionHandler("pause", togglePlayPause);
      navigator.mediaSession.setActionHandler("previoustrack", prevTrack);
      navigator.mediaSession.setActionHandler("nexttrack", nextTrack);
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (typeof details.seekTime === "number") seek(details.seekTime);
      });
    } catch {
      // ignore unsupported browsers
    }
  }, [currentTrack, togglePlayPause, prevTrack, nextTrack, seek]);

  // Accessible Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space" && currentTrack) {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === "ArrowRight" && currentTrack) {
        seek(currentTime + 5);
      } else if (e.key === "ArrowLeft" && currentTrack) {
        seek(currentTime - 5);
      } else if (e.key.toLowerCase() === "m") {
        toggleMute();
      } else if (e.key.toLowerCase() === "n") {
        nextTrack();
      } else if (e.key.toLowerCase() === "p") {
        prevTrack();
      } else if (e.key.toLowerCase() === "q") {
        setQueueOpen((v) => !v);
      } else if (e.key.toLowerCase() === "f" && currentTrack) {
        setFullScreenOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTrack, currentTime, togglePlayPause, seek, toggleMute, nextTrack, prevTrack]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      queue,
      currentIndex,
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
      isFullScreenOpen,
      isQueueOpen,
      favorites,
      recentTracks,
      localPlaylists,
      isOnline,
      playTrack,
      playQueue,
      togglePlayPause,
      nextTrack,
      prevTrack,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setPlaybackRate,
      addToQueue,
      playNext,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      setFullScreenOpen,
      setQueueOpen,
      toggleFavorite,
      createLocalPlaylist,
      renameLocalPlaylist,
      updateLocalPlaylist,
      addTrackToLocalPlaylist,
      removeTrackFromLocalPlaylist,
      deleteLocalPlaylist,
      removeFromRecent,
      clearRecentHistory,
    }),
    [
      currentTrack,
      queue,
      currentIndex,
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
      isFullScreenOpen,
      isQueueOpen,
      favorites,
      recentTracks,
      localPlaylists,
      isOnline,
      playTrack,
      playQueue,
      togglePlayPause,
      nextTrack,
      prevTrack,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setPlaybackRate,
      addToQueue,
      playNext,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      toggleFavorite,
      createLocalPlaylist,
      renameLocalPlaylist,
      updateLocalPlaylist,
      addTrackToLocalPlaylist,
      removeTrackFromLocalPlaylist,
      deleteLocalPlaylist,
      removeFromRecent,
      clearRecentHistory,
    ]
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Single persistent HTML5 Audio element across all routes */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (repeatMode === "one" && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          } else {
            nextTrack();
          }
        }}
        onError={() => {
          setIsBuffering(false);
          setIsPlaying(false);
          setHasError("Audio stream unavailable or interrupted.");
          showToast("Track unavailable or network interrupted.", "error");
        }}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
