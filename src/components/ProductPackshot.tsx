import React from 'react';
import { PetAvatarType, ProductForm } from '../types.js';

interface ProductPackshotProps {
  name?: string;
  brand?: string;
  company?: string;
  productForm?: ProductForm;
  avatarType?: PetAvatarType | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'card';
  className?: string;
}

interface BrandTheme {
  primary: string;
  accent: string;
  textOnPrimary: string;
  bgGrad: string;
  logoText: string;
  subText: string;
  tag: string;
}

function getBrandTheme(brandName = '', companyName = ''): BrandTheme {
  const b = (brandName + ' ' + companyName).toLowerCase();

  if (b.includes('royal canin')) {
    return {
      primary: '#E60000',
      accent: '#FFD700',
      textOnPrimary: '#FFFFFF',
      bgGrad: 'from-red-600 to-rose-700',
      logoText: 'ROYAL CANIN',
      subText: 'BREED HEALTH NUTRITION',
      tag: '👑 HEALTH NUTRITION',
    };
  }

  if (b.includes('pedigree')) {
    return {
      primary: '#FFCB05',
      accent: '#003DA5',
      textOnPrimary: '#003DA5',
      bgGrad: 'from-amber-400 to-yellow-500',
      logoText: 'Pedigree',
      subText: 'VITAL PROTECTION',
      tag: '⭐ 100% COMPLETE',
    };
  }

  if (b.includes('whiskas')) {
    return {
      primary: '#6F2C91',
      accent: '#FFCB05',
      textOnPrimary: '#FFFFFF',
      bgGrad: 'from-purple-700 to-fuchsia-900',
      logoText: 'whiskas',
      subText: '100% COMPLETE & BALANCED',
      tag: '🐱 DELICIOUS FLAVOR',
    };
  }

  if (b.includes('drools')) {
    return {
      primary: '#3F226A',
      accent: '#D4AF37',
      textOnPrimary: '#FFFFFF',
      bgGrad: 'from-indigo-900 to-purple-800',
      logoText: 'drools',
      subText: 'FOCUS SUPER PREMIUM',
      tag: '⚡ REAL CHICKEN',
    };
  }

  if (b.includes('farmina') || b.includes('n&d')) {
    return {
      primary: '#2E6F40',
      accent: '#D4AF37',
      textOnPrimary: '#FFFFFF',
      bgGrad: 'from-emerald-800 to-teal-900',
      logoText: 'FARMINA N&D',
      subText: 'GRAIN FREE FORMULA',
      tag: '🌿 NATURAL & DELICIOUS',
    };
  }

  if (b.includes("hill") || b.includes('science diet')) {
    return {
      primary: '#002B49',
      accent: '#E60000',
      textOnPrimary: '#FFFFFF',
      bgGrad: 'from-slate-800 to-sky-950',
      logoText: "Hill's",
      subText: 'SCIENCE DIET',
      tag: '🩺 VET RECOMMENDED',
    };
  }

  if (b.includes('himalaya')) {
    return {
      primary: '#006A4E',
      accent: '#E65100',
      textOnPrimary: '#FFFFFF',
      bgGrad: 'from-emerald-700 to-green-900',
      logoText: 'Himalaya',
      subText: 'HERBAL WELLNESS',
      tag: '🍃 AYURVEDIC FORMULA',
    };
  }

  if (b.includes('me-o') || b.includes('meo')) {
    return {
      primary: '#FF6F00',
      accent: '#FFD54F',
      textOnPrimary: '#FFFFFF',
      bgGrad: 'from-orange-600 to-amber-600',
      logoText: 'Me-O',
      subText: 'DELICIOUS CAT TREAT',
      tag: '🐟 RICH FLAVOR',
    };
  }

  if (b.includes('kong')) {
    return {
      primary: '#D32F2F',
      accent: '#212121',
      textOnPrimary: '#FFFFFF',
      bgGrad: 'from-red-700 to-zinc-900',
      logoText: 'KONG',
      subText: 'DURABLE RUBBER PLAY',
      tag: '🎾 CHEW TOY',
    };
  }

  // Default General Pet Brand
  return {
    primary: '#264653',
    accent: '#E76F51',
    textOnPrimary: '#FFFFFF',
    bgGrad: 'from-[#264653] to-[#1E3741]',
    logoText: brandName.toUpperCase() || 'PET CARE',
    subText: 'PREMIUM QUALITY',
    tag: '✨ NUTRITION',
  };
}

