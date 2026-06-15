import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Attach io to every request so route handlers can emit events
app.use((req, _res, next) => {
  req.io = io;
  next();
});

import authRoutes from './src/routes/auth.js';
import sessionRoutes from './src/routes/sessions.js';
// import pollRoutes from './src/routes/polls.js';
// import qaRoutes from './src/routes/qa.js';
// import analyticsRoutes from './src/routes/analytics.js';

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
// app.use('/api/polls', pollRoutes);
// app.use('/api/qa', qaRoutes);
// app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`${socket.id} joined session ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5002;
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
