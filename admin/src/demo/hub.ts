import { CONNECT, HUB_LOADED, HubConnection, type ActivityEvent, type ChangeNotice, type DemoReply, type HubStatus } from './protocol';
import { DEMO_HUB_URL } from './config';

/*
 * The demo admin's line to the visitor's copy of the shop. That copy lives in the storefront domain's browser storage, so
 * the admin frames the storefront's data hub page (DEMO_HUB_URL) and talks to it over a MessagePort. A frame only sees the
 * same storage as the store when the two addresses are the same site (demo.admin.meroon.com and demo.meroon.com are; two
 * *.vercel.app names are not) — otherwise the hub opens as a small window instead, which always has the store's storage.
 */

const LOAD_TIMEOUT_MS = 20_000;
const hubOrigin = () => new URL(DEMO_HUB_URL).origin;

// Hosting suffixes where every customer's name is its own site (an abridged Public Suffix List).
const SHARED_SUFFIXES = [
  'vercel.app', 'netlify.app', 'pages.dev', 'workers.dev', 'github.io', 'onrender.com', 'herokuapp.com', 'web.app',
  'firebaseapp.com', 'azurewebsites.net', 'cloudfront.net', 'fly.dev', 'up.railway.app', 'surge.sh', 'ngrok.app', 'ngrok-free.app',
];

/** example.com for www.shop.example.com; shop.example.com.bd for a country second-level domain; the whole name on a shared host. */
function siteOf(hostname: string): string {
  if (hostname === 'localhost' || /^[\d.]+$/.test(hostname) || hostname.startsWith('[')) return hostname === '127.0.0.1' ? 'localhost' : hostname;
  const shared = SHARED_SUFFIXES.find((suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`));
  const labels = hostname.split('.');
  if (shared) return labels.slice(-(shared.split('.').length + 1)).join('.');
  const countrySecondLevel = labels.length >= 3 && labels.at(-1)!.length === 2 && ['com', 'net', 'org', 'gov', 'edu', 'ac', 'co'].includes(labels.at(-2)!);
  return labels.slice(countrySecondLevel ? -3 : -2).join('.');
}

/** Whether a frame of the store's hub sees the store's own storage from here (same site), or a window is needed. */
export const sharesStorageWithStore = () => siteOf(window.location.hostname) === siteOf(new URL(DEMO_HUB_URL).hostname);

/** The browser won't share storage with a frame here: the hub has to be opened as a window, which needs a click. */
export class WindowNeeded extends Error {
  constructor() {
    super('The demo admin needs a small helper window to reach your demo store');
    this.name = 'WindowNeeded';
  }
}

let connecting: Promise<HubConnection> | null = null;
let status: HubStatus | null = null;
const changeListeners = new Set<(notice: ChangeNotice, own: boolean) => void>();
const activityListeners = new Set<(event: ActivityEvent, own: boolean) => void>();

/** Waits for the hub page (in `target`) to say it is ready, then hands it one end of a channel. */
function handshake(target: () => Window | null): Promise<HubConnection> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error("The demo store didn't answer — check your connection and reload the page"));
    }, LOAD_TIMEOUT_MS);
    function onMessage(event: MessageEvent) {
      if (event.origin !== hubOrigin() || event.data?.type !== HUB_LOADED || event.source !== target()) return;
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      const channel = new MessageChannel();
      target()?.postMessage({ type: CONNECT, app: 'admin' }, hubOrigin(), [channel.port2]);
      resolve(new HubConnection(channel.port1));
    }
    window.addEventListener('message', onMessage);
  });
}

async function adopt(connection: HubConnection): Promise<HubConnection> {
  status = (await connection.ready).status;
  connection.onChange((notice, own) => {
    for (const listener of changeListeners) listener(notice, own);
    for (const event of notice.activity) for (const listener of activityListeners) listener(event, own);
  });
  return connection;
}

function connectThroughFrame(): Promise<HubConnection> {
  const frame = document.createElement('iframe');
  frame.src = DEMO_HUB_URL;
  frame.title = 'Demo store data';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
  const connection = handshake(() => frame.contentWindow);
  document.body.append(frame);
  return connection.then(adopt);
}

/** The hub, connected. Rejects with WindowNeeded where only a window can reach the store's storage. */
export function connectHub(): Promise<HubConnection> {
  connecting ??= sharesStorageWithStore() ? connectThroughFrame() : Promise.reject(new WindowNeeded());
  return connecting;
}

/** The fallback: the hub in a small window of its own. Must be called from a click. */
export function connectThroughWindow(): Promise<HubConnection> {
  const popup = window.open(`${DEMO_HUB_URL}?window=1`, 'maroon-demo-hub', 'popup,width=420,height=300');
  if (!popup) return Promise.reject(new Error('Your browser blocked the window — allow pop-ups for this site and try again'));
  connecting = handshake(() => popup).then(adopt);
  return connecting;
}

/** One API call, answered by the visitor's copy of the shop. */
export async function demoRequest(method: string, path: string, body?: unknown): Promise<DemoReply> {
  const connection = await (connecting ?? connectHub());
  return connection.request(method, path, body);
}

export const getHubStatus = () => status;

export function onChange(listener: (notice: ChangeNotice, own: boolean) => void) {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

export function onActivity(listener: (event: ActivityEvent, own: boolean) => void) {
  activityListeners.add(listener);
  return () => {
    activityListeners.delete(listener);
  };
}
