import User from '../models/User.js';

// @desc    Get all users
// @route   GET /api/users
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) res.json(user);
    else { res.status(404); throw new Error('User not found'); }
  } catch (error) { next(error); }
};

// @desc    Update user profile & security
// @route   PUT /api/users/:id
export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('+password');

    if (user) {
      // 1. Basic Info
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.profilePicture = req.body.profilePicture || user.profilePicture;
      
      // Admin only can change roles
      if (req.user.role === 'admin' && req.body.role) {
        user.role = req.body.role;
      }

      // 2. Password Change (Security)
      if (req.body.newPassword) {
        // If changing password, we must verify the CURRENT one first for security
        if (!req.body.currentPassword) {
          res.status(400);
          throw new Error('Please provide current password to authorize changes');
        }

        const isMatch = await user.matchPassword(req.body.currentPassword);
        if (!isMatch) {
          res.status(401);
          throw new Error('Current password is incorrect');
        }

        user.password = req.body.newPassword;
      }

      const updatedUser = await user.save();
      
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else { res.status(404); throw new Error('User not found'); }
  } catch (error) { next(error); }
};
