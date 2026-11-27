"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DEFAULT_GENRES, getGenresClient, getPublishedTracksClient, getSiteSettingsClient } from "@/lib/public-api";
import { TrackCollectionView } from "@/components/music/TrackCollectionPage";
import { CardGridSkeleton, EmptyLibraryState } from "@/components/music/CollectionCards";
import type { Genre, Track } from "@/types/music";

function GenreViewInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [genre, setGenre] = useState<Genre | null>(
    DEFAULT_GENRES.find((g) => g.slug === slug) || null
  );
  const [tracks, setTracks] = useState<Track[]>([]);
  const [policy, setPolicy] = useState<"track_level" | "disabled">("track_level");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getGenresClient(),
      getPublishedTracksClient({ genreSlug: slug, limit: 150 }),
      getSiteSettingsClient(),
    ])
      .then(([genres, tr, s]) => {
        if (!active) return;
        setGenre(genres.find((g) => g.slug === slug) || null);
        setTracks(tr);
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
  if (!genre) {
    return (
      <EmptyLibraryState
        title="Genre Not Found"
        subtitle="Browse all available genres on Guru Music."
      />
    );
  }

  return (
    <TrackCollectionView
      title={genre.name}
      subtitle={genre.description || `Explore ${genre.name} tracks on Guru Music.`}
      tracks={tracks}
      downloadPolicy={policy}
      emptyTitle={`No ${genre.name} Tracks Published Yet`}
      emptySubtitle={`Published tracks tagged with ${genre.name} will appear here soon.`}
    />
  );
}

export default function GenreViewPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={6} />}>
      <GenreViewInner />
    </Suspense>
  );
}
