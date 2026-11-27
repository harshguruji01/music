"use client";

import React, { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import {
  fetchAdminMusicUsersClient,
  toggleAdminMusicUserActiveClient,
} from "@/lib/admin-api";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { MusicLoginLog, MusicUser } from "@/types/music";

export default function AdminMusicUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<MusicUser[]>([]);
  const [logs, setLogs] = useState<MusicLoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetchAdminMusicUsersClient();
      setUsers(res.users);
      setLogs(res.loginLogs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchAdminMusicUsersClient()
      .then((res) => {
        if (!active) return;
        setUsers(res.users);
        setLogs(res.loginLogs);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
          <UserCog className="h-7 w-7 text-blue-400" />
          Guru Music Users
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Dedicated Guru Music accounts (<code>music_users</code>) and login history (<code>music_login_logs</code>).
        </p>
      </div>

      {loading ? (
        <div className="h-36 rounded-2xl gm-surface animate-pulse" />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="gm-surface rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-bold">Registered Music Users ({users.length})</h2>
            <div className="space-y-2 max-h-[460px] overflow-y-auto gm-scrollbar">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold truncate">{u.display_name || u.email}</p>
                    <p className="text-slate-400 truncate">
                      {u.email} • {u.auth_provider} • {u.login_count} logins
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await toggleAdminMusicUserActiveClient(u.id, !u.is_active);
                        showToast(u.is_active ? "User suspended." : "User activated.", "success");
                        await load();
                      } catch (err) {
                        showToast(normalizeErrorMessage(err), "error");
                      }
                    }}
                    className={`px-3 py-1 rounded-lg font-bold shrink-0 ${
                      u.is_active
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {u.is_active ? "Active" : "Suspended"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="gm-surface rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-bold">Recent Music Login Events</h2>
            <div className="space-y-2 max-h-[460px] overflow-y-auto gm-scrollbar">
              {logs.map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold">{l.email}</p>
                    <p className="text-slate-400">
                      {l.event_type} ({l.auth_method}) • {formatDate(l.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