export const ProductPackshot: React.FC<ProductPackshotProps> = ({
  name = 'Pet Product',
  brand = 'Pet Care',
  company = '',
  productForm = 'DRIED',
  avatarType = 'dog',
  size = 'md',
  className = '',
}) => {
  const theme = getBrandTheme(brand, company);
  const isWet = productForm === 'WET' || name.toLowerCase().includes('wet') || name.toLowerCase().includes('gravy') || name.toLowerCase().includes('can') || name.toLowerCase().includes('pouch');
  const isDog = avatarType === 'dog' || name.toLowerCase().includes('dog') || name.toLowerCase().includes('puppy') || name.toLowerCase().includes('canine');
  const isCat = avatarType === 'cat' || name.toLowerCase().includes('cat') || name.toLowerCase().includes('kitten') || name.toLowerCase().includes('feline');

  // Extract weight/size from name e.g. "15kg", "3kg", "85g", "400g"
  const weightMatch = name.match(/(\d+(\.\d+)?\s*(kg|g|gm|ml|l|ltr|packets?))/i);
  const weightLabel = weightMatch ? weightMatch[0].toUpperCase() : isWet ? '85G' : '3KG';

  // Sizing definitions
  if (size === 'card') {
    return (
      <div className={`w-full h-full min-h-[110px] relative flex items-center justify-center p-2 select-none overflow-hidden ${className}`}>
        {/* Subtle radial backdrop with brand ambient glow */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background: `radial-gradient(circle at center, ${theme.primary} 0%, transparent 70%)`,
          }}
        />

        {isWet ? (
          /* WET FOOD POUCH / CAN PACKSHOT */
          <div className="relative w-28 h-28 flex flex-col items-center justify-center drop-shadow-md transition-transform group-hover:scale-105 duration-200">
            {/* Standup pouch bag */}
            <div
              className="w-24 h-28 rounded-t-xl rounded-b-md shadow-lg relative flex flex-col justify-between overflow-hidden border-2 border-white/80"
              style={{
                background: `linear-gradient(175deg, #FAF8F5 0%, #FFFFFF 30%, ${theme.primary} 70%, #1A1A1A 100%)`,
              }}
            >
              {/* Top seal notch & heat press marks */}
              <div className="h-3 w-full bg-black/10 border-b border-black/10 flex items-center justify-between px-1.5">
                <div className="w-1 h-1 rounded-full bg-black/20" />
                <div className="flex gap-0.5">
                  <div className="w-0.5 h-1.5 bg-black/15" />
                  <div className="w-0.5 h-1.5 bg-black/15" />
                  <div className="w-0.5 h-1.5 bg-black/15" />
                </div>
                <div className="w-1 h-1 rounded-full bg-black/20" />
              </div>

              {/* Brand Header */}
              <div
                className="py-1 px-1.5 text-center shadow-xs"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <div className="text-[9px] font-black tracking-wider uppercase leading-none truncate">
                  {theme.logoText}
                </div>
                <div className="text-[6px] font-semibold opacity-90 tracking-tighter truncate mt-0.5">
                  {theme.subText}
                </div>
              </div>

              {/* Center Graphic: Gravy bowl / Meat chunks */}
              <div className="flex-1 flex flex-col items-center justify-center relative p-1 bg-white/40 backdrop-blur-2xs">
                <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shadow-inner relative">
                  <span className="text-base leading-none">🥫</span>
                  <div className="absolute -bottom-1 px-1 py-0.2 rounded-full bg-rose-600 text-white text-[6px] font-black tracking-tighter uppercase">
                    GRAVY
                  </div>
                </div>
                <div className="text-[7px] font-bold text-gray-800 text-center leading-tight truncate w-full px-1 mt-1">
                  {name.split(' ').slice(0, 3).join(' ')}
                </div>
              </div>

              {/* Bottom bar with Net Wt */}
              <div className="bg-zinc-900 text-white px-1.5 py-0.5 flex items-center justify-between text-[7px] font-mono font-bold">
                <span className="text-amber-300">WET FOOD</span>
                <span>{weightLabel}</span>
              </div>
            </div>

            {/* Glossy packaging light reflection overlay */}
            <div className="absolute top-2 left-3 w-3 h-20 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-12deg] pointer-events-none rounded-full" />
          </div>
        ) : (
          /* DRY FOOD STAND-UP KIBBLE BAG PACKSHOT */
          <div className="relative w-28 h-28 flex flex-col items-center justify-center drop-shadow-md transition-transform group-hover:scale-105 duration-200">
            <div
              className="w-24 h-28 rounded-t-lg rounded-b-sm shadow-xl relative flex flex-col justify-between overflow-hidden border border-white/90"
              style={{
                background: `linear-gradient(180deg, #FAF8F5 0%, #FFFFFF 45%, ${theme.primary} 90%)`,
              }}
            >
              {/* Top bag fold line & zipper seal */}
              <div className="h-3.5 w-full bg-stone-100/90 border-b border-stone-300/80 flex items-center justify-between px-1">
                <span className="text-[6px] font-mono text-stone-500 font-bold uppercase">ZIP SEAL</span>
                <span className="text-[8px] leading-none">🌾</span>
              </div>

              {/* Brand Banner Bar */}
              <div
                className="py-1 px-1 text-center shadow-xs"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <div className="text-[9px] font-black tracking-wider uppercase leading-none truncate">
                  {theme.logoText}
                </div>
                <div className="text-[6px] font-bold opacity-90 truncate mt-0.5">
                  {theme.tag}
                </div>
              </div>

              {/* Bag Body with Pet Silhouette & Kibbles */}
              <div className="flex-1 flex flex-col items-center justify-center p-1 bg-white/70 relative">
                <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shadow-inner relative">
                  <span className="text-lg leading-none">
                    {isCat ? '🐱' : '🐕'}
                  </span>
                  <div className="absolute -bottom-1 px-1 py-0.2 rounded-full bg-[#264653] text-white text-[6px] font-black uppercase">
                    KIBBLE
                  </div>
                </div>
                <div className="text-[7px] font-extrabold text-[#264653] text-center leading-tight truncate w-full px-0.5 mt-1">
                  {name.split(' ').slice(1, 4).join(' ') || 'Adult Formula'}
                </div>
              </div>

              {/* Weight Banner */}
              <div className="bg-[#1E3741] text-white px-1.5 py-0.5 flex items-center justify-between text-[7px] font-mono font-black">
                <span className="text-amber-400">DRIED</span>
                <span>{weightLabel}</span>
              </div>
            </div>

            {/* Glossy light stripe */}
            <div className="absolute top-2 left-4 w-3.5 h-20 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[-15deg] pointer-events-none rounded-full" />
          </div>
        )}
      </div>
    );
  }

  // Thumbnails (sm, md, lg, xl)
  const sizeDims = {
    xs: 'w-8 h-8 text-[6px]',
    sm: 'w-10 h-10 text-[7px]',
    md: 'w-12 h-12 text-[8px]',
    lg: 'w-16 h-16 text-[9px]',
    xl: 'w-20 h-20 text-[10px]',
  };

  return (
    <div
      className={`relative shrink-0 flex flex-col items-center justify-between rounded-xl overflow-hidden shadow-xs border border-[#EAE7E0] select-none ${sizeDims[size]} ${className}`}
      style={{
        background: `linear-gradient(160deg, #FFFFFF 0%, #FAF8F5 50%, ${theme.primary} 120%)`,
      }}
      title={`${brand} - ${name}`}
    >
      {/* Brand Top Header */}
      <div
        className="w-full py-0.5 px-0.5 text-center truncate font-black tracking-tight uppercase shadow-xs leading-none"
        style={{
          backgroundColor: theme.primary,
          color: theme.textOnPrimary,
          fontSize: size === 'xs' || size === 'sm' ? '6px' : '7.5px',
        }}
      >
        {theme.logoText.split(' ')[0]}
      </div>

      {/* Center Icon: Pet or Form icon */}
      <div className="flex-1 flex items-center justify-center">
        <span
          className="leading-none drop-shadow-xs"
          style={{ fontSize: size === 'xs' || size === 'sm' ? '14px' : '20px' }}
        >
          {isWet ? '🥫' : isCat ? '🐱' : isDog ? '🐕' : '🌾'}
        </span>
      </div>

      {/* Bottom Weight Tag */}
      <div className="w-full bg-[#1A1A1A] text-white py-0.2 px-0.5 text-center font-mono font-bold leading-none truncate" style={{ fontSize: '6px' }}>
        {weightLabel}
      </div>
    </div>
  );
};
