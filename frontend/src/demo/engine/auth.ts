import { ApiError } from './errors';
import type { Database, Tx } from './db';
import type { Doc } from './types';

/*
 * Sign-ins. The API keeps a customer's and an admin's session in two cookies; here they are two records in the shared
 * `sessions` collection — one per browser, seen by every tab of it, as a cookie is. A password change or a deactivated
 * account raises the account's tokenVersion, which ends the session, exactly as it invalidates the API's tokens.
 *
 * Passwords are PBKDF2 hashes (the browser has no bcrypt). The person "attacking" a demo account can only be the visitor
 * themselves, so the work factor only needs to be honest, not expensive.
 */

const ITERATIONS = 20_000;
const encoder = new TextEncoder();

const toBase64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(await derive(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password: string, stored: unknown): Promise<boolean> {
  const [scheme, iterations, salt, hash] = typeof stored === 'string' ? stored.split('$') : [];
  if (scheme !== 'pbkdf2' || !salt || !hash) {
    // An unknown account costs the same work as a wrong password (the API's burnPasswordCheck).
    await derive(password, new Uint8Array(16), ITERATIONS);
    return false;
  }
  const actual = new Uint8Array(await derive(password, fromBase64(salt), Number(iterations)));
  const expected = fromBase64(hash);
  return actual.length === expected.length && actual.every((byte, i) => byte === expected[i]);
}

/** The documented password of every demo account, shown on both sign-in pages. */
export const DEMO_PASSWORD = 'demo1234';

// ---------- Sessions

type SessionKind = 'customer' | 'admin';

export function startSession(tx: Tx, kind: SessionKind, account: Doc) {
  tx.remove('sessions', kind);
  tx.insert('sessions', { _id: kind, account: account._id, tv: account.tokenVersion ?? 0 });
}

export function endSession(tx: Tx, kind: SessionKind) {
  tx.remove('sessions', kind);
}

function sessionAccount(db: Database, kind: SessionKind): { account: Doc | undefined; valid: boolean } | null {
  const session = db.get('sessions', kind);
  if (!session) return null;
  const account = db.get(kind === 'admin' ? 'admins' : 'users', session.account);
  const valid = Boolean(account && account.isActive !== false && (account.tokenVersion ?? 0) === (session.tv ?? 0));
  return { account, valid };
}

/** The signed-in customer, or a 401 with the API's message. */
export function requireCustomer(db: Database): Doc {
  const found = sessionAccount(db, 'customer');
  if (!found) throw ApiError.unauthorized('Please log in to continue');
  if (!found.valid || !found.account) throw ApiError.unauthorized('Session expired, please log in again');
  return found.account;
}

/** The signed-in customer if there is one — checkout works signed in or as a guest. */
export function customerIfPresent(db: Database): Doc | undefined {
  const found = sessionAccount(db, 'customer');
  return found?.valid ? found.account : undefined;
}

export function requireAdmin(db: Database): Doc {
  const found = sessionAccount(db, 'admin');
  if (!found) throw ApiError.unauthorized('Admin login required');
  if (!found.account || found.account.isActive === false) throw ApiError.unauthorized('Admin account not found or inactive');
  if (!found.valid) throw ApiError.unauthorized('Session expired, please log in again');
  return found.account;
}

export function requireSuperAdmin(admin: Doc) {
  if (admin.role !== 'super-admin') throw ApiError.forbidden('Only a super-admin can perform this action');
}
