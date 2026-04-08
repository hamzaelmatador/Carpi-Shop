import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    offer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    finalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['payment_pending', 'escrow', 'meeting', 'completed', 'disputed', 'refunded'],
      default: 'payment_pending',
    },
    meetingConfirmed: {
      type: Boolean,
      default: false,
    },
    escrowId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
