import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import QuizAttempt from '../models/QuizAttempt.js';
import StudentPerformance from '../models/StudentPerformance.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// ── Zod schemas ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50).trim(),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'presenter', 'student']).optional(),
  guestId: z.string().min(1).max(128).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  guestId: z.string().min(1).max(128).optional(),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten().fieldErrors });
  }
  req.body = result.data;
  next();
};

const signToken = (userId) =>
  jwt.sign({ id: String(userId) }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

async function claimGuestAttempts(user, guestId) {
  if (!guestId) return;
  const result = await QuizAttempt.updateMany(
    { guestId, userId: null },
    { $set: { userId: user._id } }
  );
  if (result.modifiedCount === 0) return;

  const attempts = await QuizAttempt.find({ userId: user._id }).select('quizId totalScore completedAt').lean();
  const quizMap = new Map();
  for (const attempt of attempts) {
    const key = String(attempt.quizId);
    const stat = quizMap.get(key) || { quizId: attempt.quizId, scores: [], lastAttemptAt: attempt.completedAt };
    stat.scores.push(attempt.totalScore);
    if (attempt.completedAt > stat.lastAttemptAt) stat.lastAttemptAt = attempt.completedAt;
    quizMap.set(key, stat);
  }
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.totalScore, 0);
  await StudentPerformance.findOneAndUpdate(
    { userId: user._id },
    {
      userId: user._id,
      userName: user.name,
      totalAttempts: attempts.length,
      totalScore,
      averageScore: attempts.length ? totalScore / attempts.length : 0,
      quizzesTaken: quizMap.size,
      quizStats: [...quizMap.values()].map((stat) => ({
        quizId: stat.quizId,
        attempts: stat.scores.length,
        bestScore: Math.max(...stat.scores),
        averageScore: stat.scores.reduce((sum, score) => sum + score, 0) / stat.scores.length,
        lastAttemptAt: stat.lastAttemptAt,
      })),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function claimGuestAttemptsSafely(user, guestId) {
  try {
    await claimGuestAttempts(user, guestId);
  } catch (err) {
    console.error('Failed to claim guest quiz attempts:', err);
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, role, guestId } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, ...(role && { role }) });
    await claimGuestAttemptsSafely(user, guestId);

    const token = signToken(user._id);
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.status(201).json({ message: 'Registration successful', user: publicUser(user), token });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password, guestId } = req.body;

    const user = await User.findOne({ email }).select('+passwordHash');
    const valid = user && (await bcrypt.compare(password, user.passwordHash));
    if (!valid) {
      // same message for both cases — avoid email enumeration
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    await claimGuestAttemptsSafely(user, guestId);
    
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user', error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
