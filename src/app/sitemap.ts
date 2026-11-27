import type { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/lib/supabase/config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND_CONFIG.siteUrl;
  const routes = [
    "",
    "/songs/",
    "/artists/",
    "/albums/",
    "/playlists/",
    "/genres/",
    "/trending/",
    "/featured/",
    "/recent/",
    "/search/",
    "/library/",
  ];

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));
}
