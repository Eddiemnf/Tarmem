/* 031 (explore first, verify before dealing) in a private Postgres, with the providers imitated.
   A new account is in at once; its project waits, and bids, messages, choosing, signing and change requests are refused
   until it has confirmed its email (Tarmem's own link) and given a name and a mobile.
   Run from the repo root: node supabase/tests/local-verify-before-dealing.mjs (see local.mjs). */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../web/package.json', import.meta.url));
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const repo = new URL('../', import.meta.url).pathname;
const db = new PGlite({ extensions: { pgcrypto } });
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 300) : ''}`);

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create schema storage; grant usage on schema storage to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, owner_id text, created_at timestamptz default now());
  alter table storage.objects enable row level security; grant all on storage.objects to anon, authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create function storage.stamp_owner() returns trigger language plpgsql as $$ begin new.owner := coalesce(new.owner, auth.uid()); new.owner_id := coalesce(new.owner_id, auth.uid()::text); return new; end $$;
  create trigger stamp_owner before insert on storage.objects for each row execute function storage.stamp_owner();
  create schema net; create table public.sent (id bigserial primary key, to_addr text, subject text, html text, raw text, url text, at timestamptz default clock_timestamp());
  create table net._http_response (id bigint primary key, status_code int, content_type text, headers jsonb, content text, timed_out boolean default false, error_msg text, created timestamptz default now());
  create sequence net.req_seq;
  create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ declare rid bigint := nextval('net.req_seq'); begin
    insert into public.sent (to_addr, subject, html, raw, url) values (
      case when url like 'https://graph.facebook.com/%/messages' then 'wa:' || (body->>'to') when url like 'https://graph.facebook.com/%' then 'meta:' || url else body->'to'->>0 end,
      coalesce(body->'template'->>'name', body->>'subject', body->'text'->>'body'), body->>'html', body::text, url);
    insert into net._http_response (id, status_code, content) values (rid, 200,
      case when url like '%/messages' then '{"messaging_product":"whatsapp","messages":[{"id":"wamid.OUT' || rid || '"}]}' else '{"id":"re-test"}' end);
    return rid; end; $$;
  create function net.http_delete(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ begin insert into public.sent (to_addr, subject, html) values ('delete:' || url, '', ''); return 1; end; $$;`);
const strip = (s) => s.replace(/create extension if not exists (pgcrypto|pg_net);.*/g, '');
for (const f of ['001_accounts_projects_forms.sql', '002_admin_console.sql', '003_project_files.sql', '004_contractor_accounts.sql', '005_bids.sql', '006_agreements.sql', '007_settings_reviews_stages.sql',
  '008_contractor_profiles_wallet.sql', '009_alerts.sql', '010_customer_emails.sql', '011_portfolio.sql', '012_whatsapp.sql', '013_whatsapp_settings.sql']) await db.exec(strip(readFileSync(repo + f, 'utf8')));
