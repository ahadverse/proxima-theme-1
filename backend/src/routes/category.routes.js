import { Router } from 'express';
import { list, getOne, create, update, remove, reorder } from '../controllers/category.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { categorySchema, reorderSchema } from '../validators/catalog.validators.js';

const router = Router();

router.get('/', list);
router.get('/:slug', getOne);
// Before the /:id routes, so "reorder" isn't taken for an id.
router.patch('/reorder', requireAdminAuth, validate(reorderSchema), reorder);
router.post('/', requireAdminAuth, validate(categorySchema), create);
router.patch('/:id', requireAdminAuth, validate(categorySchema.partial()), update);
router.delete('/:id', requireAdminAuth, remove);

export default router;
