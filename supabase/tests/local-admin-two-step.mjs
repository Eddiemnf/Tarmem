/* 032 (two-step sign-in for the team) in a private Postgres. An admin whose session has only the password (aal1) is an
   ordinary account to every rule and function that asks is_admin(); with the authenticator app's code as well (aal2) the
   console's powers are back. Run from the repo root: node supabase/tests/local-admin-two-step.mjs (see local.mjs). */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../web/package.json', import.meta.url));
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const repo = new URL('../', import.meta.url).pathname;
const db = new PGlite({ extensions: { pgcrypto } });
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 300) : ''}`);

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  -- as Supabase defines it: the signed-in session's token, as the API passed it on
  create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
  create type auth.factor_status as enum ('unverified', 'verified');
  create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null, friendly_name text, factor_type text not null default 'totp',
    status auth.factor_status not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create schema storage; grant usage on schema storage to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, owner_id text, created_at timestamptz default now());
  alter table storage.objects enable row level security; grant all on storage.objects to anon, authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create function storage.stamp_owner() returns trigger language plpgsql as $$ begin new.owner := coalesce(new.owner, auth.uid()); new.owner_id := coalesce(new.owner_id, auth.uid()::text); return new; end $$;
  create trigger stamp_owner before insert on storage.objects for each row execute function storage.stamp_owner();
  create schema net; create table public.sent (id bigserial primary key, to_addr text, subject text, html text, raw text, url text, at timestamptz default clock_timestamp());
  create table net._http_response (id bigint primary key, status_code int, content_type text, headers jsonb, content text, timed_out boolean default false, error_msg text, created timestamptz default now());
  create sequence net.req_seq;
  create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ declare rid bigint := nextval('net.req_seq'); begin
    insert into public.sent (to_addr, subject, html, raw, url) values (
      case when url like 'https://graph.facebook.com/%/messages' then 'wa:' || (body->>'to') when url like 'https://graph.facebook.com/%' then 'meta:' || url else body->'to'->>0 end,
      coalesce(body->'template'->>'name', body->>'subject', body->'text'->>'body'), body->>'html', body::text, url);
    insert into net._http_response (id, status_code, content) values (rid, 200,
      case when url like '%/messages' then '{"messaging_product":"whatsapp","messages":[{"id":"wamid.OUT' || rid || '"}]}' else '{"id":"re-test"}' end);
    return rid; end; $$;
  create function net.http_delete(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ begin insert into public.sent (to_addr, subject, html) values ('delete:' || url, '', ''); return 1; end; $$;`);
const strip = (s) => s.replace(/create extension if not exists (pgcrypto|pg_net);.*/g, '');
for (const f of ['001_accounts_projects_forms.sql', '002_admin_console.sql', '003_project_files.sql', '004_contractor_accounts.sql', '005_bids.sql', '006_agreements.sql', '007_settings_reviews_stages.sql',
  '008_contractor_profiles_wallet.sql', '009_alerts.sql', '010_customer_emails.sql', '011_portfolio.sql', '012_whatsapp.sql', '013_whatsapp_settings.sql']) await db.exec(strip(readFileSync(repo + f, 'utf8')));
