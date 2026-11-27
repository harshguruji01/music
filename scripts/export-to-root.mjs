import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "out");

if (!fs.existsSync(outDir) || !fs.existsSync(path.join(outDir, "index.html"))) {
  console.error("ERROR: Next.js static export 'out/index.html' not found.");
  process.exit(1);
}

// Folders in out/ that should be cleanly replaced in root on each build
const MANAGED_DIRS = [
  "_next",
  "admin",
  "albums",
  "artists",
  "auth",
  "brand",
  "explore",
  "favorites",
  "featured",
  "genres",
  "library",
  "playlists",
  "profile",
  "recent",
  "search",
  "songs",
  "studio",
  "trending",
];

for (const dir of MANAGED_DIRS) {
  const dest = path.join(rootDir, dir);
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
}

for (const entry of fs.readdirSync(outDir, { withFileTypes: true })) {
  const srcPath = path.join(outDir, entry.name);
  const destPath = path.join(rootDir, entry.name);

  if (entry.isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true, force: true });
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
}

// Write CNAME and .nojekyll in both rootDir and outDir for GitHub Pages
fs.writeFileSync(path.join(rootDir, "CNAME"), "music.webguruji.online\n", "utf8");
fs.writeFileSync(path.join(outDir, "CNAME"), "music.webguruji.online\n", "utf8");
fs.writeFileSync(path.join(rootDir, ".nojekyll"), "", "utf8");
fs.writeFileSync(path.join(outDir, ".nojekyll"), "", "utf8");

console.log("Exported static HTML, _next assets, CNAME (music.webguruji.online), and .nojekyll to repository root.");
