import { useEffect, useState } from 'react';
import api from '../api.js';
import ManualQuestionForm from './ManualQuestionForm.jsx';
import QuizQuestionCard from './QuizQuestionCard.jsx';

export default function PostClassQuizTab({ sessionId, sessionTopic, sessionNotes, isHost = false }) {
  const [quiz, setQuiz] = useState(undefined);
  const [loadError, setLoadError] = useState(null);
  const [aiProvider, setAiProvider] = useState(null); // 'gemini' | 'groq' | 'ollama' | null

  const [showGenPanel, setShowGenPanel] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    api.get(`/sessions/${sessionId}/quiz`)
      .then((res) => setQuiz(res.data))
      .catch((err) => {
        if (err.response?.status === 404) setQuiz(null);
        else setLoadError(err.response?.data?.message || err.message);
      });
    // Fetch which AI provider is active (no auth needed)
    api.get('/health')
      .then(r => setAiProvider(r.data.aiProvider ?? null))
      .catch(() => {});
  }, [sessionId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await api.post(`/sessions/${sessionId}/generate-quiz`, {
        questionCount: Number(questionCount) || 5,
      });
      setQuiz(res.data);
      setShowGenPanel(false);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message;
      if (status === 502) {
        if (msg?.includes('timed out') || msg?.includes('timeout')) {
          setGenError('__timeout__');
        } else {
          setGenError(msg || 'AI generation returned an error. Try again in a moment.');
        }
      } else if (!err.response) {
        setGenError('Could not reach the server. Make sure the backend is running.');
      } else {
        setGenError(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleManualAdd = async (question) => {
    const res = await api.post(`/sessions/${sessionId}/quiz/manual`, {
      questions: [question],
    });
    setQuiz(res.data);
    setShowManualForm(false);
  };

  const handleEditQuestion = async (qId, updates) => {
    const res = await api.put(`/sessions/${sessionId}/quiz/questions/${qId}`, updates);
    setQuiz(res.data);
  };

  const handleDeleteQuestion = async (qId) => {
    const res = await api.delete(`/sessions/${sessionId}/quiz/questions/${qId}`);
    setQuiz(res.data);
  };

  const openManual = () => {
    setShowManualForm(true);
    setShowGenPanel(false);
    setGenError(null);
  };

  if (loadError) {
    return (
      <div className="banner banner-error">
        <strong>Could not load quiz</strong>
        {loadError}
      </div>
    );
  }

  if (quiz === undefined) {
    return <div className="page-loading"><span className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} /></div>;
  }

  const questions = quiz?.questions ?? [];

  return (
    <div>
      {/* Action bar — host only */}
      {isHost && (
        <div className="quiz-action-bar">
          <button
            className={`btn ${showGenPanel ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setShowGenPanel((v) => !v);
              setShowManualForm(false);
            }}
          >
            ✨ Generate with AI
          </button>
          <button
            className={`btn ${showManualForm ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              setShowManualForm((v) => !v);
              setShowGenPanel(false);
            }}
          >
            + Add manually
          </button>
        </div>
      )}

      {/* AI generate panel */}
      {isHost && showGenPanel && (
        <div className="gen-panel">
          <div className="gen-panel-title">
            Generate with AI
            {aiProvider && (
              <span style={{
                marginLeft: '0.625rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                background: aiProvider === 'gemini' ? '#fef9c3' : aiProvider === 'groq' ? '#ecfdf5' : '#f0f9ff',
                color: aiProvider === 'gemini' ? '#854d0e' : aiProvider === 'groq' ? '#059669' : '#0369a1',
                border: `1px solid ${aiProvider === 'gemini' ? '#fde68a' : aiProvider === 'groq' ? '#6ee7b7' : '#7dd3fc'}`,
              }}>
                {aiProvider === 'gemini' ? '✨ Gemini (cloud)' : aiProvider === 'groq' ? '⚡ Groq (cloud)' : '🖥 Ollama (local)'}
              </span>
            )}
          </div>
          {sessionTopic ? (
            <div className="gen-panel-hint">
              Topic: <strong>{sessionTopic}</strong>
              {sessionNotes && (
                <> · Notes: <strong>{sessionNotes.slice(0, 80)}{sessionNotes.length > 80 ? '…' : ''}</strong></>
              )}
            </div>
          ) : (
            <div className="banner banner-info" style={{ marginBottom: '0.875rem' }}>
              <strong>No topic set</strong>
              Add a topic to this session (Details tab) before generating.
            </div>
          )}
          <div className="gen-panel-row">
            <span className="gen-count-label">Questions</span>
            <input
              type="number"
              className="gen-count-input"
              min={1}
              max={20}
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              disabled={generating || !sessionTopic}
            />
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || !sessionTopic}
            >
              {generating && <span className="spinner" />}
              {generating ? 'Generating…' : 'Generate'}
            </button>
            {questions.length > 0 && !generating && (
              <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>
                Regenerating will replace existing AI questions
              </span>
            )}
          </div>
        </div>
      )}

      {/* AI error banner */}
      {isHost && genError && (
        <div className={`banner ${genError === '__timeout__' ? 'banner-info' : 'banner-error'}`}>
          {genError === '__timeout__' ? (
            <>
              <strong>⏳ Model is warming up</strong>
              The first generation may take a moment. Click retry — it should be faster now.
              <button className="banner-action" onClick={handleGenerate}>
                ↻ Retry generation
              </button>
            </>
          ) : (
            <>
              <strong>AI generation failed</strong>
              {genError}
              <button className="banner-action" onClick={openManual}>
                Add questions manually instead →
              </button>
            </>
          )}
        </div>
      )}

      {/* Manual add form */}
      {isHost && showManualForm && (
        <ManualQuestionForm
          onSubmit={handleManualAdd}
          onCancel={() => setShowManualForm(false)}
        />
      )}

      {/* Question list */}
      {questions.length > 0 ? (
        <>
          <div className="quiz-meta">
            <span className="quiz-meta-count">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
            <span className={`badge badge-${quiz.source}`}>{quiz.source}</span>
          </div>
          {questions.map((q, i) => (
            <QuizQuestionCard
              key={q._id}
              question={q}
              index={i}
              onEdit={isHost ? handleEditQuestion : null}
              onDelete={isHost ? handleDeleteQuestion : null}
            />
          ))}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-title">No questions yet</div>
          <div className="empty-state-desc">
            {isHost
              ? 'Generate questions with AI, or add them manually above.'
              : 'The host hasn\'t published a quiz for this session yet.'}
          </div>
        </div>
      )}
    </div>
  );
}
