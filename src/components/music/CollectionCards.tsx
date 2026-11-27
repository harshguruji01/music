"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Disc3, Download, Heart, ListMusic, Music2, Pause, Play, Sparkles, User } from "lucide-react";
import type { Album, Artist, Genre, Playlist, Track } from "@/types/music";
import { BRAND_CONFIG } from "@/lib/supabase/config";
import { downloadAuthorizedTrackClient } from "@/lib/public-api";
import { formatCount, formatDuration } from "@/lib/format";
import { usePlayer } from "@/context/PlayerContext";
import { useToast } from "@/context/ToastContext";

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <Link
      href={`/artists/view/?slug=${encodeURIComponent(artist.slug)}`}
      className="group gm-surface rounded-2xl p-4 hover:bg-[var(--gm-surface-hover)] transition-all flex flex-col items-center text-center"
    >
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden mb-3 ring-2 ring-white/10 group-hover:ring-purple-400/60 transition-all">
        {artist.image_url ? (
          <Image
            src={artist.image_url}
            alt={artist.name}
            fill
            sizes="128px"
            className="object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <User className="h-10 w-10 text-[var(--gm-text-muted)]" />
          </div>
        )}
      </div>
      <h3 className="text-sm font-semibold truncate w-full">{artist.name}</h3>
      <p className="text-xs text-[var(--gm-text-muted)] mt-0.5">
        {artist.monthly_listeners > 0
          ? `${formatCount(artist.monthly_listeners)} listeners`
          : "Featured Artist"}
      </p>
    </Link>
  );
}

