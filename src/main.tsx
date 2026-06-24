import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register the PWA service worker.
// 'prompt' mode (set in vite.config.ts) prevents the SW from auto calling skipWaiting().
// We deliberately do NOT call updateSW() in onNeedRefresh to avoid a forced reload
// while the user is in an active chat session; the update applies on the next app launch.
registerSW({
  onNeedRefresh() {
    // New version is ready — will activate automatically on next page open.
    console.log('[ChatLight] New version available. Will update on next launch.');
  },
  onOfflineReady() {
    console.log('[ChatLight] App is ready for offline use.');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

