import { Product } from '../types.js';
import { PRODUCT_IMAGE_PRESETS } from '../data/productImagePresets.js';

/**
 * Returns a high-quality product image URL for any product.
 * If the product has a custom imageUrl, it uses that.
 * Otherwise, it maps to the closest preset matching brand, company, product form, or animal.
 */
export function getProductImageUrl(product?: Partial<Product> | null): string {
  if (!product) {
    return 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&auto=format&fit=crop&q=80';
  }

  // If product already has an image
  if (product.imageUrl && product.imageUrl.trim()) {
    return product.imageUrl.trim();
  }

  const brand = (product.brand || '').toLowerCase();
  const company = (product.company || '').toLowerCase();
  const name = (product.name || '').toLowerCase();
  const form = product.productForm || (name.includes('gravy') || name.includes('wet') || name.includes('can') || name.includes('pouch') ? 'WET' : 'DRIED');
  const cat = (product.category || '').toLowerCase();
  const animal = (product.avatarType || (cat.includes('cat') ? 'cat' : cat.includes('bird') ? 'bird' : cat.includes('fish') ? 'fish' : 'dog')).toLowerCase();

  // 1. Try exact brand & form match in presets
  const exactMatch = PRODUCT_IMAGE_PRESETS.find((p) => {
    const pBrand = p.brand.toLowerCase();
    const pCompany = p.company.toLowerCase();
    const brandMatches = brand.includes(pBrand) || pBrand.includes(brand) || company.includes(pCompany) || pCompany.includes(company);
    return brandMatches && p.form === form;
  });
  if (exactMatch) return exactMatch.url;

  // 2. Try brand or company match
  const brandMatch = PRODUCT_IMAGE_PRESETS.find((p) => {
    const pBrand = p.brand.toLowerCase();
    const pCompany = p.company.toLowerCase();
    return brand.includes(pBrand) || pBrand.includes(brand) || company.includes(pCompany) || pCompany.includes(company);
  });
  if (brandMatch) return brandMatch.url;

  // 3. Try animal & form match
  const animalFormMatch = PRODUCT_IMAGE_PRESETS.find((p) => p.animal === animal && p.form === form);
  if (animalFormMatch) return animalFormMatch.url;

  // 4. Try animal match
  const animalMatch = PRODUCT_IMAGE_PRESETS.find((p) => p.animal === animal);
  if (animalMatch) return animalMatch.url;

  // 5. Fallback images by animal
  if (animal === 'cat') {
    return 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&auto=format&fit=crop&q=80';
  }
  if (animal === 'bird') {
    return 'https://images.unsplash.com/photo-1522858547137-f1dcec554f55?w=500&auto=format&fit=crop&q=80';
  }
  if (animal === 'fish') {
    return 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=500&auto=format&fit=crop&q=80';
  }

  // Dog default
  return 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&auto=format&fit=crop&q=80';
}
