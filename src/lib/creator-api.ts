"use client";

import { getSupabaseBrowserClient } from "./supabase/client";
import { AppError, reportClientEvent } from "./errors";
import {
  ALLOWED_AUDIO_EXTENSIONS,
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_AUDIO_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  sanitizeText,
  uniqueSlug,
} from "./security";
import type {
  Creator,
  CreatorCredential,
  SongSubmission,
  Track,
} from "@/types/music";

async function invokeMusicGateway<T = Record<string, unknown>>(
  body: Record<string, unknown>
): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new AppError("Supabase client unavailable.", "UNCONFIGURED");

  const { data, error } = await supabase.functions.invoke("music-gateway", { body });
  if (error) {
    throw new AppError(error.message || "Edge function request failed.", "GATEWAY_ERROR");
  }
  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new AppError(String(data.error), "GATEWAY_REJECTED");
  }
  return data as T;
}

export async function fetchMyCreatorState(): Promise<{
  creator: Creator | null;
  credentials: CreatorCredential[];
}> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { creator: null, credentials: [] };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { creator: null, credentials: [] };

  const [{ data: creator }, { data: credentials }] = await Promise.all([
    supabase.from("creators").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("creator_credentials")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    creator: (creator as Creator | null) || null,
    credentials: (credentials as CreatorCredential[] | null) || [],
  };
}

