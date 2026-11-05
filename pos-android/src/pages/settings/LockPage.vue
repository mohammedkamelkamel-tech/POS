<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import PinPad from '@/components/common/PinPad.vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useMediaStore } from '@/stores/media'
import { ShieldCheck, Fingerprint } from 'lucide-vue-next'
import { deviceBiometric } from '@/services/auth/deviceBiometric'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const settings = useSettingsStore()
const media = useMediaStore()
const { storeName, storeLogo } = storeToRefs(settings)

const pin = ref('')
const error = ref(false)
const logoUrl = ref<string | null>(null)

onMounted(async () => {
  if (storeLogo.value) {
    await media.ensure([storeLogo.value])
    logoUrl.value = media.url(storeLogo.value)
  }
  if (settings.biometricEnabled) {
    try {
      await deviceBiometric.authenticate()
      auth.unlocked = true
      const r = route.query.redirect
      await router.replace(typeof r === 'string' ? r : '/')
    } catch {
      // إلغاء البصمة أو فشلها يعيد المستخدم إلى إدخال الرقم السري.
    }
  }
})

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
      <div class="flex size-20 items-center justify-center overflow-hidden rounded-3xl bg-primary/10">
        <img v-if="logoUrl" :src="logoUrl" alt="الشعار" class="size-full object-cover" />
        <ShieldCheck v-else class="size-9 text-primary" />
      </div>
      <div>
        <p class="text-lg font-bold">{{ storeName }}</p>
        <p class="text-sm text-muted-foreground">
          {{ error ? 'الرقم السري غير صحيح، حاول مجدداً' : 'أدخل الرقم السري أو استخدم البصمة لفتح التطبيق' }}
        </p>
      </div>
    </div>

    <PinPad v-model="pin" :error="error" @complete="onComplete" />
  </div>
</template>
