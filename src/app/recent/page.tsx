import { getPublishedTracks, getSiteSettings } from "@/lib/data";
import { TrackCollectionView } from "@/components/music/TrackCollectionPage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recently Added" };

export default async function RecentPage() {
  const [tracks, settings] = await Promise.all([
    getPublishedTracks({ limit: 60, sortBy: "recent" }),
    getSiteSettings(),
  ]);

  return (
    <TrackCollectionView
      title="Recently Added"
      subtitle="Fresh uploads and latest releases added to Guru Music."
      tracks={tracks}
      downloadPolicy={settings.public_download_policy}
    />
  );
}
