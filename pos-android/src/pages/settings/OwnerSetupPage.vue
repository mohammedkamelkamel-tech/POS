<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PinPad from '@/components/common/PinPad.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const pin = ref('')
const error = ref('')
const firstPin = ref('')
const confirming = ref(false)
async function onComplete(value: string) {
  if (!confirming.value) {
    firstPin.value = value
    pin.value = ''
    confirming.value = true
    return
  }
  if (value !== firstPin.value) {
    error.value = 'الرمزان غير متطابقين. أعد المحاولة'
    firstPin.value = ''
    pin.value = ''
    confirming.value = false
    return
  }
  try {
    await auth.setupOwnerPin(value)
    await router.replace('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'تعذر حفظ رمز المالك'
  }
}
</script>

<template>
  <div class="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-12">
    <div class="text-center">
      <div class="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">🛡️</div>
      <h1 class="text-xl font-bold">إعداد رمز المالك</h1>
      <p class="mt-2 max-w-xs text-sm text-muted-foreground">{{ error || (confirming ? 'أعد إدخال الرمز للتأكيد' : 'أنشئ رمزاً سرياً لا يعرفه العامل. سيُطلب عند فتح أقسام الإدارة.') }}</p>
    </div>
    <PinPad v-model="pin" @complete="onComplete" />
    <p class="text-xs text-muted-foreground">احفظ الرمز في مكان آمن؛ لا يوجد رمز افتراضي.</p>
  </div>
</template>