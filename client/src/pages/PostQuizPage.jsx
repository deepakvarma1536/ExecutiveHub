import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { getGuestId } from '../api.js';
import { LETTERS } from '../constants.js';
import '../quiz.css';
import '../post-quiz.css';

const TIMER_SECONDS = 10;
const TIMER_R = 20;
const CIRCUMFERENCE = 2 * Math.PI * TIMER_R;

function totalPossible(questions) {
  return questions.reduce((s, q) => s + (q.points ?? 10), 0);
}

function timerColor(t) {
  if (t > 6) return '#22c55e';
  if (t > 3) return '#f59e0b';
  return '#ef4444';
}

function TimerRing({ timeLeft, revealed }) {
  const color = revealed ? 'rgba(255,255,255,0.2)' : timerColor(timeLeft);
  const dash = CIRCUMFERENCE * (timeLeft / TIMER_SECONDS);
  return (
    <div className="pq-timer-ring">
      <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx="26" cy="26" r={TIMER_R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
        <circle
          cx="26" cy="26" r={TIMER_R}
          fill="none" stroke={color} strokeWidth="3.5"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE - dash}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
        />
      </svg>
      <span className="pq-timer-num" style={{ color }}>
        {revealed ? '—' : timeLeft}
      </span>
    </div>
  );
}

