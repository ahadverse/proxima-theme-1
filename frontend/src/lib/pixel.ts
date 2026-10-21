// One place that reports shopper activity to every ad / analytics tag the store has switched on:
// the Facebook Pixel (`fbq`) and Google's tag (`gtag`, for Google Analytics 4 and Google Ads). Each function
// is a no-op for a tag that isn't configured, is blocked, or is still loading — tracking must never break the UI.
import type { CartLine } from '@/store/cartStore';

type TagFn = (...args: unknown[]) => void;

interface TrackingWindow {
  fbq?: TagFn;
  gtag?: TagFn;
  /** "AW-123456789/label" — set by the layout when a Google Ads Purchase conversion is configured. */
  __maroonAdsPurchaseTarget?: string;
}

const CURRENCY = 'BDT';

/** What a tag needs to know about a product: the product's id is the same one the server-side events use. */
export interface TrackedItem {
  id: string;
  name: string;
  /** One unit's price. */
  price: number;
  quantity: number;
  variant?: string | null;
}

const tags = () => (typeof window === 'undefined' ? null : (window as unknown as TrackingWindow));

function facebook(event: string, params: Record<string, unknown>, eventId?: string) {
  const fbq = tags()?.fbq;
  if (typeof fbq !== 'function') return;
  // The same eventID on the server-side (Conversions API) event is how Meta counts the pair once.
  if (eventId) fbq('track', event, params, { eventID: eventId });
  else fbq('track', event, params);
}

function google(event: string, params: Record<string, unknown>) {
  const gtag = tags()?.gtag;
  if (typeof gtag === 'function') gtag('event', event, params);
}

const valueOf = (items: TrackedItem[]) => items.reduce((sum, i) => sum + i.price * i.quantity, 0);
const countOf = (items: TrackedItem[]) => items.reduce((sum, i) => sum + i.quantity, 0);
const facebookContents = (items: TrackedItem[]) => items.map((i) => ({ id: i.id, quantity: i.quantity }));
const googleItems = (items: TrackedItem[]) =>
  items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    price: i.price,
    quantity: i.quantity,
    ...(i.variant ? { item_variant: i.variant } : {}),
  }));

/** A product page was opened. */
export function trackViewItem(item: TrackedItem) {
  const items = [item];
  facebook('ViewContent', {
    content_ids: [item.id],
    content_type: 'product',
    content_name: item.name,
    value: item.price,
    currency: CURRENCY,
  });
  google('view_item', { currency: CURRENCY, value: item.price, items: googleItems(items) });
}

/** One or more units went into the cart (`item.quantity` is how many). */
export function trackCartAddition(item: TrackedItem) {
  const items = [item];
  const value = valueOf(items);
  facebook('AddToCart', {
    content_ids: [item.id],
    content_type: 'product',
    content_name: item.name,
    contents: facebookContents(items),
    value,
    currency: CURRENCY,
  });
  google('add_to_cart', { currency: CURRENCY, value, items: googleItems(items) });
}

/** The checkout page opened with these items in the cart. */
export function trackBeginCheckout(items: TrackedItem[]) {
  const value = valueOf(items);
  facebook('InitiateCheckout', {
    content_ids: items.map((i) => i.id),
    content_type: 'product',
    contents: facebookContents(items),
    value,
    currency: CURRENCY,
    num_items: countOf(items),
  });
  google('begin_checkout', { currency: CURRENCY, value, items: googleItems(items) });
}

/**
 * An order was placed (or its online payment confirmed). `value` is what the customer pays, delivery and discounts
 * included; `items` is optional because the confirmation page can be opened without the cart that produced it.
 * The order number is the dedupe key everywhere: Meta pairs it with the server event's id, Google Analytics and
 * Google Ads ignore a second purchase with the same transaction id.
 */
export function trackPurchase({ orderNumber, value, items }: { orderNumber: string; value: number; items?: TrackedItem[] }) {
  facebook(
    'Purchase',
    {
      value,
      currency: CURRENCY,
      order_id: orderNumber,
      ...(items?.length
        ? { content_type: 'product', content_ids: items.map((i) => i.id), contents: facebookContents(items), num_items: countOf(items) }
        : {}),
    },
    orderNumber
  );
  google('purchase', {
    transaction_id: orderNumber,
    value,
    currency: CURRENCY,
    ...(items?.length ? { items: googleItems(items) } : {}),
  });

  // A Google Ads conversion is its own event, sent to the account (and the Purchase label) set in Settings → Tracking.
  const adsTarget = tags()?.__maroonAdsPurchaseTarget;
  if (adsTarget) google('conversion', { send_to: adsTarget, value, currency: CURRENCY, transaction_id: orderNumber });
}

/** The cart's lines in the shape the tags want. */
export const itemsFromCart = (lines: CartLine[]): TrackedItem[] =>
  lines.map((l) => ({ id: l.productId, name: l.title, price: l.price, quantity: l.quantity, variant: l.variantLabel }));

// The order confirmation page is a fresh page load (and, for online payments, comes back from the gateway), so
// the items bought are parked in sessionStorage by checkout for the Purchase event to pick up.
const purchaseItemsKey = (orderNumber: string) => `purchase-items-${orderNumber}`;

export function rememberPurchaseItems(orderNumber: string, items: TrackedItem[]) {
  try {
    sessionStorage.setItem(purchaseItemsKey(orderNumber), JSON.stringify(items));
  } catch {
    // Storage unavailable (private mode etc.) — the purchase is still reported, just without its item list.
  }
}

export function recallPurchaseItems(orderNumber: string): TrackedItem[] | undefined {
  try {
    const stored = sessionStorage.getItem(purchaseItemsKey(orderNumber));
    return stored ? (JSON.parse(stored) as TrackedItem[]) : undefined;
  } catch {
    return undefined;
  }
}
