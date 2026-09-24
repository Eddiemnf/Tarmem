/* The view model.

   Every value and handler the generated pages bind to (`vm.*`) comes from the
   design's own logic class — `renderVals()` in `designLogic.generated.ts`,
   carried over verbatim from project/Tarmem.dc.html. The markup and the logic
   are generated from the same file, so they cannot drift apart, and the fee,
   VAT and escrow arithmetic is exactly the design's.

   This module only binds that class to React: one instance for the app's
   lifetime, re-rendered whenever it calls `setState`. */

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { LAUNCH_COPY } from '../launch/copy';
import { openWhatsApp } from '../launch/deliver';
import { guardLaunchState, type SentRequest } from '../launch/guard';
import { isLaunch, site } from '../launch/mode';
import { connectUrls } from '../launch/urls';
import { EMPTY_ANALYTICS, adminDeleteUser, adminLogicState, analyticsVals, loadAdminData, replyToCase, userDetail, type UserDetail } from '../platform/admin';
import { bindPlatform, guardEffects, uploadToProject } from '../platform/bind';
import { VIDEO_MAX_BYTES, VIDEO_TYPES, acceptFiles, holdFiles, uploadFile } from '../platform/files';
import { platformOn } from '../platform/client';
import { PLATFORM_COPY } from '../platform/copy';
import { approveChange, currentAccount, deleteMyAccount, normalizeMobile, proposeChange, refreshAccount, sendMessage, sendWhatsAppTest, stageStep, updateProfile, validMobile, type MessageRow } from '../platform/session';
import Component from './designLogic.generated';
import { LogicHost, type LogicState, type LogicVals } from './designRuntime';

/** The template's bindings are untyped in the design, so they are here too. */
export type VM = LogicVals;

const HostContext = createContext<LogicHost | null>(null);

/* The prototype's two editor props. On the site they can be given in the URL
   (`?lang=en&role=contractor`) to open a fresh visit in a language or role —
   they never override what a returning visitor already has saved. */
function startProps(): Record<string, unknown> {
  const query = new URLSearchParams(window.location.search);
  const lang = query.get('lang');
  const role = query.get('role');
  return {
    startLang: lang === 'ar' || lang === 'en' ? lang : undefined,
    // A role opens a signed-in demo account, so the public site never honours it.
    startRole: !isLaunch && role && ['guest', 'homeowner', 'contractor', 'admin'].includes(role) ? role : undefined,
  };
}

function createHost(): LogicHost {
  const logic = new Component(startProps());
  if (!isLaunch) return new LogicHost(logic);
  const initialPost = JSON.parse(JSON.stringify(logic.state.post)); // plain data; structuredClone needs Safari 15.4+
  // eslint-disable-next-line prefer-const -- the effects need the host, and the host needs the guard
  let host: LogicHost | null = null;
  const effects = platformOn ? guardEffects(() => host) : undefined;
  host = new LogicHost(logic, (prev, next) => guardLaunchState(prev, next, initialPost, effects));
  host.initialPost = initialPost;
  return host;
}

/** What the public site changes in the bindings: a flag the generated markup checks, and a few strings —
    including the footer's line about a licensed payment partner, which stays off until one is signed. */
/** The designed admin console, on real figures: everything the design's logic makes up is replaced here. */
/** The console's "one person" view from admin_user_detail, in the shape the design's modal reads. */
function userView(d: UserDetail, vm: LogicVals, when: (iso: string) => string): LogicVals {
  const t = vm.t; const dv = t.admin.dv || {}; const st: Record<string, string> = dv.statuses || {};
  const p = d.profile; const isCo = p.role === 'contractor'; const app = d.application;
  const cityLabel = ((vm.cities || []) as { id: string; label: string }[]).find((c) => c.id === p.city)?.label || p.city;
  const tag = (status: string) => (status === 'completed' ? 'tag-g' : status === 'active' ? 'tag-a' : 'tag-w');
  const appStatus = app?.status === 'verified' ? t.verified : app?.status === 'declined' ? t.admin.rejected : t.admin.pending;
  return {
    name: p.full_name, role: isCo ? t.roles.contractor : p.role === 'admin' ? t.admin.kicker : t.roles.homeowner, city: cityLabel,
    mobile: p.mobile || '—', tel: p.mobile ? 'tel:' + String(p.mobile).replace(/\s/g, '') : '', email: d.email || '—', mailto: d.email ? 'mailto:' + d.email : '',
    company: p.company || '—', language: p.lang === 'en' ? 'English' : 'العربية', joined: when(d.created_at), lastSeen: d.last_sign_in_at ? when(d.last_sign_in_at) : dv.never,
    status: isCo ? appStatus : t.admin.active, cls: isCo ? (app?.status === 'verified' ? 'tag-g' : app?.status === 'declined' ? 'tag-a' : 'tag-w') : 'tag-g',
    isContractor: isCo,
    projects: d.projects.map((pr) => ({ id: pr.code, title: pr.title, statusLabel: st[pr.status] || pr.status, tagClass: tag(pr.status), bids: String(pr.bids) })),
    projectCount: String(d.projects.length), noProjects: !d.projects.length, hasProjects: d.projects.length > 0,
    bids: d.bids.map((b) => ({ project: b.project_code, title: b.project_title, price: Number(b.price).toLocaleString('en-US'), days: String(b.days ?? '—'), status: st[b.status] || b.status })),
    bidCount: String(d.bids.length), noBids: !d.bids.length, hasBids: d.bids.length > 0,
    application: app ? appStatus : '—', portfolio: String(d.portfolio), reviews: String(d.reviews),
    mobileVerified: p.mobile_verified_at ? dv.verifiedYes : dv.verifiedNo, id: p.id, kind: isCo ? 'c' : 'h',
  };
}

