import { getGenres } from "@/lib/data";
import { GenreCard } from "@/components/music/CollectionCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Genres" };

export default async function GenresPage() {
  const genres = await getGenres();

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--gm-border)] pb-5">
        <h1 className="text-3xl font-black tracking-tight">Genres & Moods</h1>
        <p className="text-sm text-[var(--gm-text-muted)] mt-1">
          Explore music by language, vibe, and genre category.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {genres.map((genre) => (
          <GenreCard key={genre.id} genre={genre} />
        ))}
      </div>
    </div>
  );
}
