"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Play, Save, Send, Trash2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import {
  deleteCreatorDraftClient,
  fetchCreatorSongByIdClient,
  getAuthorizedStreamUrlClient,
  submitSongForReviewClient,
  updateCreatorSongDraftClient,
} from "@/lib/creator-api";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatBytes, formatDate, formatDuration } from "@/lib/format";
import type { SongSubmission, Track } from "@/types/music";

function SongDetailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const trackId = params.get("id") || "";
  const { showToast } = useToast();

  const [track, setTrack] = useState<Track | null>(null);
  const [submissions, setSubmissions] = useState<SongSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [description, setDescription] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const hydrate = (t: Track | null, subs: SongSubmission[]) => {
    setTrack(t);
    setSubmissions(subs);
    if (t) {
      setTitle(t.title);
      setLanguage(t.language || "Hindi");
      setDescription(t.description || "");
      setLyrics(t.lyrics || "");
    }
  };

  const load = async () => {
    try {
      const res = await fetchCreatorSongByIdClient(trackId);
      hydrate(res.track, res.submissions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!trackId) {
      Promise.resolve().then(() => {
        if (active) setLoading(false);
      });
      return () => {
        active = false;
      };
    }
    fetchCreatorSongByIdClient(trackId)
      .then((res) => {
        if (!active) return;
        hydrate(res.track, res.submissions);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [trackId]);

  if (loading) return <div className="h-48 rounded-2xl gm-surface animate-pulse" />;

  if (!track) {
    return (
      <div className="gm-surface rounded-2xl p-8 text-center space-y-3">
        <p className="text-base font-bold">Song Not Found</p>
        <Link href="/studio/songs/" className="text-xs text-purple-400 hover:underline">
          Back to My Songs
        </Link>
      </div>
    );
  }

  const canEdit =
    track.status === "DRAFT" ||
    track.status === "CHANGES_REQUESTED" ||
    track.status === "REJECTED";
  const canDelete = track.status === "DRAFT" || track.status === "REJECTED";

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const updated = await updateCreatorSongDraftClient(track.id, {
        title,
        language,
        description,
        lyrics,
      });
      hydrate(updated, submissions);
      showToast("Song metadata & lyrics saved.", "success");
    } catch (err) {
      showToast(normalizeErrorMessage(err), "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCreatorDraftClient(track.id);
      showToast("Draft deleted.", "info");
      router.replace("/studio/songs/");
    } catch (err) {
      showToast(normalizeErrorMessage(err), "error");
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/studio/songs/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to My Songs
      </Link>

      <div className="gm-surface rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[11px] font-bold">
              {track.status || (track.is_published ? "PUBLISHED" : "DRAFT")}
            </span>
            <h1 className="text-2xl font-black mt-2">{track.title}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Bucket: <code>{track.audio_bucket}</code> • {formatDuration(track.duration_seconds)} •{" "}
              {formatBytes(track.file_size_bytes)}
            </p>
            {track.rejection_reason && (
              <p className="text-xs text-amber-300 mt-2">
                Moderator Note: {track.rejection_reason}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                const url = await getAuthorizedStreamUrlClient(track.id);
                if (!url) showToast("Unable to authorize stream URL.", "error");
                else setStreamUrl(url);
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5" /> Play
            </button>
            {track.is_published && (
              <Link
                href={`/songs/view/?slug=${encodeURIComponent(track.slug)}`}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View Public Song
              </Link>
            )}
            {(track.status === "DRAFT" || track.status === "CHANGES_REQUESTED") && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await submitSongForReviewClient(track.id);
                    showToast("Submitted for review!", "success");
                    await load();
                  } catch (err) {
                    showToast(normalizeErrorMessage(err), "error");
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" /> Submit for Review
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        </div>

        {streamUrl && <audio controls autoPlay src={streamUrl} className="w-full" />}

        <div className="grid sm:grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-3 rounded-xl bg-black/30">
            <p className="text-slate-400">Plays</p>
            <p className="text-lg font-bold">{track.play_count}</p>
          </div>
          <div className="p-3 rounded-xl bg-black/30">
            <p className="text-slate-400">Downloads</p>
            <p className="text-lg font-bold">{track.download_count}</p>
          </div>
          <div className="p-3 rounded-xl bg-black/30">
            <p className="text-slate-400">Uploaded</p>
            <p className="text-sm font-bold">{formatDate(track.created_at)}</p>
          </div>
        </div>
      </div>

      {canEdit && (
        <form onSubmit={handleSaveEdit} className="gm-surface rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold">Edit Metadata & Lyrics</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Language</label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Lyrics</label>
            <textarea
              rows={4}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingEdit}
            className="px-5 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {savingEdit ? "Saving..." : "Save Changes"}
          </button>
        </form>
      )}

      <div className="gm-surface rounded-2xl p-6 space-y-3">
        <h2 className="text-base font-bold">Submission History</h2>
        {submissions.length === 0 ? (
          <p className="text-xs text-slate-400">No review submissions yet.</p>
        ) : (
          <div className="space-y-2">
            {submissions.map((sub) => (
              <div key={sub.id} className="p-3 rounded-xl bg-black/30 border border-white/10 text-xs flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Submitted {formatDate(sub.submitted_at)}</p>
                  {sub.submission_notes && <p className="text-slate-400 mt-0.5">{sub.submission_notes}</p>}
                  {sub.reviewer_notes && <p className="text-amber-300 mt-0.5">Reviewer: {sub.reviewer_notes}</p>}
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/10 font-bold">{sub.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudioSongDetailPage() {
  return (
    <Suspense fallback={<div className="h-48 rounded-2xl gm-surface animate-pulse" />}>
      <SongDetailInner />
    </Suspense>
  );
}
