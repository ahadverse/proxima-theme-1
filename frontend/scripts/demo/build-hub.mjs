/**
 * Builds the demo's data hub into public/demo-hub/ (see src/demo/hub/main.ts):
 *
 *   hub.js       the engine, bundled for the browser
 *   seed.json    the sample shop (src/demo/seed/seed.json, minified)
 *   index.html   the page the demo admin frames
 *
 * Both files are addressed with ?v=<content hash>, so they can be cached for good. Prints the hub's version, which the
 * storefront build needs as NEXT_PUBLIC_DEMO_HUB_VERSION (scripts/demo/build.mjs passes it on).
 *
 *   node scripts/demo/build-hub.mjs            build once
 *   node scripts/demo/build-hub.mjs --watch    rebuild on every change (development)
 *
 * Settings, from the environment: NEXT_PUBLIC_DEMO_ADMIN_URL (the demo admin's address — the only site allowed to use the
 * hub; several, comma-separated) and NEXT_PUBLIC_DEMO_PAYMENTS_API (the real API's demo-payments service, optional).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '..', '..');
const out = path.join(frontend, 'public', 'demo-hub');
const watch = process.argv.includes('--watch');

const hash = (data) => crypto.createHash('sha256').update(data).digest('hex').slice(0, 12);
// Left out, no other site may use the hub: a storefront-only demo (src/demo/config.ts). `--watch` is development, where the
// admin's usual port is assumed.
const origins = (process.env.NEXT_PUBLIC_DEMO_ADMIN_URL ?? (watch ? 'http://localhost:5173' : ''))
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)
  .map((url) => new URL(url).origin);

// The engine must check requests exactly as the API does.
execFileSync(process.execPath, [path.join(here, 'sync-backend.mjs'), '--check'], { stdio: 'inherit' });

// The admin talks to the hub with its own copy of the message protocol (when the admin's sources are next to this app).
const protocol = path.join(frontend, 'src', 'demo', 'protocol.ts');
const adminProtocol = path.resolve(frontend, '..', 'admin', 'src', 'demo', 'protocol.ts');
if (fs.existsSync(adminProtocol)) {
  const body = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/^\/\/ A copy of .*\n/, '');
  if (body(protocol) !== body(adminProtocol)) {
    console.error('admin/src/demo/protocol.ts differs from frontend/src/demo/protocol.ts — copy it again (keep its first line).');
    process.exit(1);
  }
}

fs.mkdirSync(out, { recursive: true });
const seed = JSON.stringify(JSON.parse(fs.readFileSync(path.join(frontend, 'src', 'demo', 'seed', 'seed.json'), 'utf8')));
const seedVersion = hash(seed);
fs.writeFileSync(path.join(out, 'seed.json'), seed);

const indexHtml = (version) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>Maroon demo — data hub</title>
</head>
<body>
<script src="/demo-hub/hub.js?v=${version}" data-mode="hub"></script>
</body>
</html>
`;

/** After each build: the version is the bundle's own hash, so a changed engine is never served from an old cache. */
const finish = {
  name: 'finish',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length) return;
      const bundle = fs.readFileSync(path.join(out, 'hub.js'));
      const version = hash(bundle);
      fs.writeFileSync(path.join(out, 'index.html'), indexHtml(version));
      fs.writeFileSync(path.join(out, 'version.txt'), version);
      console.log(`demo hub ${version}: hub.js ${Math.round(bundle.length / 1024)} KB, sample shop ${seedVersion} (${Math.round(seed.length / 1024)} KB); admin origins ${origins.join(', ') || 'none (storefront-only demo)'}`);
    });
  },
};

const options = {
  entryPoints: [path.join(frontend, 'src', 'demo', 'hub', 'main.ts')],
  outfile: path.join(out, 'hub.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020', 'safari14'],
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'warning',
  define: {
    __DEMO_SEED_URL__: JSON.stringify(`/demo-hub/seed.json?v=${seedVersion}`),
    __DEMO_SEED_VERSION__: JSON.stringify(seedVersion),
    __DEMO_ADMIN_ORIGINS__: JSON.stringify(origins),
    __DEMO_PAYMENTS_API__: JSON.stringify((process.env.NEXT_PUBLIC_DEMO_PAYMENTS_API || '').replace(/\/+$/, '')),
  },
  plugins: [finish],
};

if (watch) {
  const context = await esbuild.context(options);
  await context.watch();
  console.log('Watching the demo hub for changes…');
} else {
  await esbuild.build(options);
}
