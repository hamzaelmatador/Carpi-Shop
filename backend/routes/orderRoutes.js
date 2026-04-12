import express from 'express';
import { 
  payOrder, 
  confirmMeeting, 
  completeDeal, 
  getOrderById, 
  getMyOrders 
} from '../controllers/orderController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getMyOrders);

router.route('/:id')
  .get(protect, getOrderById);

router.route('/:id/pay')
  .put(protect, payOrder);

router.route('/:id/confirm-meeting')
  .put(protect, confirmMeeting);

router.route('/:id/complete')
  .put(protect, completeDeal);

export default router;
