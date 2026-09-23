/* Real data for the designed admin console.

   The console in the design runs on seed lists and, for analytics, on numbers it makes up. Here
   the same tabs are fed from the database, in the shapes the design's logic already expects:

     overview      every posted project, and real counts (money figures are true zeros until
                   payments exist)
     verification  contractor applications; Approve / Reject change the application's status
     support       messages from the contact form; "close" marks one handled
     users         every homeowner account, and every contractor who applied
     analytics     the site's own visit record (src/platform/track.ts), worked out by the
                   database function admin_analytics
     promos,       saved as the design edits them (table admin_state); nothing can redeem a code
     affiliates    until payments exist, so their usage figures are true zeros
     late          strikes and refunds come with milestones and payments: empty until then

   Every read and write goes through the signed-in admin's own session; the database refuses
   anybody else (supabase/001, 002). */

import type { LogicState, LogicVals } from '../state/designRuntime';
import { supabase } from './client';
import { homeownerRecord, toLogicProject, type Profile, type ProjectRow } from './data';

export interface ApplicationRow { id: number; created_at: string; company: string; person: string; mobile: string; email: string | null; city: string; trades: string[]; cr_number: string | null; note: string | null; status: 'new' | 'contacted' | 'verified' | 'declined' }
export interface MessageRow { id: number; created_at: string; name: string; email: string | null; mobile: string | null; topic: string | null; message: string; handled: boolean; lang?: string; answered_at?: string | null }
export interface CaseReplyRow { id: number; case_id: number; admin_id: string | null; body: string; sent_by_email: boolean; created_at: string }
export interface AdminData { profiles: Profile[]; projects: ProjectRow[]; applications: ApplicationRow[]; messages: MessageRow[]; replies: CaseReplyRow[]; promos: LogicState[]; affiliates: LogicState[] }
/** One person in full, from admin_user_detail (supabase/021). */
export interface UserDetail {
  profile: Profile; email: string | null; created_at: string; last_sign_in_at: string | null; email_confirmed_at: string | null;
  projects: { id: string; code: string; title: string; status: string; city: string; trade: string; budget_min: number; budget_max: number; created_at: string; bids: number }[];
  bids: { id: string; project_code: string; project_title: string; price: number; days: number | null; status: string; created_at: string }[];
  application: ApplicationRow | null; messages: number; portfolio: number; reviews: number;
}

type Series = { k: string; n: number }[];
interface PeriodStats { visitors: number; views: number; signups: number; posts: number; avg_seconds: number; bounce_pct: number }
export interface AnalyticsRaw {
  range: 'week' | 'month' | 'year'; series: Series; prev_total: number; today: PeriodStats; yesterday: PeriodStats;
  top_pages: Series; sources: Series; cities: Series;
  live: { now: number; devices: Series; pages: Series; feed: { city: string | null; event: string; route: string; age: number }[] };
}

export async function loadAdminData(): Promise<AdminData | null> {
  if (!supabase) return null;
  try {
    const [profiles, projects, applications, messages, lists] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }).limit(1000),
      supabase.from('projects').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('contractor_applications').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('admin_state').select('key, value'),
    ]);
    if (profiles.error || projects.error || applications.error || messages.error) return null;
    // replies to support cases arrive with 021; until that has been run there are none
    const replies = await supabase.from('case_replies').select('*').order('created_at', { ascending: true }).limit(2000)
      .then((r) => (r.error ? [] : (r.data as CaseReplyRow[])), () => [] as CaseReplyRow[]);
    // admin_state arrives with 002; until that has been run the two lists are simply empty
    const list = (key: string) => ((lists.data || []).find((row) => row.key === key)?.value as LogicState[] | undefined) || [];
    return {
      profiles: profiles.data as Profile[], projects: projects.data as ProjectRow[],
      applications: applications.data as ApplicationRow[], messages: messages.data as MessageRow[], replies,
      promos: list('promos'), affiliates: list('affiliates'),
    };
  } catch { return null; }
}

export async function loadAnalytics(range: string): Promise<AnalyticsRaw | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_analytics', { p_range: range });
    return error || !data ? null : (data as AnalyticsRaw);
  } catch { return null; }
}

export const setApplicationStatus = async (id: number, status: 'verified' | 'declined') =>
  Boolean(supabase && !(await supabase.from('contractor_applications').update({ status }).eq('id', id)).error);
