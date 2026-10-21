import cron from 'node-cron';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { encryptSecret } from '../utils/encryption.js';
import { Settings } from '../models/Settings.js';
import { Admin } from '../models/Admin.js';
import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Cart } from '../models/Cart.js';
import { Review } from '../models/Review.js';
import { Coupon } from '../models/Coupon.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { IncompleteOrder } from '../models/IncompleteOrder.js';
import { FraudProfile } from '../models/FraudProfile.js';
import { seedAll } from '../seed/seed.js';
import { seedDemoActivity } from '../seed/demoActivity.js';
import * as orderService from './order.service.js';

/**
 * The live sales demo (DEMO_MODE=true). One copy of the store runs on our own domain so prospects can
 * click through everything — checkout with every payment method included — without any real payment,
 * courier booking or ad-pixel event happening, and without visitors' details piling up.
 *
 * The switch itself is `env.isDemo`; the guards live next to the thing they guard (services/courier,
 * pixel.service, fraud.service). This file is the rest: the fake payment, the demo's settings and the
 * nightly reset.
 */

/**
 * "Pays" an order without contacting a gateway and returns where the shopper is sent next — straight
 * to the confirmation page, exactly as a successful gateway callback would.
 */
export async function completeDemoPayment(order) {
  await orderService.applyPaymentResult(order, {
    success: true,
    transactionId: `DEMO-${order.orderNumber}`,
    raw: { demo: true },
  });
  const orderNumber = encodeURIComponent(order.orderNumber);
  return `${env.clientUrl}/order-confirmation/${orderNumber}?payment=success&value=${order.pricing.grandTotal}&currency=BDT`;
}

// Placeholder credentials. They exist only so the three online methods count as "set up" and appear at
// checkout; nothing ever sends them anywhere, because every call that would use them is short-circuited.
function demoGateways() {
  const fake = (label) => encryptSecret(`demo-${label}`);
  return {
    'paymentGateways.paystation': { enabled: true, mode: 'sandbox', merchantId: 'demo', password: fake('paystation-password'), apiKey: fake('paystation-key') },
    'paymentGateways.bkash': { enabled: true, mode: 'sandbox', appKey: 'demo', appSecret: fake('bkash-secret'), username: 'demo', password: fake('bkash-password') },
    'paymentGateways.nagad': { enabled: true, mode: 'sandbox', merchantId: 'demo', merchantPrivateKey: fake('nagad-private'), pgPublicKey: fake('nagad-public') },
  };
}

export async function ensureDemoSettings() {
  await Settings.updateOne({ key: 'main' }, { $set: demoGateways() }, { upsert: true, setDefaultsOnInsert: true });
}

/**
 * Wipes everything a visitor could have created and rebuilds the demo from its baseline: the catalogue
 * and content come back exactly as seeded, the demo admin sign-in is restored, extra staff accounts are
 * removed, and two months of believable activity are regenerated. Store settings (name, logo, theme…) are
 * left alone — the demo owner configures those once and they should survive the reset.
 */
export async function resetDemoData() {
  const started = Date.now();
  await Promise.all([
    Order.deleteMany({}),
    User.deleteMany({}),
    Cart.deleteMany({}),
    Review.deleteMany({}),
    Coupon.deleteMany({}),
    InventoryLog.deleteMany({}),
    AnalyticsEvent.deleteMany({}),
    IncompleteOrder.deleteMany({}),
    FraudProfile.deleteMany({}),
  ]);

  await seedAll();
  await restoreDemoAdmin();
  await Product.updateMany({}, { $set: { viewCount: 0, addToCartCount: 0, purchaseCount: 0, revenueTotal: 0 } });
  await ensureDemoSettings();
  await seedDemoActivity();

  logger.info(`Demo data reset in ${Math.round((Date.now() - started) / 100) / 10}s.`);
}

async function restoreDemoAdmin() {
  const keep = env.seedAdmin.email.toLowerCase();
  await Admin.deleteMany({ email: { $ne: keep } });
  await Admin.updateOne(
    { email: keep },
    { $set: { role: 'super-admin', isActive: true, passwordHash: await Admin.hashPassword(env.seedAdmin.password) } }
  );
}

/** Run once at start-up: make a fresh demo database usable, then schedule the nightly reset. */
export async function startDemoMode() {
  logger.info('DEMO_MODE is on — payments, courier booking and ad pixels are simulated.');

  await ensureDemoSettings();
  if ((await Order.estimatedDocumentCount()) === 0) {
    logger.info('Demo database has no activity yet — generating it…');
    await resetDemoData();
  }

  if (!cron.validate(env.demo.resetCron)) {
    logger.error(`DEMO_RESET_CRON "${env.demo.resetCron}" is not a valid cron expression — the nightly reset is disabled.`);
    return;
  }
  cron.schedule(
    env.demo.resetCron,
    () => resetDemoData().catch((err) => logger.error('Demo reset failed:', err)),
    { timezone: env.storeTimezone }
  );
  logger.info(`Demo data resets on "${env.demo.resetCron}" (${env.storeTimezone}).`);
}
