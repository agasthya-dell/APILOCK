import { useEffect, useRef, useState } from "react";

export function useInView(options: IntersectionObserverInit = { threshold: 0.2 }) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLSpanElement | HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setIsInView(true);
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView };
}

export function WordCircleAnimated({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, isInView } = useInView();

  return (
    <span ref={ref} className={`word-circle-animated relative inline-block whitespace-nowrap z-0 ${className}`}>
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 190 86"
        preserveAspectRatio="none"
        className={`absolute -inset-[14%] w-[128%] h-[128%] overflow-visible fill-none stroke-[var(--color-marker)] stroke-[3.5] stroke-linecap-round stroke-linejoin-round pointer-events-none transition-all duration-700 ease-out ${
          isInView ? "opacity-100 stroke-dashoffset-0" : "opacity-0"
        }`}
        style={{
          strokeDasharray: 550,
          strokeDashoffset: isInView ? 0 : 550,
          transition: "stroke-dashoffset 0.85s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease",
          transform: "rotate(-2deg)",
        }}
      >
        <path d="M14 44C11 18 45 9 95 11c44-3 80 7 82 31 4 23-36 33-82 32C49 76 16 68 14 44c-1-10 12-24 45-28" />
      </svg>
    </span>
  );
}

export function WordUnderlineAnimated({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, isInView } = useInView();

  return (
    <span ref={ref} className={`word-underline-animated relative inline-block whitespace-nowrap z-0 ${className}`}>
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 220 18"
        preserveAspectRatio="none"
        className="absolute -inset-x-[2%] -bottom-[12px] w-[104%] h-[12px] overflow-visible fill-none stroke-[var(--color-marker)] stroke-[3] stroke-linecap-round pointer-events-none"
        style={{
          strokeDasharray: 260,
          strokeDashoffset: isInView ? 0 : 260,
          transition: "stroke-dashoffset 0.75s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.3s ease",
          opacity: isInView ? 1 : 0.2,
        }}
      >
        <path d="M4 10c46-5 90 5 132 2 27-2 54-4 80-2" />
      </svg>
    </span>
  );
}

export function DoodleArrow({
  direction = "down",
  className = "",
}: {
  direction?: "down" | "right" | "curve-down" | "loop";
  className?: string;
}) {
  const { ref, isInView } = useInView();

  if (direction === "loop") {
    return (
      <span ref={ref} className={`inline-block ${className}`}>
        <svg
          viewBox="0 0 80 40"
          className="w-16 h-8 fill-none stroke-[var(--color-marker)] stroke-[2] stroke-linecap-round stroke-linejoin-round"
          style={{
            strokeDasharray: 200,
            strokeDashoffset: isInView ? 0 : 200,
            transition: "stroke-dashoffset 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <path d="M5 22 C 25 2, 45 38, 60 18 C 68 8, 74 15, 75 25 M68 22 L75 25 L76 18" />
        </svg>
      </span>
    );
  }

  if (direction === "curve-down") {
    return (
      <span ref={ref} className={`inline-block ${className}`}>
        <svg
          viewBox="0 0 50 50"
          className="w-8 h-8 fill-none stroke-[var(--color-marker)] stroke-[2] stroke-linecap-round stroke-linejoin-round"
          style={{
            strokeDasharray: 120,
            strokeDashoffset: isInView ? 0 : 120,
            transition: "stroke-dashoffset 0.8s ease-out",
          }}
        >
          <path d="M8 6 C 24 8, 38 18, 36 38 M28 32 L36 39 L42 30" />
        </svg>
      </span>
    );
  }

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="w-6 h-6 fill-none stroke-[var(--color-marker)] stroke-[2] stroke-linecap-round stroke-linejoin-round"
        style={{
          strokeDasharray: 90,
          strokeDashoffset: isInView ? 0 : 90,
          transition: "stroke-dashoffset 0.7s ease-out",
        }}
      >
        <path d="M20 5 L20 32 M12 24 L20 33 L28 24" />
      </svg>
    </span>
  );
}

export function MarginaliaDoodle({
  text,
  rotate = -3,
  arrowDirection = "curve-down",
  className = "",
}: {
  text: string;
  rotate?: number;
  arrowDirection?: "down" | "right" | "curve-down" | "loop";
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 font-sans text-[11px] tracking-wider text-[var(--color-marker)] uppercase italic select-none ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span>{text}</span>
      <DoodleArrow direction={arrowDirection} />
    </div>
  );
}

export function OrganicBlob({
  variant = "sage",
  className = "",
}: {
  variant?: "sage" | "terracotta" | "ochre";
  className?: string;
}) {
  const colors = {
    sage: "fill-[#a2c974]/25 stroke-[#8eb85e]/40",
    terracotta: "fill-[#d8895b]/25 stroke-[#c47748]/40",
    ochre: "fill-[#e9be63]/25 stroke-[#d4a84e]/40",
  };

  return (
    <svg
      viewBox="0 0 200 200"
      className={`w-48 h-48 pointer-events-none transition-transform duration-1000 ease-out ${colors[variant]} ${className}`}
      aria-hidden="true"
    >
      <path
        d="M45.7,-58.5C58.8,-48.3,68.7,-34.5,73.1,-19.1C77.5,-3.7,76.4,13.3,69.5,27.8C62.6,42.3,49.9,54.3,35.2,62.8C20.5,71.3,3.8,76.3,-12.7,74.5C-29.2,72.7,-45.5,64.1,-57.8,51.3C-70.1,38.5,-78.4,21.5,-79.8,3.9C-81.2,-13.7,-75.7,-31.9,-64.5,-44.7C-53.3,-57.5,-36.4,-64.9,-20.5,-67.2C-4.6,-69.5,10.3,-66.7,24.7,-64.2C39.1,-61.7,53.1,-59.5,45.7,-58.5Z"
        transform="translate(100 100)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
