/**
 * The demo's engine (src/demo/engine) checks every request with the API's own validators, so a form refuses exactly what
 * the real shop refuses, with the same message. They are copied here from backend/src unchanged — only `zod` is read from
 * the `zod3` package (the backend's major version; the storefront's own tooling uses another one).
 *
 *   node scripts/demo/sync-backend.mjs          copy them again (after editing a validator in the backend)
 *   node scripts/demo/sync-backend.mjs --check  fail if a copy is out of date (run by the demo build)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '..', '..');
const backendSrc = path.resolve(frontend, '..', 'backend', 'src');
const target = path.join(frontend, 'src', 'demo', 'engine', 'backend');
const check = process.argv.includes('--check');

// A deploy that builds the storefront on its own (no backend folder next to it) uses the copies as they are.
if (!fs.existsSync(backendSrc)) {
  console.log(`Backend sources not found at ${backendSrc} — using the demo's copies of the validators as they are.`);
  process.exit(0);
}

const header = (source) =>
  `// Copied from backend/src/${source} by scripts/demo/sync-backend.mjs — edit the original, then run that script.\n`;

function copied(source) {
  const text = fs.readFileSync(path.join(backendSrc, source), 'utf8').replace(/\r\n/g, '\n');
  return header(source) + text.replace(/from 'zod';/g, "from 'zod3';");
}

/** The one model a validator needs is Mongoose-free here: just its list of banner placements. */
function bannerStub() {
  const model = fs.readFileSync(path.join(backendSrc, 'models', 'Banner.js'), 'utf8');
  const types = model.match(/export const BANNER_TYPES = (\[[^\]]*\]);/);
  if (!types) throw new Error('BANNER_TYPES not found in backend/src/models/Banner.js');
  return `${header('models/Banner.js').replace('Copied from', 'Taken from')}export const BANNER_TYPES = ${types[1]};\n`;
}

// Validators for the API's demo-payments service: the engine calls that service over HTTP, it never validates with them.
const SERVER_ONLY = new Set(['demoPayments.validators.js']);

const files = new Map();
for (const name of fs.readdirSync(path.join(backendSrc, 'validators'))) {
  if (name.endsWith('.js') && !SERVER_ONLY.has(name)) files.set(path.join('validators', name), copied(`validators/${name}`));
}
files.set(path.join('utils', 'phone.js'), copied('utils/phone.js'));
files.set(path.join('models', 'Banner.js'), bannerStub());

const stale = [];
for (const [relative, text] of files) {
  const file = path.join(target, relative);
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : null;
  if (current === text) continue;
  if (check) {
    stale.push(relative);
  } else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    console.log(`updated ${path.relative(frontend, file)}`);
  }
}

if (stale.length) {
  console.error(`The demo's copies of the API validators are out of date: ${stale.join(', ')}\nRun: node scripts/demo/sync-backend.mjs`);
  process.exit(1);
}
if (check) console.log('Demo validators match the backend.');
