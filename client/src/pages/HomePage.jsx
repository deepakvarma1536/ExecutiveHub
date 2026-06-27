import { useEffect, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../utils.js';
import './HomePage.css';


function statusLabel(s) {
  if (s.isLive) return { text: 'Live', cls: 'hs-badge--live' };
  if (s.endedAt) return { text: 'Ended', cls: 'hs-badge--ended' };
  return { text: 'Draft', cls: 'hs-badge--draft' };
}

/* ── component ────────────────────────────────────────────────── */
export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingType, setCreatingType] = useState(null);
  const [quizSessionExpanded, setQuizSessionExpanded] = useState(false);
  const [pollSessionExpanded, setPollSessionExpanded] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [createErr, setCreateErr] = useState('');

  useEffect(() => {
    if (user?.role === 'student') return;
    api.get('/sessions')
      .then(res => setSessions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateErr('');
    try {
      const res = await api.post('/sessions', { title: newTitle.trim(), topic: newTopic.trim() || undefined, type: creatingType });
      setSessions(prev => [res.data, ...prev]);
      setNewTitle('');
      setNewTopic('');
      if (creatingType === 'poll') {
        navigate(`/sessions/${res.data._id}/poll-manage`);
      } else {
        navigate(`/sessions/${res.data._id}/edit`);
      }
      setCreatingType(null);
    } catch (err) {
      setCreateErr(err.response?.data?.message || 'Could not create session.');
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const quizSessions = sessions.filter(s => s.type !== 'poll');
  const pollSessions = sessions.filter(s => s.type === 'poll');

  const stats = {
    totalSessions: sessions.length,
    totalQuizzes: quizSessions.length,
    live: sessions.filter(s => s.isLive).length,
    ended: sessions.filter(s => s.endedAt && !s.isLive).length,
  };

  if (user?.role === 'student') {
    return <Navigate to="/performance/me" replace />;
  }

  return (
    <div className="hs-root">
      {/* ── Navbar ── */}
      <nav className="hs-nav">
        <div className="hs-nav-inner">
          <Link to="/home" className="hs-nav-logo">
            <div className="hs-nav-icon">🎓</div>
            <span className="hs-nav-name">ExecutiveHub</span>
          </Link>
          <div className="hs-nav-right">
            <div className="hs-nav-user">
              <div className="hs-avatar">{user?.name?.[0]?.toUpperCase() ?? '?'}</div>
              <div className="hs-nav-user-info">
                <span className="hs-nav-user-name">{user?.name}</span>
                <span className="hs-nav-user-role">{user?.role}</span>
              </div>
            </div>
            <button className="hs-logout-btn" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </nav>

      <main className="hs-main">
        {/* ── Hero greeting ── */}
        <div className="hs-hero">
          <div className="hs-hero-text">
            <h1 className="hs-hero-title">
              Good {greet()}, <span className="hs-hero-name">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="hs-hero-sub">
              Manage all your quizzes in one session and track live results.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="hs-create-btn"
              style={{ background: creatingType === 'quiz' ? 'transparent' : undefined, border: creatingType === 'quiz' ? '1px solid #4f46e5' : undefined }}
              onClick={() => { setCreatingType(v => v === 'quiz' ? null : 'quiz'); setCreateErr(''); }}
            >
              {creatingType === 'quiz' ? '✕ Cancel' : '+ New Quiz'}
            </button>
            <button
              className="hs-create-btn"
              style={{ background: creatingType === 'poll' ? 'transparent' : '#8b5cf6', border: creatingType === 'poll' ? '1px solid #8b5cf6' : undefined }}
              onClick={() => { setCreatingType(v => v === 'poll' ? null : 'poll'); setCreateErr(''); }}
            >
              {creatingType === 'poll' ? '✕ Cancel' : '+ New Poll'}
            </button>
          </div>
        </div>

        {/* ── New session form ── */}
        {creatingType && (
          <form className="hs-new-form" onSubmit={handleCreate}>
            <div className="hs-new-form-title">
              {creatingType === 'quiz' ? 'Add a quiz session' : 'Add a live poll session'}
            </div>
            {createErr && <div className="hs-new-error">{createErr}</div>}
            <div className="hs-new-row">
              <div className="hs-new-field">
                <label className="hs-new-label" htmlFor="new-title">
                  {creatingType === 'quiz' ? 'Quiz title' : 'Poll session title'} <span className="hs-required">*</span>
                </label>
                <input
                  id="new-title"
                  className="hs-new-input"
                  placeholder={creatingType === 'quiz' ? "e.g. React Hooks Deep Dive" : "e.g. Weekly Team Sync"}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="hs-new-field">
                <label className="hs-new-label" htmlFor="new-topic">Topic <span className="hs-optional">(optional)</span></label>
                <input
                  id="new-topic"
                  className="hs-new-input"
                  placeholder="e.g. useState, useEffect, custom hooks"
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="hs-new-submit"
                disabled={creating || !newTitle.trim()}
              >
                {creating ? <span className="spinner" style={{ width: '0.9rem', height: '0.9rem' }} /> : null}
                {creating ? 'Creating…' : 'Create →'}
              </button>
            </div>
          </form>
        )}

        {/* ── Stats row ── */}
        <div className="hs-stats">
          {[
            { label: 'Total Sessions', value: stats.totalSessions, icon: '🗂️' },
            { label: 'Total Quizzes',  value: stats.totalQuizzes,  icon: '📝' },
            { label: 'Live Quizzes',   value: stats.live,          icon: '🔴' },
            { label: 'Completed',      value: stats.ended,         icon: '✅' },
          ].map(s => (
            <div className="hs-stat" key={s.label}>
              <span className="hs-stat-icon">{s.icon}</span>
              <div>
                <div className="hs-stat-value">{s.value}</div>
                <div className="hs-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Sessions list ── */}
        <div className="hs-section-title">Your Sessions</div>

        {loading ? (
          <div className="hs-loading">
            <span className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} />
            Loading quizzes…
          </div>
        ) : sessions.length === 0 ? (
          <div className="hs-empty">
            <div className="hs-empty-icon">🗂️</div>
            <div className="hs-empty-title">No quizzes in this session yet</div>
            <div className="hs-empty-sub">Click <strong>+ New Quiz</strong> above to get started.</div>
          </div>
        ) : (
          <>
            {quizSessions.length > 0 && (
              <section className="hs-session-group" style={{ marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  className="hs-session-group-header"
                  onClick={() => setQuizSessionExpanded(value => !value)}
                  aria-expanded={quizSessionExpanded}
                  aria-controls="quiz-session-content"
                >
                  <div>
                    <div className="hs-session-group-eyebrow">SESSION</div>
                    <h2 className="hs-session-group-title">Quiz Session</h2>
                    <p className="hs-session-group-sub">Click to {quizSessionExpanded ? 'hide' : 'view'} quizzes</p>
                  </div>
                  <span className="hs-session-group-actions">
                    <span className={`hs-session-status ${quizSessions.filter(s => s.isLive).length > 0 ? 'hs-session-status--live' : ''}`}>
                      {quizSessions.filter(s => s.isLive).length > 0 ? `${quizSessions.filter(s => s.isLive).length} live` : 'All quizzes'}
                    </span>
                    <span className={`hs-session-chevron ${quizSessionExpanded ? 'hs-session-chevron--open' : ''}`}>⌄</span>
                  </span>
                </button>
                {quizSessionExpanded && (
                  <div id="quiz-session-content" className="hs-session-content">
                    <div className="hs-session-quizzes-label">
                      <span>Quizzes</span>
                      <span className="hs-session-quiz-count">
                        {quizSessions.length} quiz{quizSessions.length !== 1 ? 'zes' : ''}
                      </span>
                    </div>
                    <div className="hs-sessions-grid">
                    {quizSessions.map(s => {
                      const { text, cls } = statusLabel(s);
                      return (
                        <div key={s._id} className="hs-card">
                          <div className="hs-card-top">
                            <span className={`hs-badge ${cls}`}>{text}</span>
                            <span className="hs-card-date">{formatDate(s.createdAt)}</span>
                          </div>
                          <h3 className="hs-card-title">{s.title}</h3>
                          {s.topic && <p className="hs-card-topic">{s.topic}</p>}
                          <div className="hs-card-meta">
                            <span className="hs-card-code">
                              <span className="hs-card-code-label">Code</span>
                              {s.joinCode}
                            </span>
                          </div>
                          <div className="hs-card-actions">
                            <Link to={`/sessions/${s._id}/edit`} className="hs-card-btn hs-card-btn--primary">
                              Open Quiz →
                            </Link>
                            {s.endedAt && (
                              <Link to={`/sessions/${s._id}/quiz-dashboard`} className="hs-card-btn hs-card-btn--ghost">
                                📊 Results
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {pollSessions.length > 0 && (
              <section className="hs-session-group">
                <button
                  type="button"
                  className="hs-session-group-header"
                  onClick={() => setPollSessionExpanded(value => !value)}
                  aria-expanded={pollSessionExpanded}
                  aria-controls="poll-session-content"
                >
                  <div>
                    <div className="hs-session-group-eyebrow">SESSION</div>
                    <h2 className="hs-session-group-title">Poll Session</h2>
                    <p className="hs-session-group-sub">Click to {pollSessionExpanded ? 'hide' : 'view'} polls</p>
                  </div>
                  <span className="hs-session-group-actions">
                    <span className={`hs-session-status ${pollSessions.filter(s => s.isLive).length > 0 ? 'hs-session-status--live' : ''}`}>
                      {pollSessions.filter(s => s.isLive).length > 0 ? `${pollSessions.filter(s => s.isLive).length} live` : 'All polls'}
                    </span>
                    <span className={`hs-session-chevron ${pollSessionExpanded ? 'hs-session-chevron--open' : ''}`}>⌄</span>
                  </span>
                </button>
                {pollSessionExpanded && (
                  <div id="poll-session-content" className="hs-session-content">
                    <div className="hs-session-quizzes-label">
                      <span>Polls</span>
                      <span className="hs-session-quiz-count">
                        {pollSessions.length} poll{pollSessions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="hs-sessions-grid">
                    {pollSessions.map(s => {
                      const { text, cls } = statusLabel(s);
                      return (
                        <div key={s._id} className="hs-card">
                          <div className="hs-card-top">
                            <span className={`hs-badge ${cls}`}>📊 Poll Session</span>
                            <span className="hs-card-date">{formatDate(s.createdAt)}</span>
                          </div>
                          <h3 className="hs-card-title">{s.title}</h3>
                          {s.topic && <p className="hs-card-topic">{s.topic}</p>}
                          <div className="hs-card-meta">
                            <span className="hs-card-code">
                              <span className="hs-card-code-label">Code</span>
                              {s.joinCode}
                            </span>
                          </div>
                          <div className="hs-card-actions">
                            <Link to={`/sessions/${s._id}/poll-manage`} className="hs-card-btn hs-card-btn--primary" style={{ background: '#8b5cf6' }}>
                              Open Polls →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
