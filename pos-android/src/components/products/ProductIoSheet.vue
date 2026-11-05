<script setup lang="ts">
import { ref, watch } from 'vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import { Button } from '@/components/ui/button'
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Loader2,
  CircleAlert,
  CircleCheck,
} from 'lucide-vue-next'
import { dayKey } from '@/lib/datetime'
import { exportCsv, exportXlsx, readTabular } from '@/lib/xlsx'
import { isCsvFile, pickDataFile } from '@/lib/file'
import { useProductsStore } from '@/stores/products'
import { useCategoriesStore } from '@/stores/categories'
import {
  buildProductSheet,
  buildTemplateSheet,
  parseProductRows,
  type ImportResult,
  type ParseResult,
} from '@/services/products/productIo'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const products = useProductsStore()
const categories = useCategoriesStore()

type Stage = 'idle' | 'reading' | 'preview' | 'importing' | 'done'
const stage = ref<Stage>('idle')
const busyExport = ref(false)
const error = ref('')
const fileName = ref('')
const parsed = ref<ParseResult | null>(null)
const result = ref<ImportResult | null>(null)
const progress = ref(0)

watch(
  () => props.open,
  (v) => {
    if (v) reset()
  },
)

function reset() {
  stage.value = 'idle'
  error.value = ''
  fileName.value = ''
  parsed.value = null
  result.value = null
  progress.value = 0
}

function close() {
  if (stage.value === 'importing' || busyExport.value) return
  emit('update:open', false)
}

// ── تصدير ─────────────────────────────────────────────────────────────────
async function runExport(format: 'xlsx' | 'csv') {
  if (busyExport.value) return
  busyExport.value = true
  error.value = ''
  try {
    const sheet = buildProductSheet(products.items, categories.items)
    if (!sheet.rows.length) {
      error.value = 'لا يوجد بعد من المنتجات لتصديرها.'
      return
    }
    const name = `المنتجات-${dayKey(Date.now())}.${format}`
    if (format === 'csv') await exportCsv(name, sheet)
    else await exportXlsx(name, [sheet])
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'فشل التصدير.'
  } finally {
    busyExport.value = false
  }
}

async function downloadTemplate() {
  if (busyExport.value) return
  busyExport.value = true
  error.value = ''
  try {
    await exportXlsx('قالب-المنتجات.xlsx', [buildTemplateSheet()])
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'فشل إنشاء القالب.'
  } finally {
    busyExport.value = false
  }
}

// ── استيراد ──────────────────────────────────────────────────────────────────
const ACCEPTED_EXTS = ['.csv', '.xlsx']

async function chooseFile() {
  error.value = ''
  const file = await pickDataFile(ACCEPTED_EXTS)
  // null = user menekan إلغاء → diam saja, bukan error.
  if (!file) return
  const name = file.name.toLowerCase()
  if (!ACCEPTED_EXTS.some((ext) => name.endsWith(ext))) {
    error.value = 'يجب أن يكون الملف بصيغة .csv أو .xlsx.'
    return
  }
  fileName.value = file.name
  stage.value = 'reading'
  try {
    const raw = await readTabular(file, isCsvFile(file.name))
    if (!raw.length) {
      error.value = 'الملف فارغ أو لا يحتوي على صف عناوين للأعمدة.'
      stage.value = 'idle'
      return
    }
    parsed.value = await parseProductRows(raw)
    if (!parsed.value.rows.length) {
      error.value = 'لا توجد صفوف قابلة للاستيراد. تحقق من عمود «الاسم».'
    }
    stage.value = 'preview'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'تعذرت قراءة الملف.'
    stage.value = 'idle'
  }
}

async function runImport() {
  const p = parsed.value
  if (!p || !p.rows.length) return
  stage.value = 'importing'
  progress.value = 0
  error.value = ''
  try {
    result.value = await products.bulkImport(p.rows, (done, total) => {
      progress.value = total ? Math.round((done / total) * 100) : 100
    })
    // قد ينشئ الاستيراد تصنيفات جديدة، لذا نحدّث قائمة التصنيفات.
    await categories.load()
    stage.value = 'done'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'فشل الاستيراد.'
    stage.value = 'preview'
  }
}
</script>

