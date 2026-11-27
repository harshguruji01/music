"use client";

import React, { useEffect, useState } from "react";
import { getPublishedAlbumsClient } from "@/lib/public-api";
import { AlbumCard, CardGridSkeleton, EmptyLibraryState } from "@/components/music/CollectionCards";
import type { Album } from "@/types/music";

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublishedAlbumsClient(60)
      .then((a) => {
        if (active) setAlbums(a);
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
        <h1 className="text-3xl font-black tracking-tight">Albums</h1>
        <p className="text-sm text-[var(--gm-text-muted)] mt-1">
          Full releases, EPs, and studio collections on Guru Music.
        </p>
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : albums.length === 0 ? (
        <EmptyLibraryState
          title="No Published Albums Yet"
          subtitle="Create and publish albums in the Admin Control Center to showcase full releases here."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}
    </div>
  );
}
