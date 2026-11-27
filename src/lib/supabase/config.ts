export function getSupabaseConfigValues(): { url: string; anonKey: string } {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (
    envUrl.startsWith("https://") &&
    !envUrl.includes("your-project-ref") &&
    envAnon &&
    !envAnon.includes("your-supabase-anon-key")
  ) {
    return { url: envUrl, anonKey: envAnon };
  }

  if (typeof window !== "undefined") {
    try {
      const saved = JSON.parse(localStorage.getItem("gm_runtime_supabase_v1") || "null");
      if (saved && typeof saved.url === "string" && typeof saved.anonKey === "string") {
        return { url: saved.url, anonKey: saved.anonKey };
      }
    } catch {
      // ignore
    }
  }

  return { url: "", anonKey: "" };
}

export function isSupabasePublicConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfigValues();
  return Boolean(url.startsWith("https://") && anonKey.length > 10);
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
