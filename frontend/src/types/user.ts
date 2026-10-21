export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  addresses: {
    _id: string;
    label: string;
    fullAddress: string;
    area: 'inside_dhaka' | 'outside_dhaka';
    isDefault: boolean;
  }[];
}
