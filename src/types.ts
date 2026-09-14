export type UserRole = 'OWNER' | 'BRANCH_MANAGER' | 'CASHIER' | 'SALES_STAFF';

export type PetAvatarType = 'dog' | 'cat' | 'bird' | 'fish' | 'rabbit' | 'hamster';

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  branchId?: string; // If null/empty -> Owner/Super Admin
  avatarType: PetAvatarType;
  designation?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  managerName: string;
  status: 'ACTIVE' | 'INACTIVE';
  openingDate: string;
  taxRate: number;
  gstin?: string;
  accessPassword?: string;
}

export type ProductCategory =
  | 'Dog Food'
  | 'Cat Food'
  | 'Bird Food'
  | 'Fish Food'
  | 'Pet Treats'
  | 'Toys'
  | 'Leashes & Collars'
  | 'Beds & Mats'
  | 'Grooming'
  | 'Medicines & Care'
  | 'Accessories'
  | 'Aquarium Products'
  | 'Bird Accessories'
  | 'Other'
  | (string & {});

export type ProductForm = 'DRIED' | 'WET' | 'OTHER';

export type AnimalType = 'Dog' | 'Cat' | 'Bird' | 'Fish' | 'Small Pet' | 'Other';
export type LifeStageType = 'Puppy' | 'Kitten' | 'Adult' | 'Senior' | 'All Life Stages';

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  brand: string;
  company?: string;
  productForm?: ProductForm;
  animal?: AnimalType;
  lifeStage?: LifeStageType;
  size?: string;
  batchNumber?: string;
  expiryDate?: string;
  unit: 'kg' | 'packet' | 'can' | 'piece' | 'bottle' | 'box';
  purchasePrice: number;
  costPrice?: number;
  sellingPrice: number;
  mrp: number;
  taxPercent: number;
  minStockLevel: number;
  reorderLevel: number;
  supplierId: string;
  supplierName: string;
  imageUrl?: string;
  avatarType: PetAvatarType;
  status: 'ACTIVE' | 'DISCONTINUED';
}

export interface InventoryItem {
  id?: string;
  branchId: string;
  branchName?: string;
  productId: string;
  productName?: string;
  sku?: string;
  barcode?: string;
  company?: string;
  brand?: string;
  productForm?: ProductForm;
  animal?: AnimalType;
  lifeStage?: LifeStageType;
  size?: string;
  batchNumber?: string;
  expiryDate?: string;
  imageUrl?: string;
  quantity: number;
  lastUpdated: string;
}

export type BranchInventory = InventoryItem;

export interface StockHistoryEntry {
  id: string;
  type: 'INWARD' | 'TRANSFER' | 'ADJUSTMENT' | 'SALE' | 'ALLOCATION';
  productId: string;
  productName: string;
  sku: string;
  branchId: string;
  branchName: string;
  toBranchId?: string;
  toBranchName?: string;
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  staffName: string;
  remarks?: string;
  date: string;
  time: string;
  timestamp: number;
}

export type StockActionType =
  | 'STOCK ADDED'
  | 'STOCK SOLD'
  | 'STOCK TRANSFERRED'
  | 'STOCK ADJUSTED'
  | 'STOCK RETURNED'
  | 'STOCK DAMAGED'
  | 'STOCK REMOVED'
  | 'SALE CANCELLED';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  branchId: string;
  branchName: string;
  previousQuantity: number;
  quantityAdded: number;
  quantityRemoved: number;
  newQuantity: number;
  operationType: StockActionType;
  reason: string;
  referenceNumber: string;
  purchaseBillNumber?: string;
  batchNumber?: string;
  expiryDate?: string;
  userName: string;
  userRole: string;
  date: string;
  time: string;
  timestamp: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city?: string;
  gstin: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  company?: string;
  brand?: string;
  quantity: number;
  purchasePrice: number;
  taxPercent: number;
  discount: number;
  total: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string; // e.g. PUR-2026-00001
  company?: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNumber: string;
  purchaseDate: string;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING';
  paymentMethod: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'UPI';
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  notes: string;
  allocatedStatus: 'UNALLOCATED' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED';
  fileName?: string;
  fileUrl?: string;
  createdAt: string;
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  purchaseId?: string;
  purchaseReference?: string;
  supplierId: string;
  supplierName: string;
  invoiceDate: string;
  billDate?: string;
  dueDate?: string;
  invoiceAmount: number;
  totalAmount?: number;
  paidAmount?: number;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
  fileUrl?: string;
  fileName?: string;
  notes?: string;
}

export interface PurchaseAllocationBranchItem {
  branchId: string;
  branchName: string;
  allocatedQuantity: number;
  previousStock: number;
  newStock: number;
}

export interface PurchaseAllocationRecord {
  id: string;
  purchaseId: string;
  purchaseNumber: string;
  productId: string;
  productName: string;
  sku: string;
  totalPurchased: number;
  allocations: PurchaseAllocationBranchItem[];
  allocatedBy: string;
  date: string;
  time: string;
  timestamp: number;
  notes?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  totalPrice?: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string; // e.g. SAL-2026-000145
  branchId: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  branchGstin?: string;
  branchTaxRate?: number;
  staffId: string;
  staffName: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  taxAmount?: number;
  grandTotal: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'SPLIT';
  cashReceived?: number;
  changeDue?: number;
  status: 'COMPLETED' | 'CANCELLED';
  cancelReason?: string;
  date: string;
  time: string;
  timestamp: number;
  createdAt?: string;
}

export interface Staff {
  id: string;
  staffCode: string;
  name: string;
  avatarType: PetAvatarType;
  phone: string;
  email: string;
  address?: string;
  branchId: string;
  branchName: string;
  designation: string;
  role: UserRole;
  joiningDate: string;
  basicSalary: number;
  status: 'ACTIVE' | 'INACTIVE';
  username: string;
}

export type StaffMember = Staff;

export interface AttendanceRecord {
  id: string;
  date: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  loginTime: string;
  logoutTime?: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE' | 'OFF';
  remarks?: string;
  correctedBy?: string;
}

export interface SalaryAdvance {
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  month: string; // e.g. "September 2026"
  date: string; // "2026-09-04"
  amount: number;
  reason: string;
  notes?: string;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer';
  approvedBy?: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface SalaryRecord {
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  month: string; // e.g. "September 2026"
  basicSalary: number;
  allowances: number;
  deductions: number;
  overtime: number;
  bonus: number;
  advance: number;
  advances?: SalaryAdvance[];
  netSalary: number;
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'PENDING';
  status?: 'PAID' | 'PARTIALLY_PAID' | 'PENDING';
  paymentDate?: string;
  paymentMethod?: string;
  paymentMode?: string;
}

export interface NotificationItem {
  id: string;
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'LARGE_PURCHASE' | 'SALARY_PENDING' | 'ATTENDANCE_ALERT' | 'RECENT_SALE' | 'STOCK_TRANSFER';
  title: string;
  message: string;
  branchId?: string;
  branchName?: string;
  timestamp: number;
  date: string;
  time: string;
  isRead: boolean;
  referenceId?: string;
}

export interface AppSettings {
  businessName: string;
  tagline: string;
  logoUrl?: string;
  headOfficeAddress: string;
  headOfficePhone: string;
  gstin: string;
  invoicePrefix: string;
  thermalWidth: '58mm' | '80mm';
  defaultTaxRate: number;
  currencySymbol: string;
  currencyCode: string;
  lowStockDefaultThreshold: number;
  receiptFooter: string;
  paymentMethods: string[];
}
