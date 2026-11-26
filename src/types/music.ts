export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  image_url: string | null;
  image_path: string | null;
  is_published: boolean;
  is_featured: boolean;
  monthly_listeners: number;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: string;
  title: string;
  slug: string;
  artist_id: string | null;
  description: string | null;
  cover_url: string | null;
  cover_path: string | null;
  release_date: string | null;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  artist?: Pick<Artist, "id" | "name" | "slug" | "image_url"> | null;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color_accent: string;
  cover_url: string | null;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  title: string;
  slug: string;
  artist_id: string | null;
  album_id: string | null;
  genre_id: string | null;
  audio_bucket: "published-audio" | "draft-audio";
  audio_path: string;
  audio_url: string | null;
  cover_url: string | null;
  cover_path: string | null;
  duration_seconds: number;
  file_size_bytes: number;
  mime_type: string | null;
  file_hash: string | null;
  description: string | null;
  release_date: string | null;
  language: string | null;
  lyrics: string | null;
  is_published: boolean;
  is_featured: boolean;
  is_downloadable: boolean;
  play_count: number;
  download_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  artist?: Pick<Artist, "id" | "name" | "slug" | "image_url"> | null;
  album?: Pick<Album, "id" | "title" | "slug" | "cover_url"> | null;
  genre?: Pick<Genre, "id" | "name" | "slug" | "color_accent"> | null;
}

export interface Playlist {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  cover_path: string | null;
  is_published: boolean;
  is_featured: boolean;
  is_official: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  tracks?: Track[];
  track_count?: number;
}

export interface HomepageSectionConfig {
  key: string;
  label: string;
  enabled: boolean;
}

export interface SiteSettings {
  id: number;
  site_title: string;
  site_description: string;
  brand_tagline: string;
  secondary_tagline: string;
  logo_url: string;
  default_artwork_url: string;
  homepage_sections: HomepageSectionConfig[];
  homepage_order: string[];
  public_download_policy: "track_level" | "disabled";
  maintenance_mode: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface AdminActivityLog {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_hash: string | null;
  user_agent: string | null;
  status: "success" | "failure" | "blocked";
  created_at: string;
}

export interface LocalPlaylist {
  id: string;
  title: string;
  description: string;
  trackIds: string[];
  createdAt: string;
}
