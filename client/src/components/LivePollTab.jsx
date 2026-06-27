import { useCallback, useEffect, useRef, useState } from 'react';
import { createSocket } from '../socket.js';
import api, { getGuestId } from '../api.js';
import LivePollCard from './LivePollCard.jsx';
import '../poll.css';

export default function LivePollTab({ sessionId, isHost = false }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Track which polls the current user has voted on (pollId → optionIndex)
  const [myVotes, setMyVotes] = useState({});

  // Create-form state
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);

  const socketRef = useRef(null);
  const guestId = getGuestId();

  // ── Fetch polls ─────────────────────────────────────────────
  useEffect(() => {
    api
      .get(`/sessions/${sessionId}/polls`, { params: { guestId } })
      .then(({ data }) => {
        setPolls(data);
        const votes = {};
        for (const p of data) {
          if (p.myVote !== null) votes[p._id] = p.myVote;
        }
        setMyVotes(votes);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [sessionId, guestId]);

  // ── Socket listeners ────────────────────────────────────────
  const applyVoteUpdate = useCallback(({ pollId, options: opts, voterCount }) => {
    setPolls((prev) =>
      prev.map((p) =>
        p._id === pollId ? { ...p, options: opts, voterCount } : p
      )
    );
  }, []);

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join-session', sessionId));

    socket.on('poll-created', ({ poll }) => {
      setPolls((prev) => [poll, ...prev]);
    });

    socket.on('poll-vote-update', applyVoteUpdate);

    socket.on('poll-closed', ({ pollId, options: opts }) => {
      setPolls((prev) =>
        prev.map((p) => (p._id === pollId ? { ...p, isOpen: false, options: opts } : p))
      );
    });

    socket.on('poll-deleted', ({ pollId }) => {
      setPolls((prev) => prev.filter((p) => p._id !== pollId));
    });

    return () => socket.disconnect();
  }, [sessionId, applyVoteUpdate]);

  // ── Actions ─────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    const trimmedQ = question.trim();
    const trimmedOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!trimmedQ || trimmedOpts.length < 2) return;

    setCreating(true);
    try {
      await api.post(`/sessions/${sessionId}/polls`, {
        question: trimmedQ,
        options: trimmedOpts,
      });
      setQuestion('');
      setOptions(['', '']);
      setShowForm(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create poll');
    } finally {
      setCreating(false);
    }
  }

  async function handleVote(pollId, optionIndex) {
    const { data } = await api.post(`/sessions/${sessionId}/polls/${pollId}/vote`, {
      optionIndex,
      guestId,
    });
    setMyVotes((prev) => ({ ...prev, [pollId]: data.myVote }));
    applyVoteUpdate(data);
  }

  async function handleClose(pollId) {
    await api.patch(`/sessions/${sessionId}/polls/${pollId}/close`);
  }

  async function handleDelete(pollId) {
    await api.delete(`/sessions/${sessionId}/polls/${pollId}`);
  }

  // ── Option helpers ──────────────────────────────────────────
  function setOption(i, val) {
    setOptions((prev) => { const c = [...prev]; c[i] = val; return c; });
  }
  function removeOption(i) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, '']);
  }

  // ── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-loading">
        <span className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} />
      </div>
    );
  }

  if (error) {
    return <div className="banner banner-error"><strong>Error</strong> {error}</div>;
  }

  return (
    <div>
      {/* Action bar — host only */}
      {isHost && (
        <div className="poll-action-bar">
          <button
            className={`btn ${showForm ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? '✕ Cancel' : '📊 Create Poll'}
          </button>
        </div>
      )}

      {/* Create form */}
      {isHost && showForm && (
        <form className="poll-create-form" onSubmit={handleCreate}>
          <div className="poll-create-title">New live poll</div>

          <div className="poll-field">
            <label className="poll-label">Question</label>
            <input
              className="poll-input"
              placeholder="e.g. What topic should we cover next?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={creating}
              autoFocus
            />
          </div>

          <div className="poll-field">
            <div className="poll-options-header">
              <span className="poll-label" style={{ marginBottom: 0 }}>Options</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                {options.length}/6
              </span>
            </div>
            {options.map((opt, i) => (
              <div className="poll-option-row" key={i}>
                <span className="poll-option-num">{i + 1}</span>
                <input
                  className="poll-option-input"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value)}
                  disabled={creating}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    className="poll-remove-opt"
                    onClick={() => removeOption(i)}
                    disabled={creating}
                    title="Remove option"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button type="button" className="poll-add-opt" onClick={addOption} disabled={creating}>
                + Add option
              </button>
            )}
          </div>

          <div className="poll-create-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={creating}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating || !question.trim() || options.filter((o) => o.trim()).length < 2}
            >
              {creating && <span className="spinner" />}
              {creating ? 'Creating…' : 'Publish Poll'}
            </button>
          </div>
        </form>
      )}

      {/* Poll list */}
      {polls.length > 0 ? (
        <>
          <div className="poll-meta">
            <span className="poll-meta-count">
              {polls.length} poll{polls.length !== 1 ? 's' : ''}
            </span>
            <span>·</span>
            <span>{polls.filter((p) => p.isOpen).length} active</span>
          </div>
          {polls.map((poll) => (
            <LivePollCard
              key={poll._id}
              poll={poll}
              isHost={isHost}
              myVote={myVotes[poll._id] ?? poll.myVote ?? null}
              onVote={handleVote}
              onClose={handleClose}
              onDelete={handleDelete}
            />
          ))}
        </>
      ) : (
        <div className="poll-empty">
          <div className="poll-empty-icon">📊</div>
          <div className="poll-empty-title">No polls yet</div>
          <div className="poll-empty-desc">
            {isHost
              ? 'Create a live poll to engage your audience in real-time.'
              : 'The host hasn\'t created any polls for this session yet.'}
          </div>
        </div>
      )}
    </div>
  );
}
