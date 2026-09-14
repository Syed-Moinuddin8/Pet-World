import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  ArrowRightLeft,
  SlidersHorizontal,
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
  X,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  Edit2,
  Sparkles,
  Camera,
  Check,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  FolderPlus,
  FolderMinus,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { Product, Branch, InventoryItem, User, ProductForm, ProductCategory, PetAvatarType, Supplier } from '../types.js';
import { PetAvatar, PawIcon, PetEmptyState } from './PetAvatars.js';
import { ProductFormBadge, ProductImageThumb } from './ProductImageThumb.js';
import { EditProductModal } from './EditProductModal.js';
import { AddInventoryModal } from './AddInventoryModal.js';
import { BarcodeScannerModal } from './BarcodeScannerModal.js';
import { getProductImageUrl } from '../utils/productImages.js';

interface InventoryManagementProps {
  products: Product[];
  inventory: InventoryItem[];
  branches: Branch[];
  currentUser: User;
  suppliers?: Supplier[];
  categories?: string[];
  onCreateCategory?: (name: string) => Promise<any>;
  onDeleteCategory?: (name: string, fallbackCategory?: string) => Promise<any>;
  onAddStock?: (data: any) => Promise<any>;
  onAdjustStock?: (data: any) => Promise<any>;
  onTransferStock?: (data: any) => Promise<any>;
  onCreateProduct?: (data: any) => Promise<any>;
  onUpdateProduct?: (productId: string, data: any) => Promise<any>;
  onDeleteProduct?: (productId: string) => Promise<any> | void;
  onStockInward?: (data: any) => Promise<any>;
  onStockTransfer?: (data: any) => Promise<any>;
  onStockAdjustment?: (data: any) => Promise<any>;
  onBulkImportCsv?: (items: any[], branchId: string) => Promise<any>;
  preselectedBranchId?: string;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  products,
  inventory,
  branches,
  currentUser,
  suppliers = [],
  categories: categoriesProp,
  onCreateCategory,
  onDeleteCategory,
  onAddStock,
  onAdjustStock,
  onTransferStock,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onStockInward,
  onStockTransfer,
  onStockAdjustment,
  onBulkImportCsv,
  preselectedBranchId,
}) => {
  const isOwner = currentUser.role === 'OWNER';
  const defaultBranch = !isOwner && currentUser.branchId ? currentUser.branchId : (preselectedBranchId || 'ALL');

  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranch);

  useEffect(() => {
    if (preselectedBranchId) {
      setSelectedBranch(preselectedBranchId);
    }
  }, [preselectedBranchId]);

  // View mode: Hierarchical Company -> Dried/Wet view, or Master Table, or Visual Grid
  const [viewMode, setViewMode] = useState<'hierarchy' | 'table' | 'grid'>('hierarchy');

  // Filters
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedProductForm, setSelectedProductForm] = useState<'ALL' | 'DRIED' | 'WET' | 'OTHER'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState<'ALL' | 'HEALTHY' | 'LOW' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Accordion state for companies
  const [collapsedCompanies, setCollapsedCompanies] = useState<Record<string, boolean>>({});

  // Modals
  const [addStockModalProduct, setAddStockModalProduct] = useState<Product | null>(null);
  const [adjustStockModalProduct, setAdjustStockModalProduct] = useState<Product | null>(null);
  const [transferStockModalProduct, setTransferStockModalProduct] = useState<Product | null>(null);
  const [breakdownProduct, setBreakdownProduct] = useState<Product | null>(null);
  const [editModalProduct, setEditModalProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showQuickScanner, setShowQuickScanner] = useState(false);

  // Category Management Modals state
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryCreateError, setCategoryCreateError] = useState('');

  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState('');
  const [deleteFallbackCategory, setDeleteFallbackCategory] = useState('Other');
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoryDeleteError, setCategoryDeleteError] = useState('');

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmProduct || !onDeleteProduct) return;
    try {
      setIsDeleting(true);
      await onDeleteProduct(deleteConfirmProduct.id);
      const name = deleteConfirmProduct.name;
      setDeleteConfirmProduct(null);
      setFeedbackMsg(`"${name}" was deleted from inventory.`);
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err: any) {
      alert('Failed to delete product: ' + (err?.message || err));
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Product form state
  const [newProdCompany, setNewProdCompany] = useState('');
  const [newProdForm, setNewProdForm] = useState<ProductForm>('DRIED');
  const [newProdCategory, setNewProdCategory] = useState<ProductCategory>('Dog Food');
  const [newProdAvatar, setNewProdAvatar] = useState<PetAvatarType>('dog');

  // Form states
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Distinct companies list
  const existingCompanies = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const c = p.company || p.brand;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [products]);

  // Dynamic Categories list
  const categories = useMemo(() => {
    const list = categoriesProp && categoriesProp.length > 0 ? [...categoriesProp] : [
      'Dog Food',
      'Cat Food',
      'Pet Treats',
      'Bird Food',
      'Fish Food',
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
    // Include any categories present in products
    products.forEach((p) => {
      if (p.category && !list.includes(p.category)) {
        list.push(p.category);
      }
    });
    const cleanList = Array.from(new Set(list.map((c) => c.trim()).filter(Boolean)));
    const withoutOther = cleanList
      .filter((c) => c.toLowerCase() !== 'other')
      .sort((a, b) => a.localeCompare(b));
    const hasOther = cleanList.some((c) => c.toLowerCase() === 'other');
    return hasOther ? [...withoutOther, 'Other'] : withoutOther;
  }, [categoriesProp, products]);

  // Map of category -> product count
  const categoryProductCounts = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((cat) => {
      map[cat] = 0;
    });
    products.forEach((p) => {
      const cat = p.category || 'Other';
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [categories, products]);

  // Handle Category Creation
  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      setCategoryCreateError('Category name cannot be empty.');
      return;
    }
    const duplicate = categories.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      setCategoryCreateError(`Category "${duplicate}" already exists.`);
      return;
    }

    setIsCreatingCategory(true);
    setCategoryCreateError('');
    try {
      if (onCreateCategory) {
        await onCreateCategory(trimmed);
      }
      setSelectedCategory(trimmed);
      setFeedbackMsg(`Category "${trimmed}" created successfully!`);
      setTimeout(() => setFeedbackMsg(''), 3500);
      setShowCreateCategoryModal(false);
      setNewCategoryInput('');
    } catch (err: any) {
      setCategoryCreateError(err.message || 'Failed to create category.');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Handle Category Deletion
  const handleDeleteCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryToDelete) {
      setCategoryDeleteError('Please select a category to delete.');
      return;
    }
    if (categoryToDelete.toLowerCase() === 'other') {
      setCategoryDeleteError('The primary fallback category "Other" cannot be deleted.');
      return;
    }

    setIsDeletingCategory(true);
    setCategoryDeleteError('');
    try {
      if (onDeleteCategory) {
        await onDeleteCategory(categoryToDelete, deleteFallbackCategory || 'Other');
      }
      if (selectedCategory.toLowerCase() === categoryToDelete.toLowerCase()) {
        setSelectedCategory('ALL');
      }
      setFeedbackMsg(`Category "${categoryToDelete}" deleted successfully.`);
      setTimeout(() => setFeedbackMsg(''), 3500);
      setShowDeleteCategoryModal(false);
    } catch (err: any) {
      setCategoryDeleteError(err.message || 'Failed to delete category.');
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // Calculate stock per product
  const getProductStock = (productId: string, branchId: string) => {
    if (branchId === 'ALL') {
      return inventory
        .filter((inv) => inv.productId === productId)
        .reduce((sum, item) => sum + item.quantity, 0);
    }
    const match = inventory.find((inv) => inv.productId === productId && inv.branchId === branchId);
    return match ? match.quantity : 0;
  };

  const getProductStockBreakdown = (productId: string) => {
    return branches.map((b) => {
      const item = inventory.find((inv) => inv.productId === productId && inv.branchId === b.id);
      return {
        branch: b,
        quantity: item ? item.quantity : 0,
      };
    });
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Company filter
      if (selectedCompany !== 'ALL') {
        const comp = p.company || p.brand;
        if (comp !== selectedCompany) return false;
      }

      // Product Form (Dried vs Wet) filter
      if (selectedProductForm !== 'ALL') {
        const form = p.productForm || 'OTHER';
        if (form !== selectedProductForm) return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const comp = (p.company || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const name = p.name.toLowerCase();
        const sku = p.sku.toLowerCase();
        const barcode = p.barcode.toLowerCase();
        const category = (p.category || '').toLowerCase();
        const form = (p.productForm || '').toLowerCase();

        const match =
          name.includes(q) ||
          comp.includes(q) ||
          brand.includes(q) ||
          category.includes(q) ||
          sku.includes(q) ||
          barcode.includes(q) ||
          barcode.replace(/[-\s]/g, '').includes(q.replace(/[-\s]/g, '')) ||
          (q === 'dry' && form === 'dried') ||
          (q === 'dried' && form === 'dried') ||
          (q === 'wet' && form === 'wet');

        if (!match) return false;
      }

      // Stock status filter
      const stock = getProductStock(p.id, selectedBranch);
      if (selectedStockStatus === 'OUT' && stock > 0) return false;
      if (selectedStockStatus === 'LOW' && (stock <= 0 || stock > p.reorderLevel)) return false;
      if (selectedStockStatus === 'HEALTHY' && stock <= p.reorderLevel) return false;

      return true;
    });
  }, [
    products,
    inventory,
    selectedBranch,
    selectedCompany,
    selectedProductForm,
    selectedCategory,
    selectedStockStatus,
    searchQuery,
  ]);

  // Group filtered products by Company, and inside each by Dried vs Wet
  const companyHierarchy = useMemo(() => {
    const map = new Map<
      string,
      {
        companyName: string;
        driedProducts: Product[];
        wetProducts: Product[];
        otherProducts: Product[];
        totalStock: number;
        totalValue: number;
      }
    >();

    filteredProducts.forEach((p) => {
      const companyKey = p.company || p.brand || 'Other / Independent';
      if (!map.has(companyKey)) {
        map.set(companyKey, {
          companyName: companyKey,
          driedProducts: [],
          wetProducts: [],
          otherProducts: [],
          totalStock: 0,
          totalValue: 0,
        });
      }

      const group = map.get(companyKey)!;
      const stock = getProductStock(p.id, selectedBranch);
      group.totalStock += stock;
      group.totalValue += stock * p.sellingPrice;

      const form = p.productForm || 'OTHER';
      if (form === 'DRIED') {
        group.driedProducts.push(p);
      } else if (form === 'WET') {
        group.wetProducts.push(p);
      } else {
        group.otherProducts.push(p);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.companyName.localeCompare(b.companyName)
    );
  }, [filteredProducts, inventory, selectedBranch]);

  // Overall Catalog Statistics
  const catalogStats = useMemo(() => {
    let totalDriedCount = 0;
    let totalWetCount = 0;
    let totalDriedUnits = 0;
    let totalWetUnits = 0;
    let totalValuation = 0;

    products.forEach((p) => {
      const stock = getProductStock(p.id, selectedBranch);
      totalValuation += stock * p.sellingPrice;
      const form = p.productForm || 'OTHER';
      if (form === 'DRIED') {
        totalDriedCount++;
        totalDriedUnits += stock;
      } else if (form === 'WET') {
        totalWetCount++;
        totalWetUnits += stock;
      }
    });

    return {
      totalProducts: products.length,
      totalCompanies: existingCompanies.length,
      totalDriedCount,
      totalDriedUnits,
      totalWetCount,
      totalWetUnits,
      totalValuation,
    };
  }, [products, inventory, selectedBranch, existingCompanies]);

  const formatINR = (val?: number | null) =>
    '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');

  const toggleCompanyCollapse = (companyName: string) => {
    setCollapsedCompanies((prev) => ({
      ...prev,
      [companyName]: !prev[companyName],
    }));
  };

  const expandAll = () => setCollapsedCompanies({});
  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    companyHierarchy.forEach((c) => {
      all[c.companyName] = true;
    });
    setCollapsedCompanies(all);
  };

  // Handle Add Stock submission
  const handleAddStockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!addStockModalProduct) return;
    const form = new FormData(e.currentTarget);
    setActionLoading(true);
    try {
      const addFn = onAddStock || onStockInward;
      if (addFn) {
        await addFn({
          productId: addStockModalProduct.id,
          branchId: form.get('branchId') as string,
          quantity: Number(form.get('quantity')),
          purchasePrice: Number(form.get('purchasePrice')),
          supplierName: form.get('supplierName') as string,
          purchaseBillNumber: form.get('purchaseBillNumber') as string,
          notes: form.get('notes') as string,
        });
      }
      setFeedbackMsg(`Stock successfully added for ${addStockModalProduct.name}!`);
      setTimeout(() => setFeedbackMsg(''), 3000);
      setAddStockModalProduct(null);
    } catch (err: any) {
      alert('Error adding stock: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Adjust Stock submission
  const handleAdjustStockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adjustStockModalProduct) return;
    const form = new FormData(e.currentTarget);
    setActionLoading(true);
    try {
      const adjustFn = onAdjustStock || onStockAdjustment;
      if (adjustFn) {
        await adjustFn({
          productId: adjustStockModalProduct.id,
          branchId: form.get('branchId') as string,
          newQuantity: Number(form.get('newQuantity')),
          reason: form.get('reason') as string,
        });
      }
      setFeedbackMsg(`Stock adjusted for ${adjustStockModalProduct.name}!`);
      setTimeout(() => setFeedbackMsg(''), 3000);
      setAdjustStockModalProduct(null);
    } catch (err: any) {
      alert('Error adjusting stock: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Transfer Stock submission
  const handleTransferStockSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!transferStockModalProduct) return;
    const form = new FormData(e.currentTarget);
    setActionLoading(true);
    try {
      const transferFn = onTransferStock || onStockTransfer;
      if (transferFn) {
        await transferFn({
          productId: transferStockModalProduct.id,
          fromBranchId: form.get('fromBranchId') as string,
          toBranchId: form.get('toBranchId') as string,
          quantity: Number(form.get('quantity')),
          reason: form.get('reason') as string,
        });
      }
      setFeedbackMsg(`Stock transferred successfully!`);
      setTimeout(() => setFeedbackMsg(''), 3000);
      setTransferStockModalProduct(null);
    } catch (err: any) {
      alert('Error transferring stock: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Product submission
  const handleCreateProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setActionLoading(true);
    try {
      if (onCreateProduct) {
        const brandVal = (form.get('brand') as string) || newProdCompany;
        const sellPrice = Number(form.get('sellingPrice')) || 0;
        const costPriceVal = form.get('costPrice') ? Number(form.get('costPrice')) : Math.round(sellPrice * 0.7);
        await onCreateProduct({
          name: form.get('name') as string,
          company: newProdCompany || brandVal,
          brand: brandVal,
          productForm: newProdForm,
          category: newProdCategory,
          unit: (form.get('unit') as string) || 'packet',
          purchasePrice: costPriceVal,
          costPrice: costPriceVal,
          sellingPrice: sellPrice,
          mrp: Number(form.get('mrp')),
          taxPercent: Number(form.get('taxPercent') || 18),
          minStockLevel: Number(form.get('minStockLevel') || 5),
          reorderLevel: Number(form.get('reorderLevel') || 10),
          avatarType: newProdAvatar,
          status: 'ACTIVE',
        });
      }
      setFeedbackMsg(`New product added successfully!`);
      setTimeout(() => setFeedbackMsg(''), 3000);
      setShowAddProductModal(false);
      // Reset
      setNewProdCompany('');
      setNewProdForm('DRIED');
    } catch (err: any) {
      alert('Error creating product: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E76F51]/10 text-[#E76F51] text-xs font-bold mb-1">
            <PawIcon className="w-3.5 h-3.5" />
            <span>Categorized by Company & Dried vs Wet Products</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#264653] font-['Fredoka',sans-serif]">
            Inventory & Catalog Management
          </h1>
          <p className="text-xs text-[#7C9082]">
            Visual inventory organized by manufacturer, food form, and stored packaging images
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {feedbackMsg && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          <button
            onClick={() => setShowAddInventoryModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
            title="Scan barcode or paste from supplier invoice to inward stock"
          >
            <Plus className="w-4 h-4" />
            <span>+ ADD INVENTORY</span>
          </button>

          <button
            onClick={() => setShowQuickScanner(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#264653] hover:bg-[#1E3741] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Scan product barcode with camera"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Barcode</span>
          </button>

          {/* Create Category Button */}
          <button
            onClick={() => {
              setNewCategoryInput('');
              setCategoryCreateError('');
              setShowCreateCategoryModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#5A5A40] hover:bg-[#464632] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Create a new product category"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Category</span>
          </button>

          {/* Delete Category Button */}
          <button
            onClick={() => {
              setCategoryDeleteError('');
              if (selectedCategory !== 'ALL' && selectedCategory.toLowerCase() !== 'other') {
                setCategoryToDelete(selectedCategory);
              } else {
                const firstDeletable = categories.find((c) => c.toLowerCase() !== 'other');
                setCategoryToDelete(firstDeletable || '');
              }
              setDeleteFallbackCategory('Other');
              setShowDeleteCategoryModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Delete or manage existing product categories"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Category</span>
          </button>

          {isOwner && (
            <button
              onClick={() => setShowAddProductModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#E76F51] hover:bg-[#D95D3E] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Branch Selector, Search, Company Filter, Dried/Wet Pill Filter, View Switcher */}
      <div className="p-4 rounded-3xl bg-white border border-[#EADDCE] shadow-xs space-y-3">
        {/* Row 1: Branch context, Search input, and View mode switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Branch filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#5B7065]">Branch:</span>
            {isOwner ? (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs font-semibold text-[#264653] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
              >
                <option value="ALL">All 6 Branches (Consolidated)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-[#FAF1E8] text-[#E76F51] font-bold text-xs border border-[#E76F51]/20">
                {branches.find((b) => b.id === currentUser.branchId)?.name || 'Assigned Branch'}
              </span>
            )}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#7C9082]" />
            <input
              type="text"
              placeholder="Search product, company, brand, SKU, dry/wet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 sm:py-1.5 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl bg-[#F2ECE4] p-1 text-xs font-bold w-full sm:w-auto justify-around sm:justify-start">
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'hierarchy'
                  ? 'bg-white text-[#264653] shadow-xs'
                  : 'text-[#7C9082] hover:text-[#264653]'
              }`}
              title="Hierarchical View: Grouped by Company, with Dried & Wet products under each"
            >
              <Layers className="w-3.5 h-3.5 text-[#E76F51]" />
              <span className="hidden sm:inline">Company & Dried/Wet</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-[#264653] shadow-xs'
                  : 'text-[#7C9082] hover:text-[#264653]'
              }`}
              title="Master Table View with Image Thumbnails"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Master Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-[#264653] shadow-xs'
                  : 'text-[#7C9082] hover:text-[#264653]'
              }`}
              title="Visual Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Filter Bar (Company, Food Form Dried/Wet, Category, Stock Status) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#F2ECE4] text-xs">
          {/* Company Selector */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#7C9082]" />
            <span className="font-bold text-[#7C9082]">Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-[#D5C7B8] bg-[#FAF8F5] text-xs font-semibold text-[#264653] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
            >
              <option value="ALL">All Companies ({existingCompanies.length})</option>
              {existingCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector with Quick Add/Delete */}
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#7C9082]" />
            <span className="font-bold text-[#7C9082]">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-[#D5C7B8] bg-[#FAF8F5] text-xs font-semibold text-[#264653] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c} ({categoryProductCounts[c] || 0})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setNewCategoryInput('');
                setCategoryCreateError('');
                setShowCreateCategoryModal(true);
              }}
              className="p-1 rounded-md bg-[#5A5A40]/10 hover:bg-[#5A5A40]/20 text-[#5A5A40] transition-colors cursor-pointer"
              title="Create new category"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {selectedCategory !== 'ALL' && selectedCategory.toLowerCase() !== 'other' && (
              <button
                type="button"
                onClick={() => {
                  setCategoryToDelete(selectedCategory);
                  setDeleteFallbackCategory('Other');
                  setCategoryDeleteError('');
                  setShowDeleteCategoryModal(true);
                }}
                className="p-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                title={`Delete "${selectedCategory}" category`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Form Filter (Dried / Wet / Other) */}
          <div className="flex items-center gap-1">
            <span className="font-bold text-[#7C9082] mr-0.5">Form:</span>
            <button
              onClick={() => setSelectedProductForm('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                selectedProductForm === 'ALL'
                  ? 'bg-[#264653] text-white'
                  : 'bg-[#F4EDE4] text-[#5B7065] hover:bg-[#EAE0D3]'
              }`}
            >
              All Forms
            </button>
            <button
              onClick={() => setSelectedProductForm('DRIED')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-bold flex items-center gap-1 ${
                selectedProductForm === 'DRIED'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>🌾</span>
              <span>Dried</span>
            </button>
            <button
              onClick={() => setSelectedProductForm('WET')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-bold flex items-center gap-1 ${
                selectedProductForm === 'WET'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200'
              }`}
            >
              <span>🥫</span>
              <span>Wet</span>
            </button>
            <button
              onClick={() => setSelectedProductForm('OTHER')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                selectedProductForm === 'OTHER'
                  ? 'bg-stone-600 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              📦 Supplies
            </button>
          </div>

          {/* Stock Level Filter */}
          <div className="flex items-center gap-1">
            <span className="font-bold text-[#7C9082] mr-0.5">Stock:</span>
            <button
              onClick={() => setSelectedStockStatus('ALL')}
              className={`px-2 py-1 rounded-lg transition-colors font-semibold ${
                selectedStockStatus === 'ALL'
                  ? 'bg-[#264653] text-white'
                  : 'bg-[#F4EDE4] text-[#5B7065] hover:bg-[#EAE0D3]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStockStatus('HEALTHY')}
              className={`px-2 py-1 rounded-lg transition-colors font-semibold ${
                selectedStockStatus === 'HEALTHY'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Healthy
            </button>
            <button
              onClick={() => setSelectedStockStatus('LOW')}
              className={`px-2 py-1 rounded-lg transition-colors font-semibold ${
                selectedStockStatus === 'LOW'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Low
            </button>
            <button
              onClick={() => setSelectedStockStatus('OUT')}
              className={`px-2 py-1 rounded-lg transition-colors font-semibold ${
                selectedStockStatus === 'OUT'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Out
            </button>
          </div>
        </div>

        {/* View Mode Helper Actions */}
        {viewMode === 'hierarchy' && companyHierarchy.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE4] text-[11px] text-[#7C9082]">
            <span>
              Showing {companyHierarchy.length} companies with {filteredProducts.length} matching items
            </span>
            <div className="flex items-center gap-2 font-bold">
              <button
                onClick={expandAll}
                className="text-[#E76F51] hover:underline"
              >
                Expand All
              </button>
              <span>•</span>
              <button
                onClick={collapseAll}
                className="text-[#7C9082] hover:underline"
              >
                Collapse All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main View Display */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EADDCE]">
          <PetEmptyState
            title="No Products Found"
            description="Try adjusting your company, dried/wet filter, or search query to find inventory items."
          />
        </div>
      ) : viewMode === 'hierarchy' ? (
        /* HIERARCHICAL VIEW: Grouped by Company -> Dried Products / Wet Products */
        <div className="space-y-4">
          {companyHierarchy.map((group) => {
            const isCollapsed = Boolean(collapsedCompanies[group.companyName]);
            const totalItems =
              group.driedProducts.length +
              group.wetProducts.length +
              group.otherProducts.length;

            return (
              <div
                key={group.companyName}
                className="rounded-3xl bg-white border border-[#EADDCE] shadow-xs overflow-hidden transition-all"
              >
                {/* Company Header Card */}
                <div
                  onClick={() => toggleCompanyCollapse(group.companyName)}
                  className="p-4 sm:p-5 bg-linear-to-r from-[#FAF8F5] via-white to-[#FAF8F5] border-b border-[#F2ECE4] flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-[#F7F3EE] transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#E76F51]/10 text-[#E76F51] flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-bold text-[#264653] font-['Fredoka',sans-serif]">
                          {group.companyName}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-[#FAF1E8] text-[#E76F51] text-[10px] font-extrabold">
                          {totalItems} Products
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#7C9082] mt-0.5">
                        {group.driedProducts.length > 0 && (
                          <span className="flex items-center gap-1 text-amber-800 font-bold">
                            <span>🌾</span> {group.driedProducts.length} Dried
                          </span>
                        )}
                        {group.wetProducts.length > 0 && (
                          <span className="flex items-center gap-1 text-cyan-800 font-bold">
                            <span>🥫</span> {group.wetProducts.length} Wet
                          </span>
                        )}
                        {group.otherProducts.length > 0 && (
                          <span className="flex items-center gap-1 text-stone-700">
                            <span>📦</span> {group.otherProducts.length} Supplies
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-[#7C9082]">Company Stock</div>
                      <div className="font-extrabold text-sm text-[#264653]">
                        {group.totalStock} units ({formatINR(group.totalValue)})
                      </div>
                    </div>

                    <button
                      type="button"
                      className="p-2 rounded-xl text-[#7C9082] hover:text-[#264653] hover:bg-[#F2ECE4] transition-colors"
                      title={isCollapsed ? 'Expand Company' : 'Collapse Company'}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Company Body Content */}
                {!isCollapsed && (
                  <div className="p-4 sm:p-6 space-y-6">
                    {/* SUB-CATEGORY 1: 🌾 DRIED PRODUCTS */}
                    {group.driedProducts.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-amber-200">
                          <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">
                            🌾
                          </div>
                          <h3 className="text-sm font-bold text-amber-950 font-['Fredoka',sans-serif]">
                            Dried Products ({group.driedProducts.length})
                          </h3>
                          <span className="text-[11px] text-amber-700">
                            — Kibble, Pellets, Flakes, Dehydrated Jerky & Biscuits
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {group.driedProducts.map((p) => (
                            <ProductCardItem
                              key={p.id}
                              product={p}
                              stock={getProductStock(p.id, selectedBranch)}
                              formatINR={formatINR}
                              isOwner={isOwner}
                              onEdit={() => setEditModalProduct(p)}
                              onAddStock={() => setAddStockModalProduct(p)}
                              onAdjustStock={() => setAdjustStockModalProduct(p)}
                              onTransferStock={() => setTransferStockModalProduct(p)}
                              onBreakdown={() => setBreakdownProduct(p)}
                              onDelete={() => setDeleteConfirmProduct(p)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SUB-CATEGORY 2: 🥫 WET PRODUCTS */}
                    {group.wetProducts.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-cyan-200">
                          <div className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center text-xs font-bold">
                            🥫
                          </div>
                          <h3 className="text-sm font-bold text-cyan-950 font-['Fredoka',sans-serif]">
                            Wet Products ({group.wetProducts.length})
                          </h3>
                          <span className="text-[11px] text-cyan-700">
                            — Gravy Pouches, Canned Tins, Jellied Loaf, Pâté & Stews
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {group.wetProducts.map((p) => (
                            <ProductCardItem
                              key={p.id}
                              product={p}
                              stock={getProductStock(p.id, selectedBranch)}
                              formatINR={formatINR}
                              isOwner={isOwner}
                              onEdit={() => setEditModalProduct(p)}
                              onAddStock={() => setAddStockModalProduct(p)}
                              onAdjustStock={() => setAdjustStockModalProduct(p)}
                              onTransferStock={() => setTransferStockModalProduct(p)}
                              onBreakdown={() => setBreakdownProduct(p)}
                              onDelete={() => setDeleteConfirmProduct(p)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SUB-CATEGORY 3: 📦 OTHER SUPPLIES */}
                    {group.otherProducts.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
                          <div className="w-6 h-6 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center text-xs font-bold">
                            📦
                          </div>
                          <h3 className="text-sm font-bold text-[#264653] font-['Fredoka',sans-serif]">
                            Accessories & Care Supplies ({group.otherProducts.length})
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          {group.otherProducts.map((p) => (
                            <ProductCardItem
                              key={p.id}
                              product={p}
                              stock={getProductStock(p.id, selectedBranch)}
                              formatINR={formatINR}
                              isOwner={isOwner}
                              onEdit={() => setEditModalProduct(p)}
                              onAddStock={() => setAddStockModalProduct(p)}
                              onAdjustStock={() => setAdjustStockModalProduct(p)}
                              onTransferStock={() => setTransferStockModalProduct(p)}
                              onBreakdown={() => setBreakdownProduct(p)}
                              onDelete={() => setDeleteConfirmProduct(p)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === 'table' ? (
        /* MASTER TABLE VIEW */
        <div className="rounded-3xl bg-white border border-[#EADDCE] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#5B7065] font-extrabold uppercase text-[10px] tracking-wider border-b border-[#F2ECE4]">
                <tr>
                  <th className="py-3 px-4">Product / Item</th>
                  <th className="py-3 px-4">Company & Brand</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">SKU & Barcode</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">Stock</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE4]">
                {filteredProducts.map((p) => {
                  const stock = getProductStock(p.id, selectedBranch);
                  const isOutOfStock = stock <= 0;
                  const isLowStock = stock > 0 && stock <= p.reorderLevel;

                  return (
                    <tr key={p.id} className="hover:bg-[#FAF8F5] transition-colors">
                      {/* Avatar & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <ProductImageThumb
                            src={getProductImageUrl(p)}
                            alt={p.name}
                            brand={p.brand || p.company}
                            company={p.company || p.brand}
                            avatarType={p.avatarType}
                            productForm={p.productForm}
                            size="sm"
                          />
                          <div>
                            <span className="font-bold text-[#264653] line-clamp-1">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-[#7C9082]">
                              {p.category} • {p.unit}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Company & Brand */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#264653]">
                          {p.company || p.brand}
                        </div>
                        {p.company && p.brand && p.company !== p.brand && (
                          <div className="text-[10px] text-[#7C9082]">{p.brand}</div>
                        )}
                      </td>

                      {/* Dried or Wet Classification */}
                      <td className="py-3 px-4">
                        <ProductFormBadge form={p.productForm} size="sm" />
                      </td>

                      {/* SKU & Barcode */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="font-bold text-[#264653]">{p.sku}</div>
                        <div className="text-[10px] text-[#7C9082]">{p.barcode}</div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-bold text-[#264653]">
                        {formatINR(p.sellingPrice)}
                        <span className="block text-[9px] text-[#7C9082]">MRP: {formatINR(p.mrp)}</span>
                      </td>

                      {/* Stock Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            isOutOfStock
                              ? 'bg-red-100 text-red-700'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {stock} in stock
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isOwner && (
                            <button
                              onClick={() => setEditModalProduct(p)}
                              className="p-1.5 rounded-lg text-[#5B7065] hover:bg-[#F2ECE4] hover:text-[#264653] transition-colors"
                              title="Edit Image, Company & Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setAddStockModalProduct(p)}
                            className="p-1.5 rounded-lg text-[#E76F51] hover:bg-[#FAF1E8] transition-colors"
                            title="Add / Inward Stock"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTransferStockModalProduct(p)}
                            className="p-1.5 rounded-lg text-[#2A9D8F] hover:bg-[#EDF7F6] transition-colors"
                            title="Transfer Stock"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setBreakdownProduct(p)}
                            className="p-1.5 rounded-lg text-[#264653] hover:bg-[#F2ECE4] transition-colors"
                            title="6-Branch Breakdown"
                          >
                            <Building2 className="w-3.5 h-3.5" />
                          </button>
                          {isOwner && onDeleteProduct && (
                            <button
                              onClick={() => setDeleteConfirmProduct(p)}
                              className="p-1.5 rounded-lg text-[#7C9082] hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Delete item from inventory"
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
        </div>
      ) : (
        /* VISUAL CARDS GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => (
            <ProductCardItem
              key={p.id}
              product={p}
              stock={getProductStock(p.id, selectedBranch)}
              formatINR={formatINR}
              isOwner={isOwner}
              onEdit={() => setEditModalProduct(p)}
              onAddStock={() => setAddStockModalProduct(p)}
              onAdjustStock={() => setAdjustStockModalProduct(p)}
              onTransferStock={() => setTransferStockModalProduct(p)}
              onBreakdown={() => setBreakdownProduct(p)}
              onDelete={() => setDeleteConfirmProduct(p)}
            />
          ))}
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      <EditProductModal
        isOpen={Boolean(editModalProduct)}
        onClose={() => setEditModalProduct(null)}
        product={editModalProduct}
        existingCompanies={existingCompanies}
        categories={categories}
        onDelete={(pId) => {
          const prod = products.find((p) => p.id === pId) || editModalProduct;
          if (prod) {
            setDeleteConfirmProduct(prod);
          }
        }}
        onSave={async (productId, updates) => {
          if (onUpdateProduct) {
            await onUpdateProduct(productId, updates);
            setFeedbackMsg('Product details and image updated successfully!');
            setTimeout(() => setFeedbackMsg(''), 3000);
          }
        }}
      />

      {/* ADD / REGISTER PRODUCT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-white rounded-3xl max-w-2xl w-full border border-[#EADDCE] shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-[#F2ECE4] flex items-center justify-between bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#E76F51]/10 text-[#E76F51] flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#264653] font-['Fredoka',sans-serif]">
                    Register New Product
                  </h3>
                  <p className="text-[11px] text-[#7C9082]">
                    Add product with image, company, and dried/wet classification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#7C9082]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateProductSubmit}
              className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs"
            >
              {/* Company & Form Classification Box */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-[#264653] uppercase text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-[#E76F51]" />
                  <span>Company Categorization & Food Form</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold mb-1">Company / Manufacturer *</label>
                    <input
                      type="text"
                      list="add-companies"
                      value={newProdCompany}
                      onChange={(e) => setNewProdCompany(e.target.value)}
                      placeholder="e.g. Royal Canin, Pedigree (Mars)"
                      required
                      className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                    />
                    <datalist id="add-companies">
                      {existingCompanies.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Brand Name *</label>
                    <input
                      type="text"
                      name="brand"
                      required
                      defaultValue={newProdCompany}
                      placeholder="e.g. Royal Canin"
                      className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">Product Form (Under Company) *</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewProdForm('DRIED')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        newProdForm === 'DRIED'
                          ? 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-400'
                          : 'border-[#D5C7B8] bg-white hover:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">🌾</span>
                        {newProdForm === 'DRIED' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                      </div>
                      <span className="font-bold text-[#264653]">Dried Product</span>
                      <span className="text-[9px] text-[#7C9082]">Kibble, Dry Food, Pellets</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewProdForm('WET')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        newProdForm === 'WET'
                          ? 'border-cyan-500 bg-cyan-50/90 ring-2 ring-cyan-400'
                          : 'border-[#D5C7B8] bg-white hover:border-cyan-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">🥫</span>
                        {newProdForm === 'WET' && <Check className="w-3.5 h-3.5 text-cyan-600" />}
                      </div>
                      <span className="font-bold text-[#264653]">Wet Product</span>
                      <span className="text-[9px] text-[#7C9082]">Gravy, Pouch, Loaf, Can</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewProdForm('OTHER')}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        newProdForm === 'OTHER'
                          ? 'border-stone-500 bg-stone-100 ring-2 ring-stone-400'
                          : 'border-[#D5C7B8] bg-white hover:border-stone-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">📦</span>
                        {newProdForm === 'OTHER' && <Check className="w-3.5 h-3.5 text-stone-700" />}
                      </div>
                      <span className="font-bold text-[#264653]">Other / Supplies</span>
                      <span className="text-[9px] text-[#7C9082]">Accessories, Toys</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">Product Title *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Royal Canin Maxi Adult Dog Food 15kg"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Category *</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Unit of Measurement *</label>
                  <input
                    type="text"
                    name="unit"
                    defaultValue="packet"
                    placeholder="e.g. 15kg, 85g pouch, can"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    name="sellingPrice"
                    step="0.01"
                    required
                    placeholder="e.g. 1599"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">MRP (₹) *</label>
                  <input
                    type="number"
                    name="mrp"
                    step="0.01"
                    required
                    placeholder="e.g. 1750"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Animal Avatar & Reorder */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Pet Representation</label>
                  <select
                    value={newProdAvatar}
                    onChange={(e) => setNewProdAvatar(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  >
                    <option value="dog">🐶 Dog</option>
                    <option value="cat">🐱 Cat</option>
                    <option value="bird">🦜 Bird</option>
                    <option value="fish">🐠 Fish</option>
                    <option value="rabbit">🐰 Rabbit</option>
                    <option value="hamster">🐹 Hamster</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Target Reorder Level</label>
                  <input
                    type="number"
                    name="reorderLevel"
                    defaultValue="10"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-[#7C9082] hover:bg-[#F2ECE4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl font-bold bg-[#E76F51] hover:bg-[#D95D3E] text-white shadow-xs"
                >
                  {actionLoading ? 'Saving...' : 'Save to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / INWARD STOCK MODAL */}
      {addStockModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#EADDCE] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#264653] font-['Fredoka',sans-serif]">
                  Inward Stock (Purchase Entry)
                </h3>
                <p className="text-xs text-[#7C9082]">{addStockModalProduct.name}</p>
              </div>
              <button
                onClick={() => setAddStockModalProduct(null)}
                className="p-1 rounded-full hover:bg-black/5 text-[#7C9082]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-[#264653]">Destination Branch</label>
                <select
                  name="branchId"
                  defaultValue={selectedBranch === 'ALL' ? branches[0]?.id : selectedBranch}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="w-full">
                  <label className="block font-bold mb-1 text-[#264653]">Quantity Received</label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    required
                    placeholder="e.g. 20"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>
                <input
                  type="hidden"
                  name="purchasePrice"
                  defaultValue={addStockModalProduct.purchasePrice || 0}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#264653]">Supplier / Vendor</label>
                <input
                  type="text"
                  name="supplierName"
                  defaultValue={addStockModalProduct.supplierName || 'Official Distributor'}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#264653]">Invoice / Bill Ref #</label>
                <input
                  type="text"
                  name="purchaseBillNumber"
                  placeholder="e.g. INV-2026-098"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#264653]">Audit Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Optional inward notes..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  onClick={() => setAddStockModalProduct(null)}
                  className="px-4 py-2 rounded-xl font-bold text-[#7C9082] hover:bg-[#F2ECE4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl font-bold bg-[#E76F51] hover:bg-[#D95D3E] text-white shadow-xs"
                >
                  {actionLoading ? 'Recording...' : 'Confirm Inward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {adjustStockModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#EADDCE] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#264653] font-['Fredoka',sans-serif]">
                  Manual Stock Adjustment
                </h3>
                <p className="text-xs text-[#7C9082]">{adjustStockModalProduct.name}</p>
              </div>
              <button
                onClick={() => setAdjustStockModalProduct(null)}
                className="p-1 rounded-full hover:bg-black/5 text-[#7C9082]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-[#264653]">Branch Location</label>
                <select
                  name="branchId"
                  defaultValue={selectedBranch === 'ALL' ? branches[0]?.id : selectedBranch}
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#264653]">New Verified Physical Count</label>
                <input
                  type="number"
                  name="newQuantity"
                  min="0"
                  required
                  placeholder="e.g. 15"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#264653]">Reason for Variance</label>
                <select
                  name="reason"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                >
                  <option value="Physical Audit Count">Physical Audit Count</option>
                  <option value="Damaged Stock Write-off">Damaged Stock Write-off</option>
                  <option value="Expired Product">Expired Product</option>
                  <option value="Sample / Tester Demonstration">Sample / Tester</option>
                  <option value="Theft or Shrinkage">Theft / Shrinkage</option>
                  <option value="Correction of Entry Error">Data Entry Correction</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  onClick={() => setAdjustStockModalProduct(null)}
                  className="px-4 py-2 rounded-xl font-bold text-[#7C9082] hover:bg-[#F2ECE4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl font-bold bg-[#E76F51] hover:bg-[#D95D3E] text-white shadow-xs"
                >
                  {actionLoading ? 'Updating...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER STOCK MODAL */}
      {transferStockModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#EADDCE] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-[#264653] font-['Fredoka',sans-serif]">
                  Inter-Branch Stock Transfer
                </h3>
                <p className="text-xs text-[#7C9082]">{transferStockModalProduct.name}</p>
              </div>
              <button
                onClick={() => setTransferStockModalProduct(null)}
                className="p-1 rounded-full hover:bg-black/5 text-[#7C9082]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferStockSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-[#264653]">From Branch</label>
                  <select
                    name="fromBranchId"
                    defaultValue={branches[0]?.id}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-[#264653]">To Branch</label>
                  <select
                    name="toBranchId"
                    defaultValue={branches[1]?.id}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#264653]">Transfer Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  required
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#264653]">Transfer Purpose</label>
                <input
                  type="text"
                  name="reason"
                  placeholder="e.g. Evening peak replenishment"
                  defaultValue="Rebalance branch inventory levels"
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  onClick={() => setTransferStockModalProduct(null)}
                  className="px-4 py-2 rounded-xl font-bold text-[#7C9082] hover:bg-[#F2ECE4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl font-bold bg-[#E76F51] hover:bg-[#D95D3E] text-white shadow-xs"
                >
                  {actionLoading ? 'Dispatching...' : 'Dispatch Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6-BRANCH DISTRIBUTION BREAKDOWN MODAL */}
      {breakdownProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#EADDCE] shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <ProductImageThumb
                  src={getProductImageUrl(breakdownProduct)}
                  alt={breakdownProduct.name}
                  avatarType={breakdownProduct.avatarType}
                  productForm={breakdownProduct.productForm}
                  size="sm"
                />
                <div>
                  <h3 className="font-bold text-base text-[#264653] font-['Fredoka',sans-serif]">
                    6-Branch Distribution
                  </h3>
                  <p className="text-xs text-[#7C9082]">{breakdownProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setBreakdownProduct(null)}
                className="p-1 rounded-full hover:bg-black/5 text-[#7C9082]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] flex items-center justify-between text-xs">
              <div>
                <span className="text-[#7C9082]">Company: </span>
                <span className="font-bold text-[#264653]">
                  {breakdownProduct.company || breakdownProduct.brand}
                </span>
              </div>
              <ProductFormBadge form={breakdownProduct.productForm} size="sm" />
            </div>

            <div className="divide-y divide-[#F2ECE4] border border-[#EADDCE] rounded-2xl overflow-hidden">
              {getProductStockBreakdown(breakdownProduct.id).map((b) => (
                <div
                  key={b.branch.id}
                  className="flex items-center justify-between p-3 text-xs hover:bg-[#FAF8F5] transition-colors"
                >
                  <div>
                    <div className="font-bold text-[#264653]">{b.branch.name}</div>
                    <div className="text-[10px] text-[#7C9082]">{b.branch.address}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                        b.quantity <= 0
                          ? 'bg-red-100 text-red-700'
                          : b.quantity <= breakdownProduct.reorderLevel
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {b.quantity} in stock
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE4] text-xs">
              <span className="font-bold text-[#7C9082]">Total Consolidated Stock</span>
              <span className="font-extrabold text-[#264653] text-sm">
                {getProductStock(breakdownProduct.id, 'ALL')} units
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setBreakdownProduct(null)}
                className="px-4 py-1.5 rounded-xl font-bold text-xs bg-[#264653] text-white hover:bg-[#1e3742]"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD INVENTORY FROM SUPPLIER INVOICE (STOCK MANAGER DEDICATED MODAL) */}
      <AddInventoryModal
        isOpen={showAddInventoryModal}
        onClose={() => setShowAddInventoryModal(false)}
        products={products}
        branches={branches}
        suppliers={suppliers}
        currentBranchId={selectedBranch === 'ALL' ? (branches[0]?.id || 'branch-1') : selectedBranch}
        onStockInward={async (data) => {
          try {
            const inwardFn = onStockInward || onAddStock;
            if (inwardFn) {
              await inwardFn(data);
              setFeedbackMsg(`Stock inward successful!`);
              setTimeout(() => setFeedbackMsg(''), 3000);
              return { success: true };
            }
            return { success: false, message: 'Stock inward handler not available' };
          } catch (err: any) {
            return { success: false, message: err.message || 'Failed to inward stock' };
          }
        }}
        onCreateProductAndStock={async (productData) => {
          try {
            if (onCreateProduct) {
              await onCreateProduct(productData);
              setFeedbackMsg(`Product created and stock added!`);
              setTimeout(() => setFeedbackMsg(''), 3000);
              return { success: true };
            }
            return { success: false, message: 'Create product handler not available' };
          } catch (err: any) {
            return { success: false, message: err.message || 'Failed to create product' };
          }
        }}
        onBulkImportCsv={async (items, branchId) => {
          try {
            if (onBulkImportCsv) {
              const res = await onBulkImportCsv(items, branchId);
              setFeedbackMsg(`Bulk import completed successfully!`);
              setTimeout(() => setFeedbackMsg(''), 3000);
              return { success: true, message: res?.message };
            }
            return { success: false, message: 'Bulk import handler not configured' };
          } catch (err: any) {
            return { success: false, message: err.message || 'Import error' };
          }
        }}
      />

      {/* QUICK BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        isOpen={showQuickScanner}
        onClose={() => setShowQuickScanner(false)}
        continuous={false}
        title="Scan Barcode to Filter Inventory"
        subtitle="Point camera or enter product barcode to locate in stock"
        demoBarcodes={products.filter((p) => Boolean(p.barcode)).slice(0, 8).map((p) => ({ barcode: p.barcode, name: p.name }))}
        onScan={(scanned) => {
          // Reset restrictive filters so the scanned item is not hidden
          setSelectedCompany('ALL');
          setSelectedCategory('ALL');
          setSelectedProductForm('ALL');
          setSelectedStockStatus('ALL');
          setSearchQuery(scanned);
          setShowQuickScanner(false);

          // Normalize and check if product exists in catalog
          const cleanNorm = scanned.replace(/[-\s]/g, '').toLowerCase();
          const found = products.find((p) => {
            const pb = (p.barcode || '').trim().toLowerCase();
            const pbNorm = pb.replace(/[-\s]/g, '');
            const skuNorm = (p.sku || '').trim().toLowerCase().replace(/[-\s]/g, '');
            return (
              pb === cleanNorm ||
              pbNorm === cleanNorm ||
              skuNorm === cleanNorm ||
              (pbNorm.length === 12 && cleanNorm === '0' + pbNorm) ||
              (cleanNorm.length === 12 && pbNorm === '0' + cleanNorm)
            );
          });

          if (found) {
            const companyKey = found.company || found.brand || 'General';
            setCollapsedCompanies((prev) => ({ ...prev, [companyKey]: false }));
            setFeedbackMsg(`✅ Found: "${found.name}" (Barcode: ${scanned})`);
          } else {
            setFeedbackMsg(`🔍 Filtered by barcode: "${scanned}". (No exact match in catalog)`);
          }
          setTimeout(() => setFeedbackMsg(''), 4500);
        }}
      />

      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-white rounded-3xl max-w-md w-full border border-rose-200 shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#264653] font-['Fredoka',sans-serif]">
                    Delete Inventory Item
                  </h3>
                  <p className="text-xs text-[#7C9082]">
                    Permanently remove product & stock records
                  </p>
                </div>
              </div>
              <button
                disabled={isDeleting}
                onClick={() => setDeleteConfirmProduct(null)}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#7C9082] disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Summary Card */}
            <div className="bg-[#FAF8F5] rounded-2xl p-3.5 border border-[#EADDCE] flex items-center gap-3 mb-4">
              <ProductImageThumb
                src={getProductImageUrl(deleteConfirmProduct)}
                alt={deleteConfirmProduct.name}
                brand={deleteConfirmProduct.brand || deleteConfirmProduct.company}
                company={deleteConfirmProduct.company || deleteConfirmProduct.brand}
                avatarType={deleteConfirmProduct.avatarType}
                productForm={deleteConfirmProduct.productForm}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold text-[#E76F51] uppercase">
                    {deleteConfirmProduct.company || deleteConfirmProduct.brand}
                  </span>
                  <ProductFormBadge form={deleteConfirmProduct.productForm} size="sm" />
                </div>
                <h4 className="font-bold text-xs text-[#264653] truncate" title={deleteConfirmProduct.name}>
                  {deleteConfirmProduct.name}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-[#7C9082] mt-0.5">
                  <span>SKU: {deleteConfirmProduct.sku}</span>
                  {deleteConfirmProduct.barcode && <span>• Barcode: {deleteConfirmProduct.barcode}</span>}
                </div>
              </div>
            </div>

            {/* Stock Impact Warning */}
            {(() => {
              const totalStock = inventory
                .filter((inv) => inv.productId === deleteConfirmProduct.id)
                .reduce((sum, inv) => sum + (inv.quantity || 0), 0);
              return (
                <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 mb-5 text-xs text-rose-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-800">Warning: Irreversible Deletion</p>
                      <p className="text-[11px] text-rose-700 mt-1">
                        This item currently has <strong className="font-bold">{totalStock} units</strong> logged across branch inventories. Deleting will permanently erase this product from all sales counters, catalog listings, and branch stocks.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-[#7C9082] hover:bg-[#F2ECE4] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {showCreateCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative bg-white rounded-3xl max-w-md w-full border border-[#EADDCE] shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/10 border border-[#5A5A40]/20 flex items-center justify-center text-[#5A5A40] shrink-0">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#264653] font-['Fredoka',sans-serif]">
                    Create Category
                  </h3>
                  <p className="text-xs text-[#7C9082]">
                    Add a new product classification to catalog
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isCreatingCategory}
                onClick={() => setShowCreateCategoryModal(false)}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#7C9082] disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#264653] mb-1.5">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={50}
                  value={newCategoryInput}
                  onChange={(e) => {
                    setNewCategoryInput(e.target.value);
                    setCategoryCreateError('');
                  }}
                  placeholder="e.g. Dental Chews, Bird Cages, Aquarium Filters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C7B8] bg-white text-sm font-semibold text-[#264653] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                />
                {categoryCreateError && (
                  <p className="text-rose-600 text-xs font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{categoryCreateError}</span>
                  </p>
                )}
              </div>

              {/* Quick Idea Chips */}
              <div>
                <span className="block text-[11px] font-bold text-[#7C9082] mb-1.5">
                  Popular Suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Cat Litter',
                    'Dental Care',
                    'Bird Cages',
                    'Aquarium Filters',
                    'Supplements & Care',
                    'Puppy Training',
                    'Small Animal Care',
                  ]
                    .filter((idea) => !categories.some((c) => c.toLowerCase() === idea.toLowerCase()))
                    .slice(0, 5)
                    .map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => {
                          setNewCategoryInput(idea);
                          setCategoryCreateError('');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F2ECE4] border border-[#EADDCE] text-[#5A5A40] text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        + {idea}
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  disabled={isCreatingCategory}
                  onClick={() => setShowCreateCategoryModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-[#7C9082] hover:bg-[#F2ECE4] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCategory || !newCategoryInput.trim()}
                  className="px-5 py-2.5 rounded-xl font-bold bg-[#5A5A40] hover:bg-[#464632] text-white shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingCategory ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Create Category</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CATEGORY MODAL */}
      {showDeleteCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative bg-white rounded-3xl max-w-lg w-full border border-rose-200 shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#264653] font-['Fredoka',sans-serif]">
                    Delete Category
                  </h3>
                  <p className="text-xs text-[#7C9082]">
                    Safely remove category with automatic product reassignment
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeletingCategory}
                onClick={() => setShowDeleteCategoryModal(false)}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#7C9082] disabled:opacity-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDeleteCategorySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#264653] mb-1.5">
                  Select Category to Delete <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoryToDelete}
                  onChange={(e) => {
                    setCategoryToDelete(e.target.value);
                    setCategoryDeleteError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C7B8] bg-white text-sm font-semibold text-[#264653] focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                >
                  {categories
                    .filter((c) => c.toLowerCase() !== 'other')
                    .map((c) => (
                      <option key={c} value={c}>
                        {c} ({categoryProductCounts[c] || 0} products)
                      </option>
                    ))}
                </select>
              </div>

              {/* Impact Notice */}
              {(() => {
                const count = categoryProductCounts[categoryToDelete] || 0;
                return (
                  <div className={`p-3.5 rounded-2xl border text-xs ${
                    count > 0 ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                  }`}>
                    <div className="flex items-start gap-2">
                      {count > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold">
                          {count > 0
                            ? `${count} Product${count > 1 ? 's' : ''} in "${categoryToDelete}"`
                            : `No products currently in "${categoryToDelete}"`}
                        </p>
                        <p className="text-[11px] mt-0.5 opacity-90">
                          {count > 0
                            ? `To preserve your stock ledger and inventory history, all ${count} item${count > 1 ? 's' : ''} will be moved to the fallback category below before this category is removed.`
                            : 'This category is empty and can be safely deleted immediately with no product reassignments.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Fallback category selection (if products exist) */}
              {(categoryProductCounts[categoryToDelete] || 0) > 0 && (
                <div>
                  <label className="block font-bold text-[#264653] mb-1.5">
                    Reassign Products To:
                  </label>
                  <select
                    value={deleteFallbackCategory}
                    onChange={(e) => setDeleteFallbackCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-semibold text-[#264653] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  >
                    {categories
                      .filter((c) => c.toLowerCase() !== categoryToDelete.toLowerCase())
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {categoryDeleteError && (
                <p className="text-rose-600 text-xs font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{categoryDeleteError}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F2ECE4]">
                <button
                  type="button"
                  disabled={isDeletingCategory}
                  onClick={() => setShowDeleteCategoryModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-[#7C9082] hover:bg-[#F2ECE4] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingCategory || !categoryToDelete}
                  className="px-5 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isDeletingCategory ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Category</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Product Card Component used in Hierarchy View and Grid View
interface ProductCardItemProps {
  product: Product;
  stock: number;
  formatINR: (val?: number | null) => string;
  isOwner: boolean;
  onEdit: () => void;
  onAddStock: () => void;
  onAdjustStock: () => void;
  onTransferStock: () => void;
  onBreakdown: () => void;
  onDelete?: () => void;
}

const ProductCardItem: React.FC<ProductCardItemProps> = ({
  product,
  stock,
  formatINR,
  isOwner,
  onEdit,
  onAddStock,
  onAdjustStock,
  onTransferStock,
  onBreakdown,
  onDelete,
}) => {
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= product.reorderLevel;

  return (
    <div className="group rounded-2xl bg-white border border-[#EADDCE] p-3.5 hover:border-[#E76F51] hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Top bar with Avatar, Brand & Stock Status */}
        <div className="flex items-start gap-3 mb-2.5">
          <ProductImageThumb
            src={getProductImageUrl(product)}
            alt={product.name}
            brand={product.brand || product.company}
            company={product.company || product.brand}
            avatarType={product.avatarType}
            productForm={product.productForm}
            size="md"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-bold text-[#E76F51] uppercase tracking-wider truncate">
                {product.brand || product.company}
              </span>
              <span
                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                  isOutOfStock
                    ? 'bg-red-100 text-red-700'
                    : isLowStock
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {stock} in stock
              </span>
            </div>

            <h4
              className="font-bold text-xs text-[#264653] leading-snug line-clamp-2"
              title={product.name}
            >
              {product.name}
            </h4>

            <div className="flex items-center gap-1.5 mt-1">
              <ProductFormBadge form={product.productForm} size="sm" />
              <span className="text-[10px] text-[#7C9082]">• {product.unit}</span>
            </div>
          </div>
        </div>

        {/* Pricing & Barcode */}
        <div className="pt-2 border-t border-[#F2ECE4] flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-[#7C9082] block">Retail Price</span>
            <span className="font-extrabold text-[#264653]">
              {formatINR(product.sellingPrice)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#7C9082] block">MRP: {formatINR(product.mrp)}</span>
            <span className="text-[10px] font-mono text-[#7C9082]">{product.sku}</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="mt-3 pt-2 border-t border-[#F2ECE4] flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          {isOwner && (
            <button
              onClick={onEdit}
              className="px-2 py-1 rounded-lg bg-[#FAF8F5] hover:bg-[#F2ECE4] text-[#5B7065] text-[11px] font-bold flex items-center gap-1 transition-colors"
              title="Edit image, company, dried/wet status, prices"
            >
              <Edit2 className="w-3 h-3 text-[#E76F51]" />
              <span>Edit</span>
            </button>
          )}

          <button
            onClick={onBreakdown}
            className="p-1.5 rounded-lg text-[#7C9082] hover:bg-[#F2ECE4] hover:text-[#264653] transition-colors"
            title="View 6-branch stock allocation"
          >
            <Building2 className="w-3.5 h-3.5" />
          </button>

          {isOwner && onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-[#7C9082] hover:bg-rose-50 hover:text-rose-600 transition-colors"
              title="Delete item from inventory"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onAddStock}
            className="px-2 py-1 rounded-lg bg-[#FAF1E8] hover:bg-[#E76F51] hover:text-white text-[#E76F51] text-[11px] font-bold flex items-center gap-0.5 transition-colors"
            title="Inward / Add Stock"
          >
            <Plus className="w-3 h-3" />
            <span>Inward</span>
          </button>
          <button
            onClick={onTransferStock}
            className="p-1.5 rounded-lg text-[#2A9D8F] hover:bg-[#EDF7F6] transition-colors"
            title="Transfer to branch"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
