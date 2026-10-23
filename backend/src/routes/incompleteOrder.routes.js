import { Router } from 'express';
import { sharedRateLimit } from '../middlewares/sharedRateLimit.js';
import { capture, adminList, adminUpdateStatus } from '../controllers/incompleteOrder.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  captureIncompleteOrderSchema,
  adminListIncompleteOrderQuerySchema,
  updateIncompleteOrderStatusSchema,
} from '../validators/incompleteOrder.validators.js';

const router = Router();

// An open endpoint that writes a row: the checkout form sends one every time the shopper pauses typing, so this is
// generous for a person and still stops a script filling the collection.
const captureLimiter = sharedRateLimit('incomplete-order', {
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', captureLimiter, validate(captureIncompleteOrderSchema), capture);
router.get('/', requireAdminAuth, validate(adminListIncompleteOrderQuerySchema, { source: 'query' }), adminList);
router.patch(
  '/:id/status',
  requireAdminAuth,
  validate(updateIncompleteOrderStatusSchema),
  adminUpdateStatus
);

export default router;
