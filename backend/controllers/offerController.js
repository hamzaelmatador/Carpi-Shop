import Offer from '../models/Offer.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

// @desc    Update offer status (Accept/Reject)
// @route   PUT /api/offers/:id/status
// @access  Private
export const updateOfferStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'
    const offerId = req.params.id;

    const offer = await Offer.findById(offerId);
    if (!offer) {
      res.status(404);
      throw new Error('Offer not found');
    }

    // 1. Only the seller can update the status
    if (offer.seller.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the seller can respond to this offer');
    }

    // 2. Prevent updating already responded offers
    if (offer.status !== 'pending') {
      res.status(400);
      throw new Error(`Offer is already ${offer.status}`);
    }

    offer.status = status;

    let order = null;
    // 3. If accepted, create the Simulated Escrow Order
    if (status === 'accepted') {
      order = new Order({
        offer: offer._id,
        product: offer.product,
        buyer: offer.buyer,
        seller: offer.seller,
        finalPrice: offer.amount,
        status: 'payment_pending',
        escrowId: `SIM-ESC-${Math.random().toString(36).toUpperCase().substring(2, 10)}`,
      });

      const savedOrder = await order.save();
      offer.order = savedOrder._id; // Link the order back to the offer
    }

    const updatedOffer = await offer.save();

    res.json({
      offer: updatedOffer,
      order,
      message: status === 'accepted' ? 'Offer accepted and order created' : 'Offer rejected',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new offer for a product
// @route   POST /api/offers
// @access  Private
export const createOffer = async (req, res, next) => {
  try {
    const { productId, amount } = req.body;

    // 1. Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    // 2. Prevent owner from making an offer on their own product
    if (product.owner.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error('You cannot make an offer on your own product');
    }

    // 3. Prevent multiple pending offers for the same product
    const existingOffer = await Offer.findOne({
      product: productId,
      buyer: req.user._id,
      status: 'pending',
    });

    if (existingOffer) {
      res.status(400);
      throw new Error('You already have a pending offer for this product');
    }

    // 4. Create the offer
    const offer = new Offer({
      product: productId,
      buyer: req.user._id,
      seller: product.owner,
      amount: Number(amount),
      status: 'pending',
    });

    const createdOffer = await offer.save();

    // 4. Populate for a rich response
    const populatedOffer = await Offer.findById(createdOffer._id)
      .populate('product', 'title price images')
      .populate('buyer', 'name email')
      .populate('seller', 'name email');

    res.status(201).json(populatedOffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all offers for the logged-in user (as buyer or seller)
// @route   GET /api/offers
// @access  Private
export const getMyOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }],
    })
      .populate('product', 'title price images')
      .populate('buyer', 'name email profilePicture')
      .populate('seller', 'name email profilePicture')
      .sort({ createdAt: -1 });

    res.json(offers);
  } catch (error) {
    next(error);
  }
};

// @desc    Check if the logged-in user has a pending offer for a specific product
// @route   GET /api/offers/check/:productId
// @access  Private
export const checkPendingOffer = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const offer = await Offer.findOne({
      product: productId,
      buyer: req.user._id,
      status: 'pending',
    });

    res.json({ hasPendingOffer: !!offer, offer });
  } catch (error) {
    next(error);
  }
};
