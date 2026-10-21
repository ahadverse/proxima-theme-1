import { Router } from 'express';
import { getPublic, getAdmin, patchAdmin } from '../controllers/settings.controller.js';
import { requireAdminAuth, requireSuperAdmin } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updateSettingsSchema } from '../validators/settings.validators.js';

const router = Router();

router.get('/public', getPublic);
router.get('/', requireAdminAuth, requireSuperAdmin, getAdmin);
router.patch('/', requireAdminAuth, requireSuperAdmin, validate(updateSettingsSchema), patchAdmin);

export default router;
