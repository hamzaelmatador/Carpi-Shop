import express from 'express';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../controllers/notificationController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getNotifications)
  .put(protect, markAllAsRead);

router.route('/:id')
  .put(protect, markAsRead)
  .delete(protect, deleteNotification);

export default router;
