import { verifyCustomerToken } from '../utils/generateToken.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { asyncHandler } from './asyncHandler.js';

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

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or inactive');

  req.user = user;
  next();
});

/** Attaches req.user if a valid customer session cookie is present, but never blocks the request. */
export const attachCustomerIfPresent = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.maroon_customer_token;
  if (!token) return next();

  try {
    const payload = verifyCustomerToken(token);
    const user = await User.findById(payload.sub);
    if (user?.isActive) req.user = user;
  } catch {
    // ignore invalid/expired token for optional auth
  }
  next();
});
