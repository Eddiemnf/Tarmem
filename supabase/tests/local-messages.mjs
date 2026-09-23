/* 019 (messages inside a project) in a private Postgres, with the providers imitated. See local.mjs. */
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
const nineteen = readFileSync(repo + '019_messages.sql', 'utf8');
await db.exec(nineteen); await db.exec(nineteen);
check('019 runs cleanly, twice, on top of 001–018', true);
await db.exec(`delete from public.email_log; delete from net._http_response;`);




const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), HO2 = U('b2'), CO = U('c1'), CO2 = U('c2'), CO3 = U('c3');
await db.exec(`insert into auth.users (id, email) values ('${ADMIN}','o@t.sa'),('${HO}','sara@x.com'),('${HO2}','noura@x.com'),('${CO}','co@x.com'),('${CO2}','co2@x.com'),('${CO3}','co3@x.com');
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${HO2}','homeowner','Noura','0512121212','riyadh',null,'ar'),
    ('${CO}','contractor','Khalid','0533333333','riyadh','مؤسسة البناء المتقن','ar'),('${CO2}','contractor','Fahad','0544444444','jeddah','Other Co','en'),('${CO3}','contractor','Saad','0555555555','riyadh','Third Co','ar');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values ('مؤسسة البناء المتقن','Khalid','0533333333','co@x.com','riyadh',array['kitchen'],'${CO}','verified'),('Other Co','Fahad','0544444444','co2@x.com','jeddah',array['kitchen'],'${CO2}','verified'),('Third Co','Saad','0555555555','co3@x.com','riyadh',array['kitchen'],'${CO3}','verified');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const rows = async (sql) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); return (await db.query(sql)).rows; };
const lastWa = async () => { const r = (await rows(`select * from public.sent where to_addr like 'wa:%' order by id desc limit 1`))[0]; return r ? { ...r, body: JSON.parse(r.html) } : null; };
const lastMail = async () => (await rows(`select * from public.sent where to_addr not like 'wa:%' and to_addr not like 'meta:%' order by id desc limit 1`))[0];
await db.exec(`set tarmem.now = '2026-09-23 12:00:00+03'`);

check('the WhatsApp template for a message was submitted in both languages', (await rows(`select count(*)::int n from public.sent where to_addr like 'meta:%' and subject = 'tarmem_new_message'`))[0].n === 4);
await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد مطبخ','kitchen','خزائن','riyadh',40000,60000,'month')`);
const P = (await rows(`select id, code from public.projects order by created_at desc limit 1`))[0];
check('before any bid, the homeowner cannot write to a contractor', /row-level security|violates/.test(await (async () => { await as('authenticated', HO); const e = await fails(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO}', 'مرحبًا')`); return e; })()));
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 52000, 30, '', '{}')`);
await as('authenticated', CO);
await db.exec(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO}', 'متى يمكن معاينة الموقع؟')`);
let m = await lastMail(), w = await lastWa();
check('a bidder writes to the homeowner: the message is kept, and the homeowner gets an email and a WhatsApp naming the company and a snippet',
  (await rows(`select count(*)::int n from public.project_messages`))[0].n === 1 && m.to_addr === 'sara@x.com' && m.subject.includes('مؤسسة البناء المتقن') && m.html.includes('متى يمكن معاينة الموقع؟')
  && w?.body.template.name === 'tarmem_new_message' && w.body.template.components[0].parameters.map((p) => p.text).join('|') === `${P.code}|مؤسسة البناء المتقن|متى يمكن معاينة الموقع؟`, JSON.stringify([m?.subject, w?.body.template]).slice(0, 300));
await as('authenticated', HO);
await db.exec(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO}', 'غدًا الساعة 5 مساءً')`);
w = await lastWa(); m = await lastMail();
check('the homeowner answers: the contractor is told, by first name only, never the full name', w?.body.template.components[0].parameters[1].text === 'سارة' && !m.html.includes('العتيبي') && m.to_addr === 'co@x.com');
check('the thread is what both parties read, and nobody else', await (async () => {
  await as('authenticated', HO); const a = (await db.query(`select count(*)::int n from public.project_messages`)).rows[0].n;
  await as('authenticated', CO); const b = (await db.query(`select count(*)::int n from public.project_messages`)).rows[0].n;
  await as('authenticated', CO3); const c = (await db.query(`select count(*)::int n from public.project_messages`)).rows[0].n;
  await as('authenticated', HO2); const d = (await db.query(`select count(*)::int n from public.project_messages`)).rows[0].n;
  return a === 2 && b === 2 && c === 0 && d === 0; })());
check('a contractor without a bid cannot write', /row-level security|violates/.test(await (async () => { await as('authenticated', CO3); return fails(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO3}', 'hi')`); })()));
check('…nor can a bidder write into another bidder’s thread', /row-level security|violates/.test(await (async () => { await as('authenticated', CO2); await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 48000, 25, '', '{}')`); return fails(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO}', 'hi')`); })()));
check('…nor pretend to be someone else', /row-level security|violates/.test(await (async () => { await as('authenticated', CO); return fails(`insert into public.project_messages (project_id, contractor_id, from_id, body) values ('${P.id}', '${CO}', '${HO}', 'hi')`); })()));
check('the homeowner has a thread per bidder', await (async () => { await as('authenticated', HO); await db.exec(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO2}', 'Hello Fahad')`); const t = (await db.query(`select count(distinct contractor_id)::int n from public.project_messages where project_id = '${P.id}'`)).rows[0].n; return t === 2 && (await lastWa()).body.template.language.code === 'en'; })());
check('marking read is the reader’s, for the other side’s messages only', await (async () => {
  await as('authenticated', CO); const n = (await db.query(`select public.mark_messages_read('${P.id}', '${CO}') n`)).rows[0].n;
  const left = (await rows(`select count(*)::int n from public.project_messages where contractor_id = '${CO}' and read_at is null`))[0].n;
  await as('authenticated', CO3); const z = (await db.query(`select public.mark_messages_read('${P.id}', '${CO}') n`)).rows[0].n;
  return n === 1 && left === 1 && z === 0; })());
check('"new messages" switched off in settings: no email, no WhatsApp, the message still kept', await (async () => {
  await rows(`update public.profiles set prefs = '{"pMsg": false}' where id = '${HO}'`);
  const before = (await rows(`select count(*)::int n from public.sent`))[0].n;
  await as('authenticated', CO); await db.exec(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO}', 'تمام')`);
  return (await rows(`select count(*)::int n from public.sent`))[0].n === before && (await rows(`select count(*)::int n from public.project_messages`))[0].n === 4; })());
check('an empty message is refused', /violates|check/.test(await (async () => { await as('authenticated', CO); return fails(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO}', '   ')`); })()));
check('a visitor sees nothing', await (async () => { await db.exec('set role anon'); const e = await fails(`select * from public.project_messages`); await db.exec('reset role'); return /permission denied/.test(e); })());

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
