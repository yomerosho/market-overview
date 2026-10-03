"use client";

// The browser Supabase client, or null when the project isn't configured.
// Everything that touches it has to cope with null: the app runs fully
// offline with localStorage until someone sets the two env vars.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

export const authConfigured = () => supabase() !== null;
