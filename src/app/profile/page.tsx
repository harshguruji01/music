"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  LogOut,
  Mic2,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme, type ThemePreference } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import {
  deleteMusicAccountClient,
  getCurrentMusicUserState,
  signInMusicWithGoogle,
  updateMusicPreferencesClient,
} from "@/lib/music-auth";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { MusicLoginLog } from "@/types/music";

export default function UserProfilePage() {
  const router = useRouter();
  const { user, musicUser, creator, isGoogleAuthenticated, loading, signOut, refreshAuth } = useAuth();
  const { preference: themePref, setTheme: setThemePref } = useTheme();
  const { showToast } = useToast();
  const [recentLogins, setRecentLogins] = useState<MusicLoginLog[]>([]);
  const [language, setLanguage] = useState("Hindi");
  const [quality, setQuality] = useState<"standard" | "high">("high");
  const [autoplay, setAutoplay] = useState(true);
  const [saving, setSaving] = useState(false);

  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    getCurrentMusicUserState().then((st) => {
      setRecentLogins(st.recentLogins);
      if (st.preferences) {
        setLanguage(st.preferences.preferred_language || "Hindi");
        setQuality(st.preferences.audio_quality || "high");
        setAutoplay(st.preferences.autoplay ?? true);
      }
    });
  }, [user]);

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateMusicPreferencesClient({
        preferred_language: language,
        audio_quality: quality,
        autoplay,
      });
      if (updated) {
        await refreshAuth();
        showToast("Account settings saved.", "success");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const expected = (musicUser?.email || user?.email || "").toLowerCase();
    if (!expected || confirmEmail.trim().toLowerCase() !== expected) {
      showToast("Please type your exact account email to confirm deletion.", "error");
      return;
    }
    setDeleting(true);
    try {
      await deleteMusicAccountClient(confirmEmail);
      showToast("Your Guru Music account has been deleted.", "info");
      router.replace("/");
    } catch (err) {
      showToast(normalizeErrorMessage(err), "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !user) {
    return <div className="h-48 rounded-3xl gm-surface animate-pulse" />;
  }

  const avatarUrl =
    musicUser?.avatar_url ||
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined) ||
    null;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="gm-surface gm-rainbow-border rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={musicUser?.display_name || user.email || "Profile"}
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl object-cover shrink-0 border border-white/10"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl gm-rainbow-gradient flex items-center justify-center text-white text-2xl font-black shrink-0">
              {(musicUser?.display_name || user.email || "G").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {musicUser?.display_name || user.email?.split("@")[0] || "Music Listener"}
            </h1>
            <p className="text-xs text-[var(--gm-text-muted)]">{musicUser?.email || user.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[11px] font-semibold">
                Provider: {isGoogleAuthenticated ? "google" : musicUser?.auth_provider || "email"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[11px] font-semibold">
                Logins: {musicUser?.login_count ?? 1}
              </span>
              {user.created_at && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[11px] font-semibold">
                  Joined: {formatDate(user.created_at)}
                </span>
              )}
              {creator?.is_verified && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Verified Creator
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {creator ? (
            <Link
              href="/studio/"
              className="px-4 py-2 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Mic2 className="h-3.5 w-3.5" />
              Open Creator Studio
            </Link>
          ) : isGoogleAuthenticated ? (
            <Link
              href="/studio/onboarding/"
              className="px-4 py-2 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Mic2 className="h-3.5 w-3.5" />
              Become a Creator
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void signInMusicWithGoogle("/studio/onboarding/")}
              className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Mic2 className="h-3.5 w-3.5" />
              Sign in with Google to Become a Creator
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/");
            }}
            className="px-4 py-2 rounded-xl gm-surface hover:bg-white/10 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5 text-rose-400" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleSavePrefs} className="gm-surface rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            Account & Listener Settings
          </h2>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--gm-text-muted)]">
              Preferred Music Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-[var(--gm-border)] text-sm"
            >
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
              <option value="Punjabi">Punjabi</option>
              <option value="Instrumental">Instrumental</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--gm-text-muted)]">
              Streaming Audio Quality
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as "standard" | "high")}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-[var(--gm-border)] text-sm"
            >
              <option value="high">High Quality (Original)</option>
              <option value="standard">Data Saver (Standard)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--gm-text-muted)]">
              Appearance Theme
            </label>
            <select
              value={themePref}
              onChange={(e) => setThemePref(e.target.value as ThemePreference)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-[var(--gm-border)] text-sm"
            >
              <option value="dark">Dark (Default)</option>
              <option value="light">Light</option>
              <option value="system">System Preference</option>
            </select>
          </div>

          <label className="flex items-center gap-2.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
            />
            <span>Autoplay next recommended track</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </form>

        <div className="gm-surface rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            Guru Music Login Activity
          </h2>
          {recentLogins.length === 0 ? (
            <p className="text-xs text-[var(--gm-text-muted)]">No login records yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto gm-scrollbar">
              {recentLogins.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white/5"
                >
                  <div>
                    <span className="font-semibold capitalize">{log.event_type}</span>
                    <span className="text-[var(--gm-text-muted)]"> • {log.auth_method}</span>
                  </div>
                  <span className="text-[11px] text-[var(--gm-text-muted)]">
                    {formatDate(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleDeleteAccount}
        className="gm-surface rounded-2xl border border-rose-500/25 p-6 space-y-4"
      >
        <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Delete Account
        </h2>
        <p className="text-xs text-[var(--gm-text-muted)]">
          Permanently delete your Guru Music account, playlists, favorites, and associated creator profile. Type{" "}
          <span className="text-[var(--gm-text)] font-semibold">{musicUser?.email || user.email}</span> to confirm.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder="Confirm your email address"
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/30 border border-rose-500/30 text-sm"
          />
          <button
            type="submit"
            disabled={deleting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
