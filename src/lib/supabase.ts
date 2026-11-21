/**
 * APILOCK — Supabase Client
 *
 * Single shared client instance for the whole app.
 * Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
 * (never commit those values — the anon key is safe to expose in the
 * browser but the URL+key pair should stay out of public repos).
 *
 * When the env vars are absent (local dev without a project, or SSR
 * pre-render) every Supabase call will return an error that the callers
 * in auth-store.ts handle gracefully by falling back to localStorage.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined ?? "";
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined ?? "";

export const supabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // implicit works for both OAuth and magic-link without a server-side
      // token exchange step, keeping the flow entirely client-side.
      flowType: "implicit",
    },
  },
);

export type { Session, User as SupabaseUser } from "@supabase/supabase-js";
