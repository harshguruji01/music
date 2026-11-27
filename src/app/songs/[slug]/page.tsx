import type { Metadata } from "next";
import { SongSlugView } from "@/components/music/SongSlugView";
import { BRAND_CONFIG, getSupabaseConfigValues } from "@/lib/supabase/config";

export const dynamicParams = false;

interface StaticTrackRow {
  slug: string;
  title?: string;
  description?: string | null;
  cover_url?: string | null;
}

async function fetchPublishedTrackSlugs(): Promise<StaticTrackRow[]> {
  try {
    const { url, anonKey } = getSupabaseConfigValues();
    const res = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/tracks?is_published=eq.true&select=slug,title,description,cover_url&limit=5000`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as StaticTrackRow[];
    return Array.isArray(data) ? data.filter((r) => Boolean(r.slug)) : [];
  } catch {
    return [];
  }
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const rows = await fetchPublishedTrackSlugs();
  if (rows.length === 0) {
    return [{ slug: "listen" }];
  }
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const rows = await fetchPublishedTrackSlugs();
  const match = rows.find((r) => r.slug === slug);
  const title = match?.title ? `${match.title} — ${BRAND_CONFIG.name}` : `Listen on ${BRAND_CONFIG.name}`;
  const description =
    match?.description || `Stream ${match?.title || "music"} on ${BRAND_CONFIG.name} by ${BRAND_CONFIG.owner}.`;
  const image = match?.cover_url || BRAND_CONFIG.logoPath;
  const canonicalUrl = `${BRAND_CONFIG.siteUrl}/songs/${encodeURIComponent(slug)}/`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: [{ url: image }],
    },
  };
}

export default async function DedicatedSongPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SongSlugView slug={decodeURIComponent(slug)} />;
}
