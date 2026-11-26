import type { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import {
  getGenres,
  getPublishedAlbums,
  getPublishedArtists,
  getPublishedPlaylists,
  getPublishedTracks,
} from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BRAND_CONFIG.siteUrl;
  const staticRoutes = [
    "",
    "/songs",
    "/artists",
    "/albums",
    "/playlists",
    "/genres",
    "/trending",
    "/featured",
    "/recent",
    "/search",
    "/library",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  const [tracks, artists, albums, playlists, genres] = await Promise.all([
    getPublishedTracks({ limit: 200 }),
    getPublishedArtists(100),
    getPublishedAlbums(100),
    getPublishedPlaylists(100),
    getGenres(),
  ]);

  const dynamicRoutes: MetadataRoute.Sitemap = [
    ...tracks.map((t) => ({
      url: `${base}/songs/${t.slug}`,
      lastModified: new Date(t.updated_at || t.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...artists.map((a) => ({
      url: `${base}/artists/${a.slug}`,
      lastModified: new Date(a.updated_at || a.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...albums.map((a) => ({
      url: `${base}/albums/${a.slug}`,
      lastModified: new Date(a.updated_at || a.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...playlists.map((p) => ({
      url: `${base}/playlists/${p.slug}`,
      lastModified: new Date(p.updated_at || p.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...genres.map((g) => ({
      url: `${base}/genres/${g.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  return [...staticRoutes, ...dynamicRoutes];
}
