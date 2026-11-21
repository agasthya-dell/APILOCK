import { useEffect, useRef } from "react";
import { ArrowDown, Layers, Sparkles, Waves } from "lucide-react";

const SECTIONS = ["top", "matrix", "intro", "problem", "process", "detection", "topography", "security", "dashboard"] as const;

export function ScrollProgressPill() {
  // All scroll-driven values stored in refs — no React re-renders on scroll
  const ringRef = useRef<SVGPathElement | null>(null);
  const pctTextRef = useRef<HTMLSpanElement | null>(null);
  const activeSectionRef = useRef<string>("top");

  const getLenis = () =>
    (window as unknown as { __lenis?: { scrollTo: (el: HTMLElement, opts?: object) => void } }).__lenis;

  const scrollToNext = () => {
    const currentIndex = SECTIONS.indexOf(activeSectionRef.current as typeof SECTIONS[number]);
    const nextIndex = (currentIndex + 1) % SECTIONS.length;
    const target = document.getElementById(SECTIONS[nextIndex]!);
    if (!target) return;
    const lenis = getLenis();
    lenis ? lenis.scrollTo(target, { offset: -70, duration: 1.0 }) : target.scrollIntoView({ behavior: "smooth" });
  };

  const jumpTo = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const lenis = getLenis();
    lenis ? lenis.scrollTo(target, { offset: -70, duration: 1.0 }) : target.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Throttle: only update DOM every ~2 scroll events using a flag
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;

        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const currentScroll = window.scrollY;
        const progress = docHeight > 0 ? Math.min(Math.max(currentScroll / docHeight, 0), 1) : 0;
        const pct = Math.round(progress * 100);

        // Direct DOM updates — no setState, no React re-render
        if (ringRef.current) {
          ringRef.current.setAttribute("stroke-dasharray", `${pct}, 100`);
        }
        if (pctTextRef.current) {
          pctTextRef.current.textContent = `${pct}%`;
        }

        // Update active section (cheaply)
        const wh = window.innerHeight;
        for (const id of SECTIONS) {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= wh * 0.4 && rect.bottom >= wh * 0.2) {
              activeSectionRef.current = id;
              break;
            }
          }
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <aside aria-label="Visual navigation controls" className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      {/* Visual Showpiece Jumpers */}
      <div className="hidden md:flex items-center gap-1 p-1 rounded-full border border-[var(--color-border)] bg-[var(--color-paper)]/90 backdrop-blur-md shadow-lg text-[10px] font-sans">
        <button
          onClick={() => jumpTo("matrix")}
          className="px-2.5 py-1 rounded-full hover:bg-[var(--color-accent)] text-[var(--color-ink)] transition-colors flex items-center gap-1 cursor-pointer"
          title="Jump to ASCII Matrix Scanner"
        >
          <Layers className="w-3 h-3 text-[var(--color-marker)]" />
          <span>Matrix</span>
        </button>
        <span className="text-[var(--color-border)]">|</span>
        <button
          onClick={() => jumpTo("topography")}
          className="px-2.5 py-1 rounded-full hover:bg-[var(--color-accent)] text-[var(--color-ink)] transition-colors flex items-center gap-1 cursor-pointer"
          title="Jump to HECO Topographic Waves"
        >
          <Waves className="w-3 h-3 text-[var(--color-marker)]" />
          <span>3D Waves</span>
        </button>
        <span className="text-[var(--color-border)]">|</span>
        <button
          onClick={() => jumpTo("dashboard")}
          className="px-2.5 py-1 rounded-full hover:bg-[var(--color-accent)] text-[var(--color-ink)] transition-colors flex items-center gap-1 cursor-pointer"
          title="Jump to Product Dashboard"
        >
          <Sparkles className="w-3 h-3 text-[var(--color-olive)]" />
          <span>Preview</span>
        </button>
      </div>

      {/* Main Circular Scroll Progress Pill */}
      <button
        onClick={scrollToNext}
        className="group flex items-center gap-2.5 px-3.5 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-paper)]/95 backdrop-blur-md shadow-lg hover:border-[var(--color-marker)] hover:shadow-xl transition-all cursor-pointer select-none"
        aria-label="Scroll to next section"
      >
        {/* SVG Circular Progress Ring — updated via ref */}
        <div className="relative w-6 h-6 flex items-center justify-center">
          <svg className="w-6 h-6 -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-[var(--color-border)]"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              ref={ringRef}
              className="text-[var(--color-marker)]"
              strokeDasharray="0, 100"
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <ArrowDown className="w-3 h-3 text-[var(--color-ink)] absolute group-hover:translate-y-0.5 transition-transform" />
        </div>

        <div className="flex items-center gap-1.5 font-sans text-xs font-bold text-[var(--color-ink)]">
          <span ref={pctTextRef}>0%</span>
          <span className="hidden sm:inline text-[var(--color-ink-muted)] text-[10px] font-semibold tracking-wider uppercase">SCROLL</span>
        </div>
      </button>
    </aside>
  );
}
