<<<<<<< HEAD
# Graph Report - client/ (2026-06-10)

## Corpus Check

- 52 files · ~416,875 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 150 nodes · 157 edges · 39 communities detected
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- [[_COMMUNITY_Spell Particle Effects|Spell Particle Effects]]
- [[_COMMUNITY_Knight & Levitation Effects|Knight & Levitation Effects]]
- [[_COMMUNITY_Piece Factory & 3D Models|Piece Factory & 3D Models]]
- [[_COMMUNITY_Avada Kedavra Effect|Avada Kedavra Effect]]
- [[_COMMUNITY_Chess Scene & Coords|Chess Scene & Coords]]
- [[_COMMUNITY_Reducto Effect|Reducto Effect]]
- [[_COMMUNITY_UI Assets & Images|UI Assets & Images]]
- [[_COMMUNITY_Stockfish AI Engine|Stockfish AI Engine]]
- [[_COMMUNITY_Fiendfyre Effect|Fiendfyre Effect]]
- [[_COMMUNITY_Spring Physics|Spring Physics]]
- [[_COMMUNITY_GLTF Model Cache|GLTF Model Cache]]
- [[_COMMUNITY_Expecto Patronum Effect|Expecto Patronum Effect]]
- [[_COMMUNITY_Game Mode Selection|Game Mode Selection]]
- [[_COMMUNITY_House Selection UI|House Selection UI]]
- [[_COMMUNITY_Auth Button Component|Auth Button Component]]
- [[_COMMUNITY_Vite React Docs|Vite React Docs]]
- [[_COMMUNITY_App Entry Point|App Entry Point]]
- [[_COMMUNITY_AI Difficulty Config|AI Difficulty Config]]
- [[_COMMUNITY_Stockfish Hook|Stockfish Hook]]
- [[_COMMUNITY_Capture Effect Factory|Capture Effect Factory]]
- [[_COMMUNITY_HTML Entry Point|HTML Entry Point]]
- [[_COMMUNITY_Framework Brand Assets|Framework Brand Assets]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Stockfish Worker Script|Stockfish Worker Script]]
- [[_COMMUNITY_Utility Tests|Utility Tests]]
=======
# Graph Report - . (2026-05-30)

## Corpus Check

- Large corpus: 70 files · ~510,149 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary

- 241 nodes · 297 edges · 42 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.82)
- Token cost: 3,200 input · 2,100 output

## Community Hubs (Navigation)

- [[_COMMUNITY_Capture Effects & Particles|Capture Effects & Particles]]
- [[_COMMUNITY_Project Docs & Shared Types|Project Docs & Shared Types]]
- [[_COMMUNITY_UI Screens & UX Flow|UI Screens & UX Flow]]
- [[_COMMUNITY_Chess Architecture & Docs|Chess Architecture & Docs]]
- [[_COMMUNITY_Avada Kedavra Spell Effect|Avada Kedavra Spell Effect]]
- [[_COMMUNITY_3D Piece Geometry|3D Piece Geometry]]
- [[_COMMUNITY_Chess Coordinate Utils|Chess Coordinate Utils]]
- [[_COMMUNITY_Visual Assets|Visual Assets]]
- [[_COMMUNITY_Server Auth & Middleware|Server Auth & Middleware]]
- [[_COMMUNITY_Stockfish AI Engine|Stockfish AI Engine]]
- [[_COMMUNITY_Fiendfyre Spell Effect|Fiendfyre Spell Effect]]
- [[_COMMUNITY_Spring Physics|Spring Physics]]
- [[_COMMUNITY_GLTF Model Cache|GLTF Model Cache]]
- [[_COMMUNITY_Game Mode Selection|Game Mode Selection]]
- [[_COMMUNITY_House Selection|House Selection]]
- [[_COMMUNITY_Auth Middleware Tests|Auth Middleware Tests]]
- [[_COMMUNITY_Auth Button|Auth Button]]
- [[_COMMUNITY_Client Build Config|Client Build Config]]
- [[_COMMUNITY_App Entry Points|App Entry Points]]
- [[_COMMUNITY_AI Difficulty Mapping|AI Difficulty Mapping]]
- [[_COMMUNITY_Stockfish Hook|Stockfish Hook]]
- [[_COMMUNITY_Effects Index|Effects Index]]
- [[_COMMUNITY_Framework Logos|Framework Logos]]
- [[_COMMUNITY_Server Tests|Server Tests]]
- [[_COMMUNITY_Shared Types|Shared Types]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Stockfish Worker|Stockfish Worker]]
- [[_COMMUNITY_Test Utilities|Test Utilities]]
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))
- [[_COMMUNITY_Test Setup|Test Setup]]
- [[_COMMUNITY_Game State Store|Game State Store]]
- [[_COMMUNITY_House State Store|House State Store]]
- [[_COMMUNITY_User State Store|User State Store]]
- [[_COMMUNITY_Coord Unit Tests|Coord Unit Tests]]
- [[_COMMUNITY_Landing Page|Landing Page]]
- [[_COMMUNITY_Supabase Client|Supabase Client]]
<<<<<<< HEAD
- [[_COMMUNITY_Stockfish Worker TypeScript|Stockfish Worker TypeScript]]
- [[_COMMUNITY_Piece Character Profiles|Piece Character Profiles]]
- [[_COMMUNITY_Shared Types|Shared Types]]
- [[_COMMUNITY_Capture Sound Data|Capture Sound Data]]
- [[_COMMUNITY_Capture Animation Data|Capture Animation Data]]
- [[_COMMUNITY_House Themes Data|House Themes Data]]

