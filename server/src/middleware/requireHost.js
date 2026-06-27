import Session from '../models/Session.js';

/**
 * Verifies that the authenticated user is the host of the session
 * identified by `req.params.id`.
 *
 * @returns {Promise<import('mongoose').Document|null>} The session document, or null if the response was already sent.
 */
export async function requireHost(req, res) {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404).json({ message: 'Session not found' });
    return null;
  }
  if (session.hostId.toString() !== req.user.id) {
    res.status(403).json({ message: 'Forbidden' });
    return null;
  }
  return session;
}
