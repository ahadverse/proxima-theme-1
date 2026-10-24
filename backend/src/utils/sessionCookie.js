import { nanoid } from 'nanoid';
import { env } from '../config/env.js';

/**
 * The anonymous visitor id: one httpOnly cookie shared by the guest cart and by analytics, so a
 * browser's product views, add-to-carts and eventual order all carry the same id.
 */
export const SESSION_COOKIE = 'maroon_session_id';

const VALID_ID = /^[\w-]{10,64}$/;

/** The visitor's session id, issuing a fresh cookie if they don't have a (well-formed) one yet. */
export function ensureSessionId(req, res) {
  const existing = req.cookies?.[SESSION_COOKIE];
  if (typeof existing === 'string' && VALID_ID.test(existing)) return existing;

  const sessionId = nanoid();
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.cookieSameSite,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  return sessionId;
}

/** The session id if the visitor already has one — never issues a cookie. */
export function readSessionId(req) {
  const existing = req.cookies?.[SESSION_COOKIE];
  return typeof existing === 'string' && VALID_ID.test(existing) ? existing : null;
}
