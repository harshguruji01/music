import { getPublishedAlbums } from "@/lib/data";
import { AlbumCard, EmptyLibraryState } from "@/components/music/CollectionCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Albums" };

export default async function AlbumsPage() {
  const albums = await getPublishedAlbums(60);

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--gm-border)] pb-5">
        <h1 className="text-3xl font-black tracking-tight">Albums</h1>
        <p className="text-sm text-[var(--gm-text-muted)] mt-1">
          Full releases, EPs, and studio collections on Guru Music.
        </p>
      </div>

      {albums.length === 0 ? (
        <EmptyLibraryState
          title="No Published Albums Yet"
          subtitle="Create and publish albums in the Admin Control Center to showcase full releases here."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}
    </div>
  );
}
