import { normalizePhone } from '../../utils/phone.js';

// A stalled courier API must not hold up the admin's order-status update.
export const REQUEST_TIMEOUT_MS = 15000;

/** A booking that could not be made. The message goes to the server log, never to a customer. */
export class CourierError extends Error {}

/** The parsed JSON body, or null when the courier answered with something else (an HTML error page from its gateway, say). */
export async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** The first complaint in a courier's error body — `{ errors: { field: [message] } }` or a plain `message`. */
export function firstError(body, fallback) {
  const fieldError = Object.values(body?.errors ?? {}).flat()[0];
  return fieldError || body?.message || fallback;
}

/** A signed-in customer's name lives on their account (the caller populates it), a guest's on the order. */
export const recipientName = (order) => order.guestInfo?.name || order.customer?.name || 'Customer';

/** What the courier collects at the door: the whole total for cash on delivery, nothing for a prepaid order. */
export const codAmount = (order) => (order.paymentMethod === 'cod' ? order.pricing.grandTotal : 0);

/** "2 × Phone case, 1 × Charger" — what is in the parcel, cut to a length a courier's form accepts. */
export function itemsSummary(order, maxLength = 200) {
  const text = order.items.map((i) => `${i.quantity} × ${i.title}`).join(', ');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/** The delivery phone in its local 01XXXXXXXXX form, which is what Bangladeshi couriers validate against. */
export const localPhone = (order) => normalizePhone(order.shippingAddress.phone);

/** A weight in kg inside the 0.5–10 range these couriers accept; Settings' default is used for every parcel. */
export function parcelWeight(configured) {
  const kg = Number(configured);
  if (!Number.isFinite(kg)) return 0.5;
  return Math.min(10, Math.max(0.5, kg));
}