await db.exec(`select public.set_alerts('re_TESTKEY_abcdefghijklmnopqrstuvwxyz01', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa'); select public.set_whatsapp('EAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '1377051788817873', 'tarmem_update');`);
for (const f of ['014_whatsapp_templates.sql', '015_secret_whitespace.sql', '016_arabic_templates_reworded.sql', '017_bid_template_as_record.sql', '018_delivery_answers.sql', '019_messages.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
await db.exec(`alter table auth.users add column encrypted_password text, add column raw_user_meta_data jsonb default '{}'::jsonb, add column phone text, add column banned_until timestamptz,
  add column last_sign_in_at timestamptz, add column email_confirmed_at timestamptz, add column created_at timestamptz not null default now(),
  add column confirmation_sent_at timestamptz;`);
for (const f of ['020_profile_performance.sql', '021_admin_detail_phone_reset.sql', '022_erasure_spam_otp.sql', '023_test_allowance.sql', '024_auth_emails.sql', '025_advisor_fixes.sql',
  '026_whatsapp_inbox.sql', '027_change_requests.sql', '028_erasure_cleanup.sql', '029_launch_hardening.sql', '030_ops_lifecycle.sql', '031_verify_before_dealing.sql']) await db.exec(readFileSync(repo + f, 'utf8'));

const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), CO = U('c1'), PROJECT = '10000000-0000-4000-8000-000000000001';
await db.exec(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at) values
    ('${ADMIN}','o@t.sa','h0',now(),now()),('${HO}','sara@x.com','h1',now(),now()),('${CO}','co@x.com','h5',now(),now());
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),
    ('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${CO}','contractor','Khalid','0544444444','riyadh','مؤسسة البناء المتقن','ar');
  update public.profiles set email_verified_at = now(), email_verified_email = (select email from auth.users u where u.id = profiles.id);
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values
    ('مؤسسة البناء المتقن','Khalid','0544444444','co@x.com','riyadh',array['kitchen'],'${CO}','new');
  insert into public.contact_messages (name, mobile, message) values ('زائرة', '0555000222', 'هل تغطون الخبر؟');
  select set_config('request.jwt.claim.sub', '${HO}', false); -- a project is posted by its homeowner (the database stamps the owner)
  insert into public.projects (id, title, trade, description, city, budget_min, budget_max, timing) values
    ('${PROJECT}','تجديد المطبخ','kitchen','تجديد المطبخ بالكامل مع الخزائن.','riyadh',10000,30000,'month');
  select set_config('request.jwt.claim.sub', '', false);
  insert into storage.objects (bucket_id, name, owner) values ('project-files', '${HO}/${PROJECT}/k0-photo.png', '${HO}');`);

const thirtyTwo = readFileSync(repo + '032_admin_two_step.sql', 'utf8');
const first = await db.exec(thirtyTwo);
const second = await db.exec(thirtyTwo);
const tally = (r) => r[r.length - 1].rows[0];
const num = (v) => Number(v);
check('032 runs cleanly, twice, on top of 001–031', first.length > 0 && String(tally(second).result).includes('ready'));
check('…and says there is one admin, who has not set up the app yet', num(tally(second).admins) === 1 && num(tally(second).admins_with_the_app) === 0, JSON.stringify(tally(second), (k, v) => typeof v === 'bigint' ? Number(v) : v));
await db.exec(`insert into auth.mfa_factors (user_id, friendly_name, status) values ('${ADMIN}', 'Tarmem admin', 'verified'), ('${HO}', 'phone', 'unverified')`);
const third = tally(await db.exec(thirtyTwo));
check('once the admin\'s app is set up, the tally counts it (an unfinished set-up elsewhere does not)', num(third.admins_with_the_app) === 1, JSON.stringify(third, (k, v) => typeof v === 'bigint' ? Number(v) : v));

/** A request as the API makes it: the role, the account, and the session's token (aal1 = password only, aal2 = both steps). */
const as = async (role, sub, aal) => {
  const claims = sub ? JSON.stringify({ sub, role, aal: aal || 'aal1', amr: [{ method: aal === 'aal2' ? 'totp' : 'password' }] }) : '';
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); select set_config('request.jwt.claims', '${claims}', false); set role ${role};`);
};
const tryAs = async (role, sub, aal, sql, params) => {
  await as(role, sub, aal);
  try { const r = await db.query(sql, params); return { ok: true, rows: r.rows, affected: r.affectedRows }; } catch (e) { return { ok: false, error: String(e.message || e) }; } finally { await db.exec('reset role'); }
};
const isAdmin = async (role, sub, aal) => (await tryAs(role, sub, aal, 'select public.is_admin() as yes')).rows?.[0]?.yes;

