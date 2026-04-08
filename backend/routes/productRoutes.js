import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protect } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.route('/')
  .get(getProducts) // Public
  .post(protect, upload.array('images', 5), createProduct); // Private

router.route('/:id')
  .get(getProductById) // Public
  .put(protect, upload.array('images', 5), updateProduct) // Private and Owner Only
  .delete(protect, deleteProduct); // Private and Owner Only

export default router;
