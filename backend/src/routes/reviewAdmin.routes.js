import { Router } from 'express';
import { adminList, approve, remove } from '../controllers/review.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { adminReviewQuerySchema } from '../validators/review.validators.js';

// Top-level, cross-product moderation surface — distinct from review.routes.js, which is
// nested under /products/:productId/reviews for the public list+create endpoints.
const router = Router();

router.use(requireAdminAuth);
router.get('/', validate(adminReviewQuerySchema, { source: 'query' }), adminList);
router.patch('/:id/approve', approve);
router.delete('/:id', remove);

export default router;
