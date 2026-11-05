import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { getDb, closeDb, initDb } from '@/db/sqlite'
import { SettingsRepository } from '@/repositories/settings.repo'

const DATABASE = 'poskacaw'
const BACKUP_FOLDER = 'AlKamel-Cashier-Backups'
const LAST_AUTO_BACKUP_KEY = 'backup_last_auto_date'
const BACKUP_PREFIX = 'alkamel-cashier-backup-'
let backupInProgress: Promise<string> | null = null

export interface LocalBackupFile {
  name: string
  uri?: string
  size?: number
}

function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function backupFileName(date = new Date()): string {
  return `${BACKUP_PREFIX}${localDateKey(date)}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}.json`
}

function assertSupportedPlatform() {
  if (Capacitor.getPlatform() !== 'android') {
    throw new Error('النسخ الاحتياطي المحلي متاح حالياً على أجهزة Android فقط.')
  }
}

async function ensureFolder() {
  await Filesystem.mkdir({ path: BACKUP_FOLDER, directory: Directory.Documents, recursive: true }).catch(() => undefined)
}

export async function createLocalBackup(): Promise<string> {
  assertSupportedPlatform()
  if (backupInProgress) return backupInProgress
  backupInProgress = (async () => {
    await getDb().query('SELECT 1')
    const exported = await CapacitorSQLite.exportToJson({ database: DATABASE, jsonexportmode: 'full' })
    const json = JSON.stringify({ ...exported, overwrite: true, mode: 'full' })
    const valid = await CapacitorSQLite.isJsonValid({ jsonstring: json })
    if (!valid.result) throw new Error(valid.message || 'تعذر التحقق من سلامة ملف النسخة الاحتياطية.')
    await ensureFolder()
    const name = backupFileName()
    await Filesystem.writeFile({
      path: `${BACKUP_FOLDER}/${name}`,
      data: json,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    return name
  })()
  try {
    return await backupInProgress
  } finally {
    backupInProgress = null
  }
}

export async function runDailyBackupIfDue(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return
  const settings = new SettingsRepository(getDb())
  const today = localDateKey()
  if ((await settings.get(LAST_AUTO_BACKUP_KEY)) === today) return
  const name = await createLocalBackup()
  await settings.set(LAST_AUTO_BACKUP_KEY, today)
  console.info('[Backup] daily backup created:', name)
}

export async function listLocalBackups(): Promise<LocalBackupFile[]> {
  assertSupportedPlatform()
  await ensureFolder()
  const result = await Filesystem.readdir({ path: BACKUP_FOLDER, directory: Directory.Documents })
  return result.files
    .filter((file) => file.name.startsWith(BACKUP_PREFIX) && file.name.endsWith('.json'))
    .map((file) => ({ name: file.name, uri: file.uri, size: file.size }))
    .sort((a, b) => b.name.localeCompare(a.name))
}

export async function restoreLocalBackup(name: string): Promise<void> {
  assertSupportedPlatform()
  if (!name.startsWith(BACKUP_PREFIX) || !name.endsWith('.json') || name.includes('/') || name.includes('..')) {
    throw new Error('اسم ملف النسخة الاحتياطية غير صالح.')
  }
  const file = await Filesystem.readFile({
    path: `${BACKUP_FOLDER}/${name}`,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  })
  const source = typeof file.data === 'string' ? file.data : ''
  if (!source) throw new Error('ملف النسخة الاحتياطية فارغ أو تعذرت قراءته.')
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(source) as Record<string, unknown>
  } catch {
    throw new Error('ملف النسخة الاحتياطية تالف أو ليس ملف JSON صالحاً.')
  }
  if (parsed.database !== DATABASE || !Array.isArray(parsed.tables)) {
    throw new Error('هذا الملف لا يخص قاعدة بيانات الكامل-كاشير.')
  }
  const json = JSON.stringify({ ...parsed, overwrite: true, mode: 'full' })
  const valid = await CapacitorSQLite.isJsonValid({ jsonstring: json })
  if (!valid.result) throw new Error(valid.message || 'تعذر التحقق من سلامة النسخة الاحتياطية.')
  await closeDb()
  try {
    await CapacitorSQLite.importFromJson({ jsonstring: json })
    await initDb()
  } catch (error) {
    await initDb().catch(() => undefined)
    throw error
  }
}

export async function deleteLocalBackup(name: string): Promise<void> {
  assertSupportedPlatform()
  if (!name.startsWith(BACKUP_PREFIX) || !name.endsWith('.json') || name.includes('/') || name.includes('..')) {
    throw new Error('اسم ملف النسخة الاحتياطية غير صالح.')
  }
  await Filesystem.deleteFile({
    path: `${BACKUP_FOLDER}/${name}`,
    directory: Directory.Documents,
  })
}
