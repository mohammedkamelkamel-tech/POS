<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PinPad from '@/components/common/PinPad.vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const pin = ref('')
const error = ref(false)
async function onComplete(value: string) {
  if (await auth.enterOwner(value)) {
    const redirect = route.query.redirect
    await router.replace(typeof redirect === 'string' ? redirect : '/')
  } else {
    error.value = true
    window.setTimeout(() => { pin.value = ''; error.value = false }, 600)
  }
}
</script>

<template>
  <div class="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-12">
    <div class="text-center">
      <div class="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl">🔐</div>
      <h1 class="text-xl font-bold">دخول المالك</h1>
      <p class="mt-2 text-sm text-muted-foreground">{{ error ? 'الرمز غير صحيح، حاول مرة أخرى' : 'أدخل رمز المالك للوصول إلى الإدارة' }}</p>
    </div>
    <PinPad v-model="pin" :error="error" @complete="onComplete" />
    <button class="text-sm text-muted-foreground underline" @click="router.replace('/')">العودة إلى وضع العامل</button>
  </div>
</template>