export default function PostQuizPage() {
  const { id: sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get('name') || 'Anonymous';

  const [quiz, setQuiz]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // 'waiting' = waiting for host to start/advance
  // 'quiz'    = question live, timer running
  // 'summary' = all questions done
  const [phase, setPhase]       = useState('waiting');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]   = useState([]);
  const [totalScore, setTotalScore] = useState(0);

  const [selected, setSelected]         = useState(null);
  const [locked, setLocked]             = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(null);
  const [revealed, setRevealed]         = useState(false);
  const [timeLeft, setTimeLeft]         = useState(TIMER_SECONDS);

  const socketRef = useRef(null);
  const quizRef   = useRef(null);
  useEffect(() => { quizRef.current = quiz; }, [quiz]);

  /* ── socket setup ────────────────────────────────────────── */
  useEffect(() => {
    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-session', sessionId);
      socket.emit('quiz-player-joined', { sessionId, playerName });
    });

    socket.on('quiz-question-start', ({ questionIndex }) => {
      const currentQuiz = quizRef.current;
      if (!currentQuiz) return;

      // Host ended the quiz after the last question
      if (questionIndex >= currentQuiz.questions.length) {
        // Fill in any unanswered questions before showing summary
        setAnswers(prev => {
          const filled = [...prev];
          while (filled.length < currentQuiz.questions.length) {
            const qi = filled.length;
            filled.push({
              questionId: currentQuiz.questions[qi]?._id ?? `skip-${qi}`,
              selectedIndex: -1,
              correct: false,
              pointsEarned: 0,
              timedOut: true,
              skipped: true,
              lockTimeLeft: null,
              responseTimeMs: TIMER_SECONDS * 1000,
            });
          }
          return filled;
        });
        setPhase('summary');
        return;
      }

      // Fill skipped answers if host jumped ahead
      setAnswers(prev => {
        const filled = [...prev];
        while (filled.length < questionIndex) {
          const qi = filled.length;
          filled.push({
            questionId: currentQuiz.questions[qi]?._id ?? `skip-${qi}`,
            selectedIndex: -1,
            correct: false,
            pointsEarned: 0,
            timedOut: true,
            skipped: true,
            lockTimeLeft: null,
            responseTimeMs: TIMER_SECONDS * 1000,
          });
        }
        return filled;
      });

      // Reset all per-question state atomically (React 18 batches these)
      setCurrentIdx(questionIndex);
      setPhase('quiz');
      setRevealed(false);
      setLocked(false);
      setSelected(null);
      setLockTimeLeft(null);
      setTimeLeft(TIMER_SECONDS);
    });

    return () => socket.disconnect();
  }, [sessionId, playerName]);

  /* ── fetch quiz ──────────────────────────────────────────── */
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/quiz/public`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Quiz not found for this session.' : `Error ${r.status}`);
        return r.json();
      })
      .then(data => { setQuiz(data); setLoading(false); })
      .catch(err => { setFetchError(err.message); setLoading(false); });
  }, [sessionId]);

  /* ── reset per question (safety net for direct currentIdx changes) ── */
  useEffect(() => {
    if (phase !== 'quiz') return;
    setTimeLeft(TIMER_SECONDS);
    setSelected(null);
    setLocked(false);
    setLockTimeLeft(null);
    setRevealed(false);
  }, [currentIdx, phase]);

  /* ── countdown (stops when revealed) ────────────────────── */
  useEffect(() => {
    if (phase !== 'quiz' || revealed || timeLeft <= 0 || !quiz) return;
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, revealed, quiz]);

  /* ── reveal when timer hits 0 ────────────────────────────── */
  useEffect(() => {
    if (timeLeft !== 0 || revealed || phase !== 'quiz' || !quiz) return;
    const q    = quiz.questions[currentIdx];
    const base = q.points ?? 10;

    const isCorrect = locked && selected !== null && selected === q.correctIndex;
    const pts = isCorrect
      ? Math.max(1, Math.round(base * (lockTimeLeft ?? 0) / TIMER_SECONDS))
      : 0;

    setRevealed(true);
    setTotalScore(s => s + pts);
    setAnswers(prev => [...prev, {
      questionId: q._id,
      selectedIndex: selected ?? -1,
      correct: isCorrect,
      pointsEarned: pts,
      timedOut: !locked,
      lockTimeLeft,
      responseTimeMs: Math.round((TIMER_SECONDS - (lockTimeLeft ?? 0)) * 1000),
    }]);

    socketRef.current?.emit('quiz-answer', {
      playerName,
      questionId: q._id,
      selectedIndex: selected ?? -1,
      correct: isCorrect,
      points: pts,
    });
    // Tell host this player has seen the result and is ready for next
    socketRef.current?.emit('quiz-player-ready', { sessionId, playerName });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, revealed, phase, quiz]);

  /* ── player selects an option ────────────────────────────── */
  function handleSelect(idx) {
    if (locked || revealed) return;
    setSelected(idx);
    setLocked(true);
    setLockTimeLeft(timeLeft);
  }

  /* ── loading / error ─────────────────────────────────────── */
  if (loading) return (
    <div className="pq-shell">
      <div className="pq-loading">
        <span className="spinner pq-spinner" />
        <span>Loading quiz…</span>
      </div>
    </div>
  );

  if (fetchError) return (
    <div className="pq-shell">
      <div className="pq-error-card">
        <div className="pq-error-icon">😕</div>
        <div className="pq-error-title">Quiz unavailable</div>
        <div className="pq-error-desc">{fetchError}</div>
      </div>
    </div>
  );

  if (phase === 'summary') {
    return <SummaryScreen quiz={quiz} answers={answers} totalScore={totalScore} playerName={playerName} />;
  }

  const questions    = quiz.questions;
  const q            = questions[currentIdx];
  const answerRecord = answers[currentIdx];
  const timedOut     = answerRecord?.timedOut;

  return (
    <div className="pq-shell">
      <div className="pq-card">
        {/* Progress bar */}
        <div className="pq-progress-wrap">
          <div className="pq-progress-bar"
            style={{ width: `${((currentIdx + (phase === 'quiz' && revealed ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>

        {/* ── Waiting for host to start/advance ── */}
        {phase === 'waiting' && (
          <div className="pq-waiting-host">
            <div className="pq-waiting-icon">⏳</div>
            <div className="pq-waiting-title">Waiting for host…</div>
            <div className="pq-waiting-sub">
              {currentIdx === 0
                ? 'The quiz will start soon. Get ready!'
                : 'Get ready for the next question!'}
            </div>
            <span className="spinner pq-spinner" style={{ display: 'block', margin: '1.25rem auto 0' }} />
          </div>
        )}

        {/* ── Active question ── */}
        {phase === 'quiz' && (
          <>
            {/* Header row: question number · badges · timer */}
            <div className="pq-card-header">
              <span className="pq-q-num">
                Question {currentIdx + 1} <span className="pq-q-of">/ {questions.length}</span>
              </span>
              <div className="pq-badges">
                {q.style && <span className={`badge badge-${q.style}`}>{q.style}</span>}
                <span className="badge badge-pts">⭐ {q.points ?? 10} pts</span>
              </div>
              <TimerRing timeLeft={timeLeft} revealed={revealed} />
            </div>

            {/* Question + options — hidden once player locks in */}
            {!locked && (
              <>
                <div className="pq-locked-hint pq-locked-hint--idle">
                  Choose your answer before the timer runs out
                </div>
                <p className="pq-prompt">{q.prompt}</p>
                <div className="pq-options" role="group" aria-label="Answer choices">
                  {q.options.map((opt, i) => (
                    <button
                      key={i}
                      className="pq-option pq-option--idle"
                      onClick={() => handleSelect(i)}
                      aria-pressed={selected === i}
                    >
                      <span className="pq-opt-letter">{LETTERS[i]}</span>
                      <span className="pq-opt-text">{opt}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Locked — waiting for timer to expire */}
            {locked && !revealed && (
              <div className="pq-locked-hint" style={{ margin: '1.5rem' }}>
                ✅ Answer locked in — waiting for timer…
              </div>
            )}

            {/* Revealed — show verdict, wait for host to continue */}
            {revealed && (
              <div className={`pq-feedback ${answerRecord?.correct ? 'pq-feedback--correct' : 'pq-feedback--wrong'}`}>
                <div className="pq-feedback-result">
                  {timedOut ? (
                    <>
                      <span className="pq-feedback-emoji">⏱️</span>
                      <span className="pq-feedback-verdict">Time's up!</span>
                    </>
                  ) : answerRecord?.correct ? (
                    <>
                      <span className="pq-feedback-emoji">🎉</span>
                      <span className="pq-feedback-verdict">Correct!</span>
                      {(answerRecord.lockTimeLeft ?? 0) >= 8 && (
                        <span className="pq-speed-badge">⚡ Fast!</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="pq-feedback-emoji">❌</span>
                      <span className="pq-feedback-verdict">Wrong answer</span>
                    </>
                  )}
                </div>
                {/* Host controls when next question starts — no button for players */}
                <div className="pq-host-waiting">
                  <span className="spinner pq-spinner" style={{ width: '0.875rem', height: '0.875rem', flexShrink: 0 }} />
                  Waiting for host to continue…
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Summary screen ─────────────────────────────────────────── */
function SummaryScreen({ quiz, answers, totalScore, playerName }) {
  const possible = totalPossible(quiz.questions);
  const pct = possible > 0 ? Math.round((totalScore / possible) * 100) : 0;
  const [submitStatus, setSubmitStatus] = useState('idle');
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitStatus('saving');
    api.post(`/quiz/${quiz._id}/submit`, {
        playerName,
        guestId: getGuestId(),
        answers: answers.map(a => ({
          questionId: a.questionId,
          selectedIndex: a.selectedIndex === -1 ? 0 : a.selectedIndex,
          correct: a.correct,
          points: a.pointsEarned,
          responseTimeMs: a.responseTimeMs ?? TIMER_SECONDS * 1000,
        })),
        totalScore,
      })
      .then(() => setSubmitStatus('saved'))
      .catch(() => setSubmitStatus('error'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grade =
    pct >= 90 ? { emoji: '🏆', label: 'Outstanding!' } :
    pct >= 75 ? { emoji: '🎯', label: 'Great job!' }   :
    pct >= 50 ? { emoji: '👍', label: 'Good effort!' } :
                { emoji: '📚', label: 'Keep learning!' };

  const correctCount = answers.filter(a => a.correct).length;

  return (
    <div className="pq-shell pq-summary-shell">
      <div className="pq-summary-hero">
        <div className="pq-summary-emoji">{grade.emoji}</div>
        <h1 className="pq-summary-title">{grade.label}</h1>
        <p className="pq-summary-name">{playerName}</p>
        <div className="pq-summary-score-ring">
          <span className="pq-summary-score-num">{totalScore}</span>
          <span className="pq-summary-score-denom">/ {possible}</span>
        </div>
        <div className="pq-summary-pct">{pct}% · {correctCount} / {quiz.questions.length} correct</div>
        {submitStatus === 'saving' && <div className="pq-submit-hint">⏳ Saving your result…</div>}
        {submitStatus === 'saved'  && <div className="pq-submit-hint">✅ Result saved</div>}
        {submitStatus === 'error'  && <div className="pq-submit-hint">⚠️ Could not save result</div>}
      </div>

      <div className="pq-summary-list">
        <div className="pq-summary-list-header">Question breakdown</div>
        {quiz.questions.map((q, i) => {
          const a            = answers[i];
          const correct      = a?.correct  ?? false;
          const timed        = a?.timedOut ?? true;
          const correctOpt   = q.options[q.correctIndex];
          const chosenOpt    = a && a.selectedIndex >= 0 ? q.options[a.selectedIndex] : null;
          const correctLabel = LETTERS[q.correctIndex];
          const chosenLabel  = a && a.selectedIndex >= 0 ? LETTERS[a.selectedIndex] : null;

          return (
            <div key={q._id} className={`pq-summary-row ${correct ? 'pq-summary-row--ok' : 'pq-summary-row--fail'}`}>
              <div className="pq-summary-q-header">
                <span className="pq-summary-icon">{timed ? '⏱️' : correct ? '✅' : '❌'}</span>
                <span className="pq-summary-row-num">Q{i + 1}</span>
                <span className="pq-summary-row-prompt">{q.prompt}</span>
                <span className={`pq-summary-pts ${correct ? 'pq-summary-pts--earned' : 'pq-summary-pts--zero'}`}>
                  {correct ? `+${a.pointsEarned}` : '+0'} pts
                </span>
              </div>

              <div className="pq-summary-opts">
                <div className="pq-summary-opt pq-summary-opt--correct">
                  <span className="pq-summary-opt-letter">{correctLabel}</span>
                  <span className="pq-summary-opt-text">{correctOpt}</span>
                  <span className="pq-summary-opt-tag pq-summary-opt-tag--correct">✓ Correct</span>
                </div>

                {!correct && chosenOpt && (
                  <div className="pq-summary-opt pq-summary-opt--wrong">
                    <span className="pq-summary-opt-letter">{chosenLabel}</span>
                    <span className="pq-summary-opt-text">{chosenOpt}</span>
                    <span className="pq-summary-opt-tag pq-summary-opt-tag--wrong">✕ Your answer</span>
                  </div>
                )}
                {timed && !chosenOpt && (
                  <div className="pq-summary-opt pq-summary-opt--timed">
                    <span className="pq-summary-opt-text" style={{ color: '#fde68a' }}>⏱️ Time ran out — no answer selected</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
