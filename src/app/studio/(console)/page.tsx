"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Clock, Headphones, Music, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchCreatorSongsClient } from "@/lib/creator-api";
import { formatDate } from "@/lib/format";
import type { SongSubmission, Track } from "@/types/music";

export default function StudioDashboardPage() {
  const { creator } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [submissions, setSubmissions] = useState<SongSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreatorSongsClient()
      .then((res) => {
        setTracks(res.tracks);
        setSubmissions(res.submissions);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPlays = tracks.reduce((a, b) => a + Number(b.play_count || 0), 0);
  const publishedCount = tracks.filter((t) => t.status === "PUBLISHED").length;
  const pendingCount = tracks.filter((t) => t.status === "PENDING_REVIEW").length;
  const rejectedCount = tracks.filter((t) => t.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Creator Studio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage releases, verification status, and listener analytics for{" "}
            <span className="text-white font-semibold">{creator?.stage_name}</span>.
          </p>
        </div>

        <Link
          href="/studio/upload/"
          className="px-4 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          New Release
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gm-surface rounded-2xl p-4">
          <p className="text-xs text-slate-400">Verification</p>
          <p className="text-lg font-black mt-1 inline-flex items-center gap-1.5 capitalize">
            <BadgeCheck
              className={`h-5 w-5 ${
                creator?.is_verified ? "text-emerald-400" : "text-amber-400"
              }`}
            />
            {creator?.verification_status || "unverified"}
          </p>
        </div>

        <div className="gm-surface rounded-2xl p-4">
          <p className="text-xs text-slate-400">Total Songs</p>
          <p className="text-2xl font-black mt-1 flex items-center gap-2">
            <Music className="h-5 w-5 text-blue-400" />
            {tracks.length}
          </p>
        </div>

        <div className="gm-surface rounded-2xl p-4">
          <p className="text-xs text-slate-400">Published / Pending / Rejected</p>
          <p className="text-2xl font-black mt-1 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            {publishedCount} / {pendingCount} / {rejectedCount}
          </p>
        </div>

        <div className="gm-surface rounded-2xl p-4">
          <p className="text-xs text-slate-400">Total Streams</p>
          <p className="text-2xl font-black mt-1 flex items-center gap-2">
            <Headphones className="h-5 w-5 text-emerald-400" />
            {totalPlays.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="gm-surface rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Recent Submissions</h2>
          <Link href="/studio/songs/" className="text-xs text-purple-400 hover:underline">
            View all songs
          </Link>
        </div>

        {loading ? (
          <div className="h-24 rounded-xl bg-white/5 animate-pulse" />
        ) : submissions.length === 0 ? (
          <p className="text-xs text-slate-400">
            No submissions yet. Upload your first track to enter the review pipeline.
          </p>
        ) : (
          <div className="space-y-2">
            {submissions.slice(0, 6).map((sub) => (
              <Link
                key={sub.id}
                href={`/studio/songs/view/?id=${encodeURIComponent(sub.track_id)}`}
                className="flex items-center justify-between p-3 rounded-xl bg-black/30 hover:bg-white/5 border border-white/10 text-xs"
              >
                <div>
                  <p className="font-semibold">Submission #{sub.id.slice(0, 8)}</p>
                  <p className="text-slate-400">{formatDate(sub.submitted_at)}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/10 font-bold">
                  {sub.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
