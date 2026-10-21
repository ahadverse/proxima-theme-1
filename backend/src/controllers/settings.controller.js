import { asyncHandler } from '../middlewares/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getAdminSettings, getPublicSettings, updateSettings } from '../services/settings.service.js';
import { refreshStorefront } from '../services/storefront.service.js';

export const getPublic = asyncHandler(async (req, res) => {
  const settings = await getPublicSettings();
  sendSuccess(res, { data: settings });
});

export const getAdmin = asyncHandler(async (req, res) => {
  const settings = await getAdminSettings();
  sendSuccess(res, { data: settings });
});

export const patchAdmin = asyncHandler(async (req, res) => {
  const settings = await updateSettings(req.body);
  // Saved. Now the storefront drops its cached copy, so the change is on the site on its next page load.
  await refreshStorefront(['settings']);
  sendSuccess(res, { message: 'Settings updated', data: settings });
});
