import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import '../auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }
    
    setLoading(true);
    setStatus({ type: '', message: '' });
    
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setStatus({ type: 'success', message: res.data.message });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

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
          Lost your key?<br />
          <span>We've got you.</span>
        </h2>
        <p className="auth-brand-sub">
          Enter your email and we'll send you a secure link to get back into your account.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-top-nav">
          <Link to="/login" className="auth-nav-btn">Back to Login</Link>
        </div>
        
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Reset Password</h1>
          </div>

          {status.message && (
            <div className={status.type === 'success' ? 'auth-success' : 'auth-error'} style={{
              background: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: status.type === 'success' ? '#166534' : '#dc2626',
              border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: '0.625rem',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              marginBottom: '1.125rem'
            }}>
              {status.message}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="reset-email">EMAIL</label>
              <div className="auth-input-group">
                <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input
                  id="reset-email"
                  type="email"
                  className={`auth-input${status.type === 'error' ? ' error' : ''}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus({ type: '', message: '' }); }}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || !email}
              style={{ marginTop: '1.5rem' }}
            >
              {loading && <span className="spinner" style={{ width: '1rem', height: '1rem' }} />}
              {loading ? 'Sending link…' : 'Send Reset Link →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
