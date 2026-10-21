import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signCustomerToken(userId) {
  return jwt.sign({ sub: userId, type: 'customer' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function signAdminToken(adminId, role) {
  return jwt.sign({ sub: adminId, role, type: 'admin' }, env.adminJwtSecret, {
    expiresIn: env.adminJwtExpiresIn,
  });
}

export function verifyCustomerToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function verifyAdminToken(token) {
  return jwt.verify(token, env.adminJwtSecret);
}

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res, name, token) {
  res.cookie(name, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    domain: env.cookieDomain,
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

export function clearAuthCookie(res, name) {
  res.clearCookie(name, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    domain: env.cookieDomain,
    path: '/',
  });
}
