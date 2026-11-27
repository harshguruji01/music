"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import type { SiteSettings } from "@/types/music";
import { getSiteSettingsClient } from "@/lib/public-api";
import { saveSiteSettingsClient } from "@/lib/admin-api";

export default function AdminSettingsPage() {
  const [form, setForm] = useState<Partial<SiteSettings>>({
    site_title: "Guru Music",
    site_description: "Discover your sound. Explore your world. Feel every beat.",
    brand_tagline: "MUSIC BEYOND LIMITS.",
    secondary_tagline: "LISTEN • EXPLORE • FEEL THE FLOW.",
    logo_url: "/brand/guru-music-logo.png",
    default_artwork_url: "/brand/default-cover.png",
    public_download_policy: "track_level",
    maintenance_mode: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    getSiteSettingsClient().then((s) => {
      if (active) setForm(s);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await saveSiteSettingsClient(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Website Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure public branding, taglines, download policy, and maintenance banner.</p>
      </div>

      <form onSubmit={handleSave} className="gm-surface rounded-2xl p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Site Title</label>
          <input type="text" value={form.site_title || ""} onChange={(e) => setForm((f) => ({ ...f, site_title: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Hero Subtitle / Site Description</label>
          <textarea rows={2} value={form.site_description || ""} onChange={(e) => setForm((f) => ({ ...f, site_description: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Brand Tagline</label>
            <input type="text" value={form.brand_tagline || ""} onChange={(e) => setForm((f) => ({ ...f, brand_tagline: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Secondary Tagline</label>
            <input type="text" value={form.secondary_tagline || ""} onChange={(e) => setForm((f) => ({ ...f, secondary_tagline: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Logo Reference</label>
            <input type="text" value={form.logo_url || ""} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Default Artwork</label>
            <input type="text" value={form.default_artwork_url || ""} onChange={(e) => setForm((f) => ({ ...f, default_artwork_url: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Public Download Policy</label>
          <select
            value={form.public_download_policy || "track_level"}
            onChange={(e) => setForm((f) => ({ ...f, public_download_policy: e.target.value as "track_level" | "disabled" }))}
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
          >
            <option value="track_level">Respect Track-Level Download Permission</option>
            <option value="disabled">Disable All Public Downloads</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
          <input type="checkbox" checked={Boolean(form.maintenance_mode)} onChange={(e) => setForm((f) => ({ ...f, maintenance_mode: e.target.checked }))} className="accent-amber-500" />
          Display Maintenance Notice Banner on Public Website
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
          {saved && (
            <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Settings saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
