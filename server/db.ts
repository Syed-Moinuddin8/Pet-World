import fs from 'fs';
import path from 'path';
import {
  Branch,
  Product,
  BranchInventory,
  Supplier,
  Staff,
  Purchase,
  PurchaseBill,
  PurchaseAllocationRecord,
  Sale,
  StockMovement,
  AttendanceRecord,
  SalaryRecord,
  SalaryAdvance,
  NotificationItem,
  AppSettings,
  User,
} from '../src/types.js';
import {
  INITIAL_BRANCHES,
  INITIAL_PRODUCTS,
  INITIAL_SUPPLIERS,
  INITIAL_STAFF,
  OWNER_USER,
  INITIAL_PURCHASES,
  INITIAL_PURCHASE_BILLS,
  INITIAL_ALLOCATIONS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_SALES,
  INITIAL_NOTIFICATIONS,
  INITIAL_SETTINGS,
  generateInitialInventory,
} from './data.js';
import { resolveProductImageUrl } from './productImages.js';
import { syncDatabaseToSupabase, loadDatabaseFromSupabase } from './supabase.js';

interface DatabaseSchema {
  branches: Branch[];
  products: Product[];
  categories?: string[];
  inventory: BranchInventory[];
  suppliers: Supplier[];
  staff: Staff[];
  purchases: Purchase[];
  purchaseBills: PurchaseBill[];
  purchaseAllocations: PurchaseAllocationRecord[];
  sales: Sale[];
  stockMovements: StockMovement[];
  attendance: AttendanceRecord[];
  salaries: SalaryRecord[];
  salaryAdvances?: SalaryAdvance[];
  notifications: NotificationItem[];
  settings: AppSettings;
}

export const DEFAULT_PRODUCT_CATEGORIES: string[] = [
  'Dog Food',
  'Cat Food',
  'Bird Food',
  'Fish Food',
  'Pet Treats',
  'Toys',
  'Leashes & Collars',
  'Beds & Mats',
  'Grooming',
  'Medicines & Care',
  'Accessories',
  'Aquarium Products',
  'Bird Accessories',
  'Other',
];

const isVercel = Boolean(process.env.VERCEL);
const DB_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'petworld_db.json');
const BUNDLED_DB_FILE = path.join(process.cwd(), 'data', 'petworld_db.json');

class PetWorldDatabase {
  private data: DatabaseSchema;
  private transactionSnapshot: string | null = null;
  private isProcessing = false;
  private barcodeIndex: Map<string, Product> = new Map();

  constructor() {
    this.data = this.loadInitialData();
    this.rebuildBarcodeIndex();
  }

  public rebuildBarcodeIndex(): void {
    this.barcodeIndex.clear();
    for (const p of this.data.products) {
      if (p.barcode) {
        this.barcodeIndex.set(p.barcode.trim().toLowerCase(), p);
      }
    }
  }

  private generateInitialAttendance(): AttendanceRecord[] {
    const records: AttendanceRecord[] = [];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    INITIAL_STAFF.forEach((stf, index) => {
      // Today's attendance
      const isLate = index % 7 === 2;
      const isAbsent = index % 11 === 0;
      const isHalfDay = index % 13 === 0;

      if (!isAbsent) {
        records.push({
          id: `att-today-${stf.id}`,
          date: today,
          staffId: stf.id,
          staffName: stf.name,
          branchId: stf.branchId,
          branchName: stf.branchName,
          loginTime: isLate ? '10:45 AM' : '09:55 AM',
          logoutTime: undefined,
          status: isLate ? 'LATE' : isHalfDay ? 'HALF_DAY' : 'PRESENT',
          remarks: isLate ? 'Traffic congestion on Western Express' : undefined,
        });
      } else {
        records.push({
          id: `att-today-${stf.id}`,
          date: today,
          staffId: stf.id,
          staffName: stf.name,
          branchId: stf.branchId,
          branchName: stf.branchName,
          loginTime: '-',
          logoutTime: '-',
          status: 'LEAVE',
          remarks: 'Approved sick leave',
        });
      }

      // Yesterday's complete log
      records.push({
        id: `att-yest-${stf.id}`,
        date: yesterday,
        staffId: stf.id,
        staffName: stf.name,
        branchId: stf.branchId,
        branchName: stf.branchName,
        loginTime: '09:58 AM',
        logoutTime: '08:05 PM',
        status: 'PRESENT',
      });
    });

    return records;
  }

  private generateInitialSalaries(): SalaryRecord[] {
    const salaries: SalaryRecord[] = [];

    // 1. September 2026 (Current Month: 7 Paid, 13 Pending)
    INITIAL_STAFF.forEach((stf) => {
      const isManager = stf.role === 'BRANCH_MANAGER';
      const isCashierFlagship = stf.id === 'staff-02';
      const isPaid = isManager || isCashierFlagship;

      const allowances = Math.round(stf.basicSalary * 0.15); // 15% HRA & conveyance
      const deductions = Math.round(stf.basicSalary * 0.05); // 5% PF & Prof. Tax
      const bonus = isManager ? 3500 : stf.role === 'CASHIER' ? 1200 : 800;
      const overtime = stf.role === 'SALES_STAFF' ? 900 : 0;
      const advance = 0;
      const netSalary = stf.basicSalary + allowances - deductions + bonus + overtime - advance;

      salaries.push({
        id: `sal-sep-${stf.id}`,
        staffId: stf.id,
        staffName: stf.name,
        branchId: stf.branchId,
        branchName: stf.branchName,
        month: 'September 2026',
        basicSalary: stf.basicSalary,
        allowances,
        deductions,
        overtime,
        bonus,
        advance,
        netSalary,
        status: isPaid ? 'PAID' : 'PENDING',
        paymentStatus: isPaid ? 'PAID' : 'PENDING',
        paymentDate: isPaid ? (isManager ? '2026-09-05' : '2026-09-06') : undefined,
        paymentMode: isPaid ? (isManager ? 'Bank Transfer' : 'UPI') : undefined,
        paymentMethod: isPaid ? (isManager ? 'BANK_TRANSFER' : 'UPI') : undefined,
      });
    });

    // 2. August 2026 (Completed Month: All 20 Paid)
    INITIAL_STAFF.forEach((stf) => {
      const allowances = Math.round(stf.basicSalary * 0.15);
      const deductions = Math.round(stf.basicSalary * 0.05);
      const bonus = stf.role === 'BRANCH_MANAGER' ? 3000 : 1500;
      const overtime = 1200;
      const advance = 0;
      const netSalary = stf.basicSalary + allowances - deductions + bonus + overtime - advance;

      salaries.push({
        id: `sal-aug-${stf.id}`,
        staffId: stf.id,
        staffName: stf.name,
        branchId: stf.branchId,
        branchName: stf.branchName,
        month: 'August 2026',
        basicSalary: stf.basicSalary,
        allowances,
        deductions,
        overtime,
        bonus,
        advance,
        netSalary,
        status: 'PAID',
        paymentStatus: 'PAID',
        paymentDate: '2026-08-31',
        paymentMode: stf.role === 'BRANCH_MANAGER' ? 'Bank Transfer' : 'UPI',
        paymentMethod: 'BANK_TRANSFER',
      });
    });

    // 3. July 2026 (Historical Month: All 20 Paid)
    INITIAL_STAFF.forEach((stf) => {
      const allowances = Math.round(stf.basicSalary * 0.15);
      const deductions = Math.round(stf.basicSalary * 0.05);
      const bonus = stf.role === 'BRANCH_MANAGER' ? 2500 : 1000;
      const overtime = 800;
      const advance = 0;
      const netSalary = stf.basicSalary + allowances - deductions + bonus + overtime - advance;

      salaries.push({
        id: `sal-jul-${stf.id}`,
        staffId: stf.id,
        staffName: stf.name,
        branchId: stf.branchId,
        branchName: stf.branchName,
        month: 'July 2026',
        basicSalary: stf.basicSalary,
        allowances,
        deductions,
        overtime,
        bonus,
        advance,
        netSalary,
        status: 'PAID',
        paymentStatus: 'PAID',
        paymentDate: '2026-07-31',
        paymentMode: 'Bank Transfer',
        paymentMethod: 'BANK_TRANSFER',
      });
    });

    return salaries;
  }

