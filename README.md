# GURU MUSIC — Music Beyond Limits

**Officially Developed by HarshGuruJi**

- **Public Website:** `https://music.webguruji.online/`
- **Admin Control Center:** `https://music.webguruji.online/admin/`
- **Repository:** `https://github.com/harshguruji01/music.git` (`main`)

---

## Overview

**Guru Music** is a unified, production-ready music streaming web platform and secure Music CMS built with **Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, and Supabase (PostgreSQL, Auth, Storage, RLS)**.

It combines:
1. **Public Music Streaming Platform (`/`)**: Global persistent HTML5 audio player (never interrupts playback across route changes), expandable full-screen player with lyrics & queue, live search engine across songs/artists/albums/playlists/genres, dark & light themes, authorized track downloads, Media Session lock-screen controls, keyboard shortcuts, and an empty-library state until real tracks are published.
2. **Secure Admin Control Center (`/admin`)**: Full 15-section music management CMS with drag-and-drop audio (`MP3`, `M4A`, `WAV`, `OGG`) and artwork uploads, private `draft-audio` vs public `published-audio` isolation, artist/album/playlist/genre/featured/download management, storage orphan cleanup, site settings, and immutable audit logs.

---

## Official Brand Assets

Generated directly from the official Guru Music logo inside `public/brand/`:
- `public/brand/guru-music-logo.png` — Main full-resolution logo
- `public/brand/guru-music-navbar.png` — Compact navbar logo
- `public/brand/guru-music-icon.png` / `guru-music-icon-192.png` — Mobile / PWA icons
- `public/brand/guru-music-emblem.png` — Emblem mark
- `public/brand/default-cover.png` — Default album / playlist cover
- `public/favicon.ico` & `src/app/icon.png` — Browser favicon

---

## Architecture & Security

### Database Schema (`supabase/migrations/0001_guru_music_schema.sql`)
- `profiles` — User profiles linked to `auth.users`
- `user_roles` — Privileged role mapping (`'user' | 'admin'`); strictly non-writable from client apps
- `artists`, `albums`, `genres`, `tracks` — Catalog entities with foreign keys, indexes, and `is_published` / `is_featured` / `is_downloadable` flags
- `playlists`, `playlist_tracks` — Ordered curated & owner playlists
- `play_events`, `download_events` — Real usage telemetry
- `site_settings` — Singleton homepage ordering, taglines, download policy, and maintenance banner
- `admin_activity_logs` — Audit log (with automatic secret/token redaction)
- `auth_rate_limits` — Server-only brute-force login lockout store
- `user_favorites` — Authenticated listener favorites

### Storage Buckets (`supabase/migrations/0002_storage_and_seed.sql`)
1. `published-audio` (Public read, admin write/delete)
2. `draft-audio` (**Strictly Private** — `public = false`; admin-only signed URL preview)
3. `song-artwork` (Public read, admin write/delete)
4. `album-covers` (Public read, admin write/delete)
5. `artist-images` (Public read, admin write/delete)
6. `playlist-covers` (Public read, admin write/delete)

### Admin Security Model
- **Authorized Allowlist:** `ADMIN_ALLOWLIST_EMAILS=harshguruji01@gmail.com`
- **Dual Enforcement:** `requireAdmin()` in `src/lib/admin-auth.ts` and `src/middleware.ts` verify **both** a valid Supabase Auth session on the allowlist **and** an explicit `role = 'admin'` record in `public.user_roles` (via server-only `SUPABASE_SERVICE_ROLE_KEY`). An email match alone never grants administrative privileges.
- **No Hardcoded Passwords:** No administrator password exists in source control.
- **Upload Validation:** Extension, MIME type, file size, and binary magic-byte header inspection (`ID3`/MPEG, `ftyp`, `RIFF+WAVE`, `OggS`, `PNG`, `JPEG`, `WEBP`).

---

## Setup & Local Development

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in your Supabase keys:
```bash
cp .env.example .env.local
```
Required variables:
- `NEXT_PUBLIC_SITE_URL=https://music.webguruji.online`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(server-only, never expose to client)*
- `ADMIN_ALLOWLIST_EMAILS=harshguruji01@gmail.com`
- `ADMIN_SESSION_MAX_AGE_SECONDS=43200`
- `SECURITY_HASH_SALT`

### 3. Apply Supabase Database Migrations
Run the SQL files in order in your Supabase SQL Editor (or via Supabase CLI `supabase db push`):
1. `supabase/migrations/0001_guru_music_schema.sql`
2. `supabase/migrations/0002_storage_and_seed.sql`

### 4. Provision the Administrator Account
Set your private password securely in Supabase Auth and assign `role = 'admin'` in `public.user_roles`:
```bash
pnpm admin:provision
```

### 5. Run Verification & Dev Server
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm dev
```

---

## Production Deployment (Vercel + Custom Domain)

1. Import `https://github.com/harshguruji01/music.git` (`main` branch) into Vercel.
2. Framework preset: **Next.js** | Install command: `pnpm install` | Build command: `pnpm build`.
3. Add all variables from `.env.example` in Vercel Project Settings -> Environment Variables (keep `SUPABASE_SERVICE_ROLE_KEY` scoped to Server/Production/Preview, never `NEXT_PUBLIC_*`).
4. In Vercel Domains, attach `music.webguruji.online`, configure the `CNAME` / `A` DNS record at your registrar, and verify automatic SSL certificate issuance.
5. Verify live endpoints:
   - `GET https://music.webguruji.online/api/health` -> `supabasePublicConfigured: true`, `supabaseAdminConfigured: true`
   - `https://music.webguruji.online/` loads public platform
   - `https://music.webguruji.online/admin/` redirects unauthenticated requests to `/admin/login`
   - Sign in with `harshguruji01@gmail.com` and your provisioned password, upload a draft track, preview via signed URL, publish it, and confirm it streams & downloads on the public site.
