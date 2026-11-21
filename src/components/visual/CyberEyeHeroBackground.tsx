import { useEffect, useRef } from "react";

/**
 * CyberEyeHeroBackground
 * ─────────────────────────────────────────────────────────────
 * Renders the authentic Halftone/Dithered Surveillance Eye artwork
 * in its exact phosphor green color as the full background of the
 * landing page hero in desktop website ratio.
 *
 * Features:
 * - Exact phosphor green halftone eye art (no text, pure art)
 * - Widescreen desktop aspect ratio
 * - Interactive cursor-following phosphor glint & iris tracking
 * - Click-triggered sonar radar shockwave ripples
 * - Subtle CRT scanline texture
 * ─────────────────────────────────────────────────────────────
 */

interface RadarRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
}

export function CyberEyeHeroBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const ringsRef = useRef<RadarRing[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let time = 0;
    let isVisible = true;
    let lastRender = 0;
    const fpsLimit = 1000 / 42; // Smooth 42 FPS cap

    const handleResize = () => {
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Initial ambient sonar rings
    ringsRef.current = [
      { x: container.clientWidth * 0.5, y: container.clientHeight * 0.53, r: 30, maxR: 450, alpha: 0.65 },
    ];

    const render = (now: number) => {
      if (!isVisible) return;
      animId = requestAnimationFrame(render);

      if (now - lastRender < fpsLimit) return;
      lastRender = now;
      time += 0.035;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.clearRect(0, 0, width, height);

      const mx = mouseRef.current.active ? mouseRef.current.x : width * 0.5;
      const my = mouseRef.current.active ? mouseRef.current.y : height * 0.53;

      // Draw active sonar shockwave rings in phosphor lime green (#bef264 / #a3e635)
      for (let i = ringsRef.current.length - 1; i >= 0; i--) {
        const ring = ringsRef.current[i]!;
        ring.r += 4.8;
        ring.alpha -= 0.015;

        if (ring.alpha <= 0 || ring.r > ring.maxR) {
          ringsRef.current.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(190, 242, 100, ${ring.alpha * 0.7})`;
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Cursor-tracking reticle & phosphor ripple glint
      if (mouseRef.current.active) {
        // Outer targeting ring
        const reticleR = 32 + Math.sin(time * 3.5) * 6;
        ctx.beginPath();
        ctx.arc(mx, my, reticleR, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(190, 242, 100, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Inner glowing tracking pupil
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(217, 249, 157, 0.95)";
        ctx.shadowColor = "#a3e635";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Subtle crosshair tick marks
        ctx.strokeStyle = "rgba(190, 242, 100, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx - reticleR - 8, my);
        ctx.lineTo(mx - reticleR + 4, my);
        ctx.moveTo(mx + reticleR - 4, my);
        ctx.lineTo(mx + reticleR + 8, my);
        ctx.moveTo(mx, my - reticleR - 8);
        ctx.lineTo(mx, my - reticleR + 4);
        ctx.moveTo(mx, my + reticleR - 4);
        ctx.lineTo(mx, my + reticleR + 8);
        ctx.stroke();
      }

      // Periodic heartbeat scan pulse from center of eye every ~3.2s
      if (Math.sin(time * 0.6) > 0.985 && ringsRef.current.length < 5) {
        ringsRef.current.push({
          x: width * 0.5,
          y: height * 0.53,
          r: 12,
          maxR: Math.max(width, height) * 0.75,
          alpha: 0.7,
        });
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry?.isIntersecting ?? false;
        if (isVisible) animId = requestAnimationFrame(render);
      },
      { rootMargin: "60px" }
    );
    observer.observe(container);

    // Parent hero event listeners
    const heroSection = container.closest("section") || container;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };

    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      ringsRef.current.push({
        x,
        y,
        r: 10,
        maxR: Math.max(rect.width, rect.height) * 0.9,
        alpha: 1,
      });
      if (ringsRef.current.length > 8) ringsRef.current.shift();
    };

    heroSection.addEventListener("mousemove", onMouseMove as EventListener, { passive: true });
    heroSection.addEventListener("mouseleave", onMouseLeave as EventListener);
    heroSection.addEventListener("click", onClick as EventListener);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      heroSection.removeEventListener("mousemove", onMouseMove as EventListener);
      heroSection.removeEventListener("mouseleave", onMouseLeave as EventListener);
      heroSection.removeEventListener("click", onClick as EventListener);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0 bg-[#0d120a]"
      aria-hidden="true"
    >
      {/* 1. Base Layer: The authentic Halftone Eye Art moved down away from top navbar */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none translate-y-6 sm:translate-y-8 lg:translate-y-10">
        <img
          src="/cyber-eye-clean.png"
          alt=""
          className="w-full h-full object-cover object-center opacity-85 filter contrast-125 scale-105"
          style={{
            aspectRatio: "908 / 420",
          }}
          loading="eager"
        />
      </div>

      {/* 2. CRT Scanline Overlay Texture */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
        style={{
          backgroundImage: "linear-gradient(rgba(18, 24, 14, 0) 50%, rgba(0, 0, 0, 0.6) 50%)",
          backgroundSize: "100% 4px",
        }}
      />

      {/* 3. Layer 3: Interactive Sonar Radar Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* 4. Vignette / Dark Ambient Edge Gradient: ensures typography has razor-sharp contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d120a]/85 via-transparent to-[#0d120a]/85 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d120a]/75 via-transparent to-[#0d120a] pointer-events-none" />
    </div>
  );
}