  private generateInitialSalaryAdvances(): SalaryAdvance[] {
    return [
      {
        id: 'adv-sep-01',
        staffId: 'staff-03',
        staffName: 'Sneha Jadhav',
        branchId: 'branch-1',
        branchName: 'Pet World Downtown Flagship',
        month: 'September 2026',
        date: '2026-09-04',
        amount: 2000,
        reason: 'Medical Emergency',
        notes: 'Urgent prescription medicines for mother',
        paymentMode: 'Cash',
        approvedBy: 'Rajesh Sharma (Store Manager)',
        receiptNumber: 'ADV-SEP-001',
        createdAt: '2026-09-04T11:30:00.000Z',
      },
      {
        id: 'adv-sep-02',
        staffId: 'staff-03',
        staffName: 'Sneha Jadhav',
        branchId: 'branch-1',
        branchName: 'Pet World Downtown Flagship',
        month: 'September 2026',
        date: '2026-09-09',
        amount: 1500,
        reason: 'Commute & Travel Pass',
        notes: 'Monthly local train quarterly renewal & petrol',
        paymentMode: 'UPI',
        approvedBy: 'Rajesh Sharma (Store Manager)',
        receiptNumber: 'ADV-SEP-002',
        createdAt: '2026-09-09T14:15:00.000Z',
      },
      {
        id: 'adv-sep-03',
        staffId: 'staff-04',
        staffName: 'Rohan Naik',
        branchId: 'branch-1',
        branchName: 'Pet World Downtown Flagship',
        month: 'September 2026',
        date: '2026-09-02',
        amount: 2000,
        reason: 'Vehicle Repair',
        notes: 'Motorcycle clutch plate replacement & brake servicing',
        paymentMode: 'Cash',
        approvedBy: 'Rajesh Sharma (Store Manager)',
        receiptNumber: 'ADV-SEP-003',
        createdAt: '2026-09-02T10:00:00.000Z',
      },
      {
        id: 'adv-sep-04',
        staffId: 'staff-04',
        staffName: 'Rohan Naik',
        branchId: 'branch-1',
        branchName: 'Pet World Downtown Flagship',
        month: 'September 2026',
        date: '2026-09-07',
        amount: 1500,
        reason: 'Apartment Utility Bill',
        notes: 'Electricity bill and building maintenance dues',
        paymentMode: 'UPI',
        approvedBy: 'Rajesh Sharma (Store Manager)',
        receiptNumber: 'ADV-SEP-004',
        createdAt: '2026-09-07T16:20:00.000Z',
      },
      {
        id: 'adv-sep-05',
        staffId: 'staff-04',
        staffName: 'Rohan Naik',
        branchId: 'branch-1',
        branchName: 'Pet World Downtown Flagship',
        month: 'September 2026',
        date: '2026-09-11',
        amount: 1000,
        reason: 'Personal Emergency Cash',
        notes: 'Urgent household cash requirement',
        paymentMode: 'Cash',
        approvedBy: 'Rajesh Sharma (Store Manager)',
        receiptNumber: 'ADV-SEP-005',
        createdAt: '2026-09-11T12:00:00.000Z',
      },
      {
        id: 'adv-sep-06',
        staffId: 'staff-07',
        staffName: 'Gaurav Sawant',
        branchId: 'branch-2',
        branchName: 'Pet World Westside Mall',
        month: 'September 2026',
        date: '2026-09-05',
        amount: 2500,
        reason: 'Home Rent Advance',
        notes: 'Advance part payment for rental deposit',
        paymentMode: 'Bank Transfer',
        approvedBy: 'Priya Mehra (Store Manager)',
        receiptNumber: 'ADV-SEP-006',
        createdAt: '2026-09-05T09:45:00.000Z',
      },
      {
        id: 'adv-sep-07',
        staffId: 'staff-07',
        staffName: 'Gaurav Sawant',
        branchId: 'branch-2',
        branchName: 'Pet World Westside Mall',
        month: 'September 2026',
        date: '2026-09-10',
        amount: 1200,
        reason: 'Medical Emergency',
        notes: 'Dental root canal treatment part payment',
        paymentMode: 'UPI',
        approvedBy: 'Priya Mehra (Store Manager)',
        receiptNumber: 'ADV-SEP-007',
        createdAt: '2026-09-10T15:30:00.000Z',
      },
      {
        id: 'adv-sep-08',
        staffId: 'staff-10',
        staffName: 'Pooja Chawla',
        branchId: 'branch-3',
        branchName: 'Pet World Suburban Plaza',
        month: 'September 2026',
        date: '2026-09-06',
        amount: 2000,
        reason: 'Family Function & Travel',
        notes: 'Bus ticket booking for hometown visit',
        paymentMode: 'Cash',
        approvedBy: 'Amit Verma (Store Manager)',
        receiptNumber: 'ADV-SEP-008',
        createdAt: '2026-09-06T18:10:00.000Z',
      },
      {
        id: 'adv-sep-09',
        staffId: 'staff-16',
        staffName: 'Manish Pandey',
        branchId: 'branch-5',
        branchName: 'Pet World Coastal Bay',
        month: 'September 2026',
        date: '2026-09-04',
        amount: 2000,
        reason: 'Tuition & Training Fees',
        notes: 'Veterinary assistant certification exam fee',
        paymentMode: 'Bank Transfer',
        approvedBy: 'Karan Malhotra (Store Manager)',
        receiptNumber: 'ADV-SEP-009',
        createdAt: '2026-09-04T13:00:00.000Z',
      },
      {
        id: 'adv-sep-10',
        staffId: 'staff-16',
        staffName: 'Manish Pandey',
        branchId: 'branch-5',
        branchName: 'Pet World Coastal Bay',
        month: 'September 2026',
        date: '2026-09-09',
        amount: 1500,
        reason: 'Emergency Cash',
        notes: 'Personal family emergency expense',
        paymentMode: 'Cash',
        approvedBy: 'Karan Malhotra (Store Manager)',
        receiptNumber: 'ADV-SEP-010',
        createdAt: '2026-09-09T17:40:00.000Z',
      },
      // August historical advances
      {
        id: 'adv-aug-01',
        staffId: 'staff-03',
        staffName: 'Sneha Jadhav',
        branchId: 'branch-1',
        branchName: 'Pet World Downtown Flagship',
        month: 'August 2026',
        date: '2026-08-14',
        amount: 2000,
        reason: 'Festival Advance',
        notes: 'Raksha Bandhan festival family shopping',
        paymentMode: 'Cash',
        approvedBy: 'Rajesh Sharma (Store Manager)',
        receiptNumber: 'ADV-AUG-001',
        createdAt: '2026-08-14T11:00:00.000Z',
      },
      {
        id: 'adv-aug-02',
        staffId: 'staff-04',
        staffName: 'Rohan Naik',
        branchId: 'branch-1',
        branchName: 'Pet World Downtown Flagship',
        month: 'August 2026',
        date: '2026-08-18',
        amount: 2500,
        reason: 'Medical Emergency',
        notes: 'Doctor consultation and medicine bills',
        paymentMode: 'UPI',
        approvedBy: 'Rajesh Sharma (Store Manager)',
        receiptNumber: 'ADV-AUG-002',
        createdAt: '2026-08-18T14:30:00.000Z',
      },
    ];
  }

