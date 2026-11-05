<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import { Button } from '@/components/ui/button'
import MoneyInput from '@/components/common/MoneyInput.vue'
import { Banknote, QrCode, ArrowLeftRight, Loader2 } from 'lucide-vue-next'
import { formatRupiah } from '@/lib/money'
import { useSettingsStore } from '@/stores/settings'
import { makeDynamicPayload, encodeQrToDataUrl } from '@/lib/qris'
import { pickImage, downscale } from '@/lib/image'
import { useMediaStore } from '@/stores/media'

const settings = useSettingsStore()
const media = useMediaStore()

const props = defineProps<{ open: boolean; total: number; busy?: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [payload: { paid: number; paymentMethod: string; paymentBank?: string; paymentProofPath?: string }]
}>()

type Method = string
const METHODS: Array<{ id: Method; label: string; icon: typeof Banknote }> = [
  { id: 'cash', label: 'نقداً', icon: Banknote },
  { id: 'qris', label: 'رمز QR', icon: QrCode },
  { id: 'transfer', label: 'تحويل بنكي', icon: ArrowLeftRight },
  { id: 'wallet:jeeb', label: 'محفظة جيب', icon: Banknote },
  { id: 'wallet:jwali', label: 'محفظة جوالي', icon: Banknote },
  { id: 'wallet:onecash', label: 'محفظة ون كاش', icon: Banknote },
  { id: 'wallet:flousak', label: 'محفظة فلوسك', icon: Banknote },
  { id: 'wallet:omflous', label: 'محفظة أم فلوس', icon: Banknote },
  { id: 'wallet:mahfazati', label: 'محفظة محفظتي', icon: Banknote },
  { id: 'wallet:pees', label: 'محفظة بيس', icon: Banknote },
  { id: 'wallet:shamil', label: 'شامل موني', icon: Banknote },
  { id: 'wallet:sabacash', label: 'سبأ كاش', icon: Banknote },
  { id: 'wallet:mobilemoney', label: 'موبايل موني', icon: Banknote },
  { id: 'wallet:yemenwallet', label: 'يمن والت', icon: Banknote },
  { id: 'wallet:aldawli', label: 'الدولي موني', icon: Banknote },
  { id: 'wallet:wecash', label: 'وي كاش', icon: Banknote },
  { id: 'wallet:reyalmobile', label: 'ريال موبايل', icon: Banknote },
]

const method = ref<Method>('cash')
const paid = ref(0)
const paymentBank = ref('')
const paymentProofPath = ref('')
const paymentProofPreview = ref<string | null>(null)
const proofBusy = ref(false)
const banks = ['بنك الكريمي', 'بنك التسليف التعاوني والزراعي (كاك بنك)', 'بنك التضامن', 'بنك اليمن والكويت', 'البنك اليمني للإنشاء والتعمير', 'بنك الأمل', 'بنك آخر']

// رمز QR: QR di-generate saat metode رمز QR dipilih & رمز QR statis sudah di-upload.
// - dinamis aktif → payload di-inject nominal tagihan (scan langsung jumlah pas)
// - dinamis mati  → tampilkan رمز QR statis apa adanya (pembeli ketik nominal)
const qrDataUrl = ref<string | null>(null)
const qrLoading = ref(false)
const hasQris = computed(() => !!settings.qrisPayload)
const qrisDynamicReady = computed(() => settings.qrisDynamic && hasQris.value)
const showQris = computed(() => method.value === 'qris' && hasQris.value)

// Reset tiap kali dialog dibuka.
watch(
  () => props.open,
  (v) => {
    if (v) {
      method.value = 'cash'
      paid.value = 0
      paymentBank.value = ''
      paymentProofPath.value = ''
      paymentProofPreview.value = null
    }
  },
)

// Generate QR dinamis tiap metode رمز QR aktif / total berubah / dialog dibuka.
watch([method, () => props.total, () => props.open], () => {
  if (props.open) void genQr()
})

async function genQr() {
  qrDataUrl.value = null
  if (method.value !== 'qris' || !hasQris.value) return
  qrLoading.value = true
  try {
    // Dinamis: suntik nominal. Statis: pakai payload apa adanya.
    const payload =
      qrisDynamicReady.value && props.total > 0
        ? makeDynamicPayload(settings.qrisPayload!, props.total)
        : settings.qrisPayload!
    qrDataUrl.value = await encodeQrToDataUrl(payload)
  } catch {
    qrDataUrl.value = null
  } finally {
    qrLoading.value = false
  }
}

function cancel() {
  emit('update:open', false)
}

// Saran nominal tunai: uang pas + pembulatan ke atas.
const quickAmounts = computed(() => {
  const t = props.total
  const set = new Set<number>([t])
  for (const step of [5000, 10000, 20000, 50000, 100000]) {
    set.add(Math.ceil(t / step) * step)
  }
  return Array.from(set)
    .filter((n) => n >= t)
    .sort((a, b) => a - b)
    .slice(0, 6)
})

const effectivePaid = computed(() => (method.value === 'cash' ? paid.value : props.total))
const change = computed(() => Math.max(0, effectivePaid.value - props.total))
const canConfirm = computed(
  () => !props.busy && (method.value !== 'cash' || paid.value >= props.total) && (method.value !== 'transfer' || (!!paymentBank.value && !!paymentProofPath.value && !proofBusy.value)),
)

async function chooseTransferProof() {
  const selected = await pickImage()
  if (!selected) return
  proofBusy.value = true
  try {
    const image = await downscale(selected, { maxDim: 1200, quality: 0.78 })
    paymentProofPath.value = await media.save(image)
    paymentProofPreview.value = media.url(paymentProofPath.value)
  } finally { proofBusy.value = false }
}

