#!/usr/bin/env python3
"""
Guru Music — Dynamic Sitemap Generator
Fetches all published songs, artists, albums, playlists, and genres from Supabase
and writes a validated W3C-compliant sitemap.xml for music.webguruji.online.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

DEFAULT_SITE_URL = "https://music.webguruji.online"
DEFAULT_SUPABASE_URL = "https://wumdbpyhpblvgjttsbpv.supabase.co"
DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_xLqKY9N62MXb6ELG-5trig_RlJs_n-l"

STATIC_ROUTES: list[tuple[str, str, str]] = [
    ("", "daily", "1.0"),
    ("/explore/", "daily", "0.9"),
    ("/songs/", "daily", "0.9"),
    ("/trending/", "daily", "0.9"),
    ("/featured/", "daily", "0.8"),
    ("/recent/", "daily", "0.9"),
    ("/artists/", "daily", "0.8"),
    ("/albums/", "daily", "0.8"),
    ("/playlists/", "daily", "0.8"),
    ("/genres/", "weekly", "0.8"),
    ("/search/", "weekly", "0.6"),
    ("/favorites/", "weekly", "0.5"),
    ("/library/", "weekly", "0.5"),
]


def load_env_file(env_path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not env_path.exists():
        return values
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        values[key.strip()] = val.strip().strip('"').strip("'")
    return values


def get_config(root_dir: Path) -> tuple[str, str, str]:
    env_file = load_env_file(root_dir / ".env.local")
    site_url = (
        os.environ.get("NEXT_PUBLIC_SITE_URL")
        or env_file.get("NEXT_PUBLIC_SITE_URL")
        or DEFAULT_SITE_URL
    ).rstrip("/")
    sb_url = (
        os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        or env_file.get("NEXT_PUBLIC_SUPABASE_URL")
        or DEFAULT_SUPABASE_URL
    ).rstrip("/")
    sb_key = (
        os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or env_file.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        or DEFAULT_SUPABASE_ANON_KEY
    )
    if "your-project-ref" in sb_url or "your-supabase-anon-key" in sb_key:
        return site_url, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY
    return site_url, sb_url, sb_key


def normalize_lastmod(raw: str | None, fallback: str) -> str:
    if not raw:
        return fallback
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return fallback


def fetch_table_rows(
    sb_url: str,
    sb_key: str,
    table: str,
    select_cols: str,
    published_only: bool = True,
) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    page_size = 1000

    while True:
        params = {
            "select": select_cols,
            "order": "updated_at.desc",
            "limit": str(page_size),
            "offset": str(offset),
        }
        if published_only:
            params["is_published"] = "eq.true"

        url = f"{sb_url}/rest/v1/{table}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(
            url,
            headers={
                "apikey": sb_key,
                "Authorization": f"Bearer {sb_key}",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                chunk = json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
            print(f"[sitemap] Warning: could not fetch {table}: {exc}", file=sys.stderr)
            break

        if not isinstance(chunk, list) or not chunk:
            break
        rows.extend(chunk)
        if len(chunk) < page_size:
            break
        offset += page_size

    return rows


def build_sitemap_xml(site_url: str, sb_url: str, sb_key: str) -> tuple[str, int]:
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    seen_urls: set[str] = set()
    entries: list[tuple[str, str, str, str]] = []

    def add_entry(loc: str, lastmod: str, changefreq: str, priority: str) -> None:
        if loc in seen_urls or len(entries) >= 50000:
            return
        seen_urls.add(loc)
        entries.append((loc, lastmod, changefreq, priority))

    for path, freq, prio in STATIC_ROUTES:
        add_entry(f"{site_url}{path}", now_iso, freq, prio)

    dynamic_sources = [
        ("tracks", "/songs/view/?slug=", True, "weekly", "0.8"),
        ("artists", "/artists/view/?slug=", True, "weekly", "0.7"),
        ("albums", "/albums/view/?slug=", True, "weekly", "0.7"),
        ("playlists", "/playlists/view/?slug=", True, "weekly", "0.7"),
        ("genres", "/genres/view/?slug=", False, "weekly", "0.7"),
    ]

    for table, prefix, pub_only, freq, prio in dynamic_sources:
        rows = fetch_table_rows(sb_url, sb_key, table, "slug,updated_at", published_only=pub_only)
        for row in rows:
            slug = str(row.get("slug") or "").strip()
            if not slug:
                continue
            encoded_slug = urllib.parse.quote(slug, safe="-_")
            loc = f"{site_url}{prefix}{encoded_slug}"
            lastmod = normalize_lastmod(row.get("updated_at"), now_iso)
            add_entry(loc, lastmod, freq, prio)

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod, changefreq, priority in entries:
        lines.append("  <url>")
        lines.append(f"    <loc>{escape(loc)}</loc>")
        lines.append(f"    <lastmod>{escape(lastmod)}</lastmod>")
        lines.append(f"    <changefreq>{changefreq}</changefreq>")
        lines.append(f"    <priority>{priority}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")
    xml_content = "\n".join(lines) + "\n"

    # Strict XML validation before writing
    ET.fromstring(xml_content)
    return xml_content, len(entries)


def main() -> int:
    root_dir = Path(__file__).resolve().parent.parent
    site_url, sb_url, sb_key = get_config(root_dir)
    xml_content, count = build_sitemap_xml(site_url, sb_url, sb_key)

    targets = [root_dir / "sitemap.xml"]
    out_dir = root_dir / "out"
    if out_dir.exists() and out_dir.is_dir():
        targets.append(out_dir / "sitemap.xml")

    for target in targets:
        target.write_text(xml_content, encoding="utf-8")

    print(f"[sitemap] Generated valid sitemap.xml with {count} URL(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
