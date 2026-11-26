import type { MetadataRoute } from "next";
import { BRAND_CONFIG } from "@/lib/supabase/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/admin/"],
      },
    ],
    sitemap: `${BRAND_CONFIG.siteUrl}/sitemap.xml`,
  };
}
