/* 028 (erasing an account leaves nothing of it open to others) in a private Postgres. See local.mjs. */
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
  create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create schema storage; grant usage on schema storage to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, created_at timestamptz default now());
  alter table storage.objects enable row level security; grant all on storage.objects to anon, authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create schema net; create table public.sent (id bigserial primary key, to_addr text, subject text, html text, at timestamptz default clock_timestamp());
  create table net._http_response (id bigint primary key, status_code int, content_type text, headers jsonb, content text, timed_out boolean default false, error_msg text, created timestamptz default now());
  create sequence net.req_seq;
  create table net.next_answer (status int, content text, timed_out boolean default false, error_msg text);
  create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ declare rid bigint := nextval('net.req_seq'); a record; begin
    if url like '%/message_templates' then insert into public.sent (to_addr, subject, html) values ('meta:' || url, body->>'name', body::text);
    elsif url like 'https://graph.facebook.com/%' then insert into public.sent (to_addr, subject, html) values ('wa:' || (body->>'to'), body->'template'->>'name', body::text);
    else insert into public.sent (to_addr, subject, html) values (body->'to'->>0, body->>'subject', body->>'html'); end if;
    select * into a from net.next_answer limit 1;
    if found and url like 'https://graph.facebook.com/%' then
      insert into net._http_response (id, status_code, content, timed_out, error_msg) values (rid, a.status, a.content, a.timed_out, a.error_msg); delete from net.next_answer;
    else
      insert into net._http_response (id, status_code, content) values (rid, 200, case when url like 'https://graph.facebook.com/%' then '{"messaging_product":"whatsapp","messages":[{"id":"wamid.TEST"}]}' else '{"id":"re-test"}' end);
    end if;
    return rid; end; $$;`);
for (const f of ['001_accounts_projects_forms.sql', '002_admin_console.sql', '003_project_files.sql', '004_contractor_accounts.sql', '005_bids.sql', '006_agreements.sql', '007_settings_reviews_stages.sql', '008_contractor_profiles_wallet.sql', '009_alerts.sql']) await db.exec(readFileSync(repo + f, 'utf8').replace(/create extension if not exists (pgcrypto|pg_net);.*/g, ''));
const ten = readFileSync(repo + '010_customer_emails.sql', 'utf8');
await db.exec(ten); await db.exec(ten);
for (const f of ['011_portfolio.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
await db.exec(readFileSync(repo + '012_whatsapp.sql', 'utf8'));
await db.exec(readFileSync(repo + '013_whatsapp_settings.sql', 'utf8'));
await db.exec(`create function net.http_delete(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ begin insert into public.sent (to_addr, subject, html) values ('delete:' || url, '', ''); return 1; end; $$;`);
await db.exec(`select public.set_alerts('re_TESTKEY_abcdefghijklmnopqrstuvwxyz01', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa'); select public.set_whatsapp('EAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '1377051788817873', 'tarmem_update');`);
for (const f of ['014_whatsapp_templates.sql', '015_secret_whitespace.sql', '016_arabic_templates_reworded.sql', '017_bid_template_as_record.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
await db.exec(readFileSync(repo + '018_delivery_answers.sql', 'utf8'));
const nineteen = readFileSync(repo + '019_messages.sql', 'utf8');
await db.exec(nineteen); await db.exec(nineteen);
await db.exec(`delete from public.email_log; delete from net._http_response;`);

await db.exec(`alter table auth.users add column encrypted_password text, add column raw_user_meta_data jsonb default '{}'::jsonb, add column phone text, add column banned_until timestamptz,
  add column last_sign_in_at timestamptz, add column email_confirmed_at timestamptz, add column created_at timestamptz not null default now();
  alter table public.sent add column raw text;
  create or replace function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ declare rid bigint := nextval('net.req_seq'); begin
    if url like '%/message_templates' then insert into public.sent (to_addr, subject, html, raw) values ('meta:' || url, body->>'name', body::text, body::text);
    elsif url like 'https://graph.facebook.com/%' then insert into public.sent (to_addr, subject, html, raw) values ('wa:' || (body->>'to'), body->'template'->>'name', body::text, body::text);
    else insert into public.sent (to_addr, subject, html, raw) values (body->'to'->>0, body->>'subject', body->>'html', body::text); end if;
    insert into net._http_response (id, status_code, content) values (rid, 200, '{"ok":true}');
    return rid; end; $$;`);
await db.exec(readFileSync(repo + '020_profile_performance.sql', 'utf8'));
await db.exec(readFileSync(repo + '021_admin_detail_phone_reset.sql', 'utf8'));
const twentytwo = readFileSync(repo + '022_erasure_spam_otp.sql', 'utf8');
await db.exec(twentytwo); await db.exec(twentytwo);
const twentythree = readFileSync(repo + '023_test_allowance.sql', 'utf8');
await db.exec(twentythree); await db.exec(twentythree);

const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), ADMIN2 = U('ab'), HO = U('b1'), HO2 = U('b2'), HO3 = U('b3'), CO = U('c1');
await db.exec(`insert into auth.users (id, email, encrypted_password) values ('${ADMIN}','o@t.sa','h0'),('${ADMIN2}','o2@t.sa','h0'),('${HO}','sara@x.com','h1'),('${HO2}','noura@x.com','h2'),('${HO3}','hind@x.com','h3'),('${CO}','co@x.com','h4');
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),('${ADMIN2}','admin','Owner 2','0500000001','riyadh',null,'ar'),
    ('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${HO2}','homeowner','نورة','0522222222','riyadh',null,'ar'),('${HO3}','homeowner','Hind','0533333333','riyadh',null,'en'),
    ('${CO}','contractor','Khalid','0544444444','riyadh','مؤسسة البناء المتقن','ar');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values ('مؤسسة البناء المتقن','Khalid','0544444444','co@x.com','riyadh',array['kitchen'],'${CO}','verified');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const rows = async (sql) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); return (await db.query(sql)).rows; };
