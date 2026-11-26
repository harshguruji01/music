import { getPublishedTracks, getSiteSettings } from "@/lib/data";
import { TrackCollectionView } from "@/components/music/TrackCollectionPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trending Songs" };

export default async function TrendingPage() {
  const [tracks, settings] = await Promise.all([
    getPublishedTracks({ limit: 60, sortBy: "trending" }),
    getSiteSettings(),
  ]);

  return (
    <TrackCollectionView
      title="Trending Songs"
      subtitle="Most played tracks on Guru Music right now."
      tracks={tracks}
      downloadPolicy={settings.public_download_policy}
    />
  );
}
