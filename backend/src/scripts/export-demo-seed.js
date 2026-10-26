/**
 * Builds the live demo's sample shop and writes it out as the snapshot the demo loads into each visitor's browser
 * (frontend/src/demo/seed/seed.json — see docs/DEMO_MODE_PLAN.md).
 *
 *   npm run demo:export-seed
 *
 * It runs the normal seed and the sample-activity generator against a scratch database next to the one in MONGODB_URI
 * (`<name>_demo_seed`, wiped before and dropped after), adds what only the demo has (its two documented sign-ins, a
 * sample customer with an order history, gateways and a courier that look set up), and exports every collection as plain
 * JSON: ids as hex strings, dates as ISO strings. The demo shifts every date forward on first load, so the snapshot never
 * looks old. Passwords are not exported; the demo sets its own documented ones.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'demo', 'seed', 'seed.json');

// The scratch database has to be chosen before anything reads MONGODB_URI (config/env.js reads it when imported).
dotenv.config();
const SCRATCH_SUFFIX = '_demo_seed';
const uri = new URL(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/maroon');
const scratchDb = `${uri.pathname.replace(/^\//, '') || 'maroon'}${SCRATCH_SUFFIX}`;
uri.pathname = `/${scratchDb}`;
process.env.MONGODB_URI = uri.toString();
process.env.DEMO_MODE = 'false';

const { default: mongoose } = await import('mongoose');
const { connectDB } = await import('../config/db.js');
const { logger } = await import('../utils/logger.js');
const models = await import('../models/index.js');
const { seedAll } = await import('../seed/seed.js');
const { seedDemoActivity } = await import('../seed/demoActivity.js');

/**
 * The snapshot is made as if it were 23:55 today in the store's timezone, so its "today" is a (nearly) full day of
 * activity. The demo moves the snapshot to the visitor's own today and leaves out whatever would still lie in the future,
 * which gives a natural "today so far" at any hour. Five minutes before midnight, so a run can't cross into tomorrow.
 * (Installed after the models are defined: Mongoose recognises a Date field by the real Date constructor.)
 */
const RealDate = Date;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000; // Asia/Dhaka has no daylight saving
const endOfDay = Math.floor((RealDate.now() + DHAKA_OFFSET_MS) / 86400000) * 86400000 + 86400000 - 5 * 60 * 1000 - DHAKA_OFFSET_MS;
const clockOffset = endOfDay - RealDate.now();
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [RealDate.now() + clockOffset]));
  }
  static now() {
    return RealDate.now() + clockOffset;
  }
};

const { Admin, User, Order, Review, Settings, AnalyticsEvent } = models;

/** Plain JSON: ObjectIds become hex strings and Dates ISO strings, all the way down. */
function plain(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof mongoose.Types.ObjectId) return value.toHexString();
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === 'object') {
    if (value._bsontype === 'ObjectId' || value._bsontype === 'ObjectID') return value.toHexString();
    const out = {};
    for (const [key, inner] of Object.entries(value)) {
      if (inner !== undefined) out[key] = plain(inner);
    }
    return out;
  }
  return value;
}

/** The demo's own sign-ins replace the seed's one admin (who stays as the owner, so the blog posts keep their author). */
async function demoAdmins() {
  const owner = await Admin.findOne({ role: 'super-admin' });
  await Admin.deleteMany({ _id: { $ne: owner._id } });
  owner.name = 'Store Owner';
  owner.email = 'owner@maroon.demo';
  owner.lastLoginAt = new Date(Date.now() - 26 * 60 * 60 * 1000);
  await owner.save();
  await Admin.create({
    name: 'Nadia Karim',
    email: 'staff@maroon.demo',
    role: 'staff',
    passwordHash: owner.passwordHash ?? 'not-exported',
    lastLoginAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  });
}

/**
 * The reviewers from the activity generator become real customers: each gets the delivered orders that contain the
 * products they reviewed (so their reviews show as verified purchases), and the first one — the documented demo customer —
 * a few more, a saved address and a wishlist, so "My Account" has something in it.
 */
async function demoCustomers() {
  const customers = await User.find().sort({ phone: 1 });
  const taken = new Set();
  const assign = async (order, customer) => {
    taken.add(String(order._id));
    await Order.collection.updateOne(
      { _id: order._id },
      { $set: { customer: customer._id, 'shippingAddress.phone': customer.phone }, $unset: { guestInfo: '' } }
    );
  };

  for (const review of await Review.find()) {
    const customer = customers.find((c) => c._id.equals(review.customer));
    const order = await Order.findOne({ orderStatus: 'delivered', customer: null, 'items.product': review.product });
    if (customer && order && !taken.has(String(order._id))) await assign(order, customer);
  }

  const demo = customers[0];
  for (const status of ['delivered', 'delivered', 'shipped', 'pending']) {
    const order = await Order.findOne({ orderStatus: status, customer: null, _id: { $nin: [...taken] } }).sort({ createdAt: -1 });
    if (order) await assign(order, demo);
  }

  const products = await models.Product.find({ isTrending: true }).limit(3).select('_id');
  await User.updateOne(
    { _id: demo._id },
    {
      $set: {
        addresses: [
          { label: 'Home', fullAddress: 'House 14, Road 5, Dhanmondi, Dhaka', area: 'inside_dhaka', isDefault: true },
          { label: 'Office', fullAddress: 'Level 9, Gulshan Avenue, Gulshan 1, Dhaka', area: 'inside_dhaka', isDefault: false },
        ],
        wishlist: products.map((p) => p._id),
      },
    }
  );
}

