import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { MongoRateLimitStore } from '../utils/mongoRateLimitStore.js';

/**
 * express-rate-limit for the endpoints where the limit is a security measure (sign-in, placing orders, guessing coupon
 * codes). Takes the same options; `name` keeps one limiter's counters apart from another's. Counts in the database when
 * RATE_LIMIT_STORE=mongo (the default on Vercel), else in this process's memory.
 *
 * If the database can't be reached while counting, the request goes through rather than being refused: it would fail on
 * its own database call a moment later anyway.
 */
export function sharedRateLimit(name, options) {
  if (env.rateLimitStore !== 'mongo') return rateLimit(options);
  return rateLimit({ ...options, store: new MongoRateLimitStore(name), passOnStoreError: true });
}
