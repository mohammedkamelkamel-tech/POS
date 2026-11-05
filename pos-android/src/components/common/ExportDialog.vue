<script setup lang="ts">
import { ref, watch } from 'vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import DateRangeFilter from '@/components/common/DateRangeFilter.vue'
import { Button } from '@/components/ui/button'
import { Loader2, FileText } from 'lucide-vue-next'
import { dayKey } from '@/lib/datetime'
import { rangeLabel, type DateRange } from '@/lib/dateRange'
import { exportPdf, type ExportSheet } from '@/lib/pdf'

const props = defineProps<{
  open: boolean
  title: string
  /** بادئة اسم الملف */
  filenameBase: string
  /** Rentang awal (biasanya = rentang aktif halaman). */
  initialRange: DateRange
  /** تجهيز بيانات التقرير للفترة المحددة. */
  buildSheets: (range: DateRange) => Promise<ExportSheet[]>
}>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const range = ref<DateRange>(props.initialRange)
const busy = ref(false)
const error = ref('')

// مزامنة الفترة مع الصفحة عند فتح نافذة التصدير.
watch(
  () => props.open,
  (v) => {
    if (v) {
      range.value = props.initialRange
      error.value = ''
      busy.value = false
    }
  },
)

function close() {
  if (busy.value) return // منع الإغلاق أثناء التصدير
  emit('update:open', false)
}

async function run() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const sheets = await props.buildSheets(range.value)
    const rowCount = sheets.reduce((n, s) => n + s.rows.length, 0)
    if (rowCount === 0) {
      error.value = 'لا توجد بيانات خلال هذه الفترة.'
      return
    }
    const name = `${props.filenameBase}-${dayKey(range.value.from)}_${dayKey(range.value.to)}.pdf`
    await exportPdf(name, props.title, sheets)
    emit('update:open', false)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'فشل التصدير.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <BottomSheet :open="open" :title="title" @update:open="close">
    <div class="space-y-4 px-1 pb-5">
      <p class="px-4 pt-1 text-sm text-muted-foreground">
        حدد الفترة الزمنية ثم صدّر التقرير بصيغة PDF.
      </p>

      <!-- تحديد الفترة الزمنية -->
      <DateRangeFilter :model-value="range" @update:model-value="range = $event" />

      <div class="px-4 text-sm">
        <span class="text-muted-foreground">الفترة: </span>
        <span class="font-medium">{{ rangeLabel(range) }}</span>
      </div>

      <p v-if="error" class="px-4 text-sm text-destructive">{{ error }}</p>

      <div class="flex gap-2 px-4">
        <Button variant="outline" class="flex-1" :disabled="busy" @click="close">إلغاء</Button>
        <Button class="flex-1" :disabled="busy" @click="run">
          <Loader2 v-if="busy" class="mr-1.5 size-4 animate-spin" />
          <FileText v-else class="mr-1.5 size-4" />
          {{ busy ? 'جارٍ التجهيز…' : 'تصدير PDF' }}
        </Button>
      </div>
    </div>
  </BottomSheet>
</template>
