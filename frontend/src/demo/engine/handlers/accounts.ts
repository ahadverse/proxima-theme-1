import { registerSchema, loginSchema, adminLoginSchema, staffCreateSchema, staffUpdateSchema } from '../backend/validators/auth.validators.js';
import {
  updateProfileSchema,
  addressSchema,
  updateAddressSchema,
  changePasswordSchema,
} from '../backend/validators/account.validators.js';
import {
  endSession,
  hashPassword,
  requireAdmin,
  requireCustomer,
  requireSuperAdmin,
  startSession,
  verifyPassword,
} from '../auth';
import { ApiError } from '../errors';
import { ok, type Router } from '../http';
import { assertId, create, userAddress } from '../schemas';
import type { Doc } from '../types';
import { sortDocs } from '../util';
import { validate } from '../validate';

/** Customer accounts (auth.controller.js) and admin sign-in and staff (adminAuth.controller.js). */

const MAX_ADDRESSES = 10;

const profileOf = (user: Doc) => ({
  id: user._id,
  name: user.name,
  phone: user.phone,
  ...(user.email !== undefined ? { email: user.email } : {}),
  addresses: user.addresses,
});

const publicAdmin = (admin: Doc) => ({ id: admin._id, name: admin.name, email: admin.email, role: admin.role });

// The Staff page needs account state (active / last login) that login and /me deliberately don't expose.
const staffView = (admin: Doc) => ({
  ...publicAdmin(admin),
  isActive: admin.isActive,
  lastLoginAt: admin.lastLoginAt ?? null,
  createdAt: admin.createdAt,
});

/** Exactly one saved address is the default (the first one added, unless another is chosen). */
function settleDefault(user: Doc, preferredId?: string) {
  if (user.addresses.length === 0) return;
  const chosen = preferredId ? user.addresses.find((a: Doc) => a._id === preferredId) : user.addresses.find((a: Doc) => a.isDefault);
  const keep = chosen ?? user.addresses[0];
  for (const a of user.addresses) a.isDefault = a._id === keep._id;
}

