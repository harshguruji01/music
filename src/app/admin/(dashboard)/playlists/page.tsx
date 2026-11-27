"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Playlist, Track } from "@/types/music";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import {
  createAdminPlaylistClient,
  deleteAdminPlaylistClient,
  fetchAdminPlaylistsClient,
  fetchAdminTracksClient,
  updateAdminPlaylistClient,
} from "@/lib/admin-api";

interface AdminPlaylistRow extends Playlist {
  playlist_tracks?: Array<{
    position: number;
    track: { id: string; title: string } | null;
  }>;
}

export default function AdminPlaylistsPage() {
  const [playlists, setPlaylists] = useState<AdminPlaylistRow[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<AdminPlaylistRow | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [pls, tr] = await Promise.all([
      fetchAdminPlaylistsClient(),
      fetchAdminTracksClient({ pageSize: 100 }),
    ]);
    setPlaylists(pls as unknown as AdminPlaylistRow[]);
    setAllTracks(tr.tracks);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAdminPlaylistsClient(), fetchAdminTracksClient({ pageSize: 100 })]).then(
      ([pls, tr]) => {
        if (!active) return;
        setPlaylists(pls as unknown as AdminPlaylistRow[]);
        setAllTracks(tr.tracks);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createAdminPlaylistClient({
      title: title.trim(),
      description: description.trim(),
      isPublished,
      coverFile,
    });
    setTitle("");
    setDescription("");
    setCoverFile(null);
    await load();
  };

  const openManageTracks = (pl: AdminPlaylistRow) => {
    setSelectedPlaylist(pl);
    const ordered = [...(pl.playlist_tracks || [])]
      .sort((a, b) => a.position - b.position)
      .map((i) => i.track?.id)
      .filter((id): id is string => Boolean(id));
    setSelectedTrackIds(ordered);
  };

  const savePlaylistTracks = async () => {
    if (!selectedPlaylist) return;
    await updateAdminPlaylistClient(selectedPlaylist.id, {}, selectedTrackIds);
    setSelectedPlaylist(null);
    await load();
  };

  const moveTrack = (idx: number, delta: number) => {
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= selectedTrackIds.length) return;
    const copy = [...selectedTrackIds];
    const [item] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, item);
    setSelectedTrackIds(copy);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Playlist Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Curate official playlists, reorder tracks, and sync instantly with the public platform.
        </p>
      </div>

      <form onSubmit={handleCreate} className="gm-surface rounded-2xl p-6 space-y-4 max-w-2xl">
        <h2 className="text-base font-bold">Create Official Playlist</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Playlist title *" className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs" />
        </div>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Playlist description..." className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="accent-emerald-500" />
            Publish publicly
          </label>
          <button type="submit" className="px-5 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Create Playlist
          </button>
        </div>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {playlists.map((pl) => (
          <div key={pl.id} className="gm-surface rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Image src={pl.cover_url || BRAND_CONFIG.defaultCoverPath} alt={pl.title} width={52} height={52} className="rounded-xl object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate">{pl.title}</p>
                <p className="text-[11px] text-slate-400">
                  {pl.playlist_tracks?.length || 0} tracks • {pl.is_published ? "Published" : "Draft"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button type="button" onClick={() => openManageTracks(pl)} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold">
                Manage Tracks
              </button>
              <div className="flex items-center gap-1">
                <button type="button" onClick={async () => { await updateAdminPlaylistClient(pl.id, { is_featured: !pl.is_featured }); await load(); }} className={`p-1.5 rounded-lg hover:bg-white/10 ${pl.is_featured ? "text-amber-400" : "text-slate-400"}`}>
                  <Sparkles className="h-4 w-4" />
                </button>
                <button type="button" onClick={async () => { await updateAdminPlaylistClient(pl.id, { is_published: !pl.is_published }); await load(); }} className="p-1.5 rounded-lg hover:bg-white/10 text-emerald-400">
                  {pl.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button type="button" onClick={async () => { await deleteAdminPlaylistClient(pl.id, pl.cover_path); await load(); }} className="p-1.5 rounded-lg hover:bg-white/10 text-rose-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPlaylist && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="gm-surface rounded-2xl p-6 max-w-2xl w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-bold">Manage Tracks: {selectedPlaylist.title}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-slate-400">Playlist Order</p>
                {selectedTrackIds.length === 0 ? (
                  <p className="text-xs text-slate-400">No tracks selected yet.</p>
                ) : (
                  selectedTrackIds.map((tid, idx) => {
                    const tr = allTracks.find((t) => t.id === tid);
                    return (
                      <div key={tid} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5 text-xs">
                        <span className="truncate">{idx + 1}. {tr?.title || tid}</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveTrack(idx, -1)} className="p-1"><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => moveTrack(idx, 1)} className="p-1"><ArrowDown className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => setSelectedTrackIds((p) => p.filter((x) => x !== tid))} className="p-1 text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-slate-400">Add From Catalog</p>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {allTracks
                    .filter((t) => !selectedTrackIds.includes(t.id))
                    .map((t) => (
                      <button key={t.id} type="button" onClick={() => setSelectedTrackIds((p) => [...p, t.id])} className="w-full text-left px-2.5 py-2 rounded-lg bg-black/30 hover:bg-white/10 text-xs truncate">
                        + {t.title}
                      </button>
                    ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSelectedPlaylist(null)} className="px-4 py-2 rounded-xl bg-white/5 text-xs font-semibold">Cancel</button>
              <button type="button" onClick={savePlaylistTracks} className="px-4 py-2 rounded-xl gm-rainbow-gradient text-white text-xs font-bold">Save Track Order</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
