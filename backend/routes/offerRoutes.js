import express from 'express';
import { createOffer, getMyOffers, updateOfferStatus, checkPendingOffer } from '../controllers/offerController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createOffer)
  .get(protect, getMyOffers);

router.route('/check/:productId')
  .get(protect, checkPendingOffer);

router.route('/:id/status')
  .put(protect, updateOfferStatus);

export default router;
