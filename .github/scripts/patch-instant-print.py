from pathlib import Path

p = Path("src/pages/printer/PrinterPage.vue")
s = p.read_text()
if "function printInstantSale" in s:
    print("Instant print tab already exists.")
    raise SystemExit(0)

s = s.replace(
    "import { ref, onMounted } from 'vue'",
    """import { ref, onMounted, computed } from 'vue'
import { useSalesStore } from '@/stores/sales'
import { useSettingsStore } from '@/stores/settings'
import { buildReceipt } from '@/lib/receipt'
import { formatRupiah } from '@/lib/money'
import type { Sale } from '@/db/types'"""
)
s = s.replace(
    "const printer = usePrinterStore()",
    """const printer = usePrinterStore()
const sales = useSalesStore()
const settings = useSettingsStore()
const activeTab = ref<'settings' | 'instant'>('settings')
const instantBusy = ref(false)
const instantSaleId = ref<string | null>(null)
const instantMessage = ref('')
const instantSales = computed(() => [...sales.recent].filter((sale) => sale.status === 'completed').sort((a, b) => (b.sold_at ?? 0) - (a.sold_at ?? 0)))"""
)
s = s.replace("  await printer.load()", "  await printer.load()\n  await sales.load()")
fn = """async function printInstantSale(sale: Sale) {
  if (instantBusy.value) return
  instantBusy.value = true
  instantSaleId.value = sale.id
  instantMessage.value = ''
  try {
    const capability = capabilities.get<PrinterCapability>('printer')
    if (!capability || !(await capability.isAvailable())) {
      throw new Error('الطابعة غير جاهزة. اختر الطابعة من إعدادات الطباعة أولاً.')
    }
    const data = await sales.getWithItems(sale.id)
    if (!data.sale || data.sale.status !== 'completed' || !data.items.length) {
      throw new Error('لا توجد أصناف محفوظة لهذه الفاتورة؛ تم إلغاء الطباعة.')
    }
    const width = paperWidth.value
    await capability.print(buildReceipt(data.sale, data.items, {
      storeName: settings.storeName,
      storeOwner: settings.storeOwner,
      width: width === 48 ? 48 : 32,
      pixelWidth: width === 48 ? 576 : 384,
    }))
    instantMessage.value = 'تم إرسال الفاتورة للطابعة مباشرة.'
  } catch (e) {
    instantMessage.value = e instanceof Error ? e.message : 'تعذرت الطباعة الفورية.'
  } finally {
    instantBusy.value = false
    instantSaleId.value = null
  }
}

"""
s = s.replace("async function testPrint() {", fn + "async function testPrint() {")
s = s.replace(
    '    <div class="space-y-4 p-4">',
    """    <div class="grid grid-cols-2 gap-2 border-b border-border bg-card p-3">
      <Button :variant="activeTab === 'settings' ? 'default' : 'outline'" @click="activeTab = 'settings'">إعدادات الطباعة</Button>
      <Button :variant="activeTab === 'instant' ? 'default' : 'outline'" @click="activeTab = 'instant'; sales.load()">الطباعة الفورية</Button>
    </div>
    <div v-if="activeTab === 'settings'" class="space-y-4 p-4">"""
)
old = """    </div>
  </div>
</template>"""
new = """    </div>
    <div v-else class="space-y-3 p-4">
      <div class="rounded-xl border border-border bg-card p-3">
        <p class="text-sm font-semibold">الطباعة الفورية</p>
        <p class="mt-1 text-xs text-muted-foreground">اختر فاتورة مكتملة لإرسالها مباشرة إلى الطابعة الحرارية دون فتح PDF أو معاينة.</p>
      </div>
      <p v-if="instantMessage" class="rounded-lg bg-muted p-3 text-center text-sm">{{ instantMessage }}</p>
      <div v-if="sales.loading" class="p-8 text-center text-sm text-muted-foreground">جارٍ تحميل الفواتير…</div>
      <div v-else-if="instantSales.length" class="space-y-2">
        <Card v-for="sale in instantSales" :key="sale.id">
          <CardContent class="flex items-center gap-3 p-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold">{{ sale.number }}</p>
              <p class="mt-1 text-xs text-muted-foreground">{{ formatDateTime(sale.sold_at ?? sale.created_at) }}</p>
              <p class="mt-1 text-sm font-bold">{{ formatRupiah(sale.total) }}</p>
            </div>
            <Button size="sm" :disabled="instantBusy" @click="printInstantSale(sale)">
              <Loader2 v-if="instantSaleId === sale.id" class="mr-1 size-4 animate-spin" />
              <Printer v-else class="mr-1 size-4" />
              اطبع الآن
            </Button>
          </CardContent>
        </Card>
      </div>
      <div v-else class="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">لا توجد فواتير مكتملة ضمن الفترة الحالية.</div>
    </div>
  </div>
</template>"""
if old not in s:
    raise SystemExit("Cannot find PrinterPage template ending")
s = s.replace(old, new, 1)
p.write_text(s)
print("Instant thermal print tab patched.")
