"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Play, Send, Upload } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import {
  fetchCreatorSongsClient,
  getAuthorizedStreamUrlClient,
  submitSongForReviewClient,
} from "@/lib/creator-api";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatDate, formatDuration } from "@/lib/format";
import type { Track } from "@/types/music";

export default function StudioMySongsPage() {
  const { showToast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const load = async () => {
    try {
      const res = await fetchCreatorSongsClient();
      setTracks(res.tracks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchCreatorSongsClient()
      .then((res) => {
        if (active) setTracks(res.tracks);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmitReview = async (trackId: string) => {
    try {
      await submitSongForReviewClient(trackId);
      showToast("Submitted for moderation review.", "success");
      await load();
    } catch (err) {
      showToast(normalizeErrorMessage(err), "error");
    }
  };

  const handlePreview = async (track: Track) => {
    const url = await getAuthorizedStreamUrlClient(track.id);
    if (!url) {
      showToast("Unable to generate authorized stream URL.", "error");
      return;
    }
    setPreviewUrl(url);
    setPreviewTitle(track.title);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">My Songs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track status transitions: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED.
          </p>
        </div>
        <Link
          href="/studio/upload/"
          className="px-4 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" /> Upload Song
        </Link>
      </div>

      {previewUrl && (
        <div className="gm-surface rounded-2xl p-4 space-y-2 border border-purple-500/30">
          <p className="text-xs font-semibold text-purple-300">
            Authorized Private Preview: {previewTitle}
          </p>
          <audio controls autoPlay src={previewUrl} className="w-full" />
        </div>
      )}

      {loading ? (
        <div className="h-40 rounded-2xl gm-surface animate-pulse" />
      ) : tracks.length === 0 ? (
        <div className="gm-surface rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm font-semibold">No songs uploaded yet.</p>
          <Link
            href="/studio/upload/"
            className="inline-block px-5 py-2 rounded-full gm-rainbow-gradient text-white text-xs font-bold"
          >
            Upload Your First Song
          </Link>
        </div>
      ) : (
        <div className="gm-surface rounded-2xl overflow-hidden divide-y divide-white/10">
          {tracks.map((track) => (
            <div key={track.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{track.title}</p>
                <p className="text-xs text-slate-400">
                  {track.genre?.name || "Uncategorized"} • {formatDuration(track.duration_seconds)} •{" "}
                  {formatDate(track.created_at)}
                </p>
                {track.rejection_reason && (
                  <p className="text-xs text-amber-300 mt-1">Note: {track.rejection_reason}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-bold">
                  {track.status || (track.is_published ? "PUBLISHED" : "DRAFT")}
                </span>
                <button
                  type="button"
                  onClick={() => handlePreview(track)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Play className="h-3.5 w-3.5" /> Preview
                </button>
                {(track.status === "DRAFT" || track.status === "CHANGES_REQUESTED") && (
                  <button
                    type="button"
                    onClick={() => handleSubmitReview(track.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Send className="h-3.5 w-3.5" /> Submit
                  </button>
                )}
                <Link
                  href={`/studio/songs/view/?id=${encodeURIComponent(track.id)}`}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" /> Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
