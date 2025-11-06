/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { mockSupabaseClient } from "./mockSupabaseClient";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use mock client if environment variables are not set
const useMockClient = !supabaseUrl || !supabaseAnonKey;

if (useMockClient) {
  console.info(
    "🎭 Using mock data (localStorage-based). To use real Supabase, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local"
  );
}

// Facade: returns mock client if no env vars, otherwise real Supabase client
export const supabase = useMockClient
  ? (mockSupabaseClient as any)
  : createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export a flag so hooks can adapt behavior (e.g., filters)
export const isMockSupabase = useMockClient;
