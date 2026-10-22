export interface Review {
  _id: string;
  product: { _id: string; title: string; slug: string } | null;
  customer: { _id: string; name: string; phone: string };
  rating: number;
  title?: string;
  comment: string;
  isApproved: boolean;
  createdAt: string;
}
