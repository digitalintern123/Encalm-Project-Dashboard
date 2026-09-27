import { type FC } from 'react';

export interface BrandLogoProps {
  variant?: 'full' | 'mark' | 'compact';
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: FC<BrandLogoProps> = ({
  variant = 'full',
  theme = 'dark',
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const isDark = theme === 'dark';

  // Mark-only sizing definitions (collapsed sidebar)
  const emblemSizes = {
    sm: 'size-7',
    md: 'size-9',
    lg: 'size-11',
  };

  // Full logo height definitions
  const logoHeights = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-11',
  };

  // If mark-only (e.g. collapsed sidebar)
  if (variant === 'mark') {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
        title="Encalm Hospitality Projects"
      >
        <img
          src="/encalm-emblem.png"
          alt="Encalm Logo Mark"
          className={`${emblemSizes[size]} object-contain drop-shadow-md`}
        />
      </div>
    );
  }

  const logoSrc = isDark ? '/encalm-logo-white.png' : '/encalm-logo-primary.png';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Encalm Logo (Gold Emblem + Typography) */}
      <img
        src={logoSrc}
        alt="Encalm"
        className={`${logoHeights[size]} w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]`}
      />

      {/* Projects Office Subtitle Badge */}
      {showSubtitle && (
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[8px] font-extrabold uppercase tracking-[0.2em] shadow-sm transition-colors ${
            isDark
              ? 'border border-[#d6a95d]/30 bg-[#d6a95d]/10 text-[#e5bd75]'
              : 'border border-[#c5a880]/40 bg-[#f7f2ea] text-[#8e681c]'
          }`}
        >
          Projects
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
