import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { StorageFullError } from './errors';

/**
 * Where the visitor's copy of the shop is kept: the shop domain's localStorage.
 *
 * Not IndexedDB, although it is bigger: Safari (and so every browser on an iPhone) gives a frame its own IndexedDB for each
 * site it is embedded in, so the demo admin's hidden frame on the shop's domain would see an empty database. localStorage
 * is shared with a same-site frame in every browser engine (proven in docs/DEMO_MODE_PLAN.md §4.1), and so are its
 * `storage` events, which tell every other tab that something changed.
 *
 * Each collection is one key holding its documents as compressed JSON (the whole sample shop is about 300K characters of
 * a budget of about 5 million). An uploaded picture is stored once under its own key and referenced from the documents,
 * so saving a product doesn't recompress its photos.
 */

const PREFIX = 'maroon-demo:';
export const META_KEY = `${PREFIX}meta`;
const collectionKey = (name: string) => `${PREFIX}c:${name}`;
const fileKey = (hash: string) => `${PREFIX}f:${hash}`;
const FILE_REF = 'demo-file:';

export interface Meta {
  /** The engine's storage format; a new one resets the visitor's copy. */
  format: number;
  /** Which sample shop this copy was made from; a new snapshot resets it too. */
  seed: string;
  /** Goes up by one with every saved change… */
  rev: number;
  /** …and records, per collection, the change that last touched it — what another tab compares to see what to reload. */
  revs: Record<string, number>;
  /** When this browser's copy was made. */
  createdAt: string;
  /** How far the sample data's dates were moved forward, so "last 30 days" is always now. */
  shiftMs: number;
  /** This browser's anonymous visitor id (the API's analytics cookie). */
  visitorId: string;
}

// ---------- Text encoding

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const compress = (text: string) => toBase64(deflateSync(strToU8(text), { level: 6 }));
export const decompress = (text: string) => strFromU8(inflateSync(fromBase64(text)));

/** A short, stable name for a file's content (FNV-1a, 52 bits) — the same picture saved twice is stored once. */
function hashOf(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  return `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}${text.length.toString(36)}`;
}

// Long data: URLs inside a collection's JSON — what an upload in the demo turns into (see engine/handlers/uploads.ts).
const INLINE_FILE = /"(data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{2048,})"/g;
const FILE_REFERENCE = new RegExp(`"${FILE_REF}([a-z0-9]+)"`, 'g');

const isQuotaError = (err: unknown) =>
  err instanceof DOMException &&
  (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014);

/** The browser's localStorage, or null when it is blocked (some private windows, storage switched off). */
function openLocalStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = `${PREFIX}probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export class Persistence {
  private readonly storage: Storage | null;
  private readonly files = new Map<string, string>();

  constructor(storage: Storage | null = typeof window === 'undefined' ? null : openLocalStorage()) {
    this.storage = storage;
  }

  /** 'local' when the copy survives a reload; 'memory' when the browser won't store it (it lasts until the tab closes). */
  get mode(): 'local' | 'memory' {
    return this.storage ? 'local' : 'memory';
  }

  readMeta(): Meta | null {
    if (!this.storage) return null;
    try {
      const text = this.storage.getItem(META_KEY);
      return text ? (JSON.parse(text) as Meta) : null;
    } catch {
      return null;
    }
  }

  /** A collection's stored JSON (its pictures put back in), or null if it isn't stored. */
  readCollection(name: string): string | null {
    const text = this.storage?.getItem(collectionKey(name));
    if (!text) return null;
    return decompress(text).replace(FILE_REFERENCE, (match, hash: string) => {
      const data = this.readFile(hash);
      return data ? JSON.stringify(data) : match;
    });
  }

  private readFile(hash: string): string | null {
    const cached = this.files.get(hash);
    if (cached) return cached;
    const data = this.storage?.getItem(fileKey(hash)) ?? null;
    if (data) this.files.set(hash, data);
    return data;
  }

  /**
   * Saves changed collections (name → its JSON) and then the meta that announces them. All or nothing: if the browser runs
   * out of room part-way, everything written so far is put back and StorageFullError is raised.
   */
  write(collections: Map<string, string>, meta: Meta) {
    const storage = this.storage;
    if (!storage) return;
    const previous = new Map<string, string | null>();
    const put = (key: string, value: string) => {
      if (!previous.has(key)) previous.set(key, storage.getItem(key));
      storage.setItem(key, value);
    };

    try {
      for (const [name, json] of collections) {
        const slim = json.replace(INLINE_FILE, (_match, data: string) => {
          const hash = hashOf(data);
          if (!this.files.has(hash) && storage.getItem(fileKey(hash)) === null) put(fileKey(hash), data);
          this.files.set(hash, data);
          return `"${FILE_REF}${hash}"`;
        });
        put(collectionKey(name), compress(slim));
      }
      put(META_KEY, JSON.stringify(meta));
    } catch (err) {
      for (const [key, value] of previous) {
        try {
          if (value === null) storage.removeItem(key);
          else storage.setItem(key, value);
        } catch {
          // Restoring an older, smaller value can't run out of room; nothing else to do.
        }
      }
      if (isQuotaError(err)) throw new StorageFullError();
      throw err;
    }
  }

  /** Removes the stored pictures nothing refers to any more (a deleted product's photos). */
  collectGarbage(referenced: Set<string>) {
    const storage = this.storage;
    if (!storage) return;
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (!key?.startsWith(`${PREFIX}f:`)) continue;
      const hash = key.slice(`${PREFIX}f:`.length);
      if (!referenced.has(hash)) {
        storage.removeItem(key);
        this.files.delete(hash);
      }
    }
  }

  /** The stored pictures a collection's JSON refers to. */
  static fileRefs(json: string, into: Set<string>) {
    for (const match of json.matchAll(INLINE_FILE)) into.add(hashOf(match[1]));
  }

  /** Wipes the visitor's copy — every key the demo wrote. */
  clear() {
    const storage = this.storage;
    if (!storage) return;
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX)) storage.removeItem(key);
    }
    this.files.clear();
  }

  /** How much of the browser's room the demo is using, in characters (each key and value counts). */
  usage(): number {
    const storage = this.storage;
    if (!storage) return 0;
    let total = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(PREFIX)) total += key.length + (storage.getItem(key)?.length ?? 0);
    }
    return total;
  }

  /** Calls back when another tab (or the demo admin's frame) saved a change, or the site's data was cleared. */
  onExternalChange(callback: () => void): () => void {
    if (!this.storage) return () => {};
    const listener = (event: StorageEvent) => {
      if (event.key === META_KEY || event.key === null) callback();
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }
}
