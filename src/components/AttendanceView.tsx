import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  Download,
  Printer,
  BarChart3,
  LogIn,
  LogOut,
  X,
  Table as TableIcon,
  LayoutGrid,
  Check,
  Eye,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { AttendanceRecord, Branch, User, StaffMember, UserRole } from '../types.js';
import { exportToExcel, exportToPDF } from '../utils/exportUtils.js';

interface AttendanceViewProps {
  attendanceRecords: AttendanceRecord[];
  staffList?: StaffMember[];
  branches: Branch[];
  currentUser: User;
  onCheckIn: (remarks?: string) => Promise<any>;
  onCheckOut: () => Promise<any>;
  onCorrectAttendance: (id: string, updates: any) => Promise<any>;
  onUpsertAttendance?: (data: any) => Promise<any>;
  onDeleteAttendance?: (attendanceId: string) => Promise<any>;
}

const formatRole = (role: UserRole | string): string => {
  if (role === 'OWNER') return 'Owner';
  if (role === 'BRANCH_MANAGER') return 'Manager';
  if (role === 'CASHIER') return 'Cashier';
  if (role === 'SALES_STAFF') return 'Service Advisor';
  return role;
};

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  attendanceRecords,
  staffList = [],
  branches,
  currentUser,
  onCheckIn,
  onCheckOut,
  onCorrectAttendance,
  onUpsertAttendance,
  onDeleteAttendance,
}) => {
  const isOwner = currentUser.role === 'OWNER';

  // Navigation tab: 'monthly' | 'daily'
  const [hubTab, setHubTab] = useState<'monthly' | 'daily'>('monthly');

  // Month navigation: default to September 2026 (matching system date & user screenshot)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(8); // 8 is September (0-indexed)

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');

  // Daily timesheet date
  const [dailyDate, setDailyDate] = useState<string>('2026-09-12');

  // Cell edit modal state
  const [editingCell, setEditingCell] = useState<{
    staff: StaffMember;
    date: string;
    record?: AttendanceRecord;
  } | null>(null);

  // Staff individual analysis modal state
  const [selectedStaffAnalysis, setSelectedStaffAnalysis] = useState<StaffMember | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [punchLoading, setPunchLoading] = useState<boolean>(false);

  // Today's reference (2026-09-12 from environment)
  const todayDateStr = '2026-09-12';

  // Comprehensive staff list: ensure Owner (Vikram Singhania) and all staff exist with clean EMP codes
  const rosterStaff: StaffMember[] = useMemo(() => {
    const list: StaffMember[] = [];

    // Ensure Owner is present at top
    const ownerName = currentUser.name && currentUser.name !== 'Super Admin' ? currentUser.name : 'Vikram Singhania';
    const ownerStaff: StaffMember = {
      id: currentUser.id || 'usr-owner-001',
      staffCode: 'EMP-001',
      name: ownerName,
      avatarType: currentUser.avatarType || 'cat',
      phone: currentUser.phone || '+91 98200 11000',
      email: currentUser.email || 'vikram.singhania@petworld.co.in',
      designation: 'Owner & Director',
      role: 'OWNER',
      branchId: 'ALL',
      branchName: 'Headquarters',
      joiningDate: '2020-01-01',
      basicSalary: 95000,
      status: 'ACTIVE',
      username: currentUser.username || 'moinuddin',
    };
    list.push(ownerStaff);

    // Add remaining staff from staffList
    let counter = 2;
    staffList.forEach((s) => {
      // Avoid duplicate owner
      if (s.id === currentUser.id || s.name.toLowerCase() === ownerName.toLowerCase()) {
        return;
      }

      const empCode = s.staffCode && s.staffCode.startsWith('EMP-')
        ? s.staffCode
        : `EMP-${String(counter).padStart(3, '0')}`;
      counter++;

      list.push({
        ...s,
        staffCode: empCode,
      });
    });

    // If staffList is empty, seed clean demo staff matching screenshot
    if (list.length === 1) {
      list.push({
        id: 'staff-02',
        staffCode: 'EMP-002',
        name: 'Rajesh Kumar',
        avatarType: 'dog',
        phone: '+91 98201 22331',
        email: 'rajesh.kumar@petworld.co.in',
        designation: 'Branch Manager',
        role: 'BRANCH_MANAGER',
        branchId: 'branch-1',
        branchName: 'Pet World Downtown Flagship',
        joiningDate: '2021-03-15',
        basicSalary: 55000,
        status: 'ACTIVE',
        username: 'rajesh_k',
      });
      list.push({
        id: 'staff-03',
        staffCode: 'EMP-003',
        name: 'Vijay Sharma',
        avatarType: 'rabbit',
        phone: '+91 98202 33442',
        email: 'vijay.sharma@petworld.co.in',
        designation: 'Service Advisor',
        role: 'SALES_STAFF',
        branchId: 'branch-1',
        branchName: 'Pet World Downtown Flagship',
        joiningDate: '2022-06-10',
        basicSalary: 38000,
        status: 'ACTIVE',
        username: 'vijay_s',
      });
    }

    return list;
  }, [staffList, currentUser]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return rosterStaff.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const displayRole = formatRole(s.role);
        const matchName = s.name.toLowerCase().includes(q);
        const matchCode = (s.staffCode || '').toLowerCase().includes(q);
        const matchRole = displayRole.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchRole) return false;
      }
      return true;
    });
  }, [rosterStaff, searchQuery]);

  // Month days computation
  const monthData = useMemo(() => {
    const totalDays = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
    const days: {
      dayNumber: number;
      dayName: string;
      dateStr: string;
      isSunday: boolean;
      isToday: boolean;
    }[] = [];

    let workingDaysCount = 0;

    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(selectedYear, selectedMonthIndex, day);
      const isSunday = d.getDay() === 0;
      if (!isSunday) workingDaysCount++;

      const dateStr = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const isToday = dateStr === todayDateStr;

      days.push({
        dayNumber: day,
        dayName,
        dateStr,
        isSunday,
        isToday,
      });
    }

    const monthName = new Date(selectedYear, selectedMonthIndex, 1).toLocaleDateString('en-US', {
      month: 'long',
    });

    return {
      monthName,
      totalDays,
      workingDaysCount,
      days,
    };
  }, [selectedYear, selectedMonthIndex, todayDateStr]);

  // Attendance records map: `${staffId}_${date}` -> AttendanceRecord
  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((r) => {
      map.set(`${r.staffId}_${r.date}`, r);
    });
    return map;
  }, [attendanceRecords]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonthIndex(11);
    } else {
      setSelectedMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonthIndex(0);
    } else {
      setSelectedMonthIndex((prev) => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedYear(2026);
    setSelectedMonthIndex(8); // September 2026
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Staff Member',
      'Staff Code',
      'Role',
      'Branch',
      ...monthData.days.map((d) => `${d.dayNumber} ${d.dayName}`),
      'Total Present',
      'Total Late',
      'Total Half Day',
      'Total Absent',
      'Total Leave',
      'Working Hours Logged',
    ];

    const rows = filteredStaff.map((staff) => {
      let pCount = 0;
      let lCount = 0;
      let hdCount = 0;
      let aCount = 0;
      let lvCount = 0;
      let hrs = 0;

      const dayCells = monthData.days.map((d) => {
        if (d.isSunday) return 'OFF';
        const rec = attendanceMap.get(`${staff.id}_${d.dateStr}`);
        if (!rec) return '-';
        if (rec.status === 'PRESENT') {
          pCount++;
          hrs += 8;
          return 'P';
        }
        if (rec.status === 'LATE') {
          lCount++;
          hrs += 7.5;
          return 'L';
        }
        if (rec.status === 'HALF_DAY') {
          hdCount++;
          hrs += 4;
          return 'HD';
        }
        if (rec.status === 'ABSENT') {
          aCount++;
          return 'A';
        }
        if (rec.status === 'LEAVE') {
          lvCount++;
          return 'LV';
        }
        return '-';
      });

      return [
        `"${staff.name}"`,
        `"${staff.staffCode}"`,
        `"${staff.role}"`,
        `"${staff.branchName || 'Headquarters'}"`,
        ...dayCells,
        pCount,
        lCount,
        hdCount,
        aCount,
        lvCount,
        hrs,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Staff_Attendance_${monthData.monthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    const userBranch = branches.find((b) => b.id === currentUser.branchId);
    const storeLocation = userBranch ? userBranch.name : 'All Branches (Network)';

    const headers = [
      'Staff Member',
      'Staff Code',
      'Role',
      'Branch Location',
      ...monthData.days.map((d) => `${d.dayNumber} ${d.dayName}`),
      'Total Present',
      'Total Late',
      'Total Half Day',
      'Total Absent',
      'Total Leave',
      'Working Hours Logged',
    ];

    let grandTotalHrs = 0;
    let grandTotalPresent = 0;
    let grandTotalLate = 0;
    let grandTotalHalfDay = 0;
    let grandTotalAbsent = 0;
    let grandTotalLeave = 0;

    const rows = filteredStaff.map((staff) => {
      let pCount = 0;
      let lCount = 0;
      let hdCount = 0;
      let aCount = 0;
      let lvCount = 0;
      let hrs = 0;

      const dayCells = monthData.days.map((d) => {
        if (d.isSunday) return 'OFF';
        const rec = attendanceMap.get(`${staff.id}_${d.dateStr}`);
        if (!rec) return '-';
        if (rec.status === 'PRESENT') {
          pCount++;
          hrs += 8;
          return 'P';
        }
        if (rec.status === 'LATE') {
          lCount++;
          hrs += 7.5;
          return 'L';
        }
        if (rec.status === 'HALF_DAY') {
          hdCount++;
          hrs += 4;
          return 'HD';
        }
        if (rec.status === 'ABSENT') {
          aCount++;
          return 'A';
        }
        if (rec.status === 'LEAVE') {
          lvCount++;
          return 'LV';
        }
        return '-';
      });

      grandTotalPresent += pCount;
      grandTotalLate += lCount;
      grandTotalHalfDay += hdCount;
      grandTotalAbsent += aCount;
      grandTotalLeave += lvCount;
      grandTotalHrs += hrs;

      return [
        staff.name,
        staff.staffCode,
        staff.role,
        staff.branchName || 'Headquarters',
        ...dayCells,
        pCount,
        lCount,
        hdCount,
        aCount,
        lvCount,
        hrs,
      ];
    });

    const summaryDayBlanks = monthData.days.map(() => '');

    exportToExcel({
      filename: `Staff_Attendance_Matrix_${monthData.monthName}_${selectedYear}_PetWorld`,
      sheetName: 'Attendance Matrix',
      title: 'THE PET WORLD - MONTHLY STAFF ATTENDANCE REGISTER',
      subtitle: `Month: ${monthData.monthName} ${selectedYear} | Store: ${storeLocation}`,
      metadata: [
        { label: 'Attendance Period', value: `${monthData.monthName} ${selectedYear}` },
        { label: 'Branch / Network', value: storeLocation },
        { label: 'Total Enrolled Staff', value: `${filteredStaff.length} Employees` },
        { label: 'Working Days in Month', value: `${monthData.days.filter((d) => !d.isSunday).length} Days` },
      ],
      headers,
      rows,
      summaryRows: [
        [
          'TOTALS',
          '',
          '',
          '',
          ...summaryDayBlanks,
          grandTotalPresent,
          grandTotalLate,
          grandTotalHalfDay,
          grandTotalAbsent,
          grandTotalLeave,
          grandTotalHrs,
        ],
      ],
    });
  };

  // Export to PDF handler
  const handleExportPDF = () => {
    const userBranch = branches.find((b) => b.id === currentUser.branchId);
    const storeLocation = userBranch ? userBranch.name : 'All Branches (Network)';

    const headers = [
      'Staff Member',
      'Staff Code',
      'Role',
      'Branch',
      'Present (P)',
      'Late (L)',
      'Half Day (HD)',
      'Absent (A)',
      'Leave (LV)',
      'Total Hours',
      'Attendance %',
    ];

    const workingDaysCount = monthData.days.filter((d) => !d.isSunday).length || 1;
    let grandTotalHrs = 0;
    let grandTotalPresent = 0;
    let grandTotalLate = 0;
    let grandTotalHalfDay = 0;
    let grandTotalAbsent = 0;
    let grandTotalLeave = 0;

    const rows = filteredStaff.map((staff) => {
      let pCount = 0;
      let lCount = 0;
      let hdCount = 0;
      let aCount = 0;
      let lvCount = 0;
      let hrs = 0;

      monthData.days.forEach((d) => {
        if (d.isSunday) return;
        const rec = attendanceMap.get(`${staff.id}_${d.dateStr}`);
        if (!rec) return;
        if (rec.status === 'PRESENT') {
          pCount++;
          hrs += 8;
        } else if (rec.status === 'LATE') {
          lCount++;
          hrs += 7.5;
        } else if (rec.status === 'HALF_DAY') {
          hdCount++;
          hrs += 4;
        } else if (rec.status === 'ABSENT') {
          aCount++;
        } else if (rec.status === 'LEAVE') {
          lvCount++;
        }
      });

      grandTotalPresent += pCount;
      grandTotalLate += lCount;
      grandTotalHalfDay += hdCount;
      grandTotalAbsent += aCount;
      grandTotalLeave += lvCount;
      grandTotalHrs += hrs;

      const effectivePresent = pCount + lCount + hdCount * 0.5;
      const attRate = Math.min(100, Math.round((effectivePresent / workingDaysCount) * 100));

      return [
        staff.name,
        staff.staffCode,
        staff.role,
        staff.branchName || 'Headquarters',
        pCount,
        lCount,
        hdCount,
        aCount,
        lvCount,
        `${hrs} hrs`,
        `${attRate}%`,
      ];
    });

    const avgAtt = filteredStaff.length
      ? Math.round(
          ((grandTotalPresent + grandTotalLate + grandTotalHalfDay * 0.5) /
            (filteredStaff.length * workingDaysCount)) *
            100
        )
      : 0;

    exportToPDF({
      title: 'Monthly Staff Attendance & Duty Timesheet Report',
      subtitle: 'Official end-of-month attendance audit for payroll processing and HR records',
      metadata: [
        { label: 'Settlement Period', value: `${monthData.monthName} ${selectedYear}` },
        { label: 'Store Location', value: storeLocation },
        { label: 'Working Days', value: `${workingDaysCount} Days` },
      ],
      kpis: [
        { label: 'Active Staff Enrolled', value: `${filteredStaff.length} Employees`, subtext: 'Full active roster' },
        { label: 'Average Attendance', value: `${avgAtt}%`, subtext: 'Store network average' },
        { label: 'Total Duty Hours', value: `${grandTotalHrs} hrs`, subtext: `${grandTotalPresent} Present marks` },
        { label: 'Absence / Leave Total', value: `${grandTotalAbsent + grandTotalLeave} days`, subtext: `${grandTotalAbsent} A, ${grandTotalLeave} LV` },
      ],
      headers,
      rows,
      summaryRow: [
        'TOTALS',
        '',
        '',
        '',
        grandTotalPresent,
        grandTotalLate,
        grandTotalHalfDay,
        grandTotalAbsent,
        grandTotalLeave,
        `${grandTotalHrs} hrs`,
        `${avgAtt}% Avg`,
      ],
      alignments: ['left', 'left', 'left', 'left', 'center', 'center', 'center', 'center', 'center', 'right', 'right'],
      orientation: 'landscape',
      footnote: 'Attendance records are logged in real-time. Status legend: P = Present (8h), L = Late (7.5h), HD = Half Day (4h), A = Absent, LV = Approved Leave, OFF = Sunday Off.',
    });
  };

  // Print Handler
  const handlePrint = () => {
    handleExportPDF();
  };

  // Check in/out for current user
  const myTodayRecord = attendanceRecords.find(
    (r) => r.staffId === currentUser.id && r.date === todayDateStr
  );

  const handleSelfPunchIn = async () => {
    setPunchLoading(true);
    try {
      await onCheckIn('Self punch-in recorded from Hub');
    } catch (err: any) {
      alert('Punch-in failed: ' + err.message);
    } finally {
      setPunchLoading(false);
    }
  };

  const handleSelfPunchOut = async () => {
    setPunchLoading(true);
    try {
      await onCheckOut();
    } catch (err: any) {
      alert('Punch-out failed: ' + err.message);
    } finally {
      setPunchLoading(false);
    }
  };

  // Handle saving attendance from modal
  const handleSaveAttendance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCell) return;
    const form = new FormData(e.currentTarget);
    const status = form.get('status') as any;
    const checkInTime = form.get('checkInTime') as string;
    const checkOutTime = form.get('checkOutTime') as string;
    const branchId = form.get('branchId') as string;
    const remarks = form.get('remarks') as string;

    const branch = branches.find((b) => b.id === branchId);

    setSaving(true);
    try {
      if (onUpsertAttendance) {
        await onUpsertAttendance({
          staffId: editingCell.staff.id,
          staffName: editingCell.staff.name,
          branchId: branchId || editingCell.staff.branchId,
          branchName: branch?.name || editingCell.staff.branchName,
          date: editingCell.date,
          status,
          checkInTime: checkInTime || (status === 'PRESENT' ? '09:30 AM' : '-'),
          checkOutTime: checkOutTime || (status === 'PRESENT' ? '06:30 PM' : '-'),
          remarks,
        });
      } else if (editingCell.record) {
        await onCorrectAttendance(editingCell.record.id, {
          status,
          checkInTime,
          checkOutTime,
          remarks,
        });
      }
      setEditingCell(null);
    } catch (err: any) {
      alert('Failed to save attendance: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const isAuthorizedToDelete = currentUser.role === 'OWNER' || currentUser.role === 'BRANCH_MANAGER';

  // Filtered monthly attendance records
  const filteredMonthlyAttendanceRecords = useMemo(() => {
    const monthPrefix = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;
    const staffIdSet = new Set(filteredStaff.map((s) => s.id));
    return attendanceRecords.filter((r) => r.date.startsWith(monthPrefix) && staffIdSet.has(r.staffId));
  }, [attendanceRecords, selectedYear, selectedMonthIndex, filteredStaff]);

  // Filtered daily attendance records
  const filteredDailyAttendanceRecords = useMemo(() => {
    return filteredStaff
      .map((s) => attendanceMap.get(`${s.id}_${dailyDate}`))
      .filter((r): r is AttendanceRecord => Boolean(r && r.id));
  }, [filteredStaff, attendanceMap, dailyDate]);

  const handleDeleteAttendanceRecord = async (recordId: string) => {
    if (!onDeleteAttendance) return;
    if (!window.confirm('Are you sure you want to permanently delete this attendance record?')) return;
    setSaving(true);
    try {
      await onDeleteAttendance(recordId);
      if (editingCell?.record?.id === recordId) {
        setEditingCell(null);
      }
    } catch (err: any) {
      alert('Failed to delete attendance record: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFilteredDailyAttendance = async () => {
    if (!onDeleteAttendance || filteredDailyAttendanceRecords.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete all ${filteredDailyAttendanceRecords.length} attendance record(s) for ${dailyDate}? This action cannot be undone.`
      )
    ) {
      return;
    }
    setSaving(true);
    let deletedCount = 0;
    try {
      for (const rec of filteredDailyAttendanceRecords) {
        try {
          await onDeleteAttendance(rec.id);
          deletedCount++;
        } catch (e) {
          console.error(`Failed to delete attendance ${rec.id}:`, e);
        }
      }
      alert(`Successfully deleted ${deletedCount} daily attendance record(s).`);
    } catch (err: any) {
      alert('Error deleting attendance records: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFilteredMonthlyAttendance = async () => {
    if (!onDeleteAttendance || filteredMonthlyAttendanceRecords.length === 0) return;
    const monthLabel = `${monthData.monthName} ${selectedYear}`;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete all ${filteredMonthlyAttendanceRecords.length} attendance record(s) for ${monthLabel}? This action cannot be undone.`
      )
    ) {
      return;
    }
    setSaving(true);
    let deletedCount = 0;
    try {
      for (const rec of filteredMonthlyAttendanceRecords) {
        try {
          await onDeleteAttendance(rec.id);
          deletedCount++;
        } catch (e) {
          console.error(`Failed to delete attendance ${rec.id}:`, e);
        }
      }
      alert(`Successfully deleted ${deletedCount} attendance record(s) for ${monthLabel}.`);
    } catch (err: any) {
      alert('Error deleting attendance records: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportDailyExcel = () => {
    const headers = [
      'Staff Code',
      'Staff Name',
      'Role',
      'Branch',
      'Date',
      'Check In',
      'Check Out',
      'Status',
      'Remarks',
    ];
    const rows = filteredStaff.map((staff) => {
      const rec = attendanceMap.get(`${staff.id}_${dailyDate}`);
      return [
        staff.staffCode,
        staff.name,
        formatRole(staff.role),
        staff.branchName || 'Headquarters',
        dailyDate,
        rec?.checkInTime || rec?.loginTime || '--:--',
        rec?.checkOutTime || rec?.logoutTime || '--:--',
        rec?.status || 'Not Marked',
        rec?.remarks || '',
      ];
    });

    exportToExcel({
      filename: `petworld_daily_attendance_${dailyDate}`,
      sheetName: 'Daily Timesheet',
      title: `THE PET WORLD - Daily Attendance Timesheet`,
      subtitle: `Date: ${dailyDate} | Total Staff: ${filteredStaff.length}`,
      metadata: [
        { label: 'Generated Date', value: new Date().toLocaleString('en-IN') },
        { label: 'Generated By', value: `${currentUser.name} (${currentUser.role})` },
        { label: 'Date', value: dailyDate },
        { label: 'Staff Roster Count', value: String(filteredStaff.length) },
      ],
      headers,
      rows,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5 print:p-0 print:space-y-3">
      {/* 1. Header Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-[#EAE7E0] shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FFF1F0] border border-[#FFD8D6] flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="w-5 h-5 text-[#E0534C]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] font-serif tracking-tight">
              Staff Attendance & Timesheet Hub
            </h1>
            <p className="text-xs sm:text-sm text-[#777777] mt-0.5">
              Manage daily clock-ins or review full-month overall attendance performance
            </p>
          </div>
        </div>

        {/* Tab switchers matching user design */}
        <div className="w-full sm:w-auto grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#F7F5F0] border border-[#EAE7E0] sm:flex sm:items-center self-start md:self-auto">
          <button
            onClick={() => setHubTab('monthly')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              hubTab === 'monthly'
                ? 'bg-white border border-[#F2C2BE] text-[#D94F45] shadow-2xs'
                : 'text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#D94F45] shrink-0" />
            <span>Monthly Overview</span>
            <span className="hidden sm:inline bg-[#FFE4E1] text-[#C93B32] text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide">
              Overall
            </span>
          </button>

          <button
            onClick={() => setHubTab('daily')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              hubTab === 'daily'
                ? 'bg-white border border-[#F2C2BE] text-[#D94F45] shadow-2xs'
                : 'text-[#666666] hover:text-[#1A1A1A]'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-[#777777] shrink-0" />
            <span>Daily Timesheet</span>
          </button>
        </div>
      </div>

      {hubTab === 'monthly' ? (
        <>
          {/* 2. Control & Month Navigation Bar */}
          <div className="p-3.5 sm:p-5 rounded-3xl bg-white border border-[#EAE7E0] shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            {/* Left: Month picker & info */}
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#F8F7F4] border border-[#EAE7E0]">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-white text-[#555555] hover:text-[#1A1A1A] rounded-xl transition-colors cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-white rounded-xl border border-[#EAE7E0] shadow-2xs">
                    <Calendar className="w-4 h-4 text-[#D94F45] shrink-0" />
                    <span className="font-bold text-xs sm:text-sm text-[#1A1A1A]">
                      {monthData.monthName}, {selectedYear}
                    </span>
                    <CalendarCheck className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                  </div>

                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-white text-[#555555] hover:text-[#1A1A1A] rounded-xl transition-colors cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleCurrentMonth}
                  className="px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white border border-[#EAE7E0] text-xs font-semibold text-[#444444] hover:bg-[#F8F7F4] shadow-2xs transition-colors cursor-pointer"
                >
                  Current Month
                </button>
              </div>

              {/* Exact subtitle from image */}
              <div className="text-xs sm:text-sm font-bold text-[#1A1A1A] mt-2">
                {monthData.monthName} {selectedYear} ({monthData.totalDays} Days • {monthData.workingDaysCount} Working Days)
              </div>
            </div>

            {/* Right: Search, Roles, View mode, Export */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Search */}
              <div className="relative w-full sm:w-48 md:w-52">
                <Search className="w-4 h-4 text-[#999999] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search staff, code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-2xl bg-[#F8F7F4] border border-[#EAE7E0] text-xs text-[#1A1A1A] placeholder:text-[#999999] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D94F45]/25 transition-all"
                />
              </div>

              {/* View Switcher: Matrix vs Cards */}
              <div className="p-1 rounded-2xl bg-[#F8F7F4] border border-[#EAE7E0] flex items-center gap-1">
                <button
                  onClick={() => setViewMode('matrix')}
                  className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'matrix'
                      ? 'bg-white border border-[#EAE7E0] text-[#1A1A1A] shadow-2xs'
                      : 'text-[#666666] hover:text-[#1A1A1A]'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Matrix</span>
                </button>

                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white border border-[#EAE7E0] text-[#1A1A1A] shadow-2xs'
                      : 'text-[#666666] hover:text-[#1A1A1A]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>

              {/* Export & Delete Actions: Excel, PDF, CSV & Delete Filtered */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {isAuthorizedToDelete && onDeleteAttendance && filteredMonthlyAttendanceRecords.length > 0 && (
                  <button
                    onClick={handleDeleteFilteredMonthlyAttendance}
                    disabled={saving}
                    className="px-2.5 sm:px-3 py-1.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Delete all currently filtered attendance records for this month"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span className="hidden sm:inline">Delete Filtered ({filteredMonthlyAttendanceRecords.length})</span>
                    <span className="sm:hidden">Del ({filteredMonthlyAttendanceRecords.length})</span>
                  </button>
                )}

                <button
                  onClick={handleExportExcel}
                  className="px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white border border-[#EAE7E0] hover:bg-[#F8F7F4] text-[#1A1A1A] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Export attendance matrix to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span className="hidden sm:inline">Export to Excel</span>
                  <span className="sm:hidden">Excel</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  className="px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white border border-[#EAE7E0] hover:bg-[#F8F7F4] text-[#1A1A1A] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Export official attendance report (PDF)"
                >
                  <Printer className="w-3.5 h-3.5 text-[#D97757]" />
                  <span className="hidden sm:inline">Export to PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  className="p-1.5 sm:p-2 rounded-2xl bg-white border border-[#EAE7E0] hover:bg-[#F8F7F4] text-[#666666] shadow-2xs transition-colors cursor-pointer"
                  title="Export raw CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Staff Monthly Attendance Matrix OR Cards View */}
          {viewMode === 'matrix' ? (
            <div className="rounded-3xl bg-white border border-[#EAE7E0] shadow-2xs overflow-hidden">
              {/* Matrix Card Header with exact design & legend badges */}
              <div className="p-4 sm:p-5 border-b border-[#EAE7E0] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-[#FFF1F0] flex items-center justify-center shrink-0 mt-0.5">
                    <TableIcon className="w-4 h-4 text-[#D94F45]" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-sm sm:text-base text-[#1A1A1A] flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span>Staff Monthly Attendance Matrix</span>
                      <span className="text-[#888888]">•</span>
                      <span className="whitespace-nowrap">{monthData.monthName} {selectedYear}</span>
                    </h2>
                    <p className="text-xs text-[#777777] mt-0.5">
                      Click any day cell to view or modify check-in/out times, status, or remarks
                    </p>
                  </div>
                </div>

                {/* Status Badges Legend */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                    P : Present
                  </span>
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    L : Late
                  </span>
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]">
                    HD : Half Day
                  </span>
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                    A : Absent
                  </span>
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]">
                    LV : Leave
                  </span>
                  <span className="px-2 sm:px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
                    OFF : Sunday
                  </span>
                </div>
              </div>

              {/* Scrollable Matrix Table */}
              <div className="overflow-x-auto select-none">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EAE7E0]">
                      {/* Fixed Staff Member Column */}
                      <th className="px-4 py-3 text-left font-bold text-[#444444] min-w-[210px] sticky left-0 z-20 bg-[#FAF8F5] border-r border-[#EAE7E0] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        Staff Member
                      </th>

                      {/* Day Columns */}
                      {monthData.days.map((d) => (
                        <th
                          key={d.dateStr}
                          className={`w-12 min-w-[42px] py-2 text-center border-r border-[#F0EDE6] ${
                            d.isSunday ? 'bg-[#F9F8F5]' : ''
                          }`}
                        >
                          <div
                            className={`text-xs font-bold leading-tight ${
                              d.isToday ? 'text-[#DC2626] font-extrabold' : 'text-[#222222]'
                            }`}
                          >
                            {d.dayNumber}
                          </div>
                          <div
                            className={`text-[9px] font-semibold uppercase tracking-wider leading-tight ${
                              d.isToday
                                ? 'text-[#DC2626] font-bold'
                                : d.isSunday
                                ? 'text-[#999999]'
                                : 'text-[#777777]'
                            }`}
                          >
                            {d.dayName}
                          </div>
                        </th>
                      ))}

                      {/* Real-time Analysis Summary Columns at Month End */}
                      <th className="w-10 min-w-[36px] py-2 text-center border-r border-[#F0EDE6] bg-[#FAF8F5] text-xs font-extrabold text-[#065F46]">
                        P
                      </th>
                      <th className="w-10 min-w-[36px] py-2 text-center border-r border-[#F0EDE6] bg-[#FAF8F5] text-xs font-extrabold text-[#92400E]">
                        L
                      </th>
                      <th className="w-10 min-w-[36px] py-2 text-center border-r border-[#F0EDE6] bg-[#FAF8F5] text-xs font-extrabold text-[#1E40AF]">
                        HD
                      </th>
                      <th className="w-10 min-w-[36px] py-2 text-center border-r border-[#F0EDE6] bg-[#FAF8F5] text-xs font-extrabold text-[#991B1B]">
                        A
                      </th>
                      <th className="w-10 min-w-[36px] py-2 text-center border-r border-[#F0EDE6] bg-[#FAF8F5] text-xs font-extrabold text-[#5B21B6]">
                        LV
                      </th>
                      <th className="w-14 min-w-[50px] py-2 text-center border-r border-[#F0EDE6] bg-[#FAF8F5] text-xs font-bold text-[#1A1A1A]">
                        Total<br />Hrs
                      </th>
                      <th className="w-14 min-w-[52px] py-2 text-center border-r border-[#F0EDE6] bg-[#FAF8F5] text-xs font-bold text-[#1A1A1A]">
                        Att. %
                      </th>
                      <th className="w-12 min-w-[44px] py-2 text-center bg-[#FAF8F5] text-xs font-bold text-[#666666]">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td
                          colSpan={monthData.days.length + 9}
                          className="py-12 text-center text-xs text-[#888888]"
                        >
                          No staff members found matching your search query.
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((staff) => {
                        let pCount = 0;
                        let lCount = 0;
                        let hdCount = 0;
                        let aCount = 0;
                        let lvCount = 0;
                        let hrs = 0;

                        monthData.days.forEach((d) => {
                          const rec = attendanceMap.get(`${staff.id}_${d.dateStr}`);
                          if (rec) {
                            if (rec.status === 'PRESENT') {
                              pCount++;
                              hrs += 8;
                            } else if (rec.status === 'LATE') {
                              lCount++;
                              hrs += 7.5;
                            } else if (rec.status === 'HALF_DAY') {
                              hdCount++;
                              hrs += 4;
                            } else if (rec.status === 'ABSENT') {
                              aCount++;
                            } else if (rec.status === 'LEAVE') {
                              lvCount++;
                            }
                          }
                        });

                        const rate =
                          monthData.workingDaysCount > 0
                            ? Math.round(((pCount + lCount * 0.9 + hdCount * 0.5) / monthData.workingDaysCount) * 100)
                            : 0;

                        return (
                          <tr
                            key={staff.id}
                            className="border-b border-[#F0EDE6] hover:bg-[#FAF9F5] transition-colors"
                          >
                            {/* Left sticky column: Staff Member Name, EMP Code & Role */}
                            <td className="px-4 py-3 sticky left-0 z-10 bg-white hover:bg-[#FAF9F5] border-r border-[#EAE7E0] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] min-w-[210px]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs sm:text-sm text-[#1A1A1A]">
                                  {staff.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3F2EE] text-[#555555] border border-[#E5E3DB]">
                                  {staff.staffCode}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#666666] font-medium mt-0.5">
                                {formatRole(staff.role)}
                              </div>
                            </td>

                            {/* Day Cells */}
                            {monthData.days.map((d) => {
                              const rec = attendanceMap.get(`${staff.id}_${d.dateStr}`);

                              if (d.isSunday) {
                                // If there's an explicit record for Sunday (e.g. they worked), show it, otherwise show OFF
                                return (
                                  <td
                                    key={d.dateStr}
                                    onClick={() =>
                                      setEditingCell({
                                        staff,
                                        date: d.dateStr,
                                        record: rec,
                                      })
                                    }
                                    title={`Sunday, ${d.dateStr}: Click to edit`}
                                    className="py-2 px-1 text-center border-r border-[#F0EDE6] bg-[#FAF9F5] cursor-pointer hover:bg-[#F3F1EC] transition-colors"
                                  >
                                    {rec && rec.status !== 'OFF' ? (
                                      <span
                                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                          rec.status === 'PRESENT'
                                            ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]'
                                            : rec.status === 'LATE'
                                            ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                                            : rec.status === 'HALF_DAY'
                                            ? 'bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]'
                                            : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                                        }`}
                                      >
                                        {rec.status === 'PRESENT'
                                          ? 'P'
                                          : rec.status === 'LATE'
                                          ? 'L'
                                          : rec.status === 'HALF_DAY'
                                          ? 'HD'
                                          : 'A'}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-[#888888]">
                                        OFF
                                      </span>
                                    )}
                                  </td>
                                );
                              }

                              // Regular workday cell
                              return (
                                <td
                                  key={d.dateStr}
                                  onClick={() =>
                                    setEditingCell({
                                      staff,
                                      date: d.dateStr,
                                      record: rec,
                                    })
                                  }
                                  title={`${staff.name} • ${d.dateStr}: Click to record or edit attendance`}
                                  className="py-2 px-1 text-center border-r border-[#F0EDE6] cursor-pointer hover:bg-[#F4F3ED] transition-colors"
                                >
                                  {!rec ? (
                                    <span className="text-[#BBBBBB] font-medium text-xs">-</span>
                                  ) : rec.status === 'PRESENT' ? (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]">
                                      P
                                    </span>
                                  ) : rec.status === 'LATE' ? (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                                      L
                                    </span>
                                  ) : rec.status === 'HALF_DAY' ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]">
                                      HD
                                    </span>
                                  ) : rec.status === 'ABSENT' ? (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                                      A
                                    </span>
                                  ) : rec.status === 'LEAVE' ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]">
                                      LV
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-[#666666] bg-[#F0EFEB]">
                                      OFF
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Summary Real-Time Analysis Columns */}
                            <td className="py-2 px-1 text-center font-extrabold text-xs sm:text-sm text-[#059669] border-r border-[#F0EDE6]">
                              {pCount}
                            </td>
                            <td className="py-2 px-1 text-center font-extrabold text-xs sm:text-sm text-[#D97706] border-r border-[#F0EDE6]">
                              {lCount}
                            </td>
                            <td className="py-2 px-1 text-center font-extrabold text-xs sm:text-sm text-[#2563EB] border-r border-[#F0EDE6]">
                              {hdCount}
                            </td>
                            <td className="py-2 px-1 text-center font-extrabold text-xs sm:text-sm text-[#DC2626] border-r border-[#F0EDE6]">
                              {aCount}
                            </td>
                            <td className="py-2 px-1 text-center font-extrabold text-xs sm:text-sm text-[#7C3AED] border-r border-[#F0EDE6]">
                              {lvCount}
                            </td>
                            <td className="py-2 px-1 text-center font-bold text-xs sm:text-sm text-[#1A1A1A] border-r border-[#F0EDE6]">
                              {hrs}h
                            </td>
                            <td className="py-2 px-1 text-center border-r border-[#F0EDE6]">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  rate >= 75
                                    ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]'
                                    : rate > 0
                                    ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                                    : 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                                }`}
                              >
                                {rate}%
                              </span>
                            </td>
                            <td className="py-2 px-1 text-center">
                              <button
                                onClick={() => setSelectedStaffAnalysis(staff)}
                                className="p-1.5 rounded-lg text-[#888888] hover:text-[#1A1A1A] hover:bg-[#F0EDE6] transition-colors"
                                title={`View ${staff.name} Full Analysis`}
                              >
                                <Eye className="w-4 h-4 mx-auto text-[#888888] hover:text-[#1A1A1A]" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View alternative */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((staff) => {
                let pCount = 0;
                let lCount = 0;
                let hdCount = 0;
                let aCount = 0;
                let lvCount = 0;
                let hrs = 0;

                monthData.days.forEach((d) => {
                  const rec = attendanceMap.get(`${staff.id}_${d.dateStr}`);
                  if (rec) {
                    if (rec.status === 'PRESENT') {
                      pCount++;
                      hrs += 8;
                    } else if (rec.status === 'LATE') {
                      lCount++;
                      hrs += 7.5;
                    } else if (rec.status === 'HALF_DAY') {
                      hdCount++;
                      hrs += 4;
                    } else if (rec.status === 'ABSENT') {
                      aCount++;
                    } else if (rec.status === 'LEAVE') {
                      lvCount++;
                    }
                  }
                });

                const rate =
                  monthData.workingDaysCount > 0
                    ? Math.round(((pCount + lCount * 0.9 + hdCount * 0.5) / monthData.workingDaysCount) * 100)
                    : 0;

                return (
                  <div
                    key={staff.id}
                    className="p-5 rounded-3xl bg-white border border-[#EAE7E0] shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-[#1A1A1A]">{staff.name}</h3>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3F2EE] text-[#555555] border border-[#E5E3DB]">
                              {staff.staffCode}
                            </span>
                          </div>
                          <p className="text-xs text-[#666666] mt-0.5">{formatRole(staff.role)}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] border border-[#EAE7E0] text-[#555555]">
                          {staff.branchName || 'Headquarters'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-[#555555]">Monthly Attendance</span>
                          <span className="font-bold text-[#0D9488]">{rate}%</span>
                        </div>
                        <div className="w-full bg-[#E6F4F1] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#0D9488] h-full rounded-full transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>

                      {/* Breakdown badges */}
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="p-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                          <span className="text-[10px] text-[#065F46] font-semibold block">Present</span>
                          <span className="text-sm font-extrabold text-[#065F46]">{pCount}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#FFFBEB] border border-[#FDE68A]">
                          <span className="text-[10px] text-[#92400E] font-semibold block">Late / Half</span>
                          <span className="text-sm font-extrabold text-[#92400E]">
                            {lCount + hdCount}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#FEF2F2] border border-[#FECACA]">
                          <span className="text-[10px] text-[#991B1B] font-semibold block">Absent / Lv</span>
                          <span className="text-sm font-extrabold text-[#991B1B]">
                            {aCount + lvCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#F0EDE6]">
                      <span className="text-xs text-[#666666]">
                        Hours: <strong className="text-[#1A1A1A]">{hrs}h</strong>
                      </span>
                      <button
                        onClick={() =>
                          setEditingCell({
                            staff,
                            date: todayDateStr,
                            record: attendanceMap.get(`${staff.id}_${todayDateStr}`),
                          })
                        }
                        className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F3F1EC] text-xs font-bold text-[#1A1A1A] border border-[#EAE7E0] transition-colors"
                      >
                        Log Punch
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* 5. Daily Timesheet Tab View */
        <div className="space-y-4">
          {/* Daily Date Controller Bar & Self Punch */}
          <div className="p-5 rounded-3xl bg-white border border-[#EAE7E0] shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-[#555555]">Select Date:</span>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="px-3.5 py-1.5 rounded-2xl bg-[#F8F7F4] border border-[#EAE7E0] text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#D94F45]/20"
              />
              <button
                onClick={() => setDailyDate(todayDateStr)}
                className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EDE6] border border-[#EAE7E0] text-xs font-bold text-[#444444]"
              >
                Today ({todayDateStr})
              </button>
            </div>

            {/* Quick biometric clock in / out for logged-in user */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-[#666666] hidden sm:inline">
                My Shift ({currentUser.name}):
              </span>
              {!myTodayRecord ? (
                <button
                  onClick={handleSelfPunchIn}
                  disabled={punchLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{punchLoading ? 'Clocking in...' : 'Punch In (Start Shift)'}</span>
                </button>
              ) : !myTodayRecord.checkOutTime ? (
                <button
                  onClick={handleSelfPunchOut}
                  disabled={punchLoading}
                  className="px-4 py-2 rounded-xl bg-[#D94F45] hover:bg-[#C93B32] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{punchLoading ? 'Clocking out...' : 'Punch Out (End Shift)'}</span>
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                  ✓ Shift Completed Today
                </span>
              )}
            </div>
          </div>

          {/* Daily Table of Staff */}
          <div className="rounded-3xl bg-white border border-[#EAE7E0] shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#EAE7E0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif font-bold text-sm sm:text-base text-[#1A1A1A]">
                  Daily Roster & Clock Records • {dailyDate}
                </h3>
                <p className="text-xs text-[#777777] mt-0.5">
                  Verify individual in/out punches or record attendance adjustments
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isAuthorizedToDelete && onDeleteAttendance && filteredDailyAttendanceRecords.length > 0 && (
                  <button
                    onClick={handleDeleteFilteredDailyAttendance}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Delete all currently marked attendance records for this date"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Delete Filtered ({filteredDailyAttendanceRecords.length})</span>
                  </button>
                )}

                <button
                  onClick={handleExportDailyExcel}
                  className="px-3 py-1.5 rounded-2xl bg-white border border-[#EAE7E0] hover:bg-[#F8F7F4] text-[#1A1A1A] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  title="Export daily roster to Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>Export Daily Timesheet</span>
                </button>
              </div>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1A1A1A]">
                <thead className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE6]">
                  {filteredStaff.map((staff) => {
                    const rec = attendanceMap.get(`${staff.id}_${dailyDate}`);
                    return (
                      <tr key={staff.id} className="hover:bg-[#FAF9F5] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#1A1A1A]">{staff.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3F2EE] text-[#555555] border border-[#E5E3DB]">
                              {staff.staffCode}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#666666]">{formatRole(staff.role)}</td>
                        <td className="px-4 py-3 text-[#666666]">
                          {staff.branchName || 'Headquarters'}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-emerald-600">
                          {rec?.checkInTime || rec?.loginTime || '--:--'}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-[#777777]">
                          {rec?.checkOutTime || rec?.logoutTime || '--:--'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {rec ? (
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                                rec.status === 'PRESENT'
                                  ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]'
                                  : rec.status === 'LATE'
                                  ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                                  : rec.status === 'HALF_DAY'
                                  ? 'bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]'
                                  : rec.status === 'ABSENT'
                                  ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                                  : rec.status === 'LEAVE'
                                  ? 'bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]'
                                  : 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]'
                              }`}
                            >
                              {rec.status}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#999999] font-medium">
                              Not Marked
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#777777] max-w-xs truncate">
                          {rec?.remarks || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setEditingCell({
                                  staff,
                                  date: dailyDate,
                                  record: rec,
                                })
                              }
                              className="px-3 py-1 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EDE6] text-xs font-bold text-[#1A1A1A] border border-[#EAE7E0] transition-colors"
                            >
                              Edit
                            </button>
                            {rec?.id && isAuthorizedToDelete && onDeleteAttendance && (
                              <button
                                onClick={() => handleDeleteAttendanceRecord(rec.id)}
                                className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                                title="Delete Attendance Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD VIEW FOR DAILY TIMESHEET */}
            <div className="md:hidden divide-y divide-[#F0EDE6]">
              {filteredStaff.map((staff) => {
                const rec = attendanceMap.get(`${staff.id}_${dailyDate}`);
                return (
                  <div key={staff.id} className="p-3.5 space-y-2.5 bg-white hover:bg-[#FAF9F5] transition-colors">
                    {/* Header: Name, code, and status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-[#1A1A1A]">{staff.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F3F2EE] text-[#555555] border border-[#E5E3DB]">
                            {staff.staffCode}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#666666] block mt-0.5">
                          {formatRole(staff.role)} • {staff.branchName || 'Headquarters'}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {rec ? (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              rec.status === 'PRESENT'
                                ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]'
                                : rec.status === 'LATE'
                                ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                                : rec.status === 'HALF_DAY'
                                ? 'bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]'
                                : rec.status === 'ABSENT'
                                ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                                : rec.status === 'LEAVE'
                                ? 'bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]'
                                : 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]'
                            }`}
                          >
                            {rec.status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#999999] font-medium px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#EAE7E0]">
                            Not Marked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Clock Times Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[#FAF8F5] border border-[#EAE7E0] text-xs">
                      <div>
                        <span className="text-[10px] text-[#666666] block">Check In</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {rec?.checkInTime || rec?.loginTime || '--:--'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#666666] block">Check Out</span>
                        <span className="font-mono font-bold text-[#777777]">
                          {rec?.checkOutTime || rec?.logoutTime || '--:--'}
                        </span>
                      </div>
                    </div>

                    {rec?.remarks && (
                      <p className="text-[11px] text-[#666666] italic bg-white p-1.5 rounded-lg border border-[#EAE7E0]">
                        "{rec.remarks}"
                      </p>
                    )}

                    {/* Bottom Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-0.5">
                      <button
                        onClick={() =>
                          setEditingCell({
                            staff,
                            date: dailyDate,
                            record: rec,
                          })
                        }
                        className="px-3 py-1 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EDE6] text-xs font-bold text-[#1A1A1A] border border-[#EAE7E0] transition-colors"
                      >
                        Adjust / Mark
                      </button>
                      {rec?.id && isAuthorizedToDelete && onDeleteAttendance && (
                        <button
                          onClick={() => handleDeleteAttendanceRecord(rec.id)}
                          className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                          title="Delete Attendance Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. Interactive Day Cell Attendance Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl p-5 sm:p-6 text-[#1A1A1A] animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE7E0]">
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#1A1A1A]">
                  Attendance Record
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  <strong className="text-[#1A1A1A]">{editingCell.staff.name}</strong> ({editingCell.staff.staffCode} • {formatRole(editingCell.staff.role)})
                  <br />
                  Date: <span className="font-semibold text-[#D94F45]">{editingCell.date}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="p-1 rounded-xl text-[#777777] hover:text-[#1A1A1A] hover:bg-[#F8F7F4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="mt-4 space-y-3.5 text-xs">
              {/* Status Radio Buttons */}
              <div>
                <label className="block font-bold text-[#333333] mb-1.5">
                  Attendance Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'PRESENT', label: 'Present (P)', color: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]' },
                    { val: 'LATE', label: 'Late (L)', color: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]' },
                    { val: 'HALF_DAY', label: 'Half Day (HD)', color: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]' },
                    { val: 'ABSENT', label: 'Absent (A)', color: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]' },
                    { val: 'LEAVE', label: 'Leave (LV)', color: 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]' },
                    { val: 'OFF', label: 'Day Off (OFF)', color: 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]' },
                  ].map((opt) => (
                    <label
                      key={opt.val}
                      className={`flex items-center justify-center p-2 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                        opt.color
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={opt.val}
                        defaultChecked={
                          editingCell.record?.status === opt.val ||
                          (!editingCell.record && opt.val === 'PRESENT')
                        }
                        className="sr-only"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* In / Out Times */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-[#333333] mb-1">Check In Time</label>
                  <input
                    type="time"
                    name="checkInTime"
                    defaultValue={editingCell.record?.checkInTime || editingCell.record?.loginTime || '09:30'}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F8F7F4] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D94F45]/25"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#333333] mb-1">Check Out Time</label>
                  <input
                    type="time"
                    name="checkOutTime"
                    defaultValue={editingCell.record?.checkOutTime || editingCell.record?.logoutTime || '18:30'}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F8F7F4] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D94F45]/25"
                  />
                </div>
              </div>

              {/* Branch */}
              <div>
                <label className="block font-bold text-[#333333] mb-1">Store / Branch</label>
                <select
                  name="branchId"
                  defaultValue={editingCell.record?.branchId || editingCell.staff.branchId || 'branch-1'}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F8F7F4] focus:bg-white focus:outline-hidden"
                >
                  <option value="ALL">Headquarters / All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-[#333333] mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  name="remarks"
                  defaultValue={editingCell.record?.remarks || ''}
                  placeholder="e.g. Regular shift completed, client consultation, approved sick leave"
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F8F7F4] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D94F45]/25"
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#EAE7E0]">
                {editingCell.record?.id && isAuthorizedToDelete && onDeleteAttendance ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteAttendanceRecord(editingCell.record!.id)}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl font-bold text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCell(null)}
                    className="px-4 py-2 rounded-xl font-bold text-xs text-[#666666] hover:bg-[#F8F7F4]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl font-bold text-xs bg-[#1A1A1A] hover:bg-[#333333] text-white shadow-2xs transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 7. Comprehensive Staff Individual Analysis Modal (Eye Action) */}
      {selectedStaffAnalysis && (() => {
        const staff = selectedStaffAnalysis;
        let pCount = 0;
        let lCount = 0;
        let hdCount = 0;
        let aCount = 0;
        let lvCount = 0;
        let offCount = 0;
        let totalHours = 0;

        monthData.days.forEach((d) => {
          const rec = attendanceMap.get(`${staff.id}_${d.dateStr}`);
          if (rec) {
            if (rec.status === 'PRESENT') {
              pCount++;
              totalHours += 8;
            } else if (rec.status === 'LATE') {
              lCount++;
              totalHours += 7.5;
            } else if (rec.status === 'HALF_DAY') {
              hdCount++;
              totalHours += 4;
            } else if (rec.status === 'ABSENT') {
              aCount++;
            } else if (rec.status === 'LEAVE') {
              lvCount++;
            } else if (rec.status === 'OFF') {
              offCount++;
            }
          } else if (d.isSunday) {
            offCount++;
          }
        });

        const rate =
          monthData.workingDaysCount > 0
            ? Math.round(((pCount + lCount * 0.9 + hdCount * 0.5) / monthData.workingDaysCount) * 100)
            : 0;

        const maxScheduledHours = monthData.workingDaysCount * 8;

        return (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-3xl bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#1A1A1A] animate-in fade-in">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-[#EAE7E0] flex items-center justify-between bg-[#FAF8F5]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-[#EAE7E0] flex items-center justify-center font-bold text-sm text-[#D94F45] shadow-2xs">
                    {staff.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">
                        {staff.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white text-[#555555] border border-[#E5E3DB]">
                        {staff.staffCode}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] border border-[#EAE7E0] text-[#555555]">
                        {formatRole(staff.role)}
                      </span>
                    </div>
                    <p className="text-xs text-[#777777] mt-0.5">
                      {staff.branchName || 'Headquarters'} • Monthly Performance for{' '}
                      <strong className="text-[#D94F45]">{monthData.monthName} {selectedYear}</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStaffAnalysis(null)}
                  className="p-1.5 rounded-xl text-[#777777] hover:text-[#1A1A1A] hover:bg-white border border-transparent hover:border-[#EAE7E0] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                {/* 4 KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
                    <span className="text-[11px] font-bold text-[#065F46] block uppercase tracking-wider">
                      Attendance Rate
                    </span>
                    <span className="text-2xl font-black text-[#065F46] mt-0.5 block">
                      {rate}%
                    </span>
                    <div className="w-full bg-[#DCFCE7] h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-[#059669] h-full rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0]">
                    <span className="text-[11px] font-bold text-[#555555] block uppercase tracking-wider">
                      Total Hours
                    </span>
                    <span className="text-2xl font-black text-[#1A1A1A] mt-0.5 block">
                      {totalHours}h
                    </span>
                    <span className="text-[10px] text-[#777777] block mt-1">
                      of {maxScheduledHours}h scheduled
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A]">
                    <span className="text-[11px] font-bold text-[#92400E] block uppercase tracking-wider">
                      Late & Half Days
                    </span>
                    <span className="text-2xl font-black text-[#92400E] mt-0.5 block">
                      {lCount + hdCount}
                    </span>
                    <span className="text-[10px] text-[#B45309] block mt-1">
                      {lCount} Late • {hdCount} Half Day
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA]">
                    <span className="text-[11px] font-bold text-[#991B1B] block uppercase tracking-wider">
                      Absent & Leave
                    </span>
                    <span className="text-2xl font-black text-[#991B1B] mt-0.5 block">
                      {aCount + lvCount}
                    </span>
                    <span className="text-[10px] text-[#DC2626] block mt-1">
                      {aCount} Absent • {lvCount} Approved
                    </span>
                  </div>
                </div>

                {/* Breakdown Badges Bar */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE7E0] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-[#555555]">Monthly Status Breakdown:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#D1FAE5] text-[#065F46] font-bold border border-[#A7F3D0]">
                      Present: {pCount} days
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#92400E] font-bold border border-[#FDE68A]">
                      Late: {lCount} days
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#DBEAFE] text-[#1E40AF] font-bold border border-[#BFDBFE]">
                      Half Day: {hdCount} days
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#FEE2E2] text-[#991B1B] font-bold border border-[#FECACA]">
                      Absent: {aCount} days
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#EDE9FE] text-[#5B21B6] font-bold border border-[#DDD6FE]">
                      Leave: {lvCount} days
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#F3F4F6] text-[#4B5563] font-bold border border-[#E5E7EB]">
                      Weekly Off: {offCount} days
                    </span>
                  </div>
                </div>

                {/* Day by Day Log Table */}
                <div className="rounded-2xl border border-[#EAE7E0] overflow-hidden">
                  <div className="p-3.5 bg-[#FAF8F5] border-b border-[#EAE7E0] font-bold text-xs text-[#444444] flex items-center justify-between">
                    <span>Day-by-Day Punch History • {monthData.monthName} {selectedYear}</span>
                    <span className="text-[11px] text-[#777777]">Click any row action to modify</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F5] border-b border-[#EAE7E0] text-[10px] font-bold uppercase tracking-wider text-[#666666] sticky top-0">
                        <tr>
                          <th className="px-3.5 py-2">Date</th>
                          <th className="px-3 py-2">Check In</th>
                          <th className="px-3 py-2">Check Out</th>
                          <th className="px-3 py-2 text-center">Status</th>
                          <th className="px-3 py-2">Remarks</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EDE6]">
                        {monthData.days.map((d) => {
                          const rec = attendanceMap.get(`${staff.id}_${d.dateStr}`);
                          const isSunday = d.isSunday;

                          return (
                            <tr
                              key={d.dateStr}
                              className={`hover:bg-[#FAF9F5] transition-colors ${
                                d.isToday ? 'bg-[#FFF9F9]' : ''
                              }`}
                            >
                              <td className="px-3.5 py-2 font-medium">
                                <span className={d.isToday ? 'font-bold text-[#DC2626]' : ''}>
                                  {d.dayNumber} {d.dayName}
                                </span>
                                {d.isToday && (
                                  <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FEE2E2] text-[#DC2626]">
                                    Today
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-emerald-600 font-semibold">
                                {rec?.checkInTime || (rec?.status === 'PRESENT' ? '09:30 AM' : '-')}
                              </td>
                              <td className="px-3 py-2 font-mono text-[#777777] font-semibold">
                                {rec?.checkOutTime || (rec?.status === 'PRESENT' ? '06:30 PM' : '-')}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {rec ? (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      rec.status === 'PRESENT'
                                        ? 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0]'
                                        : rec.status === 'LATE'
                                        ? 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]'
                                        : rec.status === 'HALF_DAY'
                                        ? 'bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]'
                                        : rec.status === 'ABSENT'
                                        ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]'
                                        : rec.status === 'LEAVE'
                                        ? 'bg-[#EDE9FE] text-[#5B21B6] border border-[#DDD6FE]'
                                        : 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]'
                                    }`}
                                  >
                                    {rec.status}
                                  </span>
                                ) : isSunday ? (
                                  <span className="text-[10px] font-bold text-[#888888]">
                                    OFF (Sunday)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-[#999999]">
                                    Not Marked
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-[#777777] max-w-xs truncate">
                                {rec?.remarks || '-'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => {
                                    setEditingCell({
                                      staff,
                                      date: d.dateStr,
                                      record: rec,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F0EDE6] text-[11px] font-bold text-[#1A1A1A] border border-[#EAE7E0] transition-colors"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-[#EAE7E0] bg-[#FAF8F5] flex items-center justify-between">
                <span className="text-xs text-[#777777]">
                  Employee ID: <strong className="text-[#1A1A1A]">{staff.staffCode}</strong> • Contact: {staff.phone}
                </span>
                <button
                  onClick={() => setSelectedStaffAnalysis(null)}
                  className="px-5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-[#333333] text-white text-xs font-bold transition-colors shadow-2xs"
                >
                  Close Analysis
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