export const setMessageHandled = async (id: number) =>
  Boolean(supabase && !(await supabase.from('contact_messages').update({ handled: true }).eq('id', id)).error);
/** Answer a support case from the console: emailed to the sender when they left an email, kept either way (supabase/021). */
export async function replyToCase(id: number, body: string): Promise<{ ok: boolean; sent: boolean }> {
  if (!supabase) return { ok: false, sent: false };
  try {
    const { data, error } = await supabase.rpc('admin_reply_case', { p_case: id, p_body: body });
    return error ? { ok: false, sent: false } : { ok: true, sent: Boolean((data as { sent?: boolean } | null)?.sent) };
  } catch { return { ok: false, sent: false }; }
}
/** The console erases a person (supabase/022): scrubbed profile, files and bank details gone, login dead. */
export async function adminDeleteUser(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'generic' };
  try {
    const { error } = await supabase.rpc('admin_delete_user', { p_user: id });
    return error ? { ok: false, error: /active_project/.test(error.message || '') ? 'activeProject' : 'generic' } : { ok: true };
  } catch { return { ok: false, error: 'generic' }; }
}
/** Everything the team may need about one account (supabase/021). */
export async function userDetail(id: string): Promise<UserDetail | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_user_detail', { p_user: id });
    return error || !data ? null : (data as UserDetail);
  } catch { return null; }
}
export const saveConsoleList = async (key: 'promos' | 'affiliates', value: LogicState[]) =>
  Boolean(supabase && !(await supabase.from('admin_state').upsert({ key, value, updated_at: new Date().toISOString() })).error);

const both = (text: string) => ({ en: text, ar: text });

/** Everybody with a homeowner account, in the place the logic looks people up by id. */
export function adminUsers(data: AdminData): Record<string, ReturnType<typeof homeownerRecord>> {
  return Object.fromEntries(data.profiles.filter((p) => p.role === 'homeowner' && !p.deleted_at).map((p) => [p.id, homeownerRecord(p)]));
}

/** The console's collections, as the design's logic state. */
export function adminLogicState(data: AdminData): LogicState {
  return {
    // a withdrawn project stays visible to the team, marked as such (the view model relabels it)
    projects: data.projects.map((row) => ({ ...toLogicProject(row, row.owner_id), withdrawn: row.status === 'withdrawn' })),
    contractors: data.applications.map((a) => ({
      id: 'A-' + a.id, dbId: a.id, name: both(a.company), city: a.city, trades: a.trades || [], rating: 0, reviews: 0, done: 0,
      verified: a.status === 'verified', since: a.created_at.slice(0, 4), onTime: '—', response: '—', bio: both(a.note || ''),
      checks: { id: false, cr: Boolean(a.cr_number), pf: false }, person: a.person, mobile: a.mobile, email: a.email, appliedAt: a.created_at, cr: a.cr_number || '', note: a.note || '', userId: (a as ApplicationRow & { user_id?: string | null }).user_id || null,
      mobileVerified: Boolean(data.profiles.find((p) => p.id === (a as ApplicationRow & { user_id?: string | null }).user_id)?.mobile_verified_at), lang: (a as ApplicationRow & { lang?: string }).lang === 'en' ? 'en' : 'ar', hasAccount: Boolean((a as ApplicationRow & { user_id?: string | null }).user_id),
    })),
    rejected: data.applications.filter((a) => a.status === 'declined').map((a) => 'A-' + a.id),
    cases: data.messages.map((m) => ({
      id: 'M-' + m.id, dbId: m.id, pid: null, issue: both(m.topic ? `${m.topic} — ${m.message}` : m.message), open: !m.handled,
      from: [m.name, m.mobile, m.email].filter(Boolean).join(' · '),
      // the detail view: the whole message, the sender's details, and the team's replies
      name: m.name, email: m.email, mobile: m.mobile, topic: m.topic, message: m.message, lang: m.lang || 'ar', receivedAt: m.created_at, answeredAt: m.answered_at || null,
      replies: (data.replies || []).filter((r) => r.case_id === m.id).map((r) => ({ when: r.created_at, text: r.body, email: r.sent_by_email })),
    })),
    promos: data.promos, affiliates: data.affiliates, strikes: [], refunds: [],
  };
}

