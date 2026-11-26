import { notFound } from "next/navigation";
import { getPublishedTrackBySlug, getSiteSettings } from "@/lib/data";
import { SongDetailClient } from "@/components/music/SongDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { track } = await getPublishedTrackBySlug(slug);
  if (!track) return { title: "Song Not Found" };
  return {
    title: `${track.title}${track.artist ? ` — ${track.artist.name}` : ""}`,
    description: track.description || `Listen to ${track.title} on Guru Music by HarshGuruJi.`,
  };
}

export default async function SongDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ track, related }, settings] = await Promise.all([
    getPublishedTrackBySlug(slug),
    getSiteSettings(),
  ]);

  if (!track) {
    notFound();
  }

  return (
    <SongDetailClient
      track={track}
      related={related}
      downloadPolicy={settings.public_download_policy}
    />
  );
}
