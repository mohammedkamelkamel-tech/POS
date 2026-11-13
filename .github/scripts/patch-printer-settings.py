from pathlib import Path

p=Path("src/stores/printer.ts"); s=p.read_text()
s=s.replace("  width: 'printer_width',\n", "  width: 'printer_width',\n  paperMm: 'printer_paper_mm',\n  contentMm: 'printer_content_mm',\n  marginMm: 'printer_margin_mm',\n  fontPx: 'printer_font_px',\n  header: 'printer_header_text',\n  footer: 'printer_footer_text',\n")
s=s.replace("  const paperWidth = ref<PaperWidth>(16)\n", "  const paperWidth = ref<PaperWidth>(32)\n  const paperMm = ref(58)\n  const contentMm = ref(54)\n  const marginMm = ref(1)\n  const fontPx = ref(13)\n  const headerText = ref('الكامل-كاشير')\n  const footerText = ref('شكراً لتعاملكم معنا 🙏')\n")
old="    paperWidth.value = all[KEYS.width] === '48' ? 48 : all[KEYS.width] === '32' ? 32 : 16\n"
new="""    paperWidth.value = all[KEYS.width] === '48' ? 48 : 32
    paperMm.value = Number(all[KEYS.paperMm]) > 0 ? Number(all[KEYS.paperMm]) : 58
    contentMm.value = Number(all[KEYS.contentMm]) > 0 ? Number(all[KEYS.contentMm]) : 54
    marginMm.value = Number.isFinite(Number(all[KEYS.marginMm])) ? Number(all[KEYS.marginMm]) : 1
    fontPx.value = Number(all[KEYS.fontPx]) > 0 ? Number(all[KEYS.fontPx]) : 13
    headerText.value = all[KEYS.header] || 'الكامل-كاشير'
    footerText.value = all[KEYS.footer] || 'شكراً لتعاملكم معنا 🙏'
"""
if old not in s: raise SystemExit("printer store load block missing")
s=s.replace(old,new)
old="""  async function setWidth(w: PaperWidth) {
    paperWidth.value = w
    await repo().set(KEYS.width, String(w))
  }
"""
new=old+"""
  async function setLayout(patch: Partial<{ paperMm: number; contentMm: number; marginMm: number; fontPx: number; headerText: string; footerText: string }>) {
    if (patch.paperMm !== undefined) paperMm.value = Math.min(120, Math.max(30, Number(patch.paperMm) || 58))
    if (patch.contentMm !== undefined) contentMm.value = Math.min(paperMm.value, Math.max(20, Number(patch.contentMm) || 54))
    if (patch.marginMm !== undefined) marginMm.value = Math.min(10, Math.max(0, Number(patch.marginMm) || 0))
    if (patch.fontPx !== undefined) fontPx.value = Math.min(24, Math.max(8, Number(patch.fontPx) || 13))
    if (patch.headerText !== undefined) headerText.value = patch.headerText
    if (patch.footerText !== undefined) footerText.value = patch.footerText
    await repo().setMany({
      [KEYS.paperMm]: String(paperMm.value), [KEYS.contentMm]: String(contentMm.value),
      [KEYS.marginMm]: String(marginMm.value), [KEYS.fontPx]: String(fontPx.value),
      [KEYS.header]: headerText.value, [KEYS.footer]: footerText.value,
    })
  }
"""
s=s.replace(old,new)
s=s.replace("    paperWidth,\n    devices,", "    paperWidth,\n    paperMm, contentMm, marginMm, fontPx, headerText, footerText,\n    devices,")
s=s.replace("    setWidth,\n    clear,", "    setWidth,\n    setLayout,\n    clear,")
p.write_text(s)

p=Path("src/lib/receiptPrint.ts"); s=p.read_text()
s=s.replace("export async function printReceiptViaAndroid(job: ReceiptJob): Promise<void> {", "export interface ReceiptPrintLayout { paperMm?: number; contentMm?: number; marginMm?: number; fontPx?: number }\n\nexport async function printReceiptViaAndroid(job: ReceiptJob, layout: ReceiptPrintLayout = {}): Promise<void> {")
s=s.replace("  const html = ", "  const paperMm = Math.min(120, Math.max(30, layout.paperMm ?? 58))\n  const contentMm = Math.min(paperMm, Math.max(20, layout.contentMm ?? paperMm - 4))\n  const marginMm = Math.min(10, Math.max(0, layout.marginMm ?? 1))\n  const fontPx = Math.min(24, Math.max(8, layout.fontPx ?? 13))\n  const html = ",1)
s=s.replace("  await NativeReceiptPrint.printReceipt({ html, filename:", "  const configuredHtml = html.replace('58mm', String(paperMm) + 'mm').replace('54mm', String(contentMm) + 'mm').replace('1mm', String(marginMm) + 'mm').replace('font-size:13px', 'font-size:' + String(fontPx) + 'px')\n  await NativeReceiptPrint.printReceipt({ html: configuredHtml, filename:")
s=s.replace("paperWidthMm: 58", "paperWidthMm: paperMm")
p.write_text(s)

