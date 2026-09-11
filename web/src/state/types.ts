/* Shapes of the seeded marketplace data and of the app's runtime state.
   These mirror the prototype in ../../project/Tarmem.dc.html. */

export type Lang = 'en' | 'ar';
export type Role = 'homeowner' | 'contractor' | 'admin';

/** A string that exists in both site languages. */
export interface Loc {
  en: string;
  ar: string;
}

/** Either a bilingual string or a plain one (dates arrive both ways). */
export type MaybeLoc = Loc | string;

export interface Contractor {
  id: string;
  name: Loc;
  city: string;
  trades: string[];
  rating: number;
  reviews: number;
  done: number;
  verified: boolean;
  since: number;
  onTime: number;
  response: number;
  bio: Loc;
  checks: { id: boolean; cr: boolean; pf: boolean };
}

export type MilestoneStatus = 'pending' | 'submitted' | 'released' | 'disputed';
export type ProjectStatus = 'open' | 'active' | 'completed';

export interface Bid {
  cid: string;
  price: number;
  days: number;
  note: Loc;
}

export interface ProjectMessage {
  from: 'h' | 'c';
  text: Loc;
  time: string;
}

export interface ProjectFile {
  name: string;
  by: 'h' | 'c';
  date: MaybeLoc;
}

export interface LedgerEntry {
  date: string;
  label: 'fund' | 'fee' | 'release';
  amount: number;
  ms?: number;
}

/** Evidence attached to a milestone: contractor photos, video, owner hand-over photo. */
export interface Evidence {
  p: boolean;
  v: boolean;
  o: boolean;
}

export interface Signature {
  name: string;
  at: string;
}

export interface Project {
  id: string;
  title: Loc;
  desc: Loc;
  trade: string;
  city: string;
  min: number;
  max: number;
  timing: string;
  status: ProjectStatus;
  ownerId: string;
  contractorId: string | null;
  amount: number;
  funded: boolean;
  posted: MaybeLoc;
  bids: Bid[];
  ms: MilestoneStatus[];
  msgs: ProjectMessage[];
  files: ProjectFile[];
  ledger: LedgerEntry[];
  ev?: Evidence[];
  /** Awarded bid awaiting the contractor's counter-signature. */
  pending?: { cid: string; price: number; days: number } | null;
  sig?: { ho?: Signature; co?: Signature };
}

export interface HomeownerReview {
  by: string;
  stars: number;
  text: Loc;
  when: Loc;
}

export interface Homeowner {
  en: string;
  ar: string;
  city: string;
  joined: Loc;
  nafath: boolean;
  rating: number;
  reviews: number;
  done: number;
  onTimeApproval: string;
  avgApproval: Loc;
  disputes: number;
  about: Loc;
  revs: HomeownerReview[];
}

export interface SupportCase {
  id: string;
  pid: string;
  issue: Loc;
  open: boolean;
}

export interface Trade {
  id: string;
  g: string;
  en: string;
  ar: string;
}

export interface City {
  id: string;
  en: string;
  ar: string;
}

export interface TradeGroup {
  id: string;
  en: string;
  ar: string;
}

/** A review written inside the app (as opposed to the seeded ones). */
export interface LiveReview {
  pid: string;
  by: Role;
  stars: number;
  text: string;
  date: string;
}

export interface WalletTxn {
  who: string;
  date: string;
  type: 'deposit' | 'payout';
  method: string;
  amount: number;
  st: 'pending' | 'escrow' | 'processing' | 'done' | 'released';
}

export interface SessionUser {
  role: Role;
  name: string;
  nafath?: boolean;
}

export interface HistoryEntry {
  route: string;
  curId: string | null;
  tab: string;
}

export interface AppState {
  ready: boolean;
  lang: Lang;
  route: string;
  curId: string | null;
  tab: string;
  atab: string;
  user: SessionUser | null;
  hist: HistoryEntry[];
  auth: {
    mode: 'signin' | 'signup';
    step: number;
    role: Role;
    f: {
      mobile: string;
      otp: string;
      name: string;
      city: string;
      company: string;
      trades: string;
      licence: string;
      tc: boolean;
      idType?: string;
    };
    otpCode: string;
    error: string;
    naf: 'idle' | 'wait' | 'done';
    nafCode: number | null;
    manual: boolean;
    uploaded?: boolean;
  };
  post: {
    step: number;
    f: {
      title: string;
      trade: string;
      desc: string;
      city: string;
      address: string;
      min: string;
      max: string;
      timing: string;
    };
    files: string[];
    error: string;
    pledge: boolean;
  };
  pendingPost: boolean;
  menuOpen: boolean;
  navOpen: boolean;
  heroIdx: number;
  heroLock: number | null;
  howTab: 'ho' | 'co';
  agr: { cid: string | null; read: boolean } | null;
  heroOn: boolean;
  aiText: string;
  aiFiles: string[];
  scrolled: boolean;
  plan: {
    msgs: { role: 'user' | 'ai'; text: string }[];
    brief: Record<string, string>;
    touched: string[];
    q: string;
    busy: boolean;
    error: string;
    question: string;
    done: boolean;
    matches: { id: string; why: string }[];
    matching: boolean;
  };
  revF: { stars: number; text: string; error: string };
  reviews: LiveReview[];
  setg: {
    mobile: string;
    email: string;
    prefs: Record<string, boolean>;
    notice: string;
  };
  bfilt: { city: string; trade: string; min: string };
  withdrawAsk: boolean;
  notifRead: string[];
  notifOpen: boolean;
  edit: { name: string; city: string; trades: string[]; bio: string; error: string } | null;
  hedit: { name: string; city: string; about: string; error: string } | null;
  hoProfile: { city?: string; about?: Partial<Loc> } | null;
  wl: { amount: string; method: string; error: string; notice: string };
  txns: WalletTxn[];
  payout: {
    bank: string;
    holder: string;
    iban: string;
    saved: boolean;
    editing: boolean;
    error: string;
    draft: { bank?: string; holder?: string; iban?: string } | null;
  };
  filt: { q: string; city: string; trade: string; verified: boolean; sort: string };
  page: number;
  openShown: number;
  prole: 'homeowner' | 'contractor';
  contact: {
    name: string;
    email: string;
    phone: string;
    topic: string;
    msg: string;
    sent: boolean;
    error: string;
  };
  calcRaw: number;
  calcDraft: string;
  calcFirst: boolean;
  saved: string[];
  openFaq: number;
  bidF: { price: string; days: string; note: string; error: string };
  msgDraft: string;
  pay: string;
  contractors: Contractor[];
  projects: Project[];
  cases: SupportCase[];
  rejected: string[];
}
