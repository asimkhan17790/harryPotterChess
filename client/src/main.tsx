import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { preloadPieceModels } from './geometry/gltfPieceCache';
import { supabase } from './lib/supabaseClient';
import { useUserStore } from './stores/userStore';

preloadPieceModels().catch(() => {
  // Silent fallback — PieceFactory uses procedural geometry if models fail to load
});

// Restore session on page load (handles refresh + OAuth redirect)
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    const store = useUserStore.getState();
    store.setUser(session.user);
    store.fetchProfile(session.user.id);
    if (window.location.search.includes('code=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }
});

supabase.auth.onAuthStateChange((event, session) => {
  const store = useUserStore.getState();
  if (event === 'SIGNED_IN' && session?.user) {
    store.setUser(session.user);
    store.fetchProfile(session.user.id);
    if (window.location.search.includes('code=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  } else if (event === 'SIGNED_OUT') {
    store.setUser(null);
    store.setProfile(null);
    store.setStats(null);
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
