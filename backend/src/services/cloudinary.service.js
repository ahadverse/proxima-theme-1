import { cloudinary, cloudinaryConfigured } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

const FOLDER = 'maroon';

export function uploadBufferToCloudinary(buffer, { folder = FOLDER } = {}) {
  if (!cloudinaryConfigured) {
    throw ApiError.badRequest(
      'Image uploads are not configured yet — add Cloudinary credentials in the backend .env file'
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId) {
  if (!cloudinaryConfigured || !publicId) return;
  await cloudinary.uploader.destroy(publicId);
}
