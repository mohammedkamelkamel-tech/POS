/** Money is stored as integer Yemeni rials (no fractional subunit). */

const yer = new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const plain = new Intl.NumberFormat('ar-YE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Format an integer amount in Yemeni rials. */
export function formatRupiah(amount: number): string {
  return yer.format(Math.round(amount || 0));
}

/** Amount without currency symbol. */
export function formatNumber(amount: number): string {
  return plain.format(Math.round(amount || 0));
}

/** Accept localized or plain numeric input and return integer rials. */
export function parseRupiah(input: string): number {
  if (!input) return 0;
  const normalized = input
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const digits = normalized.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}
