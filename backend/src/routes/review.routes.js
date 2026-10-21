import { Router } from 'express';
import { list, create } from '../controllers/review.controller.js';
import { requireCustomerAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createReviewSchema } from '../validators/review.validators.js';

const router = Router({ mergeParams: true });

router.get('/', list);
router.post('/', requireCustomerAuth, validate(createReviewSchema), create);

export default router;
