import * as bkash from './bkash.js';
import * as nagad from './nagad.js';
import * as paystation from './paystation.js';

/**
 * Payment provider registry. Each provider implements:
 *   { key, label, isConfigured(settings) => boolean, initPayment({order, settings}), verifyPayment({query, settings, order}) }
 *
 * `cod` is always available. Others are only exposed when both `enabled` is true in
 * Settings AND their required credentials are present — so checkout never offers a
 * payment method that would fail, and never crashes when credentials are missing.
 */

const providers = {
  cod: {
    key: 'cod',
    label: 'Cash on Delivery',
    isConfigured: () => true,
  },
  paystation: {
    key: 'paystation',
    label: 'PayStation',
    // PayStation authenticates with merchantId + password only; its API has no API key.
    isConfigured: (gw) => Boolean(gw?.paystation?.merchantId && gw?.paystation?.password),
    ...paystation,
  },
  bkash: {
    key: 'bkash',
    label: 'bKash',
    isConfigured: (gw) => Boolean(gw?.bkash?.appKey && gw?.bkash?.appSecret && gw?.bkash?.username && gw?.bkash?.password),
    ...bkash,
  },
  nagad: {
    key: 'nagad',
    label: 'Nagad',
    isConfigured: (gw) => Boolean(gw?.nagad?.merchantId && gw?.nagad?.merchantPrivateKey && gw?.nagad?.pgPublicKey),
    ...nagad,
  },
};

/** Returns the list of payment method keys that should actually be offered at checkout. */
export function getAvailableProviders(paymentGateways) {
  return Object.values(providers)
    .filter((p) => p.key === 'cod' ? paymentGateways?.cod?.enabled !== false : paymentGateways?.[p.key]?.enabled)
    .filter((p) => p.isConfigured(paymentGateways))
    .map((p) => p.key);
}

export function getProvider(key) {
  return providers[key] ?? null;
}

export { providers };
