# Deployment Plan — Wizard's Chess (Public Domain)

> Status: **PLANNED — not yet implemented**

## Architecture

```
Custom Domain (e.g. wizardschess.com)
        │
        ├── / → Vercel  (static SPA, CDN-served)
        │         └── /api/* → proxy rewrite → Railway server URL
        │
        └── wss://api.wizardschess.com → Railway  (Express + Socket.io)
```

## Files to Create / Edit

### 1. `client/vercel.json` (CREATE)

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://YOUR_RAILWAY_URL/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Vercel Dashboard settings: Root Directory = `client`, Build = `npm run build`, Output = `dist`, Node = 20.

### 2. `server/railway.json` (CREATE)

```json
{
  "$schema": "https://railway.app/railway-schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npm run build --workspace=shared && npm run build --workspace=server"
  },
  "deploy": {
    "startCommand": "node server/dist/index.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 3. `.github/workflows/deploy.yml` (CREATE)

Auto-deploy to Vercel + Railway on push to `main`.
Secrets needed: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RAILWAY_TOKEN`.

### 4. Socket.io client init (EDIT)

Wherever `io(...)` is called, read URL from env:

```ts
const SOCKET_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
const socket = io(SOCKET_URL, { ... });
```

## Environment Variables

| Service | Key                      | Value                     |
| ------- | ------------------------ | ------------------------- |
| Vercel  | `VITE_SUPABASE_URL`      | Supabase project URL      |
| Vercel  | `VITE_SUPABASE_ANON_KEY` | Supabase anon key         |
| Vercel  | `VITE_SERVER_URL`        | Railway server URL        |
| Railway | `PORT`                   | `3001`                    |
| Railway | `CLIENT_URL`             | Vercel domain             |
| Railway | `SUPABASE_URL`           | Supabase project URL      |
| Railway | `SUPABASE_SERVICE_KEY`   | Supabase service role key |

## Cost Estimate

| Service  | Free Tier                        |
| -------- | -------------------------------- |
| Vercel   | Free (hobby) — unlimited deploys |
| Railway  | $5 credit/mo free                |
| Supabase | Free (500MB DB)                  |
| Domain   | ~$10/yr                          |

**Minimum: ~$0–5/month**
