/* Real rows, in the shapes the design's logic expects.

   The design's logic was written against seed data in which the signed-in homeowner is
   always "h1". Rather than rewrite 1,400 lines of it, the public site keeps the logic as it
   is and feeds it real data in those same shapes: the person who is signed in *is* h1, and
   the projects list holds only what the database let them read. */

import * as D from '../data/tarmem-data';
import { isLaunch } from '../launch/mode';
import type { LogicState } from '../state/designRuntime';

export interface Profile {
  id: string;
  role: 'homeowner' | 'contractor' | 'admin';
  full_name: string;
  mobile: string;
  email: string | null;
  city: string;
  company: string | null;
  lang: 'ar' | 'en';
  created_at: string;
  /** Notification choices from the settings page, and the profile's "about" line (supabase/007). */
  prefs?: Record<string, boolean> | null;
  about?: string | null;
}

export interface ProjectRow {
  id: string;
  code: string;
  owner_id: string;
  title: string;
  trade: string;
  description: string;
  city: string;
  district: string | null;
  budget_min: number;
  budget_max: number;
  timing: 'asap' | 'month' | 'flexible';
  status: 'open' | 'active' | 'completed' | 'withdrawn';
  created_at: string;
  /** When the project's first payment was confirmed (supabase/007). Stages wait for it. */
  funded_at?: string | null;
}

const both = (text: string) => ({ en: text, ar: text });

/** A homeowner record as the logic looks people up (`USERS.h1` for the signed-in one; by id in the admin console). */
export function homeownerRecord(profile: Profile | null) {
  const name = profile?.full_name || '';
  const year = (profile?.created_at || new Date().toISOString()).slice(0, 4);
  return {
    ...both(name), city: profile?.city || 'riyadh', nafath: false,
    joined: { en: `Joined ${year}`, ar: `انضم في ${year}` },
    rating: 0, reviews: 0, done: 0, onTimeApproval: '—', avgApproval: both('—'), disputes: 0,
    about: both(profile?.about || ''), revs: [],
  };
}

export interface Application { id: number; created_at: string; company: string; person: string; mobile: string; email: string | null; city: string; trades: string[]; cr_number: string | null; note: string | null; lang: 'ar' | 'en'; status: 'new' | 'contacted' | 'verified' | 'declined'; user_id: string | null }

/** The signed-in contractor, as the record the logic looks up as "c1". Its figures are true zeros until there is work to count. */
export function contractorRecord(application: Application | null, profile: Profile): LogicState {
  return {
    id: 'c1', name: both(application?.company || profile.company || profile.full_name), city: application?.city || profile.city, trades: application?.trades || [],
    rating: 0, reviews: 0, done: 0, verified: application?.status === 'verified', since: (application?.created_at || profile.created_at).slice(0, 4),
    onTime: '—', response: '—', bio: both(application?.note || ''), checks: { id: false, cr: Boolean(application?.cr_number), pf: false },
  };
}

let activeProfile: Profile | null = null;
let everyone: Record<string, ReturnType<typeof homeownerRecord>> | null = null;
/** For the admin console: every homeowner, keyed by account id. `null` goes back to "just the signed-in one". */
export function setEveryone(users: Record<string, ReturnType<typeof homeownerRecord>> | null): void { everyone = users; }

/** The data module the logic runs on. The demo gets the design's seed data untouched; the public
    site gets the same copy and option lists with every invented person and project removed, and
    the signed-in person (if any) in the place the logic looks for "the homeowner". */
export function runtimeData(profile: Profile | null = activeProfile): typeof D {
  if (!isLaunch) return D;
  activeProfile = profile;
  // The logic always looks up "h1" (the signed-in homeowner), even on pages that do not show it. In the admin
  // console it stays reachable but uncounted, so the list of people holds real accounts only.
  // A contractor sees projects, never who posted them: every owner is the same nameless homeowner.
  if (profile?.role === 'contractor') {
    const owner = { ...homeownerRecord(null), ar: 'صاحب منزل', en: 'Homeowner' };
    return { ...D, PROJECTS: [], CONTRACTORS: [], CASES: [], USERS: { h1: owner } } as unknown as typeof D;
  }
  const users = everyone ? Object.defineProperty({ ...everyone }, 'h1', { value: homeownerRecord(profile), enumerable: false }) : { h1: homeownerRecord(profile) };
  return { ...D, PROJECTS: [], CONTRACTORS: [], CASES: [], USERS: users } as unknown as typeof D;
}

/** A project row as the logic's `projects` entry. Dates are ISO; the logic prints them in words. */
export function toLogicProject(row: ProjectRow, ownerId = 'h1'): LogicState {
  const day = row.created_at.slice(0, 10);
  return {
    id: row.code, dbId: row.id, ownerDbId: row.owner_id,
    title: both(row.title), desc: both(row.description),
    trade: row.trade, city: row.city, address: row.district || '',
    min: row.budget_min, max: row.budget_max, timing: row.timing,
    status: row.status === 'withdrawn' ? 'open' : row.status,
    ownerId, contractorId: null, amount: 0, funded: Boolean(row.funded_at),
    posted: both(day), bids: [], ms: [], msgs: [], files: [], ledger: [],
  };
}
