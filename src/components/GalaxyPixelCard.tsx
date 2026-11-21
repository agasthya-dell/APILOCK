import React from "react";

export const GalaxyPixelCard: React.FC = () => {
  return (
    <div className="w-full my-8 bg-[#090b10] border border-[#bef264]/30 rounded-2xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
        {/* Left: Pixel Art Galaxy Image */}
        <div className="md:col-span-5 flex justify-center">
          <div className="rounded-xl overflow-hidden border border-[#bef264]/30 bg-black/60 p-2 shadow-[0_0_20px_rgba(190,242,100,0.15)] hover:border-[#bef264]/60 transition-colors">
            <img
              src="/pixel-galaxy.jpg"
              alt="Spiral Galaxy Pixel Art"
              className="w-56 h-56 sm:w-64 sm:h-64 object-cover rounded-lg pixel-art-img block select-none"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>

        {/* Right: Clean, simple headline and description in normal font */}
        <div className="md:col-span-7 space-y-3 sm:space-y-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug font-sans m-0">
            Exposed credentials expand like light across a spiral galaxy.
          </h3>
          <p className="text-sm sm:text-base text-[#d9f99d]/90 leading-relaxed font-sans m-0">
            When an API token is committed into a public repository, automated scrapers clone, fork, and mirror it in fractions of a second. APILOCK monitors the perimeter so you detect exposure before it reaches the outer rim.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GalaxyPixelCard;
