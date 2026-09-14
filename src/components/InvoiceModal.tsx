import React from 'react';
import { X, Printer, Download, Share2 } from 'lucide-react';
import { Sale, Branch } from '../types.js';
import { PawIcon } from './PetAvatars.js';

interface InvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
  branch?: Branch;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale, onClose, branch }) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatINR = (val?: number | null) =>
    '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#EADDCE] shadow-2xl p-6 md:p-8 text-[#264653] max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F2ECE4] mb-6 print:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-[#7C9082]">
            Invoice Preview (A4 Format)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E76F51] hover:bg-[#D95D3E] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#7C9082] hover:bg-[#F2ECE4]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* INVOICE CONTENT */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E76F51] text-white flex items-center justify-center shadow-md">
                <PawIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="font-['Fredoka',sans-serif] text-2xl font-bold text-[#264653]">
                  PET WORLD
                </h1>
                <p className="text-xs text-[#5B7065]">Premium Pet Care & Retail Chain</p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded bg-[#FAF1E8] text-[#E76F51] text-xs font-extrabold">
                RETAIL INVOICE
              </span>
              <div className="text-sm font-bold text-[#264653] mt-1 font-mono">
                {sale.invoiceNumber}
              </div>
              <div className="text-xs text-[#7C9082] mt-0.5">
                Date: {sale.date} • {sale.time}
              </div>
            </div>
          </div>

          {/* Store & Customer Details */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[#EADDCE] text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C9082] block mb-1">
                Store Location
              </span>
              <p className="font-bold text-[#264653]">{branch?.name || sale.branchName}</p>
              <p className="text-[#5B7065] text-[11px] mt-0.5">
                {branch?.address || sale.branchAddress || 'Downtown Mumbai Flagship'}, {branch?.city || 'Mumbai'}
              </p>
              {(branch?.phone || sale.branchPhone) && (
                <p className="text-[11px] text-[#7C9082] mt-0.5">Ph: {branch?.phone || sale.branchPhone}</p>
              )}
              <p className="text-[11px] text-[#7C9082]">Cashier: {sale.staffName}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C9082] block mb-1">
                Billed To Customer
              </span>
              <p className="font-bold text-[#264653]">{sale.customerName || 'Walk-in Customer'}</p>
              {sale.customerPhone && (
                <p className="text-[#5B7065] text-[11px] mt-0.5">Contact: {sale.customerPhone}</p>
              )}
              <p className="text-[11px] text-[#7C9082]">
                Payment Mode: <strong className="text-[#264653]">{sale.paymentMethod}</strong>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left text-xs border border-[#EADDCE] rounded-xl overflow-hidden">
            <thead className="bg-[#FAF8F5] text-[11px] font-bold text-[#7C9082] border-b border-[#EADDCE]">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Product Description</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2 text-center">Qty</th>
                <th className="px-3 py-2 text-right">Unit Rate</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2ECE4]">
              {sale.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 text-[#7C9082]">{idx + 1}</td>
                  <td className="px-3 py-2 font-bold text-[#264653]">{it.productName}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[#7C9082]">{it.sku}</td>
                  <td className="px-3 py-2 text-center font-bold">{it.quantity}</td>
                  <td className="px-3 py-2 text-right text-[#5B7065]">{formatINR(it.unitPrice)}</td>
                  <td className="px-3 py-2 text-right font-bold text-[#264653]">
                    {formatINR(it.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-base font-bold text-[#264653] pt-2 font-['Fredoka',sans-serif]">
                <span>Bill Total:</span>
                <span className="text-[#E76F51] text-lg">{formatINR(sale.grandTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-[#7C9082] text-[11px]">
                <span>Payment Mode:</span>
                <span className="font-semibold text-[#264653]">{sale.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="pt-6 border-t border-[#F2ECE4] text-[10px] text-[#7C9082] flex items-center justify-between">
            <div>
              <p>1. Goods once sold can be exchanged within 7 days with original invoice slip.</p>
              <p>2. Keep vaccines, frozen raw diets and open food packs in recommended climate.</p>
              <p className="mt-1 font-semibold text-[#5B7065]">
                Thank you for nurturing your pet with Pet World! 🐾
              </p>
            </div>
            <div className="text-right">
              <div className="h-10 border-b border-[#D5C7B8] w-28 mb-1" />
              <span>Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
