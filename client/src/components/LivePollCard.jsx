import { useState } from 'react';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function LivePollCard({ poll, isHost, myVote, onVote, onClose, onDelete }) {
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  const maxVotes = Math.max(...poll.options.map((opt) => opt.votes), 0);
  const showResults = isHost || myVote !== null || !poll.isOpen;
  const hasVoted = myVote !== null;

  async function handleVote(optionIndex) {
    if (voting || hasVoted || !poll.isOpen) return;
    setVoting(true);
    try {
      await onVote(poll._id, optionIndex);
    } finally {
      setVoting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this poll?')) return;
    setDeleting(true);
    try { await onDelete(poll._id); } catch { setDeleting(false); }
  }

  return (
    <div className={`poll-card ${poll.isOpen ? 'poll-card--open' : ''}`}>
      {/* Header */}
      <div className="poll-card-header">
        <div className="poll-card-question">{poll.question}</div>
        <div className="poll-card-badges">
          <span className={`poll-badge ${poll.isOpen ? 'poll-badge--open' : 'poll-badge--closed'}`}>
            {poll.isOpen ? '● Live' : 'Closed'}
          </span>
          <span className="poll-badge poll-badge--votes">
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Vote buttons (student, before voting) */}
      {!showResults && (
        <div className="poll-vote-options">
          {poll.options.map((opt, i) => (
            <button
              key={i}
              className="poll-vote-btn"
              onClick={() => handleVote(i)}
              disabled={voting}
            >
              <span className="poll-vote-btn-num">{i + 1}</span>
              <span>{opt.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Results bars */}
      {showResults && (
        <div className="poll-results">
          {poll.options.map((opt, i) => {
            const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
            const isWinner = !poll.isOpen && opt.votes === maxVotes && opt.votes > 0;
            const isMyVote = myVote === i;
            const barClass = isWinner
              ? 'poll-result-bar-bg--winner'
              : isMyVote
              ? 'poll-result-bar-bg--my-vote'
              : 'poll-result-bar-bg--default';

            return (
              <div key={i} className="poll-result-row">
                <div className={`poll-result-bar-bg ${barClass}`} style={{ width: `${pct}%` }} />
                <div className="poll-result-content">
                  <div className="poll-result-left">
                    <span className="poll-result-text">{opt.text}</span>
                    {isMyVote && <span className="poll-result-my-tag">Your vote</span>}
                  </div>
                  <div className="poll-result-right">
                    <span className="poll-result-votes">{opt.votes}</span>
                    <span className="poll-result-pct">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Voted confirmation */}
      {hasVoted && poll.isOpen && (
        <div className="poll-voted-hint">✅ Vote recorded — results update live</div>
      )}

      {/* Footer — host actions */}
      {isHost && (
        <div className="poll-card-footer">
          <span className="poll-card-time">{timeAgo(poll.createdAt)}</span>
          <div className="poll-card-actions">
            {poll.isOpen && (
              <button className="btn btn-ghost btn-sm" onClick={() => onClose(poll._id)}>
                Close voting
              </button>
            )}
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <span className="spinner" /> : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
