"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { completeGoogleOAuthCallback } from "@/lib/music-auth";

function getSafeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/profile/";
  }
  return raw;
}

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth } = useAuth();
  const { showToast } = useToast();

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"verifying" | "done" | "error">("verifying");

  useEffect(() => {
    let active = true;

    async function run() {
      const oauthError = searchParams.get("error");
      const oauthErrorDesc = searchParams.get("error_description");
      if (oauthError) {
        if (!active) return;
        const msg =
          oauthError === "access_denied"
            ? "Google sign-in was cancelled. No account changes were made."
            : oauthErrorDesc || `Google authentication failed (${oauthError}).`;
        setError(msg);
        setStatus("error");
        return;
      }

      const code = searchParams.get("code");
      const nextPath = getSafeNextPath(searchParams.get("next"));

      try {
        const res = await completeGoogleOAuthCallback(code);
        if (!active) return;
        if (!res.ok) {
          setError(res.error || "Unable to complete Google sign-in.");
          setStatus("error");
          return;
        }
        await refreshAuth();
        if (!active) return;
        setStatus("done");
        showToast("Signed in with Google!", "success");
        router.replace(nextPath);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Network error during Google sign-in.");
        setStatus("error");
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [searchParams, refreshAuth, showToast, router]);

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-8 px-4">
      <div className="w-full max-w-md gm-surface gm-rainbow-border rounded-3xl p-8 text-center space-y-5 shadow-2xl">
        <div className="flex justify-center">
          <BrandLogo variant={status === "verifying" ? "loading" : "full"} />
        </div>

        {status === "verifying" && (
          <div className="space-y-1.5">
            <h1 className="text-xl font-black">Completing Google Sign-In</h1>
            <p className="text-xs text-[var(--gm-text-muted)]">
              Verifying your Google identity and syncing your Guru Music session...
            </p>
          </div>
        )}

        {status === "done" && (
          <div className="space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <h1 className="text-xl font-black">Authenticated</h1>
            <p className="text-xs text-[var(--gm-text-muted)]">Redirecting you now...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3.5 text-xs text-rose-300 flex items-start gap-2 text-left">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <Link
              href="/auth/"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl gm-rainbow-gradient text-white text-xs font-bold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GoogleOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center">
          <BrandLogo variant="loading" />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
