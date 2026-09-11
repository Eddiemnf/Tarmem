/* Application state.

   The prototype was a single Claude Design component with class-style
   `setState`. The same shape is kept here so the ported view model reads like
   the original: one state object, partial updates, an optional callback that
   runs once the update has been applied.

   Persistence matches the prototype too — session keys always restore, while
   the seeded collections only restore while the seed data is unchanged, so
   editing `data/tarmem-data.ts` can never be masked by a stale cache. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import * as D from '../data/tarmem-data';
import type { AppState } from './types';

const STORAGE_KEY = 'tarmem-state-v3';
/** Keys that belong to the browsing session rather than to the seed data. */
const SESSION_KEYS = [
  'lang', 'route', 'curId', 'tab', 'atab', 'user', 'saved', 'page', 'openShown',
  'pay', 'payout', 'txns', 'hoProfile',
] as const;
const SEEDED_KEYS = ['contractors', 'projects', 'cases', 'rejected'] as const;

export type StateUpdate = Partial<AppState> | ((prev: AppState) => Partial<AppState>);
export type SetState = (update: StateUpdate, callback?: () => void) => void;

function djb2(str: string): string {
  let k = 5381;
  for (let i = 0; i < str.length; i++) k = ((k * 33) ^ str.charCodeAt(i)) >>> 0;
  return String(k);
}

/** Signature of the seed data; a changed signature discards the cached copy. */
export const seedSignature = djb2(
  JSON.stringify([D.PROJECTS, D.CONTRACTORS, D.CASES, D.TRADES, D.CITIES]),
);

function baseState(): AppState {
  return {
    ready: true,
    lang: 'ar',
    route: 'home',
    curId: null,
    tab: 'overview',
    atab: 'overview',
    user: null,
    hist: [],
    auth: {
      mode: 'signin', step: 1, role: 'homeowner',
      f: { mobile: '', otp: '', name: '', city: 'riyadh', company: '', trades: '', licence: '', tc: false },
      otpCode: '', error: '', naf: 'idle', nafCode: null, manual: false,
    },
    post: {
      step: 1,
      f: { title: '', trade: 'kitchen', desc: '', city: 'riyadh', address: '', min: '', max: '', timing: 'month' },
      files: [], error: '', pledge: false,
    },
    pendingPost: false,
    menuOpen: false,
    navOpen: false,
    heroIdx: 0,
    heroLock: null,
    howTab: 'ho',
    agr: null,
    heroOn: true,
    aiText: '',
    aiFiles: [],
    scrolled: false,
    plan: {
      msgs: [], brief: { type: '', city: '', space: '', scope: '', budget: '', timing: '' },
      touched: [], q: '', busy: false, error: '', question: '', done: false, matches: [], matching: false,
    },
    revF: { stars: 0, text: '', error: '' },
    reviews: [],
    setg: {
      mobile: '0555 000 000', email: '',
      prefs: { pBids: true, pStages: true, pPay: true, pMsg: true, pNews: false },
      notice: '',
    },
    bfilt: { city: '', trade: '', min: '' },
    withdrawAsk: false,
    notifRead: [],
    notifOpen: false,
    edit: null,
    hedit: null,
    hoProfile: null,
    wl: { amount: '', method: 'mada', error: '', notice: '' },
    txns: [],
    payout: { bank: '', holder: '', iban: '', saved: false, editing: false, error: '', draft: null },
    filt: { q: '', city: '', trade: '', verified: false, sort: 'rating' },
    page: 1,
    openShown: 3,
    prole: 'homeowner',
    contact: { name: '', email: '', phone: '', topic: '', msg: '', sent: false, error: '' },
    calcRaw: 80000,
    calcDraft: '80000',
    calcFirst: true,
    saved: ['c4'],
    openFaq: 0,
    bidF: { price: '', days: '', note: '', error: '' },
    msgDraft: '',
    pay: 'card',
    contractors: D.CONTRACTORS,
    projects: D.PROJECTS,
    cases: D.CASES,
    rejected: [],
  };
}

function initialState(): AppState {
  const state = baseState();
  let saved: Record<string, unknown> | null = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    saved = null;
  }
  if (saved) {
    for (const key of SESSION_KEYS) {
      if (saved[key] !== undefined) (state as unknown as Record<string, unknown>)[key] = saved[key];
    }
    if (saved.seedSig === seedSignature) {
      for (const key of SEEDED_KEYS) {
        if (saved[key] !== undefined) (state as unknown as Record<string, unknown>)[key] = saved[key];
      }
    }
  }
  try {
    localStorage.removeItem('tarmem-state');
    localStorage.removeItem('tarmem-state-v2');
  } catch {
    /* storage unavailable — the app runs from the seed data */
  }
  return state;
}

function reducer(prev: AppState, update: StateUpdate): AppState {
  const patch = typeof update === 'function' ? update(prev) : update;
  return { ...prev, ...patch };
}

interface Store {
  state: AppState;
  /** Latest state, readable from async callbacks and timers. */
  stateRef: { current: AppState };
  setState: SetState;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, initialState);
  const stateRef = useRef(state);
  const callbacks = useRef<(() => void)[]>([]);

  // Declared first so queued callbacks and timers always read the newest state.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setState = useCallback<SetState>((update, callback) => {
    dispatch(update);
    if (callback) callbacks.current.push(callback);
  }, []);

  useEffect(() => {
    if (!callbacks.current.length) return;
    const queued = callbacks.current;
    callbacks.current = [];
    for (const callback of queued) callback();
  });

  useEffect(() => {
    const {
      lang, route, curId, tab, atab, user, saved, payout, txns, hoProfile,
      contractors, projects, cases, rejected, pay, page, openShown,
    } = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        seedSig: seedSignature, lang, route, curId, tab, atab, user, saved, payout, txns,
        hoProfile, contractors, projects, cases, rejected, pay, page, openShown,
      }));
    } catch {
      /* private mode or full storage — state simply doesn't persist */
    }
  }, [state]);

  const value = useMemo(() => ({ state, stateRef, setState }), [state, setState]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
