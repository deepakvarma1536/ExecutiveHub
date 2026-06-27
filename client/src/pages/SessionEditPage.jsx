import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PostClassQuizTab from '../components/PostClassQuizTab.jsx';
import LivePollTab from '../components/LivePollTab.jsx';
import '../quiz.css';
import '../launch.css';

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'quiz', label: 'Post-Class Quiz' },
  { id: 'polls', label: 'Live Polls' },
];

export default function SessionEditPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopyLink() {
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

  async function handleLaunchQuiz() {
    setLaunching(true);
    try {
      const { data } = await api.patch(`/sessions/${id}/end`);
      setSession(data);
      setLaunched(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to launch quiz. Please try again.');
    } finally {
      setLaunching(false);
    }
  }

  useEffect(() => {
    api
      .get(`/sessions/${id}`)
      .then((res) => setSession(res.data))
      .catch((err) => {
        const status = err.response?.status;
        if (status === 401) setError('You must be logged in to view this page.');
        else if (status === 403) setError('You are not the host of this session.');
        else if (status === 404) setError('Session not found.');
        else setError(err.response?.data?.message || err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page page-loading">
        <span className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-error">{error}</div>
      </div>
    );
  }

  const isHost = user && session &&
    (user._id ?? user.id) === session.hostId?.toString();
  const alreadyEnded = !!session.endedAt;

  return (
    <div className="page">
      <Link to="/home" className="page-back">← Back to dashboard</Link>

      <h1 className="page-title">{session.title}</h1>
      <div className="page-meta">
        <span
          className={`status-dot${session.isLive ? ' live' : ''}`}
          title={session.isLive ? 'Live' : 'Ended / not started'}
        />
        <span>{session.isLive ? 'Live' : session.endedAt ? 'Ended' : 'Not started'}</span>
        <span>·</span>
        <span>Code: <strong>{session.joinCode}</strong></span>
        <button
          onClick={handleCopyLink}
          className="btn btn-ghost btn-sm"
          title="Copy join link"
          style={{ padding: '0.2rem 0.625rem', fontSize: '0.75rem' }}
        >
          {copied ? '✅ Copied!' : '🔗 Copy join link'}
        </button>
        {session.topic && (
          <>
            <span>·</span>
            <span>Topic: <strong>{session.topic}</strong></span>
          </>
        )}
      </div>

      {/* Launch Quiz banner — host only */}
      {isHost && (
        <div className={`launch-banner ${alreadyEnded ? 'launch-banner--done' : ''}`}>
          {launched || alreadyEnded ? (
            <div className="launch-banner-done">
              <span className="launch-banner-icon">✅</span>
              <div>
                <div className="launch-banner-title">Quiz launched!</div>
                <div className="launch-banner-sub">Players in the waiting room have been redirected to the quiz.</div>
              </div>
              <Link to={`/sessions/${id}/quiz-dashboard`} className="btn btn-primary btn-sm launch-view-btn">
                View Dashboard →
              </Link>
            </div>
          ) : (
            <div className="launch-banner-action">
              <div className="launch-banner-left">
                <span className="launch-banner-icon">🚀</span>
                <div>
                  <div className="launch-banner-title">Ready to launch the quiz?</div>
                  <div className="launch-banner-sub">This will end the session and send all waiting players into the quiz.</div>
                </div>
              </div>
              <button
                className="btn btn-primary launch-btn"
                onClick={handleLaunchQuiz}
                disabled={launching}
              >
                {launching ? (
                  <><span className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} /> Launching…</>
                ) : (
                  '🚀 Launch Quiz'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'details' && (
        <DetailsTab session={session} />
      )}

      {activeTab === 'quiz' && (
        <PostClassQuizTab
          sessionId={session._id}
          sessionTopic={session.topic}
          sessionNotes={session.notes}
          isHost={isHost}
        />
      )}

      {activeTab === 'polls' && (
        <LivePollTab sessionId={session._id} isHost={isHost} />
      )}
    </div>
  );
}

function DetailsTab({ session }) {
  return (
    <div className="details-grid">
      <div className="details-card">
        <div className="details-card-label">Title</div>
        <div className="details-card-value">{session.title}</div>
      </div>
      <div className="details-card">
        <div className="details-card-label">Join code</div>
        <div className="details-card-value" style={{ fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '0.1em' }}>
          {session.joinCode}
        </div>
      </div>
      <div className="details-card">
        <div className="details-card-label">Topic</div>
        <div className={`details-card-value ${!session.topic ? 'details-card-empty' : ''}`}>
          {session.topic || 'No topic set'}
        </div>
      </div>
      <div className="details-card">
        <div className="details-card-label">Status</div>
        <div className="details-card-value">
          {session.isLive ? '🟢 Live' : session.endedAt ? `Ended ${new Date(session.endedAt).toLocaleString()}` : 'Not started'}
        </div>
      </div>
      {session.notes && (
        <div className="details-card full">
          <div className="details-card-label">Notes</div>
          <div className="details-card-value">{session.notes}</div>
        </div>
      )}
    </div>
  );
}
