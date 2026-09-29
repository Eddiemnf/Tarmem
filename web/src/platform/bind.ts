/* Joins the database session to the design's logic.

   The logic keeps running exactly as designed; this module feeds it the signed-in person and
   their projects, and replaces the three places where the prototype only pretended to save:
   publishing a project, withdrawing one, and sending the contact form. */

import type { GuardEffects } from '../launch/guard';
import type { LogicHost, LogicState } from '../state/designRuntime';
import { supabase } from './client';
import { PLATFORM_COPY } from './copy';
import { adminLogicState, adminUsers, loadAdminData, loadAnalytics, saveConsoleList, setAdminRefresher, setApplicationStatus, setMessageHandled } from './admin';
import { openWhatsAppTo } from '../launch/deliver';
import { contractorRecord, runtimeData, setEveryone, toLogicProject } from './data';
import { forgetHeldFiles, heldFile, listFiles, listPortfolio, uploadFile, type StoredFile } from './files';
import { LIMITS, createProject, currentAccount, loadContractorReviews, onAccountChange, refreshAccount, saveBid, savePayoutAccount, saveReview, sendContact, signAgreement, takeDraft, takeJustConfirmed, walletRequest, withdrawProject, type AgreementRow, type BidRow, type ChangeRow, loadMessages, markMessagesRead, type MessageRow } from './session';
import type { PlatformError } from './copy';
import { trackRoutes } from './track';

const langOf = (state: LogicState): 'ar' | 'en' => (state.lang === 'en' ? 'en' : 'ar');

/** The signed-in person and their projects, as the logic's own state. */
// the whole account id: two bidders whose ids begin alike must never be taken for one
const bidderId = (userId: string) => 'co-' + userId;
/** A saved bid as the design's bid object: what the contractor typed comes back exactly, plus whose it is. */
const logicBid = (bid: BidRow, cid: string): LogicState => ({ ...bid.details, cid, price: bid.price, days: bid.days, note: both(bid.note || ''), dbId: bid.id, chosen: bid.status === 'chosen' });

/** An agreement as the design's project fields: awaiting the contractor's signature (`pending`), or signed by both (awarded). */
function agreementState(a: AgreementRow | undefined, cidOf: (userId: string) => string, stages: string[] = []): LogicState {
  if (!a) return {};
  const ho = { name: a.homeowner_name, at: a.homeowner_signed_at.slice(0, 10) };
  if (!a.contractor_signed_at) return { pending: { cid: cidOf(a.contractor_id), price: a.amount, days: a.days }, sig: { ho }, agreementSaved: 'homeowner' };
  // Stages follow the first payment, and payment on the site is not connected yet: the project is awarded, with no stages to act on.
  return { contractorId: cidOf(a.contractor_id), amount: a.amount, pending: null, ms: stages, sig: { ho, co: { name: a.contractor_name || '', at: a.contractor_signed_at.slice(0, 10) } }, agreementSaved: 'both' };
}

/** A signed project's change requests in the design's shape (supabase/027), and the value and days they have moved it to. */
function changeState(a: AgreementRow | undefined, list: ChangeRow[]): LogicState {
  if (!a?.contractor_signed_at) return { changes: [] };
  let amount = a.amount, days = a.days, running = a.amount;
  for (const c of list) if (c.applied_at) { amount += c.amount; days += c.days; }
  const changes = list.map((c) => {
    if (c.applied_at) running += c.amount;
    return { id: c.code, dbId: c.id, by: c.by_side, desc: c.description, amount: c.amount, days: c.days, hoOk: Boolean(c.ho_ok_at), coOk: Boolean(c.co_ok_at),
      applied: Boolean(c.applied_at), newTotal: c.applied_at ? running : amount + c.amount };
  });
  return { changes, amount, days };
}

