import React from "react";

// 7x10 pixel matrices for F, A, H, H, H, and exclamation mark
const F_MAP = [
  "1111111",
  "1111111",
  "1100000",
  "1100000",
  "1111110",
  "1111110",
  "1100000",
  "1100000",
  "1100000",
  "1100000",
];

const A_MAP = [
  "0111110",
  "1111111",
  "1100011",
  "1100011",
  "1111111",
  "1111111",
  "1100011",
  "1100011",
  "1100011",
  "1100011",
];

const H_MAP = [
  "1100011",
  "1100011",
  "1100011",
  "1100011",
  "1111111",
  "1111111",
  "1100011",
  "1100011",
  "1100011",
  "1100011",
];

const EXCL_MAP = [
  "11",
  "11",
  "11",
  "11",
  "11",
  "11",
  "00",
  "00",
  "11",
  "11",
];

interface LetterDef {
  char: string;
  map: string[];
  colorStart: string;
  colorEnd: string;
}

const LETTERS: LetterDef[] = [
  { char: "F", map: F_MAP, colorStart: "#bef264", colorEnd: "#84cc16" },
  { char: "A", map: A_MAP, colorStart: "#d9f99d", colorEnd: "#facc15" },
  { char: "H", map: H_MAP, colorStart: "#fde047", colorEnd: "#f97316" },
  { char: "H", map: H_MAP, colorStart: "#fb923c", colorEnd: "#ea580c" },
  { char: "H", map: H_MAP, colorStart: "#f87171", colorEnd: "#dc2626" },
  { char: "!", map: EXCL_MAP, colorStart: "#f43f5e", colorEnd: "#be123c" },
];

// Pixel sparkles around the text
const SPARKLES_DATA = [
  { x: 3, y: 2, size: 2, color: "#bef264" },
  { x: 12, y: 15, size: 1.5, color: "#facc15" },
  { x: 26, y: 1, size: 2, color: "#ffffff" },
  { x: 39, y: 16, size: 1.8, color: "#bef264" },
  { x: 50, y: 2, size: 2.2, color: "#f97316" },
  { x: 61, y: 15, size: 1.5, color: "#f43f5e" },
  { x: 67, y: 3, size: 2, color: "#bef264" },
];

export const FahhhPixelArt: React.FC = () => {
  // Compute total width and build letter pixel boxes
  let currentX = 5;
  const letterBlocks: Array<{
    char: string;
    pixels: Array<{ x: number; y: number; isHighlight: boolean; color: string }>;
    offsetX: number;
  }> = [];

  LETTERS.forEach((l) => {
    const pixels: Array<{ x: number; y: number; isHighlight: boolean; color: string }> = [];
    const rows = l.map.length;
    const cols = l.map[0]?.length ?? 0;

    for (let r = 0; r < rows; r++) {
      const rowStr = l.map[r];
      if (!rowStr) continue;
      for (let c = 0; c < cols; c++) {
        if (rowStr[c] === "1") {
          const ratio = rows > 1 ? r / (rows - 1) : 0;
          const isTop = r === 0 || (r === 1 && c > 0);
          pixels.push({
            x: currentX + c,
            y: 4 + r,
            isHighlight: isTop,
            color: ratio < 0.4 ? l.colorStart : l.colorEnd,
          });
        }
      }
    }

    letterBlocks.push({
      char: l.char,
      pixels,
      offsetX: currentX,
    });

    currentX += cols + 3; // letter spacing
  });

  const totalWidth = currentX + 3;
  const totalHeight = 19;

  return (
    <div className="w-full my-8 bg-[#0b0f17] border border-[#bef264]/30 rounded-2xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
      {/* Main Pixel Banner */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="w-full max-w-xl flex justify-center">
          <svg
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            className="w-full h-auto max-h-[160px] drop-shadow-[0_0_25px_rgba(190,242,100,0.3)]"
            style={{ shapeRendering: "crispEdges" }}
          >
            {/* Pixel Sparkle Stars */}
            {SPARKLES_DATA.map((sp, idx) => (
              <g key={`star-${idx}`} opacity="0.85">
                <rect x={sp.x} y={sp.y - sp.size} width={sp.size} height={sp.size * 3} fill={sp.color} />
                <rect x={sp.x - sp.size} y={sp.y} width={sp.size * 3} height={sp.size} fill={sp.color} />
                <rect x={sp.x} y={sp.y} width={sp.size} height={sp.size} fill="#ffffff" />
              </g>
            ))}

            {/* Chunky Pixel Letters */}
            {letterBlocks.map((block, bIdx) => (
              <g key={`block-${bIdx}`}>
                {/* Black outline shadow */}
                {block.pixels.map((p, pIdx) => (
                  <rect
                    key={`shadow-${bIdx}-${pIdx}`}
                    x={p.x - 0.4}
                    y={p.y - 0.4}
                    width={1.8}
                    height={1.8}
                    fill="#000000"
                  />
                ))}

                {/* Main Pixel Fill */}
                {block.pixels.map((p, pIdx) => (
                  <rect
                    key={`pixel-${bIdx}-${pIdx}`}
                    x={p.x}
                    y={p.y}
                    width={1}
                    height={1}
                    fill={p.color}
                  />
                ))}

                {/* Top Specular Highlights */}
                {block.pixels
                  .filter((p) => p.isHighlight)
                  .map((p, pIdx) => (
                    <rect
                      key={`hi-${bIdx}-${pIdx}`}
                      x={p.x + 0.15}
                      y={p.y + 0.15}
                      width={0.7}
                      height={0.4}
                      fill="#ffffff"
                      opacity={0.85}
                    />
                  ))}
              </g>
            ))}
          </svg>
        </div>

        {/* Clean, simple text below in normal font */}
        <div className="mt-5 text-center max-w-xl space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug font-sans m-0">
            That sigh of relief when an accidental secret is caught before production.
          </h3>
          <p className="text-sm sm:text-base text-[#d9f99d]/90 leading-relaxed font-sans m-0">
            Developers know the heart-drop moment of pushing code and wondering if an API key slipped through. APILOCK catches exposed credentials before attackers find them.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FahhhPixelArt;
