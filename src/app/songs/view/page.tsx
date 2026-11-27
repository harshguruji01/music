"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getPublishedTrackBySlugClient, getSiteSettingsClient } from "@/lib/public-api";
import { SongDetailClient } from "@/components/music/SongDetailClient";
import { CardGridSkeleton, EmptyLibraryState } from "@/components/music/CollectionCards";
import type { Track } from "@/types/music";

function SongViewInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [track, setTrack] = useState<Track | null>(null);
  const [related, setRelated] = useState<Track[]>([]);
  const [policy, setPolicy] = useState<"track_level" | "disabled">("track_level");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getPublishedTrackBySlugClient(slug), getSiteSettingsClient()])
      .then(([res, s]) => {
        if (!active) return;
        setTrack(res.track);
        setRelated(res.related);
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
  if (!track) {
    return (
      <EmptyLibraryState
        title="Song Not Found"
        subtitle="This song may be unpublished or removed by the administrator."
      />
    );
  }

  return <SongDetailClient track={track} related={related} downloadPolicy={policy} />;
}

export default function SongViewPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={6} />}>
      <SongViewInner />
    </Suspense>
  );
}
