import User from '../models/User.js';
import CreditTransaction from '../models/CreditTransaction.js';
import Notification from '../models/Notification.js';

// @desc    Add credits to a user balance
// @route   POST /api/credits/admin/add
// @access  Private/Admin
export const addCredits = async (req, res, next) => {
  try {
    const { userId, amount, description, type = 'admin' } = req.body;

    if (!userId || !amount || amount <= 0) {
      res.status(400);
      throw new Error('Please provide valid userId and positive amount');
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    // Atomic update
    user.creditBalance += Number(amount);
    await user.save();

    // Log transaction
    const transaction = await CreditTransaction.create({
      userId,
      amount: Number(amount),
      type,
      description: description || 'Credits added by admin',
    });

    // Notify user
    await Notification.create({
      recipient: userId,
      type: 'credit_update',
      title: 'Credits Added! 💰',
      message: `Your balance has been topped up with ${amount} credits.`,
      link: '/profile'
    });

    res.status(200).json({
      message: 'Credits added successfully',
      newBalance: user.creditBalance,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deduct credits from a user balance
// @route   POST /api/credits/admin/deduct
// @access  Private/Admin
export const deductCredits = async (req, res, next) => {
  try {
    const { userId, amount, description, type = 'admin' } = req.body;

    if (!userId || !amount || amount <= 0) {
      res.status(400);
      throw new Error('Please provide valid userId and positive amount');
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.creditBalance < amount) {
      res.status(400);
      throw new Error('Insufficient credits');
    }

    // Atomic update
    user.creditBalance -= Number(amount);
    await user.save();

    // Log transaction (negative amount)
    const transaction = await CreditTransaction.create({
      userId,
      amount: -Number(amount),
      type,
      description: description || 'Credits deducted by admin',
    });

    // Notify user
    await Notification.create({
      recipient: userId,
      type: 'credit_update',
      title: 'Credits Deducted',
      message: `${amount} credits have been deducted from your balance.`,
      link: '/profile'
    });

    res.status(200).json({
      message: 'Credits deducted successfully',
      newBalance: user.creditBalance,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user credit balance
// @route   GET /api/credits/user/:id
// @access  Private
export const getUserCredits = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('creditBalance name');
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    res.json({ balance: user.creditBalance, userId: user._id });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user credit history (transactions)
// @route   GET /api/credits/transactions/:id
// @access  Private
export const getCreditTransactions = async (req, res, next) => {
  try {
    const transactions = await CreditTransaction.find({ userId: req.params.id })
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};
