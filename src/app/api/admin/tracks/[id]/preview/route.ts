import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/format";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid track ID." }, { status: 400 });
  }

  const adminDb = getSupabaseAdminClient()!;
  const { data: track } = await adminDb
    .from("tracks")
    .select("id, title, audio_bucket, audio_path")
    .eq("id", id)
    .maybeSingle();

  if (!track || !track.audio_path) {
    return NextResponse.json({ error: "Track audio not found." }, { status: 404 });
  }

  const bucket = track.audio_bucket || "draft-audio";
  const { data, error } = await adminDb.storage
    .from(bucket)
    .createSignedUrl(track.audio_path, 120);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Unable to create signed preview URL." }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl, expiresInSeconds: 120 });
}
