<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PinPad from '@/components/common/PinPad.vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { deviceBiometric } from '@/services/auth/deviceBiometric'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const { storeName } = storeToRefs(settings)

const pin = ref('')
const error = ref(false)
const biometricBusy = ref(false)
const biometricMessage = ref('')

onMounted(async () => {
  if (settings.biometricEnabled) {
    // Let the lock screen finish rendering before Android opens its biometric sheet.
    await nextTick()
    await new Promise(resolve => window.setTimeout(resolve, 300))
    if (settings.biometricEnabled) await unlockWithBiometric()
  }
})

async function unlockWithBiometric() {
  if (biometricBusy.value) return
  biometricBusy.value = true
  biometricMessage.value = ''
  try {
    await deviceBiometric.authenticate()
    auth.unlocked = true
    const r = route.query.redirect
    await router.replace(typeof r === 'string' ? r : '/')
  } catch {
    biometricMessage.value = 'تعذر التحقق بالبصمة. يمكنك إدخال الرقم السري أو المحاولة مجدداً.'
  } finally {
    biometricBusy.value = false
  }
}

async function onComplete(value: string) {
  if (await auth.verify(value)) {
    const r = route.query.redirect
    router.replace(typeof r === 'string' ? r : '/')
  } else {
    error.value = true
    setTimeout(() => {
      pin.value = ''
      error.value = false
    }, 500)
  }
}
</script>

<template>
  <div class="flex min-h-full flex-col items-center justify-center gap-10 px-6 py-12">
    <div class="flex flex-col items-center gap-3 text-center">
      <div class="flex size-32 items-center justify-center overflow-hidden rounded-[1.8rem] border border-primary/15 bg-white p-2.5 shadow-lg shadow-primary/10">
        <img src="/alkamel-cashier-logo.jpg" alt="شعار الكامل-كاشير" class="h-full w-full rounded-[1.25rem] object-contain" />
      </div>
      <div>
        <p class="text-lg font-bold">{{ storeName }}</p>
        <p class="text-sm text-muted-foreground">
          {{ error ? 'الرقم السري غير صحيح، حاول مجدداً' : 'أدخل الرقم السري لفتح التطبيق' }}
        </p>
      </div>
      <p v-if="biometricMessage" class="max-w-xs text-center text-xs text-destructive">{{ biometricMessage }}</p>
      <button
        v-if="settings.biometricEnabled"
        type="button"
        class="rounded-xl border border-primary/30 px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
        :disabled="biometricBusy"
        @click="unlockWithBiometric"
      >
        {{ biometricBusy ? 'جارٍ التحقق بالبصمة…' : 'المحاولة بالبصمة مرة أخرى' }}
      </button>
    </div>

    <PinPad v-model="pin" :error="error" @complete="onComplete" />
  </div>
</template>
