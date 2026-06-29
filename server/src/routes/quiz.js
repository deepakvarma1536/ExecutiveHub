import { Router } from 'express';
import PostClassQuiz from '../models/PostClassQuiz.js';
import { generateQuiz } from '../services/aiQuizService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireHost } from '../middleware/requireHost.js';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

const router = Router();

// POST /api/sessions/:id/generate-quiz
// Calls Ollama, replaces any existing quiz with freshly generated AI questions.
router.post('/:id/generate-quiz', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    if (!session.topic) {
      return res.status(400).json({
        message: 'Session has no topic — set a topic before generating a quiz',
      });
    }

    const questionCount = Number.isInteger(req.body.questionCount)
      ? req.body.questionCount
      : 5;

    let questions;
    try {
      questions = await generateQuiz(session.topic, session.notes ?? null, questionCount);
    } catch (err) {
      return res.status(502).json({ message: err.message });
    }

    const quiz = await PostClassQuiz.findOneAndUpdate(
      { sessionId: session._id },
      { questions, source: 'ai', generatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sessions/:id/generate-quiz/pdf
// Parses a PDF file and generates AI questions based on the content.
router.post('/:id/generate-quiz/pdf', authMiddleware, upload.single('pdf'), async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const questionCount = Number.isInteger(Number(req.body.questionCount))
      ? Number(req.body.questionCount)
      : 5;

    let pdfData;
    try {
      pdfData = await pdfParse(req.file.buffer);
    } catch (err) {
      return res.status(400).json({ message: 'Failed to parse PDF' });
    }

    const pdfText = pdfData.text;
    const topic = session.topic || 'PDF Content';
    
    // Combine existing notes with PDF text
    const notes = session.notes 
      ? session.notes + '\n\nExtracted PDF Content:\n' + pdfText
      : 'Extracted PDF Content:\n' + pdfText;

    let questions;
    try {
      questions = await generateQuiz(topic, notes, questionCount);
    } catch (err) {
      return res.status(502).json({ message: err.message });
    }

    const quiz = await PostClassQuiz.findOneAndUpdate(
      { sessionId: session._id },
      { questions, source: 'ai', generatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/sessions/:id/quiz/manual
// Appends host-supplied questions to the quiz. Creates the quiz if none exists.
// source becomes 'mixed' when AI questions are already present.
router.post('/:id/quiz/manual', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    const { questions: incoming } = req.body;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return res.status(400).json({ message: 'questions must be a non-empty array' });
    }

    const existing = await PostClassQuiz.findOne({ sessionId: session._id });

    if (!existing) {
      const quiz = await PostClassQuiz.create({
        sessionId: session._id,
        questions: incoming,
        source: 'manual',
        generatedAt: new Date(),
      });
      return res.status(201).json(quiz);
    }

    existing.questions.push(...incoming);
    // If AI questions are already part of the quiz, the mix makes it 'mixed'.
    if (existing.source === 'ai' || existing.source === 'mixed') {
      existing.source = 'mixed';
    }
    await existing.save();
    res.json(existing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/sessions/:id/quiz/questions/:qId
// Patch any subset of fields on a single quiz question.
router.put('/:id/quiz/questions/:qId', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    const quiz = await PostClassQuiz.findOne({ sessionId: session._id });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found for this session' });

    const question = quiz.questions.id(req.params.qId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    const { prompt, options, correctIndex, explanation, style, points } = req.body;
    if (prompt !== undefined) question.prompt = prompt;
    if (options !== undefined) question.options = options;
    if (correctIndex !== undefined) question.correctIndex = correctIndex;
    if (explanation !== undefined) question.explanation = explanation;
    if (style !== undefined) question.style = style;
    if (points !== undefined) question.points = points;

    await quiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/sessions/:id/quiz/questions/:qId
router.delete('/:id/quiz/questions/:qId', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    const quiz = await PostClassQuiz.findOne({ sessionId: session._id });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found for this session' });

    const question = quiz.questions.id(req.params.qId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    quiz.questions.pull({ _id: req.params.qId });
    await quiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sessions/:id/quiz  (host only — full data for editing)
router.get('/:id/quiz', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    const quiz = await PostClassQuiz.findOne({ sessionId: session._id });
    if (!quiz) return res.status(404).json({ message: 'No quiz found for this session' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/sessions/:id/quiz/public  (no auth — anyone with a join code can fetch)
// Accepted tradeoff: correctIndex and points are included for instant client-side feedback.
router.get('/:id/quiz/public', async (req, res) => {
  try {
    const quiz = await PostClassQuiz.findOne({ sessionId: req.params.id });
    if (!quiz) return res.status(404).json({ message: 'No quiz found for this session' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
