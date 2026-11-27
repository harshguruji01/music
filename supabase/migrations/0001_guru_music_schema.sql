-- ============================================================================
-- GURU MUSIC — Core Database Schema & Row Level Security (RLS)
-- Officially Developed by HarshGuruJi
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Updated-at trigger helper
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. USER ROLES (Privileged table: never writable by ordinary visitors)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Helper function to verify admin role + allowlisted email via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN auth.users au ON au.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND lower(coalesce(au.email, '')) = 'harshguruji01@gmail.com'
  );
$$;

-- Automatically create profile + default 'user' role when a Supabase Auth user signs up.
-- Never grants 'admin' automatically; admin provisioning is strictly server-side.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. ARTISTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 160),
  slug text UNIQUE NOT NULL,
  bio text,
  image_url text,
  image_path text,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  monthly_listeners bigint NOT NULL DEFAULT 0 CHECK (monthly_listeners >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_artists_published ON public.artists(is_published);
CREATE INDEX IF NOT EXISTS idx_artists_slug ON public.artists(slug);

-- ----------------------------------------------------------------------------
-- 4. ALBUMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  slug text UNIQUE NOT NULL,
  artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  description text,
  cover_url text,
  cover_path text,
  release_date date,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_albums_updated_at
  BEFORE UPDATE ON public.albums
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON public.albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_albums_published ON public.albums(is_published);

-- ----------------------------------------------------------------------------
-- 5. GENRES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  slug text UNIQUE NOT NULL,
  description text,
  color_accent text NOT NULL DEFAULT '#8b5cf6',
  cover_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_genres_updated_at
  BEFORE UPDATE ON public.genres
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_genres_order ON public.genres(display_order);

-- ----------------------------------------------------------------------------
-- 6. TRACKS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  slug text UNIQUE NOT NULL,
  artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  album_id uuid REFERENCES public.albums(id) ON DELETE SET NULL,
  genre_id uuid REFERENCES public.genres(id) ON DELETE SET NULL,
  audio_bucket text NOT NULL DEFAULT 'draft-audio' CHECK (audio_bucket IN ('published-audio', 'draft-audio')),
  audio_path text NOT NULL,
  audio_url text,
  cover_url text,
  cover_path text,
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  file_size_bytes bigint NOT NULL DEFAULT 0 CHECK (file_size_bytes >= 0),
  mime_type text,
  file_hash text,
  description text,
  release_date date,
  language text DEFAULT 'Hindi',
  lyrics text,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_downloadable boolean NOT NULL DEFAULT false,
  play_count bigint NOT NULL DEFAULT 0 CHECK (play_count >= 0),
  download_count bigint NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tracks_published ON public.tracks(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_featured ON public.tracks(is_featured) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON public.tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album_id ON public.tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_tracks_genre_id ON public.tracks(genre_id);
CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON public.tracks(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_file_hash ON public.tracks(file_hash);

-- ----------------------------------------------------------------------------
-- 7. PLAYLISTS & 8. PLAYLIST_TRACKS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  slug text UNIQUE NOT NULL,
  description text,
  cover_url text,
  cover_path text,
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_official boolean NOT NULL DEFAULT true,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_playlists_published ON public.playlists(is_published);

CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON public.playlist_tracks(playlist_id, position);

-- ----------------------------------------------------------------------------
-- 9. PLAY EVENTS & 10. DOWNLOAD EVENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.play_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  played_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_play_events_track ON public.play_events(track_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_play_events_played_at ON public.play_events(played_at DESC);

CREATE TABLE IF NOT EXISTS public.download_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash text,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_download_events_track ON public.download_events(track_id, downloaded_at DESC);

-- ----------------------------------------------------------------------------
-- 11. SITE SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_title text NOT NULL DEFAULT 'Guru Music',
  site_description text NOT NULL DEFAULT 'Discover your sound. Explore your world. Feel every beat.',
  brand_tagline text NOT NULL DEFAULT 'MUSIC BEYOND LIMITS.',
  secondary_tagline text NOT NULL DEFAULT 'LISTEN • EXPLORE • FEEL THE FLOW.',
  logo_url text NOT NULL DEFAULT '/brand/guru-music-logo.png',
  default_artwork_url text NOT NULL DEFAULT '/brand/default-cover.png',
  homepage_sections jsonb NOT NULL DEFAULT '[
    {"key":"recently_played","label":"Recently Played","enabled":true},
    {"key":"trending_songs","label":"Trending Songs","enabled":true},
    {"key":"recommended","label":"Recommended For You","enabled":true},
    {"key":"popular_artists","label":"Popular Artists","enabled":true},
    {"key":"new_releases","label":"New Releases","enabled":true},
    {"key":"featured_albums","label":"Featured Albums","enabled":true},
    {"key":"trending_playlists","label":"Trending Playlists","enabled":true},
    {"key":"genre_hindi","label":"Hindi Music","enabled":true},
    {"key":"genre_english","label":"English Music","enabled":true},
    {"key":"genre_bollywood","label":"Bollywood","enabled":true},
    {"key":"genre_independent","label":"Independent Artists","enabled":true},
    {"key":"genre_hip_hop_rap","label":"Hip-Hop and Rap","enabled":true},
    {"key":"genre_electronic_edm","label":"Electronic and EDM","enabled":true},
    {"key":"genre_instrumental","label":"Instrumental","enabled":true},
    {"key":"genre_chill","label":"Chill and Relax","enabled":true},
    {"key":"genre_romantic","label":"Romantic Music","enabled":true},
    {"key":"genre_cinematic","label":"Cinematic Music","enabled":true}
  ]'::jsonb,
  homepage_order jsonb NOT NULL DEFAULT '["recently_played","trending_songs","recommended","popular_artists","new_releases","featured_albums","trending_playlists","genre_hindi","genre_english","genre_bollywood","genre_independent","genre_hip_hop_rap","genre_electronic_edm","genre_instrumental","genre_chill","genre_romantic","genre_cinematic"]'::jsonb,
  public_download_policy text NOT NULL DEFAULT 'track_level' CHECK (public_download_policy IN ('track_level', 'disabled')),
  maintenance_mode boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 12. ADMIN ACTIVITY LOGS (Audit trail — NEVER store secrets or tokens)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  user_agent text,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failure', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_activity_logs(action);

-- ----------------------------------------------------------------------------
-- 13. AUTH RATE LIMITS (Server-side only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 14. USER FAVORITES (Authenticated listeners)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update own profile; admins read all
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User Roles: read own role or admin; NO client-side INSERT/UPDATE/DELETE allowed
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Artists: public sees only published; admin manages all
CREATE POLICY "artists_public_read_published" ON public.artists
  FOR SELECT USING (is_published = true OR public.is_admin());

CREATE POLICY "artists_admin_all" ON public.artists
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Albums: public sees only published; admin manages all
CREATE POLICY "albums_public_read_published" ON public.albums
  FOR SELECT USING (is_published = true OR public.is_admin());

CREATE POLICY "albums_admin_all" ON public.albums
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Genres: public read all genres; admin manages all
CREATE POLICY "genres_public_read" ON public.genres
  FOR SELECT USING (true);

CREATE POLICY "genres_admin_all" ON public.genres
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Tracks: public sees ONLY published tracks; draft tracks strictly blocked
CREATE POLICY "tracks_public_read_published" ON public.tracks
  FOR SELECT USING (is_published = true OR public.is_admin());

CREATE POLICY "tracks_admin_all" ON public.tracks
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Playlists: public sees published playlists or user's own playlists; admin sees all
CREATE POLICY "playlists_public_or_owner_read" ON public.playlists
  FOR SELECT USING (is_published = true OR auth.uid() = owner_id OR public.is_admin());

CREATE POLICY "playlists_owner_insert" ON public.playlists
  FOR INSERT WITH CHECK (
    (auth.uid() = owner_id AND is_official = false AND is_featured = false)
    OR public.is_admin()
  );

CREATE POLICY "playlists_owner_update" ON public.playlists
  FOR UPDATE USING (auth.uid() = owner_id OR public.is_admin())
  WITH CHECK (
    (auth.uid() = owner_id AND is_official = false AND is_featured = false)
    OR public.is_admin()
  );

CREATE POLICY "playlists_owner_delete" ON public.playlists
  FOR DELETE USING (auth.uid() = owner_id OR public.is_admin());

-- Playlist Tracks: readable when parent playlist is readable and track is published (or admin)
CREATE POLICY "playlist_tracks_read" ON public.playlist_tracks
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id AND (p.is_published = true OR p.owner_id = auth.uid())
    )
  );

CREATE POLICY "playlist_tracks_manage_owner_or_admin" ON public.playlist_tracks
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_id AND p.owner_id = auth.uid()
    )
  );

