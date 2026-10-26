import { COLLECTIONS, type ActivityEvent, type AnalyticsEvent, type CollectionName, type Doc } from './types';
import { clone, newId, nowIso } from './util';

/**
 * Analytics events are stored in two parts: the sample shop's thousands (written once, when the copy is made) and the ones
 * this visitor's browsing adds. A product view then only re-saves the short second list.
 */
export const EVENTS = 'analyticsevents';
export const RECENT_EVENTS = 'analyticsevents-recent';
export type StoredName = CollectionName | typeof EVENTS | typeof RECENT_EVENTS;

/** The visitor's copy of the shop, in memory. Reads come straight from here; every change goes through a Tx. */
export class Database {
  private readonly maps = new Map<CollectionName, Map<string, Doc>>();
  private readonly lists = new Map<CollectionName, Doc[]>();
  private sampleEvents: AnalyticsEvent[] = [];
  private recentEvents: AnalyticsEvent[] = [];
  private eventList: AnalyticsEvent[] | null = null;

  constructor() {
    for (const name of COLLECTIONS) this.maps.set(name, new Map());
  }

  private map(name: CollectionName): Map<string, Doc> {
    const map = this.maps.get(name);
    if (!map) throw new Error(`Unknown collection ${name}`);
    return map;
  }

  /** Every document, in the order they were stored (Mongo's natural order). Treat as read-only. */
  all(name: CollectionName): Doc[] {
    let list = this.lists.get(name);
    if (!list) {
      list = [...this.map(name).values()];
      this.lists.set(name, list);
    }
    return list;
  }

  get(name: CollectionName, id: unknown): Doc | undefined {
    return typeof id === 'string' ? this.map(name).get(id) : undefined;
  }

  find(name: CollectionName, test: (doc: Doc) => boolean): Doc | undefined {
    return this.all(name).find(test);
  }

  filter(name: CollectionName, test: (doc: Doc) => boolean): Doc[] {
    return this.all(name).filter(test);
  }

  /** Replaces a whole collection — when it is loaded from storage or the seed. */
  load(name: CollectionName, docs: Doc[]) {
    const map = this.map(name);
    map.clear();
    for (const doc of docs) map.set(doc._id, doc);
    this.lists.delete(name);
  }

  /** @internal Tx only. */
  set(name: CollectionName, doc: Doc) {
    const map = this.map(name);
    const isNew = !map.has(doc._id);
    map.set(doc._id, doc);
    if (isNew) this.lists.delete(name);
    else {
      const list = this.lists.get(name);
      if (list) {
        const index = list.findIndex((d) => d._id === doc._id);
        if (index >= 0) list[index] = doc;
      }
    }
  }

  /** @internal Tx only. */
  delete(name: CollectionName, id: string) {
    if (this.map(name).delete(id)) this.lists.delete(name);
  }

  /** Every analytics event, oldest first. Treat as read-only. */
  get events(): AnalyticsEvent[] {
    this.eventList ??= this.sampleEvents.concat(this.recentEvents);
    return this.eventList;
  }

  /** Replaces the events — the sample shop's when a copy is made, none of this visitor's yet. */
  loadEvents(sample: AnalyticsEvent[], recent: AnalyticsEvent[] = []) {
    this.sampleEvents = sample;
    this.recentEvents = recent;
    this.eventList = null;
  }

  /** @internal Tx only. Returns how to take them back out. */
  appendEvents(events: AnalyticsEvent[]): () => void {
    const length = this.recentEvents.length;
    this.recentEvents.push(...events);
    this.eventList = null;
    return () => {
      this.recentEvents.length = length;
      this.eventList = null;
    };
  }

  /** What a collection is saved as. Analytics events are rows rather than objects: there are thousands of them. */
  serialize(name: StoredName): string {
    if (name !== EVENTS && name !== RECENT_EVENTS) return JSON.stringify(this.all(name));
    const events = name === EVENTS ? this.sampleEvents : this.recentEvents;
    return JSON.stringify({ columns: EVENT_COLUMNS, rows: events.map((e) => EVENT_COLUMNS.map((c) => e[c])) });
  }

