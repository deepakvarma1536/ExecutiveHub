import { Router } from 'express';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import PostClassQuiz from '../models/PostClassQuiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import { authMiddleware, authOptional } from '../middleware/authMiddleware.js';
import Attendance from '../models/Attendance.js';
import { requireHost } from '../middleware/requireHost.js';

const router = Router();

function generateJoinCode(len = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function uniqueJoinCode() {
  let code;
  let taken = true;
  while (taken) {
    code = generateJoinCode();
    taken = await Session.exists({ joinCode: code });
  }
  return code;
}

// GET /api/sessions/join/:joinCode — public, no auth
router.get('/join/:joinCode', async (req, res) => {
  try {
    const session = await Session.findOne({ joinCode: req.params.joinCode.toUpperCase() });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sessions — create session
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, topic, notes, type } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });
    const joinCode = await uniqueJoinCode();
    const session = await Session.create({
      title, hostId: req.user.id, joinCode, topic, notes,
      type: type === 'poll' ? 'poll' : 'quiz',
    });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sessions — list current user's sessions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sessions = await Session.find({ hostId: req.user.id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sessions/:id — session with its questions
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    const questions = await Question.find({ sessionId: req.params.id }).sort({ position: 1 });
    res.json({ ...session.toObject(), questions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/sessions/:id — update topic/notes (host only)
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;
    const { topic, notes } = req.body;
    if (topic !== undefined) session.topic = topic;
    if (notes !== undefined) session.notes = notes;
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/sessions/:id/end — end session (host only)
router.patch('/:id/end', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;
    const quiz = await PostClassQuiz.findOne({ sessionId: req.params.id }).select('_id');
    if (!quiz) {
      return res.status(400).json({ message: 'No quiz found for this session. Create a quiz before launching.' });
    }

    session.isLive = false;
    session.endedAt = new Date();
    await session.save();
    res.json(session);

    req.io.to(req.params.id).emit('quiz-ready', { quizId: quiz._id.toString() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sessions/:id/questions — add a question
router.post('/:id/questions', authMiddleware, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    const { type, prompt, options, position } = req.body;
    const question = await Question.create({
      sessionId: req.params.id,
      type,
      prompt,
      options,
      position,
    });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sessions/:id/quiz-results — host only
// Returns persisted attempt data shaped for the dashboard:
//   leaderboard  : [{ playerName, totalScore }] sorted desc
//   questionStats: [{ questionId, prompt, correctCount, totalCount, pct }]
//   averageScore : number
//   quiz         : { _id, questions[] } (for labelling charts without a second fetch)
router.get('/:id/quiz-results', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    // Fetch quiz so we can return question prompts alongside stats.
    const quiz = await PostClassQuiz.findOne({ sessionId: req.params.id }).select('_id questions');
    if (!quiz) return res.status(404).json({ message: 'No quiz found for this session' });

    const attempts = await QuizAttempt.find({ sessionId: req.params.id }).lean();

    // ── Leaderboard ───────────────────────────────────────────
    const leaderboard = attempts
      .map((a) => ({ userId: a.userId, playerName: a.playerName, totalScore: a.totalScore }))
      .sort((a, b) => b.totalScore - a.totalScore);

    // ── Per-question accuracy ─────────────────────────────────
    // Build a map: questionId → { correct, total }
    const qMap = {};
    for (const q of quiz.questions) {
      qMap[q._id.toString()] = { questionId: q._id.toString(), prompt: q.prompt, correct: 0, total: 0 };
    }
    for (const attempt of attempts) {
      for (const a of attempt.answers) {
        const key = a.questionId.toString();
        if (qMap[key]) {
          qMap[key].total += 1;
          if (a.correct) qMap[key].correct += 1;
        }
      }
    }
    const questionStats = Object.values(qMap).map((s) => ({
      ...s,
      pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));

    // ── Overall average ───────────────────────────────────────
    const averageScore =
      attempts.length > 0
        ? Math.round(attempts.reduce((sum, a) => sum + a.totalScore, 0) / attempts.length)
        : 0;

    res.json({
      quiz: { _id: quiz._id, questions: quiz.questions },
      leaderboard,
      questionStats,
      averageScore,
      attemptCount: attempts.length,
      sessionEnded: !!session.endedAt,
    });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid session id' });
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sessions/:id/attend — record attendance (optional auth)
router.post('/:id/attend', authOptional, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).select('_id');
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const payload = {
      sessionId: session._id,
      userId: req.user?.id,
      playerName: req.body.playerName || req.user?.name,
      email: req.body.email || req.user?.email,
      meta: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      },
    };

    // Dedupe: avoid duplicate attendance records for same user/session
    if (payload.userId) {
      const exists = await Attendance.findOne({ sessionId: session._id, userId: payload.userId });
      if (exists) return res.status(200).json(exists);
    } else if (payload.playerName) {
      const exists = await Attendance.findOne({
        sessionId: session._id,
        playerName: payload.playerName,
        userId: null,
      });
      if (exists) return res.status(200).json(exists);
    }

    const rec = await Attendance.create(payload);
    res.status(201).json(rec);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid session id' });
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sessions/:id/duplicate — duplicate a session (host only)
router.post('/:id/duplicate', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    const joinCode = await uniqueJoinCode();
    
    // 1. Duplicate Session
    const newSession = await Session.create({
      title: `${session.title} (Copy)`,
      hostId: req.user.id,
      joinCode,
      topic: session.topic,
      notes: session.notes,
      type: session.type,
      isLive: false,
      endedAt: null,
    });

    // 2. Duplicate specific contents based on type
    if (session.type === 'quiz' || !session.type) {
      const quiz = await PostClassQuiz.findOne({ sessionId: session._id }).lean();
      if (quiz) {
        const questions = quiz.questions.map(q => {
          const newQ = { ...q };
          delete newQ._id;
          return newQ;
        });
        await PostClassQuiz.create({
          sessionId: newSession._id,
          questions,
          source: quiz.source
        });
      }
    } else if (session.type === 'poll') {
      const questions = await Question.find({ sessionId: session._id }).lean();
      if (questions.length > 0) {
        const newQuestions = questions.map(q => {
          const newQ = { ...q, sessionId: newSession._id };
          delete newQ._id;
          if (newQ.options) {
            newQ.options = newQ.options.map(o => {
              const newO = { ...o, votes: 0 };
              delete newO._id;
              return newO;
            });
          }
          return newQ;
        });
        await Question.insertMany(newQuestions);
      }
    }

    res.status(201).json(newSession);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid session id' });
    res.status(500).json({ message: err.message });
  }
});

export default router;
