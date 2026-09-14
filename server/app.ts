import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { db } from './db.js';
import { OWNER_USER } from './data.js';
import { User } from '../src/types.js';
import {
  verifyPassword,
  OWNER_LOGIN_PASSWORD,
  BRANCH_CREDENTIALS,
  generateBranchPassword,
} from '../src/data/branches.js';
import {
  checkSupabaseConnection,
  getSupabaseSchemaSQL,
  getSupabaseConfig,
} from './supabase.js';

const app = express();

// High-speed GZIP response compression for fast data and bill loading
app.use(compression());

// CORS headers for iframe / cross-origin preview support and Vercel domains
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-id, x-user-role, x-user-branch-id');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to authenticate request from headers
export function getRequestUser(req: express.Request): User {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;
  const userBranchId = req.headers['x-user-branch-id'] as string;

  if (userId === OWNER_USER.id || userRole === 'OWNER' || (!userId && !userRole)) {
    return OWNER_USER;
  }

  const staff = db.getStaff().find((s) => s.id === userId || s.username === userId);
  if (staff) {
    return {
      id: staff.id,
      username: staff.username,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      branchId: staff.branchId,
      avatarType: staff.avatarType,
      designation: staff.designation,
      status: staff.status,
    };
  }

  // Fallback to Owner if not specified
  return OWNER_USER;
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), env: process.env.VERCEL ? 'vercel-serverless' : 'standard' });
});

// Bootstrap full initial state for client
app.get('/api/bootstrap', (req, res) => {
  try {
    const user = getRequestUser(req);
    const branches = db.getBranches();
    const products = db.getProducts();
    const rawInventory = db.getInventory();
    
    // Augment inventory with branchName, productName, and sku for easy client rendering
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));
    const productMap = new Map(products.map((p) => [p.id, p]));
    
    const inventory = rawInventory.map((inv) => {
      const prod = productMap.get(inv.productId);
      return {
        ...inv,
        id: `inv-${inv.branchId}-${inv.productId}`,
        branchName: branchMap.get(inv.branchId) || inv.branchId,
        productName: prod ? prod.name : 'Unknown Product',
        sku: prod ? prod.sku : '',
        company: prod ? (prod.company || prod.brand) : '',
        brand: prod ? prod.brand : '',
        productForm: prod ? prod.productForm : 'OTHER',
        imageUrl: prod ? prod.imageUrl : undefined,
      };
    });

    const isOwner = user.role === 'OWNER';
    const filterBranchId = isOwner ? undefined : user.branchId;

    const sales = db.getSales(filterBranchId ? { branchId: filterBranchId } : undefined);
    const purchases = db.getPurchases();
    const purchaseBills = db.getPurchaseBills();
    const staff = db.getStaff();
    const attendance = db.getAttendance(filterBranchId ? { branchId: filterBranchId } : undefined);
    const salaries = db.getSalaries();
    const salaryAdvances = db.getSalaryAdvances();
    const stockHistory = db.getStockMovements(filterBranchId ? { branchId: filterBranchId } : undefined);
    const purchaseAllocations = db.getPurchaseAllocations();
    const suppliers = db.getSuppliers();
    const notifications = db.getNotifications();
    const settings = db.getSettings();
    const categories = db.getCategories();

    res.json({
      branches,
      products,
      categories,
      inventory,
      sales,
      purchases,
      purchaseBills,
      purchaseAllocations,
      staff,
      attendance,
      salaries,
      salaryAdvances,
      stockHistory,
      suppliers,
      notifications,
      settings,
    });
  } catch (err: any) {
    console.error('Error in bootstrap:', err);
    res.status(500).json({ error: err.message });
  }
});

