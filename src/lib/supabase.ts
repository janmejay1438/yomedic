import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Single Supabase client instance for the browser.
// Uses the public anon key — RLS policies enforce access control.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
