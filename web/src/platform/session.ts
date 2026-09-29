/* Who is signed in, and everything the site reads from or writes to the database.

   Every call here is made with the visitor's own session, so what it may touch is decided by the
   database's row-level rules (supabase/*.sql), not by this file. Functions resolve to a
   PlatformError key on failure, never throw, so pages can show a sentence instead of a stack. */

import type { User } from '@supabase/supabase-js';
import { supabase } from './client';
import type { PlatformError } from './copy';
import { runtimeData, setPaymentsOff, type Application, type Profile, type ProjectRow } from './data';
import { setTrackContext, track } from './track';

export interface BidRow { id: string; project_id: string; contractor_id: string; price: number; days: number; note: string | null; details: Record<string, unknown>; status: 'submitted' | 'withdrawn' | 'chosen'; created_at: string }
export interface AgreementRow { project_id: string; bid_id: string; homeowner_id: string; contractor_id: string; amount: number; days: number; homeowner_name: string; homeowner_signed_at: string; contractor_name: string | null; contractor_signed_at: string | null;
  /** Each side's "the work is complete" while payment on the site is off (supabase/030 B): the project completes when both are set. */
  homeowner_done_at?: string | null; contractor_done_at?: string | null }
/** A change request on a signed project (supabase/027): proposed by one side, applied once the other approves. */
export interface ChangeRow { id: number; project_id: string; code: string; by_side: 'ho' | 'co'; description: string; amount: number; days: number; ho_ok_at: string | null; co_ok_at: string | null; applied_at: string | null; created_at: string }
export interface StageRow { project_id: string; idx: number; status: 'pending' | 'submitted' | 'released' | 'disputed' }
export interface Bidder { user_id: string; company: string; city: string; trades: string[]; since: string; rating?: number | null; reviews?: number | null; done?: number | null; bio?: string | null }
export interface PublicReview { contractor_id: string; stars: number; body: string; created_at: string; reviewer: string }
export interface WalletTxn { id: number; user_id: string; project_id: string | null; type: 'deposit' | 'payout'; method: string; amount: number; status: 'pending' | 'confirmed' | 'paid' | 'rejected' | 'cancelled'; created_at: string }
export interface PayoutAccount { holder: string; bank: string; iban: string }

export interface Account {
  /** A contractor's own bids; for a homeowner, the bids on their projects and who made them (company and city only). */
  bids: BidRow[];
  bidders: Bidder[];
  /** Agreements this person is a party to: signed by the homeowner, then by the contractor. */
  agreements: AgreementRow[];
  /** Stages exist for every awarded project, but nothing moves until the owner switches payments on in the database. */
  stages: StageRow[];
  /** Change requests on this person's signed projects (supabase/027; none before it). */
  changes: ChangeRow[];
  paymentsLive: boolean;
  /** The owner has switched WhatsApp updates on in the database (supabase/013): the settings page shows the designed card. */
  whatsappLive: boolean;
  /** Mobile verification by WhatsApp code is switched on (supabase/022). */
  otpLive: boolean;
  /** A contractor's measured figures (supabase/020): profile views in 30 days, bids made and won. Null until 020 runs. */
  performance: { views: number; bids: number; won: number } | null;
  /** Reviews this person wrote (a homeowner) or received (a contractor). */
  reviews: ReviewRow[];
  /** The wallet, once payments are live: this person's deposits or payouts, and a contractor's bank account. */
  wallet: WalletTxn[];
  payout: PayoutAccount | null;
  /** For a contractor: their own rating, review count and finished projects, from real rows. */
  standing: Bidder | null;
  profile: Profile;
  projects: ProjectRow[];
  /** The `user` object the design's logic sees. One identity per sign-in, so state comparisons stay cheap. */
  /** A contractor's application: `verified` is what an admin's approval sets, and what opens the projects to them. */
  application: Application | null;
  logicUser: { role: 'homeowner' | 'admin' | 'contractor'; name: string; nafath: boolean; admin: boolean };
}

export type Result<T = true> = { ok: T; error?: undefined } | { ok?: undefined; error: PlatformError };

let account: Account | null = null;
/* A "reset your password" link opens the site signed in, for the single purpose of choosing a new password.
   The address is read before the sign-in library consumes it. */
let recovering = typeof window !== 'undefined' && /type=recovery/.test(window.location.hash + window.location.search);
export const isRecovering = (): boolean => recovering;

/* The links in Tarmem's emails (supabase/030 F). An activation link lands on /signin?link=signup with a session in
   its fragment, which the sign-in library stores; a used or expired one (activation or password reset) lands with
   #error_code=otp_expired, which the library reports but leaves. Both are read here, before it runs. */
