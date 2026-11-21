import { useState } from "react";
import { useInView } from "./DoodleDecorations";
import { Check, Shield, Sparkles } from "lucide-react";

export function OrganicShieldDoodle() {
  const { ref, isInView } = useInView({ threshold: 0.25 });
  const [activeMode, setActiveMode] = useState<string>("minimalist");

  return (
    <section ref={ref} className="section-wrap my-20 md:my-32 relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left column: Mode selector & Statement (Inspired by Image 4) */}
        <div className="lg:col-span-6 space-y-8 z-10">
          {/* Vertical mode pill list (as seen in Image 4) */}
          <div className="flex lg:flex-col gap-2 font-sans text-[11px] tracking-wider text-[var(--color-ink-muted)]">
            {[
              { id: "minimalist", label: "minimalist" },
              { id: "dynamic", label: "dynamic" },
              { id: "secure", label: "continuous" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveMode(m.id)}
                className={`text-left px-2 py-0.5 w-fit transition-all cursor-pointer ${
                  activeMode === m.id
                    ? "text-[var(--color-ink)] font-bold border-b lg:border-b-0 lg:border-l-2 border-[var(--color-marker)] pl-2"
                    : "hover:text-[var(--color-ink)]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Bold typographic message (Inspired by Image 4) */}
          <div className="space-y-2">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light text-[var(--color-ink)] leading-[1.08] tracking-tight">
              the web can be <strong className="font-extrabold text-[var(--color-ink)]">more.</strong>
              <br />
              more <strong className="font-extrabold text-[var(--color-ink)]">engaging.</strong>
              <br />
              more <strong className="font-extrabold text-[var(--color-ink)]">dynamic.</strong>
              <br />
              more...{" "}
              <span className="font-extrabold relative inline-block text-[var(--color-marker)]">
                secure.
                <svg
                  aria-hidden="true"
                  viewBox="0 0 160 30"
                  className="absolute -bottom-2 -left-2 w-[115%] h-[16px] fill-none stroke-[var(--color-marker)] stroke-[3.5] stroke-linecap-round"
                >
                  <path d="M4 18 Q 40 4, 80 18 T 155 14" />
                </svg>
              </span>
            </h2>
            <p className="pt-4 text-sm text-[var(--color-ink-muted)] max-w-md leading-relaxed">
              Security should not feel like an ominous lockdown. It is the soil that allows your open-source projects to flourish without fear of unintended leaks.
            </p>
          </div>

          {/* Check tags */}
          <div className="flex flex-wrap gap-4 pt-2 font-sans text-xs text-[var(--color-ink)]">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent)]/50 border border-[var(--color-border)]">
              <Check className="w-3.5 h-3.5 text-[var(--color-olive)]" /> Continuous Git audit
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-accent)]/50 border border-[var(--color-border)]">
              <Check className="w-3.5 h-3.5 text-[var(--color-olive)]" /> Zero false positives
            </span>
          </div>
        </div>

        {/* Right column: The Continuous Loop Line Blooming into an Organic Plant / Cryptographic Shield (Directly inspired by Image 4) */}
        <div className="lg:col-span-6 relative flex items-center justify-center min-h-[420px]">
          {/* Organic Color Blobs (Lime Sage & Warm Terracotta like Image 4) */}
          <div
            className={`absolute right-4 top-8 w-44 h-52 rounded-[45%_55%_65%_35%/50%_60%_40%_50%] bg-[#a2c974]/35 blur-[1px] transition-transform duration-1000 ease-out pointer-events-none ${
              isInView ? "scale-100 rotate-6" : "scale-75 rotate-0"
            }`}
          />
          <div
            className={`absolute right-24 bottom-12 w-36 h-36 rounded-[55%_45%_35%_65%/60%_40%_60%_40%] bg-[#d8895b]/35 blur-[1px] transition-transform duration-1000 delay-150 ease-out pointer-events-none ${
              isInView ? "scale-100 -rotate-12" : "scale-75 rotate-0"
            }`}
          />
          <div
            className={`absolute left-14 top-28 w-28 h-28 rounded-full bg-[#f3d386]/25 blur-[1px] transition-transform duration-1000 delay-300 ease-out pointer-events-none ${
              isInView ? "scale-100" : "scale-50"
            }`}
          />

          {/* SVG Continuous Doodle Path that loops and forms the botanical plant & pot */}
          <svg
            viewBox="0 0 540 440"
            className="w-full h-auto max-w-[520px] overflow-visible fill-none stroke-[var(--color-ink)] stroke-[2.2] stroke-linecap-round stroke-linejoin-round"
            aria-hidden="true"
          >
            {/* The single line loop traveling from left across the screen */}
            <path
              d="M 10 320 
                 C 80 320, 120 370, 160 370 
                 C 210 370, 230 260, 195 240 
                 C 160 220, 130 290, 185 340 
                 C 230 380, 290 390, 340 370 
                 C 370 360, 375 320, 365 300
                 L 365 350
                 C 365 390, 370 410, 420 410
                 C 470 410, 475 390, 475 350
                 L 475 300
                 C 475 290, 365 290, 365 300"
              style={{
                strokeDasharray: 1200,
                strokeDashoffset: isInView ? 0 : 1200,
                transition: "stroke-dashoffset 1.8s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            />

            {/* Potted Plant Monstera Leaves & Stems Blooming (Single stroke doodle style) */}
            <g
              style={{
                strokeDasharray: 2200,
                strokeDashoffset: isInView ? 0 : 2200,
                transition: "stroke-dashoffset 2.4s cubic-bezier(0.25, 1, 0.5, 1) 0.3s",
              }}
            >
              {/* Main Stem */}
              <path d="M 420 350 Q 420 220, 415 110" />

              {/* Leaf 1: Top Arching Monstera */}
              <path d="M 415 110 C 370 70, 420 20, 460 40 C 490 60, 490 120, 440 135" />
              <path d="M 430 75 Q 450 70, 470 85" />
              <path d="M 435 95 Q 460 95, 475 110" />

              {/* Leaf 2: Right Spreading Leaf */}
              <path d="M 420 180 C 470 140, 520 170, 520 220 C 510 260, 470 260, 435 210" />
              <path d="M 455 185 Q 480 195, 495 215" />

              {/* Leaf 3: Left Broad Leaf */}
              <path d="M 418 240 C 370 200, 320 230, 330 280 C 345 320, 390 320, 415 265" />
              <path d="M 365 250 Q 350 270, 355 295" />

              {/* Little Heart Seedling */}
              <path d="M 418 290 C 405 270, 385 275, 395 295 C 405 310, 418 315, 418 315 C 418 315, 430 310, 440 295 C 450 275, 430 270, 418 290" />

              {/* Flower Pot Contour */}
              <path d="M 375 345 C 380 395, 390 415, 420 415 C 450 415, 460 395, 465 345" />
              <ellipse cx="420" cy="345" rx="45" ry="8" />
            </g>
          </svg>

          {/* Floating Handwritten Annotation Note */}
          <div className="absolute bottom-2 left-6 font-sans text-[10px] text-[var(--color-marker)] italic transform -rotate-3 select-none flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span>single-stroke generative growth</span>
          </div>
        </div>
      </div>
    </section>
  );
}
