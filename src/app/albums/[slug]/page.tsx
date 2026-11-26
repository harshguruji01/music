import { notFound } from "next/navigation";
import { getPublishedAlbumBySlug, getSiteSettings } from "@/lib/data";
import { CollectionDetailView } from "@/components/music/AlbumPlaylistDetailClient";

export const dynamic = "force-dynamic";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ album, tracks }, settings] = await Promise.all([
    getPublishedAlbumBySlug(slug),
    getSiteSettings(),
  ]);

  if (!album) notFound();

  return (
    <CollectionDetailView
      kind="Album"
      title={album.title}
      description={album.description}
      coverUrl={album.cover_url}
      artistName={album.artist?.name}
      artistSlug={album.artist?.slug}
      releaseDate={album.release_date}
      tracks={tracks}
      downloadPolicy={settings.public_download_policy}
    />
  );
}
