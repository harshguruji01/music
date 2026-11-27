"use client";

import Image from "next/image";
import { Crown } from "lucide-react";

type LogoVariant = "full" | "compact" | "icon" | "loading";

interface BrandLogoProps {
  variant?: LogoVariant;
  className?: string;
  showOwner?: boolean;
}

export function BrandLogo({
  variant = "compact",
  className = "",
  showOwner = true,
}: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <Image
          src="/brand/guru-music-icon.png"
          alt="Guru Music"
          width={44}
          height={44}
          className="rounded-xl object-cover shadow-md shadow-purple-500/20"
          priority
        />
      </div>
    );
  }

  if (variant === "loading") {
    return (
      <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
        <div className="relative p-1 rounded-3xl gm-rainbow-border">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-blue-500/20 via-emerald-500/20 to-purple-500/20 blur-2xl animate-pulse" />
          <Image
            src="/brand/guru-music-logo.png"
            alt="Guru Music Official Logo"
            width={112}
            height={112}
            className="relative rounded-2xl object-cover"
            priority
          />
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold tracking-wider">
            GURU <span className="gm-rainbow-text">MUSIC</span>
          </p>
          <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--gm-text-muted)]">
            By HarshGuruJi
          </p>
        </div>
      </div>
    );
  }

  if (variant === "full") {
    return (
      <div className={`inline-flex items-center gap-3.5 ${className}`}>
        <div className="relative shrink-0">
          <Image
            src="/brand/guru-music-icon.png"
            alt="Guru Music"
            width={56}
            height={56}
            className="rounded-2xl object-cover shadow-lg shadow-blue-500/20"
            priority
          />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight">
              GURU <span className="gm-rainbow-text">MUSIC</span>
            </span>
            <Crown className="h-4 w-4 text-amber-400 shrink-0" />
          </div>
          {showOwner && (
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--gm-text-muted)] uppercase">
              BY HARSHGURUJI
            </p>
          )}
        </div>
      </div>
    );
  }

  // compact navbar variant
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/brand/guru-music-navbar.png"
        alt="Guru Music"
        width={38}
        height={38}
        className="rounded-xl object-cover shadow-md shadow-purple-500/15 shrink-0"
        priority
      />
      <div className="leading-tight min-w-0">
        <p className="text-sm font-black tracking-wide whitespace-nowrap">
          GURU <span className="gm-rainbow-text">MUSIC</span>
        </p>
        {showOwner && (
          <p className="text-[9px] font-semibold tracking-[0.22em] text-[var(--gm-text-muted)] uppercase whitespace-nowrap">
            By HarshGuruJi
          </p>
        )}
      </div>
    </div>
  );
}
