"use client";

import React, { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { fetchAdminModerationLogsClient } from "@/lib/admin-api";
import { formatDate } from "@/lib/format";
import type { ModerationLog } from "@/types/music";

export default function AdminModerationLogsPage() {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminModerationLogsClient()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
          <Shield className="h-7 w-7 text-amber-400" />
          Moderation Audit Logs
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Immutable log of every track approval, rejection, change request, and status transition.
        </p>
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl gm-surface animate-pulse" />
      ) : logs.length === 0 ? (
        <div className="gm-surface rounded-2xl p-8 text-center text-sm text-slate-400">
          No moderation events recorded yet.
        </div>
      ) : (
        <div className="gm-surface rounded-2xl divide-y divide-white/10 overflow-hidden">
          {logs.map((log) => (
            <div key={log.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold">
                  {log.action}{" "}
                  <span className="text-slate-400 font-normal">
                    ({log.previous_status || "?"} → {log.new_status})
                  </span>
                </p>
                <p className="text-slate-400 mt-0.5">
                  Admin: {log.admin_email} • {formatDate(log.created_at)}
                </p>
                {log.reason && <p className="text-amber-300 mt-1">Reason: {log.reason}</p>}
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white/10 font-bold">{log.new_status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
