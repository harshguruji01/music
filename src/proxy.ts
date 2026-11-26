import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabasePublicConfigured } from "./lib/supabase/config";
import { getAdminSessionMaxAgeSeconds, isEmailAllowlisted } from "./lib/security";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });

  // Protect /admin/* routes (excluding /admin/login and /admin/setup)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && pathname !== "/admin/setup") {
    if (!isSupabasePublicConfigured()) {
      return NextResponse.redirect(new URL("/admin/login?reason=unconfigured", request.url));
    }

    const sessionAtRaw = request.cookies.get("gm_admin_session_at")?.value;
    const sessionAt = Number(sessionAtRaw || "0");
    const maxAgeMs = getAdminSessionMaxAgeSeconds() * 1000;
    if (!sessionAtRaw || !Number.isFinite(sessionAt) || Date.now() - sessionAt > maxAgeMs) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("reason", "expired");
      return NextResponse.redirect(loginUrl);
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isEmailAllowlisted(user.email)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("reason", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }

    // Verify user_roles via RLS-protected own-role read
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleRow || roleRow.role !== "admin") {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("reason", "forbidden");
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
