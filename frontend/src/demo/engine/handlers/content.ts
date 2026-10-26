import {
  faqSchema,
  bannerSchema,
  bannerUpdateSchema,
  bannerQuerySchema,
  bannerAdminQuerySchema,
  blogSchema,
  blogUpdateSchema,
  blogPublicQuerySchema,
  blogAdminQuerySchema,
  pageSchema,
  pageUpdateSchema,
} from '../backend/validators/content.validators.js';
import { requireAdmin } from '../auth';
import type { Tx } from '../db';
import { ApiError } from '../errors';
import { ok, type Router } from '../http';
import { isBlankHtml, sanitizePageHtml } from '../lib/sanitizeHtml';
import { uniqueSlug } from '../lib/slug';
import { ref } from '../populate';
import { assertId, assertUnique, create } from '../schemas';
import type { Doc } from '../types';
import { containsText, omit, paginate, pick, sortDocs } from '../util';
import { validate } from '../validate';
import { applyUpdate } from './catalog';
import { settingsDoc } from './settings';

/** FAQ, blog, homepage banners and editable pages — faq, blog, banner and page controllers. */

const toDate = <T>(value: T): T => (typeof value === 'string' ? (new Date(value).toISOString() as T) : value);

// ---------- Pages

/** Pages the storefront has its own route for. Their address can't change; deleting one brings back the built-in text. */
const SYSTEM_PAGE_SLUGS = ['about', 'return-exchange', 'warranty-shipping', 'privacy-policy', 'terms-conditions'];
const pageHref = (slug: string) => (SYSTEM_PAGE_SLUGS.includes(slug) ? `/${slug}` : `/pages/${slug}`);
const presentPage = (page: Doc) => ({ ...page, isSystem: SYSTEM_PAGE_SLUGS.includes(page.slug) });

/** Rich text arrives as HTML from the browser — clean it before it is stored, and refuse an empty editor. */
function cleanContent(content: unknown, format: unknown) {
  if (content === undefined || format !== 'html') return content;
  const html = sanitizePageHtml(content);
  if (isBlankHtml(html)) throw ApiError.badRequest('Write something for the page first');
  return html;
}

/** Every link in the footer menu that points at `from` now points at `to` (or, with `to` null, is taken out). */
function rewriteFooterLinks(tx: Tx, from: string, to: string | null) {
  const settings = tx.edit('settings', settingsDoc(tx)._id);
  if (!settings?.footer?.sections) return;
  settings.footer.sections = settings.footer.sections.map((section: Doc) => ({
    ...section,
    links:
      to === null
        ? section.links.filter((l: Doc) => l.href !== from)
        : section.links.map((l: Doc) => (l.href === from ? { ...l, href: to } : l)),
  }));
}

