import { createClient } from "@supabase/supabase-js";
import { isSupabaseAdminConfigured } from "./config";

/**
 * Server-only privileged Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * NEVER import this module into client components.
 */
export function getSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdminClient cannot be used in the browser.");
  }
  if (!isSupabaseAdminConfigured()) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
