/* 013 (the WhatsApp settings card: the switch, quiet hours, the test button) in a private Postgres, with Meta's endpoint imitated. See local.mjs. */
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
  create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ begin
    if url like 'https://graph.facebook.com/%' then insert into public.sent (to_addr, subject, html) values ('wa:' || (body->>'to'), body->'template'->'components'->0->'parameters'->0->>'text', body::text);
    else insert into public.sent (to_addr, subject, html) values (body->'to'->>0, body->>'subject', body->>'html'); end if; return 1; end; $$;`);
for (const f of ['001_accounts_projects_forms.sql', '002_admin_console.sql', '003_project_files.sql', '004_contractor_accounts.sql', '005_bids.sql', '006_agreements.sql', '007_settings_reviews_stages.sql', '008_contractor_profiles_wallet.sql', '009_alerts.sql']) await db.exec(readFileSync(repo + f, 'utf8').replace(/create extension if not exists (pgcrypto|pg_net);.*/g, ''));
const ten = readFileSync(repo + '010_customer_emails.sql', 'utf8');
await db.exec(ten); await db.exec(ten);
check('010 runs cleanly, twice', true);
for (const f of ['011_portfolio.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
await db.exec(readFileSync(repo + '012_whatsapp.sql', 'utf8'));
const thirteen = readFileSync(repo + '013_whatsapp_settings.sql', 'utf8');
await db.exec(thirteen); await db.exec(thirteen);
check('013 runs cleanly, twice (pg_cron is absent here, which it tolerates)', true);

await db.exec(`select public.set_alerts('re_TESTKEY_abcdefghijklmnopqrstuvwxyz01', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa');`);
const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), HOEN = U('b2'), CO = U('c1'), CO2 = U('c2');
await db.exec(`insert into auth.users (id, email) values ('${ADMIN}','o@t.sa'),('${HO}','sara@x.com'),('${HOEN}','john@x.com'),('${CO}','co@x.com'),('${CO2}','co2@x.com');
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${HOEN}','homeowner','John Smith','+966 52 222 2222','riyadh',null,'en'),
    ('${CO}','contractor','Khalid','0533333333','riyadh','مؤسسة البناء المتقن','ar'),('${CO2}','contractor','Fahad','0544444444','jeddah','Other Co','ar');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values ('مؤسسة البناء المتقن','Khalid','0533333333','co@x.com','riyadh',array['kitchen'],'${CO}','verified'),('Other Co','Fahad','0544444444','co2@x.com','jeddah',array['kitchen'],'${CO2}','verified');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const flag = async () => (await db.query(`select enabled from public.platform_flags where key = 'whatsapp_live'`)).rows[0].enabled;
const waSent = async () => (await db.query(`select count(*)::int n from public.sent where to_addr like 'wa:%'`)).rows[0].n;
const lastLog = async () => (await db.query(`select * from public.email_log where channel = 'whatsapp' order by id desc limit 1`)).rows[0];
const queued = async () => (await db.query(`select count(*)::int n from public.wa_queue`)).rows[0].n;
const day = `set tarmem.now = '2026-09-22 12:00:00+03'`, night = `set tarmem.now = '2026-09-22 23:30:00+03'`, morning = `set tarmem.now = '2026-09-23 08:05:00+03'`;

check('the website’s switch is off until set_whatsapp', (await flag()) === false);
await db.exec(`select public.set_whatsapp('EAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '1377051788817873', 'tarmem_update');`);
check('…on after it', (await flag()) === true);
await db.exec(`select public.set_whatsapp(null, null, null);`);
check('…and off again when switched off', (await flag()) === false && (await db.query(`select count(*)::int n from public.app_secrets where key like 'wa_%'`)).rows[0].n === 0);
await db.exec(`select public.set_whatsapp('EAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '1377051788817873', 'tarmem_update');`);
check('quiet hours are 11pm–8am Riyadh: 23:30 waits until 08:00, 03:00 too, noon does not',
  (await db.query(`select public.wa_quiet_until('2026-09-22 23:30+03') a, public.wa_quiet_until('2026-09-23 03:00+03') b, public.wa_quiet_until('2026-09-22 12:00+03') c, public.wa_quiet_until('2026-09-22 07:59+03') d`)).rows[0],
  JSON.stringify((await db.query(`select public.wa_quiet_until('2026-09-22 23:30+03')::text a, public.wa_quiet_until('2026-09-23 03:00+03')::text b, public.wa_quiet_until('2026-09-22 12:00+03')::text c, public.wa_quiet_until('2026-09-22 07:59+03')::text d`)).rows[0]));
{
  const r = (await db.query(`select (public.wa_quiet_until('2026-09-22 23:30+03') at time zone 'Asia/Riyadh')::text a, (public.wa_quiet_until('2026-09-23 03:00+03') at time zone 'Asia/Riyadh')::text b, public.wa_quiet_until('2026-09-22 12:00+03') c, (public.wa_quiet_until('2026-09-22 07:59+03') at time zone 'Asia/Riyadh')::text d`)).rows[0];
  check('…the exact times: next day 08:00, same day 08:00, null, same day 08:00', r.a === '2026-09-23 08:00:00' && r.b === '2026-09-23 08:00:00' && r.c === null && r.d === '2026-09-22 08:00:00', JSON.stringify(r));
}

// daytime: a posted project reaches the owner at once
await db.exec(day);
await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد مطبخ 4×5','kitchen','خزائن ورخام','riyadh',40000,60000,'month')`);
await db.exec('reset role');
const P = (await db.query(`select id, code from public.projects order by created_at desc limit 1`)).rows[0];
check('daytime: the "project posted" WhatsApp goes at once', (await waSent()) === 1 && (await lastLog()).status === 'sent' && (await queued()) === 0, JSON.stringify(await lastLog()));

// the person switches WhatsApp off: the emails continue, WhatsApp is skipped and says why
await db.exec(`update public.profiles set prefs = '{"channel":"email"}' where id = '${HO}'`);
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 15000, 10, '', '{}')`);
await db.exec('reset role');
check('WhatsApp off in their settings: the bid is emailed, not WhatsApped, and the log says why',
  (await waSent()) === 1 && (await lastLog()).status === 'skipped' && (await lastLog()).detail.includes('settings') && (await db.query(`select count(*)::int n from public.sent where to_addr = 'sara@x.com' and subject like '%عرض جديد%'`)).rows[0].n === 1, JSON.stringify(await lastLog()));
check('…but a test message goes anyway (they pressed the button)', await (async () => { await as('authenticated', HO); const r = (await db.query(`select public.whatsapp_test() n`)).rows[0].n; await db.exec('reset role'); return r === '966511111111' && (await waSent()) === 2 && (await lastLog()).template === 'wa_test' && (await lastLog()).status === 'sent'; })());
await db.exec(`update public.profiles set prefs = '{}' where id = '${HO}'`);

// night: an ordinary update waits until 8am; a payment or dispute alert does not
await db.exec(night);
await as('authenticated', CO2);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 16000, 10, '', '{}')`);
await db.exec('reset role');
check('23:30: the bid is emailed now and its WhatsApp waits in the queue for 08:00', (await waSent()) === 2 && (await queued()) === 1 && (await lastLog()).status === 'queued' && (await lastLog()).detail.includes('08:00'), JSON.stringify(await lastLog()));
await db.exec(`select public.send_whatsapp('0511111111', 'ar', 'اعتُمدت المرحلة 1', 'صُرفت دفعتها.', 'project/${P.code}', 'stage_released')`);
check('…a payment alert at 23:30 goes at once', (await waSent()) === 3 && (await lastLog()).status === 'sent' && (await queued()) === 1);
await db.exec(`update public.profiles set prefs = '{"quiet": false}' where id = '${HO}'`);
await db.exec(`select public.send_whatsapp('0511111111', 'ar', 'نُشر مشروعك', 'تفاصيل', 'project/${P.code}', 'project_posted')`);
check('…and with quiet hours switched off by the person, so does an ordinary one', (await waSent()) === 4 && (await queued()) === 1);
await db.exec(`update public.profiles set prefs = '{}' where id = '${HO}'`);
check('nothing leaves the queue before 08:00', (await db.query(`select public.wa_flush() n`)).rows[0].n === 0 && (await queued()) === 1);
await db.exec(morning);
check('08:05: the queue empties into real sends', (await db.query(`select public.wa_flush() n`)).rows[0].n === 1 && (await queued()) === 0 && (await waSent()) === 5 && (await lastLog()).template === 'new_bid' && (await lastLog()).status === 'sent');
{
  await db.exec(night);
  await db.exec(`select public.send_whatsapp('0511111111', 'ar', 'ن', 'ت', 'x', 'project_posted')`);
  await db.exec(morning);
  await db.exec(`select public.send_whatsapp('+966 52 222 2222', 'en', 'Posted', 'Detail', 'x', 'project_posted')`);
  check('any daytime send also drains what the night held (in case pg_cron is missing)', (await queued()) === 0 && (await waSent()) === 7);
}
const body = JSON.parse((await db.query(`select html from public.sent where to_addr like 'wa:%' order by id desc limit 1`)).rows[0].html);
check('the queued message keeps its template, language, lines and button path', body.template.name === 'tarmem_update' && body.template.language.code === 'en' && body.template.components[1].parameters[0].text === 'x');

