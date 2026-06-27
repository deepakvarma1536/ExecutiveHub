import { chromium } from './node_modules/playwright/index.mjs';

const SESSION_ID = '6676c1a0000000000000001a';

const MOCK_SESSION = {
  _id: SESSION_ID,
  title: 'Introduction to OOP',
  hostId: 'hostuser123',
  joinCode: 'AB12XY',
  isLive: false,
  topic: 'Object-Oriented Programming fundamentals',
  notes: 'Covered classes, objects, encapsulation, inheritance, and polymorphism.',
  endedAt: null,
  createdAt: new Date().toISOString(),
};

const MOCK_QUIZ = {
  _id: 'quiz001',
  sessionId: SESSION_ID,
  source: 'ai',
  generatedAt: new Date().toISOString(),
  questions: [
    {
      _id: 'q001',
      prompt: 'What does encapsulation mean in OOP?',
      options: ['Hiding internal state and exposing a public API', 'Sharing methods between classes', 'Creating multiple instances', 'Defining abstract blueprints'],
      correctIndex: 0,
      explanation: 'Encapsulation bundles data and methods together and hides the internal implementation from the outside world.',
      style: 'concept',
      points: 10,
    },
    {
      _id: 'q002',
      prompt: 'Which keyword defines a class in JavaScript?',
      options: ['function', 'struct', 'class', 'object'],
      correctIndex: 2,
      explanation: 'JavaScript uses the "class" keyword introduced in ES6.',
      style: 'tricky',
      points: 10,
    },
    {
      _id: 'q003',
      prompt: 'If "Cat" inherits from "Animal", Cat is a...',
      options: ['Sibling class', 'Subclass', 'Interface', 'Module'],
      correctIndex: 1,
      explanation: 'A class that inherits from another is called a subclass or child class.',
      style: 'funny',
      points: 10,
    },
  ],
};

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// Intercept all API calls
await page.route(`**/api/sessions/${SESSION_ID}`, (route) => {
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SESSION) });
});
await page.route(`**/api/sessions/${SESSION_ID}/quiz`, (route, req) => {
  if (req.method() === 'GET') {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_QUIZ) });
  } else {
    route.continue();
  }
});

// ── Screenshot 1: Details tab ──
await page.goto(`http://localhost:5173/sessions/${SESSION_ID}/edit`);
await page.waitForSelector('.tabs', { timeout: 10000 });
await page.screenshot({ path: '/tmp/ss_details.png', fullPage: true });
console.log('✓ Details tab');

// ── Screenshot 2: Quiz tab with AI questions ──
await page.click('.tab-btn:has-text("Post-Class Quiz")');
await page.waitForSelector('.q-card', { timeout: 8000 });
await page.screenshot({ path: '/tmp/ss_quiz_list.png', fullPage: true });
console.log('✓ Quiz tab — question list');

// ── Screenshot 3: Generate with AI panel ──
await page.click('.btn:has-text("Generate with AI")');
await page.waitForSelector('.gen-panel', { timeout: 3000 });
await page.screenshot({ path: '/tmp/ss_gen_panel.png', fullPage: true });
console.log('✓ Generate panel open');

// ── Screenshot 4: Ollama error state ──
// Override generate-quiz to return 502
await page.route(`**/api/sessions/${SESSION_ID}/generate-quiz`, (route) => {
  route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ message: "Ollama is not reachable — make sure it's running locally (ollama serve)." }) });
});
await page.click('.btn:has-text("Generate")');
await page.waitForSelector('.banner-error', { timeout: 6000 });
await page.screenshot({ path: '/tmp/ss_ollama_error.png', fullPage: true });
console.log('✓ Ollama error banner');

// ── Screenshot 5: Manual add form ──
await page.click('.banner-action');  // "Add manually instead →"
await page.waitForSelector('.mform', { timeout: 4000 });
await page.screenshot({ path: '/tmp/ss_manual_form.png', fullPage: true });
console.log('✓ Manual form open');

// Fill out the form
await page.fill('.mform textarea:first-of-type', 'What is polymorphism?');
const optionInputs = await page.locator('.mform-option-row input[type="text"]').all();
await optionInputs[0].fill('The ability of objects to take different forms');
await optionInputs[1].fill('Creating duplicate classes');
await optionInputs[2].fill('Hiding data from users');
await optionInputs[3].fill('Defining multiple constructors');
await page.locator('.mform-option-row input[type="radio"]').first().check();
await page.fill('.mform textarea:last-of-type', 'Polymorphism allows one interface to be used for different data types.');
await page.click('.style-toggle:has-text("concept")');
await page.screenshot({ path: '/tmp/ss_form_filled.png', fullPage: true });
console.log('✓ Manual form filled');

// ── Screenshot 6: Edit mode on a card ──
await page.route(`**/api/sessions/${SESSION_ID}/quiz/manual`, (route) => {
  const updatedQuiz = { ...MOCK_QUIZ, source: 'mixed', questions: [...MOCK_QUIZ.questions, { _id: 'q004', prompt: 'What is polymorphism?', options: ['The ability of objects to take different forms','Creating duplicate classes','Hiding data from users','Defining multiple constructors'], correctIndex: 0, explanation: 'Polymorphism allows one interface to be used for different data types.', style: 'concept', points: 10 }] };
  route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(updatedQuiz) });
});
await page.click('.mform .btn-primary');
await page.waitForSelector('.badge-mixed', { timeout: 5000 });
await page.screenshot({ path: '/tmp/ss_mixed_quiz.png', fullPage: true });
console.log('✓ Manual question added — mixed badge visible');

// Click edit on first card
await page.locator('.q-card').first().locator('.btn:has-text("Edit")').click();
await page.waitForSelector('.mform', { timeout: 3000 });
await page.screenshot({ path: '/tmp/ss_edit_mode.png', fullPage: true });
console.log('✓ Question edit mode');

await browser.close();
console.log('\nAll screenshots saved to /tmp/ss_*.png');
