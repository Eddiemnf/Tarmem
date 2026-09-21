/* The connection to Tarmem's database (Supabase).

   Only the public site uses it; the demo at /demo stays a self-contained prototype.
   The key in site.config.json is the publishable one. It identifies the project, nothing
   more: what a visitor may read or write is decided by the row-level rules in
   ../../../supabase/*.sql, which the database enforces whatever the browser asks for. */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isLaunch, site } from '../launch/mode';

const config = site.supabase;

if (config && /secret|service_role/i.test(config.key)) {
  throw new Error('site.config.json holds a secret key. Only the publishable key may ship with the site.');
}

export const supabase: SupabaseClient | null = isLaunch && config?.url && config.key
  ? createClient(config.url, config.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tarmem-auth' } })
  : null;

/** True when the public site runs on real accounts and a real database. */
export const platformOn = supabase !== null;
