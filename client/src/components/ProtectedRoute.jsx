import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Wraps a page that requires authentication.
 * While the token is being validated, renders nothing (avoids flash).
 * Unauthenticated users are sent to /login with the intended path saved
 * in location.state so they can be redirected back after logging in.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // or a full-page spinner
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
