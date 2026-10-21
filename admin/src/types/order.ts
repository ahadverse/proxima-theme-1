export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cod' | 'paystation' | 'bkash' | 'nagad';

export interface OrderItem {
  product: string;
  title: string;
  variantSku: string | null;
  variantLabel: string | null;
  image?: string;
  price: number;
  quantity: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: { _id: string; name: string; phone: string } | null;
  guestInfo?: { name?: string; email?: string; phone?: string };
  items: OrderItem[];
  shippingAddress: { fullAddress: string; area: 'inside_dhaka' | 'outside_dhaka'; phone: string };
  pricing: { subtotal: number; discount: number; deliveryCharge: number; grandTotal: number };
  coupon?: { code?: string; discountAmount: number };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDetails?: { transactionId?: string; paidAt?: string };
  orderStatus: OrderStatus;
  statusHistory: { status: string; note?: string; changedAt: string }[];
  courier?: { provider?: string; consignmentId?: string; trackingCode?: string; status?: string };
  fraudRisk: {
    internalScore: number;
    externalScore: number | null;
    finalScore: number;
    level: 'low' | 'medium' | 'high';
    reasons: string[];
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
