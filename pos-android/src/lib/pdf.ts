import type { ExportSheet } from './xlsx'

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!)
}

/**
 * يجهّز تقريراً عربياً باتجاه RTL ويفتح نافذة الطباعة؛ يمكن اختيار
 * "حفظ بصيغة PDF" من نافذة الطباعة في أندرويد أو المتصفح.
 */
export async function exportPdf(
  filename: string,
  title: string,
  sheets: ExportSheet[],
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('تصدير PDF غير متاح في هذه البيئة.')
  }

  const sections = sheets.map((sheet) => {
    const headers = Array.from(new Set(sheet.rows.flatMap((row) => Object.keys(row))))
    if (!headers.length) return ''
    const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')
    const body = sheet.rows.map((row) =>
      `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`,
    ).join('')
    return `<section><h2>${escapeHtml(sheet.name)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></section>`
  }).join('')

  const printWindow = window.open('', '_blank')
  if (!printWindow) throw new Error('تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.')

  printWindow.document.open()
  printWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(filename.replace(/\.pdf$/i, ''))}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { direction: rtl; font-family: Arial, Tahoma, sans-serif; color: #172033; font-size: 12px; }
  h1 { text-align: center; font-size: 21px; margin: 0 0 8px; }
  h2 { font-size: 15px; margin: 22px 0 8px; color: #26364f; }
  .date { text-align: center; color: #667085; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; }
  th, td { border: 1px solid #d9dee8; padding: 7px 8px; text-align: right; overflow-wrap: anywhere; }
  th { background: #edf1f7; font-weight: 700; }
  tr { break-inside: avoid; }
  section { break-inside: auto; margin-bottom: 18px; }
  @media screen { body { max-width: 900px; margin: 24px auto; padding: 20px; } }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="date">تاريخ التصدير: ${escapeHtml(new Intl.DateTimeFormat('ar-YE', { dateStyle: 'full', timeStyle: 'short' }).format(new Date()))}</p>
${sections}
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));<\/script>
</body>
</html>`)
  printWindow.document.close()
}
