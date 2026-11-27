import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/context/AuthContext";
import { PlayerProvider } from "@/context/PlayerContext";
import { AppShell } from "@/components/layout/AppShell";
import { BRAND_CONFIG } from "@/lib/supabase/config";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_CONFIG.siteUrl),
  title: {
    default: `${BRAND_CONFIG.name} — ${BRAND_CONFIG.tagline}`,
    template: `%s | ${BRAND_CONFIG.name}`,
  },
  description: "Discover your sound. Explore your world. Feel every beat.",
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
    title: `${BRAND_CONFIG.name} — ${BRAND_CONFIG.tagline}`,
    description: "Discover your sound. Explore your world. Feel every beat.",
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
    title: `${BRAND_CONFIG.name} — ${BRAND_CONFIG.tagline}`,
    description: "Discover your sound. Explore your world. Feel every beat.",
    images: ["/brand/guru-music-logo.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} dark`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gm_theme');var r=t==='light'?'light':t==='dark'?'dark':(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.classList.toggle('light',r==='light');document.documentElement.classList.toggle('dark',r==='dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-purple-500/30">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <PlayerProvider>
                <AppShell>{children}</AppShell>
              </PlayerProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
