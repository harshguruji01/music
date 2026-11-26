import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured, isSupabasePublicConfigured } from "@/lib/supabase/config";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "Guru Music",
    owner: "HarshGuruJi",
    supabasePublicConfigured: isSupabasePublicConfigured(),
    supabaseAdminConfigured: isSupabaseAdminConfigured(),
    timestamp: new Date().toISOString(),
  });
}
