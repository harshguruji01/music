import { getPublishedPlaylists } from "@/lib/data";
import { EmptyLibraryState, PlaylistCard } from "@/components/music/CollectionCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Playlists" };

export default async function PlaylistsPage() {
  const playlists = await getPublishedPlaylists(60);

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--gm-border)] pb-5">
        <h1 className="text-3xl font-black tracking-tight">Playlists</h1>
        <p className="text-sm text-[var(--gm-text-muted)] mt-1">
          Curated mixes and featured playlists crafted for every mood.
        </p>
      </div>

      {playlists.length === 0 ? (
        <EmptyLibraryState
          title="No Official Playlists Published Yet"
          subtitle="Create and publish curated playlists in the Admin Control Center, or create personal mixes in Your Library."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
