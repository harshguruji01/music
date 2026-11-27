import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_ALLOWLIST = new Set(["harshguruji01@gmail.com"]);

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeSegment(input: string, maxLen = 64): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, maxLen) || "track"
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(500, { error: "Edge Function environment is not configured." });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { error: "Missing bearer authorization token." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) {
    return json(401, { error: "Invalid or expired authentication session." });
  }

  const { data: roleRow } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin =
    Boolean(user.email && ADMIN_ALLOWLIST.has(user.email.toLowerCase())) &&
    roleRow?.role === "admin";

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON request body." });
  }

  const action = String(payload.action || "");

  if (action === "get-upload-url") {
    const kind = String(payload.kind || "audio"); // "audio" | "cover" | "verification"
    const ext = String(payload.extension || "").toLowerCase().replace(/^\./, "");
    const sizeBytes = Number(payload.sizeBytes || 0);
    const titleSlug = sanitizeSegment(String(payload.title || "track"), 48);

    const { data: settings } = await adminClient
      .from("site_settings")
      .select("max_audio_size_mb, max_image_size_mb, allowed_audio_formats, require_creator_verification, creator_uploads_enabled")
      .eq("id", 1)
      .maybeSingle();

    if (kind === "audio") {
      if (settings && settings.creator_uploads_enabled === false && !isAdmin) {
        return json(403, { error: "Creator uploads are currently paused by platform settings." });
      }
      if (settings?.require_creator_verification && !isAdmin) {
        const { data: creator } = await adminClient
          .from("creators")
          .select("is_verified")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!creator?.is_verified) {
          return json(403, { error: "Creator verification is required before uploading songs." });
        }
      }

      const allowed = new Set<string>(settings?.allowed_audio_formats || ["mp3", "m4a", "wav", "ogg"]);
      if (!allowed.has(ext)) {
        return json(400, { error: `Unsupported audio format .${ext}. Allowed: ${Array.from(allowed).join(", ")}` });
      }
      const maxBytes = Number(settings?.max_audio_size_mb || 100) * 1024 * 1024;
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxBytes) {
        return json(400, { error: `Audio size must be between 1 byte and ${settings?.max_audio_size_mb || 100} MB.` });
      }
    } else if (kind === "cover") {
      const allowedImg = new Set(["jpg", "jpeg", "png", "webp"]);
      if (!allowedImg.has(ext)) {
        return json(400, { error: "Unsupported cover format. Allowed: jpg, png, webp." });
      }
      const maxImgBytes = Number(settings?.max_image_size_mb || 10) * 1024 * 1024;
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxImgBytes) {
        return json(400, { error: `Cover image exceeds ${settings?.max_image_size_mb || 10} MB limit.` });
      }
    } else if (kind === "verification") {
      const allowedDoc = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);
      if (!allowedDoc.has(ext)) {
        return json(400, { error: "Unsupported verification document. Allowed: jpg, png, webp, pdf." });
      }
      if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > 10 * 1024 * 1024) {
        return json(400, { error: "Document size must be under 10 MB." });
      }
    } else {
      return json(400, { error: "Invalid upload kind." });
    }

    const bucket =
      kind === "audio"
        ? "artist-uploads"
        : kind === "cover"
          ? "song-artwork"
          : "creator-verification-docs";
    const uniqueSuffix = crypto.randomUUID().slice(0, 8);
    const objectPath = `${user.id}/${titleSlug}-${uniqueSuffix}.${ext === "jpeg" ? "jpg" : ext}`;

    const { data: signed, error: signErr } = await adminClient.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath);
    if (signErr || !signed) {
      return json(500, { error: signErr?.message || "Failed to generate signed upload URL." });
    }

    return json(200, {
      bucket,
      path: objectPath,
      token: signed.token,
      signedUrl: signed.signedUrl,
    });
  }

  if (action === "get-stream-url") {
    const trackId = String(payload.trackId || "");
    if (!trackId) return json(400, { error: "trackId is required." });

    const { data: track } = await adminClient
      .from("tracks")
      .select("id, owner_id, is_published, audio_bucket, audio_path, audio_url")
      .eq("id", trackId)
      .maybeSingle();
    if (!track) return json(404, { error: "Track not found." });

    const allowed = track.is_published || track.owner_id === user.id || isAdmin;
    if (!allowed) {
      return json(403, { error: "Not authorized to stream this track." });
    }

    if (track.audio_bucket === "published-audio") {
      const { data: pub } = adminClient.storage.from("published-audio").getPublicUrl(track.audio_path);
      return json(200, { url: pub.publicUrl, isPublic: true });
    }

    const { data: signed, error: signErr } = await adminClient.storage
      .from(track.audio_bucket)
      .createSignedUrl(track.audio_path, 180);
    if (signErr || !signed) {
      return json(500, { error: signErr?.message || "Unable to authorize stream URL." });
    }
    return json(200, { url: signed.signedUrl, isPublic: false });
  }

  if (action === "moderate-song") {
    if (!isAdmin) {
      return json(403, { error: "Administrator authorization required." });
    }

    const trackId = String(payload.trackId || "");
    const targetStatus = String(payload.newStatus || "");
    const reason = typeof payload.reason === "string" ? payload.reason.slice(0, 1000) : null;
    if (!trackId || !targetStatus) {
      return json(400, { error: "trackId and newStatus are required." });
    }

    const validStatuses = new Set(["APPROVED", "PUBLISHED", "REJECTED", "CHANGES_REQUESTED", "ARCHIVED", "DRAFT"]);
    if (!validStatuses.has(targetStatus)) {
      return json(400, { error: "Invalid moderation status." });
    }

    const { data: track } = await adminClient.from("tracks").select("*").eq("id", trackId).maybeSingle();
    if (!track) return json(404, { error: "Track not found." });

    let nextBucket = track.audio_bucket || "artist-uploads";
    let nextPath = track.audio_path;
    let nextAudioUrl = track.audio_url;

    const targetBucket =
      targetStatus === "PUBLISHED"
        ? "published-audio"
        : targetStatus === "PENDING_REVIEW"
          ? "pending-submissions"
          : track.audio_bucket === "published-audio"
            ? "draft-audio"
            : track.audio_bucket || "artist-uploads";

    if (targetBucket !== nextBucket && track.audio_path) {
      const { data: blob, error: dlErr } = await adminClient.storage.from(nextBucket).download(track.audio_path);
      if (dlErr || !blob) {
        return json(500, { error: `Failed moving audio file: ${dlErr?.message || "download failed"}` });
      }
      const { error: upErr } = await adminClient.storage
        .from(targetBucket)
        .upload(nextPath, blob, { contentType: track.mime_type || "audio/mpeg", upsert: true });
      if (upErr) {
        return json(500, { error: `Failed storing audio in ${targetBucket}: ${upErr.message}` });
      }
      await adminClient.storage.from(nextBucket).remove([track.audio_path]);
      nextBucket = targetBucket;
    }

    nextAudioUrl =
      targetStatus === "PUBLISHED"
        ? adminClient.storage.from("published-audio").getPublicUrl(nextPath).data.publicUrl
        : null;

    const nowIso = new Date().toISOString();
    const { data: updated, error: updErr } = await adminClient
      .from("tracks")
      .update({
        status: targetStatus,
        is_published: targetStatus === "PUBLISHED",
        audio_bucket: nextBucket,
        audio_url: nextAudioUrl,
        approved_at: targetStatus === "APPROVED" || targetStatus === "PUBLISHED" ? track.approved_at || nowIso : track.approved_at,
        published_at: targetStatus === "PUBLISHED" ? track.published_at || nowIso : track.published_at,
        rejection_reason: targetStatus === "REJECTED" || targetStatus === "CHANGES_REQUESTED" ? reason : null,
      })
      .eq("id", trackId)
      .select("*")
      .single();

    if (updErr || !updated) {
      return json(500, { error: updErr?.message || "Failed updating track moderation state." });
    }

    const { data: latestSub } = await adminClient
      .from("song_submissions")
      .select("id")
      .eq("track_id", trackId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSub?.id) {
      await adminClient
        .from("song_submissions")
        .update({
          status: targetStatus === "DRAFT" ? "CHANGES_REQUESTED" : targetStatus,
          reviewer_id: user.id,
          reviewer_notes: reason,
          reviewed_at: nowIso,
        })
        .eq("id", latestSub.id);
    }

    await Promise.all([
      adminClient.from("moderation_logs").insert({
        track_id: trackId,
        submission_id: latestSub?.id || null,
        creator_id: track.creator_id || null,
        admin_id: user.id,
        admin_email: (user.email || "harshguruji01@gmail.com").toLowerCase(),
        action: `track.moderate.${targetStatus.toLowerCase()}`,
        previous_status: track.status,
        new_status: targetStatus,
        reason,
      }),
      adminClient.from("admin_activity_logs").insert({
        admin_id: user.id,
        admin_email: (user.email || "harshguruji01@gmail.com").toLowerCase(),
        action: "admin.song.moderate",
        resource_type: "track",
        resource_id: trackId,
        details: { previousStatus: track.status, newStatus: targetStatus, audioBucket: nextBucket },
        status: "success",
      }),
    ]);

    return json(200, { track: updated });
  }

  return json(400, { error: `Unknown action: ${action}` });
});
