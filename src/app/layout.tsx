import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { PlayerProvider } from "@/context/PlayerContext";
import { AppShell } from "@/components/layout/AppShell";
import { getSiteSettings } from "@/lib/data";
import { BRAND_CONFIG } from "@/lib/supabase/config";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = `${settings.site_title || BRAND_CONFIG.name} — ${settings.brand_tagline || BRAND_CONFIG.tagline}`;
  const description = settings.site_description;

  return {
    metadataBase: new URL(BRAND_CONFIG.siteUrl),
    title: {
      default: title,
      template: `%s | ${settings.site_title || BRAND_CONFIG.name}`,
    },
    description,
    applicationName: BRAND_CONFIG.name,
    authors: [{ name: BRAND_CONFIG.owner }],
    keywords: [
      "Guru Music",
      "HarshGuruJi",
      "Music Streaming",
      "Hindi Music",
      "Bollywood",
      "EDM",
      "Hip-Hop",
      "Independent Artists",
    ],
    openGraph: {
      type: "website",
      url: BRAND_CONFIG.siteUrl,
      title,
      description,
      siteName: BRAND_CONFIG.name,
      images: [
        {
          url: "/brand/guru-music-logo.png",
          width: 1254,
          height: 1254,
          alt: "Guru Music by HarshGuruJi",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/brand/guru-music-logo.png"],
    },
    icons: {
      icon: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#07070b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html lang="en" className={`${jakarta.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen antialiased selection:bg-purple-500/30">
        <ThemeProvider>
          <ToastProvider>
            <PlayerProvider>
              <AppShell
                downloadPolicy={settings.public_download_policy}
                maintenanceMode={settings.maintenance_mode}
              >
                {children}
              </AppShell>
            </PlayerProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
