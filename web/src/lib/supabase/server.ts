import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function isSupabaseConfigured() {
  return Boolean(url && anon && !url.includes("your-project"));
}

export function isSupabaseServiceConfigured() {
  return isSupabaseConfigured() && Boolean(service) && !service.includes("your-service");
}

/** Browser / user-scoped client (anon key). */
export function createBrowserSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ANON KEY.");
  }
  return createClient(url, anon);
}

/** Server-only client with service role (bypasses RLS). */
export function createServiceSupabase(): SupabaseClient {
  if (!isSupabaseServiceConfigured()) {
    throw new Error("Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