check('the admin with both steps is an admin', (await isAdmin('authenticated', ADMIN, 'aal2')) === true);
check('the admin with the password alone is not', (await isAdmin('authenticated', ADMIN, 'aal1')) === false);
check('nor is a request that carries the admin\'s id but no session token', await (async () => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${ADMIN}', false); select set_config('request.jwt.claims', '', false); set role authenticated;`);
  try { return (await db.query('select public.is_admin() as yes')).rows[0].yes === false; } finally { await db.exec('reset role'); }
})());
check('a homeowner with both steps is still not an admin', (await isAdmin('authenticated', HO, 'aal2')) === false);
check('a visitor is not, and may still ask (row rules ask for everyone)', (await isAdmin('anon', null)) === false);

const messagesAt = async (aal) => (await tryAs('authenticated', ADMIN, aal, 'select count(*)::int n from public.contact_messages')).rows?.[0]?.n;
check('contact messages: none for the password alone, all with both steps', (await messagesAt('aal1')) === 0 && (await messagesAt('aal2')) === 1);
const profilesAt = async (aal) => (await tryAs('authenticated', ADMIN, aal, 'select count(*)::int n from public.profiles')).rows?.[0]?.n;
check('profiles: only their own for the password alone, everyone\'s with both steps', (await profilesAt('aal1')) === 1 && (await profilesAt('aal2')) === 3);
const detail1 = await tryAs('authenticated', ADMIN, 'aal1', 'select public.admin_user_detail($1::uuid) d', [HO]);
const detail2 = await tryAs('authenticated', ADMIN, 'aal2', 'select public.admin_user_detail($1::uuid) d', [HO]);
check('the console\'s person detail: "admins only" for the password alone, the full record with both steps',
  !detail1.ok && /admins only/.test(detail1.error) && detail2.ok && detail2.rows[0].d?.email === 'sara@x.com', `${detail1.error || 'ran'} / ${detail2.error || 'ran'}`);
const listed1 = await tryAs('authenticated', ADMIN, 'aal1', `insert into public.admin_state (key, value) values ('promos', '[]'::jsonb)`);
const listed2 = await tryAs('authenticated', ADMIN, 'aal2', `insert into public.admin_state (key, value) values ('promos', '[]'::jsonb)`);
check('the console\'s saved lists: refused for the password alone, saved with both steps', !listed1.ok && listed2.ok, `${listed1.error || 'saved'} / ${listed2.error || 'saved'}`);
const decided1 = await tryAs('authenticated', ADMIN, 'aal1', `update public.contractor_applications set status = 'verified' where user_id = $1::uuid`, [CO]);
const statusNow = async () => (await db.query(`select status from public.contractor_applications where user_id = $1::uuid`, [CO])).rows[0].status;
const afterAal1 = await statusNow();
const decided2 = await tryAs('authenticated', ADMIN, 'aal2', `update public.contractor_applications set status = 'verified' where user_id = $1::uuid`, [CO]);
check('verifying a contractor: nothing changes for the password alone; it is done with both steps', decided1.ok && afterAal1 === 'new' && decided2.ok && (await statusNow()) === 'verified', `${afterAal1} → ${await statusNow()}`);
const filesAt = async (aal) => (await tryAs('authenticated', ADMIN, aal, `select count(*)::int n from storage.objects where bucket_id = 'project-files'`)).rows?.[0]?.n;
check('a homeowner\'s project photos: hidden for the password alone, shown with both steps', (await filesAt('aal1')) === 0 && (await filesAt('aal2')) === 1);
const own = await tryAs('authenticated', ADMIN, 'aal1', `update public.profiles set full_name = 'Owner Two' where id = $1::uuid returning full_name`, [ADMIN]);
check('with the password alone an admin still reads and edits their own profile (the settings page)', own.ok && own.rows[0]?.full_name === 'Owner Two', own.error);

const fn = (await db.query(`select p.prosecdef, p.proconfig, has_function_privilege('anon', p.oid, 'execute') anon_ok, has_function_privilege('authenticated', p.oid, 'execute') auth_ok
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'is_admin'`)).rows;
check('is_admin() is still one function, security definer with a fixed search_path, callable by visitors and accounts',
  fn.length === 1 && fn[0].prosecdef === true && (fn[0].proconfig || []).includes('search_path=public') && fn[0].anon_ok && fn[0].auth_ok, JSON.stringify(fn));

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
