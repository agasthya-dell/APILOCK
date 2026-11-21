/**
 * APILOCK — Authentication Store
 *
 * Uses Supabase Auth when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set.
 * Falls back to localStorage simulation when they are absent (offline / dev).
 *
 * Supabase handles:
 *  - Email + password sign-up / sign-in
 *  - GitHub OAuth (configure the GitHub provider in your Supabase dashboard)
 *  - Google OAuth (configure the Google provider in your Supabase dashboard)
 *  - Session persistence, token refresh, PKCE flow
 *
 * The app-level User shape is kept stable so the rest of the app
 * never needs to import from @supabase/supabase-js directly.
 */

import { supabase, supabaseConfigured } from "./supabase";

// ─── App-level user type (provider-agnostic) ──────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | undefined;
  githubLogin?: string | undefined;
  provider: "email" | "github" | "google" | "unknown";
  createdAt: string;
}

// ─── localStorage keys (fallback / cache) ─────────────────────────────────────

const AUTH_KEY = "APILOCK_auth_user";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ─── Exported helper so auth.callback.tsx can reuse it ───────────────────────
export function sbUserToLocalUser(sbUser: import("@supabase/supabase-js").User): User {
  return sbUserToAppUser(sbUser);
}

function sbUserToAppUser(sbUser: import("@supabase/supabase-js").User): User {
  const meta = sbUser.user_metadata as Record<string, string> | undefined ?? {};
  const provider = (sbUser.app_metadata["provider"] as string | undefined) ?? "unknown";

  return {
    id: sbUser.id,
    email: sbUser.email ?? "",
    name:
      meta["full_name"] ??
      meta["name"] ??
      meta["user_name"] ??
      (sbUser.email?.split("@")[0] ?? "User"),
    avatarUrl: meta["avatar_url"],
    githubLogin: provider === "github" ? (meta["user_name"] ?? undefined) : undefined,
    provider: (["email", "github", "google"].includes(provider)
      ? provider
      : "unknown") as User["provider"],
    createdAt: sbUser.created_at,
  };
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function storeUser(user: User): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } catch {}
}

export function clearUser(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {}
}

// ─── Email / password ─────────────────────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> {
  if (!email.includes("@")) return { user: null, error: "Please enter a valid email address." };
  if (password.length < 6) return { user: null, error: "Password must be at least 6 characters." };

  if (supabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: "Sign-in failed — please try again." };
    const user = sbUserToAppUser(data.user);
    storeUser(user);
    return { user, error: null };
  }

  // ── Fallback: localStorage simulation ──
  await new Promise((r) => setTimeout(r, 700));
  const existing = getStoredUser();
  if (existing && existing.email === email) {
    storeUser(existing);
    return { user: existing, error: null };
  }
  const user: User = {
    id: `user-${Date.now()}`,
    email,
    name: email.split("@")[0]!,
    provider: "email",
    createdAt: new Date().toISOString(),
  };
  storeUser(user);
  return { user, error: null };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<{ user: User | null; error: string | null }> {
  if (!email.includes("@")) return { user: null, error: "Please enter a valid email address." };
  if (password.length < 6) return { user: null, error: "Password must be at least 6 characters." };
  if (name.trim().length < 2) return { user: null, error: "Please enter your full name." };

  if (supabaseConfigured) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name.trim() },
        // Point confirmation emails directly at the dashboard —
        // avoids routing through /auth/callback for email flows.
        emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard`,
      },
    });
    if (error) return { user: null, error: error.message };
    if (!data.user) return { user: null, error: "Sign-up failed — please try again." };

    const user = sbUserToAppUser(data.user);
    storeUser(user);

    // If email confirmation is required, session will be null.
    if (!data.session) {
      return {
        user: null,
        error: "Check your inbox — we sent you a confirmation link before you can sign in.",
      };
    }
    return { user, error: null };
  }

  // ── Fallback ──
  await new Promise((r) => setTimeout(r, 800));
  const user: User = {
    id: `user-${Date.now()}`,
    email,
    name: name.trim(),
    provider: "email",
    createdAt: new Date().toISOString(),
  };
  storeUser(user);
  return { user, error: null };
}

// ─── OAuth ───────────────────────────────────────────────────────────────────

export async function signInWithGitHub(): Promise<void> {
  if (supabaseConfigured) {
    // This opens github.com — user enters their GitHub username + password
    // or picks an already-signed-in account, exactly like any GitHub OAuth app.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "read:user user:email",
        // Skip the Supabase intermediate screen and go straight to GitHub
        queryParams: { prompt: "select_account" },
      },
    });
    // signInWithOAuth redirects the browser — if we're still here it errored
    if (error) throw new Error(error.message);
    return;
  }
  // Fallback demo (no Supabase configured)
  const user = createDemoGitHubUser();
  storeUser(user);
}

export async function signInWithGoogle(): Promise<void> {
  if (supabaseConfigured) {
    // This opens accounts.google.com — user picks or enters their Google account
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Forces the Google account chooser every time
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw new Error(error.message);
    return;
  }
  // Fallback demo
  const user = createDemoGoogleUser();
  storeUser(user);
}

// ─── Session helpers ─────────────────────────────────────────────────────────

/**
 * Call once on app boot (e.g. in __root.tsx) to sync the Supabase session
 * into the localStorage cache so getStoredUser() works synchronously.
 */
export async function syncSessionFromSupabase(): Promise<User | null> {
  if (!supabaseConfigured) return getStoredUser();
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    const user = sbUserToAppUser(data.session.user);
    storeUser(user);
    return user;
  }
  clearUser();
  return null;
}

export async function signOut(): Promise<void> {
  if (supabaseConfigured) {
    await supabase.auth.signOut();
  }
  clearUser();
}

// ─── OAuth callback handler ───────────────────────────────────────────────────
// Called from /auth/callback after the OAuth redirect returns.

export async function handleOAuthCallback(): Promise<{ user: User | null; error: string | null }> {
  if (!supabaseConfigured) return { user: getStoredUser(), error: null };

  // With PKCE flow, Supabase exchanges the code automatically via detectSessionInUrl.
  const { data, error } = await supabase.auth.getSession();
  if (error) return { user: null, error: error.message };
  if (!data.session?.user) return { user: null, error: "No session found after redirect." };

  const user = sbUserToAppUser(data.session.user);
  storeUser(user);
  return { user, error: null };
}

// ─── Demo fallbacks (used when Supabase is not configured) ───────────────────

export function createDemoGitHubUser(): User {
  const user: User = {
    id: `github-demo-${Date.now()}`,
    email: "demo@github.com",
    name: "GitHub User (Demo)",
    avatarUrl: "https://avatars.githubusercontent.com/u/0",
    githubLogin: "demo-user",
    provider: "github",
    createdAt: new Date().toISOString(),
  };
  storeUser(user);
  return user;
}

export function createDemoGoogleUser(): User {
  const user: User = {
    id: `google-demo-${Date.now()}`,
    email: "demo@gmail.com",
    name: "Google User (Demo)",
    provider: "google",
    createdAt: new Date().toISOString(),
  };
  storeUser(user);
  return user;
}

/**
 * Get the GitHub access token from the current Supabase session.
 * Only available when the user signed in via GitHub OAuth.
 */
export async function getGitHubAccessToken(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.provider_token ?? null;
  return token;
}

export const GITHUB_CLIENT_ID = "";

export function startGitHubOAuth(): void {
  void signInWithGitHub();
}
