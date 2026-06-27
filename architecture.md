# ExecutiveHub — Architecture

## Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Database     | MongoDB Atlas (Mongoose ODM)                    |
| API Server   | Node.js + Express 4 (ES modules)                |
| Real-time    | Socket.io 4 (server ↔ client bidirectional)     |
| Frontend     | React 18 + Vite 5                               |
| Auth         | JWT (jsonwebtoken) + bcryptjs                   |
| Routing      | react-router-dom v6 (client), Express (server)  |

---

## Folder Conventions

```
ExecutiveHub/
├── architecture.md          # This file
├── README.md
├── .gitignore
│
├── server/                  # Express API
│   ├── server.js            # Entry point — binds Express + Socket.io + MongoDB
│   ├── .env.example
│   └── src/
│       ├── config/
│       │   └── db.js        # Mongoose connection helper
│       ├── middleware/
│       │   ├── auth.js      # JWT protect middleware
│       │   └── errorHandler.js
│       ├── models/          # Mongoose schemas
│       │   ├── User.js
│       │   ├── Session.js
│       │   ├── Poll.js
│       │   └── Question.js
│       ├── routes/          # Express routers (one file per feature)
│       │   ├── auth.js
│       │   ├── sessions.js
│       │   ├── polls.js
│       │   ├── qa.js
│       │   └── analytics.js
│       └── controllers/     # Business logic extracted from routes
│
└── client/                  # React SPA
    ├── index.html
    ├── vite.config.js       # Dev proxy → :5002
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api/             # Axios instances & per-feature request helpers
        ├── socket/          # Socket.io client singleton + hooks
        ├── components/      # Shared UI components
        ├── features/        # Co-located feature slices
        │   ├── auth/
        │   ├── sessions/
        │   ├── polls/
        │   ├── wordcloud/
        │   ├── qa/
        │   └── analytics/
        ├── hooks/           # Custom React hooks
        ├── context/         # React context providers (Auth, Session)
        └── pages/           # Route-level page components
```

### Key conventions
- **ES modules everywhere** — both `server/` and `client/` use `"type": "module"`.
- **One route file per feature** in `server/src/routes/`; pair each with a controller in `server/src/controllers/`.
- **Socket events** are namespaced by feature: `poll:vote`, `poll:results`, `qa:new`, `qa:upvote`, `session:status`.
- **Client feature slices** (`src/features/<name>/`) contain their own components, hooks, and API calls — avoids god components.
- **Environment variables**: server reads from `server/.env`; client reads `VITE_*` vars from `client/.env`.

---

## TODO Checklist

### Auth
- [x] `POST /api/auth/register` — hash password, return JWT
- [x] `POST /api/auth/login` — verify password, return JWT
- [x] `GET  /api/auth/me` — return current user from token
- [x] `protect` middleware applied to all private routes (`authMiddleware.js`)
- [ ] Client: AuthContext, login/register forms, PrivateRoute wrapper

### Sessions
- [x] `POST /api/sessions` — create session, generate unique 6-char alphanumeric join code
- [x] `GET  /api/sessions` — list host's sessions (newest first)
- [x] `GET  /api/sessions/:id` — session detail + its questions sorted by position
- [x] `GET  /api/sessions/join/:joinCode` — public route to look up a session by join code
- [x] `POST /api/sessions/:id/questions` — add a question (poll / quiz / wordcloud) to a session
- [ ] `PATCH /api/sessions/:id/status` — flip `isLive` (start / end session)
- [ ] Socket event: `session:status` broadcast when host changes live state
- [ ] Client: session dashboard, join-by-code flow

### Questions / Polls / Word Cloud
> Polls, quiz questions, and word-cloud prompts are unified under the `Question` model
> (`type: 'poll' | 'quiz' | 'wordcloud'`, `options: [{text, votes}]`).
> The separate `/api/polls` and `/api/wordcloud` routes below may be omitted or kept as thin wrappers.

- [x] `Question` Mongoose model — `sessionId`, `type`, `prompt`, `options[]`, `position`
- [ ] `POST /api/polls/:id/vote` — increment `options[n].votes` (one vote per user)
- [ ] `PATCH /api/polls/:id/close` — lock voting
- [ ] Socket events: `poll:new`, `poll:vote`, `poll:closed` broadcast to session room
- [ ] Client: poll/quiz creator (presenter), live voting card (attendee)

### Live Results
- [ ] Real-time vote tally via Socket.io room broadcasts
- [ ] Animated bar/donut chart component (no external chart lib required — CSS or SVG)
- [ ] Results visible to presenter immediately; attendees see after poll closes (configurable)

### Word Cloud
- [ ] `POST /api/wordcloud` — submit a word/phrase for the active session
- [ ] Socket event: `wordcloud:update` sends updated frequency map to room
- [ ] Client: word-cloud renderer (canvas or SVG, weight by frequency)

### Q&A
- [ ] `POST /api/qa` — submit question (anonymous flag supported)
- [ ] `POST /api/qa/:id/upvote` — upvote (one per user)
- [ ] `PATCH /api/qa/:id/answer` — mark as answered (presenter only)
- [ ] Socket events: `qa:new`, `qa:upvote`, `qa:answered`
- [ ] Client: attendee question form, presenter moderation view, sorted question list

### Analytics
- [ ] `GET /api/analytics/session/:id` — aggregate poll responses, Q&A stats, attendance over time
- [ ] Client: post-session report page with charts and CSV export
