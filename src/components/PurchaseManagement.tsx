import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  GitFork,
  ArrowRight,
  Receipt,
  FileText,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Eye,
  X,
  Tag,
  ExternalLink,
  Barcode,
  Scan,
  Camera,
  Sparkles,
  RefreshCw,
  Check,
  Filter,
  LayoutGrid,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { Purchase, Product, Supplier, User, PurchaseItem, ProductCategory, ProductForm, AnimalType, LifeStageType } from '../types.js';
import { PawIcon, PetEmptyState } from './PetAvatars.js';
import { BarcodeScannerModal } from './BarcodeScannerModal.js';
import { ProductImageThumb, ProductFormBadge } from './ProductImageThumb.js';
import { StockMenuModal } from './StockMenuModal.js';
import { ImageUploadPicker } from './ImageUploadPicker.js';
import { getProductImageUrl } from '../utils/productImages.js';

interface PurchaseManagementProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  currentUser: User;
  onCreatePurchase: (data: any) => Promise<any>;
  onCreateSupplier?: (data: any) => Promise<any>;
  onCreateProduct?: (data: any) => Promise<any>;
  onUpdateProduct?: (productId: string, updates: Partial<Product>) => Promise<any>;
  onNavigateTab: (tab: any) => void;
  onAllocatePurchase?: (purchaseId: string) => void;
  onDeletePurchase?: (purchaseId: string) => Promise<any> | void;
}

