import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { makePinHash, verifyPin } from '@/lib/crypto'

export const useAuthStore = defineStore('auth', () => {
  const settings = useSettingsStore()
  const unlocked = ref(false)
  // Owner session is deliberately memory-only: every app restart returns to worker mode.
  const ownerSession = ref(false)
  const isOwner = computed(() => ownerSession.value)
  const isLocked = computed(() => settings.loginEnabled && settings.hasPin && !unlocked.value)

  async function verify(pin: string): Promise<boolean> {
    const ok = await verifyPin(pin, settings.pinHash)
    if (ok) unlocked.value = true
    return ok
  }
  async function enterOwner(pin: string): Promise<boolean> {
    const ok = await verifyPin(pin, settings.pinHash)
    if (ok) ownerSession.value = true
    return ok
  }
  async function setupOwnerPin(pin: string): Promise<void> {
    if (settings.hasPin) throw new Error('تم إعداد رمز المالك مسبقاً')
    await settings.setPinHash(await makePinHash(pin))
    ownerSession.value = true
  }
  function leaveOwner() { ownerSession.value = false }
  async function setPin(pin: string) { await settings.setPinHash(await makePinHash(pin)); unlocked.value = true }
  async function enableLogin() { await settings.setLoginEnabled(true) }
  async function disableLogin() { await settings.setLoginEnabled(false); await settings.setPinHash(null); unlocked.value = false; ownerSession.value = false }
  function lock() { unlocked.value = false; ownerSession.value = false }
  return { unlocked, isLocked, ownerSession, isOwner, verify, enterOwner, setupOwnerPin, leaveOwner, setPin, enableLogin, disableLogin, lock }
})
