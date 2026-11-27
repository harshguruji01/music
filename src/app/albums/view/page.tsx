"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPublishedAlbumBySlugClient, getSiteSettingsClient } from "@/lib/public-api";
import { CollectionDetailView } from "@/components/music/AlbumPlaylistDetailClient";
import { CardGridSkeleton, EmptyLibraryState } from "@/components/music/CollectionCards";
import type { Album, Track } from "@/types/music";

function AlbumViewInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [policy, setPolicy] = useState<"track_level" | "disabled">("track_level");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getPublishedAlbumBySlugClient(slug), getSiteSettingsClient()])
      .then(([res, s]) => {
        if (!active) return;
        setAlbum(res.album);
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
  if (!album) {
    return (
      <EmptyLibraryState
        title="Album Not Found"
        subtitle="This album may be unpublished or unavailable."
      />
    );
  }

  return (
    <CollectionDetailView
      kind="Album"
      title={album.title}
      description={album.description}
      coverUrl={album.cover_url}
      artistName={album.artist?.name}
      artistSlug={album.artist?.slug}
      releaseDate={album.release_date}
      tracks={tracks}
      downloadPolicy={policy}
    />
  );
}

export default function AlbumViewPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={6} />}>
      <AlbumViewInner />
    </Suspense>
  );
}
