"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  Disc3,
  Flame,
  Heart,
  Home,
  Library,
  ListMusic,
  Menu,
  Moon,
  Music,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  User,
  WifiOff,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BottomPlayer } from "@/components/player/BottomPlayer";
import { FullScreenPlayer } from "@/components/player/FullScreenPlayer";
import { QueuePanel } from "@/components/player/QueuePanel";
import { useTheme } from "@/context/ThemeContext";
import { usePlayer } from "@/context/PlayerContext";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import type { Track } from "@/types/music";

const PRIMARY_NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/songs", label: "All Songs", icon: Music },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/featured", label: "Featured", icon: Sparkles },
  { href: "/recent", label: "Recently Added", icon: Flame },
];

const DISCOVER_NAV = [
  { href: "/artists", label: "Artists", icon: User },
  { href: "/albums", label: "Albums", icon: Disc3 },
  { href: "/playlists", label: "Playlists", icon: ListMusic },
  { href: "/genres", label: "Genres", icon: Compass },
  { href: "/library", label: "Your Library", icon: Heart },
];

export function AppShell({
  children,
  downloadPolicy = "track_level",
  maintenanceMode = false,
}: {
  children: React.ReactNode;
  downloadPolicy?: "track_level" | "disabled";
  maintenanceMode?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { currentTrack, isOnline, playTrack } = usePlayer();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&type=songs&limit=5`)
        .then((r) => r.json())
        .then((d) => setSuggestions(Array.isArray(d.tracks) ? d.tracks : []))
        .catch(() => setSuggestions([]));
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSuggestOpen(false);
    if (q) {
      try {
        const prev = JSON.parse(localStorage.getItem("gm_recent_searches") || "[]") as string[];
        const next = [q, ...prev.filter((x) => x !== q)].slice(0, 8);
        localStorage.setItem("gm_recent_searches", JSON.stringify(next));
      } catch {
        // ignore
      }
      router.push(`/search?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/search");
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--gm-bg)] text-[var(--gm-text)]">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-[272px] shrink-0 flex-col border-r border-[var(--gm-border)] bg-[var(--gm-bg-elevated)] sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-[var(--gm-border)]">
          <Link href="/" className="block">
            <BrandLogo variant="compact" />
          </Link>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-6 gm-scrollbar">
          <div>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gm-text-muted)]">
              Discover
            </p>
            <div className="space-y-1">
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "gm-rainbow-border bg-white/10 text-[var(--gm-text)] font-semibold"
                        : "text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gm-text-muted)]">
              Browse & Library
            </p>
            <div className="space-y-1">
              {DISCOVER_NAV.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "gm-rainbow-border bg-white/10 text-[var(--gm-text)] font-semibold"
                        : "text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-[var(--gm-border)] space-y-2">
          <div className="gm-surface rounded-xl p-3">
            <p className="text-[11px] font-bold tracking-wider gm-rainbow-text">
              {BRAND_CONFIG.tagline}
            </p>
            <p className="text-[10px] text-[var(--gm-text-muted)] mt-0.5">
              {BRAND_CONFIG.secondaryTagline}
            </p>
          </div>
          <Link
            href="/admin"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[var(--gm-text-muted)] hover:text-[var(--gm-text)] hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Admin CMS
            </span>
            <span className="text-[10px] opacity-60">HarshGuruJi</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Navigation & Live Search Bar */}
        <header className="sticky top-0 z-30 gm-glass border-b border-[var(--gm-border)] px-4 md:px-6 py-3">
          <div className="flex items-center justify-between gap-3 max-w-[1440px] mx-auto">
            <div className="flex items-center gap-2.5 md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 rounded-xl hover:bg-white/10"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/">
                <BrandLogo variant="compact" showOwner={false} />
              </Link>
            </div>

            <div ref={searchBoxRef} className="relative flex-1 max-w-xl">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gm-text-muted)]" />
                <input
                  type="search"
                  value={searchQuery}
                  onFocus={() => setSuggestOpen(true)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.trim().length < 2) setSuggestions([]);
                    setSuggestOpen(true);
                  }}
                  placeholder="Search songs, artists, albums, genres..."
                  aria-label="Search Guru Music"
                  className="w-full pl-10 pr-4 py-2 rounded-full bg-[var(--gm-surface)] border border-[var(--gm-border)] text-sm text-[var(--gm-text)] placeholder:text-[var(--gm-text-muted)] focus:outline-none focus:ring-2 focus:ring-purple-500/60"
                />
              </form>

              {suggestOpen && suggestions.length > 0 && (
                <div className="absolute top-12 left-0 right-0 gm-surface rounded-2xl p-2 shadow-2xl z-50">
                  <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--gm-text-muted)]">
                    Quick Matches
                  </p>
                  {suggestions.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-white/5"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          playTrack(track, suggestions);
                          setSuggestOpen(false);
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                      >
                        <Image
                          src={track.cover_url || BRAND_CONFIG.defaultCoverPath}
                          alt={track.title}
                          width={34}
                          height={34}
                          className="rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{track.title}</p>
                          <p className="text-[11px] text-[var(--gm-text-muted)] truncate">
                            {track.artist?.name || BRAND_CONFIG.owner}
                          </p>
                        </div>
                      </button>
                      <Link
                        href={`/songs/${track.slug}`}
                        onClick={() => setSuggestOpen(false)}
                        className="text-[11px] text-purple-400 hover:underline px-2"
                      >
                        Details
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isOnline && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-400 text-xs font-medium">
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Offline</span>
                </span>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="p-2 rounded-xl gm-surface hover:bg-[var(--gm-surface-hover)] transition-colors"
                title={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-purple-600" />
                )}
              </button>
              <Link
                href="/library"
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl gm-surface hover:bg-[var(--gm-surface-hover)] text-xs font-semibold"
              >
                <Library className="h-3.5 w-3.5 text-emerald-400" />
                Library
              </Link>
            </div>
          </div>
        </header>

        {maintenanceMode && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-300">
            Guru Music is currently undergoing scheduled maintenance. Some features may update shortly.
          </div>
        )}

        <main
          className={`flex-1 max-w-[1440px] w-full mx-auto px-4 md:px-6 py-6 ${
            currentTrack ? "pb-36 md:pb-28" : "pb-20 md:pb-12"
          }`}
        >
          {children}
        </main>

        <footer className="border-t border-[var(--gm-border)] px-6 py-5 text-xs text-[var(--gm-text-muted)] pb-24 md:pb-24">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--gm-text)]">GURU MUSIC</span>
              <span>•</span>
              <span>Developed by HarshGuruJi</span>
            </div>
            <p className="tracking-wider uppercase text-[11px] font-semibold gm-rainbow-text">
              {BRAND_CONFIG.tagline}
            </p>
          </div>
        </footer>
      </div>

      {/* Mobile Slide-out Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[var(--gm-bg-elevated)] border-r border-[var(--gm-border)] h-full flex flex-col p-4 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--gm-border)]">
              <BrandLogo variant="compact" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 space-y-1">
              {[...PRIMARY_NAV, ...DISCOVER_NAV].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      pathname === item.href
                        ? "bg-white/10 text-[var(--gm-text)] font-semibold"
                        : "text-[var(--gm-text-muted)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-400"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Control Center
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 gm-glass border-t border-[var(--gm-border)] grid grid-cols-5"
      >
        {[
          { href: "/", label: "Home", icon: Home },
          { href: "/search", label: "Search", icon: Search },
          { href: "/songs", label: "Songs", icon: Music },
          { href: "/playlists", label: "Playlists", icon: ListMusic },
          { href: "/library", label: "Library", icon: Library },
        ].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                active ? "text-purple-400" : "text-[var(--gm-text-muted)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <QueuePanel />
      <BottomPlayer downloadPolicy={downloadPolicy} />
      <FullScreenPlayer downloadPolicy={downloadPolicy} />
    </div>
  );
}
