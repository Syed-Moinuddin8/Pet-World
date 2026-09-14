import React, { useState, useEffect } from 'react';
import { X, Building2, Package, Save, Check, Barcode, Camera, RefreshCw, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Product, ProductCategory, PetAvatarType, ProductForm } from '../types.js';
import { BarcodeScannerModal } from './BarcodeScannerModal.js';
import { ImageUploadPicker } from './ImageUploadPicker.js';
import { ProductImageThumb } from './ProductImageThumb.js';
import { getProductImageUrl } from '../utils/productImages.js';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: (productId: string, updates: Partial<Product>) => Promise<any>;
  existingCompanies: string[];
  categories?: string[];
  onDelete?: (productId: string) => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
  existingCompanies,
  categories = [
    'Dog Food',
    'Cat Food',
    'Pet Treats',
    'Bird Food',
    'Fish Food',
    'Toys',
    'Leashes & Collars',
    'Beds & Mats',
    'Grooming',
    'Medicines & Care',
    'Accessories',
    'Aquarium Products',
    'Bird Accessories',
    'Other',
  ],
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [company, setCompany] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Dog Food');
  const [productForm, setProductForm] = useState<ProductForm>('DRIED');
  const [unit, setUnit] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [avatarType, setAvatarType] = useState<PetAvatarType>('dog');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(18);
  const [minStockLevel, setMinStockLevel] = useState<number>(5);
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  const [status, setStatus] = useState<'ACTIVE' | 'DISCONTINUED'>('ACTIVE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setBarcode(product.barcode || '');
      setCompany(product.company || product.brand || '');
      setBrand(product.brand || '');
      setCategory(product.category || 'Dog Food');
      setProductForm(product.productForm || 'DRIED');
      setUnit(product.unit || 'packet');
      setImageUrl(product.imageUrl || '');
      setAvatarType(product.avatarType || 'dog');
      setCostPrice(product.costPrice || product.purchasePrice || 0);
      setPurchasePrice(product.purchasePrice || 0);
      setSellingPrice(product.sellingPrice || 0);
      setMrp(product.mrp || 0);
      setTaxPercent(product.taxPercent ?? 18);
      setMinStockLevel(product.minStockLevel || 5);
      setReorderLevel(product.reorderLevel || 10);
      setStatus(product.status || 'ACTIVE');
      setError('');
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const generateEan = () => {
    const raw = '890' + Math.floor(100000000 + Math.random() * 900000000).toString();
    const digits = raw.slice(0, 12).split('').map(Number);
    const sum = digits.reduce((acc, digit, idx) => acc + digit * (idx % 2 === 0 ? 1 : 3), 0);
    const checkDigit = (10 - (sum % 10)) % 10;
    setBarcode(raw.slice(0, 12) + checkDigit);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product title is required.');
      return;
    }
    if (!company.trim()) {
      setError('Company / Manufacturer name is required.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSave(product.id, {
        name: name.trim(),
        barcode: barcode.trim() || undefined,
        company: company.trim(),
        brand: brand.trim() || company.trim(),
        category,
        productForm,
        unit: unit as any,
        imageUrl: imageUrl.trim() || undefined,
        avatarType,
        costPrice: Number(costPrice) || Number(purchasePrice),
        purchasePrice: Number(purchasePrice),
        sellingPrice: Number(sellingPrice),
        mrp: Number(mrp),
        taxPercent: Number(taxPercent),
        minStockLevel: Number(minStockLevel),
        reorderLevel: Number(reorderLevel),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full border border-[#EADDCE] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-[#F2ECE4] flex items-center justify-between bg-[#FAF8F5]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#E76F51]">
              <Package className="w-4 h-4" />
              <span>Catalog Management</span>
            </div>
            <h2 className="text-lg font-bold text-[#264653] font-['Fredoka',sans-serif]">
              Edit Product & Categorization
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 text-[#7C9082] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* Section: Company & Classification */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] space-y-4">
            <h3 className="text-xs font-extrabold text-[#264653] uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#E76F51]" />
              <span>Company & Food Classification</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Company / Manufacturer */}
              <div>
                <label className="block font-bold text-[#264653] mb-1">
                  Company / Manufacturer *
                </label>
                <input
                  type="text"
                  list="companies-list"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Royal Canin, Pedigree (Mars), Drools"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
                <datalist id="companies-list">
                  {existingCompanies.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <p className="text-[10px] text-[#7C9082] mt-0.5">
                  Products are grouped under this parent company
                </p>
              </div>

              {/* Brand Label */}
              <div>
                <label className="block font-bold text-[#264653] mb-1">Brand Name</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Royal Canin, Pedigree"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Dried or Wet Classification */}
            <div>
              <label className="block font-bold text-[#264653] mb-1.5">
                Product Form (Categorized under Company) *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setProductForm('DRIED')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    productForm === 'DRIED'
                      ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400'
                      : 'border-[#D5C7B8] bg-white hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">🌾</span>
                    {productForm === 'DRIED' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </div>
                  <span className="text-xs font-bold text-[#264653]">Dried Product</span>
                  <span className="text-[10px] text-[#7C9082]">
                    Kibble, Pellets, Flakes, Dry Food
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setProductForm('WET')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    productForm === 'WET'
                      ? 'border-cyan-500 bg-cyan-50/80 ring-2 ring-cyan-400'
                      : 'border-[#D5C7B8] bg-white hover:border-cyan-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">🥫</span>
                    {productForm === 'WET' && <Check className="w-3.5 h-3.5 text-cyan-600" />}
                  </div>
                  <span className="text-xs font-bold text-[#264653]">Wet Product</span>
                  <span className="text-[10px] text-[#7C9082]">
                    Gravy Pouch, Canned Tin, Loaf, Pâté
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setProductForm('OTHER')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    productForm === 'OTHER'
                      ? 'border-stone-500 bg-stone-100 ring-2 ring-stone-400'
                      : 'border-[#D5C7B8] bg-white hover:border-stone-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">📦</span>
                    {productForm === 'OTHER' && <Check className="w-3.5 h-3.5 text-stone-700" />}
                  </div>
                  <span className="text-xs font-bold text-[#264653]">Other Supply</span>
                  <span className="text-[10px] text-[#7C9082]">Accessories, Toys, Care</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Barcode Number */}
          <div className="p-4 rounded-2xl bg-[#E76F51]/5 border border-[#E76F51]/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#E76F51] flex items-center gap-1.5">
                <Barcode className="w-4 h-4" />
                <span>Barcode Number (EAN-13 / UPC)</span>
              </label>
              <span className="text-[10px] text-[#7C9082]">Scannable at POS counter</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 8901234567890"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#D5C7B8] bg-white font-mono font-bold text-xs text-[#264653] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
                <Barcode className="w-4 h-4 text-[#7C9082] absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3 py-2 rounded-xl bg-white border border-[#D5C7B8] hover:bg-[#FAF8F5] text-[#E76F51] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Scan barcode with camera"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan</span>
                </button>

                <button
                  type="button"
                  onClick={generateEan}
                  className="px-3 py-2 rounded-xl bg-white border border-[#D5C7B8] hover:bg-[#FAF8F5] text-[#264653] font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Generate Indian GS1 EAN-13 barcode"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generate</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-[#264653] mb-1">Product Title *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#264653] mb-1">Department Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              >
                {/* Ensure current category appears even if legacy */}
                {category && !categories.includes(category) && (
                  <option value={category}>{category}</option>
                )}
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section: Product Image */}
          <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#D5C7B8] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#264653] flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#E76F51]" />
                <span>Product Image (For Visual Stock Selection)</span>
              </label>
              <span className="text-[10px] text-[#7C9082]">Upload or pick from presets</span>
            </div>
            <ImageUploadPicker
              value={imageUrl || (product ? getProductImageUrl(product) : '')}
              onChange={(url) => setImageUrl(url)}
              brandHint={company || brand}
              formHint={productForm}
            />
          </div>

          {/* Section 4: Unit, Avatar & Status */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-[#264653] mb-1">Unit of Measure *</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. 15kg, packet, can"
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#264653] mb-1">Pet Avatar</label>
              <select
                value={avatarType}
                onChange={(e) => setAvatarType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              >
                <option value="dog">🐶 Dog</option>
                <option value="cat">🐱 Cat</option>
                <option value="bird">🦜 Bird</option>
                <option value="fish">🐠 Fish</option>
                <option value="rabbit">🐰 Rabbit</option>
                <option value="hamster">🐹 Hamster</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#264653] mb-1">Catalog Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              >
                <option value="ACTIVE">Active (In Sale)</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>
          </div>

          {/* Section 5: Pricing */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-[#264653] mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                step="0.01"
                required
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-[#264653] mb-1">MRP (₹) *</label>
              <input
                type="number"
                value={mrp}
                onChange={(e) => setMrp(Number(e.target.value))}
                step="0.01"
                required
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-[#F2ECE4]">
            {onDelete && product ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(product.id);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl font-bold text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Product</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-bold text-xs text-[#7C9082] hover:bg-[#F2ECE4] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl font-bold text-xs bg-[#E76F51] hover:bg-[#D95D3E] text-white shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Saving Changes...' : 'Save Product Updates'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        continuous={false}
        onScan={(scannedCode) => {
          setBarcode(scannedCode);
          setIsScannerOpen(false);
        }}
        zIndex="z-60"
        title="Scan Barcode for Product"
        subtitle="Point camera or enter retail product barcode (EAN-13, UPC, Code 128)"
      />
    </div>
  );
};
