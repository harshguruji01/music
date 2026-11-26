import { notFound } from "next/navigation";
import { getPublishedPlaylistBySlug, getSiteSettings } from "@/lib/data";
import { CollectionDetailView } from "@/components/music/AlbumPlaylistDetailClient";

export const dynamic = "force-dynamic";

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ playlist, tracks }, settings] = await Promise.all([
    getPublishedPlaylistBySlug(slug),
    getSiteSettings(),
  ]);

  if (!playlist) notFound();

  return (
    <CollectionDetailView
      kind="Playlist"
      title={playlist.title}
      description={playlist.description}
      coverUrl={playlist.cover_url}
      tracks={tracks}
      downloadPolicy={settings.public_download_policy}
    />
  );
}
