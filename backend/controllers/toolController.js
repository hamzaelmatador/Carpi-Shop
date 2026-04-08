import axios from 'axios';
import FormData from 'form-data';
import User from '../models/User.js';
import CreditTransaction from '../models/CreditTransaction.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

// Helper: Upload buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'carpishop_tools' },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// @desc    Remove background from an image using remove.bg (costs 1 credit)
// @route   POST /api/tools/remove-background
// @access  Private
export const removeBackground = async (req, res, next) => {
  let creditDeducted = false;
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload an image');
    }

    const user = await User.findById(req.user._id);
    if (!user || user.creditBalance < 1) {
      res.status(400);
      throw new Error('Insufficient credits. You need 1 credit to remove background.');
    }

    // 1. Deduct 1 credit BEFORE processing
    user.creditBalance -= 1;
    await user.save();
    creditDeducted = true;

    // Log transaction
    await CreditTransaction.create({
      userId: user._id,
      amount: -1,
      type: 'usage',
      description: 'Background removal service',
    });

    // 2. Call remove.bg API
    const formData = new FormData();
    formData.append('size', 'auto');
    formData.append('format', 'png');
    formData.append('image_file', req.file.buffer, { filename: req.file.originalname });

    const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
      },
      responseType: 'arraybuffer',
      timeout: 40000 
    });

    // 3. Upload the result to Cloudinary
    const processedUrl = await uploadToCloudinary(Buffer.from(response.data));

    res.status(200).json({
      success: true,
      url: processedUrl,
      remainingCredits: user.creditBalance,
    });

  } catch (error) {
    // 4. Refund if API or Cloudinary fails
    if (creditDeducted) {
      const user = await User.findById(req.user._id);
      user.creditBalance += 1;
      await user.save();
      
      // Log refund transaction
      await CreditTransaction.create({
        userId: user._id,
        amount: 1,
        type: 'admin',
        description: 'Refund for failed background removal',
      });
    }

    console.error('[AI Tool Error]:', error.message);
    res.status(error.status || 500);
    next(new Error(error.message || 'Error processing background removal'));
  }
};
