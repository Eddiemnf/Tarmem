/* The view model.

   A port of `renderVals()` from the Claude Design prototype
   (project/Tarmem.dc.html): one object holding every value and handler the
   template binds to. The generated components read it as `vm.*`, so the
   structure here is deliberately kept identical to the original rather than
   being refactored into slices — the markup and this file have to agree.

   Derived figures (fees, escrow balances, revenue) are computed here in plain
   code from project state, never by the assistant. */

import { useCallback, useEffect, useRef } from 'react';
import * as D from '../data/tarmem-data';
import { EXTRA } from '../data/extra-copy';
import { AiUnavailableError, complete } from '../ai/client';
import { useStore, type SetState } from './store';
import type {
  AppState, Contractor, Evidence, Lang, MaybeLoc, MilestoneStatus, Project, Role,
} from './types';

const fmt = (n: unknown) => (Number(n) || 0).toLocaleString('en-US');
/** Digits stay Western site-wide — see the "unify all numbers" decision in the design chat. */
const arNumerals = (v: unknown) => String(v);

const STATUS_TAG: Record<string, string> = {
  open: 'tag-a', active: 'tag-n', completed: 'tag-g', funding: 'tag-w',
};
const MS_TAG: Record<string, string> = {
  pending: 'tag-n', submitted: 'tag-w', released: 'tag-g', disputed: 'tag-a',
};

const AUTO_DAYS = 7;
/** The signed-in contractor in this preview build. */
const ME = 'c1';
const HOMEOWNER_FEE = 0.05;
const CONTRACTOR_COMMISSION = 0.10;

type AnyRec = Record<string, any>;

/* Handlers are bound to inputs, selects and textareas alike, so they take the
   smallest shape each one satisfies rather than a specific element type. */
type FieldEvent = { currentTarget: { name: string; value: string; type?: string; checked?: boolean } };
type ValueEvent = { currentTarget: { value: string } };
type CheckEvent = { currentTarget: { name: string; checked: boolean } };
type FilesEvent = { currentTarget: { files: FileList | null } };
type ClickEvent = { currentTarget: HTMLElement };

const emptyBrief = () => ({ type: '', city: '', space: '', scope: '', budget: '', timing: '' });
const emptyPlan = () => ({
  msgs: [] as { role: 'user' | 'ai'; text: string }[],
  brief: emptyBrief(), touched: [] as string[], q: '', busy: false, error: '',
  question: '', done: false, matches: [] as { id: string; why: string }[], matching: false,
});

export function useViewModel() {
  const { state, stateRef, setState } = useStore();
  const nafathTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (nafathTimer.current) window.clearTimeout(nafathTimer.current);
  }, []);

  const startNafath = useCallback(() => {
    const code = 10 + Math.floor(Math.random() * 89);
    setState((prev) => ({ auth: { ...prev.auth, naf: 'wait', nafCode: code, error: '' } }));
    if (nafathTimer.current) window.clearTimeout(nafathTimer.current);
    nafathTimer.current = window.setTimeout(() => {
      if (stateRef.current.auth.naf !== 'wait') return;
      setState((prev) => ({
        auth: { ...prev.auth, naf: 'done' },
        user: prev.user ? { ...prev.user, nafath: true } : prev.user,
      }));
    }, 2600);
  }, [setState, stateRef]);

  return buildViewModel(state, stateRef, setState, startNafath);
}

