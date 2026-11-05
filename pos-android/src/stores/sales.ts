import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDb } from '@/db/sqlite'
import { SaleRepository, type DatedSale } from '@/repositories/sale.repo'
import { SaleItemRepository } from '@/repositories/saleItem.repo'
import {
  CheckoutService,
  type CheckoutInput,
  type CheckoutResult,
  type CompleteOpenBillInput,
  type HoldOpenBillInput,
  type OpenBillAccessInput,
  type ReholdOpenBillInput,
} from '@/services/checkout.service'
import type { Sale, SaleItem } from '@/db/types'
import { presetRange, type DateRange } from '@/lib/dateRange'
import { formatDateTime } from '@/lib/datetime'
import type { ExportSheet } from '@/lib/xlsx'

export const useSalesStore = defineStore('sales', () => {
  const recent = ref<DatedSale[]>([])
  const openBills = ref<Sale[]>([])
  const loading = ref(false)
  // Default: bulan berjalan. Semua isi `recent` selalu dalam rentang ini.
  const range = ref<DateRange>(presetRange('month'))

  function saleRepo() {
    return new SaleRepository(getDb())
  }
  function itemRepo() {
    return new SaleItemRepository(getDb())
  }

  // Ringkasan atas = agregat rentang aktif (recent sudah ter-filter rentang).
  const summary = computed(() => {
    const rows = recent.value.filter((s) => s.status === 'completed')
    return {
      count: rows.length,
      total: rows.reduce((sum, s) => sum + s.total, 0),
    }
  })

  async function load() {
    loading.value = true
    const [datedSales, open] = await Promise.all([
      saleRepo().listBetween(range.value.from, range.value.to),
      saleRepo().listOpenBills(),
    ])
    recent.value = datedSales
    openBills.value = open
    loading.value = false
  }

  async function setRange(r: DateRange) {
    range.value = r
    await load()
  }

  async function getWithItems(
    id: string,
  ): Promise<{ sale: Sale | null; items: SaleItem[] }> {
    const sale = await saleRepo().findById(id)
    const items = sale ? await itemRepo().bySale(id) : []
    return { sale, items }
  }

  async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
    const res = await new CheckoutService(getDb()).checkout(input)
    await load()
    return res
  }

  async function hold(input: HoldOpenBillInput): Promise<CheckoutResult> {
    const res = await new CheckoutService(getDb()).hold(input)
    await load()
    return res
  }

  function resume(input: OpenBillAccessInput): Promise<CheckoutResult> {
    return new CheckoutService(getDb()).resume(input)
  }

  async function rehold(input: ReholdOpenBillInput): Promise<CheckoutResult> {
    const res = await new CheckoutService(getDb()).rehold(input)
    await load()
    return res
  }

  async function discard(input: OpenBillAccessInput): Promise<void> {
    await new CheckoutService(getDb()).discard(input)
    await load()
  }

  async function completeOpenBill(input: CompleteOpenBillInput): Promise<CheckoutResult> {
    const res = await new CheckoutService(getDb()).completeOpenBill(input)
    await load()
    return res
  }

  // Bangun sheet Excel untuk rentang (independen dari `range` halaman).
  async function buildExport(r: DateRange): Promise<ExportSheet[]> {
    const sales = await saleRepo().listBetween(r.from, r.to, 100000)
    const items = await itemRepo().listBetween(r.from, r.to)
    const txRows = sales.map((s) => ({
      التاريخ: formatDateTime(s.sold_at),
      'رقم الفاتورة': s.number,
      'طريقة الدفع': ({ cash: 'نقداً', qris: 'رمز QR', transfer: 'تحويل بنكي' }[s.payment_method] ?? s.payment_method),
      الحالة: s.status === 'completed' ? 'مكتملة' : 'ملغاة',
      'المجموع الفرعي': s.subtotal,
      الخصم: s.discount,
      الضريبة: s.tax,
      الإجمالي: s.total,
      المدفوع: s.paid,
      الباقي: s.change_due,
    }))
    const itemRows = items.map((it) => ({
      التاريخ: formatDateTime(it.sold_at),
      'رقم الفاتورة': it.number,
      الصنف: it.name_snapshot,
      السعر: it.price_snapshot,
      الكمية: it.qty,
      الخصم: it.discount,
      'المجموع الفرعي': it.line_total,
    }))
    return [
      { name: 'الفواتير', rows: txRows },
      { name: 'تفاصيل الأصناف', rows: itemRows },
    ]
  }

  return {
    recent,
    openBills,
    loading,
    range,
    summary,
    load,
    setRange,
    getWithItems,
    checkout,
    hold,
    resume,
    rehold,
    discard,
    completeOpenBill,
    buildExport,
  }
})
