import React, { useState, useMemo } from 'react';
import {
  GitFork,
  Search,
  Filter,
  User as UserIcon,
  FileText,
  Printer,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Plus,
  CheckCircle2,
  Store,
  Download,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { PurchaseAllocationRecord, Branch, Product, User } from '../types.js';
import { PetAvatar, PawIcon, PetEmptyState } from './PetAvatars.js';
import { exportToExcel } from '../utils/exportUtils.js';

interface AllocationHistoryViewProps {
  allocations: PurchaseAllocationRecord[];
  branches: Branch[];
  products: Product[];
  currentUser: User;
  onNavigateTab: (tab: any) => void;
  onRefresh?: () => void;
  onDeleteAllocation?: (allocationId: string) => Promise<any>;
}

export const AllocationHistoryView: React.FC<AllocationHistoryViewProps> = ({
  allocations = [],
  branches = [],
  products = [],
  currentUser,
  onNavigateTab,
  onRefresh,
  onDeleteAllocation,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<PurchaseAllocationRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<PurchaseAllocationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const isAuthorizedToDelete = currentUser.role === 'OWNER' || currentUser.role === 'BRANCH_MANAGER';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return allocations.filter((rec) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesProduct = rec.productName?.toLowerCase().includes(query);
        const matchesSku = rec.sku?.toLowerCase().includes(query);
        const matchesPo = rec.purchaseNumber?.toLowerCase().includes(query);
        const matchesUser = rec.allocatedBy?.toLowerCase().includes(query);
        const matchesNotes = rec.notes?.toLowerCase().includes(query);
        const matchesBranch = rec.allocations?.some((a) =>
          a.branchName?.toLowerCase().includes(query)
        );
        if (
          !matchesProduct &&
          !matchesSku &&
          !matchesPo &&
          !matchesUser &&
          !matchesNotes &&
          !matchesBranch
        ) {
          return false;
        }
      }

      // Branch filter
      if (selectedBranchId !== 'ALL') {
        const hasBranch = rec.allocations?.some(
          (a) => a.branchId === selectedBranchId && (a.allocatedQuantity || 0) > 0
        );
        if (!hasBranch) return false;
      }

      // Date filter
      if (selectedDateFilter !== 'ALL' && rec.date) {
        const today = new Date().toISOString().split('T')[0];
        if (selectedDateFilter === 'TODAY' && rec.date !== today) {
          return false;
        }
      }

      return true;
    });
  }, [allocations, searchTerm, selectedBranchId, selectedDateFilter]);

  // Handle deletion
  const handleConfirmDelete = async () => {
    if (!deletingRecord || !onDeleteAllocation) return;
    setLoading(true);
    try {
      await onDeleteAllocation(deletingRecord.id);
      showToast(`Allocation record #${deletingRecord.id} deleted successfully.`);
      if (selectedRecordForModal?.id === deletingRecord.id) {
        setSelectedRecordForModal(null);
      }
      setDeletingRecord(null);
    } catch (err: any) {
      alert('Failed to delete allocation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFiltered = async () => {
    if (!onDeleteAllocation || filteredRecords.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete all ${filteredRecords.length} currently filtered allocation record(s)? This action cannot be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    let deletedCount = 0;
    try {
      for (const rec of filteredRecords) {
        try {
          await onDeleteAllocation(rec.id);
          deletedCount++;
        } catch (e) {
          console.error(`Failed to delete allocation ${rec.id}:`, e);
        }
      }
      showToast(`Successfully deleted ${deletedCount} filtered allocation record(s).`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert('Error deleting filtered allocations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export to Excel / CSV
  const handleExport = (format: 'excel' | 'csv') => {
    if (filteredRecords.length === 0) {
      alert('No allocation records to export.');
      return;
    }

    const headers = [
      'Allocation ID',
      'Date',
      'Time',
      'Purchase Ref #',
      'Product Name',
      'SKU',
      'Total Allocated (Units)',
      'Allocated By',
      'Branch Breakdown Details',
      'Notes',
    ];

    const rows = filteredRecords.map((rec) => {
      const totalAllocated = rec.allocations?.reduce(
        (acc, curr) => acc + (Number(curr.allocatedQuantity) || 0),
        0
      ) || 0;

      const branchBreakdown = rec.allocations
        ?.filter((a) => (a.allocatedQuantity || 0) > 0)
        .map((a) => `${a.branchName}: +${a.allocatedQuantity} (Stock: ${a.previousStock ?? '—'}→${a.newStock ?? '—'})`)
        .join('; ') || 'None';

      return [
        rec.id,
        rec.date,
        rec.time,
        rec.purchaseNumber,
        rec.productName,
        rec.sku,
        totalAllocated,
        rec.allocatedBy,
        branchBreakdown,
        rec.notes || '',
      ];
    });

    const totalUnits = filteredRecords.reduce((sum, rec) => {
      return sum + (rec.allocations?.reduce((acc, curr) => acc + (Number(curr.allocatedQuantity) || 0), 0) || 0);
    }, 0);

    if (format === 'excel') {
      exportToExcel({
        filename: `petworld_stock_allocations_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Allocations Log',
        title: 'THE PET WORLD - Warehouse Stock Allocation Register',
        subtitle: `Branch: ${selectedBranchId === 'ALL' ? 'All Branches' : branches.find((b) => b.id === selectedBranchId)?.name || selectedBranchId} | Records: ${filteredRecords.length}`,
        metadata: [
          { label: 'Generated Date', value: new Date().toLocaleString('en-IN') },
          { label: 'Generated By', value: `${currentUser.name} (${currentUser.role})` },
          { label: 'Total Allocation Batches', value: String(filteredRecords.length) },
          { label: 'Total Units Dispatched', value: `${totalUnits} Units` },
        ],
        headers,
        rows,
        summaryRows: [
          ['SUMMARY / TOTALS', '', '', '', '', '', totalUnits, '', '', ''],
        ],
      });
      showToast('Allocation records exported to Excel (.xlsx) successfully.');
    } else {
      const csvContent = [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...rows.map((r) =>
          r.map((c) => `"${String(c !== undefined && c !== null ? c : '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `petworld_stock_allocations_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Allocation data exported to CSV successfully.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#264653] text-white rounded-2xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#2A9D8F]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#EADDCE] shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E76F51]/10 text-[#E76F51] text-xs font-bold mb-2">
            <GitFork className="w-3.5 h-3.5" />
            <span>Central Warehouse & Procurement Logistics</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#264653] font-['Fredoka',sans-serif]">
            Stock Allocation Records & History
          </h1>
          <p className="text-xs text-[#7C9082]">
            Detailed audit log of master purchase consignments divided and dispatched across retail branches
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Delete Filtered Button */}
          {isAuthorizedToDelete && onDeleteAllocation && filteredRecords.length > 0 && (
            <button
              onClick={handleDeleteFiltered}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
              title="Delete all currently filtered allocation records"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Delete Filtered ({filteredRecords.length})</span>
            </button>
          )}

          {/* Export Buttons */}
          <div className="inline-flex rounded-2xl shadow-xs border border-[#EADDCE] bg-[#FAF8F5] overflow-hidden">
            <button
              onClick={() => handleExport('excel')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#264653] hover:bg-white transition-colors border-r border-[#EADDCE]"
              title="Export allocations to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#5B7065] hover:bg-white transition-colors"
              title="Export raw CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#E76F51]" />
              <span>Export CSV</span>
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-2xl border border-[#EADDCE] text-[#5B7065] hover:bg-[#FAF8F5] transition-colors"
              title="Refresh Records"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onNavigateTab('allocation')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#E76F51] text-white text-xs font-bold shadow-md hover:bg-[#D45D40] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Stock Allocation</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-[#EADDCE] flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C9082]" />
          <input
            type="text"
            placeholder="Search by product, SKU, PO ref, branch, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#FAF8F5] border border-[#EADDCE] text-xs focus:outline-hidden focus:border-[#E76F51]"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#7C9082] shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-semibold">Branch:</span>
          </div>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EADDCE] text-xs text-[#264653] font-medium focus:outline-hidden focus:border-[#E76F51]"
          >
            <option value="ALL">All 6 Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#EADDCE] text-xs text-[#264653] font-medium focus:outline-hidden focus:border-[#E76F51]"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today Only</option>
          </select>
        </div>
      </div>

      {/* Allocation List */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EADDCE]">
          <PetEmptyState
            title="No Allocation Records Found"
            description={
              searchTerm || selectedBranchId !== 'ALL'
                ? 'Try adjusting your search criteria or branch filters.'
                : 'No central stock allocations have been logged yet.'
            }
            actionText="Create First Allocation"
            onAction={() => onNavigateTab('allocation')}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((rec) => {
            const prod = products.find((p) => p.id === rec.productId);
            const totalAllocated = rec.allocations?.reduce(
              (acc, curr) => acc + (Number(curr.allocatedQuantity) || 0),
              0
            ) || 0;

            return (
              <div
                key={rec.id}
                className="p-5 bg-white rounded-3xl border border-[#EADDCE] hover:border-[#E76F51] transition-all shadow-xs space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2ECE4]">
                  <div className="flex items-center gap-3">
                    <PetAvatar type={prod?.avatarType || 'dog'} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#264653]">
                          {rec.productName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#EADDCE] text-[10px] font-mono text-[#7C9082]">
                          SKU: {rec.sku}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7C9082] mt-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#E76F51]">
                          <FileText className="w-3 h-3" />
                          Ref: {rec.purchaseNumber}
                        </span>
                        <span>•</span>
                        <span>{rec.date} at {rec.time}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          By: {rec.allocatedBy}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="text-right mr-1">
                      <span className="text-[10px] uppercase font-bold text-[#7C9082] block">
                        Batch Total
                      </span>
                      <span className="text-base font-extrabold text-[#2A9D8F]">
                        {totalAllocated} Units
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedRecordForModal(rec)}
                      className="px-3 py-1.5 rounded-xl border border-[#EADDCE] bg-[#FAF8F5] text-xs font-bold text-[#264653] hover:bg-white hover:border-[#E76F51] transition-colors flex items-center gap-1.5"
                    >
                      <span>Slip Details</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#7C9082]" />
                    </button>

                    {isAuthorizedToDelete && onDeleteAllocation && (
                      <button
                        onClick={() => setDeletingRecord(rec)}
                        className="p-2 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                        title="Delete Allocation Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 6-Branch Allocation Breakdown Grid */}
                <div>
                  <div className="text-[11px] font-extrabold text-[#5B7065] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-[#E76F51]" />
                    <span>Store Breakdown & Stock Movements</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {rec.allocations && rec.allocations.length > 0 ? (
                      rec.allocations.map((item) => {
                        const hasStock = (item.allocatedQuantity || 0) > 0;
                        return (
                          <div
                            key={item.branchId}
                            className={`p-2.5 rounded-2xl border text-xs flex flex-col justify-between transition-all ${
                              hasStock
                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                                : 'bg-[#FAF8F5] border-[#EADDCE]/70 text-[#7C9082] opacity-75'
                            }`}
                          >
                            <div>
                              <span className="font-bold text-[11px] line-clamp-1 block" title={item.branchName}>
                                {item.branchName}
                              </span>
                              <div className="mt-1 flex items-baseline justify-between gap-1">
                                <span className={`text-base font-black ${hasStock ? 'text-emerald-700' : 'text-[#7C9082]'}`}>
                                  +{item.allocatedQuantity || 0}
                                </span>
                                <span className="text-[10px] font-bold text-[#7C9082]">
                                  units
                                </span>
                              </div>
                            </div>

                            {item.previousStock !== undefined && item.newStock !== undefined && (
                              <div className="mt-2 pt-1.5 border-t border-black/5 text-[10px] flex items-center justify-between text-[#5B7065]">
                                <span>Bal:</span>
                                <span className="font-mono font-bold">
                                  {item.previousStock} → {item.newStock}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full text-xs text-[#7C9082] italic">
                        No store breakdown available for this record.
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes footer */}
                {rec.notes && (
                  <div className="p-3 rounded-2xl bg-[#FAF8F5] text-xs text-[#5B7065] flex items-start gap-2">
                    <span className="font-bold text-[#264653] shrink-0">Notes:</span>
                    <span>{rec.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Allocation Delivery Slip / Detail Modal */}
      {selectedRecordForModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-[#EADDCE] shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#F2ECE4] pb-4">
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E76F51] uppercase tracking-wider mb-1">
                  <PawIcon className="w-3.5 h-3.5" />
                  <span>Central Distribution Dispatch Note</span>
                </div>
                <h3 className="text-xl font-bold text-[#264653] font-['Fredoka',sans-serif]">
                  Allocation Slip #{selectedRecordForModal.id}
                </h3>
                <p className="text-xs text-[#7C9082]">
                  Purchase Reference: {selectedRecordForModal.purchaseNumber} • Generated on {selectedRecordForModal.date} at {selectedRecordForModal.time}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecordForModal(null)}
                className="p-2 rounded-full hover:bg-[#FAF8F5] text-[#7C9082] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Product Summary */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-[#7C9082] uppercase tracking-wider block">
                  Allocated Product
                </span>
                <span className="font-bold text-sm text-[#264653]">
                  {selectedRecordForModal.productName}
                </span>
                <div className="text-xs text-[#7C9082] font-mono mt-0.5">
                  SKU: {selectedRecordForModal.sku}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-[#7C9082] uppercase tracking-wider block">
                  Total Dispatched
                </span>
                <span className="text-xl font-black text-[#2A9D8F]">
                  {selectedRecordForModal.allocations?.reduce(
                    (acc, curr) => acc + (Number(curr.allocatedQuantity) || 0),
                    0
                  )}{' '}
                  Units
                </span>
              </div>
            </div>

            {/* Detailed Stores Table */}
            <div>
              <h4 className="text-xs font-bold text-[#264653] uppercase tracking-wider mb-2">
                Store-by-Store Dispatch Breakdown
              </h4>
              <div className="rounded-2xl border border-[#EADDCE] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAF8F5] text-[#5B7065] font-bold uppercase text-[10px] border-b border-[#EADDCE]">
                    <tr>
                      <th className="py-2.5 px-3">Branch Location</th>
                      <th className="py-2.5 px-3 text-right">Pre-Stock</th>
                      <th className="py-2.5 px-3 text-right">Allocated Quantity</th>
                      <th className="py-2.5 px-3 text-right">Post-Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2ECE4]">
                    {selectedRecordForModal.allocations?.map((item) => (
                      <tr key={item.branchId} className="hover:bg-[#FAF8F5]/50">
                        <td className="py-2.5 px-3 font-semibold text-[#264653]">
                          {item.branchName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#7C9082]">
                          {item.previousStock ?? '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          +{item.allocatedQuantity || 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#264653]">
                          {item.newStock ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Authorization & Signature Bar */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#7C9082] uppercase block">
                  Authorized Allocator
                </span>
                <span className="font-bold text-[#264653]">
                  {selectedRecordForModal.allocatedBy}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#7C9082] uppercase block">
                  Status
                </span>
                <span className="font-bold text-emerald-700 flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirmed & Dispatched
                </span>
              </div>
            </div>

            {selectedRecordForModal.notes && (
              <div className="text-xs text-[#5B7065] italic">
                Note: {selectedRecordForModal.notes}
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE4]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 rounded-xl border border-[#EADDCE] text-xs font-bold text-[#264653] hover:bg-[#FAF8F5] flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5 text-[#E76F51]" />
                  <span>Print Slip</span>
                </button>

                {isAuthorizedToDelete && onDeleteAllocation && (
                  <button
                    onClick={() => {
                      setDeletingRecord(selectedRecordForModal);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedRecordForModal(null)}
                className="px-5 py-2 rounded-xl bg-[#264653] text-white text-xs font-bold hover:bg-[#1f3742] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-red-200 shadow-2xl p-6 text-[#264653] animate-in fade-in">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-['Fredoka',sans-serif] text-base font-bold text-red-950">
                  Delete Stock Allocation
                </h3>
                <p className="text-xs text-[#7C9082]">Record #{deletingRecord.id}</p>
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EADDCE] text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-[#7C9082]">Product:</span>
                <span className="font-bold">{deletingRecord.productName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C9082]">SKU:</span>
                <span className="font-bold">{deletingRecord.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C9082]">Purchase PO Ref:</span>
                <span className="font-bold">{deletingRecord.purchaseNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C9082]">Date:</span>
                <span className="font-bold">{deletingRecord.date} at {deletingRecord.time}</span>
              </div>
            </div>

            <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200 mb-4">
              <strong>Warning:</strong> Deleting this allocation removes the audit dispatch entry from the database.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#7C9082] hover:bg-[#F2ECE4] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{loading ? 'Deleting...' : 'Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
