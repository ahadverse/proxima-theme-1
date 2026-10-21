import { Router } from 'express';
import { capture, adminList, adminUpdateStatus } from '../controllers/incompleteOrder.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  captureIncompleteOrderSchema,
  adminListIncompleteOrderQuerySchema,
  updateIncompleteOrderStatusSchema,
} from '../validators/incompleteOrder.validators.js';

const router = Router();

router.post('/', validate(captureIncompleteOrderSchema), capture);
router.get('/', requireAdminAuth, validate(adminListIncompleteOrderQuerySchema, { source: 'query' }), adminList);
router.patch(
  '/:id/status',
  requireAdminAuth,
  validate(updateIncompleteOrderStatusSchema),
  adminUpdateStatus
);

export default router;
