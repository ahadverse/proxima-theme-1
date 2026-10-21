import { decryptSecret } from '../../utils/encryption.js';
import { CourierError, REQUEST_TIMEOUT_MS, firstError, readJson, recipientName, codAmount } from './shared.js';

export const key = 'steadfast';
export const label = 'Steadfast';

// Steadfast's own WooCommerce plugin calls https://portal.packzy.com/api/v1/create_order; the
// portal.steadfast.com.bd host this used to point at does not resolve in DNS.
const BASE_URL = 'https://portal.packzy.com/api/v1';

export const hasCredentials = (cfg) => Boolean(cfg?.apiKey && cfg?.secretKey);

function authHeaders(cfg) {
  return {
    'Content-Type': 'application/json',
    'Api-Key': decryptSecret(cfg.apiKey),
    'Secret-Key': decryptSecret(cfg.secretKey),
  };
}

/** Books a consignment with Steadfast. Throws a CourierError when the booking did not happen. */
export async function createConsignment(order, cfg) {
  const res = await fetch(`${BASE_URL}/create_order`, {
    method: 'POST',
    headers: authHeaders(cfg),
    body: JSON.stringify({
      invoice: order.orderNumber,
      recipient_name: recipientName(order),
      recipient_phone: order.shippingAddress.phone,
      recipient_address: order.shippingAddress.fullAddress,
      cod_amount: codAmount(order),
      note: `Maroon order ${order.orderNumber}`,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await readJson(res);
  const consignment = data?.consignment;
  // Success is { status: 200, consignment: {...} }; a rejected booking is { status: 400, errors: { field: [message] } }.
  if (!res.ok || Number(data?.status) !== 200 || !consignment?.consignment_id) {
    throw new CourierError(firstError(data, res.statusText));
  }

  return {
    consignmentId: String(consignment.consignment_id),
    trackingCode: consignment.tracking_code,
    status: consignment.status || 'pending',
  };
}

export async function getStatus(consignmentId, cfg) {
  const res = await fetch(`${BASE_URL}/status_by_cid/${encodeURIComponent(consignmentId)}`, {
    headers: authHeaders(cfg),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = await readJson(res);
  // Documented answer: { status: 200, delivery_status: 'in_review' }.
  return res.ok && typeof data?.delivery_status === 'string' ? data.delivery_status : null;
}