/* ---------- analytics, in the design's own shapes (see `analytics` and `liveView` in the logic) ---------- */

const ROUTE_LABELS: Record<string, [string, string]> = {
  home: ['الرئيسية', 'Home'], post: ['نشر مشروع', 'Post a project'], pricing: ['الأسعار', 'Pricing'], how: ['طريقة العمل', 'How it works'],
  faq: ['الأسئلة الشائعة', 'FAQ'], auth: ['تسجيل الدخول', 'Sign in'], join: ['انضمام المقاولين', 'Contractor application'], about: ['عن ترميم', 'About'],
  help: ['مركز المساعدة', 'Help'], contact: ['تواصل معنا', 'Contact'], rules: ['القواعد', 'Rules'], terms: ['الشروط', 'Terms'], privacy: ['الخصوصية', 'Privacy'],
  hdash: ['لوحة العميل', 'Customer dashboard'], project: ['صفحة مشروع', 'Project page'], sent: ['تأكيد الإرسال', 'Confirmation'],
};
const EVENT_LABELS: Record<string, [string, string]> = {
  view: ['يتصفح', 'Viewing'], signup: ['أنشأ حسابًا', 'Created an account'], signin: ['سجّل الدخول', 'Signed in'],
  project: ['نشر مشروعًا', 'Posted a project'], application: ['مقاول قدّم طلب انضمام', 'Contractor applied'], contact: ['أرسل رسالة', 'Sent a message'], error: ['واجه خطأ في الصفحة', 'Hit a page error'],
};
function sourceLabel(host: string, ar: boolean): string {
  if (host === 'direct') return ar ? 'مباشر' : 'Direct';
  if (/google\./.test(host)) return 'Google';
  if (/instagram\./.test(host)) return 'Instagram';
  if (/snapchat\./.test(host)) return 'Snapchat';
  if (/(^|\.)(x|twitter)\.com$|^t\.co$/.test(host)) return 'X';
  if (/linkedin\.|lnkd\.in/.test(host)) return 'LinkedIn';
  if (/whatsapp\.|wa\.me/.test(host)) return 'WhatsApp';
  return host;
}

const ZERO: PeriodStats = { visitors: 0, views: 0, signups: 0, posts: 0, avg_seconds: 0, bounce_pct: 0 };
export const EMPTY_ANALYTICS = (range: string): AnalyticsRaw => ({
  range: range === 'month' || range === 'year' ? range : 'week',
  series: Array.from({ length: range === 'month' ? 30 : range === 'year' ? 12 : 7 }, (_, k) => ({ k: String(k), n: 0 })),
  prev_total: 0, today: ZERO, yesterday: ZERO, top_pages: [], sources: [], cities: [], live: { now: 0, devices: [], pages: [], feed: [] },
});

