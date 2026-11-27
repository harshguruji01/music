"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import type { Track } from "@/types/music";
import {
  fetchAdminTracksClient,
  saveSiteSettingsClient,
  updateAdminTrackClient,
} from "@/lib/admin-api";
import { getSiteSettingsClient } from "@/lib/public-api";

export default function AdminDownloadsPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [policy, setPolicy] = useState<"track_level" | "disabled">("track_level");

  const load = useCallback(async () => {
    const [tRes, s] = await Promise.all([
      fetchAdminTracksClient({ pageSize: 50 }),
      getSiteSettingsClient(),
    ]);
    setTracks(tRes.tracks);
    setPolicy(s.public_download_policy);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAdminTracksClient({ pageSize: 50 }), getSiteSettingsClient()]).then(
      ([tRes, s]) => {
        if (!active) return;
        setTracks(tRes.tracks);
        setPolicy(s.public_download_policy);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  const updatePolicy = async (next: "track_level" | "disabled") => {
    setPolicy(next);
    await saveSiteSettingsClient({ public_download_policy: next });
  };

  const toggleTrackDownload = async (track: Track) => {
    await updateAdminTrackClient(track.id, { is_downloadable: !track.is_downloadable });
    await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Download Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Only published, explicitly authorized tracks can be downloaded on Guru Music.
        </p>
      </div>

      <div className="gm-surface rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Global Public Download Policy</p>
            <p className="text-xs text-slate-400">Override all track-level permissions immediately if needed.</p>
          </div>
        </div>
        <select
          value={policy}
          onChange={(e) => updatePolicy(e.target.value as "track_level" | "disabled")}
          className="px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-semibold"
        >
          <option value="track_level">Track-Level Permissions</option>
          <option value="disabled">Disable All Public Downloads</option>
        </select>
      </div>

      <div className="gm-surface rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="p-3.5">Track</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Downloads Count</th>
              <th className="p-3.5">Permission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tracks.map((t) => (
              <tr key={t.id}>
                <td className="p-3.5 font-semibold">{t.title}</td>
                <td className="p-3.5">{t.is_published ? "Published" : "Draft"}</td>
                <td className="p-3.5 tabular-nums">{t.download_count}</td>
                <td className="p-3.5">
                  <button
                    type="button"
                    onClick={() => toggleTrackDownload(t)}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 ${
                      t.is_downloadable ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-slate-400"
                    }`}
                  >
                    <Download className="h-3 w-3" />
                    {t.is_downloadable ? "Allowed" : "Restricted"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
