"use client";

import Image from "next/image";
import { Crown } from "lucide-react";

export function AdminBrandLogo({
  className = "",
  showOwner = true,
}: {
  className?: string;
  showOwner?: boolean;
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative shrink-0">
        <Image
          src="/brand/guru-music-navbar.png"
          alt="Guru Music Admin"
          width={44}
          height={44}
          className="rounded-xl object-cover ring-1 ring-amber-400/50 shadow-lg shadow-amber-500/10"
          priority
        />
        <span
          title="Official Admin Control Center"
          className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 text-black shadow"
        >
          <Crown className="h-3 w-3" />
        </span>
      </div>
      <div className="leading-tight min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold tracking-wide text-sm text-[var(--gm-text)]">
            GURU <span className="gm-rainbow-text">MUSIC</span>
          </span>
        </div>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-amber-400 uppercase truncate">
          Admin Control Center
        </p>
        {showOwner && (
          <p className="text-[9px] tracking-[0.2em] text-[var(--gm-text-muted)] uppercase truncate">
            By HarshGuruJi
          </p>
        )}
      </div>
    </div>
  );
}
