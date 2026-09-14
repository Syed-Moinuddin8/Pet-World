import React from 'react';
import { PetAvatarType } from '../types.js';

interface PetAvatarProps {
  type: PetAvatarType | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PawIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-hidden="true"
  >
    <path d="M12 11.5c-1.6 0-3 1.2-3 2.8 0 1.9 1.6 3.7 3 4.7 1.4-1 3-2.8 3-4.7 0-1.6-1.4-2.8-3-2.8z" />
    <circle cx="7.5" cy="9.5" r="1.8" />
    <circle cx="16.5" cy="9.5" r="1.8" />
    <circle cx="10" cy="6" r="1.6" />
    <circle cx="14" cy="6" r="1.6" />
  </svg>
);

export const PetAvatar: React.FC<PetAvatarProps> = ({ type, size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-3xl',
  };

  const renderAvatarContent = () => {
    switch (type) {
      case 'dog':
        return (
          <div className="w-full h-full rounded-full bg-[#FFE8D6] flex items-center justify-center p-1 border-2 border-[#DDA15E]/40 shadow-xs">
            <svg viewBox="0 0 36 36" className="w-full h-full" fill="none">
              {/* Dog face */}
              <ellipse cx="18" cy="20" rx="12" ry="11" fill="#DDA15E" />
              {/* Ears */}
              <ellipse cx="8" cy="14" rx="4" ry="7" fill="#BC6C25" transform="rotate(-20 8 14)" />
              <ellipse cx="28" cy="14" rx="4" ry="7" fill="#BC6C25" transform="rotate(20 28 14)" />
              {/* Snout */}
              <ellipse cx="18" cy="23" rx="6" ry="4.5" fill="#FFE8D6" />
              {/* Eyes */}
              <circle cx="14" cy="17" r="1.6" fill="#264653" />
              <circle cx="22" cy="17" r="1.6" fill="#264653" />
              <circle cx="14.5" cy="16.5" r="0.6" fill="#FFFFFF" />
              <circle cx="22.5" cy="16.5" r="0.6" fill="#FFFFFF" />
              {/* Nose & Mouth */}
              <polygon points="18,21 16.5,23 19.5,23" fill="#264653" />
              <path d="M16.5 24.5 Q18 26 19.5 24.5" stroke="#264653" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
        );
      case 'cat':
        return (
          <div className="w-full h-full rounded-full bg-[#FFEDD5] flex items-center justify-center p-1 border-2 border-[#F97316]/30 shadow-xs">
            <svg viewBox="0 0 36 36" className="w-full h-full" fill="none">
              {/* Cat face */}
              <circle cx="18" cy="19" r="11" fill="#FB923C" />
              {/* Pointy ears */}
              <polygon points="9,14 12,5 16,11" fill="#EA580C" />
              <polygon points="27,14 24,5 20,11" fill="#EA580C" />
              <polygon points="10,13 12.5,7 15,11" fill="#FED7AA" />
              <polygon points="26,13 23.5,7 21,11" fill="#FED7AA" />
              {/* Eyes */}
              <ellipse cx="13.5" cy="18" rx="2" ry="1.6" fill="#2A9D8F" />
              <ellipse cx="22.5" cy="18" rx="2" ry="1.6" fill="#2A9D8F" />
              <circle cx="13.5" cy="18" r="0.8" fill="#1F2937" />
              <circle cx="22.5" cy="18" r="0.8" fill="#1F2937" />
              {/* Whiskers */}
              <line x1="7" y1="21" x2="12" y2="21" stroke="#4B5563" strokeWidth="0.8" strokeLinecap="round" />
              <line x1="7" y1="23" x2="12" y2="23.5" stroke="#4B5563" strokeWidth="0.8" strokeLinecap="round" />
              <line x1="29" y1="21" x2="24" y2="21" stroke="#4B5563" strokeWidth="0.8" strokeLinecap="round" />
              <line x1="29" y1="23" x2="24" y2="23.5" stroke="#4B5563" strokeWidth="0.8" strokeLinecap="round" />
              {/* Nose & Mouth */}
              <polygon points="18,21 17,22.2 19,22.2" fill="#F43F5E" />
              <path d="M16.8 23.2 Q18 24.5 19.2 23.2" stroke="#4B5563" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </div>
        );
      case 'bird':
        return (
          <div className="w-full h-full rounded-full bg-[#E0F2FE] flex items-center justify-center p-1 border-2 border-[#0284C7]/30 shadow-xs">
            <svg viewBox="0 0 36 36" className="w-full h-full" fill="none">
              {/* Bird body */}
              <circle cx="18" cy="19" r="11" fill="#38BDF8" />
              {/* Crest feather */}
              <path d="M18 8 Q19 4 22 5 Q20 8 18 10" fill="#FBBF24" />
              {/* Beak */}
              <polygon points="18,17 13,20 18,23" fill="#F59E0B" />
              {/* Eye */}
              <circle cx="21" cy="16" r="2.2" fill="#FFFFFF" />
              <circle cx="21.5" cy="16" r="1.3" fill="#1E293B" />
              {/* Wing */}
              <path d="M23 18 Q27 23 23 27 Q20 25 21 20 Z" fill="#0284C7" />
              {/* Cheek */}
              <circle cx="21" cy="22" r="2" fill="#F472B6" opacity="0.6" />
            </svg>
          </div>
        );
      case 'fish':
        return (
          <div className="w-full h-full rounded-full bg-[#CCFBF1] flex items-center justify-center p-1 border-2 border-[#14B8A6]/30 shadow-xs">
            <svg viewBox="0 0 36 36" className="w-full h-full" fill="none">
              {/* Fish body */}
              <ellipse cx="17" cy="18" rx="10" ry="7.5" fill="#2DD4BF" />
              {/* Tail fin */}
              <polygon points="26,18 32,12 32,24" fill="#0D9488" />
              {/* Dorsal fin */}
              <path d="M14 11 Q17 7 21 11 Z" fill="#0D9488" />
              {/* Eye */}
              <circle cx="11" cy="16" r="2" fill="#FFFFFF" />
              <circle cx="10.5" cy="16" r="1" fill="#0F172A" />
              {/* Stripes */}
              <path d="M16 11 Q18 18 16 25" stroke="#F0FDFA" strokeWidth="1.2" strokeLinecap="round" />
              {/* Bubbles */}
              <circle cx="7" cy="13" r="1" fill="#99F6E4" opacity="0.8" />
              <circle cx="5" cy="9" r="0.7" fill="#99F6E4" opacity="0.8" />
            </svg>
          </div>
        );
      case 'rabbit':
        return (
          <div className="w-full h-full rounded-full bg-[#F3E8FF] flex items-center justify-center p-1 border-2 border-[#A855F7]/30 shadow-xs">
            <svg viewBox="0 0 36 36" className="w-full h-full" fill="none">
              {/* Long Ears */}
              <ellipse cx="13" cy="9" rx="2.5" ry="7" fill="#E9D5FF" />
              <ellipse cx="13" cy="9" rx="1.3" ry="5" fill="#F472B6" />
              <ellipse cx="23" cy="9" rx="2.5" ry="7" fill="#E9D5FF" />
              <ellipse cx="23" cy="9" rx="1.3" ry="5" fill="#F472B6" />
              {/* Head */}
              <ellipse cx="18" cy="21" rx="9" ry="8.5" fill="#E9D5FF" />
              {/* Eyes */}
              <circle cx="14" cy="19" r="1.5" fill="#581C87" />
              <circle cx="22" cy="19" r="1.5" fill="#581C87" />
              <circle cx="14.4" cy="18.5" r="0.5" fill="#FFFFFF" />
              <circle cx="22.4" cy="18.5" r="0.5" fill="#FFFFFF" />
              {/* Nose & Mouth */}
              <polygon points="18,22 17,23 19,23" fill="#EC4899" />
              <path d="M16.5 24 Q18 25.5 19.5 24" stroke="#581C87" strokeWidth="0.8" strokeLinecap="round" />
              {/* Cheeks */}
              <circle cx="12" cy="22" r="1.8" fill="#F472B6" opacity="0.5" />
              <circle cx="24" cy="22" r="1.8" fill="#F472B6" opacity="0.5" />
            </svg>
          </div>
        );
      case 'hamster':
      default:
        return (
          <div className="w-full h-full rounded-full bg-[#FEF3C7] flex items-center justify-center p-1 border-2 border-[#F59E0B]/30 shadow-xs">
            <svg viewBox="0 0 36 36" className="w-full h-full" fill="none">
              {/* Ears */}
              <circle cx="11" cy="12" r="3.5" fill="#FBBF24" />
              <circle cx="11" cy="12" r="2" fill="#FDE68A" />
              <circle cx="25" cy="12" r="3.5" fill="#FBBF24" />
              <circle cx="25" cy="12" r="2" fill="#FDE68A" />
              {/* Chubby Head */}
              <ellipse cx="18" cy="20" rx="10" ry="9" fill="#FBBF24" />
              {/* Cheeks */}
              <ellipse cx="11" cy="22" rx="3.5" ry="3" fill="#FDE68A" />
              <ellipse cx="25" cy="22" rx="3.5" ry="3" fill="#FDE68A" />
              {/* Eyes */}
              <circle cx="14" cy="18" r="1.5" fill="#78350F" />
              <circle cx="22" cy="18" r="1.5" fill="#78350F" />
              <circle cx="14.4" cy="17.6" r="0.5" fill="#FFFFFF" />
              <circle cx="22.4" cy="17.6" r="0.5" fill="#FFFFFF" />
              {/* Nose */}
              <ellipse cx="18" cy="20.5" rx="1.2" ry="0.8" fill="#F43F5E" />
              {/* Cute buck teeth */}
              <rect x="17.2" y="22" width="1.6" height="1.8" rx="0.4" fill="#FFFFFF" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className={`inline-flex items-center justify-center shrink-0 select-none ${sizeClasses[size]} ${className}`}>
      {renderAvatarContent()}
    </div>
  );
};

// PetEmptyState component with playful pet illustrations
export const PetEmptyState: React.FC<{
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  avatar?: PetAvatarType;
}> = ({ title, description, actionText, onAction, avatar = 'dog' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md mx-auto">
      <div className="relative mb-4">
        <div className="w-24 h-24 rounded-full bg-[#F5F2ED] border border-[#EAE7E0] flex items-center justify-center p-3 shadow-inner">
          <PetAvatar type={avatar} size="xl" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shadow-md">
          <PawIcon className="w-4 h-4" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-[#1A1A1A] font-serif">{title}</h3>
      <p className="text-sm text-[#666666] mt-1.5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#D97757] hover:bg-[#C86646] text-white text-sm font-semibold shadow-xs transition-all active:scale-98"
        >
          <PawIcon className="w-4 h-4" />
          {actionText}
        </button>
      )}
    </div>
  );
};
