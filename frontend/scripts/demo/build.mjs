/**
 * The live sales demo's build of the storefront (docs/DEMO_MODE_PLAN.md):
 *
 *   npm run demo:build    the data hub, then `next build` with NEXT_PUBLIC_DEMO_MODE=true (then `next start` as usual)
 *   npm run demo:dev      the same with `next dev`, rebuilding the hub on every change
 *
 * Settings (the demo's Vercel project, or .env.local): NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_DEMO_ADMIN_URL (the demo admin's
 * address), and optionally NEXT_PUBLIC_DEMO_PAYMENTS_API (the real API's demo-payments service, for sandbox payments) and
 * NEXT_PUBLIC_DEMO_CTA_URL / NEXT_PUBLIC_DEMO_CTA_LABEL (the "Get this store" button).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '..', '..');
const dev = process.argv.includes('--dev');
const nextArgs = process.argv.slice(2).filter((arg) => arg !== '--dev');
const nextBin = createRequire(path.join(frontend, 'package.json')).resolve('next/dist/bin/next');
const versionFile = path.join(frontend, 'public', 'demo-hub', 'version.txt');

if (dev) {
  fs.rmSync(versionFile, { force: true });
  spawn(process.execPath, [path.join(here, 'build-hub.mjs'), '--watch'], { stdio: 'inherit', cwd: frontend });
  while (!fs.existsSync(versionFile)) await new Promise((resolve) => setTimeout(resolve, 200));
} else {
  const hub = spawnSync(process.execPath, [path.join(here, 'build-hub.mjs')], { stdio: 'inherit', cwd: frontend });
  if (hub.status !== 0) process.exit(hub.status ?? 1);
}

const env = {
  ...process.env,
  NEXT_PUBLIC_DEMO_MODE: 'true',
  // In development the hub is rebuilt under the same address, so it is never cached (next.config.ts).
  NEXT_PUBLIC_DEMO_HUB_VERSION: dev ? 'dev' : fs.readFileSync(versionFile, 'utf8').trim(),
};
const next = spawn(process.execPath, [nextBin, dev ? 'dev' : 'build', ...nextArgs], { stdio: 'inherit', cwd: frontend, env });
next.on('exit', (code) => process.exit(code ?? 0));
