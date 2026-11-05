import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/pages/HomePage.vue') },

  // Kunci app (Phase 5) — hanya tampil bila login aktif + PIN terpasang.
  {
    path: '/lock',
    name: 'lock',
    component: () => import('@/pages/settings/LockPage.vue'),
    meta: { hideNav: true },
  },

  { path: '/owner-unlock', name: 'owner-unlock', component: () => import('@/pages/settings/OwnerUnlockPage.vue'), meta: { hideNav: true } },
  { path: '/owner-setup', name: 'owner-setup', component: () => import('@/pages/settings/OwnerSetupPage.vue'), meta: { hideNav: true } },

  // Sambungkan ke POS Pro / sync cloud (Phase 6C)
  {
    path: '/connect',
    name: 'connect',
    component: () => import('@/pages/settings/ConnectPage.vue'),
    meta: { hideNav: true, ownerOnly: true },
  },

  // Produk (Phase 1)
  {
    path: '/products',
    name: 'products', meta: { ownerOnly: true },
    component: () => import('@/pages/products/ProductsPage.vue'),
  },
  {
    path: '/products/new',
    name: 'product-new', meta: { ownerOnly: true },
    component: () => import('@/pages/products/ProductFormPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/products/:id/edit',
    name: 'product-edit', meta: { ownerOnly: true },
    component: () => import('@/pages/products/ProductFormPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/categories',
    name: 'categories', meta: { ownerOnly: true },
    component: () => import('@/pages/products/CategoriesPage.vue'),
    meta: { hideNav: true },
  },

  // POS + transaksi (Phase 2)
  { path: '/pos', name: 'pos', component: () => import('@/pages/pos/PosPage.vue') },
  {
    // Mode scan: kamera setengah layar + keranjang. hideNav supaya area
    // kamera & keranjang gak berebut ruang dengan bottom nav.
    path: '/pos/scan',
    name: 'pos-scan',
    component: () => import('@/pages/pos/ScanPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/transactions',
    name: 'transactions', meta: { ownerOnly: true },
    component: () => import('@/pages/transactions/TransactionsPage.vue'),
  },
  {
    path: '/transactions/:id',
    name: 'transaction-detail',
    component: () => import('@/pages/transactions/TransactionDetailPage.vue'),
    meta: { hideNav: true },
  },

  // Kasir (Phase 3)
  {
    path: '/cashier',
    name: 'cashier', meta: { ownerOnly: true },
    component: () => import('@/pages/cashier/CashierPage.vue'),
  },

  // Cashflow (Phase 4)
  {
    path: '/cashflow',
    name: 'cashflow', meta: { ownerOnly: true },
    component: () => import('@/pages/cashflow/CashflowPage.vue'),
  },
  {
    path: '/cashflow/new',
    name: 'cashflow-new',
    component: () => import('@/pages/cashflow/CashflowEntryFormPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/cashflow/categories',
    name: 'cashflow-categories',
    component: () => import('@/pages/cashflow/CashflowCategoriesPage.vue'),
    meta: { hideNav: true },
  },
  {
    path: '/cashflow/:id/edit',
    name: 'cashflow-edit',
    component: () => import('@/pages/cashflow/CashflowEntryFormPage.vue'),
    meta: { hideNav: true },
  },

  // Laporan / analitik
  {
    path: '/reports',
    name: 'reports', meta: { ownerOnly: true },
    component: () => import('@/pages/reports/ReportsPage.vue'),
  },

  // Printer & setelan
  {
    path: '/printer',
    name: 'printer', meta: { ownerOnly: true },
    component: () => import('@/pages/printer/PrinterPage.vue'),
  },
  { path: '/backups', name: 'backups', component: () => import('@/pages/settings/BackupsPage.vue'), meta: { hideNav: true } },
  {
    path: '/settings',
    name: 'settings', meta: { ownerOnly: true },
    component: () => import('@/pages/settings/SettingsPage.vue'),
  },

  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// Guard kunci lokal: kalau app terkunci, paksa ke /lock (simpan tujuan asli).
// Sebaliknya, /lock tak berguna saat tidak terkunci → lempar ke home.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (auth.isLocked && to.name !== 'lock') {
    return { name: 'lock', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined }
  }
  if (!auth.isLocked && to.name === 'lock') return { path: '/' }

  if (to.name === 'owner-setup') {
    if (auth.isOwner) return { path: '/' }
    if (useSettingsStore().hasPin) return { name: 'owner-unlock', query: { redirect: '/' } }
    return true
  }
  if (to.name === 'owner-unlock') {
    if (auth.isOwner) return { path: '/' }
    if (!useSettingsStore().hasPin) return { name: 'owner-setup' }
    return true
  }
  if (to.meta.ownerOnly && !auth.isOwner) {
    return { name: useSettingsStore().hasPin ? 'owner-unlock' : 'owner-setup', query: { redirect: to.fullPath } }
  }
  return true
})
