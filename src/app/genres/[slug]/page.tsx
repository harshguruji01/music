import { notFound } from "next/navigation";
import { getGenres, getPublishedTracks, getSiteSettings } from "@/lib/data";
import { TrackCollectionView } from "@/components/music/TrackCollectionPage";

export const dynamic = "force-dynamic";

export default async function GenreDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [genres, tracks, settings] = await Promise.all([
    getGenres(),
    getPublishedTracks({ genreSlug: slug, limit: 100 }),
    getSiteSettings(),
  ]);

  const genre = genres.find((g) => g.slug === slug);
  if (!genre) notFound();

  return (
    <TrackCollectionView
      title={genre.name}
      subtitle={genre.description || `Explore ${genre.name} tracks on Guru Music.`}
      tracks={tracks}
      downloadPolicy={settings.public_download_policy}
      emptyTitle={`No ${genre.name} Tracks Published Yet`}
      emptySubtitle={`Upload tracks tagged with ${genre.name} in the Admin Control Center to populate this category.`}
    />
  );
}
