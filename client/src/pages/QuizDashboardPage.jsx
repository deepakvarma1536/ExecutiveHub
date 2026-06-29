import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createSocket } from '../socket.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import api from '../api.js';
import '../quiz.css';
import '../dashboard.css';

/* ── helpers ──────────────────────────────────────────────────── */
function mergeAnswer({ leaderboard, questionStats, averageScore, attemptCount }, event) {
  const { playerName, questionId, correct, points } = event;

  const newBoard = [...leaderboard];
  const existing = newBoard.find((r) => r.playerName === playerName);
  if (existing) {
    existing.totalScore += points;
  } else {
    newBoard.push({ playerName, totalScore: points });
  }
  newBoard.sort((a, b) => b.totalScore - a.totalScore);

  const newQStats = questionStats.map((s) => {
    if (s.questionId !== questionId) return s;
    const newTotal   = s.total + 1;
    const newCorrect = s.correct + (correct ? 1 : 0);
    return { ...s, total: newTotal, correct: newCorrect, pct: Math.round((newCorrect / newTotal) * 100) };
  });

  const totalPts = newBoard.reduce((s, r) => s + r.totalScore, 0);
  const newAvg   = newBoard.length > 0 ? Math.round(totalPts / newBoard.length) : 0;

  return { leaderboard: newBoard, questionStats: newQStats, averageScore: newAvg, attemptCount };
}

const MEDAL = ['🥇', '🥈', '🥉'];

function QTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="dbd-tooltip">
      <div className="dbd-tooltip-prompt">{d.prompt}</div>
      <div className="dbd-tooltip-stat"><span className="dbd-tooltip-pct">{d.pct}%</span> correct</div>
      <div className="dbd-tooltip-sub">{d.correct}/{d.total} players</div>
    </div>
  );
}

