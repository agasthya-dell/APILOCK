import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Github, Loader2, Mail, Radar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGitHub,
  signInWithGoogle,
  getStoredUser,
  syncSessionFromSupabase,
} from "@/lib/auth-store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — APILOCK" },
      { name: "description", content: "Sign in to APILOCK to analyze your GitHub repositories." },
    ],
  }),
  component: AuthPage,
});

// Hard redirect — bypasses React router hydration race entirely
function goToDashboard() {
  window.location.href = "/dashboard";
}

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if already logged in — sync from Supabase first
    syncSessionFromSupabase().then((liveUser) => {
      if (liveUser ?? getStoredUser()) goToDashboard();
    });
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading("email");
    try {
      const result = mode === "signin"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password, name);
      if (result.error) {
        setError(result.error);
        setLoading(null);
      } else if (result.user) {
        // Hard redirect so the full page reloads with the new session
        goToDashboard();
      } else {
        setLoading(null);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  const handleGitHub = async () => {
    setError(null);
    setLoading("github");
    try {
      // signInWithGitHub triggers a full browser redirect to GitHub — no return here
      await signInWithGitHub();
    } catch (err) {
      setError("GitHub sign-in failed. Please try again.");
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading("google");
    try {
      // signInWithGoogle triggers a full browser redirect to Google — no return here
      await signInWithGoogle();
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(null);
    }
  };

  // Don't render anything on the server — avoids all hydration mismatches
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--color-paper)] flex items-center justify-center">
        <Radar className="w-8 h-8 text-[#bef264] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper)] flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full flex-shrink-0">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        <Link to="/" className="inline-flex items-center gap-2 font-bold text-base text-[var(--color-ink)]">
          <Radar className="w-5 h-5 text-[#bef264]" />
          APILOCK
        </Link>
      </header>

      {/* Two-column layout */}
      <main className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL: ascii-cat artwork ── */}
        <div className="hidden lg:block lg:w-1/2 bg-[var(--color-ink)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#bef264]/40 z-10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/ascii-cat.svg"
              alt="APILOCK ASCII Cat"
              className="w-full h-full object-cover select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* ── RIGHT PANEL: auth form ── */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-10 overflow-y-auto">
          <div className="w-full max-w-md">

            {/* Heading */}
            <div className="text-center mb-8">
              <div className="lg:hidden inline-flex items-center justify-center w-13 h-13 rounded-2xl bg-[#bef264]/20 border border-[#bef264]/40 mb-5 p-3">
                <Radar className="w-7 h-7 text-[#5a7a00]" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-ink)] mb-2">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-sm text-[var(--color-ink-muted)]">
                {mode === "signin"
                  ? "Sign in to analyze your repositories"
                  : "Start analyzing your GitHub repositories"}
              </p>
            </div>

            {/* OAuth buttons */}
            <div className="space-y-3 mb-6">
              <button
                onClick={handleGitHub}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] hover:bg-[var(--color-accent)] text-sm font-semibold text-[var(--color-ink)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === "github" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
                Continue with GitHub
              </button>

              <button
                onClick={handleGoogle}
                disabled={!!loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] hover:bg-[var(--color-accent)] text-sm font-semibold text-[var(--color-ink)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === "google" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--color-border)]" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-[var(--color-paper)] text-xs text-[var(--color-ink-muted)] font-medium">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5 uppercase tracking-wide">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none focus:border-[#bef264] focus:ring-2 focus:ring-[#bef264]/20 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5 uppercase tracking-wide">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none focus:border-[#bef264] focus:ring-2 focus:ring-[#bef264]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] outline-none focus:border-[#bef264] focus:ring-2 focus:ring-[#bef264]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={!!loading}
                className="w-full bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-marker)] font-semibold text-sm py-2.5 h-auto rounded-xl transition-all"
              >
                {loading === "email" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                  </>
                ) : (
                  <>
                    {mode === "signin" ? "Sign in" : "Create account"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Toggle mode */}
            <p className="text-center text-sm text-[var(--color-ink-muted)] mt-6">
              {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
                className="text-[var(--color-ink)] font-semibold hover:text-[var(--color-marker)] transition-colors"
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>

            <p className="text-center text-xs text-[var(--color-ink-muted)] mt-4 max-w-xs mx-auto">
              By continuing, you agree that APILOCK will analyze only repositories you authorize.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
