import { useEffect, useRef, useState } from "react";
import { Lock, Radio, Shield, Sparkles, Terminal } from "lucide-react";

export function GaussianWaveDivider() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // useRef for scroll-driven values — zero React re-renders on scroll
  const strokePathRef = useRef<SVGPathElement | null>(null);
  const fillPathRef = useRef<SVGPathElement | null>(null);
  const [hoveredGlyph, setHoveredGlyph] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !strokePathRef.current || !fillPathRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowH = window.innerHeight;
      if (rect.top < windowH && rect.bottom > 0) {
        const progress = 1 - rect.top / windowH;
        const scrollFlex = Math.sin(progress * Math.PI) * 24;
        const crestHeight = 120 + scrollFlex;
        const cy = 320 - crestHeight;

        const stroke = `M 0 320 Q 360 320, 540 240 C 640 180, 680 ${cy}, 720 ${cy} C 760 ${cy}, 800 180, 900 240 Q 1080 320, 1440 320`;
        const fill = `M 0 320 Q 360 320, 540 240 C 640 180, 680 ${cy}, 720 ${cy} C 760 ${cy}, 800 180, 900 240 Q 1080 320, 1440 320 L 1440 440 L 0 440 Z`;

        // Direct DOM write — no React re-render
        strokePathRef.current.setAttribute("d", stroke);
        fillPathRef.current.setAttribute("d", fill);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Glyph metadata
  const glyphs = [
    { label: "AP LK", caption: "APILOCK SIGNET", icon: Terminal },
    { label: "●", caption: "CONTINUOUS RADAR PULSE", icon: Radio },
    { label: "✳", caption: "ENTROPY KEY DISCOVERY", icon: Sparkles },
    { label: "☍", caption: "GIT REFLOG GRAPH SCAN", icon: Lock },
    { label: "a", caption: "AUTHORIZATION STRICT BOUNDARY", icon: Shield },
  ];

  // Static initial path (crestHeight=120)
  const initCy = 200;
  const initStroke = `M 0 320 Q 360 320, 540 240 C 640 180, 680 ${initCy}, 720 ${initCy} C 760 ${initCy}, 800 180, 900 240 Q 1080 320, 1440 320`;
  const initFill = `M 0 320 Q 360 320, 540 240 C 640 180, 680 ${initCy}, 720 ${initCy} C 760 ${initCy}, 800 180, 900 240 Q 1080 320, 1440 320 L 1440 440 L 0 440 Z`;

  return (
    <div ref={containerRef} className="relative w-full bg-[var(--color-paper)] overflow-hidden">
      {/* Dynamic Gaussian Curve SVG */}
      <div className="w-full h-[180px] sm:h-[240px] md:h-[280px]">
        <svg
          viewBox="0 0 1440 440"
          preserveAspectRatio="none"
          className="w-full h-full block"
          fill="var(--color-ink)"
        >
          {/* Bell Curve Stroke — mutated directly via ref */}
          <path
            ref={strokePathRef}
            d={initStroke}
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Solid Fill beneath the curve */}
          <path ref={fillPathRef} d={initFill} />
        </svg>
      </div>

      {/* Solid Black Section with Minimalist Glyphs Bar (Inspired by Image 3) */}
      <div className="bg-[var(--color-ink)] text-[var(--color-paper)] pt-4 pb-14 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Glyphs Row */}
          <div className="flex items-center justify-center gap-8 sm:gap-14 md:gap-20">
            {glyphs.map((item, index) => {
              const Icon = item.icon;
              const isHovered = hoveredGlyph === index;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredGlyph(index)}
                  onMouseLeave={() => setHoveredGlyph(null)}
                  className="relative group cursor-pointer flex flex-col items-center"
                >
                  {/* Glyph symbol */}
                  <div
                    className={`font-sans text-base sm:text-lg tracking-widest font-bold transition-all duration-300 ${
                      isHovered
                        ? "text-[var(--color-marker)] scale-125 -translate-y-1"
                        : "text-[var(--color-paper)]/75 hover:text-[var(--color-paper)]"
                    }`}
                  >
                    {item.label}
                  </div>

                  {/* Micro Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-12 z-30 whitespace-nowrap px-2.5 py-1 rounded bg-[var(--color-paper)] text-[var(--color-ink)] text-[9px] font-sans tracking-wider shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                      <Icon className="w-3 h-3 text-[var(--color-marker)]" />
                      <span>{item.caption}</span>
                    </div>
                  )}

                  {/* Subtitle indicator dot */}
                  <div
                    className={`w-1 h-1 rounded-full mt-2 transition-all duration-300 ${
                      isHovered ? "bg-[var(--color-marker)] scale-150" : "bg-transparent"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
