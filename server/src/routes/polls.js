import { Router } from 'express';
import Poll from '../models/Poll.js';
import { authMiddleware, authOptional } from '../middleware/authMiddleware.js';
import { requireHost } from '../middleware/requireHost.js';

const router = Router();

/** Strip voter details and attach the current user's vote index. */
function sanitizePoll(poll, userId, guestId) {
  const obj = typeof poll.toObject === 'function' ? poll.toObject() : { ...poll };
  const myVoter = obj.voters?.find(
    (v) => (userId && String(v.userId) === userId) || (guestId && v.guestId === guestId)
  );
  obj.voterCount = obj.voters?.length ?? 0;
  obj.myVote = myVoter ? myVoter.optionIndex : null;
  delete obj.voters;
  return obj;
}

// ── GET /api/sessions/:id/polls ─────────────────────────────────
router.get('/:id/polls', authOptional, async (req, res) => {
  try {
    const polls = await Poll.find({ sessionId: req.params.id }).sort({ createdAt: -1 }).lean();
    const userId = req.user?.id;
    const guestId = req.query.guestId;
    res.json(polls.map((p) => sanitizePoll(p, userId, guestId)));
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid session id' });
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/sessions/:id/polls ────────────────────────────────
router.post('/:id/polls', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    const { question, options } = req.body;
    if (!question?.trim()) return res.status(400).json({ message: 'question is required' });
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
      return res.status(400).json({ message: 'options must be an array with 2–6 items' });
    }
    for (const [i, opt] of options.entries()) {
      if (typeof opt !== 'string' || !opt.trim()) {
        return res.status(400).json({ message: `options[${i}] must be a non-empty string` });
      }
    }

    const poll = await Poll.create({
      sessionId: session._id,
      question: question.trim(),
      options: options.map((text) => ({ text: text.trim(), votes: 0 })),
    });

    const sanitized = sanitizePoll(poll, req.user.id, null);
    req.io.to(req.params.id).emit('poll-created', { poll: sanitized });
    res.status(201).json(sanitized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/sessions/:id/polls/:pollId/vote ───────────────────
router.post('/:id/polls/:pollId/vote', authOptional, async (req, res) => {
  try {
    const { optionIndex, playerName, guestId } = req.body;
    if (typeof optionIndex !== 'number' || optionIndex < 0) {
      return res.status(400).json({ message: 'optionIndex must be a non-negative number' });
    }

    const poll = await Poll.findOne({ _id: req.params.pollId, sessionId: req.params.id });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (!poll.isOpen) return res.status(400).json({ message: 'This poll is closed' });
    if (optionIndex >= poll.options.length) {
      return res.status(400).json({ message: 'optionIndex out of range' });
    }

    const userId = req.user?.id;
    const alreadyVoted = poll.voters.some(
      (v) => (userId && String(v.userId) === userId) || (guestId && v.guestId === guestId)
    );
    if (alreadyVoted) return res.status(409).json({ message: 'You have already voted' });

    poll.options[optionIndex].votes += 1;
    poll.voters.push({
      userId: userId || undefined,
      guestId: guestId || undefined,
      playerName: playerName || req.user?.name || 'Anonymous',
      optionIndex,
    });
    await poll.save();

    const update = { pollId: poll._id, options: poll.options, voterCount: poll.voters.length };
    req.io.to(req.params.id).emit('poll-vote-update', update);
    res.json({ ...update, myVote: optionIndex });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid poll id' });
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/sessions/:id/polls/:pollId/close ─────────────────
router.patch('/:id/polls/:pollId/close', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    const poll = await Poll.findOne({ _id: req.params.pollId, sessionId: session._id });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    poll.isOpen = false;
    await poll.save();

    req.io.to(req.params.id).emit('poll-closed', { pollId: poll._id, options: poll.options });
    res.json({ pollId: poll._id, isOpen: false, options: poll.options });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid poll id' });
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/sessions/:id/polls/:pollId ──────────────────────
router.delete('/:id/polls/:pollId', authMiddleware, async (req, res) => {
  try {
    const session = await requireHost(req, res);
    if (!session) return;

    const poll = await Poll.findOneAndDelete({ _id: req.params.pollId, sessionId: session._id });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    req.io.to(req.params.id).emit('poll-deleted', { pollId: poll._id });
    res.json({ message: 'Poll deleted' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid poll id' });
    res.status(500).json({ message: err.message });
  }
});

export default router;
