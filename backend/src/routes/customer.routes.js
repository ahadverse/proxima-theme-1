import { Router } from 'express';
import { list, getOne } from '../controllers/customer.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { customerQuerySchema } from '../validators/customer.validators.js';

const router = Router();

router.use(requireAdminAuth);
router.get('/', validate(customerQuerySchema, { source: 'query' }), list);
router.get('/:id', getOne);

export default router;
