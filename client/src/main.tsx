import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { preloadPieceModels } from './geometry/gltfPieceCache';

// Start downloading GLB models immediately — they'll be cached by the time
// the player picks a house and ChessScene mounts.
preloadPieceModels().catch(() => {
  // Silent fallback — PieceFactory uses procedural geometry if models fail to load
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
