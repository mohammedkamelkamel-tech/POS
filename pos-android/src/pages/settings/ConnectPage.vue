<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader from '@/components/layout/AppHeader.vue'
import BottomSheet from '@/components/common/BottomSheet.vue'
import ConnectAuthCard from '@/components/settings/ConnectAuthCard.vue'
import SyncStatusCard from '@/components/settings/SyncStatusCard.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, LogOut, Check, AlertCircle, Plus, Pencil } from 'lucide-vue-next'
import { Capacitor } from '@capacitor/core'
import { useAccountStore } from '@/stores/account'
import { useSyncStore } from '@/stores/sync'
import { ENV_GOOGLE_CLIENT_ID } from '@/services/api/config'
import {
  LegacyCredentialRemovalError,
  SecureCredentialUnavailableError,
} from '@/services/auth/accountCredentials'

const account = useAccountStore()
const sync = useSyncStore()
const { isAuthenticated, user, stores, currentStoreId, status, error } =
  storeToRefs(account)
const { status: syncStatus, pending, failedChanges, failedCount, lastError, lastSyncedAt } =
  storeToRefs(sync)

const mode = ref<'login' | 'register'>('login')
const name = ref('')
const email = ref('')
const password = ref('')
const password2 = ref('')
const localError = ref('')
// Google native cuma jalan di aplikasi Android (butuh SHA-1 + OAuth client Android).
// Di web, sengaja dimatiin biar gak kena redirect_uri_mismatch — pakai email/password.
const isNative = Capacitor.isNativePlatform()
const hasGoogle = computed(() => !!ENV_GOOGLE_CLIENT_ID && isNative)

onMounted(() => {
  void sync.refreshPending()
})

function switchMode(m: 'login' | 'register') {
  mode.value = m
  localError.value = ''
  account.error = null
}

async function onSubmit() {
  localError.value = ''
  let ok = false
  if (mode.value === 'register') {
    if (!name.value.trim()) {
      localError.value = 'الاسم مطلوب.'
      return
    }
    if (password.value !== password2.value) {
      localError.value = 'تأكيد كلمة المرور غير متطابق.'
      return
    }
    ok = await account.registerEmail(name.value.trim(), email.value.trim(), password.value)
  } else {
    ok = await account.loginEmail(email.value.trim(), password.value)
  }
  if (ok) {
    password.value = ''
    password2.value = ''
    await sync.start()
    await sync.syncNow()
  }
}

async function onGoogleLogin() {
  if (await account.loginGoogle()) {
    await sync.start()
    await sync.syncNow()
  }
}

async function onLogout() {
  await sync.stop()
  try {
    await account.logout()
  } catch (error) {
    if (
      error instanceof SecureCredentialUnavailableError ||
      error instanceof LegacyCredentialRemovalError
    ) {
      account.error = 'تعذر تسجيل الخروج بأمان. لم تُحذف بيانات الدخول من الجهاز.'
      return
    }
    account.error = 'تعذر تسجيل الخروج. حاول مرة أخرى.'
  }
}

// تبديل outlet = destruktif (data lokal outlet lama di-reset) → wajib konfirmasi.
const pendingSwitch = ref<{ id: string; name: string } | null>(null)
const switching = ref(false)
const outletTransitionError = ref('')

function askSwitch(s: { id: string | number; name: string }) {
  outletTransitionError.value = ''
  pendingSwitch.value = { id: String(s.id), name: s.name }
}

async function prepareالفرعTransition(): Promise<boolean> {
  outletTransitionError.value = ''
  await sync.syncNow()
  await sync.refreshPending()

  if (pending.value === 0 && failedCount.value === 0) return true

  outletTransitionError.value =
    failedCount.value > 0
      ? 'Perubahan belum aman disinkronkan. Ada perubahan gagal; gunakan Coba lagi terlebih dahulu sebelum pindah outlet.'
      : 'Perubahan belum aman disinkronkan. Periksa koneksi lalu sinkronkan kembali sebelum pindah outlet.'
  return false
}

async function confirmSwitch() {
  const target = pendingSwitch.value
  if (!target || switching.value) return
  switching.value = true
  try {
    if (!(await prepareالفرعTransition())) return
    if (!(await account.setCurrentStore(target.id))) {
      outletTransitionError.value = account.error ?? outletTransitionError.value
      return
    }
    pendingSwitch.value = null
    await sync.syncNow()
  } finally {
    switching.value = false
  }
}

// --- Kelola outlet ---
const showAddStore = ref(false)
const newStoreName = ref('')
const editingId = ref<string | null>(null)
const editName = ref('')

async function onAddStore() {
  const storeName = newStoreName.value.trim()
  if (!storeName || switching.value) return
  switching.value = true
  try {
    if (!(await prepareالفرعTransition())) return
    if (!(await account.createStore(storeName))) {
      outletTransitionError.value = account.error ?? outletTransitionError.value
      return
    }
    newStoreName.value = ''
    showAddStore.value = false
    await sync.syncNow()
  } finally {
    switching.value = false
  }
}

function startRename(s: { id: string | number; name: string }) {
  editingId.value = String(s.id)
  editName.value = s.name
}

async function onRename(s: { id: string | number }) {
  if (!editName.value.trim()) return
  if (await account.renameStore(s.id, editName.value.trim())) editingId.value = null
}

