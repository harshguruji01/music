import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ADMIN_SESSION_COOKIE, logAdminActivity, requireAdmin } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  const supabase = await getSupabaseServerClient();

  if (auth.ok) {
    await logAdminActivity({
      adminId: auth.admin.userId,
      adminEmail: auth.admin.email,
      action: "admin.logout",
      status: "success",
      request,
    });
  }

  if (supabase) {
    await supabase.auth.signOut();
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
