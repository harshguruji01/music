"use client";

import React, { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { formatCount } from "@/lib/format";
import { fetchAdminOverviewClient } from "@/lib/admin-api";

interface StatsPayload {
  stats: {
    totalSongs: number;
    publishedSongs: number;
    totalPlays: number;
    totalDownloads: number;
  };
  genreBreakdown: Array<{ name: string; color: string; count: number }>;
  topTracks: Array<{ id: string; title: string; play_count: number; download_count: number }>;
}

export default function AdminStatisticsPage() {
  const [data, setData] = useState<StatsPayload | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminOverviewClient().then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Platform Statistics</h1>
        <p className="text-sm text-slate-400 mt-1">
          Genuine play events, download metrics, and catalog breakdown from PostgreSQL.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gm-surface rounded-2xl p-5">
          <p className="text-xs text-slate-400">Total Plays</p>
          <p className="text-3xl font-black mt-1">{formatCount(data?.stats.totalPlays)}</p>
        </div>
        <div className="gm-surface rounded-2xl p-5">
          <p className="text-xs text-slate-400">Total Downloads</p>
          <p className="text-3xl font-black mt-1">{formatCount(data?.stats.totalDownloads)}</p>
        </div>
        <div className="gm-surface rounded-2xl p-5">
          <p className="text-xs text-slate-400">Published Catalog</p>
          <p className="text-3xl font-black mt-1">{data?.stats.publishedSongs ?? 0}</p>
        </div>
        <div className="gm-surface rounded-2xl p-5">
          <p className="text-xs text-slate-400">Total Uploaded</p>
          <p className="text-3xl font-black mt-1">{data?.stats.totalSongs ?? 0}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="gm-surface rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-400" />
            Top Played Tracks
          </h2>
          {(data?.topTracks || []).length === 0 ? (
            <p className="text-xs text-slate-400">No playback data yet.</p>
          ) : (
            <div className="space-y-3">
              {data?.topTracks.map((t, i) => (
                <div key={t.id} className="flex items-center justify-between text-xs">
                  <span className="font-semibold truncate">{i + 1}. {t.title}</span>
                  <span className="text-slate-400 tabular-nums">{t.play_count} plays • {t.download_count} dl</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="gm-surface rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold">Tracks by Genre</h2>
          {(data?.genreBreakdown || []).length === 0 ? (
            <p className="text-xs text-slate-400">No categorized tracks yet.</p>
          ) : (
            <div className="space-y-3">
              {data?.genreBreakdown.map((g) => (
                <div key={g.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{g.name}</span>
                    <span className="font-semibold">{g.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: g.color,
                        width: `${Math.min(100, (g.count / Math.max(1, data.stats.totalSongs)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
