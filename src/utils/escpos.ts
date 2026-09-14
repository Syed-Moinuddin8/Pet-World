import { Sale, Branch } from '../types.js';

/**
 * ESC/POS Command Constants
 */
export const ESC = 0x1B;
export const GS = 0x1D;
export const LF = 0x0A;

export const ESC_POS_COMMANDS = {
  // Initialize printer
  INIT: new Uint8Array([ESC, 0x40]),

  // Alignment
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),

  // Text formatting
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  UNDERLINE_ON: new Uint8Array([ESC, 0x2D, 0x01]),
  UNDERLINE_OFF: new Uint8Array([ESC, 0x2D, 0x00]),

  // Text sizing
  NORMAL_SIZE: new Uint8Array([GS, 0x21, 0x00]),
  DOUBLE_HEIGHT: new Uint8Array([GS, 0x21, 0x01]),
  DOUBLE_WIDTH: new Uint8Array([GS, 0x21, 0x10]),
  DOUBLE_SIZE: new Uint8Array([GS, 0x21, 0x11]),

  // Line spacing
  LINE_SPACING_DEFAULT: new Uint8Array([ESC, 0x32]),

  // Paper feeding & cutting
  FEED_3_LINES: new Uint8Array([ESC, 0x64, 0x03]),
  FEED_5_LINES: new Uint8Array([ESC, 0x64, 0x05]),
  PARTIAL_CUT: new Uint8Array([GS, 0x56, 0x42, 0x00]), // GS V 'B' 0
  FULL_CUT: new Uint8Array([GS, 0x56, 0x41, 0x00]),    // GS V 'A' 0
};

/**
 * Encodes plain text string to Uint8Array safely for thermal printers (ASCII / CP437).
 * Replaces unicode Rupee symbol '₹' with 'Rs. ' to prevent printer garbling.
 */
export function encodeThermalText(str: string): Uint8Array {
  // Replace unicode characters that commonly break standard thermal printer codepages
  const sanitized = str
    .replace(/₹/g, 'Rs.')
    .replace(/[–—]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[•●]/g, '*')
    .replace(/🐾/g, '')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, ''); // strip non-ascii

  const encoder = new TextEncoder();
  return encoder.encode(sanitized);
}

/**
 * Combines multiple Uint8Array chunks into one single Uint8Array
 */
export function concatByteArrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Pads left and right text to fit exact column width (e.g. 32 or 48 chars)
 */
export function padLine(left: string, right: string, width: number): string {
  const leftClean = left.trim();
  const rightClean = right.trim();
  const totalLength = leftClean.length + rightClean.length;

  if (totalLength >= width) {
    const availableLeft = Math.max(1, width - rightClean.length - 1);
    return leftClean.slice(0, availableLeft) + ' ' + rightClean;
  }

  const spaces = ' '.repeat(width - totalLength);
  return leftClean + spaces + rightClean;
}

/**
 * Formats a currency amount into standard thermal-friendly format
 */
export function formatReceiptCurrency(val?: number | null): string {
  const num = Math.round(Number(val) || 0);
  return 'Rs.' + num.toLocaleString('en-IN');
}

/**
 * Generates ESC/POS byte sequence for a Sale receipt
 */
