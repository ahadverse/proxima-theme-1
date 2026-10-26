import { updateSettingsSchema } from '../backend/validators/settings.validators.js';
import { requireAdmin, requireSuperAdmin } from '../auth';
import type { Database } from '../db';
import { ApiError } from '../errors';
import { ok, type Router } from '../http';
import type { Doc } from '../types';
import { clone, getByPath, newId, setByPath } from '../util';
import { validate } from '../validate';
import { markProgress } from './progress';

/** Settings — settings.service.js and settings.controller.js. */

const SECRET_PATHS = [
  'paymentGateways.paystation.password',
  'paymentGateways.paystation.apiKey',
  'paymentGateways.bkash.appSecret',
  'paymentGateways.bkash.password',
  'paymentGateways.nagad.merchantPrivateKey',
  'paymentGateways.nagad.pgPublicKey',
  'courier.steadfast.apiKey',
  'courier.steadfast.secretKey',
  'courier.pathao.clientSecret',
  'courier.pathao.password',
  'courier.carrybee.clientSecret',
  'courier.carrybee.clientContext',
  'facebookPixel.conversionsApiAccessToken',
  'fraud.thirdPartyApiKey',
];

/** The API's maskSecret: only the last four characters of a saved secret are ever shown. */
export function maskSecret(plainText: unknown): string {
  if (!plainText) return '';
  const text = String(plainText);
  return text.length <= 4 ? '••••' : `••••${text.slice(-4)}`;
}

/** The one settings document (the API creates it with its defaults on first use; the sample shop always has it). */
export function settingsDoc(db: Pick<Database, 'all'>): Doc {
  const doc = db.all('settings')[0];
  if (!doc) throw ApiError.internal('The demo store has no settings');
  return doc;
}

/** Payment methods that should be offered at checkout: switched on, with every credential they need (payments/index.js). */
export function availablePaymentMethods(gateways: Doc | undefined): string[] {
  const configured: Record<string, (gw: Doc | undefined) => boolean> = {
    cod: () => true,
    paystation: (gw) => Boolean(gw?.paystation?.merchantId && gw?.paystation?.password),
    bkash: (gw) => Boolean(gw?.bkash?.appKey && gw?.bkash?.appSecret && gw?.bkash?.username && gw?.bkash?.password),
    nagad: (gw) => Boolean(gw?.nagad?.merchantId && gw?.nagad?.merchantPrivateKey && gw?.nagad?.pgPublicKey),
  };
  return Object.keys(configured)
    .filter((key) => (key === 'cod' ? gateways?.cod?.enabled !== false : gateways?.[key]?.enabled))
    .filter((key) => configured[key](gateways));
}

export function publicSettings(db: Database, shopOrigin: string) {
  const doc = settingsDoc(db);
  return {
    storeName: doc.storeName,
    logo: doc.logo,
    hotlinePhone: doc.hotlinePhone,
    supportEmail: doc.supportEmail,
    storeLocations: doc.storeLocations,
    socialLinks: doc.socialLinks,
    deliveryCharges: doc.deliveryCharges,
    availablePaymentMethods: availablePaymentMethods(doc.paymentGateways),
    // The demo's visitors must never reach a real ad account, whatever is typed into Settings (as on the server-side demo).
    facebookPixelId: '',
    googleAnalyticsId: '',
    googleAdsId: '',
    googleAdsPurchaseLabel: '',
    siteUrl: shopOrigin,
    theme: doc.theme,
    seo: doc.seo,
    footer: { sections: doc.footer?.sections ?? [] },
  };
}

function adminSettings(db: Pick<Database, 'all'>): Doc {
  const out = clone(settingsDoc(db));
  for (const path of SECRET_PATHS) {
    const raw = getByPath(out, path);
    if (raw) setByPath(out, path, maskSecret(raw));
  }
  return out;
}

/** The enum checks Mongoose runs when the document is saved (the request schema leaves gateway settings free-form). */
function checkEnums(doc: Doc) {
  const details: Record<string, string> = {};
  for (const gateway of ['paystation', 'bkash', 'nagad']) {
    const mode = doc.paymentGateways?.[gateway]?.mode;
    if (mode !== undefined && !['sandbox', 'live'].includes(mode)) {
      details[`paymentGateways.${gateway}.mode`] = `\`${mode}\` is not a valid enum value for path \`mode\`.`;
    }
  }
  if (Object.keys(details).length) throw ApiError.badRequest('Validation failed', details);
}

export function settingsRoutes(router: Router) {
  router.get('/settings/public', ({ db, shopOrigin }) => ok(publicSettings(db, shopOrigin)));

  router.get('/settings', ({ db }) => {
    requireSuperAdmin(requireAdmin(db));
    return ok(adminSettings(db));
  });

  /**
   * A partial update from the admin's Settings page. A secret is only replaced when a new value was typed: the page sends
   * the masked value ("••••1234") back unchanged otherwise.
   */
  router.patch('/settings', (ctx) => {
    requireSuperAdmin(requireAdmin(ctx.db));
    const patch = validate(updateSettingsSchema, ctx.body);
    return ctx.write((tx) => {
      const doc = tx.edit('settings', settingsDoc(tx)._id) as Doc;

      const merge = (target: Doc, source: Record<string, unknown>, prefix = '') => {
        for (const [key, value] of Object.entries(source)) {
          const path = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (!target[key] || typeof target[key] !== 'object') target[key] = {};
            merge(target[key], value as Record<string, unknown>, path);
          } else if (SECRET_PATHS.includes(path)) {
            if (typeof value === 'string' && value.startsWith('••••')) continue;
            target[key] = value;
          } else {
            target[key] = clone(value);
          }
        }
      };
      merge(doc, patch);
      // Each store location is its own sub-document, with an id.
      doc.storeLocations = (doc.storeLocations ?? []).map((l: Doc) => ({ ...l, _id: l._id ?? newId() }));
      checkEnums(doc);

      if (patch.theme) markProgress(tx, 'theme');
      return ok(adminSettings(tx), { message: 'Settings updated' });
    });
  });
}
