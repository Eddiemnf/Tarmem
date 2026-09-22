/* 010 (emails) and 012 (the same on WhatsApp) in a private Postgres, with pg_net and Meta's endpoint imitated. See local.mjs. */
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
const twelve = readFileSync(repo + '012_whatsapp.sql', 'utf8');
await db.exec(twelve); await db.exec(twelve);
check('012 runs cleanly, twice', true);
await db.exec(`select public.set_alerts('re_TESTKEY_abcdefghijklmnopqrstuvwxyz01', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa');`);
const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), HOEN = U('b2'), CO = U('c1'), CO2 = U('c2');
await db.exec(`insert into auth.users (id, email) values ('${ADMIN}','o@t.sa'),('${HO}','sara@x.com'),('${HOEN}','john@x.com'),('${CO}','co@x.com'),('${CO2}','co2@x.com');
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${HOEN}','homeowner','John Smith','0522222222','riyadh',null,'en'),
    ('${CO}','contractor','Khalid','0533333333','riyadh','مؤسسة البناء المتقن','ar'),('${CO2}','contractor','Fahad','0544444444','jeddah','Other Co','ar');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values ('مؤسسة البناء المتقن','Khalid','0533333333','co@x.com','riyadh',array['kitchen'],'${CO}','verified'),('Other Co','Fahad','0544444444','co2@x.com','jeddah',array['kitchen'],'${CO2}','new');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const last = async () => { await db.exec('reset role'); return (await db.query(`select * from public.sent where to_addr not like 'wa:%' order by id desc limit 1`)).rows[0]; };
const count = async () => { await db.exec('reset role'); return (await db.query(`select count(*)::int n from public.sent`)).rows[0].n; };
const teamMails = async () => { await db.exec('reset role'); return (await db.query(`select count(*)::int n from public.sent where to_addr = 'support@tarmem.sa'`)).rows[0].n; };

// a posted project: confirmation to its owner (and the team's own alert still goes)
await as('authenticated', HO);
const P = (await db.query(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد مطبخ 4×5','kitchen','خزائن ورخام','riyadh',40000,60000,'month') returning id, code`)).rows[0];
let m = await last();
check('a posted project emails its owner a confirmation, in their language, with a link to it', m.to_addr === 'sara@x.com' && m.subject.includes('نُشر مشروعك ' + P.code) && m.html.includes('/project/' + P.code) && m.html.includes('dir="rtl"'), m.subject);
check('…and the team still gets its own alert', (await (async () => { await db.exec('reset role'); return (await db.query(`select count(*)::int n from public.sent where to_addr = 'support@tarmem.sa' and subject like 'مشروع جديد%'`)).rows[0].n; })()) === 1);

check('with WhatsApp switched off, nothing goes to Meta even though everyone has a mobile', (await (async () => { await db.exec('reset role'); return (await db.query(`select count(*)::int n from public.sent where to_addr like 'wa:%'`)).rows[0].n; })()) === 0);
// a bid: the owner, with the company and price, never the contractor's contact details
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 52000, 30, 'يشمل التوريد', '{}')`);
m = await last();
check('a bid emails the project owner with the company, the price and the days', m.to_addr === 'sara@x.com' && m.subject.includes('عرض جديد على مشروعك') && m.html.includes('مؤسسة البناء المتقن') && m.html.includes('52,000') && m.html.includes('30 يوم'), m.subject);
check('…and never the contractor’s mobile or email', !m.html.includes('0533333333') && !m.html.includes('co@x.com'));
check('…while the team’s alert about the bid now names the project and the company', (await (async () => { await db.exec('reset role'); const r = (await db.query(`select subject, html from public.sent where to_addr = 'support@tarmem.sa' order by id desc limit 1`)).rows[0]; return r.subject.includes(P.code) && r.html.includes('مؤسسة البناء المتقن'); })()));

// the owner signs: the contractor is told; then switches bids: the other contractor is told
await as('authenticated', CO2); await db.exec(`reset role; update public.contractor_applications set status = 'verified' where user_id = '${CO2}';`);
m = await last();
check('verifying an application emails the contractor "your account is verified" with a sign-in link', m.to_addr === 'co2@x.com' && m.subject.includes('تم توثيق حسابك') && m.html.includes('Other Co') && m.html.includes('/signin'), m.subject);
await as('authenticated', CO2);
const B2 = (await db.query(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 48000, 25, '', '{}') returning id`)).rows[0].id;
await as('authenticated', HO);
const B1 = (await db.query(`select id from public.bids where contractor_id = '${CO}'`)).rows[0].id;
await db.exec(`select public.sign_agreement_homeowner('${B1}')`);
m = await last();
check('the owner signing emails the chosen contractor "your bid was accepted — review and sign"', m.to_addr === 'co@x.com' && m.subject.includes('اختار صاحب المنزل عرضك') && m.html.includes('52,000') && m.html.includes('/project/' + P.code), m.subject);
check('…with no homeowner contact details in it', !m.html.includes('sara@x.com') && !m.html.includes('0511111111'));
await db.exec(`select public.sign_agreement_homeowner('${B2}')`);
m = await last();
check('switching to another bid before the counter-signature emails that contractor instead', m.to_addr === 'co2@x.com' && m.subject.includes('اختار صاحب المنزل عرضك') && m.html.includes('48,000'), m.to_addr);
await as('authenticated', CO2);
await db.exec(`select public.sign_agreement_contractor('${P.id}')`);
m = await last();
check('the contractor counter-signing emails the owner "awarded", naming the company and the amount', m.to_addr === 'sara@x.com' && m.subject.includes('وقّع المقاول الاتفاقية') && m.html.includes('Other Co') && m.html.includes('48,000'), m.subject);

