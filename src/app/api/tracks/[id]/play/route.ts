import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabasePublicConfigured } from "@/lib/supabase/config";
import { isValidUuid } from "@/lib/format";
import { sanitizeText } from "@/lib/security";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid track identifier." }, { status: 400 });
  }
  if (!isSupabasePublicConfigured()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body = await request.json().catch(() => ({}));
  const sessionId = sanitizeText(body?.sessionId || "", 80) || null;

  const adminDb = getSupabaseAdminClient();
  const serverDb = await getSupabaseServerClient();
  const db = adminDb || serverDb;
  if (!db) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Verify published status first
  const { data: track } = await db
    .from("tracks")
    .select("id, is_published")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (!track) {
    return NextResponse.json({ error: "Track unavailable." }, { status: 404 });
  }

  if (adminDb) {
    await Promise.all([
      adminDb.from("play_events").insert({
        track_id: id,
        session_id: sessionId,
      }),
      adminDb.rpc("increment_play_count", { target_track_id: id }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
