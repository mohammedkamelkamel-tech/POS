<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import AppHeader from '@/components/layout/AppHeader.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import BottomSheet from '@/components/common/BottomSheet.vue'
import PinPad from '@/components/common/PinPad.vue'
import {
  Store, Lock, Moon, Cloud, Smartphone, Save, ImagePlus, Sparkles, Check,
  QrCode, Loader2, KeyRound, LockKeyhole,
} from 'lucide-vue-next'
import { useSettingsStore, type SplashBg } from '@/stores/settings'
import { useMediaStore } from '@/stores/media'
import { useAuthStore } from '@/stores/auth'
import { useAccountStore } from '@/stores/account'
import { pickImage, downscale } from '@/lib/image'
import { decodeQrFromDataUrl, encodeQrToDataUrl, isValidQris } from '@/lib/qris'
import { deviceBiometric } from '@/services/auth/deviceBiometric'

const settings = useSettingsStore()
const media = useMediaStore()
const auth = useAuthStore()
const account = useAccountStore()
const router = useRouter()
const { storeName, storeOwner, storeLogo, loginEnabled, hasPin, theme, devicePrefix,
  splashEnabled, splashBg, qrisPayload, qrisDynamic, biometricEnabled } = storeToRefs(settings)

const name = ref('')
const owner = ref('')
const savingProfile = ref(false)
const savedFlash = ref(false)
const logoBusy = ref(false)
const qrisBusy = ref(false)
const qrisError = ref('')
const qrisPreview = ref<string | null>(null)
const biometricAvailable = ref(false)
const biometricError = ref('')

const SPLASH_BGS: Array<{ id: SplashBg; label: string; swatch: string }> = [
  { id: 'brand', label: 'الهوية', swatch: 'bg-gradient-to-b from-hero to-hero/80' },
  { id: 'light', label: 'فاتح', swatch: 'bg-background border border-border' },
  { id: 'dark', label: 'داكن', swatch: 'bg-slate-900' },
]

onMounted(async () => {
  name.value = storeName.value
  owner.value = storeOwner.value
  if (storeLogo.value) media.ensure([storeLogo.value])
  await renderQrisPreview()
  biometricAvailable.value = await deviceBiometric.isAvailable()
})

async function renderQrisPreview() {
  qrisPreview.value = qrisPayload.value ? await encodeQrToDataUrl(qrisPayload.value) : null
}

async function chooseQris() {
  const dataUrl = await pickImage()
  if (!dataUrl) return
  qrisBusy.value = true
  qrisError.value = ''
  try {
    const payload = await decodeQrFromDataUrl(dataUrl)
    if (!payload) {
      qrisError.value = 'تعذر قراءة رمز QR. جرّب صورة أوضح وأكبر.'
      return
    }
    if (!isValidQris(payload)) {
      qrisError.value = 'يبدو أن الصورة ليست رمز QR ثابتاً صالحاً.'
      return
    }
    await settings.setQris(payload)
    await renderQrisPreview()
  } finally {
    qrisBusy.value = false
  }
}

async function removeQris() {
  await settings.setQris(null)
  qrisPreview.value = null
  qrisError.value = ''
}

async function chooseLogo() {
  const dataUrl = await pickImage()
  if (!dataUrl) return
  logoBusy.value = true
  try {
    // نحافظ على شفافية الشعار مع تصغيره إلى 256 بكسل.
    const img = await downscale(dataUrl, { maxDim: 256, mime: 'image/png' })
    const ref_ = await media.save(img)
    await settings.setLogo(ref_) // langsung ke-update di Home & splash
  } finally {
    logoBusy.value = false
  }
}

async function removeLogo() {
  await settings.setLogo(null)
}

async function saveProfile() {
  savingProfile.value = true
  await settings.setProfile(name.value.trim() || 'الكامل-كاشير', owner.value.trim())
  savingProfile.value = false
  savedFlash.value = true
  setTimeout(() => (savedFlash.value = false), 1500)
}

