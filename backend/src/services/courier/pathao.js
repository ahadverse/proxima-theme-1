import crypto from 'node:crypto';
import { decryptSecret } from '../../utils/encryption.js';
import {
  CourierError,
  REQUEST_TIMEOUT_MS,
  codAmount,
  firstError,
  itemsSummary,
  localPhone,
  parcelWeight,
  readJson,
  recipientName,
} from './shared.js';

export const key = 'pathao';
export const label = 'Pathao';

// Pathao Merchant API (merchant.pathao.com → Developer API). Sandbox and live are separate hosts with separate
// credentials; Pathao publishes public sandbox credentials in its docs, live ones come from the merchant dashboard.
const HOSTS = { sandbox: 'https://courier-api-sandbox.pathao.com', live: 'https://api-hermes.pathao.com' };
const API = '/aladdin/api/v1';

// delivery_type 48 = normal delivery, item_type 2 = parcel (see Pathao's "Enums").
const NORMAL_DELIVERY = 48;
const PARCEL = 2;

// Pathao's limits on what it accepts (recipient_name 3–100, recipient_address 10–220, a 01… mobile number).
const MOBILE = /^01[3-9]\d{8}$/;
const NAME_MIN = 3;
const NAME_MAX = 100;
const ADDRESS_MIN = 10;
const ADDRESS_MAX = 220;

const baseUrl = (mode) => (mode === 'live' ? HOSTS.live : HOSTS.sandbox);

export const hasCredentials = (cfg) =>
  Boolean(cfg?.clientId && cfg?.clientSecret && cfg?.username && cfg?.password && Number.parseInt(cfg?.storeId, 10) > 0);

const credentials = (cfg) => ({
  mode: cfg.mode,
  clientId: cfg.clientId,
  clientSecret: decryptSecret(cfg.clientSecret),
  username: cfg.username,
  password: decryptSecret(cfg.password),
});

// ---- Access token -----------------------------------------------------------------------------------------
// POST /aladdin/api/v1/issue-token returns a Bearer token that lasts 5 days plus a refresh token. It is kept in
// memory (one per set of credentials) so a booking is one request, not two; a restart simply asks again.
const tokens = new Map();
const issuing = new Map();
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

const tokenKey = (c) =>
  crypto.createHash('sha256').update([c.mode, c.clientId, c.clientSecret, c.username, c.password].join('\n')).digest('hex');

async function requestToken(c, body) {
  const res = await fetch(`${baseUrl(c.mode)}${API}/issue-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: c.clientId, client_secret: c.clientSecret, ...body }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = await readJson(res);
  if (!res.ok || !data?.access_token) {
    throw new CourierError(`sign-in was refused (HTTP ${res.status}): ${data?.message || data?.error_description || res.statusText}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
}

async function loadToken(c, id) {
  const cached = tokens.get(id);
  if (cached && cached.expiresAt - Date.now() > EXPIRY_MARGIN_MS) return cached.accessToken;

  let token;
  if (cached?.refreshToken) {
    try {
      token = await requestToken(c, { grant_type: 'refresh_token', refresh_token: cached.refreshToken });
    } catch {
      // The refresh token may have expired too — sign in again below.
    }
  }
  token ??= await requestToken(c, { grant_type: 'password', username: c.username, password: c.password });
  tokens.set(id, token);
  return token.accessToken;
}

/** Concurrent bookings share one sign-in instead of each asking Pathao for a token. */
function accessToken(c) {
  const id = tokenKey(c);
  if (!issuing.has(id)) issuing.set(id, loadToken(c, id).finally(() => issuing.delete(id)));
  return issuing.get(id);
}

/**
 * One authenticated call. If Pathao rejects the token (401) the request was not processed, so it is safe to sign
 * in again and repeat it once. Nothing else is ever repeated: a timeout or a 5xx on "create order" may still have
 * booked the parcel, and booking it twice would send two couriers.
 */
async function call(c, method, path, body) {
  for (let attempt = 0; ; attempt++) {
    const token = await accessToken(c);
    const res = await fetch(`${baseUrl(c.mode)}${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 401 && attempt === 0) {
      // Count the token as expired: the next sign-in refreshes it (or logs in again if the refresh token is gone too).
      const rejected = tokens.get(tokenKey(c));
      if (rejected) rejected.expiresAt = 0;
      continue;
    }
    return { res, data: await readJson(res) };
  }
}

// ---- Booking ----------------------------------------------------------------------------------------------

/** Checks the parts of an order Pathao would refuse, so a bad address doesn't cost a round trip (or a half-made booking). */
function recipientDetails(order) {
  const phone = localPhone(order);
  if (!MOBILE.test(phone)) throw new CourierError("the delivery phone number isn't a Bangladeshi mobile number");

  const address = String(order.shippingAddress.fullAddress ?? '').trim();
  if (address.length < ADDRESS_MIN) throw new CourierError(`the delivery address is shorter than ${ADDRESS_MIN} characters`);

  let name = String(recipientName(order)).trim();
  if (name.length < NAME_MIN) name = `${name} Customer`.trim();

  return { phone, name: name.slice(0, NAME_MAX), address: address.slice(0, ADDRESS_MAX) };
}

/**
 * POST /aladdin/api/v1/orders. The city, zone and area are left out on purpose: Pathao works them out from the
 * address, which is how a free-text checkout address has to be handled (sending null for them is refused).
 */
export async function createConsignment(order, cfg) {
  const { phone, name, address } = recipientDetails(order);
  const c = credentials(cfg);

  const { res, data } = await call(c, 'POST', '/orders', {
    store_id: Number.parseInt(cfg.storeId, 10),
    merchant_order_id: order.orderNumber,
    recipient_name: name,
    recipient_phone: phone,
    recipient_address: address,
    delivery_type: NORMAL_DELIVERY,
    item_type: PARCEL,
    item_quantity: 1,
    item_weight: parcelWeight(cfg.defaultWeight),
    item_description: itemsSummary(order),
    special_instruction: `Maroon order ${order.orderNumber}`,
    amount_to_collect: Math.round(codAmount(order)),
  });

  // Success is { type: 'success', code: 200, data: { consignment_id, order_status, delivery_fee } }; a refusal is
  // { type: 'error', code: 422, message, errors: { field: [message] } }.
  const consignmentId = data?.data?.consignment_id;
  if (!res.ok || !consignmentId) throw new CourierError(firstError(data, `HTTP ${res.status}`));

  return {
    consignmentId: String(consignmentId),
    // Pathao's tracking id is the consignment id.
    trackingCode: String(consignmentId),
    status: data.data.order_status || 'Pending',
  };
}

/** GET /aladdin/api/v1/orders/{consignment_id}/info → the order's current status ("Pending", "Delivered"…). */
export async function getStatus(consignmentId, cfg) {
  const { res, data } = await call(credentials(cfg), 'GET', `/orders/${encodeURIComponent(consignmentId)}/info`);
  const status = data?.data?.order_status_slug || data?.data?.order_status;
  return res.ok && typeof status === 'string' ? status : null;
}
