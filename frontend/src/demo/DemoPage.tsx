'use client';

import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import NotFound from '@/app/not-found';
import { ListingSkeleton } from '@/components/product/ListingSkeleton';
import ProductLoading from '@/app/product/[slug]/loading';
import { Skeleton } from '@/components/ui/Skeleton';
import { isNotFoundError, resolveServerTree, toSearchParams } from './pageRunner';
import { loadRouteModule, type DemoRouteName } from './routes';
import { useDemoRevision, useStoreName } from './client/hooks';

const LISTINGS_WITH_FILTERS = new Set<string>(['products', 'category', 'brand']);
const LISTINGS = new Set<string>([...LISTINGS_WITH_FILTERS, 'deals', 'newArrivals']);

function RouteLoading({ route }: { route: string }) {
  if (route === 'product') return <ProductLoading />;
  if (LISTINGS.has(route)) return <ListingSkeleton withFilters={LISTINGS_WITH_FILTERS.has(route)} />;
  return (
    <div role="status" aria-busy="true" className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <span className="sr-only">Loading…</span>
      <Skeleton className="mb-5 h-4 w-48 bg-white/10" />
      <Skeleton className="mb-6 h-9 w-72 bg-white/10" />
      <Skeleton className="h-[420px] w-full rounded-xl bg-white/10" />
    </div>
  );
}

/**
 * A storefront page in the demo build. The server sent only this placeholder (it has none of the visitor's data); here the
 * page's own content module is loaded and run in the browser against the local copy of the shop, and its output is shown —
 * the same page, the same components. It runs again when the data changes (an edit in the demo admin, an order placed in
 * another tab).
 */
export function DemoPage({ route }: { route: DemoRouteName }) {
  return (
    <Suspense fallback={<RouteLoading route={route} />}>
      <PageRunner route={route} />
    </Suspense>
  );
}

function PageRunner({ route }: { route: DemoRouteName }) {
  const params = useParams<Record<string, string | string[]>>();
  const searchParams = useSearchParams();
  const revision = useDemoRevision();
  const storeName = useStoreName();
  const paramsKey = JSON.stringify(params);
  const queryKey = searchParams.toString();
  const key = `${route}?${paramsKey}&${queryKey}`;
  const [output, setOutput] = useState<{ key: string; node: ReactNode } | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const input = {
      params: Promise.resolve(JSON.parse(paramsKey) as Record<string, string | string[]>),
      searchParams: Promise.resolve(toSearchParams(new URLSearchParams(queryKey))),
    };

    (async () => {
      const page = await loadRouteModule(route);
      try {
        const node = await resolveServerTree(await page.default(input));
        if (!cancelled) setOutput({ key, node });
      } catch (error) {
        if (cancelled) return;
        if (isNotFoundError(error)) setOutput({ key, node: <NotFound /> });
        else setFailure(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [route, paramsKey, queryKey, key, revision]);

  // The page's heading is its title — what generateMetadata gives it on a normal build's server (the home page's heading is
  // the store's own SEO title, which stands alone there too).
  useLayoutEffect(() => {
    if (!output) return;
    const heading = container.current?.querySelector('h1')?.textContent?.trim();
    document.title = !heading ? storeName : heading.includes(storeName) ? heading : `${heading} | ${storeName}`;
  }, [output, storeName]);

  // Thrown during render, so the app's own error handling shows it — a failure here is a bug, not a state to style.
  if (failure) throw failure;
  // A new address shows its own loading state; a data refresh of the same page keeps the current one on screen.
  if (!output || output.key !== key) return <RouteLoading route={route} />;
  return (
    <div ref={container} className="contents">
      {output.node}
    </div>
  );
}
