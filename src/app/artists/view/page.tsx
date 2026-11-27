"use client";

import React, { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { User } from "lucide-react";
import { getPublishedArtistBySlugClient, getSiteSettingsClient } from "@/lib/public-api";
import { AlbumCard, CardGridSkeleton, EmptyLibraryState } from "@/components/music/CollectionCards";
import { TrackCollectionView } from "@/components/music/TrackCollectionPage";
import { formatCount } from "@/lib/format";
import type { Album, Artist, Track } from "@/types/music";

function ArtistViewInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [policy, setPolicy] = useState<"track_level" | "disabled">("track_level");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getPublishedArtistBySlugClient(slug), getSiteSettingsClient()])
      .then(([res, s]) => {
        if (!active) return;
        setArtist(res.artist);
        setTracks(res.tracks);
        setAlbums(res.albums);
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
  if (!artist) {
    return (
      <EmptyLibraryState
        title="Artist Not Found"
        subtitle="This artist profile may be unpublished or unavailable."
      />
    );
  }

  return (
    <div className="space-y-10">
      <section className="gm-surface gm-rainbow-border rounded-3xl p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full overflow-hidden shrink-0 ring-2 ring-purple-500/40">
          {artist.image_url ? (
            <Image src={artist.image_url} alt={artist.name} fill sizes="160px" className="object-cover" priority />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <User className="h-14 w-14 text-[var(--gm-text-muted)]" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">Verified Artist</p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{artist.name}</h1>
          <p className="text-xs text-[var(--gm-text-muted)]">
            {formatCount(artist.monthly_listeners)} monthly listeners • {tracks.length} tracks
          </p>
          {artist.bio && (
            <p className="text-sm text-[var(--gm-text-muted)] max-w-2xl leading-relaxed pt-1">{artist.bio}</p>
          )}
        </div>
      </section>

      <TrackCollectionView
        title="Tracks"
        subtitle={`Published songs by ${artist.name}`}
        tracks={tracks}
        downloadPolicy={policy}
      />

      {albums.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Albums & Releases</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ArtistViewPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={6} />}>
      <ArtistViewInner />
    </Suspense>
  );
}
