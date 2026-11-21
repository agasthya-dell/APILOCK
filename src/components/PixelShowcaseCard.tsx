import React from "react";

interface PixelShowcaseCardProps {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
  badge?: string;
}

export const PixelShowcaseCard: React.FC<PixelShowcaseCardProps> = ({
  imageSrc,
  imageAlt,
  title,
  description,
  badge,
}) => {
  return (
    <div className="w-full my-8 bg-[#09110b] border border-[#bef264]/30 rounded-2xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
        {/* Left: Pixel Art Image */}
        <div className="md:col-span-5 flex justify-center">
          <div className="rounded-xl overflow-hidden border border-[#bef264]/30 bg-white p-3 shadow-[0_0_20px_rgba(190,242,100,0.15)] hover:border-[#bef264]/60 transition-colors flex items-center justify-center">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg pixel-art-img block select-none"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>

        {/* Right: Clean, simple headline and description in normal font */}
        <div className="md:col-span-7 space-y-3 sm:space-y-4">
          {badge && (
            <span className="inline-block text-xs font-sans font-bold tracking-wider text-[#bef264] uppercase mb-1">
              {badge}
            </span>
          )}
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug font-sans m-0">
            {title}
          </h3>
          <p className="text-sm sm:text-base text-[#d9f99d]/90 leading-relaxed font-sans m-0">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PixelShowcaseCard;
