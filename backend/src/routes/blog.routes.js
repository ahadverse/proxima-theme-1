import { Router } from 'express';
import {
  list,
  getOne,
  adminList,
  adminGetOne,
  create,
  update,
  publish,
  unpublish,
  remove,
} from '../controllers/blog.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  blogSchema,
  blogUpdateSchema,
  blogPublicQuerySchema,
  blogAdminQuerySchema,
} from '../validators/content.validators.js';

const router = Router();

router.get('/', validate(blogPublicQuerySchema, { source: 'query' }), list);

// Literal GET routes first — must come before the dynamic GET /:slug below.
router.get('/manage', requireAdminAuth, validate(blogAdminQuerySchema, { source: 'query' }), adminList);
router.get('/manage/:id', requireAdminAuth, adminGetOne);

router.post('/', requireAdminAuth, validate(blogSchema), create);
router.post('/:id/publish', requireAdminAuth, publish);
router.post('/:id/unpublish', requireAdminAuth, unpublish);
router.patch('/:id', requireAdminAuth, validate(blogUpdateSchema), update);
router.delete('/:id', requireAdminAuth, remove);

router.get('/:slug', getOne);

export default router;
