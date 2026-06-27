import { Router } from 'express';
import PostClassQuiz from '../models/PostClassQuiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import StudentPerformance from '../models/StudentPerformance.js';
import { authOptional } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/quiz/:quizId/submit
// Called by the client's SummaryScreen once the player finishes.
// No auth required — players join via code, not accounts.
router.post('/:quizId/submit', authOptional, async (req, res) => {
  try {
    const { quizId } = req.params;

    // Verify the quiz exists before persisting the attempt.
    const quiz = await PostClassQuiz.findById(quizId).select('_id sessionId questions');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const { playerName, answers, totalScore, guestId } = req.body;

    // ── Basic validation ──────────────────────────────────────
    if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
      return res.status(400).json({ message: 'playerName is required' });
    }
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: 'answers must be a non-empty array' });
    }
    if (typeof totalScore !== 'number' || totalScore < 0) {
      return res.status(400).json({ message: 'totalScore must be a non-negative number' });
    }
    if (guestId !== undefined && (typeof guestId !== 'string' || !guestId.trim() || guestId.length > 128)) {
      return res.status(400).json({ message: 'guestId must be a non-empty string of at most 128 characters' });
    }

    // Validate each answer entry has the required shape.
    for (const [i, a] of answers.entries()) {
      if (!a.questionId) {
        return res.status(400).json({ message: `answers[${i}].questionId is required` });
      }
      if (typeof a.selectedIndex !== 'number') {
        return res.status(400).json({ message: `answers[${i}].selectedIndex must be a number` });
      }
      if (typeof a.correct !== 'boolean') {
        return res.status(400).json({ message: `answers[${i}].correct must be a boolean` });
      }
      if (typeof a.points !== 'number' || a.points < 0) {
        return res.status(400).json({ message: `answers[${i}].points must be a non-negative number` });
      }
      if (typeof a.responseTimeMs !== 'number' || !Number.isFinite(a.responseTimeMs) || a.responseTimeMs < 0) {
        return res.status(400).json({ message: `answers[${i}].responseTimeMs must be a non-negative number` });
      }
    }

    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      sessionId: quiz.sessionId,
      userId: req.user?.id,
      guestId: guestId?.trim(),
      playerName: playerName.trim(),
      answers: answers.map((a) => ({
        questionId: a.questionId,
        selectedIndex: a.selectedIndex,
        correct: a.correct,
        points: a.points,
        responseTimeMs: a.responseTimeMs,
      })),
      totalScore,
      completedAt: new Date(),
    });

    // If the attempt is associated with a logged-in user, update their aggregate performance.
    if (req.user?.id) {
      try {
        const userId = req.user.id;
        const quizIdObj = quiz._id;

        let perf = await StudentPerformance.findOne({ userId });
        if (!perf) {
          perf = new StudentPerformance({
            userId,
            userName: req.user.name || req.user.email || playerName.trim(),
            totalAttempts: 1,
            totalScore: totalScore,
            averageScore: totalScore,
            quizzesTaken: 1,
            quizStats: [
              {
                quizId: quizIdObj,
                attempts: 1,
                bestScore: totalScore,
                averageScore: totalScore,
                lastAttemptAt: new Date(),
              },
            ],
          });
        } else {
          // update overall totals
          perf.totalAttempts = (perf.totalAttempts || 0) + 1;
          perf.totalScore = (perf.totalScore || 0) + totalScore;
          perf.averageScore = perf.totalScore / perf.totalAttempts;

          // find per-quiz stats
          const q = perf.quizStats.find((s) => String(s.quizId) === String(quizIdObj));
          if (!q) {
            perf.quizzesTaken = (perf.quizzesTaken || 0) + 1;
            perf.quizStats.push({
              quizId: quizIdObj,
              attempts: 1,
              bestScore: totalScore,
              averageScore: totalScore,
              lastAttemptAt: new Date(),
            });
          } else {
            const prevAttempts = q.attempts || 0;
            const prevAvg = q.averageScore || 0;
            q.attempts = prevAttempts + 1;
            q.bestScore = Math.max(q.bestScore || 0, totalScore);
            q.averageScore = (prevAvg * prevAttempts + totalScore) / q.attempts;
            q.lastAttemptAt = new Date();
          }
        }

        await perf.save();
      } catch (perfErr) {
        // don't block the main response — log and continue
        // eslint-disable-next-line no-console
        console.error('Failed to update StudentPerformance:', perfErr);
      }
    }

    res.status(201).json(attempt);
  } catch (err) {
    // Handle Mongoose cast errors (malformed quizId ObjectId)
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid quizId format' });
    }
    res.status(500).json({ message: err.message });
  }
});

export default router;
