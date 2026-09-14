import React, { useState, useEffect } from 'react';
import {
  CircleDollarSign,
  Search,
  Printer,
  Ban,
  Filter,
  Receipt,
  AlertTriangle,
  Building2,
  Calendar,
  Eye,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
} from 'lucide-react';
import { Sale, Branch, User } from '../types.js';
import { PawIcon, PetEmptyState } from './PetAvatars.js';
import { exportToExcel } from '../utils/exportUtils.js';

interface SalesHistoryViewProps {
  sales: Sale[];
  branches: Branch[];
  currentUser: User;
  onCancelSale: (saleId: string, reason: string) => Promise<any>;
  onDeleteSale?: (saleId: string) => Promise<any>;
  onPrintInvoice: (sale: Sale) => void;
  onPrintThermal: (sale: Sale) => void;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({
  sales,
  branches,
  currentUser,
  onCancelSale,
  onDeleteSale,
  onPrintInvoice,
  onPrintThermal,
}) => {
  const isOwner = currentUser.role === 'OWNER';
  const defaultBranch = !isOwner && currentUser.branchId ? currentUser.branchId : 'ALL';

  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [searchQuery, setSearchQuery] = useState('');
  const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inspectSale, setInspectSale] = useState<Sale | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const filteredSales = sales.filter((s) => {
    if (selectedBranch !== 'ALL' && s.branchId !== selectedBranch) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        s.invoiceNumber.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        s.staffName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));
  const paginatedSales = filteredSales.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, searchQuery]);

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSale || !cancelReason.trim()) return;
    setLoading(true);
    try {
      await onCancelSale(cancellingSale.id, cancelReason.trim());
      setCancellingSale(null);
      setCancelReason('');
      showToast(`Sale #${cancellingSale.invoiceNumber} has been cancelled and stock reversed.`);
    } catch (err: any) {
      alert('Failed to cancel sale: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSale || !onDeleteSale) return;
    setLoading(true);
    try {
      await onDeleteSale(deletingSale.id);
      showToast(`Sale #${deletingSale.invoiceNumber} deleted successfully.`);
      setSelectedSaleIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingSale.id);
        return next;
      });
      setDeletingSale(null);
    } catch (err: any) {
      alert('Failed to delete sale: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSaleIds.size === 0 || !onDeleteSale) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedSaleIds.size} sales transaction(s)? This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    let successCount = 0;
    try {
      for (const id of Array.from(selectedSaleIds)) {
        try {
          await onDeleteSale(id);
          successCount++;
        } catch (e) {
          console.error(`Failed to delete sale ${id}:`, e);
        }
      }
      setSelectedSaleIds(new Set());
      showToast(`Successfully deleted ${successCount} sale record(s).`);
    } catch (err: any) {
      alert('Bulk delete error: ' + err.message);
    } finally {
      setLoading(false);
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteFilteredSales = async () => {
    if (!onDeleteSale || filteredSales.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete all ${filteredSales.length} currently filtered sales transaction(s)? This action cannot be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    let successCount = 0;
    try {
      for (const sale of filteredSales) {
        try {
          await onDeleteSale(sale.id);
          successCount++;
        } catch (e) {
          console.error(`Failed to delete sale ${sale.id}:`, e);
        }
      }
      setSelectedSaleIds(new Set());
      showToast(`Successfully deleted ${successCount} filtered sales record(s).`);
    } catch (err: any) {
      alert('Error deleting filtered sales: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectSale = (id: string) => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSaleIds.size === filteredSales.length && filteredSales.length > 0) {
      setSelectedSaleIds(new Set());
    } else {
      setSelectedSaleIds(new Set(filteredSales.map((s) => s.id)));
    }
  };

  // Export to Excel / CSV
  const handleExport = (format: 'excel' | 'csv') => {
    const listToExport = selectedSaleIds.size > 0
      ? filteredSales.filter((s) => selectedSaleIds.has(s.id))
      : filteredSales;

    if (listToExport.length === 0) {
      alert('No sales records to export.');
      return;
    }

    const headers = [
      'Invoice #',
      'Date',
      'Time',
      'Branch Name',
      'Cashier',
      'Customer Name',
      'Customer Phone',
      'Total Items',
      'Products Details',
      'Subtotal (₹)',
      'Discount (₹)',
      'Tax (₹)',
      'Grand Total (₹)',
      'Payment Method',
      'Status',
      'Cancel Reason',
    ];

    const rows = listToExport.map((s) => [
      s.invoiceNumber,
      s.date,
      s.time,
      s.branchName,
      s.staffName,
      s.customerName || 'Walk-in',
      s.customerPhone || 'N/A',
      s.items.reduce((sum, it) => sum + (it.quantity || 0), 0),
      s.items.map((it) => `${it.productName} (x${it.quantity})`).join('; '),
      Math.round(s.subtotal || 0),
      Math.round(s.discountTotal || 0),
      Math.round(s.taxTotal || s.taxAmount || 0),
      Math.round(s.grandTotal || 0),
      s.paymentMethod || 'Cash',
      s.status,
      s.cancelReason || '',
    ]);

    const activeTotal = listToExport
      .filter((s) => s.status !== 'CANCELLED')
      .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

    const totalQty = listToExport.reduce(
      (sum, s) => sum + s.items.reduce((iSum, it) => iSum + (it.quantity || 0), 0),
      0
    );

    if (format === 'excel') {
      exportToExcel({
        filename: `petworld_sales_report_${new Date().toISOString().split('T')[0]}`,
        sheetName: 'Sales Register',
        title: 'THE PET WORLD - Sales Transactions & Invoices Register',
        subtitle: `Branch: ${selectedBranch === 'ALL' ? 'All Branches' : branches.find((b) => b.id === selectedBranch)?.name || selectedBranch} | Total Transactions: ${listToExport.length}`,
        metadata: [
          { label: 'Generated Date', value: new Date().toLocaleString('en-IN') },
          { label: 'Exported By', value: `${currentUser.name} (${currentUser.role})` },
          { label: 'Total Invoices', value: String(listToExport.length) },
          { label: 'Net Active Revenue', value: `₹${Math.round(activeTotal).toLocaleString('en-IN')}` },
        ],
        headers,
        rows,
        summaryRows: [
          ['SUMMARY / TOTALS', '', '', '', '', '', '', totalQty, '', '', '', '', activeTotal, '', '', ''],
        ],
      });
      showToast('Sales report exported to Excel (.xlsx) successfully.');
    } else {
      // CSV format
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
      link.setAttribute('download', `petworld_sales_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Sales data exported to CSV successfully.');
    }
  };

  const formatINR = (val?: number | null) =>
    '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');

  const totalRevenue = filteredSales
    .filter((s) => s.status !== 'CANCELLED')
    .reduce((sum, s) => sum + (Number(s.grandTotal) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#264653] text-white rounded-2xl shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#2A9D8F]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E76F51]/10 text-[#E76F51] text-xs font-bold mb-1">
            <PawIcon className="w-3.5 h-3.5" />
            <span>Store Counter Transactions</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#264653] font-['Fredoka',sans-serif]">
            Sales History & Receipts
          </h1>
          <p className="text-xs text-[#7C9082]">
            Total Invoices: {filteredSales.length} • Total Active Revenue:{' '}
            <strong className="text-[#264653]">{formatINR(totalRevenue)}</strong>
          </p>
        </div>

        {/* Global Export & Bulk Actions */}
        <div className="flex items-center gap-2">
          {isOwner && onDeleteSale && filteredSales.length > 0 && (
            <button
              onClick={handleDeleteFilteredSales}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
              title="Delete all currently filtered sales"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Delete Filtered ({filteredSales.length})</span>
            </button>
          )}

          {selectedSaleIds.size > 0 && isOwner && onDeleteSale && (
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors"
              title="Delete selected sales"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedSaleIds.size})</span>
            </button>
          )}

          <div className="inline-flex rounded-xl shadow-xs border border-[#EADDCE] bg-white overflow-hidden">
            <button
              onClick={() => handleExport('excel')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#264653] hover:bg-[#FAF8F5] transition-colors border-r border-[#EADDCE]"
              title="Export sales to Excel spreadsheet (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#5B7065] hover:bg-[#FAF8F5] transition-colors"
              title="Export raw CSV file"
            >
              <Download className="w-3.5 h-3.5 text-[#E76F51]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-white border border-[#EADDCE] shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Branch Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#5B7065]">Branch:</span>
          {isOwner ? (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs font-semibold focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
            >
              <option value="ALL">All 6 Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-[#FAF1E8] text-[#E76F51] font-bold text-xs">
              {branches.find((b) => b.id === currentUser.branchId)?.name}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#7C9082]" />
          <input
            type="text"
            placeholder="Search invoice #, customer name, phone, or cashier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-3xl bg-white border border-[#EADDCE] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#264653]">
            <thead className="bg-[#FAF8F5] border-b border-[#EADDCE] text-[11px] font-extrabold uppercase tracking-wider text-[#7C9082]">
              <tr>
                {isOwner && (
                  <th className="px-3 py-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[#7C9082] hover:text-[#264653]"
                      title="Select all"
                    >
                      {selectedSaleIds.size > 0 && selectedSaleIds.size === filteredSales.length ? (
                        <CheckSquare className="w-4 h-4 text-[#E76F51]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Branch & Cashier</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2ECE4]">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 9 : 8} className="py-12">
                    <PetEmptyState
                      title="No sales transactions found"
                      description="Process sales at the POS counter to generate records."
                      avatar="dog"
                    />
                  </td>
                </tr>
              ) : (
                paginatedSales.map((s) => {
                  const isSelected = selectedSaleIds.has(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-[#FAF8F5] transition-colors ${
                        isSelected ? 'bg-amber-50/50' : ''
                      } ${s.status === 'CANCELLED' ? 'opacity-60 bg-red-50/30' : ''}`}
                    >
                      {isOwner && (
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectSale(s.id)}
                            className="text-[#7C9082] hover:text-[#264653]"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#E76F51]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono font-bold text-xs text-[#264653]">
                        {s.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-[#5B7065]">
                        <span>{s.date}</span>
                        <span className="block text-[10px] text-[#8C9B90]">{s.time}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#264653] block">{s.branchName}</span>
                        <span className="text-[10px] text-[#7C9082]">Cashier: {s.staffName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#264653] block">{s.customerName || 'Walk-in'}</span>
                        {s.customerPhone && (
                          <span className="text-[10px] text-[#7C9082]">{s.customerPhone}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#264653]">
                          {s.items.reduce((sum, it) => sum + it.quantity, 0)} items
                        </span>
                        <span className="block text-[10px] text-[#7C9082] truncate max-w-[150px]">
                          {s.items.map((i) => i.productName).join(', ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-sm text-[#264653]">
                        {formatINR(s.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            s.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setInspectSale(s)}
                            className="p-1.5 rounded-lg text-[#5B7065] hover:bg-[#F2ECE4]"
                            title="Inspect Items"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPrintThermal(s)}
                            className="p-1.5 rounded-lg text-[#264653] hover:bg-[#F2ECE4]"
                            title="Print Thermal Receipt"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPrintInvoice(s)}
                            className="p-1.5 rounded-lg text-[#E76F51] hover:bg-[#FAF1E8]"
                            title="Print Tax Invoice (A4)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {s.status !== 'CANCELLED' && isOwner && (
                            <button
                              onClick={() => setCancellingSale(s)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                              title="Cancel Sale & Restore Stock"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isOwner && onDeleteSale && (
                            <button
                              onClick={() => setDeletingSale(s)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete Sales Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar for High-Speed Browsing */}
        {filteredSales.length > pageSize && (
          <div className="px-4 py-3 bg-[#FAF8F5] border-t border-[#EADDCE] flex items-center justify-between text-xs text-[#264653]">
            <div className="text-[#7C9082]">
              Showing <span className="font-bold text-[#264653]">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-[#264653]">
                {Math.min(currentPage * pageSize, filteredSales.length)}
              </span>{' '}
              of <span className="font-bold text-[#264653]">{filteredSales.length}</span> bills
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-[#D5C7B8] bg-white hover:bg-[#F2ECE4] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-bold text-[#264653] text-xs">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-[#D5C7B8] bg-white hover:bg-[#F2ECE4] disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INSPECT ITEMS MODAL */}
      {inspectSale && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#EADDCE] shadow-2xl p-6 text-[#264653] animate-in fade-in">
            <h3 className="font-['Fredoka',sans-serif] text-base font-bold mb-1">
              Invoice #{inspectSale.invoiceNumber}
            </h3>
            <p className="text-xs text-[#7C9082] mb-3">
              {inspectSale.branchName} • {inspectSale.date}
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {inspectSale.items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EADDCE] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[#264653] block">{it.productName}</span>
                    <span className="text-[10px] text-[#7C9082]">
                      {it.quantity} x {formatINR(it.unitPrice)}
                    </span>
                  </div>
                  <span className="font-extrabold text-[#264653]">{formatINR(it.totalPrice)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#F2ECE4] flex items-center justify-between font-bold text-sm">
              <span>Grand Total:</span>
              <span className="text-[#E76F51]">{formatINR(inspectSale.grandTotal)}</span>
            </div>

            <button
              onClick={() => setInspectSale(null)}
              className="mt-4 w-full py-2 rounded-xl bg-[#F2ECE4] text-xs font-bold text-[#5B7065] hover:bg-[#EADDCE] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* CANCEL SALE MODAL */}
      {cancellingSale && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-amber-200 shadow-2xl p-6 text-[#264653] animate-in fade-in">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-['Fredoka',sans-serif] text-base font-bold">
                Cancel Sale #{cancellingSale.invoiceNumber}
              </h3>
            </div>

            <p className="text-xs text-[#5B7065] mb-4">
              Cancelling will reverse this transaction, automatically restore all item quantities back to{' '}
              <strong className="text-[#264653]">{cancellingSale.branchName}</strong> inventory, and log a permanent audit trail entry.
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Mandatory Cancellation Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer returned items, wrong barcode scanned..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  onClick={() => setCancellingSale(null)}
                  className="px-4 py-2 rounded-xl font-bold text-[#7C9082] hover:bg-[#F2ECE4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                >
                  {loading ? 'Reversing...' : 'Confirm Cancellation & Restore Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SALE CONFIRMATION MODAL */}
      {deletingSale && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-red-200 shadow-2xl p-6 text-[#264653] animate-in fade-in">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-['Fredoka',sans-serif] text-base font-bold text-red-950">
                  Delete Sales Transaction
                </h3>
                <p className="text-xs text-[#7C9082]">Invoice #{deletingSale.invoiceNumber}</p>
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EADDCE] text-xs space-y-1.5 mb-4">
              <div className="flex justify-between">
                <span className="text-[#7C9082]">Customer:</span>
                <span className="font-bold">{deletingSale.customerName || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C9082]">Branch:</span>
                <span className="font-bold">{deletingSale.branchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C9082]">Date:</span>
                <span className="font-bold">{deletingSale.date} ({deletingSale.time})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C9082]">Grand Total:</span>
                <span className="font-extrabold text-[#E76F51]">{formatINR(deletingSale.grandTotal)}</span>
              </div>
            </div>

            <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200 mb-4">
              <strong>Warning:</strong> This will permanently delete this invoice record from the database.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSale(null)}
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
                <span>{loading ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