/** The bell's read marks, kept per person in this browser: a notice read before a reload stays read. */
const readKey = (id: string) => 'tarmem-notif-read-' + id;
function readMarks(id: string | undefined): string[] {
  if (!id) return [];
  try { const v = JSON.parse(localStorage.getItem(readKey(id)) || '[]'); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

function accountState(): LogicState {
  const account = currentAccount();
  const contractor = account?.profile.role === 'contractor';
  return {
    user: account?.logicUser ?? null,
    notifRead: readMarks(account?.profile.id),
    // a contractor's own bid is "c1"'s, exactly as they are "c1"; a homeowner sees each bidder under a short id
    projects: (account?.projects || []).map((row) => {
      const cidOf = (userId: string) => (contractor ? 'c1' : bidderId(userId));
      return { ...toLogicProject(row), bids: (account?.bids || []).filter((b) => b.project_id === row.id).map((b) => logicBid(b, cidOf(b.contractor_id))),
        ...agreementState((account?.agreements || []).find((a) => a.project_id === row.id), cidOf,
          // stages show only once the owner has switched payments on in the database; until then an awarded project has none to act on
          account?.paymentsLive ? account.stages.filter((st) => st.project_id === row.id).sort((x, y) => x.idx - y.idx).map((st) => st.status) : []),
        ...changeState((account?.agreements || []).find((a) => a.project_id === row.id), (account?.changes || []).filter((c) => c.project_id === row.id)) };
    }),
    // reviews already written, in the design's shape, so a reviewed project does not ask for another
    reviews: (account?.reviews || []).map((r) => ({ pid: account?.projects.find((p) => p.id === r.project_id)?.code, by: 'homeowner', stars: r.stars, text: r.body, date: r.created_at.slice(0, 10), saved: true })),
    // the wallet, in the design's own vocabulary (a waiting deposit, money held, a payout being processed, done)
    txns: (account?.wallet || []).filter((t) => t.status !== 'rejected' && t.status !== 'cancelled').map((t) => ({ dbId: t.id, who: contractor ? 'c1' : 'h1', date: t.created_at.slice(0, 10), type: t.type, method: t.method, amount: t.amount,
      st: t.type === 'deposit' ? (t.status === 'confirmed' ? 'escrow' : 'pending') : t.status === 'paid' ? 'done' : 'processing' })),
    ...(account?.payout ? { payout: { ...account.payout, saved: true, editing: false, error: '', draft: null } } : {}),
    contractors: !account ? [] : contractor ? [{ ...contractorRecord(account.application, account.profile), rating: Number(account.standing?.rating) || 0, reviews: Number(account.standing?.reviews) || 0, done: Number(account.standing?.done) || 0 }]
      : account.bidders.map((b) => ({ id: bidderId(b.user_id), userId: b.user_id, bio: both(b.bio || ''), name: both(b.company), city: b.city, trades: b.trades || [], rating: Number(b.rating) || 0, reviews: Number(b.reviews) || 0, done: Number(b.done) || 0, verified: true,
        since: String(b.since || '').slice(0, 4), onTime: '—', response: '—', checks: { id: false, cr: true, pf: false } })),
  };
}

export function guardEffects(getHost: () => LogicHost | null): GuardEffects {
  return {
    contact: (form, lang) => {
      // a filled hidden field is a bot: it sees "sent", nothing is saved
      if (String((form as { website?: string }).website || '').trim()) { getHost()?.setLogicState((s) => ({ contact: { ...s.contact, sent: true, delivered: true, busy: false, error: '' } })); return; }
      // the database's rules (supabase/001) are checked first, so the form names the field; its limits (029) have their own words
      void sendContact({ name: form.name, email: form.email, mobile: form.phone, topic: form.topic, message: form.msg, lang }).then((result) => {
        getHost()?.setLogicState((s) => {
          const copy = PLATFORM_COPY[langOf(s)];
          return { contact: result.ok
            ? { ...s.contact, sent: true, delivered: true, busy: false, error: '' }
            : { ...s.contact, sent: false, busy: false, error: result.error === 'generic' ? copy.contactFailed : copy.err[result.error] } };
        });
      });
    },
    withdraw: (dbId) => {
      // If the database refuses, the project comes back into the list rather than silently staying posted, and they are told.
      void withdrawProject(dbId).then((result) => {
        if (result.ok) return;
        getHost()?.setLogicState((s) => ({ ...accountState(), siteNotice: `${PLATFORM_COPY[langOf(s)].withdrawFailed}${result.error !== 'generic' && result.error !== 'session' ? ' ' + PLATFORM_COPY[langOf(s)].err[result.error] : ''}`, siteNoticeTone: 'warn' }));
      });
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

/** Read a contractor's portfolio into the logic's state (the profile page and its uploader both use this). */
export function reloadPortfolio(host: LogicHost, id: string, userId: string): void {
  void listPortfolio(userId).then((photos) => host.setLogicState((s) => ({ contractorPortfolio: { ...(s.contractorPortfolio || {}), [id]: photos } })));
}

export function bindPlatform(host: LogicHost, initialPost: LogicState): () => void {
  if (!supabase) return () => undefined;
  const logic = host.logic as unknown as LogicState;
  let publishing = false;

  /* A project the database would refuse is never dropped on the way: the form opens again at the step that holds the field,
     with the sentence that says what to change. Its rules (supabase/001): a title of 3 to 140 characters, a description of
     at least 10 (up to 4,000), a district of up to 120, and a budget whose minimum does not pass its maximum of 1,000,000. */
  const STEP_OF: Partial<Record<PlatformError, number>> = { title: 1, desc: 1, district: 2, budget: 2 };
  const problemOf = (f: LogicState, min: number, max: number): PlatformError | null => {
    const title = String(f.title || '').trim(), desc = String(f.desc || '').trim();
    if (title.length < 3 || title.length > LIMITS.title) return 'title';
    if (desc.length < 10 || desc.length > LIMITS.desc) return 'desc';
    if (String(f.address || '').trim().length > LIMITS.district) return 'district';
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min || max > 1000000 || max < 1) return 'budget';
    return null;
  };
  // The design adds the project to a list in memory. Here it is saved, and the saved row is what opens.
  logic.publishPost = async () => {
    if (publishing) return;
    const state = host.logic.state;
    const copy = PLATFORM_COPY[langOf(state)];
    const f = state.post.f;
    const fail = (error: PlatformError) => {
      host.setLogicState((s) => ({ post: { ...s.post, busy: false, done: null, error: copy.err[error], ...(STEP_OF[error] ? { step: STEP_OF[error] } : {}) }, pendingPost: false }));
      if (host.logic.state.route !== 'post') logic.nav('post');
    };
    const min = Math.round(Number(f.min)), max = Math.round(Number(f.max));
    const problem = problemOf(f, min, max);
    if (problem) return fail(problem);
    publishing = true;
    host.setLogicState((s) => ({ post: { ...s.post, error: '', busy: true } }));
    const result = await createProject({ title: f.title, trade: f.trade, desc: f.desc, city: f.city, address: f.address || '', min, max, timing: f.timing });
    publishing = false;
    if (!result.ok) return fail(result.error);
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
    const failed = project.files.some((f: LogicState) => f.failed);
    host.setLogicState((s) => ({
      projects: [project, ...s.projects], pendingPost: false, justPosted: project.id,
      // the design's confirmation page: the project's number and what happens next (a failed upload opens the files tab instead, so it is seen)
      post: failed ? initialPost : { ...initialPost, done: { id: project.id, first: !(s.projects || []).some((p: LogicState) => p.ownerId === 'h1'), files: project.files.length } },
    }));
    if (failed) logic.nav('project', { curId: project.id, tab: 'files' });
    else { logic.nav('post'); window.scrollTo({ top: 0 }); }
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
    const state = adminLogicState(data);
    // a project opened from the console shows its bids, signatures and change requests, as its two parties see them
    const firmOf = new Map(data.applications.filter((a) => (a as { user_id?: string | null }).user_id).map((a) => [(a as { user_id?: string | null }).user_id as string, 'A-' + a.id]));
    const cidOf = (userId: string) => firmOf.get(userId) || bidderId(userId);
    state.projects = (state.projects as LogicState[]).map((p) => {
      const agreement = data.agreements.find((a) => a.project_id === p.dbId);
      return { ...p, bids: data.bids.filter((b) => b.project_id === p.dbId && b.status !== 'withdrawn').map((b) => logicBid(b, cidOf(b.contractor_id))),
        ...agreementState(agreement, cidOf), ...changeState(agreement, data.changes.filter((c) => c.project_id === p.dbId).sort((x, y) => x.id - y.id)) };
    });
    put(state);
  };
  setAdminRefresher(refreshAdmin);
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
          // The contractor is told on WhatsApp. Once the owner has switched WhatsApp updates on, the database sends the
          // "account verified" template by itself (supabase/014); until then a ready-written message opens from the
          // team's own WhatsApp, inside this click.
          if (!currentAccount()?.whatsappLive) {
            const copy = PLATFORM_COPY[c.lang === 'en' ? 'en' : 'ar'];
            openWhatsAppTo(c.mobile, copy.verifiedMessage(c.person, c.name.ar, `${window.location.origin}/signin`, Boolean(c.hasAccount)));
          }
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
  /* Nothing pushes news to an open page, so it asks: a customer's bids and signatures, and the team's console, are re-read
     every minute while the tab is in front, and when it comes back to the front. When something new has arrived the
     team's tab says so in its title, and with a desktop notification if the browser was allowed to show them. */
  let known = -1;
  const arrivals = () => { const s = host.logic.state; return (s.projects?.length || 0) + (s.contractors?.length || 0) + (s.cases?.length || 0) + (s.projects as LogicState[] || []).reduce((n, p) => n + (p.bids?.length || 0), 0); };
  const freshen = async () => {
    if (document.hidden || !currentAccount() || publishing) return;
    if (host.logic.state.route === 'project') loadProjectMessages(true);
    if (!isAdmin()) return void refreshAccount();
    await refreshAdmin();
    const now = arrivals();
    if (known >= 0 && now > known) {
      document.title = `(${now - known}) ${document.title.replace(/^\(\d+\) /, '')}`;
      if ('Notification' in window && Notification.permission === 'granted') new Notification('ترميم · Tarmem', { body: langOf(host.logic.state) === 'ar' ? 'وصل جديد إلى لوحة الإدارة.' : 'Something new has arrived in the admin console.' });
    }
    known = now;
  };
  const everyMinute = window.setInterval(() => void freshen(), 60000);
  const onFront = () => { if (!document.hidden) { document.title = document.title.replace(/^\(\d+\) /, ''); void freshen(); } };
  document.addEventListener('visibilitychange', onFront);
  // (browsers only allow the question inside a click; it is asked once, of an admin, the first time they click anything)
  const askToNotify = () => {
    if (!('Notification' in window) || Notification.permission !== 'default') return window.removeEventListener('click', askToNotify);
    if (isAdmin()) void Notification.requestPermission();
  };
  window.addEventListener('click', askToNotify);

  // The live view: the database is asked again every 20 seconds while the analytics tab is open and in front.
  const live = window.setInterval(() => {
    const s = host.logic.state;
    if (isAdmin() && s.route === 'admin' && s.atab === 'analytics' && !document.hidden) void refreshAnalytics();
  }, 20000);

  /* A contractor's new bid (the design's form adds it to the project in memory, and empties the form) is saved; if the
     database would refuse it, or does, it is taken back and the form opens again with everything they typed, and the
     sentence for the field to change. Its rules (supabase/005): a price of 100 to 1,000,000 and 1 to 1,000 days. */
  const bidForm = (b: LogicState, error: string): LogicState => ({
    price: String(b.price ?? ''), days: String(b.days ?? ''), note: String(b.note?.ar ?? b.note ?? ''), incl: b.incl || '', excl: b.excl || '', brands: b.brands || '', start: b.start || '',
    warranty: b.warranty || '', valid: b.valid || '', ms1: String(b.ms?.[0] ?? 30), ms2: String(b.ms?.[1] ?? 40), ms3: String(b.ms?.[2] ?? 30), vatReg: Boolean(b.vatReg), visit: Boolean(b.visit), step: 'edit', error,
  });
  const bidProblem = (b: LogicState): PlatformError | null => {
    const price = Number(b.price), days = Number(b.days);
    if (!Number.isFinite(price) || price < 100 || price > 1000000) return 'bidPrice';
    if (!Number.isFinite(days) || days < 1 || days > 1000 || Math.round(days) !== days) return 'bidDays';
    if (String(b.note?.ar ?? '').length > LIMITS.bidNote) return 'noteLong';
    return null;
  };
  const saveNewBids = () => {
    if (applying || currentAccount()?.profile.role !== 'contractor') return;
    for (const project of host.logic.state.projects as LogicState[]) {
      const fresh = (project.bids as LogicState[]).find((b) => b.cid === 'c1' && !b.dbId && !b.saving);
      if (!fresh || !project.dbId) continue;
      const mark = (patch: LogicState | null) => put({ projects: (host.logic.state.projects as LogicState[]).map((p) => (p.dbId !== project.dbId ? p
        : { ...p, bids: (p.bids as LogicState[]).flatMap((b) => (b.cid === 'c1' && !b.dbId ? (patch ? [{ ...b, ...patch }] : []) : [b])) })) });
      const giveBack = (error: PlatformError) => { mark(null); host.setLogicState((s) => ({ bidF: bidForm(fresh, PLATFORM_COPY[langOf(s)].err[error]) })); };
      const problem = bidProblem(fresh);
      if (problem) { giveBack(problem); continue; }
      mark({ saving: true });
      void saveBid(project.dbId, fresh).then((result) => {
        if (result.ok) mark({ dbId: result.ok.id, saving: false });
        else giveBack(result.error);
      });
    }
  };

  // A review written in the design's form is saved; if the database refuses it (not finished, already reviewed), it is taken back.
  const saveNewReviews = () => {
    const account = currentAccount();
    if (applying || account?.profile.role !== 'homeowner') return;
    const fresh = (host.logic.state.reviews as LogicState[]).find((r) => !r.saved && !r.saving);
    const row = fresh && account.projects.find((p) => p.code === fresh.pid);
    const contractorId = row && account.agreements.find((a) => a.project_id === row.id)?.contractor_id;
    if (!fresh || !row || !contractorId) return;
    const mark = (patch: LogicState | null) => put({ reviews: (host.logic.state.reviews as LogicState[]).flatMap((r) => (r === fresh || (r.pid === fresh.pid && !r.saved) ? (patch ? [{ ...r, ...patch }] : []) : [r])) });
    mark({ saving: true });
    void saveReview(row.id, contractorId, Number(fresh.stars), String(fresh.text)).then((result) => {
      if (result.ok) return mark({ saved: true, saving: false });
      // the review is taken back, and the form opens again with the stars and the words, and why it was not saved
      mark(null);
      const copy = PLATFORM_COPY[langOf(host.logic.state)];
      host.setLogicState({ revF: { stars: Number(fresh.stars) || 0, text: String(fresh.text || ''), error: result.error === 'generic' ? copy.reviewFailed : `${copy.reviewFailed} ${copy.err[result.error]}` } });
    });
  };

  // The wallet's two writes. A deposit or payout the design adds in memory becomes a request in the database (and the list is
  // then re-read: what shows is what the database holds); a bank account saved in the design's form is saved for real.
  let savedIban = '';
  const saveWallet = () => {
    const account = currentAccount();
    if (applying || !account?.paymentsLive) return;
    const s = host.logic.state;
    const fresh = (s.txns as LogicState[]).find((t) => !t.dbId && !t.saving);
    if (fresh) {
      put({ txns: (s.txns as LogicState[]).map((t) => (t === fresh ? { ...t, saving: true } : t)) });
      const project = fresh.type === 'deposit' ? (s.projects as LogicState[]).find((p) => p.status === 'active' && !p.funded) : null;
      void walletRequest(fresh.type, Number(fresh.amount), String(fresh.method || 'bank'), project?.dbId || null).then((result) => {
        if (!result.ok) host.setLogicState((st) => ({ wl: { ...st.wl, notice: '', error: PLATFORM_COPY[langOf(st)].err[result.error] } }));
      });
    }
    const p = s.payout as LogicState;
    if (account.profile.role === 'contractor' && p?.saved && p.iban && p.iban !== (account.payout?.iban || '') && p.iban !== savedIban) {
      savedIban = p.iban;
      void savePayoutAccount({ holder: p.holder, bank: p.bank, iban: p.iban }).then((result) => {
        // the design shows "saved" at once; when the database refuses, the form opens again with the reason
        if (!result.ok) { savedIban = ''; host.setLogicState((st) => ({ payout: { ...st.payout, saved: false, editing: true, error: PLATFORM_COPY[langOf(st)].err[result.error] } })); }
      });
    }
  };

  // A contractor's profile page shows real reviews and real portfolio photos: read when the page is opened.
  let reviewsFor = '';
  const loadProfileReviews = () => {
    const s = host.logic.state;
    const shown = s.route === 'contractor' ? (s.contractors as LogicState[]).find((c) => c.id === s.curId) : null;
    if (!shown?.userId || reviewsFor === shown.userId) return;
    reviewsFor = shown.userId;
    void loadContractorReviews(shown.userId).then((rows) => put({ contractorReviews: { ...(host.logic.state.contractorReviews || {}), [shown.id]: rows } }));
    reloadPortfolio(host, shown.id, shown.userId);
  };

  // The design signs an agreement in memory. Each signature is asked of the database; if it refuses, the truth is loaded back.
  const saveSignatures = () => {
    const role = currentAccount()?.profile.role;
    if (applying || (role !== 'homeowner' && role !== 'contractor')) return;
    for (const project of host.logic.state.projects as LogicState[]) {
      if (!project.dbId || project.signing) continue;
      const asHomeowner = role === 'homeowner' && project.pending && project.agreementSaved !== 'homeowner';
      const asContractor = role === 'contractor' && project.sig?.co && project.agreementSaved !== 'both';
      if (!asHomeowner && !asContractor) continue;
      const bid = asHomeowner ? (project.bids as LogicState[]).find((b) => b.cid === project.pending.cid) : null;
      if (asHomeowner && !bid?.dbId) continue;
      const mark = (patch: LogicState) => put({ projects: (host.logic.state.projects as LogicState[]).map((p) => (p.dbId === project.dbId ? { ...p, ...patch } : p)) });
      mark({ signing: true });
      const cid = asHomeowner ? project.pending.cid : project.pending?.cid || project.contractorId || 'c1';
      void signAgreement(asHomeowner ? 'homeowner' : 'contractor', asHomeowner ? bid!.dbId : project.dbId).then(async (result) => {
        if (result.ok) {
          mark({ signing: false, agreementSaved: asHomeowner ? 'homeowner' : 'both', ...(asContractor ? { ms: [] } : {}) });
          return void refreshAccount(); // the signed agreement as the database holds it (the accepted bid and planned stages read it)
        }
        // the signature did not go in: what the database holds is loaded back, and the agreement opens again with the reason
        const copy = PLATFORM_COPY[langOf(host.logic.state)];
        const reason = result.error === 'generic' ? '' : ' ' + copy.err[result.error];
        await refreshAccount();
        if (result.error === 'session') return;
        const still = (host.logic.state.projects as LogicState[]).find((p) => p.dbId === project.dbId);
        host.setLogicState({ ...(still && host.logic.state.curId === still.id && still.status === 'open' ? { agr: { cid, read: false, error: copy.signFailed + reason } } : { siteNotice: copy.signFailed + reason, siteNoticeTone: 'warn' }) });
      });
    }
  };

  // Opening a project loads its real files, for its owner and for the team alike: once per opening of the page
  // (state changes while it is open do not list again; opening it again, or as somebody else, does).
  let filesFor = '';
  let lastVisit = '';
  const loadProjectFiles = () => {
    const s = host.logic.state;
    const visit = s.route === 'project' ? `${s.curId}|${currentAccount()?.profile.id || ''}` : '';
    if (visit !== lastVisit) { lastVisit = visit; filesFor = ''; }
    const project = s.route === 'project' ? (s.projects as LogicState[]).find((p) => p.id === s.curId) : null;
    if (!project?.dbId || !currentAccount() || filesFor === project.dbId) return;
    filesFor = project.dbId;
    const owner = project.ownerDbId || (project.ownerId === 'h1' ? currentAccount()!.profile.id : project.ownerId);
    void listFiles(owner, project.dbId).then((files) => {
      if (!files.length) return;
      put({ projects: (host.logic.state.projects as LogicState[]).map((p) => (p.dbId === project.dbId ? { ...p, files: files.map(fileRow) } : p)) });
    });
    // a stage's evidence ticks (photos, video, the owner's acceptance photo) say what is really in storage
    if (project.ms?.length) void Promise.all([0, 1, 2].map((i) => listFiles(owner, `${project.dbId}/stage-${i}`))).then((perStage) => {
      const ev = perStage.map((files) => ({ p: files.some((f) => /\/photo-/.test(f.path)), v: files.some((f) => /\/video-/.test(f.path)), o: files.some((f) => /\/accept-/.test(f.path)) }));
      put({ projects: (host.logic.state.projects as LogicState[]).map((p) => (p.dbId === project.dbId ? { ...p, ev } : p)) });
    });
  };

  /* A guest's project, kept on the device while their new account waited for its activation link, is posted at the first
     sign-in to that account (src/platform/AuthPage.tsx keeps it). The photos could not be kept: they are asked for again. */
  let draftFor = '';
  const publishDraft = () => {
    const account = currentAccount();
    if (!account || account.profile.role !== 'homeowner' || draftFor === account.profile.id) return;
    draftFor = account.profile.id;
    const draft = takeDraft(account.profile.email);
    if (!draft) return;
    // after the page's own address has been read (src/launch/urls.ts runs right after this), so the form it may open stays open
    void Promise.resolve().then(async () => {
      host.setLogicState({ post: { ...(initialPost as LogicState), f: { ...(initialPost as LogicState).f, ...draft.f }, files: [], step: 4, pledge: true }, pendingPost: true });
      await logic.publishPost();
      if (draft.files && host.logic.state.post?.done) host.setLogicState((s) => ({ siteNotice: PLATFORM_COPY[langOf(s)].draftPhotos, siteNoticeTone: 'warn' }));
    });
  };

  const apply = () => {
    const account = currentAccount();
    setEveryone(null);
    logic.D = runtimeData(account?.profile ?? null);
    // files are read when a project is opened; a refresh of the account must not make them vanish from the page
    const filesBefore = new Map((host.logic.state.projects as LogicState[] || []).filter((p) => p.dbId && p.files?.length).map((p) => [p.dbId, p.files]));
    // nothing invented survives on the real site: the design seeds these lists for its demo
    const next = accountState();
    next.projects = (next.projects as LogicState[]).map((p) => (filesBefore.has(p.dbId) ? { ...p, files: filesBefore.get(p.dbId) } : p));
    // the settings page and the profile page read these two; they hold what the person's profile row says
    const profile = account?.profile;
    const before = host.logic.state;
    const mine = profile ? { setg: { ...before.setg, mobile: profile.mobile, email: profile.email || '', prefs: { ...before.setg?.prefs, ...(profile.prefs || {}) }, notice: before.setg?.notice || '' },
      hoProfile: { city: profile.city, about: both(profile.about || '') } } : {};
    put({ rejected: [], cases: [], promos: [], affiliates: [], strikes: [], refunds: [], adminAn: null, ...mine, ...next, saved: Array.isArray(profile?.prefs?.saved) ? (profile?.prefs?.saved as string[]) : [] });
    if (account?.logicUser.admin) { void refreshAdmin(); void refreshAnalytics(); }
    // the bid form does not assume VAT registration; a contractor who said so on an earlier bid has it ticked for them
    if (account?.profile.role === 'contractor' && account.bids.some((b) => (b.details as { vatReg?: boolean } | null)?.vatReg === true)) {
      const f = host.logic.state.bidF as LogicState | undefined;
      if (f && !f.vatReg && !f.price && f.step !== 'review') put({ bidF: { ...f, vatReg: true } });
    }
    // the page opened from a working activation link: say the account is active (once), then post a waiting project
    if (account && takeJustConfirmed()) host.setLogicState((s) => ({ siteNotice: PLATFORM_COPY[langOf(s)].confirmedWelcome, siteNoticeTone: 'ok' }));
    if (account) publishDraft();
  };
  apply();
  const stopAccount = onAccountChange(apply);
  const stopWatching = host.subscribe(onChange);
  // The project's messages (supabase/019): read when the project opens, again when the tab opens or a message is sent,
  // and every minute; what the other side wrote is marked read while the thread is on screen.
  let messagesFor = '';
  const loadProjectMessages = (force = false) => {
    const s = host.logic.state;
    const project = s.route === 'project' ? (s.projects as LogicState[]).find((p) => p.id === s.curId) : null;
    const account = currentAccount();
    if (!project?.dbId || !account) return;
    const dbId = project.dbId as string;
    const key = `${dbId}:${s.msgBump || 0}:${s.tab === 'messages' ? 1 : 0}:${s.msgThread || ''}`;
    if (!force && messagesFor === key) return;
    messagesFor = key;
    void loadMessages(dbId).then(async (rows) => {
      const me = account.profile.id;
      const store = (list: MessageRow[]) => put({ projectMessages: { ...((host.logic.state.projectMessages as Record<string, MessageRow[]>) || {}), [dbId]: list } });
      store(rows);
      if (host.logic.state.tab !== 'messages') return;
      // the thread on screen: a contractor's own, or the one the homeowner picked (the first bidder by default, as the page shows it)
      const first = account.bids.filter((b) => b.project_id === dbId && b.status !== 'withdrawn')[0]?.contractor_id || account.agreements.find((a) => a.project_id === dbId)?.contractor_id || rows[0]?.contractor_id;
      const shown = account.profile.role === 'homeowner' ? String(host.logic.state.msgThread || first || '') : me;
      if (!rows.some((r) => r.contractor_id === shown && r.from_id !== me && !r.read_at)) return;
      await markMessagesRead(dbId, shown);
      const at = new Date().toISOString();
      store(rows.map((r) => (r.contractor_id === shown && r.from_id !== me && !r.read_at ? { ...r, read_at: at } : r)));
    });
  };
  const stopMessages = host.subscribe(() => loadProjectMessages());
  const stopFiles = host.subscribe(loadProjectFiles);
  const stopBids = host.subscribe(saveNewBids);
  const stopSigning = host.subscribe(saveSignatures);
  const stopReviews = host.subscribe(saveNewReviews);
  const stopWallet = host.subscribe(saveWallet);
  const stopProfile = host.subscribe(loadProfileReviews);
  let lastRead = '';
  const stopRead = host.subscribe(() => {
    const id = currentAccount()?.profile.id, marks = host.logic.state.notifRead;
    if (!id || !Array.isArray(marks)) return;
    const value = JSON.stringify(marks.slice(-300));
    if (value === lastRead) return;
    lastRead = value;
    try { localStorage.setItem(readKey(id), value); } catch { /* private window: the marks last until the tab closes */ }
  });
  loadProjectFiles();
  const stopTracking = trackRoutes(host);
  return () => { setAdminRefresher(null); stopAccount(); stopWatching(); stopFiles(); stopMessages(); stopBids(); stopSigning(); stopReviews(); stopWallet(); stopProfile(); stopRead(); stopTracking(); window.clearInterval(live); window.clearInterval(everyMinute); document.removeEventListener('visibilitychange', onFront); window.removeEventListener('click', askToNotify); };
}
