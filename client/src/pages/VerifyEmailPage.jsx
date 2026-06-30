import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../auth.css';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      navigate('/login');
    }
  }, [location, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (otp.length !== 6) {
      setStatus({ type: 'error', message: 'Please enter a 6-digit code.' });
      return;
    }
    
    setLoading(true);
    setStatus({ type: '', message: '' });
    
    try {
      const res = await api.post('/auth/verify-email', { email, otp });
      login(res.data);
      navigate('/home');
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Invalid code.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setStatus({ type: '', message: '' });
    try {
      const res = await api.post('/auth/resend-otp', { email });
      setStatus({ type: 'success', message: res.data.message });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to resend code.' });
    } finally {
      setResending(false);
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
          Almost<br />
          <span>there.</span>
        </h2>
        <p className="auth-brand-sub">
          We sent a secure verification code to your email.
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Verify Email</h1>
            <p className="auth-form-subtitle">Enter the 6-digit code sent to <b>{email}</b></p>
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
              <label className="auth-label" htmlFor="verify-otp">6-DIGIT CODE</label>
              <div className="auth-input-group">
                <input
                  id="verify-otp"
                  type="text"
                  className={`auth-input${status.type === 'error' ? ' error' : ''}`}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0,6)); setStatus({ type: '', message: '' }); }}
                  style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.25rem', fontWeight: 700 }}
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading || otp.length !== 6}
              style={{ marginTop: '1.5rem' }}
            >
              {loading && <span className="spinner" style={{ width: '1rem', height: '1rem' }} />}
              {loading ? 'Verifying…' : 'Verify Account →'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button 
                type="button"
                onClick={handleResend}
                disabled={resending}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {resending ? 'Sending...' : "Didn't receive a code? Resend"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
