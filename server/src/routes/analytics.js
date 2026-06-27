import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireHost } from '../middleware/requireHost.js';
import QuizAttempt from '../models/QuizAttempt.js';
import Attendance from '../models/Attendance.js';
import User from '../models/User.js';

const router = Router();

// GET /api/analytics/session/:id/students
// Returns a per-student report for a session (host only)
router.get('/session/:id/students', authMiddleware, async (req, res) => {
	try {
		const session = await requireHost(req, res);
		if (!session) return;

		const attempts = await QuizAttempt.find({ sessionId: req.params.id }).lean();
		const attendances = await Attendance.find({ sessionId: req.params.id }).lean();

		// Build attendance map keyed by userId or anon:name
		const attendanceMap = new Map();
		for (const a of attendances) {
			const key = a.userId ? `u:${a.userId.toString()}` : `p:${(a.playerName || '').trim()}`;
			attendanceMap.set(key, (attendanceMap.get(key) || 0) + 1);
		}

		// Group attempts by userId if present, otherwise by playerName
		const map = new Map();
		for (const at of attempts) {
			const key = at.userId ? `u:${at.userId.toString()}` : `p:${(at.playerName || '').trim()}`;
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(at);
		}

		// Prepare result entries
		const entries = [];
		for (const [key, list] of map.entries()) {
			const isUser = key.startsWith('u:');
			let userInfo = null;
			if (isUser) {
				const userId = key.slice(2);
				userInfo = await User.findById(userId).select('name email').lean();
			}

			const attemptCount = list.length;
			const total = list.reduce((s, a) => s + (a.totalScore || 0), 0);
			const avgScore = attemptCount > 0 ? Math.round(total / attemptCount) : 0;
			const bestScore = list.reduce((b, a) => (a.totalScore > b ? a.totalScore : b), -Infinity);

			entries.push({
				key,
				userId: isUser ? list[0].userId : undefined,
				name: (userInfo && userInfo.name) || list[0].playerName || null,
				email: (userInfo && userInfo.email) || null,
				attemptCount,
				avgScore: avgScore === -Infinity ? 0 : avgScore,
				bestScore: bestScore === -Infinity ? 0 : bestScore,
				attempts: list.map((a) => ({ quizId: a.quizId, totalScore: a.totalScore, completedAt: a.completedAt, playerName: a.playerName })),
				attendanceCount: attendanceMap.get(key) || 0,
			});
		}

		// Sort students by attemptCount desc then avgScore
		entries.sort((a, b) => b.attemptCount - a.attemptCount || b.avgScore - a.avgScore);

		res.json({ sessionId: req.params.id, students: entries });
	} catch (err) {
		if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid session id' });
		res.status(500).json({ message: err.message });
	}
});

export default router;