## God Nodes (most connected - your core abstractions)

1. `prog()` - 10 edges
2. `createPieceGroup()` - 9 edges
3. `disposeMeshes()` - 7 edges
4. `mergeGroupToSingleMesh()` - 7 edges
5. `createParticleBurst()` - 6 edges
6. `KnightChargeEffect` - 6 edges
7. `createDebrisExplosion()` - 5 edges
8. `WingardiumLeviosaEffect` - 5 edges
9. `FiendfyreEffect` - 5 edges
10. `TransfigurationEffect` - 5 edges

## Surprising Connections (you probably didn't know these)

- `findKingSquare()` --calls--> `indicesToSquare()` [INFERRED]
  client/src/scenes/ChessScene.tsx → client/src/utils/chessCoords.ts
- `Wand decorative image — a detailed 3D-rendered silver/metallic wizard wand with ornate bulbous sections along its shaft, depicted diagonally on a white background; used as a decorative or UI asset for the Harry Potter chess theme` --shares_theme_with--> `Hogwarts castle background image — a dramatic cinematic photograph or render of Hogwarts castle at night, illuminated from within against a dark moody sky with a full moon; the castle sits on rocky cliffs beside a lake with a small boat visible; used as a full-screen background for the Harry Potter chess application` [INFERRED]
  client/public/wand.webp → client/src/assets/hogwarts_BG.png
- `Wand cursor SVG icon — a 48x48 stylized wizard wand drawn diagonally from bottom-right (gold pommel and binding rings) to top-left (glowing tip with sparkle cross); dark wooden shaft with gold accents; intended as a custom mouse cursor for the Harry Potter chess app` --stylized_version_of--> `Wand decorative image — a detailed 3D-rendered silver/metallic wizard wand with ornate bulbous sections along its shaft, depicted diagonally on a white background; used as a decorative or UI asset for the Harry Potter chess theme` [INFERRED]
  client/public/wand-cursor.svg → client/public/wand.webp
- `Wand cursor SVG icon — a 48x48 stylized wizard wand drawn diagonally from bottom-right (gold pommel and binding rings) to top-left (glowing tip with sparkle cross); dark wooden shaft with gold accents; intended as a custom mouse cursor for the Harry Potter chess app` --shares_theme_with--> `Hogwarts castle background image — a dramatic cinematic photograph or render of Hogwarts castle at night, illuminated from within against a dark moody sky with a full moon; the castle sits on rocky cliffs beside a lake with a small boat visible; used as a full-screen background for the Harry Potter chess application` [INFERRED]
  client/public/wand-cursor.svg → client/src/assets/hogwarts_BG.png
- `Wand cursor PNG — a small rasterized version of the wand cursor image showing the same metallic ornate wizard wand depicted diagonally; used as a fallback PNG cursor asset` --raster_version_of--> `Wand cursor SVG icon — a 48x48 stylized wizard wand drawn diagonally from bottom-right (gold pommel and binding rings) to top-left (glowing tip with sparkle cross); dark wooden shaft with gold accents; intended as a custom mouse cursor for the Harry Potter chess app` [INFERRED]
  client/public/wand-cursor.png → client/public/wand-cursor.svg

## Communities

### Community 0 - "Spell Particle Effects"

