export interface CustomerAddress {
  _id: string;
  label: string;
  fullAddress: string;
  area: 'inside_dhaka' | 'outside_dhaka';
  isDefault: boolean;
}

export interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  addresses: CustomerAddress[];
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrderSummary {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  pricing: { grandTotal: number };
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  orders: CustomerOrderSummary[];
}
