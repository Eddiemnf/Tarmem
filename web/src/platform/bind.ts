/* Joins the database session to the design's logic.

   The logic keeps running exactly as designed; this module feeds it the signed-in person and
   their projects, and replaces the three places where the prototype only pretended to save:
   publishing a project, withdrawing one, and sending the contact form. */

import type { GuardEffects } from '../launch/guard';
import type { LogicHost, LogicState } from '../state/designRuntime';
import { supabase } from './client';
import { PLATFORM_COPY } from './copy';
import { adminLogicState, adminUsers, loadAdminData, loadAnalytics, saveConsoleList, setApplicationStatus, setMessageHandled } from './admin';
import { openWhatsAppTo } from '../launch/deliver';
import { contractorRecord, runtimeData, setEveryone, toLogicProject } from './data';
import { forgetHeldFiles, heldFile, listFiles, uploadFile, type StoredFile } from './files';
import { createProject, currentAccount, onAccountChange, sendContact, withdrawProject } from './session';
import { trackRoutes } from './track';

const langOf = (state: LogicState): 'ar' | 'en' => (state.lang === 'en' ? 'en' : 'ar');

/** The signed-in person and their projects, as the logic's own state. */
function accountState(): LogicState {
  const account = currentAccount();
  return {
    user: account?.logicUser ?? null, projects: (account?.projects || []).map((row) => toLogicProject(row)),
    // a contractor is "c1" to the logic, exactly as a homeowner is "h1"
    contractors: account?.profile.role === 'contractor' ? [contractorRecord(account.application, account.profile)] : [],
  };
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

const both = (text: string) => ({ en: text, ar: text });
/** A stored file as a row of the design's Files tab. */
const fileRow = (file: StoredFile): LogicState => ({ name: file.name, by: 'h', date: both(file.createdAt.slice(0, 10)), path: file.path });

/** The Files tab's own "upload" button: the file goes to storage, then into the project's list. */
export async function uploadToProject(host: LogicHost, projectCode: string, file: File): Promise<void> {
  const project = (host.logic.state.projects as LogicState[]).find((p) => p.id === projectCode);
  const owner = currentAccount()?.profile.id;
  if (!project?.dbId || !owner) return;
  const copy = PLATFORM_COPY[langOf(host.logic.state)];
  const stored = await uploadFile(owner, project.dbId, file, project.files.length);
  const row = stored ? fileRow(stored) : { name: `⚠ ${file.name} — ${copy.uploadFailed}`, by: 'h', date: both(''), failed: true };
  host.setLogicState((s) => ({ projects: (s.projects as LogicState[]).map((p) => (p.id === projectCode ? { ...p, files: [...p.files.filter((f: LogicState) => !f.failed), row] } : p)) }));
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
    // The photos chosen in the form go up now that there is a project to attach them to.
    const names: string[] = state.post.files || [];
    if (names.length) {
      publishing = true;
      host.setLogicState((s) => ({ post: { ...s.post, error: copy.uploading } }));
      const owner = currentAccount()?.profile.id || '';
      const rows = await Promise.all(names.map(async (name, n) => {
        const file = heldFile(name);
        const stored = file ? await uploadFile(owner, result.ok.id, file, n) : null;
        return stored ? fileRow(stored) : { name: `⚠ ${name} — ${copy.uploadFailed}`, by: 'h', date: both(''), failed: true };
      }));
      project.files = rows;
      publishing = false;
      forgetHeldFiles();
    }
    host.setLogicState((s) => ({ projects: [project, ...s.projects], post: initialPost, pendingPost: false, justPosted: project.id }));
    logic.nav('project', { curId: project.id, tab: project.files.some((f: LogicState) => f.failed) ? 'files' : 'overview' });
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
        if (c.dbId && before && !before.verified && c.verified) {
          void setApplicationStatus(c.dbId, 'verified').then(failed);
          // The contractor is told on WhatsApp. It opens ready-written, from the team's own WhatsApp, inside this click;
          // sending without anyone pressing "send" needs the WhatsApp Business API (docs/real-platform-plan.md).
          const copy = PLATFORM_COPY[c.lang === 'en' ? 'en' : 'ar'];
          openWhatsAppTo(c.mobile, copy.verifiedMessage(c.person, c.name.ar, `${window.location.origin}/signin`, Boolean(c.hasAccount)));
        }
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

  // Opening a project loads its real files, for its owner and for the team alike.
  let filesFor = '';
  const loadProjectFiles = () => {
    const s = host.logic.state;
    const project = s.route === 'project' ? (s.projects as LogicState[]).find((p) => p.id === s.curId) : null;
    if (!project?.dbId || !currentAccount() || filesFor === project.dbId) return;
    filesFor = project.dbId;
    const owner = project.ownerId === 'h1' ? currentAccount()!.profile.id : project.ownerId;
    void listFiles(owner, project.dbId).then((files) => {
      if (!files.length) return;
      put({ projects: (host.logic.state.projects as LogicState[]).map((p) => (p.dbId === project.dbId ? { ...p, files: files.map(fileRow) } : p)) });
    });
  };

  const apply = () => {
    const account = currentAccount();
    setEveryone(null);
    logic.D = runtimeData(account?.profile ?? null);
    // nothing invented survives on the real site: the design seeds these lists for its demo
    put({ rejected: [], cases: [], promos: [], affiliates: [], strikes: [], refunds: [], adminAn: null, ...accountState() });
    if (account?.logicUser.admin) { void refreshAdmin(); void refreshAnalytics(); }
  };
  apply();
  const stopAccount = onAccountChange(apply);
  const stopWatching = host.subscribe(onChange);
  const stopFiles = host.subscribe(loadProjectFiles);
  loadProjectFiles();
  const stopTracking = trackRoutes(host);
  return () => { stopAccount(); stopWatching(); stopFiles(); stopTracking(); window.clearInterval(live); };
}
