import express from 'express';
import { removeBackground } from '../controllers/toolController.js';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.post('/remove-background', protect, upload.single('image'), removeBackground);

export default router;
