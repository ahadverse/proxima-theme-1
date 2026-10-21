import { Router } from 'express';
import {
  login,
  logout,
  me,
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../../controllers/adminAuth.controller.js';
import { validate } from '../../middlewares/validate.middleware.js';
import {
  adminLoginSchema,
  staffCreateSchema,
  staffUpdateSchema,
} from '../../validators/auth.validators.js';
import { requireAdminAuth, requireSuperAdmin } from '../../middlewares/adminAuth.middleware.js';
import { loginLimiter } from '../../middlewares/authLimiter.middleware.js';

const router = Router();

router.post('/login', loginLimiter, validate(adminLoginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAdminAuth, me);

router.get('/staff', requireAdminAuth, requireSuperAdmin, listStaff);
router.post('/staff', requireAdminAuth, requireSuperAdmin, validate(staffCreateSchema), createStaff);
router.patch(
  '/staff/:id',
  requireAdminAuth,
  requireSuperAdmin,
  validate(staffUpdateSchema),
  updateStaff
);
router.delete('/staff/:id', requireAdminAuth, requireSuperAdmin, deleteStaff);

export default router;