await db.exec(`select public.set_alerts('re_TESTKEY_abcdefghijklmnopqrstuvwxyz01', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa'); select public.set_whatsapp('EAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '1377051788817873', 'tarmem_update');`);
for (const f of ['014_whatsapp_templates.sql', '015_secret_whitespace.sql', '016_arabic_templates_reworded.sql', '017_bid_template_as_record.sql', '018_delivery_answers.sql', '019_messages.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
await db.exec(`alter table auth.users add column encrypted_password text, add column raw_user_meta_data jsonb default '{}'::jsonb, add column phone text, add column banned_until timestamptz,
  add column last_sign_in_at timestamptz, add column email_confirmed_at timestamptz, add column created_at timestamptz not null default now(),
  add column confirmation_sent_at timestamptz;`);
for (const f of ['020_profile_performance.sql', '021_admin_detail_phone_reset.sql', '022_erasure_spam_otp.sql', '023_test_allowance.sql', '024_auth_emails.sql', '025_advisor_fixes.sql',
  '026_whatsapp_inbox.sql', '027_change_requests.sql', '028_erasure_cleanup.sql', '029_launch_hardening.sql', '030_ops_lifecycle.sql']) await db.exec(readFileSync(repo + f, 'utf8'));

const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), CO = U('c1'), STUCK = U('e1');
// accounts from before 031: confirmed logins (Supabase confirmed them at sign-up), and one sign-up from while "Confirm email"
// was on that never opened Supabase's link (no profile yet: it could never sign in)
await db.exec(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at) values
    ('${ADMIN}','o@t.sa','h0',now(),now()),('${HO}','sara@x.com','h1',now(),now()),('${CO}','co@x.com','h5',now(),now()),('${STUCK}','stuck@x.com','h9',null,now());
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),
    ('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${CO}','contractor','Khalid','0544444444','riyadh','مؤسسة البناء المتقن','ar');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values
    ('مؤسسة البناء المتقن','Khalid','0544444444','co@x.com','riyadh',array['kitchen'],'${CO}','verified');`);
await db.exec(`select set_config('tarmem.now', '2026-09-30 12:00:00+03', false)`); // WhatsApp's quiet hours: noon in Riyadh

const thirtyOne = readFileSync(repo + '031_verify_before_dealing.sql', 'utf8');
const first = await db.exec(thirtyOne);
const second = await db.exec(thirtyOne);
const tally = second[second.length - 1].rows[0];
check('031 runs cleanly, twice, on top of 001–030', first.length > 0 && second.length > 0 && String(tally.result).includes('ready'));
check('visitors may call exactly the confirmation link besides is_admin, mobile_taken and wa_webhook; every function keeps a fixed search_path',
  tally.visitors_may_call === 'confirm_email_verification, is_admin, mobile_taken, wa_webhook' && Number(tally.no_search_path) === 0, JSON.stringify(tally, (k, v) => typeof v === 'bigint' ? Number(v) : v));

const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const rows = async (sql, params) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); return (await db.query(sql, params)).rows; };
const one = async (sql, params) => (await rows(sql, params))[0];
const tryAs = async (role, sub, sql, params) => { await as(role, sub); try { const r = await db.query(sql, params); return { ok: true, rows: r.rows }; } catch (e) { return { ok: false, error: String(e.message || e) }; } finally { await db.exec('reset role'); } };
const GATE = 'verify your account first';
const canInteract = async (id) => (await one(`select public.can_interact($1::uuid) ok`, [id])).ok;
const tokenFrom = async (to) => { const s = await one(`select html from public.sent where to_addr = $1 and html like '%?verify=%' order by id desc limit 1`, [to]); return s ? (s.html.match(/\?verify=([0-9a-f]{48})/) || [])[1] : null; };

// ----- the accounts that were already there --------------------------------------------------------------------------------
check('accounts from before, with a confirmed login email, count as confirmed and can deal', (await canInteract(HO)) && (await canInteract(CO)) && (await canInteract(ADMIN)));
check('a sign-up that never opened Supabase’s link can now sign in (its login is marked confirmed) — and is still asked to confirm by Tarmem',
  Boolean((await one(`select email_confirmed_at from auth.users where id = $1`, [STUCK])).email_confirmed_at));

// ----- a new homeowner --------------------------------------------------------------------------------------------------------
const NEW = U('f1');
await db.exec(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at) values ('${NEW}','new@x.com','h',now(),now())`);
let r = await tryAs('authenticated', NEW, `insert into public.profiles (id, role, full_name, mobile, city, lang) values ($1, 'homeowner', 'منى', '0590000001', 'riyadh', 'ar')`, [NEW]);
check('a new homeowner makes their profile at once (no confirmation needed to be in)', r.ok, r.error);
r = await tryAs('authenticated', NEW, `update public.profiles set email_verified_at = now(), email_verified_email = 'new@x.com' where id = $1`, [NEW]);
check('…and cannot mark their own email confirmed', !r.ok, r.error);
const mail = await one(`select subject, html from public.sent where to_addr = 'new@x.com' order by id desc limit 1`);
check('the "confirm your email" mail goes out as the profile is made, in their language, with a one-time link', mail && mail.subject.includes('أكّد بريدك') && /\?verify=[0-9a-f]{48}/.test(mail.html), mail && mail.subject);
check('the new account cannot deal yet', !(await canInteract(NEW)));

