import { Database, EVENTS, RECENT_EVENTS, Tx, type StoredName } from './db';
import { ApiError } from './errors';
import { failure, parseQuery, type Ctx, type Reply } from './http';
import { DEMO_PASSWORD, hashPassword } from './auth';
import { prepareSeed, type SeedFile } from './seed';
import { Persistence, type Meta } from './storage';
import { routes } from './routes';
import { COLLECTIONS, type ActivityEvent, type ChangeNotice, type EngineRequest, type EngineResponse } from './types';
import { newId, nowIso } from './util';

/** Raised to reset every visitor's copy when the stored shape changes in a way old data can't be read with. */
export const DATA_FORMAT = 1;

const STORED: StoredName[] = [...COLLECTIONS, EVENTS, RECENT_EVENTS];
const SEEDING_KEY = 'maroon-demo:seeding';
const POLL_MS = 2000;
/** About what one site may keep in localStorage, in characters. */
const STORAGE_BUDGET = 4_800_000;

export interface EngineOptions {
  /** Where the sample shop is fetched from on a first visit or a reset. */
  seedUrl: string;
  /** Changes whenever a new sample shop ships; a copy made from another one is replaced (with a notice). */
  seedVersion: string;
  /** The storefront's address (links the API builds from CLIENT_URL — the payment return, the share link). */
  shopOrigin: string;
  /** The real API's demo-payments service; empty = every online payment uses the simulated screens. */
  paymentsApi?: string;
  /** Overrides the browser storage (tests run in memory). */
  persistence?: Persistence;
}

export interface EngineStatus {
  /** 'local': the copy lives in this browser and survives reloads. 'memory': storage is blocked — it lasts for the visit. */
  storage: 'local' | 'memory';
  /** Why the sample shop was (re)loaded on this start, if it was. */
  seeded: null | 'first-visit' | 'new-version' | 'reset';
  createdAt: string;
  /** How much of the browser's room for this site the demo uses, 0–1. */
  usage: number;
}

interface StoredMeta extends Meta {
  /** Who made the latest change and what happened in it, for the tabs that hear about it through storage. */
  last?: { source: string | null; activity: ActivityEvent[] };
}

/**
 * The demo's stand-in for the Maroon API: it answers the same requests, with the same rules and the same replies, from the
 * visitor's own copy of the shop. One runs in every storefront tab and in the demo admin's hidden frame; they share the
 * copy in localStorage and keep each other up to date through it.
 */
export class Engine {
  readonly db = new Database();
  private readonly persistence: Persistence;
  private meta: StoredMeta | null = null;
  private seeded: EngineStatus['seeded'] = null;
  /** Another tab moved the copy to a different build of the demo; this one must reload before it changes anything. */
  private outdated = false;
  private readonly listeners = new Set<(notice: ChangeNotice) => void>();
  private poll: ReturnType<typeof setInterval> | null = null;
  private unwatch: (() => void) | null = null;

  private constructor(private readonly options: EngineOptions) {
    this.persistence = options.persistence ?? new Persistence();
  }

  static async open(options: EngineOptions): Promise<Engine> {
    const engine = new Engine(options);
    await engine.load();
    engine.watch();
    return engine;
  }

  get status(): EngineStatus {
    return {
      storage: this.persistence.mode,
      seeded: this.seeded,
      createdAt: this.meta?.createdAt ?? nowIso(),
      usage: Math.min(1, this.persistence.usage() / STORAGE_BUDGET),
    };
  }

  get visitorId(): string {
    return this.meta?.visitorId ?? 'demo-visitor';
  }

  subscribe(listener: (notice: ChangeNotice) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(notice: ChangeNotice) {
    for (const listener of this.listeners) listener(notice);
  }

  // ---------- Loading and seeding

  /** Whether a stored copy was made by this build of the demo, from this sample shop. */
  private isCurrent(meta: Meta | null): boolean {
    return Boolean(meta && meta.format === DATA_FORMAT && meta.seed === this.options.seedVersion);
  }

  private async load() {
    let meta = this.persistence.readMeta();
    if (!this.isCurrent(meta) && this.persistence.mode === 'local') {
      // Another tab may be loading the sample shop right now (a first visit opening the shop and the admin together).
      meta = (await this.waitForOtherSeeder()) ?? meta;
    }
    if (meta && this.isCurrent(meta)) {
      try {
        this.readAll();
        this.meta = meta;
        return;
      } catch (err) {
        console.warn('Demo: the stored copy could not be read, loading the sample shop again', err);
      }
    }
    await this.seed(meta ? 'new-version' : 'first-visit');
  }

  private async waitForOtherSeeder(): Promise<Meta | null> {
    const started = Number(localStorage.getItem(SEEDING_KEY));
    if (!started || Date.now() - started > 15_000) return null;
    for (let waited = 0; waited < 15_000; waited += 150) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const meta = this.persistence.readMeta();
      if (this.isCurrent(meta)) return meta;
    }
    return null;
  }

  private readAll() {
    const files = new Set<string>();
    for (const name of STORED) {
      const json = this.persistence.readCollection(name);
      if (json === null) {
        this.db.clearStored(name);
        continue;
      }
      this.db.deserialize(name, json);
      Persistence.fileRefs(json, files);
    }
    this.persistence.collectGarbage(files);
  }

