import { Router } from 'express';
import { sharedRateLimit } from '../middlewares/sharedRateLimit.js';
import { list, create, update, remove, validateCode } from '../controllers/coupon.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { couponSchema, couponUpdateSchema, couponQuerySchema } from '../validators/coupon.validators.js';
import { validateCouponSchema } from '../validators/order.validators.js';

const router = Router();

// Open to shoppers, so a tight cap: it must not be usable to guess codes.
const validateLimiter = sharedRateLimit('coupon-validate', {
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});
router.post('/validate', validateLimiter, validate(validateCouponSchema), validateCode);

router.use(requireAdminAuth);
router.get('/', validate(couponQuerySchema, { source: 'query' }), list);
router.post('/', validate(couponSchema), create);
router.patch('/:id', validate(couponUpdateSchema), update);
router.delete('/:id', remove);

export default router;
