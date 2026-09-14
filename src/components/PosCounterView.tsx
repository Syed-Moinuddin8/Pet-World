import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  Building2,
  Printer,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Boxes,
  UserCheck,
  AlertCircle,
  Camera,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react';
import { Product, Branch, InventoryItem, User, Sale, SaleItem } from '../types.js';
import { PetAvatar, PawIcon, PetEmptyState } from './PetAvatars.js';
import { ProductImageThumb, ProductFormBadge } from './ProductImageThumb.js';
import { BarcodeScannerModal } from './BarcodeScannerModal.js';
import { ProductPackshot } from './ProductPackshot.js';
import { ImageUploadPicker } from './ImageUploadPicker.js';
import { getProductImageUrl } from '../utils/productImages.js';

interface PosCounterViewProps {
  products: Product[];
  inventory: InventoryItem[];
  branches: Branch[];
  currentUser: User;
  initialBranchId?: string;
  onCompleteSale: (saleData: any) => Promise<Sale>;
  onPrintInvoice: (sale: Sale) => void;
  onPrintThermal: (sale: Sale) => void;
  onUpdateProduct?: (productId: string, updates: Partial<Product>) => Promise<any>;
  onSelectBranch?: (branchId: string) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  availableStock: number;
}

interface HeldBill {
  id: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  savedAt: string;
  total: number;
}

