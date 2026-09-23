/* 020 (a contractor's measured profile performance) in a private Postgres. See local.mjs. */
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
check('010 runs cleanly, twice', true);
for (const f of ['011_portfolio.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
await db.exec(readFileSync(repo + '012_whatsapp.sql', 'utf8'));
await db.exec(readFileSync(repo + '013_whatsapp_settings.sql', 'utf8'));
await db.exec(`create function net.http_delete(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ begin insert into public.sent (to_addr, subject, html) values ('delete:' || url, '', ''); return 1; end; $$;`);
await db.exec(`select public.set_alerts('re_TESTKEY_abcdefghijklmnopqrstuvwxyz01', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa'); select public.set_whatsapp('EAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '1377051788817873', 'tarmem_update');`);
for (const f of ['014_whatsapp_templates.sql', '015_secret_whitespace.sql', '016_arabic_templates_reworded.sql', '017_bid_template_as_record.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
await db.exec(readFileSync(repo + '018_delivery_answers.sql', 'utf8'));
await db.exec(readFileSync(repo + '019_messages.sql', 'utf8'));
const twenty = readFileSync(repo + '020_profile_performance.sql', 'utf8');
await db.exec(twenty); await db.exec(twenty);
check('020 runs cleanly, twice, on top of 001–019', true);
await db.exec(`delete from public.email_log; delete from net._http_response;`);





const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const HO = U('b1'), CO = U('c1'), CO2 = '11111111-0000-4000-8000-0000000000c2';   // a different first eight characters: real ids differ there
await db.exec(`insert into auth.users (id, email) values ('${HO}','sara@x.com'),('${CO}','co@x.com'),('${CO2}','co2@x.com');
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${CO}','contractor','Khalid','0533333333','riyadh','مؤسسة البناء المتقن','ar'),('${CO2}','contractor','Fahad','0544444444','jeddah','Other Co','ar');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values ('مؤسسة البناء المتقن','Khalid','0533333333','co@x.com','riyadh',array['kitchen'],'${CO}','verified'),('Other Co','Fahad','0544444444','co2@x.com','jeddah',array['kitchen'],'${CO2}','verified');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const rows = async (sql) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); return (await db.query(sql)).rows; };
const perf = async (uid) => { await as('authenticated', uid); const r = (await db.query(`select public.my_performance() p`)).rows[0].p; await rows('select 1'); return r; };
const firm = '/firm/co-' + CO.slice(0, 8);
check('a fresh contractor: no views, no bids', await (async () => { const p = await perf(CO); return p.views === 0 && p.bids === 0 && p.won === 0; })(), JSON.stringify(await perf(CO)));
await rows(`insert into public.visits (session_id, event, route, path, lang, device, user_id, created_at) values
  ('aaaaaaaa1', 'view', 'contractor', '${firm}', 'ar', 'mobile', null, now()),
  ('aaaaaaaa1', 'view', 'contractor', '${firm}', 'ar', 'mobile', null, now()),
  ('bbbbbbbb2', 'view', 'contractor', '${firm}', 'ar', 'desktop', '${HO}', now()),
  ('cccccccc3', 'view', 'contractor', '${firm}', 'ar', 'desktop', '${CO}', now()),
  ('dddddddd4', 'view', 'contractor', '${firm}', 'ar', 'desktop', null, now() - interval '40 days'),
  ('eeeeeeee5', 'view', 'contractor', '/firm/co-${CO2.slice(0, 8)}', 'ar', 'desktop', null, now())`);
check('views count other people’s visits to the contractor’s own page in the last 30 days, once per visitor', (await perf(CO)).views === 2, JSON.stringify(await perf(CO)));
await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('مطبخ','kitchen','خزائن','riyadh',40000,60000,'month'),('حمام','kitchen','بلاط','riyadh',10000,20000,'month')`);
const [P1, P2] = await rows(`select id from public.projects order by created_at`);
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P1.id}', 50000, 30, '', '{}'), ('${P2.id}', 15000, 10, '', '{}')`);
await as('authenticated', HO);
const bid = (await db.query(`select id from public.bids where project_id = '${P1.id}' and contractor_id = '${CO}'`)).rows[0];
await db.exec(`select public.sign_agreement_homeowner('${bid.id}')`);
check('the win rate comes from real bids: two made, one chosen', JSON.stringify((({ bids, won }) => ({ bids, won }))(await perf(CO))) === JSON.stringify({ bids: 2, won: 1 }), JSON.stringify(await perf(CO)));
check('another contractor sees only their own figures', (await perf(CO2)).views === 1 && (await perf(CO2)).bids === 0);
check('a visitor gets nothing', await (async () => { await db.exec('set role anon'); const e = await fails(`select public.my_performance()`); await db.exec('reset role'); return /permission denied/.test(e); })());

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
