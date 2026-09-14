import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Package,
  Receipt,
  Users,
  Building2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Product, Sale, StaffMember, Branch } from '../types.js';
import { PetAvatar, PawIcon } from './PetAvatars.js';
import { ProductImageThumb, ProductFormBadge } from './ProductImageThumb.js';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  sales: Sale[];
  staffList: StaffMember[];
  branches: Branch[];
  onSelectProduct?: (product: Product) => void;
  onSelectSale?: (sale: Sale) => void;
  onNavigateTab: (tab: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  products,
  sales,
  staffList,
  branches,
  onNavigateTab,
}) => {
  const [query, setQuery] = useState('');

  // Keyboard shortcut listener for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedProducts = q
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.brand.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const matchedSales = q
    ? sales
        .filter(
          (s) =>
            s.invoiceNumber.toLowerCase().includes(q) ||
            (s.customerName && s.customerName.toLowerCase().includes(q)) ||
            (s.customerPhone && s.customerPhone.includes(q))
        )
        .slice(0, 3)
    : [];

  const matchedStaff = q
    ? staffList
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.designation.toLowerCase().includes(q) ||
            s.branchName.toLowerCase().includes(q)
        )
        .slice(0, 3)
    : [];

  const matchedBranches = q
    ? branches
        .filter(
          (b) =>
            b.name.toLowerCase().includes(q) ||
            b.code.toLowerCase().includes(q) ||
            b.address.toLowerCase().includes(q)
        )
        .slice(0, 2)
    : [];

  const hasMatches =
    matchedProducts.length > 0 ||
    matchedSales.length > 0 ||
    matchedStaff.length > 0 ||
    matchedBranches.length > 0;

  const formatINR = (val?: number | null) =>
    '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-[#EADDCE] shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Search input header */}
        <div className="p-4 border-b border-[#F2ECE4] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#E76F51]" />
          <input
            autoFocus
            type="text"
            placeholder="Search products, invoices, staff, or branches (e.g. Royal Canin, INV-001)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent border-none focus:outline-hidden text-[#264653] font-medium"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7C9082] hover:bg-[#F2ECE4]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!q ? (
            <div className="py-8 text-center text-xs text-[#7C9082]">
              <PawIcon className="w-10 h-10 mx-auto text-[#D5C7B8] mb-2" />
              <p className="font-semibold text-[#5B7065]">Quick Universal Finder</p>
              <p className="text-[11px] mt-0.5">Type to search catalog items, invoices, customers, and staff</p>
            </div>
          ) : !hasMatches ? (
            <div className="py-8 text-center text-xs text-[#7C9082]">
              <p className="font-semibold text-[#5B7065]">No matching records found for "{query}"</p>
              <p className="text-[11px] mt-0.5">Try searching by product SKU, brand name, or invoice number</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Products */}
              {matchedProducts.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7C9082] uppercase mb-2">
                    <Package className="w-3.5 h-3.5 text-[#E76F51]" />
                    <span>Catalog Products</span>
                  </div>
                  <div className="space-y-1.5">
                    {matchedProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onNavigateTab('inventory');
                          onClose();
                        }}
                        className="p-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#FAF1E8] border border-[#EADDCE] flex items-center justify-between cursor-pointer transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <ProductImageThumb
                            src={p.imageUrl}
                            alt={p.name}
                            avatarType={p.avatarType}
                            productForm={p.productForm}
                            size="xs"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-[#E76F51]">
                                {p.company || p.brand}
                              </span>
                              <ProductFormBadge form={p.productForm} size="sm" />
                            </div>
                            <strong className="text-[#264653] block truncate max-w-[280px]">
                              {p.name}
                            </strong>
                            <span className="text-[10px] text-[#7C9082]">
                              SKU: {p.sku} • {p.unit}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-[#E76F51]">{formatINR(p.sellingPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {matchedSales.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7C9082] uppercase mb-2">
                    <Receipt className="w-3.5 h-3.5 text-[#2A9D8F]" />
                    <span>Sales Invoices</span>
                  </div>
                  <div className="space-y-1.5">
                    {matchedSales.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          onNavigateTab('sales');
                          onClose();
                        }}
                        className="p-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#FAF1E8] border border-[#EADDCE] flex items-center justify-between cursor-pointer transition-colors text-xs"
                      >
                        <div>
                          <strong className="text-[#264653] font-mono">{s.invoiceNumber}</strong>
                          <span className="block text-[10px] text-[#7C9082]">
                            {s.branchName} • {s.customerName || 'Walk-in'} ({s.date})
                          </span>
                        </div>
                        <span className="font-bold text-[#264653]">{formatINR(s.grandTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Staff */}
              {matchedStaff.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#7C9082] uppercase mb-2">
                    <Users className="w-3.5 h-3.5 text-[#E9C46A]" />
                    <span>Staff Directory</span>
                  </div>
                  <div className="space-y-1.5">
                    {matchedStaff.map((staff) => (
                      <div
                        key={staff.id}
                        onClick={() => {
                          onNavigateTab('staff');
                          onClose();
                        }}
                        className="p-2.5 rounded-2xl bg-[#FAF8F5] hover:bg-[#FAF1E8] border border-[#EADDCE] flex items-center justify-between cursor-pointer transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <PetAvatar type={staff.avatarType} size="sm" />
                          <div>
                            <strong className="text-[#264653] block">{staff.name}</strong>
                            <span className="text-[10px] text-[#7C9082]">
                              {staff.designation} • {staff.branchName}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#7C9082]">{staff.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#FAF8F5] border-t border-[#F2ECE4] text-[10px] text-[#7C9082] flex items-center justify-between">
          <span>Press ESC to close</span>
          <span className="font-semibold text-[#5B7065]">Pet World Multi-Branch ERP</span>
        </div>
      </div>
    </div>
  );
};
