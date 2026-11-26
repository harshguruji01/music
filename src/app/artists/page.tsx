import { getPublishedArtists } from "@/lib/data";
import { ArtistCard, EmptyLibraryState } from "@/components/music/CollectionCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Artists" };

export default async function ArtistsPage() {
  const artists = await getPublishedArtists(60);

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--gm-border)] pb-5">
        <h1 className="text-3xl font-black tracking-tight">Artists</h1>
        <p className="text-sm text-[var(--gm-text-muted)] mt-1">
          Creators, vocalists, and producers featured on Guru Music.
        </p>
      </div>

      {artists.length === 0 ? (
        <EmptyLibraryState
          title="No Published Artists Yet"
          subtitle="Create and publish artist profiles in the Admin Control Center to showcase creators here."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}
    </div>
  );
}
