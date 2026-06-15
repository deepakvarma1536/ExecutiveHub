# ExecutiveHub

Real-time executive session platform — polls, live results, word cloud, and Q&A, built on the MERN stack with Socket.io.

## Prerequisites

- Node.js 20+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works fine)

---

## Quick Start

### 1. Clone & install

```bash
git clone <repo-url>
cd ExecutiveHub

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### 2. Configure environment variables

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env — set MONGODB_URI and JWT_SECRET

# Client
cp client/.env.example client/.env
# Edit client/.env if your API runs on a different port
```

### 3. Run in development

Open two terminals:

```bash
# Terminal 1 — API server (port 5002)
cd server && npm run dev

# Terminal 2 — React client (port 5173)
cd client && npm run dev
```

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:5002`, so no CORS issues during development.

### 4. Open the app

Navigate to [http://localhost:5173](http://localhost:5173).

---

## Project Structure

See [architecture.md](./architecture.md) for the full folder layout, naming conventions, Socket.io event catalogue, and feature TODO checklist.

---

## Available Scripts

| Location  | Script        | Description                        |
|-----------|---------------|------------------------------------|
| `server/` | `npm run dev` | Start server with nodemon (watch)  |
| `server/` | `npm start`   | Start server with node (prod)      |
| `client/` | `npm run dev` | Start Vite dev server              |
| `client/` | `npm run build` | Production build → `dist/`       |
| `client/` | `npm run preview` | Preview production build       |

---

## Environment Variables

### `server/.env`

| Variable        | Description                              | Required |
|-----------------|------------------------------------------|----------|
| `PORT`          | HTTP port (default `5002`)               | No       |
| `MONGODB_URI`   | MongoDB Atlas connection string          | Yes      |
| `JWT_SECRET`    | Secret for signing JWTs (≥32 chars)      | Yes      |
| `JWT_EXPIRES_IN`| Token TTL (default `7d`)                 | No       |
| `CLIENT_ORIGIN` | Allowed CORS origin (default `:5173`)    | No       |
| `NODE_ENV`      | `development` or `production`            | No       |

### `client/.env`

| Variable          | Description                       | Required |
|-------------------|-----------------------------------|----------|
| `VITE_API_URL`    | Base URL for REST calls           | No       |
| `VITE_SOCKET_URL` | Socket.io server URL              | No       |
