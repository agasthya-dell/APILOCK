import React from "react";

export const FlamePixelCard: React.FC = () => {
  return (
    <div className="w-full my-8 bg-[#120b08] border border-orange-500/30 rounded-2xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
        {/* Left: Pixel Art Flame Image */}
        <div className="md:col-span-5 flex justify-center">
          <div className="rounded-xl overflow-hidden border border-orange-500/30 bg-white p-3 shadow-[0_0_20px_rgba(249,115,22,0.15)] hover:border-orange-500/60 transition-colors">
            <img
              src="/pixel-flame.jpg"
              alt="Flame Pixel Art Mascot"
              className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-lg pixel-art-img block select-none"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>

        {/* Right: Clean, simple headline and description in normal font */}
        <div className="md:col-span-7 space-y-3 sm:space-y-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug font-sans m-0">
            One forgotten key in a commit can ignite an entire breach.
          </h3>
          <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed font-sans m-0">
            Developers frequently rotate active secrets, but old keys can linger in commit history, sample files, or documentation. APILOCK continuously inspects repository history so forgotten credentials don&apos;t turn into critical security incidents.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FlamePixelCard;
