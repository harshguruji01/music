-- ============================================================================
-- GURU MUSIC — Storage Buckets, Policies & Default Genres / Settings Seed
-- Officially Developed by HarshGuruJi
-- ============================================================================

-- 1. Create the 6 dedicated storage buckets
-- Note: draft-audio is STRICTLY PRIVATE (public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('published-audio', 'published-audio', true, 104857600, ARRAY['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg']),
  ('draft-audio', 'draft-audio', false, 104857600, ARRAY['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg']),
  ('song-artwork', 'song-artwork', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('album-covers', 'album-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('artist-images', 'artist-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('playlist-covers', 'playlist-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read policies ONLY for public asset buckets (NEVER draft-audio)
CREATE POLICY "public_read_published_audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'published-audio');

CREATE POLICY "public_read_song_artwork" ON storage.objects
  FOR SELECT USING (bucket_id = 'song-artwork');

CREATE POLICY "public_read_album_covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'album-covers');

CREATE POLICY "public_read_artist_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'artist-images');

CREATE POLICY "public_read_playlist_covers" ON storage.objects
  FOR SELECT USING (bucket_id = 'playlist-covers');

-- Admin-only read for private draft-audio bucket
CREATE POLICY "admin_read_draft_audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'draft-audio' AND public.is_admin());

-- Admin-only write/update/delete across all 6 buckets
CREATE POLICY "admin_insert_storage_objects" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id IN ('published-audio', 'draft-audio', 'song-artwork', 'album-covers', 'artist-images', 'playlist-covers')
    AND public.is_admin()
  );

CREATE POLICY "admin_update_storage_objects" ON storage.objects
  FOR UPDATE USING (
    bucket_id IN ('published-audio', 'draft-audio', 'song-artwork', 'album-covers', 'artist-images', 'playlist-covers')
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id IN ('published-audio', 'draft-audio', 'song-artwork', 'album-covers', 'artist-images', 'playlist-covers')
    AND public.is_admin()
  );

CREATE POLICY "admin_delete_storage_objects" ON storage.objects
  FOR DELETE USING (
    bucket_id IN ('published-audio', 'draft-audio', 'song-artwork', 'album-covers', 'artist-images', 'playlist-covers')
    AND public.is_admin()
  );

-- 2. Seed default site settings (singleton id = 1)
INSERT INTO public.site_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed standard genre categories (metadata categories only, NOT fake songs)
INSERT INTO public.genres (name, slug, description, color_accent, display_order, is_featured)
VALUES
  ('Hindi Music', 'hindi', 'Melodic Hindi tracks, modern hits, and timeless voices.', '#f59e0b', 1, true),
  ('English Music', 'english', 'Global pop, soul, indie, and chart-topping English releases.', '#3b82f6', 2, true),
  ('Bollywood', 'bollywood', 'Iconic cinema soundtracks and chartbusters.', '#ef4444', 3, true),
  ('Independent Artists', 'independent', 'Original independent creators and fresh underground sounds.', '#10b981', 4, true),
  ('Hip-Hop and Rap', 'hip-hop-rap', 'Hard-hitting beats, bars, and street anthems.', '#8b5cf6', 5, true),
  ('Electronic and EDM', 'electronic-edm', 'High-energy synth waves, festival drops, and basslines.', '#06b6d4', 6, true),
  ('Instrumental', 'instrumental', 'Pure compositions, acoustic arrangements, and focus scores.', '#ec4899', 7, true),
  ('Chill and Relax', 'chill', 'Lo-fi textures, ambient grooves, and late-night calm.', '#14b8a6', 8, true),
  ('Romantic Music', 'romantic', 'Heartfelt melodies and soulful love ballads.', '#f43f5e', 9, true),
  ('Cinematic Music', 'cinematic', 'Epic orchestral scores and atmospheric soundscapes.', '#eab308', 10, true),
  ('Classical', 'classical', 'Traditional ragas, symphonies, and heritage compositions.', '#a855f7', 11, false)
ON CONFLICT (slug) DO NOTHING;
