import { requireAdmin } from '../auth';
import { ApiError } from '../errors';
import { ok, type Router } from '../http';
import { newId } from '../util';

/*
 * Image uploads. The API stores them in R2 (a right-way-up WebP of at most 2400 px); the demo has no file host, so the
 * picture is shrunk here and kept as a data: address inside the visitor's own copy of the shop (each one is stored once —
 * see storage.ts). Smaller than the API's, because the whole copy has to fit in the browser's few megabytes.
 */

const MAX_BYTES = 8 * 1024 * 1024; // the API's upload limit
const MAX_SIDE = 1200;
const QUALITY = 0.82;

/** What the demo's clients send for multipart/form-data: the fields, with files as File objects. */
export interface FormDataBody {
  __formData: [string, unknown][];
}

const isFormData = (body: unknown): body is FormDataBody => Array.isArray((body as FormDataBody | null)?.__formData);

/** The real kind of picture, from its first bytes (storage.service.js sniffImageType) — not what the browser claimed. */
async function sniff(file: Blob): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const text = (start: number, end: number) => String.fromCharCode(...head.slice(start, end));
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head[0] === 0x89 && text(1, 4) === 'PNG') return 'image/png';
  if (text(0, 4) === 'GIF8') return 'image/gif';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
  if (text(4, 8) === 'ftyp' && ['avif', 'avis'].includes(text(8, 12))) return 'image/avif';
  return null;
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

function encode(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** A right-way-up copy no bigger than MAX_SIDE, as WebP (JPEG in a browser that can't make WebP). */
async function shrink(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No canvas');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob = await encode(canvas, 'image/webp');
    if (blob?.type !== 'image/webp') {
      const flat = document.createElement('canvas');
      flat.width = canvas.width;
      flat.height = canvas.height;
      const flatContext = flat.getContext('2d');
      if (flatContext) {
        flatContext.fillStyle = '#fff';
        flatContext.fillRect(0, 0, flat.width, flat.height);
        flatContext.drawImage(canvas, 0, 0);
      }
      blob = await encode(flat, 'image/jpeg');
    }
    if (!blob) throw new Error('The picture could not be encoded');
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    bitmap.close();
  }
}

export function uploadRoutes(router: Router) {
  router.post('/uploads/image', async ({ db, body }) => {
    requireAdmin(db);
    const field = isFormData(body) ? body.__formData.find(([name]) => name === 'image')?.[1] : undefined;
    if (!(field instanceof Blob)) throw ApiError.badRequest('No image file provided');
    if (!field.type.startsWith('image/')) throw ApiError.badRequest('Only image files are allowed');
    if (field.size > MAX_BYTES) throw new ApiError(413, 'That image is too large — the limit is 8 MB');
    if (!(await sniff(field))) throw ApiError.badRequest('Upload a JPG, PNG, WebP, GIF or AVIF image (SVG files are not accepted)');

    let image;
    try {
      image = await shrink(field);
    } catch {
      throw ApiError.badRequest("That image couldn't be read — try a JPG or PNG");
    }
    return ok(
      {
        url: await readAsDataUrl(image.blob),
        publicId: `demo/${newId()}`,
        width: image.width,
        height: image.height,
        bytes: image.blob.size,
        originalBytes: field.size,
      },
      { status: 201, message: 'Image uploaded' }
    );
  });
}
