"use client";

import React, { useEffect, useState } from "react";
import {
  DEFAULT_GENRES,
  DEFAULT_SITE_SETTINGS,
  getGenresClient,
  getPublishedAlbumsClient,
  getPublishedArtistsClient,
  getPublishedPlaylistsClient,
  getPublishedTracksClient,
  getSiteSettingsClient,
} from "@/lib/public-api";
import { HomeClient } from "@/components/home/HomeClient";
import { CardGridSkeleton } from "@/components/music/CollectionCards";
import type { Album, Artist, Genre, Playlist, SiteSettings, Track } from "@/types/music";

export default function HomePage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [genres, setGenres] = useState<Genre[]>(DEFAULT_GENRES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getSiteSettingsClient(),
      getPublishedTracksClient({ limit: 100, sortBy: "recent" }),
      getPublishedTracksClient({ limit: 12, sortBy: "trending" }),
      getPublishedTracksClient({ limit: 12, featuredOnly: true }),
      getPublishedArtistsClient(12),
      getPublishedAlbumsClient(12),
      getPublishedPlaylistsClient(12),
      getGenresClient(),
    ])
      .then(([s, all, trending, featured, art, alb, pl, gen]) => {
        if (!active) return;
        setSettings(s);
        setAllTracks(all);
        setTrendingTracks(trending);
        setFeaturedTracks(featured);
        setArtists(art);
        setAlbums(alb);
        setPlaylists(pl);
        setGenres(gen);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-64 rounded-3xl gm-surface animate-pulse" />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <HomeClient
      settings={settings}
      allTracks={allTracks}
      trendingTracks={trendingTracks}
      featuredTracks={featuredTracks}
      artists={artists}
      albums={albums}
      playlists={playlists}
      genres={genres}
    />
  );
}
