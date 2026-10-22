import { verifyAdminToken, isTokenRevoked } from '../utils/generateToken.js';
import { ApiError } from '../utils/ApiError.js';
import { Admin } from '../models/Admin.js';
import { asyncHandler } from './asyncHandler.js';

/** Requires a logged-in admin/staff member. */
export const requireAdminAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.maroon_admin_token;
  if (!token) throw ApiError.unauthorized('Admin login required');

  let payload;
  try {
    payload = verifyAdminToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  // The account and the "signed out" list are independent lookups.
  const [admin, revoked] = await Promise.all([Admin.findById(payload.sub), isTokenRevoked(payload)]);
  if (!admin || !admin.isActive) throw ApiError.unauthorized('Admin account not found or inactive');
  // Signed out of, or the password changed / the account was switched off since this token was issued.
  if (revoked || (payload.tv ?? 0) !== (admin.tokenVersion ?? 0)) {
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  req.admin = admin;
  next();
});

/** Requires the super-admin role specifically (e.g. Settings, Staff management). */
export const requireSuperAdmin = asyncHandler(async (req, res, next) => {
  if (req.admin?.role !== 'super-admin') {
    throw ApiError.forbidden('Only a super-admin can perform this action');
  }
  next();
});
