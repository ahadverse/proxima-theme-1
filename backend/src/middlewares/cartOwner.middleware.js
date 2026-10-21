import { ensureSessionId } from '../utils/sessionCookie.js';

/** Resolves the cart owner: the logged-in user if present, otherwise a guest session id cookie (created if missing). */
export function resolveCartOwner(req, res, next) {
  if (req.user) {
    req.cartOwner = { userId: req.user._id.toString() };
    return next();
  }

  req.cartOwner = { sessionId: ensureSessionId(req, res) };
  next();
}
