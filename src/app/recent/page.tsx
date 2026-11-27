"use client";

import React, { useEffect, useState } from "react";
import { getPublishedTracksClient, getSiteSettingsClient } from "@/lib/public-api";
import { TrackCollectionView } from "@/components/music/TrackCollectionPage";
import { CardGridSkeleton } from "@/components/music/CollectionCards";
import type { Track } from "@/types/music";

export default function RecentPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [policy, setPolicy] = useState<"track_level" | "disabled">("track_level");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getPublishedTracksClient({ limit: 100, sortBy: "recent" }),
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
      title="Recently Added"
      subtitle="Fresh uploads and latest releases added to Guru Music."
      tracks={tracks}
      downloadPolicy={policy}
    />
  );
}
