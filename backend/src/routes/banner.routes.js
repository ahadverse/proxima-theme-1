import { Router } from 'express';
import { list, adminList, create, update, remove } from '../controllers/banner.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  bannerSchema,
  bannerUpdateSchema,
  bannerQuerySchema,
  bannerAdminQuerySchema,
} from '../validators/content.validators.js';

const router = Router();

router.get('/', validate(bannerQuerySchema, { source: 'query' }), list);
router.get('/manage', requireAdminAuth, validate(bannerAdminQuerySchema, { source: 'query' }), adminList);
router.post('/', requireAdminAuth, validate(bannerSchema), create);
router.patch('/:id', requireAdminAuth, validate(bannerUpdateSchema), update);
router.delete('/:id', requireAdminAuth, remove);

export default router;
