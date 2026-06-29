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
  const [loading, setLoading] = useState(true);
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
      .catch(() => { })
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

  const quizStats = {
    total: quizSessions.length,
    live: quizSessions.filter(s => s.isLive).length,
    ended: quizSessions.filter(s => s.endedAt && !s.isLive).length,
  };

  const pollStats = {
    total: pollSessions.length,
    live: pollSessions.filter(s => s.isLive).length,
    ended: pollSessions.filter(s => s.endedAt && !s.isLive).length,
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
            <div className="hs-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>
            </div>
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
              Good {greet()}, <span className="hs-hero-name" style={{ color: '#0f766e' }}>{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="hs-hero-sub">
              Manage all your quizzes in one session and track live results.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className="hs-create-btn hs-create-btn--navy"
              onClick={() => { setCreatingType(v => v === 'quiz' ? null : 'quiz'); setCreateErr(''); }}
            >
              {creatingType === 'quiz' ? '✕ Cancel' : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg> New Quiz</>}
            </button>
            <button
              className="hs-create-btn hs-create-btn--outline"
              onClick={() => { setCreatingType(v => v === 'poll' ? null : 'poll'); setCreateErr(''); }}
            >
              {creatingType === 'poll' ? '✕ Cancel' : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M12 17v-4" /><path d="M8 17v-7" /><path d="M16 17v-2" /></svg> New Poll</>}
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



        {/* ── Sessions list ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="hs-section-title" style={{ marginBottom: 0 }}>Your Sessions</div>
          <Link to="#" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f766e', textDecoration: 'none' }}>See All</Link>
        </div>

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
                    <div className="hs-stats" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                      {[
                        { label: 'Total Quizzes', value: quizStats.total, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><circle cx="12" cy="14" r="1.5" /><path d="M12 11.5a1.5 1.5 0 0 1 1.5 1.5" /></svg>, color: 'teal' },
                        { label: 'Live Quizzes', value: quizStats.live, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M4.93 19.07a10 10 0 0 1 0-14.14" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49" /><path d="M7.76 16.24a6 6 0 0 1 0-8.49" /></svg>, color: 'red' },
                        { label: 'Completed', value: quizStats.ended, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, color: 'blue' },
                      ].map(s => (
                        <div className="hs-stat" key={s.label}>
                          <div className={`hs-stat-icon-wrapper hs-stat-icon--${s.color}`}>
                            {s.color === 'red' && <div className="hs-stat-live-dot" />}
                            {s.icon}
                          </div>
                          <div>
                            <div className="hs-stat-value">{s.value}</div>
                            <div className="hs-stat-label">{s.label.toUpperCase()}</div>
                          </div>
                        </div>
                      ))}
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
                                <span className="hs-card-code-label">CODE</span>
                                {s.joinCode}
                              </span>
                            </div>
                            <div className="hs-card-actions">
                              <Link to={`/sessions/${s._id}/edit`} className="hs-card-btn hs-card-btn--light-black">
                                Open Quiz →
                              </Link>
                              {s.endedAt && (
                                <Link to={`/sessions/${s._id}/quiz-dashboard`} className="hs-card-btn hs-card-btn--outline-teal">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M12 17v-4" /><path d="M8 17v-7" /><path d="M16 17v-2" /></svg> Results
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
                    <div className="hs-stats" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                      {[
                        { label: 'Total Polls', value: pollStats.total, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M12 17v-4" /><path d="M8 17v-7" /><path d="M16 17v-2" /></svg>, color: 'teal' },
                        { label: 'Live Polls', value: pollStats.live, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M4.93 19.07a10 10 0 0 1 0-14.14" /><path d="M16.24 7.76a6 6 0 0 1 0 8.49" /><path d="M7.76 16.24a6 6 0 0 1 0-8.49" /></svg>, color: 'red' },
                        { label: 'Completed', value: pollStats.ended, icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, color: 'blue' },
                      ].map(s => (
                        <div className="hs-stat" key={s.label}>
                          <div className={`hs-stat-icon-wrapper hs-stat-icon--${s.color}`}>
                            {s.color === 'red' && <div className="hs-stat-live-dot" />}
                            {s.icon}
                          </div>
                          <div>
                            <div className="hs-stat-value">{s.value}</div>
                            <div className="hs-stat-label">{s.label.toUpperCase()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hs-sessions-grid">
                      {pollSessions.map(s => {
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
                                <span className="hs-card-code-label">CODE</span>
                                {s.joinCode}
                              </span>
                            </div>
                            <div className="hs-card-actions">
                              <Link to={`/sessions/${s._id}/poll-manage`} className="hs-card-btn hs-card-btn--light-black">
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
