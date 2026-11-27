"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic2,
  Music,
  Settings,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/context/AuthContext";

const STUDIO_NAV = [
  { href: "/studio/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/studio/upload/", label: "Upload Music", icon: Upload },
  { href: "/studio/songs/", label: "My Songs", icon: Music },
  { href: "/studio/verification/", label: "Verification", icon: BadgeCheck },
  { href: "/studio/analytics/", label: "Analytics", icon: BarChart3 },
  { href: "/studio/settings/", label: "Creator Settings", icon: Settings },
  { href: "/studio/onboarding/", label: "Account Setup", icon: UserCheck },
];

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, creator, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-white/10 space-y-2">
        <Link href="/studio/" onClick={() => setMobileOpen(false)}>
          <BrandLogo variant="compact" />
        </Link>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-bold text-purple-300 uppercase tracking-wider">
          <Mic2 className="h-3 w-3" />
          Creator Studio
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 gm-scrollbar">
        {STUDIO_NAV.map((item) => {
          const Icon = item.icon;
          const active = normalized === item.href;
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
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2">
        <Link
          href="/"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/5"
        >
          <span>Music App</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.replace("/");
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#07070b] text-slate-100">
      <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-white/10 bg-[#0b0b12] sticky top-0 h-screen">
        {navContent}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 gm-glass border-b border-white/10 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-white/10"
              aria-label="Open studio navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5">
              {creator?.avatar_url && (
                <Image
                  src={creator.avatar_url}
                  alt={creator.stage_name}
                  width={32}
                  height={32}
                  className="rounded-xl object-cover border border-white/10"
                />
              )}
              <div className="text-xs">
                <p className="font-bold text-white">
                  {creator ? `${creator.stage_name} (@${creator.username})` : "Creator Onboarding"}
                </p>
                <p className="text-[11px] text-slate-400">{user?.email}</p>
              </div>
            </div>
          </div>

          <Link
            href="/studio/upload/"
            className="px-3.5 py-2 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload Song
          </Link>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-64 bg-[#0b0b12] border-r border-white/10 h-full">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Close studio navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </div>
  );
}