function confirm() {
  if (!canConfirm.value) return
  emit('confirm', { paid: effectivePaid.value, paymentMethod: method.value, ...(method.value === 'transfer' ? { paymentBank: paymentBank.value, paymentProofPath: paymentProofPath.value } : {}) })
}
</script>

<template>
  <BottomSheet :open="open" title="الدفع" @update:open="emit('update:open', $event)">
    <div class="space-y-5 p-5">
      <!-- إجمالي الفاتورة -->
      <div class="rounded-2xl bg-primary/10 p-4 text-center">
        <p class="text-xs font-medium text-muted-foreground">إجمالي الفاتورة</p>
        <p class="mt-1 text-3xl font-bold text-primary">{{ formatRupiah(total) }}</p>
      </div>

      <!-- طريقة الدفع -->
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          v-for="m in METHODS"
          :key="m.id"
          type="button"
          class="flex flex-col items-center gap-1.5 rounded-xl border p-3 transition"
          :class="method === m.id ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground'"
          @click="method = m.id"
        >
          <component :is="m.icon" class="size-5" />
          <span class="text-xs font-medium">{{ m.label }}</span>
        </button>
      </div>

      <!-- إدخال المبلغ النقدي -->
      <template v-if="method === 'cash'">
        <div class="space-y-2">
          <p class="text-xs font-medium text-muted-foreground">المبلغ المستلم</p>
          <MoneyInput v-model="paid" class="h-12 text-lg font-semibold" />
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="amt in quickAmounts"
              :key="amt"
              type="button"
              class="rounded-lg border border-border py-2 text-xs font-medium transition active:scale-95"
              :class="paid === amt ? 'border-primary bg-primary/5 text-primary' : 'text-foreground'"
              @click="paid = amt"
            >
              {{ amt === total ? 'المبلغ بالكامل' : formatRupiah(amt) }}
            </button>
          </div>
        </div>
      </template>
      <template v-else-if="method === 'transfer'">
        <div class="space-y-3 rounded-xl border border-border p-3">
          <label class="block space-y-1.5 text-sm font-medium">البنك الذي تم التحويل إليه
            <select v-model="paymentBank" class="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm">
              <option value="" disabled>اختر البنك</option>
              <option v-for="bank in banks" :key="bank" :value="bank">{{ bank }}</option>
            </select>
          </label>
          <div class="space-y-2">
            <p class="text-sm font-medium">صورة إشعار التحويل</p>
            <img v-if="paymentProofPreview" :src="paymentProofPreview" alt="إشعار التحويل" class="max-h-44 w-full rounded-lg border border-border object-contain" />
            <Button type="button" variant="outline" class="w-full gap-2" :disabled="proofBusy" @click="chooseTransferProof">{{ proofBusy ? 'جارٍ تجهيز الصورة…' : paymentProofPath ? 'تغيير صورة الإشعار' : 'تصوير أو اختيار إشعار التحويل' }}</Button>
          </div>
          <p class="text-xs text-muted-foreground">لن يكتمل تسجيل التحويل حتى تحدد البنك وترفق صورة الإشعار.</p>
        </div>
      </template>
      <!-- رمز QR: tampilkan QR untuk di-scan (statis apa adanya / dinamis nominal pas) -->
      <div v-else-if="showQris" class="space-y-3 text-center">
        <div class="mx-auto flex size-56 items-center justify-center rounded-2xl border border-border bg-white p-2">
          <Loader2 v-if="qrLoading" class="size-6 animate-spin text-muted-foreground" />
          <img v-else-if="qrDataUrl" :src="qrDataUrl" alt="رمز QR" class="size-full object-contain" />
          <span v-else class="px-4 text-xs text-destructive">تعذر إنشاء رمز QR. تحقق من إعدادات رمز QR.</span>
        </div>
        <p v-if="qrisDynamicReady" class="text-xs text-muted-foreground">
          امسح رمز QR لإتمام الدفع؛ المبلغ محدد مسبقاً
          <span class="font-semibold text-foreground">{{ formatRupiah(total) }}</span>.
        </p>
        <p v-else class="text-xs text-muted-foreground">
          امسح رمز QR ثم أدخل المبلغ
          <span class="font-semibold text-foreground">{{ formatRupiah(total) }}</span> يدوياً.
        </p>
      </div>
      <p v-else class="text-center text-xs text-muted-foreground">
        تُعدّ المدفوعات غير النقدية مسددة بالكامل بقيمة الإجمالي.
      </p>

      <!-- الباقي -->
      <div v-if="method === 'cash'" class="flex items-center justify-between px-1">
        <span class="text-sm text-muted-foreground">الباقي</span>
        <span class="text-lg font-bold" :class="change > 0 ? 'text-success' : ''">
          {{ formatRupiah(change) }}
        </span>
      </div>

      <!-- رمز QR: pembeli scan dulu, kasir konfirmasi "تم الدفع" / batal -->
      <div v-if="showQris" class="grid grid-cols-2 gap-2">
        <Button variant="outline" class="h-12 text-base" :disabled="busy" @click="cancel">
          إلغاء
        </Button>
        <Button class="h-12 gap-2 text-base" :disabled="!canConfirm" @click="confirm">
          <Loader2 v-if="busy" class="size-4 animate-spin" />
          {{ busy ? 'جارٍ المعالجة…' : 'تم الدفع' }}
        </Button>
      </div>
      <Button v-else class="h-12 w-full gap-2 text-base" :disabled="!canConfirm" @click="confirm">
        <Loader2 v-if="busy" class="size-4 animate-spin" />
        {{ busy ? 'جارٍ المعالجة…' : 'إتمام الدفع' }}
      </Button>
    </div>
  </BottomSheet>
</template>
