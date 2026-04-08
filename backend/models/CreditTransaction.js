import mongoose from 'mongoose';

const creditTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['admin', 'purchase', 'usage'],
      default: 'admin',
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const CreditTransaction = mongoose.model('CreditTransaction', creditTransactionSchema);
export default CreditTransaction;
