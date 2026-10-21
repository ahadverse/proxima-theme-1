import { Router } from 'express';
import {
  register,
  login,
  logout,
  me,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  changePassword,
} from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/auth.validators.js';
import {
  updateProfileSchema,
  addressSchema,
  updateAddressSchema,
  changePasswordSchema,
} from '../validators/account.validators.js';
import { requireCustomerAuth } from '../middlewares/auth.middleware.js';
import { loginLimiter, registerLimiter } from '../middlewares/authLimiter.middleware.js';

const router = Router();

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireCustomerAuth, me);
router.patch('/me', requireCustomerAuth, validate(updateProfileSchema), updateProfile);
router.post('/me/addresses', requireCustomerAuth, validate(addressSchema), addAddress);
router.patch('/me/addresses/:id', requireCustomerAuth, validate(updateAddressSchema), updateAddress);
router.delete('/me/addresses/:id', requireCustomerAuth, deleteAddress);
// Knowing the current password is the check here, so wrong guesses are rate limited like a sign-in.
router.patch('/me/password', requireCustomerAuth, loginLimiter, validate(changePasswordSchema), changePassword);

export default router;
