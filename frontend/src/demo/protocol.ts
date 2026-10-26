/*
 * The messages between the demo's data hub (src/demo/hub, the engine) and the two apps. The storefront loads the hub into
 * its own page; the demo admin, on another domain, frames the hub's page (/demo-hub/index.html) and talks to it through a
 * MessagePort it hands over in a "connect" message. admin/src/demo/protocol.ts is a copy of this file (scripts/demo/
 * build-hub.mjs checks that it still is).
 */

export const CONNECT = 'maroon-demo/connect';
/** Sent by the hub's page to the window that framed or opened it, once it can take a connection. */
export const HUB_LOADED = 'maroon-demo/hub-loaded';

export type AppName = 'shop' | 'admin';

/** What the hub says about the visitor's copy of the shop. */
export interface HubStatus {
  storage: 'local' | 'memory';
  seeded: null | 'first-visit' | 'new-version' | 'reset';
  createdAt: string;
  usage: number;
}

export interface ActivityEvent {
  kind: 'order.placed' | 'order.status' | 'order.paid' | 'review.submitted' | 'checklist.done';
  at: string;
  [detail: string]: unknown;
}

export interface ChangeNotice {
  rev: number;
  collections: string[];
  source: string | null;
  activity: ActivityEvent[];
  reset?: boolean;
}

/** App → hub. `body` may hold File objects (an upload). */
export interface RequestMessage {
  type: 'request';
  id: number;
  method: string;
  path: string;
  body?: unknown;
}

/** Hub → app. */
export type HubMessage =
  | { type: 'ready'; clientId: string; status: HubStatus }
  | { type: 'failed'; message: string }
  | { type: 'response'; id: number; status: number; body: unknown }
  | { type: 'changed'; notice: ChangeNotice };

/** A request's answer, shaped like an HTTP response from the API. */
export interface DemoReply {
  status: number;
  body: unknown;
}

/**
 * One app's line to the hub: requests out, answers and change notices back. A notice says whether this connection's own
 * request caused it (`own`) — the app already refreshed what it changed, but may still want what happened (a checklist step).
 */
export class HubConnection {
  readonly ready: Promise<{ clientId: string; status: HubStatus }>;
  private clientId: string | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, (reply: DemoReply) => void>();
  private readonly listeners = new Set<(notice: ChangeNotice, own: boolean) => void>();
  private readonly port: MessagePort;

  constructor(port: MessagePort) {
    this.port = port;
    this.ready = new Promise((resolve, reject) => {
      port.onmessage = (event: MessageEvent<HubMessage>) => {
        const message = event.data;
        if (message.type === 'ready') {
          this.clientId = message.clientId;
          resolve({ clientId: message.clientId, status: message.status });
        } else if (message.type === 'failed') {
          reject(new Error(message.message));
        } else if (message.type === 'response') {
          this.pending.get(message.id)?.({ status: message.status, body: message.body });
          this.pending.delete(message.id);
        } else if (message.type === 'changed') {
          const own = message.notice.source !== null && message.notice.source === this.clientId;
          for (const listener of this.listeners) listener(message.notice, own);
        }
      };
    });
    port.start();
  }

  async request(method: string, path: string, body?: unknown): Promise<DemoReply> {
    await this.ready;
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.port.postMessage({ type: 'request', id, method, path, body } satisfies RequestMessage);
    });
  }

  onChange(listener: (notice: ChangeNotice, own: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