p=Path("src/pages/printer/PrinterPage.vue"); s=p.read_text()
s=s.replace("import { ref, onMounted, computed } from 'vue'", "import { ref, onMounted, computed, watch } from 'vue'")
s=s.replace("import { buildReceipt } from '@/lib/receipt'", "import { buildReceipt } from '@/lib/receipt'\nimport { printReceiptViaAndroid } from '@/lib/receiptPrint'")
s=s.replace("import type { Sale } from '@/db/types'", "import type { Sale, SaleItem } from '@/db/types'")
s=s.replace("const activeTab = ref<'settings' | 'instant'>('settings')", "const activeTab = ref<'settings' | 'preview' | 'instant'>('settings')\nconst previewSaleId = ref('')\nconst previewItems = ref<SaleItem[]>([])\nconst previewBusy = ref(false)")
s=s.replace("  connection, deviceName, paperWidth, devices, scanning, error,", "  connection, deviceName, paperWidth, paperMm, contentMm, marginMm, fontPx, headerText, footerText, devices, scanning, error,")
s=s.replace("  await sales.load()\n  if (supportedConnections.value.length)", "  await sales.load()\n  previewSaleId.value = instantSales.value[0]?.id ?? ''\n  if (supportedConnections.value.length)")
needle="async function refreshCanPrint() {"
insert="""async function loadPreviewSale() {
  if (!previewSaleId.value) { previewItems.value = []; return }
  previewBusy.value = true
  try { const data = await sales.getWithItems(previewSaleId.value); previewItems.value = data.items }
  finally { previewBusy.value = false }
}
watch(previewSaleId, () => { void loadPreviewSale() })
watch([paperMm, contentMm, marginMm, fontPx, headerText, footerText], () => {
  void printer.setLayout({ paperMm: paperMm.value, contentMm: contentMm.value, marginMm: marginMm.value, fontPx: fontPx.value, headerText: headerText.value, footerText: footerText.value })
})
const previewSale = computed(() => instantSales.value.find(s => s.id === previewSaleId.value) ?? null)
const previewHtml = computed(() => {
  if (!previewSale.value || !previewItems.value.length) return '<div style="font:14px sans-serif;text-align:center;padding:20px">اختر فاتورة مكتملة لمعاينتها</div>'
  const job = buildReceipt(previewSale.value, previewItems.value, { storeName: headerText.value, storeOwner: settings.storeOwner, width: paperWidth.value === 48 ? 48 : 32, pixelWidth: paperWidth.value === 48 ? 576 : 384 })
  const lines = job.lines.map((line, i) => {
    const value = i === job.lines.length - 1 ? footerText.value : line.text
    const size = line.size === 'large' ? fontPx.value + 2 : fontPx.value
    return '<div style="text-align:' + (line.align ?? 'right') + ';font-weight:' + (line.bold ? 700 : 400) + ';font-size:' + size + 'px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45">' + escapePreview(value) + '</div>'
  }).join('')
  return '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#000}body{font-family:Tahoma,Arial,sans-serif;width:' + contentMm.value + 'mm;margin:' + marginMm.value + 'mm auto;padding:0}</style><body>' + lines + '</body></html>'
})
function escapePreview(value: string) {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return value.replace(/[&<>"']/g, c => entities[c] ?? c)
}
async function printPreview() {
  if (!previewSale.value || !previewItems.value.length) return
  const job = buildReceipt(previewSale.value, previewItems.value, { storeName: headerText.value, storeOwner: settings.storeOwner, width: paperWidth.value === 48 ? 48 : 32, pixelWidth: paperWidth.value === 48 ? 576 : 384 })
  if (job.lines.length) job.lines[job.lines.length - 1] = { ...job.lines[job.lines.length - 1], text: footerText.value }
  await printReceiptViaAndroid(job, { paperMm: paperMm.value, contentMm: contentMm.value, marginMm: marginMm.value, fontPx: fontPx.value })
}

"""
if needle not in s: raise SystemExit("PrinterPage logic insertion point missing")
s=s.replace(needle,insert+needle)
s=s.replace('<div class="grid grid-cols-2 gap-2 border-b border-border bg-card p-3">', '<div class="grid grid-cols-3 gap-2 border-b border-border bg-card p-3">')
s=s.replace("""      <Button :variant="activeTab === 'instant' ? 'default' : 'outline'" @click="activeTab = 'instant'; sales.load()">الطباعة الفورية</Button>""", """      <Button :variant="activeTab === 'preview' ? 'default' : 'outline'" @click="activeTab = 'preview'">المعاينة والتعديل</Button>
      <Button :variant="activeTab === 'instant' ? 'default' : 'outline'" @click="activeTab = 'instant'; sales.load()">الطباعة الفورية</Button>""")
