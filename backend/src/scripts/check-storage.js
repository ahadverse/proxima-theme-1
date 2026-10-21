// `npm run check:storage` — says whether uploaded images can be stored with the settings in .env. Writes nothing.
import { env } from '../config/env.js';
import { storageProvider } from '../services/storage.service.js';
import { checkAccess } from '../services/storage/r2.js';

const HINTS = {
  Unauthorized:
    "Cloudflare doesn't accept this Access Key ID / Secret Access Key pair. Create a new token in Cloudflare → R2 → Manage API tokens (permission: Object Read & Write) and copy the Access Key ID and the Secret Access Key — not the \"Token value\" — into R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.",
  SignatureDoesNotMatch: 'The Secret Access Key is wrong (copy it again from the token page — it is shown only once).',
  InvalidAccessKeyId: 'The Access Key ID is wrong.',
  AccessDenied: 'The token is valid but not allowed to use this bucket — give it Object Read & Write on the bucket.',
  NoSuchBucket: 'R2_BUCKET is not the name of a bucket in this account. If the bucket is in the EU, also set R2_ENDPOINT=https://<account id>.eu.r2.cloudflarestorage.com.',
};

if (storageProvider === 'cloudinary') {
  console.log('Images are stored with Cloudinary (CLOUDINARY_* is set and R2_* is not).');
} else if (storageProvider !== 'r2') {
  console.log('No image storage is configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL in backend/.env.');
  process.exitCode = 1;
} else {
  const { ok, status, code } = await checkAccess().catch((err) => ({ ok: false, status: 0, code: err.message }));
  if (ok) {
    console.log(`Cloudflare R2 is working: bucket "${env.r2.bucket}" accepted the credentials.`);
    console.log(`Uploaded images will be served from ${env.r2.publicUrl.replace(/\/+$/, '')}/…`);
    console.log('Also add the host to the storefront: IMAGE_HOSTNAMES=' + new URL(env.r2.publicUrl).host + ' (frontend/.env.local).');
  } else {
    console.log(`Cloudflare R2 refused the request: HTTP ${status}${code ? ` (${code})` : ''}.`);
    if (HINTS[code]) console.log(HINTS[code]);
    process.exitCode = 1;
  }
}
