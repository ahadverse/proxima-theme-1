import { Router } from 'express';
import { callback } from '../controllers/payment.controller.js';

const router = Router();

router.get('/:provider/callback', callback);
router.post('/:provider/callback', callback);
// PayStation carries the order number in the path (see services/payments/paystation.js).
router.get('/:provider/callback/:ref', callback);
router.post('/:provider/callback/:ref', callback);

export default router;
