import { getPublishedTracks, getSiteSettings } from "@/lib/data";
import { TrackCollectionView } from "@/components/music/TrackCollectionPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Featured Music" };

export default async function FeaturedPage() {
  const [tracks, settings] = await Promise.all([
    getPublishedTracks({ limit: 60, featuredOnly: true }),
    getSiteSettings(),
  ]);

  return (
    <TrackCollectionView
      title="Featured Music"
      subtitle="Hand-picked spotlight tracks curated by HarshGuruJi."
      tracks={tracks}
      downloadPolicy={settings.public_download_policy}
    />
  );
}
