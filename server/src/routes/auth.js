import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
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

const googleSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  role: z.enum(['admin', 'presenter', 'student']).optional(),
  guestId: z.string().min(1).max(128).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
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

async function sendOtpEmail(user, otp) {
  console.log(`\n\n[VERIFICATION OTP for ${user.email}]: ${otp}\n\n`);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER || 'ethereal_user',
      pass: process.env.SMTP_PASS || 'ethereal_pass'
    }
  });

  try {
    if (process.env.SMTP_HOST) {
      await transporter.sendMail({
        from: '"ExecutiveHub" <noreply@executivehub.com>',
        to: user.email,
        subject: 'Verify your email address',
        text: `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.`
      });
    }
  } catch (err) {
    console.error('Email could not be sent', err);
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
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const user = await User.create({ 
      name, 
      email, 
      passwordHash, 
      ...(role && { role }),
      isVerified: false,
      verificationOtp: await bcrypt.hash(otp, 12),
      verificationOtpExpires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    
    await claimGuestAttemptsSafely(user, guestId);
    await sendOtpEmail(user, otp);

    res.status(201).json({ message: 'Registration successful. Please verify your email.', email: user.email, requiresVerification: true });
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

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email address to continue.', requiresVerification: true, email: user.email });
    }

    const token = signToken(user._id);
    await claimGuestAttemptsSafely(user, guestId);
    
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// POST /api/auth/google
router.post('/google', validate(googleSchema), async (req, res) => {
  try {
    const { token, role, guestId } = req.body;
    
    // Fetch user info from Google using the access_token
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
    if (!response.ok) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }
    const payload = await response.json();
    
    const { email, name } = payload;
    if (!email) return res.status(400).json({ message: 'No email found in Google profile' });

    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Create a new user with a random password if they don't exist
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      user = await User.create({ 
        name: name || 'Google User', 
        email: email.toLowerCase(), 
        passwordHash, 
        ...(role && { role: role === 'admin' ? 'student' : role }),
        isVerified: true
      });
    } else if (!user.isVerified) {
      user.isVerified = true;
      user.verificationOtp = undefined;
      user.verificationOtpExpires = undefined;
      await user.save();
    }

    await claimGuestAttemptsSafely(user, guestId);
    
    const jwtToken = signToken(user._id);
    res.cookie('auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    res.json({ token: jwtToken, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Google authentication failed', error: err.message });
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

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // For production, configure SMTP. For development, we log it.
    console.log(`\n\n[PASSWORD RESET URL for ${email}]:\n${resetUrl}\n\n`);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: process.env.SMTP_PORT || 587,
      auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass'
      }
    });

    try {
      if (process.env.SMTP_HOST) {
        await transporter.sendMail({
          from: '"ExecutiveHub" <noreply@executivehub.com>',
          to: user.email,
          subject: 'Password Reset Request',
          text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link, or paste this into your browser to complete the process within one hour of receiving it:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`
        });
      }
    } catch (err) {
      console.error('Email could not be sent', err);
    }

    res.json({ message: 'A password reset link has been sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: 'Error processing forgot password', error: err.message });
  }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', validate(resetPasswordSchema), async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    user.passwordHash = await bcrypt.hash(req.body.password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Your password has been successfully reset. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Error resetting password', error: err.message });
  }
});

export default router;

// POST /api/auth/verify-email
router.post('/verify-email', validate(verifyOtpSchema), async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email, isVerified: false });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid request or email already verified.' });
    }
    if (!user.verificationOtpExpires || user.verificationOtpExpires < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    
    const valid = await bcrypt.compare(otp, user.verificationOtp);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    user.isVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpires = undefined;
    await user.save();

    const token = signToken(user._id);
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    res.json({ message: 'Email verified successfully.', token, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed', error: err.message });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', validate(resendOtpSchema), async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email, isVerified: false });
    if (!user) {
      return res.status(400).json({ message: 'Invalid request or email already verified.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationOtp = await bcrypt.hash(otp, 12);
    user.verificationOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    
    await sendOtpEmail(user, otp);
    res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to resend OTP', error: err.message });
  }
});
