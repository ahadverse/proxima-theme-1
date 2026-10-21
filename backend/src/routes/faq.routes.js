import { Router } from 'express';
import { list, adminList, create, update, remove } from '../controllers/faq.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { faqSchema } from '../validators/content.validators.js';

const router = Router();

router.get('/', list);
router.get('/manage', requireAdminAuth, adminList);
router.post('/', requireAdminAuth, validate(faqSchema), create);
router.patch('/:id', requireAdminAuth, validate(faqSchema.partial()), update);
router.delete('/:id', requireAdminAuth, remove);

export default router;
