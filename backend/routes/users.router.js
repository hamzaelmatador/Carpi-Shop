import express from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/users.controller.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorizeAdmin from '../middlewares/authorizeAdmin.js';

const router = express.Router();

// Allow authenticated users to get their own ID/profile info or update it
// The controller logic should ideally verify ID ownership if not an admin
router.route('/:id')
  .get(protect, getUserById)
  .put(protect, updateUser);

// Admin-only routes
router.route('/')
  .get(protect, authorizeAdmin, getUsers);

router.route('/:id')
  .delete(protect, authorizeAdmin, deleteUser);

export default router;
