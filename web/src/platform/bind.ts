/* Joins the database session to the design's logic.

   The logic keeps running exactly as designed; this module feeds it the signed-in person and
   their projects, and replaces the three places where the prototype only pretended to save:
   publishing a project, withdrawing one, and sending the contact form. */

import type { GuardEffects } from '../launch/guard';
import type { LogicHost, LogicState } from '../state/designRuntime';
import { supabase } from './client';
import { PLATFORM_COPY } from './copy';
import { adminLogicState, adminUsers, loadAdminData, loadAnalytics, saveConsoleList, setApplicationStatus, setMessageHandled } from './admin';
import { runtimeData, setEveryone, toLogicProject } from './data';
import { createProject, currentAccount, onAccountChange, sendContact, withdrawProject } from './session';
import { trackRoutes } from './track';

const langOf = (state: LogicState): 'ar' | 'en' => (state.lang === 'en' ? 'en' : 'ar');

/** The signed-in person and their projects, as the logic's own state. */
function accountState(): LogicState {
  const account = currentAccount();
  return { user: account?.logicUser ?? null, projects: (account?.projects || []).map((row) => toLogicProject(row)) };
}

export function guardEffects(getHost: () => LogicHost | null): GuardEffects {
  return {
    contact: (form, lang) => {
      void sendContact({ name: form.name, email: form.email, mobile: form.phone, topic: form.topic, message: form.msg, lang }).then((result) => {
        getHost()?.setLogicState((s) => ({ contact: result.ok
          ? { ...s.contact, sent: true, delivered: true, busy: false, error: '' }
          : { ...s.contact, sent: false, busy: false, error: PLATFORM_COPY[langOf(s)].contactFailed } }));
      });
    },
    withdraw: (dbId) => {
      // If the database refuses, the project comes back into the list rather than silently staying posted.
      void withdrawProject(dbId).then((result) => { if (!result.ok) getHost()?.setLogicState(accountState()); });
    },
  };
}

export function bindPlatform(host: LogicHost, initialPost: LogicState): () => void {
  if (!supabase) return () => undefined;
  const logic = host.logic as unknown as LogicState;
  let publishing = false;

  // The design adds the project to a list in memory. Here it is saved, and the saved row is what opens.
  logic.publishPost = async () => {
    if (publishing) return;
    const state = host.logic.state;
    const copy = PLATFORM_COPY[langOf(state)];
    const f = state.post.f;
    const fail = (error: string) => host.setLogicState((s) => ({ post: { ...s.post, error }, pendingPost: false }));
    const min = Math.round(Number(f.min)), max = Math.round(Number(f.max));
    if (String(f.title || '').trim().length < 3) return fail(copy.err.title);
    if (String(f.desc || '').trim().length < 3) return fail(copy.err.desc);
    if (!(min >= 0) || !(max >= min) || max > 1000000) return fail(copy.err.budget);
    publishing = true;
    host.setLogicState((s) => ({ post: { ...s.post, error: '', busy: true } }));
    const result = await createProject({ title: f.title, trade: f.trade, desc: f.desc, city: f.city, address: f.address || '', min, max, timing: f.timing });
    publishing = false;
    if (!result.ok) {
      host.setLogicState((s) => ({ post: { ...s.post, busy: false, error: copy.err[result.error] }, pendingPost: false, route: 'post' }));
      return;
    }
    const project = toLogicProject(result.ok);
    host.setLogicState((s) => ({ projects: [project, ...s.projects], post: initialPost, pendingPost: false, justPosted: project.id }));
    logic.nav('project', { curId: project.id, tab: 'overview' });
  };

  /* ---- the admin console (src/platform/admin.ts) ---- */
  const isAdmin = () => Boolean(currentAccount()?.logicUser.admin);
  const LISTS = ['contractors', 'rejected', 'cases', 'promos', 'affiliates'] as const;
  let seen: LogicState = {};
  let applying = false;
  const remember = () => { seen = Object.fromEntries(LISTS.map((k) => [k, host.logic.state[k]])); };
  /** State written from the database is not an edit by the admin, so it must not be saved back. */
  const put = (patch: LogicState) => { applying = true; host.setLogicState(patch); applying = false; remember(); };

  let adminLoadedAt = 0;
  const refreshAdmin = async () => {
    adminLoadedAt = Date.now();
    const data = await loadAdminData();
    if (!data || !isAdmin()) return;
    setEveryone(adminUsers(data));
    logic.D = runtimeData(currentAccount()?.profile ?? null);
    put(adminLogicState(data));
  };
  const refreshAnalytics = async () => {
    const raw = await loadAnalytics(host.logic.state.anRange || 'week');
    if (raw && isAdmin()) put({ adminAn: raw });
  };

  // What the admin does in the console is what the design's handlers do to these lists; each change is saved.
  let watching = '';
  const onChange = () => {
    if (applying || !isAdmin()) return;
    const s = host.logic.state;
    const failed = (ok: boolean) => { if (!ok) void refreshAdmin(); };
    if (s.contractors !== seen.contractors) {
      for (const c of s.contractors as LogicState[]) {
        const before = (seen.contractors as LogicState[] | undefined)?.find((x) => x.id === c.id);
        if (c.dbId && before && !before.verified && c.verified) void setApplicationStatus(c.dbId, 'verified').then(failed);
      }
    }
    if (s.rejected !== seen.rejected) {
      for (const id of (s.rejected as string[]).filter((x) => !(seen.rejected as string[] | undefined)?.includes(x))) {
        const c = (s.contractors as LogicState[]).find((x) => x.id === id);
        if (c?.dbId) void setApplicationStatus(c.dbId, 'declined').then(failed);
      }
    }
    if (s.cases !== seen.cases) {
      for (const c of s.cases as LogicState[]) {
        const before = (seen.cases as LogicState[] | undefined)?.find((x) => x.id === c.id);
        if (c.dbId && before?.open && !c.open) void setMessageHandled(c.dbId).then(failed);
      }
    }
    if (s.promos !== seen.promos) void saveConsoleList('promos', s.promos).then(failed);
    if (s.affiliates !== seen.affiliates) void saveConsoleList('affiliates', s.affiliates).then(failed);
    remember();

    const at = `${s.route}/${s.atab}/${s.anRange}`;
    if (at !== watching) {
      watching = at;
      if (s.route === 'admin' && s.atab === 'analytics') void refreshAnalytics();
      if (s.route === 'admin' && Date.now() - adminLoadedAt > 15000) void refreshAdmin();
    }
  };
  // The live view: the database is asked again every 20 seconds while the analytics tab is open and in front.
  const live = window.setInterval(() => {
    const s = host.logic.state;
    if (isAdmin() && s.route === 'admin' && s.atab === 'analytics' && !document.hidden) void refreshAnalytics();
  }, 20000);

  const apply = () => {
    const account = currentAccount();
    setEveryone(null);
    logic.D = runtimeData(account?.profile ?? null);
    // nothing invented survives on the real site: the design seeds these lists for its demo
    put({ ...accountState(), contractors: [], rejected: [], cases: [], promos: [], affiliates: [], strikes: [], refunds: [], adminAn: null });
    if (account?.logicUser.admin) { void refreshAdmin(); void refreshAnalytics(); }
  };
  apply();
  const stopAccount = onAccountChange(apply);
  const stopWatching = host.subscribe(onChange);
  const stopTracking = trackRoutes(host);
  return () => { stopAccount(); stopWatching(); stopTracking(); window.clearInterval(live); };
}
