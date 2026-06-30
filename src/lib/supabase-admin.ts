import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the `service_role` key.
 *
 * This client bypasses Row Level Security (RLS) entirely, so it must
 * ONLY be used inside server-side code (API routes, server actions).
 * Never import this from a `"use client"` component.
 *
 * Authorization is enforced at the API route level via Firebase Admin
 * token verification + custom-claim checks — not by Supabase RLS.
 */
function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "[supabase-admin] Missing required environment variables: " +
        "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. " +
        "Ensure they are set in .env.local."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      // We don't need Supabase auth sessions on the server —
      // auth is handled entirely by Firebase.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const supabaseAdmin = getSupabaseAdmin();