manual="""      <Card>
        <CardContent class="space-y-3 p-4">
          <p class="text-sm font-semibold">ضبط مقاس الورق والطباعة يدوياً</p>
          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1 text-xs">عرض الورقة (مم)<input v-model.number="paperMm" type="number" min="30" max="120" class="w-full rounded-lg border bg-background p-2 text-sm" /></label>
            <label class="space-y-1 text-xs">عرض الطباعة (مم)<input v-model.number="contentMm" type="number" min="20" :max="paperMm" class="w-full rounded-lg border bg-background p-2 text-sm" /></label>
            <label class="space-y-1 text-xs">الهامش (مم)<input v-model.number="marginMm" type="number" min="0" max="10" step="0.5" class="w-full rounded-lg border bg-background p-2 text-sm" /></label>
            <label class="space-y-1 text-xs">حجم الخط (px)<input v-model.number="fontPx" type="number" min="8" max="24" class="w-full rounded-lg border bg-background p-2 text-sm" /></label>
          </div>
          <p class="text-xs text-muted-foreground">القيم تحفظ تلقائياً وتُستخدم في معاينة الفاتورة والطباعة.</p>
        </CardContent>
      </Card>

"""
if "<!-- اختبار الطباعة -->" not in s: raise SystemExit("PrinterPage settings insertion point missing")
s=s.replace("      <!-- اختبار الطباعة -->",manual+"      <!-- اختبار الطباعة -->")
preview="""    <div v-else-if="activeTab === 'preview'" class="space-y-3 p-4">
      <Card><CardContent class="space-y-3 p-4">
        <p class="text-sm font-semibold">معاينة الفاتورة وتعديلها</p>
        <label class="block space-y-1 text-xs">اختر الفاتورة
          <select v-model="previewSaleId" class="w-full rounded-lg border bg-background p-2 text-sm">
            <option v-for="sale in instantSales" :key="sale.id" :value="sale.id">{{ sale.number }} — {{ formatRupiah(sale.total) }}</option>
          </select>
        </label>
        <label class="block space-y-1 text-xs">عنوان الفاتورة<input v-model="headerText" class="w-full rounded-lg border bg-background p-2 text-sm" /></label>
        <label class="block space-y-1 text-xs">عبارة أسفل الفاتورة<input v-model="footerText" class="w-full rounded-lg border bg-background p-2 text-sm" /></label>
        <p class="text-xs text-muted-foreground">يمكنك تغيير المقاسات والخط من إعدادات الطابعة، وستظهر التغييرات هنا مباشرة.</p>
      </CardContent></Card>
      <div class="overflow-hidden rounded-xl border bg-white p-2">
        <iframe title="معاينة الفاتورة" :srcdoc="previewHtml" class="mx-auto block min-h-[420px] w-full border-0" sandbox=""></iframe>
      </div>
      <Button class="w-full" size="lg" :disabled="!previewSale || previewBusy || !previewItems.length" @click="printPreview">طباعة بعد المعاينة</Button>
    </div>
"""
marker='    <div v-else class="space-y-3 p-4">\n      <div class="rounded-xl border border-border bg-card p-3">\n        <p class="text-sm font-semibold">الطباعة الفورية</p>'
if marker not in s: raise SystemExit("PrinterPage preview branch insertion point missing")
s=s.replace(marker,preview+marker)
old_button="""                <Button
                  :variant="paperWidth === 16 ? 'default' : 'outline'"
                  size="sm"
                  @click="printer.setWidth(16)"
                >15mm</Button>
"""
s=s.replace(old_button,"")
p.write_text(s)

for name in ["src/pages/pos/PosPage.vue","src/pages/transactions/TransactionDetailPage.vue"]:
    p=Path(name); s=p.read_text()
    s=s.replace("await printReceiptViaAndroid(job)", "await printReceiptViaAndroid(job, { paperMm: usePrinterStore().paperMm, contentMm: usePrinterStore().contentMm, marginMm: usePrinterStore().marginMm, fontPx: usePrinterStore().fontPx })")
    if name.endswith("TransactionDetailPage.vue"):
        s=s.replace("    }),\n  )", "    }),\n    { paperMm: usePrinterStore().paperMm, contentMm: usePrinterStore().contentMm, marginMm: usePrinterStore().marginMm, fontPx: usePrinterStore().fontPx },\n  )", 1)
    p.write_text(s)

print("Manual printer dimensions, saved layout settings, and editable receipt preview applied.")