/** `vm.an` and `vm.live`, from the database's figures instead of the design's made-up ones. */
export function analyticsVals(raw: AnalyticsRaw, vm: LogicVals): { an: LogicVals; live: LogicVals } {
  const ar = vm.dir !== 'ltr', A = vm.t.admin.an, pick = (pair?: [string, string]) => pair?.[ar ? 0 : 1];
  const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
  const cityLabel = (id: string | null) => (!id || id === 'unknown' ? (ar ? 'غير معروفة' : 'Unknown') : (vm.cities as { id: string; label: string }[] | undefined)?.find((c) => c.id === id)?.label || id);

  // the chart: same canvas and geometry as the design's
  const vals = raw.series.map((p) => p.n);
  const total = vals.reduce((a, b) => a + b, 0);
  const W = 640, top = 12, bot = 190, max = Math.max(1, ...vals) * 1.08;
  const X = (k: number) => (vals.length === 1 ? W / 2 : Math.round((k / (vals.length - 1)) * (W - 16) + 8));
  const Y = (v: number) => Math.round(bot - (v / max) * (bot - top));
  const pts = vals.map((v, k) => [X(k), Y(v)]);
  const line = pts.map((p, k) => (k ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]} ${bot} L${pts[0][0]} ${bot} Z`;
  const dayOf = (key: string) => new Date(key + 'T12:00:00');
  const labels = raw.range === 'year' ? raw.series.map((p) => A.months[Number(p.k.slice(5, 7)) - 1])
    : raw.range === 'month' ? raw.series.map((p, k) => (k % 5 === 4 || k === 0 ? `${dayOf(p.k).getDate()} ${A.months[dayOf(p.k).getMonth()]}` : '')).filter(Boolean)
    : raw.series.map((p) => A.days[dayOf(p.k).getDay()]);

  const delta = (now: number, before: number) => {
    const d = before ? Math.round(((now - before) / before) * 100) : 0;
    return { d: before || !now ? (d >= 0 ? '+' : '−') + Math.abs(d) + '%' : (ar ? 'جديد' : 'new'), cls: d >= 0 ? 'an-up' : 'an-down' };
  };
  const share = (rows: { l: string; n: number }[], unit: '%' | 'n') => {
    const sum = rows.reduce((a, r) => a + r.n, 0) || 1, most = Math.max(1, ...rows.map((r) => r.n));
    return rows.map((r) => ({ l: r.l, v: unit === '%' ? Math.round((r.n / sum) * 100) + '%' : fmt(r.n), pct: Math.round((r.n / most) * 100) }));
  };
  const grouped = (rows: Series, label: (k: string) => string) => {
    const merged = new Map<string, number>();
    for (const r of rows) merged.set(label(r.k), (merged.get(label(r.k)) || 0) + r.n);
    return [...merged].map(([l, n]) => ({ l, n })).sort((a, b) => b.n - a.n).slice(0, 7);
  };
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
  const t = raw.today, y = raw.yesterday;
  const tdl = delta(total, raw.prev_total);

  const deviceOrder = ['desktop', 'mobile', 'tablet'];
  const liveSessions = raw.live.devices.reduce((a, r) => a + r.n, 0) || 1;
  const livePages = grouped(raw.live.pages, (k) => pick(ROUTE_LABELS[k]) || k).slice(0, 5);
  const busiest = Math.max(1, ...livePages.map((r) => r.n));
  const ago = (age: number) => (age < 5 ? A.now : age < 60 ? `${age} ${A.secAgo}` : `${Math.round(age / 60)} ${A.minAgo}`);

  return {
    an: {
      ...vm.an,
      total: fmt(total), totalDelta: tdl.d, totalCls: tdl.cls,
      line, area, labels, dots: raw.range === 'month' ? [] : pts.slice(0, -1).map((p) => ({ x: p[0], y: p[1] })),
      lastX: pts[pts.length - 1][0], lastY: pts[pts.length - 1][1],
      today: [
        { v: fmt(t.visitors), l: A.kVisitors, ...delta(t.visitors, y.visitors) }, { v: fmt(t.views), l: A.kViews, ...delta(t.views, y.views) },
        { v: fmt(t.signups), l: A.kSignups, ...delta(t.signups, y.signups) }, { v: fmt(t.posts), l: A.kPosts, ...delta(t.posts, y.posts) },
        { v: `${clock(t.avg_seconds)} ${A.min}`, l: A.kAvg, ...delta(t.avg_seconds, y.avg_seconds) }, { v: `${t.bounce_pct}%`, l: A.kBounce, ...delta(t.bounce_pct, y.bounce_pct) },
      ],
      topPages: share(grouped(raw.top_pages, (k) => pick(ROUTE_LABELS[k]) || k), 'n'),
      sources: share(grouped(raw.sources, (k) => sourceLabel(k, ar)).slice(0, 6), '%'),
      cities: share(grouped(raw.cities, cityLabel).slice(0, 6), '%'),
      srcLabel: ar ? 'بيانات حقيقية · سجل زيارات ترميم' : 'Real data · Tarmem\'s own visit record', srcCls: 'tag-g',
    },
    live: {
      now: fmt(raw.live.now),
      devices: deviceOrder.map((id, k) => ({ l: A.dev[k], pct: Math.round(((raw.live.devices.find((r) => r.k === id)?.n || 0) / liveSessions) * 100) })),
      pages: livePages.map((r) => ({ l: r.l, v: fmt(r.n), pct: Math.round((r.n / busiest) * 100) })),
      feed: raw.live.feed.map((f) => ({ city: cityLabel(f.city), what: `${pick(EVENT_LABELS[f.event]) || f.event}${f.event === 'view' ? ' · ' + (pick(ROUTE_LABELS[f.route]) || f.route) : ''}`, when: ago(f.age) })),
    },
  };
}
