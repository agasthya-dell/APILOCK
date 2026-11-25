import { Link } from "@tanstack/react-router";

export function OrganicNavbar() {
  return (
    <>
      {/* SVG Gooey Filter for organic conjoined bridge silhouettes */}
      <svg
        className="absolute -left-[9999px] -top-[9999px] w-0 h-0 pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <filter id="organic-nav-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Floating Centered Dock Header */}
      <header className="sticky top-4 sm:top-6 z-50 w-full flex justify-center px-3 sm:px-4 pointer-events-none transition-all duration-300">
        <nav
          className="relative inline-flex items-center pointer-events-auto filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.32)] select-none max-w-full"
          aria-label="Main Navigation"
        >
          {/* ─────────────────────────────────────────────────────────────
              LAYER 1: The organic conjoined pure black silhouette with fillets
             ───────────────────────────────────────────────────────────── */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ filter: "url(#organic-nav-goo)" }}
            aria-hidden="true"
          >
            {/* Left Circle Silhouette */}
            <div className="w-[54px] h-[54px] rounded-full bg-black shrink-0" />

            {/* Bridge 1 Neck */}
            <div className="w-5 h-[28px] bg-black -mx-1.5 shrink-0" />

            {/* Middle Capsule Silhouette */}
            <div className="h-[54px] rounded-full bg-black px-3 flex-1 min-w-[240px] sm:min-w-[275px]" />

            {/* Bridge 2 Neck */}
            <div className="w-5 h-[28px] bg-black -mx-1.5 shrink-0" />

            {/* Right Capsule Silhouette */}
            <div className="h-[54px] rounded-full bg-black w-[120px] sm:w-[136px] shrink-0" />
          </div>

          {/* ─────────────────────────────────────────────────────────────
              LAYER 2: Sharp, crisp pure black & pure white foreground contents
             ───────────────────────────────────────────────────────────── */}
          <div className="relative z-10 flex items-center h-[54px]">
            {/* 1. Left Circle: Globe Icon */}
            <Link
              to="/"
              className="w-[54px] h-[54px] rounded-full bg-black flex items-center justify-center text-white hover:opacity-85 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              aria-label="APILOCK Home"
              title="APILOCK Home"
            >
              {/* Wireframe Globe Icon in pure white */}
              <svg
                className="w-6 h-6 stroke-white stroke-[1.8] fill-none group-hover:rotate-12 transition-transform duration-300"
                viewBox="0 0 24 24"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </Link>

            {/* Bridge Space between Circle and Middle Capsule */}
            <div className="w-[10px] shrink-0 pointer-events-none" />

            {/* 2. Middle Capsule: Inset Pill with Home | Products | Contact in Pure Black & Pure White */}
            <div className="h-[42px] flex items-center px-4 sm:px-6 rounded-full bg-black border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] gap-2.5 sm:gap-4 text-[13px] sm:text-[13.5px] font-sans font-medium text-white">
              <Link
                to="/"
                className="text-white hover:opacity-80 transition-opacity py-1 cursor-pointer"
              >
                Home
              </Link>
              <span className="w-[1px] h-3.5 bg-white/30 shrink-0" aria-hidden="true" />
              <a
                href="#platform"
                className="text-white hover:opacity-80 transition-opacity py-1 cursor-pointer"
              >
                Products
              </a>
              <span className="w-[1px] h-3.5 bg-white/30 shrink-0" aria-hidden="true" />
              <a
                href="mailto:hello@apilock.dev"
                className="text-white hover:opacity-80 transition-opacity py-1 cursor-pointer"
              >
                Contact
              </a>
            </div>

            {/* Bridge Space between Middle Capsule and Right Capsule */}
            <div className="w-[10px] shrink-0 pointer-events-none" />

            {/* 3. Right Capsule: Inset Pill with My Account in Pure Black & Pure White */}
            <div className="h-[42px] flex items-center justify-center px-4 sm:px-5 rounded-full bg-black border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] text-[13px] sm:text-[13.5px] font-sans font-medium text-white">
              <Link
                to="/auth"
                className="text-white hover:opacity-80 transition-opacity py-1 whitespace-nowrap cursor-pointer flex items-center gap-1.5"
              >
                <span>My Account</span>
              </Link>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
