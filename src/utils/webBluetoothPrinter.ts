/**
 * Web Bluetooth POS Thermal Printer Manager
 * Handles BLE connection, GATT discovery, chunked ESC/POS transmission, and status tracking.
 */

export type BluetoothPrinterStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'printing'
  | 'error';

export interface BluetoothPrinterState {
  status: BluetoothPrinterStatus;
  deviceName: string | null;
  errorMessage: string | null;
  progressPercent: number;
}

type Listener = (state: BluetoothPrinterState) => void;

// Common BLE Thermal Printer GATT Service UUIDs
const KNOWN_PRINTER_SERVICES = [
  // Standard 0x18F0 (Common across Chinese / Xprinter / Goojprt / Rongta BLE printers)
  '000018f0-0000-1000-8000-00805f9b34fb',
  // Standard 0xFFF0
  '0000fff0-0000-1000-8000-00805f9b34fb',
  // Nordic UART Service (NUS)
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  // ISSC Transparent UART
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  // WeChat BLE / Standard IoT
  '0000fee7-0000-1000-8000-00805f9b34fb',
  // Custom ESC/POS vendor UUIDs
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '0000ae00-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
];

export class BluetoothPrinterService {
  private static instance: BluetoothPrinterService;

  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private state: BluetoothPrinterState = {
    status: 'disconnected',
    deviceName: null,
    errorMessage: null,
    progressPercent: 0,
  };
  private listeners: Set<Listener> = new Set();

  private constructor() {}

  public static getInstance(): BluetoothPrinterService {
    if (!BluetoothPrinterService.instance) {
      BluetoothPrinterService.instance = new BluetoothPrinterService();
    }
    return BluetoothPrinterService.instance;
  }

  public getState(): BluetoothPrinterState {
    return { ...this.state };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private updateState(updates: Partial<BluetoothPrinterState>) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach((fn) => {
      try {
        fn(this.getState());
      } catch (err) {
        console.error('Error in bluetooth printer state listener:', err);
      }
    });
  }

  /**
   * Check if Web Bluetooth API is supported in the current environment
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'bluetooth' in navigator &&
      typeof navigator.bluetooth?.requestDevice === 'function'
    );
  }

  /**
   * Check if currently running inside an iframe where Web Bluetooth may be restricted
   */
  public isInsideIframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }

  /**
   * Scan and connect to a Bluetooth thermal printer
   */
  public async connect(): Promise<string> {
    if (!this.isSupported()) {
      const err =
        'Web Bluetooth API is not supported in this browser. Please use Google Chrome or Edge on Android, Windows, Mac, or ChromeOS.';
      this.updateState({ status: 'error', errorMessage: err });
      throw new Error(err);
    }

    try {
      this.updateState({
        status: 'connecting',
        errorMessage: null,
        progressPercent: 0,
      });

      // Request device from user with common printer GATT services in optionalServices
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_SERVICES,
      });

      this.device = device;
      const deviceName = device.name || 'Bluetooth Thermal Printer';

      device.addEventListener('gattserverdisconnected', this.handleDisconnected);

      if (!device.gatt) {
        throw new Error('Device does not support GATT server.');
      }

      // Connect to GATT
      const server = await device.gatt.connect();

      // Locate a writable characteristic for ESC/POS data
      let targetChar: BluetoothRemoteGATTCharacteristic | null = null;

      // 1. Try known service UUIDs first
      for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          const chars = await service.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              targetChar = c;
              break;
            }
          }
          if (targetChar) break;
        } catch {
          // Service not present on this device, continue scanning
        }
      }

      // 2. If not found in known list, query all primary services
      if (!targetChar) {
        try {
          const services = await server.getPrimaryServices();
          for (const service of services) {
            try {
              const chars = await service.getCharacteristics();
              for (const c of chars) {
                if (c.properties.write || c.properties.writeWithoutResponse) {
                  targetChar = c;
                  break;
                }
              }
              if (targetChar) break;
            } catch {
              // Ignore service query errors
            }
          }
        } catch {
          // Ignore
        }
      }

      if (!targetChar) {
        throw new Error(
          `Connected to "${deviceName}", but no writable ESC/POS characteristic was found. Note: If this printer uses Bluetooth Classic (SPP 2.0/3.0), Android Web Bluetooth cannot access it. Use the RawBT or System Print option below.`
        );
      }

      this.characteristic = targetChar;
      this.updateState({
        status: 'connected',
        deviceName,
        errorMessage: null,
        progressPercent: 0,
      });

      return deviceName;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        // User cancelled picker dialog
        this.updateState({
          status: this.characteristic ? 'connected' : 'disconnected',
          errorMessage: null,
        });
        throw new Error('Bluetooth printer selection was cancelled.');
      }

      const msg = err?.message || 'Failed to connect to Bluetooth printer.';
      this.updateState({
        status: 'error',
        errorMessage: msg,
      });
      throw err;
    }
  }

  /**
   * Cleanly disconnect the active Bluetooth printer
   */
  public disconnect(): void {
    if (this.device?.gatt?.connected) {
      try {
        this.device.gatt.disconnect();
      } catch (err) {
        console.warn('Error during printer disconnect:', err);
      }
    }
    this.cleanup();
  }

  private handleDisconnected = () => {
    this.cleanup();
    this.updateState({
      status: 'disconnected',
      deviceName: null,
      errorMessage: 'Printer disconnected.',
      progressPercent: 0,
    });
  };

  private cleanup() {
    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnected);
    }
    this.device = null;
    this.characteristic = null;
  }

  /**
   * Send ESC/POS binary data to the connected printer in safe chunks
   */
  public async printEscPos(
    data: Uint8Array,
    onProgress?: (progressPercent: number) => void
  ): Promise<void> {
    if (!this.characteristic || !this.device?.gatt?.connected) {
      throw new Error('No Bluetooth printer connected. Please connect a printer first.');
    }

    this.updateState({
      status: 'printing',
      errorMessage: null,
      progressPercent: 0,
    });

    const char = this.characteristic;
    const chunkSize = 50; // 50 bytes per packet is safe across virtually all BLE microcontrollers
    const totalBytes = data.length;
    let bytesSent = 0;

    try {
      for (let offset = 0; offset < totalBytes; offset += chunkSize) {
        const slice = data.slice(offset, offset + chunkSize);

        if (char.properties.writeWithoutResponse) {
          await char.writeValueWithoutResponse(slice);
        } else if (char.properties.write) {
          await char.writeValue(slice);
        } else {
          throw new Error('Characteristic does not support write operations.');
        }

        bytesSent += slice.length;
        const pct = Math.min(100, Math.round((bytesSent / totalBytes) * 100));

        this.updateState({ progressPercent: pct });
        if (onProgress) onProgress(pct);

        // Microdelay to let thermal printer hardware buffer absorb data without overflow
        await new Promise((resolve) => setTimeout(resolve, 15));
      }

      // Small delay after finishing print
      await new Promise((resolve) => setTimeout(resolve, 200));

      this.updateState({
        status: 'connected',
        progressPercent: 100,
        errorMessage: null,
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed while transmitting ESC/POS data to printer.';
      this.updateState({
        status: 'error',
        errorMessage: msg,
      });
      throw new Error(msg);
    }
  }
}

export const bluetoothPrinter = BluetoothPrinterService.getInstance();
