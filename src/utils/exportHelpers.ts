/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toPersianDigits, formatToJalali } from './farsi';
import { SignatureConfig } from '../types';

/**
 * Exports data to a CSV file with correct UTF-8 BOM for Persian characters.
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][], companyLogoPresent?: boolean) {
  let csvContent = '\uFEFF'; // UTF-8 BOM for Persian Excel compatibility
  
  // Add professional company header details
  csvContent += `"شرکت عمران آذرستان - پروژه ساخت و ساز صنعتی بوشهر"${companyLogoPresent ? ',"(دارای لوگوی اختصاصی شرکت)"' : ''}\n`;
  csvContent += `"گزارش آماری خروجی رستوران کارگاهی"\n\n`;

  // Join headers
  csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\n';
  
  // Join rows
  rows.forEach(row => {
    csvContent += row.map(cell => {
      const stringVal = cell === null || cell === undefined ? '' : String(cell);
      return `"${stringVal.replace(/"/g, '""')}"`;
    }).join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens a print-friendly window with beautifully styled RTL corporate layout and triggers browser printing (Save as PDF).
 */
export function printToPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  summaries?: { label: string; value: string | number }[],
  signatures?: SignatureConfig[],
  companyLogo?: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('لطفاً اجازه باز شدن پنجره‌های پاپ‌آپ (Pop-ups) را در مرورگر خود بدهید.');
    return;
  }

  const todayStr = formatToJalali(new Date().toISOString().split('T')[0], true);

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;700;900&display=swap');
        
        @page {
          size: A4;
          margin: 15mm 15mm 15mm 15mm;
        }
        
        body {
          font-family: 'Vazirmatn', 'Tahoma', sans-serif;
          color: #1e293b;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
          line-height: 1.6;
          direction: rtl;
        }
        
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f766e;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        
        .company-info {
          text-align: right;
        }
        
        .company-name {
          font-size: 18px;
          font-weight: 900;
          color: #0f766e;
          margin: 0 0 4px 0;
        }
        
        .project-name {
          font-size: 13px;
          color: #475569;
          margin: 0;
        }
        
        .report-meta {
          text-align: left;
          font-size: 11px;
          color: #64748b;
        }
        
        .report-meta p {
          margin: 2px 0;
        }
        
        .title-section {
          text-align: center;
          margin-bottom: 25px;
        }
        
        .report-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 6px 0;
        }
        
        .report-subtitle {
          font-size: 12px;
          color: #475569;
          margin: 0;
        }
        
        /* Summary Grid */
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 25px;
        }
        
        .summary-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px;
          text-align: center;
        }
        
        .summary-label {
          font-size: 10px;
          color: #64748b;
          margin: 0 0 4px 0;
        }
        
        .summary-value {
          font-size: 14px;
          font-weight: 700;
          color: #0f766e;
          margin: 0;
        }
        
        /* Table Styles */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          font-size: 11px;
        }
        
        th {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          font-weight: 700;
          padding: 8px 6px;
          text-align: center;
        }
        
        td {
          border: 1px solid #e2e8f0;
          padding: 8px 6px;
          text-align: center;
        }
        
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        
        .notes-column {
          text-align: right;
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Footer */
        .footer-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94a3b8;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .no-print {
            display: none;
          }
        }
        
        .print-btn-bar {
          background-color: #f1f5f9;
          padding: 10px 15px;
          margin-bottom: 20px;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .print-btn {
          background-color: #0f766e;
          color: white;
          border: none;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: bold;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Vazirmatn', sans-serif;
        }
        
        .print-btn:hover {
          background-color: #0d9488;
        }
        
        .close-btn {
          background-color: #64748b;
          color: white;
          border: none;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: bold;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Vazirmatn', sans-serif;
        }
      </style>
    </head>
    <body>
      
      <!-- Print Button Bar (hidden on physical print) -->
      <div class="print-btn-bar no-print">
        <span style="font-size: 12px; color: #475569; font-weight: bold;">پیش‌نمایش چاپ نسخه PDF گزارش</span>
        <div>
          <button class="print-btn" onclick="window.print()">تایید و چاپ (ذخیره به عنوان PDF)</button>
          <button class="close-btn" onclick="window.close()" style="margin-right: 8px;">بستن پنجره</button>
        </div>
      </div>

      <!-- Main Corporate Report Page -->
      <div class="header-container">
        <div style="display: flex; align-items: center; gap: 15px;">
          ${companyLogo ? `
            <div style="width: 55px; height: 55px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; justify-content: center; align-items: center; overflow: hidden; padding: 2px;">
              <img src="${companyLogo}" style="max-width: 100%; max-height: 100%; object-fit: contain;" referrerPolicy="no-referrer" />
            </div>
          ` : ''}
          <div class="company-info">
            <h1 class="company-name">شرکت عمران آذرستان</h1>
            <p class="project-name">پروژه ساخت و ساز صنعتی بوشهر</p>
          </div>
        </div>
        <div class="report-meta">
          <p>تاریخ گزارش: ${toPersianDigits(todayStr)}</p>
          <p>سیستم نرم‌افزاری: مدیریت رستوران کارگاهی</p>
          <p>واحد تهیه کننده: فناوری اطلاعات و ارتباطات (ICT)</p>
        </div>
      </div>

      <div class="title-section">
        <h2 class="report-title">${title}</h2>
        <p class="report-subtitle">${subtitle}</p>
      </div>

      <!-- Summaries if provided -->
      ${summaries && summaries.length > 0 ? `
        <div class="summary-grid">
          ${summaries.map(s => `
            <div class="summary-card">
              <p class="summary-label">${s.label}</p>
              <p class="summary-value">${toPersianDigits(s.value)}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Main Data Table -->
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              ${row.map((cell, idx) => {
                const isNotes = idx === headers.length - 1;
                const formattedValue = typeof cell === 'number' ? toPersianDigits(cell) : toPersianDigits(String(cell));
                return `<td class="${isNotes ? 'notes-column' : ''}" title="${cell}">${formattedValue}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Signature Boxes Section -->
      ${signatures && signatures.length > 0 ? `
        <div style="margin-top: 50px; margin-bottom: 80px; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-around; align-items: flex-start; gap: 20px;">
            ${signatures.filter(s => s.isVisible).map(s => `
              <div style="flex: 1; min-width: 150px; max-width: 250px; text-align: center; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; background-color: #f8fafc;">
                <p style="font-size: 11px; font-weight: 700; color: #475569; margin: 0 0 45px 0;">امضای ${s.title}</p>
                <p style="font-size: 11px; font-weight: 900; color: #0f172a; margin: 0;">${s.name}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Footer Section -->
      <div class="footer-container">
        <span>سامانه مدیریت رستوران کارگاهی - بوشهر عمران آذرستان</span>
        <span>صفحه ۱ از ۱</span>
      </div>

      <script>
        // Auto-open print dialog on load
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            window.print();
          }, 500);
        });
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