export const PosCounterView: React.FC<PosCounterViewProps> = ({
  products,
  inventory,
  branches,
  currentUser,
  initialBranchId,
  onCompleteSale,
  onPrintInvoice,
  onPrintThermal,
  onUpdateProduct,
  onSelectBranch,
}) => {
  const isOwner = currentUser.role === 'OWNER';
  const defaultBranchId = initialBranchId || currentUser.branchId || (branches[0]?.id || '');

  const [activeBranchId, setActiveBranchId] = useState<string>(defaultBranchId);

  useEffect(() => {
    if (initialBranchId) {
      setActiveBranchId(initialBranchId);
    }
  }, [initialBranchId]);

  // Keep currentBranch directly reactive to branches array changes
  const currentBranch = useMemo(() => {
    return branches.find((b) => b.id === activeBranchId) || branches[0] || ({} as Branch);
  }, [branches, activeBranchId]);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // View Mode: 'visual' (prominent photos) vs 'compact' (dense list)
  const [viewMode, setViewMode] = useState<'visual' | 'compact'>('visual');
  const [productForImageEdit, setProductForImageEdit] = useState<Product | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [isSavingImage, setIsSavingImage] = useState(false);

  // Held/Parked bills
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'SPLIT'>('CASH');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  // Mobile responsive tab (Catalog vs Cart checkout)
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Barcode scanner modal & scan notifications
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanAlert, setScanAlert] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  // Auto-dismiss scan notification after 4 seconds
  useEffect(() => {
    if (!scanAlert) return;
    const t = setTimeout(() => setScanAlert(null), 4000);
    return () => clearTimeout(t);
  }, [scanAlert]);

  const categories = ['ALL', 'Food', 'Treats', 'Accessories', 'Grooming', 'Healthcare', 'Toys', 'Beds & Carriers'];

  // Helper to fetch branch-specific stock for product
  const getStock = (productId: string) => {
    const item = inventory.find((inv) => inv.productId === productId && inv.branchId === activeBranchId);
    return item ? item.quantity : 0;
  };

  // Filter products for active store
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.brand.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations - bill total is directly sum of items (no added GST)
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice - item.discount, 0);
  const taxRate = 0;
  const taxAmount = 0;
  const grandTotal = subtotal;

  const changeDue = Math.max(0, (Number(cashReceived) || 0) - grandTotal);

  // Add to cart
  const handleAddToCart = (product: Product) => {
    const available = getStock(product.id);
    if (available <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= available) {
          alert(`Cannot add more. Available store stock for ${product.name} is ${available}.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          discount: 0,
          availableStock: available,
        },
      ];
    });
  };

  // Barcode / Scanner processing
  const handleScanBarcode = (barcode: string) => {
    const code = barcode.trim().toLowerCase();
    if (!code) return;

    const normalizedScan = code.replace(/[-\s]/g, '');
    const match = products.find((p) => {
      const pb = (p.barcode || '').trim().toLowerCase();
      const psku = (p.sku || '').trim().toLowerCase();
      const pbClean = pb.replace(/[-\s]/g, '');
      const pskuClean = psku.replace(/[-\s]/g, '');

      return (
        pb === code ||
        psku === code ||
        pbClean === normalizedScan ||
        pskuClean === normalizedScan ||
        // UPC-A (12 digits) vs EAN-13 (13 digits with leading 0) tolerance
        (pbClean.length === 12 && normalizedScan === '0' + pbClean) ||
        (normalizedScan.length === 12 && pbClean === '0' + normalizedScan)
      );
    });

    if (!match) {
      setScanAlert({
        type: 'error',
        message: `❌ Item not in inventory: Barcode "${barcode}" is not available in inventory. This item is not in your cart.`,
      });
      return;
    }

    const available = getStock(match.id);
    if (available <= 0) {
      setScanAlert({
        type: 'warning',
        message: `⚠️ Out of Stock: "${match.name}" has 0 units available at ${currentBranch?.name || 'this store'}. This item is not in your cart.`,
      });
      return;
    }

    const existing = cart.find((it) => it.product.id === match.id);
    if (existing && existing.quantity >= available) {
      setScanAlert({
        type: 'warning',
        message: `⚠️ Stock Limit Reached: Only ${available} units available for "${match.name}".`,
      });
      return;
    }

    handleAddToCart(match);
    setScanAlert({
      type: 'success',
      message: `✅ Scanned & Added: ${match.name} (Barcode: ${match.barcode}) - ₹${match.sellingPrice}`,
    });
  };

  // Barcode / Enter key direct scan
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      handleScanBarcode(searchQuery.trim());
      setSearchQuery('');
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.availableStock) {
              alert(`Maximum stock available in ${currentBranch.code} is ${item.availableStock}.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Hold active bill
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const newHold: HeldBill = {
      id: 'HELD-' + Date.now().toString().slice(-4),
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      items: [...cart],
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      total: grandTotal,
    };
    setHeldBills((prev) => [newHold, ...prev]);
    setCart([]);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
  };

  // Recall held bill
  const handleRecallBill = (bill: HeldBill) => {
    setCart(bill.items);
    setCustomerName(bill.customerName);
    setCustomerPhone(bill.customerPhone);
    setHeldBills((prev) => prev.filter((b) => b.id !== bill.id));
    setShowHeldModal(false);
  };

  // Trigger Checkout
  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    if (currentBranch.status === 'INACTIVE') {
      alert(
        `Cannot process sales: Store branch "${currentBranch.name}" is currently marked as INACTIVE in Branch Management. Please reactivate the branch in the Branches section before completing sales.`
      );
      return;
    }
    setCashReceived(grandTotal.toString());
    setShowPaymentModal(true);
  };

  const handleCompletePayment = async () => {
    setIsSubmitting(true);
    try {
      const salePayload = {
        branchId: currentBranch.id,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' ? Number(cashReceived) : undefined,
        items: cart.map((it) => ({
          productId: it.product.id,
          productName: it.product.name,
          sku: it.product.sku,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: it.quantity * it.unitPrice - it.discount,
        })),
      };

      const completed = await onCompleteSale(salePayload);
      setLastCompletedSale(completed);

      // Confetti celebration!
      try {
        const confPromise = confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#E76F51', '#2A9D8F', '#E9C46A', '#F4A261'],
        });
        if (confPromise && typeof (confPromise as any).catch === 'function') {
          (confPromise as any).catch(() => {});
        }
      } catch {
        // Ignore if canvas is restricted
      }

      // Reset cart
      setCart([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setShowPaymentModal(false);
    } catch (err: any) {
      alert('Checkout failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatINR = (val?: number | null) =>
    '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-4">
      {/* Top Banner: Branch & Cashier identification */}
      <div className="p-4 rounded-3xl bg-white border border-[#EADDCE] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${currentBranch.status === 'INACTIVE' ? 'bg-rose-100 text-rose-600' : 'bg-[#E76F51]/10 text-[#E76F51]'}`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-['Fredoka',sans-serif] text-base font-bold text-[#264653]">
                {currentBranch.name} ({currentBranch.code})
              </h2>
              {currentBranch.status === 'INACTIVE' ? (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">
                  Counter Inactive / Closed
                </span>
              ) : (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                  POS Active
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-[#7C9082] mt-0.5">
              <span>Cashier: <strong className="text-[#264653]">{currentUser.name}</strong></span>
              {currentBranch.city && (
                <>
                  <span>•</span>
                  <span>{currentBranch.address ? `${currentBranch.address}, ` : ''}{currentBranch.city}</span>
                </>
              )}
              {currentBranch.phone && (
                <>
                  <span>•</span>
                  <span>Ph: {currentBranch.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Store selector (Enabled for Owner, locked for branch cashiers) */}
        <div className="flex items-center gap-3">
          {isOwner && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#7C9082] font-semibold">Switch Counter:</span>
              <select
                value={activeBranchId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setActiveBranchId(newId);
                  onSelectBranch?.(newId);
                  setCart([]);
                }}
                className="px-3 py-1.5 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs font-bold text-[#264653] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) {b.status === 'INACTIVE' ? '[INACTIVE]' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Parked bills button */}
          {heldBills.length > 0 && (
            <button
              onClick={() => setShowHeldModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold hover:bg-amber-200 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>{heldBills.length} Parked Bills</span>
            </button>
          )}

          {/* Prominent POS Camera Barcode Scanner button */}
          <button
            onClick={() => setShowScannerModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
            title="Scan barcode with camera to add directly to cart"
          >
            <Camera className="w-4 h-4" />
            <span>SCAN BARCODE</span>
          </button>
        </div>
      </div>

      {/* Inactive Branch Alert Banner */}
      {currentBranch.status === 'INACTIVE' && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Branch Inactive:</strong> Store location <em>{currentBranch.name}</em> is marked as <strong>INACTIVE</strong> in Branch Management. Retail billing & checkout are paused for this counter.
            </span>
          </div>
        </div>
      )}

      {/* Scan Alert Notification */}
      {scanAlert && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-xs transition-all animate-in fade-in slide-in-from-top-1 ${
            scanAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : scanAlert.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-red-50 border-red-300 text-red-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {scanAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{scanAlert.message}</span>
          </div>
          <button
            onClick={() => setScanAlert(null)}
            className="p-1 rounded-lg hover:bg-black/10 text-xs text-gray-500 hover:text-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobile View Switcher (Catalog vs Cart) */}
      <div className="lg:hidden flex items-center p-1 rounded-2xl bg-white border border-[#EADDCE] shadow-xs">
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
            mobileTab === 'catalog'
              ? 'bg-[#264653] text-white shadow-xs'
              : 'text-[#7C9082] hover:text-[#264653]'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Catalog</span>
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
            mobileTab === 'cart'
              ? 'bg-[#E76F51] text-white shadow-xs'
              : 'text-[#7C9082] hover:text-[#264653]'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Bill ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
          {grandTotal > 0 && <span className="text-[11px] font-mono">• {formatINR(grandTotal)}</span>}
        </button>
      </div>

      {/* POS Workspace: Split into Product Catalog (2/3) and Cart Checkout (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Product Catalog Grid */}
        <div className={`lg:col-span-7 xl:col-span-8 space-y-4 ${mobileTab === 'cart' ? 'hidden lg:block' : 'block'}`}>
          {/* Search and Category Filter */}
          <div className="p-3.5 rounded-3xl bg-white border border-[#EADDCE] shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#7C9082]" />
                <input
                  type="text"
                  placeholder="Scan barcode with USB reader, camera, or search name (Press Enter)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full pl-9 pr-10 py-2 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="absolute right-2 top-1.5 p-1.5 text-[#7C9082] hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  title="Open camera barcode scanner"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowScannerModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#264653] hover:bg-[#1E3741] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                title="Scan barcode with device camera"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Camera Scan</span>
              </button>
            </div>

            {/* Category horizontal scroll & Layout Mode Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#E76F51] text-white shadow-2xs'
                        : 'bg-[#FAF8F5] text-[#5B7065] hover:bg-[#F2ECE4] border border-[#EADDCE]'
                    }`}
                  >
                    {cat === 'ALL' ? '🐾 All Items' : cat}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle: Visual Photo Cards vs Compact */}
              <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#EADDCE] shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('visual')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'visual'
                      ? 'bg-white text-[#E76F51] shadow-xs'
                      : 'text-[#7C9082] hover:text-[#264653]'
                  }`}
                  title="Show prominent product packaging photos"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Photos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    viewMode === 'compact'
                      ? 'bg-white text-[#E76F51] shadow-xs'
                      : 'text-[#7C9082] hover:text-[#264653]'
                  }`}
                  title="Show compact list view"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Compact</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div
            className={`grid gap-3.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 ${
              viewMode === 'visual'
                ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
            }`}
          >
            {filteredProducts.map((p) => {
              const stock = getStock(p.id);
              const isOutOfStock = stock <= 0;
              const isLowStock = stock > 0 && stock <= p.reorderLevel;
              const hasCustomImg = Boolean(p.imageUrl && p.imageUrl.trim());

              if (viewMode === 'compact') {
                return (
                  <button
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    disabled={isOutOfStock}
                    className={`text-left p-2.5 rounded-2xl border transition-all flex items-center gap-3 ${
                      isOutOfStock
                        ? 'bg-gray-100/70 border-gray-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-[#EADDCE] hover:border-[#E76F51] hover:shadow-md active:scale-98 cursor-pointer'
                    }`}
                  >
                    <ProductImageThumb
                      src={getProductImageUrl(p)}
                      alt={p.name}
                      brand={p.brand || p.company}
                      company={p.company || p.brand}
                      avatarType={p.avatarType}
                      productForm={p.productForm}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-[9px] font-bold text-[#E76F51] uppercase tracking-wider truncate">
                          {p.company || p.brand}
                        </span>
                        {isOutOfStock && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 bg-red-100 text-red-700">
                            Out of stock
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-[#264653] line-clamp-1">
                        {p.name}
                      </h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-extrabold text-xs text-[#264653]">
                          {formatINR(p.sellingPrice)}
                        </span>
                        <span className="w-5 h-5 rounded-md bg-[#FAF1E8] text-[#E76F51] flex items-center justify-center font-bold text-xs">
                          +
                        </span>
                      </div>
                    </div>
                  </button>
                );
              }

              // VISUAL MODE (Default): PROMINENT PRODUCT PHOTO PACKSHOT
              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && handleAddToCart(p)}
                  className={`group text-left rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative select-none ${
                    isOutOfStock
                      ? 'bg-gray-100/70 border-gray-200 opacity-60 cursor-not-allowed'
                      : 'bg-white border-[#EADDCE] hover:border-[#E76F51] hover:shadow-lg active:scale-98 cursor-pointer'
                  }`}
                >
                  {/* UPPER: PROMINENT PRODUCT PHOTO / PACKSHOT (Height 115px) */}
                  <div className="relative w-full h-28 bg-gradient-to-b from-[#FAF8F5] via-[#F2ECE4] to-[#EAE7E0] border-b border-[#EADDCE] overflow-hidden flex items-center justify-center p-1">
                    {/* Real Image */}
                    {hasCustomImg ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to packshot on broken remote link
                          (e.target as HTMLElement).style.display = 'none';
                          const el = (e.target as HTMLElement).parentElement?.querySelector('.packshot-fallback') as HTMLElement;
                          if (el) el.style.display = 'flex';
                        }}
                        className="max-h-full max-w-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : null}

                    {/* Authentic realistic packaging packshot */}
                    <div
                      className={`packshot-fallback w-full h-full items-center justify-center ${
                        hasCustomImg ? 'hidden' : 'flex'
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

                    {/* Stock Status Badge Overlaid Top Right (Only if Out of Stock) */}
                    {isOutOfStock && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-xs shrink-0 bg-red-600 text-white">
                          Out of stock
                        </span>
                      </div>
                    )}

                    {/* Product Form Pill Overlaid Bottom Left */}
                    <div className="absolute bottom-1.5 left-2 z-10">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs ${
                          p.productForm === 'DRIED'
                            ? 'bg-amber-100/95 text-amber-900 border border-amber-300'
                            : p.productForm === 'WET'
                            ? 'bg-cyan-100/95 text-cyan-900 border border-cyan-300'
                            : 'bg-stone-100/95 text-stone-800 border border-stone-300'
                        }`}
                      >
                        <span>{p.productForm === 'DRIED' ? '🌾' : p.productForm === 'WET' ? '🥫' : '📦'}</span>
                        <span>{p.productForm === 'DRIED' ? 'Dried' : p.productForm === 'WET' ? 'Wet' : 'Other'}</span>
                      </span>
                    </div>

                    {/* Camera Change Photo Button on Hover */}
                    {onUpdateProduct && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductForImageEdit(p);
                          setTempImageUrl(p.imageUrl || getProductImageUrl(p));
                        }}
                        className="absolute top-2 left-2 z-20 px-1.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-xs text-[9px] font-bold flex items-center gap-1"
                        title="Change or upload item photo"
                      >
                        <Camera className="w-3 h-3 text-amber-400" />
                        <span>Photo</span>
                      </button>
                    )}
                  </div>

                  {/* LOWER: Product Details & Price */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Brand Label */}
                      <div className="text-[10px] font-extrabold text-[#E76F51] uppercase tracking-wider truncate mb-0.5">
                        {p.company || p.brand}
                      </div>

                      {/* Product Name */}
                      <h4
                        className="font-bold text-xs text-[#264653] line-clamp-2 leading-snug group-hover:text-[#E76F51] transition-colors"
                        title={p.name}
                      >
                        {p.name}
                      </h4>
                    </div>

                    {/* Price and Add to Cart Action */}
                    <div className="mt-2 pt-2 border-t border-[#F2ECE4] flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-sm text-[#264653]">
                          {formatINR(p.sellingPrice)}
                        </span>
                        <span className="text-[10px] text-[#7C9082] ml-1">
                          /{p.unit}
                        </span>
                      </div>

                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-sm transition-all shadow-xs ${
                          isOutOfStock
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-[#E76F51] text-white hover:bg-[#D65F41] active:scale-90'
                        }`}
                      >
                        +
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Cart & Billing Terminal */}
        <div className={`lg:col-span-5 xl:col-span-4 flex flex-col justify-between rounded-3xl bg-white border border-[#EADDCE] shadow-xs p-4 lg:sticky lg:top-20 lg:h-[calc(100vh-200px)] ${mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'} min-h-[460px]`}>
          <div>
            {/* Mobile Back to Products */}
            <div className="lg:hidden flex items-center justify-between pb-3 mb-2 border-b border-[#F2ECE4]">
              <button
                type="button"
                onClick={() => setMobileTab('catalog')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#EADDCE] text-xs font-bold text-[#E76F51] hover:bg-[#F2ECE4] min-h-[38px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Add More Products</span>
              </button>
              <span className="text-xs text-[#7C9082] font-bold">Billing Terminal</span>
            </div>

            {/* Cart Header & Customer Inputs */}
            <div className="pb-3 border-b border-[#F2ECE4] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#E76F51]" />
                  <h3 className="font-bold text-sm text-[#264653] font-['Fredoka',sans-serif]">
                    Current Bill ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                  </h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] text-red-500 hover:underline font-semibold"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {/* Customer Inputs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs focus:ring-1 focus:ring-[#E76F51] focus:outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Phone (Optional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs focus:ring-1 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="divide-y divide-[#F2ECE4] max-h-[calc(100vh-450px)] overflow-y-auto py-2">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#7C9082]">
                  <PawIcon className="w-10 h-10 mx-auto text-[#D5C7B8] mb-2" />
                  <p className="font-semibold text-[#5B7065]">Cart is currently empty</p>
                  <p className="text-[11px] mt-0.5">Click any product on the left or scan barcode</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <ProductImageThumb
                      src={getProductImageUrl(item.product)}
                      alt={item.product.name}
                      brand={item.product.brand || item.product.company}
                      company={item.product.company || item.product.brand}
                      avatarType={item.product.avatarType}
                      productForm={item.product.productForm}
                      size="xs"
                    />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h5 className="font-bold text-[#264653] truncate">{item.product.name}</h5>
                      <span className="text-[11px] text-[#7C9082]">
                        {formatINR(item.unitPrice)} each • Stock: {item.availableStock}
                      </span>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-lg bg-[#F4EDE4] hover:bg-[#EAE0D3] text-[#264653] flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded-lg bg-[#F4EDE4] hover:bg-[#EAE0D3] text-[#264653] flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      <span className="font-extrabold text-[#264653] w-16 text-right">
                        {formatINR(item.quantity * item.unitPrice)}
                      </span>

                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-1 text-[#7C9082] hover:text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Summary & Actions */}
          <div className="pt-3 border-t border-[#F2ECE4] space-y-3">
            {/* Price Calculations */}
            <div className="py-2 border-t border-[#F2ECE4]">
              <div className="flex items-center justify-between text-base font-bold text-[#264653] font-['Fredoka',sans-serif]">
                <span>Bill Total:</span>
                <span className="text-[#E76F51] text-xl">{formatINR(grandTotal)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleHoldBill}
                disabled={cart.length === 0}
                className="py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Hold / Park Bill</span>
              </button>

              <button
                type="button"
                onClick={handleOpenPayment}
                disabled={cart.length === 0 || currentBranch.status === 'INACTIVE'}
                title={currentBranch.status === 'INACTIVE' ? 'Cannot checkout: Store branch is marked Inactive in Branch Management' : undefined}
                className="py-2.5 px-3 rounded-xl bg-[#E76F51] hover:bg-[#D95D3E] text-white font-bold text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span>Checkout & Pay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Checkout Summary Banner */}
      {mobileTab === 'catalog' && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 inset-x-3 z-20 animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-[#264653] text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between border border-white/20">
            <div>
              <div className="text-[11px] text-white/80 font-medium flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-[#E76F51]" />
                <span>{cart.reduce((s, i) => s + i.quantity, 0)} items in bill</span>
              </div>
              <div className="text-base font-bold font-['Fredoka',sans-serif] text-white">
                {formatINR(grandTotal)}
              </div>
            </div>
            <button
              onClick={() => setMobileTab('cart')}
              className="px-4 py-2.5 rounded-xl bg-[#E76F51] hover:bg-[#D95D3E] text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all min-h-[44px]"
            >
              <span>Review Bill & Pay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: PARKED / HELD BILLS */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#EADDCE] shadow-2xl p-6 text-[#264653] animate-in fade-in">
            <h3 className="font-['Fredoka',sans-serif] text-base font-bold mb-3">
              Parked Counter Bills ({heldBills.length})
            </h3>
            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {heldBills.map((bill) => (
                <div
                  key={bill.id}
                  className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[#264653]">{bill.customerName}</span>
                    <span className="block text-[10px] text-[#7C9082]">
                      Parked at {bill.savedAt} • {bill.items.length} items
                    </span>
                    <span className="font-bold text-[#E76F51]">{formatINR(bill.total)}</span>
                  </div>
                  <button
                    onClick={() => handleRecallBill(bill)}
                    className="px-3 py-1.5 rounded-xl bg-[#E76F51] hover:bg-[#D95D3E] text-white font-bold text-xs"
                  >
                    Resume Bill
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowHeldModal(false)}
              className="mt-4 w-full py-2 rounded-xl bg-[#F2ECE4] text-xs font-bold text-[#5B7065]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MODAL: PAYMENT TENDER & PRINT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#EADDCE] shadow-2xl p-6 text-[#264653] animate-in fade-in">
            <h3 className="font-['Fredoka',sans-serif] text-lg font-bold text-center mb-1">
              Finalize Payment
            </h3>
            <p className="text-xs text-[#7C9082] text-center mb-4">
              Bill Total: <strong className="text-lg text-[#E76F51]">{formatINR(grandTotal)}</strong>
            </p>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-[#E76F51] bg-[#FAF1E8] text-[#E76F51]'
                    : 'border-[#EADDCE] text-[#5B7065]'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'UPI'
                    ? 'border-[#E76F51] bg-[#FAF1E8] text-[#E76F51]'
                    : 'border-[#EADDCE] text-[#5B7065]'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>UPI QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'CARD'
                    ? 'border-[#E76F51] bg-[#FAF1E8] text-[#E76F51]'
                    : 'border-[#EADDCE] text-[#5B7065]'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('SPLIT')}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'SPLIT'
                    ? 'border-[#E76F51] bg-[#FAF1E8] text-[#E76F51]'
                    : 'border-[#EADDCE] text-[#5B7065]'
                }`}
              >
                <Sparkles className="w-5 h-5" />
                <span>Split</span>
              </button>
            </div>

            {/* CASH PAYMENT SECTION */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EADDCE] mb-4 text-xs">
                <div>
                  <label className="block font-bold mb-1 text-[#5B7065]">Cash Received from Customer (₹)</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="w-full px-3 py-2 text-base font-bold rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden bg-white text-[#264653]"
                  />
                </div>

                {/* Quick denomination pills */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCashReceived(grandTotal.toString())}
                    className="px-2 py-1 rounded-lg bg-white border border-[#D5C7B8] text-[10px] font-bold text-[#5B7065]"
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashReceived('500')}
                    className="px-2 py-1 rounded-lg bg-white border border-[#D5C7B8] text-[10px] font-bold text-[#5B7065]"
                  >
                    ₹500
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashReceived('1000')}
                    className="px-2 py-1 rounded-lg bg-white border border-[#D5C7B8] text-[10px] font-bold text-[#5B7065]"
                  >
                    ₹1,000
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashReceived('2000')}
                    className="px-2 py-1 rounded-lg bg-white border border-[#D5C7B8] text-[10px] font-bold text-[#5B7065]"
                  >
                    ₹2,000
                  </button>
                </div>

                {/* Change Due Display */}
                <div className="flex items-center justify-between pt-2 border-t border-[#EADDCE] font-bold">
                  <span className="text-[#5B7065]">Change to Return:</span>
                  <span className="text-base text-emerald-600 font-['Fredoka',sans-serif]">
                    {formatINR(changeDue)}
                  </span>
                </div>
              </div>
            )}

            {/* UPI QR SIMULATION */}
            {paymentMethod === 'UPI' && (
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] mb-4 text-center space-y-2">
                <div className="w-36 h-36 mx-auto bg-white border-2 border-dashed border-[#2A9D8F] rounded-2xl p-2 flex flex-col items-center justify-center">
                  <QrCode className="w-20 h-20 text-[#264653]" />
                  <span className="text-[9px] font-mono text-[#7C9082] mt-1">UPI: petworld@icici</span>
                </div>
                <p className="text-xs font-semibold text-[#5B7065]">
                  Scan with GPay, PhonePe, Paytm or BHIM
                </p>
              </div>
            )}

            {/* CARD OR SPLIT MESSAGE */}
            {(paymentMethod === 'CARD' || paymentMethod === 'SPLIT') && (
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] mb-4 text-center text-xs text-[#5B7065]">
                Swipe or insert card on connected PineLabs / EDC POS machine.
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-[#7C9082] hover:bg-[#F2ECE4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompletePayment}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Recording Sale...' : 'Confirm & Complete Bill'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED BILL POPUP WITH PRINT TRIGGERS */}
      {lastCompletedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#EADDCE] shadow-2xl p-6 text-[#264653] text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="font-['Fredoka',sans-serif] text-xl font-bold text-[#264653]">
              Bill Successfully Generated!
            </h3>
            <p className="text-xs text-[#7C9082] mt-1">
              Invoice #{lastCompletedSale.invoiceNumber} • {lastCompletedSale.branchName}
            </p>
            <div className="text-2xl font-bold text-[#E76F51] my-3 font-['Fredoka',sans-serif]">
              {formatINR(lastCompletedSale.grandTotal)}
            </div>

            <div className="grid grid-cols-2 gap-2 my-4">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onPrintThermal(lastCompletedSale);
                }}
                className="py-2.5 px-3 rounded-xl border border-[#264653] bg-white hover:bg-[#FAF8F5] text-[#264653] font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Thermal (58/80mm)</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onPrintInvoice(lastCompletedSale);
                }}
                className="py-2.5 px-3 rounded-xl bg-[#E76F51] hover:bg-[#D95D3E] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Standard A4 Invoice</span>
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setLastCompletedSale(null);
              }}
              className="w-full py-2 text-xs font-semibold text-[#7C9082] hover:text-[#264653] cursor-pointer"
            >
              Start Next Customer Sale →
            </button>
          </div>
        </div>
      )}

      {/* QUICK PRODUCT PHOTO / IMAGE MODAL */}
      {productForImageEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-[#EADDCE] shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2ECE4] mb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-[#E76F51] tracking-wider">
                  Update Item Photo
                </span>
                <h3 className="font-bold text-base text-[#264653] truncate">
                  {productForImageEdit.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProductForImageEdit(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <ImageUploadPicker
                value={tempImageUrl}
                onChange={(url) => setTempImageUrl(url)}
                brandHint={productForImageEdit.brand || productForImageEdit.company}
                formHint={productForImageEdit.productForm}
              />
            </div>

            <div className="mt-5 pt-3 border-t border-[#F2ECE4] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setProductForImageEdit(null)}
                className="px-4 py-2 rounded-xl border border-[#D5C7B8] text-xs font-bold text-[#5B7065] hover:bg-[#F2ECE4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingImage}
                onClick={async () => {
                  if (!onUpdateProduct || !productForImageEdit) return;
                  setIsSavingImage(true);
                  try {
                    await onUpdateProduct(productForImageEdit.id, {
                      imageUrl: tempImageUrl,
                    });
                    setProductForImageEdit(null);
                  } catch (err) {
                    console.error('Failed to update product photo', err);
                  } finally {
                    setIsSavingImage(false);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-[#E76F51] hover:bg-[#D95D3E] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingImage ? 'Saving...' : 'Save Product Photo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS CAMERA BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScan={handleScanBarcode}
        continuous={true}
        title="POS Barcode Scanner"
        subtitle={`Instant Inventory Check & Billing • ${currentBranch.name}`}
        demoBarcodes={products.slice(0, 8).map((p) => ({ barcode: p.barcode, name: p.name }))}
        products={products}
        inventory={inventory}
        currentBranch={currentBranch}
        cartItems={cart}
        onAddToCart={handleAddToCart}
        cartCount={cart.reduce((s, it) => s + it.quantity, 0)}
        cartTotal={grandTotal}
      />
    </div>
  );
};
