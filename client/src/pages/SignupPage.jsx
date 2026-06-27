import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getGuestId } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../auth.css';

export default function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'student' });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setApiError('');
  }

  function validate() {
    const e = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }

    setLoading(true);
    setApiError('');
    try {
      // Register then immediately log in
      const guestId = getGuestId();
      await api.post('/auth/register', { ...form, guestId });
      const res = await api.post('/auth/login', { email: form.email, password: form.password, guestId });
      login(res.data);
      navigate('/home', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors;
      if (typeof msg === 'object') {
        setErrors(msg);
      } else {
        setApiError(msg || 'Registration failed. Please try again.');
      }
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
          Engage every<br />
          <span>student, live.</span>
        </h2>
        <p className="auth-brand-sub">
          Create your first session in seconds. Generate a quiz with AI,
          share the join link, and watch results roll in on the live dashboard.
        </p>
        <div className="auth-brand-features">
          {[
            ['🤖', 'Ollama-powered AI quiz from your topics & notes'],
            ['📡', 'Real-time Socket.io leaderboard'],
            ['📝', 'Persist all attempts for post-session review'],
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
          <h1 className="auth-form-title">Create your account</h1>
          <p className="auth-form-sub">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>

          {apiError && <div className="auth-error">{apiError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                name="name"
                type="text"
                className={`auth-input${errors.name ? ' error' : ''}`}
                placeholder="Jane Smith"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
              {errors.name && <div className="auth-field-error">{errors.name}</div>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                name="email"
                type="email"
                className={`auth-input${errors.email ? ' error' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
              {errors.email && <div className="auth-field-error">{errors.email}</div>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                name="password"
                type="password"
                className={`auth-input${errors.password ? ' error' : ''}`}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
              {errors.password && <div className="auth-field-error">{errors.password}</div>}
            </div>

            <div className="auth-field" style={{ marginBottom: '1.5rem' }}>
              <label className="auth-label">Account type</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#1f2937', fontSize: '0.9rem', fontWeight: 500 }}>
                  <input type="radio" name="role" value="student" checked={form.role === 'student'} onChange={handleChange} style={{ accentColor: '#8b5cf6', width: '1.2rem', height: '1.2rem' }} />
                  Student
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#1f2937', fontSize: '0.9rem', fontWeight: 500 }}>
                  <input type="radio" name="role" value="presenter" checked={form.role === 'presenter'} onChange={handleChange} style={{ accentColor: '#8b5cf6', width: '1.2rem', height: '1.2rem' }} />
                  Teacher / Host
                </label>
              </div>
            </div>

            <button
              id="signup-submit"
              type="submit"
              className="auth-submit"
              disabled={loading || !form.name || !form.email || !form.password}
            >
              {loading && <span className="spinner" style={{ width: '1rem', height: '1rem' }} />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
