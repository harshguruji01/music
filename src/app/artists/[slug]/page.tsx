import Image from "next/image";
import { notFound } from "next/navigation";
import { User } from "lucide-react";
import { getPublishedArtistBySlug, getSiteSettings } from "@/lib/data";
import { AlbumCard } from "@/components/music/CollectionCards";
import { TrackCollectionView } from "@/components/music/TrackCollectionPage";
import { formatCount } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ artist, tracks, albums }, settings] = await Promise.all([
    getPublishedArtistBySlug(slug),
    getSiteSettings(),
  ]);

  if (!artist) notFound();

  return (
    <div className="space-y-10">
      <section className="gm-surface gm-rainbow-border rounded-3xl p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full overflow-hidden shrink-0 ring-2 ring-purple-500/40">
          {artist.image_url ? (
            <Image
              src={artist.image_url}
              alt={artist.name}
              fill
              sizes="160px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <User className="h-14 w-14 text-[var(--gm-text-muted)]" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
            Verified Artist
          </p>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{artist.name}</h1>
          <p className="text-xs text-[var(--gm-text-muted)]">
            {formatCount(artist.monthly_listeners)} monthly listeners • {tracks.length} tracks
          </p>
          {artist.bio && (
            <p className="text-sm text-[var(--gm-text-muted)] max-w-2xl leading-relaxed pt-1">
              {artist.bio}
            </p>
          )}
        </div>
      </section>

      <TrackCollectionView
        title="Tracks"
        subtitle={`Published songs by ${artist.name}`}
        tracks={tracks}
        downloadPolicy={settings.public_download_policy}
      />

      {albums.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Albums & Releases</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