export function accountRoutes(router: Router) {
  // ---------- Customers

  router.post('/auth/register', async (ctx) => {
    const { name, phone, email, password } = validate(registerSchema, ctx.body);
    if (ctx.db.find('users', (u) => u.phone === phone)) throw ApiError.conflict('An account with this phone number already exists');
    const passwordHash = await hashPassword(password);
    return ctx.write((tx) => {
      const fields = create('users', { name, phone, email: email || undefined, passwordHash });
      if (fields.email && tx.all('users').some((u) => u.email === fields.email)) throw ApiError.conflict('email already exists');
      if (tx.all('users').some((u) => u.phone === fields.phone)) throw ApiError.conflict('phone already exists');
      const user = tx.insert('users', fields);
      startSession(tx, 'customer', user);
      return ok(profileOf(user), { status: 201, message: 'Account created' });
    });
  });

  router.post('/auth/login', async (ctx) => {
    const { phone, password } = validate(loginSchema, ctx.body);
    const user = ctx.db.find('users', (u) => u.phone === phone);
    // An unknown phone number costs the same work as a wrong password, so the response time gives nothing away.
    const passwordOk = await verifyPassword(password, user?.passwordHash);
    if (!user || !passwordOk) throw ApiError.unauthorized('Invalid phone number or password');
    if (user.isActive === false) throw ApiError.forbidden('This account has been deactivated');
    return ctx.write((tx) => {
      startSession(tx, 'customer', user);
      return ok(profileOf(user), { message: 'Logged in' });
    });
  });

  router.post('/auth/logout', (ctx) =>
    ctx.write((tx) => {
      endSession(tx, 'customer');
      return ok(null, { message: 'Logged out' });
    })
  );

  router.get('/auth/me', ({ db }) => ok(profileOf(requireCustomer(db))));

  router.patch('/auth/me', (ctx) => {
    const current = requireCustomer(ctx.db);
    const { name, email } = validate(updateProfileSchema, ctx.body);
    return ctx.write((tx) => {
      const user = tx.edit('users', current._id) as Doc;
      if (name !== undefined) user.name = name;
      if (email !== undefined) {
        if (email) user.email = email.toLowerCase();
        else delete user.email;
      }
      if (user.email && tx.all('users').some((u) => u._id !== user._id && u.email === user.email)) {
        throw ApiError.conflict('That email is already used by another account');
      }
      return ok(profileOf(user), { message: 'Profile updated' });
    });
  });

  router.post('/auth/me/addresses', (ctx) => {
    const current = requireCustomer(ctx.db);
    const { isDefault, ...fields } = validate(addressSchema, ctx.body);
    return ctx.write((tx) => {
      const user = tx.edit('users', current._id) as Doc;
      if (user.addresses.length >= MAX_ADDRESSES) throw ApiError.badRequest(`You can save up to ${MAX_ADDRESSES} addresses`);
      const added = userAddress(fields);
      user.addresses.push(added);
      settleDefault(user, isDefault || user.addresses.length === 1 ? (added._id as string) : undefined);
      return ok(profileOf(user), { status: 201, message: 'Address saved' });
    });
  });

  router.patch('/auth/me/addresses/:id', (ctx) => {
    const current = requireCustomer(ctx.db);
    const { isDefault, ...fields } = validate(updateAddressSchema, ctx.body);
    return ctx.write((tx) => {
      const user = tx.edit('users', current._id) as Doc;
      const address = user.addresses.find((a: Doc) => a._id === ctx.params.id);
      if (!address) throw ApiError.notFound('Address not found');
      for (const [key, value] of Object.entries(fields)) if (value !== undefined) address[key] = value;
      settleDefault(user, isDefault ? address._id : undefined);
      return ok(profileOf(user), { message: 'Address updated' });
    });
  });

  router.delete('/auth/me/addresses/:id', (ctx) => {
    const current = requireCustomer(ctx.db);
    return ctx.write((tx) => {
      const user = tx.edit('users', current._id) as Doc;
      const index = user.addresses.findIndex((a: Doc) => a._id === ctx.params.id);
      if (index < 0) throw ApiError.notFound('Address not found');
      user.addresses.splice(index, 1);
      settleDefault(user);
      return ok(profileOf(user), { message: 'Address removed' });
    });
  });

  router.patch('/auth/me/password', async (ctx) => {
    const current = requireCustomer(ctx.db);
    const { currentPassword, newPassword } = validate(changePasswordSchema, ctx.body);
    if (!(await verifyPassword(currentPassword, current.passwordHash))) throw ApiError.badRequest('Your current password is incorrect');
    const passwordHash = await hashPassword(newPassword);
    return ctx.write((tx) => {
      const user = tx.edit('users', current._id) as Doc;
      user.passwordHash = passwordHash;
      // Every other signed-in browser stops working; this one carries on.
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      startSession(tx, 'customer', user);
      return ok(null, { message: 'Password changed' });
    });
  });

  // ---------- Admins

  router.post('/admin/auth/login', async (ctx) => {
    const { email, password } = validate(adminLoginSchema, ctx.body);
    const admin = ctx.db.find('admins', (a) => a.email === email);
    const passwordOk = await verifyPassword(password, admin?.passwordHash);
    if (!admin || !passwordOk) throw ApiError.unauthorized('Invalid email or password');
    if (admin.isActive === false) throw ApiError.forbidden('This admin account has been deactivated');
    return ctx.write((tx) => {
      const signedIn = tx.edit('admins', admin._id) as Doc;
      signedIn.lastLoginAt = tx.now;
      startSession(tx, 'admin', signedIn);
      return ok(publicAdmin(signedIn), { message: 'Logged in' });
    });
  });

  router.post('/admin/auth/logout', (ctx) =>
    ctx.write((tx) => {
      endSession(tx, 'admin');
      return ok(null, { message: 'Logged out' });
    })
  );

  router.get('/admin/auth/me', ({ db }) => ok(publicAdmin(requireAdmin(db))));

  router.get('/admin/auth/staff', ({ db }) => {
    requireSuperAdmin(requireAdmin(db));
    return ok(sortDocs(db.all('admins'), { createdAt: -1 }).map(staffView));
  });

  router.post('/admin/auth/staff', async (ctx) => {
    requireSuperAdmin(requireAdmin(ctx.db));
    const { name, email, password, role } = validate(staffCreateSchema, ctx.body);
    if (ctx.db.find('admins', (a) => a.email === email)) throw ApiError.conflict('An admin with this email already exists');
    const passwordHash = await hashPassword(password);
    return ctx.write((tx) => {
      const fields = create('admins', { name, email, passwordHash, role });
      if (tx.all('admins').some((a) => a.email === fields.email)) throw ApiError.conflict('email already exists');
      const admin = tx.insert('admins', fields);
      return ok(staffView(admin), { status: 201, message: 'Staff account created' });
    });
  });

  router.patch('/admin/auth/staff/:id', async (ctx) => {
    const me = requireAdmin(ctx.db);
    requireSuperAdmin(me);
    const { name, role, isActive, password } = validate(staffUpdateSchema, ctx.body);
    assertId(ctx.params.id);
    const passwordHash = password ? await hashPassword(password) : null;
    return ctx.write((tx) => {
      const admin = tx.edit('admins', ctx.params.id);
      if (!admin) throw ApiError.notFound('Admin not found');

      // Every caller here is an active super-admin; as long as they can't demote or deactivate themselves, one is left.
      if (admin._id === me._id) {
        if (role !== undefined && role !== admin.role) throw ApiError.badRequest('You cannot change your own role');
        if (isActive === false) throw ApiError.badRequest('You cannot deactivate your own account');
      }

      if (name !== undefined) admin.name = name;
      if (role !== undefined) admin.role = role;
      if (isActive !== undefined) {
        // Switching an account off ends its sessions for good — they stay dead if it is switched back on.
        if (isActive === false && admin.isActive) admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
        admin.isActive = isActive;
      }
      if (passwordHash) {
        admin.passwordHash = passwordHash;
        admin.tokenVersion = (admin.tokenVersion ?? 0) + 1;
        // Changing your own password ends your other sessions, not this one.
        if (admin._id === me._id) startSession(tx, 'admin', admin);
      }
      return ok(staffView(admin), { message: 'Staff account updated' });
    });
  });

  router.delete('/admin/auth/staff/:id', (ctx) => {
    const me = requireAdmin(ctx.db);
    requireSuperAdmin(me);
    if (ctx.params.id === me._id) throw ApiError.badRequest('You cannot delete your own account');
    assertId(ctx.params.id);
    return ctx.write((tx) => {
      if (!tx.remove('admins', ctx.params.id)) throw ApiError.notFound('Admin not found');
      return ok(null, { message: 'Staff account removed' });
    });
  });
}
