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

export type SongStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED"
  | "CHANGES_REQUESTED"
  | "ARCHIVED";

export type CreatorVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected"
  | "suspended";

export interface Track {
  id: string;
  title: string;
  slug: string;
  artist_id: string | null;
  album_id: string | null;
  genre_id: string | null;
  creator_id?: string | null;
  owner_id?: string | null;
  audio_bucket: "published-audio" | "draft-audio" | "artist-uploads" | "pending-submissions";
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
  status?: SongStatus;
  copyright_declaration?: boolean;
  copyright_owner?: string | null;
  isrc?: string | null;
  explicit?: boolean;
  submitted_at?: string | null;
  approved_at?: string | null;
  published_at?: string | null;
  rejection_reason?: string | null;
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
  max_audio_size_mb?: number;
  max_image_size_mb?: number;
  allowed_audio_formats?: string[];
  require_creator_verification?: boolean;
  auto_publish_approved_songs?: boolean;
  creator_uploads_enabled?: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface Creator {
  id: string;
  user_id: string;
  username: string;
  stage_name: string;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  country: string | null;
  primary_genre: string | null;
  social_links: Record<string, string>;
  verification_status: CreatorVerificationStatus;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  artist_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorCredential {
  id: string;
  creator_id: string;
  user_id: string;
  legal_name: string;
  id_document_type: string;
  document_bucket: string;
  document_path: string | null;
  portfolio_url: string | null;
  copyright_declaration_accepted: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
  reviewer_id: string | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: Creator | null;
}

export interface SongSubmission {
  id: string;
  track_id: string;
  creator_id: string | null;
  owner_id: string;
  status: Exclude<SongStatus, "DRAFT">;
  submission_notes: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  track?: Track | null;
  creator?: Creator | null;
}

export interface ModerationLog {
  id: string;
  track_id: string | null;
  submission_id: string | null;
  creator_id: string | null;
  admin_id: string;
  admin_email: string;
  action: string;
  previous_status: string | null;
  new_status: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ListeningHistoryEntry {
  id: string;
  user_id: string;
  track_id: string;
  progress_seconds: number;
  completed: boolean;
  played_at: string;
  track?: Track | null;
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

export interface MusicUser {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  banner_url: string | null;
  country: string | null;
  auth_provider: string;
  signup_source: string;
  is_active: boolean;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
  updated_at: string;
}

export interface MusicLoginLog {
  id: string;
  user_id: string;
  email: string;
  auth_method: "email" | "google" | "oauth" | "session_resume";
  event_type: "signup" | "login" | "logout";
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MusicUserPreferences {
  user_id: string;
  theme: "dark" | "light";
  preferred_language: string;
  audio_quality: "standard" | "high";
  autoplay: boolean;
  updated_at: string;
}
