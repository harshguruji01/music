# GURU MUSIC — Music Beyond Limits

**Officially Developed by HarshGuruJi**

- **Public Website:** `https://music.webguruji.online/`
- **Admin Control Center:** `https://music.webguruji.online/admin/`
- **Repository:** `https://github.com/harshguruji01/music.git` (`main`)

---

## Overview

**Guru Music** is a static-hosted (GitHub Pages compatible) music streaming web platform and secure Music CMS built with **Next.js App Router (`output: "export"`), React, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, and Supabase (PostgreSQL, Auth, Storage, RLS)**.

Every build outputs complete static HTML/CSS/JS (`index.html`, `admin/index.html`, `404.html`, `_next/`, `CNAME`, `.nojekyll`) directly to the repository root and `./out` so **GitHub Pages** hosts `https://music.webguruji.online/` and `https://music.webguruji.online/admin/` cleanly with zero server errors.

---

## Live Public & Admin Features

1. **Public Music Player (`/`)**:
   - Displays the exact set of tracks published (`is_published = true`) from the Admin Panel.
   - Persistent global HTML5 `<audio>` player that never stops across navigation, expandable full-screen player (artwork/lyrics/queue), queue management, shuffle/repeat/speed, Media Session lock-screen controls, keyboard shortcuts, dark/light mode, live search (`/search/`), and authorized downloads.
   - Animated footer branding: **Guru Music** / **by HarshGuruJi**.
2. **Admin Control Center (`/admin/`)**:
   - Protected by Supabase Auth + allowlist email (`harshguruji01@gmail.com`) + PostgreSQL RLS (`public.is_admin()` verifying both `user_roles.role = 'admin'` and allowlist email).
   - 15-section CMS: Dashboard, Music Library (publish/unpublish moving files between private `draft-audio` and `published-audio`, signed URL preview, edit, bulk actions, delete with storage cleanup), Upload Music (`MP3/M4A/WAV/OGG` + cover image with magic-byte & SHA-256 duplicate checks), Artists, Albums, Playlists, Genres, Featured & Homepage Ordering, Download Management, Statistics, Storage Cleanup, Website Settings, Audit Activity, Security, and Logout.

---

## Setup & Deployment (GitHub Pages + Supabase)

### 1. Apply Supabase SQL Migrations
Run in your Supabase SQL Editor:
1. `supabase/migrations/0001_guru_music_schema.sql`
2. `supabase/migrations/0002_storage_and_seed.sql`

### 2. Provision Your Admin Account
Copy `.env.example` to `.env.local` with your Supabase URL, anon key, and `SUPABASE_SERVICE_ROLE_KEY`, then run:
```bash
pnpm install
pnpm admin:provision
```

### 3. Build Static HTML & Root Export
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
`pnpm build` compiles Next.js static export (`./out`) and syncs `index.html`, `admin/index.html`, `404.html`, `_next/`, `CNAME` (`music.webguruji.online`), and `.nojekyll` to the repository root.

### 4. Host on GitHub Pages
- Push `main` to `https://github.com/harshguruji01/music.git`.
- In **GitHub Repository Settings -> Pages**, either:
  - Select **Deploy from a branch -> `main` -> `/ (root)`**, OR
  - Select **GitHub Actions** (using `.github/workflows/deploy.yml`, with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Repository Secrets).
- Ensure **Custom domain** is `music.webguruji.online` with **Enforce HTTPS** enabled.
- If you deployed without baking `NEXT_PUBLIC_SUPABASE_*` env vars into the build, open `https://music.webguruji.online/admin/login/` and click **Supabase Config** to connect your Supabase URL & public Anon Key.
