import {
  getGenres,
  getPublishedAlbums,
  getPublishedArtists,
  getPublishedPlaylists,
  getPublishedTracks,
  getSiteSettings,
} from "@/lib/data";
import { HomeClient } from "@/components/home/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, allTracks, trendingTracks, featuredTracks, artists, albums, playlists, genres] =
    await Promise.all([
      getSiteSettings(),
      getPublishedTracks({ limit: 48, sortBy: "recent" }),
      getPublishedTracks({ limit: 12, sortBy: "trending" }),
      getPublishedTracks({ limit: 12, featuredOnly: true }),
      getPublishedArtists(12),
      getPublishedAlbums(12),
      getPublishedPlaylists(12),
      getGenres(),
    ]);

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
