import { Router } from 'express';
import { notifications, summary } from '../controllers/dashboard.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';

const router = Router();

router.use(requireAdminAuth);
router.get('/', summary);
router.get('/notifications', notifications);

export default router;