const syncLabel = computed(() => {
  if (failedCount.value > 0) return 'يتطلب الانتباه'

  switch (syncStatus.value) {
    case 'syncing':
      return 'جارٍ مزامنة البيانات…'
    case 'idle':
      return 'تمت المزامنة'
    case 'offline':
      return 'غير متصل'
    case 'error':
      return 'فشلت المزامنة'
    default:
      return 'غير نشط'
  }
})

</script>

<template>
  <div class="min-h-screen bg-background pb-10">
    <AppHeader title="الاتصال بالكامل برو" subtitle="تسجيل الدخول والمزامنة السحابية" back />
    <div class="space-y-5 p-4">
      <ConnectAuthCard
        v-if="!isAuthenticated"
        :mode="mode" :name="name" :email="email" :password="password" :password2="password2"
        :loading="status === 'loading'" :status="status" :local-error="localError"
        :account-error="error" :has-google="hasGoogle"
        @update:mode="switchMode" @update:name="name = $event" @update:email="email = $event"
        @update:password="password = $event" @update:password2="password2 = $event"
        @submit="onSubmit" @google-login="onGoogleLogin"
      />
      <template v-else>
        <p v-if="error" class="flex items-start gap-1.5 text-xs text-destructive" role="alert"><AlertCircle class="mt-0.5 size-3.5 shrink-0" /> {{ error }}</p>
        <Card class="border-primary/30 bg-primary/5">
          <CardContent class="space-y-1 p-4">
            <div class="flex items-center gap-2"><Check class="size-4 text-success" /><p class="text-sm font-semibold">{{ user?.name }}</p></div>
            <p class="text-xs text-muted-foreground">{{ user?.email }}</p>
          </CardContent>
        </Card>
        <section v-if="stores.length" class="space-y-2">
          <div class="flex items-center justify-between">
            <Label>الفرع</Label>
            <Button variant="ghost" size="sm" class="h-7 gap-1 text-primary" @click="showAddStore = !showAddStore"><Plus class="size-4" /> إضافة</Button>
          </div>
          <div v-if="showAddStore" class="flex items-center gap-2">
            <Input v-model="newStoreName" placeholder="اسم الفرع الجديد" @keyup.enter="onAddStore" />
            <Button size="sm" :disabled="status === 'loading' || switching || !newStoreName.trim()" @click="onAddStore">حفظ</Button>
          </div>
          <p v-if="outletTransitionError" class="flex items-start gap-1.5 text-xs text-destructive" role="alert"><AlertCircle class="mt-0.5 size-3.5 shrink-0" /> {{ outletTransitionError }}</p>
          <div class="space-y-2">
            <div v-for="s in stores" :key="String(s.id)" class="flex items-center gap-2 rounded-lg border p-3 text-sm" :class="String(s.id) === currentStoreId ? 'border-primary bg-primary/10' : 'border-border'">
              <template v-if="editingId === String(s.id)">
                <Input v-model="editName" class="h-8 flex-1" @keyup.enter="onRename(s)" />
                <Button size="sm" class="h-8" @click="onRename(s)">OK</Button>
                <Button size="sm" variant="ghost" class="h-8" @click="editingId = null">إلغاء</Button>
              </template>
              <template v-else>
                <div class="flex min-w-0 flex-1 items-center gap-2">
                  <span class="truncate font-medium">{{ s.name }}</span><Badge variant="secondary">{{ s.role }}</Badge>
                  <Badge v-if="String(s.id) === currentStoreId" class="bg-primary/15 text-primary hover:bg-primary/15">نشط</Badge>
                </div>
                <Button v-if="String(s.id) !== currentStoreId" size="sm" variant="outline" class="h-8" @click="askSwitch(s)">تبديل</Button>
                <button v-if="s.role === 'owner'" class="text-muted-foreground transition active:text-foreground" aria-label="تبديل nama outlet" @click="startRename(s)"><Pencil class="size-4" /></button>
              </template>
            </div>
          </div>
        </section>
        <BottomSheet :open="!!pendingSwitch" title="تبديل outlet?" @update:open="(v: boolean) => { if (!v && !switching) pendingSwitch = null }">
          <div class="space-y-4 p-5">
            <p class="text-sm text-muted-foreground">الانتقال إلى <span class="font-semibold text-foreground">{{ pendingSwitch?.name }}</span>? سيتم استبدال بيانات الفرع الحالي ببيانات الفرع المحدد على هذا الجهاز. ستتم مزامنة التغييرات غير المرسلة أولاً، وستبقى بيانات الخادم آمنة.</p>
            <p v-if="outletTransitionError" class="flex items-start gap-1.5 text-xs text-destructive" role="alert"><AlertCircle class="mt-0.5 size-3.5 shrink-0" /> {{ outletTransitionError }}</p>
            <div class="flex gap-2">
              <Button variant="outline" class="flex-1" :disabled="switching" @click="pendingSwitch = null">إلغاء</Button>
              <Button class="flex-1" :disabled="switching" @click="confirmSwitch"><Loader2 v-if="switching" class="size-4 animate-spin" /> نعم، بدّل الفرع</Button>
            </div>
          </div>
        </BottomSheet>
        <SyncStatusCard
          :sync-status="syncStatus" :sync-label="syncLabel" :pending="pending" :last-error="lastError"
          :last-synced-at="lastSyncedAt" :failed-changes="failedChanges" :failed-count="failedCount"
          @sync="sync.syncNow()" @retry="sync.retryFailed()"
        />
        <Button variant="outline" class="w-full text-destructive" @click="onLogout"><LogOut class="size-4" /> تسجيل الخروج</Button>
      </template>
    </div>
  </div>
</template>
