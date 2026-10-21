import { Router } from 'express';
import {
  getOne,
  adminList,
  adminGetOne,
  create,
  update,
  remove,
} from '../controllers/page.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { pageSchema, pageUpdateSchema } from '../validators/content.validators.js';

const router = Router();

// Literal GET routes first — must come before the dynamic GET /:slug below.
router.get('/manage', requireAdminAuth, adminList);
router.get('/manage/:id', requireAdminAuth, adminGetOne);

router.post('/', requireAdminAuth, validate(pageSchema), create);
router.patch('/:id', requireAdminAuth, validate(pageUpdateSchema), update);
router.delete('/:id', requireAdminAuth, remove);

router.get('/:slug', getOne);

export default router;
