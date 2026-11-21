import { useEffect, useRef } from "react";
import { ArrowDown, Award } from "lucide-react";

export function TopographicWavesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean; targetX: number; targetY: number }>({
    x: 0, y: 0, active: false, targetX: 0, targetY: 0,
  });
  const scrollSpeedRef = useRef<number>(0);
  const lastScrollY = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animId: number | null = null;
    let isVisible = false;
    let time = 0;
    let lastRenderTime = 0;
    const frameInterval = 1000 / 50; // 50 FPS cap — smooth but not CPU-heavy

    const handleResize = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = Math.abs(currentY - lastScrollY.current);
      scrollSpeedRef.current = Math.min(scrollSpeedRef.current + delta * 0.07, 16);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Pre-compute gradient once instead of every frame
    let cachedGrad: CanvasGradient | null = null;
    let lastGradHeight = 0;

    // Reduced line count for performance; still looks great
    const numLines = 22;
    const steps = 48; // down from 70

    const render = (currentTime: number) => {
      if (!isVisible) {
        animId = null;
        return;
      }

      animId = requestAnimationFrame(render);

      const elapsed = currentTime - lastRenderTime;
      if (elapsed < frameInterval) return;
      lastRenderTime = currentTime - (elapsed % frameInterval);

      time += 0.016;
      scrollSpeedRef.current *= 0.93;

      // Ease mouse
      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * 0.1;
      m.y += (m.targetY - m.y) * 0.1;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Reuse cached gradient
      if (!cachedGrad || lastGradHeight !== height) {
        cachedGrad = ctx.createLinearGradient(0, 0, 0, height);
        cachedGrad.addColorStop(0, "rgb(242, 240, 234)");
        cachedGrad.addColorStop(0.4, "rgb(238, 235, 228)");
        cachedGrad.addColorStop(1, "rgb(220, 215, 206)");
        lastGradHeight = height;
      }
      ctx.fillStyle = cachedGrad;
      ctx.fillRect(0, 0, width, height);

      const terrainBaseY = height * 0.58;
      const stepWidth = width / steps;

      for (let i = 0; i < numLines; i++) {
        const lineFraction = i / numLines;
        const baseY = terrainBaseY + lineFraction * height * 0.42;
        const depthScale = 0.4 + lineFraction * 0.6;

        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, baseY);

        for (let s = 0; s <= steps; s++) {
          const x = s * stepWidth;
          const nx = x / width;

          const hill1 = Math.sin(nx * 4.2 + time * 0.6) * 42 * depthScale;
          const hill2 = Math.cos(nx * 7.8 - time * 0.4 + lineFraction * 3) * 20 * depthScale;
          const hill3 = Math.sin(nx * 11 + lineFraction * 4.5) * 10 * depthScale;
          const scrollSurge = Math.sin(nx * 5 + time * 1.8) * scrollSpeedRef.current * depthScale * 2;

          let mouseDeform = 0;
          if (m.active) {
            const dist = Math.hypot(x - m.x, baseY - m.y);
            if (dist < 200) {
              mouseDeform = -Math.cos((dist / 200) * (Math.PI / 2)) * 42 * depthScale;
            }
          }

          ctx.lineTo(x, baseY + hill1 + hill2 + hill3 + scrollSurge + mouseDeform);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const L = 0.18 + lineFraction * 0.07;
        ctx.fillStyle = i % 2 === 0
          ? `oklch(${L} 0.008 65)`
          : `oklch(${0.96 - lineFraction * 0.1} 0.006 90)`;
        ctx.fill();

        ctx.strokeStyle = `oklch(0.2 0.008 65 / ${0.3 + lineFraction * 0.55})`;
        ctx.lineWidth = 1.4 + lineFraction * 1.2;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    // Only animate when visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? false;
        if (isVisible && !animId) {
          animId = requestAnimationFrame(render);
        }
      },
      { rootMargin: "80px" }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.targetX = e.clientX - rect.left;
    mouseRef.current.targetY = e.clientY - rect.top;
    mouseRef.current.active = true;
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[560px] sm:h-[660px] overflow-hidden my-12 border-y border-[var(--color-border)] bg-[var(--color-paper)] select-none"
    >
      <div className="absolute top-8 inset-x-8 sm:inset-x-16 z-20 flex items-center justify-between pointer-events-none">
        <span className="font-sans text-xs font-bold tracking-widest text-[var(--color-ink)] uppercase">
          APILOCK // TOPOGRAPHY
        </span>
        <div className="flex items-center gap-2 font-sans text-[11px] text-[var(--color-ink-muted)]">
          <span>audit@apilock.dev</span>
          <svg className="w-6 h-2 stroke-[var(--color-marker)] fill-none stroke-[1.8]" viewBox="0 0 24 8">
            <path d="M1 4 Q 4 1, 7 4 T 13 4 T 19 4 T 23 4" />
          </svg>
        </div>
      </div>

      <div className="absolute top-16 sm:top-20 inset-x-4 z-20 text-center max-w-3xl mx-auto pointer-events-none">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-[var(--color-ink)] leading-snug">
          We turn opaque repository history into experiences{" "}
          <span className="font-semibold underline decoration-[var(--color-marker)] decoration-2 underline-offset-6">
            developers trust.
          </span>
        </h3>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      <div className="absolute bottom-8 right-8 sm:right-14 z-20 pointer-events-none">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-paper)]/90 backdrop-blur-xs shadow-md font-sans text-[9px] uppercase tracking-widest text-[var(--color-ink)] transform rotate-2">
          <Award className="w-4 h-4 text-[var(--color-marker)]" />
          <span>RADAR // ZERO-LEAK EXCELLENCE</span>
        </div>
      </div>

      <div className="absolute bottom-8 left-8 sm:left-14 z-20 pointer-events-none hidden sm:flex items-center gap-2 font-sans text-[10px] text-[var(--color-paper)]/80 mix-blend-difference">
        <span className="w-2 h-2 rounded-full bg-[var(--color-marker)]" />
        <span>SCROLL TO SWELL WAVES · HOVER TO CONTOUR</span>
      </div>
    </div>
  );
}
