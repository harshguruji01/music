"use client";

import React, { useState } from "react";
import { Settings } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { setupCreatorAccountClient } from "@/lib/creator-api";
import { normalizeErrorMessage } from "@/lib/errors";

export default function StudioSettingsPage() {
  const { creator, refreshAuth } = useAuth();
  const { showToast } = useToast();

  const [stageName, setStageName] = useState(creator?.stage_name || "");
  const [bio, setBio] = useState(creator?.bio || "");
  const [country, setCountry] = useState(creator?.country || "");
  const [primaryGenre, setPrimaryGenre] = useState(creator?.primary_genre || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creator) return;
    setSaving(true);
    try {
      await setupCreatorAccountClient({
        username: creator.username,
        stageName,
        bio,
        country,
        primaryGenre,
      });
      await refreshAuth();
      showToast("Creator settings updated.", "success");
    } catch (err) {
      showToast(normalizeErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
          <Settings className="h-7 w-7 text-slate-300" />
          Creator Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Handle: <span className="text-white font-semibold">@{creator?.username}</span>
        </p>
      </div>

      <form onSubmit={handleSave} className="gm-surface rounded-2xl p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Stage Name</label>
          <input
            type="text"
            required
            value={stageName}
            onChange={(e) => setStageName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Primary Genre</label>
            <input
              type="text"
              value={primaryGenre}
              onChange={(e) => setPrimaryGenre(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Bio</label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