export function generateSaleReceiptEscPos(
  sale: Sale,
  branch?: Branch,
  paperWidth: '58mm' | '80mm' = '80mm'
): Uint8Array {
  const width = paperWidth === '58mm' ? 32 : 48;
  const separator = '-'.repeat(width) + '\n';
  const doubleSeparator = '='.repeat(width) + '\n';

  const chunks: Uint8Array[] = [];

  // 1. Initialize printer
  chunks.push(ESC_POS_COMMANDS.INIT);
  chunks.push(ESC_POS_COMMANDS.LINE_SPACING_DEFAULT);

  // 2. Store Header (Centered)
  chunks.push(ESC_POS_COMMANDS.ALIGN_CENTER);
  chunks.push(ESC_POS_COMMANDS.BOLD_ON);
  chunks.push(ESC_POS_COMMANDS.DOUBLE_SIZE);
  chunks.push(encodeThermalText('PET WORLD\n'));
  chunks.push(ESC_POS_COMMANDS.NORMAL_SIZE);
  chunks.push(ESC_POS_COMMANDS.BOLD_OFF);

  // Branch Name & Details
  const bName = branch?.name || sale.branchName || 'Central Store';
  chunks.push(ESC_POS_COMMANDS.BOLD_ON);
  chunks.push(encodeThermalText(bName + '\n'));
  chunks.push(ESC_POS_COMMANDS.BOLD_OFF);

  const bAddress = branch?.address || sale.branchAddress || 'Retail Outlets, Mumbai';
  chunks.push(encodeThermalText(bAddress + '\n'));

  const bPhone = branch?.phone || sale.branchPhone || '+91 98200 11111';
  chunks.push(encodeThermalText('Ph: ' + bPhone + '\n'));

  chunks.push(encodeThermalText(doubleSeparator));

  // 3. Invoice Metadata (Left aligned)
  chunks.push(ESC_POS_COMMANDS.ALIGN_LEFT);
  chunks.push(encodeThermalText(padLine('Invoice No:', sale.invoiceNumber, width) + '\n'));
  chunks.push(encodeThermalText(padLine('Date & Time:', `${sale.date} ${sale.time}`, width) + '\n'));

  chunks.push(encodeThermalText(separator));

  // 4. Items Table Header
  if (width === 48) {
    chunks.push(ESC_POS_COMMANDS.BOLD_ON);
    chunks.push(encodeThermalText(padLine('ITEM DESCRIPTION', 'QTY    TOTAL', width) + '\n'));
    chunks.push(ESC_POS_COMMANDS.BOLD_OFF);
  } else {
    // 32 chars header
    chunks.push(ESC_POS_COMMANDS.BOLD_ON);
    chunks.push(encodeThermalText(padLine('ITEM', 'QTY  PRICE', width) + '\n'));
    chunks.push(ESC_POS_COMMANDS.BOLD_OFF);
  }
  chunks.push(encodeThermalText(separator));

  // 5. Items List
  for (const item of sale.items) {
    const itemName = item.productName;
    const qtyPrice = `${item.quantity} x ${formatReceiptCurrency(item.unitPrice)}`;
    const totalPrice = formatReceiptCurrency(item.totalPrice);

    if (width === 48) {
      // 48 columns
      if (itemName.length <= 28) {
        const rightPart = `${String(item.quantity).padStart(3)}  ${totalPrice.padStart(9)}`;
        chunks.push(encodeThermalText(padLine(itemName, rightPart, width) + '\n'));
      } else {
        chunks.push(encodeThermalText(itemName.slice(0, 46) + '\n'));
        const subLine = `  ${qtyPrice}`;
        chunks.push(encodeThermalText(padLine(subLine, totalPrice, width) + '\n'));
      }
    } else {
      // 32 columns
      chunks.push(encodeThermalText(itemName.slice(0, 32) + '\n'));
      chunks.push(encodeThermalText(padLine(`  ${qtyPrice}`, totalPrice, width) + '\n'));
    }
  }

  chunks.push(encodeThermalText(separator));

  // 6. Bill Total
  chunks.push(ESC_POS_COMMANDS.ALIGN_LEFT);
  chunks.push(ESC_POS_COMMANDS.BOLD_ON);
  chunks.push(ESC_POS_COMMANDS.DOUBLE_HEIGHT);
  chunks.push(encodeThermalText(padLine('BILL TOTAL:', formatReceiptCurrency(sale.grandTotal), width) + '\n'));
  chunks.push(ESC_POS_COMMANDS.NORMAL_SIZE);
  chunks.push(ESC_POS_COMMANDS.BOLD_OFF);

  chunks.push(encodeThermalText(separator));

  // Payment Details
  chunks.push(encodeThermalText(padLine(`Payment (${sale.paymentMethod}):`, formatReceiptCurrency(sale.grandTotal), width) + '\n'));
  chunks.push(encodeThermalText(padLine('Payment Status:', 'PAID', width) + '\n'));

  chunks.push(encodeThermalText(doubleSeparator));

  // 7. Footer
  chunks.push(ESC_POS_COMMANDS.ALIGN_CENTER);
  chunks.push(ESC_POS_COMMANDS.BOLD_ON);
  chunks.push(encodeThermalText('*** THANK YOU FOR SHOPPING ***\n'));
  chunks.push(ESC_POS_COMMANDS.BOLD_OFF);
  chunks.push(encodeThermalText('Keep your pets healthy & happy!\n'));
  chunks.push(encodeThermalText('Exchange within 7 days with original slip.\n'));

  // 8. Feed & Cut
  chunks.push(ESC_POS_COMMANDS.FEED_5_LINES);
  chunks.push(ESC_POS_COMMANDS.PARTIAL_CUT);

  return concatByteArrays(chunks);
}

