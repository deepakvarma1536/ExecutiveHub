import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api, { getGuestId } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/home';

  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { ...form, guestId: getGuestId() });
      login(res.data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* ── Left brand panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-icon">🎓</div>
          <span className="auth-brand-name">ExecutiveHub</span>
        </div>
        <h2 className="auth-brand-tagline">
          Run smarter<br />
          <span>live sessions.</span>
        </h2>
        <p className="auth-brand-sub">
          AI-generated quizzes, real-time leaderboards, and instant
          score feedback — all in one place.
        </p>
        <div className="auth-brand-features">
          {[
            ['⚡', 'AI quiz generation from your notes'],
            ['📊', 'Live leaderboard and accuracy charts'],
            ['🔗', 'Shareable join links, no login for students'],
          ].map(([icon, text]) => (
            <div className="auth-brand-feature" key={text}>
              <div className="auth-brand-feature-icon">{icon}</div>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <h1 className="auth-form-title">Welcome back</h1>
          <p className="auth-form-sub">
            Don't have an account?{' '}
            <Link to="/signup">Sign up free</Link>
          </p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                name="email"
                type="email"
                className={`auth-input${error ? ' error' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                name="password"
                type="password"
                className={`auth-input${error ? ' error' : ''}`}
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="auth-submit"
              disabled={loading || !form.email || !form.password}
            >
              {loading && <span className="spinner" style={{ width: '1rem', height: '1rem' }} />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
