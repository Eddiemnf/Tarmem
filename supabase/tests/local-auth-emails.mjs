/* 024 (Supabase sign-in emails sent by the database) in a private Postgres, with the providers imitated. See local.mjs. */
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
await db.exec(`create role supabase_auth_admin nologin`);
const twentyfour = readFileSync(repo + '024_auth_emails.sql', 'utf8');
await db.exec(twentyfour); await db.exec(twentyfour);
check('024 runs cleanly, twice', true);


const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const AR = U('b1'), EN = U('b2');
await db.exec(`insert into auth.users (id, email) values ('${AR}','sara@x.com'),('${EN}','hind@x.com');
  insert into public.profiles (id, role, full_name, mobile, city, lang) values ('${AR}','homeowner','سارة العتيبي','0511111111','riyadh','ar'),('${EN}','homeowner','Hind Q','0522222222','riyadh','en');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const rows = async (sql) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); return (await db.query(sql)).rows; };
const one = async (sql) => (await rows(sql))[0];
const ev = (id, email, kind, extra = {}) => JSON.stringify({ user: { id, email, user_metadata: {} }, email_data: { token: '123456', token_hash: 'pkce_abc+/=', redirect_to: 'https://www.tarmem.sa/signin', email_action_type: kind, site_url: 'https://www.tarmem.sa', ...extra } }).replace(/'/g, "''");
const call = async (payload, role = 'supabase_auth_admin') => { await db.exec(`reset role; set role ${role}`); const r = (await db.query(`select public.auth_send_email('${payload}'::jsonb) r`)).rows[0].r; await db.exec('reset role'); return r; };
const last = async () => one(`select * from public.sent order by id desc limit 1`);

await db.exec(`reset role; delete from public.sent; delete from public.email_log;`);
let r = await call(ev(AR, 'sara@x.com', 'recovery'));
let m = await last();
check('the auth server may call the hook, and it answers {} (sent)', JSON.stringify(r) === '{}', JSON.stringify(r));
check('a reset email goes to the person, in Arabic for an Arabic account, greeting them by first name', m && m.to_addr === 'sara@x.com' && /إعادة تعيين كلمة المرور/.test(m.subject) && /مرحبًا سارة/.test(m.html), m && m.subject);
const href = (m.html.match(/href="([^"]+auth\/v1\/verify[^"]+)"/) || [])[1] || '';
check('its button carries the verify link Supabase expects, with the page to return to, safely encoded', href.startsWith('https://rdqlnsqdmaosghpxexup.supabase.co/auth/v1/verify?token=pkce_abc%2B%2F%3D&type=recovery&redirect_to=https%3A%2F%2Fwww.tarmem.sa%2Fsignin'), href);
check('it goes out with reply-to support@tarmem.sa and is logged as auth_recovery', /"reply_to":\s*"support@tarmem.sa"/.test(m.raw) && (await one(`select count(*)::int n from public.email_log where template = 'auth_recovery' and status = 'sent'`)).n === 1);
r = await call(ev(EN, 'hind@x.com', 'recovery')); m = await last();
check('…in English for an English account', m.to_addr === 'hind@x.com' && /Reset your Tarmem password/.test(m.subject) && /Hello Hind/.test(m.html));
r = await call(ev(AR, 'sara@x.com', 'signup')); m = await last();
check('a sign-up confirmation, when Supabase asks for one, says so and links with type=signup', /أكّد بريدك/.test(m.subject) && /type=signup/.test(m.html));
r = await call(ev(AR, 'sara@x.com', 'magiclink')); m = await last();
check('a sign-in link email works too', /رابط الدخول/.test(m.subject) && /type=magiclink/.test(m.html));
r = await call(ev(AR, 'sara@x.com', 'reauthentication', { token_hash: '' })); m = await last();
check('a code email shows the six digits and no dead link', /رمز التحقق/.test(m.subject) && /123456/.test(m.html) && !/auth\/v1\/verify/.test(m.html));
const before = (await one(`select count(*)::int n from public.sent`)).n;
r = await call(ev(AR, 'sara@x.com', 'password_changed_notification'));
check("Supabase's own security notices are skipped (021 already sends the password one)", JSON.stringify(r) === '{}' && (await one(`select count(*)::int n from public.sent`)).n === before);
r = await call(JSON.stringify({ user: { id: U('99'), email: 'new@x.com', user_metadata: { lang: 'en', full_name: 'Nora K' } }, email_data: { token_hash: 'h1', email_action_type: 'recovery', redirect_to: '' } }));
m = await last();
check('a person without a profile yet still gets it, in the language they signed up with, back to the site', m.to_addr === 'new@x.com' && /Hello Nora/.test(m.html) && /redirect_to=https%3A%2F%2Fwww.tarmem.sa/.test(m.html));
let refused = false; try { await call(ev(AR, 'sara@x.com', 'recovery'), 'anon'); } catch (e) { refused = /permission denied/.test(String(e.message || e)); }
await db.exec('reset role');
check('visitors and signed-in users cannot call it', refused);
check('url_encode leaves plain characters and encodes the rest, Arabic included', (await one(`select public.url_encode('a-b_c.d~e f/é') v`)).v === 'a-b_c.d~e%20f%2F%C3%A9');

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
