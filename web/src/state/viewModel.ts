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
import { isLaunch } from '../launch/mode';
import { connectUrls } from '../launch/urls';
import { EMPTY_ANALYTICS, analyticsVals } from '../platform/admin';
import { bindPlatform, guardEffects, uploadToProject } from '../platform/bind';
import { acceptFiles, holdFiles } from '../platform/files';
import { platformOn } from '../platform/client';
import { PLATFORM_COPY } from '../platform/copy';
import { refreshAccount } from '../platform/session';
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
function adminVals(vm: LogicVals, state: LogicState): LogicVals {
  if (state.user?.role !== 'admin' || !vm.t?.admin) return vm;
  const ar = vm.dir !== 'ltr';
  const when = (iso: string) => new Date(iso).toLocaleDateString(ar ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const applicants = new Map<string, LogicState>((state.contractors || []).map((c: LogicState) => [c.id, c]));
  const senders = new Map<string, LogicState>((state.cases || []).map((c: LogicState) => [c.id, c]));
  const budgets: number[] = (state.projects || []).map((p: LogicState) => (Number(p.min) + Number(p.max)) / 2);
  const average = budgets.length ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : 0;
  return {
    ...vm,
    ...analyticsVals(state.adminAn || EMPTY_ANALYTICS(state.anRange || 'week'), vm),
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
  const verified = Boolean(state.user.nafath);
  return {
    ...vm,
    bidNeedsNafath: true, canBid: false,
    startNafath: () => { void refreshAccount(); },
    t: { ...vm.t, auth: { ...vm.t.auth,
      gateCoTitle: verified ? copy.bidsSoonTitle : copy.coPendingTitle, gateCoNote: verified ? copy.bidsSoonNote : copy.coPendingNote, nafathVerify: copy.coRefresh } },
  };
}

function launchVals(vm: LogicVals, state: LogicState, host: LogicHost): LogicVals {
  if (!vm.t) return vm;
  const copy = LAUNCH_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  const real = platformOn ? PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'] : null;
  return contractorVals(adminVals({
    ...vm,
    launch: true,
    /** Real accounts are connected: sign-in shows, and requests are saved instead of sent by WhatsApp. */
    accounts: platformOn,
    /** Photos have somewhere to go (supabase/003): the design's file pickers show, and really upload. */
    uploads: platformOn,
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
      ...(real ? { ws: { ...vm.t.ws, noBids: real.postedNoBids } } : {}),
    },
    // the floating WhatsApp button sat on top of "open WhatsApp again" on the page that follows a request
    showWaFab: vm.showWaFab && !vm.r?.sent,
    post: vm.post?.step4 ? { ...vm.post, nextLabel: real ? real.publish : copy.sendWhatsApp } : vm.post,
  }, state), state);
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