// settings are respected
await as('authenticated', HOEN);
const P2 = (await db.query(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('Bathroom','bathroom','Tiles','riyadh',10000,20000,'month') returning id, code`)).rows[0];
m = await last();
check('an English-speaking owner gets the English version, left to right', m.to_addr === 'john@x.com' && m.subject.startsWith('Your project ' + P2.code) && m.html.includes('dir="ltr"'), m.subject);
await db.exec(`update public.profiles set prefs = '{"pBids": false}' where id = '${HOEN}'`);
await as('authenticated', CO);
const before = await count();
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P2.id}', 15000, 10, '', '{}')`);
check('an owner who turned bid notifications off in settings gets no bid email (the team still does)', (await count()) === before + 1 && (await last()).to_addr === 'support@tarmem.sa');

// contact receipts: only with an email, only once a day per address, never for the test rows
await as('anon');
const c0 = await count();
await db.exec(`insert into public.contact_messages (name, mobile, message) values ('نورة','0555123456','هل تغطون جدة؟')`);
check('a contact message without an email gets no receipt (the team alert still goes)', (await count()) === c0 + 1);
await db.exec(`insert into public.contact_messages (name, email, message, lang) values ('Noura','noura@x.com','Do you cover Jeddah?','en')`);
m = await last();
check('a contact message with an email gets a receipt in its language', m.to_addr === 'noura@x.com' && m.subject === 'We received your message' && m.html.includes('Noura'), m.subject);
const c1 = await count();
await db.exec(`insert into public.contact_messages (name, email, message, lang) values ('Noura again','noura@x.com','second one','en')`);
check('…but at most one receipt a day to the same address', (await count()) === c1 + 1 && (await last()).to_addr === 'support@tarmem.sa');
await db.exec(`insert into public.contact_messages (name, email, message) values ('RLS TEST','rls@x.com','Automated security test')`);
check('the security tests’ rows send nothing', (await count()) === c1 + 1);

// WhatsApp, once switched on: the same update, phone-length, to the person's number in Meta's format
await db.exec(`reset role; select public.set_whatsapp('EAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '123456789012345', 'tarmem_update');`);
check('a token that does not look like one is refused', Boolean(await fails(`select public.set_whatsapp('short', '123456789012345', 'x')`)) && Boolean(await fails(`select public.set_whatsapp('EAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'not-digits', 'x')`)));
check('Saudi numbers are normalised for Meta, others refused', (await db.query(`select public.wa_number('055 123 4567') a, public.wa_number('+966 55 123 4567') b, public.wa_number('٠٥٥١٢٣٤٥٦٧') c, public.wa_number('0044 7700 900123') d`)).rows[0].a === '966551234567' && (await db.query(`select public.wa_number('+966 55 123 4567') b`)).rows[0].b === '966551234567' && (await db.query(`select public.wa_number('٠٥٥١٢٣٤٥٦٧') c`)).rows[0].c === '966551234567' && (await db.query(`select public.wa_number('0044 7700 900123') d`)).rows[0].d === null);
await db.exec(`update public.profiles set prefs = '{}' where id = '${HOEN}'`);
await as('authenticated', CO2);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P2.id}', 17000, 12, '', '{}')`);
await db.exec('reset role');
const wa = (await db.query(`select * from public.sent where to_addr like 'wa:%' order by id desc limit 1`)).rows[0];
const waBody = wa ? JSON.parse(wa.html) : null;
check('a bid now also reaches the owner on WhatsApp: their number in Meta\u2019s format, the approved template, the headline, the detail, and the project path for the button',
  wa?.to_addr === 'wa:966522222222' && waBody?.template?.name === 'tarmem_update' && waBody?.template?.language?.code === 'en' && wa.subject.startsWith('New bid on your project') && waBody.template.components[1].parameters[0].text === 'project/' + P2.code, JSON.stringify(waBody).slice(0, 200));
