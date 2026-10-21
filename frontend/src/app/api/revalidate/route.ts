import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';

// Called by the Maroon API after an admin save, so the change shows on the very next page load instead of once
// the cached copy runs out. "settings" = the public settings (theme, store details, footer menu — lib/settings.ts);
// "pages" = admin-written pages (lib/cms.ts); "catalog" = products, brands, categories, banners, blog and FAQ (lib/api.ts). Same development fallback as the API's REVALIDATE_SECRET; in
// production the secret must be set, else this is off.
const ALLOWED_TAGS = ['settings', 'pages', 'catalog'];

const expectedSecret = () =>
  process.env.REVALIDATE_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_insecure_revalidate_secret');

const digest = (value: string) => createHash('sha256').update(value).digest();

export async function POST(request: Request) {
  const expected = expectedSecret();
  if (!expected) return Response.json({ revalidated: false, message: 'Not configured' }, { status: 503 });

  // Hashed first so the comparison is constant-time whatever length was sent.
  const given = request.headers.get('x-revalidate-secret') ?? '';
  if (!timingSafeEqual(digest(given), digest(expected))) {
    return Response.json({ revalidated: false, message: 'Unauthorized' }, { status: 401 });
  }

  // No body (or no usable tags) means "settings", which is what the first version of this endpoint did.
  let tags = ['settings'];
  try {
    const body = (await request.json()) as { tags?: unknown };
    if (Array.isArray(body?.tags)) {
      tags = body.tags.filter((t): t is string => typeof t === 'string' && ALLOWED_TAGS.includes(t));
    }
  } catch {
    // keep the default
  }

  // expire: 0 — the next request must see the new data, not a stale copy while a refresh runs behind it.
  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: true, tags });
}
