/* 018 (the providers' real answers on the log) in a private Postgres, with pg_net's response table and Meta's and Resend's answers imitated. See local.mjs. */
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
const eighteen = readFileSync(repo + '018_delivery_answers.sql', 'utf8');
await db.exec(eighteen); await db.exec(eighteen);
check('018 runs cleanly, twice, on top of 014–017', true);
await db.exec(`delete from public.email_log; delete from net._http_response;`);



const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), CO = U('c1');
await db.exec(`insert into auth.users (id, email) values ('${ADMIN}','o@t.sa'),('${HO}','sara@x.com'),('${CO}','co@x.com');
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${CO}','contractor','Khalid','0533333333','riyadh','مؤسسة البناء المتقن','ar');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values ('مؤسسة البناء المتقن','Khalid','0533333333','co@x.com','riyadh',array['kitchen'],'${CO}','verified');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const rows = async (sql) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); return (await db.query(sql)).rows; };
await db.exec(`set tarmem.now = '2026-09-23 12:00:00+03'`);

await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد مطبخ','kitchen','خزائن','riyadh',40000,60000,'month')`);
let log = await rows(`select recipient, channel, status, request_id, answer from public.email_log where recipient <> 'meta' order by id`);
check('a posted project logs its email and its WhatsApp, each with pg_net’s request id and no answer yet', log.length >= 2 && log.filter((r) => r.status === 'sent').every((r) => r.request_id !== null && r.answer === null), JSON.stringify(log));
check('the admin console can ask for the answers; a customer cannot', await (async () => { await as('authenticated', HO); const e = await fails(`select public.wa_reconcile()`); await as('authenticated', ADMIN); const n = (await db.query(`select public.wa_reconcile() n`)).rows[0].n; await rows('select 1'); return /admins only/.test(e) && n >= 2; })());
log = await rows(`select recipient, channel, status, answer, answer_code from public.email_log where status = 'sent' order by id`);
check('…and every sent row now says the provider accepted it, with the status code', log.length >= 2 && log.every((r) => r.answer === 'accepted' && r.answer_code === 200), JSON.stringify(log));
check('a second run finds nothing left to answer', (await rows(`select public.wa_reconcile() n`))[0].n === 0);

// Meta refuses the next one: the refusal, in Meta's words, lands on the row
await rows(`insert into net.next_answer (status, content) values (400, '{"error":{"message":"(#131047) Re-engagement message","type":"OAuthException","code":131047}}')`);
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ((select id from public.projects order by created_at desc limit 1), 52000, 30, '', '{}')`);
await rows(`select public.wa_reconcile()`);
log = await rows(`select channel, status, answer, answer_code from public.email_log where template = 'new_bid' order by id`);
check('a refusal from Meta is copied onto the WhatsApp row in Meta’s own words; the email of the same event stands', log.some((r) => r.channel === 'whatsapp' && r.status === 'sent' && r.answer_code === 400 && r.answer === '(#131047) Re-engagement message') && log.some((r) => r.channel === 'email' && r.answer === 'accepted'), JSON.stringify(log));
await rows(`insert into net.next_answer (status, content, timed_out, error_msg) values (null, null, true, 'Timeout was reached')`);
await rows(`select public.send_whatsapp('0511111111', 'ar', 'project_posted', array['P-2001', 'x'], 'project/P-2001')`); await rows(`select public.wa_reconcile()`);
check('a request that timed out says so', (await rows(`select answer from public.email_log order by id desc limit 1`))[0].answer === 'timed out');
await rows(`insert into net.next_answer (status, content) values (401, 'not json at all')`);
await rows(`select public.send_whatsapp('0511111111', 'ar', 'project_posted', array['P-2001', 'x'], 'project/P-2001')`); await rows(`select public.wa_reconcile()`);
check('an answer that is not JSON still becomes a plain word', (await rows(`select answer, answer_code from public.email_log order by id desc limit 1`))[0].answer === 'refused');
check('rows older than a day are left alone (pg_net has forgotten them)', await (async () => {
  await rows(`update public.email_log set answer = null, at = now() - interval '2 days' where id = (select max(id) from public.email_log)`);
  return (await rows(`select public.wa_reconcile() n`))[0].n === 0 && (await rows(`select answer from public.email_log order by id desc limit 1`))[0].answer === null; })());
check('customers cannot read the log at all', /permission denied|0/.test(await (async () => { await as('authenticated', HO); try { const r = (await db.query(`select count(*)::int n from public.email_log`)).rows[0].n; await db.exec('reset role'); return String(r); } catch (e) { await db.exec('reset role'); return String(e.message); } })()));

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
