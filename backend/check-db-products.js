import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import Product from './models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const checkProducts = async () => {
  await connectDB();
  try {
    const products = await Product.find({});
    console.log(`Total products in DB: ${products.length}`);
    products.forEach(p => {
      console.log(`- ${p.title} (Price: ${p.price}, Category: ${p.category}, isSold: ${p.isSold})`);
    });
  } catch (error) {
    console.error('Error checking DB:', error.message);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
};

checkProducts();