export type LinkKind = 'signup' | 'reset' | null;
const landing = (() => {
  if (typeof window === 'undefined') return { problem: null as { code: string; kind: LinkKind } | null, confirmed: false };
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const kind = new URLSearchParams(window.location.search).get('link');
  const known: LinkKind = kind === 'signup' || kind === 'reset' ? kind : null;
  const code = hash.get('error_code') || hash.get('error');
  // a link that went to the site's home page instead (its address was not on the allowed list) still shows its sign-in page
  if (code && !/^\/(signin|reset-password)\/?$/.test(window.location.pathname)) window.history.replaceState(null, '', '/signin' + window.location.search + window.location.hash);
  return { problem: code ? { code, kind: known } : null, confirmed: hash.get('type') === 'signup' && hash.has('access_token') };
})();
let linkProblem = landing.problem;
/** A link from an email that no longer works: what it was for, when the address says so. */
export const linkIssue = (): { code: string; kind: LinkKind } | null => linkProblem;
export function clearLinkIssue(): void {
  linkProblem = null;
  if (/error_code=|error=/.test(window.location.hash)) window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
/** The page opened from a working activation link: the account is active, and this is its first sign-in. */
let justConfirmed = landing.confirmed;
export function takeJustConfirmed(): boolean { const was = justConfirmed; justConfirmed = false; return was; }
/** Where an email link points back to: the sign-in page, which knows which link it was. */
const linkTo = (kind: 'signup' | 'reset') => `${window.location.origin}/signin?link=${kind}`;

/* A session the database no longer accepts (expired, or ended elsewhere): the person is signed out here too and asked to
   sign in again; the page they were on opens again afterwards (src/launch/guard.ts keeps it). */
let sessionEndedNote = false;
export const sessionEnded = (): boolean => sessionEndedNote;
export function clearSessionEnded(): void { sessionEndedNote = false; }
function endSession(): void {
  if (!account) return;
  sessionEndedNote = true;
  setAccount(null);
  void supabase?.auth.signOut({ scope: 'local' }).catch(() => undefined);
}
const listeners = new Set<() => void>();

export const currentAccount = (): Account | null => account;
export function onAccountChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setAccount(next: Account | null): void {
  account = next;
  setPaymentsOff(Boolean(next && !next.paymentsLive));
  runtimeData(next?.profile ?? null);
  setTrackContext({ admin: next?.profile.role === 'admin', city: next?.profile.city ?? null });
  for (const listener of listeners) listener();
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩', PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const latinDigits = (raw: string) => String(raw || '').replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d))).replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
/** "٠٥٥ ١٢٣-٤٥٦٧" → "055 1234567": Latin digits, spaces and a leading + only, as the database requires. */
export function normalizeMobile(raw: string): string {
  return latinDigits(raw).replace(/[^\d+ ]/g, '').replace(/(?!^)\+/g, '').replace(/\s+/g, ' ').trim();
}
/** A Saudi mobile number however it is written — 05XXXXXXXX, 5XXXXXXXX, +966 5…, 00966 5…, 9665…, in Arabic digits or with
    spaces and dashes — as "05XXXXXXXX"; '' when it is not one. Accounts, applications and settings keep it in this form. */
export function saudiMobile(raw: string): string {
  const d = latinDigits(raw).replace(/\D/g, '');
  const local = d.startsWith('00966') ? d.slice(5) : d.startsWith('966') ? d.slice(3) : d.startsWith('0') ? d.slice(1) : d;
  return /^5\d{8}$/.test(local) ? '0' + local : '';
}
export const validMobile = (mobile: string) => /^\+?[0-9][0-9 ]{7,17}$/.test(mobile);
export const validEmail = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 160;

/** The database's own limits (supabase/001, 005, 019), checked before anything is sent so the form can say which field. */
export const LIMITS = { title: 140, desc: 4000, district: 120, bidNote: 2000, message: 2000, appNote: 2000, contact: 4000, company: 160, person: 120, name: 120, review: 1200 } as const;
const trimmed = (v: unknown) => String(v ?? '').trim();
/** The contact form against contact_messages' rules: the first field that would be refused, or null. */
export function contactProblem(f: { name: string; email: string; mobile: string; message: string }): PlatformError | null {
  const name = trimmed(f.name), email = trimmed(f.email), mobile = normalizeMobile(f.mobile), message = trimmed(f.message);
  if (name.length < 2 || name.length > LIMITS.name) return 'contactName';
  if (!email && !mobile) return 'contactReach';
  if (email && !validEmail(email)) return 'email';
  if (mobile && !validMobile(mobile)) return 'contactPhone';
  if (message.length < 3 || message.length > LIMITS.contact) return 'contactMsg';
  return null;
}

/* A refused row names the rule it broke (Postgres calls a column's rule <table>_<column>_check): that rule's field sentence. */
const CHECKS: [RegExp, PlatformError][] = [
  [/bids_price_check/, 'bidPrice'], [/bids_days_check/, 'bidDays'], [/bids_note_check/, 'noteLong'], [/bids_details_check/, 'bidDetails'],
  [/projects_title_check/, 'title'], [/projects_description_check/, 'desc'], [/projects_budget/, 'budget'], [/projects_district_check/, 'district'],
  [/contact_messages_name_check/, 'contactName'], [/contact_messages_message_check/, 'contactMsg'], [/contact_messages_check/, 'contactReach'], [/contact_messages_mobile_check/, 'contactPhone'],
  [/profiles_full_name_check/, 'name'], [/_mobile_check/, 'mobile'], [/_email_check/, 'email'],
  [/_company_check/, 'company'], [/_person_check/, 'person'], [/cr_number_check/, 'cr'], [/_note_check/, 'noteLong'], [/_trades_check/, 'trades'],
  [/project_messages_body_check/, 'msgLong'], [/reviews_body_check/, 'reviewText'], [/reviews_stars_check/, 'reviewStars'],
];

type Failure = { message?: string; status?: number; code?: string; details?: string | null } | null | undefined;
function failure(error: Failure): PlatformError {
  const code = String(error?.code || '');
  const text = `${code} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  if (/invalid login|invalid_credentials/.test(text)) return 'wrong';
  if (/not confirmed|email_not_confirmed|confirm your email first/.test(text)) return 'unconfirmed';
  // the database no longer accepts this sign-in (it expired, or ended on another device)
  if (/jwt|pgrst30[0-9]|refresh_token_not_found|session_not_found|invalid refresh token/.test(text) || (error?.status === 401 && !/password|credentials/.test(text))) { endSession(); return 'session'; }
  if (code === '23514' || /violates check constraint/.test(text)) return CHECKS.find(([rule]) => rule.test(text))?.[1] || 'generic';
  if (/mobile_taken/.test(text)) return 'mobileTaken';
  if (/active_project/.test(text)) return 'activeProject';
  if (/otp_off/.test(text)) return 'otpOff';
  // the database's own limits (supabase/022, 027, 029), each in its own words; the sign-in service's own (429) after them
  if (/too many change requests/.test(text)) return 'crTooMany';
  if (/too many right now/.test(text)) return 'rateNow';
  if (/too many: |in an hour|too many codes/.test(text)) return 'rateHour';
  if (/already registered|user_already_exists/.test(text)) return 'exists';
  if (/rate limit|too many|over_request|over_email/.test(text) || error?.status === 429) return 'rate';
  if (/pwned|known to be weak|easy to guess/.test(text)) return 'pwned'; // Supabase's leaked-password check (Pro)
  if (/weak_password|password should/.test(text)) return 'password';
  if (/leave its limits/.test(text)) return 'crLimits';
  if (/once both parties have signed|no longer takes changes/.test(text)) return 'crNotYet';
  if (/invalid.*email|email_address_invalid|validation_failed/.test(text)) return 'email';
  if (/only homeowners|only a homeowner account can post/.test(text)) return 'notHomeowner';
  if (/open projects/.test(text)) return 'tooMany';
  if (/no longer open|not open for bids/.test(text)) return 'notOpen';
  if (/bid is not available|no agreement here for you|bid cannot be chosen|bid cannot be moved|chosen bid cannot be changed/.test(text)) return 'bidGone';
  if (/already signed by both/.test(text)) return 'signedAlready';
  if (/status_not_allowed/.test(text)) return 'statusNotAllowed';
  if (/admins only/.test(text)) return 'adminsOnly';
  if (/not_active|not_signed|payments_on/.test(text)) return 'cannotComplete';
  if (/only the project's|only a verified contractor|only a contractor account|only its owner|not your project/.test(text)) return 'notYours';
  if (/failed to fetch|network|load failed|fetch failed/.test(text)) return 'network';
  if (/not switched on/.test(text)) return 'waOff';
  if (/test messages a day|three test messages/.test(text)) return 'waLimit';
  if (/mobile_not_verified/.test(text)) return 'waVerify';
  if (/not a saudi mobile/.test(text)) return 'waNumber';
  return 'generic';
}

/** The person's profile row; created from what they typed at sign-up if it is not there yet
    (it cannot be written at sign-up itself while the email still awaits confirmation). */
async function ensureProfile(user: User): Promise<Profile | null> {
  if (!supabase) return null;
  const found = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (found.data) return found.data as Profile;
  if (found.error) return null;
  const meta = user.user_metadata || {};
  const contractor = meta.role === 'contractor';
  // the name the database requires (2 to 120 characters): what they typed, else their company, else the start of their email
  const name = [meta.full_name, meta.company, String(user.email || '').split('@')[0]].map((v) => trimmed(v).slice(0, 120)).find((v) => v.length >= 2) || 'عميل ترميم';
  const created = await supabase.from('profiles').insert({
    id: user.id, role: contractor ? 'contractor' : 'homeowner', ...(contractor ? { company: trimmed(meta.company).slice(0, 160) || null } : {}),
    full_name: name, mobile: saudiMobile(meta.mobile) || normalizeMobile(meta.mobile),
    city: String(meta.city || 'riyadh'), lang: meta.lang === 'en' ? 'en' : 'ar',
  }).select('*').single();
  return (created.data as Profile) || null;
}

/** A contractor's application, found by their account. One sent before the email was activated is linked now
    (claim_my_application, supabase/030 C) — and so is one the team verified before the account existed, which then
    replaces a still-'new' one; if there is none at all, the one they filled in at sign-up is sent again from what the
    account remembers of it — once, so a second sign-in never makes a second application. */
async function myApplication(user: User): Promise<Application | null> {
  if (!supabase) return null;
  const found = await supabase.from('contractor_applications').select('*').eq('user_id', user.id).maybeSingle();
  if (found.data && (found.data as Application).status !== 'new') return found.data as Application;
  const claimed = await supabase.rpc('claim_my_application').then((r) => (Array.isArray(r.data) ? (r.data[0] as Application | undefined) : undefined), () => undefined);
  if (claimed) return claimed;
  if (found.data) return found.data as Application;
  const meta = user.user_metadata || {};
  const company = trimmed(meta.company), person = trimmed(meta.full_name), mobile = saudiMobile(meta.mobile);
  const trades = Array.isArray(meta.trades) ? (meta.trades as unknown[]).map(String).slice(0, 12) : [];
  if (company.length < 2 || person.length < 2 || !mobile || !trades.length) return null;
  await supabase.from('contractor_applications').insert({
    company: company.slice(0, 160), person: person.slice(0, 120), mobile, email: user.email || null, city: String(meta.city || 'riyadh'), trades,
    cr_number: /^[0-9]{5,15}$/.test(trimmed(meta.cr)) ? trimmed(meta.cr) : null, note: trimmed(meta.note).slice(0, LIMITS.appNote) || null, lang: meta.lang === 'en' ? 'en' : 'ar',
  }).then(() => undefined, () => undefined);
  const again = await supabase.from('contractor_applications').select('*').eq('user_id', user.id).maybeSingle();
  return (again.data as Application | null) || null;
}

async function loadAccount(user: User): Promise<Account | null> {
  if (!supabase) return null;
  const profile = await ensureProfile(user);
  if (!profile) return null;
  if (profile.role === 'contractor') {
    const application = await myApplication(user);
    const verified = application?.status === 'verified';
    // Open projects reach a contractor only once an admin has verified them; the database returns none before that.
    // (the database returns a contractor the open projects, plus any they have bid on)
    const open = verified ? await supabase.from('projects').select('*').in('status', ['open', 'active', 'completed']).order('created_at', { ascending: false }).limit(200) : null;
    const mine = verified ? await supabase.from('bids').select('*').neq('status', 'withdrawn') : null;
    return {
      profile, application, projects: (open?.data as ProjectRow[]) || [], bids: (mine?.data as BidRow[]) || [], bidders: [], agreements: await loadAgreements(), ...(await loadStages()),
      // the design's "verified through Nafath" flag stands for Tarmem's own verification until Nafath is connected
      logicUser: { role: 'contractor', name: application?.company || profile.company || profile.full_name, nafath: verified, admin: false },
    };
  }
  const rows = await supabase.from('projects').select('*').eq('owner_id', user.id).neq('status', 'withdrawn').order('created_at', { ascending: false });
  const received = profile.role === 'homeowner' ? await supabase.from('bids').select('*').neq('status', 'withdrawn').order('created_at', { ascending: true }) : null;
  const bids = (received?.data as BidRow[]) || [];
  const who = bids.length ? await supabase.from('verified_contractors').select('*') : null;
  return {
    profile, application: null, projects: (rows.data as ProjectRow[]) || [], bids, agreements: await loadAgreements(), ...(await loadStages()),
    bidders: ((who?.data as Bidder[]) || []).filter((b) => bids.some((x) => x.contractor_id === b.user_id)),
    // An account the owner marked admin in the database gets the design's admin role, and with it the console.
    logicUser: { role: profile.role === 'admin' ? 'admin' : 'homeowner', name: profile.full_name, nafath: false, admin: profile.role === 'admin' },
  };
}

/** Restore a saved sign-in before the site first renders. Never blocks for long: a visitor who is
    not signed in costs no network call, and a slow database gives way after `timeoutMs`. */
export async function initSession(timeoutMs = 4000): Promise<void> {
  if (!supabase) return;
  const client = supabase;
  client.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') { recovering = true; for (const listener of listeners) listener(); }
    // another tab signed out, or the session could not be renewed
    if (event === 'SIGNED_OUT' && account) setAccount(null);
  });
  const restore = (async () => {
    const { data } = await client.auth.getSession();
    if (data.session?.user) setAccount(await loadAccount(data.session.user));
  })().catch(() => undefined);
  await Promise.race([restore, new Promise((resolve) => window.setTimeout(resolve, timeoutMs))]);
}

export interface SignUpFields { email: string; password: string; name: string; mobile: string; city: string; lang: 'ar' | 'en' }

/** One account per mobile number (supabase/021): asked before the account is created, so the form can say so.
    If the database cannot answer, sign-up goes ahead and the database's own rule still stands. */
export async function mobileTaken(mobile: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('mobile_taken', { p_mobile: mobile });
    return !error && data === true;
  } catch { return false; }
}

/** With "Confirm email" on (supabase/030 F) a new account has no session until its email link is opened: that resolves
    to 'confirm', and the page asks the person to open the link. An address that already has an account comes back from
    Supabase as a user with no identities (it says nothing more, so nobody can probe for accounts). */
export async function signUp(f: SignUpFields): Promise<Result<true | 'confirm'>> {
  if (!supabase) return { error: 'generic' };
  try {
    if (await mobileTaken(f.mobile)) return { error: 'mobileTaken' };
    codeSkipped = false;
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { emailRedirectTo: linkTo('signup'), data: { full_name: f.name, mobile: f.mobile, city: f.city, lang: f.lang } },
    });
    if (error) return { error: failure(error) };
    if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) return { error: 'exists' };
    if (!data.session || !data.user) return { ok: 'confirm' };
    const loaded = await loadAccount(data.user);
    if (!loaded) return { error: 'generic' };
    setAccount(loaded);
    track('signup', 'auth');
    return { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** The activation email again, for an account that has not opened its link yet (or whose link expired). */
export async function resendConfirmation(email: string): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: linkTo('signup') } });
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

export async function signIn(email: string, password: string): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: failure(error) };
    const loaded = await loadAccount(data.user);
    if (!loaded) return { error: 'generic' };
    setAccount(loaded);
    return { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** Save the parts of their own profile a person may change (the database refuses anything else, such as the role). */
export async function updateProfile(patch: Partial<Pick<Profile, 'full_name' | 'mobile' | 'city' | 'lang' | 'prefs' | 'about' | 'trades'>>): Promise<Result> {
  if (!supabase || !account) return { error: 'generic' };
  try {
    const { error } = await supabase.from('profiles').update(patch).eq('id', account.profile.id);
    if (error) return { error: failure(error) };
    await refreshAccount();
    return { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** The settings card's "Send test message": one real WhatsApp to the person's own number (the database allows three a day). */
export async function sendWhatsAppTest(): Promise<Result<string>> {
  if (!supabase || !account) return { error: 'generic' };
  try {
    const { data, error } = await supabase.rpc('whatsapp_test');
    if (error) return { error: failure(error) };
    return { ok: String(data) };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** Ask the database again who this is — a contractor waiting to be verified presses this to see whether they have been. */
export async function refreshAccount(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (data.user) setAccount(await loadAccount(data.user));
}

export interface ContractorSignUp extends ApplicationFields { password: string }

/** A contractor applies and gets their account in one step; it opens fully once an admin verifies the application.
    With "Confirm email" on there is no session yet: the application goes in as the public form's does (no account on it,
    never read back), and is linked to the account at its first sign-in (myApplication above). */
export async function signUpContractor(f: ContractorSignUp): Promise<Result<true | 'confirm'>> {
  if (!supabase) return { error: 'generic' };
  try {
    const mobile = saudiMobile(f.mobile);
    if (await mobileTaken(mobile)) return { error: 'mobileTaken' };
    codeSkipped = false;
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      // what the application needs, kept with the account, so a lost application can be sent again at sign-in
      options: { emailRedirectTo: linkTo('signup'), data: { role: 'contractor', full_name: f.person.trim(), company: f.company.trim(), mobile, city: f.city, lang: f.lang,
        trades: f.trades.slice(0, 12), cr: f.crNumber.trim(), note: f.note.trim().slice(0, LIMITS.appNote) } },
    });
    if (error) return { error: failure(error) };
    if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) return { error: 'exists' };
    if (!data.session || !data.user) {
      const sent = await sendApplication({ ...f, mobile });
      return sent.ok ? { ok: 'confirm' } : sent;
    }
    if (!(await ensureProfile(data.user))) return { error: 'generic' }; // the contractor profile first, then the application tied to it
    const applied = await sendApplication({ ...f, mobile });
    if (!applied.ok) return applied;
    const loaded = await loadAccount(data.user);
    if (!loaded) return { error: 'generic' };
    setAccount(loaded);
    return { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** Erase the signed-in person's account (supabase/022): their own files first, then the database scrubs the rest and signs them out everywhere. */
export async function deleteMyAccount(): Promise<Result> {
  if (!supabase || !account) return { error: 'generic' };
  try {
    const mine = account.profile.id;
    for (const bucket of ['project-files', 'portfolio']) {
      const top = await supabase.storage.from(bucket).list(mine, { limit: 100 }).then((r) => r.data || [], () => []);
      const paths: string[] = [];
      for (const entry of top) {
        if (entry.id) paths.push(`${mine}/${entry.name}`);
        else { const inner = await supabase.storage.from(bucket).list(`${mine}/${entry.name}`, { limit: 100 }).then((r) => r.data || [], () => []); for (const f of inner) if (f.id) paths.push(`${mine}/${entry.name}/${f.name}`); }
      }
      if (paths.length) await supabase.storage.from(bucket).remove(paths).then(() => undefined, () => undefined);
    }
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return { error: failure(error) };
    await signOut();
    return { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** Whether the person who just signed up still has to confirm their mobile by WhatsApp code. The guard reads this the
    moment the account appears, so the sign-in page is not swapped for the dashboard before the step shows. */
let codeSkipped = false;
export function needsMobileCode(): boolean {
  return Boolean(account?.otpLive && !account.profile.mobile_verified_at && !codeSkipped);
}
/** "Later": the person goes on without the code this time. */
export function skipMobileCode(): void { codeSkipped = true; }
/** A six-digit code to the signed-in person's number (supabase/022). Resolves to the number it went to. */
export async function otpRequest(): Promise<Result<string>> {
  if (!supabase) return { error: 'generic' };
  try {
    const { data, error } = await supabase.rpc('otp_request');
    if (error) return { error: failure(error) };
    return { ok: String((data as { to?: string } | null)?.to || '') };
  } catch (e) { return { error: failure(e as Error) }; }
}
export async function otpCheck(code: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc('otp_check', { p_code: code });
    return !error && data === true;
  } catch { return false; }
}

/** Email a link for choosing a new password. Says nothing about whether the address has an account (Supabase answers the
    same for both); it only says "sent" when the request really went through. */
export async function requestPasswordReset(email: string): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: linkTo('reset') });
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** A new password: for someone who arrived through a reset link, or who changes it from the settings page. Every other
    device signed in to the account is signed out; this one stays. */
export async function setNewPassword(password: string): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error || !data.user) return { error: failure(error) };
    await supabase.auth.signOut({ scope: 'others' }).catch(() => undefined);
    recovering = false;
    setAccount(await loadAccount(data.user));
    return { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

export function signOut(): void {
  setAccount(null);
  void supabase?.auth.signOut().catch(() => undefined);
}

export interface ProjectFields { title: string; trade: string; desc: string; city: string; address: string; min: number; max: number; timing: string }

export async function createProject(f: ProjectFields): Promise<Result<ProjectRow>> {
  if (!supabase || !account) return { error: 'generic' };
  try {
    const { data, error } = await supabase.from('projects').insert({
      title: f.title.trim(), trade: f.trade, description: f.desc.trim(), city: f.city,
      district: f.address.trim() || null, budget_min: f.min, budget_max: f.max, timing: f.timing,
    }).select('*').single();
    if (error || !data) return { error: failure(error) };
    const row = data as ProjectRow;
    track('project', 'post');
    account = { ...account, projects: [row, ...account.projects] };
    return { ok: row };
  } catch (e) { return { error: failure(e as Error) }; }
}

export async function withdrawProject(dbId: string): Promise<Result> {
  if (!supabase || !account) return { error: 'generic' };
  try {
    const { data, error } = await supabase.from('projects').update({ status: 'withdrawn' }).eq('id', dbId).select('id');
    if (error) return { error: failure(error) };
    // a refused update changes no row and says nothing: the row that came back is the proof
    if (Array.isArray(data) && !data.length) return { error: 'notOpen' };
    account = { ...account, projects: account.projects.filter((p) => p.id !== dbId) };
    return { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** While payment on the site is off, each party confirms the work is complete (supabase/030 B). Completion is never
    one-sided: the project completes, and the homeowner's review opens, on the second confirmation. Resolves to
    'completed', or 'waiting' when the other party has not confirmed yet (they are emailed). */
export async function confirmComplete(projectId: string, side: 'homeowner' | 'contractor'): Promise<Result<'completed' | 'waiting'>> {
  if (!supabase) return { error: 'generic' };
  try {
    const { data, error } = await supabase.rpc(side === 'homeowner' ? 'homeowner_confirm_complete' : 'contractor_confirm_complete', { p_project: projectId });
    if (error) return { error: failure(error) };
    await refreshAccount();
    const row = (Array.isArray(data) ? data[0] : data) as { status?: string } | null;
    return { ok: row?.status === 'completed' ? 'completed' : 'waiting' };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** The team completes, cancels or removes a project from the console (supabase/030 A): active → completed or withdrawn,
    open → withdrawn. The database emails the parties in fixed words; the note stays in the team's own record. */
export async function adminSetProjectStatus(projectId: string, status: 'completed' | 'withdrawn', note = ''): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.rpc('admin_set_project_status', { p_project: projectId, p_status: status, p_note: note.trim().slice(0, 500) || null });
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/* A guest's project, kept on this device while their new account waits for its activation link (the form's text only:
   the photos themselves cannot be kept), and posted at the first sign-in to that same account. */
const DRAFT_KEY = 'tarmem-post-draft';
export interface PostDraft { email: string; f: Record<string, unknown>; files: number; at: number }
export function saveDraft(email: string, f: Record<string, unknown>, files: number): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ email: email.toLowerCase(), f, files, at: Date.now() })); } catch { /* private window: the form stays filled in this tab */ }
}
/** The draft for this account, once: it is removed as it is handed over. Older than a week, it is dropped. */
export function takeDraft(email: string | null | undefined): PostDraft | null {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as PostDraft | null;
    if (!draft || !email || draft.email !== email.toLowerCase()) return null;
    localStorage.removeItem(DRAFT_KEY);
    return Date.now() - draft.at < 7 * 86400000 && draft.f ? draft : null;
  } catch { return null; }
}

/** The database returns only agreements this person is a party to (or all of them, to an admin); none until 006 has been run. */
async function loadAgreements(): Promise<AgreementRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('agreements').select('*');
  return (data as AgreementRow[]) || [];
}

/** (empty, and off, until 007 has been run) */
async function loadStages(): Promise<Pick<Account, 'stages' | 'changes' | 'paymentsLive' | 'whatsappLive' | 'otpLive' | 'reviews' | 'wallet' | 'payout' | 'standing' | 'performance'>> {
  if (!supabase) return { stages: [], changes: [], paymentsLive: false, whatsappLive: false, otpLive: false, reviews: [], wallet: [], payout: null, standing: null, performance: null };
  const [flag, rows] = await Promise.all([
    supabase.from('platform_flags').select('key, enabled').in('key', ['payments_live', 'whatsapp_live', 'otp_live']),
    supabase.from('stages').select('project_id, idx, status').order('idx', { ascending: true }),
  ]);
  const changes = await supabase.from('change_requests').select('*').order('id', { ascending: true }).then((r) => (r.error ? [] : (r.data as ChangeRow[]) || []), () => [] as ChangeRow[]);
  const { data: who } = await supabase.auth.getUser();
  const mine = who.user ? await supabase.from('reviews').select('*').or(`homeowner_id.eq.${who.user.id},contractor_id.eq.${who.user.id}`) : null;
  const flags = new Map(((flag.data as { key: string; enabled: boolean }[] | null) || []).map((f) => [f.key, f.enabled]));
  const live = Boolean(flags.get('payments_live'));
  const perf = who.user ? await supabase.rpc('my_performance').then((r) => (r.data && typeof r.data === 'object' && 'views' in (r.data as object) ? (r.data as { views: number; bids: number; won: number }) : null), () => null) : null;
  const [wallet, payout, standing] = who.user ? await Promise.all([
    live ? supabase.from('wallet_txns').select('*').eq('user_id', who.user.id).order('created_at', { ascending: false }).limit(200) : null,
    live ? supabase.from('payout_accounts').select('holder, bank, iban').eq('user_id', who.user.id).maybeSingle() : null,
    supabase.from('verified_contractors').select('*').eq('user_id', who.user.id).maybeSingle(),
  ]) : [null, null, null];
  return { stages: (rows.data as StageRow[]) || [], changes, paymentsLive: live, whatsappLive: Boolean(flags.get('whatsapp_live')), otpLive: Boolean(flags.get('otp_live')), reviews: (mine?.data as ReviewRow[]) || [],
    wallet: (wallet?.data as WalletTxn[]) || [], payout: (payout?.data as PayoutAccount | null) || null, standing: (standing?.data as Bidder | null) || null, performance: perf };
}

/** What signed-in people may read about a contractor's reviews: the stars, the words, and the reviewer's first name. */
export async function loadContractorReviews(userId: string): Promise<PublicReview[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('contractor_reviews').select('*').eq('contractor_id', userId).order('created_at', { ascending: false }).limit(50);
  return (data as PublicReview[]) || [];
}

/** A wallet request is only ever a request: the database records it as waiting, and an admin (later, the payment provider) confirms the money. */
export async function walletRequest(type: 'deposit' | 'payout', amount: number, method: string, projectId: string | null = null): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.rpc('wallet_request', { p_type: type, p_amount: Math.round(amount), p_method: method, p_project: projectId });
    await refreshAccount();
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}
export interface WalletRequest extends WalletTxn { person: string; role: string; code: string | null }

/** Every deposit or payout still waiting for confirmation, with who asked. The database returns these rows only to an admin. */
export async function loadWalletRequests(): Promise<WalletRequest[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('wallet_txns').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(200);
    const rows = (data as WalletTxn[]) || [];
    if (!rows.length) return [];
    const ids = [...new Set(rows.map((r) => r.user_id))];
    const [people, projects] = await Promise.all([
      supabase.from('profiles').select('id, full_name, company, role').in('id', ids),
      supabase.from('projects').select('id, code').in('id', rows.map((r) => r.project_id).filter(Boolean) as string[]),
    ]);
    const who = new Map(((people.data || []) as { id: string; full_name: string; company: string | null; role: string }[]).map((p) => [p.id, p]));
    const codes = new Map(((projects.data || []) as { id: string; code: string }[]).map((p) => [p.id, p.code]));
    return rows.map((r) => ({ ...r, person: who.get(r.user_id)?.company || who.get(r.user_id)?.full_name || '—', role: who.get(r.user_id)?.role || '', code: r.project_id ? codes.get(r.project_id) || null : null }));
  } catch { return []; }
}

export async function walletDecide(id: number, status: 'cancelled' | 'confirmed' | 'paid' | 'rejected'): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  const { error } = await supabase.rpc('wallet_decide', { p_id: id, p_status: status });
  return error ? { error: failure(error) } : { ok: true };
}
export async function savePayoutAccount(a: PayoutAccount): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.from('payout_accounts').upsert({ holder: a.holder, bank: a.bank, iban: a.iban, updated_at: new Date().toISOString() });
    await refreshAccount();
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

export interface ReviewRow { project_id: string; contractor_id: string; stars: number; body: string; created_at: string }

/** A homeowner's review of their finished project. The database allows one, and only for the contractor who did the work. */
export async function saveReview(projectId: string, contractorId: string, stars: number, body: string): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.from('reviews').insert({ project_id: projectId, contractor_id: contractorId, stars, body });
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** An admin records that a project's payment is in (until a payment provider reports it by itself). Refused unless payments are live. */
export async function markFunded(projectId: string): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.rpc('mark_funded', { p_project: projectId });
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** Submit, approve or dispute a stage. The database checks who is asking, the order of stages, and that the evidence is in storage. */
export async function stageStep(projectId: string, idx: number, action: 'submit' | 'approve' | 'dispute', reason = ''): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.rpc('stage_step', { p_project: projectId, p_idx: idx, p_action: action, p_reason: reason || null });
    await refreshAccount();
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** A signature is written by the database, which checks who is signing; the website only asks for it. */
export async function signAgreement(as: 'homeowner' | 'contractor', id: string): Promise<Result<AgreementRow>> {
  if (!supabase) return { error: 'generic' };
  try {
    const { data, error } = as === 'homeowner'
      ? await supabase.rpc('sign_agreement_homeowner', { p_bid: id })
      : await supabase.rpc('sign_agreement_contractor', { p_project: id });
    if (error || !data) return { error: failure(error) };
    return { ok: data as AgreementRow };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** A contractor's bid, exactly as the design's form built it; the database stamps whose it is. */
export async function saveBid(projectId: string, bid: Record<string, unknown>): Promise<Result<BidRow>> {
  if (!supabase) return { error: 'generic' };
  try {
    const { cid: _cid, price, days, note, ...details } = bid;
    void _cid;
    const { data, error } = await supabase.from('bids').insert({
      project_id: projectId, price: Math.round(Number(price)), days: Math.round(Number(days)),
      note: String((note as { ar?: string } | null)?.ar || '').trim() || null, details,
    }).select('*').single();
    if (error || !data) return { error: failure(error) };
    track('project', 'bid');
    return { ok: data as BidRow };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** The homeowner's choice. Choosing another bid later simply moves the choice. */
export async function chooseBid(projectId: string, bidId: string): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    await supabase.from('bids').update({ status: 'submitted' }).eq('project_id', projectId).eq('status', 'chosen').neq('id', bidId);
    const { error } = await supabase.from('bids').update({ status: 'chosen' }).eq('id', bidId);
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

export interface ContactFields { name: string; email: string; mobile: string; topic: string; message: string; lang: 'ar' | 'en' }

/* The two public forms. Visitors who are not signed in may add a row and nothing else, so these
   never ask for the row back (`.select()` would need read permission they do not have). */
export async function sendContact(f: ContactFields): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  const problem = contactProblem({ name: f.name, email: f.email, mobile: f.mobile, message: f.message });
  if (problem) return { error: problem };
  try {
    const { error } = await supabase.from('contact_messages').insert({
      name: f.name.trim(), email: f.email.trim() || null, mobile: normalizeMobile(f.mobile) || null,
      topic: f.topic.trim().slice(0, 120) || null, message: f.message.trim(), lang: f.lang,
    });
    if (!error) track('contact', 'contact');
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

export interface ApplicationFields { company: string; person: string; mobile: string; email: string; city: string; trades: string[]; crNumber: string; note: string; lang: 'ar' | 'en' }

export async function sendApplication(f: ApplicationFields): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.from('contractor_applications').insert({
      company: f.company.trim(), person: f.person.trim(), mobile: saudiMobile(f.mobile) || normalizeMobile(f.mobile), email: f.email.trim() || null,
      city: f.city, trades: f.trades.slice(0, 12), cr_number: f.crNumber.trim() || null, note: f.note.trim().slice(0, 2000) || null, lang: f.lang,
    });
    if (!error) track('application', 'join');
    return error ? { error: failure(error) } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** A message inside a project (supabase/019): one thread per project and contractor. */
export interface MessageRow { id: number; project_id: string; contractor_id: string; from_id: string; body: string; created_at: string; read_at: string | null }

/** Every message of a project the person may read: the homeowner's threads with each contractor, or the contractor's own. */
export async function loadMessages(projectId: string): Promise<MessageRow[]> {
  if (!supabase || !account) return [];
  try {
    const { data } = await supabase.from('project_messages').select('*').eq('project_id', projectId).order('id', { ascending: true }).limit(500);
    return (data as MessageRow[]) || [];
  } catch { return []; }
}

export async function sendMessage(projectId: string, contractorId: string, body: string): Promise<Result> {
  if (!supabase || !account) return { error: 'generic' };
  try {
    if (body.length > LIMITS.message) return { error: 'msgLong' };
    const { error } = await supabase.from('project_messages').insert({ project_id: projectId, contractor_id: contractorId, body });
    if (error) return { error: failure(error) };
    return { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** The reader has seen the other side's messages in this thread. */
export async function markMessagesRead(projectId: string, contractorId: string): Promise<void> {
  if (!supabase || !account) return;
  await supabase.rpc('mark_messages_read', { p_project: projectId, p_contractor: contractorId }).then(() => undefined, () => undefined);
}

/** One line of the delivery log: an email or a WhatsApp the database sent, and what the provider answered (supabase/018). */
export interface SentRow { id: number; at: string; recipient: string; template: string; status: string; detail: string | null; channel: string; answer: string | null; answer_code: number | null;
  /** What Meta reported after sending a WhatsApp: delivered, read, or failed with its reason (supabase/026). */
  delivery: string | null; delivery_detail: string | null }

/** A WhatsApp message a customer sent to the Tarmem number (supabase/026). */
export interface WaInboxRow { id: number; at: string; from_number: string; name: string | null; kind: string; body: string | null; profile_id: string | null; replied_at: string | null }

export interface Inbox {
  projects: (ProjectRow & { owner: Pick<Profile, 'full_name' | 'mobile' | 'email' | 'city'> | null; bids: (BidRow & { company: string; mobile: string })[] })[];
  messages: Record<string, unknown>[];
  applications: Record<string, unknown>[];
  /** The last hundred emails and WhatsApps, newest first, with the providers' answers where they have arrived. */
  sent: SentRow[];
  /** Browser errors visitors hit, newest first (supabase/022). */
  errors: { at: string; route: string; path: string; device: string; detail: string }[];
  /** WhatsApp messages customers sent to the Tarmem number, newest first (supabase/026; empty before it). */
  whatsapp: (WaInboxRow & { account: string | null })[];
}

/** Everything that has arrived, for the team. The database returns rows only to an admin. */
export async function loadInbox(): Promise<Result<Inbox>> {
  if (!supabase || !account?.logicUser.admin) return { error: 'generic' };
  try {
    // the providers' replies are copied onto the log first, so the team reads what really happened (018; harmless before it)
    await supabase.rpc('wa_reconcile').then(() => undefined, () => undefined);
    const [projects, profiles, messages, applications, sent] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('profiles').select('id, full_name, mobile, email, city').limit(1000),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('contractor_applications').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('email_log').select('*').order('at', { ascending: false }).limit(100),
    ]);
    const failed = projects.error || profiles.error || messages.error || applications.error;
    if (failed) return { error: failure(failed) };
    const bids = ((await supabase.from('bids').select('*').neq('status', 'withdrawn')).data as BidRow[]) || []; // empty until 005 has been run
    const errors = await supabase.from('visits').select('created_at, route, path, device, detail').eq('event', 'error').order('created_at', { ascending: false }).limit(50)
      .then((r) => (r.error ? [] : (r.data || []).map((v) => ({ at: String(v.created_at), route: String(v.route), path: String(v.path), device: String(v.device), detail: String(v.detail || '') }))), () => []);
    const whatsapp = await supabase.from('wa_inbox').select('id, at, from_number, name, kind, body, profile_id, replied_at').order('at', { ascending: false }).limit(100)
      .then((r) => (r.error ? [] : ((r.data || []) as WaInboxRow[])), () => [] as WaInboxRow[]);
    const firm = new Map((applications.data || []).filter((a) => a.user_id).map((a) => [a.user_id as string, a]));
    const owners = new Map((profiles.data || []).map((p) => [p.id as string, p]));
    return { ok: {
      projects: ((projects.data as ProjectRow[]) || []).map((p) => ({
        ...p, owner: (owners.get(p.owner_id) as Inbox['projects'][number]['owner']) || null,
        bids: bids.filter((b) => b.project_id === p.id).map((b) => ({ ...b, company: String(firm.get(b.contractor_id)?.company || '—'), mobile: String(firm.get(b.contractor_id)?.mobile || '') })),
      })),
      messages: messages.data || [], applications: applications.data || [], errors,
      whatsapp: whatsapp.map((w) => ({ ...w, id: Number(w.id), account: w.profile_id ? String(owners.get(w.profile_id)?.full_name || '') || null : null })),
      sent: ((sent.data as Partial<SentRow>[] | null) || []).map((r) => ({ id: Number(r.id), at: String(r.at || ''), recipient: String(r.recipient || ''), template: String(r.template || ''), status: String(r.status || ''), detail: r.detail ?? null, channel: String(r.channel || 'email'), answer: r.answer ?? null, answer_code: r.answer_code ?? null, delivery: r.delivery ?? null, delivery_detail: r.delivery_detail ?? null })),
    } };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** Propose a change on a signed project (supabase/027): the other party is emailed and approves it on the project page. */
export async function proposeChange(projectId: string, description: string, amount: number, days: number): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.rpc('change_request_create', { p_project: projectId, p_desc: description, p_amount: amount, p_days: days });
    if (error) return { error: failure(error) };
    await refreshAccount();
    return { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** Approve the other party's change request: once both have, the project's value and days move by it. */
export async function approveChange(id: number): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.rpc('change_request_approve', { p_id: id });
    if (error) return { error: failure(error) };
    await refreshAccount();
    return { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}
