import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './src/db';
import apiRoutes from './src/server/routes/api';
import { setupSocketHandlers } from './src/server/socket';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://yourdomain.com' 
    : 'http://localhost:5173',
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize Socket.io for real-time communication
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://yourdomain.com' 
      : 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize database
initializeDatabase();

// Set up socket handlers
setupSocketHandlers(io);

// API Routes
app.use('/api', apiRoutes);

// In production, serve the frontend build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app; 