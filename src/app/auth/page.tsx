"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  Mail,
  Mic2,
  Music2,
  User,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { normalizeErrorMessage } from "@/lib/errors";
import {
  loginCreatorWithPasswordClient,
  requestCreatorPasswordRecoveryClient,
  resetCreatorPasswordClient,
  signInMusicUser,
  signInMusicWithGoogle,
  signUpMusicUser,
  validateCreatorPasswordStrength,
} from "@/lib/music-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup" | "creator-login" | "creator-recovery" | "forgot-email";

function getSafeNextPath(raw: string | null, fallback = "/profile/"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, musicUser, creator, isGoogleAuthenticated, refreshAuth } = useAuth();
  const { showToast } = useToast();

  const initialMode = (searchParams.get("mode") as AuthMode | null) || "signin";
  const nextPath = getSafeNextPath(
    searchParams.get("next"),
    initialMode === "creator-login" ? "/studio/" : "/profile/"
  );

  const [mode, setMode] = useState<AuthMode>(
    ["signin", "signup", "creator-login", "creator-recovery", "forgot-email"].includes(initialMode)
      ? initialMode
      : "signin"
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Creator login / recovery state
  const [creatorUsername, setCreatorUsername] = useState("");
  const effectiveCreatorUsername = creatorUsername || creator?.username || "";
  const [creatorPassword, setCreatorPassword] = useState("");
  const [showCreatorPassword, setShowCreatorPassword] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [newCreatorPassword, setNewCreatorPassword] = useState("");
  const [confirmCreatorPassword, setConfirmCreatorPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user && (mode === "signin" || mode === "signup")) {
      router.replace(nextPath);
    }
  }, [user, mode, nextPath, router]);

  const handleListenerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await signUpMusicUser({ email, password, displayName });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        await refreshAuth();
        showToast("Welcome to Guru Music!", "success");
        router.replace(nextPath);
      } else if (mode === "signin") {
        const res = await signInMusicUser({ email, password });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        await refreshAuth();
        showToast("Signed in to Guru Music", "success");
        router.replace(nextPath);
      } else if (mode === "forgot-email") {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          setError("Authentication service unavailable. Please check your network.");
          return;
        }
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          { redirectTo: `${window.location.origin}/auth/` }
        );
        if (resetErr) {
          setError(resetErr.message);
          return;
        }
        setNotice("Password reset instructions sent if an account exists for that email.");
      }
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (targetNext = nextPath) => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await signInMusicWithGoogle(targetNext);
      if (!res.ok) {
        setError(res.error || "Google sign-in failed.");
        setLoading(false);
      }
    } catch (err) {
      setError(normalizeErrorMessage(err));
      setLoading(false);
    }
  };

  const handleCreatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await loginCreatorWithPasswordClient(effectiveCreatorUsername, creatorPassword);
      await refreshAuth();
      showToast("Creator Studio unlocked!", "success");
      router.replace(nextPath.startsWith("/studio") ? nextPath : "/studio/");
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCreatorRecovery = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const res = await requestCreatorPasswordRecoveryClient();
      setRecoveryToken(res.recoveryToken);
      setCreatorUsername(res.username);
      setNotice(
        `Verified Google identity (${res.verifiedEmail}). Enter a new password for @${res.username}.`
      );
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetCreatorPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryToken) return;
    setError(null);
    const strengthErr = validateCreatorPasswordStrength(newCreatorPassword);
    if (strengthErr) {
      setError(strengthErr);
      return;
    }
    if (newCreatorPassword !== confirmCreatorPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await resetCreatorPasswordClient({
        recoveryToken,
        newPassword: newCreatorPassword,
        confirmPassword: confirmCreatorPassword,
      });
      setRecoveryToken(null);
      setNewCreatorPassword("");
      setConfirmCreatorPassword("");
      showToast("Creator password updated. Please sign in.", "success");
      setMode("creator-login");
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-8 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <BrandLogo variant="full" />
        </div>

        <div className="gm-surface gm-rainbow-border rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="space-y-1 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300">
              <Music2 className="h-3.5 w-3.5" />
              <span>Guru Music Listener & Creator Account</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              {mode === "signin" && "Welcome to Guru Music"}
              {mode === "signup" && "Create Music Account"}
              {mode === "forgot-email" && "Reset Listener Password"}
              {mode === "creator-login" && "Creator Studio Login"}
              {mode === "creator-recovery" && "Creator Password Recovery"}
            </h1>
            <p className="text-xs text-[var(--gm-text-muted)]">
              {mode === "creator-login" || mode === "creator-recovery"
                ? "Requires both an active Google session and your Creator credentials."
                : "Sync favorites, listening history, playlists, and access Creator Studio."}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/30 border border-[var(--gm-border)] text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setNotice(null);
                setMode("signin");
              }}
              className={`py-2 rounded-lg transition-colors ${
                mode === "signin" || mode === "forgot-email"
                  ? "bg-white/15 text-white"
                  : "text-[var(--gm-text-muted)] hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setNotice(null);
                setMode("signup");
              }}
              className={`py-2 rounded-lg transition-colors ${
                mode === "signup"
                  ? "bg-white/15 text-white"
                  : "text-[var(--gm-text-muted)] hover:text-white"
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setNotice(null);
                setMode("creator-login");
              }}
              className={`py-2 rounded-lg transition-colors inline-flex items-center justify-center gap-1 ${
                mode === "creator-login" || mode === "creator-recovery"
                  ? "bg-purple-500/30 text-purple-200"
                  : "text-[var(--gm-text-muted)] hover:text-white"
              }`}
            >
              <Mic2 className="h-3 w-3" />
              Creator
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300 flex items-start gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2.5 text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {(mode === "signin" || mode === "signup" || mode === "forgot-email") && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleGoogle(nextPath)}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Globe className="h-4 w-4 text-blue-600" />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-[11px] text-[var(--gm-text-muted)]">
                <span className="h-px flex-1 bg-[var(--gm-border)]" />
                <span>or use email</span>
                <span className="h-px flex-1 bg-[var(--gm-border)]" />
              </div>

              <form onSubmit={handleListenerSubmit} className="space-y-3.5">
                {mode === "signup" && (
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gm-text-muted)]" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/30 border border-[var(--gm-border)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gm-text-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/30 border border-[var(--gm-border)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60"
                  />
                </div>

                {mode !== "forgot-email" && (
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gm-text-muted)]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min 6 chars)"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/30 border border-[var(--gm-border)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gm-text-muted)] hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                )}

                {mode === "signin" && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setNotice(null);
                        setMode("forgot-email");
                      }}
                      className="text-[11px] text-purple-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl gm-rainbow-gradient text-white font-bold text-sm shadow-lg shadow-purple-500/25 disabled:opacity-60"
                >
                  {loading
                    ? "Please wait..."
                    : mode === "signin"
                      ? "Sign In"
                      : mode === "signup"
                        ? "Create Music Account"
                        : "Send Reset Link"}
                </button>
              </form>
            </>
          )}

          {mode === "creator-login" && (
            <div className="space-y-4">
              {!user || !isGoogleAuthenticated ? (
                <div className="space-y-3 text-center">
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs text-amber-200">
                    Step 1 of 2: Sign in with your linked Google account before entering your Creator username & password.
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleGoogle("/auth/?mode=creator-login&next=/studio/")}
                    className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Globe className="h-4 w-4 text-blue-600" />
                    Continue with Google
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-2.5 text-xs text-emerald-200 flex items-center justify-between gap-2">
                    <span className="truncate">
                      Google verified: <strong>{musicUser?.email || user.email}</strong>
                    </span>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  </div>

                  <form onSubmit={handleCreatorLogin} className="space-y-3.5">
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gm-text-muted)]" />
                      <input
                        type="text"
                        required
                        value={effectiveCreatorUsername}
                        onChange={(e) => setCreatorUsername(e.target.value.toLowerCase())}
                        placeholder="Creator username"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/30 border border-[var(--gm-border)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60"
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gm-text-muted)]" />
                      <input
                        type={showCreatorPassword ? "text" : "password"}
                        required
                        value={creatorPassword}
                        onChange={(e) => setCreatorPassword(e.target.value)}
                        placeholder="Creator password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/30 border border-[var(--gm-border)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatorPassword((v) => !v)}
                        aria-label={showCreatorPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gm-text-muted)] hover:text-white"
                      >
                        {showCreatorPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <Link href="/studio/onboarding/" className="text-[var(--gm-text-muted)] hover:text-white">
                        Not a creator yet? Enroll
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setNotice(null);
                          setMode("creator-recovery");
                        }}
                        className="text-purple-400 hover:underline"
                      >
                        Forgot creator password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl gm-rainbow-gradient text-white font-bold text-sm shadow-lg shadow-purple-500/25 disabled:opacity-60"
                    >
                      {loading ? "Verifying..." : "Verify & Open Creator Studio"}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {mode === "creator-recovery" && (
            <div className="space-y-4">
              {!user || !isGoogleAuthenticated ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleGoogle("/auth/?mode=creator-recovery")}
                  className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Globe className="h-4 w-4 text-blue-600" />
                  Verify Google Account First
                </button>
              ) : !recoveryToken ? (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--gm-text-muted)]">
                    Recover your Creator Studio password using your active Google session ({musicUser?.email || user.email}).
                  </p>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRequestCreatorRecovery}
                    className="w-full py-3 rounded-xl gm-rainbow-gradient text-white font-bold text-sm disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    {loading ? "Verifying..." : "Generate Recovery Token"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetCreatorPassword} className="space-y-3.5">
                  <input
                    type={showCreatorPassword ? "text" : "password"}
                    required
                    value={newCreatorPassword}
                    onChange={(e) => setNewCreatorPassword(e.target.value)}
                    placeholder="New password (10+ chars, upper, lower, number)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-[var(--gm-border)] text-sm"
                  />
                  <input
                    type={showCreatorPassword ? "text" : "password"}
                    required
                    value={confirmCreatorPassword}
                    onChange={(e) => setConfirmCreatorPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/30 border border-[var(--gm-border)] text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl gm-rainbow-gradient text-white font-bold text-sm disabled:opacity-60"
                  >
                    {loading ? "Updating..." : "Reset Creator Password"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Music Player
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ListenerAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center">
          <BrandLogo variant="loading" />
        </div>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}
