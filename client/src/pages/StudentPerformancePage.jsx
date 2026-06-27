import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDateTime } from '../utils.js';
import '../performance.css';

const formatNumber = (value, suffix = '') => value === null || value === undefined ? '—' : `${value}${suffix}`;
const formatSeconds = (milliseconds) => milliseconds === null || milliseconds === undefined
  ? '—'
  : `${(milliseconds / 1000).toFixed(2)}s`;

export default function StudentPerformancePage() {
  const { userId } = useParams();
  const profilePath = userId ? `/performance/${userId}` : '/performance/me';
  const attemptsPath = userId ? `/performance/${userId}/attempts` : null;
  const [profile, setProfile] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuth();

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const code = joinCode.trim().toUpperCase();
      const res = await api.get(`/sessions/join/${code}`);
      if (res.data && res.data._id) {
        navigate(`/sessions/${res.data._id}/join`, { state: { code } });
      }
    } catch (err) {
      alert('Invalid join code. Please try again.');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(profilePath)
      .then(async ({ data }) => {
        setProfile(data);
        const path = attemptsPath || `/performance/${data.student._id}/attempts`;
        const attemptResponse = await api.get(path, { params: { page, limit: 20 } });
        setAttempts(attemptResponse.data.items);
        setPagination(attemptResponse.data.pagination);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load student performance.'))
      .finally(() => setLoading(false));
  }, [attemptsPath, page, profilePath]);

  const timeline = useMemo(() => [...attempts].reverse().map((attempt, index) => ({
    attempt: index + 1,
    score: attempt.totalScore,
    date: formatDateTime(attempt.completedAt),
  })), [attempts]);
  const timeDistribution = profile?.metrics.responseTimeDistribution || [];

  if (loading && !profile) return <div className="perf-shell"><div className="perf-state">Loading performance…</div></div>;
  if (error) return <div className="perf-shell"><Link to="/home" className="page-back">← Back</Link><div className="page-error">{error}</div></div>;

  const { student, metrics } = profile;
  const cards = [
    ['Average score', formatNumber(metrics.averageScore)],
    ['Best score', formatNumber(metrics.bestScore)],
    ['Accuracy', formatNumber(metrics.accuracyPercent, '%')],
    ['Avg response', formatSeconds(metrics.averageResponseTimeMs)],
    ['Consistency', formatNumber(metrics.scoreStdDev), 'Score standard deviation'],
  ];

  return (
    <main className="perf-shell">
      {profilePath !== '/performance/me' && (
        <Link to="/home" className="page-back">← Back to dashboard</Link>
      )}

      {profilePath === '/performance/me' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <header className="perf-header" style={{ marginBottom: 0 }}>
            <div className="perf-avatar">{student.name?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <div className="perf-eyebrow">Student dashboard</div>
              <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem 0' }}>{student.name}</h1>
              <p style={{ margin: 0 }}>{student.email} · {metrics.attempts} attempt{metrics.attempts === 1 ? '' : 's'}</p>
            </div>
          </header>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input 
                type="text" 
                placeholder="Enter Join Code" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', outline: 'none', textTransform: 'uppercase' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={!joinCode.trim()}>
                Join Session
              </button>
            </form>
            <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              Sign out
            </button>
          </div>
        </div>
      )}

      {profilePath !== '/performance/me' && (
        <header className="perf-header">
          <div className="perf-avatar">{student.name?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <div className="perf-eyebrow">Student performance</div>
            <h1>{student.name}</h1>
            <p>{student.email} · {metrics.attempts} attempt{metrics.attempts === 1 ? '' : 's'}</p>
          </div>
        </header>
      )}

      <section className="perf-cards" aria-label="Performance summary">
        {cards.map(([label, value, title]) => (
          <div className="perf-card" key={label} title={title}>
            <span>{label}</span><strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className="perf-detail-strip">
        <span>Median response <strong>{formatSeconds(metrics.medianResponseTimeMs)}</strong></span>
        <span>90th percentile <strong>{formatSeconds(metrics.responseTimeP90Ms)}</strong></span>
        <span>CV <strong>{formatNumber(metrics.scoreCoefficientOfVariation)}</strong></span>
        <span>Efficiency <strong>{formatNumber(metrics.efficiency)}</strong></span>
      </section>

      <div className="perf-chart-grid">
        <section className="perf-panel">
          <h2>Score over time</h2>
          {timeline.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeline} margin={{ top: 12, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                <XAxis dataKey="attempt" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} />
                <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#c4b5fd' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="perf-empty">No attempts yet.</div>}
        </section>

        <section className="perf-panel">
          <h2>Response time distribution</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={timeDistribution} margin={{ top: 12, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8' }} />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8' }} />
              <Tooltip />
              <Bar dataKey="count" name="Answers" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="perf-panel perf-attempts">
        <div className="perf-panel-heading"><h2>Recent attempts</h2><span>{pagination?.total || 0} total</span></div>
        {attempts.length === 0 ? <div className="perf-empty">No attempts to show.</div> : (
          <div className="perf-table-wrap">
            <table>
              <thead><tr><th>Quiz</th><th>Date</th><th>Score</th><th>Accuracy</th><th>Avg response</th><th>Details</th></tr></thead>
              <tbody>{attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.sessionTitle}</td>
                  <td>{formatDateTime(attempt.completedAt)}</td>
                  <td>{attempt.totalScore}</td>
                  <td>{attempt.accuracyPercent}%</td>
                  <td>{formatSeconds(attempt.averageResponseTimeMs)}</td>
                  <td>
                    <details className="perf-attempt-details">
                      <summary>View</summary>
                      <div className="perf-question-list">
                        {attempt.answers.map((answer, index) => (
                          <div key={`${attempt.id}-${answer.questionId}`}>
                            <strong>Q{index + 1}</strong>
                            <span>{answer.prompt}</span>
                            <span className={answer.correct ? 'perf-correct' : 'perf-wrong'}>{answer.correct ? 'Correct' : 'Incorrect'}</span>
                            <span>{answer.points} pts · {formatSeconds(answer.responseTimeMs)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {pagination?.pages > 1 && (
          <div className="perf-pagination">
            <button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} of {pagination.pages}</span>
            <button disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        )}
      </section>
    </main>
  );
}