Cohesion: 0.14
Nodes (7): advanceBolt(), clamp(), createDebrisExplosion(), createParticleBurst(), prog(), QueenSwordEffect, TransfigurationEffect

### Community 1 - "Knight & Levitation Effects"

Cohesion: 0.18
Nodes (3): disposeMeshes(), KnightChargeEffect, WingardiumLeviosaEffect

### Community 2 - "Piece Factory & 3D Models"

Cohesion: 0.36
Nodes (10): addQueenCrown(), buildBishopGroup(), buildKingGroup(), buildKnightGroup(), buildLatheGeometry(), buildPawnGroup(), buildRookGroup(), createPieceGroup() (+2 more)

### Community 3 - "Avada Kedavra Effect"

Cohesion: 0.18
Nodes (2): AvadaKedavraEffect, saveDisplayName()

### Community 4 - "Chess Scene & Coords"

Cohesion: 0.25
Nodes (2): indicesToSquare(), findKingSquare()

### Community 5 - "Reducto Effect"

Cohesion: 0.29
Nodes (2): createBolt(), ReductoEffect

### Community 6 - "UI Assets & Images"
=======
- [[_COMMUNITY_Stockfish Worker TS|Stockfish Worker TS]]
- [[_COMMUNITY_Piece Profiles|Piece Profiles]]
- [[_COMMUNITY_Effects Types|Effects Types]]
- [[_COMMUNITY_Capture Sounds|Capture Sounds]]
- [[_COMMUNITY_Capture Animations|Capture Animations]]
- [[_COMMUNITY_House Themes|House Themes]]

## God Nodes (most connected - your core abstractions)

1. `client/ (Vite + React frontend)` - 14 edges
2. `prog()` - 10 edges
3. `Design Theme: Dark Magical / Hogwarts Aesthetic (dark navy, gold, orange accents)` - 10 edges
4. `createPieceGroup()` - 9 edges
5. `server/ (Node.js + Express backend)` - 9 edges
6. `Wizard's Chess Project (CLAUDE.md)` - 9 edges
7. `Mobile Landscape Game Mode Selection Screen` - 9 edges
8. `The Sorcerer's Board (Project)` - 8 edges
9. `ChessScene.tsx (Three.js scene)` - 8 edges
10. `Mobile 375px Game Mode Selection Screen` - 8 edges

## Surprising Connections (you probably didn't know these)

- `The Sorcerer's Board (Project)` --same_as--> `Wizard's Chess Project (CLAUDE.md)` [INFERRED]
  README.md → CLAUDE.md
- `client/index.html (entry point)` --belongs_to--> `client/ (Vite + React frontend)` [INFERRED]
  client/index.html → README.md
- `Desktop Landing / House Selection Screen` --rendered_at--> `Viewport: Desktop 1280px` [INFERRED]
  landing.png → desktop-1280-chess-board.png
- `Game Mode: The Oracle (AI Opponent)` --leads_to--> `UI Component: 3D Chess Board (Three.js Scene)` [INFERRED]
  mobile-landscape-game-mode.png → desktop-1280-chess-board.png
- `UI Component: Rotate Device Orientation Prompt` --triggered_by--> `Viewport: Mobile 375px Portrait` [INFERRED]
  mobile-375-landing.png → mobile-375-game-mode.png

## Communities

### Community 0 - "Capture Effects & Particles"

Cohesion: 0.07
Nodes (11): advanceBolt(), clamp(), createDebrisExplosion(), createParticleBurst(), disposeMeshes(), prog(), ExpectoPatronumEffect, KnightChargeEffect (+3 more)

### Community 1 - "Project Docs & Shared Types"

Cohesion: 0.07
Nodes (32): GameRoom (shared type), HouseName (shared type), MovePayload (shared type), Rationale: RLS + no service key on client, Rationale: Socket.io listener cleanup on unmount, shared/src/index.ts (shared types), SOCKET_EVENTS (shared constants), SocketError (shared type) (+24 more)

### Community 2 - "UI Screens & UX Flow"

Cohesion: 0.19
Nodes (27): Background: Hogwarts Castle at Night (atmospheric 3D scene), Mobile Carousel House Selection — First Card (Gryffindor), Desktop 1280px Chess Board Game Screen, Feature: Change House Navigation Action, Feature: Sign In with Google (Auth), Game Mode: The Oracle (AI Opponent), Game Mode: Two Wizards (Local 2-Player Offline), Hogwarts House: Gryffindor (+19 more)

### Community 3 - "Chess Architecture & Docs"

