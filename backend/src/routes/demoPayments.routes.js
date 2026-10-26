import { Router } from 'express';
import { sharedRateLimit } from '../middlewares/sharedRateLimit.js';
import { start, callback, verify } from '../controllers/demoPayments.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { startDemoPaymentSchema, verifyDemoReceiptSchema } from '../validators/demoPayments.validators.js';

/** The browser-only live demo's payments (services/demoPayments.service.js). Mounted only when DEMO_PAYMENTS_ORIGINS is set. */
const router = Router();

// Each start calls the gateway's sandbox; a visitor needs a handful, a script trying to hammer the sandbox gets stopped.
const startLimiter = sharedRateLimit('demo-payment-start', {
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/verify', validate(verifyDemoReceiptSchema), verify);
router.post('/:provider/start', startLimiter, validate(startDemoPaymentSchema), start);
router.get('/:provider/callback/:token', callback);
router.post('/:provider/callback/:token', callback);

export default router;
