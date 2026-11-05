import type { Component } from 'vue'
import {
  Home,
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  BarChart3,
  CalendarClock,
  Printer,
  Settings,
} from 'lucide-vue-next'

export interface NavItem {
  to: string
  label: string
  icon: Component
  /** Cocok persis (dipakai untuk Home '/'), selain itu prefix-match. */
  exact?: boolean
  /** Tampil di BottomNav HP (5 menu utama). Semua item tampil di SideNav tablet. */
  primary?: boolean
}

/** Sumber tunggal item navigasi — dipakai BottomNav (HP) & SideNav (tablet). */
export const navItems: NavItem[] = [
  { to: '/', label: 'الرئيسية', icon: Home, exact: true, primary: true },
  { to: '/pos', label: 'الكاشير', icon: ShoppingCart, primary: true },
  { to: '/products', label: 'المنتجات', icon: Package },
  { to: '/transactions', label: 'الفواتير', icon: Receipt, primary: true },
  { to: '/cashflow', label: 'الحركة المالية', icon: Wallet, primary: true },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
  { to: '/cashier', label: 'جلسة الكاشير', icon: CalendarClock },
  { to: '/printer', label: 'الطابعة', icon: Printer },
  { to: '/settings', label: 'الإعدادات', icon: Settings, primary: true },
]

export const primaryNavItems = navItems.filter((i) => i.primary)

export function isNavActive(path: string, item: NavItem): boolean {
  return item.exact ? path === item.to : path.startsWith(item.to)
}
