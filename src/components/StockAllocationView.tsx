import React, { useState } from 'react';
import {
  GitFork,
  ArrowDown,
  Building2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RotateCcw,
  Sliders,
  Boxes,
  FileCheck2,
  ArrowRight,
} from 'lucide-react';
import { Purchase, Product, Branch, InventoryItem, User } from '../types.js';
import { PetAvatar, PawIcon, PetEmptyState } from './PetAvatars.js';

interface StockAllocationViewProps {
  purchases?: Purchase[];
  products?: Product[];
  branches?: Branch[];
  inventory?: InventoryItem[];
  currentUser: User;
  preselectedPurchaseId?: string;
  onExecuteAllocation?: (data: any) => Promise<any>;
  onAllocateStock?: (data: any) => Promise<any>;
  onNavigateTab?: (tab: any) => void;
}

export const StockAllocationView: React.FC<StockAllocationViewProps> = ({
  purchases = [],
  products = [],
  branches = [],
  inventory = [],
  currentUser,
  preselectedPurchaseId,
  onExecuteAllocation,
  onAllocateStock,
  onNavigateTab,
}) => {
  const executeAllocation = onExecuteAllocation || onAllocateStock || (async () => {});
  const navigateTab = onNavigateTab || (() => {});

  // Available purchases that have line items
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string>(
    preselectedPurchaseId || (purchases.length > 0 ? purchases[0].id : '')
  );

  React.useEffect(() => {
    if (preselectedPurchaseId && purchases.some((p) => p.id === preselectedPurchaseId)) {
      setSelectedPurchaseId(preselectedPurchaseId);
      const targetP = purchases.find((p) => p.id === preselectedPurchaseId);
      if (targetP && targetP.items && targetP.items.length > 0) {
        setSelectedProductId(targetP.items[0].productId);
      }
    }
  }, [preselectedPurchaseId, purchases]);

  const selectedPurchase = purchases.find((p) => p.id === selectedPurchaseId);

  // Selected item inside the purchase
  const [selectedProductId, setSelectedProductId] = useState<string>(
    selectedPurchase && selectedPurchase.items && selectedPurchase.items.length > 0
      ? selectedPurchase.items[0].productId
      : ''
  );

  // Allocations state: Record<branchId, number>
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    branches.forEach((b) => {
      initial[b.id] = 0;
    });
    return initial;
  });

  const [notes, setNotes] = useState('Central procurement batch distribution to 6 retail branches');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Find line item in selected purchase safely
  const selectedLineItem = selectedPurchase?.items?.find((it) => it.productId === selectedProductId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Total quantity available for allocation
  const totalAvailable = selectedLineItem ? selectedLineItem.quantity : 0;

  // Sum currently allocated
  const currentAllocatedSum: number = Object.values(allocations).reduce<number>(
    (sum: number, val: any) => sum + (Number(val) || 0),
    0
  );
  const remainingUnallocated: number = Number(totalAvailable) - currentAllocatedSum;

  const handlePurchaseChange = (purchId: string) => {
    setSelectedPurchaseId(purchId);
    const p = purchases.find((item) => item.id === purchId);
    if (p && p.items && p.items.length > 0) {
      setSelectedProductId(p.items[0].productId);
    }
    resetAllocations();
  };

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    resetAllocations();
  };

  const handleBranchAllocationChange = (branchId: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setAllocations((prev) => ({
      ...prev,
      [branchId]: num,
    }));
  };

  const resetAllocations = () => {
    const blank: Record<string, number> = {};
    branches.forEach((b) => {
      blank[b.id] = 0;
    });
    setAllocations(blank);
    setErrorMsg('');
  };

  // Helper: Distribute evenly
  const handleDistributeEvenly = () => {
    if (totalAvailable <= 0 || branches.length === 0) return;
    const count = branches.length;
    const basePerBranch = Math.floor(totalAvailable / count);
    let remainder = totalAvailable % count;

    const even: Record<string, number> = {};
    branches.forEach((b, idx) => {
      even[b.id] = basePerBranch + (idx < remainder ? 1 : 0);
    });
    setAllocations(even);
    setErrorMsg('');
  };

  // Helper: Distribute weighted by current store stock deficit
  const handleDistributeByNeed = () => {
    if (totalAvailable <= 0 || !selectedProduct || branches.length === 0) return;
    // Calculate need based on how far below reorder point or total stock each branch is
    const safeInv = inventory || [];
    const stocks = branches.map((b) => {
      const inv = safeInv.find((i) => i.productId === selectedProduct.id && i.branchId === b.id);
      return {
        branchId: b.id,
        currentStock: inv ? inv.quantity : 0,
      };
    });

    const lowestStock = Math.min(...stocks.map((s) => s.currentStock));
    const deficits = stocks.map((s) => Math.max(1, (lowestStock + 20) - s.currentStock));
    const totalDeficit = deficits.reduce((a, b) => a + b, 0);

    let allocatedTotal = 0;
    const weighted: Record<string, number> = {};

    branches.forEach((b, idx) => {
      const share = Math.floor((deficits[idx] / totalDeficit) * totalAvailable);
      weighted[b.id] = share;
      allocatedTotal += share;
    });

    // Give remaining to first branch
    if (totalAvailable - allocatedTotal > 0 && branches[0]) {
      weighted[branches[0].id] += totalAvailable - allocatedTotal;
    }

    setAllocations(weighted);
    setErrorMsg('');
  };

  const handleExecute = async () => {
    setErrorMsg('');
    if (!selectedPurchase || !selectedProduct) {
      setErrorMsg('Please select a valid purchase order and product.');
      return;
    }

    if (currentAllocatedSum <= 0) {
      setErrorMsg('Please allocate at least 1 unit to one of the branches.');
      return;
    }

    if (currentAllocatedSum > totalAvailable) {
      setErrorMsg(`Total allocated (${currentAllocatedSum}) cannot exceed purchased quantity (${totalAvailable}).`);
      return;
    }

    setLoading(true);
    try {
      await executeAllocation({
        purchaseId: selectedPurchase.id,
        productId: selectedProduct.id,
        allocations,
        notes,
      });

      setSuccessMsg(
        `Successfully dispatched ${currentAllocatedSum} units of ${selectedProduct.name} across the 6 branches!`
      );
      setTimeout(() => setSuccessMsg(''), 5000);
      resetAllocations();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute stock allocation');
    } finally {
      setLoading(false);
    }
  };

  const getBranchCurrentStock = (branchId: string) => {
    if (!selectedProduct) return 0;
    const item = (inventory || []).find((inv) => inv.productId === selectedProduct.id && inv.branchId === branchId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E76F51]/10 text-[#E76F51] text-xs font-bold mb-1">
            <PawIcon className="w-3.5 h-3.5" />
            <span>Central Procurement Distribution</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#264653] font-['Fredoka',sans-serif]">
            Purchase Stock Allocation Tree
          </h1>
          <p className="text-xs text-[#7C9082]">
            Take master purchase consignments and divide stock among the 6 retail locations with live balance verification
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigateTab('allocation-history')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#EADDCE] text-xs font-bold text-[#E76F51] hover:bg-[#FAF8F5] hover:border-[#E76F51] shadow-2xs transition-all cursor-pointer shrink-0"
        >
          <FileCheck2 className="w-4 h-4 text-[#E76F51]" />
          <span>View Past Allocation Records</span>
          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>

      {/* Status Banners */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => navigateTab('allocation-history')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shrink-0 text-xs shadow-xs"
          >
            <span>View in Allocation History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Allocation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Consignment Source Selection */}
        <div className="space-y-5">
          <div className="p-5 rounded-3xl bg-white border border-[#EADDCE] shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-[#264653] font-['Fredoka',sans-serif] flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#E76F51]" />
              <span>1. Choose Inbound Consignment</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#5B7065] mb-1">Select Purchase Order</label>
              <select
                value={selectedPurchaseId}
                onChange={(e) => handlePurchaseChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs font-semibold focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              >
                {purchases.map((p) => {
                  const amount = p.grandTotal ?? (p as any).totalAmount ?? 0;
                  const companyName = p.company || p.items?.[0]?.company;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.purchaseNumber} • {companyName ? `[${companyName}] ` : ''}{p.supplierName} (₹{amount.toLocaleString('en-IN')})
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedPurchase && (
              <div>
                <label className="block text-xs font-bold text-[#5B7065] mb-1">Item to Allocate</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs font-semibold focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                >
                  {(selectedPurchase.items || []).map((it) => {
                    const prod = (products || []).find((p) => p.id === it.productId);
                    const itemComp = it.company || prod?.company;
                    return (
                      <option key={it.productId} value={it.productId}>
                        {prod ? prod.name : it.productId} {itemComp ? `(${itemComp})` : ''} — {it.quantity} units
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Consignment Highlight Card */}
            {selectedProduct && selectedLineItem && (
              <div className="p-4 rounded-2xl bg-[#FAF1E8] border border-[#E76F51]/20 space-y-3">
                <div className="flex items-center gap-3">
                  <PetAvatar type={selectedProduct.avatarType} size="md" />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs text-[#264653]">{selectedProduct.name}</h4>
                      {(selectedLineItem.company || selectedProduct.company || selectedPurchase?.company) && (
                        <span className="px-1.5 py-0.5 rounded bg-white text-[9px] font-bold text-[#D97757] border border-[#E76F51]/30">
                          {selectedLineItem.company || selectedProduct.company || selectedPurchase?.company}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#7C9082]">
                      SKU: {selectedProduct.sku} • {selectedProduct.category}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E76F51]/15 text-xs">
                  <div>
                    <span className="text-[10px] text-[#7C9082]">Purchased Qty</span>
                    <p className="font-bold text-base text-[#264653]">{totalAvailable} units</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7C9082]">Retail Price</span>
                    <p className="font-bold text-base text-[#264653]">
                      ₹{Math.round(Number(selectedProduct.sellingPrice || (selectedProduct as any).mrp) || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#5B7065] mb-1">Dispatch Memo / Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] text-xs focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Helper Tools */}
          <div className="p-5 rounded-3xl bg-white border border-[#EADDCE] shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-[#264653] flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-[#2A9D8F]" />
              <span>Smart Distribution Helpers</span>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDistributeEvenly}
                className="p-2.5 rounded-xl border border-[#2A9D8F]/30 bg-[#2A9D8F]/10 hover:bg-[#2A9D8F]/20 text-[#2A9D8F] text-xs font-bold transition-colors text-center"
              >
                ⚖️ Split Evenly (1/6th each)
              </button>
              <button
                type="button"
                onClick={handleDistributeByNeed}
                className="p-2.5 rounded-xl border border-[#E76F51]/30 bg-[#E76F51]/10 hover:bg-[#E76F51]/20 text-[#E76F51] text-xs font-bold transition-colors text-center"
              >
                🎯 Weighted by Store Need
              </button>
            </div>
            <button
              type="button"
              onClick={resetAllocations}
              className="w-full py-1.5 text-center text-xs font-semibold text-[#7C9082] hover:text-[#264653]"
            >
              Reset to 0 units
            </button>
          </div>
        </div>

        {/* Center/Right Columns: The 6 Branch Target Tree */}
        <div className="lg:col-span-2 space-y-5">
          {/* Allocation Balance Banner */}
          <div className="p-5 rounded-3xl bg-white border border-[#EADDCE] shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#7C9082]">Consignment Allocation Meter</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold text-[#264653] font-['Fredoka',sans-serif]">
                    {currentAllocatedSum}
                  </span>
                  <span className="text-xs font-semibold text-[#7C9082]">/ {totalAvailable} total units</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-[#7C9082]">Remaining Unallocated</span>
                <div
                  className={`text-xl font-bold font-['Fredoka',sans-serif] ${
                    remainingUnallocated < 0
                      ? 'text-red-600'
                      : remainingUnallocated === 0
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {remainingUnallocated} units
                </div>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-3 rounded-full bg-[#F4EDE4] mt-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  remainingUnallocated < 0
                    ? 'bg-red-500'
                    : remainingUnallocated === 0
                    ? 'bg-emerald-500'
                    : 'bg-[#E76F51]'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, (currentAllocatedSum / (totalAvailable || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* The 6 Branch Distribution Nodes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {branches.map((b) => {
              const currentStock = getBranchCurrentStock(b.id);
              const allocated = allocations[b.id] || 0;
              const resultingStock = currentStock + allocated;

              return (
                <div
                  key={b.id}
                  className={`p-4 rounded-3xl border transition-all ${
                    allocated > 0
                      ? 'bg-white border-[#E76F51] shadow-xs'
                      : 'bg-[#FAF8F5] border-[#EADDCE]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-[#E76F51]/10 text-[#E76F51]">
                          {b.code}
                        </span>
                        <span className="text-[11px] text-[#7C9082]">{b.city}</span>
                      </div>
                      <h4 className="font-bold text-xs text-[#264653] mt-1">{b.name}</h4>
                    </div>
                    <Building2 className="w-4 h-4 text-[#7C9082]" />
                  </div>

                  {/* Inputs & Stock Calculation */}
                  <div className="mt-3 pt-2.5 border-t border-[#F2ECE4] flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-[#7C9082] block">Current Stock</span>
                      <span className="font-bold text-[#5B7065]">{currentStock}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[#E76F51] font-bold">+</span>
                      <div>
                        <input
                          type="number"
                          min="0"
                          value={allocations[b.id] === 0 ? '' : allocations[b.id]}
                          placeholder="0"
                          onChange={(e) => handleBranchAllocationChange(b.id, e.target.value)}
                          className="w-18 px-2 py-1 text-center font-bold text-sm rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden bg-white"
                        />
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#7C9082] block">New Stock</span>
                      <span className="font-extrabold text-[#2A9D8F] text-sm">{resultingStock}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Submission */}
          <div className="p-5 rounded-3xl bg-white border border-[#EADDCE] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#5B7065]">
              Confirming this will update all 6 branch inventory tables immediately and create permanent stock movement audit trails.
            </div>

            <button
              onClick={handleExecute}
              disabled={loading || currentAllocatedSum <= 0 || remainingUnallocated < 0}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-xs text-white shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 shrink-0 min-h-[44px] ${
                currentAllocatedSum > 0 && remainingUnallocated >= 0
                  ? 'bg-[#E76F51] hover:bg-[#D95D3E] cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <GitFork className="w-4 h-4" />
              <span>{loading ? 'Dispatching Stock...' : 'Save & Execute Allocation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
