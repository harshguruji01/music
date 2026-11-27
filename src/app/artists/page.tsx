"use client";

import React, { useEffect, useState } from "react";
import { getPublishedArtistsClient } from "@/lib/public-api";
import { ArtistCard, CardGridSkeleton, EmptyLibraryState } from "@/components/music/CollectionCards";
import type { Artist } from "@/types/music";

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getPublishedArtistsClient(60)
      .then((a) => {
        if (active) setArtists(a);
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
        <h1 className="text-3xl font-black tracking-tight">Artists</h1>
        <p className="text-sm text-[var(--gm-text-muted)] mt-1">
          Creators, vocalists, and producers featured on Guru Music.
        </p>
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : artists.length === 0 ? (
        <EmptyLibraryState
          title="No Published Artists Yet"
          subtitle="Published artist profiles and creators will appear here soon."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}
    </div>
  );
}
