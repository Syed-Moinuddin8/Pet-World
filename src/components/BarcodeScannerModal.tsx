import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  Check,
  Keyboard,
  Zap,
  Volume2,
  VolumeX,
  Flashlight,
  FlashlightOff,
  Image as ImageIcon,
  SwitchCamera,
  CheckCircle2,
  Copy,
  ShoppingCart,
  Plus,
  Package,
} from 'lucide-react';
import { HTMLCanvasElementLuminanceSource } from '@zxing/browser';
import {
  BarcodeFormat,
  DecodeHintType,
  BinaryBitmap,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  MultiFormatReader,
} from '@zxing/library';
import { Product, InventoryItem, Branch } from '../types.js';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  continuous?: boolean;
  demoBarcodes?: { barcode: string; name: string }[];
  zIndex?: string;
  // Inventory check & Cart integration
  products?: Product[];
  inventory?: InventoryItem[];
  currentBranch?: Branch;
  cartItems?: { product: Product; quantity: number }[];
  onAddToCart?: (product: Product) => void;
  cartCount?: number;
  cartTotal?: number;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

interface ScanResultState {
  code: string;
  status: 'NOT_FOUND' | 'OUT_OF_STOCK' | 'FOUND';
  product?: Product;
  availableStock?: number;
  inCartQty?: number;
}

