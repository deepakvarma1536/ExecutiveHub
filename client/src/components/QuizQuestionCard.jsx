import { useState } from 'react';
import ManualQuestionForm from './ManualQuestionForm.jsx';
import { LETTERS } from '../constants.js';

export default function QuizQuestionCard({ question, index, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (updates) => {
    await onEdit(question._id, updates);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove this question from the quiz?')) return;
    setDeleting(true);
    try {
      await onDelete(question._id);
    } catch {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <ManualQuestionForm
        key={question._id}
        initialValues={question}
        onSubmit={handleSave}
        onCancel={() => setEditing(false)}
        submitLabel="Save Changes"
      />
    );
  }

  return (
    <div className="q-card">
      <div className="q-card-header">
        <div className="q-card-left">
          <span className="q-num">Q{index + 1}</span>
          <span className={`badge badge-${question.style}`}>{question.style}</span>
          <span className="badge badge-pts">{question.points} pts</span>
        </div>
        {(onEdit || onDelete) && (
          <div className="q-actions">
            {onEdit && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(true)}
                disabled={deleting}
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <span className="spinner" /> : 'Delete'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="q-prompt">{question.prompt}</div>

      <div className="q-options">
        {question.options.map((opt, i) => (
          <div
            key={i}
            className={`q-option ${i === question.correctIndex ? 'correct' : 'wrong'}`}
          >
            <span className="q-opt-letter">{LETTERS[i]}</span>
            <span style={{ flex: 1 }}>{opt}</span>
            {i === question.correctIndex && <span className="q-opt-check">✓</span>}
          </div>
        ))}
      </div>

      {question.explanation && (
        <div className="q-explanation">
          <span className="q-explanation-label">Explanation: </span>
          {question.explanation}
        </div>
      )}
    </div>
  );
}