<template>
  <BottomSheet :open="open" title="استيراد / تصدير المنتجات" @update:open="close">
    <div class="space-y-5 p-5 pb-6">
      <p v-if="error" class="flex gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
        <CircleAlert class="mt-0.5 size-4 shrink-0" />
        <span>{{ error }}</span>
      </p>

      <!-- تصدير -->
      <section class="space-y-2">
        <h3 class="text-sm font-semibold">تصدير</h3>
        <p class="text-xs text-muted-foreground">
          {{ products.count }} منتجاً سيتم تصديرها مع التصنيفات والباركود.
        </p>
        <div class="flex gap-2">
          <Button variant="outline" class="flex-1 gap-2" :disabled="busyExport" @click="runExport('xlsx')">
            <FileSpreadsheet class="size-4" /> Excel
          </Button>
          <Button variant="outline" class="flex-1 gap-2" :disabled="busyExport" @click="runExport('csv')">
            <FileText class="size-4" /> CSV
          </Button>
        </div>
      </section>

      <div class="h-px bg-border" />

      <!-- استيراد -->
      <section class="space-y-3">
        <h3 class="text-sm font-semibold">استيراد</h3>

        <template v-if="stage === 'idle' || stage === 'reading'">
          <p class="text-xs text-muted-foreground">
            ملفات CSV أو Excel بالأعمدة <b>اسم المنتج</b>، التصنيف, sku, barcode, tipe_barcode,
            harga_jual, harga_modal, lacak_stok, stok, aktif.
            <b>سيتم تخطي الصفوف التي يكون باركودها مسجلاً مسبقاً</b> — المنتجات التي لا تحتوي على باركود
            سيتم استيرادها.
          </p>
          <div class="flex gap-2">
            <Button class="flex-1 gap-2" :disabled="stage === 'reading'" @click="chooseFile">
              <Loader2 v-if="stage === 'reading'" class="size-4 animate-spin" />
              <Upload v-else class="size-4" />
              {{ stage === 'reading' ? 'جارٍ القراءة…' : 'اختيار ملف' }}
            </Button>
            <Button variant="ghost" size="icon" title="تنزيل قالب" :disabled="busyExport" @click="downloadTemplate">
              <Download class="size-4" />
            </Button>
          </div>
        </template>

        <!-- Pratinjau sebelum menulis apa pun ke DB -->
        <template v-else-if="stage === 'preview' && parsed">
          <p class="truncate text-xs text-muted-foreground">{{ fileName }}</p>
          <div class="rounded-xl border border-border p-3 text-sm">
            <p><b>{{ parsed.rows.length }}</b> baris siap diimpor</p>
            <p v-if="parsed.errors.length" class="mt-1 text-destructive">
              {{ parsed.errors.length }} صفاً به أخطاء (تم تخطيه)
            </p>
            <ul v-if="parsed.errors.length" class="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              <li v-for="e in parsed.errors.slice(0, 20)" :key="e.line">
                الصف {{ e.line }}: {{ e.message }}
              </li>
              <li v-if="parsed.errors.length > 20">…و{{ parsed.errors.length - 20 }} أخطاء أخرى</li>
            </ul>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" class="flex-1" @click="reset">إلغاء</Button>
            <Button class="flex-1" :disabled="!parsed.rows.length" @click="runImport">
              استيراد {{ parsed.rows.length }} Baris
            </Button>
          </div>
        </template>

        <template v-else-if="stage === 'importing'">
          <div class="flex items-center gap-3 py-2">
            <Loader2 class="size-5 animate-spin text-muted-foreground" />
            <div class="flex-1">
              <p class="text-sm">جارٍ الاستيراد… {{ progress }}%</p>
              <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div class="h-full bg-primary transition-all" :style="{ width: progress + '%' }" />
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="stage === 'done' && result">
          <div class="flex gap-2 rounded-xl bg-success/10 p-3 text-sm">
            <CircleCheck class="mt-0.5 size-4 shrink-0 text-success" />
            <div>
              <p><b>{{ result.imported }}</b> منتجاً تم استيراده</p>
              <p v-if="result.skippedDuplicate" class="text-muted-foreground">
                {{ result.skippedDuplicate }} dilewati (barcode sudah ada)
              </p>
              <p v-if="result.createdCategories" class="text-muted-foreground">
                {{ result.createdCategories }} تصنيفاً جديداً تم إنشاؤه
              </p>
              <p v-if="result.errors.length" class="text-destructive">
                {{ result.errors.length }} صفاً تعذر حفظها
              </p>
            </div>
          </div>
          <Button class="w-full" @click="close">Selesai</Button>
        </template>
      </section>
    </div>
  </BottomSheet>
</template>