  deserialize(name: StoredName, json: string) {
    if (name !== EVENTS && name !== RECENT_EVENTS) {
      this.load(name, JSON.parse(json) as Doc[]);
      return;
    }
    const { columns, rows } = JSON.parse(json) as { columns: (keyof AnalyticsEvent)[]; rows: unknown[][] };
    const events = rows.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])) as unknown as AnalyticsEvent);
    if (name === EVENTS) this.sampleEvents = events;
    else this.recentEvents = events;
    this.eventList = null;
  }

  /** Empties a stored part (its key is missing from storage). */
  clearStored(name: StoredName) {
    if (name === EVENTS) this.sampleEvents = [];
    else if (name === RECENT_EVENTS) this.recentEvents = [];
    else this.load(name, []);
    this.eventList = null;
  }
}

export const EVENT_COLUMNS: (keyof AnalyticsEvent)[] = [
  'type',
  'product',
  'variantSku',
  'quantity',
  'amount',
  'sessionId',
  'date',
  'createdAt',
];

interface InsertOptions {
  /** Keep the timestamps the fields already carry (sample data, back-dated rows). */
  keepTimestamps?: boolean;
}

/**
 * One request's changes. Documents are edited in place (as a Mongoose document is), and the first edit of each one keeps
 * a copy, so if the request fails — or the browser has no room to save it — `rollback()` puts everything back.
 */
export class Tx {
  readonly now: string;
  readonly dirty = new Set<StoredName>();
  readonly activity: ActivityEvent[] = [];
  private readonly undo: (() => void)[] = [];
  private readonly snapshotted = new Set<string>();

  constructor(private readonly db: Database, now = nowIso()) {
    this.now = now;
  }

  get<T extends Doc = Doc>(name: CollectionName, id: unknown): T | undefined {
    return this.db.get(name, id) as T | undefined;
  }

  all(name: CollectionName): Doc[] {
    return this.db.all(name);
  }

  /** Stores a new document with an id, timestamps and Mongoose's `__v`, and returns it. */
  insert(name: CollectionName, fields: Partial<Doc>, options: InsertOptions = {}): Doc {
    const doc: Doc = {
      _id: fields._id ?? newId(Date.parse(this.now)),
      ...fields,
      __v: fields.__v ?? 0,
      createdAt: options.keepTimestamps ? (fields.createdAt ?? this.now) : this.now,
      updatedAt: options.keepTimestamps ? (fields.updatedAt ?? fields.createdAt ?? this.now) : this.now,
    } as Doc;
    this.db.set(name, doc);
    this.snapshotted.add(`${name}/${doc._id}`);
    this.undo.push(() => this.db.delete(name, doc._id));
    this.dirty.add(name);
    return doc;
  }

  /**
   * The stored document, ready to change in place. `touch` (the default) stamps updatedAt, as a Mongoose save or update
   * does; stock-status bookkeeping passes false, as the API's `{ timestamps: false }` update does.
   */
  edit<T extends Doc = Doc>(name: CollectionName, id: unknown, { touch = true } = {}): T | undefined {
    const doc = this.db.get(name, id);
    if (!doc) return undefined;
    const key = `${name}/${doc._id}`;
    if (!this.snapshotted.has(key)) {
      this.snapshotted.add(key);
      const before = clone(doc);
      this.undo.push(() => this.db.set(name, before));
    }
    if (touch) doc.updatedAt = this.now;
    this.dirty.add(name);
    return doc as T;
  }

  remove(name: CollectionName, id: unknown): Doc | undefined {
    const doc = this.db.get(name, id);
    if (!doc) return undefined;
    const key = `${name}/${doc._id}`;
    const before = this.snapshotted.has(key) ? doc : clone(doc);
    this.snapshotted.add(key);
    this.db.delete(name, doc._id);
    this.undo.push(() => this.db.set(name, before));
    this.dirty.add(name);
    return doc;
  }

  addEvents(events: AnalyticsEvent[]) {
    if (events.length === 0) return;
    this.undo.push(this.db.appendEvents(events));
    this.dirty.add(RECENT_EVENTS);
  }

  /** Something the other app may want to show straight away (a new order, a status change). */
  note(kind: ActivityEvent['kind'], detail: Record<string, unknown> = {}) {
    this.activity.push({ kind, at: this.now, ...detail });
  }

  rollback() {
    for (const step of this.undo.reverse()) step();
    this.undo.length = 0;
    this.dirty.clear();
    this.activity.length = 0;
  }
}
