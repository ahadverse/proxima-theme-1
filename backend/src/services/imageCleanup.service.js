import { env } from '../config/env.js';
import { Banner } from '../models/Banner.js';
import { Blog } from '../models/Blog.js';
import { Brand } from '../models/Brand.js';
import { Category } from '../models/Category.js';
import { Order } from '../models/Order.js';
import { Page } from '../models/Page.js';
import { Product } from '../models/Product.js';
import { Settings } from '../models/Settings.js';
import { logger } from '../utils/logger.js';
import { escapeRegex } from '../utils/slugify.js';
import { r2Configured } from './storage/r2.js';
import { deleteImage } from './storage.service.js';

// When a product's photo is replaced, or a product or blog post is deleted, the picture is deleted from storage too —
// otherwise every edit leaves a file behind for good. Only files this app stored itself are ever touched (their key
// has the exact shape upload gives them): a seeded demo photo or a link to another site is left alone. And a file
// still in use anywhere else is kept, so one picture can safely be shared.

const OWN_KEY = /^maroon\/\d{4}\/\d{2}\/[0-9a-f]{24}\.(?:webp|jpg|png|gif|avif)$/;

/** The storage key of an image this app stored, from its public URL; null for anything else. */
export function ownedKey(url) {
  if (!r2Configured || typeof url !== 'string') return null;
  const base = `${env.r2.publicUrl.replace(/\/+$/, '')}/`;
  if (!url.startsWith(base)) return null;
  const key = url.slice(base.length);
  return OWN_KEY.test(key) ? key : null;
}

/** Every picture a product carries: its photos, each variant's photos and its social-share image. */
export function productImageUrls(product) {
  return [
    ...(product.images ?? []).map((i) => i.url),
    ...(product.variants ?? []).flatMap((v) => (v.images ?? []).map((i) => i.url)),
    product.seo?.ogImage,
  ].filter(Boolean);
}

/** A blog post's cover and any picture its text shows. */
export function blogImageUrls(post) {
  const inText = String(post.content ?? '').match(/https?:\/\/[^\s)"'<>\]]+/g) ?? [];
  return [post.coverImage, ...inText].filter(Boolean);
}

/**
 * Which of these keys something still points at. Orders keep a copy of each product's photo as it was when the order
 * was placed, so a picture that was ever ordered is never deleted — old orders must not lose their thumbnails.
 */
async function keysStillInUse(keys) {
  const used = new Set();
  const note = (values) => {
    for (const value of values) for (const key of keys) if (String(value).includes(key)) used.add(key);
  };

  // Orders: one scan for all the keys, reading back only the matching picture addresses.
  const anyKey = new RegExp(keys.map(escapeRegex).join('|'));
  note(await Order.distinct('items.image', { 'items.image': anyKey }));

  // The rest hold few documents; each key is looked up on its own.
  for (const key of keys) {
    const re = new RegExp(escapeRegex(key));
    const found = await Promise.all([
      Product.exists({ $or: [{ 'images.url': re }, { 'variants.images.url': re }, { 'seo.ogImage': re }] }),
      Blog.exists({ $or: [{ coverImage: re }, { content: re }] }),
      Banner.exists({ $or: [{ image: re }, { mobileImage: re }] }),
      Category.exists({ image: re }),
      Brand.exists({ logo: re }),
      Page.exists({ content: re }),
      Settings.exists({ logo: re }),
    ]);
    if (found.some(Boolean)) used.add(key);
  }
  return used;
}

/**
 * Deletes from storage the given pictures that nothing uses any more. Call it after the document that held them has
 * been saved or deleted. Never throws — a leftover file is not worth failing an admin's save over.
 */
export async function removeUnusedImages(urls) {
  try {
    const keys = [...new Set(urls.map(ownedKey).filter(Boolean))];
    if (!keys.length) return { deleted: 0, kept: 0 };

    const used = await keysStillInUse(keys);
    const unused = keys.filter((key) => !used.has(key));
    for (const key of unused) await deleteImage(key);
    return { deleted: unused.length, kept: keys.length - unused.length };
  } catch (err) {
    logger.warn('Image cleanup failed:', err.message);
    return { deleted: 0, kept: 0, error: err.message };
  }
}
