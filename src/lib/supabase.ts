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

const envUrl = typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_URL : undefined;
const envKey = typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_ANON_KEY : undefined;

const supabaseUrl = envUrl || "https://ssjmaqnuczmwtaeefpad.supabase.co";
const supabaseAnonKey = envKey || "sb_publishable__uzEWRjBffpT_X3hInQkng_5P1y3LUd";

export const supabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("placeholder"),
);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  },
);

export type { Session, User as SupabaseUser } from "@supabase/supabase-js";
