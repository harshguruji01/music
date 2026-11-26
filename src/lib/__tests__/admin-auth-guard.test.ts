import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ADMIN_API_ROUTES = [
  "src/app/api/admin/overview/route.ts",
  "src/app/api/admin/upload/route.ts",
  "src/app/api/admin/tracks/route.ts",
  "src/app/api/admin/tracks/[id]/route.ts",
  "src/app/api/admin/tracks/[id]/preview/route.ts",
  "src/app/api/admin/artists/route.ts",
  "src/app/api/admin/albums/route.ts",
  "src/app/api/admin/playlists/route.ts",
  "src/app/api/admin/genres/route.ts",
  "src/app/api/admin/settings/route.ts",
  "src/app/api/admin/activity/route.ts",
  "src/app/api/admin/storage/route.ts",
];

describe("Admin API route protection & secret hygiene", () => {
  it("every protected admin API route enforces server-side requireAdmin()", () => {
    for (const rel of ADMIN_API_ROUTES) {
      const content = fs.readFileSync(path.resolve(process.cwd(), rel), "utf8");
      expect(content).toContain("requireAdmin");
      expect(content).toContain("unauthorizedAdminResponse");
    }
  });

  it("no client component imports getSupabaseAdminClient", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(full) : [full];
      });

    for (const file of walk(srcDir)) {
      if (file.endsWith(".test.ts") || (!file.endsWith(".ts") && !file.endsWith(".tsx"))) continue;
      const content = fs.readFileSync(file, "utf8");
      if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
        expect(content).not.toContain("getSupabaseAdminClient");
        expect(content).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      }
    }
  });
});
