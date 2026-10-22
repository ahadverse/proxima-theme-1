import { Admin } from '../models/Admin.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import {
  signAdminToken,
  verifyAdminToken,
  revokeCookieToken,
  setAuthCookie,
  clearAuthCookie,
} from '../utils/generateToken.js';
import { burnPasswordCheck } from '../utils/passwordTiming.js';

const COOKIE_NAME = 'maroon_admin_token';

const publicAdmin = (admin) => ({
  id: admin._id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
});

// The Staff page needs account state (active/last login) that login/me deliberately don't expose.
const staffView = (admin) => ({
  ...publicAdmin(admin),
  isActive: admin.isActive,
  lastLoginAt: admin.lastLoginAt ?? null,
  createdAt: admin.createdAt,
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email }).select('+passwordHash');
  // An unknown email costs the same bcrypt work as a wrong password, so the response time gives nothing away.
  const passwordOk = admin ? await admin.comparePassword(password) : await burnPasswordCheck(password);
  if (!admin || !passwordOk) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!admin.isActive) throw ApiError.forbidden('This admin account has been deactivated');

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signAdminToken(admin._id.toString(), admin.role, admin.tokenVersion);
  setAuthCookie(res, COOKIE_NAME, token);

  sendSuccess(res, { message: 'Logged in', data: publicAdmin(admin) });
});

export const logout = asyncHandler(async (req, res) => {
  // The cookie is cleared in this browser; recording the token as well means a copy of it stops working everywhere.
  await revokeCookieToken(req.cookies?.[COOKIE_NAME], verifyAdminToken);
  clearAuthCookie(res, COOKIE_NAME);
  sendSuccess(res, { message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: publicAdmin(req.admin) });
});

export const listStaff = asyncHandler(async (req, res) => {
  const staff = await Admin.find().sort({ createdAt: -1 });
  sendSuccess(res, { data: staff.map(staffView) });
});

export const createStaff = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await Admin.findOne({ email });
  if (existing) throw ApiError.conflict('An admin with this email already exists');

  const passwordHash = await Admin.hashPassword(password);
  const admin = await Admin.create({ name, email, passwordHash, role });

  sendSuccess(res, { statusCode: 201, message: 'Staff account created', data: staffView(admin) });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const { name, role, isActive, password } = req.body;
  const admin = await Admin.findById(req.params.id);
  if (!admin) throw ApiError.notFound('Admin not found');

  // Every caller here is an active super-admin, so as long as they can't demote or deactivate
  // themselves there is always at least one super-admin left who can still sign in.
  if (admin._id.equals(req.admin._id)) {
    if (role !== undefined && role !== admin.role) {
      throw ApiError.badRequest('You cannot change your own role');
    }
    if (isActive === false) throw ApiError.badRequest('You cannot deactivate your own account');
  }

  if (name !== undefined) admin.name = name;
  if (role !== undefined) admin.role = role;
  if (isActive !== undefined) {
    // Switching an account off ends the sessions it has for good — they stay dead if it is switched back on.
    if (isActive === false && admin.isActive) admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
    admin.isActive = isActive;
  }
  if (password) {
    admin.passwordHash = await Admin.hashPassword(password);
    admin.tokenVersion = (admin.tokenVersion ?? 0) + 1; // every session of that account ends
  }

  await admin.save();
  // Changing your own password ends your other sessions, not this one.
  if (password && admin._id.equals(req.admin._id)) {
    setAuthCookie(res, COOKIE_NAME, signAdminToken(admin._id.toString(), admin.role, admin.tokenVersion));
  }
  sendSuccess(res, { message: 'Staff account updated', data: staffView(admin) });
});

export const deleteStaff = asyncHandler(async (req, res) => {
  if (req.params.id === req.admin._id.toString()) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const admin = await Admin.findByIdAndDelete(req.params.id);
  if (!admin) throw ApiError.notFound('Admin not found');
  sendSuccess(res, { message: 'Staff account removed' });
});
