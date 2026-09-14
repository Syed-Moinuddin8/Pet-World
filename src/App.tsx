import React, { useState, useEffect, useCallback } from 'react';
import {
  Navigation,
  NavigationTab,
} from './components/Navigation.js';
import { OwnerDashboard } from './components/OwnerDashboard.js';
import { BranchManagement } from './components/BranchManagement.js';
import { PurchaseManagement } from './components/PurchaseManagement.js';
import { InventoryManagement } from './components/InventoryManagement.js';
import { StockAllocationView } from './components/StockAllocationView.js';
import { AllocationHistoryView } from './components/AllocationHistoryView.js';
import { PosCounterView } from './components/PosCounterView.js';
import { SalesHistoryView } from './components/SalesHistoryView.js';
import { StaffManagementView } from './components/StaffManagementView.js';
import { AttendanceView } from './components/AttendanceView.js';
import { SalaryManagementView } from './components/SalaryManagementView.js';
import { SettingsView } from './components/SettingsView.js';
import { GlobalSearchModal } from './components/GlobalSearchModal.js';
import { InvoiceModal } from './components/InvoiceModal.js';
import { ThermalReceiptModal } from './components/ThermalReceiptModal.js';
import { LoginPage } from './components/LoginPage.js';
import { PawIcon } from './components/PetAvatars.js';

import {
  User,
  Branch,
  Product,
  InventoryItem,
  Sale,
  Purchase,
  PurchaseBill,
  StaffMember,
  AttendanceRecord,
  SalaryRecord,
  SalaryAdvance,
  StockHistoryEntry,
  Supplier,
  PurchaseAllocationRecord,
} from './types.js';
import { apiFetch, setAuthHeaders, setActiveUser, getActiveUser } from './lib/api.js';
import { FIXED_BRANCHES } from './data/branches.js';