/**
 * Every online payment method and the default courier look set up, so they all appear at checkout and the admin's
 * Settings pages show them filled in. None of these values is a real credential and none ever leaves the browser.
 */
const DEMO_SETTINGS = {
  'paymentGateways.cod': { enabled: true },
  'paymentGateways.paystation': { enabled: true, mode: 'sandbox', merchantId: 'demo-merchant', password: 'demo-paystation-pass', apiKey: '' },
  'paymentGateways.bkash': { enabled: true, mode: 'sandbox', appKey: 'demo-bkash-app-key', appSecret: 'demo-bkash-secret', username: 'demo-merchant', password: 'demo-bkash-pass' },
  'paymentGateways.nagad': { enabled: true, mode: 'sandbox', merchantId: 'demo-merchant', merchantPrivateKey: 'demo-nagad-private-key', pgPublicKey: 'demo-nagad-public-key' },
  'courier.defaultProvider': 'steadfast',
  'courier.steadfast': { enabled: true, mode: 'sandbox', apiKey: 'demo-steadfast-key', secretKey: 'demo-steadfast-secret' },
  'seo.metaDescription': 'Shop genuine smartphones, laptops, audio and smart-home gadgets with fast delivery across Bangladesh.',
};

/**
 * The seed stamps the catalogue, content and accounts with the moment it ran, so a fresh snapshot would show every product
 * as "added today" (and Analytics' least-selling list, which leaves out the last week's new products, empty). They are
 * dated before the two months of sample activity instead, a few minutes apart so they keep their order; the blog posts
 * are spread over the last few weeks.
 */
async function backdate() {
  const DAY = 24 * 60 * 60 * 1000;
  const start = Date.now() - 120 * DAY;
  const db = mongoose.connection.db;
  for (const name of ['admins', 'attributes', 'banners', 'brands', 'categories', 'faqs', 'pages', 'products', 'settings']) {
    const docs = await db.collection(name).find().sort({ _id: 1 }).project({ _id: 1 }).toArray();
    await Promise.all(
      docs.map((doc, i) => {
        const at = new Date(start + i * 7 * 60 * 1000);
        return db.collection(name).updateOne({ _id: doc._id }, { $set: { createdAt: at, updatedAt: at } });
      })
    );
  }
  const users = await db.collection('users').find().project({ _id: 1 }).toArray();
  await Promise.all(
    users.map((u, i) => {
      const at = new Date(start + (40 + i * 6) * DAY);
      return db.collection('users').updateOne({ _id: u._id }, { $set: { createdAt: at, updatedAt: at } });
    })
  );
  const posts = await db.collection('blogs').find().sort({ _id: 1 }).project({ _id: 1 }).toArray();
  await Promise.all(
    posts.map((p, i) => {
      const at = new Date(Date.now() - [38, 19, 6][i % 3] * DAY - i * 3600 * 1000);
      return db.collection('blogs').updateOne({ _id: p._id }, { $set: { createdAt: at, updatedAt: at, publishedAt: at } });
    })
  );
}

/** Analytics events are by far the biggest collection and are never read one by one, so they are written as rows. */
const EVENT_COLUMNS = ['type', 'product', 'variantSku', 'quantity', 'amount', 'sessionId', 'createdAt'];

async function exportSnapshot() {
  const collections = {};
  const skip = new Set(['analyticsevents', 'carts', 'ratelimithits', 'revokedtokens']);
  for (const model of Object.values(models)) {
    const name = model.collection.collectionName;
    if (skip.has(name)) continue;
    const docs = await model.collection.find().sort({ _id: 1 }).toArray();
    collections[name] = docs.map((doc) => {
      const out = plain(doc);
      delete out.passwordHash;
      return out;
    });
  }

  const events = await AnalyticsEvent.collection.find().sort({ createdAt: 1 }).toArray();
  return {
    format: 1,
    generatedAt: new Date().toISOString(),
    collections,
    analyticsEvents: { columns: EVENT_COLUMNS, rows: events.map((e) => EVENT_COLUMNS.map((c) => plain(e[c]) ?? null)) },
  };
}

async function run() {
  await connectDB();
  if (mongoose.connection.name !== scratchDb || !scratchDb.endsWith(SCRATCH_SUFFIX)) {
    throw new Error(`Refusing to run: connected to "${mongoose.connection.name}", expected the scratch database "${scratchDb}"`);
  }
  logger.info(`Building the demo snapshot in the scratch database ${scratchDb}…`);
  await mongoose.connection.dropDatabase();

  await seedAll();
  await demoAdmins();
  await seedDemoActivity();
  await demoCustomers();
  await Settings.updateOne({ key: 'main' }, { $set: DEMO_SETTINGS });
  await backdate();

  const snapshot = await exportSnapshot();
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(snapshot)}\n`);

  const counts = Object.entries(snapshot.collections).map(([name, docs]) => `${name} ${docs.length}`);
  logger.info(`Wrote ${path.relative(process.cwd(), OUTPUT)} (${Math.round(fs.statSync(OUTPUT).size / 1024)} KB): ${counts.join(', ')}, analytics events ${snapshot.analyticsEvents.rows.length}`);

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

run().catch(async (err) => {
  logger.error('Demo snapshot failed:', err);
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === scratchDb) {
    await mongoose.connection.dropDatabase().catch(() => {});
  }
  process.exit(1);
});