  private loadInitialData(): DatabaseSchema {
    try {
      const fileToRead = fs.existsSync(DB_FILE)
        ? DB_FILE
        : fs.existsSync(BUNDLED_DB_FILE)
        ? BUNDLED_DB_FILE
        : null;

      if (fileToRead) {
        const raw = fs.readFileSync(fileToRead, 'utf-8');
        const parsed: DatabaseSchema = JSON.parse(raw);
        // Refresh salaries demo data if old format or missing months
        if (!parsed.salaries || parsed.salaries.length < 50 || parsed.salaries.some((s) => s.month === '2026-09')) {
          parsed.salaries = this.generateInitialSalaries();
        }
        // Initialize salary advances if missing or empty
        if (!parsed.salaryAdvances || parsed.salaryAdvances.length === 0) {
          parsed.salaryAdvances = this.generateInitialSalaryAdvances();
        }
        // Sync advances to salaries
        if (parsed.salaryAdvances && parsed.salaries) {
          const advList = parsed.salaryAdvances;
          parsed.salaries.forEach((s) => {
            const cleanMonth = (s.month || '').toLowerCase();
            const staffAdvances = advList.filter(
              (a) => a.staffId === s.staffId && (a.month === s.month || (cleanMonth.includes('sep') && a.month.toLowerCase().includes('sep')) || (cleanMonth.includes('aug') && a.month.toLowerCase().includes('aug')))
            );
            s.advances = staffAdvances;
            s.advance = staffAdvances.reduce((sum, a) => sum + a.amount, 0);
            s.netSalary = Math.max(0, s.basicSalary + s.allowances - s.deductions + s.bonus + s.overtime - s.advance);
          });
        }
        // Ensure purchases and items have company backfilled if missing
        if (parsed.purchases && parsed.products) {
          const prodMap = new Map(parsed.products.map((p) => [p.id, p]));
          parsed.purchases.forEach((pur) => {
            if (pur.items) {
              pur.items.forEach((it) => {
                const pr = prodMap.get(it.productId);
                if (!it.company) {
                  it.company = pr?.company || pr?.brand || pur.company || 'General';
                }
                if (!it.brand) {
                  it.brand = pr?.brand || it.company;
                }
              });
            }
            if (!pur.company) {
              const firstItemCompany = pur.items?.find((i) => i.company && i.company !== 'General')?.company;
              if (firstItemCompany) {
                pur.company = firstItemCompany;
              } else if (pur.supplierName?.toLowerCase().includes('royal canin')) {
                pur.company = 'Royal Canin';
              } else if (pur.supplierName?.toLowerCase().includes('mars')) {
                pur.company = 'Pedigree (Mars Petcare)';
              } else if (pur.supplierName?.toLowerCase().includes('drools')) {
                pur.company = 'Drools Pet Food';
              } else {
                pur.company = 'General / Multi-Brand';
              }
            }
          });
        }
        if (parsed.products && Array.isArray(parsed.products)) {
          parsed.products.forEach((p) => {
            if (!p.imageUrl || !p.imageUrl.startsWith('http')) {
              p.imageUrl = resolveProductImageUrl(p);
            }
          });
        }
        // Always enforce the fixed store branches regardless of database file contents
        parsed.branches = INITIAL_BRANCHES.map((b) => ({ ...b }));
        if (!parsed.categories || !Array.isArray(parsed.categories)) {
          const catSet = new Set<string>(DEFAULT_PRODUCT_CATEGORIES);
          if (parsed.products && Array.isArray(parsed.products)) {
            parsed.products.forEach((p) => {
              if (p.category) catSet.add(p.category.trim());
            });
          }
          parsed.categories = Array.from(catSet);
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read saved database, loading defaults:', e);
    }

    const defaultData: DatabaseSchema = {
      branches: INITIAL_BRANCHES,
      products: INITIAL_PRODUCTS.map((p) => ({
        ...p,
        imageUrl: p.imageUrl || resolveProductImageUrl(p),
      })),
      categories: [...DEFAULT_PRODUCT_CATEGORIES],
      inventory: generateInitialInventory(),
      suppliers: INITIAL_SUPPLIERS,
      staff: INITIAL_STAFF,
      purchases: INITIAL_PURCHASES,
      purchaseBills: INITIAL_PURCHASE_BILLS,
      purchaseAllocations: INITIAL_ALLOCATIONS,
      sales: INITIAL_SALES,
      stockMovements: INITIAL_STOCK_MOVEMENTS,
      attendance: this.generateInitialAttendance(),
      salaries: this.generateInitialSalaries(),
      salaryAdvances: this.generateInitialSalaryAdvances(),
      notifications: INITIAL_NOTIFICATIONS,
      settings: INITIAL_SETTINGS,
    };

    this.persist(defaultData);
    return defaultData;
  }

  private persistTimer: NodeJS.Timeout | null = null;

  private persist(dataToPersist = this.data, immediate = false): void {
    const doWrite = () => {
      try {
        if (!fs.existsSync(DB_DIR)) {
          fs.mkdirSync(DB_DIR, { recursive: true });
        }
        // Write compact JSON asynchronously
        const serialized = JSON.stringify(dataToPersist);
        fs.writeFile(DB_FILE, serialized, 'utf-8', (err) => {
          if (err) console.error('Failed to write database file:', err);
        });

        // Replicate state to Supabase in background if configured
        syncDatabaseToSupabase(dataToPersist).catch((err: any) => {
          if (process.env.SUPABASE_URL) {
            console.warn('Background Supabase replication:', err?.message || err);
          }
        });
      } catch (e) {
        console.error('Failed to schedule database write:', e);
      }
    };

    if (immediate) {
      if (this.persistTimer) {
        clearTimeout(this.persistTimer);
        this.persistTimer = null;
      }
      doWrite();
    } else {
      if (this.persistTimer) {
        clearTimeout(this.persistTimer);
      }
      this.persistTimer = setTimeout(doWrite, 100);
    }
  }

  // ACID Transaction Methods
  public beginTransaction(): void {
    if (this.transactionSnapshot !== null) {
      throw new Error('A transaction is already active.');
    }
    this.transactionSnapshot = JSON.stringify(this.data);
  }

  public commit(): void {
    if (this.transactionSnapshot === null) {
      throw new Error('No active transaction to commit.');
    }
    this.transactionSnapshot = null;
    this.persist();
  }

  public rollback(): void {
    if (this.transactionSnapshot === null) {
      return;
    }
    this.data = JSON.parse(this.transactionSnapshot);
    this.transactionSnapshot = null;
  }

  public getFullDatabaseSnapshot(): DatabaseSchema {
    return this.data;
  }

  public async syncToSupabase() {
    return await syncDatabaseToSupabase(this.data);
  }

  public async restoreFromSupabase(): Promise<boolean> {
    const remoteData = await loadDatabaseFromSupabase();
    if (remoteData && remoteData.products && remoteData.branches) {
      this.data = {
        ...this.data,
        ...remoteData,
        branches: INITIAL_BRANCHES.map((b) => ({ ...b })),
      };
      this.rebuildBarcodeIndex();
      this.persist();
      return true;
    }
    return false;
  }

  // Branch Queries
  public getBranches(): Branch[] {
    const fixedMap = new Map(INITIAL_BRANCHES.map((b) => [b.id, b]));
    const result: Branch[] = [];
    INITIAL_BRANCHES.forEach((fixedB) => {
      const existing = this.data.branches.find((b) => b.id === fixedB.id);
      result.push({
        ...fixedB,
        ...(existing || {}),
        name: fixedB.name,
        address: fixedB.address,
        phone: fixedB.phone,
        managerName: fixedB.managerName,
        city: fixedB.city,
        code: fixedB.code,
        email: fixedB.email,
        gstin: fixedB.gstin,
        accessPassword: existing?.accessPassword || fixedB.accessPassword,
      });
    });
    this.data.branches.forEach((b) => {
      if (!fixedMap.has(b.id)) {
        result.push(b);
      }
    });
    return result;
  }

  public getBranchById(id: string): Branch | undefined {
    return this.getBranches().find((b) => b.id === id);
  }

  public createBranch(branchData: Partial<Branch>): Branch {
    const newId = branchData.id || `branch-${Date.now()}`;
    const newBranch: Branch = {
      id: newId,
      code: branchData.code || `BR-${this.data.branches.length + 1}`,
      name: branchData.name || 'New Branch',
      address: branchData.address || '',
      city: branchData.city || 'Bengaluru',
      phone: branchData.phone || '',
      email: branchData.email || '',
      managerName: branchData.managerName || 'Store Manager',
      status: branchData.status || 'ACTIVE',
      openingDate: branchData.openingDate || new Date().toISOString().split('T')[0],
      taxRate: branchData.taxRate !== undefined ? Number(branchData.taxRate) : 18,
      gstin: branchData.gstin ? branchData.gstin.trim().toUpperCase() : '27AABCP1924M1Z5',
    };
    this.data.branches.push(newBranch);
    this.persist();
    return newBranch;
  }

  public updateBranch(id: string, updates: Partial<Branch>): Branch {
    const branch = this.data.branches.find((b) => b.id === id);
    if (!branch) throw new Error('Branch not found');
    const sanitizedUpdates: Partial<Branch> = { ...updates };

    if (sanitizedUpdates.name !== undefined) sanitizedUpdates.name = sanitizedUpdates.name.trim();
    if (sanitizedUpdates.code !== undefined) sanitizedUpdates.code = sanitizedUpdates.code.trim().toUpperCase();
    if (sanitizedUpdates.address !== undefined) sanitizedUpdates.address = sanitizedUpdates.address.trim();
    if (sanitizedUpdates.city !== undefined) sanitizedUpdates.city = sanitizedUpdates.city.trim();
    if (sanitizedUpdates.phone !== undefined) sanitizedUpdates.phone = sanitizedUpdates.phone.trim();
    if (sanitizedUpdates.email !== undefined) sanitizedUpdates.email = sanitizedUpdates.email.trim();
    if (sanitizedUpdates.managerName !== undefined) sanitizedUpdates.managerName = sanitizedUpdates.managerName.trim();
    if (sanitizedUpdates.status !== undefined) {
      sanitizedUpdates.status = sanitizedUpdates.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }
    if (sanitizedUpdates.openingDate !== undefined) {
      sanitizedUpdates.openingDate = sanitizedUpdates.openingDate.trim();
    }
    if (sanitizedUpdates.taxRate !== undefined) {
      sanitizedUpdates.taxRate = Number(sanitizedUpdates.taxRate);
    }
    if (sanitizedUpdates.gstin !== undefined) {
      sanitizedUpdates.gstin = sanitizedUpdates.gstin.trim().toUpperCase();
    }
    if (sanitizedUpdates.accessPassword !== undefined) {
      sanitizedUpdates.accessPassword = sanitizedUpdates.accessPassword.trim();
    }

    Object.assign(branch, sanitizedUpdates);

    // Sync branch name across staff
    if (sanitizedUpdates.name) {
      this.data.staff.forEach((s) => {
        if (s.branchId === id) {
          s.branchName = sanitizedUpdates.name!;
        }
      });
    }

    this.persist();
    return branch;
  }

  public deletePurchase(id: string): boolean {
    const idx = this.data.purchases.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.data.purchases.splice(idx, 1);
    this.persist();
    return true;
  }

  // Category Operations
  public getCategories(): string[] {
    if (!this.data.categories || !Array.isArray(this.data.categories)) {
      const catSet = new Set<string>(DEFAULT_PRODUCT_CATEGORIES);
      this.data.products.forEach((p) => {
        if (p.category) catSet.add(p.category.trim());
      });
      this.data.categories = Array.from(catSet);
    }
    const cleanList = Array.from(new Set(this.data.categories.map((c) => c.trim()).filter(Boolean)));
    const withoutOther = cleanList
      .filter((c) => c.toLowerCase() !== 'other')
      .sort((a, b) => a.localeCompare(b));
    const hasOther = cleanList.some((c) => c.toLowerCase() === 'other');
    return hasOther ? [...withoutOther, 'Other'] : withoutOther;
  }

  public addCategory(name: string): { success: boolean; categories: string[]; category: string } {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Category name cannot be empty.');
    }
    if (trimmed.length > 50) {
      throw new Error('Category name cannot exceed 50 characters.');
    }

    const current = this.getCategories();
    const existing = current.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      throw new Error(`Category "${existing}" already exists.`);
    }

    this.data.categories.push(trimmed);
    this.persist();
    return {
      success: true,
      categories: this.getCategories(),
      category: trimmed,
    };
  }

  public deleteCategory(name: string, fallbackCategory = 'Other'): { success: boolean; categories: string[]; affectedProductsCount: number } {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Category name to delete cannot be empty.');
    }

    const current = this.getCategories();
    const target = current.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (!target) {
      throw new Error(`Category "${trimmed}" does not exist.`);
    }

    if (target.toLowerCase() === 'other' && (!fallbackCategory || fallbackCategory.toLowerCase() === 'other')) {
      throw new Error('The default fallback category "Other" cannot be deleted.');
    }

    const effectiveFallback = fallbackCategory && fallbackCategory.trim() ? fallbackCategory.trim() : 'Other';

    // Reassign products with target category to fallback category
    let affectedProductsCount = 0;
    this.data.products.forEach((p) => {
      if (p.category && p.category.trim().toLowerCase() === target.toLowerCase()) {
        p.category = effectiveFallback;
        affectedProductsCount++;
      }
    });

    // Remove from category array
    this.data.categories = this.data.categories.filter((c) => c.toLowerCase() !== target.toLowerCase());

    // Ensure fallback category exists in list
    const fallbackExists = this.data.categories.some((c) => c.toLowerCase() === effectiveFallback.toLowerCase());
    if (!fallbackExists) {
      this.data.categories.push(effectiveFallback);
    }

