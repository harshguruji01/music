"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Disc3,
  Download,
  FileAudio,
  HardDrive,
  ListMusic,
  Music,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";
import { formatBytes, formatCount, formatDate } from "@/lib/format";
import { fetchAdminOverviewClient } from "@/lib/admin-api";
import type { AdminActivityLog } from "@/types/music";

interface OverviewData {
  stats: {
    totalSongs: number;
    publishedSongs: number;
    draftSongs: number;
    totalArtists: number;
    totalAlbums: number;
    totalPlaylists: number;
    totalGenres: number;
    eligibleDownloads: number;
    totalPlays: number;
    totalDownloads: number;
    totalStorageBytes: number;
  };
  activitySeries: Array<{ date: string; plays: number; downloads: number; uploads: number }>;
  recentTracks: Array<{ id: string; title: string; is_published: boolean; play_count: number; created_at: string }>;
  recentLogs: AdminActivityLog[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAdminOverviewClient()
      .then((d) => {
        if (active) setData(d);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-9 w-64 rounded-xl bg-white/10" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const s = data?.stats;
  const cards = [
    { label: "Total Songs", value: s?.totalSongs ?? 0, icon: Music, color: "text-blue-400" },
    { label: "Published Songs", value: s?.publishedSongs ?? 0, icon: Play, color: "text-emerald-400" },
    { label: "Draft Songs", value: s?.draftSongs ?? 0, icon: FileAudio, color: "text-amber-400" },
    { label: "Total Artists", value: s?.totalArtists ?? 0, icon: Users, color: "text-purple-400" },
    { label: "Total Albums", value: s?.totalAlbums ?? 0, icon: Disc3, color: "text-pink-400" },
    { label: "Total Playlists", value: s?.totalPlaylists ?? 0, icon: ListMusic, color: "text-cyan-400" },
    { label: "Eligible Downloads", value: s?.eligibleDownloads ?? 0, icon: Download, color: "text-teal-400" },
    {
      label: "Storage Used",
      value: formatBytes(s?.totalStorageBytes ?? 0),
      icon: HardDrive,
      color: "text-orange-400",
    },
  ];

  const maxActivity = Math.max(
    1,
    ...(data?.activitySeries || []).map((d) => Math.max(d.plays, d.downloads, d.uploads))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Live database metrics, upload activity, and audit telemetry for Guru Music.
          </p>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 inline-flex items-center gap-1.5 font-semibold text-xs">
          <ShieldCheck className="h-3.5 w-3.5" />
          PostgreSQL RLS Guard Active
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="gm-surface rounded-2xl p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{c.label}</span>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <p className="text-2xl sm:text-3xl font-black">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div className="gm-surface rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">14-Day Platform Activity</h2>
              <p className="text-xs text-slate-400">Real plays, downloads, and uploads</p>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-blue-400">● Plays ({formatCount(s?.totalPlays)})</span>
              <span className="text-emerald-400">● Downloads ({formatCount(s?.totalDownloads)})</span>
              <span className="text-amber-400">● Uploads</span>
            </div>
          </div>

          <div className="h-44 flex items-end gap-2 pt-4">
            {(data?.activitySeries || []).map((day) => {
              const pH = Math.round((day.plays / maxActivity) * 100);
              const dH = Math.round((day.downloads / maxActivity) * 100);
              const uH = Math.round((day.uploads / maxActivity) * 100);
              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.plays} plays, ${day.downloads} downloads, ${day.uploads} uploads`}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                >
                  <div className="w-full flex items-end justify-center gap-0.5 h-32">
                    <div className="w-1.5 rounded-t bg-blue-500/80 min-h-[2px]" style={{ height: `${Math.max(3, pH)}%` }} />
                    <div className="w-1.5 rounded-t bg-emerald-500/80 min-h-[2px]" style={{ height: `${Math.max(3, dH)}%` }} />
                    <div className="w-1.5 rounded-t bg-amber-500/80 min-h-[2px]" style={{ height: `${Math.max(3, uH)}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-500 hidden sm:block">{day.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="gm-surface rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold">Recent Tracks</h2>
          {(data?.recentTracks || []).length === 0 ? (
            <p className="text-xs text-slate-400">
              No tracks uploaded yet.{" "}
              <Link href="/admin/upload/" className="text-purple-400 underline">
                Upload your first track
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-2.5">
              {(data?.recentTracks || []).map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{t.title}</p>
                    <p className="text-[11px] text-slate-400">{formatDate(t.created_at)}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      t.is_published ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {t.is_published ? "Published" : "Draft"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="gm-surface rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Activity className="h-4 w-4 text-purple-400" />
            Recent Administrative Actions
          </h2>
          <Link href="/admin/activity/" className="text-xs text-purple-400 hover:underline">
            View full audit log
          </Link>
        </div>

        {(data?.recentLogs || []).length === 0 ? (
          <p className="text-xs text-slate-400">No administrative actions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-white/10">
                  <th className="pb-2 font-semibold">Action</th>
                  <th className="pb-2 font-semibold">Admin</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(data?.recentLogs || []).slice(0, 8).map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 font-mono text-slate-200">{log.action}</td>
                    <td className="py-2.5 text-slate-400">{log.admin_email || "—"}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          log.status === "success"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : log.status === "blocked"
                              ? "bg-rose-500/15 text-rose-300"
                              : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
