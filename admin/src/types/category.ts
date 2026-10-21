export interface Category {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  image?: string;
  icon?: string;
  isFeatured: boolean;
  sortOrder: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export interface CategoryInput {
  name: string;
  slug?: string;
  parent?: string | null;
  image?: string;
  icon?: string;
  isFeatured?: boolean;
  sortOrder?: number;
  status?: 'active' | 'inactive';
}
