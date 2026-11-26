import { getPublishedTracks, getSiteSettings } from "@/lib/data";
import { TrackCollectionView } from "@/components/music/TrackCollectionPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Songs",
};

export default async function AllSongsPage() {
  const [tracks, settings] = await Promise.all([
    getPublishedTracks({ limit: 120, sortBy: "recent" }),
    getSiteSettings(),
  ]);

  return (
    <TrackCollectionView
      title="All Songs"
      subtitle="Every published track across the Guru Music catalog."
      tracks={tracks}
      downloadPolicy={settings.public_download_policy}
    />
  );
}
