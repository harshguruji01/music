"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, Plus, Trash2, User } from "lucide-react";
import type { Artist } from "@/types/music";
import {
  createAdminArtistClient,
  deleteAdminArtistClient,
  fetchAdminArtistsClient,
  toggleAdminArtistPublishClient,
} from "@/lib/admin-api";

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setArtists(await fetchAdminArtistsClient());
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminArtistsClient().then((a) => {
      if (active) setArtists(a);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createAdminArtistClient({ name: name.trim(), bio: bio.trim(), isPublished, imageFile });
      setName("");
      setBio("");
      setImageFile(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Artist Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Create artist profiles, upload portraits to <code>artist-images</code>, and manage public visibility.
        </p>
      </div>

      <form onSubmit={handleCreate} className="gm-surface rounded-2xl p-6 space-y-4 max-w-2xl">
        <h2 className="text-base font-bold">Add New Artist</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Artist name *" className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs" />
        </div>
        <textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Artist biography..." className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="accent-emerald-500" />
            Publish artist page publicly
          </label>
          <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" />
            {saving ? "Creating..." : "Create Artist"}
          </button>
        </div>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {artists.map((artist) => (
          <div key={artist.id} className="gm-surface rounded-2xl p-4 flex items-center gap-4">
            <div className="relative h-14 w-14 rounded-full overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
              {artist.image_url ? (
                <Image src={artist.image_url} alt={artist.name} fill className="object-cover" />
              ) : (
                <User className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate">{artist.name}</p>
              <p className="text-[11px] text-slate-400">{artist.is_published ? "Published" : "Draft"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={async () => { await toggleAdminArtistPublishClient(artist); await load(); }} className="p-2 rounded-lg hover:bg-white/10 text-emerald-400">
                {artist.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button type="button" onClick={async () => { await deleteAdminArtistClient(artist); await load(); }} className="p-2 rounded-lg hover:bg-white/10 text-rose-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