// Auth Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password, scope, branchId, staffId } = req.body || {};

  // 1. Explicit Owner selection
  if (scope === 'OWNER' || branchId === 'OWNER' || (!username && !staffId && scope === 'owner')) {
    if (!password || !verifyPassword('OWNER', password)) {
      return res.status(401).json({ error: 'Incorrect Owner password. Please enter the authorized password.' });
    }
    return res.json({ user: OWNER_USER, token: 'token-owner-001' });
  }

  // 2. Direct branch login
  if (branchId && branchId !== 'OWNER') {
    const branch = db.getBranchById(branchId);
    if (!password || !verifyPassword(branchId, password, branch)) {
      return res.status(401).json({ error: 'Incorrect password for this branch. Please enter the valid branch password.' });
    }

    const branchStaff = db.getStaff().filter((s) => s.branchId === branchId);
    let staff = staffId ? branchStaff.find((s) => s.id === staffId || s.username === staffId) : null;
    if (!staff) {
      staff = branchStaff.find((s) => s.role === 'BRANCH_MANAGER') || branchStaff.find((s) => s.role === 'CASHIER') || branchStaff[0];
    }
    if (staff) {
      const user: User = {
        id: staff.id,
        username: staff.username,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        branchId: staff.branchId,
        avatarType: staff.avatarType,
        designation: staff.designation,
        status: staff.status,
      };
      return res.json({ user, token: `token-staff-${staff.id}` });
    }
  }

  // 3. Username / Password login fallback
  if (!username) {
    return res.status(400).json({ error: 'Please select a branch or enter your credentials' });
  }

  const cleanUser = String(username).trim().toLowerCase();

  // Owner username login
  if (cleanUser === 'owner' || cleanUser === 'admin') {
    if (!password || !verifyPassword('OWNER', password)) {
      return res.status(401).json({ error: 'Incorrect Owner password.' });
    }
    return res.json({ user: OWNER_USER, token: 'token-owner-001' });
  }

  // Staff login
  const staff = db.getStaff().find((s) => s.username.toLowerCase() === cleanUser);
  if (staff) {
    const staffBranch = staff.branchId ? db.getBranchById(staff.branchId) : undefined;
    if (staff.branchId && !verifyPassword(staff.branchId, password, staffBranch)) {
      return res.status(401).json({ error: 'Incorrect branch password.' });
    }
    const user: User = {
      id: staff.id,
      username: staff.username,
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      branchId: staff.branchId,
      avatarType: staff.avatarType,
      designation: staff.designation,
      status: staff.status,
    };
    return res.json({ user, token: `token-staff-${staff.id}` });
  }

  return res.status(401).json({ error: 'Invalid credentials. Select a branch/owner and enter the correct password.' });
});

app.get('/api/auth/demo-users', (req, res) => {
  const allStaff = db.getStaff();
  const demoUsers = [
    {
      id: OWNER_USER.id,
      name: OWNER_USER.name,
      username: OWNER_USER.username,
      role: 'OWNER',
      designation: OWNER_USER.designation,
      branchName: 'All Branches (Super Admin)',
      avatarType: OWNER_USER.avatarType,
    },
    ...allStaff.map((s) => ({
      id: s.id,
      name: s.name,
      username: s.username,
      role: s.role,
      designation: s.designation,
      branchId: s.branchId,
      branchName: s.branchName,
      avatarType: s.avatarType,
    })),
  ];
  res.json(demoUsers);
});

// Branches
app.get('/api/branches', (req, res) => {
  res.json(db.getBranches());
});

app.post('/api/branches', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can create branches.' });
    }
    const created = db.createBranch(req.body);
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/branches/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER' && user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Only Owner or Branch Manager can update branch settings.' });
    }
    const updated = db.updateBranch(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/branches/:id/generate-password', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can generate branch passwords.' });
    }
    const branch = db.getBranchById(req.params.id);
    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    const newPassword = generateBranchPassword(branch.name, branch.code);
    const updated = db.updateBranch(req.params.id, { accessPassword: newPassword });
    res.json({ success: true, branch: updated, password: newPassword });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Uploads Directory & Image Uploads (Safe on Vercel)
const isVercel = Boolean(process.env.VERCEL);
const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads') : path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (_) {}
}
app.use('/uploads', express.static(UPLOADS_DIR));

