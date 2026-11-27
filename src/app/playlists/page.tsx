"use client";

import React, { useEffect, useState } from "react";
import { getPublishedPlaylistsClient } from "@/lib/public-api";
import { CardGridSkeleton, EmptyLibraryState, PlaylistCard } from "@/components/music/CollectionCards";
import type { Playlist } from "@/types/music";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublishedPlaylistsClient(60)
      .then((p) => {
        if (active) setPlaylists(p);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--gm-border)] pb-5">
        <h1 className="text-3xl font-black tracking-tight">Playlists</h1>
        <p className="text-sm text-[var(--gm-text-muted)] mt-1">
          Curated mixes and featured playlists crafted for every mood.
        </p>
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : playlists.length === 0 ? (
        <EmptyLibraryState
          title="No Official Playlists Published Yet"
          subtitle="Curated playlists will appear here soon, or create personal mixes in Your Library."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