export function AlbumCard({ album }: { album: Album }) {
  return (
    <Link
      href={`/albums/view/?slug=${encodeURIComponent(album.slug)}`}
      className="group gm-surface rounded-2xl p-3 hover:bg-[var(--gm-surface-hover)] transition-all block"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40 mb-3">
        <Image
          src={album.cover_url || BRAND_CONFIG.defaultCoverPath}
          alt={album.title}
          fill
          sizes="(max-width: 640px) 46vw, 220px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 text-white/80">
          <Disc3 className="h-3.5 w-3.5" />
        </span>
      </div>
      <h3 className="text-sm font-semibold truncate">{album.title}</h3>
      <p className="text-xs text-[var(--gm-text-muted)] truncate mt-0.5">
        {album.artist?.name || BRAND_CONFIG.owner}
      </p>
    </Link>
  );
}

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlists/view/?slug=${encodeURIComponent(playlist.slug)}`}
      className="group gm-surface rounded-2xl p-3 hover:bg-[var(--gm-surface-hover)] transition-all block"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-black/40 mb-3">
        <Image
          src={playlist.cover_url || BRAND_CONFIG.defaultCoverPath}
          alt={playlist.title}
          fill
          sizes="(max-width: 640px) 46vw, 220px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/70 text-white flex items-center gap-1">
          <ListMusic className="h-3 w-3 text-emerald-400" />
          {playlist.track_count ?? 0} tracks
        </span>
      </div>
      <h3 className="text-sm font-semibold truncate">{playlist.title}</h3>
      <p className="text-xs text-[var(--gm-text-muted)] truncate mt-0.5">
        {playlist.description || "Curated on Guru Music"}
      </p>
    </Link>
  );
}

export function GenreCard({ genre }: { genre: Genre }) {
  return (
    <Link
      href={`/genres/view/?slug=${encodeURIComponent(genre.slug)}`}
      className="group relative overflow-hidden rounded-2xl p-4 min-h-[110px] flex flex-col justify-between border border-white/10 hover:scale-[1.02] transition-transform"
      style={{
        background: `linear-gradient(135deg, ${genre.color_accent}33 0%, rgba(15,17,26,0.92) 85%)`,
      }}
    >
      <div
        className="h-2 w-10 rounded-full"
        style={{ backgroundColor: genre.color_accent }}
      />
      <div>
        <h3 className="text-base font-bold text-white">{genre.name}</h3>
        {genre.description && (
          <p className="text-xs text-white/70 line-clamp-1 mt-0.5">{genre.description}</p>
        )}
      </div>
    </Link>
  );
}

export function TrackRow({
  track,
  index,
  queue,
  downloadPolicy = "track_level",
}: {
  track: Track;
  index: number;
  queue: Track[];
  downloadPolicy?: "track_level" | "disabled";
}) {
  const { currentTrack, isPlaying, favorites, playTrack, togglePlayPause, toggleFavorite } =
    usePlayer();
  const { showToast } = useToast();

  const isActive = currentTrack?.id === track.id;
  const isFav = favorites.includes(track.id);
  const canDownload =
    downloadPolicy !== "disabled" && track.is_published && track.is_downloadable;

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
        isActive ? "bg-purple-500/15" : "hover:bg-white/5"
      }`}
    >
      <button
        type="button"
        onClick={() => (isActive ? togglePlayPause() : playTrack(track, queue))}
        className="w-8 text-center text-xs font-medium text-[var(--gm-text-muted)] shrink-0 flex items-center justify-center"
        aria-label={isActive && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        {isActive && isPlaying ? (
          <Pause className="h-4 w-4 text-purple-400 fill-current" />
        ) : (
          <>
            <span className="group-hover:hidden">{index + 1}</span>
            <Play className="h-4 w-4 hidden group-hover:block text-[var(--gm-text)] fill-current" />
          </>
        )}
      </button>

      <Image
        src={track.cover_url || BRAND_CONFIG.defaultCoverPath}
        alt={track.title}
        width={44}
        height={44}
        className="rounded-lg object-cover shrink-0"
      />

      <div className="min-w-0 flex-1">
        <Link
          href={`/songs/${encodeURIComponent(track.slug)}/`}
          className={`text-sm font-semibold truncate block hover:underline ${
            isActive ? "gm-rainbow-text" : "text-[var(--gm-text)]"
          }`}
        >
          {track.title}
        </Link>
        <p className="text-xs text-[var(--gm-text-muted)] truncate">
          {track.artist?.name || BRAND_CONFIG.owner}
          {track.album ? ` • ${track.album.title}` : ""}
        </p>
      </div>

      <span className="hidden md:inline-block text-xs text-[var(--gm-text-muted)] w-24 truncate">
        {track.genre?.name || "—"}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => toggleFavorite(track.id)}
          className={`p-1.5 rounded-lg ${
            isFav ? "text-rose-500" : "text-[var(--gm-text-muted)] hover:text-[var(--gm-text)]"
          }`}
          aria-label="Toggle favorite"
        >
          <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
        </button>

        {canDownload && (
          <button
            type="button"
            onClick={async () => {
              const res = await downloadAuthorizedTrackClient(track, downloadPolicy);
              if (!res.ok && res.error) showToast(res.error, "error");
            }}
            className="p-1.5 rounded-lg text-[var(--gm-text-muted)] hover:text-emerald-400"
            aria-label={`Download ${track.title}`}
          >
            <Download className="h-4 w-4" />
          </button>
        )}

        <span className="text-xs tabular-nums text-[var(--gm-text-muted)] w-11 text-right">
          {formatDuration(track.duration_seconds)}
        </span>
      </div>
    </div>
  );
}

export function EmptyLibraryState({
  title = "Your Soundstage Awaits",
  subtitle = "No published tracks are in the library yet. New music releases will appear here soon.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="gm-surface gm-rainbow-border rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-6">
      <div className="relative w-20 h-20 mx-auto mb-5">
        <Image
          src="/brand/guru-music-icon.png"
          alt="Guru Music"
          fill
          sizes="80px"
          className="rounded-2xl object-cover"
        />
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 text-xs font-semibold text-purple-300 mb-3">
        <Sparkles className="h-3.5 w-3.5" />
        <span>GURU MUSIC • MUSIC BEYOND LIMITS</span>
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-[var(--gm-text-muted)] max-w-md mx-auto leading-relaxed">
        {subtitle}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <Link
          href="/genres"
          className="px-5 py-2.5 rounded-full gm-surface hover:bg-white/10 text-sm font-semibold inline-flex items-center gap-2"
        >
          <Music2 className="h-4 w-4 text-blue-400" />
          Browse Genres
        </Link>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="gm-surface rounded-2xl p-3 animate-pulse">
          <div className="aspect-square rounded-xl bg-white/10 mb-3" />
          <div className="h-3.5 w-3/4 rounded bg-white/10 mb-2" />
          <div className="h-3 w-1/2 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}