function adminVals(vm: LogicVals, state: LogicState, host: LogicHost): LogicVals {
  if (state.user?.role !== 'admin' || !vm.t?.admin) return vm;
  const ar = vm.dir !== 'ltr';
  const copy = PLATFORM_COPY[ar ? 'ar' : 'en'];
  const when = (iso: string) => new Date(iso).toLocaleDateString(ar ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const applicants = new Map<string, LogicState>((state.contractors || []).map((c: LogicState) => [c.id, c]));
  const senders = new Map<string, LogicState>((state.cases || []).map((c: LogicState) => [c.id, c]));
  const budgets: number[] = (state.projects || []).map((p: LogicState) => (Number(p.min) + Number(p.max)) / 2);
  const average = budgets.length ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : 0;
  // the "one person" view: the account behind the row (a homeowner's profile id, or the account a contractor's application made)
  const view = state.adminView as { kind: string; id: string; ukind?: string } | null;
  const viewedId = view?.kind === 'user' ? (view.ukind === 'c' ? (applicants.get(view.id)?.userId as string | null) : view.id) : null;
  const detail = viewedId && state.adminDetail?.id === viewedId ? (state.adminDetail.data as UserDetail) : null;
  return {
    ...vm,
    // real figures from the site's own visit record; the design's "connect Google Analytics" box installed nothing and remembered the id in one browser only
    ...((real) => ({ ...real, an: { ...real.an, gaCard: false } }))(analyticsVals(state.adminAn || EMPTY_ANALYTICS(state.anRange || 'week'), vm)),
    av: !vm.av?.user ? vm.av : {
      ...vm.av,
      user: {
        ...(detail ? userView(detail, vm, when) : vm.av.user),
        // the console erases a person: only an account the database knows, never an admin, never yourself
        canErase: Boolean(viewedId) && viewedId !== currentAccount()?.profile.id && detail?.profile.role !== 'admin' && !detail?.profile.deleted_at,
        eraseAsk: Boolean(state.eraseAsk), eraseError: String(state.eraseError || ''),
      },
    },
    eraseUserConfirm: () => {
      if (!viewedId || state.eraseBusy) return;
      host.setLogicState({ eraseBusy: true, eraseError: '' });
      void adminDeleteUser(viewedId).then(async (r) => {
        if (!r.ok) return host.setLogicState({ eraseBusy: false, eraseError: copy.err[(r.error as 'activeProject' | 'generic') || 'generic'] });
        const data = await loadAdminData();
        host.setLogicState({ ...(data ? adminLogicState(data) : {}), eraseBusy: false, eraseAsk: false, adminView: null, adminDetail: null, siteNotice: copy.erased });
      });
    },
    // a withdrawn project reads as such in the console (the design's logic has no status for it)
    allProjects: (vm.allProjects || []).map((row: LogicState) => ((state.projects || []).find((p: LogicState) => p.id === row.id)?.withdrawn ? { ...row, statusLabel: vm.t.admin.dv?.statuses?.withdrawn || 'withdrawn', tagClass: 'tag-w' } : row)),
    openUser: (e: { currentTarget: HTMLElement }) => {
      const id = e.currentTarget.dataset.id || ''; const kind = e.currentTarget.dataset.kind || 'h';
      const uuid = kind === 'h' ? id : (applicants.get(id)?.userId as string | null) || null;
      host.setLogicState({ adminView: { kind: 'user', id, ukind: kind } });
      if (uuid && state.adminDetail?.id !== uuid) void userDetail(uuid).then((d) => { if (d) host.setLogicState({ adminDetail: { id: uuid, data: d } }); });
    },
    sendCaseReply: (e: { currentTarget: HTMLElement }) => {
      const row = senders.get(e.currentTarget.dataset.id || ''); const text = String(state.caseReply || '').trim();
      if (!row?.dbId || !text || state.caseReplyBusy) return;
      host.setLogicState({ caseReplyBusy: true, caseReplyError: '' });
      void replyToCase(row.dbId as number, text).then(async (r) => {
        if (!r.ok) return host.setLogicState({ caseReplyBusy: false, caseReplyError: copy.err.caseReply });
        const data = await loadAdminData();
        host.setLogicState({ ...(data ? adminLogicState(data) : {}), caseReply: '', caseReplyBusy: false });
      });
    },
    // the design dates every application "4 Sep 2026"; the team also needs to know whom to call
    verifQueue: (vm.verifQueue || []).map((row: LogicState) => {
      const c = applicants.get(row.id);
      return c ? { ...row, name: `${row.name} — ${c.person}`, city: `${row.city} · ${c.mobile}`, date: when(c.appliedAt) } : row;
    }),
    // a support case here is a message from the contact form: there is no project, there is a sender
    cases: (vm.cases || []).map((row: LogicState) => ({ ...row, project: senders.get(row.id)?.from || row.project })),
    // the design's "average project value" is a fixed 46,800
    pm: vm.pm?.kpis ? { ...vm.pm, kpis: vm.pm.kpis.map((k: LogicState, i: number) => (i === 3 ? { ...k, v: average ? average.toLocaleString('en-US') : '—' } : k)) } : vm.pm,
    t: { ...vm.t, admin: { ...vm.t.admin, an: { ...vm.t.admin.an,
      sub: ar ? 'الزوار الآن وأرقام اليوم، من سجل زيارات الموقع نفسه: بلا ملفات تعريف ارتباط وبلا عناوين IP.' : 'Live visitors and daily figures, from the site\'s own visit record: no cookies, no IP addresses.' } } },
    // late stages and refunds come with payments: until then the tab would describe a record that does not exist
    ...(currentAccount()?.paymentsLive ? {} : { adminTabs: ((vm.adminTabs as LogicState[]) || []).filter((tab) => tab.id !== 'late') }),
  };
}

/** The design's two file pickers, made real: the files themselves are kept, checked and uploaded (src/platform/files.ts). */
function filePickers(host: LogicHost, copy: (typeof PLATFORM_COPY)['ar' | 'en']): LogicVals {
  const picked = (e: { target: HTMLInputElement }) => { const files = [...(e.target.files || [])]; e.target.value = ''; return files; };
  return {
    postUpload: (e: { target: HTMLInputElement }) => {
      const state = host.logic.state;
      const { ok, problem } = acceptFiles(picked(e), (state.post.files || []).length);
      host.setLogicState((s) => ({ post: { ...s.post, files: [...s.post.files, ...holdFiles(ok)], error: problem ? copy.fileErr[problem] : '' } }));
    },
    wsUpload: (e: { target: HTMLInputElement }) => {
      const project = (host.logic.state.projects as LogicState[]).find((p) => p.id === host.logic.state.curId);
      const { ok } = acceptFiles(picked(e), (project?.files || []).filter((f: LogicState) => !f.failed).length);
      for (const file of ok) void uploadToProject(host, host.logic.state.curId, file);
    },
  };
}

/** A contractor's account: waiting for the team's verification, then verified. The design gates both the dashboard
    and the bid form on Nafath; until Nafath is connected that gate stands for Tarmem's own verification, and —
    until bids are saved for real — for "bidding opens soon", so the form never pretends to send one. */
function contractorVals(vm: LogicVals, state: LogicState): LogicVals {
  if (state.user?.role !== 'contractor' || !vm.t?.auth) return vm;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  // Verified: the design's own bid form, saved for real (src/platform/bind.ts). If the homeowner chose their bid, say what happens next.
  if (state.user.nafath) return vm;
  return {
    ...vm,
    bidNeedsNafath: true, canBid: false,
    startNafath: () => { void refreshAccount(); },
    t: { ...vm.t, auth: { ...vm.t.auth, nafath: '', gateCoTitle: copy.coPendingTitle, gateCoNote: copy.coPendingNote, nafathVerify: copy.coRefresh } },
  };
}

/** After both signatures the design asks the homeowner to verify through Nafath and then pay by card. Neither is connected
    yet, so that step says so, and nothing pretends to take a payment; stages wait for the first payment. */
function awardedVals(vm: LogicVals, state: LogicState): LogicVals {
  const role = state.user?.role;
  if (!platformOn || (role !== 'homeowner' && role !== 'contractor') || !vm.t?.auth) return vm;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  return {
    ...vm,
    ...(role === 'homeowner' ? { fundNeedsNafath: Boolean(vm.fundNeedsNafath || vm.needsFunding), needsFunding: false, startNafath: () => { void refreshAccount(); } } : {}),
    t: { ...vm.t, ws: { ...vm.t.ws, noMs: copy.stagesSoon },
      ...(role === 'homeowner' ? { auth: { ...vm.t.auth, nafath: '', gateHoTitle: copy.paySoonTitle, gateHoNote: copy.paySoonNote, nafathVerify: copy.refresh } } : {}) },
  };
}

/** A contractor's public profile, from real rows only: the design fills it with stock "work" photos, two made-up reviews and
    made-up response times. Here: real rating, real reviews (first name only), finished projects; photos come with a later slice.
    The contractor's own edit form saves the introduction, city and trades; the verified company name is not theirs to change. */
function profileVals(vm: LogicVals, state: LogicState, host: LogicHost): LogicVals {
  if (!platformOn || !vm.t?.profile) return vm;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'], ar = vm.dir !== 'ltr';
  const shown = state.route === 'contractor' ? (state.contractors as LogicState[] | undefined)?.find((c) => c.id === state.curId) : null;
  const rows: LogicState[] = (shown && state.contractorReviews?.[shown.id]) || [];
  const when = (iso: string) => new Date(iso).toLocaleDateString(ar ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { month: 'long', year: 'numeric' });
  return {
    ...vm,
    ...(shown && vm.prof ? { prof: { ...vm.prof, tmWork: [], stats: [], moreReviews: false, reviewTotal: rows.length,
      ownWork: ((state.contractorPortfolio?.[shown.id] || []) as { url: string; caption: string }[]).map((p) => ({ src: p.url, caption: p.caption })),
      reviewList: rows.map((r) => ({ who: r.reviewer, when: when(r.created_at), stars: '★★★★★'.slice(0, r.stars) + '☆☆☆☆☆'.slice(0, 5 - r.stars), text: r.body })) },
      t: { ...vm.t, profile: { ...vm.t.profile, tmProjects: `${vm.t.profile.tmProjects} — ${copy.noWorkYet}`, ...(rows.length ? {} : { reviews: `${vm.t.profile.reviews} — ${copy.noReviewsYet}` }),
        // the design's first "how Tarmem protects you" line claims a Nafath check; until Nafath is connected, say what really happens
        protect: [copy.protectNoNafath, ...((vm.t.profile.protect as string[]) || []).slice(1)] } } } : {}),
    saveEdit: () => {
      const d = state.edit, me = (state.contractors as LogicState[]).find((c) => c.id === 'c1');
      if (!d || !me) return;
      const fail = (error: string) => host.setLogicState({ edit: { ...d, error } });
      if (String(d.name || '').trim() !== String(me.name.ar).trim()) return fail(copy.companyLocked);
      if (!d.trades?.length) return fail(vm.t.profile.errTrades);
      const length = String(d.bio || '').length;
      if (length < 50 || length > 500) return fail(vm.t.profile.errBio);
      void updateProfile({ about: String(d.bio), city: d.city, trades: d.trades }).then((result) => (result.ok ? host.setLogicState({ edit: null }) : fail(copy.err[result.error])));
    },
  };
}

/** Stages, once the owner has switched payments on (supabase/007): the design's own buttons, but every step is asked of the
    database, and the evidence is really uploaded. Until then an awarded project shows no stages, so none of this is reachable. */
function stageVals(vm: LogicVals, state: LogicState, host: LogicHost): LogicVals {
  const account = platformOn ? currentAccount() : null;
  const project = (state.projects as LogicState[] | undefined)?.find((p) => p.id === state.curId);
  if (!account?.paymentsLive || !project?.dbId || !project.ms?.length) return vm;
  const step = (action: 'submit' | 'approve' | 'dispute') => (e: { currentTarget: HTMLElement }) => { void stageStep(project.dbId, Number(e.currentTarget.dataset.i), action); };
  return {
    ...vm, submitMs: step('submit'), approveMs: step('approve'), disputeMs: step('dispute'),
    addEv: (e: { currentTarget: HTMLInputElement }) => {
      const input = e.currentTarget, i = Number(input.dataset.i), kind = input.dataset.k as 'p' | 'v' | 'o', file = input.files?.[0];
      input.value = '';
      if (!file) return;
      const video = kind === 'v';
      if (video ? !VIDEO_TYPES.includes(file.type) || file.size > VIDEO_MAX_BYTES : !acceptFiles([file], 0).ok.length) return;
      const owner = project.ownerDbId || account.profile.id;
      void uploadFile(owner, project.dbId, file, 0, `stage-${i}/${kind === 'p' ? 'photo' : video ? 'video' : 'accept'}-`).then((stored) => {
        if (stored) (host.logic as unknown as { setEv: (pid: string, i: number, k: string) => void }).setEv(project.id, i, kind);
      });
    },
  };
}

/** The designed settings page and "my profile" page, saved to the person's own profile row. The sign-in email is shown
    but cannot be changed here; closing an account is a request to the team, exactly as the design words it. */
function accountPages(vm: LogicVals, state: LogicState, host: LogicHost): LogicVals {
  const account = platformOn ? currentAccount() : null;
  if (!account || !vm.t?.settings) return vm;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  const note = (notice: string) => host.setLogicState((s) => ({ setg: { ...s.setg, email: account.profile.email || '', notice } }));
  // The design's WhatsApp card, on real data: the account's mobile, the person's channel and quiet-hours choices
  // (profiles.prefs, read by the database before every send), and a test button that really sends.
  const prefs = (state.setg?.prefs || {}) as Record<string, unknown>;
  const channel = prefs.channel === 'email' ? 'email' : 'wa';
  const waNumber = String(state.setg?.waNumber ?? state.setg?.mobile ?? account.profile.mobile ?? '');
  const pretty = (digits: string) => `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  // The design's settings page says the mobile signs you in and needs a code to change, and calls the email "for invoices";
  // here the email signs you in and the mobile is for contact and WhatsApp. Only notification switches that do something exist.
  const REAL_PREFS = ['pBids', 'pStages', 'pPay', 'pMsg'];
  return {
    ...vm,
    // the settings copy: what the mobile and email are for, and "delete my account" in words that say what really happens (022)
    t: { ...vm.t, ...(vm.t.settings ? { settings: { ...vm.t.settings, mobileNote: copy.settingsMobileNote, email: copy.settingsEmail, close: copy.closeBtnReal, closeQ: copy.closeQReal, closeBody: copy.closeBodyReal, closeYes: copy.closeYesReal } } : {}),
      ...(vm.wa && vm.t.wa ? { wa: { ...vm.t.wa, sub: copy.waSub, numberNote: copy.waNumberNote } } : {}) },
    // the switches that exist; and an admin's settings page carries no delete-account card (an admin is removed by another admin)
    ...(vm.st ? { st: { ...vm.st,
      ...(vm.st.prefs ? { prefs: (vm.st.prefs as { id: string }[]).filter((p) => REAL_PREFS.includes(p.id)) } : {}),
      ...(account.profile.role === 'admin' ? { canClose: false, closeBlocked: false, closeAsk: false } : {}) } } : {}),
    // "save contractor" is kept on the profile row, so the dashboard's saved list survives a reload and another device
    toggleSave: (e: { stopPropagation: () => void; currentTarget: { dataset: { id?: string } } }) => {
      e.stopPropagation();
      const id = String(e.currentTarget.dataset.id || '');
      const now = (state.saved as string[] | undefined) || [];
      const next = now.includes(id) ? now.filter((x) => x !== id) : [...now, id];
      host.setLogicState({ saved: next });
      void updateProfile({ prefs: { ...(prefs as Record<string, boolean | string | string[]>), saved: next } });
    },
    ...(vm.wa && vm.t.wa ? {
      wa: {
        ...vm.wa, on: account.whatsappLive && channel === 'wa', number: waNumber, sentTo: state.setg?.waSent || '', quiet: prefs.quiet !== false,
        // SMS does not exist: the choice is WhatsApp (with the emails) or the emails alone
        channels: [['wa', vm.t.wa.channels[0]], ['email', vm.t.wa.channels[2]]].map(([id, l]) => ({ id, l, on: channel === id ? 'true' : 'false' })),
        previewMsg: copy.waPreview,
      },
    } : {}),
    waVerify: () => {
      const mobile = normalizeMobile(waNumber);
      if (!validMobile(mobile)) return host.setLogicState((s) => ({ setg: { ...s.setg, waError: copy.err.mobile, waSent: '' } }));
      if (state.setg?.waBusy) return; // one test at a time: the button is greyed out until the database answers
      host.setLogicState((s) => ({ setg: { ...s.setg, waBusy: true } }));
      void (async () => {
        if (mobile !== account.profile.mobile) {
          const saved = await updateProfile({ mobile });
          if (saved.error) return host.setLogicState((s) => ({ setg: { ...s.setg, waBusy: false, waError: copy.err[saved.error], waSent: '' } }));
        }
        const sent = await sendWhatsAppTest();
        // the outcome shows in the card, next to the button — never at the bottom of the page
        host.setLogicState((s) => ({ setg: { ...s.setg, mobile, waNumber: mobile, waBusy: false, ...(sent.error ? { waSent: '', waError: copy.err[sent.error] } : { waSent: pretty(sent.ok || ''), waError: '' }) } }));
      })();
    },
    waChannel: (e: { currentTarget: { dataset: { v?: string } } }) => {
      const next = { ...prefs, channel: e.currentTarget.dataset.v === 'email' ? 'email' : 'wa' } as Record<string, boolean | string>;
      host.setLogicState((s) => ({ setg: { ...s.setg, prefs: next } }));
      void updateProfile({ prefs: next }).then((result) => note(result.ok ? copy.settingsSaved : copy.err[result.error]));
    },
    saveSettings: () => {
      const mobile = normalizeMobile(state.setg?.mobile);
      if (!validMobile(mobile)) return note(copy.err.mobile);
      const changedEmail = String(state.setg?.email || '').trim().toLowerCase() !== String(account.profile.email || '').toLowerCase();
      void updateProfile({ mobile, prefs: state.setg?.prefs || {}, lang: state.lang === 'en' ? 'en' : 'ar' })
        .then((result) => note(result.ok ? (changedEmail ? `${copy.settingsSaved} ${copy.emailLocked}` : copy.settingsSaved) : copy.err[result.error]));
    },
    // the settings page really erases the account now (supabase/022): the database scrubs it and the person is signed out
    confirmClose: () => {
      if (state.closeBusy) return;
      host.setLogicState({ closeBusy: true });
      void deleteMyAccount().then((result) => {
        if (!result.ok) return host.setLogicState((s) => ({ closeBusy: false, closeAsk: false, setg: { ...s.setg, notice: copy.err[result.error || 'generic'] } }));
        host.setLogicState({ closeBusy: false, closeAsk: false, route: 'home', siteNotice: copy.closeDone });
      });
    },
    saveHoEdit: () => {
      const d = state.hedit;
      if (!d) return;
      if (String(d.name || '').trim().length < 2) return host.setLogicState({ hedit: { ...d, error: vm.t.hprofile.errName } });
      void updateProfile({ full_name: String(d.name).trim(), city: d.city, about: String(d.about || '').slice(0, 600) })
        .then((result) => host.setLogicState(result.ok ? { hedit: null } : { hedit: { ...d, error: copy.err[result.error] } }));
    },
  };
}

/* The home page's background video, chosen once per visit: 1 MB at 720p on a desktop, 0.4 MB at 480p on a phone,
   and only the still poster when the visitor's browser asks to save data. */
const PHONE = (): boolean => { try { return window.matchMedia('(max-width: 768px)').matches; } catch { return false; } };

const HERO_VIDEO: string = (() => {
  try {
    if ((navigator as { connection?: { saveData?: boolean } }).connection?.saveData) return '';
    return window.matchMedia('(max-width: 768px)').matches ? 'assets/hero-480.mp4' : 'assets/hero.mp4';
  } catch { return 'assets/hero.mp4'; }
})();

/** The project's Messages tab on real rows (supabase/019). The design's chat kept messages in memory; here a thread is
    one project and one contractor, read from the database (src/platform/bind.ts loads and refreshes it), and sending
    writes a row the other party is told about. A homeowner with several bidders picks the thread (ThreadPicker.tsx). */
function messagesVals(vm: LogicVals, state: LogicState, host: LogicHost): LogicVals {
  if (!platformOn || !vm.pj) return vm;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'], ar = vm.dir !== 'ltr';
  const pr = (state.projects as LogicState[] | undefined)?.find((p) => p.id === state.curId);
  // an open project's progress box read "no stages of 0 stages paid": stages begin when a contractor is chosen
  const progress = pr && !pr.contractorId ? { msSummary: copy.stagesAfterAward } : {};
  const account = currentAccount();
  if (!pr?.dbId || !account) return { ...vm, pj: { ...vm.pj, ...progress } };
  const dbId = pr.dbId as string, me = account.profile.id, owner = account.profile.role === 'homeowner';
  const rows = ((state.projectMessages as Record<string, MessageRow[]> | undefined)?.[dbId] || []);
  const names = new Map<string, string>();
  if (owner) {
    for (const b of account.bids.filter((x) => x.project_id === dbId && x.status !== 'withdrawn')) names.set(b.contractor_id, account.bidders.find((c) => c.user_id === b.contractor_id)?.company || copy.msgsContractor);
    const a = account.agreements.find((x) => x.project_id === dbId);
    if (a) names.set(a.contractor_id, a.contractor_name || names.get(a.contractor_id) || copy.msgsContractor);
    for (const r of rows) if (!names.has(r.contractor_id)) names.set(r.contractor_id, copy.msgsContractor);
  }
  const ids = owner ? [...names.keys()] : [me];
  const active = owner ? (ids.includes(String(state.msgThread)) ? String(state.msgThread) : ids[0] || '') : me;
  const thread = rows.filter((r) => r.contractor_id === active);
  const unread = rows.filter((r) => r.from_id !== me && !r.read_at).length;
  const partner = owner ? names.get(active) || copy.msgsContractor : copy.msgsHomeowner;
  const when = (iso: string) => new Date(iso).toLocaleString(ar ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  // the design masks phone numbers, emails and links in a message (the note under the box says so); the real rows get the same
  const scrub = (text: string) => { try { return (host.logic as unknown as { scrub?: (t: string) => string }).scrub?.(text) ?? text; } catch { return text; } };
  const msgRows = thread.map((r) => { const mine = r.from_id === me; return { who: mine ? vm.t.ws.you : partner, time: when(r.created_at), text: scrub(r.body), align: mine ? 'flex-end' : 'flex-start', bg: mine ? '#1B1464' : '#F1F0FA', ink: mine ? '#fff' : '#14113F' }; });
  const canMessage = Boolean(active) && (owner || account.bids.some((b) => b.project_id === dbId && b.status !== 'withdrawn') || pr.contractorId === 'c1');
  const note = (text: string) => ({ who: copy.msgsFrom, time: '', text, align: 'flex-start', bg: '#F7F6FC', ink: '#3A385C' });
  const send = () => {
    const body = String(state.msgDraft || '').trim();
    if (!body || !active) return;
    host.setLogicState({ msgDraft: '', msgError: '' });
    void sendMessage(dbId, active, body).then((r) => host.setLogicState((s) => (r.ok ? { msgBump: (Number(s.msgBump) || 0) + 1 } : { msgDraft: body, msgError: copy.msgFailed })));
  };
  const shown = vm.tab?.messages ? [...(msgRows.length ? msgRows : [note(canMessage ? copy.msgsEmpty : copy.msgsNoThread)]), ...(state.msgError ? [note(String(state.msgError))] : [])] : msgRows;
  return {
    // (the design gates the Files tab's upload label with the same flag: only the messages tab's box is decided here)
    ...vm, canMessage: vm.tab?.messages ? canMessage : vm.canMessage, msgThreads: ids.map((id) => ({ id, name: names.get(id) || '', on: id === active })),
    pTabs: ((vm.pTabs as LogicState[]) || []).map((t) => (t.id === 'messages' ? { ...t, count: unread } : t)),
    sendMsg: send, msgKey: (e: { key: string }) => { if (e.key === 'Enter') send(); },
    pj: { ...vm.pj, ...progress, msgRows: shown },
  };
}

/** Change requests are rows (supabase/027): proposing and approving go to the database, and both parties see them. */
function changeVals(given: LogicVals, state: LogicState, host: LogicHost): LogicVals {
  if (!platformOn || !given.pj) return given;
  // only a homeowner has a profile page to open (their own); for a contractor or the team the owner's name is plain text
  const ownProfile = currentAccount()?.profile.role === 'homeowner';
  const vm: LogicVals = { ...given, pj: { ...given.pj, ownerLink: ownProfile, ownerPlain: !ownProfile } };
  const pr = (state.projects as LogicState[] | undefined)?.find((p) => p.id === state.curId);
  if (!pr?.dbId) return vm;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  const submit = () => {
    const f = (state.crF as LogicState | undefined) || {};
    const desc = String(f.desc || '').trim();
    if (!desc) return host.setLogicState({ crError: vm.t.ws.cr.errDesc });
    if (state.crBusy) return;
    host.setLogicState({ crBusy: true, crError: '' });
    void proposeChange(String(pr.dbId), desc, Math.round(Number(f.amount) || 0), Math.round(Number(f.days) || 0)).then((r) =>
      host.setLogicState(r.ok ? { crBusy: false, crOpen: false, crF: { desc: '', amount: '', days: '' }, crError: '' } : { crBusy: false, crError: copy.err[r.error] }));
  };
  const approve = (e: { currentTarget: { dataset: { id?: string } } }) => {
    const change = ((pr.changes as LogicState[] | undefined) || []).find((c) => c.id === e.currentTarget.dataset.id);
    if (!change?.dbId || state.crBusy) return;
    host.setLogicState({ crBusy: true });
    void approveChange(Number(change.dbId)).then((r) => host.setLogicState(r.ok ? { crBusy: false, crError: '' } : { crBusy: false, crOpen: true, crError: copy.err[r.error] }));
  };
  return { ...vm, crSubmit: submit, crApprove: approve };
}

/** While payment on the site is off, nobody is asked to "fund the project": the team arranges the first payment, as the
    Payments tab says. The bell and the dashboard's "waiting for you" list leave that one out until payments are live. */
function bellVals(vm: LogicVals): LogicVals {
  if (!platformOn || currentAccount()?.paymentsLive) return vm;
  const out: LogicVals = { ...vm };
  if (vm.nt) {
    const items = ((vm.nt.items as LogicState[]) || []).filter((x) => x.kind !== 'fund');
    const unread = items.filter((x) => x.unread).length;
    out.nt = { ...vm.nt, items, count: unread, hasAny: items.length > 0, empty: !items.length, badge: unread || '' };
  }
  // the project page's "next step" said "fund the project in the Payments tab" (or, to the contractor, "waiting for the homeowner to fund")
  const next = vm.t?.ws?.next;
  if (vm.pj && next && (vm.pj.nextStep === next.funding || vm.pj.nextStep === next.fundingCo)) out.pj = { ...vm.pj, nextStep: PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'].nextArrange };
  if (Array.isArray(vm.hActions)) {
    const actions = (vm.hActions as LogicState[]).filter((a) => a.tab !== 'payments');
    out.hActions = actions; out.noHActions = !actions.length;
  }
  return out;
}

function launchVals(vm: LogicVals, state: LogicState, host: LogicHost): LogicVals {
  if (!vm.t) return vm;
  const copy = LAUNCH_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  const real = platformOn ? PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'] : null;
  return bellVals(changeVals(messagesVals(profileVals(stageVals(accountPages(awardedVals(contractorVals(adminVals({
    ...vm,
    launch: true,
    // the footer's legal line, once the owner fills site.config.json (the commercial registration and VAT numbers)
    legalLine: [site.legal?.cr ? `${vm.dir === 'ltr' ? 'CR' : 'س.ت.'} ${site.legal.cr}` : '', site.legal?.vat ? `${vm.dir === 'ltr' ? 'VAT' : 'الرقم الضريبي'} ${site.legal.vat}` : ''].filter(Boolean).join(' · '),
    /** Real accounts are connected: sign-in shows, and requests are saved instead of sent by WhatsApp. */
    accounts: platformOn,
    /** Photos have somewhere to go (supabase/003): the design's file pickers show, and really upload. */
    uploads: platformOn,
    /** The wallet opens only once the owner has switched payments on in the database. */
    wallet: Boolean(platformOn && currentAccount()?.paymentsLive),
    /** The settings page's WhatsApp card shows once the owner has switched WhatsApp updates on in the database (supabase/013). */
    whatsapp: Boolean(platformOn && currentAccount()?.whatsappLive),
    // the contractor dashboard's "profile performance", measured (supabase/020): a dash until there is something to measure
    ...(platformOn ? (() => { const p = currentAccount()?.performance; return { perfViews: p ? String(p.views) : '—', perfWin: p && p.bids ? `${Math.round((p.won / p.bids) * 100)}%` : '—', perfResponse: '—' }; })() : {}),
    heroVideo: HERO_VIDEO,
    // an open project's headline figure is its budget range, not the top of it alone; a contractor with no finished
    // work yet reads "new", not a rating of 0.0
    ...(vm.pj?.id && !state.projects?.find((p: LogicState) => p.id === state.curId)?.amount ? (() => {
      const pr = state.projects.find((p: LogicState) => p.id === state.curId);
      const f = (n: number) => Number(n || 0).toLocaleString('en-US');
      return pr ? { pj: { ...vm.pj, amount: `${f(pr.min)} – ${f(pr.max)}` } } : {};
    })() : {}),
    ...(vm.pj?.bidRows ? { pj: { ...(vm.pj), ...(vm.pj?.id && !state.projects?.find((p: LogicState) => p.id === state.curId)?.amount ? (() => {
      const pr = state.projects.find((p: LogicState) => p.id === state.curId);
      const f = (n: number) => Number(n || 0).toLocaleString('en-US');
      return pr ? { amount: `${f(pr.min)} – ${f(pr.max)}` } : {};
    })() : {}),
      bidRows: vm.pj.bidRows.map((b: LogicState) => (b.rating === 0 && !b.done ? { ...b, rating: vm.dir === 'ltr' ? 'New' : 'جديد' } : b)) } } : {}),
    ...(real ? filePickers(host, real) : {}),
    justPosted: state.justPosted,
    /** The request last written into WhatsApp, for the page that follows it (src/launch/SentPage.tsx). */
    launchLast: state.launchLast,
    t: {
      ...vm.t,
      pages: { ...vm.t.pages, cSent: real ? real.contactSent : copy.contactSent },
      footer: { ...vm.t.footer, note: '' },
      // Without storage the photo step explains where photos go instead of offering a picker that uploads nothing.
      post: { ...vm.t.post, ...(real ? {} : { filesIntro: copy.filesIntro, fileTypes: '' }) },
      // an open project with no bids yet: say what actually happens next
      ...(real ? { ws: { ...vm.t.ws, noBids: currentAccount()?.whatsappLive ? real.postedNoBidsWa : real.postedNoBids } } : {}),
      // the design's contact form opens on "a project above SAR 1,000,000"; most visitors want the last option, "something else"
      ...(Array.isArray(vm.t.contact?.topics) && vm.t.contact.topics.length > 1 ? { contact: { ...vm.t.contact, topics: [vm.t.contact.topics[vm.t.contact.topics.length - 1], ...vm.t.contact.topics.slice(0, -1)] } } : {}),
    },
    // the floating WhatsApp button sat on top of "open WhatsApp again" on the page that follows a request, and on a phone it
    // covers the end of a form's fields and buttons, so it stays off the form pages there
    showWaFab: vm.showWaFab && !vm.r?.sent && !(PHONE() && ['post', 'join', 'contact', 'auth'].includes(String(state.route))),
    post: vm.post?.step4 ? { ...vm.post, nextLabel: real ? real.publish : copy.sendWhatsApp } : vm.post,
  }, state, host), state), state), state, host), state, host), state, host), state, host), state, host));
}

export function LogicProvider({ children }: { children: ReactNode }) {
  const [host] = useState(createHost);

  useEffect(() => {
    host.mount();
    // The signed-in person and their projects go in before the address is read, so /dashboard opens for them.
    const unbind = platformOn ? bindPlatform(host, host.initialPost as LogicState) : undefined;
    // The logic restores the last page from saved state as it mounts; on the public site the address wins.
    const disconnect = isLaunch ? connectUrls(host) : undefined;
    return () => {
      unbind?.();
      disconnect?.();
      host.unmount();
    };
  }, [host]);

  return createElement(HostContext.Provider, { value: host }, children);
}

function useHost(): LogicHost {
  const host = useContext(HostContext);
  if (!host) throw new Error('useViewModel must be used inside <LogicProvider>');
  return host;
}

/** Call once, from the app shell: it also drives the logic's post-commit lifecycle. */
export function useViewModel(): VM {
  const host = useHost();
  const version = useSyncExternalStore(host.subscribe, host.getVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the change signal
  const vm = useMemo(() => (isLaunch ? launchVals(host.render(), host.logic.state, host) : host.render()), [host, version]);
  useEffect(() => {
    host.committed();
  });
  return vm;
}

/** The logic's current state, for the few shell concerns that are not bindings. */
export function useLogicState(): LogicState {
  const host = useHost();
  useSyncExternalStore(host.subscribe, host.getVersion);
  return host.logic.state;
}

/** For the public site's own pages: write a request into WhatsApp and show what happens next. */
export function useLaunchActions(): { send: (request: SentRequest) => void; host: LogicHost } {
  const host = useHost();
  return useMemo(() => ({
    host,
    /** A request with `saved` set is already with Tarmem; any other is written into WhatsApp. */
    send: (request: SentRequest) => {
      if (!request.saved) openWhatsApp(request.text);
      host.setLogicState({ route: 'sent', launchLast: request });
      window.scrollTo(0, 0);
    },
  }), [host]);
}