// --- Kunci PIN (Phase 5) ---
const pinSheetOpen = ref(false)
const pinMode = ref<'set' | 'change'>('set') // 'set' = sekalian aktifkan login
const pinStep = ref<'enter' | 'confirm'>('enter')
const pinValue = ref('')
const pinFirst = ref('')
const pinError = ref(false)

const PIN_LEN = 6

function openPinSheet(mode: 'set' | 'change') {
  pinMode.value = mode
  pinStep.value = 'enter'
  pinValue.value = ''
  pinFirst.value = ''
  pinError.value = false
  pinSheetOpen.value = true
}

async function onToggleLogin(v: boolean) {
  if (v) {
    // Nyalakan login butuh PIN dulu — login baru aktif setelah PIN dibuat.
    if (hasPin.value) await settings.setLoginEnabled(true)
    else openPinSheet('set')
  } else {
    await auth.disableLogin() // matikan + bersihkan PIN
  }
}

async function onPinComplete(value: string) {
  if (pinStep.value === 'enter') {
    pinFirst.value = value
    pinValue.value = ''
    pinStep.value = 'confirm'
    return
  }
  // Tahap konfirmasi.
  if (value !== pinFirst.value) {
    pinError.value = true
    setTimeout(() => {
      pinValue.value = ''
      pinFirst.value = ''
      pinStep.value = 'enter'
      pinError.value = false
    }, 600)
    return
  }
  await auth.setPin(value)
  if (pinMode.value === 'set') await auth.enableLogin()
  pinSheetOpen.value = false
}

async function onToggleBiometric(enabled: boolean) {
  biometricError.value = ''
  if (enabled && !biometricAvailable.value) {
    biometricError.value = 'ميزة البصمة غير متاحة. تأكد من تسجيل بصمة في إعدادات الجهاز.'
    return
  }
  await settings.setBiometricEnabled(enabled)
}

function lockNow() {
  auth.lock()
  router.push('/lock')
}
</script>

