<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import DateRangeFilter from '@/components/common/DateRangeFilter.vue'
import ExportDialog from '@/components/common/ExportDialog.vue'
import { Badge } from '@/components/ui/badge'
import { Receipt, ChevronRight, Download } from 'lucide-vue-next'
import { useSalesStore } from '@/stores/sales'
import { formatRupiah } from '@/lib/money'
import { formatTime, formatDate, dayKey } from '@/lib/datetime'
import { rangeLabel } from '@/lib/dateRange'
import type { Sale } from '@/db/types'

const sales = useSalesStore()
const { recent, openBills, summary, range } = storeToRefs(sales)

const label = computed(() => rangeLabel(range.value))

const exportOpen = ref(false)

const PAY_LABEL: Record<string, string> = { cash: 'نقداً', qris: 'QRIS', transfer: 'تحويل' }

function activityTime(sale: Sale): number {
  if (sale.status === 'open') return sale.opened_at ?? sale.created_at
  return sale.sold_at ?? sale.created_at
}

const visibleSales = computed<Sale[]>(() =>
  [...openBills.value, ...recent.value].sort((left, right) => activityTime(right) - activityTime(left)),
)

// Kelompokkan per hari buat header tanggal.
const groups = computed(() => {
  const map = new Map<string, { key: string; label: string; rows: Sale[] }>()
  for (const sale of visibleSales.value) {
    const time = activityTime(sale)
    const key = dayKey(time)
    const group = map.get(key)
    if (group) {
      group.rows.push(sale)
      continue
    }
    map.set(key, { key, label: formatDate(time), rows: [sale] })
  }
  return Array.from(map.values()).map((group) => ({
    ...group,
    total: group.rows.reduce((sum, sale) => sum + (sale.status === 'completed' ? sale.total : 0), 0),
  }))
})

onMounted(() => sales.load())
</script>

<template>
  <div>
    <AppHeader title="الفواتير" :subtitle="`${label}: ${summary.count} فاتورة`">
      <template #actions>
        <button
          class="flex size-9 items-center justify-center rounded-full text-foreground hover:bg-accent"
          aria-label="تصدير الفواتير"
          @click="exportOpen = true"
        >
          <Download class="size-5" />
        </button>
      </template>
    </AppHeader>

    <!-- Filter tanggal -->
    <DateRangeFilter
      :model-value="range"
      @update:model-value="sales.setRange($event)"
    />

    <!-- Ringkasan rentang aktif -->
    <div class="border-b border-border bg-gradient-to-br from-hero to-hero/90 px-5 py-5 text-hero-foreground">
      <p class="text-xs opacity-80">المبيعات · {{ label }}</p>
      <p class="mt-1 text-2xl font-bold">{{ formatRupiah(summary.total) }}</p>
      <p class="mt-0.5 text-xs opacity-80">{{ summary.count }} فاتورة</p>
    </div>

    <template v-if="visibleSales.length">
      <section v-for="g in groups" :key="g.key">
        <div class="flex items-center justify-between bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <span>{{ g.label }}</span>
          <span>{{ formatRupiah(g.total) }}</span>
        </div>
        <div class="divide-y divide-border">
          <RouterLink
            v-for="s in g.rows"
            :key="s.id"
            :to="`/transactions/${s.id}`"
            class="flex items-center gap-3 px-4 py-3 transition active:bg-accent"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt class="size-5" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">
                {{ s.status === 'open' ? s.open_bill_label ?? 'بدون تسمية' : s.number }}
              </p>
              <div class="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{{ formatTime(activityTime(s)) }}</span>
                <span>·</span>
                <span v-if="s.status === 'open'">معلقة · {{ s.number }}</span>
                <span v-else>{{ PAY_LABEL[s.payment_method] ?? s.payment_method }}</span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold">{{ formatRupiah(s.total) }}</p>
              <Badge v-if="s.status === 'open'" variant="warning" class="mt-0.5">فاتورة معلقة</Badge>
              <Badge v-if="s.status === 'void'" variant="secondary" class="mt-0.5">ملغاة</Badge>
            </div>
            <ChevronRight class="size-4 text-muted-foreground" />
          </RouterLink>
        </div>
      </section>
    </template>

    <EmptyState
      v-else
      :icon="Receipt"
      title="لا توجد فواتير"
      :description="`لا توجد فواتير خلال الفترة ${label.toLowerCase()}. جرّب تغيير نطاق التاريخ.`"
    />

    <ExportDialog
      v-model:open="exportOpen"
      title="تصدير الفواتير"
      filename-base="الفواتير"
      :initial-range="range"
      :build-sheets="sales.buildExport"
    />
  </div>
</template>
