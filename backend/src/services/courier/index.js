import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import * as carrybee from './carrybee.js';
import * as pathao from './pathao.js';
import * as steadfast from './steadfast.js';

/**
 * Courier provider registry. Each provider implements:
 *   { key, label, hasCredentials(cfg), createConsignment(order, cfg), getStatus?(consignmentId, cfg) }
 * `createConsignment` returns { consignmentId?, trackingCode?, status } and throws a CourierError when nothing was booked.
 *
 * Exactly one courier books new orders: `settings.courier.defaultProvider` (empty = none, parcels are booked by
 * hand). It books only if it is also switched on and has every credential, so a half-filled form never sends
 * anything and never breaks an order-status change.
 */
export const providers = { steadfast, pathao, carrybee };

// Settings written before there was a choice only ever had Steadfast.
const providerKey = (settings) => {
  const key = settings?.courier?.defaultProvider ?? 'steadfast';
  return providers[key] ? key : null;
};

/**
 * Books the order with the default courier. Never throws — courier booking must not be allowed to break an
 * order-status update. Returns a `courier` subdocument shape ready to assign onto `order.courier`.
 */
export async function createConsignment(order, settings) {
  const key = providerKey(settings);
  if (!key) return { status: 'not_configured' };

  const provider = providers[key];
  const cfg = settings.courier?.[key];
  // The live demo must never book a real parcel, whatever the Settings say.
  if (env.isDemo || !cfg?.enabled || !provider.hasCredentials(cfg)) return { provider: key, status: 'not_configured' };

  try {
    return { provider: key, ...(await provider.createConsignment(order, cfg)) };
  } catch (err) {
    logger.warn(`${provider.label}: consignment creation failed:`, err.message);
    return { provider: key, status: 'booking_failed' };
  }
}

/**
 * Whether an order still needs booking. A failed or skipped booking is tried again the next time the order
 * moves to Processing; one that was accepted without a consignment id (status "booked") never is.
 */
export const needsBooking = (courier) => !courier?.consignmentId && courier?.status !== 'booked';

/** The courier's own status for a booked parcel, or null if it can't be asked (demo, no credentials, not supported). */
export async function getConsignmentStatus(providerKeyOrNull, consignmentId, settings) {
  const provider = providers[providerKeyOrNull];
  const cfg = settings?.courier?.[providerKeyOrNull];
  if (env.isDemo || !provider?.getStatus || !consignmentId || !cfg?.enabled || !provider.hasCredentials(cfg)) return null;

  try {
    return await provider.getStatus(consignmentId, cfg);
  } catch (err) {
    logger.warn(`${provider.label}: status check failed:`, err.message);
    return null;
  }
}