<template>
  <div>
    <AppHeader title="الحساب والإعدادات" />
    <div class="space-y-5 p-4">
      <!-- الكامل برو / الخدمات السحابية (paling atas) -->
      <section class="space-y-3">
        <p class="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          الخدمات السحابية
        </p>
        <Card class="border-primary/30 bg-primary/5">
          <CardContent class="space-y-3 p-4">
            <div class="flex items-center gap-3">
              <div class="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Cloud class="size-5" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-semibold">الكامل برو</p>
                <p class="text-xs text-muted-foreground">
                  تسجيل الدخول والنسخ الاحتياطي ومزامنة البيانات سحابياً
                </p>
              </div>
              <Badge :variant="account.isAuthenticated ? 'success' : 'secondary'">
                {{ account.isAuthenticated ? 'متصل' : 'غير متصل' }}
              </Badge>
            </div>
            <Button variant="outline" class="w-full" @click="router.push('/connect')">
              {{ account.isAuthenticated ? 'إدارة الاتصال' : 'ربط الحساب' }}
            </Button>
          </CardContent>
        </Card>
      </section>

      <!-- بيانات المتجر -->
      <section class="space-y-3">
        <p class="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          بيانات المتجر
        </p>
        <Card>
          <CardContent class="space-y-4 p-4">
            <!-- شعار المتجر -->
            <div class="flex items-center gap-4">
              <div class="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white p-2 text-primary">
                <img
                  v-if="media.url(storeLogo)"
                  :src="media.url(storeLogo)!"
                  alt="شعار المتجر"
                  class="max-h-full max-w-full object-contain"
                />
                <Store v-else class="size-6" />
              </div>
              <div class="space-y-1.5">
                <p class="text-sm font-medium">شعار المتجر</p>
                <p class="text-xs text-muted-foreground">يظهر في الصفحة الرئيسية وشاشة البداية.</p>
                <div class="flex items-center gap-2 pt-0.5">
                  <Button type="button" variant="outline" size="sm" class="gap-1.5" :disabled="logoBusy" @click="chooseLogo">
                    <ImagePlus class="size-3.5" />
                    {{ media.url(storeLogo) ? 'تغيير' : 'إضافة' }}
                  </Button>
                  <Button v-if="media.url(storeLogo)" type="button" variant="ghost" size="sm" class="text-destructive" @click="removeLogo">
                    حذف
                  </Button>
                </div>
              </div>
            </div>
            <div class="space-y-1.5">
              <Label for="store-name">اسم المتجر</Label>
              <Input id="store-name" v-model="name" placeholder="الكامل-كاشير" />
            </div>
            <div class="space-y-1.5">
              <Label for="store-owner">المالك</Label>
              <Input id="store-owner" v-model="owner" placeholder="اسم المالك" />
            </div>
            <Button class="w-full gap-2" :disabled="savingProfile" @click="saveProfile">
              <Save class="size-4" />
              {{ savedFlash ? 'تم الحفظ!' : 'حفظ بيانات المتجر' }}
            </Button>
          </CardContent>
        </Card>
      </section>

      <!-- الدفع عبر QR -->
      <section class="space-y-3">
        <p class="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          الدفع عبر QR
        </p>
        <Card>
          <CardContent class="space-y-4 p-4">
            <!-- رفع رمز QR statis -->
            <div class="flex items-center gap-4">
              <div class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-white text-muted-foreground">
                <img v-if="qrisPreview" :src="qrisPreview" alt="رمز QR" class="size-full object-contain p-0.5" />
                <QrCode v-else class="size-6" />
              </div>
              <div class="min-w-0 flex-1 space-y-1.5">
                <p class="text-sm font-medium">رمز QR الثابت للمتجر</p>
                <p class="text-xs text-muted-foreground">
                  ارفع صورة رمز QR الخاص بالمتجر مرة واحدة لاستخدامها في استقبال المدفوعات.
                </p>
                <div class="flex items-center gap-2 pt-0.5">
                  <Button type="button" variant="outline" size="sm" class="gap-1.5" :disabled="qrisBusy" @click="chooseQris">
                    <Loader2 v-if="qrisBusy" class="size-3.5 animate-spin" />
                    <ImagePlus v-else class="size-3.5" />
                    {{ qrisPayload ? 'تغيير' : 'رفع رمز QR' }}
                  </Button>
                  <Button v-if="qrisPayload" type="button" variant="ghost" size="sm" class="text-destructive" @click="removeQris">
                    حذف
                  </Button>
                </div>
              </div>
            </div>
            <p v-if="qrisError" class="text-xs text-destructive">{{ qrisError }}</p>

            <!-- Toggle dinamis -->
            <div class="flex items-start gap-3 border-t border-border pt-4">
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <QrCode class="size-5" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium">رمز QR المتغير</p>
                <p class="text-xs text-muted-foreground">
                  عند الدفع باستخدام رمز QR، يُدرج مبلغ الفاتورة تلقائياً في الرمز ليتمكن العميل من مسحه والدفع بالمبلغ الصحيح دون إدخاله يدوياً.
                </p>
              </div>
              <Switch
                :model-value="qrisDynamic"
                :disabled="!qrisPayload"
                @update:model-value="settings.setQrisDynamic($event)"
              />
            </div>
            <p v-if="!qrisPayload" class="text-xs text-muted-foreground">
              ارفع رمز QR ثابتاً أولاً لتفعيل الوضع المتغير.
            </p>
          </CardContent>
        </Card>
      </section>

      <!-- Keamanan -->
      <section class="space-y-3">
        <p class="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          الأمان والحماية
        </p>
        <Card>
          <CardContent class="divide-y divide-border p-0">
            <div class="flex items-center gap-3 p-4">
              <div class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Lock class="size-5" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium">تفعيل تسجيل الدخول</p>
                <p class="text-xs text-muted-foreground">
                  معطّل افتراضياً. يمكنك حماية التطبيق برقم سري من 6 أرقام.
                </p>
              </div>
              <Switch :model-value="loginEnabled" @update:model-value="onToggleLogin" />
            </div>
            <button
              v-if="loginEnabled && hasPin"
              type="button"
              class="flex w-full items-center gap-3 p-4 text-left transition active:bg-accent"
              @click="openPinSheet('change')"
            >
              <div class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <KeyRound class="size-5" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium">تغيير الرقم السري</p>
                <p class="text-xs text-muted-foreground">تغيير الرقم السري المكوّن من 6 أرقام</p>
              </div>
            </button>
            <div v-if="loginEnabled && hasPin" class="flex items-center gap-3 p-4">
              <div class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <LockKeyhole class="size-5" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium">الدخول بالبصمة</p>
                <p class="text-xs text-muted-foreground">
                  {{ biometricAvailable ? 'استخدم بصمة الإصبع لفتح التطبيق بدلاً من الرقم السري.' : 'سجّل بصمة إصبع في إعدادات الجهاز أولاً.' }}
                </p>
              </div>
              <Switch :model-value="biometricEnabled" :disabled="!biometricAvailable" @update:model-value="onToggleBiometric" />
            </div>
            <p v-if="biometricError" class="px-4 pb-3 text-xs text-destructive">{{ biometricError }}</p>
            <button
              v-if="loginEnabled && hasPin"
              type="button"
              class="flex w-full items-center gap-3 p-4 text-left transition active:bg-accent"
              @click="lockNow"
            >
              <div class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <LockKeyhole class="size-5" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium">قفل التطبيق الآن</p>
                <p class="text-xs text-muted-foreground">العودة إلى شاشة الرقم السري</p>
              </div>
            </button>
            <div class="flex items-center gap-3 p-4">
              <div class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Moon class="size-5" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium">الوضع الداكن</p>
                <p class="text-xs text-muted-foreground">مظهر داكن</p>
              </div>
              <Switch :model-value="theme === 'dark'" @update:model-value="settings.toggleTheme()" />
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- المظهر وشاشة البداية -->
      <section class="space-y-3">
        <p class="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          شاشة البداية
        </p>
        <Card>
          <CardContent class="space-y-4 p-4">
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Sparkles class="size-5" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium">إظهار شاشة البداية</p>
                <p class="text-xs text-muted-foreground">عرض شعار المتجر عند فتح التطبيق.</p>
              </div>
              <Switch :model-value="splashEnabled" @update:model-value="settings.setSplash({ enabled: $event })" />
            </div>

            <div v-if="splashEnabled" class="space-y-2">
              <p class="text-xs font-medium text-muted-foreground">الخلفية</p>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="bg in SPLASH_BGS"
                  :key="bg.id"
                  type="button"
                  class="relative overflow-hidden rounded-xl border p-1 transition"
                  :class="splashBg === bg.id ? 'border-primary ring-2 ring-primary/30' : 'border-border'"
                  @click="settings.setSplash({ bg: bg.id })"
                >
                  <span class="flex h-12 items-center justify-center rounded-lg" :class="bg.swatch">
                    <Check v-if="splashBg === bg.id" class="size-4 text-white drop-shadow" />
                  </span>
                  <span class="mt-1 block text-center text-xs">{{ bg.label }}</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- معلومات الجهاز -->
      <div class="flex items-center justify-center gap-2 pb-2 text-xs text-muted-foreground">
        <Smartphone class="size-3.5" />
        الجهاز: {{ devicePrefix }} · الكامل-كاشير v0.1
      </div>
    </div>

    <!-- نافذة إنشاء الرقم السري أو تغييره -->
    <BottomSheet
      :open="pinSheetOpen"
      :title="pinMode === 'change' ? 'تغيير الرقم السري' : 'إنشاء رقم سري'"
      @update:open="pinSheetOpen = $event"
    >
      <div class="flex flex-col items-center gap-8 px-5 pb-8 pt-4">
        <p class="text-sm text-muted-foreground">
          {{ pinError ? 'الرقم السري غير متطابق، حاول مجدداً' : pinStep === 'enter' ? 'أدخل رقماً سرياً جديداً من 6 أرقام' : 'أعد إدخال الرقم السري للتأكيد' }}
        </p>
        <PinPad
          v-model="pinValue"
          :length="PIN_LEN"
          :error="pinError"
          @complete="onPinComplete"
        />
      </div>
    </BottomSheet>
  </div>
</template>
