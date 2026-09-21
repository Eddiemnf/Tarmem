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
  // real accounts (src/platform/): the guard sends anyone who is not signed in to /signin
  auth: 'signin', hdash: 'dashboard', admin: 'admin', inbox: 'inbox',
};
const BASE = import.meta.env.BASE_URL;

function routeFromLocation(): { route: string; known: boolean; curId?: string } {
  const rest = window.location.pathname.slice(BASE.length).replace(/\/+$/, '');
  const project = rest.match(/^project\/([A-Za-z0-9-]{1,24})$/);
  if (project) return { route: 'project', known: true, curId: project[1] };
  const hit = Object.entries(PATHS).find(([, path]) => path === rest);
  return { route: hit ? hit[0] : 'home', known: Boolean(hit) };
}

function pathFor(state: { route: string; curId?: string | null }): string | undefined {
  if (state.route === 'project' && state.curId) return 'project/' + encodeURIComponent(state.curId);
  return PATHS[state.route];
}

/** Call once the logic has mounted. Returns the function that disconnects it. */
export function connectUrls(host: LogicHost): () => void {
  const opened = routeFromLocation();
  if (!opened.known) window.history.replaceState(null, '', BASE);
  const openedState = opened.curId ? { route: opened.route, curId: opened.curId, tab: 'overview' } : { route: opened.route };
  if (host.logic.state.route !== opened.route || (opened.curId && host.logic.state.curId !== opened.curId)) host.setLogicState(openedState);

  // The guard may have answered with a different page (a signed-out visitor opening /dashboard is
  // asked to sign in): the address follows, without leaving the refused one in the history.
  const landed = pathFor(host.logic.state as { route: string; curId?: string | null });
  if (landed !== undefined && window.location.pathname !== BASE + landed) window.history.replaceState(null, '', BASE + landed);

  const unsubscribe = host.subscribe(() => {
    const path = pathFor(host.logic.state as { route: string; curId?: string | null });
    if (path === undefined) return;
    const target = BASE + path;
    if (window.location.pathname !== target) window.history.pushState(null, '', target);
  });
  const onPop = () => {
    const at = routeFromLocation();
    host.setLogicState({ route: at.route, ...(at.curId ? { curId: at.curId } : {}), navOpen: false, menuOpen: false });
  };
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
    post: t.nav?.post, join: t.footer?.join, auth: t.nav?.signIn, hdash: t.nav?.dashboard, admin: t.nav?.admin, project: vm.pj?.title,
  } as Record<string, string | undefined>)[route];
  return label ? `${label} · ${vm.dir === 'ltr' ? 'Tarmem' : 'ترميم'}` : 'ترميم · Tarmem';
}
