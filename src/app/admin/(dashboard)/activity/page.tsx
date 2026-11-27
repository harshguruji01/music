"use client";

import React, { useEffect, useState } from "react";
import type { AdminActivityLog } from "@/types/music";
import { fetchAdminLogsClient } from "@/lib/admin-api";

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [status, setStatus] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    let active = true;
    fetchAdminLogsClient(status || undefined, actionFilter || undefined).then((d) => {
      if (active) setLogs(d);
    });
    return () => {
      active = false;
    };
  }, [status, actionFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Admin Audit & Activity Logs</h1>
        <p className="text-sm text-slate-400 mt-1">
          Immutable log of login attempts, uploads, deletions, publishing changes, and settings updates. Secrets are never logged.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input type="search" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="Filter by action (e.g. login, upload, delete)..." className="px-3.5 py-2 rounded-xl gm-surface text-xs w-64" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3.5 py-2 rounded-xl gm-surface text-xs">
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      <div className="gm-surface rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Admin</th>
              <th className="p-3.5">Resource</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="p-3.5 text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                <td className="p-3.5 font-mono text-white">{log.action}</td>
                <td className="p-3.5 text-slate-300">{log.admin_email || "—"}</td>
                <td className="p-3.5 text-slate-400">{log.resource_type || "—"}</td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${log.status === "success" ? "bg-emerald-500/15 text-emerald-300" : log.status === "blocked" ? "bg-rose-500/15 text-rose-300" : "bg-amber-500/15 text-amber-300"}`}>
                    {log.status}
                  </span>
                </td>
                <td className="p-3.5 font-mono text-[11px] text-slate-400 max-w-xs truncate">{JSON.stringify(log.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
