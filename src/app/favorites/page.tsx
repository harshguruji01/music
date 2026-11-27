"use client";

import React, { useEffect, useState } from "react";
import { Heart, Play, Shuffle } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { resolvePublishedTracksByIdsClient } from "@/lib/public-api";
import { TrackCard } from "@/components/music/TrackCard";
import { CardGridSkeleton, EmptyLibraryState } from "@/components/music/CollectionCards";
import type { Track } from "@/types/music";

export default function FavoritesPage() {
  const { favorites, playQueue } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    resolvePublishedTracksByIdsClient(favorites)
      .then((res) => {
        if (active) setTracks(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [favorites]);

  if (loading) return <CardGridSkeleton count={6} />;

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--gm-border)] pb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Heart className="h-7 w-7 text-rose-400 fill-rose-400" />
            Favorites
          </h1>
          <p className="text-sm text-[var(--gm-text-muted)] mt-1">
            {tracks.length} saved songs synced across your Guru Music session.
          </p>
        </div>

        {tracks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => playQueue(tracks, 0, false)}
              className="px-5 py-2.5 rounded-full gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Play All
            </button>
            <button
              type="button"
              onClick={() => playQueue(tracks, 0, true)}
              className="px-4 py-2.5 rounded-full gm-surface text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Shuffle className="h-3.5 w-3.5" /> Shuffle
            </button>
          </div>
        )}
      </div>

      {tracks.length === 0 ? (
        <EmptyLibraryState
          title="No Favorite Songs Yet"
          subtitle="Tap the heart icon on any song to save it to your Favorites."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} contextQueue={tracks} />
          ))}
        </div>
      )}
    </div>
  );
}
