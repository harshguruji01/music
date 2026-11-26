import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { isValidUuid } from "@/lib/format";

export async function POST(request: NextRequest) {
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ tracks: [] });
  }

  const body = await request.json().catch(() => ({}));
  const rawIds = Array.isArray(body?.ids) ? body.ids : [];
  const ids = rawIds.filter((v: unknown): v is string => typeof v === "string" && isValidUuid(v)).slice(0, 60);

  if (ids.length === 0) {
    return NextResponse.json({ tracks: [] });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ tracks: [] });
  }

  const { data } = await supabase
    .from("tracks")
    .select(
      "*, artist:artists(id, name, slug, image_url), album:albums(id, title, slug, cover_url), genre:genres(id, name, slug, color_accent)"
    )
    .in("id", ids)
    .eq("is_published", true);

  return NextResponse.json({ tracks: data || [] });
}
