import { Router } from 'express';

const router = Router();

// GET  /api/polls?session=:sessionId
router.get('/', async (_req, res) => res.status(501).json({ message: 'Not implemented' }));
// POST /api/polls
router.post('/', async (_req, res) => res.status(501).json({ message: 'Not implemented' }));
// POST /api/polls/:id/vote
router.post('/:id/vote', async (_req, res) => res.status(501).json({ message: 'Not implemented' }));
// PATCH /api/polls/:id/close
router.patch('/:id/close', async (_req, res) => res.status(501).json({ message: 'Not implemented' }));

export default router;