/**
 * Generates an ESC/POS slip to verify printer connection, paper width, and alignments.
 */
export function generateTestReceiptEscPos(paperWidth: '58mm' | '80mm' = '80mm'): Uint8Array {
  const width = paperWidth === '58mm' ? 32 : 48;
  const separator = '-'.repeat(width) + '\n';
  const chunks: Uint8Array[] = [];

  chunks.push(ESC_POS_COMMANDS.INIT);
  chunks.push(ESC_POS_COMMANDS.ALIGN_CENTER);
  chunks.push(ESC_POS_COMMANDS.BOLD_ON);
  chunks.push(ESC_POS_COMMANDS.DOUBLE_SIZE);
  chunks.push(encodeThermalText('TEST RECEIPT\n'));
  chunks.push(ESC_POS_COMMANDS.NORMAL_SIZE);
  chunks.push(ESC_POS_COMMANDS.BOLD_OFF);

  chunks.push(encodeThermalText(`Pet World POS - Web Bluetooth\n`));
  chunks.push(encodeThermalText(`Paper Width Mode: ${paperWidth} (${width} chars)\n`));
  chunks.push(encodeThermalText(`Time: ${new Date().toLocaleTimeString()}\n`));
  chunks.push(encodeThermalText(separator));

  chunks.push(ESC_POS_COMMANDS.ALIGN_LEFT);
  chunks.push(encodeThermalText('Left aligned text test\n'));
  chunks.push(ESC_POS_COMMANDS.ALIGN_CENTER);
  chunks.push(encodeThermalText('Center aligned text test\n'));
  chunks.push(ESC_POS_COMMANDS.ALIGN_RIGHT);
  chunks.push(encodeThermalText('Right aligned text test\n'));

  chunks.push(ESC_POS_COMMANDS.ALIGN_LEFT);
  chunks.push(ESC_POS_COMMANDS.BOLD_ON);
  chunks.push(encodeThermalText('Bold font test: SUCCESS\n'));
  chunks.push(ESC_POS_COMMANDS.BOLD_OFF);

  chunks.push(encodeThermalText(padLine('Item 1 (Dog Food)', 'Rs. 450', width) + '\n'));
  chunks.push(encodeThermalText(padLine('Item 2 (Cat Toy)', 'Rs. 180', width) + '\n'));
  chunks.push(encodeThermalText(separator));
  chunks.push(ESC_POS_COMMANDS.BOLD_ON);
  chunks.push(encodeThermalText(padLine('TOTAL TEST:', 'Rs. 630', width) + '\n'));
  chunks.push(ESC_POS_COMMANDS.BOLD_OFF);
  chunks.push(encodeThermalText(separator));

  chunks.push(ESC_POS_COMMANDS.ALIGN_CENTER);
  chunks.push(encodeThermalText('Printer Connection OK!\n'));
  chunks.push(encodeThermalText('Bluetooth ESC/POS Verified.\n'));

  chunks.push(ESC_POS_COMMANDS.FEED_5_LINES);
  chunks.push(ESC_POS_COMMANDS.PARTIAL_CUT);

  return concatByteArrays(chunks);
}

