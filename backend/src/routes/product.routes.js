import { Router } from 'express';
import {
  list,
  adminList,
  featured,
  getOne,
  getById,
  create,
  update,
  remove,
  updateStock,
} from '../controllers/product.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  productSchema,
  featuredQuerySchema,
  productQuerySchema,
  productAdminQuerySchema,
  stockAdjustSchema,
} from '../validators/catalog.validators.js';
import reviewRoutes from './review.routes.js';

const router = Router();

// Literal GET routes first — must come before the dynamic GET /:slug below.
const featuredQuery = validate(featuredQuerySchema, { source: 'query' });
router.get('/flash-sale', featuredQuery, featured('flash-sale'));
router.get('/trending', featuredQuery, featured('trending'));
router.get('/new-arrivals', featuredQuery, featured('new-arrivals'));
router.get('/best-sellers', featuredQuery, featured('best-sellers'));
router.get(
  '/manage',
  requireAdminAuth,
  validate(productAdminQuerySchema, { source: 'query' }),
  adminList
);
router.get('/manage/:id', requireAdminAuth, getById);
router.use('/:productId/reviews', reviewRoutes);

router.post('/', requireAdminAuth, validate(productSchema), create);
router.patch('/:id/stock', requireAdminAuth, validate(stockAdjustSchema), updateStock);
router.patch('/:id', requireAdminAuth, validate(productSchema.partial()), update);
router.delete('/:id', requireAdminAuth, remove);

router.get('/', validate(productQuerySchema, { source: 'query' }), list);
router.get('/:slug', getOne);

export default router;
