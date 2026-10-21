import { Banner } from '../models/Banner.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// What the storefront needs to draw a banner — nothing about scheduling or timestamps.
const PUBLIC_FIELDS = 'type title subtitle highlights image mobileImage ctaText ctaLink sortOrder';

/** Public: banners that are switched on and inside their start/end window, in display order. */
export const list = asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = {
    status: 'active',
    // `null` matches a missing date too, i.e. "no start" / "no end".
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  };
  if (req.query.type) filter.type = req.query.type;

  const banners = await Banner.find(filter)
    .select(PUBLIC_FIELDS)
    .sort({ type: 1, sortOrder: 1, createdAt: 1 })
    .lean();
  sendSuccess(res, { data: banners });
});

/** Admin: every banner whatever its status or schedule. */
export const adminList = asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;

  const banners = await Banner.find(filter).sort({ type: 1, sortOrder: 1, createdAt: 1 });
  sendSuccess(res, { data: banners });
});

export const create = asyncHandler(async (req, res) => {
  const banner = await Banner.create(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Banner created', data: banner });
});

export const update = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!banner) throw ApiError.notFound('Banner not found');
  sendSuccess(res, { message: 'Banner updated', data: banner });
});

export const remove = asyncHandler(async (req, res) => {
  const banner = await Banner.findByIdAndDelete(req.params.id);
  if (!banner) throw ApiError.notFound('Banner not found');
  sendSuccess(res, { message: 'Banner deleted' });
});
