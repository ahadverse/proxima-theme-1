import { DEFAULT_SETTINGS } from '@/types/settings';
import { HubConnection, type ActivityEvent, type ChangeNotice, type DemoReply, type HubStatus } from '../protocol';

/*
 * The storefront's line to the demo's data hub. The hub (public/demo-hub/hub.js, built from src/demo/hub) is loaded into
 * this page and runs the engine here; every API call of the demo build is answered by it (lib/api.ts).
 */

export type { DemoReply };

const HUB_VERSION = process.env.NEXT_PUBLIC_DEMO_HUB_VERSION ?? 'dev';

let connecting: Promise<HubConnection> | null = null;
let status: HubStatus | null = null;
let revision = 0;
let storeName = DEFAULT_SETTINGS.storeName;
const listeners = new Set<() => void>();
const activityListeners = new Set<(event: ActivityEvent, own: boolean) => void>();

function loadHubScript(): Promise<void> {
  if (window.MaroonDemoHub) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `/demo-hub/hub.js?v=${HUB_VERSION}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('The demo store could not be loaded — check your connection and reload the page'));
    document.head.append(script);
  });
}

function notify() {
  for (const listener of listeners) listener();
}

function onNotice(notice: ChangeNotice, own: boolean) {
  // A reset (here or in another tab) or a newer build of the demo elsewhere: start over from what is stored now.
  if (notice.reset) {
    window.location.reload();
    return;
  }
  for (const event of notice.activity) for (const listener of activityListeners) listener(event, own);
  // Pages re-run when the data changes under them — but not for this tab's own changes: whoever made those has updated
  // what it shows already, and re-running every page on each add-to-cart view count would only flicker.
  if (!own) {
    revision += 1;
    notify();
  }
}

/** The hub, connected — loaded on first use. */
export function connectHub(): Promise<HubConnection> {
  connecting ??= (async () => {
    await loadHubScript();
    const hub = window.MaroonDemoHub;
    if (!hub) throw new Error('The demo store could not start');
    const connection = new HubConnection(hub.connect('shop'));
    status = (await connection.ready).status;
    connection.onChange(onNotice);
    notify();
    return connection;
  })();
  return connecting;
}

/** One API call, answered by the visitor's local copy of the shop. */
export async function demoRequest(method: string, path: string, body?: unknown): Promise<DemoReply> {
  const connection = await connectHub();
  return connection.request(method, path, body);
}

export function subscribeToChanges(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Things that happened — an order placed in another tab, a checklist step done — for toasts and the checklist. */
export function onActivity(listener: (event: ActivityEvent, own: boolean) => void) {
  activityListeners.add(listener);
  return () => {
    activityListeners.delete(listener);
  };
}

export const getRevision = () => revision;
export const getStoreName = () => storeName;
export const getHubStatus = () => status;

/** Kept by the demo shell from the settings it loads, for page titles. */
export function setStoreName(name: string) {
  if (name === storeName) return;
  storeName = name;
  notify();
}
