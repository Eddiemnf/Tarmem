/* First-party visit tracking: what the admin console's analytics and live view are made of.

   The design labels its analytics "demo data until Google Analytics is connected". Rather than
   hand visitors to a third party, the site records its own page views in Tarmem's database:
   a random id that lives only as long as the browser tab, the page, the language, the kind of
   device and the referring site. No cookie, no IP address, no name. Only an admin can read the
   rows back (supabase/002_*.sql). Visitors who ask not to be tracked are not recorded, and
   neither is the team's own browsing. */

import type { LogicHost } from '../state/designRuntime';
import { supabase } from './client';

export type VisitEvent = 'view' | 'signup' | 'signin' | 'project' | 'application' | 'contact';

let context: { admin: boolean; city: string | null } = { admin: false, city: null };
/** Who is browsing, as far as tracking cares: the team is skipped; a signed-in person's city is known. */
export function setTrackContext(next: { admin: boolean; city: string | null }): void { context = next; }

let memoryId = '';
function sessionId(): string {
  const fresh = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24);
  try {
    let id = sessionStorage.getItem('tarmem-visit');
    if (!id || !/^[a-z0-9]{8,40}$/.test(id)) { id = fresh(); sessionStorage.setItem('tarmem-visit', id); }
    return id;
  } catch { return (memoryId ||= fresh()); }
}

function device(): 'mobile' | 'tablet' | 'desktop' {
  const width = Math.min(window.innerWidth || 1280, window.screen?.width || 1280);
  return width < 768 ? 'mobile' : width < 1100 ? 'tablet' : 'desktop';
}

function referrer(): string | null {
  try {
    const host = document.referrer ? new URL(document.referrer).hostname : '';
    return host && host !== window.location.hostname ? host.slice(0, 120) : null;
  } catch { return null; }
}

export function track(event: VisitEvent, route: string): void {
  if (!supabase || context.admin) return;
  if (navigator.doNotTrack === '1' || (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  if (navigator.webdriver) return; // automated browsers (tests, crawlers that say so) are not visitors
  const row = {
    session_id: sessionId(), event, route: String(route || 'home').slice(0, 40), path: window.location.pathname.slice(0, 200),
    lang: document.documentElement.lang === 'en' ? 'en' : 'ar', device: device(), referrer: referrer(), city: context.city,
  };
  // Tracking must never get in a visitor's way: failures are dropped silently.
  void supabase.from('visits').insert(row).then(() => undefined, () => undefined);
}

/** Record a view each time the page changes. Returns the function that stops it. */
export function trackRoutes(host: LogicHost): () => void {
  let last = '';
  const record = () => {
    const state = host.logic.state;
    const key = state.route === 'project' ? `project/${state.curId}` : String(state.route);
    if (!state.ready || key === last) return;
    last = key;
    track('view', state.route);
  };
  record();
  return host.subscribe(record);
}
