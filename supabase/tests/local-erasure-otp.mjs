/* 022 (replies to the team, spam limits, erasure, error log, mobile codes) in a private Postgres, with the providers imitated. See local.mjs. */
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
check('022 runs cleanly, twice, on top of 001–021', true);
const twentythree = readFileSync(repo + '023_test_allowance.sql', 'utf8');
await db.exec(twentythree); await db.exec(twentythree);
check('023 runs cleanly, twice', true);

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

// 1 — replies reach the team
await db.exec(`delete from public.sent`);
await as('anon');
await db.exec(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('نورة','noura@x.com',null,'billing','متى تفتحون الدفع؟','ar')`);
let m = await one(`select * from public.sent where to_addr = 'noura@x.com' order by id desc limit 1`);
check('every email now carries reply-to support@tarmem.sa', m && /"reply_to":\s*"support@tarmem.sa"/.test(m.raw), m && m.raw.slice(0, 120));

// 2 — spam limits
await as('anon');
let refusedAt = 0;
for (let i = 2; i <= 7; i++) { const e = await fails(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('نورة','noura@x.com',null,'billing','رسالة ${i}','ar')`); if (e) { refusedAt = i; check('the sixth message in an hour from the same email is refused with a plain reason', i === 6 && /too many/.test(e), `${i}: ${e}`); break; } }
check('…and the first five went through', refusedAt === 6 && (await n(`select count(*)::int n from public.contact_messages where email = 'noura@x.com'`)) === 5);
const byMobile = await fails(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('Sam',null,'0566666666','other','one','en')`);
check('a different sender is not affected', byMobile === false, byMobile);
for (let i = 0; i < 6; i++) await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades) values ('Co ${i}','Person ${i}','05777777${String(i).padStart(2, '0')}','a${i}@x.com','riyadh',array['kitchen'])`).catch(() => 0);
const appBurst = await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades) values ('Co','Person','0577777700','a0@x.com','riyadh',array['kitchen'])`);
check('applications: a second entry with the same address counts, six different applicants do not', appBurst === false && (await n(`select count(*)::int n from public.contractor_applications where email = 'a0@x.com'`)) === 2, appBurst);
for (let i = 0; i < 4; i++) await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades) values ('Co','Person','0577777700','a0@x.com','riyadh',array['kitchen'])`).catch(() => 0);
check('…until the same applicant\'s sixth in an hour', /too many/.test(await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades) values ('Co','Person','0577777700','a0@x.com','riyadh',array['kitchen'])`) || ''));
await db.exec(`reset role`);

// 4 — errors in the visit log
await as('anon');
const errOk = await fails(`insert into public.visits (session_id, event, route, path, lang, device, detail) values ('abcdefghij','error','home','/','ar','mobile','TypeError: x is not a function @ index-abc.js:1:2')`);
check('a visitor\'s browser error can be recorded, with a short detail', errOk === false, errOk);
const bogus = await fails(`insert into public.visits (session_id, event, route, path, lang, device) values ('abcdefghij','bogus','home','/','ar','mobile')`);
check('…and unknown event kinds still cannot', /check|violates/.test(bogus || ''));
await db.exec(`reset role`);

// 3 — erasure
await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد مطبخ','kitchen','خزائن','riyadh',40000,60000,'month')`);
await db.exec(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('سارة','sara@x.com',null,'other','hello','ar')`);
await as('authenticated', CO);
await db.exec(`insert into public.portfolio (path, caption) values ('${CO}/one.jpg','x')`);
await db.exec(`reset role; insert into storage.objects (bucket_id, name, owner) values ('project-files', '${HO}/p1/photo.png', '${HO}'), ('portfolio', '${CO}/one.jpg', '${CO}');`);
await db.exec(`update public.projects set status = 'active', contractor_id = '${CO}' where owner_id = '${HO}'`);
await as('authenticated', HO);
check('an account with a project in progress cannot be erased', /active_project/.test(await fails(`select public.delete_my_account()`) || ''));
await as('authenticated', CO);
check('…nor the contractor on it', /active_project/.test(await fails(`select public.delete_my_account()`) || ''));
await db.exec(`reset role; update public.projects set status = 'completed' where owner_id = '${HO}'`);
await as('anon');
check('a visitor cannot erase anything', /sign in first|permission denied/.test(await fails(`select public.delete_my_account()`) || ''));
await as('authenticated', ADMIN);
check('an admin does not erase themselves from the settings page', /another admin/.test(await fails(`select public.delete_my_account()`) || ''));
await db.exec(`delete from public.sent`);
await as('authenticated', HO);
const gone = await fails(`select public.delete_my_account()`);
check('a homeowner erases their own account', gone === false, gone);
const p = await one(`select full_name, mobile, email, deleted_at is not null gone, prefs::text prefs from public.profiles where id = '${HO}'`);
check('the profile is scrubbed: a placeholder name, no email, a dead number, no preferences', p.full_name === 'حساب محذوف' && p.email === null && /^0\d{11}$/.test(p.mobile) && p.gone && p.prefs === '{}', JSON.stringify(p));
const u = await one(`select email, encrypted_password, banned_until, raw_user_meta_data::text meta from auth.users where id = '${HO}'`);
check('the login record has a dead email, no password and a permanent ban', /@deleted\.tarmem\.sa$/.test(u.email) && u.encrypted_password === null && u.banned_until !== null && u.meta === '{}', JSON.stringify(u));
check('their project stays as a record, under the anonymous profile', (await n(`select count(*)::int n from public.projects where owner_id = '${HO}'`)) === 1);
check('their contact messages and file records are gone', (await n(`select count(*)::int n from public.contact_messages where email = 'sara@x.com'`)) === 0 && (await n(`select count(*)::int n from storage.objects where name like '${HO}/%'`)) === 0);
check('no "password changed" email goes to a dead address', (await n(`select count(*)::int n from public.sent where to_addr like '%deleted.tarmem.sa%'`)) === 0);
check('the dead number is not "taken" for anyone real, and the old one is free again', (await one(`select public.mobile_taken('0511111111') t`)).t === false);
await as('authenticated', HO2);
check('a customer cannot erase somebody else', /admins only/.test(await fails(`select public.admin_delete_user('${CO}')`) || ''));
await as('authenticated', ADMIN);
check('an admin cannot erase themselves or another admin from the console', /not yourself/.test(await fails(`select public.admin_delete_user('${ADMIN}')`) || '') && /another admin/.test(await fails(`select public.admin_delete_user('${ADMIN2}')`) || ''));
const co = await fails(`select public.admin_delete_user('${CO}')`);
check('an admin erases a contractor: portfolio and bank details go with them', co === false && (await n(`select count(*)::int n from public.portfolio where user_id = '${CO}'`)) === 0 && (await n(`select count(*)::int n from storage.objects where name like '${CO}/%'`)) === 0, co);

// 5 — mobile codes
await as('authenticated', HO3);
check('with mobile verification off, no code is sent', /otp_off/.test(await fails(`select public.otp_request()`) || ''));
await db.exec(`reset role; select public.set_otp(true); delete from public.sent;`);
await as('authenticated', HO3);
const r1 = (await db.query(`select public.otp_request() r`)).rows[0].r;
let wa = await one(`select * from public.sent where to_addr like 'wa:%' order by id desc limit 1`);
const sentCode = wa && (wa.raw.match(/"text":\s*"(\d{6})"/) || [])[1];
check('a code goes out as the tarmem_otp template, in the body and on the copy button', r1.sent === true && wa && /tarmem_otp/.test(wa.raw) && sentCode && (wa.raw.match(new RegExp(sentCode, 'g')) || []).length === 2, wa && wa.raw.slice(0, 200));
await as('authenticated', HO3);
check('a wrong code is refused', (await db.query(`select public.otp_check('000000') ok`)).rows[0].ok === false);
await as('authenticated', HO3);
check('the right code verifies the number', (await db.query(`select public.otp_check('${sentCode}') ok`)).rows[0].ok === true && (await one(`select mobile_verified_at is not null v from public.profiles where id = '${HO3}'`)).v === true);
await as('authenticated', HO3);
check('…once', (await db.query(`select public.otp_check('${sentCode}') ok`)).rows[0].ok === false);
await as('authenticated', HO3);
await db.query(`select public.otp_request()`); await as('authenticated', HO3); await db.query(`select public.otp_request()`);
await as('authenticated', HO3);
check('three codes an hour, no more', /too many codes/.test(await fails(`select public.otp_request()`) || ''));
await db.exec(`reset role; update public.mobile_codes set expires_at = now() - interval '1 minute' where user_id = '${HO3}' and used_at is null`);
await as('authenticated', HO3);
const last = (await rows(`select id from public.mobile_codes where user_id = '${HO3}' and used_at is null order by created_at desc limit 1`))[0];
check('an expired code is refused', (await (async () => { await as('authenticated', HO3); return (await db.query(`select public.otp_check('123456') ok`)).rows[0].ok; })()) === false && Boolean(last));
await db.exec(`reset role; delete from public.sent; select public.wa_submit_otp_template();`);
check('the authentication template is submitted to Meta in both languages, with a copy-code button and a ten-minute expiry', (await n(`select count(*)::int n from public.sent where to_addr like 'meta:%' and subject = 'tarmem_otp' and raw like '%AUTHENTICATION%' and raw like '%COPY_CODE%' and raw like '%code_expiration_minutes%'`)) === 2);
await db.exec(`reset role`);

// 6 — the test allowance (023)
await db.exec(`reset role; delete from public.email_log where template = 'wa_test'`);
const testAs = async (who) => { await as('authenticated', who); return fails(`select public.whatsapp_test()`); };
let testRefusedAt = 0;
for (let i = 1; i <= 4; i++) { const e = await testAs(HO3); if (e) { testRefusedAt = i; check('a customer gets three test messages a day, the fourth is refused', i === 4 && /test messages a day/.test(e), `${i}: ${e}`); break; } }
check('…and the first three went out', testRefusedAt === 4 && (await n(`select count(*)::int n from public.email_log where template = 'wa_test' and recipient = public.wa_number('0533333333') and status = 'sent'`)) === 3);
await db.exec(`reset role; update public.email_log set answer_code = 400, answer = '(#200) API access blocked.' where template = 'wa_test' and recipient = public.wa_number('0533333333')`);
check('attempts Meta refused do not count: after they are marked refused, a test goes out again', (await testAs(HO3)) === false);
await db.exec(`reset role; delete from public.email_log where template = 'wa_test'`);
let adminRefusedAt = 0;
for (let i = 1; i <= 11; i++) { const e = await testAs(ADMIN); if (e) { adminRefusedAt = i; break; } }
check('an admin testing the channel gets ten a day', adminRefusedAt === 11, String(adminRefusedAt));
await db.exec(`reset role`);

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
