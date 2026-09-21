import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Gate from './components/Gate';
import { isLaunch, site } from './launch/mode';
import { initSession } from './platform/session';
import { LogicProvider } from './state/viewModel';
import './styles/global.css';

const app = (
  <LogicProvider>
    <App />
  </LogicProvider>
);

/* The demo always sits behind the preview password. The public site joins it
   there until `publicLaunch` is switched on in site.config.json — that one line
   is what opens the site to the world. */
const gated = !isLaunch || !site.publicLaunch;

/* A saved sign-in is restored before the first render, so a signed-in visitor opening
   /dashboard is not bounced to the sign-in page. Visitors who are not signed in wait for nothing. */
void initSession().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>{gated ? <Gate>{app}</Gate> : app}</StrictMode>,
  );
});