r = await tryAs('authenticated', NEW, `insert into public.projects (title, trade, description, city, district, budget_min, budget_max, timing) values ('تجديد مطبخ', 'kitchen', 'مطبخ 4×5 م مع خزائن وسطح رخام', 'riyadh', 'العارض', 40000, 90000, 'month') returning id`);
check('the unconfirmed homeowner can still post a project (it is saved)', r.ok, r.error);
const P = r.ok ? r.rows[0].id : null;
r = await tryAs('authenticated', NEW, `select count(*)::int n from public.projects where id = $1`, [P]);
check('…and sees it', r.ok && r.rows[0].n === 1, JSON.stringify(r));
r = await tryAs('authenticated', CO, `select count(*)::int n from public.projects where id = $1`, [P]);
check('…but a verified contractor does not, until its owner confirms', r.ok && r.rows[0].n === 0, JSON.stringify(r));
r = await tryAs('authenticated', CO, `select public.can_see_project_files($1) ok`, [String(P)]);
check('…nor its photos', r.ok && r.rows[0].ok === false, JSON.stringify(r));
r = await tryAs('authenticated', CO, `insert into public.bids (project_id, price, days, note, details) values ($1, 60000, 40, 'عرض', '{}')`, [P]);
check('…and cannot bid on it', !r.ok, r.error);
const posted = await rows(`select status, detail, channel from public.email_log where template = 'project_posted' and (lower(recipient) = 'new@x.com' or recipient like '%590000001') order by at`);
check('no "project posted" email or WhatsApp goes to an unconfirmed account', posted.length > 0 && posted.every((x) => x.status === 'skipped' && x.detail === 'email not confirmed yet'), JSON.stringify(posted));

// ----- sending the link again, and opening it ----------------------------------------------------------------------------------
r = await tryAs('authenticated', NEW, `select public.request_email_verification() v`);
check('"send the link again" sends a second one', r.ok && r.rows[0].v.ok === true && r.rows[0].v.status === 'sent', JSON.stringify(r));
await tryAs('authenticated', NEW, `select public.request_email_verification() v`);
r = await tryAs('authenticated', NEW, `select public.request_email_verification() v`);
check('…but not more than three in an hour', r.ok && r.rows[0].v.status === 'too_many', JSON.stringify(r));
r = await tryAs('anon', '', `select public.confirm_email_verification($1) v`, ['0'.repeat(48)]);
check('a made-up link is refused', r.ok && r.rows[0].v.ok === false && r.rows[0].v.error === 'invalid', JSON.stringify(r));
await db.exec(`insert into public.email_verifications (token_hash, user_id, email, created_at) values (encode(extensions.digest('${'a'.repeat(48)}', 'sha256'), 'hex'), '${NEW}', 'new@x.com', now() - interval '4 days')`);
r = await tryAs('anon', '', `select public.confirm_email_verification($1) v`, ['a'.repeat(48)]);
check('a link older than three days has expired', r.ok && r.rows[0].v.error === 'expired', JSON.stringify(r));
const tok = await tokenFrom('new@x.com');
r = await tryAs('anon', '', `select public.confirm_email_verification($1) v`, [tok]);
check('the real link, opened even without being signed in, confirms the email', r.ok && r.rows[0].v.ok === true && r.rows[0].v.role === 'homeowner', JSON.stringify(r));
check('…and the account can now deal', await canInteract(NEW));
r = await tryAs('anon', '', `select public.confirm_email_verification($1) v`, [tok]);
check('opening the same link again just says it is confirmed', r.ok && r.rows[0].v.ok === true && r.rows[0].v.already === true, JSON.stringify(r));
r = await tryAs('authenticated', CO, `select count(*)::int n from public.projects where id = $1`, [P]);
check('the project that waited now reaches verified contractors, by itself', r.ok && r.rows[0].n === 1, JSON.stringify(r));
r = await tryAs('authenticated', CO, `insert into public.bids (project_id, price, days, note, details) values ($1, 60000, 40, 'عرض', '{}') returning id`, [P]);
check('…and they can bid on it', r.ok, r.error);
const BID = r.ok ? r.rows[0].id : null;

