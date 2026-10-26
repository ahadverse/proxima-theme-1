/**
 * Runs before `npm run dev` and `npm run build` (the "predev" / "prebuild" scripts), so that switching the live demo on is only
 * a change of environment — nothing else to remember:
 *
 *   NEXT_PUBLIC_DEMO_MODE=true     builds the demo's data hub (public/demo-hub) first; the storefront then runs on the visitor's
 *                                  own copy of the shop in their browser and never calls the API
 *   anything else                  a normal store: any hub left over from an earlier demo build is removed, so a customer's
 *                                  copy can't ship one
 *
 * The values are read the way Next.js reads them (.env.local, .env.production…, then the real environment, which wins), so
 * the same lines work in a file and in a host's project settings. Settings are listed in .env.local.example.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '..', '..');
const hub = path.join(frontend, 'public', 'demo-hub');
const dev = process.argv.includes('--dev');

const { loadEnvConfig } = createRequire(path.join(frontend, 'package.json'))('@next/env');
loadEnvConfig(frontend, dev, { info() {}, error: console.error });

if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
  fs.rmSync(hub, { recursive: true, force: true });
} else {
  // In development the demo admin is assumed to be on its usual port; a production build without NEXT_PUBLIC_DEMO_ADMIN_URL is a
  // storefront-only demo (src/demo/config.ts).
  if (dev) process.env.NEXT_PUBLIC_DEMO_ADMIN_URL ??= 'http://localhost:5173';
  const build = spawnSync(process.execPath, [path.join(here, 'build-hub.mjs')], { stdio: 'inherit', cwd: frontend, env: process.env });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
