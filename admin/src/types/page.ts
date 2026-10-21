export interface StaticPage {
  _id: string;
  slug: string;
  title: string;
  /** Left out of the list endpoint; present when a single page is loaded. */
  content?: string;
  /** How `content` is written: Markdown (pages from before the rich text editor) or HTML. */
  contentFormat?: 'markdown' | 'html';
  /** A page the storefront has its own route for — its address is fixed, and deleting it restores the built-in text. */
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaticPageInput {
  slug: string;
  title: string;
  content: string;
  contentFormat?: 'markdown' | 'html';
}
