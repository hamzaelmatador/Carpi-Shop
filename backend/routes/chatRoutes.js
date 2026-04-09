import express from 'express';
import { getChatMessages } from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/:orderId', protect, getChatMessages);

export default router;
