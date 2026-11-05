<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Archive, CalendarClock, CheckCircle2, FileJson, Loader2, RefreshCw, RotateCcw, Trash2 } from 'lucide-vue-next'
import { createLocalBackup, deleteLocalBackup, listLocalBackups, restoreLocalBackup, type LocalBackupFile } from '@/services/backup/localBackup'

const router = useRouter()
const backups = ref<LocalBackupFile[]>([])
const loading = ref(true)
const working = ref(false)
const error = ref('')
const success = ref('')
const selected = ref<string | null>(null)

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    backups.value = await listLocalBackups()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function makeBackup() {
  working.value = true
  error.value = ''
  success.value = ''
  try {
    const name = await createLocalBackup()
    success.value = `تم إنشاء النسخة الاحتياطية بنجاح: ${name}`
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    working.value = false
  }
}

async function restore(name: string) {
  if (!window.confirm('سيتم استبدال بيانات التطبيق الحالية بالبيانات الموجودة في هذه النسخة. تأكد من إنشاء نسخة حديثة قبل المتابعة. هل تريد الاستعادة؟')) return
  working.value = true
  error.value = ''
  success.value = ''
  try {
    await restoreLocalBackup(name)
    success.value = 'تمت الاستعادة بنجاح. سيتم إعادة تحميل التطبيق.'
    window.setTimeout(() => window.location.reload(), 700)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    working.value = false
  }
}

async function removeBackup(name: string) {
  if (!window.confirm(`هل تريد حذف النسخة ${name}؟`)) return
  working.value = true
  error.value = ''
  try {
    await deleteLocalBackup(name)
    await refresh()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    working.value = false
  }
}

function formatDate(name: string) {
  const match = name.match(/(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/)
  if (!match) return name
  return `${match[3]}/${match[2]}/${match[1]} · ${match[4]}:${match[5]}`
}

function formatSize(size?: number) {
  if (size == null) return 'الحجم غير معروف'
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} كيلوبايت` : `${(size / 1024 / 1024).toFixed(1)} ميجابايت`
}

onMounted(refresh)
</script>

<template>
  <div class="min-h-screen bg-background pb-8">
    <AppHeader title="النسخ الاحتياطية" subtitle="حفظ بياناتك واستعادتها على الهاتف" back />
    <div class="space-y-4 p-4">
      <Card class="border-primary/30 bg-primary/5">
        <CardContent class="space-y-3 p-4">
          <div class="flex items-center gap-3">
            <div class="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary"><Archive class="size-5" /></div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">نسخ احتياطي يومي تلقائي</p>
              <p class="text-xs leading-5 text-muted-foreground">ينشئ التطبيق نسخة واحدة يومياً عند فتحه أو العودة إليه، ويحفظها داخل مجلد Documents على الهاتف.</p>
            </div>
            <Badge variant="success">مفعّل</Badge>
          </div>
          <p class="text-xs text-muted-foreground">ملاحظة: قد يؤجل Android النسخ إذا كان التطبيق مغلقاً تماماً؛ تُنفّذ النسخة اليومية تلقائياً عند تشغيل التطبيق أو العودة إليه.</p>
          <Button class="w-full" :disabled="working" @click="makeBackup">
            <Loader2 v-if="working" class="size-4 animate-spin" />
            <FileJson v-else class="size-4" />
            إنشاء نسخة احتياطية الآن
          </Button>
        </CardContent>
      </Card>

      <div v-if="success" class="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700"><CheckCircle2 class="mt-0.5 size-4 shrink-0" />{{ success }}</div>
      <div v-if="error" class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle class="mt-0.5 size-4 shrink-0" />{{ error }}</div>

      <section class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-semibold">النسخ المحفوظة على الهاتف</h2>
            <p class="text-xs text-muted-foreground">المجلد: Documents/AlKamel-Cashier-Backups</p>
          </div>
          <Button size="icon" variant="ghost" :disabled="loading || working" aria-label="تحديث القائمة" @click="refresh"><RefreshCw class="size-4" /></Button>
        </div>

        <Card v-if="loading">
          <CardContent class="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 class="size-4 animate-spin" /> جارٍ تحميل النسخ...</CardContent>
        </Card>
        <Card v-else-if="!backups.length">
          <CardContent class="p-6 text-center text-sm text-muted-foreground"><CalendarClock class="mx-auto mb-2 size-7" />لا توجد نسخ احتياطية بعد.</CardContent>
        </Card>
        <Card v-for="backup in backups" :key="backup.name">
          <CardContent class="flex items-center gap-3 p-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><FileJson class="size-5 text-primary" /></div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ formatDate(backup.name) }}</p>
              <p class="text-xs text-muted-foreground">{{ formatSize(backup.size) }}</p>
            </div>
            <Button size="sm" variant="outline" :disabled="working" @click="restore(backup.name)"><RotateCcw class="size-3.5" /> استعادة</Button>
            <Button size="icon" variant="ghost" class="text-destructive" :disabled="working" aria-label="حذف النسخة" @click="removeBackup(backup.name)"><Trash2 class="size-4" /></Button>
          </CardContent>
        </Card>
      </section>
    </div>
  </div>
</template>
