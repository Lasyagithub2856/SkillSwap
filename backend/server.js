import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import socketHandler from './socket/socketHandler.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';

// Load Env
dotenv.config();

// Connect Database
connectDB();

const app = express();
const server = http.createServer(app);

// CORS middleware configurations
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// API Route mounts
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/categories', categoryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Skill Swap API server is active' });
});

// Configure Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST']
  }
});

// Attach socket handlers
socketHandler(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in development mode on port ${PORT}`);
});
