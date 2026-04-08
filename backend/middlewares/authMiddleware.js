import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Product from '../models/Product.js';

// Middleware to protect routes and verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      return next(new Error('Not authorized, token failed'));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token'));
  }
};

// Middleware to check if the current user owns the product
const checkProductOwnership = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    // Check if the product's user matches the logged in user OR if the user is an admin
    if (product.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('User is not authorized to modify this product'));
    }

    // Attach product to req so we don't have to fetch it again in the controller
    req.product = product;
    next();
  } catch (error) {
    next(error);
  }
};

export { protect, checkProductOwnership };
