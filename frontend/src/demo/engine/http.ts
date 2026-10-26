import type { Database, Tx } from './db';
import type { Engine } from './engine';
import type { AppName } from './types';

/** One request, as a controller sees it (the parts of Express's `req` the API's controllers use). */
export interface Ctx {
  app: AppName;
  method: string;
  /** Below /api/v1, without the query string. */
  path: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  // The parsed JSON body, typed loosely as Express's req.body is; each handler validates what it reads.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  /** The data as it is now (synced with other tabs at the start of the request). */
  db: Database;
  /**
   * Runs one change: `change` must be synchronous — it sees the latest data, and what it changes is saved, and announced to
   * every other tab, when it returns (or rolled back if it throws). Do slow work (hashing a password, shrinking a
   * picture) before calling this.
   */
  write<R>(change: (tx: Tx) => R): R;
  /** This browser's anonymous visitor id (the API's analytics session cookie). */
  visitorId: string;
  /** The shop's own address, for links the API would build from CLIENT_URL. */
  shopOrigin: string;
  /** The real API's demo-payments service ('' = every online payment uses the simulated screens). */
  paymentsApi: string;
  /** For the demo's own requests (reset, status). */
  engine: Engine;
}

export interface Reply {
  status: number;
  body: unknown;
}

/** The API's sendSuccess. */
export function ok(
  data: unknown = null,
  { status = 200, message = 'OK', meta }: { status?: number; message?: string; meta?: unknown } = {}
): Reply {
  return { status, body: { success: true, message, data, ...(meta ? { meta } : {}) } };
}

export function failure(status: number, message: string, details?: unknown): Reply {
  return { status, body: { success: false, message, ...(details ? { details } : {}) } };
}

type Handler = (ctx: Ctx) => Reply | Promise<Reply>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

/** Express-style routing: `:name` segments, first match wins, registered in the API's own order. */
export class Router {
  private readonly routes: Route[] = [];

  on(method: string, path: string, handler: Handler) {
    const keys: string[] = [];
    const source = path
      .split('/')
      .map((segment) => {
        if (!segment.startsWith(':')) return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        keys.push(segment.slice(1));
        return '([^/]+)';
      })
      .join('/');
    this.routes.push({ method, pattern: new RegExp(`^${source}/?$`, 'i'), keys, handler });
    return this;
  }

  get(path: string, handler: Handler) {
    return this.on('GET', path, handler);
  }
  post(path: string, handler: Handler) {
    return this.on('POST', path, handler);
  }
  patch(path: string, handler: Handler) {
    return this.on('PATCH', path, handler);
  }
  delete(path: string, handler: Handler) {
    return this.on('DELETE', path, handler);
  }

  match(method: string, path: string): { handler: Handler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const found = route.pattern.exec(path);
      if (!found) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(found[i + 1]);
      });
      return { handler: route.handler, params };
    }
    return null;
  }
}

/** A query string the way Express hands it over: one string per key, an array when a key repeats. */
export function parseQuery(search: string): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  for (const [rawKey, value] of new URLSearchParams(search)) {
    const key = rawKey.endsWith('[]') ? rawKey.slice(0, -2) : rawKey;
    const existing = query[key];
    if (existing === undefined) query[key] = rawKey.endsWith('[]') ? [value] : value;
    else query[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return query;
}
