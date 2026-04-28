import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { preloadPieceModels } from './geometry/gltfPieceCache';

preloadPieceModels().catch(() => {
  // Silent fallback — PieceFactory uses procedural geometry if models fail to load
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
