import { Capacitor, registerPlugin } from '@capacitor/core'
import type { ExportSheet } from './xlsx'
export type { ExportSheet } from './xlsx'

interface PdfExportPlugin {
  printHtml(options: { html: string; filename: string }): Promise<void>
}
const NativePdfExport = registerPlugin<PdfExportPlugin>('PdfExport')

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!)
}

function buildDocument(filename: string, title: string, sheets: ExportSheet[]): string {
  const sections = sheets.map((sheet) => {
    const headers = Array.from(new Set(sheet.rows.flatMap((row) => Object.keys(row))))
    if (!headers.length) return ''
    const head = headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join('')
    const body = sheet.rows.map((row) =>
      `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`,
    ).join('')
    return `<section><h2>${escapeHtml(sheet.name)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`
  }).join('')

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(filename.replace(/\.pdf$/i, ''))}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  html, body { direction: rtl; unicode-bidi: plaintext; }
  body { font-family: "Noto Naskh Arabic", "Noto Sans Arabic", Tahoma, Arial, sans-serif; color: #172033; font-size: 10px; line-height: 1.65; }
  .report-head { border-bottom: 2px solid #24364f; padding: 0 0 10px; margin-bottom: 16px; }
  h1 { text-align: center; font-size: 20px; line-height: 1.4; margin: 0 0 5px; color: #172033; }
  .date { text-align: center; color: #667085; margin: 0; font-size: 10px; }
  h2 { font-size: 14px; margin: 18px 0 7px; color: #26364f; page-break-after: avoid; break-after: avoid; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; margin: 0 0 12px; }
  thead { display: table-header-group; }
  th, td { border: 1px solid #d5dce7; padding: 5px 6px; text-align: right; vertical-align: top; overflow-wrap: anywhere; word-break: normal; }
  th { background: #e9eef5; color: #1d2d45; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  td { background: #fff; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  tbody tr:nth-child(even) td { background: #f7f9fc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  section { break-inside: auto; page-break-inside: auto; }
  @media print { body { font-size: 9px; } th, td { padding: 4px 5px; } }
  @media screen { body { max-width: 900px; margin: 24px auto; padding: 20px; background: #fff; } }
</style>
</head>
<body>
<header class="report-head">
  <h1>${escapeHtml(title)}</h1>
  <p class="date">تاريخ التصدير: ${escapeHtml(new Intl.DateTimeFormat('ar-YE', { dateStyle: 'full', timeStyle: 'short' }).format(new Date()))}</p>
</header>
${sections}
</body>
</html>`
}

/** تصدير PDF: نافذة الحفظ والطباعة الأصلية في أندرويد، والطباعة في المتصفح. */
export async function exportPdf(filename: string, title: string, sheets: ExportSheet[]): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('تصدير PDF غير متاح في هذه البيئة.')
  }
  if (!sheets.length || sheets.every((sheet) => sheet.rows.length === 0)) {
    throw new Error('لا توجد بيانات لإنشاء ملف PDF.')
  }

  const html = buildDocument(filename, title, sheets)
  if (Capacitor.isNativePlatform()) {
    await NativePdfExport.printHtml({ html, filename: filename.replace(/\.pdf$/i, '') })
    return
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) throw new Error('تعذر فتح نافذة التصدير. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.')
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
