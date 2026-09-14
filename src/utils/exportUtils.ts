import * as XLSX from 'xlsx';

export interface ExportMetadata {
  label: string;
  value: string;
}

export interface ExportKPI {
  label: string;
  value: string;
  subtext?: string;
}

export interface ExportExcelOptions {
  filename: string;
  sheetName?: string;
  title: string;
  subtitle?: string;
  metadata?: ExportMetadata[];
  headers: string[];
  rows: (string | number)[][];
  summaryRows?: (string | number)[][];
}

export interface ExportPDFOptions {
  filename?: string;
  title: string;
  subtitle?: string;
  metadata?: ExportMetadata[];
  kpis?: ExportKPI[];
  headers: string[];
  rows: (string | number)[][];
  summaryRow?: (string | number)[];
  alignments?: ('left' | 'center' | 'right')[];
  orientation?: 'portrait' | 'landscape';
  footnote?: string;
}

/**
 * Downloads a genuine .xlsx Excel spreadsheet file
 */
export function exportToExcel(options: ExportExcelOptions) {
  const {
    filename,
    sheetName = 'Sheet1',
    title,
    subtitle,
    metadata = [],
    headers,
    rows,
    summaryRows = [],
  } = options;

  const aoa: (string | number)[][] = [];

  // Title block
  aoa.push([title]);
  if (subtitle) {
    aoa.push([subtitle]);
  }
  aoa.push([]);

  // Metadata block (Date generated, Branch, Period, etc.)
  if (metadata.length > 0) {
    metadata.forEach((m) => aoa.push([m.label, m.value]));
    aoa.push([]);
  }

  // Header row
  aoa.push(headers);

  // Data rows
  rows.forEach((row) => aoa.push(row));

  // Summary / Totals rows
  if (summaryRows.length > 0) {
    aoa.push([]);
    summaryRows.forEach((sRow) => aoa.push(sRow));
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths based on content
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    rows.forEach((r) => {
      const val = r[colIdx];
      const strLen = val !== undefined && val !== null ? String(val).length : 0;
      if (strLen > maxLen) maxLen = strLen;
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  const safeSheetName = sheetName.replace(/[\\/?*[\]]/g, '').substring(0, 31) || 'Report';
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  const cleanFilename = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

/**
 * Generates an executive, print-ready PDF view and triggers browser print-to-PDF
 */
export function exportToPDF(options: ExportPDFOptions) {
  const {
    title,
    subtitle,
    metadata = [],
    kpis = [],
    headers,
    rows,
    summaryRow,
    alignments = [],
    orientation = 'landscape',
    footnote,
  } = options;

  const printWindow = window.open('', '_blank', 'width=1100,height=850');
  if (!printWindow) {
    alert('Please allow popups for this site to export the PDF report.');
    return;
  }

  const generatedOn = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const metadataHtml = metadata
    .map(
      (m) => `
        <div style="font-size: 11px; color: #4b5563;">
          <span style="font-weight: 600; color: #111827;">${escapeHtml(m.label)}:</span> 
          <span>${escapeHtml(m.value)}</span>
        </div>
      `
    )
    .join('');

  const kpisHtml =
    kpis.length > 0
      ? `
        <div style="display: grid; grid-template-columns: repeat(${Math.min(kpis.length, 4)}, 1fr); gap: 12px; margin: 16px 0 20px 0;">
          ${kpis
            .map(
              (k) => `
            <div style="background: #FAF8F5; border: 1px solid #EAE7E0; border-radius: 8px; padding: 10px 14px;">
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; color: #666666;">${escapeHtml(k.label)}</div>
              <div style="font-size: 18px; font-weight: 700; color: #1A1A1A; font-family: 'Times New Roman', serif; margin-top: 2px;">${escapeHtml(k.value)}</div>
              ${k.subtext ? `<div style="font-size: 10px; color: #7A8C7B; font-weight: 500; margin-top: 2px;">${escapeHtml(k.subtext)}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `
      : '';

  const tableHeadersHtml = headers
    .map((h, i) => {
      const align = alignments[i] || 'left';
      return `<th style="padding: 8px 10px; font-size: 11px; font-weight: 700; text-align: ${align}; background: #2A2A2A; color: #FFFFFF; border: 1px solid #333333; text-transform: uppercase; letter-spacing: 0.3px;">${escapeHtml(h)}</th>`;
    })
    .join('');

  const tableRowsHtml = rows
    .map((row, rowIdx) => {
      const bg = rowIdx % 2 === 0 ? '#FFFFFF' : '#FAF9F7';
      const cells = row
        .map((cell, colIdx) => {
          const align = alignments[colIdx] || 'left';
          const cellValue = cell !== undefined && cell !== null ? String(cell) : '—';
          return `<td style="padding: 7px 10px; font-size: 11px; text-align: ${align}; color: #1F2937; border: 1px solid #E5E7EB;">${escapeHtml(cellValue)}</td>`;
        })
        .join('');
      return `<tr style="background: ${bg};">${cells}</tr>`;
    })
    .join('');

  const summaryRowHtml = summaryRow
    ? `
      <tr style="background: #F3F4F6; font-weight: 700; border-top: 2px solid #111827;">
        ${summaryRow
          .map((cell, colIdx) => {
            const align = alignments[colIdx] || 'left';
            const cellValue = cell !== undefined && cell !== null ? String(cell) : '';
            return `<td style="padding: 9px 10px; font-size: 11px; text-align: ${align}; color: #111827; border: 1px solid #D1D5DB; font-weight: bold;">${escapeHtml(cellValue)}</td>`;
          })
          .join('')}
      </tr>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)} - The Pet World</title>
        <style>
          @page {
            size: ${orientation};
            margin: 12mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #111827;
            background: #FFFFFF;
            margin: 0;
            padding: 16px;
            font-size: 12px;
            line-height: 1.4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          .no-print-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #1A1A1A;
            color: white;
            padding: 10px 18px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .btn {
            background: #D97757;
            color: white;
            border: none;
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
          }
          .btn:hover {
            background: #c26547;
          }
          @media print {
            .no-print-bar {
              display: none !important;
            }
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="font-weight: 600; font-size: 13px;">
            📄 Print Preview • Click "Save as PDF" in your print options
          </div>
          <button class="btn" onclick="window.print()">Print / Save as PDF</button>
        </div>

        <!-- Corporate Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #D97757; padding-bottom: 12px; margin-bottom: 12px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px; font-weight: 800; font-family: 'Times New Roman', serif; color: #1A1A1A; letter-spacing: 0.5px;">THE PET WORLD</span>
              <span style="font-size: 10px; background: #FAF8F5; border: 1px solid #EAE7E0; color: #D97757; padding: 2px 6px; border-radius: 4px; font-weight: 600;">OFFICIAL ERP REPORT</span>
            </div>
            <div style="font-size: 10px; color: #6B7280; margin-top: 2px;">Multi-Branch Retail & Care Operations • End of Month Accounting</div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #4B5563;">
            <div><strong>Generated:</strong> ${generatedOn}</div>
            <div><strong>Format:</strong> Verified Audit Ledger</div>
          </div>
        </div>

        <!-- Document Title & Subtitle -->
        <div style="margin-bottom: 12px;">
          <h1 style="margin: 0; font-size: 18px; color: #111827; font-family: 'Times New Roman', serif; font-weight: 700;">${escapeHtml(title)}</h1>
          ${subtitle ? `<div style="font-size: 12px; color: #4B5563; margin-top: 2px;">${escapeHtml(subtitle)}</div>` : ''}
        </div>

        <!-- Metadata & KPIs -->
        <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 8px;">
          ${metadataHtml}
        </div>

        ${kpisHtml}

        <!-- Data Table -->
        <table>
          <thead>
            <tr>
              ${tableHeadersHtml}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
            ${summaryRowHtml}
          </tbody>
        </table>

        <!-- Footnote / Audit Notes -->
        ${footnote ? `<div style="font-size: 10px; color: #6B7280; margin-top: 14px; font-style: italic;">* ${escapeHtml(footnote)}</div>` : ''}

        <!-- Signatures & Approvals for End of Month Accounting -->
        <div style="display: flex; justify-content: space-between; margin-top: 36px; padding-top: 16px; border-top: 1px dashed #D1D5DB; page-break-inside: avoid;">
          <div style="width: 200px; text-align: center;">
            <div style="height: 35px;"></div>
            <div style="border-top: 1px solid #111827; padding-top: 4px; font-size: 10px; font-weight: 600; color: #111827;">Prepared By</div>
            <div style="font-size: 9px; color: #6B7280;">Accounts / Store Executive</div>
          </div>

          <div style="width: 200px; text-align: center;">
            <div style="height: 35px;"></div>
            <div style="border-top: 1px solid #111827; padding-top: 4px; font-size: 10px; font-weight: 600; color: #111827;">Verified By</div>
            <div style="font-size: 9px; color: #6B7280;">Branch Manager</div>
          </div>

          <div style="width: 200px; text-align: center;">
            <div style="height: 35px;"></div>
            <div style="border-top: 1px solid #111827; padding-top: 4px; font-size: 10px; font-weight: 600; color: #111827;">Authorized Signatory</div>
            <div style="font-size: 9px; color: #6B7280;">Director / HQ Operations</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
