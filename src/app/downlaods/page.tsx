"use client";

import React, { useState } from "react";
import {
  Apple,
  CheckCircle2,
  Download,
  Laptop,
  Monitor,
  Smartphone,
  Terminal,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

type CategoryId = "all" | "android" | "windows" | "linux" | "macos";

interface PlatformPackage {
  id: Exclude<CategoryId, "all">;
  name: string;
  badge: string;
  fileName: string;
  fileSize: string;
  downloadHref: string;
  supportedVersions: string[];
  requirements: string;
  installSteps: string[];
  accentClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PACKAGES: PlatformPackage[] = [
  {
    id: "android",
    name: "Android App",
    badge: ".APK",
    fileName: "GuruMusic.apk",
    fileSize: "2.4 MB",
    downloadHref: "/downlaod/GuruMusic.apk",
    supportedVersions: [
      "Android 7.0 Nougat (API 24)",
      "Android 8 / 9 / 10 / 11",
      "Android 12 / 13 / 14",
      "Android 15 & Android 16 (API 35–36)",
    ],
    requirements:
      "ARM64 / ARMv7 / x86_64 • Streams all songs live with zero bundled audio; app data grows only when you cache or download tracks.",
    installSteps: [
      "Tap Download Android APK below.",
      "Open GuruMusic.apk from your browser or Files app.",
      "Allow Install from Unknown Sources if prompted, then tap Install.",
    ],
    accentClass: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
    icon: Smartphone,
  },
  {
    id: "windows",
    name: "Windows App",
    badge: ".EXE",
    fileName: "GuruMusic-Windows.exe",
    fileSize: "188 KB",
    downloadHref: "/downlaod/GuruMusic-Windows.exe",
    supportedVersions: [
      "Windows 11 (64-bit / x64)",
      "Windows 10 (64-bit / x64)",
      "Works with Microsoft Edge, Google Chrome, or Brave",
    ],
    requirements:
      "64-bit Windows 10 or 11 • Standalone app window with Guru Music icon and persistent login/playback.",
    installSteps: [
      "Click Download for Windows (.exe).",
      "Double-click GuruMusic-Windows.exe to launch immediately (no heavy installer needed).",
      "Pin Guru Music to your Taskbar or Start Menu for one-click access.",
    ],
    accentClass: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    icon: Monitor,
  },
  {
    id: "linux",
    name: "Linux App",
    badge: ".TAR.GZ",
    fileName: "GuruMusic-Linux.tar.gz",
    fileSize: "111 KB",
    downloadHref: "/downlaod/GuruMusic-Linux.tar.gz",
    supportedVersions: [
      "Ubuntu 20.04 / 22.04 / 24.04+",
      "Debian 11 / 12+",
      "Fedora, Arch Linux, Linux Mint & Pop!_OS (x86_64)",
    ],
    requirements:
      "64-bit Linux • Native ELF launcher + .desktop menu entry + 256px icon; uses Chrome, Chromium, Brave, or Edge app mode.",
    installSteps: [
      "Download GuruMusic-Linux.tar.gz.",
      "Extract: tar -xzf GuruMusic-Linux.tar.gz",
      "Run ./install.sh to add Guru Music to your application menu.",
    ],
    accentClass: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    icon: Terminal,
  },
  {
    id: "macos",
    name: "macOS App",
    badge: ".ZIP",
    fileName: "GuruMusic-macOS.zip",
    fileSize: "109 KB",
    downloadHref: "/downlaod/GuruMusic-macOS.zip",
    supportedVersions: [
      "macOS 11 Big Sur & macOS 12 Monterey",
      "macOS 13 Ventura & macOS 14 Sonoma",
      "macOS 15 Sequoia+ (Apple Silicon M1–M4 & Intel)",
    ],
    requirements:
      "macOS 11+ • Lightweight GuruMusic.app bundle using Chrome/Edge/Brave app mode or Safari fallback.",
    installSteps: [
      "Download GuruMusic-macOS.zip.",
      "Double-click the zip to extract GuruMusic.app.",
      "Move GuruMusic.app to Applications and open it.",
    ],
    accentClass: "text-purple-400 bg-purple-500/15 border-purple-500/30",
    icon: Apple,
  },
];

export default function DownloadsCenterPage() {
  const [selected, setSelected] = useState<CategoryId>("all");

  const visiblePackages =
    selected === "all" ? PACKAGES : PACKAGES.filter((p) => p.id === selected);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="gm-surface gm-rainbow-border rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
            <Laptop className="h-4 w-4" />
            <span>Official Guru Music Apps</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Download Guru Music
          </h1>
          <p className="text-sm text-[var(--gm-text-muted)]">
            Ultra-lightweight apps for Android, Windows, Linux, and macOS. All songs stream live from Guru Music — zero bloated storage.
          </p>
        </div>
        <div className="shrink-0">
          <BrandLogo variant="compact" />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "all", label: "All Platforms (4)" },
            { id: "android", label: "Android (.apk)" },
            { id: "windows", label: "Windows (.exe)" },
            { id: "linux", label: "Linux (.tar.gz)" },
            { id: "macos", label: "macOS (.zip)" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelected(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              selected === tab.id
                ? "gm-rainbow-gradient text-white shadow-md shadow-purple-500/20"
                : "gm-surface text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visiblePackages.map((pkg) => {
          const Icon = pkg.icon;
          return (
            <div
              key={pkg.id}
              className="gm-surface rounded-3xl p-6 flex flex-col justify-between gap-5 border border-[var(--gm-border)]"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0 ${pkg.accentClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-black tracking-tight">{pkg.name}</h2>
                      <p className="text-xs text-[var(--gm-text-muted)] truncate">
                        {pkg.fileName} • {pkg.fileSize}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${pkg.accentClass}`}>
                    {pkg.badge}
                  </span>
                </div>

                <p className="text-xs text-[var(--gm-text-muted)] leading-relaxed">
                  {pkg.requirements}
                </p>

                <div className="rounded-2xl bg-black/25 border border-[var(--gm-border)] p-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--gm-text-muted)]">
                    Supported Versions
                  </p>
                  <ul className="space-y-1.5 text-xs">
                    {pkg.supportedVersions.map((ver) => (
                      <li key={ver} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{ver}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--gm-text-muted)]">
                    Quick Install
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 text-xs text-[var(--gm-text-muted)]">
                    {pkg.installSteps.map((stepText) => (
                      <li key={stepText}>{stepText}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <a
                href={pkg.downloadHref}
                download={pkg.fileName}
                className="w-full py-3 px-4 rounded-2xl gm-rainbow-gradient text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:opacity-95 transition-opacity"
              >
                <Download className="h-4 w-4" />
                <span>
                  Download {pkg.name} ({pkg.fileSize})
                </span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