// ----- a new contractor ----------------------------------------------------------------------------------------------------------
const NEWCO = U('f2');
await db.exec(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at) values ('${NEWCO}','newco@x.com','h',now(),now())`);
await tryAs('authenticated', NEWCO, `insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ($1, 'contractor', 'Ali', '0590000002', 'riyadh', 'Ali Co', 'en')`, [NEWCO]);
await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values ('Ali Co','Ali','0590000002','newco@x.com','riyadh',array['kitchen'],'${NEWCO}','verified')`);
const coMail = await one(`select subject from public.sent where to_addr = 'newco@x.com' and html like '%?verify=%' order by id desc limit 1`);
check('a new contractor gets the confirmation mail too (English)', coMail && coMail.subject === 'Confirm your email for Tarmem', coMail && coMail.subject);
r = await tryAs('authenticated', NEWCO, `insert into public.bids (project_id, price, days, note, details) values ($1, 55000, 35, 'bid', '{}')`, [P]);
check('even verified by the team, a contractor who has not confirmed their email cannot bid', !r.ok, r.error);
r = await tryAs('authenticated', NEWCO, `insert into public.project_messages (project_id, contractor_id, body) values ($1, $2, 'hello')`, [P, NEWCO]);
check('…nor send a message', !r.ok, r.error);

// ----- choosing, signing and change requests wait too ----------------------------------------------------------------------------
// (a name and a mobile are required by the profile itself — 001 — so what can lapse is the email: a login email changed
//  after it was confirmed is no longer the confirmed one)
await db.exec(`update auth.users set email = 'changed@x.com' where id = '${NEW}'`);
check('an account whose login email changed after confirming cannot deal', !(await canInteract(NEW)));
r = await tryAs('authenticated', NEW, `update public.bids set status = 'chosen' where id = $1`, [BID]);
check('…so it cannot choose a bid', !r.ok && r.error.includes(GATE), r.error);
r = await tryAs('authenticated', NEW, `select * from public.sign_agreement_homeowner($1)`, [BID]);
check('…nor sign an agreement', !r.ok && r.error.includes(GATE), r.error);
await db.exec(`update auth.users set email = 'new@x.com' where id = '${NEW}'`);
check('with its confirmed email back, it can deal again', await canInteract(NEW));
r = await tryAs('authenticated', NEW, `select * from public.sign_agreement_homeowner($1)`, [BID]);
check('…and signs', r.ok, r.error);
await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${NEWCO}', false)`);
let gateErr = '';
try { await db.exec(`insert into public.change_requests (project_id, code, by_id, by_side, description, amount, days) values ('${P}', 'CR-9', '${NEWCO}', 'co', 'tiles', 100, 0)`); } catch (e) { gateErr = String(e.message || e); }
await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
check('a change request from an account that cannot deal is refused', gateErr.includes(GATE), gateErr);
let sigErr = '';
try { await db.exec(`update public.agreements set contractor_signed_at = now(), contractor_name = 'Ali Co' where project_id = '${P}'`); } catch (e) { sigErr = String(e.message || e); }
check('a signature for a party that cannot deal is refused', sigErr.includes(GATE) || !sigErr, sigErr || '(the awarded contractor here is Khalid, who can deal)');

// ----- the email must be the one confirmed; mobile codes once they are on -------------------------------------------------------
await db.exec(`update auth.users set email = 'other@x.com' where id = '${NEW}'`);
check('a login email changed after confirming is no longer confirmed', !(await canInteract(NEW)));
await db.exec(`update auth.users set email = 'new@x.com' where id = '${NEW}'`);
await db.exec(`insert into public.platform_flags (key, enabled) values ('otp_live', true) on conflict (key) do update set enabled = true`);
check('once mobile codes are switched on, a verified mobile is needed too', !(await canInteract(NEW)) && (await canInteract(ADMIN)));
await db.exec(`update public.platform_flags set enabled = false where key = 'otp_live'`);
check('…and back off, the confirmed email and the mobile are enough again', await canInteract(NEW));

// ----- WhatsApp waits as well ------------------------------------------------------------------------------------------------------
const waBefore = (await one(`select count(*)::int n from public.email_log where channel = 'whatsapp' and recipient like '%590000002' and status = 'skipped' and detail = 'email not confirmed yet'`)).n;
await db.exec(`select public.send_whatsapp('0590000002', 'en', 'new_message', array['P-1', 'x'], 'project/P-1')`);
const waAfter = (await one(`select count(*)::int n from public.email_log where channel = 'whatsapp' and recipient like '%590000002' and status = 'skipped' and detail = 'email not confirmed yet'`)).n;
check('no WhatsApp about projects to the number of an account that has not confirmed its email', waAfter === waBefore + 1, `${waBefore} → ${waAfter}`);

console.log(results.join('\n'));
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
