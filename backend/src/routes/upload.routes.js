import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller.js';
import { requireAdminAuth } from '../middlewares/adminAuth.middleware.js';
import { uploadImage as uploadMiddleware } from '../middlewares/upload.middleware.js';

const router = Router();

router.post('/image', requireAdminAuth, uploadMiddleware.single('image'), uploadImage);

export default router;
