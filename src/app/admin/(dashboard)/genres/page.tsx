"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Genre } from "@/types/music";

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [colorAccent, setColorAccent] = useState("#8b5cf6");

  const load = useCallback(() => {
    fetch("/api/admin/genres")
      .then((r) => r.json())
      .then((d) => setGenres(d.genres || []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/admin/genres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim(),
        color_accent: colorAccent,
        display_order: genres.length + 1,
      }),
    });
    setName("");
    setDescription("");
    load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Genre Categories</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure genres and mood accents reflected across discovery and search.
        </p>
      </div>

      <form onSubmit={handleCreate} className="gm-surface rounded-2xl p-6 space-y-4 max-w-xl">
        <h2 className="text-base font-bold">Add Genre</h2>
        <div className="flex gap-3">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Genre name *"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
          />
          <input
            type="color"
            value={colorAccent}
            onChange={(e) => setColorAccent(e.target.value)}
            className="h-10 w-14 rounded-xl bg-transparent cursor-pointer"
            aria-label="Accent color"
          />
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short genre description"
          className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Genre
        </button>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {genres.map((g) => (
          <div key={g.id} className="gm-surface rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="h-4 w-4 rounded-full shrink-0"
                style={{ backgroundColor: g.color_accent }}
              />
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{g.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{g.slug}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await fetch(`/api/admin/genres?id=${g.id}`, { method: "DELETE" });
                load();
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
