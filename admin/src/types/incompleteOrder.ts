export type IncompleteOrderStatus = 'pending' | 'contacted' | 'recovered' | 'abandoned';

export interface IncompleteOrder {
  _id: string;
  name?: string;
  phone: string;
  email?: string;
  address?: string;
  cartSnapshot: { product?: string; title?: string; variantSku?: string; quantity?: number; price?: number }[];
  totalValue: number;
  lastStep: 'cart' | 'address' | 'payment';
  status: IncompleteOrderStatus;
  createdAt: string;
  updatedAt: string;
}
