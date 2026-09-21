/* Who is signed in, and everything the site reads from or writes to the database.

   Every call here is made with the visitor's own session, so what it may touch is decided by the
   database's row-level rules (supabase/*.sql), not by this file. Functions resolve to a
   PlatformError key on failure, never throw, so pages can show a sentence instead of a stack. */

import type { User } from '@supabase/supabase-js';
import { supabase } from './client';
import type { PlatformError } from './copy';
import { runtimeData, type Application, type Profile, type ProjectRow } from './data';
import { setTrackContext, track } from './track';

export interface Account {
  profile: Profile;
  projects: ProjectRow[];
  /** The `user` object the design's logic sees. One identity per sign-in, so state comparisons stay cheap. */
  /** A contractor's application: `verified` is what an admin's approval sets, and what opens the projects to them. */
  application: Application | null;
  logicUser: { role: 'homeowner' | 'admin' | 'contractor'; name: string; nafath: boolean; admin: boolean };
}

export type Result<T = true> = { ok: T; error?: undefined } | { ok?: undefined; error: PlatformError };

let account: Account | null = null;
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
  if (/already registered|user_already_exists/.test(text)) return 'exists';
  if (/not confirmed|email_not_confirmed/.test(text)) return 'unconfirmed';
  if (/rate limit|too many|over_request|over_email/.test(text) || error?.status === 429) return 'rate';
  if (/weak_password|password should/.test(text)) return 'password';
  if (/invalid.*email|email_address_invalid|validation_failed/.test(text)) return 'email';
  if (/only homeowners/.test(text)) return 'notHomeowner';
  if (/open projects/.test(text)) return 'tooMany';
  if (/failed to fetch|network|load failed/.test(text)) return 'network';
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
    const open = verified ? await supabase.from('projects').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(200) : null;
    return {
      profile, application, projects: (open?.data as ProjectRow[]) || [],
      // the design's "verified through Nafath" flag stands for Tarmem's own verification until Nafath is connected
      logicUser: { role: 'contractor', name: application?.company || profile.company || profile.full_name, nafath: verified, admin: false },
    };
  }
  const rows = await supabase.from('projects').select('*').eq('owner_id', user.id).neq('status', 'withdrawn').order('created_at', { ascending: false });
  return {
    profile, application: null, projects: (rows.data as ProjectRow[]) || [],
    // An account the owner marked admin in the database gets the design's admin role, and with it the console.
    logicUser: { role: profile.role === 'admin' ? 'admin' : 'homeowner', name: profile.full_name, nafath: false, admin: profile.role === 'admin' },
  };
}

/** Restore a saved sign-in before the site first renders. Never blocks for long: a visitor who is
    not signed in costs no network call, and a slow database gives way after `timeoutMs`. */
export async function initSession(timeoutMs = 4000): Promise<void> {
  if (!supabase) return;
  const client = supabase;
  const restore = (async () => {
    const { data } = await client.auth.getSession();
    if (data.session?.user) setAccount(await loadAccount(data.session.user));
  })().catch(() => undefined);
  await Promise.race([restore, new Promise((resolve) => window.setTimeout(resolve, timeoutMs))]);
  client.auth.onAuthStateChange((event) => {
    // another tab signed out, or the session could not be renewed
    if (event === 'SIGNED_OUT' && account) setAccount(null);
  });
}

export interface SignUpFields { email: string; password: string; name: string; mobile: string; city: string; lang: 'ar' | 'en' }

/** Resolves to 'confirm' when the project still requires the email to be confirmed before signing in. */
export async function signUp(f: SignUpFields): Promise<Result<true | 'confirm'>> {
  if (!supabase) return { error: 'generic' };
  try {
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

export interface Inbox {
  projects: (ProjectRow & { owner: Pick<Profile, 'full_name' | 'mobile' | 'email' | 'city'> | null })[];
  messages: Record<string, unknown>[];
  applications: Record<string, unknown>[];
}

/** Everything that has arrived, for the team. The database returns rows only to an admin. */
export async function loadInbox(): Promise<Result<Inbox>> {
  if (!supabase || !account?.logicUser.admin) return { error: 'generic' };
  try {
    const [projects, profiles, messages, applications] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('profiles').select('id, full_name, mobile, email, city').limit(1000),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('contractor_applications').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    const failed = projects.error || profiles.error || messages.error || applications.error;
    if (failed) return { error: failure(failed) };
    const owners = new Map((profiles.data || []).map((p) => [p.id as string, p]));
    return { ok: {
      projects: ((projects.data as ProjectRow[]) || []).map((p) => ({ ...p, owner: (owners.get(p.owner_id) as Inbox['projects'][number]['owner']) || null })),
      messages: messages.data || [], applications: applications.data || [],
    } };
  } catch (e) { return { error: failure(e as Error) }; }
}
