/**
 * aiQuizService.js
 *
 * Generates multiple-choice quiz questions using (in priority order):
 *   1. Gemini — if GEMINI_API_KEY is set  (free tier, google/generative-ai SDK)
 *   2. Groq   — if GROQ_API_KEY is set    (free tier, cloud, fast)
 *   3. Ollama — local fallback             (requires `ollama serve`)
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL   = 'gemini-2.0-flash';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL     = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.1-8b-instant';

const OLLAMA_URL   = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = 'llama3';

/* ── Zod schema ─────────────────────────────────────────────── */
const QuestionSchema = z.object({
  prompt:       z.string().min(1),
  options:      z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation:  z.string().min(1),
  style:        z.enum(['tricky', 'funny', 'concept']),
  points:       z.literal(10),
});

const QuizSchema = z.array(QuestionSchema);

/* ── Prompt builder ─────────────────────────────────────────── */
function buildPrompt(topic, notes, questionCount) {
  const styleGuide = `
Distribute the ${questionCount} questions roughly evenly across these styles:
- "concept": tests core understanding of the topic
- "tricky": a plausible-but-wrong distractor makes it easy to slip up
- "funny": uses humor or a light-hearted scenario while still being educational
`.trim();

  const notesSection = notes
    ? `\n\nAdditional context / class notes:\n${notes}`
    : '';

  return `You are a quiz generator. Generate exactly ${questionCount} multiple-choice quiz questions about the following topic.

Topic: ${topic}${notesSection}

${styleGuide}

Respond with ONLY a valid JSON array — no markdown, no explanation, no preamble. Each element must match this exact shape:
{
  "prompt": "<question text>",
  "options": ["<choice A>", "<choice B>", "<choice C>", "<choice D>"],
  "correctIndex": <0-3>,
  "explanation": "<why the correct answer is correct>",
  "style": "tricky" | "funny" | "concept",
  "points": 10
}`;
}

/* ── JSON fence stripper ────────────────────────────────────── */
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1].trim() : text.trim();
}

/* ── Validate & return parsed questions ─────────────────────── */
function validate(rawText, source) {
  let parsed;
  try {
    parsed = JSON.parse(extractJson(rawText));
  } catch {
    throw new Error(
      `${source} returned non-JSON output. Raw:\n${rawText?.slice(0, 500)}`
    );
  }

  const result = QuizSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Quiz response failed validation (${source}) — ${issues}`);
  }
  return result.data;
}

/* ── Gemini provider ────────────────────────────────────────── */
async function generateWithGemini(prompt) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (err) {
    // Surface rate-limit (429) and quota errors clearly
    const msg = err?.message ?? String(err);
    if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate')) {
      throw new Error(`Gemini rate limit / quota exceeded — try again shortly. (${msg})`);
    }
    throw new Error(`Gemini API error: ${msg}`);
  }

  const text = result.response?.text?.();
  if (!text) {
    const finishReason = result.response?.candidates?.[0]?.finishReason;
    throw new Error(`Gemini returned empty content (finishReason: ${finishReason ?? 'unknown'})`);
  }
  return text;
}

/* ── Groq provider ──────────────────────────────────────────── */
async function generateWithGroq(prompt) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 429) {
      throw new Error(`Groq rate limit exceeded — try again shortly. (${body})`);
    }
    throw new Error(`Groq responded with ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/* ── Ollama provider ────────────────────────────────────────── */
async function generateWithOllama(prompt) {
  let res;
  try {
    res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error('Ollama request timed out after 120 s — is it running?');
    }
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Ollama is unreachable at ${OLLAMA_URL} — run: ollama serve`);
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama responded with ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.response ?? '';
}

/* ── Public API ─────────────────────────────────────────────── */
/**
 * Generate quiz questions.
 * Provider priority: Gemini (GEMINI_API_KEY) → Groq (GROQ_API_KEY) → Ollama.
 *
 * @param {string}      topic         - Class topic
 * @param {string|null} notes         - Optional class notes
 * @param {number}      questionCount - How many questions
 * @returns {Promise<Array>} Validated question objects
 */
export async function generateQuiz(topic, notes, questionCount) {
  if (!topic?.trim())
    throw new Error('topic is required to generate a quiz');
  if (!Number.isInteger(questionCount) || questionCount < 1)
    throw new Error('questionCount must be a positive integer');

  const prompt = buildPrompt(topic, notes, questionCount);

  if (GEMINI_API_KEY) {
    let raw;
    try {
      raw = await generateWithGemini(prompt);
    } catch (err) {
      throw new Error(`Gemini generation failed: ${err.message}`);
    }
    return validate(raw, 'Gemini');
  }

  if (GROQ_API_KEY) {
    let raw;
    try {
      raw = await generateWithGroq(prompt);
    } catch (err) {
      throw new Error(`Groq generation failed: ${err.message}`);
    }
    return validate(raw, 'Groq');
  }

  // Ollama local fallback
  const raw = await generateWithOllama(prompt);
  return validate(raw, 'Ollama');
}

/**
 * Returns which AI provider is currently active.
 * Used by the health endpoint so hosts can see the status at a glance.
 */
export function activeProvider() {
  if (GEMINI_API_KEY) return 'gemini';
  if (GROQ_API_KEY)   return 'groq';
  return 'ollama';
}
