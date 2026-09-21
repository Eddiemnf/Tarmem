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
}

const both = (text: string) => ({ en: text, ar: text });

/** The homeowner record the logic looks up as `USERS.h1`. */
function homeownerRecord(profile: Profile | null) {
  const name = profile?.full_name || '';
  const year = (profile?.created_at || new Date().toISOString()).slice(0, 4);
  return {
    ...both(name), city: profile?.city || 'riyadh', nafath: false,
    joined: { en: `Joined ${year}`, ar: `انضم في ${year}` },
    rating: 0, reviews: 0, done: 0, onTimeApproval: '—', avgApproval: both('—'), disputes: 0,
    about: both(''), revs: [],
  };
}

let activeProfile: Profile | null = null;

/** The data module the logic runs on. The demo gets the design's seed data untouched; the public
    site gets the same copy and option lists with every invented person and project removed, and
    the signed-in person (if any) in the place the logic looks for "the homeowner". */
export function runtimeData(profile: Profile | null = activeProfile): typeof D {
  if (!isLaunch) return D;
  activeProfile = profile;
  return { ...D, PROJECTS: [], CONTRACTORS: [], CASES: [], USERS: { h1: homeownerRecord(profile) } } as unknown as typeof D;
}

/** A project row as the logic's `projects` entry. Dates are ISO; the logic prints them in words. */
export function toLogicProject(row: ProjectRow): LogicState {
  const day = row.created_at.slice(0, 10);
  return {
    id: row.code, dbId: row.id,
    title: both(row.title), desc: both(row.description),
    trade: row.trade, city: row.city, address: row.district || '',
    min: row.budget_min, max: row.budget_max, timing: row.timing,
    status: row.status === 'withdrawn' ? 'open' : row.status,
    ownerId: 'h1', contractorId: null, amount: 0, funded: false,
    posted: both(day), bids: [], ms: [], msgs: [], files: [], ledger: [],
  };
}
