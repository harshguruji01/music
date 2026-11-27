"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mic2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { normalizeErrorMessage } from "@/lib/errors";
import {
  checkCreatorUsernameAvailabilityClient,
  enrollCreatorWithPasswordClient,
  signInMusicWithGoogle,
  validateCreatorPasswordStrength,
  validateCreatorUsername,
} from "@/lib/music-auth";

export default function StudioOnboardingPage() {
  const router = useRouter();
  const { user, creator, musicUser, isGoogleAuthenticated, refreshAuth } = useAuth();
  const { showToast } = useToast();

  const [username, setUsername] = useState(creator?.username || "");
  const [stageName, setStageName] = useState(
    creator?.stage_name || musicUser?.display_name || ""
  );
  const [bio, setBio] = useState(creator?.bio || "");
  const [primaryGenre, setPrimaryGenre] = useState(creator?.primary_genre || "Hindi Music");
  const [country, setCountry] = useState(creator?.country || "India");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message?: string;
  }>({ checking: false, available: null });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (creator) {
      router.replace("/studio/");
    }
  }, [creator, router]);

  useEffect(() => {
    const clean = username.trim().toLowerCase();
    let active = true;
    const timer = setTimeout(async () => {
      if (!active) return;
      if (!clean) {
        setUsernameStatus({ checking: false, available: null });
        return;
      }
      const fmtErr = validateCreatorUsername(clean);
      if (fmtErr) {
        setUsernameStatus({ checking: false, available: false, message: fmtErr });
        return;
      }
      setUsernameStatus({ checking: true, available: null });
      const res = await checkCreatorUsernameAvailabilityClient(clean);
      if (!active) return;
      setUsernameStatus({
        checking: false,
        available: res.available,
        message: res.available ? "Username is available" : res.error || "Username is already taken",
      });
    }, 320);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [username]);

  const avatarUrl =
    musicUser?.avatar_url ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    null;

  const accountEmail = musicUser?.email || user?.email || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fmtErr = validateCreatorUsername(username);
    if (fmtErr) {
      setError(fmtErr);
      return;
    }
    if (usernameStatus.available === false) {
      setError(usernameStatus.message || "Please choose an available username.");
      return;
    }
    const strengthErr = validateCreatorPasswordStrength(password);
    if (strengthErr) {
      setError(strengthErr);
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    setSaving(true);
    try {
      await enrollCreatorWithPasswordClient({
        username,
        stageName,
        password,
        confirmPassword,
        bio,
        primaryGenre,
        country,
      });
      await refreshAuth();
      showToast("Creator Studio account activated!", "success");
      router.replace("/studio/");
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!user || !isGoogleAuthenticated) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="gm-surface gm-rainbow-border rounded-3xl p-8 text-center space-y-5">
          <div className="h-14 w-14 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black">Google Authentication Required</h1>
            <p className="text-xs text-slate-400">
              Creator accounts must be linked to a verified Google identity. Please sign in with Google to continue Creator enrollment.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signInMusicWithGoogle("/studio/onboarding/")}
            className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Globe className="h-4 w-4 text-blue-600" />
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
          <Mic2 className="h-7 w-7 text-purple-400" />
          Creator Account Setup
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Create your unique Creator handle and dedicated Creator Studio password, linked to your verified Google account.
        </p>
      </div>

      {/* Read-only Google Identity */}
      <div className="gm-surface rounded-2xl p-4 flex items-center gap-3.5 border border-emerald-500/20">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={musicUser?.display_name || accountEmail}
            width={48}
            height={48}
            className="rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded-xl gm-rainbow-gradient flex items-center justify-center text-white font-black text-lg shrink-0">
            {(accountEmail || "G").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
            Verified Google Account (Read-Only)
          </p>
          <p className="text-sm font-bold truncate">{accountEmail}</p>
        </div>
        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3.5 text-xs text-rose-200 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="gm-surface rounded-2xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Unique Username *</label>
            <input
              type="text"
              required
              pattern="[a-z0-9_]{3,32}"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="harsh_music"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
            {usernameStatus.checking ? (
              <p className="text-[11px] text-slate-400">Checking availability...</p>
            ) : usernameStatus.message ? (
              <p
                className={`text-[11px] ${
                  usernameStatus.available ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {usernameStatus.message}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">3-32 lowercase letters, numbers, or _</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Stage / Artist Name *</label>
            <input
              type="text"
              required
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder="HarshGuruJi"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Creator Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 10 chars, upper, lower, number"
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Confirm Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={10}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter creator password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>

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
          <label className="text-xs font-semibold text-slate-300">Creator Bio</label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell listeners about your sound and artistic journey..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving || usernameStatus.available === false}
          className="px-6 py-3 rounded-xl gm-rainbow-gradient text-white text-sm font-bold disabled:opacity-60"
        >
          {saving ? "Activating Creator Account..." : "Activate Creator Studio"}
        </button>
      </form>
    </div>
  );
}