    this.persist();
    return {
      success: true,
      categories: this.getCategories(),
      affectedProductsCount,
    };
  }

  // Product Queries
  public getProducts(): Product[] {
    return this.data.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    if (!barcode) return undefined;
    const clean = barcode.trim().toLowerCase();
    // 1. Direct indexed map lookup
    const cached = this.barcodeIndex.get(clean);
    if (cached) return cached;
    // 2. Scan products array by barcode or SKU
    const found = this.data.products.find(
      (p) =>
        (p.barcode && p.barcode.trim().toLowerCase() === clean) ||
        (p.sku && p.sku.trim().toLowerCase() === clean)
    );
    if (found && found.barcode) {
      this.barcodeIndex.set(found.barcode.trim().toLowerCase(), found);
    }
    return found;
  }

  public createProduct(productData: Omit<Product, 'id'> & { initialStock?: number; initialBranchId?: string }): Product {
    // Barcode uniqueness check
    if (productData.barcode && productData.barcode.trim()) {
      const existing = this.getProductByBarcode(productData.barcode.trim());
      if (existing) {
        throw new Error(`A product with barcode "${productData.barcode}" already exists: "${existing.name}". Please use the existing product or provide a unique barcode.`);
      }
    }

    const id = `prod-${String(this.data.products.length + 1).padStart(3, '0')}`;
    const initialStock = Math.max(0, Number(productData.initialStock) || 0);
    const initialBranchId = productData.initialBranchId || this.data.branches[0]?.id || 'branch-1';
    
    // Remove temporary initial stock fields from stored product
    const { initialStock: _is, initialBranchId: _ibi, ...cleanProductData } = productData;
    const newProduct: Product = {
      ...cleanProductData,
      id,
      sku: productData.sku || `SKU-${Date.now().toString().slice(-6)}`,
      barcode: (productData.barcode || '').trim(),
      status: productData.status || 'ACTIVE',
    };

    this.data.products.push(newProduct);
    if (newProduct.barcode) {
      this.barcodeIndex.set(newProduct.barcode.toLowerCase(), newProduct);
    }

    // Initialize branch inventory for all branches
    const now = new Date().toISOString();
    this.data.branches.forEach((branch) => {
      const isTargetBranch = branch.id === initialBranchId;
      const qty = isTargetBranch ? initialStock : 0;
      this.data.inventory.push({
        branchId: branch.id,
        productId: id,
        quantity: qty,
        batchNumber: productData.batchNumber,
        expiryDate: productData.expiryDate,
        lastUpdated: now,
      });
    });

    // If initial stock was provided, create an initial stock movement
    if (initialStock > 0) {
      const branch = this.getBranchById(initialBranchId) || this.data.branches[0];
      const movement: StockMovement = {
        id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        branchId: branch.id,
        branchName: branch.name,
        previousQuantity: 0,
        quantityAdded: initialStock,
        quantityRemoved: 0,
        newQuantity: initialStock,
        operationType: 'STOCK ADDED',
        reason: 'Initial stock on product creation',
        referenceNumber: `INIT-${Date.now().toString().slice(-6)}`,
        purchaseBillNumber: productData.batchNumber ? `Batch: ${productData.batchNumber}` : undefined,
        batchNumber: productData.batchNumber,
        expiryDate: productData.expiryDate,
        userName: 'Stock Manager',
        userRole: 'OWNER',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        timestamp: Date.now(),
      };
      this.data.stockMovements.unshift(movement);
    }

    this.persist();
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product {
    const product = this.data.products.find((p) => p.id === id);
    if (!product) throw new Error('Product not found');

    if (updates.barcode && updates.barcode.trim() !== product.barcode) {
      const existing = this.getProductByBarcode(updates.barcode.trim());
      if (existing && existing.id !== id) {
        throw new Error(`Barcode "${updates.barcode}" is already assigned to "${existing.name}".`);
      }
      if (product.barcode) {
        this.barcodeIndex.delete(product.barcode.trim().toLowerCase());
      }
    }

    Object.assign(product, updates);
    if (product.barcode) {
      this.barcodeIndex.set(product.barcode.trim().toLowerCase(), product);
    }

    this.persist();
    return product;
  }

  public deleteProduct(id: string): boolean {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const product = this.data.products[idx];
    if (product.barcode) {
      this.barcodeIndex.delete(product.barcode.trim().toLowerCase());
    }
    this.data.products.splice(idx, 1);
    // Remove associated inventory records across all branches
    this.data.inventory = this.data.inventory.filter((inv) => inv.productId !== id);

    // Audit log movement
    const movement: StockMovement = {
      id: `sm-del-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: id,
      productName: product.name,
      sku: product.sku,
      branchId: 'ALL',
      branchName: 'All Branches',
      previousQuantity: 0,
      quantityAdded: 0,
      quantityRemoved: 0,
      newQuantity: 0,
      operationType: 'STOCK REMOVED',
      reason: `Product "${product.name}" (${product.sku}) deleted from inventory`,
      referenceNumber: `DEL-${Date.now().toString().slice(-6)}`,
      userName: 'Owner',
      userRole: 'OWNER',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
    };
    this.data.stockMovements.unshift(movement);

    this.persist();
    return true;
  }

  public deleteBranchInventory(branchId: string, productId: string): boolean {
    const idx = this.data.inventory.findIndex(
      (i) => i.branchId === branchId && i.productId === productId
    );
    if (idx !== -1) {
      this.data.inventory.splice(idx, 1);
      this.persist();
      return true;
    }
    return false;
  }

  // Inventory Queries
  public getInventory(): BranchInventory[] {
    return this.data.inventory;
  }

  public getBranchInventory(branchId: string): (Product & { quantity: number; lastUpdated: string })[] {
    return this.data.products.map((p) => {
      const inv = this.data.inventory.find((i) => i.branchId === branchId && i.productId === p.id);
      return {
        ...p,
        quantity: inv ? inv.quantity : 0,
        lastUpdated: inv ? inv.lastUpdated : new Date().toISOString(),
      };
    });
  }

  public getBranchStock(branchId: string, productId: string): number {
    const inv = this.data.inventory.find((i) => i.branchId === branchId && i.productId === productId);
    return inv ? inv.quantity : 0;
  }

  public getProductCompanyStock(productId: string): { total: number; byBranch: Record<string, number> } {
    const byBranch: Record<string, number> = {};
    let total = 0;
    this.data.branches.forEach((b) => {
      const inv = this.data.inventory.find((i) => i.branchId === b.id && i.productId === productId);
      const q = inv ? inv.quantity : 0;
      byBranch[b.id] = q;
      total += q;
    });
    return { total, byBranch };
  }

  // STOCK ADDITION (Owner / Stock Manager)
  public addStock(params: {
    productId: string;
    branchId: string;
    quantity: number;
    purchasePrice?: number;
    sellingPrice?: number;
    supplierName?: string;
    purchaseBillNumber?: string;
    batchNumber?: string;
    expiryDate?: string;
    notes?: string;
    user?: User;
  }): { oldStock: number; addedStock: number; newStock: number; movement: StockMovement } {
    if (params.quantity <= 0) {
      throw new Error('Quantity must be greater than zero.');
    }

    this.beginTransaction();
    try {
      const product = this.getProductById(params.productId);
      if (!product) throw new Error('Product not found');

      const branch = this.getBranchById(params.branchId);
      if (!branch) throw new Error('Branch not found');

      let inv = this.data.inventory.find((i) => i.branchId === params.branchId && i.productId === params.productId);
      const oldStock = inv ? inv.quantity : 0;
      const newStock = oldStock + params.quantity;
      const now = new Date();

      if (inv) {
        inv.quantity = newStock;
        inv.lastUpdated = now.toISOString();
        if (params.batchNumber) inv.batchNumber = params.batchNumber;
        if (params.expiryDate) inv.expiryDate = params.expiryDate;
      } else {
        inv = {
          branchId: params.branchId,
          productId: params.productId,
          quantity: newStock,
          batchNumber: params.batchNumber,
          expiryDate: params.expiryDate,
          lastUpdated: now.toISOString(),
        };
        this.data.inventory.push(inv);
      }

      // Update product prices / supplier / batch / expiry if provided
      if (params.purchasePrice && params.purchasePrice > 0) {
        product.purchasePrice = params.purchasePrice;
        product.costPrice = params.purchasePrice;
      }
      if (params.sellingPrice && params.sellingPrice > 0) {
        product.sellingPrice = params.sellingPrice;
        if (params.sellingPrice > product.mrp) {
          product.mrp = params.sellingPrice;
        }
      }
      if (params.supplierName && params.supplierName.trim()) {
        product.supplierName = params.supplierName.trim();
      }
      if (params.batchNumber) {
        product.batchNumber = params.batchNumber;
      }
      if (params.expiryDate) {
        product.expiryDate = params.expiryDate;
      }

      const movement: StockMovement = {
        id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        branchId: branch.id,
        branchName: branch.name,
        previousQuantity: oldStock,
        quantityAdded: params.quantity,
        quantityRemoved: 0,
        newQuantity: newStock,
        operationType: 'STOCK ADDED',
        reason: params.notes || (params.purchaseBillNumber ? `Stock received from invoice #${params.purchaseBillNumber}` : 'Direct stock inward by stock manager'),
        referenceNumber: params.purchaseBillNumber ? `INV-${params.purchaseBillNumber}` : `STK-IN-${Date.now().toString().slice(-6)}`,
        purchaseBillNumber: params.purchaseBillNumber,
        batchNumber: params.batchNumber,
        expiryDate: params.expiryDate,
        userName: params.user?.name || 'Stock Manager',
        userRole: params.user?.role || 'OWNER',
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString(),
        timestamp: now.getTime(),
      };

      this.data.stockMovements.unshift(movement);
      this.commit();

      return { oldStock, addedStock: params.quantity, newStock, movement };
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  // STOCK ADDITION BY BARCODE (Key requirement for Stock Manager)
  public addStockByBarcode(params: {
    barcode: string;
    branchId?: string;
    quantity: number;
    purchasePrice?: number;
    sellingPrice?: number;
    supplierName?: string;
    purchaseBillNumber?: string;
    batchNumber?: string;
    expiryDate?: string;
    notes?: string;
    user?: User;
  }): { product: Product; oldStock: number; addedStock: number; newStock: number; movement: StockMovement } {
    if (!params.barcode || !params.barcode.trim()) {
      throw new Error('Barcode is required.');
    }
    const product = this.getProductByBarcode(params.barcode.trim());
    if (!product) {
      throw new Error(`Product not found for barcode: ${params.barcode}`);
    }

    const branchId = params.branchId || (params.user?.branchId ? params.user.branchId : this.data.branches[0].id);
    const result = this.addStock({
      productId: product.id,
      branchId,
      quantity: params.quantity,
      purchasePrice: params.purchasePrice,
      sellingPrice: params.sellingPrice,
      supplierName: params.supplierName,
      purchaseBillNumber: params.purchaseBillNumber,
      batchNumber: params.batchNumber,
      expiryDate: params.expiryDate,
      notes: params.notes,
      user: params.user,
    });

    return {
      product,
      ...result,
    };
  }

  // CSV / EXCEL BULK INVENTORY IMPORT
  public bulkImportInventoryCsv(params: {
    items: {
      barcode: string;
      productName: string;
      company?: string;
      animal?: any;
      type?: any;
      age?: any;
      size?: string;
      purchasePrice?: number;
      sellingPrice?: number;
      quantity: number;
      supplierName?: string;
      invoiceNumber?: string;
      batchNumber?: string;
      expiryDate?: string;
    }[];
    branchId: string;
    user?: User;
  }): {
    updatedProductsCount: number;
    createdProductsCount: number;
    totalUnitsAdded: number;
    results: { barcode: string; productName: string; status: 'UPDATED' | 'CREATED'; oldStock: number; newStock: number }[];
  } {
    const branch = this.getBranchById(params.branchId) || this.data.branches[0];
    let updatedProductsCount = 0;
    let createdProductsCount = 0;
    let totalUnitsAdded = 0;
    const results: { barcode: string; productName: string; status: 'UPDATED' | 'CREATED'; oldStock: number; newStock: number }[] = [];

    this.beginTransaction();
    try {
      for (const item of params.items) {
        const cleanBarcode = (item.barcode || '').trim();
        const qty = Math.max(0, Number(item.quantity) || 0);
        if (!cleanBarcode && !item.productName) continue;

        let product = cleanBarcode ? this.getProductByBarcode(cleanBarcode) : undefined;
        if (product) {
          // Add quantity to existing product stock
          const inv = this.data.inventory.find((i) => i.branchId === branch.id && i.productId === product!.id);
          const oldStock = inv ? inv.quantity : 0;
          const newStock = oldStock + qty;

          if (inv) {
            inv.quantity = newStock;
            inv.lastUpdated = new Date().toISOString();
          } else {
            this.data.inventory.push({
              branchId: branch.id,
              productId: product.id,
              quantity: newStock,
              lastUpdated: new Date().toISOString(),
            });
          }

          if (item.purchasePrice && item.purchasePrice > 0) {
            product.purchasePrice = item.purchasePrice;
            product.costPrice = item.purchasePrice;
          }
          if (item.sellingPrice && item.sellingPrice > 0) {
            product.sellingPrice = item.sellingPrice;
            if (item.sellingPrice > product.mrp) product.mrp = item.sellingPrice;
          }
          if (item.company && !product.company) product.company = item.company;
          if (item.animal && !product.animal) product.animal = item.animal;
          if (item.size && !product.size) product.size = item.size;

          if (qty > 0) {
            this.data.stockMovements.unshift({
              id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              branchId: branch.id,
              branchName: branch.name,
              previousQuantity: oldStock,
              quantityAdded: qty,
              quantityRemoved: 0,
              newQuantity: newStock,
              operationType: 'STOCK ADDED',
              reason: item.invoiceNumber ? `CSV Import - Invoice #${item.invoiceNumber}` : 'CSV Bulk Inventory Import',
              referenceNumber: item.invoiceNumber ? `INV-${item.invoiceNumber}` : `CSV-IMP-${Date.now().toString().slice(-6)}`,
              userName: params.user?.name || 'Stock Manager',
              userRole: params.user?.role || 'OWNER',
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString(),
              timestamp: Date.now(),
            });
          }

          updatedProductsCount++;
          totalUnitsAdded += qty;
          results.push({
            barcode: cleanBarcode,
            productName: product.name,
            status: 'UPDATED',
            oldStock,
            newStock,
          });
        } else {
          // Create new product
          const id = `prod-${String(this.data.products.length + 1).padStart(3, '0')}`;
          const pForm = (item.type && (item.type.toLowerCase().includes('wet') || item.type.toLowerCase().includes('can')))
            ? 'WET'
            : 'DRIED';
          
          const newProd: Product = {
            id,
            sku: `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`,
            barcode: cleanBarcode || `${Date.now()}`,
            name: item.productName || 'Imported Product',
            category: (item.animal === 'Cat' ? 'Cat Food' : 'Dog Food'),
            brand: item.company || 'Generic',
            company: item.company || 'Generic',
            productForm: pForm,
            animal: (item.animal || 'Dog') as any,
            lifeStage: (item.age || 'Adult') as any,
            size: item.size || 'Standard',
            unit: 'packet',
            purchasePrice: Number(item.purchasePrice) || 500,
            costPrice: Number(item.purchasePrice) || 500,
            sellingPrice: Number(item.sellingPrice) || (Number(item.purchasePrice) ? Math.round(Number(item.purchasePrice) * 1.3) : 650),
            mrp: Number(item.sellingPrice) || 700,
            taxPercent: 18,
            minStockLevel: 5,
            reorderLevel: 10,
            supplierId: 'sup-001',
            supplierName: item.supplierName || 'Default Supplier',
            avatarType: (item.animal && item.animal.toLowerCase() === 'cat') ? 'cat' : 'dog',
            status: 'ACTIVE',
          };

          this.data.products.push(newProd);
          if (newProd.barcode) {
            this.barcodeIndex.set(newProd.barcode.toLowerCase(), newProd);
          }

          // Set inventory across branches
          this.data.branches.forEach((b) => {
            const isTarget = b.id === branch.id;
            this.data.inventory.push({
              branchId: b.id,
              productId: id,
              quantity: isTarget ? qty : 0,
              lastUpdated: new Date().toISOString(),
            });
          });

          if (qty > 0) {
            this.data.stockMovements.unshift({
              id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              productId: newProd.id,
              productName: newProd.name,
              sku: newProd.sku,
              branchId: branch.id,
              branchName: branch.name,
              previousQuantity: 0,
              quantityAdded: qty,
              quantityRemoved: 0,
              newQuantity: qty,
              operationType: 'STOCK ADDED',
              reason: 'New product created via CSV Import',
              referenceNumber: `CSV-NEW-${Date.now().toString().slice(-6)}`,
              userName: params.user?.name || 'Stock Manager',
              userRole: params.user?.role || 'OWNER',
              date: new Date().toISOString().split('T')[0],
              time: new Date().toLocaleTimeString(),
              timestamp: Date.now(),
            });
          }

          createdProductsCount++;
          totalUnitsAdded += qty;
          results.push({
            barcode: cleanBarcode,
            productName: newProd.name,
            status: 'CREATED',
            oldStock: 0,
            newStock: qty,
          });
        }
      }

      this.commit();
      return {
        updatedProductsCount,
        createdProductsCount,
        totalUnitsAdded,
        results,
      };
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  // STOCK ADJUSTMENT (Owner only)
  public adjustStock(params: {
    productId: string;
    branchId: string;
    newQuantity: number;
    reason: string;
    user: User;
  }): { oldStock: number; newStock: number; movement: StockMovement } {
    if (params.user.role !== 'OWNER') {
      throw new Error('Unauthorized: Only Owner / Admin can adjust stock.');
    }
    if (!params.reason || params.reason.trim().length < 3) {
      throw new Error('A detailed reason is required for any manual stock adjustment.');
    }
    if (params.newQuantity < 0) {
      throw new Error('Stock quantity cannot be negative.');
    }

    this.beginTransaction();
    try {
      const product = this.getProductById(params.productId);
      if (!product) throw new Error('Product not found');

      const branch = this.getBranchById(params.branchId);
      if (!branch) throw new Error('Branch not found');

      let inv = this.data.inventory.find((i) => i.branchId === params.branchId && i.productId === params.productId);
      const oldStock = inv ? inv.quantity : 0;
      const diff = params.newQuantity - oldStock;
      const now = new Date();

      if (inv) {
        inv.quantity = params.newQuantity;
        inv.lastUpdated = now.toISOString();
      } else {
        inv = {
          branchId: params.branchId,
          productId: params.productId,
          quantity: params.newQuantity,
          lastUpdated: now.toISOString(),
        };
        this.data.inventory.push(inv);
      }

      const movement: StockMovement = {
        id: `sm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        branchId: branch.id,
        branchName: branch.name,
        previousQuantity: oldStock,
        quantityAdded: diff > 0 ? diff : 0,
        quantityRemoved: diff < 0 ? Math.abs(diff) : 0,
        newQuantity: params.newQuantity,
        operationType: 'STOCK ADJUSTED',
        reason: params.reason,
        referenceNumber: `ADJ-${Date.now().toString().slice(-6)}`,
        userName: params.user.name,
        userRole: params.user.role,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString(),
        timestamp: now.getTime(),
      };

      this.data.stockMovements.unshift(movement);
      this.commit();

      return { oldStock, newStock: params.newQuantity, movement };
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  // INTER-BRANCH STOCK TRANSFER (Owner only)
  public transferStock(params: {
    productId: string;
    fromBranchId: string;
    toBranchId: string;
    quantity: number;
    reason?: string;
    user: User;
  }): { transferId: string; sourceStock: number; destinationStock: number } {
    if (params.user.role !== 'OWNER') {
      throw new Error('Unauthorized: Only Owner / Admin can transfer stock between branches.');
    }
    if (params.fromBranchId === params.toBranchId) {
      throw new Error('Source and destination branches cannot be the same.');
    }
    if (params.quantity <= 0) {
      throw new Error('Transfer quantity must be greater than zero.');
    }

    this.beginTransaction();
    try {
      const product = this.getProductById(params.productId);
      if (!product) throw new Error('Product not found');

      const fromBranch = this.getBranchById(params.fromBranchId);
      const toBranch = this.getBranchById(params.toBranchId);
      if (!fromBranch || !toBranch) throw new Error('Invalid branch specified');

      const sourceInv = this.data.inventory.find((i) => i.branchId === params.fromBranchId && i.productId === params.productId);
      const sourceStock = sourceInv ? sourceInv.quantity : 0;

      if (sourceStock < params.quantity) {
        throw new Error(`Insufficient stock in ${fromBranch.name}. Available: ${sourceStock}, Requested: ${params.quantity}`);
      }

      let destInv = this.data.inventory.find((i) => i.branchId === params.toBranchId && i.productId === params.productId);
      const destOldStock = destInv ? destInv.quantity : 0;

      const now = new Date();
      const transferRef = `TRF-${Date.now().toString().slice(-6)}`;

      // Update source
      sourceInv!.quantity = sourceStock - params.quantity;
      sourceInv!.lastUpdated = now.toISOString();

      // Update dest
      if (destInv) {
        destInv.quantity = destOldStock + params.quantity;
        destInv.lastUpdated = now.toISOString();
      } else {
        destInv = {
          branchId: params.toBranchId,
          productId: params.productId,
          quantity: destOldStock + params.quantity,
          lastUpdated: now.toISOString(),
        };
        this.data.inventory.push(destInv);
      }

      // 2 Linked stock movements
      this.data.stockMovements.unshift({
        id: `sm-${Date.now()}-out`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        branchId: fromBranch.id,
        branchName: fromBranch.name,
        previousQuantity: sourceStock,
        quantityAdded: 0,
        quantityRemoved: params.quantity,
        newQuantity: sourceInv!.quantity,
        operationType: 'STOCK TRANSFERRED',
        reason: `Transfer out to ${toBranch.name}. Note: ${params.reason || 'Inventory rebalance'}`,
        referenceNumber: transferRef,
        userName: params.user.name,
        userRole: params.user.role,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString(),
        timestamp: now.getTime(),
      });

      this.data.stockMovements.unshift({
        id: `sm-${Date.now()}-in`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        branchId: toBranch.id,
        branchName: toBranch.name,
        previousQuantity: destOldStock,
        quantityAdded: params.quantity,
        quantityRemoved: 0,
        newQuantity: destInv.quantity,
        operationType: 'STOCK TRANSFERRED',
        reason: `Transfer in from ${fromBranch.name}. Note: ${params.reason || 'Inventory rebalance'}`,
        referenceNumber: transferRef,
        userName: params.user.name,
        userRole: params.user.role,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString(),
        timestamp: now.getTime() + 1,
      });

      this.commit();
      return {
        transferId: transferRef,
        sourceStock: sourceInv!.quantity,
        destinationStock: destInv.quantity,
      };
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  // PURCHASE ALLOCATION (Major Feature)
  public allocatePurchaseStock(params: {
    purchaseId: string;
    productId: string;
    allocations: { branchId: string; quantity: number }[];
    user: User;
    notes?: string;
  }): PurchaseAllocationRecord {
    if (params.user.role !== 'OWNER') {
      throw new Error('Unauthorized: Only Owner can allocate purchase stock.');
    }

    this.beginTransaction();
    try {
      const purchase = this.data.purchases.find((p) => p.id === params.purchaseId);
      if (!purchase) throw new Error('Purchase record not found');

      const item = purchase.items.find((i) => i.productId === params.productId);
      if (!item) throw new Error('Product not found in this purchase record');

      const totalAllocated = params.allocations.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
      if (totalAllocated > item.quantity) {
        throw new Error(
          `Allocation error: Total allocated quantity (${totalAllocated}) cannot exceed purchased quantity (${item.quantity}). Remaining unallocated: ${Math.max(0, item.quantity - totalAllocated)}`
        );
      }

      const now = new Date();
      const allocationBranchItems: PurchaseAllocationRecord['allocations'] = [];

      params.allocations.forEach((alloc) => {
        const qty = Number(alloc.quantity) || 0;
        if (qty <= 0) return;

        const branch = this.getBranchById(alloc.branchId);
        if (!branch) throw new Error(`Invalid branch: ${alloc.branchId}`);

        let inv = this.data.inventory.find((i) => i.branchId === alloc.branchId && i.productId === params.productId);
        const oldStock = inv ? inv.quantity : 0;
        const newStock = oldStock + qty;

        if (inv) {
          inv.quantity = newStock;
          inv.lastUpdated = now.toISOString();
        } else {
          inv = {
            branchId: alloc.branchId,
            productId: params.productId,
            quantity: newStock,
            lastUpdated: now.toISOString(),
          };
          this.data.inventory.push(inv);
        }

        allocationBranchItems.push({
          branchId: branch.id,
          branchName: branch.name,
          allocatedQuantity: qty,
          previousStock: oldStock,
          newStock: newStock,
        });

        // Stock movement audit
        this.data.stockMovements.unshift({
          id: `sm-${Date.now()}-${branch.id}`,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          branchId: branch.id,
          branchName: branch.name,
          previousQuantity: oldStock,
          quantityAdded: qty,
          quantityRemoved: 0,
          newQuantity: newStock,
          operationType: 'STOCK ADDED',
          reason: `Purchase allocation from ${purchase.purchaseNumber}`,
          referenceNumber: purchase.purchaseNumber,
          userName: params.user.name,
          userRole: params.user.role,
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString(),
          timestamp: now.getTime(),
        });
      });

      const allocRecord: PurchaseAllocationRecord = {
        id: `alloc-${Date.now()}`,
        purchaseId: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        totalPurchased: item.quantity,
        allocations: allocationBranchItems,
        allocatedBy: params.user.name,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString(),
        timestamp: now.getTime(),
        notes: params.notes,
      };

      this.data.purchaseAllocations.unshift(allocRecord);

      // Check if purchase is now fully allocated
      if (totalAllocated >= item.quantity) {
        purchase.allocatedStatus = 'FULLY_ALLOCATED';
      } else {
        purchase.allocatedStatus = 'PARTIALLY_ALLOCATED';
      }

      this.commit();
      return allocRecord;
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  // REAL-TIME POS SALE (Transactional)
  public createSale(params: {
    branchId: string;
    staffUser: User;
    customerName?: string;
    customerPhone?: string;
    items: {
      productId: string;
      quantity: number;
      discount?: number;
    }[];
    paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'SPLIT';
    cashReceived?: number;
  }): Sale {
    // Branch isolation check: Staff can only sell from their assigned branch!
    if (params.staffUser.role !== 'OWNER' && params.staffUser.branchId !== params.branchId) {
      throw new Error(`Access denied. You are not authorized to process sales for branch ${params.branchId}.`);
    }

    if (!params.items || params.items.length === 0) {
      throw new Error('Cart is empty. Please add products to complete sale.');
    }

    this.beginTransaction();
    try {
      const branch = this.getBranchById(params.branchId);
      if (!branch) throw new Error('Branch not found');
      if (branch.status === 'INACTIVE') {
        throw new Error(`Branch ${branch.name} is currently inactive. Sales cannot be processed for inactive locations.`);
      }

      const branchTaxRate = 0;

      const saleItems: Sale['items'] = [];
      let subtotal = 0;
      let discountTotal = 0;

      // STEP 1: Verify current branch stock for all items
      for (const item of params.items) {
        if (item.quantity <= 0) {
          throw new Error('Item quantity must be greater than zero.');
        }

        const product = this.getProductById(item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found.`);

        const inv = this.data.inventory.find((i) => i.branchId === params.branchId && i.productId === item.productId);
        const availableStock = inv ? inv.quantity : 0;

        if (availableStock < item.quantity) {
          throw new Error(
            `Insufficient stock available for "${product.name}". Required: ${item.quantity}, Current Available: ${availableStock}. Transaction cancelled; no stock was deducted.`
          );
        }

        const unitPrice = product.sellingPrice;
        const discount = item.discount || 0;
        const netUnitPrice = Math.max(0, unitPrice - discount);
        const lineTotal = netUnitPrice * item.quantity;
        const lineTax = 0;

        subtotal += lineTotal;
        discountTotal += discount * item.quantity;

        saleItems.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          unit: product.unit,
          quantity: item.quantity,
          unitPrice,
          discount,
          taxPercent: 0,
          taxAmount: 0,
          lineTotal: Number(lineTotal.toFixed(2)),
          totalPrice: Number(lineTotal.toFixed(2)),
        });
      }

      const taxTotal = 0;
      const grandTotal = Math.round(subtotal);
      const now = new Date();
      const invoiceNumber = `${this.data.settings.invoicePrefix || 'PW-SAL-'}${Date.now().toString().slice(-8)}`;

      // STEP 2: Deduct branch inventory & create stock movements
      for (const item of saleItems) {
        const inv = this.data.inventory.find((i) => i.branchId === params.branchId && i.productId === item.productId)!;
        const previousQuantity = inv.quantity;
        const newQuantity = previousQuantity - item.quantity;

        inv.quantity = newQuantity;
        inv.lastUpdated = now.toISOString();

        // Audit log
        this.data.stockMovements.unshift({
          id: `sm-${Date.now()}-${item.productId}`,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          branchId: branch.id,
          branchName: branch.name,
          previousQuantity,
          quantityAdded: 0,
          quantityRemoved: item.quantity,
          newQuantity,
          operationType: 'STOCK SOLD',
          reason: `POS retail sale invoice #${invoiceNumber}`,
          referenceNumber: invoiceNumber,
          userName: params.staffUser.name,
          userRole: params.staffUser.role,
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString(),
          timestamp: now.getTime(),
        });
      }

      const changeDue = params.cashReceived && params.cashReceived > grandTotal ? params.cashReceived - grandTotal : 0;

      const sale: Sale = {
        id: `sal-${Date.now()}`,
        invoiceNumber,
        branchId: branch.id,
        branchName: branch.name,
        branchAddress: branch.address,
        branchPhone: branch.phone,
        branchGstin: branch.gstin || '',
        branchTaxRate: branchTaxRate,
        staffId: params.staffUser.id,
        staffName: params.staffUser.name,
        customerName: params.customerName || 'Walk-in Customer',
        customerPhone: params.customerPhone,
        items: saleItems,
        subtotal: Number(subtotal.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        taxTotal: Number(taxTotal.toFixed(2)),
        taxAmount: Number(taxTotal.toFixed(2)),
        grandTotal,
        paymentMethod: params.paymentMethod,
        cashReceived: params.cashReceived,
        changeDue,
        status: 'COMPLETED',
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString(),
        timestamp: now.getTime(),
      };

      this.data.sales.unshift(sale);
      this.commit();
      return sale;
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  // SALE CANCELLATION (Reverses stock with audit history)
  public cancelSale(saleId: string, reason: string, user: User): Sale {
    this.beginTransaction();
    try {
      const sale = this.data.sales.find((s) => s.id === saleId);
      if (!sale) throw new Error('Sale not found');
      if (sale.status === 'CANCELLED') throw new Error('Sale is already cancelled');

      // Authorization: Owner or Manager of that branch
      if (user.role !== 'OWNER' && (user.role !== 'BRANCH_MANAGER' || user.branchId !== sale.branchId)) {
        throw new Error('Only the Owner or Branch Manager can cancel completed sales.');
      }

      const now = new Date();
      sale.status = 'CANCELLED';
      sale.cancelReason = reason;

      // Reverse inventory for each item
      for (const item of sale.items) {
        let inv = this.data.inventory.find((i) => i.branchId === sale.branchId && i.productId === item.productId);
        const oldStock = inv ? inv.quantity : 0;
        const newStock = oldStock + item.quantity;

        if (inv) {
          inv.quantity = newStock;
          inv.lastUpdated = now.toISOString();
        } else {
          inv = {
            branchId: sale.branchId,
            productId: item.productId,
            quantity: newStock,
            lastUpdated: now.toISOString(),
          };
          this.data.inventory.push(inv);
        }

        // Reversal audit log
        this.data.stockMovements.unshift({
          id: `sm-${Date.now()}-rev-${item.productId}`,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          branchId: sale.branchId,
          branchName: sale.branchName,
          previousQuantity: oldStock,
          quantityAdded: item.quantity,
          quantityRemoved: 0,
          newQuantity: newStock,
          operationType: 'SALE CANCELLED',
          reason: `Cancelled invoice #${sale.invoiceNumber}. Reason: ${reason}`,
          referenceNumber: sale.invoiceNumber,
          userName: user.name,
          userRole: user.role,
          date: now.toISOString().split('T')[0],
          time: now.toLocaleTimeString(),
          timestamp: now.getTime(),
        });
      }

      this.commit();
      return sale;
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  // DELETE SALE RECORD
  public deleteSale(saleId: string, user: User): boolean {
    this.beginTransaction();
    try {
      const index = this.data.sales.findIndex((s) => s.id === saleId);
      if (index === -1) throw new Error('Sale not found');
      const sale = this.data.sales[index];

      if (user.role !== 'OWNER' && (user.role !== 'BRANCH_MANAGER' || user.branchId !== sale.branchId)) {
        throw new Error('Only the Owner or Branch Manager can delete sales.');
      }

      this.data.sales.splice(index, 1);
      this.commit();
      return true;
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  // Purchases & Bills
  public getPurchases(): Purchase[] {
    return this.data.purchases;
  }

  public createPurchase(purchaseData: Omit<Purchase, 'id' | 'purchaseNumber' | 'createdAt'>): Purchase {
    const count = this.data.purchases.length + 1;
    const purchaseNumber = `PUR-2026-${String(count).padStart(5, '0')}`;

    // Ensure every line item has company and brand
    const itemsWithCompany = (purchaseData.items || []).map((it) => {
      const prod = this.getProductById(it.productId);
      const itemCompany = it.company?.trim() || prod?.company || prod?.brand || purchaseData.company?.trim() || 'General';
      // If product in catalog doesn't have company, sync it
      if (prod && !prod.company && itemCompany && itemCompany !== 'General') {
        prod.company = itemCompany;
      }
      return {
        ...it,
        company: itemCompany,
        brand: it.brand || prod?.brand || itemCompany,
      };
    });

    const primaryCompany = purchaseData.company?.trim() || 
      itemsWithCompany.find((i) => i.company && i.company !== 'General')?.company || 
      itemsWithCompany[0]?.company || 
      'General';

    const newPurchase: Purchase = {
      ...purchaseData,
      id: `pur-${Date.now()}`,
      purchaseNumber,
      company: primaryCompany,
      items: itemsWithCompany,
      createdAt: new Date().toISOString(),
    };

    this.data.purchases.unshift(newPurchase);
    this.persist();
    return newPurchase;
  }

  public getPurchaseBills(): PurchaseBill[] {
    return this.data.purchaseBills;
  }

  public createPurchaseBill(billData: Omit<PurchaseBill, 'id'>): PurchaseBill {
    const newBill: PurchaseBill = {
      ...billData,
      id: `bill-${Date.now()}`,
    };
    this.data.purchaseBills.unshift(newBill);
    this.persist();
    return newBill;
  }

  public getPurchaseAllocations(): PurchaseAllocationRecord[] {
    return this.data.purchaseAllocations;
  }

  public deletePurchaseAllocation(id: string): boolean {
    this.beginTransaction();
    try {
      const idx = this.data.purchaseAllocations.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error('Allocation record not found');
      this.data.purchaseAllocations.splice(idx, 1);
      this.commit();
      return true;
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  // Stock Movements / Audit History
  public getStockMovements(filters?: {
    branchId?: string;
    productId?: string;
    operationType?: string;
    userName?: string;
    search?: string;
  }): StockMovement[] {
    let list = this.data.stockMovements;
    if (!filters) return list;

    if (filters.branchId && filters.branchId !== 'all') {
      list = list.filter((m) => m.branchId === filters.branchId);
    }
    if (filters.productId && filters.productId !== 'all') {
      list = list.filter((m) => m.productId === filters.productId);
    }
    if (filters.operationType && filters.operationType !== 'all') {
      list = list.filter((m) => m.operationType === filters.operationType);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (m) =>
          m.productName.toLowerCase().includes(q) ||
          m.sku.toLowerCase().includes(q) ||
          m.referenceNumber.toLowerCase().includes(q) ||
          m.branchName.toLowerCase().includes(q) ||
          m.userName.toLowerCase().includes(q)
      );
    }
    return list;
  }

  // Sales
  public getSales(filters?: { branchId?: string; staffId?: string; date?: string; search?: string }): Sale[] {
    let list = this.data.sales;
    if (!filters) return list;

    if (filters.branchId && filters.branchId !== 'all') {
      list = list.filter((s) => s.branchId === filters.branchId);
    }
    if (filters.staffId && filters.staffId !== 'all') {
      list = list.filter((s) => s.staffId === filters.staffId);
    }
    if (filters.date) {
      list = list.filter((s) => s.date === filters.date);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(q) ||
          s.branchName.toLowerCase().includes(q) ||
          (s.customerName && s.customerName.toLowerCase().includes(q)) ||
          (s.customerPhone && s.customerPhone.includes(q))
      );
    }
    return list;
  }

  // Staff
  public getStaff(): Staff[] {
    return this.data.staff;
  }

  public createStaff(staffData: Omit<Staff, 'id' | 'staffCode'>): Staff {
    const branch = this.getBranchById(staffData.branchId);
    const code = `STF-${branch ? branch.code : 'HQ'}-${String(this.data.staff.length + 1).padStart(2, '0')}`;
    const newStaff: Staff = {
      ...staffData,
      id: `staff-${Date.now()}`,
      staffCode: code,
      branchName: branch ? branch.name : '',
    };
    this.data.staff.push(newStaff);
    this.persist();
    return newStaff;
  }

  public updateStaff(id: string, updates: Partial<Staff>): Staff {
    const staff = this.data.staff.find((s) => s.id === id);
    if (!staff) throw new Error('Staff not found');
    Object.assign(staff, updates);
    if (updates.branchId) {
      const b = this.getBranchById(updates.branchId);
      if (b) staff.branchName = b.name;
    }
    this.persist();
    return staff;
  }

  public getStaffById(id: string): Staff | undefined {
    return this.data.staff.find((s) => s.id === id);
  }

  public deleteStaff(id: string): void {
    const index = this.data.staff.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Staff not found');
    
    // Remove the staff member
    this.data.staff.splice(index, 1);
    
    // Clean up related data (attendance, salary records, etc.)
    // Remove attendance records for this staff member
    if (this.data.attendance && Array.isArray(this.data.attendance)) {
      this.data.attendance = this.data.attendance.filter((a) => a.staffId !== id);
    }
    
    // Remove salary records for this staff member
    if (this.data.salaryRecords && Array.isArray(this.data.salaryRecords)) {
      this.data.salaryRecords = this.data.salaryRecords.filter((s) => s.staffId !== id);
    }
    
    this.persist();
  }

  // Attendance
  public getAttendance(filters?: { branchId?: string; date?: string }): AttendanceRecord[] {
    let list = this.data.attendance;
    if (!filters) return list;

    if (filters.branchId && filters.branchId !== 'all') {
      list = list.filter((a) => a.branchId === filters.branchId);
    }
    if (filters.date) {
      list = list.filter((a) => a.date === filters.date);
    }
    return list;
  }

  public checkIn(staffUser: User, remarks?: string): AttendanceRecord {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.data.attendance.find((a) => a.staffId === staffUser.id && a.date === today);
    if (existing) {
      throw new Error(`You have already checked in today at ${existing.loginTime}`);
    }

    const staffMember = this.data.staff.find((s) => s.id === staffUser.id);
    const branch = staffUser.branchId ? this.getBranchById(staffUser.branchId) : undefined;
    const now = new Date();

    const record: AttendanceRecord = {
      id: `att-${Date.now()}`,
      date: today,
      staffId: staffUser.id,
      staffName: staffUser.name,
      branchId: staffUser.branchId || '',
      branchName: branch ? branch.name : 'Head Office',
      loginTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'PRESENT',
      remarks,
    };

    this.data.attendance.unshift(record);
    this.persist();
    return record;
  }

  public checkOut(staffUser: User): AttendanceRecord {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.data.attendance.find((a) => a.staffId === staffUser.id && a.date === today);
    if (!existing) {
      throw new Error('No active check-in found for today.');
    }
    const now = new Date();
    existing.logoutTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.persist();
    return existing;
  }

  public updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>, correctedBy: string): AttendanceRecord {
    const record = this.data.attendance.find((a) => a.id === id);
    if (!record) throw new Error('Attendance record not found');
    Object.assign(record, updates);
    record.correctedBy = correctedBy;
    this.persist();
    return record;
  }

  public upsertAttendanceRecord(params: {
    staffId: string;
    staffName?: string;
    branchId?: string;
    branchName?: string;
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'OFF';
    checkInTime?: string;
    checkOutTime?: string;
    remarks?: string;
    correctedBy?: string;
  }): AttendanceRecord {
    let record = this.data.attendance.find((a) => a.staffId === params.staffId && a.date === params.date);
    if (record) {
      if (params.status) record.status = params.status;
      if (params.checkInTime !== undefined) {
        record.checkInTime = params.checkInTime;
        record.loginTime = params.checkInTime || '-';
      }
      if (params.checkOutTime !== undefined) {
        record.checkOutTime = params.checkOutTime;
        record.logoutTime = params.checkOutTime || '-';
      }
      if (params.remarks !== undefined) record.remarks = params.remarks;
      if (params.correctedBy) record.correctedBy = params.correctedBy;
      if (params.branchId) record.branchId = params.branchId;
      if (params.branchName) record.branchName = params.branchName;
      this.persist();
      return record;
    }

    const staffMember = this.data.staff.find((s) => s.id === params.staffId);
    const branch = (params.branchId || staffMember?.branchId) ? this.getBranchById(params.branchId || staffMember!.branchId) : undefined;
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: params.date,
      staffId: params.staffId,
      staffName: params.staffName || staffMember?.name || 'Staff Member',
      branchId: params.branchId || staffMember?.branchId || '',
      branchName: params.branchName || branch?.name || staffMember?.branchName || 'Headquarters',
      loginTime: params.checkInTime || (params.status === 'PRESENT' ? '09:30 AM' : '-'),
      logoutTime: params.checkOutTime || (params.status === 'PRESENT' ? '06:30 PM' : '-'),
      checkInTime: params.checkInTime,
      checkOutTime: params.checkOutTime,
      status: params.status || 'PRESENT',
      remarks: params.remarks || '',
      correctedBy: params.correctedBy,
    };
    this.data.attendance.unshift(newRecord);
    this.persist();
    return newRecord;
  }

  public deleteAttendanceRecord(id: string): void {
    const idx = this.data.attendance.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.data.attendance.splice(idx, 1);
      this.persist();
    }
  }

  // Salary & Mid-Month Advances
  public getSalaries(month?: string): SalaryRecord[] {
    const advances = this.data.salaryAdvances || [];
    
    // Ensure all salaries have their advances synced and netSalary computed accurately
    this.data.salaries.forEach((s) => {
      const sMonthClean = (s.month || '').toLowerCase();
      const staffAdvances = advances.filter(
        (a) => a.staffId === s.staffId && (a.month === s.month || (sMonthClean.includes('sep') && a.month.toLowerCase().includes('sep')) || (sMonthClean.includes('aug') && a.month.toLowerCase().includes('aug')) || (sMonthClean.includes('jul') && a.month.toLowerCase().includes('jul')))
      );
      s.advances = staffAdvances;
      s.advance = staffAdvances.reduce((sum, a) => sum + a.amount, 0);
      s.netSalary = Math.max(0, s.basicSalary + s.allowances - s.deductions + s.bonus + s.overtime - s.advance);
    });

    if (month) {
      const cleanTarget = month.trim().toLowerCase();
      return this.data.salaries.filter((s) => {
        const sm = (s.month || '').trim().toLowerCase();
        return sm === cleanTarget || (cleanTarget.includes('sep') && sm.includes('sep')) || (cleanTarget.includes('aug') && sm.includes('aug')) || (cleanTarget.includes('jul') && sm.includes('jul'));
      });
    }
    return this.data.salaries;
  }

  public getSalaryAdvances(filter?: { month?: string; staffId?: string; branchId?: string }): SalaryAdvance[] {
    let list = this.data.salaryAdvances || [];
    if (filter?.month) {
      const cleanMonth = filter.month.trim().toLowerCase();
      list = list.filter((a) => {
        const am = (a.month || '').trim().toLowerCase();
        return am === cleanMonth || (cleanMonth.includes('sep') && am.includes('sep')) || (cleanMonth.includes('aug') && am.includes('aug')) || (cleanMonth.includes('jul') && am.includes('jul'));
      });
    }
    if (filter?.staffId) {
      list = list.filter((a) => a.staffId === filter.staffId);
    }
    if (filter?.branchId && filter.branchId !== 'ALL') {
      list = list.filter((a) => a.branchId === filter.branchId);
    }
    return list.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public addSalaryAdvance(data: Omit<SalaryAdvance, 'id' | 'createdAt'>): { advance: SalaryAdvance; updatedSalary: SalaryRecord } {
    if (!this.data.salaryAdvances) {
      this.data.salaryAdvances = [];
    }

    const newAdvance: SalaryAdvance = {
      ...data,
      id: `adv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      receiptNumber: data.receiptNumber || `ADV-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };

    this.data.salaryAdvances.push(newAdvance);

    // Sync with corresponding salary record
    const targetMonth = newAdvance.month;
    const cleanMonth = targetMonth.toLowerCase();
    let salaryRec = this.data.salaries.find(
      (s) => s.staffId === newAdvance.staffId && (s.month === targetMonth || (cleanMonth.includes('sep') && s.month.toLowerCase().includes('sep')) || (cleanMonth.includes('aug') && s.month.toLowerCase().includes('aug')))
    );

    if (!salaryRec) {
      const staffMember = this.data.staff.find((st) => st.id === newAdvance.staffId);
      const basicSalary = staffMember?.basicSalary || 25000;
      const allowances = Math.round(basicSalary * 0.15);
      const deductions = Math.round(basicSalary * 0.05);
      salaryRec = {
        id: `sal-${Date.now().toString().slice(-4)}-${newAdvance.staffId}`,
        staffId: newAdvance.staffId,
        staffName: newAdvance.staffName,
        branchId: newAdvance.branchId,
        branchName: newAdvance.branchName,
        month: targetMonth,
        basicSalary,
        allowances,
        deductions,
        overtime: 0,
        bonus: 0,
        advance: 0,
        netSalary: basicSalary + allowances - deductions,
        paymentStatus: 'PENDING',
        status: 'PENDING',
      };
      this.data.salaries.push(salaryRec);
    }

    // Recalculate advances for this staff & month
    const staffAdvances = this.data.salaryAdvances.filter(
      (a) => a.staffId === salaryRec!.staffId && (a.month === salaryRec!.month || (salaryRec!.month.toLowerCase().includes('sep') && a.month.toLowerCase().includes('sep')) || (salaryRec!.month.toLowerCase().includes('aug') && a.month.toLowerCase().includes('aug')))
    );
    salaryRec.advances = staffAdvances;
    salaryRec.advance = staffAdvances.reduce((sum, a) => sum + a.amount, 0);
    salaryRec.netSalary = Math.max(0, salaryRec.basicSalary + salaryRec.allowances - salaryRec.deductions + salaryRec.bonus + salaryRec.overtime - salaryRec.advance);

    this.persist();
    return { advance: newAdvance, updatedSalary: salaryRec };
  }

  public deleteSalaryAdvance(id: string): { success: boolean; updatedSalary?: SalaryRecord } {
    if (!this.data.salaryAdvances) return { success: false };
    const idx = this.data.salaryAdvances.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Salary advance record not found');
    const removed = this.data.salaryAdvances[idx];
    this.data.salaryAdvances.splice(idx, 1);

    const cleanMonth = removed.month.toLowerCase();
    const salaryRec = this.data.salaries.find(
      (s) => s.staffId === removed.staffId && (s.month === removed.month || (cleanMonth.includes('sep') && s.month.toLowerCase().includes('sep')) || (cleanMonth.includes('aug') && s.month.toLowerCase().includes('aug')))
    );

    if (salaryRec) {
      const staffAdvances = this.data.salaryAdvances.filter(
        (a) => a.staffId === salaryRec.staffId && (a.month === salaryRec.month || (salaryRec.month.toLowerCase().includes('sep') && a.month.toLowerCase().includes('sep')) || (salaryRec.month.toLowerCase().includes('aug') && a.month.toLowerCase().includes('aug')))
      );
      salaryRec.advances = staffAdvances;
      salaryRec.advance = staffAdvances.reduce((sum, a) => sum + a.amount, 0);
      salaryRec.netSalary = Math.max(0, salaryRec.basicSalary + salaryRec.allowances - salaryRec.deductions + salaryRec.bonus + salaryRec.overtime - salaryRec.advance);
    }

    this.persist();
    return { success: true, updatedSalary: salaryRec };
  }

  public updateSalaryRecord(id: string, updates: Partial<SalaryRecord>): SalaryRecord {
    const record = this.data.salaries.find((s) => s.id === id);
    if (!record) throw new Error('Salary record not found');
    Object.assign(record, updates);
    // Recalculate net salary
    record.netSalary = Math.max(0, record.basicSalary + record.allowances - record.deductions + record.bonus + record.overtime - record.advance);
    this.persist();
    return record;
  }

  public paySalary(id: string, paymentMode?: string): SalaryRecord {
    const record = this.data.salaries.find((s) => s.id === id);
    if (!record) throw new Error('Salary record not found');
    record.status = 'PAID';
    record.paymentStatus = 'PAID';
    record.paymentDate = new Date().toISOString().split('T')[0];
    record.paymentMode = paymentMode || 'Bank Transfer';
    this.persist();
    return record;
  }

  public deleteSalaryRecord(id: string): boolean {
    this.beginTransaction();
    try {
      const idx = this.data.salaries.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Salary record not found');
      this.data.salaries.splice(idx, 1);
      this.commit();
      return true;
    } catch (err) {
      this.rollback();
      throw err;
    }
  }

  // Suppliers
  public getSuppliers(): Supplier[] {
    return this.data.suppliers;
  }

  public createSupplier(supplierData: Omit<Supplier, 'id'>): Supplier {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
    };
    this.data.suppliers.push(newSupplier);
    this.persist();
    return newSupplier;
  }

  // Notifications
  public getNotifications(): NotificationItem[] {
    return this.data.notifications;
  }

  public markNotificationAsRead(id: string): void {
    const n = this.data.notifications.find((item) => item.id === id);
    if (n) {
      n.isRead = true;
      this.persist();
    }
  }

  public markAllNotificationsAsRead(): void {
    this.data.notifications.forEach((n) => (n.isRead = true));
    this.persist();
  }

  // Settings
  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<AppSettings>): AppSettings {
    Object.assign(this.data.settings, updates);
    this.persist();
    return this.data.settings;
  }

  // Consolidated Analytics & Reports
  public getCompanyReport() {
    const today = new Date().toISOString().split('T')[0];

    // Branch cards summary
    const branchSummaries = this.data.branches.map((b) => {
      const branchSales = this.data.sales.filter((s) => s.branchId === b.id && s.status === 'COMPLETED');
      const todaySales = branchSales.filter((s) => s.date === today);
      const totalSalesRevenue = branchSales.reduce((acc, s) => acc + s.grandTotal, 0);
      const todaySalesRevenue = todaySales.reduce((acc, s) => acc + s.grandTotal, 0);

      // Stock value and count
      let branchStockValue = 0;
      let totalStockUnits = 0;
      let lowStockCount = 0;

      this.data.products.forEach((p) => {
        const inv = this.data.inventory.find((i) => i.branchId === b.id && i.productId === p.id);
        const qty = inv ? inv.quantity : 0;
        totalStockUnits += qty;
        branchStockValue += qty * p.sellingPrice;
        if (qty <= p.reorderLevel) lowStockCount++;
      });

      const staffCount = this.data.staff.filter((s) => s.branchId === b.id && s.status === 'ACTIVE').length;

      return {
        branch: b,
        stockValue: branchStockValue,
        totalStockUnits,
        todaySales: todaySalesRevenue,
        todayTransactions: todaySales.length,
        totalSales: totalSalesRevenue,
        lowStockCount,
        staffCount,
      };
    });

    const totalCompanyStockUnits = branchSummaries.reduce((acc, b) => acc + b.totalStockUnits, 0);
    const totalCompanyStockValue = branchSummaries.reduce((acc, b) => acc + b.stockValue, 0);
    const todayCompanySales = branchSummaries.reduce((acc, b) => acc + b.todaySales, 0);
    const totalCompanySales = branchSummaries.reduce((acc, b) => acc + b.totalSales, 0);
    const totalPurchasesAmount = this.data.purchases.reduce((acc, p) => acc + p.grandTotal, 0);

    return {
      totalCompanyStockUnits,
      totalCompanyStockValue,
      todayCompanySales,
      totalCompanySales,
      totalPurchasesAmount,
      totalStaffCount: this.data.staff.length,
      branchSummaries,
      recentMovements: this.data.stockMovements.slice(0, 10),
      recentSales: this.data.sales.slice(0, 10),
      recentPurchases: this.data.purchases.slice(0, 5),
    };
  }
}

export const db = new PetWorldDatabase();
