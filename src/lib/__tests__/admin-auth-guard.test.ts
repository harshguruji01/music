import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { hasPasswordAuthMethod } from "../admin-api";
import { getSupabaseConfigValues, isSupabasePublicConfigured } from "../supabase/config";
import { AppError, normalizeErrorMessage } from "../errors";
import { validateCreatorPasswordStrength, validateCreatorUsername } from "../music-auth";

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.sig`;
}

describe("Static-export Admin protection & secret hygiene", () => {
  it("admin dashboard layout enforces verifyAdminSessionClient()", () => {
    const layoutContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/admin/(dashboard)/layout.tsx"),
      "utf8"
    );
    expect(layoutContent).toContain("verifyAdminSessionClient");
    expect(layoutContent).toContain("/admin/login/");
  });

  it("admin-api.ts enforces allowlist email, password AMR, and user_roles role=admin check", () => {
    const apiContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/admin-api.ts"),
      "utf8"
    );
    expect(apiContent).toContain("isEmailAllowlisted");
    expect(apiContent).toContain("hasPasswordAuthMethod");
    expect(apiContent).toContain("user_roles");
    expect(apiContent).toContain('role !== "admin"');

    expect(hasPasswordAuthMethod(makeJwt({ amr: [{ method: "password", timestamp: 1 }] }))).toBe(true);
    expect(hasPasswordAuthMethod(makeJwt({ amr: [{ method: "oauth", timestamp: 1 }] }))).toBe(false);
    expect(hasPasswordAuthMethod(null)).toBe(false);
  });

  it("admin login page uses password-only auth with no OAuth/Google sign-in and no prefilled email", () => {
    const loginContent = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/admin/login/page.tsx"),
      "utf8"
    );
    expect(loginContent).not.toContain("signInWithOAuth");
    expect(loginContent).not.toContain('useState("harshguruji01@gmail.com")');
  });

  it("public UI components and robots.ts expose no /admin links or admin labels", () => {
    const appShell = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/layout/AppShell.tsx"),
      "utf8"
    );
    const collectionCards = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/music/CollectionCards.tsx"),
      "utf8"
    );
    const brandLogo = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/brand/BrandLogo.tsx"),
      "utf8"
    );
    const robots = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/robots.ts"),
      "utf8"
    );
    expect(appShell).not.toContain('href="/admin');
    expect(collectionCards).not.toContain('href="/admin');
    expect(brandLogo).not.toContain("Admin Control Center");
    expect(robots).not.toContain("/admin");
  });

  it("public Supabase config defaults to the connected project", () => {
    const cfg = getSupabaseConfigValues();
    expect(cfg.url).toBe("https://wumdbpyhpblvgjttsbpv.supabase.co");
    expect(cfg.anonKey.length).toBeGreaterThan(15);
    expect(isSupabasePublicConfigured()).toBe(true);
  });

  it("normalizes AppError and unknown errors cleanly", () => {
    const err = new AppError("Upload denied", "FORBIDDEN", 403);
    expect(normalizeErrorMessage(err)).toBe("Upload denied");
    expect(normalizeErrorMessage(null, "Fallback")).toBe("Fallback");
  });

  it("validates creator username format and password strength", () => {
    expect(validateCreatorUsername("harsh_music")).toBeNull();
    expect(validateCreatorUsername("ab")).not.toBeNull();
    expect(validateCreatorUsername("Bad Name!")).not.toBeNull();

    expect(validateCreatorPasswordStrength("StrongPass123")).toBeNull();
    expect(validateCreatorPasswordStrength("short1A")).not.toBeNull();
    expect(validateCreatorPasswordStrength("nouppercase123")).not.toBeNull();
    expect(validateCreatorPasswordStrength("NoNumbersHere")).not.toBeNull();
  });

  it("never exposes creator password hashes or localStorage password storage in client auth code", () => {
    const musicAuth = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/music-auth.ts"),
      "utf8"
    );
    expect(musicAuth).not.toContain("localStorage");
    expect(musicAuth).not.toContain("password_hash");
  });

  it("no file inside src/ ever reads process.env.SUPABASE_SERVICE_ROLE_KEY", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(full) : [full];
      });

    for (const file of walk(srcDir)) {
      if (file.endsWith(".test.ts") || (!file.endsWith(".ts") && !file.endsWith(".tsx"))) continue;
      const content = fs.readFileSync(file, "utf8");
      expect(content).not.toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
    }
  });
});
