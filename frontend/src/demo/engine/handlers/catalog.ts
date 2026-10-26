import { categorySchema, brandSchema, attributeSchema, reorderSchema } from '../backend/validators/catalog.validators.js';
import { requireAdmin } from '../auth';
import { ApiError } from '../errors';
import { ok, type Router } from '../http';
import { toSlug } from '../lib/slug';
import { assertId, assertRef, assertUnique, create } from '../schemas';
import type { Doc } from '../types';
import { sortDocs } from '../util';
import { validate } from '../validate';

/** Categories, brands and attributes — category.controller.js, brand.controller.js and attribute.controller.js. */

/** findByIdAndUpdate: the sent fields replace the stored ones (a nested object as a whole), then the model's setters run. */
export function applyUpdate(doc: Doc, payload: Record<string, unknown>, model: (fields: Doc) => Doc) {
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    doc[key] = structuredClone(value);
  }
  Object.assign(doc, model(doc));
  for (const key of Object.keys(doc)) if (doc[key] === undefined) delete doc[key];
}

export function catalogRoutes(router: Router) {
  // ---------- Categories

  router.get('/categories', ({ db, query }) => {
    // By default only top-level categories are returned (what the site nav needs); ?all=true is the full flat tree.
    const categories = query.all === 'true' ? db.all('categories') : db.filter('categories', (c) => c.status === 'active' && c.parent === null);
    return ok(sortDocs(categories, { sortOrder: 1, name: 1 }));
  });

  router.get('/categories/:slug', ({ db, params }) => {
    const category = db.find('categories', (c) => c.slug === params.slug);
    if (!category) throw ApiError.notFound('Category not found');
    return ok(category);
  });

  router.patch('/categories/reorder', (ctx) => {
    requireAdmin(ctx.db);
    const { ids, parent = null } = validate(reorderSchema, ctx.body);
    return ctx.write((tx) => {
      const categories = ids.map((id: string) => tx.get('categories', id)).filter((c: Doc | undefined): c is Doc => Boolean(c));
      if (categories.length !== ids.length) throw ApiError.badRequest('One of those categories no longer exists — reload the page');
      if (categories.some((c: Doc) => String(c.parent ?? null) !== String(parent))) {
        throw ApiError.badRequest('Only categories with the same parent can be ordered together');
      }
      ids.forEach((id: string, index: number) => {
        (tx.edit('categories', id) as Doc).sortOrder = index;
      });
      return ok(null, { message: 'Order saved' });
    });
  });

  router.post('/categories', (ctx) => {
    requireAdmin(ctx.db);
    const body = validate(categorySchema, ctx.body);
    assertRef(body.parent, 'parent');
    const slug = body.slug ? toSlug(body.slug) : toSlug(body.name);
    return ctx.write((tx) => {
      // A new category goes to the end of its menu (or of its parent's subcategories) unless it was given a place.
      let { sortOrder } = body;
      if (sortOrder === undefined) {
        const siblings = tx.all('categories').filter((c) => (c.parent ?? null) === (body.parent ?? null));
        const last = sortDocs(siblings, { sortOrder: -1 })[0];
        sortOrder = last ? last.sortOrder + 1 : 0;
      }
      if (!slug) throw ApiError.badRequest('Validation failed', { slug: 'Path `slug` is required.' });
      assertUnique(tx, 'categories', 'slug', slug);
      const category = tx.insert('categories', create('categories', { ...body, slug, sortOrder }));
      return ok(category, { status: 201, message: 'Category created' });
    });
  });

  router.patch('/categories/:id', (ctx) => {
    requireAdmin(ctx.db);
    const payload = validate(categorySchema.partial(), ctx.body);
    assertId(ctx.params.id);
    assertRef(payload.parent, 'parent');
    if (payload.slug) payload.slug = toSlug(payload.slug);
    return ctx.write((tx) => {
      if (payload.slug) assertUnique(tx, 'categories', 'slug', payload.slug, ctx.params.id);
      const category = tx.edit('categories', ctx.params.id);
      if (!category) throw ApiError.notFound('Category not found');
      applyUpdate(category, payload, (d) => create('categories', d));
      return ok(category, { message: 'Category updated' });
    });
  });

  router.delete('/categories/:id', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      if (tx.all('categories').some((c) => c.parent === ctx.params.id)) throw ApiError.badRequest('Remove or reassign subcategories first');
      if (!tx.remove('categories', ctx.params.id)) throw ApiError.notFound('Category not found');
      return ok(null, { message: 'Category deleted' });
    });
  });

  // ---------- Brands

  router.get('/brands', ({ db, query }) => {
    const brands = query.all === 'true' ? db.all('brands') : db.filter('brands', (b) => b.status === 'active');
    return ok(sortDocs(brands, { sortOrder: 1, name: 1 }));
  });

  router.get('/brands/:slug', ({ db, params }) => {
    const brand = db.find('brands', (b) => b.slug === params.slug);
    if (!brand) throw ApiError.notFound('Brand not found');
    return ok(brand);
  });

  router.patch('/brands/reorder', (ctx) => {
    requireAdmin(ctx.db);
    const { ids } = validate(reorderSchema, ctx.body);
    return ctx.write((tx) => {
      if (ids.some((id: string) => !tx.get('brands', id))) {
        throw ApiError.badRequest('One of those brands no longer exists — reload the page');
      }
      ids.forEach((id: string, index: number) => {
        (tx.edit('brands', id) as Doc).sortOrder = index;
      });
      return ok(null, { message: 'Order saved' });
    });
  });

  router.post('/brands', (ctx) => {
    requireAdmin(ctx.db);
    const body = validate(brandSchema, ctx.body);
    const slug = body.slug ? toSlug(body.slug) : toSlug(body.name);
    return ctx.write((tx) => {
      // A new brand goes to the end of the list unless it was given a place.
      let { sortOrder } = body;
      if (sortOrder === undefined) {
        const last = sortDocs(tx.all('brands'), { sortOrder: -1 })[0];
        sortOrder = last ? last.sortOrder + 1 : 0;
      }
      if (!slug) throw ApiError.badRequest('Validation failed', { slug: 'Path `slug` is required.' });
      assertUnique(tx, 'brands', 'slug', slug);
      const brand = tx.insert('brands', create('brands', { ...body, slug, sortOrder }));
      return ok(brand, { status: 201, message: 'Brand created' });
    });
  });

  router.patch('/brands/:id', (ctx) => {
    requireAdmin(ctx.db);
    const payload = validate(brandSchema.partial(), ctx.body);
    assertId(ctx.params.id);
    if (payload.slug) payload.slug = toSlug(payload.slug);
    return ctx.write((tx) => {
      if (payload.slug) assertUnique(tx, 'brands', 'slug', payload.slug, ctx.params.id);
      const brand = tx.edit('brands', ctx.params.id);
      if (!brand) throw ApiError.notFound('Brand not found');
      applyUpdate(brand, payload, (d) => create('brands', d));
      return ok(brand, { message: 'Brand updated' });
    });
  });

  router.delete('/brands/:id', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      if (!tx.remove('brands', ctx.params.id)) throw ApiError.notFound('Brand not found');
      return ok(null, { message: 'Brand deleted' });
    });
  });

  // ---------- Attributes

  router.get('/attributes', ({ db }) => ok(sortDocs(db.all('attributes'), { name: 1 })));

  router.post('/attributes', (ctx) => {
    requireAdmin(ctx.db);
    const body = validate(attributeSchema, ctx.body);
    const slug = body.slug ? toSlug(body.slug) : toSlug(body.name);
    return ctx.write((tx) => {
      if (!slug) throw ApiError.badRequest('Validation failed', { slug: 'Path `slug` is required.' });
      assertUnique(tx, 'attributes', 'slug', slug);
      const attribute = tx.insert('attributes', create('attributes', { ...body, slug }));
      return ok(attribute, { status: 201, message: 'Attribute created' });
    });
  });

  router.patch('/attributes/:id', (ctx) => {
    requireAdmin(ctx.db);
    const payload = validate(attributeSchema.partial(), ctx.body);
    assertId(ctx.params.id);
    if (payload.slug) payload.slug = toSlug(payload.slug);
    return ctx.write((tx) => {
      if (payload.slug) assertUnique(tx, 'attributes', 'slug', payload.slug, ctx.params.id);
      const attribute = tx.edit('attributes', ctx.params.id);
      if (!attribute) throw ApiError.notFound('Attribute not found');
      applyUpdate(attribute, payload, (d) => create('attributes', d));
      return ok(attribute, { message: 'Attribute updated' });
    });
  });

  router.delete('/attributes/:id', (ctx) => {
    requireAdmin(ctx.db);
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      if (!tx.remove('attributes', ctx.params.id)) throw ApiError.notFound('Attribute not found');
      return ok(null, { message: 'Attribute deleted' });
    });
  });
}
