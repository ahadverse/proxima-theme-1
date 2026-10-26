import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

/** A page's content module: the async server component its page.tsx renders in a normal build. */
export interface PageModule {
  default: (props: PageInput) => ReactNode | Promise<ReactNode>;
}

export interface PageInput {
  params: Promise<Record<string, string | string[]>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const isAsyncFunction = (value: unknown): value is (props: unknown) => Promise<ReactNode> =>
  typeof value === 'function' && Object.prototype.toString.call(value) === '[object AsyncFunction]';

/**
 * A page's output is ready to render in the browser once every async server component in it has been run: React can render
 * the ordinary ones (sync functions and client components) itself, but not an async one (CmsPage, for instance). Those are
 * awaited here, as the server would, and replaced by what they return. Everything else is left exactly as it is.
 */
export async function resolveServerTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServerTree));
  if (!isValidElement(node)) return node;

  const element = node as ReactElement<{ children?: ReactNode }>;
  if (isAsyncFunction(element.type)) return resolveServerTree(await element.type(element.props));

  const { children } = element.props;
  if (children === undefined) return element;
  if (Array.isArray(children)) {
    // Written as separate JSX children (not a mapped list), so they are passed back the same way — as an array they would
    // need keys.
    const resolved = await Promise.all(children.map(resolveServerTree));
    return resolved.every((child, i) => child === children[i]) ? element : cloneElement(element, undefined, ...resolved);
  }
  const resolved = await resolveServerTree(children);
  return resolved === children ? element : cloneElement(element, undefined, resolved);
}

/** The error Next's notFound() throws. */
export function isNotFoundError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;404');
}

/** The address bar's query string the way Next hands it to a page: one value per key, or a list when it repeats. */
export function toSearchParams(query: URLSearchParams): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const key of new Set(query.keys())) {
    const values = query.getAll(key);
    result[key] = values.length > 1 ? values : values[0];
  }
  return result;
}
