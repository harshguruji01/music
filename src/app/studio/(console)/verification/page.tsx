"use client";

import React, { useEffect, useState } from "react";
import { BadgeCheck, FileCheck2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  fetchMyCreatorState,
  submitCreatorCredentialsClient,
} from "@/lib/creator-api";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { CreatorCredential } from "@/types/music";

export default function StudioVerificationPage() {
  const { creator, refreshAuth } = useAuth();
  const { showToast } = useToast();

  const [credentials, setCredentials] = useState<CreatorCredential[]>([]);
  const [legalName, setLegalName] = useState("");
  const [docType, setDocType] = useState("government_id");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyCreatorState().then((res) => setCredentials(res.credentials));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creator) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await submitCreatorCredentialsClient({
        creatorId: creator.id,
        legalName,
        idDocumentType: docType,
        portfolioUrl,
        copyrightDeclarationAccepted: accepted,
        documentFile: docFile,
      });
      setCredentials((prev) => [created, ...prev]);
      await refreshAuth();
      showToast("Verification credentials submitted for admin review.", "success");
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
          <BadgeCheck className="h-7 w-7 text-emerald-400" />
          Creator Verification
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Submit identity & copyright compliance credentials stored securely in the private{" "}
          <code>creator-verification-docs</code> bucket.
        </p>
      </div>

      <div className="gm-surface rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Current Verification Status</p>
          <p className="text-base font-bold capitalize mt-0.5">
            {creator?.verification_status || "unverified"}
          </p>
        </div>
        <ShieldCheck
          className={`h-7 w-7 ${creator?.is_verified ? "text-emerald-400" : "text-amber-400"}`}
        />
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3.5 text-xs text-rose-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="gm-surface rounded-2xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Legal Full Name *</label>
            <input
              type="text"
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            >
              <option value="government_id">Government ID</option>
              <option value="passport">Passport</option>
              <option value="music_label_registration">Label / Studio Registration</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Official Portfolio / Channel URL</label>
          <input
            type="url"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">
            Supporting Document (JPG, PNG, WEBP, PDF — private)
          </label>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-300"
          />
        </div>

        <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I declare that I hold full legal rights or distribution authorization for all music submitted under this Creator account.
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl gm-rainbow-gradient text-white text-xs font-bold disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Verification"}
        </button>
      </form>

      {credentials.length > 0 && (
        <div className="gm-surface rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-blue-400" />
            Verification History
          </h2>
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-semibold">{cred.legal_name}</p>
                <p className="text-slate-400">
                  {cred.id_document_type} • {formatDate(cred.created_at)}
                </p>
                {cred.reviewer_notes && (
                  <p className="text-amber-300 mt-1">Reviewer note: {cred.reviewer_notes}</p>
                )}
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white/10 font-bold">{cred.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
