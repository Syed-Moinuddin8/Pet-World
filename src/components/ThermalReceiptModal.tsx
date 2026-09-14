import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
  FileCode,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Sale, Branch } from '../types.js';
import { PawIcon } from './PetAvatars.js';
import {
  generateSaleReceiptEscPos,
  generateTestReceiptEscPos,
  generateReceiptPlainText,
  getRawBtIntentUrl,
  downloadEscPosFile,
  formatReceiptCurrency,
} from '../utils/escpos.js';
import {
  bluetoothPrinter,
  BluetoothPrinterState,
} from '../utils/webBluetoothPrinter.js';

interface ThermalReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
  branch?: Branch;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  sale,
  onClose,
  branch,
}) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>('80mm');
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [showProtocolHelp, setShowProtocolHelp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Bluetooth State
  const [btState, setBtState] = useState<BluetoothPrinterState>(bluetoothPrinter.getState());
  const isSupported = bluetoothPrinter.isSupported();
  const isInsideIframe = bluetoothPrinter.isInsideIframe();

  useEffect(() => {
    const unsubscribe = bluetoothPrinter.subscribe((state) => {
      setBtState(state);
      if (state.errorMessage) {
        setStatusMessage(state.errorMessage);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!sale) return null;

  const handleConnectBluetooth = async () => {
    try {
      setStatusMessage(null);
      await bluetoothPrinter.connect();
      setStatusMessage('Connected to Bluetooth thermal printer successfully!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      if (err.message?.includes('cancelled')) {
        return;
      }
      setStatusMessage(err?.message || 'Bluetooth connection failed.');
    }
  };

  const handleDisconnectBluetooth = () => {
    bluetoothPrinter.disconnect();
    setStatusMessage('Printer disconnected.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handlePrintBluetooth = async () => {
    if (btState.status !== 'connected') {
      try {
        await handleConnectBluetooth();
      } catch {
        return;
      }
    }

    try {
      setStatusMessage('Generating ESC/POS commands and sending to printer...');
      const escPosData = generateSaleReceiptEscPos(sale, branch, paperWidth);
      await bluetoothPrinter.printEscPos(escPosData);
      setStatusMessage('Receipt printed successfully via Bluetooth!');
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setStatusMessage(`Print failed: ${err.message || 'Transmission error'}`);
    }
  };

  const handleTestPrint = async () => {
    if (btState.status !== 'connected') {
      try {
        await handleConnectBluetooth();
      } catch {
        return;
      }
    }

    try {
      setStatusMessage('Sending ESC/POS test slip...');
      const testData = generateTestReceiptEscPos(paperWidth);
      await bluetoothPrinter.printEscPos(testData);
      setStatusMessage('Test receipt printed successfully!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage(`Test print failed: ${err.message}`);
    }
  };

  const handlePrintSystem = () => {
    window.print();
  };

  const handlePrintRawBt = () => {
    const escPosData = generateSaleReceiptEscPos(sale, branch, paperWidth);
    const intentUrl = getRawBtIntentUrl(escPosData);
    window.location.href = intentUrl;
    setStatusMessage('Launched RawBT driver intent with ESC/POS payload.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleDownloadBin = () => {
    const escPosData = generateSaleReceiptEscPos(sale, branch, paperWidth);
    downloadEscPosFile(escPosData, `receipt-${sale.invoiceNumber}.bin`);
    setStatusMessage('Downloaded raw ESC/POS binary file.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const formatINR = (val?: number | null) =>
    '₹' + Math.round(Number(val) || 0).toLocaleString('en-IN');

  const rawPlainText = generateReceiptPlainText(sale, branch, paperWidth);
  const escPosByteCount = generateSaleReceiptEscPos(sale, branch, paperWidth).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white overflow-y-auto">
      <div className="bg-[#FAF8F5] rounded-3xl border border-[#EADDCE] shadow-2xl p-4 sm:p-6 text-[#264653] max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:border-none print:p-0">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EADDCE] shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E76F51]/10 border border-[#E76F51]/20 flex items-center justify-center text-[#E76F51]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#264653] font-['Fredoka',sans-serif]">
                  Thermal Receipt Printer
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E76F51]/10 text-[#E76F51] border border-[#E76F51]/20">
                  ESC/POS
                </span>
              </div>
              <p className="text-xs text-[#7C9082]">
                Invoice #{sale.invoiceNumber} • {branch?.name || sale.branchName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tab Toggle */}
            <div className="hidden sm:flex bg-[#EFE9E0] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-[#264653] shadow-xs'
                    : 'text-[#7C9082] hover:text-[#264653]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('raw')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === 'raw'
                    ? 'bg-white text-[#264653] shadow-xs'
                    : 'text-[#7C9082] hover:text-[#264653]'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>ESC/POS Code</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#EFE9E0] text-[#7C9082] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTROLS & STATUS BAR */}
        <div className="py-3 shrink-0 print:hidden space-y-2.5">
          {/* Top Row: Paper width & Quick actions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Paper Width selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#7C9082]">Roll Width:</span>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paperWidth === '58mm'
                    ? 'bg-[#264653] text-white shadow-xs'
                    : 'bg-[#EFE9E0] text-[#5B7065] hover:bg-[#E5DDCF]'
                }`}
              >
                58mm (32 cols)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  paperWidth === '80mm'
                    ? 'bg-[#264653] text-white shadow-xs'
                    : 'bg-[#EFE9E0] text-[#5B7065] hover:bg-[#E5DDCF]'
                }`}
              >
                80mm (48 cols)
              </button>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Bluetooth Connect / Print Button */}
              {btState.status === 'connected' || btState.status === 'printing' ? (
                <button
                  type="button"
                  disabled={btState.status === 'printing'}
                  onClick={handlePrintBluetooth}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {btState.status === 'printing' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Printing ({btState.progressPercent}%)...</span>
                    </>
                  ) : (
                    <>
                      <BluetoothConnected className="w-4 h-4" />
                      <span>Print via Bluetooth</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={btState.status === 'connecting'}
                  onClick={handleConnectBluetooth}
                  className="px-4 py-2 rounded-xl bg-[#2A9D8F] hover:bg-[#238276] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {btState.status === 'connecting' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Scanning Bluetooth...</span>
                    </>
                  ) : (
                    <>
                      <Bluetooth className="w-4 h-4" />
                      <span>Connect Bluetooth</span>
                    </>
                  )}
                </button>
              )}

              {/* Standard Thermal Print Fallback */}
              <button
                type="button"
                onClick={handlePrintSystem}
                className="px-3.5 py-2 rounded-xl bg-[#264653] hover:bg-[#1C333D] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Print using browser / system print dialog with exact 58/80mm roll formatting"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>System Spooler</span>
              </button>
            </div>
          </div>

          {/* Bluetooth Connection Status Pill */}
          <div className="bg-white rounded-2xl p-2.5 border border-[#EADDCE] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  btState.status === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : btState.status === 'connecting'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-gray-400'
                }`}
              />
              <span className="font-medium text-[#264653]">
                {btState.status === 'connected' ? (
                  <>
                    Connected to:{' '}
                    <strong className="text-emerald-700">{btState.deviceName}</strong>
                  </>
                ) : btState.status === 'connecting' ? (
                  <span className="text-amber-700">Connecting to Bluetooth GATT server...</span>
                ) : btState.status === 'printing' ? (
                  <span className="text-emerald-700">
                    Transmitting ESC/POS packets ({btState.progressPercent}%)...
                  </span>
                ) : (
                  <span className="text-[#7C9082]">
                    Web Bluetooth status: {isSupported ? 'Ready to pair' : 'Not supported by this browser'}
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {btState.status === 'connected' && (
                <>
                  <button
                    type="button"
                    onClick={handleTestPrint}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#EADDCE] hover:bg-[#F2ECE4] text-[#264653] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#E76F51]" />
                    <span>Test Slip</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectBluetooth}
                    className="px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <BluetoothOff className="w-3 h-3" />
                    <span>Disconnect</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowProtocolHelp(!showProtocolHelp)}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold text-[#7C9082] hover:text-[#264653] hover:bg-[#EFE9E0] flex items-center gap-1 transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-[#2A9D8F]" />
                <span>Bluetooth Guide & Limitations</span>
                {showProtocolHelp ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Toast / Status Message */}
          {statusMessage && (
            <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="flex-1">{statusMessage}</span>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-amber-500 hover:text-amber-800 text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* EXPLANATORY ACCORDION: BLUETOOTH BLE VS CLASSIC SPP LIMITATION */}
          {showProtocolHelp && (
            <div className="bg-[#FFFDF9] rounded-2xl p-4 border border-[#EADDCE] text-xs text-[#264653] space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#264653] text-sm font-['Fredoka',sans-serif]">
                    Important: Web Bluetooth (BLE) vs. Bluetooth Classic (SPP)
                  </h4>
                  <p className="text-[#5B7065] mt-1 leading-relaxed">
                    The <strong>Web Bluetooth API</strong> in Google Chrome communicates exclusively via{' '}
                    <strong>Bluetooth Low Energy (BLE / GATT)</strong>. However, many budget 58mm/80mm thermal
                    printers use legacy <strong>Bluetooth Classic (SPP 2.0/3.0 - Serial Port Profile)</strong>,
                    which browser security prohibits accessing directly.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                {/* Method 1: Web Bluetooth */}
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-1">
                    <Bluetooth className="w-3.5 h-3.5" />
                    <span>1. Web Bluetooth (BLE)</span>
                  </div>
                  <p className="text-[11px] text-[#5B7065] leading-normal">
                    Direct browser connection for modern BLE 4.0/5.0 printers (Xprinter, Goojprt, Rongta, PeriPage). Click <strong>Connect Bluetooth</strong> above.
                  </p>
                </div>

                {/* Method 2: RawBT App for Classic SPP */}
                <div className="bg-white p-3 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-1">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>2. RawBT App (Classic SPP)</span>
                  </div>
                  <p className="text-[11px] text-[#5B7065] leading-normal">
                    For cheap Bluetooth Classic SPP printers on Android. Use the free <em>RawBT</em> driver app to bridge raw ESC/POS commands directly.
                  </p>
                  <button
                    type="button"
                    onClick={handlePrintRawBt}
                    className="mt-2 w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Print via RawBT Intent</span>
                  </button>
                </div>

                {/* Method 3: System Spooler / File */}
                <div className="bg-white p-3 rounded-xl border border-[#EADDCE]">
                  <div className="flex items-center gap-1.5 text-[#264653] font-bold mb-1">
                    <Download className="w-3.5 h-3.5" />
                    <span>3. Spooler & Raw .BIN</span>
                  </div>
                  <p className="text-[11px] text-[#5B7065] leading-normal">
                    Print via standard OS Print Dialog or download raw byte payload for USB/terminal spooling.
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={handlePrintSystem}
                      className="flex-1 py-1.5 px-1.5 bg-[#FAF8F5] hover:bg-[#EFE9E0] text-[#264653] border border-[#EADDCE] rounded-lg font-bold text-[10px] text-center"
                    >
                      System Print
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadBin}
                      className="flex-1 py-1.5 px-1.5 bg-[#FAF8F5] hover:bg-[#EFE9E0] text-[#264653] border border-[#EADDCE] rounded-lg font-bold text-[10px] text-center"
                    >
                      Save .BIN
                    </button>
                  </div>
                </div>
              </div>

              {/* Iframe Notice if applicable */}
              {isInsideIframe && (
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between text-[11px] text-amber-900">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Preview mode detected: Web Bluetooth pairing may require running in a top-level window.
                    </span>
                  </div>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-lg bg-white border border-amber-300 font-bold text-amber-800 hover:bg-amber-100 shrink-0 flex items-center gap-1"
                  >
                    <span>Open in New Tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CONTENT AREA: PREVIEW OR ESC/POS RAW INSPECTOR */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[#EFE9E0]/40 rounded-2xl p-4 border border-[#EADDCE]/60">
          {activeTab === 'preview' ? (
            /* THERMAL PAPER CONTAINER */
            <div
              className={`mx-auto bg-white p-5 font-mono text-[11px] text-black border border-dashed border-gray-300 shadow-md print:shadow-none print:border-none print:p-0 leading-relaxed ${
                paperWidth === '58mm' ? 'w-[260px]' : 'w-[320px]'
              }`}
            >
              {/* Header */}
              <div className="text-center space-y-1 pb-2 border-b border-dashed border-black">
                <div className="flex items-center justify-center gap-1">
                  <PawIcon className="w-4 h-4" />
                  <strong className="text-sm font-bold tracking-wider font-sans">PET WORLD</strong>
                  <PawIcon className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-bold">{branch?.name || sale.branchName}</div>
                <div className="text-[9px] text-gray-700">
                  {branch?.address || sale.branchAddress || 'Retail Outlets, Mumbai'}
                </div>
                <div className="text-[9px]">
                  Ph: {branch?.phone || sale.branchPhone || '+91 98200 11111'}
                </div>
              </div>

              {/* Bill Info */}
              <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Invoice:</span>
                  <strong>{sale.invoiceNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>
                    {sale.date}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-black space-y-1.5">
                {sale.items.map((it, idx) => (
                  <div key={idx}>
                    <div className="font-semibold truncate">{it.productName}</div>
                    <div className="flex justify-between text-[10px] text-gray-800">
                      <span>
                        {it.quantity} x {formatINR(it.unitPrice)}
                      </span>
                      <span>{formatINR(it.totalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="py-2 border-b border-dashed border-black space-y-1">
                <div className="flex justify-between text-xs font-bold pt-1">
                  <span>BILL TOTAL:</span>
                  <span>{formatINR(sale.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Paid via {sale.paymentMethod}:</span>
                  <span>{formatINR(sale.grandTotal)}</span>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="pt-3 text-center space-y-1 text-[9px]">
                <p className="font-bold">*** THANK YOU ***</p>
                <p>Keep your pets healthy & happy! 🐾</p>
                <p>Exchange within 7 days with this slip.</p>
              </div>
            </div>
          ) : (
            /* RAW ESC/POS COMMAND INSPECTOR */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#5B7065] px-1">
                <span>
                  Generated ESC/POS Byte Stream • <strong>{escPosByteCount} bytes</strong> encoded
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBin}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#EADDCE] hover:bg-[#FAF8F5] text-[#264653] font-bold text-xs flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .BIN</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#1E293B] text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-700 whitespace-pre">
                {rawPlainText}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER BAR */}
        <div className="pt-3 border-t border-[#EADDCE] flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden text-xs text-[#7C9082]">
          <div className="flex items-center gap-3">
            <span>
              Roll: <strong>{paperWidth}</strong>
            </span>
            <span>•</span>
            <span>
              Payload: <strong>{escPosByteCount} bytes</strong>
            </span>
            <span>•</span>
            <span>
              Format: <strong>ESC/POS Standard</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-xs text-[#7C9082] hover:bg-[#EFE9E0] transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrintBluetooth}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Bluetooth className="w-4 h-4" />
              <span>
                {btState.status === 'connected' ? 'Print Receipt via Bluetooth' : 'Connect & Print'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
