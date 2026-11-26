import type { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/lib/supabase/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_CONFIG.name} — ${BRAND_CONFIG.tagline}`,
    short_name: BRAND_CONFIG.name,
    description: "Discover your sound. Explore your world. Feel every beat.",
    start_url: "/",
    display: "standalone",
    background_color: "#07070b",
    theme_color: "#07070b",
    icons: [
      {
        src: "/brand/guru-music-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/guru-music-icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
