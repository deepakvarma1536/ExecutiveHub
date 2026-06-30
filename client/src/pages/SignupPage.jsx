import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getGuestId } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useGoogleLogin } from '@react-oauth/google';
import '../auth.css';

export default function SignupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'student' });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      // Register then redirect to email verification
      const guestId = getGuestId();
      await api.post('/auth/register', { ...form, guestId });
      navigate('/verify-email', { state: { email: form.email } });
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

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setErrors({});
      try {
        // Send access_token and selected role to backend
        const res = await api.post('/auth/google', { 
          token: tokenResponse.access_token, 
          role: form.role,
          guestId: getGuestId() 
        });
        login(res.data);
        navigate('/home', { replace: true });
      } catch (err) {
        setErrors({ general: err.response?.data?.message || 'Google signup failed. Please try again.' });
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setErrors({ general: 'Google signup failed. Please try again.' });
    },
  });

  return (
    <div className="auth-shell">
      {/* ── Left brand panel ── */}
      <div className="auth-brand">
        <div className="auth-brand-logo">
          <div className="auth-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <span className="auth-brand-name">ExecutiveHub</span>
        </div>
        <h2 className="auth-brand-tagline">
          Engage every<br />
          <span>student, live.</span>
        </h2>
        <p className="auth-brand-sub">
          Create your first session in seconds. Generate a quiz with AI, share the join link, and watch results roll in on the live dashboard.
        </p>
        <div className="auth-brand-features">
          {[
            [<svg key={1} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>, 'AI-powered quiz generation from your topics & notes'],
            [<svg key={2} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, 'Real-time Socket.io leaderboard'],
            [<svg key={3} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>, 'Persist all attempts for post-session review'],
          ].map(([icon, text]) => (
            <div className="auth-brand-feature" key={text}>
              <div className="auth-brand-feature-icon">{icon}</div>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div className="auth-brand-dots">
          <span className="auth-dot"></span>
          <span className="auth-dot active"></span>
          <span className="auth-dot"></span>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-top-nav">
          <Link to="/login" className="auth-nav-btn">Sign In</Link>
          <Link to="/signup" className="auth-nav-btn active">Sign Up</Link>
        </div>
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Create your account</h1>
          </div>

          {apiError && <div className="auth-error">{apiError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-name">FULL NAME</label>
              <div className="auth-input-group">
                <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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
              </div>
              {errors.name && <div className="auth-field-error">{errors.name}</div>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-email">EMAIL</label>
              <div className="auth-input-group">
                <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
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
              </div>
              {errors.email && <div className="auth-field-error">{errors.email}</div>}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-password">PASSWORD</label>
              <div className="auth-input-group">
                <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={`auth-input${errors.password ? ' error' : ''}`}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, display: 'flex' }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
              {errors.password && <div className="auth-field-error">{errors.password}</div>}
            </div>

            <div className="auth-field" style={{ marginBottom: '1.5rem' }}>
              <label className="auth-label">ACCOUNT TYPE</label>
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
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <div className="auth-social">
            <button type="button" className="auth-social-btn" style={{ width: '100%' }} onClick={() => handleGoogleLogin()} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
