import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import PostClassQuizTab from '../components/PostClassQuizTab.jsx';
import '../quiz.css';
import '../launch.css';

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'quiz', label: 'Post-Class Quiz' },
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
  const [duplicating, setDuplicating] = useState(false);
  const navigate = useNavigate();

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

  async function handleDuplicate() {
    if (!window.confirm('Are you sure you want to duplicate this session? This will create a fresh copy.')) return;
    setDuplicating(true);
    try {
      const { data } = await api.post(`/sessions/${id}/duplicate`);
      navigate(`/sessions/${data._id}/edit`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to duplicate session');
    } finally {
      setDuplicating(false);
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
    <div className="hs-root">
      <nav className="hs-nav">
        <div className="hs-nav-inner">
          <Link to="/home" className="hs-nav-logo" style={{ color: '#0f172a' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span className="hs-nav-name">ExecutiveHub</span>
          </Link>
          <div className="hs-nav-right">
            <div className="hs-avatar">{user?.name?.[0]?.toUpperCase() ?? '?'}</div>
          </div>
        </div>
      </nav>

      <div className="page">
        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '1.25rem' }}>
          Dashboard &gt; Session Details
        </div>

      {/* Launch Quiz banner — host only */}
      {isHost && (
        <div className={`launch-banner ${alreadyEnded ? 'launch-banner--done' : ''}`}>
          {launched || alreadyEnded ? (
            <div className="launch-banner-done" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#0f766e" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
                <div>
                  <div className="launch-banner-title" style={{ fontSize: '1.25rem' }}>Quiz launched!</div>
                  <div className="launch-banner-sub">Players in the waiting room have been redirected to the quiz.</div>
                </div>
              </div>
              <Link to={`/sessions/${id}/quiz-dashboard`} className="btn launch-view-btn" style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', background: '#000', color: '#fff', borderRadius: '0.5rem', fontSize: '0.9375rem' }}>
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
                className="btn launch-btn"
                onClick={handleLaunchQuiz}
                disabled={launching}
                style={{ background: '#27272a', color: '#fff', borderRadius: '0.5rem', border: 'none', padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.9375rem' }}
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

      {/* Restart section */}
      <div style={{ textAlign: 'center', marginTop: '3.5rem', marginBottom: '1.5rem', color: '#334155', fontSize: '0.9375rem' }}>
        Want to restart this session for a new group?
        <div style={{ marginTop: '1.25rem' }}>
          <button onClick={handleDuplicate} disabled={duplicating} className="btn" style={{ background: '#fff', border: '1.5px solid #000', color: '#000', fontWeight: 700, padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.9375rem' }}>
            {duplicating ? 'Duplicating...' : 'Duplicate Session'}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}

function DetailsTab({ session }) {
  const [copied, setCopied] = useState(false);
  async function handleCopyLink() {
    const url = `${window.location.origin}/sessions/${session._id}/join`;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(url);
      else {
        const el = document.createElement('textarea'); el.value = url;
        document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
      }
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  }

  return (
    <div className="details-grid">
      <div className="details-card full" style={{ padding: '1.5rem' }}>
        <div className="details-card-label" style={{ letterSpacing: '0.15em' }}>TITLE</div>
        <div className="details-card-value" style={{ fontSize: '2rem', fontWeight: 800 }}>{session.title}</div>
      </div>
      <div className="details-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div className="details-card-label" style={{ letterSpacing: '0.15em' }}>JOIN CODE</div>
          <div className="details-card-value" style={{ fontSize: '1.375rem', fontWeight: 800, letterSpacing: '0.05em' }}>
            {session.joinCode}
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <svg style={{ color: '#0f766e', cursor: 'pointer' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" onClick={handleCopyLink}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          {copied && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#0f766e' }}>Copied!</span>}
        </div>
      </div>
      <div className="details-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div className="details-card-label" style={{ letterSpacing: '0.15em' }}>TOPIC</div>
          <div className={`details-card-value ${!session.topic ? 'details-card-empty' : ''}`} style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
            {session.topic || 'No topic set'}
          </div>
        </div>
        {session.topic && <div><span className="badge" style={{ background: '#e0e7ff', color: '#1e1b4b', fontWeight: 600, fontSize: '0.6rem', border: '1px solid #c7d2fe', padding: '0.25rem 0.625rem' }}>&lt; &gt; TECHNICAL</span></div>}
      </div>
      <div className="details-card full" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div className="details-card-label" style={{ letterSpacing: '0.15em' }}>STATUS</div>
        <div className="details-card-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '1.125rem' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: session.isLive ? '#22c55e' : '#475569' }}></span>
          {session.isLive ? 'Live' : session.endedAt ? 'Ended' : 'Not started'}
        </div>
        {session.endedAt && <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569', letterSpacing: '0.05em' }}>{new Date(session.endedAt).toLocaleString()}</div>}
      </div>
      {session.notes && (
        <div className="details-card full" style={{ padding: '1.5rem' }}>
          <div className="details-card-label" style={{ letterSpacing: '0.15em' }}>NOTES</div>
          <div className="details-card-value" style={{ fontSize: '0.9375rem' }}>{session.notes}</div>
        </div>
      )}
    </div>
  );
}
