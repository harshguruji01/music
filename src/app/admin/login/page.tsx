"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Database, Lock, Mail, ShieldCheck } from "lucide-react";
import { AdminBrandLogo } from "@/components/admin/AdminBrandLogo";
import { signInAdminClient } from "@/lib/admin-api";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(() => isSupabasePublicConfigured());
  const [sbUrl, setSbUrl] = useState("");
  const [sbAnon, setSbAnon] = useState("");
  const [showConn, setShowConn] = useState(!configured);

  const [error, setError] = useState<string | null>(() => {
    if (reason === "expired") return "Your administrator session expired. Please sign in again.";
    if (reason === "unauthorized") return "Unauthorized account. Only the allowlisted administrator may enter.";
    if (reason === "forbidden") return "Administrator role is not provisioned for this account.";
    if (reason === "unconfigured") return "Connect your Supabase project URL & Anon Key below to continue.";
    return null;
  });

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sbUrl.startsWith("https://") || sbAnon.length < 15) {
      setError("Please enter a valid Supabase Project URL (https://...) and Anon Key.");
      return;
    }
    localStorage.setItem(
      "gm_runtime_supabase_v1",
      JSON.stringify({ url: sbUrl.trim(), anonKey: sbAnon.trim() })
    );
    setConfigured(true);
    setShowConn(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signInAdminClient(email.trim(), password);
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.replace("/admin/");
    } catch {
      setError("Network error while authenticating.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070b] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-blue-600/15 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-purple-600/15 blur-[130px]" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <AdminBrandLogo />
        </div>

        <div className="gm-surface gm-rainbow-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Protected Administrator Gateway</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Sign in to Guru Music CMS</h1>
            <p className="text-xs text-slate-400">
              Password-only administrator access verified via Supabase Auth, allowlist check, and PostgreSQL RLS.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {showConn && (
            <form onSubmit={handleSaveSupabase} className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-3">
              <p className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> Connect Supabase Project
              </p>
              <input
                type="url"
                required
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs"
              />
              <input
                type="text"
                required
                value={sbAnon}
                onChange={(e) => setSbAnon(e.target.value)}
                placeholder="Supabase Anon Public Key"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Save Supabase Connection
              </button>
            </form>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-email" className="text-xs font-semibold text-slate-300 block">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter administrator email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-xs font-semibold text-slate-300 block">
                Private Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your provisioned password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !configured}
              className="w-full py-3 rounded-xl gm-rainbow-gradient text-white font-bold text-sm shadow-lg shadow-purple-500/25 hover:opacity-95 disabled:opacity-60 transition-opacity"
            >
              {loading ? "Verifying Session..." : "Enter Control Center"}
            </button>
          </form>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Direct credentials only (OAuth disabled)</span>
            <button
              type="button"
              onClick={() => setShowConn((v) => !v)}
              className="text-blue-400 hover:underline"
            >
              {showConn ? "Hide Config" : "Supabase Config"}
            </button>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07070b]" />}>
      <AdminLoginInner />
    </Suspense>
  );
}
