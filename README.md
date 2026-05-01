# Wizard's Chess

A real-time, multiplayer 3D chess experience playable entirely in the browser — no install required.

Built with animated 3D wizard piece models, house-themed boards, spell-based special moves, an AI opponent powered by Stockfish, spectator mode, and persistent match history. Whether you're playing against a friend across the world or testing your skills against the engine, every move happens in a richly lit, atmospheric 3D scene.

---

## Features

- **3D animated pieces** rendered with Three.js and real-time lighting
- **House-themed boards** with unique color palettes and materials
- **AI opponent** powered by Stockfish WASM — multiple difficulty levels
- **Real-time multiplayer** via Socket.io with matchmaking rooms
- **Spell-based special moves** with particle effects
- **Spectator mode** — watch live games without joining
- **Persistent game history** backed by Supabase Postgres
- **Fully responsive** — desktop, tablet, and mobile

---

## Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Frontend   | React 18, Vite, Three.js r160, @react-three/fiber |
| Game logic | chess.js                                          |
| AI engine  | Stockfish.js (WASM)                               |
| Realtime   | Socket.io 4                                       |
| State      | Zustand                                           |
| Backend    | Node.js 20, Express 5                             |
| Database   | Supabase (Postgres + Auth + RLS)                  |
| Styling    | Tailwind CSS v3                                   |
| Deployment | Vercel (client) · Render (server)                 |
| CI/CD      | GitHub Actions                                    |

---

## Project Structure

```
wizard-chess/
├── client/               # Vite + React frontend
│   └── src/
│       ├── components/
│       ├── scenes/       # Three.js scene files
│       ├── hooks/
│       ├── stores/       # Zustand state
│       └── utils/
├── server/               # Node.js + Express backend
│   └── src/
│       ├── rooms/        # Socket.io room logic
│       ├── engine/       # Stockfish wrapper
│       └── routes/       # REST API
├── shared/               # Types and constants shared by client and server
└── .github/
    └── workflows/        # CI/CD pipelines
```

---

## Local Development

### Prerequisites

- Node.js 20 LTS or higher
- npm 9+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/asimkhan17790/harryPotterChess.git
cd harryPotterChess
npm install
```

### 2. Set up environment variables

**Client** — create `client/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

**Server** — create `server/.env`:

```env
PORT=3001
CLIENT_URL=http://localhost:5173
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Start the development servers

```bash
npm run dev
```

Starts both client (`http://localhost:5173`) and server (`http://localhost:3001`) concurrently.

---

## Environment Variables Reference

### Client (`client/.env`)

| Variable                 | Description                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | Supabase project URL — Project Settings → API in the Supabase dashboard                    |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key — safe to expose to the browser                                   |
| `VITE_API_URL`           | Backend server URL — `http://localhost:3001` for local dev, your Render URL for production |

### Server (`server/.env`)

| Variable               | Description                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `PORT`                 | Port the Express server listens on. Default: `3001`                                              |
| `CLIENT_URL`           | Frontend origin for CORS — `http://localhost:5173` for local dev, your Vercel URL for production |
| `SUPABASE_SERVICE_KEY` | Supabase service role key — **never expose to the client** — used for admin DB operations        |

---

## Getting your Supabase keys

1. Open your project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API**
3. Copy **Project URL** → `VITE_SUPABASE_URL`
4. Copy **anon / public** key → `VITE_SUPABASE_ANON_KEY`
5. Copy **service_role** key → `SUPABASE_SERVICE_KEY` (server only — treat as a password)

---

## Production Deployment

### Client — Vercel

Deploys automatically via GitHub Actions on every push to `main`.

Required GitHub Actions secrets:

| Secret                   | Description                                                             |
| ------------------------ | ----------------------------------------------------------------------- |
| `VERCEL_TOKEN`           | Vercel API token                                                        |
| `VERCEL_ORG_ID`          | Vercel org / team ID                                                    |
| `VERCEL_PROJECT_ID`      | Vercel project ID                                                       |
| `VITE_SUPABASE_URL`      | Supabase project URL                                                    |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key                                                       |
| `VITE_API_URL`           | Production server URL (e.g. `https://wizard-chess-server.onrender.com`) |

### Server — Render

Deploys automatically via a Render deploy hook triggered from GitHub Actions.

Required GitHub Actions secret:

| Secret                   | Description                                   |
| ------------------------ | --------------------------------------------- |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook URL for the server service |

Set `SUPABASE_SERVICE_KEY`, `PORT`, and `CLIENT_URL` directly in the Render dashboard under your service's environment settings.

---

## Available Scripts

| Command         | Description                                 |
| --------------- | ------------------------------------------- |
| `npm run dev`   | Start client and server in development mode |
| `npm run build` | Build client and server for production      |
| `npm run test`  | Run all tests (Vitest)                      |
| `npm run lint`  | Lint client and server source               |

---

## Manual Deployment (without CI)

```bash
# Build everything
npm run build

# Deploy client to Vercel
cd client
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod

# Trigger server redeploy on Render
curl -X POST "your-render-deploy-hook-url"
```

---

## License

MIT
