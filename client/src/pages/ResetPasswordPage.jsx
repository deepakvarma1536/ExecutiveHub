import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api.js';
import '../auth.css';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    
    try {
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      setStatus({ type: 'success', message: res.data.message });
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to reset password. The link might be expired.' });
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
          Create a<br />
          <span>new password.</span>
        </h2>
        <p className="auth-brand-sub">
          Make it strong and unique to keep your sessions secure.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Set New Password</h1>
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

          {status.type !== 'success' && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="new-password">NEW PASSWORD</label>
                <div className="auth-input-group">
                  <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    className={`auth-input${status.type === 'error' ? ' error' : ''}`}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setStatus({ type: '', message: '' }); }}
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0, display: 'flex' }}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit"
                disabled={loading || password.length < 8}
                style={{ marginTop: '1.5rem' }}
              >
                {loading && <span className="spinner" style={{ width: '1rem', height: '1rem' }} />}
                {loading ? 'Updating…' : 'Update Password →'}
              </button>
            </form>
          )}

          {status.type === 'success' && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/login" className="auth-submit" style={{ textDecoration: 'none' }}>
                Go to Login →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
