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

    const offer = await Offer.findById(offerId).populate('product');
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

    // 3. If accepting, ensure product is not already sold
    if (status === 'accepted') {
      const product = await Product.findById(offer.product._id);
      if (product.isSold) {
        res.status(400);
        throw new Error('This product has already been sold');
      }

      offer.status = 'accepted';

      // 4. Create the Simulated Escrow Order
      const order = new Order({
        offer: offer._id,
        product: offer.product._id,
        buyer: offer.buyer,
        seller: offer.seller,
        finalPrice: offer.amount,
        status: 'payment_pending',
        escrowId: `SIM-ESC-${Math.random().toString(36).toUpperCase().substring(2, 10)}`,
      });

      const savedOrder = await order.save();
      offer.order = savedOrder._id; // Link the order back to the offer

      // 5. Mark product as sold
      product.isSold = true;
      await product.save();

      // 6. Automatically reject ALL other pending offers for this product
      await Offer.updateMany(
        { 
          product: offer.product._id, 
          status: 'pending', 
          _id: { $ne: offer._id } 
        },
        { status: 'rejected' }
      );

      const updatedOffer = await offer.save();

      return res.json({
        offer: updatedOffer,
        order: savedOrder,
        message: 'Offer accepted, product marked as sold, and other pending offers rejected.',
      });
    } else {
      // If rejecting
      offer.status = 'rejected';
      const updatedOffer = await offer.save();
      return res.json({
        offer: updatedOffer,
        message: 'Offer rejected',
      });
    }
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

    // 2. Prevent making an offer if product is already sold
    if (product.isSold) {
      res.status(400);
      throw new Error('This product is already sold');
    }

    // 3. Prevent owner from making an offer on their own product
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

    // Evaluate against competitive bidding rules
    // Find the current highest pending offer for this product
    const highestOffer = await Offer.findOne({
      product: productId,
      status: 'pending',
    }).sort({ amount: -1 });

    let currentMaxDiscount = 25; // Base maximum discount is 25%

    if (highestOffer) {
      const bestOfferDiscountPercentage = Math.floor(((product.price - highestOffer.amount) / product.price) * 100);
      // To beat the current highest offer, the new discount must be strictly smaller
      currentMaxDiscount = Math.max(0, bestOfferDiscountPercentage - 1);
    }

    const minAmountAllowed = product.price * (1 - currentMaxDiscount / 100);

    // We allow a small 0.001 tolerance for JS floating point drift when computing prices locally
    if (amount < minAmountAllowed - 0.001) {
      res.status(400);
      throw new Error(`Discount cannot exceed ${currentMaxDiscount}% (Current highest offer dictates this limit)`);
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

    // Find the highest pending offer globally for this product
    const bestOffer = await Offer.findOne({
      product: productId,
      status: 'pending',
    }).sort({ amount: -1 });

    const offer = await Offer.findOne({
      product: productId,
      buyer: req.user._id,
      status: 'pending',
    });

    res.json({ 
      hasPendingOffer: !!offer, 
      offer,
      highestOfferAmount: bestOffer ? bestOffer.amount : null 
    });
  } catch (error) {
    next(error);
  }
};
