import Order from '../models/Order.js';

// @desc    Simulate payment for an order (Move to Escrow)
// @route   PUT /api/orders/:id/pay
// @access  Private
export const payOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // 1. Only the buyer can pay
    if (order.buyer.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the buyer can pay for this order');
    }

    if (order.status !== 'payment_pending') {
      res.status(400);
      throw new Error('Order is already paid or in a different state');
    }

    // 2. Simulate moving to Escrow
    order.status = 'escrow';
    const updatedOrder = await order.save();

    res.json({
      order: updatedOrder,
      message: 'Payment simulated. Funds are now in Escrow.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm that the meeting is happening
// @route   PUT /api/orders/:id/confirm-meeting
// @access  Private
export const confirmMeeting = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Either buyer or seller can confirm the meeting phase
    const isBuyer = order.buyer.toString() === req.user._id.toString();
    const isSeller = order.seller.toString() === req.user._id.toString();

    if (!isBuyer && !isSeller) {
      res.status(403);
      throw new Error('Not authorized to confirm meeting for this order');
    }

    order.status = 'meeting';
    const updatedOrder = await order.save();

    res.json({
      order: updatedOrder,
      message: 'Meeting phase initiated.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete the order (Release funds)
// @route   PUT /api/orders/:id/complete
// @access  Private
export const completeOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Only the buyer should ideally release the funds after inspection
    if (order.buyer.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the buyer can release the funds and complete the order');
    }

    if (order.status !== 'meeting' && order.status !== 'escrow') {
      res.status(400);
      throw new Error('Order must be in escrow or meeting phase to complete');
    }

    order.status = 'completed';
    const updatedOrder = await order.save();

    res.json({
      order: updatedOrder,
      message: 'Transaction completed. Funds "released" to seller.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get order details
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('product', 'title price images')
      .populate('buyer', 'name email profilePicture')
      .populate('seller', 'name email profilePicture');

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all my orders
// @route   GET /api/orders
// @access  Private
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }],
    })
      .populate('product', 'title price images')
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    next(error);
  }
};
