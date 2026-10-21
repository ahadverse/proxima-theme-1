import rateLimit from 'express-rate-limit';

const tooMany = (message) => ({ success: false, message });

/**
 * Sign-in is the one endpoint where an attacker is *meant* to be able to try again and again, so it
 * gets its own, much tighter cap than the API-wide limit. Only failed attempts count — a customer
 * who signs in correctly never runs into it.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('Too many sign-in attempts — please wait a few minutes and try again'),
});

/** Account creation: generous for a household sharing one connection, tight enough to stop a script. */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('Too many accounts created from this connection — please try again later'),
});
