import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { signCustomerToken, setAuthCookie, clearAuthCookie } from '../utils/generateToken.js';

const COOKIE_NAME = 'maroon_customer_token';
const MAX_ADDRESSES = 10;

const profileOf = (user) => ({
  id: user._id,
  name: user.name,
  phone: user.phone,
  email: user.email,
  addresses: user.addresses,
});

export const register = asyncHandler(async (req, res) => {
  const { name, phone, email, password } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) throw ApiError.conflict('An account with this phone number already exists');

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    name,
    phone,
    email: email || undefined,
    passwordHash,
  });

  const token = signCustomerToken(user._id.toString());
  setAuthCookie(res, COOKIE_NAME, token);

  sendSuccess(res, {
    statusCode: 201,
    message: 'Account created',
    data: profileOf(user),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  const user = await User.findOne({ phone }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid phone number or password');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  const token = signCustomerToken(user._id.toString());
  setAuthCookie(res, COOKIE_NAME, token);

  sendSuccess(res, {
    message: 'Logged in',
    data: profileOf(user),
  });
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res, COOKIE_NAME);
  sendSuccess(res, { message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: profileOf(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (name !== undefined) req.user.name = name;
  if (email !== undefined) req.user.email = email || undefined;

  try {
    await req.user.save();
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('That email is already used by another account');
    throw err;
  }
  sendSuccess(res, { message: 'Profile updated', data: profileOf(req.user) });
});

/** Exactly one saved address is the default (the first one added, unless another is chosen). */
function settleDefault(user, preferredId) {
  if (user.addresses.length === 0) return;
  const chosen = preferredId
    ? user.addresses.find((a) => a._id.equals(preferredId))
    : user.addresses.find((a) => a.isDefault);
  const keep = chosen ?? user.addresses[0];
  for (const a of user.addresses) a.isDefault = a._id.equals(keep._id);
}

export const addAddress = asyncHandler(async (req, res) => {
  if (req.user.addresses.length >= MAX_ADDRESSES) {
    throw ApiError.badRequest(`You can save up to ${MAX_ADDRESSES} addresses`);
  }
  const { isDefault, ...fields } = req.body;
  req.user.addresses.push(fields);
  const added = req.user.addresses[req.user.addresses.length - 1];
  settleDefault(req.user, isDefault || req.user.addresses.length === 1 ? added._id : undefined);

  await req.user.save();
  sendSuccess(res, { statusCode: 201, message: 'Address saved', data: profileOf(req.user) });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.id);
  if (!address) throw ApiError.notFound('Address not found');

  const { isDefault, ...fields } = req.body;
  address.set(fields);
  settleDefault(req.user, isDefault ? address._id : undefined);

  await req.user.save();
  sendSuccess(res, { message: 'Address updated', data: profileOf(req.user) });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = req.user.addresses.id(req.params.id);
  if (!address) throw ApiError.notFound('Address not found');

  address.deleteOne();
  settleDefault(req.user);

  await req.user.save();
  sendSuccess(res, { message: 'Address removed', data: profileOf(req.user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.comparePassword(currentPassword))) {
    throw ApiError.badRequest('Your current password is incorrect');
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  sendSuccess(res, { message: 'Password changed' });
});