// Multi-strategy decoder: attempts GlobalHistogram, Hybrid, and 90-degree rotated orientations
function decodeCanvasWithStrategies(
  canvas: HTMLCanvasElement,
  reader: MultiFormatReader
): string | null {
  try {
    const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);

    // Pass 1: GlobalHistogramBinarizer (high speed on sharp 1D retail barcodes)
    try {
      const bitmapGlobal = new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource));
      const result = reader.decodeWithState(bitmapGlobal);
      if (result && result.getText()) {
        return result.getText();
      }
    } catch {
      // Pass 1 miss
    }

    // Pass 2: HybridBinarizer (superior on gradients, low-light, wrinkles)
    try {
      const bitmapHybrid = new BinaryBitmap(new HybridBinarizer(luminanceSource));
      const result = reader.decodeWithState(bitmapHybrid);
      if (result && result.getText()) {
        return result.getText();
      }
    } catch {
      // Pass 2 miss
    }

    return null;
  } catch {
    return null;
  } finally {
    reader.reset();
  }
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'POS Barcode Scanner',
  subtitle = 'Point camera at product barcode to bill',
  continuous = true,
  demoBarcodes = [],
  zIndex = 'z-70',
  products,
  inventory,
  currentBranch,
  cartItems,
  onAddToCart,
  cartCount,
  cartTotal,
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<VideoDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isSuccessFlash, setIsSuccessFlash] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('Position barcode in view');
  const [framesAnalyzed, setFramesAnalyzed] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);

  // Scanned item verification state
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null);
  const [justAddedMsg, setJustAddedMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopActiveRef = useRef<boolean>(false);
  const scanTimerRef = useRef<any>(null);
  const isPausedRef = useRef<boolean>(false);
  const nativeDetectorRef = useRef<any>(null);
  const zxingReaderRef = useRef<MultiFormatReader | null>(null);
  const lastScanTimestamp = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize ZXing reader with broad barcode format support
  useEffect(() => {
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ]);
    const reader = new MultiFormatReader();
    reader.setHints(hints);
    zxingReaderRef.current = reader;
  }, []);

  // Pleasant audio chime on scan
  const playBeep = useCallback((isError = false) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (isError) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(isError ? [80, 50, 80] : 80);
      }
    } catch {
      // Audio policy safe
    }
  }, [soundEnabled]);

  // Inventory verification helper
  const checkInventoryForBarcode = useCallback((barcodeStr: string): ScanResultState => {
    const clean = barcodeStr.trim();
    if (!products || products.length === 0) {
      return { code: clean, status: 'NOT_FOUND' };
    }

    const normalizedScan = clean.toLowerCase().replace(/[-\s]/g, '');
    const match = products.find((p) => {
      const pb = (p.barcode || '').trim().toLowerCase().replace(/[-\s]/g, '');
      const psku = (p.sku || '').trim().toLowerCase().replace(/[-\s]/g, '');
      return (
        pb === normalizedScan ||
        psku === normalizedScan ||
        (pb.length === 12 && normalizedScan === '0' + pb) ||
        (normalizedScan.length === 12 && pb === '0' + normalizedScan)
      );
    });

    if (!match) {
      return {
        code: clean,
        status: 'NOT_FOUND',
      };
    }

    // Check available stock in current branch
    let available = 0;
    if (inventory && currentBranch) {
      const inv = inventory.find((i) => i.productId === match.id && i.branchId === currentBranch.id);
      available = inv ? inv.quantity : 0;
    } else if (inventory) {
      available = inventory.filter((i) => i.productId === match.id).reduce((s, it) => s + it.quantity, 0);
    } else {
      available = 999;
    }

    const inCart = cartItems?.find((it) => it.product.id === match.id);
    const inCartQty = inCart ? inCart.quantity : 0;

    if (available <= 0) {
      return {
        code: clean,
        status: 'OUT_OF_STOCK',
        product: match,
        availableStock: 0,
        inCartQty,
      };
    }

    return {
      code: clean,
      status: 'FOUND',
      product: match,
      availableStock: available,
      inCartQty,
    };
  }, [products, inventory, currentBranch, cartItems]);

  // Handle recognized barcode (camera, manual, photo, or demo)
  const handleRecognizedBarcode = useCallback(
    (decodedText: string) => {
      const clean = decodedText.trim();
      if (!clean) return;

      const now = Date.now();
      // Debounce duplicate scans within 800ms
      if (clean === lastScanned && now - lastScanTimestamp.current < 800) {
        return;
      }

      // If already reviewing a detected product or result, skip to prevent UI freezing
      if (isPausedRef.current) {
        return;
      }

      lastScanTimestamp.current = now;
      setLastScanned(clean);
      setManualCode(clean);
      setScanCount((c) => c + 1);

      // POS mode: Check inventory status
      if (products && products.length > 0) {
        // Pause camera decoding so CPU is completely free and UI is never stuck
        isPausedRef.current = true;
        const result = checkInventoryForBarcode(clean);
        setScanResult(result);

        if (result.status === 'FOUND') {
          playBeep(false);
          setIsSuccessFlash(true);
          setTimeout(() => setIsSuccessFlash(false), 500);
          setScanStatusText(`Found: ${result.product?.name}`);
        } else if (result.status === 'OUT_OF_STOCK') {
          playBeep(true);
          setScanStatusText(`Out of stock: ${result.product?.name}`);
        } else {
          playBeep(true);
          setScanStatusText(`Item not in inventory (${clean})`);
        }
      } else {
        // Generic barcode scanner mode (e.g. edit product or purchase bills)
        playBeep(false);
        setIsSuccessFlash(true);
        setTimeout(() => setIsSuccessFlash(false), 500);
        setScanStatusText(`Recognized: ${clean}`);
        onScan(clean);

        if (!continuous) {
          setTimeout(() => {
            onClose();
          }, 350);
        }
      }
    },
    [lastScanned, playBeep, onScan, continuous, onClose, products, checkInventoryForBarcode]
  );

  // Resume camera scanning smoothly
  const resumeScanning = useCallback(() => {
    isPausedRef.current = false;
    setScanResult(null);
    setScanStatusText('Align barcode inside target frame');
  }, []);

  // Add detected product to cart and prepare for next scan
  const handleAddAndScanNext = useCallback(() => {
    if (!scanResult || !scanResult.product) return;
    const prod = scanResult.product;

    if (onAddToCart) {
      onAddToCart(prod);
    } else {
      onScan(prod.barcode);
    }

    playBeep(false);
    setJustAddedMsg(`Added "${prod.name}" to cart!`);
    setTimeout(() => setJustAddedMsg(null), 2200);

    // Resume scanning for the next item
    resumeScanning();
  }, [scanResult, onAddToCart, onScan, playBeep, resumeScanning]);

  // Stop camera tracks and cancel scan loop
  const stopCamera = useCallback(() => {
    scanLoopActiveRef.current = false;
    isPausedRef.current = false;
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop notice:', e);
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setTorchOn(false);
    setTorchAvailable(false);
  }, []);

  // Initialize Native BarcodeDetector if supported in browser (Chrome / Edge / Android)
  const initNativeDetector = useCallback(async () => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const supportedFormats: string[] =
          (await (window as any).BarcodeDetector.getSupportedFormats?.()) || [];
        const desiredFormats = [
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'code_128',
          'code_39',
          'code_93',
          'itf',
          'codabar',
          'qr_code',
          'data_matrix',
        ].filter((fmt) => supportedFormats.includes(fmt));

        if (desiredFormats.length > 0) {
          nativeDetectorRef.current = new (window as any).BarcodeDetector({
            formats: desiredFormats,
          });
          return true;
        }
      } catch (err) {
        console.warn('Native BarcodeDetector init:', err);
      }
    }
    nativeDetectorRef.current = null;
    return false;
  }, []);

  // Process current video frame (lightweight & CPU-safe)
  const processCurrentFrame = useCallback(async (): Promise<boolean> => {
    // If paused to show result, bypass decoding immediately (0% CPU)
    if (isPausedRef.current) {
      return false;
    }

    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.paused || video.ended) {
      return false;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw <= 0 || vh <= 0) {
      return false;
    }

    setFramesAnalyzed((f) => f + 1);

    // 1. Native BarcodeDetector if available (hardware accelerated, ultra fast)
    if (nativeDetectorRef.current) {
      try {
        const detected = await nativeDetectorRef.current.detect(video);
        if (detected && detected.length > 0) {
          const raw = detected[0]?.rawValue;
          if (raw) {
            handleRecognizedBarcode(raw);
            return true;
          }
        }
      } catch {
        // Frame skip
      }
    }

    // 2. Offscreen canvas for ZXing
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;

    const targetW = Math.min(vw, 960);
    const targetH = Math.round((targetW / vw) * vh);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;

    try {
      ctx.drawImage(video, 0, 0, targetW, targetH);
    } catch {
      return false;
    }

    const reader = zxingReaderRef.current;
    if (!reader) return false;

    // 3. Center Reticle Crop pass
    try {
      if (!cropCanvasRef.current) {
        cropCanvasRef.current = document.createElement('canvas');
      }
      const cropCanvas = cropCanvasRef.current;
      const cropW = Math.round(targetW * 0.75);
      const cropH = Math.round(targetH * 0.45);
      const cropX = Math.round((targetW - cropW) / 2);
      const cropY = Math.round((targetH - cropH) / 2);

      if (cropCanvas.width !== cropW || cropCanvas.height !== cropH) {
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
      }

      const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
      if (cropCtx) {
        cropCtx.filter = 'none';
        cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const decodedCenter = decodeCanvasWithStrategies(cropCanvas, reader);
        if (decodedCenter) {
          handleRecognizedBarcode(decodedCenter);
          return true;
        }
      }
    } catch {
      // NotFound in crop
    }

    // 4. Full frame fallback
    const decodedFull = decodeCanvasWithStrategies(canvas, reader);
    if (decodedFull) {
      handleRecognizedBarcode(decodedFull);
      return true;
    }

    return false;
  }, [handleRecognizedBarcode]);

  // Robust, CPU-friendly frame scan loop (150ms intervals)
  const startScanLoop = useCallback(() => {
    scanLoopActiveRef.current = true;

    const tick = async () => {
      if (!scanLoopActiveRef.current) return;

      try {
        await processCurrentFrame();
      } catch (err) {
        console.warn('Frame scan tick notice:', err);
      }

      if (scanLoopActiveRef.current) {
        scanTimerRef.current = setTimeout(tick, 150);
      }
    };

    tick();
  }, [processCurrentFrame]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser. Please use manual entry or file upload.');
      return;
    }

    try {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices
          .filter((d) => d.kind === 'videoinput')
          .map((d, index) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${index + 1}`,
          }));
        setAvailableDevices(videoInputs);
      } catch (e) {
        console.warn('Device enumeration notice:', e);
      }

      let constraints: MediaStreamConstraints;
      if (selectedDeviceId) {
        constraints = {
          audio: false,
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          },
        };
      } else {
        constraints = {
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          },
        };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        console.warn('Relaxing camera constraints...', err);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: selectedDeviceId ? { deviceId: selectedDeviceId } : { facingMode },
        });
      }

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
          if (capabilities.torch) {
            setTorchAvailable(true);
          }
        } catch {
          // torch unsupported
        }
      }

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;

        await video.play();

        await new Promise<void>((resolve) => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            resolve();
          } else {
            const onLoaded = () => {
              video.removeEventListener('loadeddata', onLoaded);
              video.removeEventListener('canplay', onLoaded);
              resolve();
            };
            video.addEventListener('loadeddata', onLoaded);
            video.addEventListener('canplay', onLoaded);
            setTimeout(resolve, 800);
          }
        });
      }

      setIsScanning(true);
      setScanStatusText('Align barcode inside target frame');
      await initNativeDetector();
      startScanLoop();
    } catch (err: any) {
      console.error('Camera initialization failed:', err);
      setIsScanning(false);
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : err?.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : err?.message || 'Could not start camera. You can still enter or upload barcodes below.';
      setCameraError(msg);
    }
  }, [stopCamera, selectedDeviceId, facingMode, initNativeDetector, startScanLoop]);

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Flip camera (environment vs user)
  const toggleFacing = () => {
    setSelectedDeviceId('');
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Lifecycle effect when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setLastScanned(null);
      setScanCount(0);
      setFramesAnalyzed(0);
      setCameraError(null);
      setScanResult(null);
      isPausedRef.current = false;
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, facingMode, selectedDeviceId]);

  // Manual code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;

    if (products && products.length > 0) {
      isPausedRef.current = true;
      const result = checkInventoryForBarcode(clean);
      setScanResult(result);
      if (result.status === 'FOUND') {
        playBeep(false);
      } else {
        playBeep(true);
      }
    } else {
      playBeep(false);
      onScan(clean);
      if (!continuous) onClose();
    }
  };

  // Photo upload decoder fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imgUrl = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = imgUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // 1. Native detector
      if (nativeDetectorRef.current) {
        try {
          const detected = await nativeDetectorRef.current.detect(img);
          if (detected && detected.length > 0 && detected[0]?.rawValue) {
            handleRecognizedBarcode(detected[0].rawValue);
            URL.revokeObjectURL(imgUrl);
            return;
          }
        } catch {
          // Fall through
        }
      }

      // 2. ZXing reader
      const reader = zxingReaderRef.current;
      if (reader) {
        const uploadCanvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        uploadCanvas.width = w;
        uploadCanvas.height = h;
        const uCtx = uploadCanvas.getContext('2d', { willReadFrequently: true });
        if (uCtx) {
          uCtx.drawImage(img, 0, 0);
          let decoded = decodeCanvasWithStrategies(uploadCanvas, reader);
          if (decoded) {
            handleRecognizedBarcode(decoded);
            return;
          }
          // High contrast pass
          uCtx.filter = 'contrast(1.6) brightness(1.1)';
          uCtx.drawImage(img, 0, 0);
          decoded = decodeCanvasWithStrategies(uploadCanvas, reader);
          if (decoded) {
            handleRecognizedBarcode(decoded);
            return;
          }
        }
      }

      alert('No barcode detected in this image. Please ensure the barcode is clear, in focus, and adequately lit.');
    } catch (err: any) {
      console.warn('Image barcode decode note:', err);
      alert('Could not decode barcode from image. Please verify image clarity or enter the barcode number manually.');
    } finally {
      URL.revokeObjectURL(imgUrl);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto`}
      onClick={(e) => {
        // Tapping the dark backdrop closes the scanner immediately
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-[#EADDCE] flex flex-col max-h-[96vh] sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3 sm:p-4 border-b border-[#F2ECE4] bg-[#FAF8F5] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#E76F51] text-white flex items-center justify-center shadow-xs shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#264653] font-['Fredoka',sans-serif] truncate">
                  {title}
                </h3>
                {continuous && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase tracking-wider shrink-0">
                    Live
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#7C9082] truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Chime' : 'Enable Chime'}
              className="p-1.5 rounded-lg text-[#7C9082] hover:bg-[#F2ECE4] transition-colors cursor-pointer"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {/* Flashlight Toggle */}
            {torchAvailable && (
              <button
                type="button"
                onClick={toggleTorch}
                title={torchOn ? 'Turn Off Flashlight' : 'Turn On Flashlight'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  torchOn ? 'bg-amber-100 text-amber-700' : 'text-[#7C9082] hover:bg-[#F2ECE4]'
                }`}
              >
                {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}

            {/* Switch Camera */}
            <button
              type="button"
              onClick={toggleFacing}
              title={`Switch to ${facingMode === 'environment' ? 'Front' : 'Rear'} Camera`}
              className="p-1.5 rounded-lg text-[#7C9082] hover:bg-[#F2ECE4] transition-colors cursor-pointer"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>

            {/* Prominent, high-contrast Close Button in header */}
            <button
              type="button"
              onClick={onClose}
              className="ml-1 px-2.5 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              aria-label="Close Scanner"
            >
              <X className="w-4 h-4 text-red-600" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Camera Viewport - Balanced mobile height (175px mobile, 230px desktop) */}
        <div className="relative bg-black h-44 sm:h-56 flex items-center justify-center overflow-hidden shrink-0">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
          />

          {/* Success Flash Ripple */}
          {isSuccessFlash && (
            <div className="absolute inset-0 bg-emerald-500/30 backdrop-blur-xs flex items-center justify-center z-30 animate-in fade-in zoom-in duration-150 pointer-events-none">
              <div className="bg-emerald-600 text-white p-2.5 rounded-full shadow-xl flex items-center gap-2">
                <CheckCircle2 className="w-7 h-7 animate-bounce" />
              </div>
            </div>
          )}

          {/* Target Reticle Overlay with Animated Laser */}
          {isScanning && !cameraError && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-20">
              <div className="w-64 sm:w-72 h-28 sm:h-36 border-2 border-emerald-400/80 rounded-2xl relative shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-white rounded-tl-xs" />
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-white rounded-tr-xs" />
                <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-white rounded-bl-xs" />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-white rounded-br-xs" />

                {/* Animated Laser Scanning Line */}
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-xs shadow-red-500 animate-pulse top-1/2 -translate-y-1/2" />

                {/* Active scan status badge */}
                <div className="absolute -bottom-6 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/75 text-[10px] font-medium text-white/95 backdrop-blur-xs shadow-sm whitespace-nowrap">
                  <span className={`w-2 h-2 rounded-full ${isPausedRef.current ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'} inline-block`} />
                  <span>{isPausedRef.current ? 'Item detected • Review below' : scanStatusText}</span>
                </div>
              </div>
            </div>
          )}

          {/* Camera Error / Fallback UI */}
          {cameraError && (
            <div className="absolute inset-0 bg-[#264653]/95 flex flex-col items-center justify-center p-4 text-center text-white z-30">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-1.5" />
              <h4 className="font-bold text-xs text-white mb-1">Camera Unavailable</h4>
              <p className="text-[11px] text-amber-200 mb-3 max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Multi-Camera Selection Bar (if available) */}
        {availableDevices.length > 1 && (
          <div className="px-3 py-1.5 bg-[#F5F2ED] border-b border-[#EADDCE] flex items-center justify-between text-xs text-[#264653] shrink-0">
            <span className="text-[10px] font-semibold text-[#7C9082]">Camera:</span>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="px-2 py-0.5 rounded-lg border border-[#D5C7B8] bg-white text-[11px] font-medium text-[#264653] focus:outline-hidden"
            >
              <option value="">Default ({facingMode === 'environment' ? 'Rear' : 'Front'})</option>
              {availableDevices.map((dev) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Middle Scrollable Section: Feedback, Inventory Verification Card & Manual Entry */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#FAF8F5]/60">
          {/* Floating Just-Added Success Toast */}
          {justAddedMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{justAddedMsg}</span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-full font-semibold">
                Camera Live
              </span>
            </div>
          )}

          {/* SCANNED ITEM RESULT CARD */}
          {scanResult && (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-150">
              {/* STATUS 1: ITEM NOT FOUND IN INVENTORY */}
              {scanResult.status === 'NOT_FOUND' && (
                <div className="p-3.5 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-red-900 uppercase tracking-wide">
                        Item Not Available in Inventory
                      </h4>
                      <code className="font-mono text-[10px] font-bold bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                        {scanResult.code}
                      </code>
                    </div>
                    <p className="text-xs text-red-700 font-semibold mt-1">
                      This item is not in the cart.
                    </p>
                    <p className="text-[11px] text-red-600 mt-0.5">
                      Barcode <span className="font-mono font-bold">{scanResult.code}</span> was not found in your product catalog. Check the barcode number or add this product in Catalog view.
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resumeScanning}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        Scan Another Barcode
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STATUS 2: OUT OF STOCK AT THIS BRANCH */}
              {scanResult.status === 'OUT_OF_STOCK' && scanResult.product && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3 shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      Product Out of Stock
                    </h4>
                    <p className="text-xs font-bold text-[#264653] mt-0.5">
                      {scanResult.product.name}
                    </p>
                    <p className="text-xs text-amber-800 font-semibold mt-0.5">
                      This item is not in the cart.
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      0 units available at {currentBranch?.name || 'this branch'}. Please restock before selling.
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resumeScanning}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        Scan Next Item
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STATUS 3: PRODUCT FOUND IN INVENTORY - PROMINENT "ADD TO CART & SCAN" BUTTON */}
              {scanResult.status === 'FOUND' && scanResult.product && (
                <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-white border border-emerald-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {scanResult.product.imageUrl ? (
                          <img
                            src={scanResult.product.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-2xl">🐾</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {scanResult.product.brand || 'Verified Item'}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-[#5B7065]">
                            {scanResult.product.barcode}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#264653] truncate mt-0.5">
                          {scanResult.product.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-[#5B7065] mt-0.5 flex-wrap">
                          <span className="font-extrabold text-[#E76F51] text-sm">
                            ₹{Math.round(scanResult.product.sellingPrice).toLocaleString('en-IN')}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">
                            Stock: {scanResult.availableStock} in store
                          </span>
                          {(scanResult.inCartQty || 0) > 0 && (
                            <span className="text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded text-[10px]">
                              {scanResult.inCartQty} already in cart
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* USER REQUESTED ACTION: Add to Cart & Scan Button */}
                  <div className="flex items-center gap-2 pt-1 border-t border-emerald-200">
                    <button
                      type="button"
                      onClick={handleAddAndScanNext}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart & Scan Next</span>
                    </button>
                    <button
                      type="button"
                      onClick={resumeScanning}
                      className="px-3 py-2.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-semibold cursor-pointer"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Barcode Input & Photo Upload */}
          <div className="bg-white p-3 rounded-2xl border border-[#EADDCE] shadow-2xs space-y-2">
            <div className="text-[11px] font-bold text-[#264653] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-[#E76F51]" />
                <span>Manual Barcode Entry / Search</span>
              </span>
              <span className="text-[10px] text-[#7C9082]">Hardware USB/Laser Scanner Ready</span>
            </div>

            <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Type or paste barcode digits..."
                  className="w-full px-3 py-2 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] text-xs font-medium focus:ring-2 focus:ring-[#E76F51] focus:outline-hidden text-[#264653]"
                />
              </div>

              {/* Photo Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload barcode photo"
                className="px-2.5 py-2 rounded-xl border border-[#D5C7B8] bg-[#FAF8F5] hover:bg-[#F2ECE4] text-[#264653] text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#7C9082]" />
                <span className="text-[11px]">Photo</span>
              </button>

              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#264653] hover:bg-[#1E3741] active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                Find Item
              </button>
            </form>
          </div>

          {/* Quick Demo Barcodes from Catalog */}
          {demoBarcodes.length > 0 && (
            <div className="pt-0.5">
              <div className="text-[10px] font-bold text-[#7C9082] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#E76F51]" />
                <span>Quick Test Barcodes:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {demoBarcodes.slice(0, 8).map((item) => (
                  <button
                    key={item.barcode}
                    type="button"
                    onClick={() => {
                      handleRecognizedBarcode(item.barcode);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF1E8] border border-[#EADDCE] text-[10px] font-semibold text-[#264653] whitespace-nowrap hover:border-[#E76F51] transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                    title={`Test scan: ${item.barcode} (${item.name})`}
                  >
                    <span>{item.name.split(' ')[0]}</span>
                    <code className="text-[#E76F51] font-mono text-[10px] font-bold">{item.barcode}</code>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Bottom Action Bar - ALWAYS VISIBLE ON ANY MOBILE SCREEN */}
        <div className="p-3 bg-[#FAF8F5] border-t border-[#EADDCE] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="font-bold text-[#264653] shrink-0">Cart:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0">
              {cartCount !== undefined ? `${cartCount} items` : 'POS Ready'}
            </span>
            {cartTotal !== undefined && (
              <span className="font-mono font-bold text-[#E76F51] truncate">
                ₹{Math.round(cartTotal).toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#264653] hover:bg-[#1E3741] active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all shrink-0"
          >
            <X className="w-4 h-4 text-red-300" />
            <span>Close Scanner</span>
          </button>
        </div>
      </div>
    </div>
  );
};
