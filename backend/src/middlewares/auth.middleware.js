import { verifyCustomerToken, isTokenRevoked } from '../utils/generateToken.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { asyncHandler } from './asyncHandler.js';

/**
 * The customer a verified token belongs to — or null when the account is gone or switched off, the token was signed out
 * of, or the password has changed since it was issued.
 */
async function currentUser(payload) {
  const [user, revoked] = await Promise.all([User.findById(payload.sub), isTokenRevoked(payload)]);
  if (!user || !user.isActive || revoked) return null;
  if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) return null;
  return user;
}

/** Requires a logged-in customer. */
export const requireCustomerAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.maroon_customer_token;
  if (!token) throw ApiError.unauthorized('Please log in to continue');

  let payload;
  try {
    payload = verifyCustomerToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  const user = await currentUser(payload);
  if (!user) throw ApiError.unauthorized('Session expired, please log in again');

  req.user = user;
  next();
});

/** Attaches req.user if a valid customer session cookie is present, but never blocks the request. */
export const attachCustomerIfPresent = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.maroon_customer_token;
  if (!token) return next();

  try {
    const user = await currentUser(verifyCustomerToken(token));
    if (user) req.user = user;
  } catch {
    // ignore invalid/expired token for optional auth
  }
  next();
});
