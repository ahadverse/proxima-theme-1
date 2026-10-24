import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { RevokedToken } from '../models/RevokedToken.js';

// Every token carries `jti` (its own id) and `tv` (the account's tokenVersion when it was issued). Logging out records the
// jti (that one token stops working); changing a password raises the account's tokenVersion (every older token stops
// working). The auth middlewares check both on each request.
export function signCustomerToken(userId, tokenVersion = 0) {
  return jwt.sign({ sub: userId, type: 'customer', tv: tokenVersion }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    jwtid: nanoid(),
  });
}

export function signAdminToken(adminId, role, tokenVersion = 0) {
  return jwt.sign({ sub: adminId, role, type: 'admin', tv: tokenVersion }, env.adminJwtSecret, {
    expiresIn: env.adminJwtExpiresIn,
    jwtid: nanoid(),
  });
}

export function verifyCustomerToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function verifyAdminToken(token) {
  return jwt.verify(token, env.adminJwtSecret);
}

/** True when this (already verified) token was signed out of. Tokens issued before ids existed can't be listed. */
export async function isTokenRevoked(payload) {
  if (!payload.jti) return false;
  return Boolean(await RevokedToken.exists({ jti: payload.jti }));
}

/** Logout: remembers the token the browser held so a copy of that cookie stops working too. Never throws. */
export async function revokeCookieToken(token, verify) {
  if (!token) return;
  try {
    const payload = verify(token);
    if (!payload.jti) return; // issued before tokens carried an id — it ends by itself within its lifetime
    await RevokedToken.updateOne(
      { jti: payload.jti },
      { $setOnInsert: { expiresAt: new Date(payload.exp * 1000) } },
      { upsert: true }
    );
  } catch {
    // Already invalid or expired — nothing to revoke.
  }
}

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let warnedAboutCookieDomain = false;

// Hosting names that belong to many customers (public suffixes): a browser refuses a cookie Domain set to one of these.
const SHARED_HOSTING_DOMAINS = ['vercel.app', 'netlify.app', 'herokuapp.com', 'onrender.com', 'pages.dev', 'workers.dev', 'github.io'];

/**
 * COOKIE_DOMAIN only works when the host that sets the cookie is that domain or one of its subdomains. Otherwise the browser
 * drops the whole cookie without a word — sign-in "works" and the next request is a 401. That happens when a local
 * COOKIE_DOMAIN=localhost (or a placeholder like .example.com) is pasted into the host's settings, so a value that does not
 * fit this request's host is ignored and the cookie stays tied to the API's own address.
 */
function cookieDomainFor(res) {
  if (!env.cookieDomain) return undefined;
  const domain = env.cookieDomain.replace(/^\./, '').toLowerCase();
  const host = (res.req?.hostname ?? '').toLowerCase();
  if (!SHARED_HOSTING_DOMAINS.includes(domain) && (host === domain || host.endsWith(`.${domain}`))) return env.cookieDomain;
  if (!warnedAboutCookieDomain) {
    warnedAboutCookieDomain = true;
    logger.warn(`COOKIE_DOMAIN "${env.cookieDomain}" does not match this API's address "${host}" — ignoring it. Fix or remove COOKIE_DOMAIN.`);
  }
  return undefined;
}

export function setAuthCookie(res, name, token) {
  res.cookie(name, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.cookieSameSite,
    domain: cookieDomainFor(res),
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

export function clearAuthCookie(res, name) {
  res.clearCookie(name, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.cookieSameSite,
    domain: cookieDomainFor(res),
    path: '/',
  });
}
