"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Lock, Mail, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("harshguruji01@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (reason === "expired") return "Your administrator session expired. Please sign in again.";
    if (reason === "unauthorized") return "Unauthorized account. Only the allowlisted administrator may enter.";
    if (reason === "forbidden") return "Administrator role is not provisioned for this account.";
    if (reason === "unconfigured") return "Supabase environment variables are not configured yet.";
    return null;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Sign in failed.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
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
          <BrandLogo variant="admin" />
        </div>

        <div className="gm-surface gm-rainbow-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Protected Administrator Gateway</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Sign in to Guru Music CMS</h1>
            <p className="text-xs text-slate-400">
              Server-verified Supabase authentication with allowlist and role-based access control.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
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
              disabled={loading}
              className="w-full py-3 rounded-xl gm-rainbow-gradient text-white font-bold text-sm shadow-lg shadow-purple-500/25 hover:opacity-95 disabled:opacity-60 transition-opacity"
            >
              {loading ? "Verifying Session..." : "Enter Control Center"}
            </button>
          </form>

          <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 space-y-1">
            <p>
              First-time setup? Run{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200">
                pnpm admin:provision
              </code>{" "}
              after applying Supabase migrations to set your private password.
            </p>
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