const one = async (sql) => (await rows(sql))[0];
const n = async (sql) => (await one(sql)).n;

for (const f of ['024_auth_emails.sql', '025_advisor_fixes.sql', '026_whatsapp_inbox.sql', '027_change_requests.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
const t28 = readFileSync(repo + '028_erasure_cleanup.sql', 'utf8');
await db.exec(t28); await db.exec(t28);
check('028 runs cleanly, twice, on top of 001–027', true);

// Sara and Noura each post a project; Khalid (verified) bids on Noura's
await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('مشروع تجربة','kitchen','خزائن','riyadh',40000,60000,'month')`);
await as('authenticated', HO2);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('دهان','painting','غرفتان','riyadh',5000,9000,'month')`);
const P2 = await one(`select id from public.projects where owner_id = '${HO2}'`);
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P2.id}', 7000, 10, 'ok', '{}')`);
await db.exec('reset role');
const seenByCo = async () => { await as('authenticated', CO); const r = (await db.query(`select count(*)::int n from public.projects where status = 'open' and owner_id = '${HO}'`)).rows[0].n; await db.exec('reset role'); return r; };
check('before: the contractor sees Sara’s open project', (await seenByCo()) === 1);

await as('authenticated', HO); await db.exec(`select public.delete_my_account()`); await db.exec('reset role');
check('Sara erasing her own account withdraws her open project: contractors no longer see it', (await seenByCo()) === 0 && (await one(`select status from public.projects where owner_id = '${HO}'`)).status === 'withdrawn');
check('…and leaves Noura’s project and Khalid’s bid on it alone', (await one(`select status from public.projects where id = '${P2.id}'`)).status === 'open' && (await one(`select status from public.bids where contractor_id = '${CO}'`)).status === 'submitted');

const verifiedSeen = async () => { await as('authenticated', HO2); const r = (await db.query(`select count(*)::int n from public.verified_contractors where user_id = '${CO}'`)).rows[0].n; await db.exec('reset role'); return r; };
check('before: Khalid appears as a verified contractor', (await verifiedSeen()) === 1);
await as('authenticated', ADMIN); await db.exec(`select public.admin_delete_user('${CO}')`); await db.exec('reset role');
check('the team erasing Khalid withdraws his waiting bid', (await one(`select status from public.bids where contractor_id = '${CO}'`)).status === 'withdrawn');
check('…removes his application (company, mobile, email), matched by account or email', (await n(`select count(*)::int n from public.contractor_applications where user_id = '${CO}' or lower(email) = 'co@x.com'`)) === 0);
check('…so he no longer appears as a verified contractor', (await verifiedSeen()) === 0);

console.log(results.join('\n'));
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
