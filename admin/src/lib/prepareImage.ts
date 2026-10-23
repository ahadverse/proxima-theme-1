// Vercel turns away a request body over 4.5 MB before the API ever sees it, while a phone photo is often 5-10 MB. The API
// shrinks every upload to a 2400 px WebP anyway, so a big picture is shrunk the same way here first; anything smaller is
// sent untouched.
const SEND_AS_IS_BYTES = 3.5 * 1024 * 1024;
const TARGET_BYTES = 3.2 * 1024 * 1024;
const MAX_SIDE = 2400; // longest side in pixels, same as the API's limit
const QUALITIES = [0.9, 0.8, 0.7];

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** A copy of the canvas on a white background, for JPEG, which cannot hold transparency. */
function onWhite(canvas: HTMLCanvasElement) {
  const flat = document.createElement('canvas');
  flat.width = canvas.width;
  flat.height = canvas.height;
  const context = flat.getContext('2d');
  if (context) {
    context.fillStyle = '#fff';
    context.fillRect(0, 0, flat.width, flat.height);
    context.drawImage(canvas, 0, 0);
  }
  return flat;
}

/** The best-looking encoding of the canvas that fits the size target: WebP, or JPEG in browsers that cannot make WebP. */
async function encodeToFit(canvas: HTMLCanvasElement): Promise<{ blob: Blob; ext: string } | null> {
  let flat: HTMLCanvasElement | null = null;
  for (const quality of QUALITIES) {
    const webp = await encode(canvas, 'image/webp', quality);
    if (webp?.type === 'image/webp') {
      if (webp.size <= TARGET_BYTES) return { blob: webp, ext: 'webp' };
      continue;
    }
    // No WebP encoder in this browser (older Safari hands back a PNG instead).
    flat ??= onWhite(canvas);
    const jpeg = await encode(flat, 'image/jpeg', quality);
    if (jpeg?.type === 'image/jpeg' && jpeg.size <= TARGET_BYTES) return { blob: jpeg, ext: 'jpg' };
  }
  return null;
}

/**
 * Returns the file to upload: the same one if it is already small, otherwise a downscaled copy. If the picture cannot be
 * read or shrunk here (an animated GIF would lose its animation on a canvas), the original is returned and the API gives
 * its own answer.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size <= SEND_AS_IS_BYTES || file.type === 'image/gif' || !file.type.startsWith('image/')) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  try {
    let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) return file;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const result = await encodeToFit(canvas);
      if (result) {
        const base = file.name.replace(/\.[^.]+$/, '') || 'image';
        return new File([result.blob], `${base}.${result.ext}`, { type: result.blob.type });
      }
      scale *= 0.75;
    }
    return file;
  } finally {
    bitmap.close();
  }
}
