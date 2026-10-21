import { decryptSecret } from '../../utils/encryption.js';
import { logger } from '../../utils/logger.js';
import {
  CourierError,
  REQUEST_TIMEOUT_MS,
  codAmount,
  itemsSummary,
  localPhone,
  parcelWeight,
  readJson,
  recipientName,
} from './shared.js';

export const key = 'carrybee';
export const label = 'Carrybee';

// Carrybee API v2. Carrybee publishes its documentation to merchants only, so this follows the field list of the
// open-source Carrybee client (github.com/rajibbinalam/carrybee-laravel) and what the live host answers
// (developers.carrybee.com/api/v2/cities is public). What no public source shows — the shape of the "create order"
// answer, and any way to look a parcel up afterwards — is read defensively below; docs/INTEGRATIONS.md lists
// what still has to be confirmed against a real Carrybee account.
const HOSTS = { sandbox: 'https://stage-sandbox.carrybee.com', live: 'https://developers.carrybee.com' };

// delivery_type 1 = normal, product_type 1 = parcel.
const NORMAL_DELIVERY = 1;
const PARCEL = 1;

const baseUrl = (mode) => (mode === 'live' ? HOSTS.live : HOSTS.sandbox);

export const hasCredentials = (cfg) =>
  Boolean(cfg?.clientId && cfg?.clientSecret && cfg?.clientContext && cfg?.storeId);

async function call(cfg, method, path, body) {
  const res = await fetch(`${baseUrl(cfg.mode)}/api/v2${path}`, {
    method,
    headers: {
      'Client-ID': cfg.clientId,
      'Client-Secret': decryptSecret(cfg.clientSecret),
      'Client-Context': decryptSecret(cfg.clientContext),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return { res, data: await readJson(res) };
}

// Every Carrybee answer is { error: false, message, data }; `error: true` (or a non-2xx status) is a refusal.
const accepted = ({ res, data }) => res.ok && data?.error === false;
const refusal = ({ res, data }) => data?.message || `HTTP ${res.status}`;

/** The first value stored under any of `names`, looking through nested objects and lists. */
function findValue(node, names, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 4) return undefined;
  for (const name of names) {
    const value = node[name];
    if (typeof value === 'string' || typeof value === 'number') return value;
  }
  for (const child of Object.values(node)) {
    const found = findValue(child, names, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** A place id from an address lookup, whether it came back as `city_id`, `cityId` or `city: { id }`. */
function findPlaceId(node, place, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 4) return null;
  const direct = Number(node[`${place}_id`] ?? node[`${place}Id`] ?? node[place]?.id);
  if (Number.isInteger(direct) && direct > 0) return direct;
  for (const child of Object.values(node)) {
    const found = findPlaceId(child, place, depth + 1);
    if (found) return found;
  }
  return null;
}

/**
 * Carrybee needs the city and zone (the area is optional) as ids, not as text. POST /address-details turns the
 * shopper's free-text address into them, so a checkout address needs no extra fields.
 */
async function locate(cfg, address) {
  const lookup = await call(cfg, 'POST', '/address-details', { query: address });
  if (!accepted(lookup)) throw new CourierError(`address lookup failed: ${refusal(lookup)}`);

  const cityId = findPlaceId(lookup.data.data, 'city');
  const zoneId = findPlaceId(lookup.data.data, 'zone');
  if (!cityId || !zoneId) throw new CourierError("Carrybee couldn't match the delivery address to a city and zone");
  return { cityId, zoneId, areaId: findPlaceId(lookup.data.data, 'area') };
}

export async function createConsignment(order, cfg) {
  const address = String(order.shippingAddress.fullAddress ?? '').trim();
  const { cityId, zoneId, areaId } = await locate(cfg, address);

  const booking = await call(cfg, 'POST', '/orders', {
    store_id: String(cfg.storeId),
    merchant_order_id: order.orderNumber,
    delivery_type: NORMAL_DELIVERY,
    product_type: PARCEL,
    recipient_phone: localPhone(order),
    recipient_name: recipientName(order),
    recipient_address: address,
    city_id: cityId,
    zone_id: zoneId,
    ...(areaId ? { area_id: areaId } : {}),
    special_instruction: `Maroon order ${order.orderNumber}`,
    product_description: itemsSummary(order),
    item_weight: parcelWeight(cfg.defaultWeight),
    item_quantity: 1,
    collectable_amount: Math.round(codAmount(order)),
  });
  if (!accepted(booking)) throw new CourierError(refusal(booking));

  const consignmentId = findValue(booking.data.data, ['consignment_id', 'consignmentId']);
  if (consignmentId === undefined) {
    // The parcel IS booked — say so, rather than calling it a failure and inviting a second booking.
    logger.warn(`Carrybee: order ${order.orderNumber} was accepted but the answer has no consignment id:`, JSON.stringify(booking.data).slice(0, 500));
    return { status: 'booked' };
  }

  return {
    consignmentId: String(consignmentId),
    trackingCode: String(consignmentId),
    status: String(findValue(booking.data.data, ['order_status', 'status']) ?? 'pending'),
  };
}
