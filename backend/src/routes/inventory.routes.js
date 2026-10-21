import { Router } from 'express';
import { list, lowStock } from '../controllers/inventory.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { inventoryQuerySchema } from '../validators/inventory.validators.js';

const router = Router();

router.use(requireAdminAuth);
router.get('/low-stock', lowStock);
router.get('/', validate(inventoryQuerySchema, { source: 'query' }), list);

export default router;