export async function setupCreatorAccountClient(params: {
  username: string;
  stageName: string;
  bio?: string;
  country?: string;
  primaryGenre?: string;
  socialLinks?: Record<string, string>;
}): Promise<Creator> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new AppError("Supabase unavailable.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError("Sign in required to create a Creator account.", "UNAUTHORIZED", 401);

  const cleanUsername = params.username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  if (!/^[a-z0-9_]{3,32}$/.test(cleanUsername)) {
    throw new AppError("Username must be 3-32 lowercase letters, numbers, or underscores.");
  }

  const stageName = sanitizeText(params.stageName, 120);
  if (stageName.length < 2) {
    throw new AppError("Stage name must be at least 2 characters.");
  }

  const { data, error } = await supabase
    .from("creators")
    .upsert(
      {
        user_id: user.id,
        username: cleanUsername,
        stage_name: stageName,
        bio: sanitizeText(params.bio || "", 1500) || null,
        country: sanitizeText(params.country || "", 80) || null,
        primary_genre: sanitizeText(params.primaryGenre || "", 80) || null,
        social_links: params.socialLinks || {},
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(error?.message || "Failed to save creator profile.");
  }
  reportClientEvent("creator.profile.saved", { username: cleanUsername });
  return data as Creator;
}

export async function submitCreatorCredentialsClient(params: {
  creatorId: string;
  legalName: string;
  idDocumentType: string;
  portfolioUrl?: string;
  copyrightDeclarationAccepted: boolean;
  documentFile?: File | null;
}): Promise<CreatorCredential> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new AppError("Supabase unavailable.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError("Authentication required.", "UNAUTHORIZED", 401);
  if (!params.copyrightDeclarationAccepted) {
    throw new AppError("You must accept the copyright and ownership declaration.");
  }

  let documentPath: string | null = null;
  if (params.documentFile) {
    const ext = params.documentFile.name.split(".").pop()?.toLowerCase() || "pdf";
    const signed = await invokeMusicGateway<{
      bucket: string;
      path: string;
      token: string;
    }>({
      action: "get-upload-url",
      kind: "verification",
      extension: ext,
      sizeBytes: params.documentFile.size,
      title: `kyc-${user.id.slice(0, 8)}`,
    });

    const { error: upErr } = await supabase.storage
      .from(signed.bucket)
      .uploadToSignedUrl(signed.path, signed.token, params.documentFile);
    if (upErr) throw new AppError(`Document upload failed: ${upErr.message}`);
    documentPath = signed.path;
  }

  const { data, error } = await supabase
    .from("creator_credentials")
    .insert({
      creator_id: params.creatorId,
      user_id: user.id,
      legal_name: sanitizeText(params.legalName, 160),
      id_document_type: sanitizeText(params.idDocumentType, 60),
      document_bucket: "creator-verification-docs",
      document_path: documentPath,
      portfolio_url: sanitizeText(params.portfolioUrl || "", 300) || null,
      copyright_declaration_accepted: true,
      status: "PENDING",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new AppError(error?.message || "Failed to submit creator verification.");
  }

  await supabase
    .from("creators")
    .update({ verification_status: "pending" })
    .eq("id", params.creatorId)
    .eq("user_id", user.id);

  reportClientEvent("creator.verification.submitted", { creatorId: params.creatorId });
  return data as CreatorCredential;
}

export async function createCreatorSongDraftClient(params: {
  creatorId: string;
  artistId?: string;
  albumId?: string;
  genreId: string;
  title: string;
  description?: string;
  releaseDate?: string;
  language?: string;
  lyrics?: string;
  durationSeconds: number;
  copyrightOwner?: string;
  isrc?: string;
  explicit?: boolean;
  copyrightDeclaration: boolean;
  submitForReview: boolean;
  submissionNotes?: string;
  audioFile: File;
  coverFile: File;
  onProgress?: (pct: number) => void;
}): Promise<Track> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new AppError("Supabase unavailable.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError("Authentication required.", "UNAUTHORIZED", 401);

  const audioExt = `.${params.audioFile.name.split(".").pop()?.toLowerCase() || ""}`;
  if (!ALLOWED_AUDIO_EXTENSIONS.has(audioExt)) {
    throw new AppError("Unsupported audio format. Allowed: MP3, M4A, WAV, OGG.");
  }
  if (params.audioFile.size > MAX_AUDIO_SIZE_BYTES) {
    throw new AppError("Audio file exceeds maximum size limit.");
  }

  const coverExt = `.${params.coverFile.name.split(".").pop()?.toLowerCase() || ""}`;
  if (!ALLOWED_IMAGE_EXTENSIONS.has(coverExt)) {
    throw new AppError("Unsupported cover image format. Allowed: JPG, PNG, WEBP.");
  }
  if (params.coverFile.size > MAX_IMAGE_SIZE_BYTES) {
    throw new AppError("Cover image exceeds maximum size limit.");
  }

  params.onProgress?.(10);
  const [audioSigned, coverSigned] = await Promise.all([
    invokeMusicGateway<{ bucket: string; path: string; token: string }>({
      action: "get-upload-url",
      kind: "audio",
      extension: audioExt.slice(1),
      sizeBytes: params.audioFile.size,
      title: params.title,
    }),
    invokeMusicGateway<{ bucket: string; path: string; token: string }>({
      action: "get-upload-url",
      kind: "cover",
      extension: coverExt.slice(1),
      sizeBytes: params.coverFile.size,
      title: `${params.title}-cover`,
    }),
  ]);

  params.onProgress?.(35);
  const { error: audioUpErr } = await supabase.storage
    .from(audioSigned.bucket)
    .uploadToSignedUrl(audioSigned.path, audioSigned.token, params.audioFile);
  if (audioUpErr) throw new AppError(`Audio upload failed: ${audioUpErr.message}`);

  params.onProgress?.(65);
  const { error: coverUpErr } = await supabase.storage
    .from(coverSigned.bucket)
    .uploadToSignedUrl(coverSigned.path, coverSigned.token, params.coverFile);
  if (coverUpErr) {
    await supabase.storage.from(audioSigned.bucket).remove([audioSigned.path]);
    throw new AppError(`Cover upload failed: ${coverUpErr.message}`);
  }

  const coverUrl = supabase.storage.from(coverSigned.bucket).getPublicUrl(coverSigned.path).data.publicUrl;
  const slug = uniqueSlug(params.title);

  params.onProgress?.(85);
  const { data: inserted, error: insErr } = await supabase
    .from("tracks")
    .insert({
      title: sanitizeText(params.title, 200),
      slug,
      creator_id: params.creatorId,
      owner_id: user.id,
      artist_id: params.artistId || null,
      album_id: params.albumId || null,
      genre_id: params.genreId,
      audio_bucket: audioSigned.bucket,
      audio_path: audioSigned.path,
      audio_url: null,
      cover_url: coverUrl,
      cover_path: coverSigned.path,
      duration_seconds: Math.max(0, Math.round(params.durationSeconds || 0)),
      file_size_bytes: params.audioFile.size,
      mime_type: params.audioFile.type || "audio/mpeg",
      description: sanitizeText(params.description || "", 2000) || null,
      release_date: params.releaseDate || null,
      language: sanitizeText(params.language || "Hindi", 60) || "Hindi",
      lyrics: sanitizeText(params.lyrics || "", 15000) || null,
      copyright_declaration: params.copyrightDeclaration,
      copyright_owner: sanitizeText(params.copyrightOwner || "", 160) || null,
      isrc: sanitizeText(params.isrc || "", 32) || null,
      explicit: Boolean(params.explicit),
      status: "DRAFT",
      is_published: false,
      is_featured: false,
      is_downloadable: false,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (insErr || !inserted) {
    await Promise.all([
      supabase.storage.from(audioSigned.bucket).remove([audioSigned.path]),
      supabase.storage.from(coverSigned.bucket).remove([coverSigned.path]),
    ]);
    throw new AppError(insErr?.message || "Failed to save song draft.");
  }

  if (params.submitForReview) {
    await submitSongForReviewClient(inserted.id, params.submissionNotes);
  }

  params.onProgress?.(100);
  reportClientEvent("creator.song.created", { trackId: inserted.id, submitted: params.submitForReview });
  return inserted as Track;
}

export async function submitSongForReviewClient(
  trackId: string,
  notes?: string
): Promise<SongSubmission> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new AppError("Supabase unavailable.");

  const { data, error } = await supabase.rpc("submit_song_for_review", {
    target_track_id: trackId,
    p_notes: sanitizeText(notes || "", 1000) || null,
  });

  if (error || !data) {
    throw new AppError(error?.message || "Failed to submit song for review.");
  }
  return data as SongSubmission;
}

export async function fetchCreatorSongsClient(): Promise<{
  tracks: Track[];
  submissions: SongSubmission[];
}> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { tracks: [], submissions: [] };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { tracks: [], submissions: [] };

  const [{ data: tracks }, { data: submissions }] = await Promise.all([
    supabase
      .from("tracks")
      .select("*, artist:artists(id, name, slug, image_url), album:albums(id, title, slug, cover_url), genre:genres(id, name, slug, color_accent)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("song_submissions")
      .select("*")
      .eq("owner_id", user.id)
      .order("submitted_at", { ascending: false }),
  ]);

  return {
    tracks: (tracks || []) as unknown as Track[],
    submissions: (submissions || []) as SongSubmission[],
  };
}

export async function fetchCreatorSongByIdClient(trackId: string): Promise<{
  track: Track | null;
  submissions: SongSubmission[];
}> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !trackId) return { track: null, submissions: [] };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { track: null, submissions: [] };

  const [{ data: track }, { data: submissions }] = await Promise.all([
    supabase
      .from("tracks")
      .select("*, artist:artists(id, name, slug, image_url), album:albums(id, title, slug, cover_url), genre:genres(id, name, slug, color_accent)")
      .eq("id", trackId)
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("song_submissions")
      .select("*")
      .eq("track_id", trackId)
      .eq("owner_id", user.id)
      .order("submitted_at", { ascending: false }),
  ]);

  return {
    track: (track as unknown as Track | null) || null,
    submissions: (submissions || []) as SongSubmission[],
  };
}

export async function getAuthorizedStreamUrlClient(trackId: string): Promise<string | null> {
  try {
    const res = await invokeMusicGateway<{ url: string }>({
      action: "get-stream-url",
      trackId,
    });
    return res.url;
  } catch {
    return null;
  }
}

export async function updateCreatorSongDraftClient(
  trackId: string,
  updates: {
    title: string;
    description?: string;
    language?: string;
    releaseDate?: string;
    lyrics?: string;
    copyrightOwner?: string;
  }
): Promise<Track> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new AppError("Supabase unavailable.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError("Authentication required.", "UNAUTHORIZED", 401);

  const { data, error } = await supabase
    .from("tracks")
    .update({
      title: sanitizeText(updates.title, 200),
      description: sanitizeText(updates.description || "", 2000) || null,
      language: sanitizeText(updates.language || "Hindi", 60) || "Hindi",
      release_date: updates.releaseDate || null,
      lyrics: sanitizeText(updates.lyrics || "", 15000) || null,
      copyright_owner: sanitizeText(updates.copyrightOwner || "", 160) || null,
    })
    .eq("id", trackId)
    .eq("owner_id", user.id)
    .in("status", ["DRAFT", "CHANGES_REQUESTED", "REJECTED"])
    .select("*, artist:artists(id, name, slug, image_url), album:albums(id, title, slug, cover_url), genre:genres(id, name, slug, color_accent)")
    .single();

  if (error || !data) {
    throw new AppError(error?.message || "Unable to update song. Only drafts or songs needing changes can be edited.");
  }
  reportClientEvent("creator.song.updated", { trackId });
  return data as unknown as Track;
}

export async function deleteCreatorDraftClient(trackId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new AppError("Supabase unavailable.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError("Authentication required.", "UNAUTHORIZED", 401);

  const { data: existing } = await supabase
    .from("tracks")
    .select("id, status, audio_bucket, audio_path, cover_path")
    .eq("id", trackId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!existing) throw new AppError("Song not found or access denied.", "NOT_FOUND", 404);
  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    throw new AppError("Only DRAFT or REJECTED songs can be deleted.");
  }

  const { error } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId)
    .eq("owner_id", user.id);

  if (error) throw new AppError(error.message || "Failed to delete draft.");

  if (existing.audio_bucket && existing.audio_path) {
    await supabase.storage.from(existing.audio_bucket).remove([existing.audio_path]).catch(() => {});
  }
  if (existing.cover_path) {
    await supabase.storage.from("music-covers").remove([existing.cover_path]).catch(() => {});
  }
  reportClientEvent("creator.song.deleted", { trackId });
}