  private async seed(reason: NonNullable<EngineStatus['seeded']>) {
    const local = this.persistence.mode === 'local';
    if (local) {
      try {
        localStorage.setItem(SEEDING_KEY, String(Date.now()));
      } catch {
        // A browser with no room left (the very case Reset is for): the marker is only a hint to other tabs, and clearing the
        // old copy just below makes the room the new one needs.
      }
    }
    try {
      const response = await fetch(this.options.seedUrl, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`The sample shop could not be loaded (${response.status})`);
      const seedFile = (await response.json()) as SeedFile;
      const prepared = prepareSeed(seedFile, await hashPassword(DEMO_PASSWORD));

      for (const name of COLLECTIONS) this.db.load(name, prepared.collections[name]);
      this.db.loadEvents(prepared.events);

      const meta: StoredMeta = {
        format: DATA_FORMAT,
        seed: this.options.seedVersion,
        rev: 1,
        revs: Object.fromEntries(STORED.map((name) => [name, 1])),
        createdAt: nowIso(),
        shiftMs: prepared.shiftMs,
        visitorId: `demo-${newId()}`,
        last: { source: null, activity: [] },
      };
      if (local) {
        this.persistence.clear();
        this.persistence.write(new Map(STORED.map((name) => [name, this.db.serialize(name)])), meta);
      }
      this.meta = meta;
      this.seeded = reason;
      this.outdated = false;
    } finally {
      if (local) localStorage.removeItem(SEEDING_KEY);
    }
  }

  /** Puts the sample shop back: every change made in this browser is gone, in every tab. */
  async reset() {
    await this.seed('reset');
    this.emit({ rev: this.meta?.rev ?? 1, collections: [...STORED], source: null, activity: [], reset: true });
  }

  // ---------- Staying in step with other tabs

  private watch() {
    this.unwatch = this.persistence.onExternalChange(() => this.sync());
    // A safety net for missed events (a frame's first one in Safari, a tab woken from sleep).
    this.poll = setInterval(() => this.sync(), POLL_MS);
  }

  close() {
    this.unwatch?.();
    if (this.poll) clearInterval(this.poll);
  }

  /** Reloads whatever another tab changed since this one last looked. Cheap when nothing did. */
  sync() {
    if (this.persistence.mode !== 'local' || !this.meta) return;
    const stored = this.persistence.readMeta() as StoredMeta | null;
    if (!stored) return; // being reset by another tab: its new copy arrives in a moment
    if (stored.rev === this.meta.rev && stored.createdAt === this.meta.createdAt) return;

    if (!this.isCurrent(stored)) {
      // Another tab runs a newer (or older) build of the demo and has replaced the copy with its own.
      if (!this.outdated) {
        this.outdated = true;
        this.emit({ rev: stored.rev, collections: [...STORED], source: null, activity: [], reset: true });
      }
      return;
    }
    const isReset = stored.createdAt !== this.meta.createdAt;
    const changed = isReset ? STORED : STORED.filter((name) => stored.revs[name] !== this.meta?.revs[name]);
    for (const name of changed) {
      const json = this.persistence.readCollection(name);
      if (json === null) this.db.clearStored(name);
      else this.db.deserialize(name, json);
    }
    this.meta = stored;
    this.emit({
      rev: stored.rev,
      collections: changed,
      source: stored.last?.source ?? null,
      activity: stored.last?.activity ?? [],
      ...(isReset ? { reset: true } : {}),
    });
  }

  // ---------- Changes

  private write<R>(change: (tx: Tx) => R, source: string | null): R {
    this.sync();
    if (this.outdated) throw new ApiError(409, 'The demo was updated in another tab — reload this page to continue');
    const tx = new Tx(this.db);
    let result: R;
    try {
      result = change(tx);
      if (result instanceof Promise) throw new Error('A demo change must be synchronous — do async work before ctx.write()');
    } catch (err) {
      tx.rollback();
      throw err;
    }
    if (tx.dirty.size === 0) return result;

    const meta = this.meta as StoredMeta;
    const rev = meta.rev + 1;
    const next: StoredMeta = {
      ...meta,
      rev,
      revs: { ...meta.revs, ...Object.fromEntries([...tx.dirty].map((name) => [name, rev])) },
      last: { source, activity: tx.activity },
    };
    try {
      this.persistence.write(new Map([...tx.dirty].map((name) => [name, this.db.serialize(name)])), next);
    } catch (err) {
      tx.rollback();
      throw err;
    }
    this.meta = next;
    this.emit({ rev, collections: [...tx.dirty], source, activity: tx.activity });
    return result;
  }

  // ---------- Requests

  async request(request: EngineRequest, source: string | null = null): Promise<EngineResponse> {
    this.sync();
    const [path, search = ''] = request.path.split('?');
    const method = request.method.toUpperCase();
    const matched = routes.match(method, path);
    if (!matched) return failure(404, `Route not found: ${method} /api/v1${request.path}`);

    const ctx: Ctx = {
      app: request.app,
      method,
      path,
      params: matched.params,
      query: parseQuery(search),
      body: request.body ?? {},
      db: this.db,
      write: (change) => this.write(change, source),
      visitorId: this.visitorId,
      shopOrigin: this.options.shopOrigin,
      paymentsApi: (this.options.paymentsApi ?? '').replace(/\/+$/, ''),
      engine: this,
    };

    try {
      const reply: Reply = await matched.handler(ctx);
      // Copied on the way out, so a reply can't be changed by a later request before it is delivered.
      return { status: reply.status, body: structuredClone(reply.body) };
    } catch (err) {
      if (err instanceof ApiError) return failure(err.statusCode, err.message, err.details);
      console.error('Demo engine error:', err);
      return failure(500, err instanceof Error ? err.message : 'Internal server error');
    }
  }
}
