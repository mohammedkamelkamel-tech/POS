<script setup lang="ts">
import { RouterLink } from 'vue-router'
import {
  ShoppingCart,
  Package,
  Receipt,
  Wallet,
  Printer,
  UserCog,
  CalendarClock,
  Cloud,
  BarChart3,
  ChevronRight,
  MessageCircle,
} from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const { storeName, storeOwner } = storeToRefs(settings)

const menu = [
  { to: '/pos', label: 'الكاشير', desc: 'بدء عملية بيع', icon: ShoppingCart },
  { to: '/products', label: 'المنتجات', desc: 'إدارة المنتجات', icon: Package },
  { to: '/transactions', label: 'المبيعات', desc: 'سجل المبيعات', icon: Receipt },
  { to: '/cashflow', label: 'الحركة المالية', desc: 'الإيرادات والمصروفات', icon: Wallet },
  { to: '/reports', label: 'التقارير', desc: 'ملخص المبيعات والرسوم البيانية', icon: BarChart3 },
  { to: '/cashier', label: 'جلسة الكاشير', desc: 'فتح وإغلاق جلسة الكاشير', icon: CalendarClock },
  { to: '/printer', label: 'الطابعة', desc: 'طباعة الفاتورة', icon: Printer },
  { to: '/settings', label: 'الحساب والإعدادات', desc: 'تسجيل الدخول والرقم السري وبيانات المتجر', icon: UserCog },
]
</script>

<template>
  <div class="min-h-full bg-background pb-6">
    <!-- رأس الصفحة وبيانات المتجر -->
    <header
      class="bg-gradient-to-br from-hero to-hero/90 px-5 pb-14 pt-[max(1.5rem,env(safe-area-inset-top))] text-hero-foreground md:px-6"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex size-[4.25rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white p-1 shadow-md shadow-black/10"
        >
          <img
            src="/alkamel-cashier-logo.jpg"
            alt="شعار الكامل-كاشير"
            class="size-full rounded-xl object-contain p-0.5"
          />
        </div>
        <div class="min-w-0">
          <p class="truncate text-lg font-bold leading-tight">{{ storeName }}</p>
          <p class="truncate text-sm text-hero-foreground/70">
            {{ storeOwner || 'لم يُحدد اسم المالك' }}
          </p>
        </div>
      </div>

      <!-- لافتة الربط مع الكامل برو -->
      <RouterLink
        to="/settings"
        class="group mt-5 flex items-center gap-3 rounded-2xl bg-white/12 p-3.5 backdrop-blur transition hover:bg-white/[.18]"
      >
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15"
        >
          <Cloud class="size-5" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">ربط مع الكامل برو</p>
          <p class="truncate text-xs text-hero-foreground/70">
            تسجيل الدخول ومزامنة البيانات سحابياً
          </p>
        </div>
        <ChevronRight
          class="size-5 shrink-0 text-hero-foreground/70 transition-transform group-hover:translate-x-0.5"
        />
      </RouterLink>
    </header>

    <!-- القائمة الرئيسية -->
    <div class="-mt-6 rounded-t-3xl bg-background px-4 pt-5 md:px-6">
      <p
        class="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        القائمة الرئيسية
      </p>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <RouterLink
          v-for="item in menu"
          :key="item.to"
          :to="item.to"
          class="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md active:scale-[.98]"
        >
          <div
            class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105"
          >
            <component :is="item.icon" class="size-5.5" />
          </div>
          <div>
            <p class="text-sm font-semibold leading-tight">{{ item.label }}</p>
            <p class="mt-0.5 text-xs text-muted-foreground">{{ item.desc }}</p>
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- حقوق الملكية والتواصل -->
    <footer class="mt-8 border-t border-border px-4 pb-5 pt-4 text-center md:px-6">
      <p class="text-xs text-muted-foreground">جميع الحقوق محفوظة © محمد كامل العجاج</p>
      <a
        href="https://wa.me/967772072056?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%AA%D9%88%D8%A7%D8%B5%D9%84%20%D9%85%D8%B9%D9%83%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D8%AA%D8%B7%D8%A8%D9%8A%D9%82%20%D8%A7%D9%84%D9%83%D8%A7%D9%85%D9%84-%D9%83%D8%A7%D8%B4%D9%8A%D8%B1"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary"
      >
        <MessageCircle class="size-4" />
        التواصل عبر واتساب: 772072056
      </a>
    </footer>
  </div>
</template>
