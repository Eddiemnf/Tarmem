/* 021 (one account per mobile, the password-change email, the console's details) in a private Postgres, with the providers imitated. See local.mjs. */
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

await db.exec(`alter table auth.users add column encrypted_password text, add column last_sign_in_at timestamptz, add column email_confirmed_at timestamptz, add column created_at timestamptz not null default now();`);
await db.exec(readFileSync(repo + '020_profile_performance.sql', 'utf8'));
const twentyone = readFileSync(repo + '021_admin_detail_phone_reset.sql', 'utf8');
await db.exec(twentyone); await db.exec(twentyone);
check('021 runs cleanly, twice, on top of 001–020', true);

const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), CO = U('c1'), CO2 = U('c2');
await db.exec(`insert into auth.users (id, email, encrypted_password) values ('${ADMIN}','o@t.sa','h0'),('${HO}','sara@x.com',null),('${CO}','co@x.com','h1'),('${CO2}','co2@x.com','h2');
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),
    ('${CO}','contractor','Khalid','0533333333','riyadh','مؤسسة البناء المتقن','ar'),('${CO2}','contractor','Fahad','+966 54 444 4444','jeddah','Other Co','en');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values ('مؤسسة البناء المتقن','Khalid','0533333333','co@x.com','riyadh',array['kitchen'],'${CO}','verified');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const rows = async (sql) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); return (await db.query(sql)).rows; };
const lastMail = async () => (await rows(`select * from public.sent where to_addr not like 'wa:%' and to_addr not like 'meta:%' order by id desc limit 1`))[0];
const one = async (sql) => (await rows(sql))[0];

// 1 — mobile numbers
const keys = await one(`select public.mobile_key('+966 55 123 4567') a, public.mobile_key('0551234567') b, public.mobile_key('551234567') c, public.mobile_key('00966551234567') d, public.mobile_key('') e, public.mobile_key('٠٥٥١٢٣٤٥٦٧') f`);
check('every way of writing a Saudi mobile reduces to one key', keys.a === '966551234567' && keys.b === keys.a && keys.c === keys.a && keys.d === keys.a && keys.e === null, JSON.stringify(keys));
await as('anon');
const taken = await one(`select public.mobile_taken('+966 51 111 1111') a, public.mobile_taken('0511111111') b, public.mobile_taken('0599999999') c, public.mobile_taken('') d`);
check('the sign-up form can ask whether a number is taken, in any format, before creating the account', taken.a === true && taken.b === true && taken.c === false && taken.d === false, JSON.stringify(taken));
await db.exec(`reset role;`);
await db.exec(`insert into auth.users (id, email) values ('${U('b9')}','dup@x.com')`);
const dup = await fails(`insert into public.profiles (id, role, full_name, mobile, city, lang) values ('${U('b9')}','homeowner','Dup','+966 51 111 1111','riyadh','ar')`);
check('a second account with the same mobile (written differently) is refused', /mobile_taken/.test(dup || ''), dup);
await as('authenticated', CO);
const move = await fails(`update public.profiles set mobile = '0511111111' where id = '${CO}'`);
check('changing your number to somebody else\'s is refused too', /mobile_taken/.test(move || ''), move);
const ownOk = await fails(`update public.profiles set mobile = '0533333333' where id = '${CO}'`);
check('keeping your own number, or changing to a free one, is fine', ownOk === false, ownOk);
await db.exec(`reset role;`);

// 2 — the password-change email
await db.exec(`delete from public.sent; update auth.users set encrypted_password = 'first' where id = '${HO}'`);
check('setting a password for the first time sends nothing', (await rows(`select count(*)::int n from public.sent`))[0].n === 0);
await db.exec(`update auth.users set encrypted_password = 'second' where id = '${HO}'`);
let m = await lastMail();
check('changing it emails the person, in Arabic for an Arabic account', m && m.to_addr === 'sara@x.com' && /تم تغيير كلمة مرور/.test(m.subject), m && m.subject);
await db.exec(`update auth.users set encrypted_password = 'third' where id = '${CO2}'`);
m = await lastMail();
check('…and in English for an English one, with a sign-in link', m && m.to_addr === 'co2@x.com' && /password was changed/.test(m.subject) && /\/signin/.test(m.html), m && m.subject);
await db.exec(`update auth.users set email = 'co2@x.com' where id = '${CO2}'`);
check('an unrelated change to the login record sends nothing', (await rows(`select count(*)::int n from public.sent`))[0].n === 2);
check('the email is logged like every other message', (await rows(`select count(*)::int n from public.email_log where template = 'password_changed' and status = 'sent'`))[0].n === 2);

// 3 — support cases answered from the console
await as('anon');
await db.exec(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('نورة','noura@x.com',null,'billing','متى تفتحون الدفع؟','ar')`);
await db.exec(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('Sam',null,'0566666666','other','Just a phone','en')`);
const C1 = (await rows(`select id from public.contact_messages where name = 'نورة'`))[0].id, C2 = (await rows(`select id from public.contact_messages where name = 'Sam'`))[0].id;
await as('authenticated', HO);
check('a customer cannot answer cases', /admins only/.test(await fails(`select public.admin_reply_case(${C1}, 'hello')`) || ''));
check('…or read replies', (await db.query(`select count(*)::int n from public.case_replies`)).rows[0].n === 0);
await as('authenticated', ADMIN);
const r1 = (await db.query(`select public.admin_reply_case(${C1}, 'الدفع عبر الموقع يُفعّل خلال أسابيع، وسنخبرك.') r`)).rows[0].r;
check('an admin\'s reply to a case with an email is sent and kept', r1.sent === true && (await rows(`select count(*)::int n from public.case_replies where case_id = ${C1}`))[0].n === 1, JSON.stringify(r1));
m = await lastMail();
check('the email carries the reply, in the sender\'s language, with the support address', m && m.to_addr === 'noura@x.com' && /رد فريق ترميم/.test(m.subject) && /يُفعّل خلال أسابيع/.test(m.html) && /support@tarmem.sa/.test(m.html), m && m.subject);
check('the case is stamped answered', (await rows(`select answered_at is not null a, handled h from public.contact_messages where id = ${C1}`))[0].a === true);
await as('authenticated', ADMIN);
const r2 = (await db.query(`select public.admin_reply_case(${C2}, 'Called you back.') r`)).rows[0].r;
check('a case with only a mobile keeps the reply without emailing anyone', r2.sent === false && (await rows(`select sent_by_email from public.case_replies where case_id = ${C2}`))[0].sent_by_email === false, JSON.stringify(r2));
await as('authenticated', ADMIN);
check('an empty reply is refused', /empty/.test(await fails(`select public.admin_reply_case(${C1}, ' ')`) || ''));
check('a reply to a case that does not exist is refused', /no such case/.test(await fails(`select public.admin_reply_case(999999, 'hello')`) || ''));
check('admins read the replies', (await db.query(`select count(*)::int n from public.case_replies`)).rows[0].n === 2);

// 4 — one person in full
await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد مطبخ','kitchen','خزائن','riyadh',40000,60000,'month')`);
const P = (await rows(`select id, code from public.projects order by created_at desc limit 1`))[0];
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note) values ('${P.id}', 52000, 30, 'ok')`);
await as('authenticated', HO);
check('a customer cannot open the console\'s details', /admins only/.test(await fails(`select public.admin_user_detail('${HO}')`) || ''));
await as('authenticated', ADMIN);
const d = (await db.query(`select public.admin_user_detail('${HO}') d`)).rows[0].d;
check('the homeowner in full: profile, email, projects with their bid counts', d.profile.full_name === 'سارة العتيبي' && d.email === 'sara@x.com' && d.projects.length === 1 && d.projects[0].code === P.code && d.projects[0].bids === 1 && d.prefs === undefined, JSON.stringify(d).slice(0, 200));
const dc = (await db.query(`select public.admin_user_detail('${CO}') d`)).rows[0].d;
check('the contractor in full: application, bids on named projects, counts', dc.application?.status === 'verified' && dc.bids.length === 1 && dc.bids[0].project_code === P.code && dc.bids[0].price === 52000 && dc.portfolio === 0 && dc.reviews === 0, JSON.stringify(dc).slice(0, 200));
check('an unknown id is an error, not an empty answer', /no such user/.test(await fails(`select public.admin_user_detail('${U('99')}')`) || ''));
await db.exec(`reset role;`);

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
