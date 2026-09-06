import { useEffect, useState } from 'react';
import api from '../api.js';
import ManualQuestionForm from './ManualQuestionForm.jsx';
import QuizQuestionCard from './QuizQuestionCard.jsx';

export default function PostClassQuizTab({ sessionId, sessionTopic, sessionNotes, isHost = false, onTopicUpdate }) {
  const [quiz, setQuiz] = useState(undefined);
  const [loadError, setLoadError] = useState(null);
  const [aiProvider, setAiProvider] = useState(null); // 'gemini' | 'groq' | 'ollama' | null

  const [showGenPanel, setShowGenPanel] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [customTopic, setCustomTopic] = useState(sessionTopic || '');
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    if (sessionTopic) setCustomTopic(sessionTopic);
  }, [sessionTopic]);

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
    const topicToUse = customTopic.trim() || sessionTopic?.trim();
    if (!topicToUse && !pdfFile) {
      setGenError('Please enter a topic or upload a PDF to generate questions.');
      return;
    }

    setGenerating(true);
    setGenError(null);
    try {
      if (topicToUse && topicToUse !== sessionTopic) {
        await api.patch(`/sessions/${sessionId}`, { topic: topicToUse });
        onTopicUpdate?.(topicToUse);
      }

      let res;
      if (pdfFile) {
        const formData = new FormData();
        formData.append('pdf', pdfFile);
        formData.append('questionCount', questionCount);
        res = await api.post(`/sessions/${sessionId}/generate-quiz/pdf`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post(`/sessions/${sessionId}/generate-quiz`, {
          questionCount: Number(questionCount) || 5,
        });
      }
      setQuiz(res.data);
      setShowGenPanel(false);
      setPdfFile(null);
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
          <div className="gen-panel-row" style={{ marginBottom: '0.875rem' }}>
            <span className="gen-count-label">Topic</span>
            <input
              type="text"
              className="gen-count-input"
              style={{ flex: 1, textAlign: 'left', padding: '0.5rem 0.75rem', width: 'auto' }}
              placeholder="e.g. Python Functions, World History, JavaScript Basics..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              disabled={generating}
            />
          </div>
          {sessionNotes && (
            <div className="gen-panel-hint" style={{ marginBottom: '0.875rem' }}>
              Notes: <strong>{sessionNotes.slice(0, 100)}{sessionNotes.length > 100 ? '…' : ''}</strong>
            </div>
          )}
          <div className="gen-panel-row" style={{ marginBottom: '0.875rem' }}>
            <span className="gen-count-label">PDF (optional)</span>
            <input 
              type="file" 
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
              disabled={generating}
              style={{ fontSize: '0.8125rem' }}
            />
          </div>
          <div className="gen-panel-row">
            <span className="gen-count-label">Questions</span>
            <input
              type="number"
              className="gen-count-input"
              min={1}
              max={20}
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              disabled={generating}
            />
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || (!customTopic.trim() && !sessionTopic && !pdfFile)}
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
        <div className="empty-state" style={{ padding: '2.5rem 1.5rem', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '1rem', marginTop: '1.25rem' }}>
          <div className="empty-state-icon" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
          <div className="empty-state-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Add Questions to your Quiz</div>
          <div className="empty-state-desc" style={{ maxWidth: '500px', margin: '0 auto 1.75rem auto', color: '#64748b' }}>
            Choose how you'd like to get started. Generate questions instantly with AI or write your own custom questions manually.
          </div>

          {isHost && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
              <button
                type="button"
                onClick={() => { setShowGenPanel(true); setShowManualForm(false); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '1.25rem',
                  background: '#ffffff',
                  border: '1.5px solid #0f766e',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>✨</span>
                  <span style={{ fontWeight: 700, color: '#0f766e', fontSize: '1rem' }}>Generate with AI</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                  Automatically generate multiple-choice questions from a topic, notes, or PDF.
                </p>
                <span className="btn btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8125rem', fontWeight: 600, marginTop: 'auto' }}>
                  Open AI Generator →
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setShowManualForm(true); setShowGenPanel(false); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '1.25rem',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>✍️</span>
                  <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>Add Manually</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.4 }}>
                  Write custom questions, set options A–D, choose the correct answer, and assign points.
                </p>
                <span className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.8125rem', fontWeight: 600, border: '1px solid #cbd5e1', marginTop: 'auto' }}>
                  + Add Question →
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
