/* Runs supabase/*.sql in a private Postgres inside Node (PGlite) and checks the rules, before the
   owner is asked to run a script on the real database. Nothing leaves this computer.

     cd web && npm i --no-save @electric-sql/pglite && node ../supabase/tests/local.mjs

   Supabase's surroundings are imitated just enough: the anon / authenticated roles, auth.users,
   auth.uid(), and its habit of granting everything on new tables (which the scripts take back). */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { PGlite } = createRequire(new URL('../../web/package.json', import.meta.url))('@electric-sql/pglite');
const repo = new URL('../', import.meta.url).pathname;
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 220) : ''}`);
const fails = async (sql) => { try { await db.exec(sql); return false; } catch (e) { return String(e.message || e); } };

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`);
const one = readFileSync(repo + '001_accounts_projects_forms.sql', 'utf8').replace(/create extension if not exists pgcrypto;/, '');
await db.exec(one);
const two = readFileSync(repo + '002_admin_console.sql', 'utf8');
await db.exec(two);
await db.exec(two); // safe to run twice
check('001 + 002 run cleanly, and 002 runs twice', true);

const ADMIN = '00000000-0000-4000-8000-0000000000aa', USER = '00000000-0000-4000-8000-0000000000bb';
await db.exec(`insert into auth.users (id, email) values ('${ADMIN}', 'owner@tarmem.sa'), ('${USER}', 'sara@example.com');
  insert into public.profiles (id, role, full_name, mobile, city) values ('${ADMIN}', 'admin', 'Owner', '0500000000', 'riyadh'), ('${USER}', 'homeowner', 'Sara', '0511111111', 'jeddah');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };

// anon
await as('anon');
check('visitor: can record a visit', !(await fails(`insert into public.visits (session_id, event, route, path, lang, device, referrer, city) values ('abcdefgh1234', 'view', 'home', '/', 'ar', 'mobile', 'google.com', null)`)));
check('visitor: cannot read visits', Boolean(await fails(`select * from public.visits`)));
check('visitor: cannot choose the time or the user of a visit', Boolean(await fails(`insert into public.visits (session_id, route, path, device, created_at) values ('abcdefgh1234', 'home', '/', 'mobile', now() - interval '1 year')`)) && Boolean(await fails(`insert into public.visits (session_id, route, path, device, user_id) values ('abcdefgh1234', 'home', '/', 'mobile', '${USER}')`)));
check('visitor: a malformed visit is refused', Boolean(await fails(`insert into public.visits (session_id, route, path, device) values ('x', 'home', '/', 'phone')`)));
check('visitor: cannot run the analytics', Boolean(await fails(`select public.admin_analytics('week')`)));
check('visitor: cannot touch the console lists', Boolean(await fails(`select * from public.admin_state`)) && Boolean(await fails(`insert into public.admin_state (key, value) values ('promos', '[]')`)));

// signed-in customer
await as('authenticated', USER);
check('customer: can record a visit, stamped with who they are', !(await fails(`insert into public.visits (session_id, event, route, path, lang, device, city) values ('zzzzzzzz9999', 'project', 'post', '/post', 'ar', 'desktop', 'jeddah')`)));
check('customer: reads no visits', (await db.query(`select count(*)::int as n from public.visits`)).rows[0].n === 0);
const refused = await fails(`select public.admin_analytics('week')`);
check('customer: the analytics refuse them', /admins only/.test(String(refused)), refused);
check('customer: period stats are all zero for them', (await db.query(`select public.visits_period_stats(now() - interval '1 day', now() + interval '1 minute') as s`)).rows[0].s.visitors === 0);
check('customer: cannot read or write the console lists', (await db.query(`select count(*)::int as n from public.admin_state`)).rows[0].n === 0 && Boolean(await fails(`insert into public.admin_state (key, value) values ('promos', '[]')`)));

// more traffic, some of it yesterday and last month (written as the database owner)
await db.exec(`reset role;
  insert into public.visits (session_id, event, route, path, lang, device, referrer, city, created_at) overriding system value
  select 's' || lpad(g::text, 9, '0'), 'view', (array['home','post','pricing','how'])[1 + g % 4], '/', 'ar', (array['mobile','desktop','tablet'])[1 + g % 3],
         (array[null,'google.com','instagram.com'])[1 + g % 3], null, now() - (g || ' hours')::interval
  from generate_series(1, 900) g;`);
await as('authenticated', ADMIN);
for (const range of ['week', 'month', 'year', 'nonsense']) {
  const a = (await db.query(`select public.admin_analytics('${range}') as a`)).rows[0].a;
  const want = range === 'month' ? 30 : range === 'year' ? 12 : 7;
  const sum = a.series.reduce((t, p) => t + p.n, 0);
  check(`admin: analytics for "${range}" — ${want} points, ends today, live + today filled`,
    a.series.length === want && sum > 0 && a.today.visitors >= 1 && a.live.now >= 1 && a.live.feed.length >= 1 && a.top_pages.length >= 1 && a.sources.some((s) => s.k === 'direct') && a.cities[0].k === 'unknown' || (a.cities.length > 0),
    JSON.stringify({ n: a.series.length, last: a.series.at(-1), sum, prev: a.prev_total, today: a.today, live: { now: a.live.now, feed: a.live.feed[0] } }));
}
const a = (await db.query(`select public.admin_analytics('week') as a`)).rows[0].a;
check('admin: the customer\'s posted project shows in today\'s figures and in the live feed', a.today.posts === 1 && a.live.feed.some((f) => f.event === 'project' && f.city === 'jeddah'), JSON.stringify(a.live.feed.slice(0, 3)));
check('admin: can save and change the console lists', !(await fails(`insert into public.admin_state (key, value) values ('promos', '[{"code":"A"}]') on conflict (key) do update set key = excluded.key, value = excluded.value, updated_at = now()`))
  && !(await fails(`insert into public.admin_state (key, value) values ('promos', '[{"code":"B"}]') on conflict (key) do update set key = excluded.key, value = excluded.value, updated_at = now()`))
  && (await db.query(`select value from public.admin_state where key = 'promos'`)).rows[0].value[0].code === 'B');
check('admin: only the two known lists exist', Boolean(await fails(`insert into public.admin_state (key, value) values ('anything', '[]')`)));

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
