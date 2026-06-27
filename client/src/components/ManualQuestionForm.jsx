import { useState } from 'react';
import { LETTERS } from '../constants.js';

const STYLES = ['concept', 'tricky', 'funny'];

const defaultForm = {
  prompt: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
  style: 'concept',
  points: 10,
};

export default function ManualQuestionForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Add Question',
}) {
  const [form, setForm] = useState(() => {
    if (!initialValues) return { ...defaultForm, options: [...defaultForm.options] };
    // normalize incoming values so missing fields don't become undefined
    const normalized = {
      ...defaultForm,
      ...initialValues,
      options: Array.isArray(initialValues.options)
        ? [...initialValues.options]
        : [...defaultForm.options],
    };
    // ensure string fields are at least empty strings
    normalized.prompt = normalized.prompt ?? '';
    normalized.explanation = normalized.explanation ?? '';
    normalized.points = normalized.points ?? defaultForm.points;
    normalized.style = normalized.style ?? defaultForm.style;
    normalized.correctIndex = normalized.correctIndex ?? defaultForm.correctIndex;
    return normalized;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const setOption = (i, val) =>
    setForm((f) => {
      const options = [...f.options];
      options[i] = val;
      return { ...f, options };
    });

  const validate = () => {
    if (!((form.prompt || '').trim())) return 'Question prompt is required.';
    for (let i = 0; i < 4; i++) {
      if (!((form.options[i] || '').trim())) return `Option ${LETTERS[i]} cannot be empty.`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        prompt: (form.prompt || '').trim(),
        options: form.options.map((o) => (o || '').trim()),
        correctIndex: form.correctIndex,
        style: form.style,
        points: Number(form.points) || 10,
      };
      if ((form.explanation || '').trim()) payload.explanation = (form.explanation || '').trim();
      await onSubmit(payload);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="mform" onSubmit={handleSubmit} noValidate>
      <div className="mform-title">{submitLabel === 'Save Changes' ? 'Edit question' : 'Add a question'}</div>

      {error && <div className="mform-error">{error}</div>}

      <div className="mform-field">
        <label className="mform-label">Question prompt</label>
        <textarea
          className="mform-textarea"
          value={form.prompt}
          onChange={(e) => set('prompt', e.target.value)}
          placeholder="e.g. What does encapsulation mean in OOP?"
          rows={2}
          disabled={submitting}
        />
      </div>

      <div className="mform-field">
        <label className="mform-label">
          Options{' '}
          <span className="mform-optional">— click the radio to mark the correct answer</span>
        </label>
        <div className="mform-options">
          {LETTERS.map((letter, i) => (
            <div className="mform-option-row" key={i}>
              <input
                type="radio"
                name="correctIndex"
                checked={form.correctIndex === i}
                onChange={() => set('correctIndex', i)}
                disabled={submitting}
                aria-label={`Mark option ${letter} as correct`}
              />
              <span className="mform-opt-letter">{letter}</span>
              <input
                className="mform-input"
                value={form.options[i]}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${letter}`}
                disabled={submitting}
              />
            </div>
          ))}
        </div>
        <div className="mform-opt-hint">The selected radio = correct answer</div>
      </div>

      <div className="mform-field">
        <label className="mform-label">
          Explanation <span className="mform-optional">(optional)</span>
        </label>
        <textarea
          className="mform-textarea"
          value={form.explanation}
          onChange={(e) => set('explanation', e.target.value)}
          placeholder="Why is this the correct answer?"
          rows={2}
          disabled={submitting}
        />
      </div>

      <div className="mform-row">
        <div className="mform-field">
          <label className="mform-label">Style</label>
          <div className="style-toggles">
            {STYLES.map((s) => (
              <button
                key={s}
                type="button"
                className={`style-toggle ${form.style === s ? `active-${s}` : ''}`}
                onClick={() => set('style', s)}
                disabled={submitting}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="mform-field" style={{ flexBasis: '6rem', flexGrow: 0 }}>
          <label className="mform-label">Points</label>
          <input
            type="number"
            className="mform-pts-input"
            value={form.points}
            min={1}
            onChange={(e) => set('points', e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="mform-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting && <span className="spinner" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
