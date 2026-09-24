/* Who is signed in, and everything the site reads from or writes to the database.

   Every call here is made with the visitor's own session, so what it may touch is decided by the
   database's row-level rules (supabase/*.sql), not by this file. Functions resolve to a
   PlatformError key on failure, never throw, so pages can show a sentence instead of a stack. */

import type { User } from '@supabase/supabase-js';
import { supabase } from './client';
import type { PlatformError } from './copy';
import { runtimeData, type Application, type Profile, type ProjectRow } from './data';
import { setTrackContext, track } from './track';

export interface BidRow { id: string; project_id: string; contractor_id: string; price: number; days: number; note: string | null; details: Record<string, unknown>; status: 'submitted' | 'withdrawn' | 'chosen'; created_at: string }
export interface AgreementRow { project_id: string; bid_id: string; homeowner_id: string; contractor_id: string; amount: number; days: number; homeowner_name: string; homeowner_signed_at: string; contractor_name: string | null; contractor_signed_at: string | null }
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
const listeners = new Set<() => void>();

export const currentAccount = (): Account | null => account;
export function onAccountChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setAccount(next: Account | null): void {
  account = next;
  runtimeData(next?.profile ?? null);
  setTrackContext({ admin: next?.profile.role === 'admin', city: next?.profile.city ?? null });
  for (const listener of listeners) listener();
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
/** "٠٥٥ ١٢٣-٤٥٦٧" → "055 1234567": Latin digits, spaces and a leading + only, as the database requires. */
export function normalizeMobile(raw: string): string {
  const latin = String(raw || '').replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  const kept = latin.replace(/[^\d+ ]/g, '').replace(/(?!^)\+/g, '').replace(/\s+/g, ' ').trim();
  return kept;
}
export const validMobile = (mobile: string) => /^\+?[0-9][0-9 ]{7,17}$/.test(mobile);
export const validEmail = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 160;

function failure(error: { message?: string; status?: number; code?: string } | null | undefined): PlatformError {
  const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  if (/invalid login|invalid_credentials/.test(text)) return 'wrong';
  if (/mobile_taken/.test(text)) return 'mobileTaken';
  if (/active_project/.test(text)) return 'activeProject';
  if (/otp_off/.test(text)) return 'otpOff';
  if (/too many/.test(text)) return 'rate';
  if (/already registered|user_already_exists/.test(text)) return 'exists';
  if (/not confirmed|email_not_confirmed/.test(text)) return 'unconfirmed';
  if (/rate limit|too many|over_request|over_email/.test(text) || error?.status === 429) return 'rate';
  if (/pwned|known to be weak|easy to guess/.test(text)) return 'pwned'; // Supabase's leaked-password check (Pro)
  if (/weak_password|password should/.test(text)) return 'password';
  if (/invalid.*email|email_address_invalid|validation_failed/.test(text)) return 'email';
  if (/only homeowners/.test(text)) return 'notHomeowner';
  if (/open projects/.test(text)) return 'tooMany';
  if (/failed to fetch|network|load failed/.test(text)) return 'network';
  if (/not switched on/.test(text)) return 'waOff';
  if (/test messages a day|three test messages/.test(text)) return 'waLimit';
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
  const created = await supabase.from('profiles').insert({
    id: user.id, role: contractor ? 'contractor' : 'homeowner', ...(contractor ? { company: String(meta.company || '').slice(0, 160) || null } : {}),
    full_name: String(meta.full_name || '').trim(), mobile: normalizeMobile(meta.mobile),
    city: String(meta.city || 'riyadh'), lang: meta.lang === 'en' ? 'en' : 'ar',
  }).select('*').single();
  return (created.data as Profile) || null;
}

async function loadAccount(user: User): Promise<Account | null> {
  if (!supabase) return null;
  const profile = await ensureProfile(user);
  if (!profile) return null;
  if (profile.role === 'contractor') {
    const applied = await supabase.from('contractor_applications').select('*').eq('user_id', user.id).maybeSingle();
    const application = (applied.data as Application | null) || null;
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

/** Resolves to 'confirm' when the project still requires the email to be confirmed before signing in. */
export async function signUp(f: SignUpFields): Promise<Result<true | 'confirm'>> {
  if (!supabase) return { error: 'generic' };
  try {
    if (await mobileTaken(f.mobile)) return { error: 'mobileTaken' };
    codeSkipped = false;
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { full_name: f.name, mobile: f.mobile, city: f.city, lang: f.lang } },
    });
    if (error) return { error: failure(error) };
    if (!data.session || !data.user) return { ok: 'confirm' };
    const loaded = await loadAccount(data.user);
    if (!loaded) return { error: 'generic' };
    setAccount(loaded);
    track('signup', 'auth');
    return { ok: true };
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

/** A contractor applies and gets their account in one step; it opens fully once an admin verifies the application. */
export async function signUpContractor(f: ContractorSignUp): Promise<Result<true | 'confirm'>> {
  if (!supabase) return { error: 'generic' };
  try {
    if (await mobileTaken(normalizeMobile(f.mobile))) return { error: 'mobileTaken' };
    codeSkipped = false;
    const { data, error } = await supabase.auth.signUp({
      email: f.email, password: f.password,
      options: { data: { role: 'contractor', full_name: f.person.trim(), company: f.company.trim(), mobile: normalizeMobile(f.mobile), city: f.city, lang: f.lang } },
    });
    if (error) return { error: failure(error) };
    if (!data.session || !data.user) return { ok: 'confirm' };
    if (!(await loadAccount(data.user))) return { error: 'generic' }; // creates the contractor profile
    const applied = await sendApplication(f);
    if (!applied.ok) return applied;
    setAccount(await loadAccount(data.user));
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

/** Email a link for choosing a new password. Says nothing about whether the address has an account. */
export async function requestPasswordReset(email: string): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/signin` });
    return error && failure(error) === 'rate' ? { error: 'rate' } : { ok: true };
  } catch (e) { return { error: failure(e as Error) }; }
}

/** The new password, for someone who arrived through a reset link. */
export async function setNewPassword(password: string): Promise<Result> {
  if (!supabase) return { error: 'generic' };
  try {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error || !data.user) return { error: failure(error) };
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
  const { error } = await supabase.from('projects').update({ status: 'withdrawn' }).eq('id', dbId);
  if (error) return { error: failure(error) };
  account = { ...account, projects: account.projects.filter((p) => p.id !== dbId) };
  return { ok: true };
}

/** The database returns only agreements this person is a party to (or all of them, to an admin); none until 006 has been run. */
async function loadAgreements(): Promise<AgreementRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('agreements').select('*');
  return (data as AgreementRow[]) || [];
}

/** (empty, and off, until 007 has been run) */
async function loadStages(): Promise<Pick<Account, 'stages' | 'paymentsLive' | 'whatsappLive' | 'otpLive' | 'reviews' | 'wallet' | 'payout' | 'standing' | 'performance'>> {
  if (!supabase) return { stages: [], paymentsLive: false, whatsappLive: false, otpLive: false, reviews: [], wallet: [], payout: null, standing: null, performance: null };
  const [flag, rows] = await Promise.all([
    supabase.from('platform_flags').select('key, enabled').in('key', ['payments_live', 'whatsapp_live', 'otp_live']),
    supabase.from('stages').select('project_id, idx, status').order('idx', { ascending: true }),
  ]);
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
  return { stages: (rows.data as StageRow[]) || [], paymentsLive: live, whatsappLive: Boolean(flags.get('whatsapp_live')), otpLive: Boolean(flags.get('otp_live')), reviews: (mine?.data as ReviewRow[]) || [],
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
      note: String((note as { ar?: string } | null)?.ar || '').slice(0, 2000) || null, details,
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
      company: f.company.trim(), person: f.person.trim(), mobile: normalizeMobile(f.mobile), email: f.email.trim() || null,
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
    const { error } = await supabase.from('project_messages').insert({ project_id: projectId, contractor_id: contractorId, body: body.slice(0, 2000) });
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
export interface SentRow { id: number; at: string; recipient: string; template: string; status: string; detail: string | null; channel: string; answer: string | null; answer_code: number | null }

export interface Inbox {
  projects: (ProjectRow & { owner: Pick<Profile, 'full_name' | 'mobile' | 'email' | 'city'> | null; bids: (BidRow & { company: string; mobile: string })[] })[];
  messages: Record<string, unknown>[];
  applications: Record<string, unknown>[];
  /** The last hundred emails and WhatsApps, newest first, with the providers' answers where they have arrived. */
  sent: SentRow[];
  /** Browser errors visitors hit, newest first (supabase/022). */
  errors: { at: string; route: string; path: string; device: string; detail: string }[];
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
    const firm = new Map((applications.data || []).filter((a) => a.user_id).map((a) => [a.user_id as string, a]));
    const owners = new Map((profiles.data || []).map((p) => [p.id as string, p]));
    return { ok: {
      projects: ((projects.data as ProjectRow[]) || []).map((p) => ({
        ...p, owner: (owners.get(p.owner_id) as Inbox['projects'][number]['owner']) || null,
        bids: bids.filter((b) => b.project_id === p.id).map((b) => ({ ...b, company: String(firm.get(b.contractor_id)?.company || '—'), mobile: String(firm.get(b.contractor_id)?.mobile || '') })),
      })),
      messages: messages.data || [], applications: applications.data || [], errors,
      sent: ((sent.data as Partial<SentRow>[] | null) || []).map((r) => ({ id: Number(r.id), at: String(r.at || ''), recipient: String(r.recipient || ''), template: String(r.template || ''), status: String(r.status || ''), detail: r.detail ?? null, channel: String(r.channel || 'email'), answer: r.answer ?? null, answer_code: r.answer_code ?? null })),
    } };
  } catch (e) { return { error: failure(e as Error) }; }
}
