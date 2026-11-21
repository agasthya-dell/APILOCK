import React from "react";

export const AlienCatPixelCard: React.FC = () => {
  return (
    <div className="w-full my-8 bg-[#09110b] border border-[#bef264]/30 rounded-2xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
        {/* Left: Pixel Art Alien Cat Image */}
        <div className="md:col-span-5 flex justify-center">
          <div className="rounded-xl overflow-hidden border border-[#bef264]/30 bg-white p-3 shadow-[0_0_20px_rgba(190,242,100,0.15)] hover:border-[#bef264]/60 transition-colors">
            <img
              src="/pixel-alien-cat.jpg"
              alt="Alien Cat Sentinel Pixel Art Mascot"
              className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-lg pixel-art-img block select-none"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>

        {/* Right: Clean, simple headline and description in normal font */}
        <div className="md:col-span-7 space-y-3 sm:space-y-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug font-sans m-0">
            Every scan has permission. Every step has a clear boundary.
          </h3>
          <p className="text-sm sm:text-base text-[#d9f99d]/90 leading-relaxed font-sans m-0">
            We believe perimeter defense should be thorough and respectful. Public discovery surfaces exposed repository metadata, but source-code scanning only happens on repositories where you have granted explicit permission.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlienCatPixelCard;
