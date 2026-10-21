export interface OrderItem {
  product: string;
  title: string;
  variantSku?: string | null;
  variantLabel?: string | null;
  image?: string;
  price: number;
  quantity: number;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  shippingAddress: { fullAddress: string; area: 'inside_dhaka' | 'outside_dhaka'; phone: string };
  pricing: { subtotal: number; discount: number; deliveryCharge: number; grandTotal: number };
  coupon?: { code: string; discountAmount: number };
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  statusHistory: { status: string; note?: string; changedAt: string }[];
  courier?: { provider?: string; trackingCode?: string; status?: string };
  createdAt: string;
}
