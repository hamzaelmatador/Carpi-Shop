import express from 'express';
import cors from 'cors';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import usersRoutes from './routes/users.router.js';
import creditRoutes from './routes/creditRoutes.js';
import toolRoutes from './routes/toolRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Default Route
app.get('/', (req, res) => {
  res.send('Carpi Shop API is running...');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/tools', toolRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

export default app;
