# CLAUDE.md — Wizard's Chess Coding Rules

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Wizard's Chess" — a full-stack, real-time multiplayer 3D chess web application set in the Harry Potter universe. Playable in-browser with no native install.

**Core features:** animated 3D wizard pieces (Three.js), house-themed boards, real-time matchmaking, spell-based special moves, AI opponent (Stockfish), spectator mode, persistent game history.

## Repo structure

```
wizard-chess/
├── client/          # Vite + React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── scenes/      # Three.js scene files
│   │   ├── hooks/
│   │   ├── stores/      # Zustand state
│   │   └── utils/
├── server/          # Node.js + Express backend
│   ├── src/
│   │   ├── rooms/       # Socket.io room logic
│   │   ├── engine/      # Stockfish wrapper
│   │   └── routes/      # REST API
├── shared/          # Types and constants shared by both
└── .github/
    └── workflows/   # CI/CD pipelines
```

## Tech stack (use exactly these, no substitutions)

- **Frontend:** React 18, Vite, Three.js r160, chess.js, Socket.io-client, Zustand, React Router v6
- **Backend:** Node.js 20 LTS, Express 5, Socket.io 4, Stockfish.js (WASM)
- **Database:** Supabase (Postgres + Auth + RLS)
- **Styling:** Tailwind CSS v3 (utility-first, no CSS modules)
- **Testing:** Vitest (unit), Playwright (E2E)
- **Deployment:** Vercel (client), Railway (server)
- **CI/CD:** GitHub Actions

## Phase execution

Work through these phases IN ORDER. Do not skip ahead. After each phase, run all existing tests and confirm they pass before starting the next phase.

### Phase 1 — Scaffolding ✅ COMPLETE

- npm workspaces monorepo (`client`, `server`, `shared`)
- Vite + React 18 + TypeScript client; Express 5 + Socket.io 4 + TypeScript server
- ESLint + Prettier + Husky pre-commit (lint-staged)
- GitHub Actions CI: `.github/workflows/ci.yml` — lint + vitest on push/PR
- `.env.example` with all required keys

### Phase 2 — 3D Board ✅ COMPLETE

- `client/src/scenes/ChessScene.tsx` — full Three.js scene (see Architecture below)
- `client/src/utils/chessCoords.ts` — `squareToXZ`, `indicesToSquare`, `isLightSquare`
- `client/src/utils/chessCoords.test.ts` — 13 passing unit tests
- `client/src/App.tsx` renders `<ChessScene />` full-screen
- `client/src/index.css` reset (no Vite defaults)
- All 14 tests pass · 0 TypeScript errors · production build succeeds

### Next: Phase 3 — GLTF piece models (replace BoxGeometry placeholders)

## Architecture (current)

### Coordinate system

`squareToXZ(sq)` → `[x, z]` world positions:

- File a→h maps to X: −3.5 → +3.5
- Rank 1→8 maps to Z: +3.5 → −3.5 (rank 1 nearest camera)
- Camera at `(0, 12, 10)` — white pieces on positive-Z side

### ChessScene data flow

```
chess.js (FEN) ──► reconcilePieces() ──► pieceMeshes Map<Square, PieceMesh>
                                                │
pointerdown ──► raycaster ──► selectedSquare   │
                              legalTargets[]    │
                                     │          │
                               chess.move() ───►│ + lerp animation (0.3 s parabolic arc)
```

### reconcilePieces(skipSquare)

Called after every `chess.move()`. Diffs `pieceMeshes` against `chess.board()` — handles castling rook teleport, en-passant pawn removal, and promotion without per-case logic. Pass the destination square as `skipSquare` so the in-flight lerp is not interrupted.

### PieceMesh cast pattern

Three.js types `userData` as `Record<string, any>`, so the narrower `PieceUserData` type requires a two-step cast: `new THREE.Mesh(...) as unknown as PieceMesh`.

### TypeScript narrowing in closures

`mountRef.current` (`HTMLDivElement | null`) loses narrowing inside named function declarations. Fix pattern used throughout:

```ts
const mount = mountRef.current;
if (!mount) return;
const el: HTMLDivElement = mount; // use `el` inside getClickedSquare / onResize
```

### Shared types (`shared/src/index.ts`)

`HouseName`, `GameRoom`, `MovePayload`, `SocketError`, `SOCKET_EVENTS` — imported by both client and server. Add all cross-boundary types here.

## TypeScript

- Strict mode throughout — no implicit `any`, no non-null assertions without an explanatory comment

## Three.js

- Dispose all geometries, materials, and textures inside `useEffect` cleanup functions to prevent memory leaks

## Socket.io

- Register Socket.io listeners exactly once per component lifecycle — always clean up with `off()` on unmount

## Supabase / Security

- All queries must respect Row Level Security — never use the service key from client-side code

## State Management

- Global state lives in Zustand stores only: `gameStore`, `houseStore`, `userStore`
- No prop drilling beyond 2 levels — use a store instead

## Chess Logic

- `chess.js` is the single source of truth — board visual state must always be derived from the chess.js FEN string
- Server validates every move independently — never trust client-reported move legality

## Animations & Timing

- All animations use `requestAnimationFrame` or `Three.js clock.getDelta()` — never use `setTimeout` for game logic

## Error Handling

- Every async function must be wrapped in `try/catch`
- Socket errors must be emitted as structured objects: `{ code, message }`

## Git Commits

- Format: `feat|fix|chore|test: short description`
- Never commit broken or non-running code — every commit must leave the app in a runnable state

<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool                        | Use when                                               |
| --------------------------- | ------------------------------------------------------ |
| `detect_changes`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context`        | Need source snippets for review — token-efficient      |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
