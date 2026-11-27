"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Download, Headphones, Music } from "lucide-react";
import { fetchCreatorSongsClient } from "@/lib/creator-api";
import type { Track } from "@/types/music";

export default function StudioAnalyticsPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreatorSongsClient()
      .then((res) => setTracks(res.tracks))
      .finally(() => setLoading(false));
  }, []);

  const totalPlays = tracks.reduce((a, b) => a + Number(b.play_count || 0), 0);
  const totalDownloads = tracks.reduce((a, b) => a + Number(b.download_count || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
          <BarChart3 className="h-7 w-7 text-purple-400" />
          Creator Analytics
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Stream performance and download insights across your catalog.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="gm-surface rounded-2xl p-5">
          <p className="text-xs text-slate-400">Tracks Uploaded</p>
          <p className="text-2xl font-black mt-1 flex items-center gap-2">
            <Music className="h-5 w-5 text-blue-400" />
            {tracks.length}
          </p>
        </div>
        <div className="gm-surface rounded-2xl p-5">
          <p className="text-xs text-slate-400">Total Plays</p>
          <p className="text-2xl font-black mt-1 flex items-center gap-2">
            <Headphones className="h-5 w-5 text-emerald-400" />
            {totalPlays.toLocaleString()}
          </p>
        </div>
        <div className="gm-surface rounded-2xl p-5">
          <p className="text-xs text-slate-400">Authorized Downloads</p>
          <p className="text-2xl font-black mt-1 flex items-center gap-2">
            <Download className="h-5 w-5 text-amber-400" />
            {totalDownloads.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="gm-surface rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-bold">Track Performance</h2>
        {loading ? (
          <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
        ) : tracks.length === 0 ? (
          <p className="text-xs text-slate-400">No analytics data yet.</p>
        ) : (
          <div className="space-y-2">
            {[...tracks]
              .sort((a, b) => b.play_count - a.play_count)
              .map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold truncate">{t.title}</span>
                  <span className="text-slate-300 tabular-nums">
                    {t.play_count} plays • {t.download_count} downloads
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
