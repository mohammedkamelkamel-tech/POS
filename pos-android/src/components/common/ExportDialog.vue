<script setup lang="ts">
import { ref, watch } from 'vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import DateRangeFilter from '@/components/common/DateRangeFilter.vue'
import { Button } from '@/components/ui/button'
import { Loader2, FileSpreadsheet } from 'lucide-vue-next'
import { dayKey } from '@/lib/datetime'
import { rangeالتسمية, type DateRange } from '@/lib/dateRange'
import { exportXlsx, type ExportSheet } from '@/lib/xlsx'

const props = defineProps<{
  open: boolean
  title: string
  /** Prefix nama file, mis. "عملية بيع" → عملية بيع-2026-08-01_2026-08-05.xlsx */
  filenameBase: string
  /** Rentang awal (biasanya = rentang aktif halaman). */
  initialRange: DateRange
  /** Bangun sheet-sheet Excel untuk rentang terpilih. */
  buildSheets: (range: DateRange) => Promise<ExportSheet[]>
}>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const range = ref<DateRange>(props.initialRange)
const busy = ref(false)
const error = ref('')

// Setiap dibuka, samakan rentang dengan rentang aktif halaman & reset status.
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
  if (busy.value) return // jangan tutup saat sedang proses
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
    const name = `${props.filenameBase}-${dayKey(range.value.from)}_${dayKey(range.value.to)}.xlsx`
    await exportXlsx(name, sheets)
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
        اختر نطاق التاريخ، ثم صدّر البيانات إلى ملف Excel (.xlsx).
      </p>

      <!-- Filter tanggal (sama seperti di halaman) -->
      <DateRangeFilter :model-value="range" @update:model-value="range = $event" />

      <div class="px-4 text-sm">
        <span class="text-muted-foreground">الفترة: </span>
        <span class="font-medium">{{ rangeالتسمية(range) }}</span>
      </div>

      <p v-if="error" class="px-4 text-sm text-destructive">{{ error }}</p>

      <div class="flex gap-2 px-4">
        <Button variant="outline" class="flex-1" :disabled="busy" @click="close">إلغاء</Button>
        <Button class="flex-1" :disabled="busy" @click="run">
          <Loader2 v-if="busy" class="mr-1.5 size-4 animate-spin" />
          <FileSpreadsheet v-else class="mr-1.5 size-4" />
          {{ busy ? 'جارٍ التجهيز…' : 'تصدير Excel' }}
        </Button>
      </div>
    </div>
  </BottomSheet>
</template>