export const PurchaseManagement: React.FC<PurchaseManagementProps> = ({
  purchases = [],
  products = [],
  suppliers = [],
  currentUser,
  onCreatePurchase,
  onCreateSupplier,
  onCreateProduct,
  onUpdateProduct,
  onNavigateTab,
  onAllocatePurchase,
  onDeletePurchase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNALLOCATED' | 'PARTIALLY_ALLOCATED' | 'FULLY_ALLOCATED'>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [deleteConfirmPurchase, setDeleteConfirmPurchase] = useState<Purchase | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdSuccessPurchase, setCreatedSuccessPurchase] = useState<Purchase | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmPurchase || !onDeletePurchase) return;
    try {
      setDeleting(true);
      await onDeletePurchase(deleteConfirmPurchase.id);
      setDeleteConfirmPurchase(null);
      setToastMessage('Purchase order successfully deleted.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert('Failed to delete purchase order: ' + (err?.message || err));
    } finally {
      setDeleting(false);
    }
  };

  // Distinct companies list derived from products and purchases
  const existingCompanies = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const c = p.company || p.brand;
      if (c) set.add(c.trim());
    });
    purchases.forEach((p) => {
      if (p.company) set.add(p.company.trim());
      p.items?.forEach((it) => {
        if (it.company) set.add(it.company.trim());
      });
    });
    // Canonical pet food & pet supplies companies
    [
      'Royal Canin',
      'Pedigree (Mars Petcare)',
      'Drools Pet Food',
      'Farmina Pet Foods',
      "Hill's Pet Nutrition",
      'Whiskas (Mars Petcare)',
      'Sheba (Mars Petcare)',
      'JerHigh International',
      'KONG Company',
      'Bedsure Pet',
      'Versele-Laga',
      'Spectrum Brands (Tetra)',
    ].forEach((k) => set.add(k));
    return Array.from(set).filter(Boolean).sort();
  }, [products, purchases]);

  // Derive initial company from first supplier or product
  const getSupplierDefaultCompany = (suppId: string): string => {
    const supp = suppliers.find((s) => s.id === suppId);
    if (!supp) return 'Royal Canin';
    const name = supp.name.toLowerCase();
    if (name.includes('royal canin')) return 'Royal Canin';
    if (name.includes('mars') || name.includes('pedigree') || name.includes('whiskas')) return 'Pedigree (Mars Petcare)';
    if (name.includes('drools')) return 'Drools Pet Food';
    if (name.includes('farmina')) return 'Farmina Pet Foods';
    if (name.includes('passion') || name.includes('import')) return 'Farmina Pet Foods';
    if (name.includes('aquaria') || name.includes('marine')) return 'Spectrum Brands (Tetra)';
    const matched = products.find((p) => p.supplierId === suppId);
    if (matched?.company || matched?.brand) return (matched.company || matched.brand)!;
    return 'Royal Canin';
  };

  // Barcode scanner modal state
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'auto-add' | 'fill-row' | 'fill-new-product'>('auto-add');
  const [scanningLineIndex, setScanningLineIndex] = useState<number | null>(null);

  // New Product modal state
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [targetLineIndexForNewProduct, setTargetLineIndexForNewProduct] = useState<number | null>(null);
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<ProductCategory>('Dog Food');
  const [newProductBrand, setNewProductBrand] = useState('Royal Canin');
  const [newProductCompany, setNewProductCompany] = useState('Royal Canin');
  const [newProductForm, setNewProductForm] = useState<ProductForm>('DRIED');
  const [newProductAnimal, setNewProductAnimal] = useState<AnimalType>('Dog');
  const [newProductLifeStage, setNewProductLifeStage] = useState<LifeStageType>('Adult');
  const [newProductSize, setNewProductSize] = useState('3 kg');
  const [newProductUnit, setNewProductUnit] = useState<'packet' | 'can' | 'kg' | 'piece' | 'bottle' | 'box'>('packet');
  const [newProductCostPrice, setNewProductCostPrice] = useState<number | ''>(1200);
  const [newProductSellingPrice, setNewProductSellingPrice] = useState<number | ''>(1650);
  const [newProductTaxPercent, setNewProductTaxPercent] = useState<number>(18);
  const [newProductQuantity, setNewProductQuantity] = useState<number>(50);
  const [newProductSaving, setNewProductSaving] = useState(false);
  const [newProductError, setNewProductError] = useState<string | null>(null);

  // Visual Stock Menu modal state (like POS menu)
  const [showStockMenuModal, setShowStockMenuModal] = useState(false);
  const [stockMenuTargetIndex, setStockMenuTargetIndex] = useState<number | null>(null);
  const [newProductImageUrl, setNewProductImageUrl] = useState('');

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PARTIALLY_PAID' | 'PENDING'>('PAID');
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'UPI'>('BANK_TRANSFER');
  const [notes, setNotes] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileUrl, setAttachedFileUrl] = useState('');

  // Line items state with barcode & company
  const [lineItems, setLineItems] = useState<
    {
      productId: string;
      barcode: string;
      company?: string;
      brand?: string;
      quantity: number;
      unitCost: number;
      taxPercent: number;
    }[]
  >([
    {
      productId: products[0]?.id || '',
      barcode: products[0]?.barcode || '',
      company: products[0]?.company || products[0]?.brand || 'Royal Canin',
      brand: products[0]?.brand || products[0]?.company || 'Royal Canin',
      quantity: 100,
      unitCost: products[0]?.costPrice || products[0]?.purchasePrice || 1200,
      taxPercent: products[0]?.taxPercent || 18,
    },
  ]);

  // Quick new supplier form state
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [newSupplierCity, setNewSupplierCity] = useState('');
  const [newSupplierGstin, setNewSupplierGstin] = useState('');
  const [supplierSaving, setSupplierSaving] = useState(false);

  const formatINR = (val?: number | null) =>
    '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');

  // Generate random GS1 India EAN-13 barcode (starts with 890)
  const generateRandomEanBarcode = () => {
    let code = '890';
    for (let i = 0; i < 9; i++) {
      code += Math.floor(Math.random() * 10);
    }
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const num = parseInt(code[i], 10);
      sum += i % 2 === 0 ? num : num * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
  };

  // Open modal to add brand new item with its barcode
  const handleOpenNewProductModal = (targetLineIdx: number | null = null, prefilledBarcode = '') => {
    setTargetLineIndexForNewProduct(targetLineIdx);
    setNewProductBarcode(prefilledBarcode.trim() || generateRandomEanBarcode());
    setNewProductImageUrl('');

    // Pre-fill company from target line item if available
    const comp = targetLineIdx !== null && lineItems[targetLineIdx]?.company
      ? lineItems[targetLineIdx].company
      : products[0]?.company || 'Royal Canin';
    setNewProductCompany(comp);
    setNewProductBrand(comp);
    setNewProductName('');
    setNewProductCategory('Dog Food');
    setNewProductForm('DRIED');
    setNewProductAnimal('Dog');
    setNewProductLifeStage('Adult');
    setNewProductSize('3 kg');
    setNewProductUnit('packet');
    setNewProductCostPrice(1200);
    setNewProductSellingPrice(1650);
    setNewProductTaxPercent(18);
    setNewProductQuantity(50);
    setNewProductError(null);
    setShowNewProductModal(true);
  };

  // Save new product and automatically insert into line items
  const handleSaveNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBarcode = newProductBarcode.trim();
    if (!cleanBarcode) {
      setNewProductError('Barcode number is required.');
      return;
    }
    if (!newProductName.trim()) {
      setNewProductError('Product name is required.');
      return;
    }

    // Check duplicate barcode in current products
    const existing = products.find(
      (p) => p.barcode && p.barcode.trim().toLowerCase() === cleanBarcode.toLowerCase()
    );
    if (existing) {
      setNewProductError(`Barcode "${cleanBarcode}" already belongs to "${existing.name}". Please use a unique barcode.`);
      return;
    }

    const cost = Number(newProductCostPrice) || 0;
    const sell = Number(newProductSellingPrice) || Math.round(cost * 1.35) || 100;
    const supp = suppliers.find((s) => s.id === selectedSupplierId);
    const finalComp = newProductCompany.trim() || 'General';

    setNewProductSaving(true);
    setNewProductError(null);

    try {
      const productPayload = {
        barcode: cleanBarcode,
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        name: newProductName.trim(),
        imageUrl: newProductImageUrl.trim() || undefined,
        category: newProductCategory,
        brand: newProductBrand.trim() || finalComp,
        company: finalComp,
        productForm: newProductForm,
        animal: newProductAnimal,
        lifeStage: newProductLifeStage,
        size: newProductSize.trim() || 'Standard',
        unit: newProductUnit,
        purchasePrice: cost,
        costPrice: cost,
        sellingPrice: sell,
        mrp: sell > cost ? sell : Math.round(cost * 1.35),
        taxPercent: Number(newProductTaxPercent) || 18,
        minStockLevel: 5,
        reorderLevel: 10,
        supplierId: selectedSupplierId || suppliers[0]?.id || 'sup-001',
        supplierName: supp?.name || 'Wholesale Supplier',
        avatarType: newProductAnimal === 'Cat' ? ('cat' as const) : ('dog' as const),
        status: 'ACTIVE' as const,
      };

      let createdProd: Product;
      if (onCreateProduct) {
        createdProd = await onCreateProduct(productPayload);
      } else {
        createdProd = {
          ...productPayload,
          id: `prod-${Date.now()}`,
        } as Product;
      }

      const newLineItem = {
        productId: createdProd.id,
        barcode: cleanBarcode,
        company: createdProd.company || finalComp,
        brand: createdProd.brand || finalComp,
        quantity: Math.max(1, Number(newProductQuantity) || 50),
        unitCost: cost,
        taxPercent: Number(newProductTaxPercent) || 18,
      };

      if (targetLineIndexForNewProduct !== null && targetLineIndexForNewProduct < lineItems.length) {
        setLineItems((prev) =>
          prev.map((item, idx) => (idx === targetLineIndexForNewProduct ? newLineItem : item))
        );
      } else {
        setLineItems((prev) => [...prev, newLineItem]);
      }

      setShowNewProductModal(false);
      setToastMessage(`✅ Added new product "${createdProd.name}" under "${finalComp}" to catalog and consignment.`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      setNewProductError(err.message || 'Error creating product.');
    } finally {
      setNewProductSaving(false);
    }
  };

  // Stock Menu Visual Selection Handlers
  const handleSelectProductForLine = (product: Product, targetIndex: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      if (updated[targetIndex]) {
        updated[targetIndex] = {
          ...updated[targetIndex],
          productId: product.id,
          barcode: product.barcode || updated[targetIndex].barcode || '',
          company: product.company || product.brand || 'General',
          brand: product.brand || product.company || 'General',
          unitCost: product.costPrice || product.purchasePrice || updated[targetIndex].unitCost || 500,
          taxPercent: product.taxPercent ?? updated[targetIndex].taxPercent ?? 18,
        };
      }
      return updated;
    });
  };

  const handleAddProductsFromMenu = (items: { product: Product; quantity: number }[]) => {
    setLineItems((prev) => {
      let updated = [...prev];
      // If there's only one line item that is empty / untouched, clear it
      if (updated.length === 1 && (!updated[0].productId || updated[0].quantity === 0)) {
        updated = [];
      }

      items.forEach(({ product, quantity }) => {
        const existingIdx = updated.findIndex((l) => l.productId === product.id);
        if (existingIdx >= 0) {
          updated[existingIdx].quantity += quantity;
        } else {
          updated.push({
            productId: product.id,
            barcode: product.barcode || '',
            company: product.company || product.brand || 'General',
            brand: product.brand || product.company || 'General',
            quantity: quantity > 0 ? quantity : 50,
            unitCost: product.costPrice || product.purchasePrice || 500,
            taxPercent: product.taxPercent ?? 18,
          });
        }
      });

      return updated;
    });
  };

  // Handle scanned barcode from camera / gun
  const handleBarcodeScanned = (scannedCode: string) => {
    const clean = scannedCode.trim();
    if (!clean) return;

    if (scannerMode === 'fill-new-product') {
      setNewProductBarcode(clean);
      setShowBarcodeScanner(false);
      return;
    }

    if (scannerMode === 'fill-row' && scanningLineIndex !== null) {
      updateLineItem(scanningLineIndex, 'barcode', clean);
      setShowBarcodeScanner(false);
      return;
    }

    // Auto-add mode
    setShowBarcodeScanner(false);
    const cleanLower = clean.toLowerCase();
    const cleanNormalized = cleanLower.replace(/[-\s]/g, '');
    const matched = products.find((p) => {
      const pb = (p.barcode || '').trim().toLowerCase();
      const psku = (p.sku || '').trim().toLowerCase();
      const pbClean = pb.replace(/[-\s]/g, '');
      const pskuClean = psku.replace(/[-\s]/g, '');

      return (
        pb === cleanLower ||
        psku === cleanLower ||
        pbClean === cleanNormalized ||
        pskuClean === cleanNormalized ||
        (pbClean.length === 12 && cleanNormalized === '0' + pbClean) ||
        (cleanNormalized.length === 12 && pbClean === '0' + cleanNormalized)
      );
    });

    if (matched) {
      const existingIdx = lineItems.findIndex((li) => li.productId === matched.id);
      if (existingIdx >= 0) {
        setLineItems((prev) =>
          prev.map((li, idx) =>
            idx === existingIdx ? { ...li, quantity: (Number(li.quantity) || 0) + 10 } : li
          )
        );
        setToastMessage(`✅ Increased quantity (+10) for "${matched.name}" (Barcode: ${matched.barcode})`);
      } else {
        setLineItems((prev) => [
          ...prev,
          {
            productId: matched.id,
            barcode: matched.barcode || clean,
            company: matched.company || matched.brand || 'General',
            brand: matched.brand || matched.company || 'General',
            quantity: 50,
            unitCost: matched.costPrice || matched.purchasePrice || 500,
            taxPercent: matched.taxPercent || 18,
          },
        ]);
        setToastMessage(`✅ Added "${matched.name}" (${matched.company || matched.brand || 'Pet Item'}) to consignment.`);
      }
    } else {
      // Barcode not in catalog: immediately offer to add as a new product!
      handleOpenNewProductModal(null, clean);
      setToastMessage(`ℹ️ Scanned Barcode "${clean}" not recognized. Please enter details to register this new item.`);
    }
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Filtered purchases by Status, Company, and Search
  const filteredPurchases = purchases.filter((p) => {
    // Status filter
    if (statusFilter !== 'ALL') {
      const pStatus = p.allocatedStatus || 'UNALLOCATED';
      if (pStatus !== statusFilter) return false;
    }

    // Company filter
    if (companyFilter !== 'ALL') {
      const pCompany = (p.company || '').toLowerCase();
      const itemCompanies = (p.items || []).map((i) => (i.company || '').toLowerCase());
      const matchesCompany =
        pCompany === companyFilter.toLowerCase() ||
        itemCompanies.includes(companyFilter.toLowerCase());
      if (!matchesCompany) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const invoiceNo = (p.supplierInvoiceNumber || '').toLowerCase();
      const purchNo = (p.purchaseNumber || '').toLowerCase();
      const suppName = (p.supplierName || '').toLowerCase();
      const pComp = (p.company || '').toLowerCase();
      const itemNames = (p.items || []).map((i) => i.productName.toLowerCase()).join(' ');
      const itemComps = (p.items || []).map((i) => (i.company || '').toLowerCase()).join(' ');
      return (
        purchNo.includes(q) ||
        invoiceNo.includes(q) ||
        suppName.includes(q) ||
        pComp.includes(q) ||
        itemNames.includes(q) ||
        itemComps.includes(q)
      );
    }
    return true;
  });

  // Calculate totals for active modal form
  const totalUnits = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0),
    0
  );
  const taxAmount = lineItems.reduce(
    (sum, item) =>
      sum +
      (Number(item.quantity) || 0) *
        (Number(item.unitCost) || 0) *
        ((Number(item.taxPercent) || 0) / 100),
    0
  );
  const grandTotal = subtotal + taxAmount;

  const handleAddLineItem = () => {
    const nextProd = products[lineItems.length % products.length] || products[0];
    const defaultComp = nextProd?.company || nextProd?.brand || 'Royal Canin';

    setLineItems((prev) => [
      ...prev,
      {
        productId: nextProd?.id || '',
        barcode: nextProd?.barcode || '',
        company: defaultComp,
        brand: defaultComp,
        quantity: 50,
        unitCost: nextProd?.costPrice || nextProd?.purchasePrice || 500,
        taxPercent: nextProd?.taxPercent || 18,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, val: any) => {
    if (field === 'productId' && val === '__NEW_PRODUCT__') {
      handleOpenNewProductModal(index);
      return;
    }

    setLineItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const updated = { ...item, [field]: val };
          if (field === 'productId') {
            const prod = products.find((p) => p.id === val);
            if (prod) {
              updated.barcode = prod.barcode || '';
              updated.company = prod.company || prod.brand || 'Royal Canin';
              updated.brand = prod.brand || prod.company || updated.company;
              updated.unitCost = prod.costPrice || prod.purchasePrice || 500;
              updated.taxPercent = prod.taxPercent || 18;
            }
          } else if (field === 'company') {
            updated.company = val;
            updated.brand = val;
          } else if (field === 'barcode') {
            const clean = (val || '').trim().toLowerCase();
            const matched = products.find(
              (p) => p.barcode && p.barcode.trim().toLowerCase() === clean
            );
            if (matched && matched.id !== item.productId) {
              updated.productId = matched.id;
              updated.company = matched.company || matched.brand || updated.company || 'Royal Canin';
              updated.brand = matched.brand || matched.company || updated.company;
              updated.unitCost = matched.costPrice || matched.purchasePrice || 500;
              updated.taxPercent = matched.taxPercent || 18;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFileName(file.name);
      // Create local object URL for preview
      const objectUrl = URL.createObjectURL(file);
      setAttachedFileUrl(objectUrl);
    }
  };

  const handleSaveNewSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    setSupplierSaving(true);
    try {
      if (onCreateSupplier) {
        const created = await onCreateSupplier({
          name: newSupplierName.trim(),
          contactPerson: newSupplierContact.trim() || 'Purchasing Head',
          phone: newSupplierPhone.trim() || '+91 98200 11223',
          email: newSupplierEmail.trim() || 'sales@supplier.com',
          city: newSupplierCity.trim() || 'Mumbai Central',
          address: 'Industrial Distribution Hub, Warehouse Sector',
          gstin: newSupplierGstin.trim() || '27AAECP1234F1Z8',
        });
        if (created?.id) {
          setSelectedSupplierId(created.id);
        }
      }
      setShowNewSupplierModal(false);
      setNewSupplierName('');
      setNewSupplierContact('');
      setNewSupplierPhone('');
      setNewSupplierEmail('');
      setNewSupplierCity('');
      setNewSupplierGstin('');
    } catch (err: any) {
      alert('Error creating supplier: ' + err.message);
    } finally {
      setSupplierSaving(false);
    }
  };

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierInvoiceNumber.trim()) {
      alert('Please provide the Purchase Invoice / Bill Number (e.g., BILL-2026-004)');
      return;
    }

    if (lineItems.length === 0 || totalUnits <= 0) {
      alert('Please add at least one product line item with quantity.');
      return;
    }

    setLoading(true);
    try {
      const supp = suppliers.find((s) => s.id === selectedSupplierId);

      const items: PurchaseItem[] = lineItems.map((li) => {
        const prod = products.find((p) => p.id === li.productId);
        const qty = Number(li.quantity) || 1;
        const cost = Number(li.unitCost) || 0;
        const taxP = Number(li.taxPercent) || 0;
        const taxVal = qty * cost * (taxP / 100);
        const total = qty * cost + taxVal;
        const finalBarcode = li.barcode || prod?.barcode || '';

        const itemCompany = li.company?.trim() || prod?.company || prod?.brand || 'General';
        const itemBrand = li.brand?.trim() || prod?.brand || itemCompany;

        // If a barcode or company was provided/missing on the product, sync to catalog
        if (onUpdateProduct && prod) {
          const updates: Partial<Product> = {};
          if (li.barcode && li.barcode !== prod.barcode) {
            updates.barcode = li.barcode;
          }
          if (itemCompany && itemCompany !== 'General' && itemCompany !== prod.company) {
            updates.company = itemCompany;
          }
          if (itemBrand && itemBrand !== prod.brand) {
            updates.brand = itemBrand;
          }
          if (Object.keys(updates).length > 0) {
            onUpdateProduct(prod.id, updates).catch(() => {});
          }
        }

        return {
          productId: li.productId,
          productName: prod ? prod.name : 'Pet Item',
          sku: prod ? prod.sku : 'SKU-GEN',
          barcode: finalBarcode,
          company: itemCompany,
          brand: itemBrand,
          quantity: qty,
          purchasePrice: cost,
          taxPercent: taxP,
          discount: 0,
          total: Math.round(total),
        };
      });

      // Calculate distinct companies among the line items
      const itemCompanies = Array.from(new Set(items.map((i) => i.company).filter(Boolean)));
      const purchaseCompany =
        itemCompanies.length === 1
          ? itemCompanies[0]
          : itemCompanies.length > 1
          ? itemCompanies.join(', ')
          : 'General';

      const purchasePayload = {
        company: purchaseCompany,
        supplierId: selectedSupplierId || suppliers[0]?.id || 'sup-001',
        supplierName: supp ? supp.name : 'Wholesale Distribution Partner',
        supplierInvoiceNumber: supplierInvoiceNumber.trim(),
        purchaseDate,
        paymentStatus,
        paymentMethod,
        items,
        subtotal: Math.round(subtotal),
        taxAmount: Math.round(taxAmount),
        discountAmount: 0,
        grandTotal: Math.round(grandTotal),
        notes: notes.trim() || `Central procurement inwarded (${purchaseCompany})`,
        allocatedStatus: 'UNALLOCATED',
        fileName: attachedFileName || undefined,
        fileUrl: attachedFileUrl || undefined,
      };

      const created = await onCreatePurchase(purchasePayload);

      // Open celebration modal
      setCreatedSuccessPurchase(created || purchasePayload);
      setShowAddModal(false);

      // Reset form state
      setSupplierInvoiceNumber('');
      setNotes('');
      setAttachedFileName('');
      setAttachedFileUrl('');
      setLineItems([
        {
          productId: products[0]?.id || '',
          barcode: products[0]?.barcode || '',
          company: products[0]?.company || products[0]?.brand || 'Royal Canin',
          brand: products[0]?.brand || products[0]?.company || 'Royal Canin',
          quantity: 100,
          unitCost: products[0]?.costPrice || products[0]?.purchasePrice || 1200,
          taxPercent: products[0]?.taxPercent || 18,
        },
      ]);
    } catch (err: any) {
      alert('Failed to register purchase order: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleStartAllocation = (purchaseId: string) => {
    if (onAllocatePurchase) {
      onAllocatePurchase(purchaseId);
    } else {
      onNavigateTab('allocation');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F2ED] border border-[#EAE7E0] text-[#5A5A40] text-xs font-semibold mb-2">
            <PawIcon className="w-3.5 h-3.5" />
            <span>Central Wholesale Procurement & Inwarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1A1A] tracking-tight">
            Purchases & Consignments
          </h1>
          <p className="text-xs sm:text-sm text-[#666666] mt-0.5">
            Inward master supplier purchase orders, attach invoice slips, and prepare stock for multi-branch allocation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('allocation')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#EAE7E0] hover:bg-[#F5F2ED] text-[#1A1A1A] text-xs font-semibold shadow-2xs transition-all"
          >
            <GitFork className="w-4 h-4 text-[#D97757]" />
            <span>Stock Allocation</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D97757] hover:bg-[#C86646] text-white text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Purchase Inward</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="p-4 rounded-2xl bg-white border border-[#EAE7E0] shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#7A8C7B]" />
          <input
            type="text"
            placeholder="Search by Purchase #, Company, Invoice #, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-full border border-[#EAE7E0] bg-[#F5F2ED] text-xs text-[#1A1A1A] placeholder-[#888888] focus:bg-white focus:border-[#5A5A40] focus:outline-hidden transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Company Filter Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F2ED] border border-[#EAE7E0] text-xs">
            <Building2 className="w-3.5 h-3.5 text-[#D97757]" />
            <span className="text-[10px] font-bold text-[#666666] uppercase">Company:</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-transparent font-bold text-xs text-[#1A1A1A] focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Companies</option>
              {existingCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {(['ALL', 'UNALLOCATED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === st
                    ? 'bg-[#5A5A40] text-white shadow-2xs'
                    : 'bg-[#F5F2ED] text-[#666666] hover:bg-[#EAE7E0]'
                }`}
              >
                {st === 'ALL'
                  ? 'All Orders'
                  : st === 'UNALLOCATED'
                  ? 'Ready for Allocation'
                  : st === 'PARTIALLY_ALLOCATED'
                  ? 'Partially Allocated'
                  : 'Fully Dispatched'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PURCHASES TABLE / CARD LIST */}
      <div className="rounded-2xl bg-white border border-[#EAE7E0] shadow-2xs overflow-hidden">
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F2ED] border-b border-[#EAE7E0] text-[11px] font-bold uppercase tracking-wider text-[#5A5A40]">
              <tr>
                <th className="px-5 py-3.5">Purchase Order</th>
                <th className="px-5 py-3.5">Company / Brand</th>
                <th className="px-5 py-3.5">Invoice / Bill #</th>
                <th className="px-5 py-3.5">Supplier Details</th>
                <th className="px-5 py-3.5">Items & Units</th>
                <th className="px-5 py-3.5 text-right">Grand Total</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE7E0]">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <PetEmptyState
                      title="No purchase orders found"
                      description="Click '+ New Purchase Inward' to record a bulk supplier order and prepare it for branch allocation."
                      avatar="dog"
                    />
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const status = p.allocatedStatus || 'UNALLOCATED';
                  const totalItemsQty = p.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0;
                  const isReadyToAllocate = status === 'UNALLOCATED' || status === 'PARTIALLY_ALLOCATED';

                  return (
                    <tr key={p.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[#1A1A1A]">
                            {p.purchaseNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[#666666] mt-0.5">
                          <Calendar className="w-3 h-3 text-[#7A8C7B]" />
                          <span>{p.purchaseDate || (p as any).date || 'Today'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EAE7E0] text-xs font-bold text-[#1A1A1A] shadow-2xs">
                          <Building2 className="w-3.5 h-3.5 text-[#D97757]" />
                          <span>{p.company || p.items?.[0]?.company || 'General'}</span>
                        </span>
                        {p.items && p.items.length > 1 && new Set(p.items.map((i) => i.company).filter(Boolean)).size > 1 && (
                          <span className="block text-[10px] text-[#7C9082] mt-0.5 font-medium">
                            +{new Set(p.items.map((i) => i.company).filter(Boolean)).size - 1} other brands
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-[#5A5A40]" />
                          <span className="font-semibold text-[#1A1A1A]">
                            {p.supplierInvoiceNumber || (p as any).billNumber || 'No Bill Ref'}
                          </span>
                        </div>
                        {p.fileName && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-[#5A5A40]">
                            <FileCheck className="w-3 h-3 text-emerald-600" />
                            <span className="truncate max-w-[120px]" title={p.fileName}>
                              {p.fileName}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-[#1A1A1A]">{p.supplierName}</div>
                        <div className="text-[11px] text-[#666666]">{p.paymentMethod || 'BANK_TRANSFER'}</div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-[#1A1A1A]">{totalItemsQty} total units</div>
                        <div className="text-[11px] text-[#666666] line-clamp-1 max-w-xs">
                          {p.items?.map((i) => `${i.productName} (${i.quantity})`).join(', ') || 'General stock'}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="font-serif font-bold text-sm text-[#1A1A1A]">
                          {formatINR(p.grandTotal || (p as any).totalAmount || 0)}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold uppercase">
                          {p.paymentStatus || 'PAID'}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            status === 'FULLY_ALLOCATED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'PARTIALLY_ALLOCATED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {status === 'UNALLOCATED'
                            ? 'Ready for Allocation'
                            : status === 'PARTIALLY_ALLOCATED'
                            ? 'Partially Allocated'
                            : 'Fully Dispatched'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingPurchase(p)}
                            className="p-1.5 rounded-lg border border-[#EAE7E0] hover:bg-[#F5F2ED] text-[#5A5A40] transition-colors"
                            title="View Purchase Bill Slip"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {currentUser?.role === 'OWNER' && onDeletePurchase && (
                            <button
                              onClick={() => setDeleteConfirmPurchase(p)}
                              className="p-1.5 rounded-lg border border-[#EAE7E0] hover:bg-rose-50 text-[#666666] hover:text-rose-600 transition-colors"
                              title="Delete Purchase Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {isReadyToAllocate ? (
                            <button
                              onClick={() => handleStartAllocation(p.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D97757] hover:bg-[#C86646] text-white text-xs font-bold transition-all shadow-2xs"
                            >
                              <GitFork className="w-3.5 h-3.5" />
                              <span>Allocate Stock</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onNavigateTab('allocation-history')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F2ED] hover:bg-[#EAE7E0] text-[#5A5A40] text-xs font-semibold transition-colors"
                            >
                              <span>View History</span>
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

        {/* MOBILE CARD LIST VIEW */}
        <div className="md:hidden divide-y divide-[#EAE7E0]">
          {filteredPurchases.length === 0 ? (
            <div className="py-12 text-center px-4">
              <PetEmptyState
                title="No purchase orders found"
                description="Tap '+ New Purchase Inward' to record a bulk supplier order and prepare it for branch allocation."
                avatar="dog"
              />
            </div>
          ) : (
            filteredPurchases.map((p) => {
              const status = p.allocatedStatus || 'UNALLOCATED';
              const totalItemsQty = p.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0;
              const isReadyToAllocate = status === 'UNALLOCATED' || status === 'PARTIALLY_ALLOCATED';

              return (
                <div key={p.id} className="p-4 space-y-3">
                  {/* Top row: Order # and Status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-xs text-[#1A1A1A]">
                        {p.purchaseNumber}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#666666] mt-0.5">
                        <Calendar className="w-3 h-3 text-[#7A8C7B]" />
                        <span>{p.purchaseDate || (p as any).date || 'Today'}</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        status === 'FULLY_ALLOCATED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'PARTIALLY_ALLOCATED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {status === 'UNALLOCATED'
                        ? 'Ready for Allocation'
                        : status === 'PARTIALLY_ALLOCATED'
                        ? 'Partially Allocated'
                        : 'Fully Dispatched'}
                    </span>
                  </div>

                  {/* Company, Supplier & Bill info */}
                  <div className="grid grid-cols-3 gap-2 text-xs bg-[#FAF8F5] p-2.5 rounded-xl border border-[#EAE7E0]">
                    <div>
                      <span className="text-[10px] text-[#7C9082] block">Company</span>
                      <span className="font-bold text-[#1A1A1A] truncate block flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[#D97757] shrink-0" />
                        <span className="truncate">{p.company || p.items?.[0]?.company || 'General'}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7C9082] block">Supplier</span>
                      <span className="font-bold text-[#1A1A1A] truncate block">{p.supplierName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#7C9082] block">Invoice / Bill #</span>
                      <span className="font-semibold text-[#1A1A1A] truncate block">
                        {p.supplierInvoiceNumber || (p as any).billNumber || 'No Bill Ref'}
                      </span>
                    </div>
                  </div>

                  {/* Items summary & Total */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="font-bold text-[#1A1A1A]">{totalItemsQty} units</span>
                      <span className="text-[11px] text-[#666666] block truncate max-w-[180px]">
                        {p.items?.map((i) => `${i.productName} (${i.quantity})`).join(', ') || 'General stock'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-serif font-bold text-sm text-[#1A1A1A]">
                        {formatINR(p.grandTotal || (p as any).totalAmount || 0)}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold uppercase">
                        {p.paymentStatus || 'PAID'}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#F2ECE4]">
                    <button
                      type="button"
                      onClick={() => setViewingPurchase(p)}
                      className="flex-1 py-2 px-3 rounded-xl border border-[#EAE7E0] hover:bg-[#F5F2ED] text-[#5A5A40] text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[40px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Bill</span>
                    </button>

                    {currentUser?.role === 'OWNER' && onDeletePurchase && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmPurchase(p)}
                        className="py-2 px-3 rounded-xl border border-[#EAE7E0] hover:bg-rose-50 text-[#666666] hover:text-rose-600 text-xs font-semibold flex items-center justify-center min-h-[40px] transition-colors"
                        title="Delete Purchase Order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isReadyToAllocate ? (
                      <button
                        type="button"
                        onClick={() => handleStartAllocation(p.id)}
                        className="flex-2 py-2 px-3 rounded-xl bg-[#D97757] hover:bg-[#C86646] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs min-h-[40px]"
                      >
                        <GitFork className="w-3.5 h-3.5" />
                        <span>Allocate Stock</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigateTab('allocation-history')}
                        className="flex-2 py-2 px-3 rounded-xl bg-[#F5F2ED] hover:bg-[#EAE7E0] text-[#5A5A40] text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[40px]"
                      >
                        <span>View History</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL: + NEW PURCHASE INWARD */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl p-6 text-[#1A1A1A] max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#EAE7E0]">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F5F2ED] text-[#5A5A40] text-[11px] font-semibold mb-1">
                  <PawIcon className="w-3 h-3" />
                  <span>Central Inward Workflow</span>
                </div>
                <h3 className="font-serif font-bold text-xl text-[#1A1A1A]">
                  New Purchase Inward (Master Consignment)
                </h3>
                <p className="text-xs text-[#666666]">
                  Record incoming supplier consignment, attach invoice bill, and prepare stock for multi-branch distribution
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-[#666666] hover:bg-[#F5F2ED] hover:text-[#1A1A1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {toastMessage && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between animate-in fade-in duration-200">
                <span>{toastMessage}</span>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-emerald-600 hover:text-emerald-900 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <form onSubmit={handleSubmitPurchase} className="mt-5 space-y-5 text-xs">
              {/* SECTION 1: SUPPLIER & INVOICE DETAILS */}
              <div className="p-4 rounded-2xl bg-[#F5F2ED] border border-[#EAE7E0] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#5A5A40]">
                    1. Consignment Invoice Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNewSupplierModal(true)}
                    className="text-[#D97757] font-bold text-xs hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add New Supplier</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">
                      Supplier / Vendor *
                    </label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs font-medium focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.city || 'India'}) • GSTIN: {s.gstin}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">
                      Purchase Invoice / Bill Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BILL-2026-004"
                      value={supplierInvoiceNumber}
                      onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs font-mono font-bold focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">
                      Purchase Inward Date *
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold mb-1 text-[#1A1A1A]">Payment Status</label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as any)}
                        className="w-full px-2.5 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs font-semibold focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                      >
                        <option value="PAID">Paid in Full</option>
                        <option value="PARTIALLY_PAID">Partially Paid</option>
                        <option value="PENDING">Pending / Credit</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-[#1A1A1A]">Payment Mode</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full px-2.5 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs font-semibold focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                      >
                        <option value="BANK_TRANSFER">NEFT / RTGS</option>
                        <option value="UPI">UPI Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CASH">Cash</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: LINE ITEMS & BULK QUANTITIES */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-xs uppercase tracking-wider text-[#5A5A40]">
                      2. Bulk Products & Line Items
                    </span>
                    <p className="text-[11px] text-[#666666]">
                      Add products, specify company / brand per item, and enter received quantities and barcodes
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStockMenuTargetIndex(null);
                        setShowStockMenuModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#264653] hover:bg-[#1E3741] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      title="Browse stock items visually with photos, filters, and bulk quantity additions as same as menu"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-[#E76F51]" />
                      <span>Browse Stock Menu</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[9px] font-black uppercase">Photos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setScannerMode('auto-add');
                        setScanningLineIndex(null);
                        setShowBarcodeScanner(true);
                      }}
                      className="px-3 py-1.5 rounded-full bg-white border border-[#EAE7E0] hover:bg-[#F5F2ED] text-[#5A5A40] font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                      title="Scan barcode with camera to add or register product"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#D97757]" />
                      <span className="hidden sm:inline">Scan Barcode</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenNewProductModal(null)}
                      className="px-3 py-1.5 rounded-full bg-[#E76F51]/10 border border-[#E76F51]/30 hover:bg-[#E76F51]/20 text-[#E76F51] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                      title="Add a brand new product and its barcode number to catalog"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <Barcode className="w-3.5 h-3.5" />
                      <span>+ Add New Product</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="px-3 py-1.5 rounded-full bg-[#5A5A40] hover:bg-[#4A4A32] text-white font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Product Line</span>
                    </button>
                  </div>
                </div>

                {/* Datalist for Company / Brand suggestions */}
                <datalist id="item-companies-list">
                  {existingCompanies.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>

                <div className="space-y-2.5">
                  {lineItems.map((item, idx) => {
                    const lineProd = products.find((p) => p.id === item.productId);
                    const currentBarcode = item.barcode ?? lineProd?.barcode ?? '';
                    const lineTotal =
                      (Number(item.quantity) || 0) * (Number(item.unitCost) || 0) * (1 + (Number(item.taxPercent) || 0) / 100);

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-white border border-[#EAE7E0] shadow-2xs flex flex-col md:flex-row items-start md:items-center gap-3"
                      >
                        {/* 1. Product Field with Image */}
                        <div className="flex-1 w-full min-w-[240px] flex items-start gap-2.5">
                          {/* Product Image Thumbnail (Clickable to pick from visual menu) */}
                          <div
                            className="relative group cursor-pointer mt-5 shrink-0"
                            title="Click to browse stock menu and pick product with image"
                            onClick={() => {
                              setStockMenuTargetIndex(idx);
                              setShowStockMenuModal(true);
                            }}
                          >
                            <ProductImageThumb
                              src={getProductImageUrl(lineProd)}
                              alt={lineProd?.name || 'Product'}
                              avatarType={lineProd?.avatarType}
                              productForm={lineProd?.productForm}
                              size="sm"
                            />
                            <div className="absolute inset-0 bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[8px] font-black uppercase tracking-wider">
                              Change
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[10px] text-[#666666] font-semibold">
                                Product
                              </label>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStockMenuTargetIndex(idx);
                                    setShowStockMenuModal(true);
                                  }}
                                  className="text-[10px] text-[#264653] hover:text-[#E76F51] font-bold flex items-center gap-1"
                                  title="Browse visual stock menu"
                                >
                                  <LayoutGrid className="w-3 h-3 text-[#E76F51]" />
                                  <span>Visual Menu</span>
                                </button>
                                <span className="text-[#D5C7B8]">•</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenNewProductModal(idx)}
                                  className="text-[10px] text-[#D97757] hover:underline font-bold"
                                >
                                  + New
                                </button>
                              </div>
                            </div>
                            <select
                              value={item.productId}
                              onChange={(e) => updateLineItem(idx, 'productId', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                            >
                              <option value="__NEW_PRODUCT__" className="text-[#D97757] font-bold">
                                ✨ + Add New Product to Catalog (Enter Barcode)...
                              </option>
                              {Object.entries(
                                products.reduce<Record<string, Product[]>>((acc, p) => {
                                  const comp = p.company || p.brand || 'Other Brands';
                                  if (!acc[comp]) acc[comp] = [];
                                  acc[comp].push(p);
                                  return acc;
                                }, {})
                              ).map(([compName, prods]) => (
                                <optgroup key={compName} label={`🏢 ${compName}`}>
                                  {prods.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} • {p.size || p.unit || p.category} ({p.sku})
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* 2. Company / Brand Field (Directly inside Line Item) */}
                        <div className="w-full md:w-44">
                          <label className="text-[10px] text-[#666666] font-semibold mb-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-[#D97757]" />
                            <span>Company / Brand *</span>
                          </label>
                          <input
                            type="text"
                            list="item-companies-list"
                            placeholder="e.g. Royal Canin"
                            value={item.company || ''}
                            onChange={(e) => updateLineItem(idx, 'company', e.target.value)}
                            className="w-full px-2.5 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] text-xs font-bold text-[#1A1A1A] focus:bg-white focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                          />
                        </div>

                        {/* 3. Barcode Field with Scan Button */}
                        <div className="w-full md:w-36">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] text-[#666666] font-semibold flex items-center gap-1">
                              <Barcode className="w-3 h-3 text-[#D97757]" />
                              <span>Barcode</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setScannerMode('fill-row');
                                setScanningLineIndex(idx);
                                setShowBarcodeScanner(true);
                              }}
                              className="text-[10px] text-[#D97757] hover:text-[#C86646] font-bold flex items-center gap-0.5"
                              title="Scan barcode with camera"
                            >
                              <Camera className="w-2.5 h-2.5" />
                              <span>Scan</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="e.g. 8901234567890"
                            value={currentBarcode}
                            onChange={(e) => updateLineItem(idx, 'barcode', e.target.value)}
                            className="w-full px-2.5 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] text-xs font-mono font-bold text-[#264653] focus:bg-white focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                          />
                        </div>

                        {/* 4. Bulk Quantity */}
                        <div className="w-full md:w-24">
                          <label className="block text-[10px] text-[#666666] font-semibold mb-1">
                            Bulk Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="e.g. 50"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(idx, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] text-xs font-bold text-center focus:bg-white focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                          />
                        </div>

                        {/* 5. Purchase Rate (₹) */}
                        <div className="w-full md:w-24">
                          <label className="block text-[10px] text-[#666666] font-semibold mb-1">
                            Purchase Rate (₹)
                          </label>
                          <input
                            type="number"
                            placeholder="Purchase rate"
                            value={item.unitCost}
                            onChange={(e) => updateLineItem(idx, 'unitCost', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] text-xs font-bold text-right focus:bg-white focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                          />
                        </div>

                        {/* 6. GST % */}
                        <div className="w-full md:w-20">
                          <label className="block text-[10px] text-[#666666] font-semibold mb-1">
                            GST %
                          </label>
                          <select
                            value={item.taxPercent}
                            onChange={(e) => updateLineItem(idx, 'taxPercent', e.target.value)}
                            className="w-full px-2 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] text-xs text-center focus:bg-white focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>

                        {/* 7. Line Total */}
                        <div className="w-full md:w-28 text-right">
                          <span className="block text-[10px] text-[#666666] font-semibold mb-1">
                            Line Total
                          </span>
                          <span className="font-serif font-bold text-xs text-[#1A1A1A] leading-8">
                            {formatINR(lineTotal)}
                          </span>
                        </div>

                        {/* 8. Remove Button */}
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors self-end md:self-center"
                            title="Remove Line"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: ATTACH BILL DOCUMENT & NOTES */}
              <div className="p-4 rounded-2xl bg-[#F5F2ED] border border-[#EAE7E0] space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-[#5A5A40]">
                  3. Invoice PDF / Bill Attachment & Notes
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Upload Box */}
                  <div>
                    <label className="block font-semibold mb-1.5 text-[#1A1A1A]">
                      Attach Invoice PDF / Bill Document
                    </label>
                    <div className="relative border-2 border-dashed border-[#D5C7B8] hover:border-[#5A5A40] rounded-2xl p-4 text-center bg-white transition-colors">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-6 h-6 mx-auto text-[#7A8C7B] mb-1" />
                      <p className="text-xs font-semibold text-[#1A1A1A]">
                        {attachedFileName ? (
                          <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                            <FileCheck className="w-4 h-4" />
                            {attachedFileName}
                          </span>
                        ) : (
                          'Click or drop invoice PDF / scanned bill here'
                        )}
                      </p>
                      <p className="text-[10px] text-[#888888] mt-0.5">Supports PDF, JPG, PNG up to 10MB</p>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block font-semibold mb-1.5 text-[#1A1A1A]">
                      Consignment Delivery Notes
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Received at Central Warehouse. Consignment batch MH-2026-44. Awaiting branch allocation."
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* CONSIGNMENT TOTAL CALCULATION SUMMARY */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-[#1A1A1A] text-xs">
                      Consignment Summary ({lineItems.length} Products)
                    </div>
                    <div className="text-[11px] text-[#666666]">
                      {totalUnits} bulk units will be registered and marked as available for branch distribution
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-[#666666]">Subtotal: {formatINR(subtotal)} + Tax: {formatINR(taxAmount)}</div>
                  <div className="text-lg font-serif font-bold text-[#1A1A1A]">
                    Total: {formatINR(grandTotal)}
                  </div>
                </div>
              </div>

              {/* SUBMIT BUTTONS */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE7E0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-full font-semibold text-[#666666] hover:bg-[#F5F2ED] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-full font-bold bg-[#D97757] hover:bg-[#C86646] text-white shadow-xs transition-all flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{loading ? 'Registering Inward...' : 'Save Purchase Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK NEW SUPPLIER MODAL */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl p-6 text-[#1A1A1A]">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE7E0]">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#5A5A40]" />
                <h4 className="font-serif font-bold text-base text-[#1A1A1A]">Add New Supplier</h4>
              </div>
              <button
                onClick={() => setShowNewSupplierModal(false)}
                className="text-[#666666] hover:text-[#1A1A1A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSupplier} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Canin Direct Supply"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Amit Verma"
                    value={newSupplierContact}
                    onChange={(e) => setNewSupplierContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98200 12345"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">City / Region</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={newSupplierCity}
                    onChange={(e) => setNewSupplierCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAECP1234F1Z8"
                    value={newSupplierGstin}
                    onChange={(e) => setNewSupplierGstin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-[#F5F2ED] font-mono uppercase focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE7E0]">
                <button
                  type="button"
                  onClick={() => setShowNewSupplierModal(false)}
                  className="px-4 py-2 rounded-full font-semibold text-[#666666] hover:bg-[#F5F2ED]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={supplierSaving}
                  className="px-5 py-2 rounded-full font-bold bg-[#5A5A40] text-white shadow-2xs hover:bg-[#4A4A32]"
                >
                  {supplierSaving ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK NEW PRODUCT WITH BARCODE MODAL */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl p-5 sm:p-6 text-[#1A1A1A] max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE7E0]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E76F51]/15 text-[#E76F51] flex items-center justify-center">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-[#1A1A1A]">
                    Add New Product & Barcode
                  </h4>
                  <p className="text-[11px] text-[#666666]">
                    Register item into master catalog and add directly to this purchase consignment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewProductModal(false)}
                className="p-1 rounded-full text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F2ED]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newProductError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{newProductError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewProduct} className="mt-4 space-y-4 text-xs">
              {/* CARD 1: BARCODE NUMBER (HIGHLIGHTED) */}
              <div className="p-4 rounded-2xl bg-[#E76F51]/5 border-2 border-[#E76F51]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#E76F51] text-xs flex items-center gap-1.5">
                    <Barcode className="w-4 h-4" />
                    <span>Product Barcode Number (EAN-13 / UPC) *</span>
                  </label>
                  <span className="text-[10px] text-[#666666]">Required for retail POS scanning</span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      placeholder="e.g. 8901234567890"
                      value={newProductBarcode}
                      onChange={(e) => setNewProductBarcode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#EAE7E0] bg-white font-mono font-bold text-sm text-[#264653] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                    />
                    <Barcode className="w-4 h-4 text-[#888888] absolute left-3 top-3" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setScannerMode('fill-new-product');
                        setShowBarcodeScanner(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] hover:bg-[#F5F2ED] text-[#D97757] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                      title="Scan packaging barcode with device camera"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Scan Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewProductBarcode(generateRandomEanBarcode())}
                      className="px-3 py-2 rounded-xl bg-white border border-[#EAE7E0] hover:bg-[#F5F2ED] text-[#5A5A40] font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                      title="Generate Indian GS1 EAN-13 code (starts with 890)"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generate EAN</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#666666] pt-1">
                  <span>Standard 13-digit retail barcode for pet food pouches, bags, and cans</span>
                  {newProductBarcode && (
                    <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {newProductBarcode.length} digits
                    </span>
                  )}
                </div>
              </div>

              {/* CARD 2: PRODUCT DETAILS */}
              <div className="p-4 rounded-2xl bg-[#F5F2ED] border border-[#EAE7E0] space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-[#5A5A40]">
                  Product Details & Specifications
                </span>

                <div>
                  <label className="block font-semibold mb-1 text-[#1A1A1A]">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Canin Medium Puppy Gravy Pouch"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-white font-medium text-xs focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                  />
                </div>

                {/* Stock Product Image Selector */}
                <div className="pt-1">
                  <label className="block font-semibold mb-1 text-[#1A1A1A] flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-[#D97757]" />
                    <span>Product Image (For Visual Stock Selection)</span>
                  </label>
                  <ImageUploadPicker
                    value={newProductImageUrl}
                    onChange={(url) => setNewProductImageUrl(url)}
                    brandHint={newProductBrand || newProductCompany}
                    formHint={newProductForm}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">
                      Company / Manufacturer *
                    </label>
                    <input
                      type="text"
                      list="existing-companies-list"
                      placeholder="e.g. Royal Canin India"
                      value={newProductCompany}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewProductCompany(val);
                        if (!newProductBrand || newProductBrand === newProductCompany) {
                          setNewProductBrand(val);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs font-semibold text-[#1A1A1A] focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                    />
                    <datalist id="existing-companies-list">
                      {existingCompanies.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">Brand Name</label>
                    <input
                      type="text"
                      list="existing-brands-list"
                      placeholder="e.g. Royal Canin"
                      value={newProductBrand}
                      onChange={(e) => setNewProductBrand(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs focus:ring-2 focus:ring-[#5A5A40] focus:outline-hidden"
                    />
                    <datalist id="existing-brands-list">
                      {existingCompanies.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">Category</label>
                    <select
                      value={newProductCategory}
                      onChange={(e) => setNewProductCategory(e.target.value as any)}
                      className="w-full px-2 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs focus:outline-hidden"
                    >
                      <option value="Dog Food">Dog Food</option>
                      <option value="Cat Food">Cat Food</option>
                      <option value="Bird Food">Bird Food</option>
                      <option value="Fish Food">Fish Food</option>
                      <option value="Pet Treats">Pet Treats</option>
                      <option value="Toys">Toys</option>
                      <option value="Grooming">Grooming</option>
                      <option value="Medicines & Care">Medicines & Care</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">Product Form</label>
                    <select
                      value={newProductForm}
                      onChange={(e) => setNewProductForm(e.target.value as any)}
                      className="w-full px-2 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs focus:outline-hidden"
                    >
                      <option value="DRIED">DRIED (Kibble / Dry)</option>
                      <option value="WET">WET (Gravy / Loaf)</option>
                      <option value="OTHER">OTHER (Treats / Care)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">Target Animal</label>
                    <select
                      value={newProductAnimal}
                      onChange={(e) => setNewProductAnimal(e.target.value as any)}
                      className="w-full px-2 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs focus:outline-hidden"
                    >
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Bird">Bird</option>
                      <option value="Fish">Fish</option>
                      <option value="Small Pet">Small Pet</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">Life Stage</label>
                    <select
                      value={newProductLifeStage}
                      onChange={(e) => setNewProductLifeStage(e.target.value as any)}
                      className="w-full px-2 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs focus:outline-hidden"
                    >
                      <option value="Puppy">Puppy</option>
                      <option value="Kitten">Kitten</option>
                      <option value="Adult">Adult</option>
                      <option value="Senior">Senior</option>
                      <option value="All Life Stages">All Life Stages</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">Pack Size / Weight</label>
                    <input
                      type="text"
                      placeholder="e.g. 3 kg, 85g, 15 kg"
                      value={newProductSize}
                      onChange={(e) => setNewProductSize(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">Package Unit</label>
                    <select
                      value={newProductUnit}
                      onChange={(e) => setNewProductUnit(e.target.value as any)}
                      className="w-full px-2 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs focus:outline-hidden"
                    >
                      <option value="packet">packet (pouch/bag)</option>
                      <option value="can">can (tin)</option>
                      <option value="kg">kg (bulk)</option>
                      <option value="piece">piece (toy/item)</option>
                      <option value="bottle">bottle (shampoo/oil)</option>
                      <option value="box">box</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CARD 3: PRICING & CONSIGNMENT QUANTITY */}
              <div className="p-4 rounded-2xl bg-[#F5F2ED] border border-[#EAE7E0] space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-[#5A5A40]">
                  Consignment Pricing & Received Bulk Quantity
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">Purchase Rate (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 1200"
                      value={newProductCostPrice}
                      onChange={(e) => setNewProductCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-white font-bold text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">MRP / Retail (₹) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 1650"
                      value={newProductSellingPrice}
                      onChange={(e) => setNewProductSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#EAE7E0] bg-white font-bold text-xs focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[#1A1A1A]">GST Rate (%)</label>
                    <select
                      value={newProductTaxPercent}
                      onChange={(e) => setNewProductTaxPercent(Number(e.target.value))}
                      className="w-full px-2 py-2 rounded-xl border border-[#EAE7E0] bg-white text-xs focus:outline-hidden"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[#E76F51]">Consignment Qty *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 50"
                      value={newProductQuantity}
                      onChange={(e) => setNewProductQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E76F51]/50 bg-white font-bold text-xs text-[#E76F51] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE7E0]">
                <button
                  type="button"
                  onClick={() => setShowNewProductModal(false)}
                  className="px-5 py-2.5 rounded-full font-semibold text-[#666666] hover:bg-[#F5F2ED] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newProductSaving}
                  className="px-6 py-2.5 rounded-full font-bold bg-[#D97757] hover:bg-[#C86646] text-white shadow-2xs transition-all flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{newProductSaving ? 'Registering Item...' : 'Save & Add to Consignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => {
          setShowBarcodeScanner(false);
          setScanningLineIndex(null);
        }}
        onScan={handleBarcodeScanned}
        zIndex="z-70"
        title={
          scannerMode === 'fill-new-product'
            ? 'Scan Barcode for New Product'
            : scannerMode === 'fill-row'
            ? 'Scan Barcode for Consignment Item'
            : 'Scan Product Barcode to Add'
        }
        subtitle={
          scannerMode === 'fill-new-product'
            ? 'Scan retail packaging barcode to auto-fill the new product code'
            : 'Point camera at product barcode (EAN-13, UPC, Code 128)'
        }
        demoBarcodes={products
          .filter((p) => p.barcode)
          .map((p) => ({ barcode: p.barcode!, name: p.name }))}
      />

      {/* VISUAL STOCK MENU MODAL */}
      <StockMenuModal
        isOpen={showStockMenuModal}
        onClose={() => {
          setShowStockMenuModal(false);
          setStockMenuTargetIndex(null);
        }}
        products={products}
        targetLineIndex={stockMenuTargetIndex}
        currentLineProductIds={lineItems.map((li) => ({
          productId: li.productId,
          quantity: Number(li.quantity) || 0,
        }))}
        onSelectForLine={handleSelectProductForLine}
        onAddProducts={handleAddProductsFromMenu}
        onOpenNewProductModal={() => handleOpenNewProductModal(stockMenuTargetIndex)}
      />

      {/* POST-REGISTRATION SUCCESS MODAL: PROMPT TO DISTRIBUTE */}
      {createdSuccessPurchase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl p-6 text-[#1A1A1A] animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-serif font-bold text-xl text-[#1A1A1A]">
                Purchase Order Inwarded Successfully!
              </h3>
              <p className="font-mono font-bold text-xs text-[#D97757] mt-1">
                {createdSuccessPurchase.purchaseNumber} • Invoice #{' '}
                {createdSuccessPurchase.supplierInvoiceNumber || 'BILL-REF'}
              </p>
              <p className="text-xs text-[#666666] mt-2 max-w-sm mx-auto">
                Stock has been registered into the central system and marked as{' '}
                <strong className="text-amber-700">Ready for Allocation</strong>.
              </p>
            </div>

            <div className="my-5 p-4 rounded-2xl bg-[#F5F2ED] border border-[#EAE7E0] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#666666]">Supplier:</span>
                <strong className="text-[#1A1A1A]">{createdSuccessPurchase.supplierName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">Total Inwarded Units:</span>
                <strong className="text-[#1A1A1A]">
                  {createdSuccessPurchase.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0}{' '}
                  units
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">Total Value:</span>
                <strong className="text-[#1A1A1A]">
                  {formatINR(createdSuccessPurchase.grandTotal)}
                </strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setCreatedSuccessPurchase(null)}
                className="w-full sm:w-1/2 py-2.5 rounded-full font-semibold text-xs text-[#666666] bg-[#F5F2ED] hover:bg-[#EAE7E0] transition-colors"
              >
                Done (Stay in Purchases)
              </button>
              <button
                onClick={() => {
                  const pid = createdSuccessPurchase.id;
                  setCreatedSuccessPurchase(null);
                  handleStartAllocation(pid);
                }}
                className="w-full sm:w-1/2 py-2.5 rounded-full font-bold text-xs text-white bg-[#D97757] hover:bg-[#C86646] shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <GitFork className="w-4 h-4" />
                <span>Distribute to Branches Now →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PURCHASE SLIP */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#EAE7E0] shadow-2xl p-6 text-[#1A1A1A] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-[#EAE7E0]">
              <div>
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5A5A40]">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>MASTER PURCHASE ORDER SLIP</span>
                </div>
                <h3 className="font-serif font-bold text-xl text-[#1A1A1A] mt-0.5">
                  {viewingPurchase.purchaseNumber}
                </h3>
              </div>
              <button
                onClick={() => setViewingPurchase(null)}
                className="text-[#666666] hover:text-[#1A1A1A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-[#F5F2ED]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#666666] block">Company / Brand</span>
                  <span className="font-bold text-[#1A1A1A] text-xs flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#D97757]" />
                    <span>{viewingPurchase.company || viewingPurchase.items?.[0]?.company || 'General'}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#666666] block">Invoice / Bill #</span>
                  <span className="font-mono font-bold text-[#1A1A1A] text-xs">
                    {viewingPurchase.supplierInvoiceNumber || 'BILL-REF'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#666666] block">Inward Date</span>
                  <span className="font-semibold text-[#1A1A1A]">
                    {viewingPurchase.purchaseDate || (viewingPurchase as any).date || 'Recent'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#666666] block">Supplier</span>
                  <span className="font-semibold text-[#1A1A1A] truncate block">
                    {viewingPurchase.supplierName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#666666] block">Status</span>
                  <span className="font-bold text-[#D97757]">
                    {viewingPurchase.allocatedStatus || 'UNALLOCATED'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-bold text-xs text-[#5A5A40] uppercase tracking-wider mb-2">
                  Line Items in Consignment
                </h4>
                <div className="border border-[#EAE7E0] rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F5F2ED] border-b border-[#EAE7E0] text-[10px] font-bold uppercase text-[#666666]">
                      <tr>
                        <th className="px-3 py-2">Item Description</th>
                        <th className="px-3 py-2">Company</th>
                        <th className="px-3 py-2 text-center">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE7E0]">
                      {viewingPurchase.items?.map((item, idx) => {
                        const itemBarcode = item.barcode || products.find((p) => p.id === item.productId)?.barcode;
                        const itemCompany = item.company || products.find((p) => p.id === item.productId)?.company || viewingPurchase.company || 'General';
                        return (
                          <tr key={idx}>
                            <td className="px-3 py-2.5">
                              <span className="font-bold text-[#1A1A1A]">{item.productName}</span>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-[#666666]">{item.sku}</span>
                                {itemBarcode && (
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#264653] bg-[#EAE7E0] px-1.5 py-0.5 rounded font-bold">
                                    <Barcode className="w-3 h-3 text-[#D97757]" />
                                    {itemBarcode}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#EAE7E0] text-[11px] font-bold text-[#1A1A1A]">
                                <Building2 className="w-2.5 h-2.5 text-[#D97757]" />
                                <span>{itemCompany}</span>
                              </span>
                            </td>
                          <td className="px-3 py-2.5 text-center font-bold text-[#1A1A1A]">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium text-[#666666]">
                            {formatINR(item.purchasePrice)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-[#1A1A1A]">
                            {formatINR(item.total)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="p-3.5 rounded-2xl bg-[#F5F2ED] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#666666]">Total Purchased: </span>
                  <strong className="text-xs text-[#1A1A1A]">
                    {viewingPurchase.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0} units
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#666666] mr-2">Grand Total:</span>
                  <span className="font-serif font-bold text-base text-[#1A1A1A]">
                    {formatINR(viewingPurchase.grandTotal || (viewingPurchase as any).totalAmount)}
                  </span>
                </div>
              </div>

              {viewingPurchase.fileName && (
                <div className="p-3 rounded-xl bg-white border border-[#EAE7E0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#D97757]" />
                    <span className="text-xs font-semibold text-[#1A1A1A]">{viewingPurchase.fileName}</span>
                  </div>
                  <span className="text-[11px] text-[#5A5A40] font-semibold bg-[#F5F2ED] px-2.5 py-1 rounded-full">
                    Attached Document Verified
                  </span>
                </div>
              )}

              {viewingPurchase.notes && (
                <div className="text-xs text-[#666666] italic bg-[#F5F2ED]/50 p-2.5 rounded-xl">
                  "{viewingPurchase.notes}"
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE7E0]">
                {currentUser?.role === 'OWNER' && onDeletePurchase && (
                  <button
                    type="button"
                    onClick={() => {
                      const toDel = viewingPurchase;
                      setViewingPurchase(null);
                      setDeleteConfirmPurchase(toDel);
                    }}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingPurchase(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#666666] hover:bg-[#F5F2ED]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pid = viewingPurchase.id;
                    setViewingPurchase(null);
                    handleStartAllocation(pid);
                  }}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[#D97757] hover:bg-[#C86646] text-white shadow-2xs flex items-center gap-1.5"
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span>Allocate This Consignment →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EAE7E0] space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Delete Purchase Order</h3>
                <p className="text-xs text-[#666666]">PO #{deleteConfirmPurchase.purchaseNumber || deleteConfirmPurchase.id}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#5A5A40]">
              Are you sure you want to delete this purchase consignment from <span className="font-semibold text-[#1A1A1A]">{deleteConfirmPurchase.supplierName}</span>?
              {deleteConfirmPurchase.grandTotal ? ` Total value: ₹${deleteConfirmPurchase.grandTotal.toLocaleString('en-IN')}.` : ''}
              <br />
              This action will remove the inward record and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPurchase(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-[#EAE7E0] hover:bg-[#F5F2ED] text-[#2D2D2D] text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
