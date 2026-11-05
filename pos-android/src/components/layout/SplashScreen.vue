<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import { useMediaStore } from '@/stores/media'

const settings = useSettingsStore()
const media = useMediaStore()
const { storeName, storeLogo, splashBg } = storeToRefs(settings)

const BG: Record<string, string> = {
  brand: 'bg-gradient-to-b from-hero to-hero/90 text-hero-foreground',
  light: 'bg-background text-foreground',
  dark: 'bg-slate-900 text-white',
}

onMounted(() => {
  // Pastikan logo ada di cache biar langsung tampil.
  if (storeLogo.value) media.ensure([storeLogo.value])
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5"
    :class="BG[splashBg] || BG.brand"
  >
    <div class="flex size-32 items-center justify-center overflow-hidden rounded-[2rem] bg-white p-1 shadow-2xl">
      <img
        src="/alkamel-cashier-logo.jpg"
        alt="شعار الكامل-كاشير"
        class="size-full object-contain"
      />
    </div>
    <div class="text-center">
      <p class="text-xl font-bold">الكامل-كاشير</p>
      <p class="mt-1 text-xs opacity-75">{{ storeName }}</p>
    </div>
    <div class="absolute bottom-16">
      <div
        class="size-6 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60"
      />
    </div>
  </div>
</template>
