"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPublishedPlaylistBySlugClient, getSiteSettingsClient } from "@/lib/public-api";
import { CollectionDetailView } from "@/components/music/AlbumPlaylistDetailClient";
import { CardGridSkeleton, EmptyLibraryState } from "@/components/music/CollectionCards";
import type { Playlist, Track } from "@/types/music";

function PlaylistViewInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [policy, setPolicy] = useState<"track_level" | "disabled">("track_level");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getPublishedPlaylistBySlugClient(slug), getSiteSettingsClient()])
      .then(([res, s]) => {
        if (!active) return;
        setPlaylist(res.playlist);
        setTracks(res.tracks);
        setPolicy(s.public_download_policy);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) return <CardGridSkeleton count={6} />;
  if (!playlist) {
    return (
      <EmptyLibraryState
        title="Playlist Not Found"
        subtitle="This playlist may be unpublished or unavailable."
      />
    );
  }

  return (
    <CollectionDetailView
      kind="Playlist"
      title={playlist.title}
      description={playlist.description}
      coverUrl={playlist.cover_url}
      tracks={tracks}
      downloadPolicy={policy}
    />
  );
}

export default function PlaylistViewPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={6} />}>
      <PlaylistViewInner />
    </Suspense>
  );
}
