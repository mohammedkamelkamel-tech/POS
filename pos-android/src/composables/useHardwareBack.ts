import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter, type Router } from 'vue-router'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { App } from '@capacitor/app'

/**
 * Mundur sesuai riwayat; kalau riwayat kosong balik ke Home.
 * Dipakai bareng oleh tombol back hardware & tombol back di AppHeader.
 */
export function goBackOrHome(router: Router): void {
  if (window.history.state?.back != null) router.back()
  else void router.replace('/')
}

export function useHardwareBack() {
  const router = useRouter()
  const showExitHint = ref(false)
  let handle: PluginListenerHandle | null = null
  let lastBackAt = 0
  let hintTimer: ReturnType<typeof setTimeout> | null = null

  function handleBack() {
    // إغلاق النافذة أو القائمة المفتوحة أولاً قبل مغادرة الصفحة.
    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')
    if (dialog) {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      return
    }

    const route = router.currentRoute.value
    if (route.name === 'lock') return

    if (route.path === '/') {
      const now = Date.now()
      if (now - lastBackAt < 2000) {
        void App.exitApp()
        return
      }
      lastBackAt = now
      showExitHint.value = true
      if (hintTimer) clearTimeout(hintTimer)
      hintTimer = setTimeout(() => { showExitHint.value = false }, 2000)
      return
    }
    goBackOrHome(router)
  }

  onMounted(async () => {
    if (!Capacitor.isNativePlatform()) return
    handle = await App.addListener('backButton', handleBack)
  })

  onUnmounted(() => {
    void handle?.remove()
    if (hintTimer) clearTimeout(hintTimer)
  })

  return { showExitHint }
}
