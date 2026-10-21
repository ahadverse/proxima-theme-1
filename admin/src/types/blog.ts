export type BlogStatus = 'draft' | 'published';

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  coverImage?: string;
  excerpt?: string;
  /** Markdown. Left out of the list endpoint; present when a single post is loaded. */
  content?: string;
  author?: { _id: string; name: string } | null;
  tags: string[];
  status: BlogStatus;
  publishedAt?: string | null;
  seo?: { metaTitle?: string; metaDescription?: string };
  createdAt: string;
  updatedAt: string;
}

export interface BlogInput {
  title: string;
  /** Omit to generate one from the title. */
  slug?: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  tags?: string[];
  status?: BlogStatus;
  seo?: { metaTitle?: string; metaDescription?: string };
}
