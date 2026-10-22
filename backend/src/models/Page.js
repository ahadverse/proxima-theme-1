import mongoose from 'mongoose';
import { sanitizePageHtml } from '../utils/sanitizeHtml.js';

/**
 * Pages the storefront has its own route for (/about, /privacy-policy…). Their address can't be changed, or
 * the route would stop finding them. Their text can be edited, and deleting one puts the built-in copy back.
 */
export const SYSTEM_PAGE_SLUGS = [
  'about',
  'return-exchange',
  'warranty-shipping',
  'privacy-policy',
  'terms-conditions',
];

/** Where a page lives on the storefront — the address a footer link to it carries. */
export const pageHref = (slug) => (SYSTEM_PAGE_SLUGS.includes(slug) ? `/${slug}` : `/pages/${slug}`);

const pageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    // 'markdown' for pages written before the rich text editor existed (and still what the API accepts when
    // no format is sent); 'html' for pages written with it, cleaned of anything unsafe when saved.
    contentFormat: { type: String, enum: ['markdown', 'html'], default: 'markdown' },
  },
  { timestamps: true }
);

// Whatever route a page is written through, html text is cleaned before it is stored. (The controller used to clean only
// text that arrived in the same request, so switching a page's format to html afterwards published its old text raw.)
pageSchema.pre('validate', function cleanHtmlContent(next) {
  if (this.contentFormat === 'html' && (this.isModified('content') || this.isModified('contentFormat'))) {
    this.content = sanitizePageHtml(this.content);
  }
  next();
});

export const Page = mongoose.model('Page', pageSchema);
