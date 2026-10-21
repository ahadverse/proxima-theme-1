export interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  isFeatured: boolean;
  sortOrder: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface BrandInput {
  name: string;
  slug?: string;
  logo?: string;
  isFeatured?: boolean;
  sortOrder?: number;
  status?: 'active' | 'inactive';
}
