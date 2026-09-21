/* Which site is this: the public early-access site, or the private demo?

   One build serves both. The public site is what visitors get; the full product
   design, walkable on invented data, stays available at /demo as a sales tool
   (behind the preview password when one is set). The two never share saved
   state, so signing in to the demo cannot follow anyone onto the public site. */

import config from '../../site.config.json';

export type SiteMode = 'launch' | 'demo';

export interface SiteConfig {
  /** WhatsApp number that receives requests: digits only, country code first. */
  whatsapp: string;
  /** Mailbox offered as the fallback for every request. */
  email: string;
  /** false keeps the public site behind the preview password too, for a final look before opening it. */
  publicLaunch: boolean;
  /** The database behind real accounts and posted projects. The key is the PUBLISHABLE one: it is
      meant to be public, and every permission is enforced by the database's own rules. Never put a
      secret or service key here — this file ships to every visitor. */
  supabase?: { url: string; key: string };
}

export const site: SiteConfig = config;

function detect(): SiteMode {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = window.location.pathname.slice(base.length);
  return /^\/demo(\/|$)/.test(path) ? 'demo' : 'launch';
}

export const siteMode: SiteMode = detect();
export const isLaunch = siteMode === 'launch';

/** The demo keeps the prototype's own key, which the flow and parity tests drive. */
export const STORAGE_KEY = isLaunch ? 'tarmem-public-v1' : 'tarmem-state-v3';

/** True while the number in site.config.json is still the design's dummy one. */
export const whatsappIsPlaceholder = site.whatsapp === '966500000000';