/**
 * Generates human readable ASCII representation of the receipt for on-screen inspection
 */
export function generateReceiptPlainText(
  sale: Sale,
  branch?: Branch,
  paperWidth: '58mm' | '80mm' = '80mm'
): string {
  const width = paperWidth === '58mm' ? 32 : 48;
  const separator = '-'.repeat(width);
  const doubleSeparator = '='.repeat(width);

  const lines: string[] = [];

  // Header
  const title = 'PET WORLD';
  lines.push(' '.repeat(Math.max(0, Math.floor((width - title.length) / 2))) + title);
  const bName = branch?.name || sale.branchName || 'Central Store';
  lines.push(' '.repeat(Math.max(0, Math.floor((width - bName.length) / 2))) + bName);
  const bAddress = branch?.address || sale.branchAddress || 'Retail Outlets, Mumbai';
  lines.push(' '.repeat(Math.max(0, Math.floor((width - bAddress.length) / 2))) + bAddress);
  const bPhone = 'Ph: ' + (branch?.phone || sale.branchPhone || '+91 98200 11111');
  lines.push(' '.repeat(Math.max(0, Math.floor((width - bPhone.length) / 2))) + bPhone);

  lines.push(doubleSeparator);
  lines.push(padLine('Invoice No:', sale.invoiceNumber, width));
  lines.push(padLine('Date & Time:', `${sale.date} ${sale.time}`, width));
  lines.push(separator);

  if (width === 48) {
    lines.push(padLine('ITEM DESCRIPTION', 'QTY    TOTAL', width));
  } else {
    lines.push(padLine('ITEM', 'QTY  PRICE', width));
  }
  lines.push(separator);

  for (const item of sale.items) {
    const itemName = item.productName;
    const qtyPrice = `${item.quantity} x ${formatReceiptCurrency(item.unitPrice)}`;
    const totalPrice = formatReceiptCurrency(item.totalPrice);

    if (width === 48) {
      if (itemName.length <= 28) {
        const rightPart = `${String(item.quantity).padStart(3)}  ${totalPrice.padStart(9)}`;
        lines.push(padLine(itemName, rightPart, width));
      } else {
        lines.push(itemName.slice(0, 46));
        lines.push(padLine(`  ${qtyPrice}`, totalPrice, width));
      }
    } else {
      lines.push(itemName.slice(0, 32));
      lines.push(padLine(`  ${qtyPrice}`, totalPrice, width));
    }
  }

  lines.push(separator);
  lines.push(padLine('BILL TOTAL:', formatReceiptCurrency(sale.grandTotal), width));
  lines.push(separator);
  lines.push(padLine(`Payment (${sale.paymentMethod}):`, formatReceiptCurrency(sale.grandTotal), width));
  lines.push(padLine('Status:', 'PAID', width));
  lines.push(doubleSeparator);

  const footer1 = '*** THANK YOU FOR SHOPPING ***';
  lines.push(' '.repeat(Math.max(0, Math.floor((width - footer1.length) / 2))) + footer1);
  const footer2 = 'Keep your pets healthy & happy!';
  lines.push(' '.repeat(Math.max(0, Math.floor((width - footer2.length) / 2))) + footer2);
  const footer3 = 'Exchange within 7 days with slip.';
  lines.push(' '.repeat(Math.max(0, Math.floor((width - footer3.length) / 2))) + footer3);

  return lines.join('\n');
}

/**
 * Converts Uint8Array to base64 string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generates an Android RawBT intent URL for Classic Bluetooth SPP thermal printers
 */
export function getRawBtIntentUrl(bytes: Uint8Array): string {
  const base64Data = uint8ArrayToBase64(bytes);
  return `rawbt:data:application/octet-stream;base64,${base64Data}`;
}

/**
 * Triggers browser download of raw ESC/POS binary file (.bin)
 */
export function downloadEscPosFile(bytes: Uint8Array, filename = 'receipt.bin') {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
