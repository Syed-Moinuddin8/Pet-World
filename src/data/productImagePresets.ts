export interface ProductImagePreset {
  id: string;
  label: string;
  brand: string;
  company: string;
  form: 'DRIED' | 'WET' | 'OTHER';
  animal: 'dog' | 'cat' | 'bird' | 'fish' | 'other';
  url: string;
}

export const PRODUCT_IMAGE_PRESETS: ProductImagePreset[] = [
  // Royal Canin
  {
    id: 'rc-maxi-dry',
    label: 'Royal Canin Maxi Dry Dog Kibble',
    brand: 'Royal Canin',
    company: 'Royal Canin',
    form: 'DRIED',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'rc-wet-gravy',
    label: 'Royal Canin Wet Gravy Pouch',
    brand: 'Royal Canin',
    company: 'Royal Canin',
    form: 'WET',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'rc-kitten-wet',
    label: 'Royal Canin Kitten Wet Jelly Pouch',
    brand: 'Royal Canin',
    company: 'Royal Canin',
    form: 'WET',
    animal: 'cat',
    url: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=500&auto=format&fit=crop&q=80',
  },

  // Pedigree
  {
    id: 'ped-dry-chicken',
    label: 'Pedigree Adult Chicken Dry Dog Food',
    brand: 'Pedigree',
    company: 'Pedigree (Mars Petcare)',
    form: 'DRIED',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'ped-wet-pouch',
    label: 'Pedigree Chicken & Liver Gravy Wet Pouch',
    brand: 'Pedigree',
    company: 'Pedigree (Mars Petcare)',
    form: 'WET',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'ped-wet-tin',
    label: 'Pedigree Meat Loaf Canned Wet Tin 400g',
    brand: 'Pedigree',
    company: 'Pedigree (Mars Petcare)',
    form: 'WET',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&auto=format&fit=crop&q=80',
  },

  // Whiskas
  {
    id: 'whis-dry-fish',
    label: 'Whiskas Ocean Fish Dry Cat Food',
    brand: 'Whiskas',
    company: 'Whiskas (Mars Petcare)',
    form: 'DRIED',
    animal: 'cat',
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'whis-wet-jelly',
    label: 'Whiskas Tuna in Jelly Wet Cat Food',
    brand: 'Whiskas',
    company: 'Whiskas (Mars Petcare)',
    form: 'WET',
    animal: 'cat',
    url: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=500&auto=format&fit=crop&q=80',
  },

  // Drools
  {
    id: 'dr-focus-dry',
    label: 'Drools Focus Puppy Super Premium Dry',
    brand: 'Drools',
    company: 'Drools Pet Food',
    form: 'DRIED',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'dr-wet-gravy',
    label: 'Drools Real Chicken Chunks in Gravy Wet',
    brand: 'Drools',
    company: 'Drools Pet Food',
    form: 'WET',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=500&auto=format&fit=crop&q=80',
  },

  // Farmina
  {
    id: 'far-dry-pumpkin',
    label: 'Farmina N&D Grain-Free Dry Kibble',
    brand: 'Farmina',
    company: 'Farmina Pet Foods',
    form: 'DRIED',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'far-wet-can',
    label: 'Farmina N&D Prime Canned Wet Dog Food',
    brand: 'Farmina',
    company: 'Farmina Pet Foods',
    form: 'WET',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&auto=format&fit=crop&q=80',
  },

  // Hill's
  {
    id: 'hills-dry',
    label: "Hill's Science Diet Canine Dry Food",
    brand: "Hill's",
    company: "Hill's Pet Nutrition",
    form: 'DRIED',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'hills-wet-stew',
    label: "Hill's Science Diet Savory Stew Canned",
    brand: "Hill's",
    company: "Hill's Pet Nutrition",
    form: 'WET',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&auto=format&fit=crop&q=80',
  },

  // Treats & Jerky
  {
    id: 'treats-jerky-dry',
    label: 'JerHigh Dehydrated Chicken Jerky Treats',
    brand: 'JerHigh',
    company: 'JerHigh International',
    form: 'DRIED',
    animal: 'dog',
    url: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'sheba-wet-loaf',
    label: 'Sheba Succulent Wet Cat Loaf',
    brand: 'Sheba',
    company: 'Sheba (Mars Petcare)',
    form: 'WET',
    animal: 'cat',
    url: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=500&auto=format&fit=crop&q=80',
  },

  // Birds & Fish
  {
    id: 'bird-seeds-dry',
    label: 'Avian Seeds & Dried Fruit Mix',
    brand: 'Versele-Laga',
    company: 'Versele-Laga',
    form: 'DRIED',
    animal: 'bird',
    url: 'https://images.unsplash.com/photo-1522858547137-f1dcec554f55?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'fish-flakes-dry',
    label: 'Aquatic Complete Flakes & Pellets',
    brand: 'Tetra',
    company: 'Spectrum Brands (Tetra)',
    form: 'DRIED',
    animal: 'fish',
    url: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=500&auto=format&fit=crop&q=80',
  },
];
