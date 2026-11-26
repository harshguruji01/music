"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Sparkles } from "lucide-react";
import type { HomepageSectionConfig, SiteSettings, Track } from "@/types/music";

export default function AdminFeaturedPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sections, setSections] = useState<HomepageSectionConfig[]>([]);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/admin/tracks?pageSize=50").then((r) => r.json()),
      fetch("/api/admin/settings").then((r) => r.json()),
    ]).then(([tRes, sRes]) => {
      setTracks(tRes.tracks || []);
      const s = sRes.settings as SiteSettings | undefined;
      if (s?.homepage_sections) setSections(s.homepage_sections);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFeatured = async (track: Track) => {
    await fetch(`/api/admin/tracks/${track.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_featured: !track.is_featured }),
    });
    load();
  };

  const moveSection = (idx: number, delta: number) => {
    const next = idx + delta;
    if (next < 0 || next >= sections.length) return;
    const copy = [...sections];
    const [item] = copy.splice(idx, 1);
    copy.splice(next, 0, item);
    setSections(copy);
  };

  const saveOrder = async () => {
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homepage_sections: sections,
        homepage_order: sections.map((s) => s.key),
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Featured Music & Homepage Ordering</h1>
        <p className="text-sm text-slate-400 mt-1">
          Control featured spotlights and the exact section order rendered on the public homepage.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="gm-surface rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Homepage Section Order</h2>
            <button
              type="button"
              onClick={saveOrder}
              className="px-4 py-1.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold"
            >
              {saved ? "Saved!" : "Save Layout"}
            </button>
          </div>
          <div className="space-y-2 max-h-[460px] overflow-y-auto gm-scrollbar">
            {sections.map((sec, idx) => (
              <div
                key={sec.key}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/30 border border-white/5 text-xs"
              >
                <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sec.enabled}
                    onChange={() =>
                      setSections((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, enabled: !s.enabled } : s))
                      )
                    }
                    className="accent-purple-500"
                  />
                  <span className="font-semibold">{sec.label}</span>
                </label>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveSection(idx, -1)} className="p-1 hover:bg-white/10 rounded">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => moveSection(idx, 1)} className="p-1 hover:bg-white/10 rounded">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="gm-surface rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold">Featured Tracks</h2>
          <div className="space-y-2 max-h-[460px] overflow-y-auto gm-scrollbar">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/30 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">{track.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {track.is_published ? "Published" : "Draft"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFeatured(track)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                    track.is_featured
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-white/10 text-slate-400"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  {track.is_featured ? "Featured" : "Feature"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
