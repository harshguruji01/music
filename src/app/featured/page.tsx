"use client";

import React, { useEffect, useState } from "react";
import { getPublishedTracksClient, getSiteSettingsClient } from "@/lib/public-api";
import { TrackCollectionView } from "@/components/music/TrackCollectionPage";
import { CardGridSkeleton } from "@/components/music/CollectionCards";
import type { Track } from "@/types/music";

export default function FeaturedPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [policy, setPolicy] = useState<"track_level" | "disabled">("track_level");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getPublishedTracksClient({ limit: 100, featuredOnly: true }),
      getSiteSettingsClient(),
    ])
      .then(([t, s]) => {
        if (!active) return;
        setTracks(t);
        setPolicy(s.public_download_policy);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <CardGridSkeleton count={6} />;

  return (
    <TrackCollectionView
      title="Featured Music"
      subtitle="Hand-picked spotlight tracks curated by HarshGuruJi."
      tracks={tracks}
      downloadPolicy={policy}
    />
  );
}
