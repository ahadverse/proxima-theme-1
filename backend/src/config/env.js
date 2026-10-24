import dotenv from 'dotenv';

dotenv.config();

// A deployment on Vercel is never "development". A NODE_ENV=development pasted in from a local .env would otherwise
// switch off Secure / SameSite=None on the login cookies (sign-in works, the next request is 401), print stack traces
// in error responses and allow the built-in dev secrets.
if (process.env.VERCEL && process.env.VERCEL_ENV !== 'development') process.env.NODE_ENV = 'production';

const DEFAULT_TIMEZONE = 'Asia/Dhaka';

/** A mistyped STORE_TIMEZONE would otherwise only blow up later, inside an analytics query. */
function resolveTimezone(name) {
  if (!name) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en', { timeZone: name });
    return name;
  } catch {
    console.warn(`STORE_TIMEZONE "${name}" is not a valid IANA timezone — using ${DEFAULT_TIMEZONE}.`);
    return DEFAULT_TIMEZONE;
  }
}

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  return value;
}

/**
 * How many reverse proxies sit in front of the API: 1 (the default) for Cloudflare, nginx or a platform's load balancer,
 * 0 / false when the API is reached directly. It decides which address the rate limits count a visitor under — a wrong
 * value lets a client fake its address.
 */
function parseTrustProxy(value) {
  if (value === undefined || value === '') return 1;
  if (/^\d+$/.test(value)) return Number(value) || false;
  if (value.toLowerCase() === 'false') return false;
  return value; // e.g. "loopback" or a list of proxy addresses
}

const sameSiteSetting = (process.env.COOKIE_SAMESITE || '').toLowerCase();

/** A pasted "https://shop.example.com/" would never equal the browser's Origin header and would double the slash in links. */
const withoutTrailingSlash = (url) => url.trim().replace(/\/+$/, '');

