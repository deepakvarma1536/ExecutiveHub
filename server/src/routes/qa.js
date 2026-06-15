import { Router } from 'express';

const router = Router();

// GET  /api/qa?session=:sessionId
router.get('/', async (_req, res) => res.status(501).json({ message: 'Not implemented' }));
// POST /api/qa
router.post('/', async (_req, res) => res.status(501).json({ message: 'Not implemented' }));
// POST /api/qa/:id/upvote
router.post('/:id/upvote', async (_req, res) => res.status(501).json({ message: 'Not implemented' }));
// PATCH /api/qa/:id/answer
router.patch('/:id/answer', async (_req, res) => res.status(501).json({ message: 'Not implemented' }));

export default router;
