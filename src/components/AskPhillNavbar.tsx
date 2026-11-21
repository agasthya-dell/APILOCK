import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Radar } from "lucide-react";
import { getStoredUser } from "@/lib/auth-store";

export function AskPhillNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getStoredUser());
  }, []);

  return (
    <header className="sticky top-4 sm:top-6 z-50 w-full px-4 sm:px-8 max-w-[1360px] mx-auto pointer-events-none transition-all duration-300">
      <nav
        className="relative flex items-start justify-between w-full"
        aria-label="Main Navigation"
      >
        {/* ─────────────────────────────────────────────────────────────
            LEFT SIDE: Clean Lime Pill (No outer black border) with Dropdown
           ───────────────────────────────────────────────────────────── */}
        <div
          className="pointer-events-auto relative"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Standalone Lime Pill: Exactly matching Center & Right Buttons */}
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-1.5 bg-[#bef264] text-black hover:bg-[#a3e635] hover:scale-105 active:scale-95 transition-all text-xs sm:text-[13.5px] font-sans font-bold px-5 sm:px-6 py-2.5 rounded-full shadow-lg shadow-[#bef264]/20 border border-[#bef264]/30 select-none cursor-pointer"
          >
            <span>Home</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-black transition-transform duration-300 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </Link>

          {/* Floating Dropdown Card: Appears cleanly on cursor hover */}
          <div
            className={`absolute left-0 top-full mt-2 w-full min-w-[135px] bg-[#0c0c0c] rounded-2xl p-1.5 shadow-2xl shadow-black/90 border border-white/20 backdrop-blur-xl flex flex-col gap-1 transition-all duration-200 z-50 ${
              isOpen
                ? "opacity-100 translate-y-0 pointer-events-auto visible"
                : "opacity-0 -translate-y-2 pointer-events-none invisible"
            }`}
            style={{ color: "#ffffff" }}
          >
            {/* Global Scanner Link */}
            <Link
              to="/get-started"
              onClick={() => setIsOpen(false)}
              className="!text-white hover:!text-white hover:bg-white/20 text-xs sm:text-[13px] font-sans font-bold py-1.5 px-3 rounded-full text-center transition-all cursor-pointer block select-none !opacity-100"
              style={{ color: "#ffffff", opacity: 1 }}
            >
              Scanner
            </Link>

            {/* Dashboard Link */}
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="!text-white hover:!text-white hover:bg-white/20 text-xs sm:text-[13px] font-sans font-bold py-1.5 px-3 rounded-full text-center transition-all cursor-pointer block select-none !opacity-100"
              style={{ color: "#ffffff", opacity: 1 }}
            >
              Dashboard
            </Link>

            {/* Analyze Repo Link */}
            <Link
              to="/analyze"
              onClick={() => setIsOpen(false)}
              className="!text-white hover:!text-white hover:bg-white/20 text-xs sm:text-[13px] font-sans font-bold py-1.5 px-3 rounded-full text-center transition-all cursor-pointer block select-none !opacity-100"
              style={{ color: "#ffffff", opacity: 1 }}
            >
              Analyze Repo
            </Link>

            {/* About Link */}
            <a
              href="/#platform"
              onClick={() => setIsOpen(false)}
              className="!text-white hover:!text-white hover:bg-white/20 text-xs sm:text-[13px] font-sans font-bold py-1.5 px-3 rounded-full text-center transition-all cursor-pointer block select-none !opacity-100"
              style={{ color: "#ffffff", opacity: 1 }}
            >
              About
            </a>

            {/* Contact Link */}
            <a
              href="mailto:hello@apilock.dev"
              onClick={() => setIsOpen(false)}
              className="!text-white hover:!text-white hover:bg-white/20 text-xs sm:text-[13px] font-sans font-bold py-1.5 px-3 rounded-full text-center transition-all cursor-pointer block select-none !opacity-100"
              style={{ color: "#ffffff", opacity: 1 }}
            >
              Contact
            </a>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CENTER: Brand Pill in APILOCK Signature Cyber Lime Green
           ───────────────────────────────────────────────────────────── */}
        <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 top-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-[#bef264] text-black hover:bg-[#a3e635] hover:scale-105 active:scale-95 transition-all text-xs sm:text-[13.5px] font-sans font-bold px-5 sm:px-6 py-2.5 rounded-full shadow-lg shadow-[#bef264]/20 border border-[#bef264]/30 select-none cursor-pointer"
            aria-label="APILOCK Home"
          >
            <Radar className="w-4 h-4 text-black stroke-[2.2]" aria-hidden="true" />
            <span className="font-bold tracking-tight">APILOCK</span>
          </Link>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            RIGHT SIDE: "Get started" Pill in APILOCK Signature Cyber Lime
           ───────────────────────────────────────────────────────────── */}
        <div className="pointer-events-auto">
          <Link
            to={isLoggedIn ? "/dashboard" : "/auth"}
            className="inline-flex items-center justify-center bg-[#bef264] text-black hover:bg-[#a3e635] hover:scale-105 active:scale-95 transition-all text-xs sm:text-[13.5px] font-sans font-bold px-5 sm:px-6 py-2.5 rounded-full shadow-lg shadow-[#bef264]/20 border border-[#bef264]/30 select-none cursor-pointer"
          >
            {isLoggedIn ? "Dashboard" : "Get started"}
          </Link>
        </div>
      </nav>
    </header>
  );
}
