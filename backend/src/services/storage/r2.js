import crypto from 'node:crypto';
import { env } from '../../config/env.js';

// Cloudflare R2 speaks the S3 API. Signing a request (AWS Signature Version 4) takes a few dozen lines, so it is done
// here rather than pulling in the whole AWS SDK — whose newer versions also add checksum headers R2 has rejected.
const REGION = 'auto';
const SERVICE = 's3';
// A stalled upload must not hang the admin's request forever.
const TIMEOUT_MS = 30000;
// Every image gets a key of its own and is never overwritten, so browsers and the CDN may keep it for good.
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const r2Configured = Boolean(
  (env.r2.accountId || env.r2.endpoint) && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.bucket && env.r2.publicUrl
);

const sha256hex = (data) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

/**
 * AWS Signature Version 4 (https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv4-create-signed-request.html).
 * `path` is the already URI-encoded request path; every header the caller sends (other than Host and Authorization,
 * which this adds) must be passed in `headers` so that it is signed. Returns the headers to send.
 */
export function signRequest({
  method,
  host,
  path,
  query = '',
  headers = {},
  payloadHash,
  accessKeyId,
  secretAccessKey,
  region = REGION,
  service = SERVICE,
  now = new Date(),
}) {
  const amzDate = now.toISOString().replace(/[-:]|\.\d{3}/g, ''); // 20260122T101530Z
  const dateStamp = amzDate.slice(0, 8);

  const signed = { host, 'x-amz-date': amzDate };
  for (const [name, value] of Object.entries(headers)) signed[name.toLowerCase()] = String(value).trim().replace(/\s+/g, ' ');

  const names = Object.keys(signed).sort();
  const canonicalHeaders = names.map((n) => `${n}:${signed[n]}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalRequest = [method, path, query, canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service), 'aws4_request');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    ...signed,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

const origin = () => (env.r2.endpoint || `https://${env.r2.accountId}.r2.cloudflarestorage.com`).replace(/\/+$/, '');
const host = () => new URL(origin()).host;
const objectPath = (key) => `/${[env.r2.bucket, ...key.split('/')].map(encodeURIComponent).join('/')}`;

async function send(method, key, { body, contentType } = {}) {
  const payloadHash = sha256hex(body ?? '');
  const signed = signRequest({
    method,
    host: host(),
    path: objectPath(key),
    headers: {
      'x-amz-content-sha256': payloadHash,
      ...(body ? { 'content-type': contentType, 'cache-control': CACHE_CONTROL } : {}),
    },
    payloadHash,
    accessKeyId: env.r2.accessKeyId,
    secretAccessKey: env.r2.secretAccessKey,
  });
  // fetch sets Host itself, from the URL — the same value that was signed.
  const { host: signedHost, ...headers } = signed;
  void signedHost;

  const res = await fetch(`${origin()}${objectPath(key)}`, {
    method,
    headers,
    ...(body ? { body } : {}),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // R2 explains a refusal in a small XML body: <Error><Code>SignatureDoesNotMatch</Code>…
    const code = (await res.text().catch(() => '')).match(/<Code>([^<]+)<\/Code>/)?.[1];
    throw new Error(`R2 answered HTTP ${res.status}${code ? ` (${code})` : ''}`);
  }
}

export const putObject = (key, body, contentType) => send('PUT', key, { body, contentType });
export const deleteObject = (key) => send('DELETE', key);

/** The address the browser loads the image from — the bucket's public URL (an r2.dev address or your own domain). */
export const publicUrlFor = (key) => `${env.r2.publicUrl.replace(/\/+$/, '')}/${key}`;

/**
 * A read-only check that the R2 settings work: lists at most one object. Returns { ok, status, code } — `code` is R2's own
 * word for what is wrong ("Unauthorized", "NoSuchBucket"…). Used by `npm run check:storage`; writes nothing.
 */
export async function checkAccess() {
  const query = 'list-type=2&max-keys=1';
  const path = `/${encodeURIComponent(env.r2.bucket)}`;
  const payloadHash = sha256hex('');
  const { host: signedHost, ...headers } = signRequest({
    method: 'GET',
    host: host(),
    path,
    query,
    headers: { 'x-amz-content-sha256': payloadHash },
    payloadHash,
    accessKeyId: env.r2.accessKeyId,
    secretAccessKey: env.r2.secretAccessKey,
  });
  void signedHost;
  const res = await fetch(`${origin()}${path}?${query}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const code = (await res.text().catch(() => '')).match(/<Code>([^<]+)<\/Code>/)?.[1];
  return { ok: res.ok, status: res.status, code };
}
