import { Router } from 'express';

const router = Router();

// GET /api/analytics/session/:id
router.get('/session/:id', async (_req, res) => res.status(501).json({ message: 'Not implemented' }));

export default router;
