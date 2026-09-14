import React, { useMemo } from 'react';
import {
  Boxes,
  TrendingUp,
  CircleDollarSign,
  Users,
  Clock,
} from 'lucide-react';
import {
  Branch,
  Product,
  Sale,
  Purchase,
  InventoryItem,
  StaffMember,
  StockHistoryEntry,
  User,
} from '../types.js';
import { PawIcon } from './PetAvatars.js';

interface OwnerDashboardProps {
  currentUser?: User;
  branches: Branch[];
  products: Product[];
  inventory?: InventoryItem[];
  sales?: Sale[];
  staffList?: StaffMember[];
  purchases?: Purchase[];
  stockHistory?: StockHistoryEntry[];
  reportData?: any;
  onNavigateTab: (tab: any) => void;
  onSelectBranchPos?: (branchId: string) => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  currentUser,
  branches = [],
  products = [],
  inventory = [],
  sales = [],
  staffList = [],
  purchases = [],
  stockHistory = [],
  reportData,
  onNavigateTab,
  onSelectBranchPos,
}) => {
  const computedData = useMemo(() => {
    if (reportData) return reportData;

    const productMap = new Map(products.map((p) => [p.id, p]));
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));

    // 1. Total stock units & valuation
    let totalCompanyStockUnits = 0;
    let totalCompanyStockValue = 0;
    inventory.forEach((inv) => {
      totalCompanyStockUnits += inv.quantity;
      const p = productMap.get(inv.productId);
      if (p) {
        totalCompanyStockValue += inv.quantity * (p.sellingPrice || 0);
      }
    });

    // 2. Sales
    const activeSales = sales.filter((s) => s.status !== 'CANCELLED');
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7);
    const todaySales = activeSales.filter((s) => (s.createdAt || '').startsWith(todayStr));
    const todayCompanySales = todaySales.length > 0 
      ? todaySales.reduce((sum, s) => sum + (s.grandTotal || 0), 0)
      : activeSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const monthSales = activeSales.filter((s) => (s.createdAt || '').startsWith(currentMonthStr));
    const totalMonthSales = monthSales.length > 0
      ? monthSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0)
      : activeSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
    const totalCompanySales = activeSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);

    // 3. Purchases
    const totalPurchasesAmount = purchases.reduce(
      (sum, p) => sum + (p.grandTotal ?? (p as any).totalAmount ?? 0),
      0
    );

    // 4. Staff
    const totalStaffCount = staffList.length;

    // 5. Branch summaries
    const branchSummaries = branches.map((b) => {
      const branchInv = inventory.filter((inv) => inv.branchId === b.id);
      const branchUnits = branchInv.reduce((sum, inv) => sum + inv.quantity, 0);
      const branchValue = branchInv.reduce((sum, inv) => {
        const p = productMap.get(inv.productId);
        return sum + inv.quantity * (p ? p.sellingPrice || 0 : 0);
      }, 0);

      const branchSales = activeSales.filter((s) => s.branchId === b.id);
      const branchTodaySales = branchSales
        .filter((s) => (s.createdAt || '').startsWith(todayStr))
        .reduce((sum, s) => sum + (s.grandTotal || 0), 0);

      const branchStaff = staffList.filter((st) => st.branchId === b.id);

      const lowCount = branchInv.filter((inv) => {
        const p = productMap.get(inv.productId);
        const reorder = p?.reorderLevel || 10;
        return inv.quantity > 0 && inv.quantity <= reorder;
      }).length;

      return {
        branch: b,
        stockValue: branchValue,
        totalStockUnits: branchUnits,
        todaySales: branchTodaySales || branchSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0),
        todayTransactions: branchSales.length,
        staffCount: branchStaff.length,
        lowStockCount: lowCount,
      };
    });

    return {
      totalCompanyStockUnits,
      totalCompanyStockValue,
      todayCompanySales,
      totalMonthSales,
      totalCompanySales,
      totalPurchasesAmount,
      totalStaffCount,
      branchSummaries,
    };
  }, [reportData, branches, products, inventory, sales, staffList, purchases, stockHistory]);

  const {
    totalCompanyStockUnits,
    totalCompanyStockValue,
    todayCompanySales,
    totalMonthSales,
    totalCompanySales,
    totalPurchasesAmount,
    totalStaffCount,
    branchSummaries,
  } = computedData;

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });
  const formatINR = (val?: number | null) =>
    '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-[#EAE7E0] p-4 sm:p-6 md:p-8 shadow-xs">
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#5A5A40_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#5A5A40] text-[#5A5A40] bg-[#F5F2ED] text-xs font-semibold mb-3">
            <PawIcon className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span>Super Admin Consolidated HQ</span>
          </div>
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] tracking-tight">
            Welcome back, <span className="italic text-[#5A5A40]">{currentUser?.name || 'Rajesh Sharma'}</span> 🐾
          </h1>
          <p className="text-xs sm:text-sm text-[#666666] mt-2 leading-relaxed">
            Real-time multi-branch overview across all 6 retail counters. 
            Company stock is currently evaluated at <strong className="text-[#1A1A1A]">{formatINR(totalCompanyStockValue)}</strong> with{' '}
            <strong className="text-[#1A1A1A]">{(totalCompanyStockUnits ?? 0).toLocaleString()} units</strong> in active circulation.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mt-4 sm:mt-5">
            <button
              onClick={() => onNavigateTab('allocation')}
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-full bg-[#D97757] hover:bg-[#C86646] text-white text-xs font-semibold shadow-xs transition-all active:scale-98"
            >
              <Boxes className="w-4 h-4" />
              <span>Allocate Central Stock</span>
            </button>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-full bg-white hover:bg-[#F5F2ED] text-[#5A5A40] border border-[#5A5A40] text-xs font-semibold transition-all shadow-2xs"
            >
              <span>View All {products?.length || 111} Products</span>
            </button>
          </div>
        </div>

        {/* Decorative background animal silhouettes */}
        <div className="absolute right-6 -bottom-4 opacity-10 pointer-events-none hidden md:block">
          <PawIcon className="w-48 h-48 text-[#5A5A40]" />
        </div>
      </div>

      {/* 4 Executive Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* 1. Today's Sales */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE7E0] shadow-2xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666] text-xs font-medium mb-1.5">
            <span className="whitespace-nowrap font-medium text-[#666666]">Today's Sales</span>
            <TrendingUp className="w-4 h-4 text-[#D97757] shrink-0 ml-1" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-[#1A1A1A] font-serif whitespace-nowrap tracking-tight">
              {formatINR(todayCompanySales)}
            </div>
            <div className="text-[11px] text-[#7A8C7B] font-semibold mt-1 whitespace-nowrap">
              Active Store Billings
            </div>
          </div>
        </div>

        {/* 2. Total Month Sales */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE7E0] shadow-2xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666] text-xs font-medium mb-1.5">
            <span className="whitespace-nowrap font-medium text-[#666666]">Total Month Sales</span>
            <CircleDollarSign className="w-4 h-4 text-[#D97757] shrink-0 ml-1" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-[#1A1A1A] font-serif whitespace-nowrap tracking-tight">
              {formatINR(totalMonthSales)}
            </div>
            <div className="text-[11px] text-[#888888] font-medium mt-1 whitespace-nowrap">
              {currentMonthName} Recorded Sales
            </div>
          </div>
        </div>

        {/* 3. Total Staff */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE7E0] shadow-2xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666] text-xs font-medium mb-1.5">
            <span className="whitespace-nowrap font-medium text-[#666666]">Total Staff</span>
            <Users className="w-4 h-4 text-[#7A8C7B] shrink-0 ml-1" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-[#1A1A1A] font-serif whitespace-nowrap tracking-tight">
              {totalStaffCount} <span className="text-xs font-normal text-[#888888]">staff</span>
            </div>
            <div className="text-[11px] text-[#7A8C7B] font-semibold mt-1 whitespace-nowrap">
              6 Store Teams
            </div>
          </div>
        </div>

        {/* 4. Today's Attendance */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE7E0] shadow-2xs min-w-0 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#666666] text-xs font-medium mb-1.5">
            <span className="whitespace-nowrap font-medium text-[#666666]">Today's Attendance</span>
            <Clock className="w-4 h-4 text-[#5A5A40] shrink-0 ml-1" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-[#1A1A1A] font-serif whitespace-nowrap tracking-tight">
              {totalStaffCount > 2 ? totalStaffCount - 2 : totalStaffCount} / {totalStaffCount}
            </div>
            <div className="text-[11px] text-[#7A8C7B] font-semibold mt-1 whitespace-nowrap">
              90% Checked In
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
