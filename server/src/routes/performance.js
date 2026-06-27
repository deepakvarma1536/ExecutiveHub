import { Router } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/authMiddleware.js';
import PostClassQuiz from '../models/PostClassQuiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Session from '../models/Session.js';
import User from '../models/User.js';

const router = Router();

const round = (value, places = 2) => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) return null;
  const index = (sortedValues.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const fraction = index - lower;
  return sortedValues[lower + 1] === undefined
    ? sortedValues[lower]
    : sortedValues[lower] + fraction * (sortedValues[lower + 1] - sortedValues[lower]);
}

function summarizeAttempt(attempt) {
  const answered = attempt.answers.length;
  const correct = attempt.answers.filter((answer) => answer.correct).length;
  const responseTimes = attempt.answers
    .map((answer) => answer.responseTimeMs)
    .filter(Number.isFinite);

  return {
    id: attempt._id,
    quizId: attempt.quizId,
    sessionId: attempt.sessionId,
    playerName: attempt.playerName,
    totalScore: attempt.totalScore,
    completedAt: attempt.completedAt,
    answeredQuestions: answered,
    correctAnswers: correct,
    accuracyPercent: answered ? round((correct / answered) * 100) : 0,
    averageResponseTimeMs: responseTimes.length
      ? round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
      : null,
  };
}

function aggregateMetrics(attempts) {
  const scores = attempts.map((attempt) => attempt.totalScore);
  const answers = attempts.flatMap((attempt) => attempt.answers);
  const responseTimes = answers
    .map((answer) => answer.responseTimeMs)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const correctAnswers = answers.filter((answer) => answer.correct).length;
  const averageScore = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;
  const variance = scores.length
    ? scores.reduce((sum, score) => sum + ((score - averageScore) ** 2), 0) / scores.length
    : 0;
  const scoreStdDev = Math.sqrt(variance);
  const averageResponseTimeMs = responseTimes.length
    ? responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length
    : null;
  const accuracyPercent = answers.length ? (correctAnswers / answers.length) * 100 : 0;
  const responseTimeDistribution = [
    { label: '< 2s', min: 0, max: 2000 },
    { label: '2–4s', min: 2000, max: 4000 },
    { label: '4–6s', min: 4000, max: 6000 },
    { label: '6–8s', min: 6000, max: 8000 },
    { label: '8s+', min: 8000, max: Infinity },
  ].map(({ label, min, max }) => ({
    label,
    count: responseTimes.filter((value) => value >= min && value < max).length,
  }));

  return {
    attempts: attempts.length,
    bestScore: scores.length ? Math.max(...scores) : 0,
    averageScore: round(averageScore),
    accuracyPercent: round(accuracyPercent),
    averageResponseTimeMs: averageResponseTimeMs === null ? null : round(averageResponseTimeMs),
    medianResponseTimeMs: responseTimes.length ? round(percentile(responseTimes, 0.5)) : null,
    responseTimeP75Ms: responseTimes.length ? round(percentile(responseTimes, 0.75)) : null,
    responseTimeP90Ms: responseTimes.length ? round(percentile(responseTimes, 0.9)) : null,
    scoreStdDev: round(scoreStdDev),
    scoreCoefficientOfVariation: averageScore ? round(scoreStdDev / averageScore) : null,
    efficiency: averageResponseTimeMs
      ? round(accuracyPercent / (averageResponseTimeMs / 1000))
      : null,
    answeredQuestions: answers.length,
    correctAnswers,
    responseTimeDistribution,
  };
}

async function accessFor(req, userId) {
  if (!mongoose.isValidObjectId(userId)) return { error: 400, message: 'Invalid user id' };

  const targetUser = await User.findById(userId).select('name email role').lean();
  if (!targetUser) return { error: 404, message: 'Student not found' };

  if (req.user.id === userId) return { targetUser, query: { userId }, scope: 'self' };

  const viewer = await User.findById(req.user.id).select('role').lean();
  if (!viewer) return { error: 401, message: 'User not found' };
  if (viewer.role === 'admin') return { targetUser, query: { userId }, scope: 'admin' };

  const sessionIds = await Session.find({ hostId: req.user.id }).distinct('_id');
  const ownsStudentAttempt = await QuizAttempt.exists({ userId, sessionId: { $in: sessionIds } });
  if (!ownsStudentAttempt) return { error: 403, message: 'Forbidden' };

  return {
    targetUser,
    query: { userId },
    scope: 'host-sessions',
  };
}

async function sendProfile(req, res, userId) {
  const access = await accessFor(req, userId);
  if (access.error) return res.status(access.error).json({ message: access.message });

  const attempts = await QuizAttempt.find(access.query).sort({ completedAt: -1 }).lean();
  return res.json({
    student: access.targetUser,
    scope: access.scope,
    metrics: aggregateMetrics(attempts),
    recentAttempts: attempts.slice(0, 10).map(summarizeAttempt),
  });
}

// GET /api/performance/me — authenticated user's complete performance profile.
router.get('/me', authMiddleware, async (req, res) => {
  try {
    return await sendProfile(req, res, req.user.id);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/performance/:userId — self, admin, or a host for their own sessions.
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    return await sendProfile(req, res, req.params.userId);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/performance/:userId/attempts?page=1&limit=20
router.get('/:userId/attempts', authMiddleware, async (req, res) => {
  try {
    const access = await accessFor(req, req.params.userId);
    if (access.error) return res.status(access.error).json({ message: access.message });

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const [attempts, total] = await Promise.all([
      QuizAttempt.find(access.query)
        .sort({ completedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      QuizAttempt.countDocuments(access.query),
    ]);

    const quizIds = [...new Set(attempts.map((attempt) => String(attempt.quizId)))];
    const quizzes = await PostClassQuiz.find({ _id: { $in: quizIds } })
      .select('questions sessionId')
      .lean();
    const quizMap = new Map(quizzes.map((quiz) => [String(quiz._id), quiz]));

    const sessionIds = [...new Set(attempts.map((attempt) => String(attempt.sessionId)))];
    const sessions = await Session.find({ _id: { $in: sessionIds } }).select('title').lean();
    const sessionMap = new Map(sessions.map((session) => [String(session._id), session.title]));

    const items = attempts.map((attempt) => {
      const quiz = quizMap.get(String(attempt.quizId));
      const questionMap = new Map(
        (quiz?.questions || []).map((question) => [String(question._id), question])
      );
      return {
        ...summarizeAttempt(attempt),
        sessionTitle: sessionMap.get(String(attempt.sessionId)) || 'Quiz session',
        answers: attempt.answers.map((answer) => {
          const question = questionMap.get(String(answer.questionId));
          return {
            ...answer,
            prompt: question?.prompt || 'Question unavailable',
            options: question?.options || [],
            correctIndex: question?.correctIndex,
          };
        }),
      };
    });

    return res.json({
      student: access.targetUser,
      scope: access.scope,
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
