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

  // Sizing definitions
  const emblemSizes = {
    sm: 'size-7',
    md: 'size-9',
    lg: 'size-11',
  };

  const titleSizes = {
    sm: 'text-[13px] tracking-[0.08em]',
    md: 'text-[16px] tracking-[0.07em]',
    lg: 'text-[20px] tracking-[0.06em]',
  };

  const subtitleSizes = {
    sm: 'text-[8px] tracking-[0.2em]',
    md: 'text-[9px] tracking-[0.22em]',
    lg: 'text-[10px] tracking-[0.25em]',
  };

  // If mark-only (e.g. collapsed sidebar or compact icon)
  if (variant === 'mark') {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
        title="Encalm Hospitality Projects"
      >
        <img
          src="/favicon.svg"
          alt="Encalm Logo Mark"
          className={`${emblemSizes[size]} rounded-xl object-contain drop-shadow-md`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official Gold Mandala Emblem inside Teal Squircle */}
      <div className="relative shrink-0 transition-transform duration-200 group-hover:scale-105">
        <img
          src="/favicon.svg"
          alt="Encalm Logo Mark"
          className={`${emblemSizes[size]} rounded-xl object-contain shadow-sm ring-1 ring-[#d6a95d]/30`}
        />
      </div>

      {/* Typography Lockup */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-serif font-bold uppercase transition-colors ${
              isDark ? 'text-white' : 'text-[#173e49]'
            } ${titleSizes[size]}`}
          >
            Encalm
          </span>
          <span className="size-1 rounded-full bg-[#d6a95d]" />
        </div>

        {showSubtitle && (
          <span
            className={`mt-1 font-mono uppercase font-semibold transition-colors ${
              isDark ? 'text-white/60' : 'text-[#8b6f30]'
            } ${subtitleSizes[size]}`}
          >
            Projects
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
