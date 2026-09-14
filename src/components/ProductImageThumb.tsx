import React, { useState } from 'react';
import { PetAvatarType, ProductForm } from '../types.js';
import { ProductPackshot } from './ProductPackshot.js';

interface ProductImageThumbProps {
  src?: string;
  alt: string;
  brand?: string;
  company?: string;
  avatarType?: PetAvatarType;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  productForm?: ProductForm;
  onClick?: () => void;
  className?: string;
}

export const ProductImageThumb: React.FC<ProductImageThumbProps> = ({
  src,
  alt,
  brand,
  company,
  avatarType = 'dog',
  size = 'md',
  productForm,
  onClick,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-8 h-8 rounded-lg',
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-12 h-12 rounded-2xl',
    lg: 'w-16 h-16 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl',
  };

  const innerRadius = {
    xs: 'rounded-lg',
    sm: 'rounded-xl',
    md: 'rounded-2xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
  };

  const showImage = Boolean(src && src.trim() && !imgError);

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 flex items-center justify-center overflow-hidden border border-[#EAE7E0] bg-[#F5F2ED] ${sizeClasses[size]} ${
        onClick ? 'cursor-pointer hover:opacity-90' : ''
      } ${className}`}
      title={alt}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover ${innerRadius[size]}`}
        />
      ) : (
        <ProductPackshot
          name={alt}
          brand={brand}
          company={company}
          productForm={productForm}
          avatarType={avatarType}
          size={size}
          className="w-full h-full"
        />
      )}

      {/* Form badge indicator if provided */}
      {productForm && (size === 'md' || size === 'lg' || size === 'xl') && (
        <div
          className={`absolute -bottom-1 -right-1 px-1 py-0.2 text-[8px] font-black rounded tracking-tighter uppercase shadow-xs border ${
            productForm === 'DRIED'
              ? 'bg-amber-100/95 text-amber-800 border-amber-300'
              : productForm === 'WET'
              ? 'bg-cyan-100/95 text-cyan-800 border-cyan-300'
              : 'bg-stone-100/95 text-stone-700 border-stone-300'
          }`}
          title={productForm === 'DRIED' ? 'Dried Product' : productForm === 'WET' ? 'Wet Product' : 'Other'}
        >
          {productForm === 'DRIED' ? '🌾' : productForm === 'WET' ? '🥫' : '📦'}
        </div>
      )}
    </div>
  );
};

export const ProductFormBadge: React.FC<{ form?: 'DRIED' | 'WET' | 'OTHER'; size?: 'sm' | 'md' }> = ({
  form = 'OTHER',
  size = 'md',
}) => {
  if (form === 'DRIED') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-extrabold rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        }`}
        title="Dried Product (Kibble, Dry Food, Biscuits, Pellets, Flakes)"
      >
        <span>🌾</span>
        <span>Dried Product</span>
      </span>
    );
  }

  if (form === 'WET') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-extrabold rounded-lg bg-cyan-50 text-cyan-800 border border-cyan-200/80 ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        }`}
        title="Wet Product (Gravy Pouch, Loaf, Canned Tin, Pâté, Stew)"
      >
        <span>🥫</span>
        <span>Wet Product</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-extrabold rounded-lg bg-stone-100 text-stone-700 border border-stone-200/80 ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}
      title="Other Supply / Accessories / Care"
    >
      <span>📦</span>
      <span>Supplies / Other</span>
    </span>
  );
};
