import React, { useState, useMemo } from 'react';
import {
  Banknote,
  Calendar,
  Building2,
  CheckCircle2,
  Printer,
  Search,
  CreditCard,
  X,
  FileText,
  HandCoins,
  PlusCircle,
  Receipt,
  AlertCircle,
  Trash2,
  Eye,
  ArrowDownRight,
  Info,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { SalaryRecord, SalaryAdvance, StaffMember, Branch, User } from '../types.js';
import { PawIcon, PetAvatar, PetEmptyState } from './PetAvatars.js';
import { exportToExcel, exportToPDF } from '../utils/exportUtils.js';

interface SalaryManagementViewProps {
  salaryRecords: SalaryRecord[];
  salaryAdvances?: SalaryAdvance[];
  staffList: StaffMember[];
  branches: Branch[];
  currentUser: User;
  onPaySalary: (recordId: string, paymentMode: string) => Promise<any>;
  onAddAdvance?: (advanceData: any) => Promise<any>;
  onDeleteAdvance?: (advanceId: string) => Promise<any>;
  onDeleteSalary?: (salaryId: string) => Promise<any>;
  onReloadSalaries?: () => Promise<void>;
}

export const SalaryManagementView: React.FC<SalaryManagementViewProps> = ({
  salaryRecords,
  salaryAdvances = [],
  staffList,
  branches,
  currentUser,
  onPaySalary,
  onAddAdvance,
  onDeleteAdvance,
  onDeleteSalary,
  onReloadSalaries,
}) => {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'payroll' | 'advances'>('payroll');
  const [selectedMonth, setSelectedMonth] = useState('September 2026');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [activePayslip, setActivePayslip] = useState<SalaryRecord | null>(null);
  const [payingRecord, setPayingRecord] = useState<SalaryRecord | null>(null);
  const [paymentMode, setPaymentMode] = useState<string>('Bank Transfer');
  const [inspectingAdvancesStaff, setInspectingAdvancesStaff] = useState<SalaryRecord | null>(null);
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);

  // New Advance Form State
  const [newAdvanceStaffId, setNewAdvanceStaffId] = useState('');
  const [newAdvanceAmount, setNewAdvanceAmount] = useState('');
  const [newAdvanceDate, setNewAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAdvanceReason, setNewAdvanceReason] = useState('Medical Emergency');
  const [newAdvanceNotes, setNewAdvanceNotes] = useState('');
  const [newAdvancePaymentMode, setNewAdvancePaymentMode] = useState<'Cash' | 'UPI' | 'Bank Transfer'>('Cash');
  const [newAdvanceReceipt, setNewAdvanceReceipt] = useState('');

  const [loading, setLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const normalizeMonth = (m?: string): string => {
    if (!m) return '';
    const clean = m.trim().toLowerCase();
    if (clean === '2026-09' || clean.includes('sep')) return 'September 2026';
    if (clean === '2026-08' || clean.includes('aug')) return 'August 2026';
    if (clean === '2026-07' || clean.includes('jul')) return 'July 2026';
    if (clean === '2026-06' || clean.includes('jun')) return 'June 2026';
    if (clean === '2026-02' || clean.includes('feb')) return 'February 2026';
    if (clean === '2026-01' || clean.includes('jan')) return 'January 2026';
    if (clean === '2025-12' || clean.includes('dec')) return 'December 2025';
    return m.trim();
  };

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    salaryRecords.forEach((r) => {
      if (r.month) set.add(normalizeMonth(r.month));
    });
    set.add('September 2026');
    set.add('August 2026');
    set.add('July 2026');
    return Array.from(set);
  }, [salaryRecords]);

  const isPaidRecord = (rec: SalaryRecord) => rec.status === 'PAID' || rec.paymentStatus === 'PAID';

  // Map advances by staff ID for the selected month
  const monthAdvances = useMemo(() => {
    const targetNorm = normalizeMonth(selectedMonth);
    return salaryAdvances.filter((a) => {
      const aNorm = normalizeMonth(a.month);
      return aNorm === targetNorm || a.month === selectedMonth;
    });
  }, [salaryAdvances, selectedMonth]);

  // Merge each salary record with itemized advances
  const enrichedSalaryRecords = useMemo(() => {
    return salaryRecords.map((rec) => {
      const staffDraws = monthAdvances.filter((a) => a.staffId === rec.staffId);
      const totalAdvance = staffDraws.reduce((sum, a) => sum + a.amount, 0);
      const computedNet = Math.max(
        0,
        rec.basicSalary - totalAdvance
      );
      return {
        ...rec,
        advance: totalAdvance,
        advances: staffDraws,
        netSalary: computedNet,
      };
    });
  }, [salaryRecords, monthAdvances]);

  const filteredRecords = useMemo(() => {
    return enrichedSalaryRecords.filter((rec) => {
      const normMonth = normalizeMonth(rec.month);
      if (normMonth !== selectedMonth && rec.month !== selectedMonth) return false;
      if (selectedBranch !== 'ALL' && rec.branchId !== selectedBranch) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.staffName.toLowerCase().includes(q) ||
          rec.branchName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedSalaryRecords, selectedMonth, selectedBranch, searchQuery]);

  // Filtered advances for the Advances tab
  const filteredAdvances = useMemo(() => {
    return monthAdvances.filter((adv) => {
      if (selectedBranch !== 'ALL' && adv.branchId !== selectedBranch) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          adv.staffName.toLowerCase().includes(q) ||
          adv.branchName.toLowerCase().includes(q) ||
          adv.reason.toLowerCase().includes(q) ||
          (adv.notes && adv.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [monthAdvances, selectedBranch, searchQuery]);

  // Advance Total for Badge
  const totalAdvancesDeducted = filteredRecords.reduce((sum, r) => sum + (r.advance || 0), 0);

  const formatINR = (val?: number | null) =>
    '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');

  const handleOpenDisburseModal = (rec: SalaryRecord) => {
    setPayingRecord(rec);
    setPaymentMode('Bank Transfer');
  };

  const handleConfirmPayment = async () => {
    if (!payingRecord) return;
    setLoading(true);
    try {
      await onPaySalary(payingRecord.id, paymentMode);
      setActionFeedback({
        type: 'success',
        message: `Disbursed ${formatINR(payingRecord.netSalary)} to ${payingRecord.staffName} via ${paymentMode}. All mid-month advances settled!`,
      });
      setPayingRecord(null);
      setTimeout(() => setActionFeedback(null), 4500);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Disbursement failed: ' + (err?.message || 'Unknown error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddAdvance = (preselectedStaffId?: string) => {
    const firstStaffId = preselectedStaffId || staffList[0]?.id || '';
    setNewAdvanceStaffId(firstStaffId);
    setNewAdvanceAmount('');
    setNewAdvanceDate(new Date().toISOString().split('T')[0]);
    setNewAdvanceReason('Medical Emergency');
    setNewAdvanceNotes('');
    setNewAdvancePaymentMode('Cash');
    setNewAdvanceReceipt(`ADV-${Date.now().toString().slice(-5)}`);
    setShowAddAdvanceModal(true);
  };

  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvanceStaffId) {
      alert('Please select an employee');
      return;
    }
    const amt = Number(newAdvanceAmount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid advance amount');
      return;
    }

    const selectedStaff = staffList.find((s) => s.id === newAdvanceStaffId);
    if (!selectedStaff) {
      alert('Selected staff member not found');
      return;
    }

    setLoading(true);
    try {
      if (onAddAdvance) {
        await onAddAdvance({
          staffId: selectedStaff.id,
          staffName: selectedStaff.name,
          branchId: selectedStaff.branchId,
          branchName: selectedStaff.branchName,
          month: selectedMonth,
          date: newAdvanceDate,
          amount: amt,
          reason: newAdvanceReason,
          notes: newAdvanceNotes,
          paymentMode: newAdvancePaymentMode,
          receiptNumber: newAdvanceReceipt || `ADV-${Date.now().toString().slice(-5)}`,
        });
      }
      setActionFeedback({
        type: 'success',
        message: `Successfully recorded advance of ${formatINR(amt)} for ${selectedStaff.name}. Month-end take-home pay auto-updated!`,
      });
      setShowAddAdvanceModal(false);
      setTimeout(() => setActionFeedback(null), 4500);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Could not record advance: ' + (err?.message || 'Unknown error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdvanceItem = async (advId: string, staffName: string, amount: number) => {
    if (!confirm(`Are you sure you want to remove the advance of ${formatINR(amount)} for ${staffName}? The net take-home salary will automatically be restored.`)) {
      return;
    }

    setLoading(true);
    try {
      if (onDeleteAdvance) {
        await onDeleteAdvance(advId);
      }
      setActionFeedback({
        type: 'success',
        message: `Advance entry of ${formatINR(amount)} removed. Salary records updated.`,
      });
      if (inspectingAdvancesStaff) {
        // Refresh inspected staff
        const remainingDraws = (inspectingAdvancesStaff.advances || []).filter((a) => a.id !== advId);
        setInspectingAdvancesStaff({
          ...inspectingAdvancesStaff,
          advances: remainingDraws,
          advance: remainingDraws.reduce((sum, a) => sum + a.amount, 0),
        });
      }
      setTimeout(() => setActionFeedback(null), 4500);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Failed to delete advance: ' + (err?.message || 'Unknown error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const isAuthorizedToDelete = currentUser.role === 'OWNER' || currentUser.role === 'BRANCH_MANAGER';

  const handleDeleteSalaryRecord = async (salaryId: string, staffName: string, month: string) => {
    if (!onDeleteSalary) return;
    if (!confirm(`Are you sure you want to permanently delete the salary record for ${staffName} (${month})?`)) {
      return;
    }
    setLoading(true);
    try {
      await onDeleteSalary(salaryId);
      setActionFeedback({
        type: 'success',
        message: `Salary record for ${staffName} (${month}) has been deleted successfully.`,
      });
      if (activePayslip?.id === salaryId) {
        setActivePayslip(null);
      }
      setTimeout(() => setActionFeedback(null), 4500);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Failed to delete salary record: ' + (err?.message || 'Unknown error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFilteredSalaries = async () => {
    if (!onDeleteSalary || filteredRecords.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete all ${filteredRecords.length} filtered salary record(s) for ${selectedMonth}? This action cannot be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    let successCount = 0;
    try {
      for (const rec of filteredRecords) {
        try {
          await onDeleteSalary(rec.id);
          successCount++;
        } catch (e) {
          console.error(`Failed to delete salary ${rec.id}:`, e);
        }
      }
      setActionFeedback({
        type: 'success',
        message: `Successfully deleted ${successCount} filtered salary record(s).`,
      });
      if (onReloadSalaries) await onReloadSalaries();
      setTimeout(() => setActionFeedback(null), 4500);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Failed to delete filtered salaries: ' + (err?.message || 'Unknown error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFilteredAdvances = async () => {
    if (!onDeleteAdvance || filteredAdvances.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to permanently delete all ${filteredAdvances.length} filtered advance drawing(s) for ${selectedMonth}? This action cannot be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    let successCount = 0;
    try {
      for (const adv of filteredAdvances) {
        try {
          await onDeleteAdvance(adv.id);
          successCount++;
        } catch (e) {
          console.error(`Failed to delete advance ${adv.id}:`, e);
        }
      }
      setActionFeedback({
        type: 'success',
        message: `Successfully deleted ${successCount} filtered advance record(s).`,
      });
      if (onReloadSalaries) await onReloadSalaries();
      setTimeout(() => setActionFeedback(null), 4500);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Failed to delete filtered advances: ' + (err?.message || 'Unknown error'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Pre-selected staff calculation preview in modal
  const selectedStaffForAdvance = staffList.find((s) => s.id === newAdvanceStaffId);
  const currentExistingAdvanceForStaff = useMemo(() => {
    if (!newAdvanceStaffId) return 0;
    const draws = monthAdvances.filter((a) => a.staffId === newAdvanceStaffId);
    return draws.reduce((sum, a) => sum + a.amount, 0);
  }, [newAdvanceStaffId, monthAdvances]);

  const advanceReasonOptions = [
    'Medical Emergency',
    'House Rent / Rental Deposit',
    'Vehicle Repair & Fuel',
    'Travel & Commute / Hometown Visit',
    'Family Function / Festival',
    'Child Education / School Fees',
    'Emergency Petty Cash',
    'Other Personal Need',
  ];

  // Export to Excel handler
  const handleExportExcel = () => {
    if (activeTab === 'payroll') {
      const headers = [
        'Staff Member',
        'Staff Code',
        'Role / Designation',
        'Branch Location',
        'Basic Wage (₹)',
        'Mid-Month Advances Deducted (₹)',
        'Balance Payable / Net Disbursed (₹)',
        'Status',
        'Payment Date',
        'Payment Method',
      ];

      const rows = filteredRecords.map((rec) => {
        const staff = staffList.find((s) => s.id === rec.staffId);
        const isPaid = isPaidRecord(rec);
        const totalAdvance = (rec.advances || []).reduce((sum, a) => sum + a.amount, 0);

        return [
          staff?.name || rec.staffName,
          staff?.staffCode || '—',
          staff?.designation || staff?.role || 'Staff',
          rec.branchName || 'Headquarters',
          rec.basicSalary,
          totalAdvance,
          rec.netSalary,
          isPaid ? 'PAID' : 'PENDING',
          rec.paymentDate || '—',
          rec.paymentMethod || '—',
        ];
      });

      const totalBasic = filteredRecords.reduce((sum, r) => sum + r.basicSalary, 0);
      const totalAdv = filteredRecords.reduce((sum, r) => sum + (r.advance || 0), 0);
      const totalNet = filteredRecords.reduce((sum, r) => sum + r.netSalary, 0);

      exportToExcel({
        filename: `Salary_Payroll_Register_${selectedMonth.replace(/\s+/g, '_')}_PetWorld`,
        sheetName: 'Payroll Register',
        title: 'THE PET WORLD - MONTHLY SALARY PAYROLL REGISTER',
        subtitle: `Period: ${selectedMonth} | Store: ${selectedBranch === 'ALL' ? 'All Branches' : selectedBranch}`,
        metadata: [
          { label: 'Settlement Period', value: selectedMonth },
          { label: 'Branch Filter', value: selectedBranch === 'ALL' ? 'All 6 Branches' : selectedBranch },
          { label: 'Enrolled Staff', value: `${filteredRecords.length} Employees` },
          { label: 'Exported Date', value: new Date().toLocaleDateString('en-IN') },
        ],
        headers,
        rows,
        summaryRows: [
          ['TOTALS', '', '', '', totalBasic, totalAdv, totalNet, '', '', ''],
        ],
      });
    } else {
      // Advances Ledger
      const headers = [
        'Staff Member',
        'Staff Code',
        'Branch Location',
        'Advance Amount (₹)',
        'Date Drawn',
        'Settlement Month',
        'Reason / Purpose',
        'Recovery Status',
        'Approved By',
      ];

      const rows = filteredAdvances.map((adv) => {
        const staff = staffList.find((s) => s.id === adv.staffId);
        const relatedRecord = filteredRecords.find((r) => r.staffId === adv.staffId);
        const recoveryStatus = isPaidRecord(relatedRecord) ? 'RECOVERED IN PAYROLL' : 'DEDUCTED FROM TAKE-HOME';

        return [
          adv.staffName,
          staff?.staffCode || '—',
          adv.branchName,
          adv.amount,
          adv.date,
          adv.month,
          adv.reason || 'Personal Expense',
          recoveryStatus,
          adv.approvedBy || 'Store Manager',
        ];
      });

      const totalAmt = filteredAdvances.reduce((sum, a) => sum + a.amount, 0);

      exportToExcel({
        filename: `Salary_Advances_Ledger_${selectedMonth.replace(/\s+/g, '_')}_PetWorld`,
        sheetName: 'Advances Ledger',
        title: 'THE PET WORLD - MID-MONTH SALARY ADVANCES AUDIT LEDGER',
        subtitle: `Period: ${selectedMonth} | Store: ${selectedBranch === 'ALL' ? 'All Branches' : selectedBranch}`,
        metadata: [
          { label: 'Settlement Month', value: selectedMonth },
          { label: 'Branch Filter', value: selectedBranch === 'ALL' ? 'All 6 Branches' : selectedBranch },
          { label: 'Total Advance Draws', value: `${filteredAdvances.length} transactions` },
        ],
        headers,
        rows,
        summaryRows: [
          ['TOTAL ADVANCES DISBURSED', '', '', totalAmt, '', '', '', '', ''],
        ],
      });
    }
  };

  // Export to PDF handler
  const handleExportPDF = () => {
    if (activeTab === 'payroll') {
      const headers = [
        'Staff Member',
        'Staff Code',
        'Role',
        'Branch',
        'Basic Wage',
        'Mid-Month Advances',
        'Balance Payable',
        'Status',
        'Payment Ref',
      ];

      const rows = filteredRecords.map((rec) => {
        const staff = staffList.find((s) => s.id === rec.staffId);
        const isPaid = isPaidRecord(rec);
        const totalAdvance = (rec.advances || []).reduce((sum, a) => sum + a.amount, 0);

        return [
          staff?.name || rec.staffName,
          staff?.staffCode || '—',
          staff?.designation || staff?.role || 'Staff',
          rec.branchName || 'Headquarters',
          formatINR(rec.basicSalary),
          totalAdvance > 0 ? `-${formatINR(totalAdvance)}` : '₹0',
          formatINR(rec.netSalary),
          isPaid ? 'PAID' : 'PENDING',
          rec.paymentMethod ? `${rec.paymentMethod}${rec.paymentDate ? ` (${rec.paymentDate})` : ''}` : '—',
        ];
      });

      const totalBasic = filteredRecords.reduce((sum, r) => sum + r.basicSalary, 0);
      const totalAdv = filteredRecords.reduce((sum, r) => sum + (r.advance || 0), 0);
      const totalNet = filteredRecords.reduce((sum, r) => sum + r.netSalary, 0);
      const paidCount = filteredRecords.filter(isPaidRecord).length;

      exportToPDF({
        title: 'Monthly Salary Payroll Register & Settlement Statement',
        subtitle: `Official month-end compensation audit and advance reconciliation`,
        metadata: [
          { label: 'Payroll Period', value: selectedMonth },
          { label: 'Store Location', value: selectedBranch === 'ALL' ? 'All Branches (Consolidated)' : selectedBranch },
          { label: 'Enrolled Employees', value: `${filteredRecords.length} Staff` },
        ],
        kpis: [
          { label: 'Total Basic Wages', value: formatINR(totalBasic), subtext: `${filteredRecords.length} Staff Enrolled` },
          { label: 'Mid-Month Advances Deducted', value: formatINR(totalAdv), subtext: `${monthAdvances.length} Draws Recovered` },
          { label: 'Net Disbursable / Paid', value: formatINR(totalNet), subtext: `${paidCount} of ${filteredRecords.length} Settled` },
          { label: 'Settlement Status', value: `${Math.round((paidCount / (filteredRecords.length || 1)) * 100)}% Complete`, subtext: `${filteredRecords.length - paidCount} Pending Payment` },
        ],
        headers,
        rows,
        summaryRow: [
          'TOTALS',
          '',
          '',
          '',
          formatINR(totalBasic),
          `-${formatINR(totalAdv)}`,
          formatINR(totalNet),
          `${paidCount}/${filteredRecords.length} Paid`,
          '',
        ],
        alignments: ['left', 'left', 'left', 'left', 'right', 'right', 'right', 'center', 'left'],
        orientation: 'landscape',
        footnote: 'All salary payments are subject to internal audit and statutory compliance verification. Advances have been reconciled per staff authorization.',
      });
    } else {
      // Advances Ledger PDF
      const headers = [
        'Staff Member',
        'Staff Code',
        'Branch Location',
        'Advance Amount',
        'Date Drawn',
        'Settlement Month',
        'Reason / Purpose',
        'Status',
        'Approved By',
      ];

      const rows = filteredAdvances.map((adv) => {
        const staff = staffList.find((s) => s.id === adv.staffId);
        const relatedRecord = filteredRecords.find((r) => r.staffId === adv.staffId);
        const recoveryStatus = isPaidRecord(relatedRecord) ? 'RECOVERED' : 'DEDUCTED';

        return [
          adv.staffName,
          staff?.staffCode || '—',
          adv.branchName,
          formatINR(adv.amount),
          adv.date,
          adv.month,
          adv.reason || 'Personal Expense',
          recoveryStatus,
          adv.approvedBy || 'Store Manager',
        ];
      });

      const totalAmt = filteredAdvances.reduce((sum, a) => sum + a.amount, 0);

      exportToPDF({
        title: 'Mid-Month Staff Advances & Drawings Audit Ledger',
        subtitle: 'Itemized record of salary advances disbursed prior to month-end settlement',
        metadata: [
          { label: 'Accounting Month', value: selectedMonth },
          { label: 'Store Location', value: selectedBranch === 'ALL' ? 'All Branches' : selectedBranch },
          { label: 'Total Draw Transactions', value: `${filteredAdvances.length} records` },
        ],
        kpis: [
          { label: 'Total Advances Disbursed', value: formatINR(totalAmt), subtext: `${filteredAdvances.length} Draws Logged` },
          { label: 'Staff Count', value: `${new Set(filteredAdvances.map(a => a.staffId)).size} Employees` },
        ],
        headers,
        rows,
        summaryRow: ['TOTAL ADVANCES', '', '', formatINR(totalAmt), '', '', '', '', ''],
        alignments: ['left', 'left', 'left', 'right', 'center', 'center', 'left', 'center', 'left'],
        orientation: 'landscape',
        footnote: 'Advances are automatically reconciled and deducted against basic wages during month-end payroll settlement.',
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#F5F2ED] border border-[#EAE7E0] text-[#D97757] text-[11px] sm:text-xs font-semibold mb-1.5 sm:mb-2">
            <PawIcon className="w-3.5 h-3.5" />
            <span>Payroll & Advance Tracking Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] font-serif tracking-tight">
            Salary & Mid-Month Advance Management
          </h1>
          <p className="text-xs text-[#666666] mt-0.5 leading-relaxed">
            Log mid-month cash/UPI draws effortlessly; all advances are auto-calculated and deducted at month-end settlement
          </p>
        </div>

        {/* Header Actions: Month Selector, Quick Advance Logging & Export Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <Calendar className="w-4 h-4 text-[#666666] shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs font-bold text-[#1A1A1A] shadow-2xs focus:ring-2 focus:ring-[#D97757] focus:outline-hidden cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Export & Delete buttons */}
            <div className="flex items-center gap-1.5">
              {activeTab === 'payroll' && isAuthorizedToDelete && onDeleteSalary && filteredRecords.length > 0 && (
                <button
                  onClick={handleDeleteFilteredSalaries}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold text-red-700 shadow-2xs transition-all cursor-pointer"
                  title="Delete all currently filtered payroll records"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="hidden sm:inline">Delete Filtered ({filteredRecords.length})</span>
                  <span className="sm:hidden">Del ({filteredRecords.length})</span>
                </button>
              )}

              {activeTab === 'advances' && isAuthorizedToDelete && onDeleteAdvance && filteredAdvances.length > 0 && (
                <button
                  onClick={handleDeleteFilteredAdvances}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold text-red-700 shadow-2xs transition-all cursor-pointer"
                  title="Delete all currently filtered advance drawings"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="hidden sm:inline">Delete Filtered ({filteredAdvances.length})</span>
                  <span className="sm:hidden">Del ({filteredAdvances.length})</span>
                </button>
              )}

              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white border border-[#EAE7E0] hover:bg-[#FAF8F5] text-xs font-bold text-[#1A1A1A] shadow-2xs transition-all cursor-pointer"
                title="Export to Excel spreadsheet (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white border border-[#EAE7E0] hover:bg-[#FAF8F5] text-xs font-bold text-[#1A1A1A] shadow-2xs transition-all cursor-pointer"
                title="Export to printable PDF report"
              >
                <Printer className="w-3.5 h-3.5 text-[#D97757]" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => handleOpenAddAdvance()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#D97757] hover:bg-[#c26547] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <HandCoins className="w-4 h-4" />
            <span>Record Mid-Month Advance</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 border shadow-2xs transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-[#F5F2ED] text-[#7A8C7B] border-[#7A8C7B]'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#7A8C7B]" />
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="p-1 cursor-pointer hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs: Payroll Register vs. Advances Ledger (Optimized for Mobile) */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#F5F2ED] border border-[#EAE7E0] sm:flex sm:items-center sm:gap-2 sm:p-0 sm:border-0 sm:border-b sm:bg-transparent sm:rounded-none sm:pb-2">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 ${
            activeTab === 'payroll'
              ? 'bg-[#1A1A1A] text-white shadow-2xs'
              : 'text-[#666666] hover:bg-[#FAF8F5] hover:text-[#1A1A1A]'
          }`}
        >
          <Banknote className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Monthly Payroll Register ({filteredRecords.length})</span>
          <span className="sm:hidden">Payroll ({filteredRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 ${
            activeTab === 'advances'
              ? 'bg-[#D97757] text-white shadow-2xs'
              : 'text-[#666666] hover:bg-[#FAF8F5] hover:text-[#1A1A1A]'
          }`}
        >
          <HandCoins className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Mid-Month Advances Ledger ({filteredAdvances.length})</span>
          <span className="sm:hidden">Advances ({filteredAdvances.length})</span>
          {monthAdvances.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'advances' ? 'bg-white/20 text-white' : 'bg-[#D97757]/15 text-[#D97757]'
            }`}>
              {formatINR(totalAdvancesDeducted)}
            </span>
          )}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#EAE7E0] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-[#1A1A1A] shrink-0">Store:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] text-xs font-semibold text-[#1A1A1A] focus:ring-2 focus:ring-[#D97757] focus:outline-hidden"
          >
            <option value="ALL">All 6 Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#888888]" />
          <input
            type="text"
            placeholder={
              activeTab === 'payroll'
                ? 'Search employee or branch...'
                : 'Search advance reason, staff name...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] text-xs text-[#1A1A1A] focus:ring-2 focus:ring-[#D97757] focus:outline-hidden"
          />
        </div>
      </div>

      {/* TAB 1: MONTHLY PAYROLL REGISTER */}
      {activeTab === 'payroll' && (
        <div className="rounded-2xl bg-white border border-[#EAE7E0] shadow-2xs overflow-hidden">
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1A1A1A]">
              <thead className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Branch Location</th>
                  <th className="px-4 py-3 text-right">Basic Wage</th>
                  <th className="px-4 py-3 text-right bg-[#FAF8F5] border-x border-[#EAE7E0] text-[#D97757]">
                    Mid-Month Advances
                  </th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7E0]">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <PetEmptyState
                        title="No payroll records found"
                        description="No payroll records found for the selected month and branch."
                        avatar="hamster"
                      />
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => {
                    const staff = staffList.find((s) => s.id === rec.staffId);
                    const isPaid = isPaidRecord(rec);
                    const staffDraws = rec.advances || [];
                    const hasAdvances = staffDraws.length > 0;

                    return (
                      <tr key={rec.id} className="hover:bg-[#FAF8F5] transition-colors">
                        {/* Employee */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {staff && <PetAvatar type={staff.avatarType} size="sm" />}
                            <div>
                              <span className="font-bold text-[#1A1A1A] block">{rec.staffName}</span>
                              <span className="text-[10px] text-[#666666]">{staff?.designation || 'Staff'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Branch */}
                        <td className="px-4 py-3 text-[#666666] font-medium">{rec.branchName}</td>

                        {/* Basic Wage */}
                        <td className="px-4 py-3 text-right font-medium text-[#1A1A1A]">{formatINR(rec.basicSalary)}</td>

                        {/* Mid-Month Advances (HIGHLIGHTED AUDIT COLUMN) */}
                        <td className="px-4 py-3 text-right bg-[#FAF8F5] border-x border-[#EAE7E0]">
                          {hasAdvances ? (
                            <button
                              onClick={() => setInspectingAdvancesStaff(rec)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#D97757]/10 hover:bg-[#D97757]/20 text-[#D97757] font-bold text-xs transition-colors cursor-pointer border border-[#D97757]/30"
                              title="Click to view all itemized mid-month advance draws"
                            >
                              <HandCoins className="w-3.5 h-3.5" />
                              <span>-{formatINR(rec.advance)}</span>
                              <span className="text-[10px] px-1 rounded-md bg-[#D97757] text-white">
                                {staffDraws.length} {staffDraws.length === 1 ? 'draw' : 'draws'}
                              </span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[#888888] font-medium">₹0</span>
                              <button
                                onClick={() => handleOpenAddAdvance(rec.staffId)}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-[#D97757] hover:bg-[#F5F2ED] cursor-pointer"
                                title="Record an advance for this staff member"
                              >
                                + Draw
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                              isPaid
                                ? 'bg-[#F5F2ED] text-[#7A8C7B] border-[#7A8C7B]'
                                : 'bg-[#F5F2ED] text-[#D97757] border-[#D97757]'
                            }`}
                          >
                            {isPaid ? 'PAID' : 'PENDING'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setActivePayslip(rec)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F5F2ED] hover:bg-[#EAE7E0] text-[#1A1A1A] text-xs font-semibold transition-colors cursor-pointer border border-[#EAE7E0]"
                              title="View Printable Payslip"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#D97757]" />
                              <span>Slip</span>
                            </button>

                            {!isPaid && (
                              <button
                                onClick={() => handleOpenDisburseModal(rec)}
                                disabled={loading}
                                className="px-2.5 py-1 rounded-xl bg-[#7A8C7B] hover:bg-[#687a69] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs flex items-center gap-1"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>Disburse</span>
                              </button>
                            )}

                            {isAuthorizedToDelete && onDeleteSalary && (
                              <button
                                onClick={() => handleDeleteSalaryRecord(rec.id, rec.staffName, rec.month)}
                                disabled={loading}
                                className="p-1.5 rounded-xl text-[#888888] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                title="Delete this salary record"
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

          {/* MOBILE CARD VIEW FOR PAYROLL */}
          <div className="md:hidden divide-y divide-[#EAE7E0]">
            {filteredRecords.length === 0 ? (
              <div className="py-10 px-4">
                <PetEmptyState
                  title="No payroll records found"
                  description="No payroll records found for the selected month and branch."
                  avatar="hamster"
                />
              </div>
            ) : (
              filteredRecords.map((rec) => {
                const staff = staffList.find((s) => s.id === rec.staffId);
                const isPaid = isPaidRecord(rec);
                const staffDraws = rec.advances || [];
                const hasAdvances = staffDraws.length > 0;
                const netPay = rec.netSalary ?? Math.max(0, (rec.basicSalary || 0) - (rec.advance || 0));

                return (
                  <div key={rec.id} className="p-3.5 space-y-2.5 bg-white hover:bg-[#FAF8F5]/60 transition-colors">
                    {/* Top line: Staff & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {staff && <PetAvatar type={staff.avatarType} size="sm" />}
                        <div className="min-w-0">
                          <span className="font-bold text-xs sm:text-sm text-[#1A1A1A] block truncate">
                            {rec.staffName}
                          </span>
                          <span className="text-[11px] text-[#666666] block">
                            {staff?.designation || 'Staff'} • {rec.branchName}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                          isPaid
                            ? 'bg-[#F5F2ED] text-[#7A8C7B] border-[#7A8C7B]'
                            : 'bg-[#F5F2ED] text-[#D97757] border-[#D97757]'
                        }`}
                      >
                        {isPaid ? 'PAID' : 'PENDING'}
                      </span>
                    </div>

                    {/* Middle grid: Basic, Advance, Net */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE7E0] text-xs">
                      <div>
                        <span className="text-[10px] text-[#666666] block">Basic</span>
                        <span className="font-bold text-[#1A1A1A]">{formatINR(rec.basicSalary)}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#D97757] block">Advances</span>
                        {hasAdvances ? (
                          <button
                            onClick={() => setInspectingAdvancesStaff(rec)}
                            className="font-bold text-[#D97757] underline decoration-dotted text-left"
                            title="View advance draws"
                          >
                            -{formatINR(rec.advance)} ({staffDraws.length})
                          </button>
                        ) : (
                          <span className="text-[#888888] font-medium">₹0</span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[#7A8C7B] block">Net Payable</span>
                        <span className="font-bold text-[#1A1A1A] font-serif">{formatINR(netPay)}</span>
                      </div>
                    </div>

                    {/* Bottom Action buttons */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActivePayslip(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F5F2ED] hover:bg-[#EAE7E0] text-[#1A1A1A] text-xs font-semibold border border-[#EAE7E0] transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#D97757]" />
                          <span>Payslip</span>
                        </button>

                        {!hasAdvances && (
                          <button
                            onClick={() => handleOpenAddAdvance(rec.staffId)}
                            className="px-2 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F5F2ED] text-[11px] font-semibold text-[#D97757] border border-[#EAE7E0]"
                          >
                            + Draw
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isPaid && (
                          <button
                            onClick={() => handleOpenDisburseModal(rec)}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-xl bg-[#7A8C7B] hover:bg-[#687a69] text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Disburse</span>
                          </button>
                        )}

                        {isAuthorizedToDelete && onDeleteSalary && (
                          <button
                            onClick={() => handleDeleteSalaryRecord(rec.id, rec.staffName, rec.month)}
                            disabled={loading}
                            className="p-1.5 rounded-xl text-[#888888] hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                            title="Delete salary record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MID-MONTH ADVANCES LEDGER */}
      {activeTab === 'advances' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0]">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#1A1A1A] flex items-center gap-1.5 sm:gap-2">
                <HandCoins className="w-4 h-4 text-[#D97757] shrink-0" />
                <span>Advances for {selectedMonth}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-[#666666] mt-0.5">
                Logged cash/UPI draws automatically deducted at month-end settlement
              </p>
            </div>
            <button
              onClick={() => handleOpenAddAdvance()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D97757] text-white text-xs font-bold shadow-2xs hover:bg-[#c26547] cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Advance</span>
            </button>
          </div>

          <div className="rounded-2xl bg-white border border-[#EAE7E0] shadow-2xs overflow-hidden">
            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1A1A1A]">
                <thead className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Branch Location</th>
                    <th className="px-4 py-3 text-right">Advance Amount</th>
                    <th className="px-4 py-3">Reason / Category</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Receipt / Notes</th>
                    <th className="px-4 py-3">Approved By</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE7E0]">
                  {filteredAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12">
                        <PetEmptyState
                          title="No advances recorded"
                          description="No mid-month advances found for the selected month and branch."
                          avatar="cat"
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredAdvances.map((adv) => {
                      const staff = staffList.find((s) => s.id === adv.staffId);
                      return (
                        <tr key={adv.id} className="hover:bg-[#FAF8F5] transition-colors">
                          <td className="px-4 py-3 font-semibold text-[#1A1A1A] whitespace-nowrap">
                            {adv.date}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {staff && <PetAvatar type={staff.avatarType} size="sm" />}
                              <div>
                                <span className="font-bold text-[#1A1A1A] block">{adv.staffName}</span>
                                <span className="text-[10px] text-[#666666]">{staff?.designation || 'Staff'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#666666] font-medium">{adv.branchName}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#D97757] text-sm font-serif">
                            {formatINR(adv.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F2ED] text-[#1A1A1A] border border-[#EAE7E0]">
                              {adv.reason}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-semibold text-[#5A5A40]">
                              {adv.paymentMode}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#666666] max-w-[200px]">
                            {adv.receiptNumber && (
                              <span className="font-mono text-[10px] text-[#888888] block">
                                {adv.receiptNumber}
                              </span>
                            )}
                            <span className="truncate block" title={adv.notes}>
                              {adv.notes || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#666666] text-[11px]">
                            {adv.approvedBy || 'Owner'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteAdvanceItem(adv.id, adv.staffName, adv.amount)}
                              className="p-1.5 rounded-lg text-[#888888] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete this advance entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW FOR ADVANCES */}
            <div className="md:hidden divide-y divide-[#EAE7E0]">
              {filteredAdvances.length === 0 ? (
                <div className="py-10 px-4">
                  <PetEmptyState
                    title="No advances recorded"
                    description="No mid-month advances found for the selected month and branch."
                    avatar="cat"
                  />
                </div>
              ) : (
                filteredAdvances.map((adv) => {
                  const staff = staffList.find((s) => s.id === adv.staffId);
                  return (
                    <div key={adv.id} className="p-3.5 space-y-2 bg-white hover:bg-[#FAF8F5]/60 transition-colors">
                      {/* Top line: staff, date, and amount */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {staff && <PetAvatar type={staff.avatarType} size="sm" />}
                          <div className="min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-[#1A1A1A] block truncate">
                              {adv.staffName}
                            </span>
                            <span className="text-[11px] text-[#666666] block">
                              {adv.date} • {adv.branchName}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-sm text-[#D97757] font-serif block">
                            {formatINR(adv.amount)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F5F2ED] text-[#5A5A40] font-semibold border border-[#EAE7E0] inline-block">
                            {adv.paymentMode}
                          </span>
                        </div>
                      </div>

                      {/* Reason & notes */}
                      <div className="flex items-center justify-between gap-2 text-xs pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F5F2ED] text-[#1A1A1A] border border-[#EAE7E0]">
                            {adv.reason}
                          </span>
                          {adv.receiptNumber && (
                            <span className="text-[10px] font-mono text-[#888888]">
                              #{adv.receiptNumber}
                            </span>
                          )}
                          {adv.notes && (
                            <span className="text-[11px] text-[#666666] truncate max-w-[140px]" title={adv.notes}>
                              {adv.notes}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-[#888888]">
                            By {adv.approvedBy || 'Owner'}
                          </span>
                          <button
                            onClick={() => handleDeleteAdvanceItem(adv.id, adv.staffName, adv.amount)}
                            className="p-1 rounded-md text-[#888888] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete this advance entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECORD MID-MONTH ADVANCE MODAL */}
      {showAddAdvanceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl p-6 text-[#1A1A1A]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE7E0] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#D97757] flex items-center justify-center border border-[#D97757]/20">
                  <HandCoins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-[#1A1A1A]">Record Mid-Month Staff Advance</h3>
                  <p className="text-[11px] text-[#666666]">Period: {selectedMonth}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddAdvanceModal(false)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#F5F2ED] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} className="space-y-4">
              {/* Staff Member Selection */}
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newAdvanceStaffId}
                  onChange={(e) => setNewAdvanceStaffId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] text-xs font-semibold text-[#1A1A1A] focus:ring-2 focus:ring-[#D97757] focus:outline-hidden"
                >
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — {st.designation} ({st.branchName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                    Advance Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-[#666666]">₹</span>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      placeholder="e.g. 2000"
                      value={newAdvanceAmount}
                      onChange={(e) => setNewAdvanceAmount(e.target.value)}
                      required
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] text-xs font-bold text-[#1A1A1A] focus:ring-2 focus:ring-[#D97757] focus:outline-hidden"
                    />
                  </div>
                  {/* Quick amount suggestion chips */}
                  <div className="flex gap-1.5 mt-1.5">
                    {[1000, 2000, 3000, 5000].map((chip) => (
                      <button
                        type="button"
                        key={chip}
                        onClick={() => setNewAdvanceAmount(chip.toString())}
                        className="px-2 py-0.5 rounded-lg bg-[#F5F2ED] hover:bg-[#EAE7E0] text-[10px] font-bold text-[#1A1A1A] cursor-pointer"
                      >
                        +{chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                    Date of Withdrawal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newAdvanceDate}
                    onChange={(e) => setNewAdvanceDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] text-xs font-medium text-[#1A1A1A] focus:ring-2 focus:ring-[#D97757] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Reason / Category */}
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                  Reason / Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newAdvanceReason}
                  onChange={(e) => setNewAdvanceReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] text-xs font-semibold text-[#1A1A1A] focus:ring-2 focus:ring-[#D97757] focus:outline-hidden"
                >
                  {advanceReasonOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes / Details */}
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                  Purpose Notes & Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. Urgent medicines for family, scooter brake repair, train pass"
                  value={newAdvanceNotes}
                  onChange={(e) => setNewAdvanceNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] text-xs text-[#1A1A1A] focus:ring-2 focus:ring-[#D97757] focus:outline-hidden"
                />
              </div>

              {/* Payment Mode & Voucher Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                    Paid Out Via
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Cash', 'UPI', 'Bank Transfer'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setNewAdvancePaymentMode(mode)}
                        className={`py-1.5 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                          newAdvancePaymentMode === mode
                            ? 'bg-[#D97757] text-white border-[#D97757]'
                            : 'bg-[#FAF8F5] text-[#666666] border-[#EAE7E0] hover:bg-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                    Receipt / Voucher No.
                  </label>
                  <input
                    type="text"
                    value={newAdvanceReceipt}
                    onChange={(e) => setNewAdvanceReceipt(e.target.value)}
                    placeholder="ADV-001"
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#FAF8F5] text-xs font-mono text-[#1A1A1A] focus:ring-2 focus:ring-[#D97757] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Live Impact Preview Card */}
              {selectedStaffForAdvance && (
                <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] text-xs space-y-1">
                  <div className="flex justify-between text-[#666666]">
                    <span>Staff Basic Pay:</span>
                    <span className="font-semibold text-[#1A1A1A]">{formatINR(selectedStaffForAdvance.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between text-[#666666]">
                    <span>Already Withdrawn This Month:</span>
                    <span className="font-semibold text-[#D97757]">{formatINR(currentExistingAdvanceForStaff)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#1A1A1A] pt-1 border-t border-[#EAE7E0]">
                    <span>New Total Advance Deduction:</span>
                    <span className="text-[#D97757]">
                      {formatINR(currentExistingAdvanceForStaff + (Number(newAdvanceAmount) || 0))}
                    </span>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAdvanceModal(false)}
                  className="flex-1 py-2 rounded-xl border border-[#EAE7E0] text-xs font-semibold text-[#666666] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-[#D97757] hover:bg-[#c26547] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <HandCoins className="w-4 h-4" />
                  <span>{loading ? 'Saving Advance...' : 'Record Advance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ITEMIZED ADVANCE DRAWS AUDIT MODAL (Inspecting a staff member's multiple advances) */}
      {inspectingAdvancesStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl p-6 text-[#1A1A1A]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE7E0] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FAF8F5] text-[#D97757] flex items-center justify-center border border-[#D97757]/20">
                  <HandCoins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-serif text-[#1A1A1A]">
                    Mid-Month Advance Ledger
                  </h3>
                  <p className="text-[11px] text-[#666666]">
                    {inspectingAdvancesStaff.staffName} ({selectedMonth})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingAdvancesStaff(null)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#F5F2ED] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Summary Bar */}
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#666666] block">Total Deducted:</span>
                  <strong className="text-base text-[#D97757] font-serif">
                    {formatINR(inspectingAdvancesStaff.advance)}
                  </strong>
                </div>
                <button
                  onClick={() => {
                    const sid = inspectingAdvancesStaff.staffId;
                    setInspectingAdvancesStaff(null);
                    handleOpenAddAdvance(sid);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D97757] text-white text-xs font-bold hover:bg-[#c26547] cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add Another</span>
                </button>
              </div>

              {/* List of individual draws */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(inspectingAdvancesStaff.advances || []).map((draw) => (
                  <div
                    key={draw.id}
                    className="p-3 rounded-2xl bg-white border border-[#EAE7E0] hover:border-[#D97757]/40 shadow-2xs flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1A1A1A]">{draw.reason}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#5A5A40] font-semibold border border-[#EAE7E0]">
                          {draw.paymentMode}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#666666]">
                        Date: <span className="font-medium text-[#1A1A1A]">{draw.date}</span>
                        {draw.notes && <span> • {draw.notes}</span>}
                      </div>
                      {draw.receiptNumber && (
                        <div className="text-[10px] font-mono text-[#888888]">
                          Ref: {draw.receiptNumber}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#D97757] font-serif whitespace-nowrap">
                        -{formatINR(draw.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteAdvanceItem(draw.id, draw.staffName, draw.amount)}
                        className="p-1 text-[#888888] hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Remove this draw"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => setInspectingAdvancesStaff(null)}
                  className="w-full py-2 rounded-xl bg-[#FAF8F5] hover:bg-[#EAE7E0] text-xs font-bold text-[#1A1A1A] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DISBURSE SALARY MODAL (MONTH-END SETTLEMENT AUDIT) */}
      {payingRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl p-6 text-[#1A1A1A]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE7E0] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#F5F2ED] text-[#7A8C7B] flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-[#1A1A1A]">Month-End Salary Settlement</h3>
                  <p className="text-[11px] text-[#666666]">
                    {payingRecord.staffName} • {payingRecord.month}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayingRecord(null)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#F5F2ED] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Calculation Breakdown */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] space-y-2 text-xs">
                <div className="flex justify-between text-[#666666]">
                  <span>Basic Wage:</span>
                  <span className="font-semibold text-[#1A1A1A]">{formatINR(payingRecord.basicSalary)}</span>
                </div>

                {/* Mid-Month Advances Itemized Section in Disburse Modal */}
                <div className="pt-2 border-t border-[#EAE7E0]">
                  <div className="flex items-center justify-between font-bold text-[#D97757] mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <HandCoins className="w-3.5 h-3.5" />
                      <span>Mid-Month Advances Deducted:</span>
                    </span>
                    <span className="font-serif">-{formatINR(payingRecord.advance)}</span>
                  </div>

                  {(payingRecord.advances && payingRecord.advances.length > 0) ? (
                    <div className="bg-white rounded-xl p-2.5 border border-[#D97757]/30 space-y-1.5 max-h-32 overflow-y-auto">
                      {payingRecord.advances.map((draw) => (
                        <div key={draw.id} className="flex justify-between items-center text-[11px] text-[#666666]">
                          <span>
                            <strong className="text-[#1A1A1A]">{draw.date}</strong>: {draw.reason} ({draw.paymentMode})
                            {draw.notes && <span className="italic text-[#888888]"> — {draw.notes}</span>}
                          </span>
                          <span className="font-bold text-[#D97757]">-{formatINR(draw.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#888888] italic">
                      No mid-month advances recorded for this period.
                    </div>
                  )}
                </div>

                {/* Final Net Amount */}
                <div className="flex justify-between items-center pt-2.5 border-t border-[#EAE7E0] text-sm font-bold font-serif">
                  <span className="text-[#1A1A1A]">Balance Payable to Disburse:</span>
                  <span className="text-lg text-[#7A8C7B] font-serif">{formatINR(payingRecord.netSalary)}</span>
                </div>
              </div>

              {/* Payment Channel Selection */}
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-2">
                  Select Settlement Channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Bank Transfer', 'UPI', 'Cash', 'Cheque'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        paymentMode === mode
                          ? 'border-[#7A8C7B] bg-[#F5F2ED] text-[#7A8C7B] font-bold shadow-2xs'
                          : 'border-[#EAE7E0] bg-white text-[#666666] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingRecord(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[#EAE7E0] text-xs font-semibold text-[#666666] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={loading}
                  className="flex-2 py-2.5 rounded-xl bg-[#7A8C7B] hover:bg-[#687a69] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Banknote className="w-4 h-4" />
                  <span>
                    {loading ? 'Processing...' : `Confirm & Disburse ${formatINR(payingRecord.netSalary)}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE PAYSLIP MODAL (WITH COMPLETE ADVANCE ITEMIZED AUDIT) */}
      {activePayslip && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl p-6 text-[#1A1A1A] print:max-h-none print:shadow-none print:border-none print:rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE7E0] mb-4 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                Salary Payslip
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D97757] text-white text-xs font-bold shadow-2xs cursor-pointer hover:bg-[#c26547] transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                {isAuthorizedToDelete && onDeleteSalary && (
                  <button
                    onClick={() => {
                      handleDeleteSalaryRecord(activePayslip.id, activePayslip.staffName, activePayslip.month);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                    title="Delete this salary record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
                <button onClick={() => setActivePayslip(null)} className="p-1 text-[#666666] hover:text-[#1A1A1A] cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Payslip Card */}
            <div className="space-y-4">
              <div className="text-center pb-3 border-b border-[#EAE7E0]">
                <div className="flex items-center justify-center gap-1.5 text-[#D97757] mb-1">
                  <PawIcon className="w-5 h-5" />
                  <span className="font-serif font-bold text-lg text-[#1A1A1A]">
                    PET WORLD
                  </span>
                </div>
                <h4 className="font-bold text-xs text-[#1A1A1A]">MONTHLY PAYSLIP - {activePayslip.month}</h4>
                <p className="text-[11px] text-[#666666]">{activePayslip.branchName}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 bg-[#FAF8F5] p-3 rounded-2xl border border-[#EAE7E0]">
                <div>
                  <span className="text-[10px] text-[#666666] block">Employee Name:</span>
                  <strong className="text-[#1A1A1A]">{activePayslip.staffName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#666666] block">Status:</span>
                  <strong className={isPaidRecord(activePayslip) ? 'text-[#7A8C7B]' : 'text-[#D97757]'}>
                    {isPaidRecord(activePayslip) ? 'PAID' : 'PENDING'}
                  </strong>
                </div>
                {activePayslip.paymentDate && (
                  <div>
                    <span className="text-[10px] text-[#666666] block">Paid On:</span>
                    <span>{activePayslip.paymentDate}</span>
                  </div>
                )}
                {(activePayslip.paymentMode || activePayslip.paymentMethod) && (
                  <div>
                    <span className="text-[10px] text-[#666666] block">Channel:</span>
                    <span>{activePayslip.paymentMode || activePayslip.paymentMethod}</span>
                  </div>
                )}
              </div>

              {/* Earnings & Recoveries */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-[#EAE7E0]">
                  <span className="text-[#666666]">Basic Wage:</span>
                  <span className="font-semibold text-[#1A1A1A]">{formatINR(activePayslip.basicSalary)}</span>
                </div>

                {/* Itemized Mid-Month Advance Recoveries */}
                {(activePayslip.advance || 0) > 0 && (
                  <div className="py-1.5 border-b border-[#EAE7E0] bg-[#FAF8F5] p-2 rounded-xl">
                    <div className="flex justify-between font-bold text-[#D97757] mb-1">
                      <span>Mid-Month Advances Deducted:</span>
                      <span>-{formatINR(activePayslip.advance)}</span>
                    </div>
                    {activePayslip.advances && activePayslip.advances.length > 0 && (
                      <div className="space-y-0.5 text-[10px] text-[#666666]">
                        {activePayslip.advances.map((draw) => (
                          <div key={draw.id} className="flex justify-between">
                            <span>
                              {draw.date} — {draw.reason}
                            </span>
                            <span className="font-semibold text-[#D97757]">-{formatINR(draw.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between py-2 text-base font-bold font-serif text-[#1A1A1A]">
                  <span>Balance Payable / Net Paid:</span>
                  <span className="text-[#D97757]">{formatINR(activePayslip.netSalary)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EAE7E0] text-[9px] text-[#888888] text-center">
                This is a computer-generated payslip issued by Pet World Retail Management. All mid-month advances verified.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
