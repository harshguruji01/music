"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { Album, Artist } from "@/types/music";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import {
  createAdminAlbumClient,
  deleteAdminAlbumClient,
  fetchAdminAlbumsClient,
  fetchAdminArtistsClient,
  toggleAdminAlbumPublishClient,
} from "@/lib/admin-api";

export default function AdminAlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(true);

  const load = useCallback(async () => {
    const [al, ar] = await Promise.all([fetchAdminAlbumsClient(), fetchAdminArtistsClient()]);
    setAlbums(al);
    setArtists(ar);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchAdminAlbumsClient(), fetchAdminArtistsClient()]).then(([al, ar]) => {
      if (!active) return;
      setAlbums(al);
      setArtists(ar);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createAdminAlbumClient({
      title: title.trim(),
      artistId: artistId || undefined,
      description: description.trim(),
      releaseDate: releaseDate || undefined,
      isPublished,
      coverFile,
    });
    setTitle("");
    setDescription("");
    setCoverFile(null);
    await load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Album Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Create albums, upload covers to <code>album-covers</code>, and link artists.
        </p>
      </div>

      <form onSubmit={handleCreate} className="gm-surface rounded-2xl p-6 space-y-4 max-w-2xl">
        <h2 className="text-base font-bold">Create Album</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Album title *" className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
          <select value={artistId} onChange={(e) => setArtistId(e.target.value)} className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm">
            <option value="">Select artist...</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs" />
        </div>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Album description..." className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="accent-emerald-500" />
            Publish album
          </label>
          <button type="submit" className="px-5 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Create Album
          </button>
        </div>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {albums.map((album) => (
          <div key={album.id} className="gm-surface rounded-2xl p-4 flex items-center gap-4">
            <Image src={album.cover_url || BRAND_CONFIG.defaultCoverPath} alt={album.title} width={56} height={56} className="rounded-xl object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate">{album.title}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {album.artist?.name || "No artist"} • {album.is_published ? "Published" : "Draft"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={async () => { await toggleAdminAlbumPublishClient(album); await load(); }} className="p-2 rounded-lg hover:bg-white/10 text-emerald-400">
                {album.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button type="button" onClick={async () => { await deleteAdminAlbumClient(album); await load(); }} className="p-2 rounded-lg hover:bg-white/10 text-rose-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