export default function App() {
  // Current user / role (initially null to present Login Page)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage.getItem('petworld_logged_in') === 'true') {
        return getActiveUser();
      }
    } catch {
      // ignore
    }
    return null;
  });

  // State
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [branches, setBranches] = useState<Branch[]>(FIXED_BRANCHES);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [bills, setBills] = useState<PurchaseBill[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allocations, setAllocations] = useState<PurchaseAllocationRecord[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Sale | null>(null);
  const [activeThermal, setActiveThermal] = useState<Sale | null>(null);
  const [posBranchId, setPosBranchId] = useState<string | undefined>(undefined);
  const [inventoryBranchId, setInventoryBranchId] = useState<string | undefined>(undefined);
  const [allocationPurchaseId, setAllocationPurchaseId] = useState<string | undefined>(undefined);

  // Initialize auth headers on mount or user change
  useEffect(() => {
    setAuthHeaders(currentUser);
  }, [currentUser]);

  // Load all bootstrap data (only display blocking full-screen loader on initial mount)
  const loadData = useCallback(async (showLoadingScreen = false) => {
    try {
      if (showLoadingScreen) {
        setLoading(true);
      }
      const data = await apiFetch<any>('/api/bootstrap');
      setBranches(data.branches || []);
      setProducts(data.products || []);
      setInventory(data.inventory || []);
      setSales(data.sales || []);
      setPurchases(data.purchases || []);
      setBills(data.purchaseBills || []);
      setStaffList(data.staff || []);
      setAttendance(data.attendance || []);
      setSalaries(data.salaries || []);
      setSalaryAdvances(data.salaryAdvances || []);
      setStockHistory(data.stockHistory || []);
      setSuppliers(data.suppliers || []);
      setAllocations(data.purchaseAllocations || []);
      setCategories(data.categories || []);
    } catch (err: any) {
      console.warn('Bootstrap data warning:', err?.message || err);
    } finally {
      if (showLoadingScreen) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(true).catch((err) => {
      console.warn('Initial load handled:', err?.message || err);
    });
  }, [loadData]);

  // Global hotkeys (Cmd+K for search, F2 for POS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Guard branch staff from accessing owner-only tabs
  useEffect(() => {
    if (currentUser && currentUser.role !== 'OWNER' && (activeTab === 'inventory' || activeTab === 'branch-stock' || activeTab === 'attendance' || activeTab === 'purchases' || activeTab === 'allocation' || activeTab === 'allocation-history' || activeTab === 'staff' || activeTab === 'salary' || activeTab === 'settings' || activeTab === 'dashboard')) {
      setActiveTab('pos');
    }
  }, [currentUser?.role, activeTab]);

  // API Action Handlers
  const handleCreateBranch = async (branchData: Partial<Branch>) => {
    const created = await apiFetch<Branch>('/api/branches', {
      method: 'POST',
      body: JSON.stringify(branchData),
    });
    setBranches((prev) => [...prev, created]);
    return created;
  };

  const handleUpdateBranch = async (branchId: string, updates: Partial<Branch>) => {
    const updated = await apiFetch<Branch>(`/api/branches/${branchId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setBranches((prev) => prev.map((b) => (b.id === branchId ? updated : b)));
    setPosBranchId(branchId);
    await loadData().catch(() => {});
    return updated;
  };

  const handleCreateProduct = async (productData: any) => {
    const created = await apiFetch<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
    setProducts((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateProduct = async (productId: string, updates: Partial<Product>) => {
    const updated = await apiFetch<Product>(`/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
    return updated;
  };

  const handleDeleteProduct = async (productId: string) => {
    await apiFetch<any>(`/api/products/${productId}`, {
      method: 'DELETE',
    });
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setInventory((prev) => prev.filter((inv) => inv.productId !== productId));
    await loadData().catch(() => {});
  };

  const handleStockInward = async (data: any) => {
    const res = await apiFetch<any>('/api/stock/inward', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await loadData().catch(() => {});
    return res;
  };

  const handleBulkImportCsv = async (items: any[], branchId: string) => {
    const res = await apiFetch<any>('/api/inventory/import-csv', {
      method: 'POST',
      body: JSON.stringify({ items, branchId }),
    });
    await loadData().catch(() => {});
    return res;
  };

  const handleStockTransfer = async (data: any) => {
    const res = await apiFetch<any>('/api/stock/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await loadData().catch(() => {});
    return res;
  };

  const handleStockAdjustment = async (data: any) => {
    const res = await apiFetch<any>('/api/stock/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await loadData().catch(() => {});
    return res;
  };

  const handleAllocateStock = async (data: any) => {
    const res = await apiFetch<any>('/api/stock/allocate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res && res.id) {
      setAllocations((prev) => [res, ...prev]);
    }
    await loadData().catch(() => {});
    return res;
  };

  const handleCreateCategory = async (name: string) => {
    const res = await apiFetch<{ success: boolean; categories: string[]; category: string }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (res?.categories) {
      setCategories(res.categories);
    }
    return res;
  };

  const handleDeleteCategory = async (name: string, fallbackCategory?: string) => {
    const query = fallbackCategory ? `?fallback=${encodeURIComponent(fallbackCategory)}` : '';
    const res = await apiFetch<{ success: boolean; categories: string[]; affectedProductsCount: number }>(
      `/api/categories/${encodeURIComponent(name)}${query}`,
      {
        method: 'DELETE',
      }
    );
    if (res?.categories) {
      setCategories(res.categories);
    }
    await loadData().catch(() => {});
    return res;
  };

  const handleCompleteSale = async (saleData: any) => {
    const created = await apiFetch<Sale>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
    setSales((prev) => [created, ...prev]);
    // Optimistically update local inventory so POS immediately reflects decremented stock
    if (saleData.items && saleData.branchId) {
      setInventory((prev) =>
        prev.map((inv) => {
          if (inv.branchId !== saleData.branchId) return inv;
          const matched = saleData.items.find((it: any) => it.productId === inv.productId);
          if (matched) {
            return { ...inv, quantity: Math.max(0, inv.quantity - matched.quantity) };
          }
          return inv;
        })
      );
    }
    // Background refresh without blocking checkout completion
    loadData().catch(() => {});
    return created;
  };

  const handleCancelSale = async (saleId: string, reason: string) => {
    const updated = await apiFetch<Sale>(`/api/sales/${saleId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    setSales((prev) => prev.map((s) => (s.id === saleId ? updated : s)));
    loadData().catch(() => {});
    return updated;
  };

  const handleCreatePurchase = async (purchaseData: any) => {
    const created = await apiFetch<Purchase>('/api/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
    setPurchases((prev) => [created, ...prev]);
    return created;
  };

  const handleCreateSupplier = async (supplierData: any) => {
    const created = await apiFetch<Supplier>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    });
    setSuppliers((prev) => [...prev, created]);
    return created;
  };

  const handleCreateBill = async (billData: any) => {
    const created = await apiFetch<PurchaseBill>('/api/purchase-bills', {
      method: 'POST',
      body: JSON.stringify(billData),
    });
    setBills((prev) => [created, ...prev]);
    return created;
  };

  const handleCreateStaff = async (staffData: any) => {
    const created = await apiFetch<StaffMember>('/api/staff', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
    setStaffList((prev) => [...prev, created]);
    return created;
  };

  const handleUpdateStaff = async (staffId: string, updates: any) => {
    const updated = await apiFetch<StaffMember>(`/api/staff/${staffId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setStaffList((prev) => prev.map((s) => (s.id === staffId ? updated : s)));
    return updated;
  };

  const handleCheckIn = async (remarks?: string) => {
    const rec = await apiFetch<AttendanceRecord>('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
    setAttendance((prev) => [rec, ...prev]);
    return rec;
  };

  const handleCheckOut = async () => {
    const rec = await apiFetch<AttendanceRecord>('/api/attendance/check-out', {
      method: 'POST',
    });
    setAttendance((prev) => prev.map((a) => (a.id === rec.id ? rec : a)));
    return rec;
  };

  const handleCorrectAttendance = async (id: string, updates: any) => {
    const rec = await apiFetch<AttendanceRecord>(`/api/attendance/${id}/correct`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setAttendance((prev) => prev.map((a) => (a.id === id ? rec : a)));
    return rec;
  };

  const handleUpsertAttendance = async (data: any) => {
    const rec = await apiFetch<AttendanceRecord>('/api/attendance/upsert', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setAttendance((prev) => {
      const idx = prev.findIndex((a) => a.id === rec.id || (a.staffId === rec.staffId && a.date === rec.date));
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = rec;
        return next;
      }
      return [rec, ...prev];
    });
    return rec;
  };

  const handlePaySalary = async (recordId: string, paymentMode: string) => {
    const rec = await apiFetch<SalaryRecord>(`/api/salaries/${recordId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentMode }),
    });
    setSalaries((prev) => prev.map((s) => (s.id === recordId ? rec : s)));
    return rec;
  };

  const handleAddAdvance = async (advanceData: any) => {
    const res = await apiFetch<{ advance: SalaryAdvance; updatedSalary: SalaryRecord }>('/api/salaries/advances', {
      method: 'POST',
      body: JSON.stringify(advanceData),
    });
    if (res?.advance) {
      setSalaryAdvances((prev) => [res.advance, ...prev]);
    }
    if (res?.updatedSalary) {
      setSalaries((prev) => {
        const idx = prev.findIndex((s) => s.id === res.updatedSalary.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = res.updatedSalary;
          return next;
        }
        return [res.updatedSalary, ...prev];
      });
    }
    return res;
  };

  const handleDeleteAdvance = async (advanceId: string) => {
    const res = await apiFetch<{ success: boolean; updatedSalary?: SalaryRecord }>(`/api/salaries/advances/${advanceId}`, {
      method: 'DELETE',
    });
    if (res?.success) {
      setSalaryAdvances((prev) => prev.filter((a) => a.id !== advanceId));
      if (res.updatedSalary) {
        setSalaries((prev) => prev.map((s) => (s.id === res.updatedSalary!.id ? res.updatedSalary! : s)));
      }
    }
    return res;
  };

  const handleDeleteSale = async (saleId: string) => {
    await apiFetch<{ success: boolean; id: string }>(`/api/sales/${saleId}`, {
      method: 'DELETE',
    });
    setSales((prev) => prev.filter((s) => s.id !== saleId));
  };

  const handleDeleteAttendance = async (attendanceId: string) => {
    await apiFetch<{ success: boolean }>(`/api/attendance/${attendanceId}`, {
      method: 'DELETE',
    });
    setAttendance((prev) => prev.filter((a) => a.id !== attendanceId));
  };

  const handleDeleteAllocation = async (allocationId: string) => {
    await apiFetch<{ success: boolean; id: string }>(`/api/purchase-allocations/${allocationId}`, {
      method: 'DELETE',
    });
    setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
  };

  const handleDeleteSalary = async (salaryId: string) => {
    await apiFetch<{ success: boolean; id: string }>(`/api/salaries/${salaryId}`, {
      method: 'DELETE',
    });
    setSalaries((prev) => prev.filter((s) => s.id !== salaryId));
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    await apiFetch<{ success: boolean; id: string }>(`/api/purchases/${purchaseId}`, {
      method: 'DELETE',
    });
    setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActiveUser(user);
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('petworld_logged_in', 'true');
      }
    } catch {
      // ignore
    }
    if (user.role === 'OWNER') {
      setActiveTab('dashboard');
    } else {
      setActiveTab('pos');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveUser(null);
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('petworld_logged_in');
      }
    } catch {
      // ignore
    }
  };

  // If user is not authenticated, display the dedicated Login Page
  if (!currentUser) {
    return <LoginPage branches={branches} onLogin={handleLogin} />;
  }

  // Active branch lookup
  const userBranch = (branches || []).find((b) => b.id === currentUser.branchId);
  const isOwner = currentUser.role === 'OWNER';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#5A5A40] text-white flex items-center justify-center shadow-lg animate-bounce mb-4">
          <PawIcon className="w-10 h-10" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#1A1A1A]">
          Loading Pet World ERP
        </h2>
        <p className="text-xs text-[#666666] mt-1">
          Synchronizing multi-branch inventory, POS counter, and store ledgers...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#2D2D2D] font-['Plus_Jakarta_Sans',sans-serif]">
      <Navigation
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSelectTab={setActiveTab}
        onOpenSearch={() => setShowSearchModal(true)}
        onLogout={handleLogout}
        branches={branches}
        inventory={inventory}
        products={products}
      >
        {/* Render Tab Content */}
        {activeTab === 'dashboard' && (
          <OwnerDashboard
            currentUser={currentUser}
            branches={branches}
            inventory={inventory}
            sales={sales}
            staffList={staffList}
            purchases={purchases}
            products={products}
            stockHistory={stockHistory}
            onNavigateTab={setActiveTab}
            onSelectBranchPos={(branchId) => {
              setPosBranchId(branchId);
              setActiveTab('pos');
            }}
          />
        )}

        {activeTab === 'branches' && (
          <BranchManagement
            branches={branches}
            onUpdateBranch={handleUpdateBranch}
            onSelectBranchPos={(branchId) => {
              setPosBranchId(branchId);
              setActiveTab('pos');
            }}
            onViewBranchInventory={(branchId) => {
              setInventoryBranchId(branchId);
              setActiveTab('inventory');
            }}
          />
        )}

        {activeTab === 'purchases' && (
          <PurchaseManagement
            purchases={purchases}
            products={products}
            suppliers={suppliers}
            currentUser={currentUser}
            onCreatePurchase={handleCreatePurchase}
            onCreateSupplier={handleCreateSupplier}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onNavigateTab={setActiveTab}
            onAllocatePurchase={(purId) => {
              setAllocationPurchaseId(purId);
              setActiveTab('allocation');
            }}
            onDeletePurchase={handleDeletePurchase}
          />
        )}

        {activeTab === 'inventory' && isOwner && (
          <InventoryManagement
            products={products}
            inventory={inventory}
            branches={branches}
            currentUser={currentUser}
            suppliers={suppliers}
            onAddStock={handleStockInward}
            onAdjustStock={handleStockAdjustment}
            onTransferStock={handleStockTransfer}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onStockInward={handleStockInward}
            onStockTransfer={handleStockTransfer}
            onStockAdjustment={handleStockAdjustment}
            onBulkImportCsv={handleBulkImportCsv}
            preselectedBranchId={inventoryBranchId}
            onDeleteProduct={handleDeleteProduct}
            categories={categories}
            onCreateCategory={handleCreateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'allocation' && (
          <StockAllocationView
            purchases={purchases}
            products={products}
            branches={branches}
            inventory={inventory}
            currentUser={currentUser}
            preselectedPurchaseId={allocationPurchaseId}
            onAllocateStock={handleAllocateStock}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'allocation-history' && (
          <AllocationHistoryView
            allocations={allocations}
            branches={branches}
            products={products}
            currentUser={currentUser}
            onNavigateTab={setActiveTab}
            onRefresh={loadData}
            onDeleteAllocation={handleDeleteAllocation}
          />
        )}

        {activeTab === 'pos' && (
          <PosCounterView
            products={products}
            inventory={inventory}
            branches={branches}
            currentUser={currentUser}
            initialBranchId={posBranchId}
            onSelectBranch={(branchId) => setPosBranchId(branchId)}
            onCompleteSale={handleCompleteSale}
            onPrintInvoice={(s) => setActiveInvoice(s)}
            onPrintThermal={(s) => setActiveThermal(s)}
            onUpdateProduct={handleUpdateProduct}
          />
        )}

        {activeTab === 'sales' && (
          <SalesHistoryView
            sales={sales}
            branches={branches}
            currentUser={currentUser}
            onCancelSale={handleCancelSale}
            onDeleteSale={handleDeleteSale}
            onPrintInvoice={(s) => setActiveInvoice(s)}
            onPrintThermal={(s) => setActiveThermal(s)}
          />
        )}

        {activeTab === 'staff' && (
          <StaffManagementView
            staffList={staffList}
            branches={branches}
            currentUser={currentUser}
            onCreateStaff={handleCreateStaff}
            onUpdateStaff={handleUpdateStaff}
          />
        )}

        {activeTab === 'attendance' && isOwner && (
          <AttendanceView
            attendanceRecords={attendance}
            staffList={staffList}
            branches={branches}
            currentUser={currentUser}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            onCorrectAttendance={handleCorrectAttendance}
            onUpsertAttendance={handleUpsertAttendance}
            onDeleteAttendance={handleDeleteAttendance}
          />
        )}

        {activeTab === 'salary' && (
          <SalaryManagementView
            salaryRecords={salaries}
            salaryAdvances={salaryAdvances}
            staffList={staffList}
            branches={branches}
            currentUser={currentUser}
            onPaySalary={handlePaySalary}
            onAddAdvance={handleAddAdvance}
            onDeleteAdvance={handleDeleteAdvance}
            onDeleteSalary={handleDeleteSalary}
            onReloadSalaries={loadData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            branches={branches}
            currentUser={currentUser}
          />
        )}
      </Navigation>

      {/* Global Cmd+K Search Modal */}
      <GlobalSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        products={products}
        sales={sales}
        staffList={staffList}
        branches={branches}
        onNavigateTab={setActiveTab}
      />

      {/* Standard Tax Invoice Modal */}
      {activeInvoice && (
        <InvoiceModal
          sale={activeInvoice}
          branch={branches.find((b) => b.id === activeInvoice.branchId)}
          onClose={() => setActiveInvoice(null)}
        />
      )}

      {/* Thermal Slip (58mm/80mm) Modal */}
      {activeThermal && (
        <ThermalReceiptModal
          sale={activeThermal}
          branch={branches.find((b) => b.id === activeThermal.branchId)}
          onClose={() => setActiveThermal(null)}
        />
      )}
    </div>
  );
}
