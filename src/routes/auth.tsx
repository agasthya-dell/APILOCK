import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Github, Loader2, Mail, Radar, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskPhillNavbar } from "@/components/AskPhillNavbar";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGitHub,
  signInWithGoogle,
  syncSessionFromSupabase,
} from "@/lib/auth-store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Authentication — APILOCK Command Center" },
      { name: "description", content: "Sign in to APILOCK to analyze and monitor your GitHub repositories." },
    ],
  }),
  component: AuthPage,
});

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
    syncSessionFromSupabase().then((liveUser) => {
      if (liveUser) goToDashboard();
    });
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading("email");
    try {
      const result =
        mode === "signin"
          ? await signInWithEmail(email, password)
          : await signUpWithEmail(email, password, name);
      if (result.error) {
        setError(result.error);
        setLoading(null);
      } else if (result.user) {
        goToDashboard();
      } else {
        setLoading(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  const handleGitHub = async () => {
    setError(null);
    setLoading("github");
    try {
      await signInWithGitHub();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "GitHub sign-in failed. Please try again.");
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading("google");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
      setLoading(null);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#060b07] flex items-center justify-center text-white">
        <Radar className="w-10 h-10 text-[#bef264] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b07] text-white relative selection:bg-[#bef264] selection:text-black font-sans overflow-x-hidden flex flex-col justify-between">
      {/* ─── Ambient Matrix Background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img
          src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&q=80&auto=format&fit=crop"
          alt=""
          className="w-full h-full object-cover opacity-[0.06] mix-blend-screen"
        />
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-[#bef264]/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `linear-gradient(#bef264 1px, transparent 1px), linear-gradient(90deg, #bef264 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Floating Ask Phill Navbar */}
      <div className="relative z-50">
        <AskPhillNavbar />
      </div>

      {/* Main Two-Column Auth Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 flex items-center justify-center w-full">
        <div className="w-full rounded-3xl overflow-hidden border border-[#bef264]/30 bg-[#0c150e]/85 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] grid grid-cols-1 lg:grid-cols-12">
          
          {/* ── LEFT PANEL: ASCII Art / Surveillance Graphic ── */}
          <div className="hidden lg:flex lg:col-span-5 bg-black/60 border-r border-[#bef264]/20 p-8 flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1000&q=80&auto=format&fit=crop"
                alt=""
                className="w-full h-full object-cover opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
            </div>

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#bef264]/15 border border-[#bef264]/40 text-[#bef264] text-[10px] font-mono font-bold tracking-widest uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-[#bef264]" /> SECURE ACCESS PORTAL
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Zero-Trust Telemetry & Defense
              </h2>
              <p className="text-xs text-white/70 leading-relaxed font-sans">
                Authenticate with your GitHub account to access real-time perimeter surveillance, AST audits, and secret exposure logs.
              </p>
            </div>

            <div className="relative z-10 my-6 flex justify-center">
              <div className="rounded-2xl p-4 bg-black/80 border border-[#bef264]/30 shadow-[0_0_25px_rgba(190,242,100,0.15)] max-w-[280px]">
                <img
                  src="/ascii-cat.svg"
                  alt="APILOCK Mascot"
                  className="w-full h-48 object-contain select-none"
                  draggable={false}
                />
              </div>
            </div>

            <div className="relative z-10 text-[11px] font-mono text-white/40">
              ENCRYPTED TLS 1.3 · ZERO RETENTION OF RAW SECRETS
            </div>
          </div>

          {/* ── RIGHT PANEL: Auth Form ── */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              {/* Heading */}
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#bef264]/10 border border-[#bef264]/30 text-[#bef264] text-[10px] font-mono font-bold tracking-widest uppercase mb-3">
                  <Lock className="w-3 h-3 text-[#bef264]" /> OPERATOR LOGIN
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {mode === "signin" ? "Access Command Center" : "Create Operator Account"}
                </h1>
                <p className="text-xs sm:text-sm text-white/60 mt-1 font-sans">
                  {mode === "signin"
                    ? "Sign in to inspect and monitor your connected repositories."
                    : "Create an account to start scanning your GitHub codebases."}
                </p>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={handleGitHub}
                  disabled={!!loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-[#bef264] hover:text-black hover:border-[#bef264] text-xs font-mono font-bold text-white transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-sm group"
                >
                  {loading === "github" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Github className="w-4 h-4 text-white group-hover:text-black transition-colors" />
                  )}
                  Continue with GitHub
                </button>

                <button
                  onClick={handleGoogle}
                  disabled={!!loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/15 text-xs font-mono font-bold text-white transition-all duration-300 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {loading === "google" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Continue with Google
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-[#0c150e] text-[11px] font-mono text-white/50 uppercase tracking-widest">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="block text-xs font-mono font-bold text-white/80 mb-1.5 uppercase tracking-wide">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Operator"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-white/15 bg-black/60 text-xs font-mono text-white placeholder-white/30 outline-none focus:border-[#bef264] transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono font-bold text-white/80 mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@apilock.dev"
                      required
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-black/60 text-xs font-mono text-white placeholder-white/30 outline-none focus:border-[#bef264] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-white/80 mb-1.5 uppercase tracking-wide">
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
                      className="w-full px-4 pr-10 py-2.5 rounded-xl border border-white/15 bg-black/60 text-xs font-mono text-white placeholder-white/30 outline-none focus:border-[#bef264] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-xs font-mono text-rose-300">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!!loading}
                  className="w-full bg-[#bef264] hover:bg-[#a3e635] text-black font-bold font-mono text-xs py-3 h-auto rounded-xl transition-all shadow-[0_0_20px_rgba(190,242,100,0.25)] hover:shadow-[0_0_30px_rgba(190,242,100,0.5)] cursor-pointer"
                >
                  {loading === "email" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {mode === "signin" ? "Authenticating…" : "Creating Account…"}
                    </>
                  ) : (
                    <>
                      {mode === "signin" ? "Sign In to Dashboard" : "Create Account & Continue"}
                      <ArrowRight className="w-3.5 h-3.5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Mode Toggle */}
              <p className="text-center text-xs font-mono text-white/60 mt-6">
                {mode === "signin" ? "Need an operator account?" : "Already have credentials?"}{" "}
                <button
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError(null);
                  }}
                  className="text-[#bef264] font-bold hover:underline transition-all cursor-pointer"
                >
                  {mode === "signin" ? "Create one here" : "Sign in"}
                </button>
              </p>

              <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-[#bef264]/80 hover:text-[#bef264] transition-colors"
                >
                  <ArrowRight className="w-3 h-3" /> Explore Dashboard in Guest Mode
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer text */}
      <footer className="relative z-10 py-4 text-center text-[11px] font-mono text-white/40">
        APILOCK SECURITY ENGINE // ZERO CREDENTIAL COLLECTION VERIFIED
      </footer>
    </div>
  );
}
