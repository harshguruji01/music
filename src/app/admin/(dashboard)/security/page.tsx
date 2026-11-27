"use client";

import { CheckCircle2, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { getAdminAllowlist, getAdminSessionMaxAgeSeconds } from "@/lib/security";

export default function AdminSecurityPage() {
  const allowlist = getAdminAllowlist();
  const maxAgeHours = Math.round(getAdminSessionMaxAgeSeconds() / 3600);

  const controls = [
    {
      title: "Allowlisted Administrator Identity",
      detail: `Only ${allowlist.join(", ")} is permitted to enter the Admin Control Center.`,
    },
    {
      title: "PostgreSQL RLS Dual-Check Enforcement",
      detail: "public.is_admin() verifies BOTH allowlist email AND explicit role='admin' in public.user_roles at the database layer.",
    },
    {
      title: "Zero Public Admin Registration",
      detail: "Public signups automatically receive role='user' and RLS forbids modifying user_roles from any client.",
    },
    {
      title: "Brute-Force Rate Limiting & Lockout",
      detail: "Login attempts are rate-limited (5 failures per 15-minute window trigger lockout and audit logging).",
    },
    {
      title: "Private Draft Audio Isolation",
      detail: "Unpublished tracks reside in the non-public draft-audio bucket and require signed admin URLs for preview.",
    },
    {
      title: "Session Expiration Guard",
      detail: `Admin session expires automatically after ${maxAgeHours} hours.`,
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Security Posture</h1>
        <p className="text-sm text-slate-400 mt-1">
          Zero-trust authentication and PostgreSQL RLS enforcement for Guru Music by HarshGuruJi.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {controls.map((c) => (
          <div key={c.title} className="gm-surface rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{c.title}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{c.detail}</p>
          </div>
        ))}
      </div>

      <div className="gm-surface gm-rainbow-border rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <KeyRound className="h-4 w-4" />
          <span>Password & Provisioning Policy</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          No administrator password is stored in source code or GitHub. To rotate or set your private
          password via Supabase Auth, run <code className="px-1.5 py-0.5 rounded bg-white/10">pnpm admin:provision</code>{" "}
          from a trusted terminal with your <code className="px-1.5 py-0.5 rounded bg-white/10">SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
          <Lock className="h-3.5 w-3.5" />
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Service role key is never bundled in static HTML/JS output.</span>
        </div>
      </div>
    </div>
  );
}
