/* 033 (example projects for the early-access launch) in a private Postgres, with the providers imitated: the 30 projects reach
   verified contractors (who may bid and message on them) and nobody else, nothing is emailed or WhatsApped on the way, the
   site cannot set the mark, and preview_clear() removes it all without writing to anyone.
   Run from the repo root: node supabase/tests/local-preview-projects.mjs (see local.mjs). */
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
await db.exec(readFileSync(repo + '032_admin_two_step.sql', 'utf8'));
// the columns Supabase's auth.users has and 033 writes
await db.exec(`alter table auth.users add column instance_id uuid, add column aud text, add column role text, add column raw_app_meta_data jsonb,
  add column updated_at timestamptz, add column confirmation_token text, add column recovery_token text, add column email_change_token_new text, add column email_change text;`);
await db.exec(`select set_config('tarmem.now', '2026-09-30 12:00:00+03', false)`); // WhatsApp's quiet hours: noon in Riyadh

const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), CO = U('c1'), CO2 = U('c2'), REAL = '10000000-0000-4000-8000-000000000001';
await db.exec(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at) values
    ('${ADMIN}','o@t.sa','h0',now(),now()),('${HO}','sara@x.com','h1',now(),now()),('${CO}','co@x.com','h5',now(),now()),('${CO2}','new@x.com','h6',now(),now());
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),
    ('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${CO}','contractor','Khalid','0544444444','riyadh','مؤسسة البناء المتقن','ar'),
    ('${CO2}','contractor','Fahad','0544444445','riyadh','مؤسسة جديدة','ar');
  update public.profiles set email_verified_at = now(), email_verified_email = (select email from auth.users u where u.id = profiles.id);
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values
    ('مؤسسة البناء المتقن','Khalid','0544444444','co@x.com','riyadh',array['kitchen'],'${CO}','verified'),
    ('مؤسسة جديدة','Fahad','0544444445','new@x.com','riyadh',array['painting'],'${CO2}','new');
  select set_config('request.jwt.claim.sub', '${HO}', false); -- a real homeowner's real project
  insert into public.projects (id, title, trade, description, city, budget_min, budget_max, timing) values
    ('${REAL}','تجديد المطبخ','kitchen','تجديد المطبخ بالكامل مع الخزائن.','riyadh',10000,30000,'month');
  select set_config('request.jwt.claim.sub', '', false);`);

const n = (v) => Number(v);
const one = async (sql, params) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);`); return (await db.query(sql, params)).rows[0]; };
const as = async (role, sub, aal = 'aal1') => {
  const claims = sub ? JSON.stringify({ sub, role, aal }) : '';
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); select set_config('request.jwt.claims', '${claims}', false); set role ${role};`);
};
const tryAs = async (role, sub, sql, params, aal) => {
  await as(role, sub, aal);
  try { const r = await db.query(sql, params); return { ok: true, rows: r.rows }; } catch (e) { return { ok: false, error: String(e.message || e) }; } finally { await db.exec('reset role'); }
};
const sentCount = async () => n((await one('select count(*) c from public.sent')).c);
const alertCount = async () => n((await one('select count(*) c from public.alert_log')).c);

const sentBefore = await sentCount(), alertsBefore = await alertCount();
const file = readFileSync(repo + '033_preview_projects.sql', 'utf8');
const first = await db.exec(file);
const tallyOf = (r) => r[r.length - 1].rows[0];
const t1 = tallyOf(first);
check('033 runs cleanly: 14 example homeowners and 30 example projects, all open to contractors',
  n(t1.example_homeowners) === 14 && n(t1.example_projects) === 30 && n(t1.open_to_contractors) === 30, JSON.stringify(t1, (k, v) => typeof v === 'bigint' ? Number(v) : v));
check('…and nothing was sent on the way: no email, no WhatsApp, no team alert', (await sentCount()) === sentBefore && (await alertCount()) === alertsBefore,
  `sent ${sentBefore} → ${await sentCount()}, alerts ${alertsBefore} → ${await alertCount()}`);
const t2 = tallyOf(await db.exec(file));
check('run again, it adds nothing', n(t2.example_homeowners) === 14 && n(t2.example_projects) === 30);
check('visitors may still call exactly the same four functions, and every function keeps a fixed search_path',
  t2.visitors_may_call === 'confirm_email_verification, is_admin, mobile_taken, wa_webhook' && n(t2.no_search_path) === 0, `${t2.visitors_may_call} / ${t2.no_search_path}`);
check('the alert and "project posted" triggers are switched back on', n((await one(`select count(*) c from pg_trigger where tgrelid = 'public.projects'::regclass and tgname in ('alert_new_project','notify_project_posted') and tgenabled = 'O'`)).c) === 2);

const people = await one(`select count(*) filter (where u.email like '%@tarmem-preview') mails, count(*) filter (where u.banned_until > now() + interval '99 years') banned,
  count(*) filter (where p.mobile ~ '^\\+1 202 555 01[0-9]{2}$') mobiles, count(*) filter (where p.prefs ->> 'channel' = 'email' and p.prefs ->> 'pBids' = 'false') quiet,
  count(*) filter (where public.email_proven(p.id)) proven, count(distinct public.mobile_key(p.mobile)) distinct_mobiles
  from public.profiles p join auth.users u on u.id = p.id where p.preview`);
check('the invented homeowners cannot be reached or signed in to: dotless email, fictional +1 202 555 numbers (all different), notifications off, banned',
  n(people.mails) === 14 && n(people.banned) === 14 && n(people.mobiles) === 14 && n(people.quiet) === 14 && n(people.distinct_mobiles) === 14 && n(people.proven) === 14, JSON.stringify(people, (k, v) => typeof v === 'bigint' ? Number(v) : v));
const dates = await one(`select extract(day from now() - min(created_at)) oldest, extract(epoch from now() - max(created_at)) / 3600 newest_h, count(distinct code) codes,
  count(*) filter (where code like 'P-%') coded, count(distinct owner_id) owners, max(c) most from (select *, count(*) over (partition by owner_id) c from public.projects where preview) x`);
check('posted over the last three weeks, each with its own P- number, by 14 homeowners with at most 3 each',
  n(dates.oldest) >= 18 && n(dates.newest_h) < 24 && n(dates.codes) === 30 && n(dates.coded) === 30 && n(dates.owners) === 14 && n(dates.most) <= 3, JSON.stringify(dates, (k, v) => typeof v === 'bigint' ? Number(v) : v));

const seen = async (sub) => (await tryAs('authenticated', sub, `select count(*) filter (where preview) examples, count(*) filter (where not preview) real from public.projects where status = 'open'`)).rows?.[0];
const coSees = await seen(CO), co2Sees = await seen(CO2), hoSees = await seen(HO);
check('a verified contractor sees the 30 examples beside the real project, and can read the mark', n(coSees.examples) === 30 && n(coSees.real) === 1, JSON.stringify(coSees, (k, v) => typeof v === 'bigint' ? Number(v) : v));
check('a contractor still being verified sees none of them', n(co2Sees.examples) === 0 && n(co2Sees.real) === 0);
check('a homeowner sees only their own project', n(hoSees.examples) === 0 && n(hoSees.real) === 1);
const anon = await tryAs('anon', null, 'select count(*) from public.projects');
check('a visitor reads no projects at all', !anon.ok && /permission denied/.test(anon.error), anon.error);

const markProfile = await tryAs('authenticated', HO, `update public.profiles set preview = true where id = $1::uuid`, [HO]);
const markProject = await tryAs('authenticated', HO, `insert into public.projects (title, trade, description, city, budget_min, budget_max, timing, preview) values ('x x x','kitchen','وصف المشروع هنا','riyadh',100,200,'month',true)`);
check('the site cannot set the mark on a profile or a project', !markProfile.ok && /permission denied/.test(markProfile.error) && !markProject.ok && /permission denied/.test(markProject.error), `${markProfile.error} / ${markProject.error}`);

const target = await one(`select id, owner_id from public.projects where preview order by created_at desc limit 1`);
const sentBeforeBid = await sentCount();
const bid = await tryAs('authenticated', CO, `insert into public.bids (project_id, price, days, note, details) values ($1::uuid, 25000, 20, 'يشمل التوريد والتركيب', '{}'::jsonb) returning id`, [target.id]);
const msg = await tryAs('authenticated', CO, `insert into public.project_messages (project_id, contractor_id, body) values ($1::uuid, $2::uuid, 'متى يمكن معاينة الموقع؟') returning id`, [target.id, CO]);
const toOwner = n((await one(`select count(*) c from public.sent where id > (select coalesce(max(id), 0) - 50 from public.sent) and (to_addr like '%tarmem-preview%' or to_addr like 'wa:1202555%' or to_addr like 'wa:+1%')`)).c);
check('a verified contractor bids on an example project and messages about it', bid.ok && msg.ok, `${bid.error || 'bid ok'} / ${msg.error || 'message ok'}`);
check('…and nothing goes to the invented homeowner (email or WhatsApp)', toOwner === 0 && n((await one(`select count(*) c from public.sent where to_addr like '%tarmem-preview%'`)).c) === 0,
  `sent since the bid: ${(await sentCount()) - sentBeforeBid}`);
const theirs = await tryAs('authenticated', CO2, `insert into public.bids (project_id, price, days, note, details) values ($1::uuid, 25000, 20, 'x', '{}'::jsonb)`, [target.id]);
check('a contractor still being verified cannot bid on one', !theirs.ok);

// an example is never withdrawn — the console's "remove", or erasing its invented homeowner, would email everyone who bid
const sentBeforeWithdraw = await sentCount();
const removed = await tryAs('authenticated', ADMIN, `select public.admin_set_project_status($1::uuid, 'withdrawn', null)`, [target.id], 'aal2');
const erased = await tryAs('authenticated', ADMIN, `select public.admin_delete_user($1::uuid)`, [target.owner_id], 'aal2');
check('the console cannot withdraw an example (nor erase its homeowner, which would withdraw it): refused, pointing to preview_clear',
  !removed.ok && /example project P-\d+: remove it with select public.preview_clear/.test(removed.error) && !erased.ok, `${removed.error} / ${erased.error}`);
check('…so the contractor who bid hears nothing', (await sentCount()) === sentBeforeWithdraw && n((await one(`select count(*) c from public.projects where id = $1::uuid and status = 'open'`, [target.id])).c) === 1);

const runClear = await tryAs('authenticated', ADMIN, 'select public.preview_clear()', [], 'aal2');
const fnRights = await one(`select has_function_privilege('service_role', 'public.preview_clear(text)', 'execute') svc, has_function_privilege('authenticated', 'public.preview_clear(text)', 'execute') auth`);
check('the removal is for the SQL Editor only: no account (nor the service key) may call it', !runClear.ok && /permission denied/.test(runClear.error) && !fnRights.svc && !fnRights.auth, runClear.error);

await db.exec(`update public.profiles set preview = true where id = '${HO}'`);
const guarded = await tryAs('postgres', null, 'select public.preview_clear()');
await db.exec(`reset role; update public.profiles set preview = false where id = '${HO}'`);
check('if a real account ever carried the mark, the removal refuses and removes nothing', !guarded.ok && /real account/.test(guarded.error) && n((await one('select count(*) c from public.projects where preview')).c) === 30, guarded.error);

const other = await one(`select code from public.projects where preview and id <> $1::uuid order by code limit 1`, [target.id]);
const sentBeforeOne = await sentCount();
const single = (await one('select public.preview_clear($1) r', [other.code])).r;
check('preview_clear(\'P-…\') removes one example project and keeps the rest and every account', single.projects_removed === 1 && single.accounts_removed === 0
  && n((await one('select count(*) c from public.projects where preview')).c) === 29 && n((await one('select count(*) c from public.profiles where preview')).c) === 14 && (await sentCount()) === sentBeforeOne, JSON.stringify(single));

const sentBeforeClear = await sentCount();
const cleared = (await one('select public.preview_clear() r')).r;
const after = await one(`select (select count(*) from public.projects where preview) projects, (select count(*) from public.profiles where preview) people,
  (select count(*) from auth.users where email like '%@tarmem-preview') logins, (select count(*) from public.bids where contractor_id = '${CO}') co_bids,
  (select count(*) from public.project_messages where contractor_id = '${CO}') co_msgs, (select count(*) from public.projects where id = '${REAL}') real_project,
  (select count(*) from public.profiles where id in ('${HO}','${CO}','${CO2}','${ADMIN}')) real_people`);
check('preview_clear() removes the other 29 projects and the 14 accounts, with the bids and messages on them', cleared.projects_removed === 29 && cleared.accounts_removed === 14
  && n(after.projects) === 0 && n(after.people) === 0 && n(after.logins) === 0 && n(after.co_bids) === 0 && n(after.co_msgs) === 0, JSON.stringify({ cleared, after }, (k, v) => typeof v === 'bigint' ? Number(v) : v));
check('…keeps every real project and account', n(after.real_project) === 1 && n(after.real_people) === 4);
check('…and writes to nobody (a deletion, not a withdrawal)', (await sentCount()) === sentBeforeClear, `sent ${sentBeforeClear} → ${await sentCount()}`);
const again = (await one('select public.preview_clear() r')).r;
check('run again, it finds nothing to remove', again.projects_removed === 0 && again.accounts_removed === 0);
const t3 = tallyOf(await db.exec(file));
check('and running 033 again after the removal does not bring the examples back', n(t3.example_projects) === 0 && n(t3.example_homeowners) === 0);

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
