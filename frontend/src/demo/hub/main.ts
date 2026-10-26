import { Engine } from '../engine/engine';
import type { EngineRequest } from '../engine/types';
import { CONNECT, HUB_LOADED, type AppName, type HubMessage, type RequestMessage } from '../protocol';

/*
 * The demo's data hub: the engine (src/demo/engine) and the line each app talks to it on. scripts/demo/build-hub.mjs
 * bundles this into public/demo-hub/hub.js.
 *
 *   - The storefront loads hub.js into its own page and calls MaroonDemoHub.connect('shop').
 *   - The demo admin, on its own domain, frames /demo-hub/ (whose script tag has data-mode="hub") — or opens it as a small
 *     window when its browser won't share storage with a frame — and hands it a MessagePort in a "connect" message. Only the
 *     demo admin's own address may connect; the page refuses to be framed by anyone else (next.config.ts).
 */

declare const __DEMO_SEED_URL__: string;
declare const __DEMO_SEED_VERSION__: string;
declare const __DEMO_ADMIN_ORIGINS__: string[];
declare const __DEMO_PAYMENTS_API__: string;

let opening: Promise<Engine> | null = null;

function openEngine(): Promise<Engine> {
  opening ??= Engine.open({
    seedUrl: new URL(__DEMO_SEED_URL__, window.location.origin).href,
    seedVersion: __DEMO_SEED_VERSION__,
    shopOrigin: window.location.origin,
    paymentsApi: __DEMO_PAYMENTS_API__,
  });
  return opening;
}

const newClientId = (app: AppName) => `${app}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function serve(port: MessagePort, app: AppName) {
  const clientId = newClientId(app);
  const send = (message: HubMessage) => port.postMessage(message);

  port.onmessage = async (event: MessageEvent<RequestMessage>) => {
    const request = event.data;
    if (request?.type !== 'request') return;
    try {
      const engine = await openEngine();
      const method = request.method.toUpperCase() as EngineRequest['method'];
      const reply = await engine.request({ app, method, path: request.path, body: request.body }, clientId);
      send({ type: 'response', id: request.id, status: reply.status, body: reply.body });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The demo store could not answer';
      send({ type: 'response', id: request.id, status: 503, body: { success: false, message } });
    }
  };
  port.start();

  openEngine().then(
    (engine) => {
      send({ type: 'ready', clientId, status: engine.status });
      engine.subscribe((notice) => send({ type: 'changed', notice }));
    },
    (err: unknown) => send({ type: 'failed', message: err instanceof Error ? err.message : String(err) })
  );
}

/** Page mode: the storefront's own connection. */
function connect(app: AppName): MessagePort {
  const channel = new MessageChannel();
  serve(channel.port1, app);
  return channel.port2;
}

/** Hub mode: serves the demo admin, which frames this page or opened it as a window. */
function listen() {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type !== CONNECT || !__DEMO_ADMIN_ORIGINS__.includes(event.origin)) return;
    const port = event.ports[0];
    if (port) serve(port, 'admin');
  });
  // Opening the engine straight away means its storage is live before the admin's first request (and Safari delivers
  // this frame's first storage event only once it has touched storage).
  void openEngine();
  const announce = (target: Window | null) => {
    for (const origin of __DEMO_ADMIN_ORIGINS__) target?.postMessage({ type: HUB_LOADED }, origin);
  };
  announce(window.parent !== window ? window.parent : null);
  announce(window.opener as Window | null);
  if (window.opener && window.parent === window) showWindowNote();
}

/** Opened as a small window (the admin's fallback when its browser won't share storage with a frame): say what it is for. */
function showWindowNote() {
  document.title = 'Maroon demo — keep open';
  document.body.innerHTML = `
    <div style="font:14px/1.5 system-ui,sans-serif;color:#f5efe9;background:#1a1310;position:fixed;inset:0;display:flex;
      flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6b3410,#d4932f);
        display:flex;align-items:center;justify-content:center;font-weight:800;margin-bottom:14px">M</div>
      <strong style="font-size:16px">Keep this window open</strong>
      <p style="color:#a89a8f;max-width:300px;margin:8px 0 0">It connects the demo admin to your demo store's data in this
        browser. You can move it out of the way.</p>
    </div>`;
}

declare global {
  interface Window {
    MaroonDemoHub?: { connect: typeof connect };
  }
}

window.MaroonDemoHub = { connect };
if ((document.currentScript as HTMLScriptElement | null)?.dataset.mode === 'hub') listen();
