export const SERVER_PRODUCT_IMAGES: Record<string, string> = {
  'royal-canin': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&auto=format&fit=crop&q=80',
  'royal-canin-wet': 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&auto=format&fit=crop&q=80',
  'pedigree': 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=500&auto=format&fit=crop&q=80',
  'pedigree-wet': 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&auto=format&fit=crop&q=80',
  'drools': 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=500&auto=format&fit=crop&q=80',
  'farmina': 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&auto=format&fit=crop&q=80',
  'whiskas': 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&auto=format&fit=crop&q=80',
  'whiskas-wet': 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=500&auto=format&fit=crop&q=80',
  'sheba': 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=500&auto=format&fit=crop&q=80',
  'me-o': 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=500&auto=format&fit=crop&q=80',
  'hills': 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=500&auto=format&fit=crop&q=80',
  'bird': 'https://images.unsplash.com/photo-1522858547137-f1dcec554f55?w=500&auto=format&fit=crop&q=80',
  'fish': 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=500&auto=format&fit=crop&q=80',
};

export function resolveProductImageUrl(p: any): string {
  if (p.imageUrl && typeof p.imageUrl === 'string' && p.imageUrl.startsWith('http')) {
    return p.imageUrl;
  }
  const brand = (p.brand || '').toLowerCase();
  const company = (p.company || '').toLowerCase();
  const name = (p.name || '').toLowerCase();
  const isWet = p.productForm === 'WET' || name.includes('gravy') || name.includes('can') || name.includes('pouch') || name.includes('wet');

  if (brand.includes('royal') || company.includes('royal')) {
    return isWet ? SERVER_PRODUCT_IMAGES['royal-canin-wet'] : SERVER_PRODUCT_IMAGES['royal-canin'];
  }
  if (brand.includes('pedigree') || company.includes('pedigree')) {
    return isWet ? SERVER_PRODUCT_IMAGES['pedigree-wet'] : SERVER_PRODUCT_IMAGES['pedigree'];
  }
  if (brand.includes('drools') || company.includes('drools')) {
    return SERVER_PRODUCT_IMAGES['drools'];
  }
  if (brand.includes('farmina') || company.includes('farmina') || brand.includes('n&d')) {
    return SERVER_PRODUCT_IMAGES['farmina'];
  }
  if (brand.includes('whiskas') || company.includes('whiskas')) {
    return isWet ? SERVER_PRODUCT_IMAGES['whiskas-wet'] : SERVER_PRODUCT_IMAGES['whiskas'];
  }
  if (brand.includes('sheba') || company.includes('sheba')) {
    return SERVER_PRODUCT_IMAGES['sheba'];
  }
  if (brand.includes('me-o') || brand.includes('meo')) {
    return SERVER_PRODUCT_IMAGES['me-o'];
  }
  if (brand.includes('hill')) {
    return SERVER_PRODUCT_IMAGES['hills'];
  }
  if (p.avatarType === 'bird' || (p.category || '').toLowerCase().includes('bird')) {
    return SERVER_PRODUCT_IMAGES['bird'];
  }
  if (p.avatarType === 'fish' || (p.category || '').toLowerCase().includes('fish')) {
    return SERVER_PRODUCT_IMAGES['fish'];
  }
  if (p.avatarType === 'cat' || (p.category || '').toLowerCase().includes('cat')) {
    return SERVER_PRODUCT_IMAGES['whiskas'];
  }
  return SERVER_PRODUCT_IMAGES['royal-canin'];
}
