"use client";

import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  Ban,
  CheckCircle2,
  PauseCircle,
  RotateCcw,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import {
  deleteAdminCreatorClient,
  fetchAdminCreatorsDirectoryClient,
  fetchAdminCreatorVerificationsClient,
  reviewCreatorVerificationClient,
  setAdminCreatorStatusClient,
} from "@/lib/admin-api";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { Creator, CreatorCredential } from "@/types/music";

export default function AdminCreatorsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<CreatorCredential[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [search, setSearch] = useState("");
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [creds, dir] = await Promise.all([
        fetchAdminCreatorVerificationsClient(),
        fetchAdminCreatorsDirectoryClient(),
      ]);
      setItems(creds);
      setCreators(dir);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchAdminCreatorVerificationsClient(),
      fetchAdminCreatorsDirectoryClient(),
    ])
      .then(([creds, dir]) => {
        if (!active) return;
        setItems(creds);
        setCreators(dir);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDecision = async (
    cred: CreatorCredential,
    decision: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"
  ) => {
    try {
      await reviewCreatorVerificationClient({
        credentialId: cred.id,
        creatorId: cred.creator_id,
        decision,
        notes: notesMap[cred.id],
      });
      showToast(`Creator verification ${decision}.`, "success");
      await load();
    } catch (err) {
      showToast(normalizeErrorMessage(err), "error");
    }
  };

  const handleCreatorAction = async (
    creator: Creator,
    action: "suspend" | "ban" | "restore" | "delete"
  ) => {
    if (
      action === "delete" &&
      typeof window !== "undefined" &&
      !window.confirm(`Permanently delete creator @${creator.username}? This cannot be undone.`)
    ) {
      return;
    }

    setBusyId(creator.id);
    try {
      if (action === "delete") {
        await deleteAdminCreatorClient(creator.id);
        showToast(`Deleted creator @${creator.username}.`, "info");
      } else if (action === "suspend") {
        await setAdminCreatorStatusClient({
          creatorId: creator.id,
          nextStatus: "suspended",
          actionLabel: "suspend",
        });
        showToast(`Suspended @${creator.username}.`, "info");
      } else if (action === "ban") {
        await setAdminCreatorStatusClient({
          creatorId: creator.id,
          nextStatus: "rejected",
          actionLabel: "ban",
        });
        showToast(`Banned @${creator.username}.`, "info");
      } else {
        await setAdminCreatorStatusClient({
          creatorId: creator.id,
          nextStatus: "verified",
          actionLabel: "restore",
        });
        showToast(`Restored @${creator.username}.`, "success");
      }
      await load();
    } catch (err) {
      showToast(normalizeErrorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  };

  const filteredCreators = creators.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.username.toLowerCase().includes(q) ||
      c.stage_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
          <BadgeCheck className="h-7 w-7 text-emerald-400" />
          Creators & Verification Control
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Verify creator applications, or suspend, ban, restore, and delete creator publishing accounts.
        </p>
      </div>

      {/* Registered Creators Directory */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            All Creator Accounts ({creators.length})
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search @username or stage name..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="h-32 rounded-2xl gm-surface animate-pulse" />
        ) : filteredCreators.length === 0 ? (
          <div className="gm-surface rounded-2xl p-6 text-center text-sm text-slate-400">
            No creator accounts found.
          </div>
        ) : (
          <div className="gm-surface rounded-2xl divide-y divide-white/10 overflow-hidden">
            {filteredCreators.map((c) => {
              const statusLabel =
                c.verification_status === "rejected" ? "BANNED" : c.verification_status.toUpperCase();
              const isBlocked =
                c.verification_status === "suspended" || c.verification_status === "rejected";
              return (
                <div
                  key={c.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">
                      {c.stage_name}{" "}
                      <span className="text-xs text-slate-400 font-normal">@{c.username}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {c.primary_genre || "Music"} • {c.country || "Global"} • Joined{" "}
                      {formatDate(c.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        c.verification_status === "rejected"
                          ? "bg-rose-500/20 text-rose-300"
                          : c.verification_status === "suspended"
                            ? "bg-amber-500/20 text-amber-300"
                            : c.verification_status === "verified"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/10 text-slate-200"
                      }`}
                    >
                      {statusLabel}
                    </span>

                    {isBlocked ? (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => handleCreatorAction(c, "restore")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Restore
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => handleCreatorAction(c, "suspend")}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <PauseCircle className="h-3.5 w-3.5" /> Suspend
                        </button>
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => handleCreatorAction(c, "ban")}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" /> Ban
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => handleCreatorAction(c, "delete")}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-rose-300 text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Verification Queue */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold">Creator Verification Queue</h2>
        {loading ? (
          <div className="h-36 rounded-2xl gm-surface animate-pulse" />
        ) : items.length === 0 ? (
          <div className="gm-surface rounded-2xl p-8 text-center text-sm text-slate-400">
            No creator verification requests submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((cred) => (
              <div key={cred.id} className="gm-surface rounded-2xl p-5 space-y-3 border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm">
                      {cred.creator?.stage_name || cred.legal_name}{" "}
                      {cred.creator?.username && (
                        <span className="text-xs text-slate-400">@{cred.creator.username}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      Legal Name: {cred.legal_name} • {cred.id_document_type} • {formatDate(cred.created_at)}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-bold">
                    {cred.status}
                  </span>
                </div>

                <input
                  type="text"
                  value={notesMap[cred.id] || ""}
                  onChange={(e) => setNotesMap((prev) => ({ ...prev, [cred.id]: e.target.value }))}
                  placeholder="Reviewer notes..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecision(cred, "APPROVED")}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve Creator
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(cred, "CHANGES_REQUESTED")}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Request Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(cred, "REJECTED")}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
