/** Butcher-specific quantity and meal pricing helpers. All money values are integer YER. */
export type MealPortion = 1 | 2 | 4 | 6 | 8;

/** Portion units are quarters: 1=quarter, 2=half, 4=one, 6=one-and-a-half, 8=two. */
export const MEAL_PORTIONS: ReadonlyArray<{ units: MealPortion; label: string }> = [
  { units: 1, label: 'ربع نفر' }, { units: 2, label: 'نصف نفر' },
  { units: 4, label: 'نفر' }, { units: 6, label: 'نفر ونصف' }, { units: 8, label: 'نفران' },
];

/** Calculate a portion price from the full-person price using integer arithmetic. */
export function mealPortionPrice(fullPersonPrice: number, portion: MealPortion): number {
  if (!Number.isSafeInteger(fullPersonPrice) || fullPersonPrice < 0) throw new RangeError('سعر النفر يجب أن يكون مبلغاً صحيحاً غير سالب');
  const result = Math.round((fullPersonPrice * portion) / 4)
  if (!Number.isSafeInteger(result)) throw new RangeError('قيمة الوجبة أكبر من المسموح')
  return result;
}

/** Convert kilograms and grams to an integer gram quantity. */
export function weightInGrams(kilograms: number, grams = 0): number {
  if (!Number.isFinite(kilograms) || !Number.isFinite(grams) || kilograms < 0 || grams < 0 || grams >= 1000) throw new RangeError('الوزن المدخل غير صحيح');
  const total = Math.round(kilograms * 1000) + Math.round(grams);
  if (!Number.isSafeInteger(total)) throw new RangeError('الوزن أكبر من المسموح');
  return total;
}

/** Calculate a weighed item's total from price/kg and integer grams. */
export function weighedItemPrice(pricePerKg: number, grams: number): number {
  if (!Number.isSafeInteger(pricePerKg) || pricePerKg < 0 || !Number.isSafeInteger(grams) || grams < 0) throw new RangeError('السعر أو الوزن غير صحيح');
  const result = Math.round((pricePerKg * grams) / 1000)
  if (!Number.isSafeInteger(result)) throw new RangeError('إجمالي الوزن أكبر من المسموح')
  return result;
}
