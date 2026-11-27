"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileAudio,
  Image as ImageIcon,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getGenresClient } from "@/lib/public-api";
import { createCreatorSongDraftClient } from "@/lib/creator-api";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatBytes, formatDuration } from "@/lib/format";
import {
  ALLOWED_AUDIO_EXTENSIONS,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_AUDIO_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/lib/security";
import type { Genre } from "@/types/music";

const STEPS = [
  "1. Audio",
  "2. Artwork",
  "3. Song Info",
  "4. Copyright",
  "5. Review & Submit",
];

export default function StudioUploadPage() {
  const router = useRouter();
  const { creator } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(0);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [title, setTitle] = useState("");
  const [genreId, setGenreId] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [releaseDate, setReleaseDate] = useState("");
  const [description, setDescription] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [copyrightOwner, setCopyrightOwner] = useState(creator?.stage_name || "");
  const [isrc, setIsrc] = useState("");
  const [explicit, setExplicit] = useState(false);
  const [copyrightAccepted, setCopyrightAccepted] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState("");

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGenresClient().then((list) => {
      setGenres(list);
      if (list[0]) setGenreId(list[0].id);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
  }, [audioPreviewUrl, coverPreviewUrl]);

  const handleAudioPick = (file: File | null) => {
    if (!file) return;
    setError(null);
    const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    if (!ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
      setError("Unsupported audio format. Allowed: MP3, M4A, WAV, OGG.");
      return;
    }
    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      setError("Audio file exceeds maximum size limit.");
      return;
    }

    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    const probeUrl = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioPreviewUrl(probeUrl);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));

    const probe = document.createElement("audio");
    probe.src = probeUrl;
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration)) setDurationSeconds(Math.round(probe.duration));
    };
    probe.onerror = () => {
      setError("Unable to read audio file metadata. The file may be corrupted or unsupported.");
    };
  };

  const handleCoverPick = (file: File | null) => {
    if (!file) return;
    setError(null);
    const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
      setError("Unsupported image format. Allowed: JPG, PNG, WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Cover image exceeds maximum size limit.");
      return;
    }
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const canGoNext = () => {
    if (step === 0) return Boolean(audioFile);
    if (step === 1) return Boolean(coverFile);
    if (step === 2) return Boolean(title.trim() && genreId);
    if (step === 3) return copyrightAccepted;
    return true;
  };

  const handleUpload = async (submitForReview: boolean) => {
    if (!creator) return;
    setError(null);

    if (!title.trim() || !genreId || !audioFile || !coverFile) {
      setError("Title, Genre, Audio File, and Cover Image are required.");
      return;
    }
    if (!copyrightAccepted) {
      setError("You must confirm copyright & ownership declaration before uploading.");
      return;
    }

    setUploading(true);
    setProgress(5);
    try {
      const track = await createCreatorSongDraftClient({
        creatorId: creator.id,
        artistId: creator.artist_id || undefined,
        genreId,
        title: title.trim(),
        description,
        releaseDate: releaseDate || undefined,
        language,
        lyrics,
        durationSeconds,
        copyrightOwner: copyrightOwner || creator.stage_name,
        isrc,
        explicit,
        copyrightDeclaration: copyrightAccepted,
        submitForReview,
        submissionNotes,
        audioFile,
        coverFile,
        onProgress: setProgress,
      });
      showToast(
        submitForReview
          ? `"${track.title}" uploaded and submitted for review.`
          : `"${track.title}" saved as private draft.`,
        "success"
      );
      router.push(`/studio/songs/view/?id=${encodeURIComponent(track.id)}`);
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const selectedGenreName = genres.find((g) => g.id === genreId)?.name || "Selected Genre";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Upload Music Wizard</h1>
        <p className="text-sm text-slate-400 mt-1">
          Files upload via authorized signed URLs to the private <code>artist-uploads</code> bucket and remain private until approved.
        </p>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => idx < step && setStep(idx)}
            className={`px-2 py-2 rounded-xl text-[11px] font-bold text-center transition-colors ${
              idx === step
                ? "gm-rainbow-gradient text-white"
                : idx < step
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-white/5 text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-4 text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 0 && (
        <div className="gm-surface rounded-2xl p-6 space-y-4">
          <label className="rounded-2xl p-8 border-dashed border-2 border-white/15 hover:border-purple-400/60 cursor-pointer flex flex-col items-center justify-center text-center gap-2">
            <input
              type="file"
              accept=".mp3,.m4a,.wav,.ogg,audio/*"
              className="hidden"
              onChange={(e) => handleAudioPick(e.target.files?.[0] || null)}
            />
            <FileAudio className="h-9 w-9 text-blue-400" />
            <p className="text-sm font-bold">{audioFile ? audioFile.name : "Select or Drop Audio File *"}</p>
            <p className="text-xs text-slate-400">
              {audioFile
                ? `${formatBytes(audioFile.size)} • ${formatDuration(durationSeconds)}`
                : "MP3, M4A, WAV, OGG"}
            </p>
          </label>
          {audioPreviewUrl && (
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Audio Preview:</p>
              <audio controls src={audioPreviewUrl} className="w-full" />
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="gm-surface rounded-2xl p-6 grid md:grid-cols-[1fr_220px] gap-6 items-center">
          <label className="rounded-2xl p-8 border-dashed border-2 border-white/15 hover:border-purple-400/60 cursor-pointer flex flex-col items-center justify-center text-center gap-2">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/*"
              className="hidden"
              onChange={(e) => handleCoverPick(e.target.files?.[0] || null)}
            />
            <ImageIcon className="h-9 w-9 text-emerald-400" />
            <p className="text-sm font-bold">{coverFile ? coverFile.name : "Select Cover Artwork *"}</p>
            <p className="text-xs text-slate-400">
              {coverFile ? formatBytes(coverFile.size) : "JPG, PNG, WEBP (Square recommended)"}
            </p>
          </label>
          <div className="aspect-square w-full max-w-[220px] mx-auto rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
            {coverPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreviewUrl} alt="Cover preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-slate-500">Artwork Preview</span>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="gm-surface rounded-2xl p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Song Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Genre *</label>
              <select
                value={genreId}
                onChange={(e) => setGenreId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              >
                {genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Language</label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Release Date</label>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Copyright Owner</label>
              <input
                type="text"
                value={copyrightOwner}
                onChange={(e) => setCopyrightOwner(e.target.value)}
                placeholder={creator?.stage_name || "Rights holder"}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">ISRC (Optional)</label>
              <input
                type="text"
                value={isrc}
                onChange={(e) => setIsrc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Lyrics (Optional)</label>
            <textarea
              rows={5}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Paste original or authorized lyrics..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={explicit}
              onChange={(e) => setExplicit(e.target.checked)}
            />
            <span>Mark track as Explicit</span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="gm-surface rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="h-5 w-5" />
            <span>Copyright & Distribution Declaration</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5">
            <li>I own or hold valid distribution rights for the submitted audio recording.</li>
            <li>I own or hold authorization for any accompanying lyrics and cover artwork.</li>
            <li>I grant Guru Music permission to stream this work upon platform owner approval.</li>
          </ul>
          <label className="flex items-start gap-2.5 text-xs text-slate-200 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={copyrightAccepted}
              onChange={(e) => setCopyrightAccepted(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I confirm all copyright declarations above and agree to Guru Music&apos;s Creator terms.
            </span>
          </label>
        </div>
      )}

      {step === 4 && (
        <div className="gm-surface rounded-2xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {coverPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreviewUrl}
                alt="Cover preview"
                className="w-32 h-32 rounded-2xl object-cover shrink-0 border border-white/10"
              />
            )}
            <div className="space-y-1.5 text-xs">
              <h2 className="text-xl font-black">{title}</h2>
              <p className="text-slate-300">
                {creator?.stage_name} • {selectedGenreName} • {language} • {formatDuration(durationSeconds)}
              </p>
              {description && <p className="text-slate-400">{description}</p>}
            </div>
          </div>

          {audioPreviewUrl && <audio controls src={audioPreviewUrl} className="w-full" />}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Notes for Moderator (Optional)</label>
            <textarea
              rows={2}
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Optional notes for platform review..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full gm-rainbow-gradient transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-slate-300">Uploading... {progress}%</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => void handleUpload(false)}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-60"
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => void handleUpload(true)}
              className="px-6 py-3 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-2 disabled:opacity-60"
            >
              {uploading ? (
                <>Uploading...</>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Submit for Review
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Wizard Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={step === 0 || uploading}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-4 py-2 rounded-xl gm-surface text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>

        {step < STEPS.length - 1 && (
          <button
            type="button"
            disabled={!canGoNext()}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="px-5 py-2 rounded-xl gm-rainbow-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}

        {step === STEPS.length - 1 && !uploading && (
          <span className="text-xs text-emerald-400 inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Ready to submit
          </span>
        )}
      </div>
    </div>
  );
}
