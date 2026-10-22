import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  create,
  myOrders,
  myOrderDetail,
  track,
  adminList,
  adminGetOne,
  adminUpdateStatus,
  adminUpdatePayment,
  initPayment,
} from '../controllers/order.controller.js';
import { requireCustomerAuth, attachCustomerIfPresent } from '../middlewares/auth.middleware.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  updateOrderPaymentSchema,
  adminOrderQuerySchema,
} from '../validators/order.validators.js';

const router = Router();

// Order numbers are short and the phone number is often known to others (a friend, a delivery rider),
// so lookups are capped to stop someone walking through numbers looking for a hit.
const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many lookups — please wait a few minutes and try again' },
});

// Placing an order is the one public write that costs real money (stock, a courier booking, a call to the customer), so a
// script placing orders in bulk is capped. Generous enough for a family or a shop sharing one connection.
const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many orders from this connection — please wait a few minutes and try again' },
});

router.get('/track', trackLimiter, track);
router.get('/my', requireCustomerAuth, myOrders);
router.get('/admin', requireAdminAuth, validate(adminOrderQuerySchema, { source: 'query' }), adminList);
router.get('/admin/:id', requireAdminAuth, adminGetOne);
router.patch('/admin/:id/status', requireAdminAuth, validate(updateOrderStatusSchema), adminUpdateStatus);
router.patch('/admin/:id/payment', requireAdminAuth, validate(updateOrderPaymentSchema), adminUpdatePayment);

router.post('/', createOrderLimiter, attachCustomerIfPresent, validate(createOrderSchema), create);
router.post('/:id/pay/:provider', initPayment);
router.get('/:id', requireCustomerAuth, myOrderDetail);

export default router;
