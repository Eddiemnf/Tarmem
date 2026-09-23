import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorScreen from './components/ErrorScreen';
import Gate from './components/Gate';
import { STORAGE_KEY, isLaunch, site } from './launch/mode';
import { initSession } from './platform/session';
import { installErrorLog } from './platform/track';
import { LogicProvider } from './state/viewModel';
import './styles/global.css';

const app = (
  <ErrorScreen>
    <LogicProvider>
      <App />
    </LogicProvider>
  </ErrorScreen>
);

/* The demo always sits behind the preview password. The public site joins it
   there until `publicLaunch` is switched on in site.config.json — that one line
   is what opens the site to the world. */
const gated = !isLaunch || !site.publicLaunch;

/* A saved sign-in is restored before the first render, so a signed-in visitor opening
   /dashboard is not bounced to the sign-in page. Visitors who are not signed in wait for nothing. */
/* Who is signed in comes from the database session and nowhere else. The design's logic would otherwise restore
   the last `user` it saved, and patch that user's name from seed data that does not exist on the public site. */
if (isLaunch) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    // (even a saved "nobody": restored over a session that arrived with the page — a reset-password link — it would
    //  read as the person having just signed out, and end that session)
    if (saved && 'user' in saved) { delete saved.user; localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); }
  } catch { /* storage unavailable or not JSON: nothing to clean */ }
}

installErrorLog(() => window.location.pathname.split('/')[1] || 'home');
void initSession().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>{gated ? <Gate>{app}</Gate> : app}</StrictMode>,
  );
});
