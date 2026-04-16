import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import Message from './models/Message.js';
import Order from './models/Order.js';
import Notification from './models/Notification.js';

const PORT = process.env.PORT || 5000;

// 1. Create HTTP Server
const server = http.createServer(app);

// 2. Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"], // Frontend URLs
    methods: ["GET", "POST"]
  }
});

// 3. Socket.io Logic
io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);

  // Join a specific order room
  socket.on('joinOrder', (orderId) => {
    socket.join(orderId);
    console.log(`User ${socket.id} joined order room: ${orderId}`);
  });

  // Handle sending messages
  socket.on('sendMessage', async (data) => {
    const { order, sender, content, type, location } = data;

    try {
      // Save to Database first (Persistence)
      const newMessage = await Message.create({
        order,
        sender,
        content,
        type: type || 'text',
        location: location || null
      });

      // Broadcast to everyone in the room (including the sender for confirmation)
      io.to(order).emit('receiveMessage', newMessage);

      // Create Notification for the other person in the order
      const orderData = await Order.findById(order);
      if (orderData) {
        const recipientId = orderData.buyer.toString() === sender.toString() ? orderData.seller : orderData.buyer;
        await Notification.create({
          recipient: recipientId,
          sender: sender,
          type: 'message_new',
          title: 'New Message',
          message: content.length > 50 ? content.substring(0, 50) + '...' : content,
          link: `/chat/${order}`,
          relatedId: newMessage._id
        });
      }
      
    } catch (error) {
      console.error('Socket Error (sendMessage):', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('User Disconnected:', socket.id);
  });
});

// 4. Connect to MongoDB and start the server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Database connection failed:', error.message);
  process.exit(1);
});
