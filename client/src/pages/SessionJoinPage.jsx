import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.jsx';
import LivePollTab from '../components/LivePollTab.jsx';
import '../post-quiz.css';
import '../poll.css';

const inputStyle = (hasError) => ({
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.75rem',
  border: `1.5px solid ${hasError ? '#f87171' : 'rgba(255,255,255,0.15)'}`,
  background: 'rgba(255,255,255,0.07)',
  color: '#fff',
  fontSize: '1rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  letterSpacing: 'inherit',
});

export default function SessionJoinPage() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [name, setName]       = useState(user?.name || '');
  const [code, setCode]       = useState(location.state?.code || '');
  const [errors, setErrors]   = useState({});
  const [checking, setChecking] = useState(false);
  const [joined, setJoined]   = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const socketRef = useRef(null);

  const goToQuiz = useCallback((playerName) => {
    navigate(`/sessions/${sessionId}/post-quiz?name=${encodeURIComponent(playerName)}`);
  }, [navigate, sessionId]);

  async function handleJoin(e) {
    e?.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    // Client-side validation
    const errs = {};
    if (!trimmedName) errs.name = 'Please enter your name.';
    if (!trimmedCode) errs.code = 'Please enter the join code.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setErrors({});
    setChecking(true);
    try {
      // Step 1: verify the join code matches this session
      const codeRes = await fetch(`/api/sessions/join/${trimmedCode}`);
      if (!codeRes.ok) {
        setErrors({ code: 'Invalid code. Please check and try again.' });
        return;
      }
      const session = await codeRes.json();
      if (session._id !== sessionId) {
        setErrors({ code: 'This code does not match the session link.' });
        return;
      }

      // Step 2: if host has already launched the quiz, go straight in
      if (session.type !== 'poll' && session.endedAt) {
        goToQuiz(trimmedName);
        return;
      }

      // Step 3: no quiz yet — enter waiting room
      setSessionInfo(session);
      setJoined(true);
    } catch {
      setErrors({ code: 'Network error. Please check your connection.' });
    } finally {
      setChecking(false);
    }
  }

  // Waiting room: listen for quiz-ready
  useEffect(() => {
    if (!joined) return;

    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join-session', sessionId));
    socket.on('quiz-ready', () => {
      setRedirecting(true);
      setTimeout(() => goToQuiz(name.trim()), 1000);
    });

    return () => socket.disconnect();
  }, [joined, sessionId, name, goToQuiz]);

  /* ── Entry form ── */
  if (!joined) {
    return (
      <div className="pq-shell" style={{ alignItems: 'center' }}>
        <form
          onSubmit={handleJoin}
          className="pq-error-card"
          style={{ marginTop: 0, maxWidth: 400, padding: '2.5rem 2rem', width: '100%' }}
        >
          <div className="pq-error-icon">🎓</div>
          <div className="pq-error-title" style={{ marginBottom: '0.375rem' }}>
            Join Session
          </div>
          <div className="pq-error-desc" style={{ marginBottom: '1.5rem' }}>
            Enter your name and the session code to get started.
          </div>

          {/* Name field */}
          <div style={{ marginBottom: '0.875rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '0.375rem' }}>
              Your name
            </label>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
              style={inputStyle(!!errors.name)}
              autoFocus
              disabled={checking}
            />
            {errors.name && (
              <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.3rem' }}>{errors.name}</div>
            )}
          </div>

          {/* Code field */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: '0.375rem' }}>
              Session code
            </label>
            <input
              type="text"
              placeholder="e.g. ABC123"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setErrors(p => ({ ...p, code: '' })); }}
              style={{ ...inputStyle(!!errors.code), letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase' }}
              maxLength={8}
              autoComplete="off"
              spellCheck={false}
              disabled={checking}
            />
            {errors.code && (
              <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.3rem' }}>{errors.code}</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary pq-next-btn"
            disabled={checking}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {checking && <span className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} />}
            {checking ? 'Verifying…' : 'Join →'}
          </button>
        </form>
      </div>
    );
  }

  /* ── Waiting lobby ── */
  return (
    <div className="pq-shell" style={{ alignItems: 'center', flexDirection: 'column', paddingTop: '6rem' }}>
      <div className="pq-error-card" style={{ marginTop: 0, maxWidth: 420 }}>
        {redirecting ? (
          <>
            <div className="pq-error-icon">🚀</div>
            <div className="pq-error-title">Quiz is starting!</div>
            <div className="pq-error-desc">Taking you to the quiz…</div>
            <span className="spinner pq-spinner" style={{ display: 'block', margin: '1.25rem auto 0' }} />
          </>
        ) : (
          <>
            <div className="pq-error-icon">⏳</div>
            <div className="pq-error-title">
              {sessionInfo?.type === 'poll' ? 'Live Poll Session' : 'Waiting for the host…'}
            </div>
            <div className="pq-error-desc" style={{ marginBottom: '1rem' }}>
              Hi <strong style={{ color: '#fff' }}>{name.trim()}</strong>! You're in the room.
              <br />
              {sessionInfo?.type === 'poll'
                ? 'Polls will appear below as soon as the host publishes them.'
                : "You'll be taken to the quiz automatically when the host launches it."}
            </div>
            <span className="spinner pq-spinner" style={{ display: 'block', margin: '0 auto' }} />
          </>
        )}
      </div>

      {/* Live polls — students can vote while waiting */}
      {!redirecting && (
        <div className="poll-student-section">
          <div className="poll-student-title">Live Polls</div>
          <LivePollTab sessionId={sessionId} isHost={false} />
        </div>
      )}
    </div>
  );
}
