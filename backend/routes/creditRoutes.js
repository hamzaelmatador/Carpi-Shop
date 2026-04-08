import express from 'express';
import {
  addCredits,
  deductCredits,
  getUserCredits,
  getCreditTransactions,
} from '../controllers/creditController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorizeAdmin from '../middlewares/authorizeAdmin.js';

const router = express.Router();

// Publicly accessible via protect to see their own history
router.get('/user/:id', protect, getUserCredits);
router.get('/transactions/:id', protect, getCreditTransactions);

// Admin-only endpoints
router.post('/admin/add', protect, authorizeAdmin, addCredits);
router.post('/admin/deduct', protect, authorizeAdmin, deductCredits);

export default router;
