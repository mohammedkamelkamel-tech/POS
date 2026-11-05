import { Capacitor, registerPlugin } from '@capacitor/core'
interface DeviceBiometricPlugin {
  availability(): Promise<{ available: boolean; reason: number }>
  authenticate(): Promise<void>
}
const NativeBiometric = registerPlugin<DeviceBiometricPlugin>('DeviceBiometric')
export const deviceBiometric = {
  isAvailable: async () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('DeviceBiometric')) return false
    try { return (await NativeBiometric.availability()).available } catch { return false }
  },
  authenticate: () => NativeBiometric.authenticate(),
}
