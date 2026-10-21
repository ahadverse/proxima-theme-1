import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage as storeImage } from '../services/storage.service.js';

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image file provided');

  const result = await storeImage(req.file);
  sendSuccess(res, { statusCode: 201, message: 'Image uploaded', data: result });
});
