export function formatBDT(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-US')}`;
}

export function discountPercent(price: number, compareAtPrice?: number | null): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
