/* 009 (alerts the database sends itself) in a private Postgres, with pg_net imitated. See local.mjs. */
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
  alter default privileges in schema public grant all on functions to anon, authenticated;`);
for (const f of ['001_accounts_projects_forms.sql', '002_admin_console.sql', '004_contractor_accounts.sql', '005_bids.sql']) await db.exec(readFileSync(repo + f, 'utf8').replace(/create extension if not exists pgcrypto;/, ''));
// pg_net, imitated: the same function name and named arguments, recording what would have been sent
await db.exec(`create schema net; create table public.sent (url text, headers jsonb, body jsonb);
  create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ begin insert into public.sent values (url, headers, body); return 1; end; $$;`);
const nine = readFileSync(repo + '009_alerts.sql', 'utf8').replace(/create extension if not exists pg_net;.*/, '');
await db.exec(nine); await db.exec(nine);
check('009 runs cleanly, twice', true);
const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), CO = U('c1');
await db.exec(`insert into auth.users (id, email) values ('${ADMIN}','o@t.sa'),('${HO}','ho@x.com'),('${CO}','co@x.com');
  insert into public.profiles (id, role, full_name, mobile, city, company) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null),('${HO}','homeowner','Sara','0511111111','riyadh',null),('${CO}','contractor','Khalid','0533333333','riyadh','Build Co');
  insert into public.contractor_applications (company, person, mobile, city, trades, user_id, status) values ('Build Co','Khalid','0533333333','riyadh',array['kitchen'],'${CO}','verified');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const n = async (sql) => (await db.query(sql)).rows[0].n;
// before it is switched on
await as('anon');
await db.exec(`insert into public.contact_messages (name, mobile, message) values ('نورة','0555123456','هل تغطون جدة؟')`);
await db.exec('reset role');
check('before it is switched on, nothing is sent and nothing breaks', (await n(`select count(*)::int n from public.sent`)) === 0 && (await n(`select count(*)::int n from public.contact_messages`)) === 1);
await as('anon');
check('a visitor cannot read the settings, write them, or read the log', Boolean(await fails(`select * from public.app_secrets`)) && Boolean(await fails(`select public.set_alerts('re_x')`)) && Boolean(await fails(`select * from public.alert_log`)));
await as('authenticated', ADMIN);
check('not even an admin account can read the key or change the settings', Boolean(await fails(`select * from public.app_secrets`)) && Boolean(await fails(`select public.set_alerts('re_x')`)));
// switched on from the SQL editor
await db.exec(`reset role; select public.set_alerts('re_TESTKEY_abcdefghijklmnopqrstuvwxyz01', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa');`);
await as('anon');
await db.exec(`insert into public.contact_messages (name, mobile, message) values ('خالد','0500000000','متى تبدأون؟')`);
let last = (await db.query(`select * from public.sent order by ctid desc limit 1`)).rows[0];
check('a contact message sends an email to the team, with the key in the header and the message in the body',
  last?.url === 'https://api.resend.com/emails' && last.headers.Authorization === 'Bearer re_TESTKEY_abcdefghijklmnopqrstuvwxyz01' && last.body.to[0] === 'support@tarmem.sa' && last.body.subject.includes('خالد') && last.body.html.includes('متى تبدأون؟'),
  JSON.stringify(last?.body || null).slice(0, 180));
await db.exec(`insert into public.contractor_applications (company, person, mobile, city, trades) values ('مؤسسة البناء','خالد','0501112223','riyadh',array['kitchen'])`);
last = (await db.query(`select * from public.sent order by ctid desc limit 1`)).rows[0];
check('a contractor application sends one too, with the mobile to call', last.body.subject.includes('مؤسسة البناء') && last.body.html.includes('0501112223'));
await as('authenticated', HO);
const P = (await db.query(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد مطبخ','kitchen','مطبخ 4×5','riyadh',40000,60000,'month') returning id`)).rows[0].id;
last = (await db.query(`select * from public.sent order by ctid desc limit 1`)).rows[0];
check('a posted project sends one, with its number, city and budget', last.body.subject.includes('P-') && last.body.html.includes('40,000 – 60,000') && last.body.html.includes('/admin'));
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P}', 52000, 30, 'يشمل التوريد', '{}')`);
last = (await db.query(`select * from public.sent order by ctid desc limit 1`)).rows[0];
check('a bid sends one, with its price', last.body.subject.includes('52,000'));
check('the test rows the security tests leave behind are ignored on purpose', (await (async () => { await db.exec(`reset role`); const before = await n(`select count(*)::int n from public.sent`); await db.exec(`insert into public.contact_messages (name, mobile, message) values ('RLS TEST','0500000000','Automated security test')`); return (await n(`select count(*)::int n from public.sent`)) === before; })()));
// a failure must never stop the website
await db.exec(`reset role; create or replace function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language plpgsql as $$ begin raise exception 'the email service is down'; end; $$;`);
await as('anon');
check('if the email service is down, the action still succeeds and the failure is recorded', !(await fails(`insert into public.contact_messages (name, mobile, message) values ('سارة','0509999999','رسالة أثناء العطل')`)) && (await (async () => { await db.exec('reset role'); return (await n(`select count(*)::int n from public.alert_log where status = 'failed'`)) === 1; })()));
await db.exec(`reset role; select public.set_alerts(null, null, null);`);
await as('anon');
await db.exec(`insert into public.contact_messages (name, mobile, message) values ('تجربة','0500000001','بعد الإيقاف')`);
check('switching the alerts off stops them', (await (async () => { await db.exec('reset role'); return (await n(`select count(*)::int n from public.app_secrets`)) === 0; })()));
console.log(results.join('\n')); process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