export function contentRoutes(router: Router) {
  // ---------- FAQ

  router.get('/faq', ({ db, query }) => {
    const faqs = query.all === 'true' ? db.all('faqs') : db.filter('faqs', (f) => f.status === 'active');
    return ok(sortDocs(faqs, { sortOrder: 1 }));
  });

  router.get('/faq/manage', ({ db }) => {
    requireAdmin(db);
    return ok(sortDocs(db.all('faqs'), { sortOrder: 1, createdAt: 1 }));
  });

  router.post('/faq', (ctx) => {
    requireAdmin(ctx.db);
    const body = validate(faqSchema, ctx.body);
    return ctx.write((tx) => ok(tx.insert('faqs', create('faqs', body)), { status: 201, message: 'FAQ created' }));
  });

  router.patch('/faq/:id', (ctx) => {
    requireAdmin(ctx.db);
    const payload = validate(faqSchema.partial(), ctx.body);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      const faq = tx.edit('faqs', ctx.params.id);
      if (!faq) throw ApiError.notFound('FAQ not found');
      applyUpdate(faq, payload, (d) => create('faqs', d));
      return ok(faq, { message: 'FAQ updated' });
    });
  });

  router.delete('/faq/:id', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      if (!tx.remove('faqs', ctx.params.id)) throw ApiError.notFound('FAQ not found');
      return ok(null, { message: 'FAQ deleted' });
    });
  });

  // ---------- Blog

  /** Published posts, newest first. Bodies are left out — a list only needs the card. */
  router.get('/blog', ({ db, query }) => {
    const { tag, limit } = validate(blogPublicQuerySchema, query);
    const posts = sortDocs(
      db.filter('blogs', (p) => p.status === 'published' && (!tag || (p.tags ?? []).includes(tag))),
      { publishedAt: -1 }
    );
    return ok((limit ? posts.slice(0, limit) : posts).map((p) => omit(p, ['content'])));
  });

  router.get('/blog/manage', ({ db, query }) => {
    requireAdmin(db);
    const { status, q, page = 1, limit = 20 } = validate(blogAdminQuerySchema, query);
    const posts = sortDocs(
      db.filter('blogs', (p) => (!status || p.status === status) && (!q || containsText(p.title, q))),
      { createdAt: -1 }
    );
    const { items, meta } = paginate(posts, page, limit);
    return ok(
      items.map((p) => ({ ...omit(p, ['content']), ...(p.author !== undefined ? { author: ref(db, 'admins', p.author, ['name']) } : {}) })),
      { meta }
    );
  });

  router.get('/blog/manage/:id', ({ db, params }) => {
    requireAdmin(db);
    assertId(params.id);
    const post = db.get('blogs', params.id);
    if (!post) throw ApiError.notFound('Post not found');
    return ok({ ...post, ...(post.author !== undefined ? { author: ref(db, 'admins', post.author, ['name']) } : {}) });
  });

  router.post('/blog', (ctx) => {
    const admin = requireAdmin(ctx.db);
    const { slug, status = 'draft', ...fields } = validate(blogSchema, ctx.body);
    return ctx.write((tx) => {
      const finalSlug = slug ?? uniqueSlug(tx, 'blogs', fields.title, 'post');
      assertUnique(tx, 'blogs', 'slug', finalSlug);
      const post = tx.insert('blogs', create('blogs', {
        ...fields,
        slug: finalSlug,
        author: admin._id,
        status,
        ...(status === 'published' ? { publishedAt: tx.now } : {}),
      }));
      return ok(post, { status: 201, message: 'Post created' });
    });
  });

  for (const status of ['published', 'draft'] as const) {
    router.post(`/blog/:id/${status === 'published' ? 'publish' : 'unpublish'}`, (ctx) => {
      requireAdmin(ctx.db);
      assertId(ctx.params.id);
      return ctx.write((tx) => {
        const post = tx.edit('blogs', ctx.params.id);
        if (!post) throw ApiError.notFound('Post not found');
        post.status = status;
        // The date a post goes live is stamped once — unpublishing and re-publishing keeps it.
        if (status === 'published' && !post.publishedAt) post.publishedAt = tx.now;
        return ok(post, { message: status === 'published' ? 'Post published' : 'Post unpublished' });
      });
    });
  }

  router.patch('/blog/:id', (ctx) => {
    requireAdmin(ctx.db);
    const payload = validate(blogUpdateSchema, ctx.body);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      if (payload.slug) assertUnique(tx, 'blogs', 'slug', payload.slug, ctx.params.id);
      const post = tx.edit('blogs', ctx.params.id);
      if (!post) throw ApiError.notFound('Post not found');
      applyUpdate(post, payload, (d) => create('blogs', d));
      if (post.status === 'published' && !post.publishedAt) post.publishedAt = tx.now;
      return ok(post, { message: 'Post updated' });
    });
  });

  router.delete('/blog/:id', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      if (!tx.remove('blogs', ctx.params.id)) throw ApiError.notFound('Post not found');
      return ok(null, { message: 'Post deleted' });
    });
  });

  router.get('/blog/:slug', ({ db, params }) => {
    const post = db.find('blogs', (p) => p.slug === params.slug && p.status === 'published');
    if (!post) throw ApiError.notFound('Post not found');
    return ok(post);
  });

  // ---------- Banners

  const BANNER_PUBLIC_FIELDS = ['type', 'title', 'subtitle', 'highlights', 'image', 'mobileImage', 'ctaText', 'ctaLink', 'sortOrder'];
  const bannerOrder = { type: 1, sortOrder: 1, createdAt: 1 } as const;

  /** Public: banners that are switched on and inside their start/end window, in display order. */
  router.get('/banners', ({ db, query }) => {
    const { type } = validate(bannerQuerySchema, query);
    const now = new Date().toISOString();
    const banners = db.filter(
      'banners',
      (b) =>
        b.status === 'active' &&
        (b.startsAt == null || b.startsAt <= now) &&
        (b.endsAt == null || b.endsAt >= now) &&
        (!type || b.type === type)
    );
    return ok(sortDocs(banners, bannerOrder).map((b) => pick(b, BANNER_PUBLIC_FIELDS)));
  });

  router.get('/banners/manage', ({ db, query }) => {
    requireAdmin(db);
    const { type, status } = validate(bannerAdminQuerySchema, query);
    return ok(sortDocs(db.filter('banners', (b) => (!type || b.type === type) && (!status || b.status === status)), bannerOrder));
  });

  router.post('/banners', (ctx) => {
    requireAdmin(ctx.db);
    const body = validate(bannerSchema, ctx.body);
    return ctx.write((tx) => {
      const banner = tx.insert('banners', create('banners', { ...body, startsAt: toDate(body.startsAt), endsAt: toDate(body.endsAt) }));
      return ok(banner, { status: 201, message: 'Banner created' });
    });
  });

  router.patch('/banners/:id', (ctx) => {
    requireAdmin(ctx.db);
    const payload = validate(bannerUpdateSchema, ctx.body);
    assertId(ctx.params.id);
    for (const key of ['startsAt', 'endsAt'] as const) if (key in payload) payload[key] = toDate(payload[key]);
    return ctx.write((tx) => {
      const banner = tx.edit('banners', ctx.params.id);
      if (!banner) throw ApiError.notFound('Banner not found');
      applyUpdate(banner, payload, (d) => create('banners', d));
      return ok(banner, { message: 'Banner updated' });
    });
  });

  router.delete('/banners/:id', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      if (!tx.remove('banners', ctx.params.id)) throw ApiError.notFound('Banner not found');
      return ok(null, { message: 'Banner deleted' });
    });
  });

  // ---------- Pages

  router.get('/pages/manage', ({ db }) => {
    requireAdmin(db);
    return ok(sortDocs(db.all('pages'), { title: 1 }).map((p) => presentPage(omit(p, ['content']))));
  });

  router.get('/pages/manage/:id', ({ db, params }) => {
    requireAdmin(db);
    assertId(params.id);
    const page = db.get('pages', params.id);
    if (!page) throw ApiError.notFound('Page not found');
    return ok(presentPage(page));
  });

  router.post('/pages', (ctx) => {
    requireAdmin(ctx.db);
    const body = validate(pageSchema, ctx.body);
    body.content = cleanContent(body.content, body.contentFormat) as string;
    return ctx.write((tx) => {
      assertUnique(tx, 'pages', 'slug', body.slug);
      const page = tx.insert('pages', create('pages', body));
      return ok(presentPage(page), { status: 201, message: 'Page created' });
    });
  });

  router.patch('/pages/:id', (ctx) => {
    requireAdmin(ctx.db);
    const body = validate(pageUpdateSchema, ctx.body);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      const existing = tx.get('pages', ctx.params.id);
      if (!existing) throw ApiError.notFound('Page not found');
      if (SYSTEM_PAGE_SLUGS.includes(existing.slug) && body.slug && body.slug !== existing.slug) {
        throw ApiError.badRequest("This page's address can't be changed — the storefront has its own route for it");
      }
      // What ends up stored is what was sent or — when only the format changes — what is already there; html is cleaned
      // either way.
      const format = body.contentFormat ?? existing.contentFormat;
      const content = cleanContent(body.content ?? (format === 'html' ? existing.content : undefined), format);
      if (content !== undefined) body.content = content as string;
      if (body.slug) assertUnique(tx, 'pages', 'slug', body.slug, existing._id);

      const oldHref = pageHref(existing.slug);
      const page = tx.edit('pages', existing._id) as Doc;
      applyUpdate(page, body, (d) => create('pages', d));
      const newHref = pageHref(page.slug);
      if (newHref !== oldHref) rewriteFooterLinks(tx, oldHref, newHref);
      return ok(presentPage(page), { message: 'Page updated' });
    });
  });

  router.delete('/pages/:id', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      const page = tx.remove('pages', ctx.params.id);
      if (!page) throw ApiError.notFound('Page not found');
      const isSystem = SYSTEM_PAGE_SLUGS.includes(page.slug);
      // A custom page is gone for good, so a footer link to it would only lead to "not found". A built-in page falls back to
      // the storefront's own text, so its links stay.
      if (!isSystem) rewriteFooterLinks(tx, pageHref(page.slug), null);
      return ok(null, { message: isSystem ? 'Page reset to its default text' : 'Page deleted' });
    });
  });

  router.get('/pages/:slug', ({ db, params }) => {
    const page = db.find('pages', (p) => p.slug === params.slug);
    if (!page) throw ApiError.notFound('Page not found');
    const data = pick(page, ['slug', 'title', 'content', 'contentFormat', 'updatedAt']);
    // Cleaned on the way out as well, as the API does.
    if (data.contentFormat === 'html') data.content = sanitizePageHtml(data.content);
    return ok(data);
  });
}