Cohesion: 0.11
Nodes (23): ChessScene.tsx (Three.js scene), chessCoords.ts (utility), gameStore (Zustand store), houseStore (Zustand store), indicesToSquare() (function), isLightSquare() (function), Phase 1 - Scaffolding (COMPLETE), Phase 2 - 3D Board (COMPLETE) (+15 more)

### Community 4 - "Avada Kedavra Spell Effect"

Cohesion: 0.11
Nodes (4): AvadaKedavraEffect, createBolt(), saveDisplayName(), ReductoEffect

### Community 5 - "3D Piece Geometry"

Cohesion: 0.36
Nodes (10): addQueenCrown(), buildBishopGroup(), buildKingGroup(), buildKnightGroup(), buildLatheGeometry(), buildPawnGroup(), buildRookGroup(), createPieceGroup() (+2 more)

### Community 6 - "Chess Coordinate Utils"

Cohesion: 0.25
Nodes (2): indicesToSquare(), findKingSquare()

### Community 7 - "Visual Assets"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 0.38
Nodes (7): Favicon SVG — a lightning bolt / power symbol shape filled with vibrant purple (#863bff) with internal glowing highlight ellipses in lighter purple and blue; rendered at 48x46; used as the browser tab icon for the Wizard's Chess app, Hero section illustration — an isometric 3D render of two stacked rounded-square platform/card shapes; the top card is white/glass with a subtle outline, the bottom card is filled with a rich purple gradient with reflective highlights; likely used as a hero graphic or feature illustration on the landing page, Hogwarts castle background image — a dramatic cinematic photograph or render of Hogwarts castle at night, illuminated from within against a dark moody sky with a full moon; the castle sits on rocky cliffs beside a lake with a small boat visible; used as a full-screen background for the Harry Potter chess application, SVG sprite sheet containing five social/UI icons: Bluesky bird logo, Discord game controller logo, a documentation/code icon (purple, depicts a document with code brackets), GitHub Octocat logo, a social/user-profile icon (purple, person with star badge), and an X (formerly Twitter) logo; all rendered in dark fill or purple stroke styles, Wand cursor SVG icon — a 48x48 stylized wizard wand drawn diagonally from bottom-right (gold pommel and binding rings) to top-left (glowing tip with sparkle cross); dark wooden shaft with gold accents; intended as a custom mouse cursor for the Harry Potter chess app, Wand cursor PNG — a small rasterized version of the wand cursor image showing the same metallic ornate wizard wand depicted diagonally; used as a fallback PNG cursor asset, Wand decorative image — a detailed 3D-rendered silver/metallic wizard wand with ornate bulbous sections along its shaft, depicted diagonally on a white background; used as a decorative or UI asset for the Harry Potter chess theme

<<<<<<< HEAD
### Community 7 - "Stockfish AI Engine"
=======
### Community 8 - "Server Auth & Middleware"

Cohesion: 0.4
Nodes (0):

### Community 9 - "Stockfish AI Engine"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 0.33
Nodes (0):

<<<<<<< HEAD
### Community 8 - "Fiendfyre Effect"
=======
### Community 10 - "Fiendfyre Spell Effect"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 0.4
Nodes (1): FiendfyreEffect

<<<<<<< HEAD
### Community 9 - "Spring Physics"
=======
### Community 11 - "Spring Physics"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 0.4
Nodes (1): Spring

<<<<<<< HEAD
### Community 10 - "GLTF Model Cache"
=======
### Community 12 - "GLTF Model Cache"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 0.4
Nodes (0):

<<<<<<< HEAD
### Community 11 - "Expecto Patronum Effect"

Cohesion: 0.4
Nodes (1): ExpectoPatronumEffect

### Community 12 - "Game Mode Selection"
=======
### Community 13 - "Game Mode Selection"

Cohesion: 0.5
Nodes (0):

### Community 14 - "House Selection"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 0.5
Nodes (0):

<<<<<<< HEAD
### Community 13 - "House Selection UI"

Cohesion: 0.5
Nodes (0):

### Community 14 - "Auth Button Component"
=======
### Community 15 - "Auth Middleware Tests"

Cohesion: 0.67
Nodes (0):

### Community 16 - "Auth Button"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 0.67
Nodes (0):

<<<<<<< HEAD
### Community 15 - "Vite React Docs"
=======
### Community 17 - "Client Build Config"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 0.67
Nodes (3): Vite + React + TypeScript template (client/README.md), @vitejs/plugin-react (Oxc), @vitejs/plugin-react-swc (SWC)

<<<<<<< HEAD
### Community 16 - "App Entry Point"
=======
### Community 18 - "App Entry Points"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 17 - "AI Difficulty Config"
=======
### Community 19 - "AI Difficulty Mapping"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 18 - "Stockfish Hook"
=======
### Community 20 - "Stockfish Hook"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 19 - "Capture Effect Factory"
=======
### Community 21 - "Effects Index"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 20 - "HTML Entry Point"

Cohesion: 1.0
Nodes (2): client/index.html (entry point), client/src/main.tsx (app entry script)

### Community 21 - "Framework Brand Assets"

Cohesion: 1.0
Nodes (2): React framework logo SVG — the official React atom/orbital logo rendered in cyan/aqua (#00D8FF) with the characteristic three elliptical orbits and central circle; used as a framework branding asset, Vite build tool logo SVG — depicts the official Vite lightning bolt icon in purple (#9135ff) with internal glow effects, flanked by parentheses characters; the title element identifies it as 'Vite'; used as a framework branding asset

### Community 22 - "ESLint Config"
=======
### Community 22 - "Framework Logos"

Cohesion: 1.0
Nodes (2): React framework logo SVG — the official React atom/orbital logo rendered in cyan/aqua (#00D8FF) with the characteristic three elliptical orbits and central circle; used as a framework branding asset, Vite build tool logo SVG — depicts the official Vite lightning bolt icon in purple (#9135ff) with internal glow effects, flanked by parentheses characters; the title element identifies it as 'Vite'; used as a framework branding asset

### Community 23 - "Server Tests"

Cohesion: 1.0
Nodes (0):

### Community 24 - "Shared Types"

Cohesion: 1.0
Nodes (0):

### Community 25 - "ESLint Config"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 23 - "Vite Config"
=======
### Community 26 - "Vite Config"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 24 - "Stockfish Worker Script"
=======
### Community 27 - "Stockfish Worker"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 25 - "Utility Tests"
=======
### Community 28 - "Test Utilities"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 26 - "Test Setup"
=======
### Community 29 - "Test Setup"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 27 - "Game State Store"
=======
### Community 30 - "Game State Store"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 28 - "House State Store"
=======
### Community 31 - "House State Store"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 29 - "User State Store"
=======
### Community 32 - "User State Store"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 30 - "Coord Unit Tests"
=======
### Community 33 - "Coord Unit Tests"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 31 - "Landing Page"
=======
### Community 34 - "Landing Page"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 32 - "Supabase Client"
=======
### Community 35 - "Supabase Client"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 33 - "Stockfish Worker TypeScript"
=======
### Community 36 - "Stockfish Worker TS"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 34 - "Piece Character Profiles"
=======
### Community 37 - "Piece Profiles"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 35 - "Shared Types"
=======
### Community 38 - "Effects Types"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 36 - "Capture Sound Data"
=======
### Community 39 - "Capture Sounds"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 37 - "Capture Animation Data"
=======
### Community 40 - "Capture Animations"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

<<<<<<< HEAD
### Community 38 - "House Themes Data"
=======
### Community 41 - "House Themes"
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))

Cohesion: 1.0
Nodes (0):

## Knowledge Gaps

<<<<<<< HEAD
- **8 isolated node(s):** `client/index.html (entry point)`, `client/src/main.tsx (app entry script)`, `@vitejs/plugin-react (Oxc)`, `@vitejs/plugin-react-swc (SWC)`, `SVG sprite sheet containing five social/UI icons: Bluesky bird logo, Discord game controller logo, a documentation/code icon (purple, depicts a document with code brackets), GitHub Octocat logo, a social/user-profile icon (purple, person with star badge), and an X (formerly Twitter) logo; all rendered in dark fill or purple stroke styles` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `App Entry Point`** (2 nodes): `App.tsx`, `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Difficulty Config`** (2 nodes): `difficultyMapping.ts`, `difficultyToConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stockfish Hook`** (2 nodes): `useStockfish.ts`, `useStockfish()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Capture Effect Factory`** (2 nodes): `index.ts`, `createCaptureEffect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HTML Entry Point`** (2 nodes): `client/index.html (entry point)`, `client/src/main.tsx (app entry script)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Framework Brand Assets`** (2 nodes): `React framework logo SVG — the official React atom/orbital logo rendered in cyan/aqua (#00D8FF) with the characteristic three elliptical orbits and central circle; used as a framework branding asset`, `Vite build tool logo SVG — depicts the official Vite lightning bolt icon in purple (#9135ff) with internal glow effects, flanked by parentheses characters; the title element identifies it as 'Vite'; used as a framework branding asset`
=======
- **42 isolated node(s):** `React 18`, `Vite`, `@react-three/fiber`, `Stockfish.js (WASM)`, `Node.js 20` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `App Entry Points`** (2 nodes): `App.tsx`, `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Difficulty Mapping`** (2 nodes): `difficultyMapping.ts`, `difficultyToConfig()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stockfish Hook`** (2 nodes): `useStockfish.ts`, `useStockfish()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Effects Index`** (2 nodes): `index.ts`, `createCaptureEffect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Framework Logos`** (2 nodes): `React framework logo SVG — the official React atom/orbital logo rendered in cyan/aqua (#00D8FF) with the characteristic three elliptical orbits and central circle; used as a framework branding asset`, `Vite build tool logo SVG — depicts the official Vite lightning bolt icon in purple (#9135ff) with internal glow effects, flanked by parentheses characters; the title element identifies it as 'Vite'; used as a framework branding asset`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Server Tests`** (1 nodes): `index.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Types`** (1 nodes): `index.ts`
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Config`** (1 nodes): `eslint.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
<<<<<<< HEAD
- **Thin community `Stockfish Worker Script`** (1 nodes): `stockfish-worker.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utility Tests`** (1 nodes): `utils.test.ts`
=======
- **Thin community `Stockfish Worker`** (1 nodes): `stockfish-worker.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Utilities`** (1 nodes): `utils.test.ts`
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Setup`** (1 nodes): `setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Game State Store`** (1 nodes): `gameStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `House State Store`** (1 nodes): `houseStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `User State Store`** (1 nodes): `userStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Coord Unit Tests`** (1 nodes): `chessCoords.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Landing Page`** (1 nodes): `LandingPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Supabase Client`** (1 nodes): `supabaseClient.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
<<<<<<< HEAD
- **Thin community `Stockfish Worker TypeScript`** (1 nodes): `stockfish.worker.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Piece Character Profiles`** (1 nodes): `chessPieceProfiles.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Types`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Capture Sound Data`** (1 nodes): `captureSounds.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Capture Animation Data`** (1 nodes): `captureAnimations.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `House Themes Data`** (1 nodes): `houseThemes.ts`
=======
- **Thin community `Stockfish Worker TS`** (1 nodes): `stockfish.worker.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Piece Profiles`** (1 nodes): `chessPieceProfiles.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Effects Types`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Capture Sounds`** (1 nodes): `captureSounds.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Capture Animations`** (1 nodes): `captureAnimations.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `House Themes`** (1 nodes): `houseThemes.ts`
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

<<<<<<< HEAD
- **Why does `prog()` connect `Spell Particle Effects` to `Fiendfyre Effect`, `Knight & Levitation Effects`, `Avada Kedavra Effect`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Why does `mergeGroupToSingleMesh()` connect `Piece Factory & 3D Models` to `Avada Kedavra Effect`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `disposeMeshes()` connect `Knight & Levitation Effects` to `Spell Particle Effects`, `Avada Kedavra Effect`, `Reducto Effect`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `prog()` (e.g. with `.update()` and `.update()`) actually correct?**
  _`prog()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `disposeMeshes()` (e.g. with `.dispose()` and `.dispose()`) actually correct?**
  _`disposeMeshes()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `createParticleBurst()` (e.g. with `.update()` and `.constructor()`) actually correct?**
  _`createParticleBurst()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `client/index.html (entry point)`, `client/src/main.tsx (app entry script)`, `@vitejs/plugin-react (Oxc)` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
=======
- **Why does `prog()` connect `Capture Effects & Particles` to `Fiendfyre Spell Effect`, `Avada Kedavra Spell Effect`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `client/ (Vite + React frontend)` connect `Project Docs & Shared Types` to `Chess Architecture & Docs`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `mergeGroupToSingleMesh()` connect `3D Piece Geometry` to `Avada Kedavra Spell Effect`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `prog()` (e.g. with `.update()` and `.update()`) actually correct?**
  _`prog()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `React 18`, `Vite`, `@react-three/fiber` to the rest of the system?**
  _42 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Capture Effects & Particles` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Project Docs & Shared Types` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
>>>>>>> 9bd040a (chore: add graphify knowledge graph (#14))
