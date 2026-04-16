import Order from '../models/Order.js';
import Notification from '../models/Notification.js';

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
    // Generate a 6-digit secret code
    const secretCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    order.status = 'escrow';
    order.secretCode = secretCode;
    const updatedOrder = await order.save();

    // Notify the seller that payment is in escrow
    await Notification.create({
      recipient: order.seller,
      sender: req.user._id,
      type: 'order_update',
      title: 'Payment Received (Escrow)',
      message: 'The buyer has paid. Funds are in escrow. You can now arrange the meeting.',
      link: `/chat/${order._id}`,
      relatedId: order._id
    });

    res.json({
      order: updatedOrder,
      message: 'Payment simulated. Funds are now in Escrow. Share your secret code with the seller during the meeting.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete the deal and release funds from escrow (Handshake)
// @route   PUT /api/orders/:id/complete
// @access  Private (Seller only)
export const completeDeal = async (req, res, next) => {
  try {
    const { secretCode } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // 1. Only the seller can complete the deal using the code
    if (order.seller.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Only the seller can complete the deal with the code');
    }

    if (order.status !== 'escrow' && order.status !== 'meeting') {
      res.status(400);
      throw new Error('Order must be in escrow or meeting status to complete');
    }

    // 2. Verify the secret code
    if (order.secretCode !== secretCode) {
      res.status(400);
      throw new Error('Invalid secret code');
    }

    // 3. Move funds to seller (Simulated)
    order.status = 'completed';
    const updatedOrder = await order.save();

    // Notify the buyer that the deal is completed
    await Notification.create({
      recipient: order.buyer,
      sender: req.user._id,
      type: 'order_update',
      title: 'Deal Completed! 🤝',
      message: 'The seller has verified the code. The transaction is complete.',
      link: `/deals`,
      relatedId: order._id
    });
    
    res.json({
      order: updatedOrder,
      message: 'Deal completed successfully. Funds released!',
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

    // Notify the other party
    const recipientId = isBuyer ? order.seller : order.buyer;
    await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      type: 'order_update',
      title: 'Meeting Confirmed',
      message: `${req.user.name} confirmed they are ready for the meeting.`,
      link: `/chat/${order._id}`,
      relatedId: order._id
    });

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

    // Notify the seller
    await Notification.create({
      recipient: order.seller,
      sender: req.user._id,
      type: 'order_update',
      title: 'Funds Released! 💰',
      message: 'The buyer has released the funds. Transaction completed.',
      link: `/deals`,
      relatedId: order._id
    });

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
