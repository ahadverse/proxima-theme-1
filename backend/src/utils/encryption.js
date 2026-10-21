import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getKey() {
  if (!env.appEncryptionKey) {
    return null;
  }
  // Accept either a 64-char hex string or an arbitrary passphrase (hashed to 32 bytes).
  if (/^[0-9a-f]{64}$/i.test(env.appEncryptionKey)) {
    return Buffer.from(env.appEncryptionKey, 'hex');
  }
  return crypto.createHash('sha256').update(env.appEncryptionKey).digest();
}

/**
 * Encrypts a plaintext string for storage. Returns null if no APP_ENCRYPTION_KEY is set
 * (secrets are then stored as-is — acceptable for local dev, not for production).
 */
export function encryptSecret(plainText) {
  if (plainText == null || plainText === '') return plainText;
  const key = getKey();
  if (!key) return plainText;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return ['enc', iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decryptSecret(storedValue) {
  if (storedValue == null || storedValue === '') return storedValue;
  const key = getKey();
  if (!key || typeof storedValue !== 'string' || !storedValue.startsWith('enc:')) {
    return storedValue;
  }

  const [, ivHex, authTagHex, dataHex] = storedValue.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskSecret(plainText) {
  if (!plainText) return '';
  const str = String(plainText);
  if (str.length <= 4) return '••••';
  return `••••${str.slice(-4)}`;
}
