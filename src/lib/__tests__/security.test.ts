import { describe, expect, it } from "vitest";
import {
  checkInMemoryRateLimit,
  detectAudioMagicBytes,
  detectImageMagicBytes,
  isEmailAllowlisted,
  recordInMemoryRateLimitFailure,
  resetInMemoryRateLimit,
  sanitizeFilename,
  sanitizeText,
  scrubAuditDetails,
  slugify,
  validateAudioUpload,
  validateImageUpload,
  verifySameOrigin,
} from "../security";
import { formatBytes, formatDuration, isValidUuid } from "../format";

describe("Admin allowlist & sanitization", () => {
  it("allows only allowlisted admin email", () => {
    expect(isEmailAllowlisted("harshguruji01@gmail.com")).toBe(true);
    expect(isEmailAllowlisted("HARSHGURUJI01@GMAIL.COM")).toBe(true);
    expect(isEmailAllowlisted("attacker@example.com")).toBe(false);
    expect(isEmailAllowlisted("")).toBe(false);
    expect(isEmailAllowlisted(null)).toBe(false);
  });

  it("sanitizes filenames against path traversal", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("..");
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFilename("Arijit / Song?.mp3")).toBe("Arijit - Song-.mp3");
  });

  it("scrubs secrets from audit log details", () => {
    const scrubbed = scrubAuditDetails({
      title: "Midnight Flow",
      password: "super-secret-password",
      service_role_key: "eyJ...",
      nested: { accessToken: "abc123", ok: true },
    });
    expect(scrubbed.title).toBe("Midnight Flow");
    expect(scrubbed.password).toBe("[REDACTED]");
    expect(scrubbed.service_role_key).toBe("[REDACTED]");
    expect((scrubbed.nested as Record<string, unknown>).accessToken).toBe("[REDACTED]");
    expect((scrubbed.nested as Record<string, unknown>).ok).toBe(true);
  });

  it("strips control chars and builds clean slugs", () => {
    expect(sanitizeText("  Hello\u0000World  ", 50)).toBe("HelloWorld");
    expect(slugify("Music Beyond Limits!")).toBe("music-beyond-limits");
  });
});

describe("Audio & Image signature validation", () => {
  it("detects valid MP3, M4A, WAV, OGG signatures and rejects spoofed files", () => {
    const mp3 = Buffer.from([0x49, 0x44, 0x33, 0x03, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(detectAudioMagicBytes(mp3)).toBe("mp3");
    expect(validateAudioUpload("song.mp3", "audio/mpeg", mp3).ok).toBe(true);

    const m4a = Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]);
    expect(detectAudioMagicBytes(m4a)).toBe("m4a");
    expect(validateAudioUpload("song.m4a", "audio/mp4", m4a).ok).toBe(true);

    const wav = Buffer.from("RIFF\x24\x00\x00\x00WAVEfmt ", "binary");
    expect(detectAudioMagicBytes(wav)).toBe("wav");

    const ogg = Buffer.from("OggS\x00\x02\x00\x00\x00\x00\x00\x00", "binary");
    expect(detectAudioMagicBytes(ogg)).toBe("ogg");

    const fakeMp3 = Buffer.from("#!/bin/sh\necho pwned", "utf8");
    const check = validateAudioUpload("evil.mp3", "audio/mpeg", fakeMp3);
    expect(check.ok).toBe(false);
  });

  it("detects valid PNG, JPEG, WEBP signatures and rejects spoofed images", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(detectImageMagicBytes(png)).toBe("png");
    expect(validateImageUpload("cover.png", "image/png", png).ok).toBe(true);

    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(detectImageMagicBytes(jpeg)).toBe("jpeg");

    const webp = Buffer.from("RIFF\x20\x00\x00\x00WEBP", "binary");
    expect(detectImageMagicBytes(webp)).toBe("webp");

    const fakePng = Buffer.from("<script>alert(1)</script>", "utf8");
    expect(validateImageUpload("xss.png", "image/png", fakePng).ok).toBe(false);
  });
});

describe("Rate limiting & CSRF origin check", () => {
  it("locks after 5 consecutive login failures and resets on success", () => {
    const key = `test-rate-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkInMemoryRateLimit(key, 5).allowed).toBe(true);
      recordInMemoryRateLimitFailure(key, 5);
    }
    const blocked = checkInMemoryRateLimit(key, 5);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    resetInMemoryRateLimit(key);
    expect(checkInMemoryRateLimit(key, 5).allowed).toBe(true);
  });

  it("rejects mismatched Origin on state-changing requests", () => {
    const req = new Request("https://music.webguruji.online/api/admin/tracks", {
      method: "POST",
      headers: {
        host: "music.webguruji.online",
        origin: "https://evil-site.example",
      },
    });
    expect(verifySameOrigin(req)).toBe(false);

    const validReq = new Request("https://music.webguruji.online/api/admin/tracks", {
      method: "POST",
      headers: {
        host: "music.webguruji.online",
        origin: "https://music.webguruji.online",
      },
    });
    expect(verifySameOrigin(validReq)).toBe(true);
  });
});

describe("Format & UUID helpers", () => {
  it("formats durations, sizes, and validates UUIDs", () => {
    expect(formatDuration(195)).toBe("3:15");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUuid("not-a-uuid")).toBe(false);
  });
});
