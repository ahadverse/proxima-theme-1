import { Settings, SECRET_PATHS } from '../models/Settings.js';
import { encryptSecret, decryptSecret, maskSecret } from '../utils/encryption.js';
import { getAvailableProviders } from './payments/index.js';
import { env } from '../config/env.js';

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function setByPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((acc, key) => acc[key], obj);
  target[last] = value;
}

export async function getSettingsDoc() {
  let settings = await Settings.findOne({ key: 'main' });
  if (!settings) {
    settings = await Settings.create({ key: 'main' });
  }
  return settings;
}

/** Full settings for the admin panel — secrets are masked, never returned in plain text. */
export async function getAdminSettings() {
  const doc = await getSettingsDoc();
  const obj = doc.toObject();

  for (const path of SECRET_PATHS) {
    const raw = getByPath(obj, path);
    if (raw) setByPath(obj, path, maskSecret(decryptSecret(raw)));
  }

  return obj;
}

// Every storefront page, and every browser that opens the site, asks for these; a few seconds of memory saves a database
// round trip on each. Anything that writes the Settings document calls invalidatePublicSettings().
const PUBLIC_TTL_MS = 15_000;
let publicCache = null;

export function invalidatePublicSettings() {
  publicCache = null;
}

/** Public, unauthenticated settings — only what the storefront needs, no credentials at all. */
export async function getPublicSettings() {
  if (publicCache && Date.now() < publicCache.expires) return publicCache.value;
  const doc = await getSettingsDoc();

  const value = {
    storeName: doc.storeName,
    logo: doc.logo,
    hotlinePhone: doc.hotlinePhone,
    supportEmail: doc.supportEmail,
    storeLocations: doc.storeLocations,
    socialLinks: doc.socialLinks,
    deliveryCharges: doc.deliveryCharges,
    availablePaymentMethods: getAvailableProviders(doc.paymentGateways),
    // The live demo's visitors must never reach a real ad account (see pixel.service), so no tracking id is handed out.
    facebookPixelId: env.isDemo ? '' : doc.facebookPixel?.pixelId || '',
    googleAnalyticsId: env.isDemo ? '' : doc.googleTag?.analyticsId || '',
    googleAdsId: env.isDemo ? '' : doc.googleTag?.adsId || '',
    // A conversion label means nothing without its Ads account.
    googleAdsPurchaseLabel: !env.isDemo && doc.googleTag?.adsId ? doc.googleTag?.adsPurchaseLabel || '' : '',
    // The storefront's own address — the admin uses it to show how a page will look in a search result.
    siteUrl: env.clientUrl,
    theme: doc.theme,
    seo: doc.seo,
    footer: { sections: doc.footer?.sections ?? [] },
    // Lets both apps show the "demo store" banner; always false on a customer's copy.
    isDemo: env.isDemo,
    ...(env.isDemo ? { demoCta: { url: env.demo.ctaUrl, label: env.demo.ctaLabel } } : {}),
  };
  publicCache = { value, expires: Date.now() + PUBLIC_TTL_MS };
  return value;
}

/**
 * Applies a partial update from the admin Settings UI. A secret field is only
 * overwritten when the admin actually typed a new value — the UI sends masked
 * values (e.g. "••••1234") back unchanged, so we skip re-encrypting those.
 */
export async function updateSettings(patch) {
  const doc = await getSettingsDoc();
  const current = doc.toObject();

  function merge(target, source, prefix = '') {
    for (const [key, value] of Object.entries(source)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
        merge(target[key], value, path);
      } else if (SECRET_PATHS.includes(path)) {
        if (typeof value === 'string' && value.startsWith('••••')) {
          // Unchanged masked value sent back from the admin UI — keep existing encrypted value.
          continue;
        }
        target[key] = encryptSecret(value);
      } else {
        target[key] = value;
      }
    }
  }

  merge(current, patch);
  Object.assign(doc, current);
  await doc.save();
  invalidatePublicSettings();

  return getAdminSettings();
}
