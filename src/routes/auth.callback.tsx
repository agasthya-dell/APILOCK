/**
 * /auth/callback
 *
 * Landing page after any Supabase OAuth redirect (GitHub, Google).
 * With flowType:"implicit" the access_token arrives in the URL hash —
 * supabase-js detects it automatically via detectSessionInUrl and fires
 * a SIGNED_IN event.  We wait for that event then go to /dashboard.
 *
 * Email/password logins never land here — they navigate directly to
 * /dashboard from auth.tsx after signInWithPassword succeeds.
 */
import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Radar, XCircle } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { sbUserToLocalUser, storeUser, getStoredUser } from "@/lib/auth-store";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in… — APILOCK" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If Supabase is not configured, just check localStorage and move on.
    if (!supabaseConfigured) {
      const user = getStoredUser();
      if (user) navigate({ to: "/dashboard" });
      else setError("No session found. Please sign in again.");
      return;
    }

    let handled = false;

    const finish = (sbUser: import("@supabase/supabase-js").User) => {
      if (handled) return;
      handled = true;
      sub.unsubscribe();
      clearTimeout(timer);
      storeUser(sbUserToLocalUser(sbUser));
      // Hard redirect — avoids React router hydration race
      window.location.href = "/dashboard";
    };

    // Listen for the session that supabase-js extracts from the URL hash.
    const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
          finish(session.user);
        }
      },
    );

    // Fast-path: session may already be available if detectSessionInUrl ran
    // before this component mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) finish(data.session.user);
    });

    // Safety timeout
    const timer = setTimeout(() => {
      if (handled) return;
      handled = true;
      sub.unsubscribe();
      setError("Sign-in timed out. Please try again.");
    }, 10_000);

    return () => {
      sub.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex flex-col items-center justify-center gap-5">
      <Radar className="w-8 h-8 text-[#bef264]" />

      {error ? (
        <div className="text-center space-y-3">
          <XCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-[var(--color-ink)]">Sign-in failed</p>
          <p className="text-xs text-[var(--color-ink-muted)] max-w-xs">{error}</p>
          <a href="/auth" className="text-xs font-semibold text-[var(--color-ink)] underline">
            Try again
          </a>
        </div>
      ) : (
        <div className="text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-ink-muted)] mx-auto" />
          <p className="text-sm text-[var(--color-ink-muted)]">Completing sign-in…</p>
        </div>
      )}
    </div>
  );
}
