import sharp from 'sharp';
import { ApiError } from '../../utils/ApiError.js';

// What an uploaded picture is turned into before it is stored. The storefront's next/image already serves every
// device its own size, in WebP or AVIF, and caches it — so what is stored is a good master copy, not a thumbnail:
// big enough to zoom and to look sharp on a retina screen, small enough that nobody downloads a 6 MB photo.
const MAX_SIDE = 2400; // longest side, in pixels; smaller pictures are never enlarged
const QUALITY = 82;
// A decompression-bomb guard: a small file can claim to be enormous. About 9000 × 9000.
const MAX_INPUT_PIXELS = 80_000_000;

/**
 * Re-encodes an image as WebP: turned the right way up (phones store photos sideways and add a rotation flag),
 * scaled down to fit MAX_SIDE, and stripped of its metadata (camera, date and often GPS position). Transparency
 * and animation are kept. Returns { buffer, contentType, ext, width, height }.
 *
 * A picture that is already a WebP/AVIF no larger than the limit, with nothing to rotate, is left as it is when
 * re-encoding would only make it bigger.
 */
export async function optimizeImage(input, original) {
  try {
    const image = sharp(input, { animated: true, limitInputPixels: MAX_INPUT_PIXELS });
    const meta = await image.metadata();
    const frameHeight = meta.pageHeight ?? meta.height;
    const needsResize = (meta.width ?? 0) > MAX_SIDE || (frameHeight ?? 0) > MAX_SIDE;

    const { data, info } = await image
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 })
      .toBuffer({ resolveWithObject: true });

    const alreadyLean = (original.ext === 'webp' || original.ext === 'avif') && !needsResize && !meta.orientation;
    if (alreadyLean && data.length >= input.length) {
      return { buffer: input, contentType: original.contentType, ext: original.ext, width: meta.width, height: frameHeight };
    }
    return { buffer: data, contentType: 'image/webp', ext: 'webp', width: info.width, height: info.pageHeight ?? info.height };
  } catch (err) {
    if (/pixel limit|exceeds/i.test(err.message)) {
      throw ApiError.badRequest('That image has too many pixels (the limit is about 80 megapixels) — resize it and try again');
    }
    throw ApiError.badRequest("That image couldn't be read — try saving it again as a JPG or PNG");
  }
}
