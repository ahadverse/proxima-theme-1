import { Router } from 'express';
import { list, create, update, remove } from '../controllers/attribute.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { attributeSchema } from '../validators/catalog.validators.js';

const router = Router();

router.get('/', list);
router.post('/', requireAdminAuth, validate(attributeSchema), create);
router.patch('/:id', requireAdminAuth, validate(attributeSchema.partial()), update);
router.delete('/:id', requireAdminAuth, remove);

export default router;
