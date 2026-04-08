import Product from '../models/Product.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import axios from 'axios';
import FormData from 'form-data';

// Helper: Upload buffer directly to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'carpishop_products' },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// @desc    Create a product with optional AI background removal
export const createProduct = async (req, res, next) => {
  try {
    const { title, description, price, isSold, quantity, category, treatedImages } = req.body;

    if (!title || !description || price === undefined || !category) {
      res.status(400);
      throw new Error('Please provide title, description, price and category');
    }

    let processedTreatedFlags = [];
    if (treatedImages) {
      try {
        processedTreatedFlags = typeof treatedImages === 'string' ? JSON.parse(treatedImages) : treatedImages;
      } catch (err) {
        console.warn("Could not parse treatedImages flags:", err);
      }
    }

    let productImages = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file, index) => {
        let bufferToUpload = file.buffer;

        if (processedTreatedFlags[index]) {
          console.log(`[AI] Calling remove.bg API for image ${index}...`);
          try {
            const formData = new FormData();
            formData.append('size', 'auto');
            formData.append('format', 'png');
            formData.append('bg_color', ''); 
            formData.append('image_file', file.buffer, { filename: file.originalname });

            const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
              headers: {
                ...formData.getHeaders(),
                'X-Api-Key': process.env.REMOVE_BG_API_KEY,
              },
              responseType: 'arraybuffer',
              timeout: 40000 
            });

            bufferToUpload = Buffer.from(response.data);
            console.log(`[AI] SUCCESS: Background removed for image ${index}`);
          } catch (apiError) {
            console.error(`[AI] FAILED for image ${index}`);
            processedTreatedFlags[index] = false; 
          }
        }

        return uploadToCloudinary(bufferToUpload);
      });

      productImages = await Promise.all(uploadPromises);
    }

    const product = new Product({
      title,
      description,
      price,
      category,
      quantity: quantity !== undefined ? Number(quantity) : 1,
      images: productImages,
      treatedImages: processedTreatedFlags,
      isSold: isSold === 'true' || isSold === true ? true : false,
      user: req.user._id,
      owner: req.user._id,
    });

    const createdProduct = await product.save();
    await createdProduct.populate('user', 'name email profilePicture');
    res.status(201).json(createdProduct);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all products
export const getProducts = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const limit = parseInt(req.query.limit) || 12;
    const skip = parseInt(req.query.skip) || 0;

    let query = {};
    if (search) query.title = { $regex: search, $options: 'i' };
    if (category && category !== 'All') query.category = category;

    const products = await Product.find(query)
      .populate('user', 'name email profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Product.countDocuments(query);
    res.json({ products, total, limit, skip, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

// @desc    Get single product
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('user', 'name email profilePicture');
    if (product) res.json(product);
    else { res.status(404); throw new Error('Product not found'); }
  } catch (error) { next(error); }
};

// @desc    Update product
export const updateProduct = async (req, res, next) => {
  try {
    const { title, description, price, category, existingImages, existingTreatedFlags, treatedImages } = req.body;
    
    console.log("[DEBUG] Update Request Body:", req.body);

    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    if (product.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Access denied.');
    }

    // 1. Handle Existing Images (the ones the user kept)
    let finalImages = [];
    let finalTreatedFlags = [];
    
    if (existingImages) {
      try {
        const keptImages = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
        const keptFlags = typeof existingTreatedFlags === 'string' ? JSON.parse(existingTreatedFlags) : existingTreatedFlags;
        
        if (Array.isArray(keptImages)) {
          finalImages = [...keptImages];
          finalTreatedFlags = [...keptFlags];
        }
      } catch (err) {
        console.warn("[DEBUG] Error parsing existing images:", err);
      }
    }

    // 2. Handle New Uploads with AI
    if (req.files && req.files.length > 0) {
      console.log("[DEBUG] Processing new files:", req.files.length);
      let newTreatedFlags = [];
      if (treatedImages) {
        try {
          newTreatedFlags = typeof treatedImages === 'string' ? JSON.parse(treatedImages) : treatedImages;
        } catch (err) {}
      }

      const uploadPromises = req.files.map(async (file, index) => {
        let bufferToUpload = file.buffer;

        if (newTreatedFlags[index]) {
          try {
            const formData = new FormData();
            formData.append('size', 'auto');
            formData.append('format', 'png');
            formData.append('bg_color', ''); 
            formData.append('image_file', file.buffer, { filename: file.originalname });

            const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
              headers: {
                ...formData.getHeaders(),
                'X-Api-Key': process.env.REMOVE_BG_API_KEY,
              },
              responseType: 'arraybuffer',
              timeout: 40000 
            });

            bufferToUpload = Buffer.from(response.data);
          } catch (apiError) {
            console.error("[DEBUG] AI Error during update:", apiError.message);
            newTreatedFlags[index] = false;
          }
        }

        const url = await uploadToCloudinary(bufferToUpload);
        return { url, flag: newTreatedFlags[index] };
      });

      const results = await Promise.all(uploadPromises);
      results.forEach(res => {
        finalImages.push(res.url);
        finalTreatedFlags.push(res.flag);
      });
    }

    // Update product fields - ensure we apply updates correctly
    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (category !== undefined) product.category = category;
    
    // Only update images if we actually have some (prevent wiping out)
    if (finalImages.length > 0) {
      product.images = finalImages;
      product.treatedImages = finalTreatedFlags;
    }

    console.log("[DEBUG] Saving Product with images count:", product.images.length);

    const updatedProduct = await product.save();
    await updatedProduct.populate('user', 'name email profilePicture');
    res.json(updatedProduct);
  } catch (error) {
    console.error("[DEBUG] Controller Error:", error);
    next(error);
  }
};

// @desc    Delete product
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      if (product.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403); throw new Error('Access denied.');
      }
      await product.deleteOne();
      res.json({ message: 'Product removed successfully' });
    } else { res.status(404); throw new Error('Product not found'); }
  } catch (error) { next(error); }
};
