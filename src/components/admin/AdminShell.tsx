"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  CheckSquare,
  Disc3,
  Download,
  ExternalLink,
  HardDrive,
  LayoutDashboard,
  ListMusic,
  LogOut,
  Menu,
  Music,
  Settings,
  Shield,
  Sparkles,
  Tags,
  Upload,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { AdminBrandLogo } from "@/components/admin/AdminBrandLogo";
import { signOutAdminClient } from "@/lib/admin-api";

const ADMIN_NAV = [
  { href: "/admin/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/submissions/", label: "Song Moderation", icon: CheckSquare },
  { href: "/admin/library/", label: "Music Library", icon: Music },
  { href: "/admin/upload/", label: "Upload Music", icon: Upload },
  { href: "/admin/creators/", label: "Creators", icon: BadgeCheck },
  { href: "/admin/artists/", label: "Artists", icon: Users },
  { href: "/admin/users/", label: "Music Users", icon: UserCog },
  { href: "/admin/albums/", label: "Albums", icon: Disc3 },
  { href: "/admin/playlists/", label: "Playlists", icon: ListMusic },
  { href: "/admin/genres/", label: "Genres", icon: Tags },
  { href: "/admin/featured/", label: "Featured Music", icon: Sparkles },
  { href: "/admin/downloads/", label: "Download Management", icon: Download },
  { href: "/admin/statistics/", label: "Statistics", icon: BarChart3 },
  { href: "/admin/storage/", label: "Storage", icon: HardDrive },
  { href: "/admin/settings/", label: "Website Settings", icon: Settings },
  { href: "/admin/moderation-logs/", label: "Moderation Logs", icon: Shield },
  { href: "/admin/activity/", label: "Admin Activity", icon: Activity },
  { href: "/admin/security/", label: "Security", icon: Shield },
];

export function AdminShell({
  adminEmail,
  children,
}: {
  adminEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOutAdminClient();
    router.replace("/admin/login/");
  };

  const normalizedPath = pathname.endsWith("/") ? pathname : `${pathname}/`;

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-white/10">
        <Link href="/admin/" onClick={() => setMobileOpen(false)}>
          <AdminBrandLogo />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 gm-scrollbar">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const active = normalizedPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                active
                  ? "gm-rainbow-border bg-white/10 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors mt-2"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{loggingOut ? "Signing out..." : "Logout"}</span>
        </button>
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="px-3 py-2 rounded-xl bg-white/5 text-[11px]">
          <p className="text-slate-400">Signed in as</p>
          <p className="font-semibold text-white truncate">{adminEmail}</p>
        </div>
        <Link
          href="/"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/5"
        >
          <span>Public Website</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#07070b] text-slate-100">
      <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col bg-[#0c0d14] border-r border-white/10 sticky top-0 h-screen">
        {navContent}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 gm-glass border-b border-white/10 px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/10"
              aria-label="Open admin menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <AdminBrandLogo showOwner={false} />
            </div>
            <span className="hidden lg:inline-block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              GURU MUSIC • ADMIN CONTROL CENTER
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/upload/"
              className="px-3.5 py-2 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 shadow"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Upload Music</span>
            </Link>
            <Link
              href="/"
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View Site</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-white/10 px-6 py-5 text-xs text-slate-400">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-bold text-white">Guru Music</span>{" "}
              <span className="font-extrabold gm-animated-brand">by HarshGuruJi</span>
            </div>
            <span className="text-[11px] uppercase tracking-wider gm-animated-brand font-bold">
              ADMIN CONTROL CENTER
            </span>
          </div>
        </footer>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 bg-[#0c0d14] border-r border-white/10 h-full z-10">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </div>
  );
}
