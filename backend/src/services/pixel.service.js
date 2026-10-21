import crypto from 'node:crypto';
import { decryptSecret } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

// Meta retires each Graph API version about two years after release; this is the current one
// (https://developers.facebook.com/docs/graph-api/changelog/versions).
const GRAPH_API_VERSION = 'v26.0';
// A stalled Meta request must not hold up placing an order.
const REQUEST_TIMEOUT_MS = 15000;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

/**
 * Meta matches on digits only, with the country code and without leading zeros — so Bangladesh's
 * local 01712345678 must become 8801712345678 before it is hashed.
 */
function normalizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (/^01\d{9}$/.test(digits)) return `88${digits}`;
  return digits.replace(/^0+/, '');
}

/**
 * Sends a server-side Purchase event to Meta's Conversions API. Never throws — this is a
 * fire-and-forget reliability layer alongside the browser pixel, not something an order should
 * ever fail over. `client` is the browser's `{ ip, userAgent }`, which Meta requires on website events.
 */
export async function sendPurchaseEvent(order, settings, client = {}) {
  // Demo orders are not real purchases — they must never reach the ad account.
  if (env.isDemo) return false;

  try {
    const pixel = settings?.facebookPixel;
    const accessToken = decryptSecret(pixel?.conversionsApiAccessToken);
    if (!pixel?.pixelId || !accessToken) return false;

    // Contact details are hashed; the IP address and user agent are sent as they are.
    const userData = {};
    const phone = normalizePhone(order.shippingAddress?.phone ?? '');
    if (phone) userData.ph = [sha256(phone)];
    if (order.guestInfo?.email) userData.em = [sha256(order.guestInfo.email)];
    if (client.ip) userData.client_ip_address = client.ip;
    if (client.userAgent) userData.client_user_agent = client.userAgent;

    const body = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          // The browser pixel's Purchase must carry the same eventID (the order number) for Meta to
          // count the pair once.
          event_id: String(order.orderNumber),
          action_source: 'website',
          event_source_url: `${env.clientUrl}/order-confirmation/${encodeURIComponent(order.orderNumber)}`,
          user_data: userData,
          custom_data: {
            currency: 'BDT',
            value: order.pricing.grandTotal,
            content_ids: order.items.map((i) => String(i.product)),
            contents: order.items.map((i) => ({ id: String(i.product), quantity: i.quantity })),
          },
        },
      ],
      ...(pixel.testEventCode ? { test_event_code: pixel.testEventCode } : {}),
    };

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${encodeURIComponent(pixel.pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );
    if (!res.ok) {
      logger.warn('Pixel: Conversions API request failed:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('Pixel: Conversions API request errored:', err.message);
    return false;
  }
}
