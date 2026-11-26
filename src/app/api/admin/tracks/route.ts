import { NextRequest, NextResponse } from "next/server";
import { logAdminActivity, requireAdmin, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isValidUuid } from "@/lib/format";
import { sanitizeText } from "@/lib/security";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const adminDb = getSupabaseAdminClient()!;
  const { searchParams } = new URL(request.url);
  const q = sanitizeText(searchParams.get("q") || "", 100);
  const status = searchParams.get("status") || "all";
  const genreId = searchParams.get("genreId") || "";
  const sort = searchParams.get("sort") || "created_at";
  const dir = searchParams.get("dir") === "asc" ? true : false;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") || "20")));

  let query = adminDb
    .from("tracks")
    .select(
      "*, artist:artists(id, name, slug), album:albums(id, title, slug), genre:genres(id, name, slug, color_accent)",
      { count: "exact" }
    );

  if (q) {
    const cleaned = q.replace(/[%_]/g, "");
    query = query.ilike("title", `%${cleaned}%`);
  }
  if (status === "published") query = query.eq("is_published", true);
  if (status === "draft") query = query.eq("is_published", false);
  if (status === "featured") query = query.eq("is_featured", true);
  if (status === "downloadable") query = query.eq("is_downloadable", true);
  if (genreId && isValidUuid(genreId)) query = query.eq("genre_id", genreId);

  const validSorts = new Set(["created_at", "title", "play_count", "download_count", "duration_seconds"]);
  const sortCol = validSorts.has(sort) ? sort : "created_at";
  query = query.order(sortCol, { ascending: dir });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tracks: data || [],
    total: count ?? 0,
    page,
    pageSize,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return unauthorizedAdminResponse(auth);

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id: unknown): id is string => typeof id === "string" && isValidUuid(id))
    : [];
  const action = sanitizeText(body?.action || "", 40);

  if (ids.length === 0) {
    return NextResponse.json({ error: "No valid track IDs provided." }, { status: 400 });
  }

  const adminDb = getSupabaseAdminClient()!;

  if (action === "delete") {
    const { data: targets } = await adminDb
      .from("tracks")
      .select("id, audio_bucket, audio_path, cover_path")
      .in("id", ids);

    for (const t of targets || []) {
      if (t.audio_path) {
        await adminDb.storage.from(t.audio_bucket || "draft-audio").remove([t.audio_path]);
      }
      if (t.cover_path) {
        await adminDb.storage.from("song-artwork").remove([t.cover_path]);
      }
    }

    await adminDb.from("tracks").delete().in("id", ids);
    await logAdminActivity({
      adminId: auth.admin.userId,
      adminEmail: auth.admin.email,
      action: "admin.tracks.bulk_delete",
      resourceType: "track",
      details: { count: ids.length, ids },
      request,
    });
    return NextResponse.json({ ok: true, affected: ids.length });
  }

  if (action === "publish" || action === "unpublish") {
    const targetPublished = action === "publish";
    const destBucket = targetPublished ? "published-audio" : "draft-audio";

    const { data: rows } = await adminDb
      .from("tracks")
      .select("id, audio_bucket, audio_path")
      .in("id", ids);

    for (const row of rows || []) {
      const currentBucket = row.audio_bucket;
      if (currentBucket !== destBucket && row.audio_path) {
        const { data: fileBlob } = await adminDb.storage
          .from(currentBucket)
          .download(row.audio_path);
        if (fileBlob) {
          const buf = Buffer.from(await fileBlob.arrayBuffer());
          await adminDb.storage.from(destBucket).upload(row.audio_path, buf, { upsert: true });
          await adminDb.storage.from(currentBucket).remove([row.audio_path]);
        }
      }
      const nextUrl = targetPublished
        ? adminDb.storage.from("published-audio").getPublicUrl(row.audio_path).data.publicUrl
        : null;

      await adminDb
        .from("tracks")
        .update({
          is_published: targetPublished,
          audio_bucket: destBucket,
          audio_url: nextUrl,
        })
        .eq("id", row.id);
    }

    await logAdminActivity({
      adminId: auth.admin.userId,
      adminEmail: auth.admin.email,
      action: targetPublished ? "admin.tracks.bulk_publish" : "admin.tracks.bulk_unpublish",
      resourceType: "track",
      details: { count: ids.length, ids },
      request,
    });
    return NextResponse.json({ ok: true, affected: ids.length });
  }

  const updateFields: Record<string, boolean> = {};
  if (action === "feature") updateFields.is_featured = true;
  else if (action === "unfeature") updateFields.is_featured = false;
  else if (action === "enable_download") updateFields.is_downloadable = true;
  else if (action === "disable_download") updateFields.is_downloadable = false;
  else return NextResponse.json({ error: "Unsupported bulk action." }, { status: 400 });

  await adminDb.from("tracks").update(updateFields).in("id", ids);
  await logAdminActivity({
    adminId: auth.admin.userId,
    adminEmail: auth.admin.email,
    action: `admin.tracks.bulk_${action}`,
    resourceType: "track",
    details: { count: ids.length, ids },
    request,
  });

  return NextResponse.json({ ok: true, affected: ids.length });
}
