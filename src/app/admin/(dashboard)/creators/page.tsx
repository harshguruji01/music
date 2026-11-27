"use client";

import React, { useEffect, useState } from "react";
import { BadgeCheck, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import {
  fetchAdminCreatorVerificationsClient,
  reviewCreatorVerificationClient,
} from "@/lib/admin-api";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { CreatorCredential } from "@/types/music";

export default function AdminCreatorsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<CreatorCredential[]>([]);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setItems(await fetchAdminCreatorVerificationsClient());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchAdminCreatorVerificationsClient()
      .then((list) => {
        if (active) setItems(list);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
          <BadgeCheck className="h-7 w-7 text-emerald-400" />
          Creator Verification Queue
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Verify independent creator accounts and review submitted ownership credentials.
        </p>
      </div>

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
    </div>
  );
}
