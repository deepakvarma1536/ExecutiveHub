import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ 
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true 
}));
app.use(cookieParser());

// Set security HTTP headers (CSP disabled to not break Vite frontend static serving)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting (General API limit)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api', limiter);

app.use(express.json());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Attach io to every request so route handlers can emit events
app.use((req, _res, next) => {
  req.io = io;
  next();
});

import authRoutes from './src/routes/auth.js';
import sessionRoutes from './src/routes/sessions.js';
import quizRoutes from './src/routes/quiz.js';
import attemptRoutes from './src/routes/attempts.js';
import { activeProvider } from './src/services/aiQuizService.js';
import pollRoutes from './src/routes/polls.js';
import analyticsRoutes from './src/routes/analytics.js';
import performanceRoutes from './src/routes/performance.js';
import { errorHandler } from './src/middleware/errorHandler.js';

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/sessions', quizRoutes);
app.use('/api/quiz', attemptRoutes);
app.use('/api/sessions', pollRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/performance', performanceRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', aiProvider: activeProvider(), timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
io.use((socket, next) => {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) {
      return next(); // allow guests
    }
    const parsedCookies = cookie.parse(rawCookie);
    const token = parsedCookies.auth_token;
    if (token) {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
    }
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}, User: ${socket.user?.id || 'Guest'}`);

  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`${socket.id} joined session ${sessionId}`);
  });

  // Host advances to next question — broadcast to all players in the room
  socket.on('quiz-host-next', ({ sessionId, questionIndex }) => {
    socket.to(sessionId).emit('quiz-question-start', { questionIndex });
  });

  // Player signals they finished seeing a result and are ready for the next question
  socket.on('quiz-player-ready', ({ sessionId, playerName }) => {
    socket.to(sessionId).emit('quiz-player-ready', { playerName });
  });

  // Player signals they've entered the quiz waiting room
  socket.on('quiz-player-joined', ({ sessionId, playerName }) => {
    socket.to(sessionId).emit('quiz-player-joined', { playerName });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5002;
const MONGO_OPTS = { serverSelectionTimeoutMS: 10_000, socketTimeoutMS: 45_000 };
let serverStarted = false;
let isReconnecting = false;

async function connectWithRetry(attempt = 1) {
  if (isReconnecting && attempt === 1) return; // another loop already running
  isReconnecting = true;
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, MONGO_OPTS);
    console.log('MongoDB connected');
    isReconnecting = false;
    if (!serverStarted) {
      serverStarted = true;
      httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    }
  } catch (err) {
    const delay = Math.min(5000 * attempt, 30_000);
    console.warn(`MongoDB connection failed (attempt ${attempt}) — retrying in ${delay / 1000}s`);
    setTimeout(() => connectWithRetry(attempt + 1), delay);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected — reconnecting…');
  connectWithRetry();
});

connectWithRetry();
