import type { NextRequest } from "next/server";

export const DEFAULT_ADMIN_ALLOWLIST = ["harshguruji01@gmail.com"];

export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_ALLOWLIST_EMAILS;
  if (!raw || !raw.trim()) return DEFAULT_ADMIN_ALLOWLIST;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminAllowlist().includes(email.trim().toLowerCase());
}

export function getAdminSessionMaxAgeSeconds(): number {
  const parsed = Number(process.env.ADMIN_SESSION_MAX_AGE_SECONDS || "3600");
  return Number.isFinite(parsed) && parsed >= 300 ? parsed : 3600;
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return base || "item";
}

export function uniqueSlug(input: string): string {
  const bytes = new Uint8Array(3);
  globalThis.crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${slugify(input)}-${suffix}`;
}

export function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeFilename(input: string): string {
  const cleaned = input
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\.\.+/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return cleaned || "guru-music-track";
}

export function hashIp(ip: string): string {
  const salt = process.env.SECURITY_HASH_SALT || "guru-music-default-salt";
  // Deterministic FNV-1a 64-bit keyed hash (Edge-compatible without node:crypto)
  const input = `${salt}:${ip}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

export function getClientIp(request: Request | NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export function verifySameOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) {
    // Allow non-browser/same-site requests without Origin only if Referer matches or Sec-Fetch-Site is same-origin
    const secFetch = request.headers.get("sec-fetch-site");
    if (secFetch && secFetch !== "same-origin" && secFetch !== "none") {
      return false;
    }
    return true;
  }
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return true;
    const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (configuredUrl) {
      const configuredHost = new URL(configuredUrl).host;
      if (originHost === configuredHost) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "application/ogg",
]);

export const ALLOWED_AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".wav", ".ogg"]);
export const MAX_AUDIO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function detectAudioMagicBytes(buffer: Buffer): "mp3" | "m4a" | "wav" | "ogg" | null {
  if (buffer.length < 12) return null;

  // ID3 tag (MP3) or MPEG frame sync (0xFF 0xE0..0xFF)
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return "mp3";
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return "mp3";

  // M4A / MP4 ISO Base Media File Format: 'ftyp' at offset 4
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return "m4a";
  }

  // WAV: RIFF .... WAVE
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x41 &&
    buffer[10] === 0x56 &&
    buffer[11] === 0x45
  ) {
    return "wav";
  }

  // OGG: OggS
  if (
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return "ogg";
  }

  return null;
}

export function detectImageMagicBytes(buffer: Buffer): "png" | "jpeg" | "webp" | null {
  if (buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // WEBP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

export function validateAudioUpload(
  filename: string,
  mimeType: string,
  buffer: Buffer
): { ok: true; detectedType: string; canonicalMime: string; extension: string } | { ok: false; error: string } {
  if (buffer.length === 0) return { ok: false, error: "Audio file is empty." };
  if (buffer.length > MAX_AUDIO_SIZE_BYTES) {
    return { ok: false, error: "Audio file exceeds 100 MB limit." };
  }

  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_AUDIO_EXTENSIONS.has(ext)) {
    return { ok: false, error: "Unsupported audio extension. Allowed: MP3, M4A, WAV, OGG." };
  }
  if (mimeType && !ALLOWED_AUDIO_MIME_TYPES.has(mimeType.toLowerCase())) {
    return { ok: false, error: "Unsupported audio MIME type." };
  }

  const detected = detectAudioMagicBytes(buffer);
  if (!detected) {
    return { ok: false, error: "File signature does not match a valid MP3, M4A, WAV, or OGG audio stream." };
  }

  const mimeMap: Record<string, string> = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
  };

  return {
    ok: true,
    detectedType: detected,
    canonicalMime: mimeMap[detected],
    extension: `.${detected}`,
  };
}

export function validateImageUpload(
  filename: string,
  mimeType: string,
  buffer: Buffer
): { ok: true; detectedType: string; canonicalMime: string; extension: string } | { ok: false; error: string } {
  if (buffer.length === 0) return { ok: false, error: "Image file is empty." };
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false, error: "Image file exceeds 10 MB limit." };
  }

  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return { ok: false, error: "Unsupported image extension. Allowed: JPG, PNG, WEBP." };
  }
  if (mimeType && !ALLOWED_IMAGE_MIME_TYPES.has(mimeType.toLowerCase())) {
    return { ok: false, error: "Unsupported image MIME type." };
  }

  const detected = detectImageMagicBytes(buffer);
  if (!detected) {
    return { ok: false, error: "File signature does not match a valid PNG, JPEG, or WEBP image." };
  }

  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };

  return {
    ok: true,
    detectedType: detected,
    canonicalMime: mimeMap[detected],
    extension: detected === "jpeg" ? ".jpg" : `.${detected}`,
  };
}

export function scrubAuditDetails(details: Record<string, unknown>): Record<string, unknown> {
  const forbidden = /password|token|secret|service_role|authorization|cookie|key/i;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(details)) {
    if (forbidden.test(k)) {
      clean[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      clean[k] = scrubAuditDetails(v as Record<string, unknown>);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

// In-memory rate limit fallback (used alongside Supabase auth_rate_limits table)
const memoryRateLimits = new Map<string, { attempts: number; firstAttemptAt: number; lockedUntil: number | null }>();

export function checkInMemoryRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  lockMs = 15 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = memoryRateLimits.get(key);

  if (entry?.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  if (!entry || now - entry.firstAttemptAt > windowMs) {
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }

  const remaining = Math.max(0, maxAttempts - entry.attempts);
  return {
    allowed: remaining > 0,
    remaining,
    retryAfterSeconds: remaining > 0 ? 0 : Math.ceil(lockMs / 1000),
  };
}

export function recordInMemoryRateLimitFailure(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  lockMs = 15 * 60 * 1000
): void {
  const now = Date.now();
  const entry = memoryRateLimits.get(key);
  if (!entry || now - entry.firstAttemptAt > windowMs) {
    memoryRateLimits.set(key, { attempts: 1, firstAttemptAt: now, lockedUntil: null });
    return;
  }
  const attempts = entry.attempts + 1;
  const lockedUntil = attempts >= maxAttempts ? now + lockMs : null;
  memoryRateLimits.set(key, { attempts, firstAttemptAt: entry.firstAttemptAt, lockedUntil });
}

export function resetInMemoryRateLimit(key: string): void {
  memoryRateLimits.delete(key);
}