// the test button's limits
await db.exec(day);
await as('authenticated', HO);
await db.exec(`select public.whatsapp_test()`); await db.exec(`select public.whatsapp_test()`);
check('three test messages a day, then a plain refusal', /three test messages/.test(await fails(`select public.whatsapp_test()`)));
await db.exec('reset role');
check('the queue is nobody’s to read', /permission denied/.test(await (async () => { await as('authenticated', HO); const e = await fails(`select * from public.wa_queue`); await db.exec('reset role'); return e; })()));
check('a visitor cannot press the test button', /permission denied|sign in/.test(await (async () => { await db.exec('set role anon'); const e = await fails(`select public.whatsapp_test()`); await db.exec('reset role'); return e; })()));
await db.exec(`update public.profiles set mobile = '0044 7700 900123' where id = '${HOEN}'`);
check('a non-Saudi number is told so', /not a Saudi mobile/.test(await (async () => { await as('authenticated', HOEN); const e = await fails(`select public.whatsapp_test()`); await db.exec('reset role'); return e; })()));
await db.exec(`select public.set_whatsapp(null, null, null)`);
check('with WhatsApp switched off, the test button says so', /not switched on/.test(await (async () => { await as('authenticated', HO); const e = await fails(`select public.whatsapp_test()`); await db.exec('reset role'); return e; })()));

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
