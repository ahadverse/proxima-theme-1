import crypto from 'node:crypto';
import { cloudinaryConfigured } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { deleteFromCloudinary, uploadBufferToCloudinary } from './cloudinary.service.js';
import { optimizeImage } from './storage/optimizeImage.js';
import { deleteObject, publicUrlFor, putObject, r2Configured } from './storage/r2.js';

/**
 * Where uploaded images are kept: Cloudflare R2 when its R2_* settings are in the backend .env, else Cloudinary when
 * that is set up, else nowhere (uploads are refused with a message saying so).
 */
export const storageProvider = r2Configured ? 'r2' : cloudinaryConfigured ? 'cloudinary' : null;

/**
 * What kind of image these bytes really are, from the file's own first bytes — not from the name or the Content-Type the
 * browser claimed, so a page of HTML sent as "image/png" is not stored and later served as a web page.
 */
export function sniffImageType(buffer) {
  const at = (start, end) => buffer.subarray(start, end).toString('latin1');
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: 'jpg', contentType: 'image/jpeg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', contentType: 'image/png' };
  if (at(0, 4) === 'GIF8') return { ext: 'gif', contentType: 'image/gif' };
  if (at(0, 4) === 'RIFF' && at(8, 12) === 'WEBP') return { ext: 'webp', contentType: 'image/webp' };
  if (at(4, 8) === 'ftyp' && (at(8, 12) === 'avif' || at(8, 12) === 'avis')) return { ext: 'avif', contentType: 'image/avif' };
  return null;
}

/** `file` is multer's in-memory upload ({ buffer }). Returns { url, publicId } — publicId is what deleteImage needs. */
export async function uploadImage(file) {
  if (storageProvider === 'r2') {
    const sniffed = sniffImageType(file.buffer);
    if (!sniffed) throw ApiError.badRequest('Upload a JPG, PNG, WebP, GIF or AVIF image (SVG files are not accepted)');
    // Stored as a right-way-up, metadata-free WebP no bigger than 2400 px — see optimizeImage.js.
    const image = await optimizeImage(file.buffer, sniffed);
    const type = { ext: image.ext, contentType: image.contentType };

    const now = new Date();
    const key = `maroon/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomBytes(12).toString('hex')}.${type.ext}`;
    try {
      await putObject(key, image.buffer, type.contentType);
    } catch (err) {
      logger.error('Image storage (R2): upload failed —', err.message);
      throw new ApiError(
        502,
        "The image couldn't be saved to storage. Check the R2 settings in the backend .env (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL)."
      );
    }
    return {
      url: publicUrlFor(key),
      publicId: key,
      width: image.width,
      height: image.height,
      bytes: image.buffer.length,
      originalBytes: file.buffer.length,
    };
  }

  if (storageProvider === 'cloudinary') return uploadBufferToCloudinary(file.buffer);

  throw ApiError.badRequest('Image uploads are not configured yet — add the Cloudflare R2 (R2_*) or Cloudinary credentials to the backend .env file');
}

/** Removes an image uploaded earlier. Never throws: a leftover file is not worth failing the caller over. */
export async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    if (storageProvider === 'r2') await deleteObject(publicId);
    else await deleteFromCloudinary(publicId);
  } catch (err) {
    logger.warn('Image storage: could not delete an image —', err.message);
  }
}
