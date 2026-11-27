"use client";

import React, { useCallback, useEffect, useState } from "react";
import { HardDrive, Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { cleanupOrphanStorageClient, fetchAdminStorageClient } from "@/lib/admin-api";

interface BucketStat {
  id: string;
  label: string;
  visibility: string;
  fileCount: number;
  totalBytes: number;
}

export default function AdminStoragePage() {
  const [buckets, setBuckets] = useState<BucketStat[]>([]);
  const [cleanupMsg, setCleanupMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBuckets(await fetchAdminStorageClient());
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminStorageClient().then((b) => {
      if (active) setBuckets(b);
    });
    return () => {
      active = false;
    };
  }, []);

  const runCleanup = async () => {
    const removedCount = await cleanupOrphanStorageClient();
    setCleanupMsg(`Cleaned up ${removedCount} orphaned storage objects.`);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Storage Architecture</h1>
          <p className="text-sm text-slate-400 mt-1">
            Inspect all 6 Supabase Storage buckets. Draft audio stays strictly private.
          </p>
        </div>
        <button type="button" onClick={runCleanup} className="px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5">
          <Trash2 className="h-3.5 w-3.5" /> Clean Orphaned Files
        </button>
      </div>

      {cleanupMsg && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-200">{cleanupMsg}</div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {buckets.map((b) => (
          <div key={b.id} className="gm-surface rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-blue-400" />
                <span className="font-bold text-sm">{b.label}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.visibility.includes("Private") ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                {b.visibility}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">{b.id}</p>
            <div className="flex justify-between text-xs pt-2 border-t border-white/10">
              <span>{b.fileCount} files</span>
              <span className="font-semibold">{formatBytes(b.totalBytes)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