/** Vercel runs every request on a short-lived instance that is not the only one — set automatically there. */
const isVercel = Boolean(process.env.VERCEL);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: withoutTrailingSlash(required('CLIENT_URL', 'http://localhost:3000')),
  adminUrl: withoutTrailingSlash(required('ADMIN_URL', 'http://localhost:5173')),
  apiBaseUrl: withoutTrailingSlash(required('API_BASE_URL', `http://localhost:${Number(process.env.PORT) || 5000}`)),

  mongodbUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/maroon'),
  // Connections each instance may open to MongoDB. Many instances can run at once on Vercel, and an Atlas cluster only
  // allows so many connections in total (500 on the free tier), so each one gets a small pool there. Unset elsewhere =
  // the driver's default.
  mongoMaxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || (isVercel ? 10 : undefined),
  // Whether Mongoose creates missing indexes (unique emails, order numbers, TTLs...) by itself when it connects. Right for
  // one long-running server; on Vercel it would re-check every index on every cold start, so there they are created once
  // per deploy instead (`npm run indexes`, run by the vercel-build script).
  autoIndex: process.env.MONGOOSE_AUTO_INDEX ? process.env.MONGOOSE_AUTO_INDEX === 'true' : !isVercel,
  // Where the "too many attempts" counters (sign-in, orders, coupon guesses...) live. 'memory' counts per server process,
  // which is only a real limit when there is one process; 'mongo' counts in the database so every instance shares it.
  rateLimitStore: ['memory', 'mongo'].includes(process.env.RATE_LIMIT_STORE) ? process.env.RATE_LIMIT_STORE : isVercel ? 'mongo' : 'memory',
  isVercel,

  jwtSecret: required('JWT_SECRET', 'dev_insecure_jwt_secret'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),
  adminJwtSecret: required('ADMIN_JWT_SECRET', 'dev_insecure_admin_jwt_secret'),
  adminJwtExpiresIn: required('ADMIN_JWT_EXPIRES_IN', '7d'),
  // SameSite of the login cookies. Production defaults to 'none' (a storefront, an admin and an API on different sites
  // need it); set COOKIE_SAMESITE=lax or strict when they share one site. Cross-site form posts are refused either way
  // (see csrf.middleware.js).
  cookieSameSite: ['lax', 'strict', 'none'].includes(sameSiteSetting)
    ? sameSiteSetting
    : process.env.NODE_ENV === 'production'
      ? 'none'
      : 'lax',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),

  // Shared with the storefront (its REVALIDATE_SECRET): lets a Settings save expire the storefront's cached
  // settings straight away. Development has a fallback like the JWT secrets; in production it must be set on
  // both sides, otherwise the storefront simply catches up when its own 60-second cache runs out.
  revalidateSecret: process.env.REVALIDATE_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_insecure_revalidate_secret'),

  appEncryptionKey: process.env.APP_ENCRYPTION_KEY || '',

  // Where "a day" starts and ends for analytics — daily revenue, the 7/30/90-day windows — so a
  // 2am Dhaka order lands on Dhaka's date rather than the previous UTC day. Any IANA zone name.
  storeTimezone: resolveTimezone(process.env.STORE_TIMEZONE),

  // Cloudflare R2 (S3-compatible object storage) for uploaded images. R2_PUBLIC_URL is the bucket's public address —
  // the https://pub-….r2.dev one from the bucket's settings, or your own domain connected to it.
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
    // Optional. Only for a bucket in the EU or FedRAMP jurisdiction (https://<account id>.eu.r2.cloudflarestorage.com)
    // or another S3-compatible service; by default https://<account id>.r2.cloudflarestorage.com is used.
    endpoint: process.env.R2_ENDPOINT || '',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  seedAdmin: {
    email: required('SEED_ADMIN_EMAIL', 'admin@maroon.local'),
    password: required('SEED_ADMIN_PASSWORD', 'ChangeMe123!'),
  },

  isProd: process.env.NODE_ENV === 'production',

  // The live sales-demo switch. An infrastructure flag, deliberately not a Settings field: on a sold
  // copy it is simply absent, so there is nothing in the admin to misconfigure or forget to turn off.
  isDemo: process.env.DEMO_MODE === 'true',
  demo: {
    // Where the "Demo store" banner sends people (the sales page). No URL, no button.
    ctaUrl: process.env.DEMO_CTA_URL || '',
    ctaLabel: process.env.DEMO_CTA_LABEL || 'Get this store',
    // When the demo's visitor data is wiped, in STORE_TIMEZONE.
    resetCron: process.env.DEMO_RESET_CRON || '0 3 * * *',
  },
};

/**
 * A production server must not run on the development fallbacks: a known JWT secret lets anyone mint
 * admin sessions, and without an encryption key the payment-gateway credentials in Settings are
 * stored in plain text. Refusing to start is the safe failure.
 */
function assertProductionConfig() {
  const weak = (value) => !value || value.startsWith('dev_insecure') || value.length < 32;
  const problems = [];

  if (weak(env.jwtSecret)) problems.push('JWT_SECRET must be set to a random string of at least 32 characters');
  if (weak(env.adminJwtSecret)) {
    problems.push('ADMIN_JWT_SECRET must be set to a random string of at least 32 characters');
  }
  if (env.jwtSecret === env.adminJwtSecret) problems.push('JWT_SECRET and ADMIN_JWT_SECRET must be different');
  if (!env.appEncryptionKey) {
    problems.push(
      "APP_ENCRYPTION_KEY must be set (generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    );
  }

  if (problems.length) {
    throw new Error(`Refusing to start in production with an unsafe configuration:\n - ${problems.join('\n - ')}`);
  }
}

if (env.isProd) {
  assertProductionConfig();

  // Not fatal (a production-mode run on one machine legitimately uses localhost), but on a real deploy these mean the
  // browser's requests are refused by CORS and payment gateways call back to nowhere.
  const stillLocal = [['CLIENT_URL', env.clientUrl], ['ADMIN_URL', env.adminUrl], ['API_BASE_URL', env.apiBaseUrl]]
    .filter(([, url]) => /localhost|127\.0\.0\.1/.test(url))
    .map(([name]) => name);
  if (stillLocal.length) console.warn(`${stillLocal.join(', ')} still point at localhost — set the deployed addresses.`);
}
