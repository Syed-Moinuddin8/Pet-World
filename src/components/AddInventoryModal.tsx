import React, { useState, useEffect } from 'react';
import {
  X,
  Camera,
  Search,
  Plus,
  Package,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  Building2,
  DollarSign,
  Calendar,
  Hash,
  Truck,
  Sparkles,
  Info,
  LayoutGrid,
  Image as ImageIcon
} from 'lucide-react';
import { Product, Branch, Supplier, AnimalType, LifeStageType, ProductForm } from '../types';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PetAvatar } from './PetAvatars';
import { ProductImageThumb, ProductFormBadge } from './ProductImageThumb';
import { StockMenuModal } from './StockMenuModal';
import { ImageUploadPicker } from './ImageUploadPicker';
import { getProductImageUrl } from '../utils/productImages';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  branches: Branch[];
  suppliers: Supplier[];
  currentBranchId: string;
  onStockInward: (data: {
    productId?: string;
    barcode?: string;
    branchId: string;
    quantity: number;
    purchasePrice?: number;
    sellingPrice?: number;
    supplierName?: string;
    purchaseBillNumber?: string;
    batchNumber?: string;
    expiryDate?: string;
    notes?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  onCreateProductAndStock?: (productData: any) => Promise<{ success: boolean; message?: string }>;
  onBulkImportCsv?: (items: any[], branchId: string) => Promise<{ success: boolean; message?: string; count?: number }>;
}

export const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  isOpen,
  onClose,
  products,
  branches,
  suppliers,
  currentBranchId,
  onStockInward,
  onCreateProductAndStock,
  onBulkImportCsv,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [selectedBranchId, setSelectedBranchId] = useState(currentBranchId);

  // Search & lookup state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Inward Stock details state
  const [quantityReceived, setQuantityReceived] = useState<number | ''>('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  // New Product creation state (if barcode not found)
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newAnimal, setNewAnimal] = useState<AnimalType>('Dog');
  const [newLifeStage, setNewLifeStage] = useState<LifeStageType>('Adult');
  const [newProductForm, setNewProductForm] = useState<ProductForm>('DRIED');
  const [newSize, setNewSize] = useState('');
  const [newCategory, setNewCategory] = useState<'Dog Food' | 'Cat Food' | 'Accessories' | 'Health & Grooming'>('Dog Food');
  const [newProductImageUrl, setNewProductImageUrl] = useState('');

  // Stock Menu Visual Modal
  const [isStockMenuOpen, setIsStockMenuOpen] = useState(false);

  // CSV Bulk import state
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedBranchId(currentBranchId);
      resetSingleForm();
      setStatusMessage(null);
    }
  }, [isOpen, currentBranchId]);

  const resetSingleForm = () => {
    setBarcodeInput('');
    setMatchedProduct(null);
    setHasSearched(false);
    setIsCreatingNew(false);
    setQuantityReceived('');
    setPurchasePrice('');
    setSellingPrice('');
    setSupplierName('');
    setNewProductImageUrl('');
    setInvoiceNumber('');
    setBatchNumber('');
    setExpiryDate('');
    setNotes('');
    setNewProductName('');
    setNewCompany('');
    setNewAnimal('Dog');
    setNewLifeStage('Adult');
    setNewProductForm('DRIED');
    setNewSize('');
  };

  // Lookup product when barcode or input changes
  const handleLookupBarcode = (codeToLookup: string) => {
    const clean = codeToLookup.trim();
    if (!clean) {
      setMatchedProduct(null);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    const cleanNorm = clean.replace(/[-\s]/g, '').toLowerCase();

    const found = products.find((p) => {
      const pb = (p.barcode || '').trim().toLowerCase();
      const psku = (p.sku || '').trim().toLowerCase();
      const pbNorm = pb.replace(/[-\s]/g, '');
      const pskuNorm = psku.replace(/[-\s]/g, '');
      const name = p.name.trim().toLowerCase();

      return (
        pb === clean.toLowerCase() ||
        psku === clean.toLowerCase() ||
        pbNorm === cleanNorm ||
        pskuNorm === cleanNorm ||
        name === clean.toLowerCase() ||
        (pbNorm.length === 12 && cleanNorm === '0' + pbNorm) ||
        (cleanNorm.length === 12 && pbNorm === '0' + cleanNorm)
      );
    });

    if (found) {
      setMatchedProduct(found);
      setIsCreatingNew(false);
      setBarcodeInput(found.barcode || clean);
      setPurchasePrice(found.purchasePrice || found.costPrice || 0);
      setSellingPrice(found.sellingPrice || 0);
      setSupplierName(found.supplierName || (suppliers[0]?.name || ''));
      if (found.batchNumber) setBatchNumber(found.batchNumber);
      if (found.expiryDate) setExpiryDate(found.expiryDate);
    } else {
      setMatchedProduct(null);
      // Auto suggest new product creation
      setIsCreatingNew(true);
      setBarcodeInput(clean);
      setPurchasePrice('');
      setSellingPrice('');
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookupBarcode(barcodeInput);
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    setBarcodeInput(scannedCode);
    handleLookupBarcode(scannedCode);
  };

  // Save stock inward for existing product
  const handleSaveInwardStock = async () => {
    if (!matchedProduct) return;
    const qty = Number(quantityReceived);
    if (!qty || qty <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid received quantity greater than 0.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await onStockInward({
        productId: matchedProduct.id,
        branchId: selectedBranchId,
        quantity: qty,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
        supplierName,
        purchaseBillNumber: invoiceNumber,
        batchNumber,
        expiryDate,
        notes,
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully added ${qty} units of "${matchedProduct.name}" to inventory!`,
        });
        setTimeout(() => {
          resetSingleForm();
        }, 1200);
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to update stock.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error updating stock.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Save brand new product + initial stock
  const handleSaveNewProductAndStock = async () => {
    const cleanBarcode = barcodeInput.trim();
    if (!cleanBarcode) {
      setStatusMessage({ type: 'error', text: 'Barcode is required.' });
      return;
    }
    if (!newProductName.trim()) {
      setStatusMessage({ type: 'error', text: 'Product name is required.' });
      return;
    }
    const qty = Number(quantityReceived) || 0;
    const cost = Number(purchasePrice) || 0;
    const sell = Number(sellingPrice) || Math.round(cost * 1.35) || 100;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const productPayload = {
        barcode: cleanBarcode,
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        name: newProductName.trim(),
        imageUrl: newProductImageUrl.trim() || undefined,
        category: newCategory,
        brand: newCompany.trim() || 'General',
        company: newCompany.trim() || 'General',
        productForm: newProductForm,
        animal: newAnimal,
        lifeStage: newLifeStage,
        size: newSize.trim() || 'Standard',
        unit: 'packet',
        purchasePrice: cost,
        costPrice: cost,
        sellingPrice: sell,
        mrp: sell > cost ? sell : cost * 1.2,
        taxPercent: 18,
        minStockLevel: 5,
        reorderLevel: 10,
        supplierId: suppliers[0]?.id || 'sup-001',
        supplierName: supplierName.trim() || suppliers[0]?.name || 'Supplier Invoice',
        avatarType: newAnimal === 'Cat' ? 'cat' : 'dog',
        status: 'ACTIVE',
        initialStock: qty,
        initialBranchId: selectedBranchId,
        batchNumber,
        expiryDate,
      };

      if (onCreateProductAndStock) {
        const res = await onCreateProductAndStock(productPayload);
        if (res.success) {
          setStatusMessage({
            type: 'success',
            text: `Product "${newProductName}" created and ${qty} units added to stock!`,
          });
          setTimeout(() => {
            resetSingleForm();
          }, 1500);
        } else {
          setStatusMessage({ type: 'error', text: res.message || 'Failed to create product.' });
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create product.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // CSV Parsing
  const handleParseCsv = (rawText: string) => {
    setCsvText(rawText);
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setCsvPreview([]);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const parsed: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < 2) continue;

      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] || '';
      });

      parsed.push({
        barcode: row.barcode || row['bar code'] || row.sku || parts[0],
        productName: row['product name'] || row.product || row.name || parts[1] || 'Imported Product',
        company: row.company || row.brand || parts[2] || '',
        animal: row.animal || 'Dog',
        type: row.type || row['product form'] || 'DRIED',
        age: row.age || row['life stage'] || 'Adult',
        size: row.size || '',
        purchasePrice: parseFloat(row['purchase price'] || row.cost || parts[3] || '0') || 0,
        sellingPrice: parseFloat(row['selling price'] || row.price || parts[4] || '0') || 0,
        quantity: parseInt(row.quantity || row.qty || parts[5] || '1', 10) || 1,
        supplierName: row.supplier || supplierName || 'Supplier Invoice',
        invoiceNumber: row['invoice number'] || row.invoice || invoiceNumber || '',
      });
    }

    setCsvPreview(parsed);
  };

  const handleBulkImportSubmit = async () => {
    if (csvPreview.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please provide valid CSV data with at least one product row.' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      if (onBulkImportCsv) {
        const res = await onBulkImportCsv(csvPreview, selectedBranchId);
        if (res.success) {
          setStatusMessage({
            type: 'success',
            text: res.message || `Successfully processed ${csvPreview.length} items into inventory!`,
          });
          setCsvText('');
          setCsvPreview([]);
        } else {
          setStatusMessage({ type: 'error', text: res.message || 'Import failed.' });
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error processing CSV import.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
        <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#EADDCE] flex flex-col max-h-[92vh] overflow-hidden my-auto">
          {/* Header */}
          <div className="p-5 sm:p-6 bg-[#FAF8F5] border-b border-[#F2ECE4] flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E76F51] text-white flex items-center justify-center shadow-md">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#264653] font-['Fredoka',sans-serif]">
                  Add Stock from Supplier Invoice
                </h2>
                <p className="text-xs text-[#7C9082]">
                  Scan or paste barcode to instantly inward received stock into branch inventory
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-[#7C9082] hover:bg-[#F2ECE4] hover:text-[#264653] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs (Single Inward vs Bulk Import) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 pt-3 pb-2.5 border-b border-[#F2ECE4] bg-white gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab('single')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap min-h-[40px] ${
                  activeTab === 'single'
                    ? 'bg-[#264653] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#7C9082] hover:text-[#264653]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Single Item Inward</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bulk')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap min-h-[40px] ${
                  activeTab === 'bulk'
                    ? 'bg-[#264653] text-white shadow-xs'
                    : 'bg-[#FAF8F5] text-[#7C9082] hover:text-[#264653]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bulk CSV / Invoice Upload</span>
              </button>
            </div>

            {/* Target Branch Selector */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7C9082]">
                <Building2 className="w-4 h-4 text-[#7C9082]" />
                <span>Receiving Branch:</span>
              </div>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs font-bold text-[#264653] focus:ring-2 focus:ring-[#E76F51]"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Alert Banner */}
          {statusMessage && (
            <div
              className={`px-6 py-3 border-b flex items-center gap-3 text-xs font-semibold ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Modal Content Area */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {activeTab === 'single' && (
              <>
                {/* STEP 1: Fast Barcode Search & Scan Bar */}
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#264653] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#E76F51] text-white flex items-center justify-center text-[10px]">1</span>
                      <span>Product Barcode / SKU from Supplier Invoice</span>
                    </label>
                    <span className="text-[11px] text-[#7C9082]">Press Enter to lookup</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7C9082]">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        autoFocus
                        value={barcodeInput}
                        onChange={(e) => {
                          setBarcodeInput(e.target.value);
                          if (!e.target.value) {
                            setMatchedProduct(null);
                            setHasSearched(false);
                          }
                        }}
                        placeholder="Scan with gun, paste barcode, or type product name..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#D5C7B8] bg-white text-sm font-semibold text-[#264653] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                      />
                    </form>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsStockMenuOpen(true)}
                        className="px-4 py-3 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A32] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                        title="Browse stock products with photos as same as menu"
                      >
                        <LayoutGrid className="w-4 h-4 text-[#F4A261]" />
                        <span>Stock Menu</span>
                        <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[9px] font-black uppercase">Photos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLookupBarcode(barcodeInput)}
                        disabled={!barcodeInput.trim()}
                        className="px-4 py-3 rounded-xl bg-[#264653] hover:bg-[#1E3741] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        Lookup
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="px-4 py-3 rounded-xl bg-[#E76F51] hover:bg-[#D65D3F] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                      >
                        <Camera className="w-4 h-4" />
                        <span>📷 Scan Barcode</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* STEP 2: Lookup Result: Existing Product Found OR Create New Product Form */}
                {matchedProduct && (
                  <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="cursor-pointer group relative"
                          title="Click to change product from stock menu"
                          onClick={() => setIsStockMenuOpen(true)}
                        >
                          <ProductImageThumb
                            src={getProductImageUrl(matchedProduct)}
                            alt={matchedProduct.name}
                            avatarType={matchedProduct.avatarType}
                            productForm={matchedProduct.productForm}
                            size="md"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                              Product Matched
                            </span>
                            <span className="text-xs font-mono font-semibold text-emerald-700">
                              Barcode: {matchedProduct.barcode}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsStockMenuOpen(true)}
                              className="text-[10px] text-[#264653] hover:text-[#E76F51] font-bold flex items-center gap-0.5 ml-1 underline cursor-pointer"
                            >
                              <LayoutGrid className="w-3 h-3 text-[#E76F51]" />
                              <span>Switch Product</span>
                            </button>
                          </div>
                          <h4 className="text-base font-bold text-[#264653] mt-0.5">
                            {matchedProduct.name}
                          </h4>
                          <p className="text-xs text-[#7C9082]">
                            Company: <span className="font-semibold text-[#264653]">{matchedProduct.company || matchedProduct.brand}</span>
                            {matchedProduct.size && ` • Size: ${matchedProduct.size}`}
                            {matchedProduct.animal && ` • Animal: ${matchedProduct.animal}`}
                          </p>
                        </div>
                      </div>

                      {/* Stock Math Card */}
                      <div className="text-right bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                        <span className="text-[10px] font-bold text-[#7C9082] uppercase tracking-wider block">
                          Current Stock
                        </span>
                        <span className="text-xl font-black text-[#264653]">
                          {matchedProduct.minStockLevel !== undefined ? 'Available' : ''}
                        </span>
                        {quantityReceived !== '' && Number(quantityReceived) > 0 && (
                          <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
                            + {quantityReceived} units incoming
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inward Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1.5 block">
                          Quantity Received <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={quantityReceived}
                          onChange={(e) => setQuantityReceived(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          placeholder="e.g. 24"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C7B8] bg-white text-sm font-bold text-[#264653] focus:ring-2 focus:ring-[#E76F51]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1.5 block">
                          Purchase Price (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#7C9082] text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={purchasePrice}
                            onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[#D5C7B8] bg-white text-xs font-bold text-[#264653] focus:ring-2 focus:ring-[#E76F51]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1.5 block">
                          Selling Price / MRP (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#7C9082] text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={sellingPrice}
                            onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                            className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-[#D5C7B8] bg-white text-xs font-bold text-[#264653] focus:ring-2 focus:ring-[#E76F51]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1.5 block">
                          Supplier / Distributor
                        </label>
                        <input
                          type="text"
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          placeholder="e.g. Royal Canin India"
                          className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7B8] bg-white text-xs font-medium text-[#264653] focus:ring-2 focus:ring-[#E76F51]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1.5 block">
                          Invoice / Bill Number
                        </label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          placeholder="e.g. INV-88291"
                          className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7B8] bg-white text-xs font-medium text-[#264653] focus:ring-2 focus:ring-[#E76F51]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1.5 block">
                          Batch Number (Optional)
                        </label>
                        <input
                          type="text"
                          value={batchNumber}
                          onChange={(e) => setBatchNumber(e.target.value)}
                          placeholder="e.g. BATCH-2026-A"
                          className="w-full px-3 py-2.5 rounded-xl border border-[#D5C7B8] bg-white text-xs font-medium text-[#264653] focus:ring-2 focus:ring-[#E76F51]"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={resetSingleForm}
                        className="px-4 py-2.5 rounded-xl border border-[#D5C7B8] text-xs font-bold text-[#7C9082] hover:bg-white transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveInwardStock}
                        disabled={isProcessing || !quantityReceived}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isProcessing ? 'Updating Stock...' : 'Add to Inventory'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* When Barcode Not Found -> Seamless Create New Product Flow */}
                {hasSearched && !matchedProduct && isCreatingNew && (
                  <div className="p-5 rounded-2xl bg-[#FAF8F5] border-2 border-amber-300 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-[#EADDCE]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#264653]">
                            Barcode <span className="font-mono text-[#E76F51] font-bold">"{barcodeInput}"</span> Not Found in Catalog
                          </h4>
                          <p className="text-xs text-[#7C9082]">
                            Fill in product details below. It will be saved to your catalog and stock added immediately.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-[#264653] mb-1 block">
                          Product Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newProductName}
                          onChange={(e) => setNewProductName(e.target.value)}
                          placeholder="e.g. Royal Canin Maxi Puppy Dry Food"
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-bold text-[#264653] focus:ring-2 focus:ring-[#E76F51]"
                        />
                      </div>

                      {/* Product Image for Easy Visual Identification */}
                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-[#E76F51]" />
                          <span>Product Image (For Easy Stock Selection)</span>
                        </label>
                        <ImageUploadPicker
                          value={newProductImageUrl}
                          onChange={(url) => setNewProductImageUrl(url)}
                          brandHint={newCompany}
                          formHint={newProductForm}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 block">
                          Company / Brand <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newCompany}
                          onChange={(e) => setNewCompany(e.target.value)}
                          placeholder="e.g. Royal Canin, Pedigree, Whiskas"
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-medium text-[#264653] focus:ring-2 focus:ring-[#E76F51]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 block">Animal</label>
                        <select
                          value={newAnimal}
                          onChange={(e) => {
                            const val = e.target.value as AnimalType;
                            setNewAnimal(val);
                            if (val === 'Dog') setNewCategory('Dog Food');
                            else if (val === 'Cat') setNewCategory('Cat Food');
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-semibold text-[#264653]"
                        >
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                          <option value="Bird">Bird</option>
                          <option value="Fish">Fish</option>
                          <option value="Small Pet">Small Pet</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 block">Type (Form)</label>
                        <select
                          value={newProductForm}
                          onChange={(e) => setNewProductForm(e.target.value as ProductForm)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-semibold text-[#264653]"
                        >
                          <option value="DRIED">DRIED (Kibble / Pellets)</option>
                          <option value="WET">WET (Gravy / Pouch / Can)</option>
                          <option value="OTHER">OTHER (Treats / Accessories)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 block">Life Stage / Age</label>
                        <select
                          value={newLifeStage}
                          onChange={(e) => setNewLifeStage(e.target.value as LifeStageType)}
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-semibold text-[#264653]"
                        >
                          <option value="Puppy">Puppy</option>
                          <option value="Kitten">Kitten</option>
                          <option value="Adult">Adult</option>
                          <option value="Senior">Senior</option>
                          <option value="All Life Stages">All Life Stages</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 block">Pack Size / Weight</label>
                        <input
                          type="text"
                          value={newSize}
                          onChange={(e) => setNewSize(e.target.value)}
                          placeholder="e.g. 1.2kg, 3kg, 10kg, 400g"
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-medium text-[#264653]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 block">
                          Quantity Received <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={quantityReceived}
                          onChange={(e) => setQuantityReceived(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          placeholder="e.g. 24"
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-bold text-[#264653]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 block">Purchase Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder="e.g. 450"
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-bold text-[#264653]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 block">Selling Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={sellingPrice}
                          onChange={(e) => setSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          placeholder="e.g. 600"
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-bold text-[#264653]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 block">Supplier Name</label>
                        <input
                          type="text"
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          placeholder="e.g. Mars Petcare"
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-medium text-[#264653]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#264653] mb-1 block">Invoice #</label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          placeholder="e.g. INV-2026-10"
                          className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-white text-xs font-medium text-[#264653]"
                        />
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#EADDCE]">
                      <button
                        type="button"
                        onClick={resetSingleForm}
                        className="px-4 py-2 rounded-xl border border-[#D5C7B8] text-xs font-bold text-[#7C9082] hover:bg-white cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewProductAndStock}
                        disabled={isProcessing || !newProductName.trim()}
                        className="px-5 py-2 rounded-xl bg-[#E76F51] hover:bg-[#D65D3F] text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Product & Add Stock</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: BULK CSV / EXCEL IMPORT */}
            {activeTab === 'bulk' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] space-y-2">
                  <h4 className="text-sm font-bold text-[#264653] flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#E76F51]" />
                    <span>Paste Supplier Bill CSV or Table Data</span>
                  </h4>
                  <p className="text-xs text-[#7C9082]">
                    Format: <code className="bg-white px-1.5 py-0.5 rounded border border-[#EADDCE] font-mono text-[11px]">Barcode, Product Name, Company, Purchase Price, Selling Price, Quantity</code>
                  </p>

                  <textarea
                    rows={6}
                    value={csvText}
                    onChange={(e) => handleParseCsv(e.target.value)}
                    placeholder="Barcode, Product Name, Company, Purchase Price, Selling Price, Quantity&#10;8901030012345, Royal Canin Maxi Adult, Royal Canin, 1800, 2400, 10&#10;8901030054321, Whiskas Ocean Fish Pouch, Whiskas, 35, 50, 48"
                    className="w-full p-3 rounded-xl border border-[#D5C7B8] bg-white font-mono text-xs text-[#264653] focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden"
                  />
                </div>

                {/* Parsed Preview Table */}
                {csvPreview.length > 0 && (
                  <div className="border border-[#EADDCE] rounded-2xl overflow-hidden">
                    <div className="bg-[#FAF8F5] px-4 py-2 border-b border-[#EADDCE] flex items-center justify-between text-xs font-bold text-[#264653]">
                      <span>Preview ({csvPreview.length} items detected)</span>
                      <span className="text-[11px] font-normal text-[#7C9082]">
                        Total Quantity: {csvPreview.reduce((acc, r) => acc + (r.quantity || 0), 0)} units
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-[#F2ECE4] text-[#7C9082] uppercase text-[10px] font-bold sticky top-0">
                          <tr>
                            <th className="p-2.5">Barcode</th>
                            <th className="p-2.5">Product Name</th>
                            <th className="p-2.5">Company</th>
                            <th className="p-2.5">Purchase ₹</th>
                            <th className="p-2.5">Selling ₹</th>
                            <th className="p-2.5">Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2ECE4]">
                          {csvPreview.map((row, idx) => (
                            <tr key={idx} className="hover:bg-[#FAF8F5]">
                              <td className="p-2.5 font-mono font-bold text-[#264653]">{row.barcode}</td>
                              <td className="p-2.5 font-semibold text-[#264653]">{row.productName}</td>
                              <td className="p-2.5 text-[#7C9082]">{row.company}</td>
                              <td className="p-2.5">₹{row.purchasePrice}</td>
                              <td className="p-2.5 font-bold text-emerald-700">₹{row.sellingPrice}</td>
                              <td className="p-2.5 font-black text-[#E76F51]">+{row.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvText('');
                      setCsvPreview([]);
                    }}
                    className="px-4 py-2 rounded-xl border border-[#D5C7B8] text-xs font-bold text-[#7C9082] hover:bg-[#FAF8F5]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkImportSubmit}
                    disabled={isProcessing || csvPreview.length === 0}
                    className="px-6 py-2.5 rounded-xl bg-[#264653] hover:bg-[#1E3741] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{isProcessing ? 'Processing...' : `Import & Inward ${csvPreview.length} Products`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barcode Camera Scanner Sub-Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        continuous={false}
        title="Scan Supplier Invoice Barcode"
        subtitle="Point camera at product packaging or printed supplier invoice"
        demoBarcodes={products.filter((p) => Boolean(p.barcode)).slice(0, 8).map((p) => ({ barcode: p.barcode, name: p.name }))}
      />

      {/* Visual Stock Menu Modal */}
      <StockMenuModal
        isOpen={isStockMenuOpen}
        onClose={() => setIsStockMenuOpen(false)}
        products={products}
        onSelectForLine={(product) => {
          setMatchedProduct(product);
          setBarcodeInput(product.barcode || product.sku);
          setPurchasePrice(product.costPrice || product.purchasePrice || '');
          setSellingPrice(product.sellingPrice || '');
          setHasSearched(true);
          setIsCreatingNew(false);
          setIsStockMenuOpen(false);
        }}
      />
    </>
  );
};
