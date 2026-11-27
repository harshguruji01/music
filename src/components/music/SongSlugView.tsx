"use client";

import React, { useEffect, useState } from "react";
import { getPublishedTrackBySlugClient, getSiteSettingsClient } from "@/lib/public-api";
import { SongDetailClient } from "@/components/music/SongDetailClient";
import { CardGridSkeleton, EmptyLibraryState } from "@/components/music/CollectionCards";
import type { Track } from "@/types/music";

export function SongSlugView({ slug }: { slug: string }) {
  const [track, setTrack] = useState<Track | null>(null);
  const [related, setRelated] = useState<Track[]>([]);
  const [policy, setPolicy] = useState<"track_level" | "disabled">("track_level");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!slug) {
      Promise.resolve().then(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }

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
        subtitle="This song is currently unavailable or has not been published yet."
      />
    );
  }

  return <SongDetailClient track={track} related={related} downloadPolicy={policy} />;
}
