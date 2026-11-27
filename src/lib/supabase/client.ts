"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfigValues, isSupabasePublicConfigured } from "./config";

let browserClient: SupabaseClient | null = null;
let cachedKey = "";

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabasePublicConfigured()) return null;
  const { url, anonKey } = getSupabaseConfigValues();
  const nextKey = `${url}|${anonKey}`;
  if (browserClient && cachedKey === nextKey) return browserClient;

  cachedKey = nextKey;
  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browserClient;
}
