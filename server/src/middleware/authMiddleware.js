import jwt from 'jsonwebtoken';

/**
 * Creates an Express middleware that verifies a Bearer JWT token.
 * @param {{ required?: boolean }} options
 */
function createAuthMiddleware({ required = true } = {}) {
  return (req, res, next) => {
    let token = req.cookies?.auth_token;
    
    if (!token) {
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) {
        token = header.slice(7);
      }
    }

    if (!token) {
      return required
        ? res.status(401).json({ message: 'No token provided' })
        : next();
    }
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(401).json({ message });
    }
  };
}

/** Requires a valid Bearer token — returns 401 if missing or invalid. */
export const authMiddleware = createAuthMiddleware({ required: true });

/** Verifies a Bearer token if present; proceeds as anonymous if absent. */
export const authOptional = createAuthMiddleware({ required: false });
