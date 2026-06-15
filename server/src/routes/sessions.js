import { Router } from 'express';
import Session from '../models/Session.js';
import Question from '../models/Question.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

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
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });
    const joinCode = await uniqueJoinCode();
    const session = await Session.create({ title, hostId: req.user.id, joinCode });
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

export default router;