function buildViewModel(
  s: AppState,
  stateRef: { current: AppState },
  setState: SetState,
  startNafath: () => void,
) {
  const lang: Lang = s.lang;
  const T = D.T as AnyRec;
  const t = T[lang] as AnyRec;
  const role: Role | null = s.user?.role || null;

  // ---------------------------------------------------------------- helpers
  const L = (o: MaybeLoc | undefined): string => (
    o && typeof o === 'object' && !Array.isArray(o) && (o as AnyRec).en !== undefined
      ? ((o as AnyRec)[lang] ?? (o as AnyRec).en)
      : (o as string)
  );

  /** Contact details are never exchanged on Tarmem — mask them in messages. */
  const scrub = (txt: string) => {
    const H = t.ws.msgHidden as string;
    return String(txt)
      .replace(/(\+?\d[\d\s\-()]{6,}\d)/g, H)
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, H)
      .replace(/((https?:\/\/|www\.)\S+)/gi, H)
      .replace(/\b(واتس\S*|whatsapp|تيليجرام|telegram)\b/gi, H);
  };

  const proj = (id: string | null) => s.projects.find((p) => p.id === id);
  const con = (id: string | null) => s.contractors.find((c) => c.id === id);
  const updProj = (id: string, fn: (p: Project) => Project) =>
    setState((prev) => ({ projects: prev.projects.map((p) => (p.id === id ? fn({ ...p }) : p)) }));
  const ev = (p: Project, i: number): Evidence => (p.ev && p.ev[i]) || { p: false, v: false, o: false };
  const setEv = (pid: string, i: number, key: keyof Evidence) =>
    updProj(pid, (p) => {
      const list = (p.ev || p.ms.map(() => ({ p: false, v: false, o: false }))).map(
        (x, j) => (j === i ? { ...x, [key]: true } : x),
      );
      return { ...p, ev: list };
    });
  const msAmounts = (p: Project): number[] =>
    (t.ws.ms as { p: number }[]).map((m) => Math.round(p.amount * m.p));
  const pct = (p: Project) =>
    (p.ms.length ? Math.round(p.ms.filter((m) => m === 'released').length / p.ms.length * 100) : 0);
  const statusOf = (p: Project) => (p.status === 'active' && !p.funded ? 'funding' : p.status);

  const nav = (route: string, extra: Partial<AppState> = {}) => {
    setState((prev) => {
      const here = { route: prev.route, curId: prev.curId, tab: prev.tab };
      const nextId = (extra.curId ?? prev.curId) as string | null;
      const hist = (route === prev.route && nextId === prev.curId)
        ? (prev.hist || [])
        : [...(prev.hist || []), here].slice(-20);
      return { route, hist, ...extra };
    });
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setState((prev) => {
      const hist = [...(prev.hist || [])];
      const previous = hist.pop();
      if (!previous) return {};
      return {
        route: previous.route, curId: previous.curId, tab: previous.tab,
        hist, menuOpen: false, navOpen: false,
      };
    });
    window.scrollTo(0, 0);
  };

  const publishPost = () => {
    const f = s.post.f;
    const id = 'P-' + (1060 + s.projects.filter((p) => p.ownerId === 'h1').length);
    const today = { en: T.en.ws.today as string, ar: T.ar.ws.today as string };
    const project: Project = {
      id, title: { en: f.title, ar: f.title }, desc: { en: f.desc, ar: f.desc },
      trade: f.trade, city: f.city, min: +f.min, max: +f.max, timing: f.timing,
      status: 'open', ownerId: 'h1', contractorId: null, amount: 0, funded: false,
      posted: today, bids: [], ms: [], msgs: [],
      files: s.post.files.map((name) => ({ name, by: 'h' as const, date: today })),
      ledger: [],
    };
    setState((prev) => ({
      projects: [project, ...prev.projects],
      post: {
        step: 1,
        f: { title: '', trade: 'kitchen', desc: '', city: 'riyadh', address: '', min: '', max: '', timing: 'month' },
        files: [], error: '', pledge: false,
      },
      pendingPost: false,
    }));
    nav('project', { curId: id, tab: 'overview' });
  };

  const authFinish = (rl: Role) => {
    const f = s.auth.f;
    const fallback = rl === 'homeowner'
      ? (D.USERS.h1 as AnyRec)?.[lang]
      : D.CONTRACTORS[0]?.name?.[lang];
    const name = f.name || fallback || '';
    setState((prev) => ({
      user: { role: rl, name: rl === 'contractor' ? (f.company || name) : name, nafath: false },
      auth: { ...prev.auth, step: 1, error: '', naf: 'idle', nafCode: null, f: { ...prev.auth.f, otp: '' } },
    }));
    if (s.pendingPost && rl === 'homeowner') {
      publishPost();
      return;
    }
    nav(rl === 'homeowner' ? 'hdash' : 'cdash');
  };

  const bKeys = () => ['type', 'city', 'space', 'scope', 'budget', 'timing'];

  const aiErrorFor = (error: unknown) => (
    error instanceof AiUnavailableError ? EXTRA[lang].aiNotConnected : (t.ai.err as string)
  );

  /** Extract a renovation brief from what the homeowner has written so far. */
  const askAssistant = async () => {
    const current = stateRef.current;
    const convo = current.plan.msgs.map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));
    if (!convo.length || convo[0].role !== 'user') return;
    const sys = `You are the brief assistant for Tarmem, a Saudi home-renovation marketplace connecting homeowners with verified contractors.
Read the homeowner's messages and extract a renovation brief.
Reply with JSON only — no prose, no code fences — in exactly this shape:
{"type":"","city":"","space":"","scope":"","budget":"","timing":"","missing":[],"question":"","done":false}
Rules:
- Write every value in ${lang === 'ar' ? 'Arabic' : 'English'}.
- "city" must be one of: ${lang === 'ar' ? 'الرياض، جدة، الشرقية' : 'Riyadh, Jeddah, Eastern Province'}. Leave it empty if the homeowner named no city or a different one.
- Leave a field as "" when the homeowner has not stated it. Never invent, estimate or assume — especially budget.
- "missing" lists the field names that are still empty and worth asking about.
- "question": ask about at most two missing fields in one short sentence. When nothing important is missing set "done" to true and make "question" one confirming sentence.
- Never give prices, cost ranges, or feasibility advice.`;
    setState((prev) => ({ plan: { ...prev.plan, busy: true, error: '' } }));
    try {
      const raw = await complete({
        model: 'claude-haiku-4-5', max_tokens: 700, system: sys, messages: convo,
      });
      const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as AnyRec;
      setState((prev) => {
        const plan = prev.plan;
        const brief = { ...plan.brief };
        bKeys().forEach((k) => {
          if (!plan.touched.includes(k) && !brief[k] && j[k]) brief[k] = String(j[k]).trim();
        });
        const question = String(j.question || '').trim();
        return {
          plan: {
            ...plan, brief, busy: false, done: !!j.done, question,
            msgs: question ? [...plan.msgs, { role: 'ai' as const, text: question }] : plan.msgs,
          },
        };
      });
    } catch (error) {
      const message = aiErrorFor(error);
      setState((prev) => ({ plan: { ...prev.plan, busy: false, error: message } }));
    }
  };

  /** Rank real contractor records against the brief; code filters, the model explains. */
  const runMatchAI = async () => {
    const current = stateRef.current;
    const b = current.plan.brief;
    const cityRec = D.CITIES.find((c) => c.ar === b.city || c.en === b.city || c.id === b.city);
    const verified = current.contractors.filter((c) => c.verified);
    const pool = cityRec ? verified.filter((c) => c.city === cityRec.id) : verified;
    const cands = (pool.length ? pool : verified).map((c) => ({
      id: c.id, name: c.name[lang],
      city: (D.CITIES.find((x) => x.id === c.city) || ({} as AnyRec))[lang],
      specialities: c.trades.map((id) => {
        const x = D.TRADES.find((y) => y.id === id);
        return x ? x[lang] : id;
      }),
      rating: c.rating, reviews: c.reviews, completedProjects: c.done,
      onTimePercent: c.onTime, responseHours: c.response, activeSince: c.since,
    }));
    setState((prev) => ({ plan: { ...prev.plan, matching: true, matches: [], error: '' } }));
    try {
      const sys = `You rank contractors for a renovation brief on Tarmem. Reply with JSON only: {"matches":[{"id":"c1","why":"..."}]}
Rules:
- At most 4 contractors, best first, ids taken only from the provided records.
- "why" is one sentence in ${lang === 'ar' ? 'Arabic' : 'English'} citing only facts present in that contractor's record (speciality, city, completed projects, rating, on-time percentage, response hours, years active).
- Never invent facts, prices, availability, or promises.`;
      const raw = await complete({
        model: 'claude-haiku-4-5', max_tokens: 800, system: sys,
        messages: [{
          role: 'user',
          content: 'Brief: ' + JSON.stringify(b) + '\n\nContractor records: ' + JSON.stringify(cands),
        }],
      });
      const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as AnyRec;
      const list = ((j.matches || []) as { id: string; why: string }[])
        .filter((m) => cands.some((c) => c.id === m.id)).slice(0, 4);
      setState((prev) => ({ plan: { ...prev.plan, matching: false, matches: list } }));
    } catch (error) {
      const message = aiErrorFor(error);
      setState((prev) => ({ plan: { ...prev.plan, matching: false, error: message } }));
    }
  };

  // ------------------------------------------------------------- derived data
  const r: AnyRec = {};
  r[s.route] = true;
  const cur: AnyRec = {};
  cur[s.route] = 'page';

  const cityL = (id: string) => {
    const c = D.CITIES.find((x) => x.id === id);
    return c ? c[lang] : D.CITIES[0][lang];
  };
  const tradeL = (id: string) => {
    const x = D.TRADES.find((y) => y.id === id);
    return x ? x[lang] : id;
  };
  const cName = (id: string | null) => {
    const c = con(id);
    return c ? c.name[lang] : (t.ws.unassigned as string);
  };
  const uName = (id: string) => (D.USERS[id] as AnyRec)?.[lang] || id;

  const daysN = (n: number) => {
    if (lang !== 'ar') return n + (n === 1 ? ' day' : ' days');
    if (n === 1) return 'يوم واحد';
    if (n === 2) return 'يومان';
    return n <= 10 ? n + ' أيام' : n + ' يومًا';
  };
  const revsN = (n: number) => {
    if (lang !== 'ar') return n + (n === 1 ? ' review' : ' reviews');
    if (n === 1) return 'تقييم واحد';
    if (n === 2) return 'تقييمان';
    return n <= 10 ? n + ' تقييمات' : n + ' تقييمًا';
  };
  const bidsN = (n: number) => {
    if (!n) return t.browse.noBids as string;
    if (lang !== 'ar') return n + ' ' + (n === 1 ? 'bid' : 'bids');
    if (n === 1) return 'عرض واحد';
    if (n === 2) return 'عرضان';
    return n <= 10 ? n + ' عروض' : n + ' عرضًا';
  };

  const decorateC = (c: Contractor) => ({
    ...c,
    name: c.name[lang],
    city: cityL(c.city),
    imgId: 'img-' + c.id,
    tradeLabels: c.trades.map(tradeL),
    tradeLine: c.trades.map(tradeL).join(' · '),
    top: c.rating >= 4.8,
    saveLabel: s.saved.includes(c.id) ? t.search.saved : t.search.save,
    savedFlag: s.saved.includes(c.id) ? ('true' as const) : ('false' as const),
    pending: !c.verified,
    bio: c.bio[lang],
  });

  const decorateP = (p: Project) => {
    const st = statusOf(p);
    return {
      ...p,
      title: L(p.title), desc: L(p.desc),
      cityLabel: cityL(p.city), bidsLabel: bidsN(p.bids.length), tradeLabel: tradeL(p.trade),
      budgetLabel: fmt(p.min) + ' – ' + fmt(p.max), statusLabel: t.ws.st[st], tagClass: STATUS_TAG[st],
      bidCount: p.bids.length, pct: pct(p), amount: fmt(p.amount || 0),
      contractorName: cName(p.contractorId), ownerName: uName(p.ownerId),
      timingLabel: t.post[p.timing], posted: L(p.posted),
    };
  };

  // search
  let filtered = s.contractors.filter((c) =>
    (!s.filt.city || c.city === s.filt.city)
    && (!s.filt.trade || c.trades.includes(s.filt.trade))
    && (!s.filt.verified || c.verified)
    && (!s.filt.q || (c.name.en + c.name.ar + c.trades.map(tradeL).join(' ')).toLowerCase().includes(s.filt.q.toLowerCase())));
  const results = filtered
    .sort((a, b) => (s.filt.sort === 'done' ? b.done - a.done : b.rating - a.rating))
    .map(decorateC);
  const featured = s.contractors.filter((c) => c.verified)
    .sort((a, b) => b.rating - a.rating).slice(0, 3).map(decorateC);
  const PER = 4;
  const totalPages = Math.max(1, Math.ceil(results.length / PER));
  const page = Math.min(s.page, totalPages);
  const pageItems = results.slice((page - 1) * PER, page * PER);
  const pageNums: (number | string)[] = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: (number | string)[] = [1];
    if (page > 3) out.push('…');
    for (let n = Math.max(2, page - 1); n <= Math.min(totalPages - 1, page + 1); n++) out.push(n);
    if (page < totalPages - 2) out.push('…');
    out.push(totalPages);
    return out;
  })();
  const pg = {
    items: pageNums.map((n) => ({
      n: n === '…' ? page : n, label: n === '…' ? '…' : String(n),
      gap: n === '…', cur: n === page ? ('true' as const) : ('false' as const),
    })),
    prev: Math.max(1, page - 1), next: Math.min(totalPages, page + 1),
    firstDisabled: page === 1, lastDisabled: page === totalPages,
  };

  // homeowner profile
  const hoId = (s.curId && D.USERS[s.curId]) ? s.curId : 'h1';
  const hu = D.USERS[hoId] as AnyRec;
  const cNameOf = (id: string) => D.CONTRACTORS.find((c) => c.id === id)?.name?.[lang] || id;
  const hoLiveRaw = s.reviews.filter((x) =>
    x.by === 'contractor' && s.projects.some((p) => p.id === x.pid && p.ownerId === hoId));
  const hoLive = hoLiveRaw.map((x) => ({
    who: cNameOf(s.projects.find((p) => p.id === x.pid)?.contractorId || 'c1'),
    stars: '★★★★★'.slice(0, x.stars), text: x.text, when: x.date,
  }));
  const hoAvg = (() => {
    const n = hu.reviews + hoLiveRaw.length;
    if (!n) return String(hu.rating);
    return ((hu.rating * hu.reviews + hoLiveRaw.reduce((a, x) => a + x.stars, 0)) / n).toFixed(1);
  })();
  const hp: AnyRec = {
    name: (role === 'homeowner' && hoId === 'h1' && s.user?.name) || hu[lang],
    city: cityL((hoId === 'h1' && s.hoProfile?.city) || hu.city),
    joined: hu.joined[lang], nafath: hu.nafath, isMine: role === 'homeowner',
    rating: arNumerals(hu.rating), reviews: arNumerals(hu.reviews), done: arNumerals(hu.done),
    about: (hoId === 'h1' && s.hoProfile?.about?.[lang]) || hu.about[lang],
    backRoute: role === 'contractor' ? 'cdash' : (role === 'homeowner' ? 'hdash' : 'home'),
    backLabel: role ? t.hprofile.backDash : t.nav.how,
    stats: [
      { v: arNumerals(hu.done), l: t.hprofile.sDone },
      { v: hu.onTimeApproval, l: t.hprofile.sApproval },
      { v: hu.avgApproval[lang], l: t.hprofile.sAvg },
      hu.disputes ? { v: arNumerals(hu.disputes), l: t.hprofile.sDisputes } : null,
    ].filter(Boolean),
    revs: hoLive.concat((hu.revs as AnyRec[]).map((rv) => ({
      who: cNameOf(rv.by), stars: '★★★★★'.slice(0, rv.stars), text: rv.text[lang], when: rv.when[lang],
    }))),
  };
  hp.reviews = revsN(hu.reviews + hoLiveRaw.length);
  hp.rating = String(hoAvg);
  hp.noRevs = !(hu.revs.length + hoLive.length);

  // contractor profile
  const pc = con(s.curId) || s.contractors[0];
  const coLiveRaw = pc
    ? s.reviews.filter((x) => x.by === 'homeowner' && s.projects.some((p) => p.id === x.pid && p.contractorId === pc.id))
    : [];
  const coLive = coLiveRaw.map((x) => ({
    who: uName(s.projects.find((p) => p.id === x.pid)?.ownerId || 'h1'),
    stars: '★★★★★'.slice(0, x.stars), text: x.text,
  }));
  /** Weight the seeded rating by its own review count before folding in live reviews. */
  const coAvg = pc ? (() => {
    const n = pc.reviews + coLiveRaw.length;
    if (!n) return String(pc.rating);
    return ((pc.rating * pc.reviews + coLiveRaw.reduce((a, x) => a + x.stars, 0)) / n).toFixed(1);
  })() : null;
  const prof: AnyRec = pc ? {
    ...decorateC(pc),
    portfolio: [0, 1, 2].map((i) => ({
      imgId: 'pf-' + pc.id + '-' + i,
      caption: [tradeL(pc.trades[0]), tradeL(pc.trades[pc.trades.length - 1]), cityL(pc.city)][i],
    })),
    reviewList: coLive.concat([
      {
        who: uName('h1'), stars: '★★★★★',
        text: lang === 'en'
          ? 'Clear quote, weekly updates, finished on schedule. Milestone evidence made approvals easy.'
          : 'عرض واضح وتحديثات أسبوعية وإنجاز في الوقت. إثباتات المراحل سهّلت الاعتماد.',
      },
      {
        who: uName('h2'), stars: '★★★★☆',
        text: lang === 'en'
          ? 'Good finish quality. One small delay on materials, communicated in advance.'
          : 'جودة تشطيب جيدة. تأخير بسيط في المواد تم الإبلاغ عنه مسبقًا.',
      },
    ]),
    rating: coAvg, reviews: revsN(pc.reviews + coLiveRaw.length),
    stats: [
      { v: 2026 - pc.since, l: t.profile.years },
      { v: pc.onTime + '%', l: t.profile.onTime },
      { v: pc.response + 'h', l: t.profile.response },
      (() => {
        const n = s.projects.filter((p) => p.contractorId === pc.id)
          .reduce((a, p) => a + p.ms.filter((m) => m === 'disputed').length, 0);
        return n ? { v: n, l: t.profile.disputes } : null;
      })(),
    ].filter(Boolean),
    creds: ([['id', t.admin.chk.id], ['cr', t.admin.chk.cr], ['pf', t.admin.chk.pf]] as [string, string][])
      .map(([k, label]) => ({
        label,
        status: (pc.checks as AnyRec)[k] ? t.profile.checked : t.profile.pendingS,
        color: (pc.checks as AnyRec)[k] ? '#1B7A3E' : '#8A5A00',
      })),
  } : {};

  // auth
  const a = s.auth;
  const auth = {
    isSignin: a.mode === 'signin', isSignup: a.mode === 'signup', showSteps: a.mode === 'signup',
    step1: a.step === 1, step2: a.step === 2, step3: a.step === 3,
    roleHo: a.role === 'homeowner', roleCo: a.role === 'contractor',
    f: a.f, otpCode: arNumerals(a.otpCode || ''),
    idIsId: a.f.idType === 'id', idIsIqama: a.f.idType === 'iqama',
    uploadLabel: a.uploaded ? t.auth.uploaded : t.auth.upload, error: a.error,
  };
  const authSteps = (t.auth.steps as string[]).map((label, i) => ({
    n: i + 1, label, on: i + 1 <= a.step ? ('true' as const) : ('false' as const),
    color: i + 1 <= a.step ? '#FF5A3C' : '#B9B7D0',
  }));

  // post a project
  const pst = s.post;
  const post = {
    step1: pst.step === 1, step2: pst.step === 2, step3: pst.step === 3, step4: pst.step === 4,
    f: pst.f,
    tAsap: pst.f.timing === 'asap', tMonth: pst.f.timing === 'month', tFlex: pst.f.timing === 'flexible',
    files: pst.files, hasFiles: pst.files.length > 0, fileCount: pst.files.length,
    tradeLabel: tradeL(pst.f.trade), cityLabel: cityL(pst.f.city), timingLabel: t.post[pst.f.timing],
    pledge: pst.pledge,
    sug: (() => {
      const B = D.BUDGETS[pst.f.trade];
      if (!B) return { has: false, none: true };
      const [lo, hi] = B;
      const top = Math.log10(1000);
      return {
        has: true, none: false,
        range: lang === 'ar' ? fmt(lo) + ' – ' + fmt(hi) + ' ريال' : 'SAR ' + fmt(lo) + ' – ' + fmt(hi),
        left: (Math.log10(lo / 1000) / top * 100).toFixed(1),
        width: ((Math.log10(hi / 1000) - Math.log10(lo / 1000)) / top * 100).toFixed(1),
      };
    })(),
    budgetLine: (lang === 'ar' ? pst.f.min + ' – ' + pst.f.max + ' ريال' : 'SAR ' + pst.f.min + ' – ' + pst.f.max),
    overCap: (+pst.f.max || 0) > 1000000,
    canBack: pst.step > 1, nextLabel: pst.step === 4 ? t.post.publish : t.post.next,
    error: pst.error, feeReminder: t.post.feeNext,
  };
  const postSteps = (t.post.steps as string[]).map((label, i) => ({
    n: i + 1, label, color: i + 1 <= pst.step ? '#FF5A3C' : '#B9B7D0',
  }));

  // homeowner dashboard
  const mine = s.projects.filter((x) => x.ownerId === 'h1');
  const myProjects = mine.map(decorateP);
  const released = mine.reduce(
    (sum, x) => sum + x.ledger.filter((l) => l.label === 'release').reduce((acc, l) => acc + l.amount, 0), 0);
  const hStats = [
    { v: mine.filter((x) => x.status === 'active').length, l: t.hdash.sActive },
    { v: mine.filter((x) => x.status === 'open').reduce((acc, x) => acc + x.bids.length, 0), l: t.hdash.sBids },
    { v: mine.reduce((acc, x) => acc + x.ms.filter((m) => m === 'submitted').length, 0), l: t.hdash.sApprove },
    { v: 'SAR ' + fmt(released), l: t.hdash.sReleased },
  ];
  const hActions: { pid: string; tab: string; text: string }[] = [];
  mine.forEach((x) => {
    if (x.status === 'open' && x.bids.length) {
      hActions.push({ pid: x.id, tab: 'bids', text: `${x.bids.length} ${t.hdash.actBids} ${L(x.title)}` });
    }
    if (x.status === 'active' && !x.funded) {
      hActions.push({ pid: x.id, tab: 'payments', text: `${t.hdash.actFund} ${L(x.title)}` });
    }
    if (x.ms.includes('submitted')) {
      hActions.push({ pid: x.id, tab: 'milestones', text: `${t.hdash.actApprove} ${L(x.title)}` });
    }
  });
  const savedList = s.saved.map((id) => con(id)).filter(Boolean).map((c) => decorateC(c as Contractor));

  // contractor dashboard
  const cInvolved = s.projects.filter((x) => x.contractorId === ME || x.bids.some((b) => b.cid === ME));
  const cProjects = cInvolved.map((x) => {
    const d = decorateP(x);
    const bid = x.bids.find((b) => b.cid === ME);
    const nextIndex = x.ms.findIndex((m) => m !== 'released');
    return {
      ...d,
      myBidLabel: bid ? 'SAR ' + fmt(bid.price) : t.cdash.none,
      nextMs: x.contractorId === ME && nextIndex >= 0 ? t.ws.ms[nextIndex].n : t.cdash.none,
    };
  });
  const cPend = s.projects.filter((x) => x.contractorId === ME && x.funded).reduce((acc, x) => {
    const am = msAmounts(x);
    return acc + x.ms.reduce((sum, m, i) => (m !== 'released' ? sum + am[i] : sum), 0);
  }, 0);
  const cEarned = s.projects.filter((x) => x.contractorId === ME).reduce(
    (acc, x) => acc + x.ledger.filter((l) => l.label === 'release').reduce((sum, l) => sum + l.amount, 0), 0);
  const cStats = [
    { v: s.projects.filter((x) => x.status === 'open' && !x.bids.some((b) => b.cid === ME)).length, l: t.cdash.sOpen },
    { v: s.projects.filter((x) => x.status === 'open' && x.bids.some((b) => b.cid === ME)).length, l: t.cdash.sBids },
    { v: fmt(Math.round(cPend * (1 - CONTRACTOR_COMMISSION))), l: t.cdash.sPending },
    { v: fmt(Math.round(cEarned * (1 - CONTRACTOR_COMMISSION))), l: t.cdash.sEarned },
  ];
  const cPayments: { label: string; amount: string; color: string }[] = [];
  s.projects.filter((x) => x.contractorId === ME && x.funded).forEach((x) => {
    const am = msAmounts(x);
    x.ms.forEach((m, i) => cPayments.push({
      label: `${L(x.title)} · ${t.ws.ms[i].n}`,
      amount: fmt(Math.round(am[i] * (1 - CONTRACTOR_COMMISSION))),
      color: m === 'released' ? '#1B7A3E' : '#8A5A00',
    }));
  });
  const openAll = s.projects.filter((x) => x.status === 'open');
  const openFiltered = openAll.filter((x) =>
    (!s.bfilt.city || x.city === s.bfilt.city)
    && (!s.bfilt.trade || x.trade === s.bfilt.trade)
    && (!s.bfilt.min || (x.max || 0) >= +s.bfilt.min));
  const openProjects = openFiltered.map((x) => ({
    ...decorateP(x),
    bidCta: x.bids.some((b) => b.cid === ME) ? t.browse.viewBid : t.browse.bid,
  }));
  const bf = {
    city: s.bfilt.city, trade: s.bfilt.trade, min: s.bfilt.min,
    count: openFiltered.length, empty: !openFiltered.length,
    any: !!(s.bfilt.city || s.bfilt.trade || s.bfilt.min),
  };

  // project workspace
  const pr = proj(s.curId) || s.projects[0];
  let pj: AnyRec = {};
  let pTabs: AnyRec[] = [];
  let canBid = false;
  let alreadyBid = false;
  let needsFunding = false;
  let bidNeedsNafath = false;
  let fundNeedsNafath = false;
  const tab: AnyRec = {};
  tab[s.tab] = true;
  if (pr) {
    const d = decorateP(pr);
    const st = statusOf(pr);
    const am = msAmounts(pr);
    const isOwner = role === 'homeowner';
    const isCo = role === 'contractor';
    const relTot = pr.ledger.filter((l) => l.label === 'release').reduce((acc, l) => acc + l.amount, 0);
    const nextStep = st === 'open' ? (isCo ? t.ws.next.openCo : t.ws.next.open)
      : st === 'funding' ? (isCo ? t.ws.next.fundingCo : t.ws.next.funding)
        : st === 'active' ? (isCo ? t.ws.next.activeCo : t.ws.next.activeHo)
          : t.ws.next.completed;
    pj = {
      ...d,
      amount: fmt(pr.amount || pr.max),
      amountLabel: pr.amount ? t.ws.amountAgreed : t.ws.amountBudget,
      showAddFunds: isOwner, showBudgetRow: !pr.amount,
      msSummary: `${pr.ms.filter((m) => m === 'released').length}/${pr.ms.length} ${t.ws.next.msDone}`,
      nextStep,
      bidRows: pr.bids.map((b) => {
        const c = con(b.cid) as Contractor;
        return {
          cid: b.cid, name: c.name[lang], rating: c.rating, done: c.done, verified: c.verified,
          price: fmt(b.price), days: b.days, note: L(b.note),
          accepted: pr.contractorId === b.cid, canAccept: isOwner && pr.status === 'open',
        };
      }),
      msRows: pr.ms.map((m, i) => {
        const evidence = ev(pr, i);
        const unlocked = pr.ms.slice(0, i).every((x) => x === 'released');
        const coStage = isCo && pr.funded && m === 'pending' && unlocked;
        return {
          n: i + 1, name: t.ws.ms[i].n, desc: t.ws.ms[i].d, amount: fmt(am[i]),
          statusLabel: t.ws.msSt[m], tagClass: MS_TAG[m],
          ring: m === 'released' ? '#1B7A3E' : m === 'submitted' ? '#FF7722' : '#B9B7D0',
          fill: m === 'released' ? '#1B7A3E' : '#fff',
          ink: m === 'released' ? '#fff' : '#1B1464',
          i, evP: evidence.p, evV: evidence.v, evO: evidence.o,
          needPhoto: !evidence.p, needVideo: !evidence.v, needOwner: !evidence.o,
          photoLabel: evidence.p ? t.ws.evDone : t.ws.evAdd,
          videoLabel: evidence.v ? t.ws.evDone : t.ws.evAdd,
          ownerLabel: evidence.o ? t.ws.evDone : t.ws.evAdd,
          showCoEv: coStage, showOwnerEv: isOwner && m === 'submitted',
          canSubmit: coStage && evidence.p && evidence.v,
          submitBlocked: coStage && (!evidence.p || !evidence.v),
          canApprove: isOwner && m === 'submitted' && evidence.o,
          approveBlocked: isOwner && m === 'submitted' && !evidence.o,
          lockedNote: isCo && m === 'pending' && !unlocked
            ? t.ws.evLocked
            : (isCo && m === 'pending' && !pr.funded ? t.ws.evFundFirst : ''),
          autoLabel: m === 'submitted' ? t.auto.remain + daysN(AUTO_DAYS) : '',
          autoNote: t.auto.noteA + daysN(AUTO_DAYS) + t.auto.noteB,
          showAuto: m === 'submitted',
          canResolve: (isOwner || role === 'admin') && m === 'disputed',
        };
      }),
      msgRows: pr.msgs.map((m) => {
        const mineMsg = (m.from === 'h' && isOwner) || (m.from === 'c' && isCo);
        const who = m.from === 'h'
          ? (isOwner ? t.ws.you : uName(pr.ownerId))
          : (isCo ? t.ws.you : cName(pr.contractorId || pr.bids[0]?.cid || null));
        return {
          who, time: m.time, text: scrub(L(m.text)),
          align: mineMsg ? 'flex-end' : 'flex-start',
          bg: mineMsg ? '#1B1464' : '#F1F0FA',
          ink: mineMsg ? '#fff' : '#14113F',
        };
      }),
      files: pr.files.map((f) => ({
        ...f, date: L(f.date), by: f.by === 'h' ? uName(pr.ownerId) : cName(pr.contractorId),
      })),
      payStats: [
        { v: fmt(pr.funded ? pr.amount : 0), l: t.ws.committed },
        { v: fmt(relTot), l: t.ws.released },
        { v: fmt(pr.funded ? pr.amount - relTot : 0), l: t.ws.remaining },
      ],
      ledger: pr.ledger.map((l) => ({
        date: l.date, amount: fmt(l.amount),
        label: l.label === 'fund' ? t.ws.ledgerFund
          : l.label === 'fee' ? t.ws.ledgerFee
            : t.ws.ledgerRelease + t.ws.ms[l.ms as number].n,
      })),
    };
    const counts: AnyRec = {
      bids: pr.bids.length, milestones: pr.ms.length,
      messages: pr.msgs.length, files: pr.files.length,
    };
    pTabs = ['overview', 'bids', 'milestones', 'messages', 'files', 'payments'].map((id, i) => ({
      id, label: t.ws.tabs[i], sel: s.tab === id ? ('true' as const) : ('false' as const), count: counts[id] || 0,
    }));
    const nafOk = !!s.user?.nafath;
    const bidStage = isCo && pr.status === 'open' && !pr.bids.some((b) => b.cid === ME);
    if (pr.pending) pj.bidRows = pj.bidRows.map((b: AnyRec) => ({ ...b, canAccept: false }));
    canBid = bidStage && nafOk;
    bidNeedsNafath = bidStage && !nafOk;
    alreadyBid = isCo && pr.status === 'open' && pr.bids.some((b) => b.cid === ME);
    const fundStage = isOwner && pr.status === 'active' && !pr.funded;
    needsFunding = fundStage && nafOk;
    fundNeedsNafath = fundStage && !nafOk;
  }

  // admin
  const verifQueue = s.contractors.filter((c) => !c.verified && !s.rejected.includes(c.id)).map((c) => ({
    id: c.id, name: c.name[lang], city: cityL(c.city), date: '4 Sep 2026',
    checks: ([['id', t.admin.chk.id], ['cr', t.admin.chk.cr], ['pf', t.admin.chk.pf]] as [string, string][])
      .map(([k, label]) => ({
        label: ((c.checks as AnyRec)[k] ? '✓ ' : '· ') + label,
        cls: (c.checks as AnyRec)[k] ? 'tag-g' : 'tag-w',
      })),
  }));
  const adminTabs = ['overview', 'verification', 'support', 'payments', 'users'].map((id, i) => ({
    id, label: t.admin.tabs[i], cur: s.atab === id ? ('page' as const) : ('false' as const),
    count: id === 'verification' ? verifQueue.length : id === 'support' ? s.cases.filter((c) => c.open).length : 0,
  }));
  const atab: AnyRec = {};
  atab[s.atab] = true;
  const releasedOf = (p: Project) =>
    p.ledger.filter((l) => l.label === 'release').reduce((acc, l) => acc + l.amount, 0);
  const held = s.projects.filter((x) => x.funded).reduce((acc, x) => acc + x.amount - releasedOf(x), 0);
  const relTotal = s.projects.reduce((acc, p) => acc + releasedOf(p), 0);
  const feesCharged = s.projects.reduce(
    (acc, p) => acc + p.ledger.filter((l) => l.label === 'fee').reduce((sum, l) => sum + l.amount, 0), 0);
  const fundedTotal = s.projects.reduce(
    (acc, p) => acc + p.ledger.filter((l) => l.label === 'fund').reduce((sum, l) => sum + l.amount, 0), 0);
  const commEarned = Math.round(relTotal * CONTRACTOR_COMMISSION);
  const contractorsEarned = relTotal - commEarned;
  const revReal = commEarned + feesCharged;
  const activePipe = s.projects.filter((p) => p.status === 'active')
    .reduce((acc, p) => acc + (p.amount - releasedOf(p)), 0);
  const openPipe = s.projects.filter((p) => p.status === 'open')
    .reduce((acc, p) => acc + Math.round((p.min + p.max) / 2), 0);
  const revProj = Math.round(activePipe * CONTRACTOR_COMMISSION)
    + Math.round(openPipe * (CONTRACTOR_COMMISSION + HOMEOWNER_FEE));
  const awarded = s.projects.filter((p) => p.amount > 0);
  const avgProject = awarded.length
    ? Math.round(awarded.reduce((acc, p) => acc + p.amount, 0) / awarded.length) : 0;
  const revTotal = revReal + revProj;
  const totalPaid = fundedTotal + feesCharged;
  const fin = {
    paid: fmt(totalPaid), coEarned: fmt(contractorsEarned), revReal: fmt(revReal),
    revProj: fmt(revProj), revTotal: fmt(revTotal), comm: fmt(commEarned), fees: fmt(feesCharged),
    held: fmt(held), avg: fmt(avgProject),
    coPct: totalPaid ? Math.round(contractorsEarned / totalPaid * 100) : 0,
    tmPct: totalPaid ? Math.round(revReal / totalPaid * 100) : 0,
    escPct: totalPaid
      ? 100 - Math.round(contractorsEarned / totalPaid * 100) - Math.round(revReal / totalPaid * 100) : 0,
    realPct: revTotal ? Math.round(revReal / revTotal * 100) : 0,
    projPct: revTotal ? 100 - Math.round(revReal / revTotal * 100) : 0,
    commPct: revReal ? Math.round(commEarned / revReal * 100) : 0,
    feePct: revReal ? 100 - Math.round(commEarned / revReal * 100) : 0,
  };
  const adminQuick = [
    { v: s.projects.length, l: t.admin.sProjects, color: '#1B1464' },
    { v: s.contractors.length, l: t.admin.sContractors, color: '#1B1464' },
    { v: Object.keys(D.USERS).length, l: t.admin.sHomeowners, color: '#1B1464' },
    { v: fmt(held), l: t.admin.sHeld, color: '#1B1464' },
  ];
  const adminStats = adminQuick.map(({ v, l }) => ({ v, l }));
  const cases = s.cases.map((c) => ({
    id: c.id, project: L(proj(c.pid)?.title), issue: L(c.issue), open: c.open,
    status: c.open ? t.admin.open : t.admin.resolved, cls: c.open ? 'tag-a' : 'tag-g',
  }));
  const payRows: AnyRec[] = [];
  s.projects.filter((x) => x.funded).forEach((x) => {
    const am = msAmounts(x);
    x.ms.forEach((m, i) => {
      if (m !== 'released') {
        payRows.push({
          project: L(x.title), ms: t.ws.ms[i].n, amount: fmt(am[i]),
          status: t.ws.msSt[m], cls: MS_TAG[m],
        });
      }
    });
  });
  const userRows = [
    ...Object.values(D.USERS).map((u) => ({
      name: (u as AnyRec)[lang], role: t.roles.homeowner, city: cityL(u.city),
      status: t.admin.active, cls: 'tag-g',
    })),
    ...s.contractors.map((c) => ({
      name: c.name[lang], role: t.roles.contractor, city: cityL(c.city),
      status: c.verified ? t.verified : s.rejected.includes(c.id) ? t.admin.rejected : t.admin.pending,
      cls: c.verified ? 'tag-g' : s.rejected.includes(c.id) ? 'tag-a' : 'tag-w',
    })),
  ];

  // pricing calculator
  const V = Math.max(10000, s.calcRaw || 10000);
  const fee = Math.round(V * HOMEOWNER_FEE);
  const comm = Math.round(V * CONTRACTOR_COMMISSION);
  const hoPays = V + fee;
  const calc = {
    raw: V, value: fmt(V), first: s.calcFirst, hoPays: fmt(hoPays), comm: fmt(comm),
    coGets: fmt(V - comm), fee: fmt(fee), feeLabel: '+ SAR ' + fmt(fee), feeColor: '#1B1464',
    coPct: Math.round((V - comm) / hoPays * 100),
    tmPct: 100 - Math.round((V - comm) / hoPays * 100),
    big: V >= 1000000, draft: s.calcDraft,
  };
  const priceCards = ((s.prole === 'contractor' ? t.pricing2.coCards : t.pricing2.hoCards) as AnyRec[])
    .map((p) => ({
      ...p,
      border: /%/.test(p.rate) ? '#FF7722' : '#E6E5F0',
      badgeCls: /%/.test(p.rate) ? 'tag-a' : 'tag-n',
    }));
  const ruleWord = lang === 'ar' ? 'قاعدة' : 'Rule';
  const ruleNums = ['01', '02', '03', '04'];
  const trustRules = (t.home.trust as AnyRec[]).map((x, i) => ({
    ...x, n: ruleNums[i], k: ruleWord + ' ' + ruleNums[i],
  }));
  const faqs = (t.faq.items as AnyRec[]).map((q, i) => ({
    ...q, open: s.openFaq === i, sign: s.openFaq === i ? '−' : '+',
  }));

  // wallet
  const W = t.wallet as AnyRec;
  const fmtN = (n: number) => fmt(Math.max(0, Math.round(n)));
  const myPs = s.projects.filter((p) => (role === 'contractor' ? p.contractorId === ME : p.ownerId === 'h1'));
  const escrowHeld = myPs.filter((p) => p.funded)
    .reduce((acc, p) => acc + Math.max(0, p.amount - releasedOf(p)), 0);
  const releasedAll = myPs.reduce((acc, p) => acc + releasedOf(p), 0);
  const awaiting = myPs.filter((p) => p.funded).reduce((acc, p) => {
    const am = msAmounts(p);
    return acc + p.ms.reduce((sum, m, i) => (m === 'submitted' ? sum + am[i] : sum), 0);
  }, 0);
  const depositsPending = s.txns
    .filter((x) => x.who === 'h1' && x.type === 'deposit' && x.st === 'pending')
    .reduce((acc, x) => acc + x.amount, 0);
  const depositsIn = s.txns
    .filter((x) => x.who === 'h1' && x.type === 'deposit' && x.st === 'escrow')
    .reduce((acc, x) => acc + x.amount, 0);
  const paidOut = s.txns.filter((x) => x.who === ME && x.type === 'payout')
    .reduce((acc, x) => acc + x.amount, 0);
  const coNet = Math.round(releasedAll * (1 - CONTRACTOR_COMMISSION));
  const availableRaw = Math.max(0, coNet - paidOut);
  const isCoW = role === 'contractor';
  const methodDefs = [
    { id: 'mada', label: W.mada, note: W.madaNote },
    { id: 'apple', label: W.applePay, note: W.applePayNote },
    { id: 'visa', label: W.visa, note: W.visaNote },
    { id: 'transfer', label: W.transfer, note: W.transferNote },
  ];
  const ledgerRows: AnyRec[] = [];
  myPs.forEach((p) => p.ledger
    .filter((l) => (isCoW ? l.label === 'release' : true))
    .forEach((l) => ledgerRows.push({
      date: l.date,
      label: (W.types[l.label] || l.label) + ' · ' + L(p.title),
      method: l.label === 'release' ? W.bank : '—',
      amount: (isCoW && l.label === 'release')
        ? Math.round(l.amount * (1 - CONTRACTOR_COMMISSION)) : l.amount,
      st: l.label === 'release' ? 'released' : 'done',
      sign: isCoW ? 1 : -1,
    })));
  const myTxns = s.txns.filter((x) => x.who === (isCoW ? ME : 'h1'));
  const txRows = myTxns.map((x) => ({
    date: x.date, label: W.types[x.type],
    method: x.method === 'bank' ? W.bank : (methodDefs.find((m) => m.id === x.method)?.label || W.bank),
    amount: x.amount, st: x.st, sign: x.type === 'payout' ? -1 : 1,
  }));
  const allRows = [...txRows, ...ledgerRows];
  const po = s.payout;
  const poIban = String(po.iban || '').replace(/\s/g, '');
  const poD = po.draft || {};
  const pa = {
    saved: po.saved && !po.editing, editing: po.editing, empty: !po.saved && !po.editing,
    showEdit: po.saved && !po.editing, canCancel: po.saved, error: po.error,
    f: { bank: poD.bank || '', holder: poD.holder || '', iban: poD.iban || '' },
    bank: po.bank, holder: po.holder,
    ibanMasked: poIban.length >= 14
      ? poIban.slice(0, 6) + ' •••• •••• ' + poIban.slice(-4) : poIban,
  };
  const hed = s.hedit
    ? { open: true, f: { name: s.hedit.name, city: s.hedit.city, about: s.hedit.about }, error: s.hedit.error }
    : { open: false, f: {} as AnyRec, error: '' };
  const ed = s.edit ? {
    open: true,
    f: { name: s.edit.name, city: s.edit.city, bio: s.edit.bio },
    error: s.edit.error,
    trades: D.TRADES
      .filter((x) => ['full', 'kitchen', 'bathroom', 'painting', 'flooring', 'electrical', 'plumbing', 'ac', 'carpentry', 'gypsum', 'interior', 'structural'].includes(x.id))
      .map((x) => ({ id: x.id, label: x[lang], sel: s.edit!.trades.includes(x.id) ? ('true' as const) : ('false' as const) })),
  } : { open: false, f: {} as AnyRec, trades: [] as AnyRec[], error: '' };
  const wl = {
    isHo: role === 'homeowner', isCo: isCoW,
    title: isCoW ? W.coTitle : W.hoTitle, sub: isCoW ? W.coSub : W.hoSub,
    stats: isCoW
      ? [
        { v: fmtN(availableRaw), l: W.available, color: '#15703A' },
        { v: fmtN(awaiting), l: W.pendingRelease, color: '#1B1464' },
        { v: fmtN(paidOut), l: W.withdrawn, color: '#1B1464' },
      ]
      : [
        { v: fmtN(escrowHeld + depositsIn), l: W.inEscrow, color: '#1B1464' },
        { v: fmtN(awaiting), l: W.pendingRelease, color: '#B26B00' },
        { v: fmtN(releasedAll), l: W.releasedTo, color: '#15703A' },
      ],
    amount: s.wl.amount, error: s.wl.error, notice: s.wl.notice,
    methods: methodDefs.map((m) => ({
      ...m, on: s.wl.method === m.id, sel: s.wl.method === m.id ? ('true' as const) : ('false' as const),
    })),
    showBank: s.wl.method === 'transfer',
    bankName: lang === 'ar' ? 'البنك السعودي الأول' : 'Saudi Awwal Bank',
    beneficiary: lang === 'ar' ? 'ترميم للوساطة الإلكترونية' : 'Tarmem Digital Brokerage',
    escrowIban: 'SA03 8000 0000 6080 1016 7519', ref: 'TRM-H1-4821',
    availableRaw, availableNum: fmtN(availableRaw), pendingDeposits: fmtN(depositsPending),
    rows: allRows.map((x) => ({
      date: x.date, label: x.label, method: x.method,
      amount: (x.sign > 0 ? '+' : '−') + ' SAR ' + fmt(x.amount),
      color: x.sign > 0 ? '#15703A' : '#1B1464',
      st: W.st[x.st] || x.st,
      tag: x.st === 'processing' || x.st === 'pending' ? 'tag-w' : x.st === 'escrow' ? 'tag-n' : 'tag-g',
    })),
    noRows: !allRows.length,
  };

  // project withdrawal
  const pe = {
    canWithdraw: !!pj && pj.status === 'open' && role === 'homeowner',
    locked: !!pj && pj.status === 'active' && role === 'homeowner',
    idle: !s.withdrawAsk, asking: s.withdrawAsk,
  };

  // settings
  const SG = s.setg;
  const hasActive = s.projects.some((p) => p.ownerId === 'h1' && p.funded && p.status === 'active');
  const st = {
    mobile: SG.mobile, email: SG.email, notice: SG.notice,
    otherLang: lang === 'ar' ? 'English' : 'العربية',
    canClose: !hasActive, closeBlocked: hasActive,
    prefs: ([
      ['pBids', t.settings.pBids, false], ['pStages', t.settings.pStages, false],
      ['pPay', t.settings.pPay, true], ['pMsg', t.settings.pMsg, false],
      ['pNews', t.settings.pNews, false],
    ] as [string, string, boolean][]).map(([id, label, locked]) => ({
      id, label, locked, on: locked ? true : !!SG.prefs[id],
    })),
  };

  // reviews and notifications
  const myRev = s.reviews.find((x) => x.pid === s.curId && x.by === role);
  const rev = {
    show: !!pj && pj.status === 'completed' && (role === 'homeowner' || role === 'contractor') && !myRev,
    done: !!myRev, sub: role === 'contractor' ? t.rev.subCo : t.rev.subHo,
    starList: [1, 2, 3, 4, 5].map((n) => ({ n, on: n <= s.revF.stars ? ('true' as const) : ('false' as const) })),
    hint: s.revF.stars ? '★'.repeat(s.revF.stars) : t.rev.starHint,
    text: s.revF.text, error: s.revF.error,
    myStars: myRev ? '★★★★★'.slice(0, myRev.stars) : '',
    myText: myRev ? myRev.text : '',
  };

  const myProj = s.projects.filter((p) => (role === 'contractor' ? p.contractorId === ME : p.ownerId === 'h1'));
  const nItems: AnyRec[] = [];
  myProj.forEach((p) => {
    const ttl = L(p.title);
    p.ms.forEach((m, i) => {
      if (m === 'submitted') {
        nItems.push({
          id: p.id + '-s' + i, pid: p.id, kind: role === 'homeowner' ? 'approve' : 'submitted',
          title: ttl, body: t.ws.ms[i].n, tag: t.ws.msSt.submitted, cls: 'tag-w',
        });
      }
      if (m === 'disputed') {
        nItems.push({
          id: p.id + '-d' + i, pid: p.id, kind: 'dispute', title: ttl,
          body: t.ws.ms[i].n, tag: t.ws.msSt.disputed, cls: 'tag-a',
        });
      }
    });
    if (p.status === 'open' && p.bids.length) {
      nItems.push({
        id: p.id + '-b', pid: p.id, kind: 'bids', title: ttl,
        body: bidsN(p.bids.length), tag: t.ws.st.open, cls: 'tag-n',
      });
    }
    if (p.status === 'active' && !p.funded) {
      nItems.push({
        id: p.id + '-f', pid: p.id, kind: 'fund', title: ttl,
        body: t.ws.fundTitle, tag: t.ws.st.funding, cls: 'tag-w',
      });
    }
    if (p.status === 'completed' && !s.reviews.some((x) => x.pid === p.id && x.by === role)) {
      nItems.push({
        id: p.id + '-r', pid: p.id, kind: 'review', title: ttl,
        body: t.rev.pending, tag: t.ws.st.completed, cls: 'tag-g',
      });
    }
  });
  const unread = nItems.filter((x) => !s.notifRead.includes(x.id));
  const nt = {
    items: nItems.map((x) => ({ ...x, unread: !s.notifRead.includes(x.id) })),
    count: unread.length, hasAny: !!nItems.length, empty: !nItems.length,
    open: s.notifOpen, badge: unread.length || '',
  };

  const dataset = (e: ClickEvent) => e.currentTarget.dataset;

  return {
    dir: (lang === 'ar' ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    t, r, cur, user: s.user ?? { role: 'homeowner' as Role, name: '' },
    isGuest: !role, isUser: !!role,
    isHomeowner: role === 'homeowner', isContractor: role === 'contractor',
    isNotContractor: role !== 'contractor', isAdmin: role === 'admin',
    featured, results: pageItems, resultCount: arNumerals(results.length), pg,
    pageFrom: arNumerals(results.length ? (page - 1) * PER + 1 : 0),
    pageTo: arNumerals(Math.min(page * PER, results.length)),
    filt: s.filt, prof,
    cities: D.CITIES.map((c) => ({ id: c.id, label: c[lang] })),
    trades: D.TRADES.map((c) => ({ id: c.id, label: c[lang] })),
    tradeGroups: D.TRADE_GROUPS.map((g) => ({
      label: g[lang],
      items: D.TRADES.filter((c) => c.g === g.id).map((c) => ({ id: c.id, label: c[lang] })),
    })),

    showAiPill: s.scrolled && s.route === 'home',
    toAiBar: () => {
      const el = document.getElementById('v-ai-in');
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 140;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        setTimeout(() => el.focus(), 420);
      }
    },
    aiText: s.aiText || '',
    aiEmpty: !String(s.aiText || '').trim(),
    setAi: (e: ValueEvent) => setState({ aiText: e.currentTarget.value }),
    aiSug: ((t.ai.sug || []) as string[]).map((q) => ({ q })),
    useSug: (e: ClickEvent) => setState({ aiText: dataset(e).q }),
    aiAttachLabel: (s.aiFiles || []).length
      ? ((s.aiFiles || []).length + ' ' + t.ai.attached) : t.ai.attach,
    aiAttach: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.onchange = () => {
        const names = [...(input.files || [])].map((f) => f.name);
        setState((prev) => ({ aiFiles: [...(prev.aiFiles || []), ...names] }));
      };
      input.click();
    },
    rmAiFile: (e: ClickEvent) => {
      const i = +(dataset(e).i as string);
      setState((prev) => ({ aiFiles: (prev.aiFiles || []).filter((_x, ix) => ix !== i) }));
    },
    arrowPath: lang === 'ar' ? 'M19 12H5M12 19l-7-7 7-7' : 'M5 12h14M12 5l7 7-7 7',
    arrowBackPath: lang === 'ar' ? 'M19 12H5M12 19l-7-7 7-7' : 'M5 12h14M12 5l7 7-7 7',
    heroAlt: lang === 'ar'
      ? 'مقطع أيزومتري لغرفة معيشة، من الرسم الأولي إلى التنفيذ'
      : 'Isometric cutaway of a living room, from outline drawing to finished space',

    howSteps: (s.howTab === 'co' ? (t.how.coSteps || []) : (t.how.hoSteps || [])) as AnyRec[],
    howHo: s.howTab === 'co' ? ('false' as const) : ('true' as const),
    howCo: s.howTab === 'co' ? ('true' as const) : ('false' as const),
    setHowTab: (e: ClickEvent) =>
      setState({ howTab: dataset(e).tab as 'ho' | 'co' }),

    tc: (() => {
      const co = s.auth.role === 'contractor';
      return {
        title: co ? t.auth.tcCo : t.auth.tcHo,
        secs: ((co ? (t.auth.tcCoSecs || []) : (t.auth.tcHoSecs || [])) as string[])
          .map((label) => ({ label })),
        agree: co ? t.auth.tcAgreeCo : t.auth.tcAgreeHo,
        href: co ? 'assets/tarmem-contractor-guidelines.pdf' : 'assets/tarmem-homeowner-guide.pdf',
      };
    })(),

    agr: (() => {
      const g = s.agr;
      if (!g || !pr) return { open: false, notRead: true, rows: [] as AnyRec[], secs: [] as AnyRec[] };
      const bid = pr.bids.find((b) => b.cid === g.cid);
      const c = con(g.cid);
      return {
        open: true, notRead: !g.read,
        signLabel: role === 'contractor' ? t.agr.signCo : t.agr.signHo,
        rows: [
          { k: t.agr.pProject, v: L(pr.title) },
          { k: t.agr.pCity, v: cityL(pr.city) },
          { k: t.agr.pOwner, v: uName(pr.ownerId) },
          { k: t.agr.pContractor, v: c ? c.name[lang] : '' },
          { k: t.agr.pAmount, v: bid ? 'SAR ' + fmt(bid.price) : '' },
          { k: t.agr.pDays, v: bid ? daysN(bid.days) : '' },
          { k: t.agr.pStages, v: arNumerals(3) },
          { k: t.agr.pDate, v: new Date().toISOString().slice(0, 10) },
        ],
        secs: ((t.agr.secs || []) as string[]).map((label) => ({ label })),
      };
    })(),
    agrPend: (() => {
      if (!pr || !pr.pending) return { show: false, canSign: false, text: '' };
      return {
        show: true, canSign: role === 'contractor',
        text: role === 'contractor' ? t.agr.waitCoSelf : t.agr.waitCo,
      };
    })(),
    agrCard: (() => {
      const g = pr && pr.sig;
      if (!g || !g.ho || !g.co) return { show: false, rows: [] as AnyRec[] };
      return {
        show: true,
        rows: [
          { who: t.agr.pOwner, name: g.ho.name, at: g.ho.at },
          { who: t.agr.pContractor, name: g.co.name, at: g.co.at },
        ],
      };
    })(),

    annoA: (t.v3.annos || [])[0], annoB: (t.v3.annos || [])[1], annoC: (t.v3.annos || [])[2],
    heroSteps: ((t.v3.cardSteps || []) as string[]).map((label, i) => ({
      label, mark: i < 2 ? '✓' : '', cls: i < 2 ? 'v-tick' : 'v-tickoff',
      color: i < 2 ? '#2E2A34' : '#6E685E',
    })),
    showNavCta: s.route !== 'home',
    heroOn: s.heroOn !== false,
    replayHero: () => {
      setState({ heroOn: false });
      setTimeout(() => setState({ heroOn: true }), 50);
    },
    heroFrames: ((t.v2.frames || []) as string[]).map((l, i) => ({
      n: String(i + 1).padStart(2, '0'), l,
    })),
    heroTitle: t.home.heroTitle,
    trustStrip: t.home.stats || [],
    stepRows: t.home.steps || [],
    faqTop: ((t.faq.items || []) as AnyRec[]).slice(0, 4),
    svcGroups: (() => {
      const order = ['plan', 'shell', 'finish', 'systems', 'exterior', 'tech', 'after'];
      const labels = (t.v2.groups || {}) as AnyRec;
      const byGroup: Record<string, typeof D.TRADES> = {};
      D.TRADES.forEach((x) => {
        (byGroup[x.g] = byGroup[x.g] || []).push(x);
      });
      const keys = order.filter((k) => byGroup[k]).concat(Object.keys(byGroup).filter((k) => !order.includes(k)));
      return keys.map((k) => ({
        label: labels[k] || k,
        items: byGroup[k].map((x) => ({
          id: x.id, label: x[lang],
          n: (() => {
            const count = s.contractors.filter((c) => c.trades.includes(x.id)).length;
            return count ? arNumerals(count) : '';
          })(),
        })),
      }));
    })(),
    pickTrade: (e: ClickEvent) => {
      const id = dataset(e).id as string;
      setState({ filt: { ...s.filt, trade: id } });
      nav('contractors');
    },

    startPlan: () => {
      const txt = String(s.aiText || '').trim();
      if (!txt) {
        document.getElementById('v-ai-in')?.focus();
        return;
      }
      setState(
        { aiText: '', plan: { ...emptyPlan(), msgs: [{ role: 'user', text: txt }], busy: true } },
        () => { void askAssistant(); },
      );
      nav('plan');
    },
    restartPlan: () => setState({ plan: emptyPlan() }),
    setPlanQ: (e: ValueEvent) => setState({ plan: { ...s.plan, q: e.currentTarget.value } }),
    sendAnswer: () => {
      const q = String(s.plan.q || '').trim();
      if (!q) return;
      setState(
        { plan: { ...s.plan, msgs: [...s.plan.msgs, { role: 'user', text: q }], q: '', busy: true, error: '' } },
        () => { void askAssistant(); },
      );
    },
    setBriefField: (e: FieldEvent) => {
      const { name, value } = e.currentTarget;
      setState((prev) => ({
        plan: {
          ...prev.plan,
          brief: { ...prev.plan.brief, [name]: value },
          touched: prev.plan.touched.includes(name) ? prev.plan.touched : [...prev.plan.touched, name],
        },
      }));
    },
    runMatch: () => { void runMatchAI(); },
    /** Carry the brief into the ordinary posting form, which works with or without the assistant. */
    toPost: () => {
      const b = s.plan.brief;
      const norm = (str: string) => String(str || '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
      const nums = [...norm(b.budget).matchAll(/([\d,.]+)\s*(ألف|الف|k)?/gi)]
        .map((m) => {
          const n = parseFloat(m[1].replace(/,/g, ''));
          return isFinite(n) ? (m[2] ? n * 1000 : n) : null;
        })
        .filter((n): n is number => !!n && n >= 100)
        .sort((x, y) => x - y);
      const cityRec = D.CITIES.find((c) => c.ar === b.city || c.en === b.city || c.id === b.city);
      const tr = D.TRADES.find((x) =>
        b.type && (String(b.type).includes(x[lang]) || String(x[lang]).includes(String(b.type).trim())));
      const desc = [b.scope, b.space].filter(Boolean).join(' — ');
      setState({
        post: {
          ...s.post, step: 1, error: '',
          f: {
            ...s.post.f,
            title: b.type || s.post.f.title,
            trade: tr ? tr.id : s.post.f.trade,
            desc: desc || s.post.f.desc,
            city: cityRec ? cityRec.id : s.post.f.city,
            timing: s.post.f.timing,
            min: nums.length > 1 ? String(Math.round(nums[0])) : '',
            max: nums.length ? String(Math.round(nums[nums.length - 1])) : '',
          },
        },
      });
      nav('post');
    },
    pl: (() => {
      const p = s.plan;
      const labels: AnyRec = {
        type: t.ai.fType, city: t.ai.fCity, space: t.ai.fSpace,
        scope: t.ai.fScope, budget: t.ai.fBudget, timing: t.ai.fTiming,
      };
      const miss = bKeys().filter((k) => !String(p.brief[k] || '').trim());
      return {
        msgs: p.msgs.map((m) => ({ text: m.text, cls: m.role === 'user' ? 'v-msgu' : 'v-msga' })),
        busy: p.busy, hasError: !!p.error, error: p.error, q: p.q,
        qEmpty: !String(p.q || '').trim(), canAnswer: !p.busy, isEmpty: p.msgs.length === 0,
        fields: bKeys().map((k) => ({
          k, dom: 'v-b-' + k, label: labels[k], v: p.brief[k] || '', ph: t.ai.empty,
        })),
        draftTitle: String(p.brief.type || '').trim(),
        hasTitle: !!String(p.brief.type || '').trim(),
        hasMissing: miss.length > 0,
        missingLabel: t.ai.missing + ' · ' + arNumerals(miss.length),
        files: (s.aiFiles || []).map((name, i) => ({ name, i, rm: '×' })),
        matching: p.matching, hasMatches: p.matches.length > 0,
        matchDisabled: p.matching || !String(p.brief.type || '').trim(),
        matches: p.matches.map((m) => {
          const c = (con(m.id) || {}) as Partial<Contractor>;
          return {
            id: m.id, name: c.name ? c.name[lang] : m.id, verified: !!c.verified,
            meta: [cityL(c.city as string), '★ ' + c.rating, c.done + ' ' + t.projectsWord].join(' · '),
            why: m.why, whyLabel: t.ai.why + ':',
          };
        }),
      };
    })(),

    wl, pa, ed, hed,
    openHoEdit: () => {
      const o = s.hoProfile || {};
      const u = D.USERS.h1 as AnyRec;
      setState({
        hedit: {
          name: s.user?.name || u[lang], city: o.city || u.city,
          about: o.about?.[lang] ?? u.about[lang], error: '',
        },
      });
    },
    closeHoEdit: () => setState({ hedit: null }),
    setHoEdit: (e: FieldEvent) => {
      const { name, value } = e.currentTarget;
      setState((prev) => ({ hedit: { ...prev.hedit!, [name]: value, error: '' } }));
    },
    saveHoEdit: () => {
      const d = s.hedit!;
      if (!String(d.name || '').trim()) {
        setState({ hedit: { ...d, error: t.hprofile.errName } });
        return;
      }
      setState({
        hoProfile: {
          ...(s.hoProfile || {}), city: d.city,
          about: { ...((s.hoProfile || {}).about || {}), [lang]: d.about },
        },
        user: { ...s.user!, name: d.name.trim() },
        hedit: null,
      });
    },
    openEdit: () => {
      const c = con(ME) as Contractor;
      setState({
        edit: { name: c.name[lang], city: c.city, trades: [...c.trades], bio: c.bio[lang], error: '' },
      });
    },
    closeEdit: () => setState({ edit: null }),
    setEdit: (e: FieldEvent) => {
      const { name, value } = e.currentTarget;
      setState((prev) => ({ edit: { ...prev.edit!, [name]: value, error: '' } }));
    },
    toggleEditTrade: (e: ClickEvent) => {
      const id = dataset(e).id as string;
      const current = s.edit!.trades;
      setState({
        edit: {
          ...s.edit!,
          trades: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
          error: '',
        },
      });
    },
    /** Rating, delivery record and verification stay computed from real work. */
    saveEdit: () => {
      const d = s.edit!;
      if (!String(d.name || '').trim()) {
        setState({ edit: { ...d, error: t.profile.errName } });
        return;
      }
      if (!d.trades.length) {
        setState({ edit: { ...d, error: t.profile.errTrades } });
        return;
      }
      setState({
        contractors: s.contractors.map((c) => (c.id === ME
          ? {
            ...c, name: { ...c.name, [lang]: d.name.trim() }, city: d.city,
            trades: d.trades, bio: { ...c.bio, [lang]: d.bio },
          }
          : c)),
        edit: null,
        user: s.user ? { ...s.user, name: d.name.trim() } : s.user,
      });
    },

    isNotAdmin: role === 'homeowner' || role === 'contractor',
    navOpenAttr: s.navOpen ? ('true' as const) : ('false' as const),
    toggleNav: () => setState({ navOpen: !s.navOpen }),

    setAccount: (e: FieldEvent) => {
      const { name, value } = e.currentTarget;
      setState({
        payout: { ...s.payout, draft: { ...(s.payout.draft || {}), [name]: value }, error: '' },
      });
    },
    editAccount: () => setState({
      payout: {
        ...s.payout, editing: true, error: '',
        draft: { bank: s.payout.bank, holder: s.payout.holder || s.user?.name || '', iban: s.payout.iban },
      },
    }),
    cancelAccount: () => setState({ payout: { ...s.payout, editing: false, error: '', draft: null } }),
    /** The IBAN must match the Nafath-verified name — no third-party accounts. */
    saveAccount: () => {
      const p = s.payout;
      const d = p.draft || {};
      const iban = String(d.iban || '').replace(/\s/g, '').toUpperCase();
      if (!d.bank) {
        setState({ payout: { ...p, error: t.wallet.errBank } });
        return;
      }
      if (!String(d.holder || '').trim()) {
        setState({ payout: { ...p, error: t.wallet.errHolder } });
        return;
      }
      if (!/^SA\d{22}$/.test(iban)) {
        setState({ payout: { ...p, error: t.wallet.errIban } });
        return;
      }
      setState({
        payout: {
          bank: d.bank, holder: String(d.holder).trim(), iban,
          saved: true, editing: false, error: '', draft: null,
        },
        wl: { ...s.wl, notice: t.wallet.accountSaved, error: '' },
      });
    },
    setWallet: (e: FieldEvent) => {
      const { name, value } = e.currentTarget;
      setState({
        wl: { ...s.wl, [name === 'wmethod' ? 'method' : name]: value, error: '', notice: '' },
      });
    },
    withdrawAll: () => setState({ wl: { ...s.wl, amount: String(availableRaw), error: '', notice: '' } }),
    addFunds: () => {
      const v = Math.round(+s.wl.amount || 0);
      if (v <= 0) {
        setState({ wl: { ...s.wl, error: t.wallet.errAmount } });
        return;
      }
      const isTransfer = s.wl.method === 'transfer';
      const tx = {
        who: 'h1', date: t.ws.today as string, type: 'deposit' as const,
        method: s.wl.method, amount: v, st: (isTransfer ? 'pending' : 'escrow') as 'pending' | 'escrow',
      };
      setState({
        txns: [tx, ...s.txns],
        wl: {
          ...s.wl, amount: '', error: '',
          notice: isTransfer ? t.wallet.addedTransfer : t.wallet.added,
        },
      });
    },
    requestWithdraw: () => {
      if (!s.payout.saved) {
        setState({
          wl: { ...s.wl, error: t.wallet.withdrawNeedsAccount },
          payout: { ...s.payout, editing: true },
        });
        return;
      }
      const v = Math.round(+s.wl.amount || 0);
      if (v <= 0) {
        setState({ wl: { ...s.wl, error: t.wallet.errAmount } });
        return;
      }
      if (v > availableRaw) {
        setState({ wl: { ...s.wl, error: t.wallet.errMax } });
        return;
      }
      const tx = {
        who: ME, date: t.ws.today as string, type: 'payout' as const,
        method: 'bank', amount: v, st: 'processing' as const,
      };
      setState({ txns: [tx, ...s.txns], wl: { ...s.wl, amount: '', error: '', notice: t.wallet.requested } });
    },

    st, pe, bf,
    setBFilter: (e: FieldEvent) => {
      const { name, value } = e.currentTarget;
      setState({ bfilt: { ...s.bfilt, [name]: value } });
    },
    clearBFilter: () => setState({ bfilt: { city: '', trade: '', min: '' } }),
    askWithdraw: () => setState({ withdrawAsk: true }),
    keepProject: () => setState({ withdrawAsk: false }),
    doWithdraw: () => {
      setState({ projects: s.projects.filter((p) => p.id !== s.curId), withdrawAsk: false });
      nav('hdash');
    },

    setSetting: (e: FieldEvent) => {
      const { name, value } = e.currentTarget;
      setState({ setg: { ...s.setg, [name]: value, notice: '' } });
    },
    setPref: (e: CheckEvent) => {
      const { name, checked } = e.currentTarget;
      setState({ setg: { ...s.setg, prefs: { ...s.setg.prefs, [name]: checked }, notice: '' } });
    },
    saveSettings: () => setState({ setg: { ...s.setg, notice: t.settings.saved } }),

    rev,
    setStars: (e: ClickEvent) =>
      setState({ revF: { ...s.revF, stars: +(dataset(e).n as string), error: '' } }),
    setRevText: (e: ValueEvent) =>
      setState({ revF: { ...s.revF, text: e.currentTarget.value, error: '' } }),
    submitReview: () => {
      const f = s.revF;
      if (!f.stars) {
        setState({ revF: { ...f, error: t.rev.errStars } });
        return;
      }
      if (f.text.trim().length < 12) {
        setState({ revF: { ...f, error: t.rev.errText } });
        return;
      }
      setState({
        reviews: [...s.reviews, {
          pid: s.curId as string, by: role as Role, stars: f.stars,
          text: f.text.trim(), date: t.ws.today as string,
        }],
        revF: { stars: 0, text: '', error: '' },
      });
    },

    nt,
    toggleNotifs: () => setState({ notifOpen: !s.notifOpen, menuOpen: false }),
    closeNotifs: () => setState({ notifOpen: false }),
    markAllRead: () => setState({ notifRead: nItems.map((x) => x.id as string) }),

    hp, auth, authSteps,
    userInitial: (s.user?.name || '').trim().charAt(0),
    menuOpen: !!s.menuOpen,
    menuOpenAttr: s.menuOpen ? ('true' as const) : ('false' as const),
    accountRole: role === 'homeowner' ? t.roles.homeowner
      : role === 'contractor' ? t.roles.contractor : t.roles.admin,
    back: () => goBack(),
    showBack: (s.hist || []).length > 0 && !['home', 'project', 'homeowner', 'contractor'].includes(s.route),
    backWord: t.goBack,
    backArrow: lang === 'ar' ? '→' : '←',
    toggleMenu: () => setState({ menuOpen: !s.menuOpen }),
    closeMenu: () => setState({ menuOpen: false }),
    goMenu: (e: ClickEvent) => {
      const d = dataset(e);
      setState({ menuOpen: false });
      nav(d.route as string, d.id ? { curId: d.id } : {});
    },

    ruleStages: [
      { title: t.rules.l1, sub: t.rules.l1sub, items: t.rules.s1 },
      { title: t.rules.l2, sub: t.rules.l2sub, items: t.rules.s2 },
      { title: t.rules.l3, sub: t.rules.l3sub, items: t.rules.s3 },
    ].map((x, i) => ({ ...x, n: arNumerals(i + 1) })),

    naf: {
      idle: s.auth.naf === 'idle', wait: s.auth.naf === 'wait', done: s.auth.naf === 'done',
      code: arNumerals(s.auth.nafCode || ''),
    },
    authNafLabel: a.mode === 'signin' ? t.auth.nafathSign : t.auth.nafathVerify,
    startNafath,
    nafVerified: !!s.user?.nafath,
    coNeedsNafath: role === 'contractor' && !s.user?.nafath,
    hoNeedsNafath: role === 'homeowner' && !s.user?.nafath,
    authTitle: a.mode === 'signin' ? t.auth.titleIn : t.auth.titleUp,
    authPrimary: a.mode === 'signin' ? t.auth.signIn : t.continue,
    authLede: a.mode === 'signin' ? t.auth.ledeIn : t.auth.ledeUp,
    authNafLine: a.role === 'contractor' ? t.auth.nafCo : t.auth.nafHo,
    authRoleLabel: a.mode === 'signin' ? t.auth.signInAs : t.auth.nafathRole,

    post, postSteps, myProjects, hStats, hActions,
    noHActions: !hActions.length, savedList, noSaved: !savedList.length,
    cProjects, cStats, cPayments,
    openProjects: openProjects.slice(0, s.openShown),
    openTotal: openProjects.length,
    openShown: Math.min(s.openShown, openProjects.length),
    hasMoreOpen: openProjects.length > s.openShown,
    moreOpenCount: Math.max(0, openProjects.length - s.openShown),
    openPct: openProjects.length
      ? Math.round(Math.min(s.openShown, openProjects.length) / openProjects.length * 100) : 100,

    pj, pTabs, tab, canBid, alreadyBid, bidNeedsNafath, fundNeedsNafath,
    noBids: !!pr && !pr.bids.length, hasBids: !!pr && pr.bids.length > 0,
    noMs: !!pr && !pr.ms.length,
    canMessage: role === 'homeowner' || role === 'contractor',
    bidF: s.bidF, msgDraft: s.msgDraft, needsFunding,
    showLedger: !!pr && pr.ledger.length > 0,
    payIsCard: s.pay === 'card', payIsApple: s.pay === 'apple', payIsMada: s.pay === 'mada',
    backRoute: role === 'contractor' ? 'cdash' : role === 'admin' ? 'admin' : 'hdash',

    feeStops: (t.pricing2.jStops as AnyRec[]).map((x, i) => ({
      ...x, paid: i === 3 ? ('true' as const) : ('false' as const), mark: i === 3 ? '★' : '✓',
    })),
    ct: { f: s.contact, sent: s.contact.sent, form: !s.contact.sent, error: s.contact.error },
    setContact: (e: FieldEvent) => {
      const { name, value } = e.currentTarget;
      setState({ contact: { ...s.contact, [name]: value, error: '' } });
    },
    sendContact: () => {
      const c = s.contact;
      if (!c.name || (!c.email && !c.phone) || !c.msg) {
        setState({ contact: { ...c, error: t.pages.cErr } });
        return;
      }
      setState({ contact: { ...c, sent: true, error: '' } });
    },

    trustRules, calc, priceCards,
    prIsHo: s.prole === 'homeowner', prIsCo: s.prole === 'contractor',
    setPriceRole: (e: ValueEvent) =>
      setState({ prole: e.currentTarget.value as 'homeowner' | 'contractor' }),
    setCalc: (e: ValueEvent) => {
      const v = Math.max(0, +e.currentTarget.value || 0);
      setState({ calcRaw: v, calcDraft: String(v) });
    },
    setCalcDraft: (e: ValueEvent) => {
      const txt = e.currentTarget.value;
      const n = Number(txt);
      setState({ calcDraft: txt, ...(txt !== '' && !isNaN(n) && n > 0 ? { calcRaw: n } : {}) });
    },
    commitCalc: () => {
      const n = Math.max(10000, Number(s.calcDraft) || 10000);
      setState({ calcRaw: n, calcDraft: String(n) });
    },

    fin, adminQuick, adminTabs, atab, adminStats,
    allProjects: s.projects.map(decorateP),
    verifQueue, noVerif: !verifQueue.length, cases, payRows, userRows, faqs,

    goAuth: (e: ClickEvent) => {
      const rl = dataset(e).signup as Role;
      setState({
        route: 'auth', menuOpen: false, navOpen: false,
        auth: { ...s.auth, mode: 'signup', step: 1, role: rl, error: '' },
      });
      window.scrollTo({ top: 0, behavior: 'instant' });
    },
    go: (e: ClickEvent) => {
      const d = dataset(e);
      const extra: Partial<AppState> = {};
      if (s.navOpen) extra.navOpen = false;
      if (d.id) extra.curId = d.id;
      if (d.tab) extra.tab = d.tab;
      else if (d.route === 'project') extra.tab = 'overview';
      if (d.route === 'auth' && d.role) {
        extra.auth = { ...s.auth, mode: 'signup', role: d.role as Role, step: 1, error: '' };
      }
      if (d.route === 'post' && role && role !== 'homeowner') {
        nav('auth', { auth: { ...s.auth, mode: 'signup', role: 'homeowner', step: 1 } });
        return;
      }
      nav(d.route as string, extra);
    },
    toggleLang: () => setState({ lang: lang === 'en' ? 'ar' : 'en' }),
    signOut: () => {
      setState({ user: null, menuOpen: false });
      nav('home');
    },
    demoSignIn: (e: ClickEvent) => {
      const rl = dataset(e).role as Role;
      const name = rl === 'homeowner' ? uName('h1')
        : rl === 'contractor' ? cName(ME) : (lang === 'en' ? 'Operations' : 'العمليات');
      setState({ user: { role: rl, name, nafath: true }, auth: { ...s.auth, naf: 'done' } });
      if (s.pendingPost && rl === 'homeowner') {
        publishPost();
        return;
      }
      nav(rl === 'homeowner' ? 'hdash' : rl === 'contractor' ? 'cdash' : 'admin');
    },
    setMode: (e: ValueEvent) =>
      setState({ auth: { ...s.auth, mode: e.currentTarget.value as 'signin' | 'signup', step: 1, error: '' } }),
    resendOtp: () => setState({
      auth: {
        ...s.auth, otpCode: String(1000 + Math.floor(Math.random() * 8999)),
        f: { ...s.auth.f, otp: '' }, error: '',
      },
    }),
    setAuthField: (e: FieldEvent) => {
      const { name, value, type, checked } = e.currentTarget;
      if (name === 'role') setState({ auth: { ...s.auth, role: value as Role } });
      else {
        setState({
          auth: { ...s.auth, error: '', f: { ...s.auth.f, [name]: type === 'checkbox' ? checked : value } },
        });
      }
    },
    authBack: () => setState({ auth: { ...s.auth, step: Math.max(1, s.auth.step - 1), error: '' } }),
    authNext: () => {
      const f = a.f;
      if (a.step === 1) {
        const digits = String(f.mobile || '').replace(/\D/g, '');
        if (digits.length < 9) {
          setState({ auth: { ...a, error: t.auth.errMobile } });
          return;
        }
        setState({
          auth: { ...a, step: 2, otpCode: String(1000 + Math.floor(Math.random() * 8999)), error: '' },
        });
        return;
      }
      if (a.step === 2) {
        if (String(f.otp || '').replace(/\D/g, '').length !== 4) {
          setState({ auth: { ...a, error: t.auth.errOtp } });
          return;
        }
        if (a.mode === 'signin') {
          authFinish(a.role);
          return;
        }
        setState({ auth: { ...a, step: 3, error: '' } });
        return;
      }
      if (!f.name) {
        setState({ auth: { ...a, error: t.auth.errName } });
        return;
      }
      if (!f.tc) {
        setState({ auth: { ...a, error: t.auth.tcErr } });
        return;
      }
      authFinish(a.role);
    },

    setFilter: (e: FieldEvent) => {
      const { name, value, type, checked } = e.currentTarget;
      setState({ filt: { ...s.filt, [name]: type === 'checkbox' ? checked : value }, page: 1 });
    },
    hasFilters: !!(s.filt.q || s.filt.city || s.filt.trade || s.filt.verified),
    clearFilters: () =>
      setState({ filt: { q: '', city: '', trade: '', verified: false, sort: s.filt.sort }, page: 1 }),
    setPage: (e: ClickEvent) => {
      const p = +(dataset(e).p as string);
      if (p && p !== page) {
        setState({ page: p });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    loadMoreOpen: () => setState({ openShown: s.openShown + 3 }),
    toggleSave: (e: ClickEvent & { stopPropagation: () => void }) => {
      e.stopPropagation();
      const id = dataset(e).id as string;
      setState({
        saved: s.saved.includes(id) ? s.saved.filter((x) => x !== id) : [...s.saved, id],
      });
    },
    toggleFaq: (e: ClickEvent) => {
      const i = +(dataset(e).i as string);
      setState({ openFaq: s.openFaq === i ? -1 : i });
    },

    setPostField: (e: FieldEvent) => {
      const { name, value } = e.currentTarget;
      setState({ post: { ...s.post, f: { ...s.post.f, [name]: value }, error: '' } });
    },
    postUpload: (e: FilesEvent) => {
      const names = [...(e.currentTarget.files || [])].map((f) => f.name);
      setState({
        post: {
          ...s.post,
          files: [...s.post.files, ...(names.length ? names : ['photo-' + (s.post.files.length + 1) + '.jpg'])],
        },
      });
    },
    useSuggestion: () => {
      const B = D.BUDGETS[s.post.f.trade];
      if (!B) return;
      setState({
        post: { ...s.post, f: { ...s.post.f, min: String(B[0]), max: String(B[1]) }, error: '' },
      });
    },
    postBack: () => setState({ post: { ...s.post, step: s.post.step - 1, error: '' } }),
    togglePledge: (e: { currentTarget: { checked: boolean } }) =>
      setState({ post: { ...s.post, pledge: e.currentTarget.checked, error: '' } }),
    postNext: () => {
      const f = s.post.f;
      if (s.post.step === 1 && (!f.title || !f.desc)) {
        setState({ post: { ...s.post, error: t.post.errTitle } });
        return;
      }
      if (s.post.step === 2 && (!f.min || !f.max)) {
        setState({ post: { ...s.post, error: t.post.errBudget } });
        return;
      }
      if (s.post.step < 4) {
        setState({ post: { ...s.post, step: s.post.step + 1, error: '' } });
        return;
      }
      if ((+f.max || 0) > 1000000) {
        setState({ post: { ...s.post, error: t.post.capNote } });
        return;
      }
      if (!s.post.pledge) {
        setState({ post: { ...s.post, error: t.post.pledgeErr } });
        return;
      }
      if (role !== 'homeowner') {
        setState({
          pendingPost: true,
          auth: { ...s.auth, mode: 'signup', role: 'homeowner', step: 1 },
        });
        nav('auth');
        return;
      }
      publishPost();
    },

    setTab: (e: ClickEvent) => setState({ tab: dataset(e).tab as string }),
    setAdminTab: (e: ClickEvent) => setState({ atab: dataset(e).tab as string }),
    setBidField: (e: FieldEvent) => {
      const { name, value } = e.currentTarget;
      setState({ bidF: { ...s.bidF, [name]: value, error: '' } });
    },
    submitBid: () => {
      const b = s.bidF;
      if (!b.price || !b.days) {
        setState({ bidF: { ...s.bidF, error: t.ws.errBid } });
        return;
      }
      updProj(pr.id, (p) => ({
        ...p,
        bids: [...p.bids, { cid: ME, price: +b.price, days: +b.days, note: { en: b.note, ar: b.note } }],
      }));
      setState({ bidF: { price: '', days: '', note: '', error: '' } });
    },
    acceptBid: (e: ClickEvent) =>
      setState({ agr: { cid: dataset(e).cid as string, read: false } }),
    openAgreementCo: () =>
      setState({ agr: { cid: pr && pr.pending ? pr.pending.cid : null, read: false } }),
    closeAgreement: () => setState({ agr: null }),
    /** The sign button unlocks only once the agreement has been read to the end. */
    agrScroll: (e: ClickEvent) => {
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8 && s.agr && !s.agr.read) {
        setState({ agr: { ...s.agr, read: true } });
      }
    },
    /** Both parties sign before the award: the contractor's signature completes it. */
    signAgreement: () => {
      const g = s.agr;
      if (!g || !g.read || !pr) return;
      const cid = g.cid as string;
      const bid = pr.bids.find((b) => b.cid === cid);
      if (!bid) return;
      const at = new Date().toISOString().slice(0, 10);
      const who = (s.user && s.user.name) || '';
      if (role === 'contractor') {
        updProj(pr.id, (p) => ({
          ...p, status: 'active', contractorId: cid,
          amount: (p.pending ? p.pending.price : bid.price),
          ms: ['pending', 'pending', 'pending'],
          ev: [0, 1, 2].map(() => ({ p: false, v: false, o: false })),
          pending: null,
          sig: { ...(p.sig || {}), co: { name: who, at } },
        }));
        setState({ agr: null, tab: 'payments' });
        return;
      }
      updProj(pr.id, (p) => ({
        ...p,
        pending: { cid, price: bid.price, days: bid.days },
        sig: { ...(p.sig || {}), ho: { name: who, at } },
      }));
      setState({ agr: null });
    },
    submitMs: (e: ClickEvent) => {
      const i = +(dataset(e).i as string);
      const evidence = ev(pr, i);
      if (!evidence.p || !evidence.v) return;
      updProj(pr.id, (p) => ({ ...p, ms: p.ms.map((m, j) => (j === i ? 'submitted' : m)) }));
    },
    addEv: (e: ClickEvent) => {
      const { i, k } = dataset(e);
      setEv(pr.id, +(i as string), k as keyof Evidence);
    },
    approveMs: (e: ClickEvent) => {
      const i = +(dataset(e).i as string);
      if (!ev(pr, i).o) return;
      const am = msAmounts(pr);
      updProj(pr.id, (p) => {
        const ms = p.ms.map((m, j) => (j === i ? 'released' : m)) as MilestoneStatus[];
        return {
          ...p, ms,
          status: ms.every((m) => m === 'released') ? 'completed' : p.status,
          ledger: [...p.ledger, { date: t.ws.today as string, label: 'release' as const, ms: i, amount: am[i] }],
        };
      });
    },
    disputeMs: (e: ClickEvent) => {
      const i = +(dataset(e).i as string);
      updProj(pr.id, (p) => ({ ...p, ms: p.ms.map((m, j) => (j === i ? 'disputed' : m)) }));
      setState((prev) => ({
        cases: [{
          id: 'S-' + (205 + prev.cases.length), pid: pr.id,
          issue: {
            en: 'Homeowner raised an issue on ' + T.en.ws.ms[i].n,
            ar: 'رفع المالك مشكلة على ' + T.ar.ws.ms[i].n,
          },
          open: true,
        }, ...prev.cases],
      }));
    },
    resolveMs: (e: ClickEvent) => {
      const i = +(dataset(e).i as string);
      updProj(pr.id, (p) => ({ ...p, ms: p.ms.map((m, j) => (j === i ? 'submitted' : m)) }));
    },
    setMsgDraft: (e: ValueEvent) => setState({ msgDraft: e.currentTarget.value }),
    msgKey: (e: { key: string }) => {
      if (e.key === 'Enter' && s.msgDraft.trim()) {
        updProj(pr.id, (p) => ({
          ...p,
          msgs: [...p.msgs, {
            from: role === 'contractor' ? 'c' : 'h',
            text: { en: s.msgDraft, ar: s.msgDraft }, time: t.ws.today,
          }],
        }));
        setState({ msgDraft: '' });
      }
    },
    sendMsg: () => {
      if (!s.msgDraft.trim()) return;
      updProj(pr.id, (p) => ({
        ...p,
        msgs: [...p.msgs, {
          from: role === 'contractor' ? 'c' : 'h',
          text: { en: s.msgDraft, ar: s.msgDraft }, time: t.ws.today,
        }],
      }));
      setState({ msgDraft: '' });
    },
    wsUpload: (e: FilesEvent) => {
      const n = e.currentTarget.files?.[0]?.name || 'upload.jpg';
      updProj(pr.id, (p) => ({
        ...p,
        files: [...p.files, { name: n, by: role === 'contractor' ? 'c' : 'h', date: t.ws.today }],
      }));
    },
    setPay: (e: ValueEvent) => setState({ pay: e.currentTarget.value }),
    /** Funding holds the whole contract amount and charges the homeowner service fee. */
    fundProject: () => {
      const serviceFee = Math.round(pr.amount * HOMEOWNER_FEE);
      updProj(pr.id, (p) => ({
        ...p, funded: true,
        ledger: [
          { date: t.ws.today as string, label: 'fund' as const, amount: p.amount },
          ...(serviceFee ? [{ date: t.ws.today as string, label: 'fee' as const, amount: serviceFee }] : []),
          ...p.ledger,
        ],
      }));
      setState({ tab: 'milestones' });
    },

    approveVerif: (e: ClickEvent) => {
      const id = dataset(e).id as string;
      setState({
        contractors: s.contractors.map((c) =>
          (c.id === id ? { ...c, verified: true, checks: { id: true, cr: true, pf: true } } : c)),
      });
    },
    rejectVerif: (e: ClickEvent) => {
      const id = dataset(e).id as string;
      setState({ rejected: [...s.rejected, id] });
    },
    closeCase: (e: ClickEvent) => {
      const id = dataset(e).id as string;
      setState({ cases: s.cases.map((c) => (c.id === id ? { ...c, open: false } : c)) });
    },
  };
}

export type VM = ReturnType<typeof buildViewModel>;
