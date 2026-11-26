export function isSupabasePublicConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      anon &&
      url.startsWith("https://") &&
      !url.includes("your-project-ref") &&
      !anon.includes("your-supabase-anon-key")
  );
}

export function isSupabaseAdminConfigured(): boolean {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    isSupabasePublicConfigured() &&
      service &&
      !service.includes("your-supabase-service-role-key")
  );
}

export const BRAND_CONFIG = {
  name: "Guru Music",
  owner: "HarshGuruJi",
  tagline: "MUSIC BEYOND LIMITS.",
  secondaryTagline: "LISTEN • EXPLORE • FEEL THE FLOW.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://music.webguruji.online",
  logoPath: "/brand/guru-music-logo.png",
  navbarLogoPath: "/brand/guru-music-navbar.png",
  iconPath: "/brand/guru-music-icon.png",
  emblemPath: "/brand/guru-music-emblem.png",
  defaultCoverPath: "/brand/default-cover.png",
} as const;
