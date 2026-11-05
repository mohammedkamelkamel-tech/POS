<script setup lang="ts">
import BottomSheet from '@/components/common/BottomSheet.vue'
import CartLines from '@/components/pos/CartLines.vue'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cart'
import { formatRupiah } from '@/lib/money'

defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  hold: []
  'open-bills': []
  pay: []
}>()

const cart = useCartStore()
</script>

<template>
  <BottomSheet :open="open" title="سلة المشتريات" @update:open="emit('update:open', $event)">
    <CartLines />

    <!-- Footer aksi pesanan -->
    <div class="sticky bottom-0 space-y-3 border-t border-border bg-background/95 p-4 backdrop-blur">
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">الإجمالي ({{ cart.count }} أصناف)</span>
        <span class="text-lg font-bold">{{ formatRupiah(cart.total) }}</span>
      </div>
      <Button variant="outline" class="w-full" @click="emit('open-bills')">
        الفواتير المعلقة
      </Button>
      <div class="grid grid-cols-2 gap-2">
        <Button variant="outline" :disabled="cart.isEmpty" @click="cart.clear()">
          إفراغ السلة
        </Button>
        <Button variant="secondary" :disabled="cart.isEmpty" @click="emit('hold')">
          {{ cart.activeOpenBillId ? 'حفظ التعديلات' : 'تعليق الطلب' }}
        </Button>
      </div>
      <Button class="w-full" :disabled="cart.isEmpty" @click="emit('pay')">الدفع</Button>
    </div>
  </BottomSheet>
</template>