-- Play & Download Events: recorded server-side; only admins can read analytics
CREATE POLICY "play_events_admin_read" ON public.play_events
  FOR SELECT USING (public.is_admin());

CREATE POLICY "download_events_admin_read" ON public.download_events
  FOR SELECT USING (public.is_admin());

-- Site Settings: public readable; only admin updates
CREATE POLICY "site_settings_public_read" ON public.site_settings
  FOR SELECT USING (true);

CREATE POLICY "site_settings_admin_update" ON public.site_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin Activity Logs: strictly admin read & insert (or via failed-login RPC)
CREATE POLICY "admin_logs_admin_read" ON public.admin_activity_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY "admin_logs_admin_insert" ON public.admin_activity_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- Auth Rate Limits: zero public/authenticated access (service_role / RPC only)
-- No policies created intentionally.

-- User Favorites: users manage their own favorites
CREATE POLICY "user_favorites_own" ON public.user_favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Atomic RPC helpers executable from static web client safely
CREATE OR REPLACE FUNCTION public.record_play_event(target_track_id uuid, p_session_id text DEFAULT 'web-listener')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tracks WHERE id = target_track_id AND is_published = true) THEN
    INSERT INTO public.play_events (track_id, user_id, session_id)
    VALUES (target_track_id, auth.uid(), left(coalesce(p_session_id, 'web-listener'), 80));

    UPDATE public.tracks
    SET play_count = play_count + 1
    WHERE id = target_track_id AND is_published = true;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_download_event(target_track_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy text;
BEGIN
  SELECT public_download_policy INTO policy FROM public.site_settings WHERE id = 1;
  IF coalesce(policy, 'track_level') = 'disabled' THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tracks
    WHERE id = target_track_id AND is_published = true AND is_downloadable = true
  ) THEN
    INSERT INTO public.download_events (track_id, user_id)
    VALUES (target_track_id, auth.uid());

    UPDATE public.tracks
    SET download_count = download_count + 1
    WHERE id = target_track_id AND is_published = true AND is_downloadable = true;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_failed_admin_login(attempted_email text, reason text DEFAULT 'Invalid credentials')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_activity_logs (admin_email, action, resource_type, details, status)
  VALUES (
    left(lower(coalesce(attempted_email, '')), 160),
    'admin.login.failed',
    'auth',
    jsonb_build_object('reason', left(coalesce(reason, 'Invalid credentials'), 200)),
    'failure'
  );
END;
$$;