check('…and the email still goes as before', (await db.query(`select count(*)::int n from public.sent where to_addr = 'john@x.com' and subject like 'New bid%'`)).rows[0].n === 1);
check('a contact-form sender (no account) gets no WhatsApp', (await db.query(`select count(*)::int n from public.sent where to_addr like 'wa:%' and subject like '%message%'`)).rows[0].n === 0);
check('every WhatsApp send is logged under its own channel', (await db.query(`select count(*)::int n from public.email_log where channel = 'whatsapp' and status = 'sent'`)).rows[0].n === 1);
// stages (only once payments are live)
await db.exec(`reset role; update public.platform_flags set enabled = true where key = 'payments_live';`);
await as('authenticated', ADMIN); await db.exec(`select public.mark_funded('${P.id}')`);
await as('authenticated', CO2);
await db.exec(`insert into storage.objects (bucket_id, name) values ('project-files', '${HO}/${P.id}/stage-0/photo-1.jpg'), ('project-files', '${HO}/${P.id}/stage-0/video-1.mp4')`);
await db.exec(`select public.stage_step('${P.id}', 0, 'submit')`);
m = await last();
check('a submitted stage emails the owner "ready for your approval"', m.to_addr === 'sara@x.com' && m.subject.includes('المرحلة 1 بانتظار اعتمادك'), m.subject);
await as('authenticated', HO);
await db.exec(`select public.stage_step('${P.id}', 0, 'dispute', 'الجص غير مستوٍ')`);
m = await last();
check('a disputed stage emails the contractor with the owner’s note', m.to_addr === 'co2@x.com' && m.subject.includes('ملاحظة على المرحلة 1') && m.html.includes('الجص غير مستوٍ'), m.subject);

// safety valves
await db.exec(`reset role`);
check('every send is written to email_log, which visitors cannot read', (await db.query(`select count(*)::int n from public.email_log where status = 'sent'`)).rows[0].n === (await count()) - (await teamMails()) && Boolean(await (async () => { await as('anon'); const f = await fails('select * from public.email_log'); await db.exec('reset role'); return f; })()));
await db.exec(`create or replace function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint language plpgsql as $$ begin raise exception 'mail service down'; end; $$;`);
await as('authenticated', HO);
check('if the mail service is down, posting a project still succeeds and the failure is logged', !(await fails(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('Another','kitchen','x y z','riyadh',1000,2000,'month')`)) && (await (async () => { await db.exec('reset role'); return (await db.query(`select count(*)::int n from public.email_log where status = 'failed'`)).rows[0].n >= 1; })()));
await db.exec('reset role');
console.log('--- email_log:'); for (const r of (await db.query(`select template, recipient, status, detail from public.email_log order by id`)).rows) console.log('   ', r.template.padEnd(28), r.recipient.padEnd(20), r.status.padEnd(9), r.detail || '');
console.log('--- sent:'); for (const r of (await db.query(`select to_addr, subject from public.sent order by id`)).rows) console.log('   ', String(r.to_addr).padEnd(20), r.subject);
console.log(results.join('\n')); process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
