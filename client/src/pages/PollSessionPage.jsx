import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LivePollTab from '../components/LivePollTab.jsx';
import '../poll.css';

export default function PollSessionPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const isHost = session?.hostId === user?.id;

  useEffect(() => {
    api.get(`/sessions/${id}`)
      .then(({ data }) => setSession(data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function copyJoinLink() {
    const url = `${window.location.origin}/sessions/${id}/join`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        const success = document.execCommand('copy');
        document.body.removeChild(el);
        if (!success) throw new Error('execCommand failed');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
      alert('Failed to copy link. Please copy it manually.');
    }
  }

  if (loading) {
    return (
      <div className="ps-shell">
        <div className="ps-loading">
          <span className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} />
          Loading…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ps-shell">
        <div className="banner banner-error"><strong>Error</strong> {error}</div>
      </div>
    );
  }

  return (
    <div className="ps-shell">
      {/* ── Header ── */}
      <Link to="/home" className="ps-back">← Back to dashboard</Link>

      <div className="ps-header">
        <div>
          <h1 className="ps-title">{session.title}</h1>
          <div className="ps-meta">
            <span className="ps-meta-dot">📊</span>
            <span>Live Poll Session</span>
            <span className="ps-divider">·</span>
            <span>Code: <strong>{session.joinCode}</strong></span>
            <button className="ps-copy-btn" onClick={copyJoinLink}>
              {copied ? '✓ Copied!' : '🔗 Copy join link'}
            </button>
            {session.topic && (
              <>
                <span className="ps-divider">·</span>
                <span>Topic: <strong>{session.topic}</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Share banner ── */}
      <div className="ps-share-banner">
        <div className="ps-share-left">
          <div className="ps-share-icon">📱</div>
          <div>
            <div className="ps-share-title">Share this poll with your audience</div>
            <div className="ps-share-desc">
              Students can join at <strong>{window.location.origin}/sessions/{id}/join</strong> using code <strong>{session.joinCode}</strong>
            </div>
          </div>
        </div>
        <div className="ps-share-code">{session.joinCode}</div>
      </div>

      {/* ── Poll management ── */}
      <div className="ps-content">
        <LivePollTab sessionId={id} isHost={isHost} />
      </div>
    </div>
  );
}
