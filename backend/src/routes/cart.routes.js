import { Router } from 'express';
import { getCart, addItem, updateItem, removeItem, applyCoupon } from '../controllers/cart.controller.js';
import { attachCustomerIfPresent } from '../middlewares/auth.middleware.js';
import { resolveCartOwner } from '../middlewares/cartOwner.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { addCartItemSchema, updateCartItemSchema, applyCartCouponSchema } from '../validators/cart.validators.js';

const router = Router();

router.use(attachCustomerIfPresent, resolveCartOwner);

router.get('/', getCart);
router.post('/items', validate(addCartItemSchema), addItem);
router.patch('/items/:itemId', validate(updateCartItemSchema), updateItem);
router.delete('/items/:itemId', removeItem);
router.post('/coupon', validate(applyCartCouponSchema), applyCoupon);

export default router;
