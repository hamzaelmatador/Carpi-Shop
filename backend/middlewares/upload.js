import multer from 'multer';
import cloudinary from '../config/cloudinary.js';

// Use memory storage so we can process the buffer in the controller
const storage = multer.memoryStorage();

// Create Multer instance filter for only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Increased to 10MB as server handles it better
  },
});

export default upload;
