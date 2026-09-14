import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Check,
  Plus,
  Minus,
  Building2,
  Barcode,
  Package,
  Layers,
  Sparkles,
  ShoppingBag,
  Info
} from 'lucide-react';
import { Product } from '../types.js';
import { ProductImageThumb, ProductFormBadge } from './ProductImageThumb.js';
import { ProductPackshot } from './ProductPackshot.js';
import { getProductImageUrl } from '../utils/productImages.js';

interface StockMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  /** If set, selecting replaces the product for this row */
  targetLineIndex?: number | null;
  /** Current selected products in order (map productId -> quantity) */
  currentLineProductIds?: { productId: string; quantity: number }[];
  /** Callback when user selects a product for a specific row */
  onSelectForLine?: (product: Product, targetIndex: number) => void;
  /** Callback when user adds products in bulk */
  onAddProducts?: (items: { product: Product; quantity: number }[]) => void;
  /** Trigger opening new product modal */
  onOpenNewProductModal?: () => void;
}

export const StockMenuModal: React.FC<StockMenuModalProps> = ({
  isOpen,
  onClose,
  products,
  targetLineIndex,
  currentLineProductIds = [],
  onSelectForLine,
  onAddProducts,
  onOpenNewProductModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedForm, setSelectedForm] = useState<'ALL' | 'DRIED' | 'WET' | 'OTHER'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Quantities to add when multi-selecting
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Reset or initialize
  React.useEffect(() => {
    if (isOpen) {
      setSelectedQuantities({});
      setSearchQuery('');
    }
  }, [isOpen]);

  // Extract unique companies
  const companies = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const c = p.company || p.brand;
      if (c && c.trim()) set.add(c.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const comp = p.company || p.brand || '';
      if (selectedCompany !== 'ALL' && comp.toLowerCase() !== selectedCompany.toLowerCase()) {
        return false;
      }
      if (selectedForm !== 'ALL' && (p.productForm || 'OTHER') !== selectedForm) {
        return false;
      }
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesBarcode = (p.barcode || '').toLowerCase().includes(q);
        const matchesSku = (p.sku || '').toLowerCase().includes(q);
        const matchesBrand = (p.brand || '').toLowerCase().includes(q);
        const matchesCompany = (p.company || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBarcode && !matchesSku && !matchesBrand && !matchesCompany) {
          return false;
        }
      }
      return true;
    });
  }, [products, selectedCompany, selectedForm, selectedCategory, searchQuery]);

  // Format currency
  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  // Set quantity for a product in multi-add mode
  const handleSetQty = (productId: string, qty: number) => {
    setSelectedQuantities((prev) => {
      const updated = { ...prev };
      if (qty <= 0) {
        delete updated[productId];
      } else {
        updated[productId] = qty;
      }
      return updated;
    });
  };

  const handleApplySelected = () => {
    const itemsToAdd = Object.entries(selectedQuantities).map(([pId, qty]) => {
      const prod = products.find((p) => p.id === pId);
      return { product: prod!, quantity: qty };
    }).filter((it) => it.product);

    if (itemsToAdd.length > 0 && onAddProducts) {
      onAddProducts(itemsToAdd);
    }
    onClose();
  };

  if (!isOpen) return null;

  const isReplacingRow = typeof targetLineIndex === 'number';
  const totalItemsSelected = Object.keys(selectedQuantities).length;
  const totalUnitsSelected = Object.values(selectedQuantities).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#EADDCE]">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#EADDCE] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF1E8] text-[#E76F51] flex items-center justify-center font-bold text-lg shadow-xs">
              🛍️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#264653] font-['Fredoka',sans-serif]">
                  {isReplacingRow
                    ? `Select Stock Item for Line #${targetLineIndex + 1}`
                    : 'Stock Menu • Visual Product Selection'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#E76F51]/10 text-[#E76F51] text-[10px] font-extrabold uppercase">
                  {filteredProducts.length} Items Available
                </span>
              </div>
              <p className="text-xs text-[#7C9082]">
                {isReplacingRow
                  ? 'Click any product card to apply it to this line item with images, barcode, and cost.'
                  : 'Browse with images just like the POS menu. Tap cards or set quantities to add items in bulk.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenNewProductModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewProductModal();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF1E8] border border-[#E76F51]/30 text-xs font-bold text-[#E76F51] hover:bg-[#E76F51] hover:text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New to Catalog</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#F5F2ED] hover:bg-[#EAE7E0] flex items-center justify-center text-[#666666] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS (LIKE POS MENU) */}
        <div className="p-4 bg-white/70 border-b border-[#EADDCE] space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#7C9082] absolute left-3.5 top-3" />
            <input
              type="text"
              autoFocus
              placeholder="Search by product name, company, brand, barcode (EAN-13), or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-[#D5C7B8] bg-white text-xs font-medium focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-lg text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            {/* Form filter */}
            <div className="flex items-center p-0.5 rounded-xl bg-[#F5F2ED] border border-[#EAE7E0]">
              <button
                type="button"
                onClick={() => setSelectedForm('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedForm === 'ALL'
                    ? 'bg-white text-[#264653] shadow-xs'
                    : 'text-[#7C9082] hover:text-[#264653]'
                }`}
              >
                All Forms
              </button>
              <button
                type="button"
                onClick={() => setSelectedForm('DRIED')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                  selectedForm === 'DRIED'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-[#7C9082] hover:text-amber-800'
                }`}
              >
                <span>🌾 Dried</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedForm('WET')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                  selectedForm === 'WET'
                    ? 'bg-white text-cyan-800 shadow-xs'
                    : 'text-[#7C9082] hover:text-cyan-800'
                }`}
              >
                <span>🥫 Wet</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedForm('OTHER')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedForm === 'OTHER'
                    ? 'bg-white text-stone-800 shadow-xs'
                    : 'text-[#7C9082] hover:text-stone-800'
                }`}
              >
                📦 Other
              </button>
            </div>

            {/* Company filter dropdown */}
            <div className="flex items-center gap-1.5 bg-[#F5F2ED] px-2.5 py-1 rounded-xl border border-[#EAE7E0]">
              <Building2 className="w-3.5 h-3.5 text-[#D97757]" />
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-[#264653] focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Companies / Brands ({companies.length})</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    🏢 {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Category filter dropdown */}
            <div className="flex items-center gap-1.5 bg-[#F5F2ED] px-2.5 py-1 rounded-xl border border-[#EAE7E0]">
              <Package className="w-3.5 h-3.5 text-[#264653]" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-[#264653] focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Categories ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* PRODUCTS GRID (MENU VIEW) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl bg-white border border-dashed border-[#D5C7B8] space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-[#FAF1E8] text-[#E76F51] flex items-center justify-center mx-auto text-2xl">
                🔍
              </div>
              <h3 className="font-bold text-sm text-[#264653]">No matching stock items found</h3>
              <p className="text-xs text-[#7C9082] max-w-md mx-auto">
                No products match "{searchQuery}" with the active filters. You can clear filters or register a brand new product.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCompany('ALL');
                    setSelectedForm('ALL');
                    setSelectedCategory('ALL');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#D5C7B8] text-xs font-bold text-[#264653] hover:bg-[#F2ECE4]"
                >
                  Clear Filters
                </button>
                {onOpenNewProductModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenNewProductModal();
                    }}
                    className="px-4 py-2 rounded-xl bg-[#E76F51] text-white text-xs font-bold hover:bg-[#C86646]"
                  >
                    + Register New Product
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredProducts.map((p) => {
                const imgUrl = getProductImageUrl(p);
                const isAlreadyInBill = currentLineProductIds.some((it) => it.productId === p.id);
                const currentBillQty = currentLineProductIds.find((it) => it.productId === p.id)?.quantity || 0;
                const selectedQty = selectedQuantities[p.id] || 0;
                const cost = p.costPrice || p.purchasePrice || 0;

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between group bg-white ${
                      selectedQty > 0
                        ? 'border-[#E76F51] ring-2 ring-[#E76F51]/20 shadow-md bg-orange-50/20'
                        : 'border-[#EADDCE] hover:border-[#E76F51] hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* IMAGE & TOP BADGES */}
                      <div className="relative mb-3 aspect-4/3 rounded-xl overflow-hidden bg-gradient-to-b from-[#FAF8F5] to-[#EAE7E0] border border-[#EAE7E0] flex items-center justify-center group-hover:scale-101 transition-transform p-1">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                              const fb = (e.target as HTMLElement).parentElement?.querySelector('.packshot-fallback') as HTMLElement;
                              if (fb) fb.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={`packshot-fallback w-full h-full items-center justify-center ${
                            imgUrl ? 'hidden' : 'flex'
                          }`}
                        >
                          <ProductPackshot
                            name={p.name}
                            brand={p.brand || p.company}
                            company={p.company || p.brand}
                            productForm={p.productForm}
                            avatarType={p.avatarType}
                            size="card"
                            className="w-full h-full"
                          />
                        </div>

                        {/* Badges overlay */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[9px] font-black text-white uppercase tracking-wider">
                            {p.company || p.brand}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2">
                          <ProductFormBadge form={p.productForm} size="sm" />
                        </div>

                        {isAlreadyInBill && (
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9px] font-extrabold flex items-center gap-1 shadow-xs">
                            <Check className="w-3 h-3" />
                            <span>In Bill ({currentBillQty})</span>
                          </div>
                        )}
                      </div>

                      {/* PRODUCT TITLES & BARCODE */}
                      <div className="space-y-1 mb-3">
                        <h4 className="font-bold text-xs text-[#264653] leading-snug line-clamp-2" title={p.name}>
                          {p.name}
                        </h4>

                        <div className="flex items-center justify-between text-[10px] text-[#7C9082]">
                          <span className="font-mono flex items-center gap-1">
                            <Barcode className="w-3 h-3 text-[#D97757]" />
                            <span>{p.barcode || p.sku || 'No Barcode'}</span>
                          </span>
                          <span className="font-semibold text-stone-600">
                            {p.size || p.unit}
                          </span>
                        </div>
                      </div>

                      {/* PRICING INFO */}
                      <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-between text-xs mb-3">
                        <div>
                          <span className="block text-[9px] font-bold text-[#7C9082] uppercase">Retail Price</span>
                          <span className="font-extrabold text-[#264653] font-mono">
                            {formatINR(p.sellingPrice || 0)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] font-bold text-[#7C9082] uppercase">Selling MRP</span>
                          <span className="font-bold text-[#666666] font-mono">
                            {formatINR(p.sellingPrice || p.mrp || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="pt-2 border-t border-[#F2ECE4]">
                      {isReplacingRow ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectForLine && typeof targetLineIndex === 'number') {
                              onSelectForLine(p, targetLineIndex);
                              onClose();
                            }
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-[#264653] hover:bg-[#1E3741] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Select This Item</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {selectedQty > 0 ? (
                            <div className="flex items-center justify-between w-full bg-[#FAF1E8] border border-[#E76F51] rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() => handleSetQty(p.id, selectedQty - 10 > 0 ? selectedQty - 10 : 0)}
                                className="w-7 h-7 rounded-lg bg-white text-[#E76F51] font-bold flex items-center justify-center hover:bg-red-50 text-xs shadow-2xs"
                                title="-10"
                              >
                                -
                              </button>
                              <div className="text-center px-1">
                                <span className="text-xs font-black text-[#E76F51]">{selectedQty}</span>
                                <span className="block text-[8px] text-[#7C9082] font-semibold">Qty</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSetQty(p.id, selectedQty + 10)}
                                className="w-7 h-7 rounded-lg bg-white text-[#E76F51] font-bold flex items-center justify-center hover:bg-emerald-50 text-xs shadow-2xs"
                                title="+10"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetQty(p.id, 50)}
                              className="w-full py-2 px-3 rounded-xl bg-[#F5F2ED] hover:bg-[#E76F51] text-[#264653] hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Add to Inward</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER (IF MULTI-SELECTING) */}
        {!isReplacingRow && (
          <div className="p-4 bg-white border-t border-[#EADDCE] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#264653]">
              <ShoppingBag className="w-4 h-4 text-[#E76F51]" />
              <span>
                {totalItemsSelected > 0
                  ? `${totalItemsSelected} product(s) selected • ${totalUnitsSelected} total units to inward`
                  : 'Select items or set bulk quantities above to add directly to your consignment bill'}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-semibold text-[#666666] hover:bg-[#F5F2ED]"
              >
                Close
              </button>
              <button
                type="button"
                disabled={totalItemsSelected === 0}
                onClick={handleApplySelected}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  totalItemsSelected > 0
                    ? 'bg-[#E76F51] hover:bg-[#C86646] text-white shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Add {totalItemsSelected} Items to Purchase Order</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