app.post('/api/upload-image', (req, res) => {
  try {
    const { image, fileName } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (image.startsWith('data:image/')) {
      const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];
        const safeName = (fileName || 'product')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 30);
        const savedFileName = `${Date.now()}-${safeName}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, savedFileName);
        try {
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          return res.json({ url: `/uploads/${savedFileName}` });
        } catch {
          // If filesystem write fails on serverless, return data URL directly
          return res.json({ url: image });
        }
      }
    }

    // Direct URL or hosted link
    return res.json({ url: image });
  } catch (err: any) {
    console.error('Upload image error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Categories
app.get('/api/categories', (req, res) => {
  try {
    res.json({ categories: db.getCategories() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const result = db.addCategory(name.trim());
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/categories/:name', (req, res) => {
  try {
    const categoryName = decodeURIComponent(req.params.name);
    const fallbackCategory = (req.query.fallback as string) || (req.body?.fallbackCategory as string) || 'Other';
    const result = db.deleteCategory(categoryName, fallbackCategory);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Products
app.get('/api/products', (req, res) => {
  res.json(db.getProducts());
});

// Fast Barcode Lookup for billing and inventory
app.get('/api/products/barcode/:barcode', (req, res) => {
  try {
    const { barcode } = req.params;
    const product = db.getProductByBarcode(barcode);
    if (!product) {
      return res.status(404).json({ error: 'Product not found', barcode });
    }
    const companyStock = db.getProductCompanyStock(product.id);
    res.json({
      product,
      totalStock: companyStock.total,
      branchStock: companyStock.byBranch,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER' && user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Only Owner / Stock Manager can add new products.' });
    }
    const created = db.createProduct(req.body);
    res.json(created);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER' && user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Only Owner / Stock Manager can update products.' });
    }
    const updated = db.updateProduct(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER' && user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Only Owner / Stock Manager can delete products.' });
    }
    const success = db.deleteProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted from inventory', id: req.params.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Inventory
app.get('/api/inventory', (req, res) => {
  res.json(db.getInventory());
});

app.delete('/api/inventory/:branchId/:productId', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER' && user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Only Owner / Stock Manager can delete branch inventory.' });
    }
    const success = db.deleteBranchInventory(req.params.branchId, req.params.productId);
    res.json({ success, message: 'Branch inventory record removed' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/inventory/branch/:branchId', (req, res) => {
  try {
    const user = getRequestUser(req);
    // Security check: If staff, enforce branch isolation
    if (user.role !== 'OWNER' && user.branchId && user.branchId !== req.params.branchId) {
      return res.status(403).json({ error: 'Access denied: You can only view your assigned branch inventory.' });
    }
    const branchStock = db.getBranchInventory(req.params.branchId);
    res.json(branchStock);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Helper for inward stock addition
const handleInwardStock = (req: express.Request, res: express.Response) => {
  try {
    const user = getRequestUser(req);
    const {
      productId,
      barcode,
      branchId,
      quantity,
      purchasePrice,
      sellingPrice,
      supplierName,
      purchaseBillNumber,
      invoiceNumber,
      batchNumber,
      expiryDate,
      notes,
    } = req.body;

    const effectiveInvoice = invoiceNumber || purchaseBillNumber;
    const effectiveBranch = branchId || (user.branchId ? user.branchId : db.getBranches()[0]?.id || 'branch-1');

    if (barcode && !productId) {
      const result = db.addStockByBarcode({
        barcode,
        branchId: effectiveBranch,
        quantity: Number(quantity),
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
        supplierName,
        purchaseBillNumber: effectiveInvoice,
        batchNumber,
        expiryDate,
        notes,
        user,
      });
      return res.json(result);
    }

    if (!productId) {
      return res.status(400).json({ error: 'Either productId or barcode must be provided.' });
    }

    const result = db.addStock({
      productId,
      branchId: effectiveBranch,
      quantity: Number(quantity),
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
      supplierName,
      purchaseBillNumber: effectiveInvoice,
      batchNumber,
      expiryDate,
      notes,
      user,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

// Stock Addition endpoints (supports both routes)
app.post('/api/inventory/add-stock', handleInwardStock);
app.post('/api/stock/inward', handleInwardStock);
app.post('/api/inventory/inward-by-barcode', handleInwardStock);

// CSV Bulk Inventory Import
app.post('/api/inventory/import-csv', (req, res) => {
  try {
    const user = getRequestUser(req);
    const { items, branchId } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for import.' });
    }
    const targetBranch = branchId || (user.branchId ? user.branchId : db.getBranches()[0]?.id || 'branch-1');
    const result = db.bulkImportInventoryCsv({
      items,
      branchId: targetBranch,
      user,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Stock Adjustment (Owner Only)
const handleStockAdjustment = (req: express.Request, res: express.Response) => {
  try {
    const user = getRequestUser(req);
    const { productId, branchId, newQuantity, reason } = req.body;
    const result = db.adjustStock({
      productId,
      branchId,
      newQuantity: Number(newQuantity),
      reason,
      user,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
app.post('/api/inventory/adjust-stock', handleStockAdjustment);
app.post('/api/stock/adjust', handleStockAdjustment);

// Stock Transfer (Owner Only)
const handleStockTransfer = (req: express.Request, res: express.Response) => {
  try {
    const user = getRequestUser(req);
    const { productId, fromBranchId, toBranchId, quantity, reason } = req.body;
    const result = db.transferStock({
      productId,
      fromBranchId,
      toBranchId,
      quantity: Number(quantity),
      reason,
      user,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
app.post('/api/inventory/transfer-stock', handleStockTransfer);
app.post('/api/stock/transfer', handleStockTransfer);

// Stock Movements Audit Trail
app.get('/api/stock-movements', (req, res) => {
  const { branchId, productId, operationType, search } = req.query as Record<string, string>;
  const user = getRequestUser(req);

  // If staff, only show their branch audit
  const effectiveBranch = user.role !== 'OWNER' && user.branchId ? user.branchId : branchId;

  const movements = db.getStockMovements({
    branchId: effectiveBranch,
    productId,
    operationType,
    search,
  });
  res.json(movements);
});

// Purchases
app.get('/api/purchases', (req, res) => {
  res.json(db.getPurchases());
});

app.post('/api/purchases', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can create purchase records.' });
    }
    const purchase = db.createPurchase(req.body);
    if (req.body.supplierInvoiceNumber || req.body.billNumber) {
      try {
        db.createPurchaseBill({
          billNumber: req.body.supplierInvoiceNumber || req.body.billNumber,
          purchaseId: purchase.id,
          purchaseReference: purchase.purchaseNumber,
          supplierId: purchase.supplierId,
          supplierName: purchase.supplierName,
          invoiceDate: purchase.purchaseDate || new Date().toISOString().split('T')[0],
          invoiceAmount: purchase.grandTotal || 0,
          paymentStatus: (purchase.paymentStatus as any) || 'PENDING',
          fileName: req.body.fileName,
          fileUrl: req.body.fileUrl,
          notes: req.body.notes,
        });
      } catch (billErr) {
        console.warn('Failed to auto-create linked purchase bill:', billErr);
      }
    }
    res.json(purchase);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/purchases/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can delete purchase records.' });
    }
    const success = db.deletePurchase(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Purchase record not found.' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Purchase Bills
app.get('/api/purchase-bills', (req, res) => {
  res.json(db.getPurchaseBills());
});

app.post('/api/purchase-bills', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can add purchase bills.' });
    }
    const bill = db.createPurchaseBill(req.body);
    res.json(bill);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Purchase Stock Allocation (Major Feature)
const handleStockAllocationRoute = (req: express.Request, res: express.Response) => {
  try {
    const user = getRequestUser(req);
    let { purchaseId, productId, allocations, notes } = req.body;
    if (allocations && !Array.isArray(allocations) && typeof allocations === 'object') {
      allocations = Object.entries(allocations).map(([branchId, quantity]) => ({
        branchId,
        quantity: Number(quantity) || 0,
      }));
    }
    const record = db.allocatePurchaseStock({
      purchaseId,
      productId,
      allocations,
      user,
      notes,
    });
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

app.post('/api/purchases/allocate', handleStockAllocationRoute);
app.post('/api/stock/allocate', handleStockAllocationRoute);

app.get('/api/purchase-allocations', (req, res) => {
  res.json(db.getPurchaseAllocations());
});

app.delete('/api/purchase-allocations/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER' && user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Access denied: Only Owner or Branch Manager can delete allocations.' });
    }
    db.deletePurchaseAllocation(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Sales & POS Counter
app.get('/api/sales', (req, res) => {
  const { branchId, staffId, date, search } = req.query as Record<string, string>;
  const user = getRequestUser(req);

  // If staff, restrict to their assigned branch
  const effectiveBranch = user.role !== 'OWNER' && user.branchId ? user.branchId : branchId;

  const sales = db.getSales({
    branchId: effectiveBranch,
    staffId,
    date,
    search,
  });
  res.json(sales);
});

// Transactional POS Checkout
app.post('/api/sales', (req, res) => {
  try {
    const user = getRequestUser(req);
    const { branchId, customerName, customerPhone, items, paymentMethod, cashReceived } = req.body;

    // Verify branch authorization
    const targetBranch = branchId || user.branchId;
    if (user.role !== 'OWNER' && user.branchId && user.branchId !== targetBranch) {
      return res.status(403).json({ error: 'Access denied: You cannot checkout sales for another branch.' });
    }

    const sale = db.createSale({
      branchId: targetBranch,
      staffUser: user,
      customerName,
      customerPhone,
      items,
      paymentMethod,
      cashReceived: cashReceived ? Number(cashReceived) : undefined,
    });

    res.json(sale);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel Sale (Reverses stock)
app.post('/api/sales/:id/cancel', (req, res) => {
  try {
    const user = getRequestUser(req);
    const { reason } = req.body;
    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ error: 'A valid cancellation reason is required.' });
    }
    const cancelledSale = db.cancelSale(req.params.id, reason, user);
    res.json(cancelledSale);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Sale Transaction
app.delete('/api/sales/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    db.deleteSale(req.params.id, user);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// UTILITY: Fix Sales Dates (Convert old 2026 dates to recent dates)
app.post('/api/sales/fix-dates', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can run database utilities.' });
    }

    const allSales = db.getSales({});
    let updatedCount = 0;
    
    allSales.forEach((sale) => {
      // Check if the sale has a future date (2026+) or very old date (before 2024)
      const saleYear = parseInt(sale.date.split('-')[0]);
      
      if (saleYear >= 2026 || saleYear < 2024) {
        // Calculate days to subtract to make it recent (2-7 days ago)
        const randomDaysAgo = Math.floor(Math.random() * 6) + 2; // 2-7 days ago
        const newDate = new Date();
        newDate.setDate(newDate.getDate() - randomDaysAgo);
        
        // Generate random time between 9 AM and 8 PM
        const randomHour = Math.floor(Math.random() * 11) + 9; // 9-19
        const randomMinute = Math.floor(Math.random() * 60);
        const randomSecond = Math.floor(Math.random() * 60);
        newDate.setHours(randomHour, randomMinute, randomSecond, 0);
        
        // Update the sale
        db.updateSaleDate(sale.id, {
          date: newDate.toISOString().split('T')[0],
          time: newDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: true 
          }),
          timestamp: newDate.getTime(),
        });
        
        updatedCount++;
      }
    });

    res.json({ 
      success: true, 
      message: `Updated ${updatedCount} sales record(s) to recent dates`,
      totalSales: allSales.length,
      updatedCount 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Staff
app.get('/api/staff', (req, res) => {
  res.json(db.getStaff());
});

app.post('/api/staff', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can register new staff.' });
    }
    const staff = db.createStaff(req.body);
    res.json(staff);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/staff/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can update staff profiles.' });
    }
    const staff = db.updateStaff(req.params.id, req.body);
    res.json(staff);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/staff/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can delete staff members.' });
    }
    
    const staffId = req.params.id;
    console.log(`[DELETE STAFF] Attempting to delete staff with ID: ${staffId}`);
    
    // Check if staff exists before deletion
    const staff = db.getStaffById(staffId);
    if (!staff) {
      console.log(`[DELETE STAFF] Staff not found: ${staffId}`);
      return res.status(404).json({ error: 'Staff member not found' });
    }
    
    console.log(`[DELETE STAFF] Found staff: ${staff.name} (${staffId})`);
    db.deleteStaff(staffId);
    console.log(`[DELETE STAFF] Successfully deleted staff: ${staff.name}`);
    
    res.json({ success: true, message: 'Staff member deleted successfully', deletedStaff: staff.name });
  } catch (err: any) {
    console.error('[DELETE STAFF] Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Attendance
app.get('/api/attendance', (req, res) => {
  const { branchId, date } = req.query as Record<string, string>;
  const user = getRequestUser(req);
  const effectiveBranch = user.role !== 'OWNER' && user.branchId ? user.branchId : branchId;
  res.json(db.getAttendance({ branchId: effectiveBranch, date }));
});

app.post('/api/attendance/check-in', (req, res) => {
  try {
    const user = getRequestUser(req);
    const record = db.checkIn(user, req.body.remarks);
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/attendance/check-out', (req, res) => {
  try {
    const user = getRequestUser(req);
    const record = db.checkOut(user);
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/attendance/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can correct attendance records.' });
    }
    const record = db.updateAttendanceRecord(req.params.id, req.body, user.name);
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/attendance/:id/correct', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can correct attendance records.' });
    }
    const record = db.updateAttendanceRecord(req.params.id, req.body, user.name);
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/attendance/upsert', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can log or modify attendance records.' });
    }
    const record = db.upsertAttendanceRecord({
      ...req.body,
      correctedBy: user.name,
    });
    res.json(record);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/attendance/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER' && user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Access denied: Only Owner or Branch Manager can delete attendance records.' });
    }
    db.deleteAttendanceRecord(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Salaries
app.get('/api/salaries', (req, res) => {
  const { month } = req.query as Record<string, string>;
  const user = getRequestUser(req);
  if (user.role !== 'OWNER') {
    // Ordinary staff can only view their own salary
    const all = db.getSalaries(month);
    return res.json(all.filter((s) => s.staffId === user.id));
  }
  res.json(db.getSalaries(month));
});

app.put('/api/salaries/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can update salary records.' });
    }
    const updated = db.updateSalaryRecord(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/salaries/:id/pay', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can disburse salary payments.' });
    }
    const { paymentMode } = req.body;
    const paid = db.paySalary(req.params.id, paymentMode);
    res.json(paid);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Salary Record
app.delete('/api/salaries/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER' && user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Access denied: Only Owner or Branch Manager can delete salary records.' });
    }
    db.deleteSalaryRecord(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Mid-Month Salary Advances / Kharcha
app.get('/api/salaries/advances', (req, res) => {
  try {
    const user = getRequestUser(req);
    const { month, staffId, branchId } = req.query as Record<string, string>;
    if (user.role !== 'OWNER') {
      // Ordinary staff can only view their own advances
      return res.json(db.getSalaryAdvances({ month, staffId: user.id, branchId }));
    }
    res.json(db.getSalaryAdvances({ month, staffId, branchId }));
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/salaries/advances', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner or Store Manager can record salary advances.' });
    }
    const { staffId, staffName, branchId, branchName, month, date, amount, reason, notes, paymentMode, receiptNumber } = req.body;
    if (!staffId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Staff member and valid positive amount are required.' });
    }
    const result = db.addSalaryAdvance({
      staffId,
      staffName: staffName || 'Staff Member',
      branchId: branchId || 'branch-1',
      branchName: branchName || 'Main Store',
      month: month || 'September 2026',
      date: date || new Date().toISOString().split('T')[0],
      amount: Number(amount),
      reason: reason || 'Personal Expense',
      notes: notes || '',
      paymentMode: paymentMode || 'Cash',
      approvedBy: user.name || 'Owner',
      receiptNumber,
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/salaries/advances/:id', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can delete salary advance entries.' });
    }
    const result = db.deleteSalaryAdvance(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Suppliers
app.get('/api/suppliers', (req, res) => {
  res.json(db.getSuppliers());
});

app.post('/api/suppliers', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can add suppliers.' });
    }
    const supplier = db.createSupplier(req.body);
    res.json(supplier);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Notifications
app.get('/api/notifications', (req, res) => {
  res.json(db.getNotifications());
});

app.post('/api/notifications/:id/read', (req, res) => {
  db.markNotificationAsRead(req.params.id);
  res.json({ success: true });
});

app.post('/api/notifications/read-all', (req, res) => {
  db.markAllNotificationsAsRead();
  res.json({ success: true });
});

// Company Analytics & Reports
app.get('/api/reports/company', (req, res) => {
  const user = getRequestUser(req);
  if (user.role !== 'OWNER') {
    return res.status(403).json({ error: 'Only Owner can view company consolidated analytics.' });
  }
  res.json(db.getCompanyReport());
});

// Settings
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.put('/api/settings', (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can edit company settings.' });
    }
    const updated = db.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Supabase Cloud Database Integration Endpoints
app.get('/api/supabase/status', async (req, res) => {
  try {
    const config = getSupabaseConfig();
    const status = await checkSupabaseConnection();
    res.json({
      configured: config.isConfigured,
      url: config.url ? config.url.replace(/https?:\/\//, '').split('.')[0] + '...' : null,
      ...status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Status check failed' });
  }
});

app.get('/api/supabase/schema', (req, res) => {
  res.type('text/plain').send(getSupabaseSchemaSQL());
});

app.post('/api/supabase/sync', async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER' && user.role !== 'BRANCH_MANAGER') {
      return res.status(403).json({ error: 'Unauthorized to trigger manual cloud sync.' });
    }
    const result = await db.syncToSupabase();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

app.post('/api/supabase/restore', async (req, res) => {
  try {
    const user = getRequestUser(req);
    if (user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only Owner can restore database from cloud.' });
    }
    const restored = await db.restoreFromSupabase();
    res.json({ success: restored });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Restore failed' });
  }
});

export default app;
