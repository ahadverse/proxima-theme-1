import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { track, overview, products, categories, funnel } from '../controllers/analytics.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { trackEventSchema, rangeQuerySchema, productsQuerySchema } from '../validators/analytics.validators.js';

const router = Router();

// An open endpoint that writes rows: a tighter cap than the API-wide one, so it can't be used to
// inflate view counts or flood the collection.
const trackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/track', trackLimiter, validate(trackEventSchema), track);

router.use(requireAdminAuth);
router.get('/overview', validate(rangeQuerySchema, { source: 'query' }), overview);
router.get('/products', validate(productsQuerySchema, { source: 'query' }), products);
router.get('/categories', validate(rangeQuerySchema, { source: 'query' }), categories);
router.get('/funnel', validate(rangeQuerySchema, { source: 'query' }), funnel);

export default router;
