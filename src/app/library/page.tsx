"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Clock, Edit3, Heart, ListMusic, Play, Plus, Shuffle, Trash2, X } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { resolvePublishedTracksByIdsClient } from "@/lib/public-api";
import type { Track } from "@/types/music";
import { TrackCard } from "@/components/music/TrackCard";
import { CardGridSkeleton, EmptyLibraryState, TrackRow } from "@/components/music/CollectionCards";

function LibraryPageInner() {
  const searchParams = useSearchParams();
  const {
    favorites,
    recentTracks,
    localPlaylists,
    playQueue,
    createLocalPlaylist,
    updateLocalPlaylist,
    removeTrackFromLocalPlaylist,
    deleteLocalPlaylist,
    removeFromRecent,
    clearRecentHistory,
  } = usePlayer();

  const paramTab = searchParams.get("tab");
  const initialTab =
    paramTab === "recent" || paramTab === "playlists" || paramTab === "favorites"
      ? paramTab
      : "favorites";

  const [resolvedMap, setResolvedMap] = useState<Map<string, Track>>(new Map());
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [selectedTab, setSelectedTab] = useState<"favorites" | "recent" | "playlists" | null>(null);
  const activeTab = selectedTab ?? initialTab;
  const setActiveTab = setSelectedTab;
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  useEffect(() => {
    const allIds = Array.from(
      new Set([
        ...favorites,
        ...localPlaylists.flatMap((p) => p.trackIds),
      ])
    );
    if (allIds.length === 0) return;

    let active = true;
    resolvePublishedTracksByIdsClient(allIds)
      .then((list) => {
        if (!active) return;
        const map = new Map<string, Track>();
        for (const t of list) map.set(t.id, t);
        setResolvedMap(map);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [favorites, localPlaylists]);

  const favoriteTracks = useMemo(
    () => favorites.map((id) => resolvedMap.get(id)).filter((t): t is Track => Boolean(t)),
    [favorites, resolvedMap]
  );

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistTitle.trim()) return;
    createLocalPlaylist(newPlaylistTitle.trim());
    setNewPlaylistTitle("");
  };

  const handleSaveRename = (playlistId: string) => {
    if (editingTitle.trim()) {
      updateLocalPlaylist(playlistId, {
        title: editingTitle.trim(),
        description: editingDescription,
      });
    }
    setEditingPlaylistId(null);
    setEditingTitle("");
    setEditingDescription("");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--gm-border)] pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Your Library</h1>
          <p className="text-sm text-[var(--gm-text-muted)] mt-1">
            Favorites, recently played sessions, and personal playlists.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { id: "favorites", label: `Favorites (${favoriteTracks.length})`, icon: Heart },
              { id: "recent", label: `Recent (${recentTracks.length})`, icon: Clock },
              { id: "playlists", label: `Playlists (${localPlaylists.length})`, icon: ListMusic },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                  activeTab === t.id
                    ? "gm-rainbow-gradient text-white shadow"
                    : "gm-surface text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "favorites" && (
        favoriteTracks.length === 0 ? (
          <EmptyLibraryState
            title="No Favorite Songs Yet"
            subtitle="Tap the heart icon on any song while listening to save it here."
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playQueue(favoriteTracks, 0, false)}
                className="px-5 py-2 rounded-full gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Play Favorites
              </button>
              <button
                type="button"
                onClick={() => playQueue(favoriteTracks, 0, true)}
                className="px-4 py-2 rounded-full gm-surface text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Shuffle className="h-3.5 w-3.5" /> Shuffle
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {favoriteTracks.map((track) => (
                <TrackCard key={track.id} track={track} contextQueue={favoriteTracks} />
              ))}
            </div>
          </div>
        )
      )}

      {activeTab === "recent" && (
        recentTracks.length === 0 ? (
          <EmptyLibraryState
            title="No Recently Played Tracks"
            subtitle="Start playing any song on Guru Music and your listening history will appear here."
          />
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearRecentHistory}
                className="px-3.5 py-1.5 rounded-xl gm-surface hover:bg-rose-500/15 text-xs font-semibold text-rose-400 inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear History
              </button>
            </div>
            <div className="gm-surface rounded-2xl p-2 divide-y divide-[var(--gm-border)]">
              {recentTracks.map((track, idx) => (
                <div key={track.id} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <TrackRow track={track} index={idx} queue={recentTracks} />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromRecent(track.id)}
                    aria-label={`Remove ${track.title} from history`}
                    className="p-2 text-[var(--gm-text-muted)] hover:text-rose-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {activeTab === "playlists" && (
        <div className="space-y-6">
          <form onSubmit={handleCreatePlaylist} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newPlaylistTitle}
              onChange={(e) => setNewPlaylistTitle(e.target.value)}
              placeholder="New playlist name..."
              className="flex-1 px-4 py-2.5 rounded-xl gm-surface text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          </form>

          {localPlaylists.length === 0 ? (
            <EmptyLibraryState
              title="No Personal Playlists Yet"
              subtitle="Create a playlist above or use the more-options menu on any track card to save songs to a mix."
            />
          ) : (
            <div className="space-y-5">
              {localPlaylists.map((pl) => {
                const tracks = pl.trackIds
                  .map((id) => resolvedMap.get(id))
                  .filter((t): t is Track => Boolean(t));
                const isEditing = editingPlaylistId === pl.id;
                return (
                  <div key={pl.id} className="gm-surface rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="space-y-2 max-w-md">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                placeholder="Playlist title"
                                className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-sm"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(pl.id)}
                                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300"
                                aria-label="Save playlist details"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPlaylistId(null)}
                                className="p-1.5 rounded-lg bg-white/5 text-slate-300"
                                aria-label="Cancel edit"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              placeholder="Optional description..."
                              className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-xs"
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className="text-lg font-bold truncate">{pl.title}</h3>
                            {pl.description && (
                              <p className="text-xs text-[var(--gm-text-muted)] truncate">{pl.description}</p>
                            )}
                            <p className="text-xs text-[var(--gm-text-muted)]">{tracks.length} tracks</p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {tracks.length > 0 && (
                          <button
                            type="button"
                            onClick={() => playQueue(tracks, 0, false)}
                            className="px-4 py-1.5 rounded-full gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" /> Play
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlaylistId(pl.id);
                            setEditingTitle(pl.title);
                            setEditingDescription(pl.description || "");
                          }}
                          className="p-2 rounded-lg text-[var(--gm-text-muted)] hover:text-purple-300 hover:bg-white/5"
                          aria-label={`Edit playlist ${pl.title}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLocalPlaylist(pl.id)}
                          className="p-2 rounded-lg text-[var(--gm-text-muted)] hover:text-rose-400 hover:bg-white/5"
                          aria-label={`Delete playlist ${pl.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {tracks.length > 0 ? (
                      <div className="divide-y divide-[var(--gm-border)]">
                        {tracks.map((track, idx) => (
                          <div key={track.id} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <TrackRow track={track} index={idx} queue={tracks} />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTrackFromLocalPlaylist(pl.id, track.id)}
                              className="p-1.5 text-[var(--gm-text-muted)] hover:text-rose-400"
                              aria-label="Remove from playlist"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--gm-text-muted)]">
                        Use the &ldquo;More options&rdquo; menu on any track card to add songs here.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={6} />}>
      <LibraryPageInner />
    </Suspense>
  );
}
