"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Edit3,
  Eye,
  EyeOff,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Track } from "@/types/music";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import { formatDate, formatDuration } from "@/lib/format";

export default function AdminLibraryPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("created_at");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [previewTrack, setPreviewTrack] = useState<{ title: string; url: string } | null>(null);
  const [editing, setEditing] = useState<Track | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLanguage, setEditLanguage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null);

  const loadTracks = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "15",
      status,
      sort,
    });
    if (q.trim()) params.set("q", q.trim());

    try {
      const r = await fetch(`/api/admin/tracks?${params.toString()}`);
      const d = await r.json();
      setTracks(d.tracks || []);
      setTotal(d.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, q, status, sort]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "15",
      status,
      sort,
    });
    if (q.trim()) params.set("q", q.trim());

    fetch(`/api/admin/tracks?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setTracks(d.tracks || []);
        setTotal(d.total || 0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, q, status, sort]);

  const patchTrack = async (id: string, payload: Record<string, unknown>) => {
    await fetch(`/api/admin/tracks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    loadTracks();
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;
    if (action === "delete") {
      setConfirmDelete({ ids: selectedIds, label: `${selectedIds.length} selected tracks` });
      return;
    }
    await fetch("/api/admin/tracks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, action }),
    });
    setSelectedIds([]);
    loadTracks();
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.ids.length === 1) {
      await fetch(`/api/admin/tracks/${confirmDelete.ids[0]}`, { method: "DELETE" });
    } else {
      await fetch("/api/admin/tracks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: confirmDelete.ids, action: "delete" }),
      });
    }
    setConfirmDelete(null);
    setSelectedIds([]);
    loadTracks();
  };

  const openPreview = async (track: Track) => {
    const res = await fetch(`/api/admin/tracks/${track.id}/preview`);
    const data = await res.json();
    if (data.url) {
      setPreviewTrack({ title: track.title, url: data.url });
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === tracks.length) setSelectedIds([]);
    else setSelectedIds(tracks.map((t) => t.id));
  };

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Music Library</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage published songs, private drafts, download permissions, and metadata ({total} tracks).
          </p>
        </div>
        <Link
          href="/admin/upload"
          className="px-4 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Upload Track
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by song title..."
            className="w-full pl-10 pr-4 py-2 rounded-xl gm-surface text-sm"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3.5 py-2 rounded-xl gm-surface text-xs font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="featured">Featured</option>
          <option value="downloadable">Downloadable</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3.5 py-2 rounded-xl gm-surface text-xs font-semibold"
        >
          <option value="created_at">Newest First</option>
          <option value="title">Title (A-Z)</option>
          <option value="play_count">Most Played</option>
          <option value="download_count">Most Downloaded</option>
        </select>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="gm-surface rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold">{selectedIds.length} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => handleBulkAction("publish")} className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold">Publish</button>
            <button onClick={() => handleBulkAction("unpublish")} className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-semibold">Unpublish</button>
            <button onClick={() => handleBulkAction("enable_download")} className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-semibold">Enable Downloads</button>
            <button onClick={() => handleBulkAction("disable_download")} className="px-3 py-1 rounded-lg bg-white/10 text-slate-300 text-xs font-semibold">Disable Downloads</button>
            <button onClick={() => handleBulkAction("delete")} className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold">Delete</button>
          </div>
        </div>
      )}

      {/* Preview Bar */}
      {previewTrack && (
        <div className="gm-surface gm-rainbow-border rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-xs font-bold text-purple-300 shrink-0">Preview:</span>
            <span className="text-sm font-semibold truncate">{previewTrack.title}</span>
            <audio controls autoPlay src={previewTrack.url} className="h-8 flex-1 max-w-md" />
          </div>
          <button
            type="button"
            onClick={() => setPreviewTrack(null)}
            className="p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="gm-surface rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="p-3.5">
                <input
                  type="checkbox"
                  checked={tracks.length > 0 && selectedIds.length === tracks.length}
                  onChange={toggleAll}
                  aria-label="Select all tracks"
                />
              </th>
              <th className="p-3.5 font-semibold">Track</th>
              <th className="p-3.5 font-semibold">Artist</th>
              <th className="p-3.5 font-semibold">Album</th>
              <th className="p-3.5 font-semibold">Genre</th>
              <th className="p-3.5 font-semibold">Uploaded</th>
              <th className="p-3.5 font-semibold">Duration</th>
              <th className="p-3.5 font-semibold">Status</th>
              <th className="p-3.5 font-semibold">Downloads</th>
              <th className="p-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">
                  Loading music library...
                </td>
              </tr>
            ) : tracks.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400">
                  No tracks match your filter. Upload music to get started.
                </td>
              </tr>
            ) : (
              tracks.map((track) => (
                <tr key={track.id} className="hover:bg-white/[0.03]">
                  <td className="p-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(track.id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(track.id)
                            ? prev.filter((i) => i !== track.id)
                            : [...prev, track.id]
                        )
                      }
                      aria-label={`Select ${track.title}`}
                    />
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <Image
                        src={track.cover_url || BRAND_CONFIG.defaultCoverPath}
                        alt={track.title}
                        width={40}
                        height={40}
                        className="rounded-lg object-cover shrink-0"
                      />
                      <span className="font-semibold text-white truncate max-w-[180px]">
                        {track.title}
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-300">{track.artist?.name || "—"}</td>
                  <td className="p-3.5 text-slate-400">{track.album?.title || "—"}</td>
                  <td className="p-3.5 text-slate-300">{track.genre?.name || "—"}</td>
                  <td className="p-3.5 text-slate-400 whitespace-nowrap">{formatDate(track.created_at)}</td>
                  <td className="p-3.5 tabular-nums text-slate-300">{formatDuration(track.duration_seconds)}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        track.is_published
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {track.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <button
                      type="button"
                      onClick={() => patchTrack(track.id, { is_downloadable: !track.is_downloadable })}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        track.is_downloadable
                          ? "bg-blue-500/15 text-blue-300"
                          : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {track.is_downloadable ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openPreview(track)}
                        title="Preview audio"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => patchTrack(track.id, { is_published: !track.is_published })}
                        title={track.is_published ? "Unpublish" : "Publish"}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-400"
                      >
                        {track.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => patchTrack(track.id, { is_featured: !track.is_featured })}
                        title={track.is_featured ? "Unfeature" : "Feature"}
                        className={`p-1.5 rounded-lg hover:bg-white/10 ${
                          track.is_featured ? "text-amber-400" : "text-slate-400"
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => patchTrack(track.id, { is_downloadable: !track.is_downloadable })}
                        title="Toggle download permission"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-cyan-400"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(track);
                          setEditTitle(track.title);
                          setEditDescription(track.description || "");
                          setEditLanguage(track.language || "Hindi");
                        }}
                        title="Edit metadata"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({ ids: [track.id], label: track.title })}
                        title="Delete track"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg gm-surface disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg gm-surface disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="gm-surface rounded-2xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold">Edit Track Metadata</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Track title"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
              <input
                type="text"
                value={editLanguage}
                onChange={(e) => setEditLanguage(e.target.value)}
                placeholder="Language"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await patchTrack(editing.id, {
                    title: editTitle,
                    description: editDescription,
                    language: editLanguage,
                  });
                  setEditing(null);
                }}
                className="px-4 py-2 rounded-xl gm-rainbow-gradient text-white text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="gm-surface rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h2 className="text-lg font-bold text-rose-400">Confirm Deletion</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Permanently delete <strong>{confirmDelete.label}</strong>? This will also remove the
              associated audio and artwork files from Supabase Storage.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
