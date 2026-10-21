export interface InventoryLogEntry {
  _id: string;
  product: { _id: string; title: string; slug: string };
  variantSku: string | null;
  changeType: 'restock' | 'sale' | 'return' | 'adjustment';
  quantityChange: number;
  resultingStock: number;
  note?: string;
  changedBy: { _id: string; name: string } | null;
  createdAt: string;
}
