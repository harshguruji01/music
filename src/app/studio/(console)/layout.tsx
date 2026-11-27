"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Globe, Lock, ShieldAlert, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { StudioShell } from "@/components/studio/StudioShell";
import { normalizeErrorMessage } from "@/lib/errors";
import {
  loginCreatorWithPasswordClient,
  signInMusicWithGoogle,
  verifyCreatorSessionClient,
} from "@/lib/music-auth";

type GateState =
  | "checking"
  | "authorized"
  | "google_required"
  | "creator_enrollment_required"
  | "creator_login_required"
  | "creator_suspended";

export default function StudioProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, creator, isGoogleAuthenticated, loading, refreshAuth } = useAuth();
  const { showToast } = useToast();

  const normalized = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const isOnboarding = normalized === "/studio/onboarding/";

  const [gate, setGate] = useState<GateState>("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifyingLogin, setVerifyingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (loading) return;
    if (!user || !isGoogleAuthenticated) {
      setGate("google_required");
      return;
    }
    if (!creator) {
      if (isOnboarding) {
        setGate("authorized");
      } else {
        setGate("creator_enrollment_required");
        router.replace("/studio/onboarding/");
      }
      return;
    }
    if (creator.verification_status === "suspended") {
      setGate("creator_suspended");
      return;
    }

    const res = await verifyCreatorSessionClient();
    if (res.ok) {
      setGate("authorized");
      return;
    }
    if (res.reason === "google_required") {
      setGate("google_required");
    } else if (res.reason === "creator_enrollment_required") {
      setGate("creator_enrollment_required");
      if (!isOnboarding) router.replace("/studio/onboarding/");
    } else if (res.reason === "creator_suspended") {
      setGate("creator_suspended");
    } else {
      setUsername(creator.username || "");
      setGate("creator_login_required");
    }
  }, [loading, user, isGoogleAuthenticated, creator, isOnboarding, router]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void checkAccess();
    });
    const interval = setInterval(() => {
      if (active) void checkAccess();
    }, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [checkAccess]);

  const handleCreatorUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setVerifyingLogin(true);
    try {
      await loginCreatorWithPasswordClient(username, password);
      await refreshAuth();
      setPassword("");
      showToast("Creator Studio session verified.", "success");
      setGate("authorized");
    } catch (err) {
      setLoginError(normalizeErrorMessage(err));
    } finally {
      setVerifyingLogin(false);
    }
  };

  if (loading || gate === "checking") {
    return (
      <div className="min-h-screen bg-[#07070b] flex items-center justify-center">
        <BrandLogo variant="loading" />
      </div>
    );
  }

  if (gate === "google_required") {
    return (
      <div className="min-h-screen bg-[#07070b] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md gm-surface gm-rainbow-border rounded-3xl p-8 text-center space-y-5">
          <ShieldAlert className="h-10 w-10 text-amber-400 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-black">Creator Studio Access Denied</h1>
            <p className="text-xs text-slate-400">
              {user
                ? "Creator Studio requires an active Google-authenticated account. Email-only sessions cannot access Creator Studio."
                : "Please sign in with Google and verify your Creator credentials to access Creator Studio."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signInMusicWithGoogle(normalized)}
            className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-bold text-sm hover:bg-slate-100 inline-flex items-center justify-center gap-2"
          >
            <Globe className="h-4 w-4 text-blue-600" />
            Continue with Google
          </button>
          <Link href="/" className="block text-xs text-slate-400 hover:text-white">
            Return to Guru Music
          </Link>
        </div>
      </div>
    );
  }

  if (gate === "creator_suspended") {
    return (
      <div className="min-h-screen bg-[#07070b] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md gm-surface rounded-3xl border border-rose-500/30 p-8 text-center space-y-4">
          <ShieldAlert className="h-10 w-10 text-rose-400 mx-auto" />
          <h1 className="text-2xl font-black">Creator Account Suspended</h1>
          <p className="text-xs text-slate-400">
            Your Creator Studio privileges have been suspended by the platform administrator.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold"
          >
            Back to Public Player
          </Link>
        </div>
      </div>
    );
  }

  if (gate === "creator_login_required") {
    return (
      <div className="min-h-screen bg-[#07070b] text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md gm-surface gm-rainbow-border rounded-3xl p-7 space-y-5">
          <div className="flex justify-center">
            <BrandLogo variant="compact" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-xl font-black">Verify Creator Credentials</h1>
            <p className="text-xs text-slate-400">
              Google session verified. Enter your Creator username and password to unlock Creator Studio.
            </p>
          </div>

          {loginError && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleCreatorUnlock} className="space-y-3.5">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="Creator username"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Creator password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
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
            <div className="flex justify-between text-[11px]">
              <Link href="/auth/?mode=creator-recovery" className="text-purple-400 hover:underline">
                Forgot creator password?
              </Link>
              <Link href="/" className="text-slate-400 hover:text-white">
                Back to Player
              </Link>
            </div>
            <button
              type="submit"
              disabled={verifyingLogin}
              className="w-full py-3 rounded-xl gm-rainbow-gradient text-white font-bold text-sm disabled:opacity-60"
            >
              {verifyingLogin ? "Verifying..." : "Unlock Creator Studio"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (gate !== "authorized") {
    return (
      <div className="min-h-screen bg-[#07070b] flex items-center justify-center">
        <BrandLogo variant="loading" />
      </div>
    );
  }

  return <StudioShell>{children}</StudioShell>;
}
