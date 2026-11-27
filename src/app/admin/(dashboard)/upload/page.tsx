"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  Image as ImageIcon,
  RefreshCw,
  Upload,
} from "lucide-react";
import type { Album, Artist, Genre } from "@/types/music";
import { formatBytes, formatDuration } from "@/lib/format";
import {
  fetchAdminAlbumsClient,
  fetchAdminArtistsClient,
  fetchAdminGenresClient,
  uploadTrackClient,
} from "@/lib/admin-api";

export default function AdminUploadPage() {
  const router = useRouter();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);

  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState("");
  const [genreId, setGenreId] = useState("");
  const [albumId, setAlbumId] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [lyrics, setLyrics] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isDownloadable, setIsDownloadable] = useState(true);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchAdminArtistsClient(),
      fetchAdminAlbumsClient(),
      fetchAdminGenresClient(),
    ]).then(([aList, alList, gList]) => {
      setArtists(aList);
      setAlbums(alList);
      setGenres(gList);
      if (aList[0]) setArtistId(aList[0].id);
      if (gList[0]) setGenreId(gList[0].id);
    });
  }, []);

  const handleAudioPick = (file: File | null) => {
    if (!file) return;
    setError(null);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioPreviewUrl(url);
    if (!title) {
      setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    }
    const probe = document.createElement("audio");
    probe.src = url;
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration)) {
        setDurationSeconds(Math.round(probe.duration));
      }
    };
  };

  const handleCoverPick = (file: File | null) => {
    if (!file) return;
    setError(null);
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
  };

  const startUpload = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!title.trim() || !artistId || !genreId || !audioFile || !coverFile) {
      setError("Please fill all required fields (Title, Artist, Genre, Audio file, and Cover image).");
      return;
    }

    setUploading(true);
    setProgress(5);
    try {
      const inserted = await uploadTrackClient({
        title: title.trim(),
        artistId,
        genreId,
        albumId: albumId || undefined,
        description,
        releaseDate: releaseDate || undefined,
        language,
        lyrics,
        durationSeconds,
        isPublished,
        isFeatured,
        isDownloadable,
        allowDuplicate,
        audioFile,
        coverFile,
        onProgress: setProgress,
      });
      setSuccessMsg(
        `Uploaded "${inserted.title}" (${isPublished ? "Published on public player" : "Saved as private draft"}).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Upload Music</h1>
        <p className="text-sm text-slate-400 mt-1">
          Supports MP3, M4A, WAV, and OGG up to 100 MB. Draft uploads go into the private{" "}
          <code>draft-audio</code> bucket.
        </p>
      </div>

      {artists.length === 0 && (
        <div className="rounded-2xl bg-amber-500/15 border border-amber-500/30 p-4 text-xs text-amber-200 flex items-center justify-between gap-4">
          <span>You need at least one artist profile before uploading a track.</span>
          <button
            type="button"
            onClick={() => router.push("/admin/artists/")}
            className="px-3 py-1.5 rounded-lg bg-amber-400 text-black font-bold shrink-0"
          >
            Create Artist
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-500/15 border border-rose-500/30 p-4 text-xs text-rose-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          {audioFile && coverFile && !uploading && (
            <button
              type="button"
              onClick={startUpload}
              className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-semibold inline-flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          )}
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-xs text-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin/library/")}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-bold shrink-0"
          >
            Open Library
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleAudioPick(e.dataTransfer.files?.[0] || null);
          }}
          className="gm-surface rounded-2xl p-6 border-dashed border-2 border-white/15 hover:border-purple-400/60 transition-colors cursor-pointer flex flex-col items-center justify-center text-center gap-3"
        >
          <input
            type="file"
            accept=".mp3,.m4a,.wav,.ogg,audio/*"
            className="hidden"
            onChange={(e) => handleAudioPick(e.target.files?.[0] || null)}
          />
          <FileAudio className="h-9 w-9 text-blue-400" />
          <div>
            <p className="text-sm font-bold">
              {audioFile ? audioFile.name : "Drop Audio File or Click to Browse *"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {audioFile
                ? `${formatBytes(audioFile.size)} • ${formatDuration(durationSeconds)}`
                : "MP3, M4A, WAV, OGG (max 100 MB)"}
            </p>
          </div>
          {audioPreviewUrl && (
            <audio controls src={audioPreviewUrl} className="w-full mt-2" onClick={(e) => e.stopPropagation()} />
          )}
        </label>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleCoverPick(e.dataTransfer.files?.[0] || null);
          }}
          className="gm-surface rounded-2xl p-6 border-dashed border-2 border-white/15 hover:border-purple-400/60 transition-colors cursor-pointer flex flex-col items-center justify-center text-center gap-3"
        >
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/*"
            className="hidden"
            onChange={(e) => handleCoverPick(e.target.files?.[0] || null)}
          />
          {coverPreviewUrl ? (
            <div className="relative h-28 w-28 rounded-xl overflow-hidden">
              <Image src={coverPreviewUrl} alt="Artwork preview" fill className="object-cover" />
            </div>
          ) : (
            <ImageIcon className="h-9 w-9 text-emerald-400" />
          )}
          <div>
            <p className="text-sm font-bold">
              {coverFile ? coverFile.name : "Drop Cover Artwork or Click to Browse *"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {coverFile ? formatBytes(coverFile.size) : "JPG, PNG, WEBP (max 10 MB)"}
            </p>
          </div>
        </label>
      </div>

      <div className="gm-surface rounded-2xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Song Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter track title"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Artist *</label>
            <select
              value={artistId}
              onChange={(e) => setArtistId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            >
              <option value="">Select artist...</option>
              {artists.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Genre *</label>
            <select
              value={genreId}
              onChange={(e) => setGenreId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            >
              <option value="">Select genre...</option>
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Album (optional)</label>
            <select
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
            >
              <option value="">Single / No album</option>
              {albums.map((al) => (
                <option key={al.id} value={al.id}>
                  {al.title}
                </option>
              ))}
            </select>
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
            <label className="text-xs font-semibold text-slate-300">Language</label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="Hindi, English, Punjabi..."
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
            placeholder="Track story, credits, or mood notes..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Lyrics (optional)</label>
          <textarea
            rows={3}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="Authorized lyrics..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm"
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="accent-emerald-500" />
            Publish immediately
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-amber-500" />
            Feature on homepage
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={isDownloadable} onChange={(e) => setIsDownloadable(e.target.checked)} className="accent-blue-500" />
            Allow public download
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={allowDuplicate} onChange={(e) => setAllowDuplicate(e.target.checked)} className="accent-purple-500" />
            Allow duplicate audio
          </label>
        </div>

        {uploading && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs">
              <span>Uploading audio & artwork...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full gm-rainbow-gradient transition-all duration-150" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={uploading}
            onClick={startUpload}
            className="px-6 py-3 rounded-xl gm-rainbow-gradient text-white font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? `Uploading (${progress}%)...` : isPublished ? "Upload & Publish" : "Save as Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}
