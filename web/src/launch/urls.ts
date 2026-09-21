/* Real addresses for the public site's pages.

   The design keeps the current page in state only, so nothing could be linked,
   shared, bookmarked or indexed, and the browser's Back button left the site.
   The state stays the source of truth; this keeps the address bar in step with
   it, and the state in step with the address bar:

     /  /how  /pricing  /about  /help  /faq  /contact  /rules  /terms  /privacy  /post  /join

   A visit always opens the page its address names — never the page the visitor
   happened to be on last time. The page shown after a request is sent has no
   address of its own: reloading it returns to the form. */

import type { LogicHost, LogicVals } from '../state/designRuntime';

const PATHS: Record<string, string> = {
  home: '', how: 'how', pricing: 'pricing', about: 'about', help: 'help', faq: 'faq',
  contact: 'contact', rules: 'rules', terms: 'terms', privacy: 'privacy', post: 'post', join: 'join',
};
const BASE = import.meta.env.BASE_URL;

function routeFromLocation(): { route: string; known: boolean } {
  const rest = window.location.pathname.slice(BASE.length).replace(/\/+$/, '');
  const hit = Object.entries(PATHS).find(([, path]) => path === rest);
  return { route: hit ? hit[0] : 'home', known: Boolean(hit) };
}

/** Call once the logic has mounted. Returns the function that disconnects it. */
export function connectUrls(host: LogicHost): () => void {
  const opened = routeFromLocation();
  if (!opened.known) window.history.replaceState(null, '', BASE);
  if (host.logic.state.route !== opened.route) host.setLogicState({ route: opened.route });

  const unsubscribe = host.subscribe(() => {
    const path = PATHS[host.logic.state.route];
    if (path === undefined) return;
    const target = BASE + path;
    if (window.location.pathname !== target) window.history.pushState(null, '', target);
  });
  const onPop = () => host.setLogicState({ route: routeFromLocation().route, navOpen: false, menuOpen: false });
  window.addEventListener('popstate', onPop);
  return () => {
    unsubscribe();
    window.removeEventListener('popstate', onPop);
  };
}

/** The tab title for a page, from the design's own labels for it. */
export function titleFor(vm: LogicVals, route: string): string {
  const t = vm.t;
  const label: string | undefined = t && ({
    how: t.nav?.how, pricing: t.nav?.pricing, about: t.nav?.about, help: t.footer?.help, faq: t.nav?.faq,
    contact: t.footer?.contact, rules: t.footer?.rules, terms: t.footer?.terms, privacy: t.footer?.privacy,
    post: t.nav?.post, join: t.footer?.join,
  } as Record<string, string | undefined>)[route];
  return label ? `${label} · ${vm.dir === 'ltr' ? 'Tarmem' : 'ترميم'}` : 'ترميم · Tarmem';
}