/* ── main component ─────────────────────────────────────────── */
export default function QuizDashboardPage() {
  const { id: sessionId } = useParams();

  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [data, setData] = useState({
    leaderboard: [],
    questionStats: [],
    averageScore: 0,
    attemptCount: 0,
  });
  const [liveCount, setLiveCount]   = useState(0);
  const [connected, setConnected]   = useState(false);

  // Host question pacing
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(-1);
  const [joinedPlayers, setJoinedPlayers] = useState(new Set());
  const [readyPlayers, setReadyPlayers]   = useState(new Set());
  // 10-second lock: host cannot advance while question timer is running
  const [questionTimer, setQuestionTimer] = useState(0);

  const socketRef = useRef(null);
  const dataRef   = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  /* ── 10-second countdown after each question start ─────────── */
  useEffect(() => {
    if (questionTimer <= 0) return;
    const t = setTimeout(() => setQuestionTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [questionTimer]);

  /* ── initial fetch ─────────────────────────────────────────── */
  useEffect(() => {
    api
      .get(`/sessions/${sessionId}/quiz-results`)
      .then((res) => {
        setData({
          leaderboard:   res.data.leaderboard,
          questionStats: res.data.questionStats,
          averageScore:  res.data.averageScore,
          attemptCount:  res.data.attemptCount,
        });
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 401) setFetchError('You must be logged in to view this page.');
        else if (status === 403) setFetchError('You are not the host of this session.');
        else if (status === 404) setFetchError(err.response?.data?.message || 'Not found.');
        else setFetchError(err.response?.data?.message || err.message);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  /* ── socket ─────────────────────────────────────────────────── */
  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-session', sessionId);
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('quiz-answer', (event) => {
      setLiveCount((c) => c + 1);
      setData((prev) => mergeAnswer(prev, event));
    });

    socket.on('quiz-player-joined', ({ playerName }) => {
      setJoinedPlayers(prev => new Set([...prev, playerName]));
    });

    socket.on('quiz-player-ready', ({ playerName }) => {
      setReadyPlayers(prev => new Set([...prev, playerName]));
    });

    return () => socket.disconnect();
  }, [sessionId]);

  /* ── advance to next question ────────────────────────────────── */
  function handleNextQuestion() {
    if (quizEnded || questionTimer > 0) return;
    const nextIdx = currentQuestionIdx + 1;
    setCurrentQuestionIdx(nextIdx);
    setReadyPlayers(new Set());
    socketRef.current?.emit('quiz-host-next', { sessionId, questionIndex: nextIdx });
    // Lock button for 10 seconds — matches the player question timer
    setQuestionTimer(10);
  }

  /* ── early returns ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="dbd-shell">
        <div className="dbd-loading">
          <span className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
          <span>Loading dashboard…</span>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="dbd-shell">
        <div className="page-error">{fetchError}</div>
      </div>
    );
  }

  const { leaderboard, questionStats, averageScore, attemptCount } = data;
  const maxScore       = leaderboard.length > 0 ? leaderboard[0].totalScore : 0;
  const totalQuestions = questionStats.length;
  const quizStarted    = currentQuestionIdx >= 0;
  const quizEnded      = currentQuestionIdx >= totalQuestions;
  const isLastQ        = currentQuestionIdx === totalQuestions - 1;
  const buttonLocked   = questionTimer > 0;

  return (
    <div className="dbd-shell">
      {/* ── Top bar ── */}
      <div className="dbd-topbar">
        <Link to="/home" className="dbd-back-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Dashboard
        </Link>
        <div className="dbd-topbar-right">
          <span className={`dbd-socket-dot ${connected ? 'dbd-socket-dot--on' : ''}`} />
          <span className="dbd-socket-label">{connected ? 'Live' : 'Reconnecting…'}</span>
          {liveCount > 0 && (
            <span className="dbd-live-badge">{liveCount} live answer{liveCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      <h1 className="dbd-title">Quiz Dashboard</h1>

      {/* ── Question control panel ── */}
      <div className="dbd-control-panel">
        <div className="dbd-control-left">
          <div className="dbd-control-q-label">
            {!quizStarted
              ? 'Quiz not started'
              : quizEnded
              ? 'Quiz finished'
              : `Question ${currentQuestionIdx + 1} / ${totalQuestions}`}
          </div>
          <div className="dbd-control-counts">
            <span className="dbd-count-pill">
              <span>👥</span>
              <span>{joinedPlayers.size} joined</span>
            </span>
            {quizStarted && !quizEnded && (
              <span className="dbd-count-pill dbd-count-pill--ready">
                <span>✅</span>
                <span>{readyPlayers.size} / {joinedPlayers.size || '?'} ready</span>
              </span>
            )}
            {buttonLocked && (
              <span className="dbd-count-pill dbd-count-pill--timer">
                <span>⏱</span>
                <span>Question ends in {questionTimer}s</span>
              </span>
            )}
          </div>
          {/* Timer progress bar */}
          {buttonLocked && (
            <div className="dbd-q-timer-track">
              <div
                className="dbd-q-timer-fill"
                style={{ width: `${(questionTimer / 10) * 100}%` }}
              />
            </div>
          )}
        </div>
        <button
          className={`btn dbd-next-btn ${quizEnded || buttonLocked ? 'btn-ghost' : 'btn-primary'}`}
          onClick={handleNextQuestion}
          disabled={quizEnded || !connected || buttonLocked}
          title={buttonLocked ? `Wait ${questionTimer}s for question to end` : ''}
        >
          {!quizStarted
            ? '▶ Start Quiz'
            : quizEnded
            ? '✓ Quiz ended'
            : buttonLocked
            ? `⏳ ${questionTimer}s`
            : isLastQ
            ? 'End Quiz ✓'
            : 'Next Question →'}
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="dbd-stats-row">
        <div className="dbd-stat-card">
          <div className="dbd-stat-label">Players</div>
          <div className="dbd-stat-value">{joinedPlayers.size}</div>
        </div>
        {quizStarted && !quizEnded && (
          <div className={`dbd-stat-card ${readyPlayers.size === joinedPlayers.size && joinedPlayers.size > 0 ? 'dbd-stat-card--ready-all' : 'dbd-stat-card--ready'}`}>
            <div className="dbd-stat-label">Ready</div>
            <div className="dbd-stat-value">
              {readyPlayers.size}
              <span className="dbd-stat-denom"> / {joinedPlayers.size}</span>
            </div>
          </div>
        )}
        <div className="dbd-stat-card dbd-stat-card--accent">
          <div className="dbd-stat-label">Avg Score</div>
          <div className="dbd-stat-value">{averageScore}</div>
        </div>
        <div className="dbd-stat-card">
          <div className="dbd-stat-label">Top Score</div>
          <div className="dbd-stat-value">{maxScore}</div>
        </div>
      </div>

      {/* ── Live Leaderboard (full width) ── */}
      <section className="dbd-panel dbd-leaderboard-panel">
        <div className="dbd-panel-header">
          <span className="dbd-panel-title">🏆 Live Leaderboard</span>
          <span className="dbd-panel-count">
            {leaderboard.length} player{leaderboard.length !== 1 ? 's' : ''}
          </span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="dbd-empty">
            <div className="dbd-empty-icon">📡</div>
            <div className="dbd-empty-text">Waiting for players to answer…</div>
          </div>
        ) : (
          <div className="dbd-lb-grid">
            {leaderboard.map((row, i) => {
              const barPct = maxScore > 0 ? (row.totalScore / maxScore) * 100 : 0;
              return (
                <div
                  key={row.playerName}
                  className={`dbd-lb-row ${i === 0 ? 'dbd-lb-row--first' : ''}`}
                  style={{ '--bar-pct': `${barPct}%` }}
                >
                  <span className="dbd-lb-rank">
                    {i < 3 ? MEDAL[i] : <span className="dbd-lb-rank-num">{i + 1}</span>}
                  </span>
                  {row.userId ? (
                    <Link className="dbd-lb-name dbd-profile-link" to={`/students/${row.userId}/performance`}>
                      {row.playerName} <span aria-hidden="true">↗</span>
                    </Link>
                  ) : (
                    <span className="dbd-lb-name">{row.playerName}</span>
                  )}
                  <span className="dbd-lb-score">{row.totalScore}</span>
                  <div className="dbd-lb-bar-wrap">
                    <div className="dbd-lb-bar" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Per-question accuracy chart (full width) ── */}
      <section className="dbd-panel dbd-chart-panel">
        <div className="dbd-panel-header">
          <span className="dbd-panel-title">📊 Per-Question Accuracy</span>
        </div>

        {questionStats.length === 0 || questionStats.every((s) => s.total === 0) ? (
          <div className="dbd-empty">
            <div className="dbd-empty-icon">📈</div>
            <div className="dbd-empty-text">No answers yet — chart will appear here.</div>
          </div>
        ) : (
          <div className="dbd-chart-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={questionStats}
                margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey={(d) => `Q${questionStats.indexOf(d) + 1}`}
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                />
                <Tooltip content={<QTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={56} background={{ fill: 'rgba(20, 184, 166, 0.15)', radius: [6, 6, 0, 0] }}>
                  {questionStats.map((entry) => (
                    <Cell
                      key={entry.questionId}
                      fill={
                        entry.pct >= 75
                          ? 'url(#barGreenGrad)'
                          : entry.pct >= 40
                          ? 'url(#barYellowGrad)'
                          : 'url(#barRedGrad)'
                      }
                    />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="barGreenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                  <linearGradient id="barYellowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="barRedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>

            <div className="dbd-chart-legend">
              <span className="dbd-legend-item dbd-legend-green">≥ 75% correct</span>
              <span className="dbd-legend-item dbd-legend-yellow">40–74%</span>
              <span className="dbd-legend-item dbd-legend-red">&lt; 40%</span>
            </div>

            <div className="dbd-q-index">
              {questionStats.map((s, i) => (
                <div key={s.questionId} className="dbd-q-index-row">
                  <span className="dbd-q-index-num">Q{i + 1}</span>
                  <span className="dbd-q-index-prompt">{s.prompt}</span>
                  <span className="dbd-q-index-pct">{s.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
