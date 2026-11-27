"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, CheckSquare, Play, RotateCcw, XCircle } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import {
  fetchAdminSubmissionsClient,
  getAdminTrackPreviewUrlClient,
  moderateSongViaGatewayClient,
} from "@/lib/admin-api";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { SongStatus, SongSubmission } from "@/types/music";

export default function AdminSubmissionsPage() {
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState<SongSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState("PENDING_REVIEW");
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = async (filter = statusFilter) => {
    try {
      const list = await fetchAdminSubmissionsClient(filter);
      setSubmissions(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchAdminSubmissionsClient(statusFilter)
      .then((list) => {
        if (active) setSubmissions(list);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const handleModerate = async (
    trackId: string,
    newStatus: Exclude<SongStatus, "PENDING_REVIEW">
  ) => {
    setBusyId(trackId);
    try {
      await moderateSongViaGatewayClient({
        trackId,
        newStatus,
        reason: reasonMap[trackId] || undefined,
      });
      showToast(`Song transitioned to ${newStatus}.`, "success");
      await load(statusFilter);
    } catch (err) {
      showToast(normalizeErrorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            <CheckSquare className="h-7 w-7 text-purple-400" />
            Song Moderation & Approval
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review submitted tracks before promoting audio from private storage into <code>published-audio</code>.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value);
          }}
          className="px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-semibold"
        >
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="CHANGES_REQUESTED">Changes Requested</option>
          <option value="APPROVED">Approved</option>
          <option value="PUBLISHED">Published</option>
          <option value="REJECTED">Rejected</option>
          <option value="ARCHIVED">Archived</option>
          <option value="all">All Submissions</option>
        </select>
      </div>

      {previewUrl && (
        <div className="gm-surface rounded-2xl p-4 border border-purple-500/30">
          <audio controls autoPlay src={previewUrl} className="w-full" />
        </div>
      )}

      {loading ? (
        <div className="h-40 rounded-2xl gm-surface animate-pulse" />
      ) : submissions.length === 0 ? (
        <div className="gm-surface rounded-2xl p-8 text-center text-sm text-slate-400">
          No submissions matching status <strong>{statusFilter}</strong>.
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => {
            const track = sub.track;
            if (!track) return null;
            const busy = busyId === track.id;
            return (
              <div key={sub.id} className="gm-surface rounded-2xl p-5 space-y-3 border border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold">{track.title}</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-bold">
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Creator: {sub.creator ? `${sub.creator.stage_name} (@${sub.creator.username})` : "Admin"} • Submitted{" "}
                      {formatDate(sub.submitted_at)}
                    </p>
                    {sub.submission_notes && (
                      <p className="text-xs text-slate-300 mt-1">Creator notes: {sub.submission_notes}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      const url = await getAdminTrackPreviewUrlClient(track);
                      if (url) setPreviewUrl(url);
                      else showToast("Preview unavailable.", "error");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Play className="h-3.5 w-3.5" /> Listen
                  </button>
                </div>

                <input
                  type="text"
                  value={reasonMap[track.id] || ""}
                  onChange={(e) => setReasonMap((prev) => ({ ...prev, [track.id]: e.target.value }))}
                  placeholder="Optional moderation note / rejection reason..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleModerate(track.id, "PUBLISHED")}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Publish
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleModerate(track.id, "APPROVED")}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-60"
                  >
                    Approve Only
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleModerate(track.id, "CHANGES_REQUESTED")}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Request Changes
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleModerate(track.id, "REJECTED")}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
