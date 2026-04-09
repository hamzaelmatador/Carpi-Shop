import Message from '../models/Message.js';
import Order from '../models/Order.js';

// @desc    Get all chat messages for a specific order
// @route   GET /api/chats/:orderId
// @access  Private
export const getChatMessages = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;

    // 1. Verify the order exists and the user is authorized (Buyer or Seller)
    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (order.buyer.toString() !== req.user._id.toString() && 
        order.seller.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to access this chat');
    }

    // 2. Fetch messages
    const messages = await Message.find({ order: orderId })
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: 1 }); // Sort by time (oldest first)

    res.json(messages);
  } catch (error) {
    next(error);
  }
};
