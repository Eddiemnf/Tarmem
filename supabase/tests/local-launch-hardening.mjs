/* 029 (launch hardening: the security review's twelve findings) in a private Postgres, with the providers, the storage
   service and PostgREST's request headers imitated. See local.mjs for how to run. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash, createHmac } from 'node:crypto';
const require = createRequire(new URL('../../web/package.json', import.meta.url));
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const repo = new URL('../', import.meta.url).pathname;
const db = new PGlite({ extensions: { pgcrypto } });
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 260) : ''}`);
const fails = async (sql, params) => { try { if (params) await db.query(sql, params); else await db.exec(sql); return false; } catch (e) { return String(e.message || e); } };

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  -- the storage service: its two tables, the folder helper, and the uploader's stamp (owner and owner_id, as Supabase writes them)
  create schema storage; grant usage on schema storage to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, owner_id text, created_at timestamptz default now());
  alter table storage.objects enable row level security; grant all on storage.objects to anon, authenticated;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create function storage.stamp_owner() returns trigger language plpgsql as $$ begin new.owner := coalesce(new.owner, auth.uid()); new.owner_id := coalesce(new.owner_id, auth.uid()::text); return new; end $$;
  create trigger stamp_owner before insert on storage.objects for each row execute function storage.stamp_owner();
  -- the providers: every request is kept in public.sent, and answered 200
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
  '026_whatsapp_inbox.sql', '027_change_requests.sql', '028_erasure_cleanup.sql']) await db.exec(readFileSync(repo + f, 'utf8'));

const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), HO2 = U('b2'), HO3 = U('b3'), CO = U('c1'), CO2 = U('c2'), CO3 = U('c3'), ER1 = U('e1'), ER2 = U('e2'), OTHER = U('e3'), NEWU = U('f1'), ER3 = U('e4');
// ER1 opened the confirmation link Supabase emailed (confirmation_sent_at, then email_confirmed_at): it proved its address.
// ER3 was made while "Confirm email" was off: marked confirmed at sign-up, with no email ever sent — it proved nothing.
await db.exec(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, confirmation_sent_at) values
    ('${ADMIN}','o@t.sa','h0',now(),now(),null),('${HO}','sara@x.com','h1',now(),now(),null),('${HO2}','noura@x.com','h2',now(),now(),null),('${HO3}','hind@x.com','h3',now(),now(),null),
    ('${CO}','co@x.com','h4',now(),now(),null),('${CO2}','co2@x.com','h5',now(),now(),null),('${CO3}','co3@x.com','h6',now(),now(),null),
    ('${ER1}','er1@x.com','h7','2026-09-01 00:05','2026-09-01','2026-09-01'),('${ER2}','er2@x.com','h8',null,'2026-09-01','2026-09-01'),('${OTHER}','other@x.com','h9',now(),'2026-09-01','2026-09-01'),
    ('${NEWU}','new@x.com','h10',now(),now(),null),('${ER3}','er3@x.com','h11','2026-09-01','2026-09-01',null);
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),
    ('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${HO2}','homeowner','نورة','0522222222','riyadh',null,'ar'),('${HO3}','homeowner','Hind','0533333333','riyadh',null,'en'),
    ('${CO}','contractor','Khalid','0544444444','riyadh','مؤسسة البناء المتقن','ar'),('${CO2}','contractor','Fahad','0555555555','riyadh','Build Co','en'),('${CO3}','contractor','Saad','0566666666','riyadh','Saad Co','ar'),
    ('${ER1}','contractor','Eid','0577777771','riyadh',null,'ar'),('${ER2}','homeowner','Reem','0577777772','riyadh',null,'ar'),('${OTHER}','contractor','Other','0577777773','riyadh',null,'ar'),
    ('${ER3}','homeowner','Auto','0577777774','riyadh',null,'ar');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values
    ('مؤسسة البناء المتقن','Khalid','0544444444','co@x.com','riyadh',array['kitchen'],'${CO}','verified'),('Build Co','Fahad','0555555555','co2@x.com','riyadh',array['kitchen'],'${CO2}','verified'),
    ('Saad Co','Saad','0566666666','co3@x.com','riyadh',array['kitchen'],'${CO3}','verified');
  -- an md5 code outstanding from before 029
  insert into public.mobile_codes (user_id, mobile_key, code_hash, expires_at) values ('${HO2}', '966522222222', md5('123456' || '${HO2}'), now() + interval '9 minutes');`);
const specsBefore = (await db.query(`select public.wa_template_specs()::text s`)).rows[0].s;
const policiesBefore = (await db.query(`select count(*)::int n from pg_policies`)).rows[0].n;

const nine = readFileSync(repo + '029_launch_hardening.sql', 'utf8');
const first = await db.exec(nine);
const saltFirst = (await db.query(`select value from public.app_secrets where key = 'form_salt'`)).rows[0]?.value;
const second = await db.exec(nine);
const tally = second[second.length - 1].rows[0];
check('029 runs cleanly, twice, on top of 001–028', first.length > 0 && second.length > 0);
check('its last line: visitors may call exactly is_admin, mobile_taken and wa_webhook; every function keeps a fixed search_path',
  tally.visitors_may_call === 'is_admin, mobile_taken, wa_webhook' && Number(tally.no_search_path) === 0, JSON.stringify(tally, (k, v) => typeof v === 'bigint' ? Number(v) : v));
check('the second run keeps the form salt it made the first time', /^[0-9a-f]{32}$/.test(saltFirst || '') && (await db.query(`select value from public.app_secrets where key = 'form_salt'`)).rows[0].value === saltFirst);

const as = async (role, sub, headers) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false);`);
  await db.query(`select set_config('request.headers', $1, false)`, [headers ? JSON.stringify(headers) : '']);
  await db.exec(`set role ${role};`);
};
const rows = async (sql, params) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.headers', '', false);`); return (await db.query(sql, params)).rows; };
const one = async (sql, params) => (await rows(sql, params))[0];
const n = async (sql, params) => (await one(sql, params)).n;
const lastTo = (to) => one(`select * from public.sent where to_addr = $1 order by id desc limit 1`, [to]);
const waParams = (raw) => { const t = JSON.parse(raw).template; return { name: t.name, params: (t.components.find((c) => c.type === 'body')?.parameters || []).map((p) => p.text) }; };
await db.exec(`select set_config('tarmem.now', '2026-09-28 12:00:00+03', false)`); // WhatsApp's quiet hours: noon in Riyadh
const EVIL = 'evil.example';

check('the md5 codes outstanding before 029 are expired (they can no longer be checked)', (await one(`select expires_at <= now() e from public.mobile_codes where user_id = '${HO2}'`)).e === true);
check('pgcrypto lives in "extensions", where 029 calls it', (await n(`select count(*)::int n from pg_extension e join pg_namespace s on s.oid = e.extnamespace where e.extname = 'pgcrypto' and s.nspname = 'extensions'`)) === 1);

// ---------------------------------------------------------------------------------------------------------------
// 12 — what a visitor may call, and that every flow still works
// ---------------------------------------------------------------------------------------------------------------
const anonFns = (await rows(`select p.oid::regprocedure::text sig from pg_proc p join pg_namespace s on s.oid = p.pronamespace
  where s.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') order by 1`)).map((r) => r.sig);
check('12: a visitor can call exactly three functions: is_admin(), mobile_taken(text), wa_webhook(text,text)', JSON.stringify(anonFns) === JSON.stringify(['is_admin()', 'mobile_taken(text)', 'wa_webhook(text,text)']), anonFns.join(', '));
const anonPolicies = await rows(`select schemaname, tablename, policyname, coalesce(qual, '') || ' ' || coalesce(with_check, '') expr from pg_policies where roles::text ~ '\\m(anon|public)\\M'`);
const called = [...new Set(anonPolicies.flatMap((p) => [...p.expr.matchAll(/public\.([a-z_0-9]+)\(/g)].map((m) => m[1])))];
const callable = [];
for (const f of called) callable.push((await one(`select bool_and(has_function_privilege('anon', p.oid, 'execute')) ok from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = $1`, [f])).ok);
check(`12: every function a visitor's row rules use is still callable by a visitor (${anonPolicies.length} rules, ${called.length} functions)`, anonPolicies.length >= 5 && callable.every(Boolean), called.join(', '));
const can = async (role, fn) => (await one(`select has_function_privilege($1, $2, 'execute') ok`, [role, fn])).ok;
const internal = ['public.email_html(text, text, text[], text, text)', 'public.url_encode(text)', 'public.wa_template_specs()', 'public.wa_template_name(text)', 'public.wa_json(text)', 'public.wa_now()',
  'public.wa_quiet_until(timestamptz)', 'public.wa_number(text)', 'public.wa_status_rank(text)', 'public.trade_label(text, text)', 'public.form_client_key()', 'public.otp_hash(uuid, text, text)',
  'public.send_email(text, text, text, text[], text, text, text)', 'public.send_alert(text, text[])', 'public.wa_post(text, text, text, text[], text)', 'public.wa_post_otp(text, text, text)', 'public.wa_send_text(text, text, text)', 'public.hmac_sha256(bytea, bytea)'];
const openTo = [];
for (const f of internal) { if (await can('anon', f)) openTo.push('anon:' + f); if (await can('authenticated', f)) openTo.push('authenticated:' + f); }
check('12: the internal helpers (email building, url encoding, WhatsApp specs and sending, trade labels, hashes) are closed to visitors and to signed-in people', openTo.length === 0, openTo.join(', '));
check('12: signed-in people keep what their own requests need: mobile_key (the profiles index), my_role (a row rule), is_admin',
  await can('authenticated', 'public.mobile_key(text)') && await can('authenticated', 'public.my_role()') && await can('authenticated', 'public.is_admin()') && !(await can('anon', 'public.mobile_key(text)')) && !(await can('anon', 'public.my_role()')));
await as('anon');
const probe = await fails(`select public.email_html('ar', 'x', array['y'], null, null)`);
await as('anon');
const probe2 = await fails(`select public.wa_template_specs()`);
check('12: …and a visitor calling one is told "permission denied"', /permission denied/.test(probe || '') && /permission denied/.test(probe2 || ''), `${probe} | ${probe2}`);
const inv = await one(`select
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prorettype = 'trigger'::regtype and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) trig,
  (select count(*)::int from pg_policies where schemaname = 'public' and (qual ~ '(?<!SELECT )auth\\.(uid|jwt|role)\\(\\)' or with_check ~ '(?<!SELECT )auth\\.(uid|jwt|role)\\(\\)')) bare,
  (select count(*)::int from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and array_to_string((i.indkey::int2[])[0:array_length(c.conkey, 1) - 1], ',') = array_to_string(c.conkey, ','))) unindexed`);
check("025's rules still hold: no trigger function is callable, no per-row auth.uid(), every link has an index", inv.trig === 0 && inv.bare === 0 && inv.unindexed === 0, JSON.stringify(inv));

// visitors' own flows
await db.exec(`delete from public.sent`);
await as('anon');
const vContact = await fails(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('Sam','sam@x.com',null,'other','hello there','en')`);
await as('anon');
const vApply = await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Visitor Co','Visitor','0588888881','visitor@x.com','riyadh',array['kitchen'],'ar')`);
await as('anon');
const vVisit = await fails(`insert into public.visits (session_id, event, route, path, lang, device) values ('visitor0001','view','home','/','ar','mobile')`);
check('12: a visitor still sends a contact message (and gets its receipt), applies as a contractor, and records a visit', vContact === false && vApply === false && vVisit === false
  && (await n(`select count(*)::int n from public.sent where to_addr = 'sam@x.com'`)) === 1 && (await n(`select count(*)::int n from public.visits where session_id = 'visitor0001'`)) === 1, `${vContact} | ${vApply} | ${vVisit}`);
await as('anon');
const taken = (await db.query(`select public.mobile_taken('0511111111') a, public.mobile_taken('0599999999') b`)).rows[0];
check('12: a visitor still asks mobile_taken on the sign-up form', taken.a === true && taken.b === false);
const SECRET = '0123456789abcdef0123456789abcdef';
await db.exec(`reset role; select public.set_wa_app_secret('${SECRET}')`);
const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '2162520270999056', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { phone_number_id: '1377051788817873' },
  contacts: [{ profile: { name: 'Sara' }, wa_id: '966511111111' }], messages: [{ from: '966511111111', id: 'wamid.IN1', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'hello' } }] } }] }] });
await as('anon');
const hook = (await db.query('select public.wa_webhook($1, $2) r', [raw, 'sha256=' + createHmac('sha256', SECRET).update(raw, 'utf8').digest('hex')])).rows[0].r;
check("12: Meta's webhook still works with the publishable key: a signed event is recorded", hook.ok === true && hook.messages === 1 && (await n(`select count(*)::int n from public.wa_inbox where wamid = 'wamid.IN1'`)) === 1, JSON.stringify(hook));

// a signed-in newcomer: creating a profile and changing its number run the mobile_key index as the person
await as('authenticated', NEWU);
const newProfile = await fails(`insert into public.profiles (id, role, full_name, mobile, city, lang) values ('${NEWU}','homeowner','Newcomer','0599999991','riyadh','en')`);
await as('authenticated', NEWU);
const newMobile = await fails(`update public.profiles set mobile = '0599999992' where id = '${NEWU}'`);
await as('authenticated', NEWU);
const newPost = await fails(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('Paint two rooms','painting','Two rooms','riyadh',3000,5000,'month')`);
check('12: a signed-in newcomer still creates a profile, changes the number and posts a project', newProfile === false && newMobile === false && newPost === false, `${newProfile} | ${newMobile} | ${newPost}`);

// ---------------------------------------------------------------------------------------------------------------
// 2 — no customer-typed words back to their own contact
// ---------------------------------------------------------------------------------------------------------------
await db.exec(`reset role; delete from public.sent; delete from public.alert_log;`);
await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('اتصل على 0500000000 الآن ${EVIL}','kitchen','خزائن','riyadh',40000,60000,'month')`);
const P = await one(`select id, code from public.projects where owner_id = '${HO}' order by created_at desc limit 1`);
let mail = await lastTo('sara@x.com');
check('2: the "project posted" email names the project by number and trade, not by its title',
  mail && mail.subject === `نُشر مشروعك ${P.code}: تصميم وترميم المطابخ` && !mail.html.includes(EVIL) && !mail.html.includes('0500000000'), mail && mail.subject);
let wa = await lastTo('wa:966511111111');
let w = wa && waParams(wa.raw);
check('2: …and its WhatsApp, the approved tarmem_project_posted_2, carries the trade label as {{2}} instead of the title', w && w.name === 'tarmem_project_posted_2' && w.params[0] === P.code && w.params[1] === 'تصميم وترميم المطابخ', JSON.stringify(w));
check('2: the template wording itself (Meta-approved bodies) is exactly as before 029', (await one(`select public.wa_template_specs()::text s`)).s === specsBefore);
const alert = await lastTo('support@tarmem.sa');
check('2: the team still sees the title in its own alert', alert && alert.subject.includes(EVIL), alert && alert.subject);
await as('authenticated', HO3);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('Win a prize at ${EVIL}','custom-thing','Something','riyadh',1000,2000,'flexible')`);
const PH3 = await one(`select id, code from public.projects where owner_id = '${HO3}' order by created_at desc limit 1`);
mail = await lastTo('hind@x.com'); wa = await lastTo('wa:966533333333'); w = wa && waParams(wa.raw);
check('2: in English, and a trade outside the list reads "Renovation project"', mail && mail.subject === `Your project ${PH3.code} is posted: Renovation project` && !mail.html.includes(EVIL)
  && w && w.params[1] === 'Renovation project', `${mail && mail.subject} | ${JSON.stringify(w)}`);

await as('anon');
await db.exec(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('Visit ${EVIL} now','victim@x.com',null,'other','secret words for the victim','en')`);
mail = await lastTo('victim@x.com');
check('2: the contact-form receipt repeats neither the name nor the message', mail && !mail.html.includes(EVIL) && !mail.html.includes('secret words') && mail.html.includes('Thank you.'), mail && mail.html.slice(0, 300));
await as('anon');
await db.exec(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('زر ${EVIL}','victim-ar@x.com',null,'other','كلمات','ar')`);
mail = await lastTo('victim-ar@x.com');
check('2: …in Arabic too', mail && !mail.html.includes(EVIL) && mail.html.includes('شكرًا لك.'), mail && mail.html.slice(0, 300));
await as('anon');
await db.exec(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('Again','VICTIM@x.com',null,'other','again','en')`);
check('2: receipts: at most one a day per address, in any letter case — a second message the same day gets none',
  (await n(`select count(*)::int n from public.sent where lower(to_addr) = 'victim@x.com'`)) === 1);
await db.exec(`reset role; insert into public.email_log (recipient, template, status) select 'bulk' || g || '@x.com', 'contact_receipt', 'sent' from generate_series(1, 40) g;`);
await as('anon');
await db.exec(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('Stranger','stranger@x.com',null,'other','hello','en')`);
const heldReceipt = await one(`select status, detail from public.email_log where recipient = 'stranger@x.com' order by id desc limit 1`);
check('2: …and at most 40 receipts an hour in all: the 41st is not sent, and is logged "skipped" (the message itself is kept)',
  (await n(`select count(*)::int n from public.sent where to_addr = 'stranger@x.com'`)) === 0 && heldReceipt?.status === 'skipped' && heldReceipt?.detail === 'receipts: 40 in the last hour'
  && (await n(`select count(*)::int n from public.contact_messages where email = 'stranger@x.com'`)) === 1, JSON.stringify(heldReceipt));
await db.exec(`reset role; update public.email_log set at = at - interval '2 hours' where recipient like 'bulk%@x.com';`);

await as('authenticated', ADMIN);
const caseId = (await db.query(`select id from public.contact_messages where email = 'victim@x.com'`)).rows[0].id;
await db.exec(`select public.admin_reply_case(${caseId}, 'We will call you tomorrow.')`);
mail = await lastTo('victim@x.com');
check("2: the console's reply greets without the sender's typed name, and carries the team's words", mail && mail.subject === 'A reply from Tarmem about your message' && !mail.html.includes(EVIL) && mail.html.includes('Hello,') && mail.html.includes('We will call you tomorrow.'), mail && mail.html.slice(0, 300));

await as('authenticated', HO2);
await db.exec(`update public.profiles set full_name = 'Noura ${EVIL}' where id = '${HO2}'`);
await db.exec(`reset role; update auth.users set encrypted_password = 'changed' where id = '${HO2}'`);
mail = await lastTo('noura@x.com');
check('2: "your password was changed" greets without the name', mail && mail.subject === 'تم تغيير كلمة مرور حسابك في ترميم' && !mail.html.includes(EVIL) && mail.html.includes('مرحبًا،'), mail && mail.html.slice(0, 300));
await db.exec(`reset role; update public.profiles set full_name = 'نورة' where id = '${HO2}'`);

await db.query(`select public.auth_send_email($1::jsonb)`, [JSON.stringify({ user: { id: '00000000-0000-4000-8000-000000000999', email: 'someone@victim.com', user_metadata: { full_name: `Claim your prize at ${EVIL}`, lang: 'en' } },
  email_data: { email_action_type: 'signup', token_hash: 'abc123', redirect_to: 'https://www.tarmem.sa/' } })]);
mail = await lastTo('someone@victim.com');
check('2: the sign-up confirmation (Supabase hook) greets without the name typed on the form', mail && mail.subject === 'Confirm your email for Tarmem' && !mail.html.includes(EVIL) && mail.html.includes('Hello,') && mail.html.includes('token=abc123'), mail && mail.html.slice(0, 300));
await db.query(`select public.auth_send_email($1::jsonb)`, [JSON.stringify({ user: { id: HO, email: 'sara@x.com' }, email_data: { email_action_type: 'recovery', token_hash: 'r1', redirect_to: 'https://www.tarmem.sa/reset' } })]);
mail = await lastTo('sara@x.com');
check('2: …and so does the password reset, in the account\'s language', mail && mail.subject === 'إعادة تعيين كلمة المرور في ترميم' && mail.html.includes('مرحبًا،') && !mail.html.includes('سارة'), mail && mail.subject);

// a bid, the agreement, and a change: the homeowner's own title is not sent back to the homeowner
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 52000, 30, 'ok', '{}')`);
mail = await lastTo('sara@x.com');
check('2: the "new bid" email to the homeowner names the project by number and trade', mail && mail.subject === `عرض جديد على مشروعك ${P.code}` && !mail.html.includes(EVIL) && mail.html.includes(P.code) && mail.html.includes('تصميم وترميم المطابخ'), mail && mail.html.slice(0, 400));
const bidCo = await one(`select id from public.bids where contractor_id = '${CO}' and project_id = '${P.id}'`);
await as('authenticated', HO);
await db.exec(`select public.sign_agreement_homeowner('${bidCo.id}')`);
mail = await lastTo('co@x.com');
check('2: (to the contractor, the homeowner\'s title stays: it is what they bid on)', mail && mail.html.includes(EVIL), mail && mail.subject);
await as('authenticated', CO);
await db.exec(`select public.sign_agreement_contractor('${P.id}')`);
mail = await lastTo('sara@x.com');
check('2: the "contractor signed" email to the homeowner names the project by number and trade', mail && mail.subject === `وقّع المقاول الاتفاقية — أُسند ${P.code}` && !mail.html.includes(EVIL) && mail.html.includes('مؤسسة البناء المتقن'), mail && mail.html.slice(0, 400));
await as('authenticated', CO);
const cr = await fails(`select public.change_request_create('${P.id}', 'Extra tiles, see ${EVIL}', 2000, 3)`);
mail = await lastTo('sara@x.com');
const crMail = mail;
await as('authenticated', HO);
const crOk = await fails(`select public.change_request_approve((select id from public.change_requests where project_id = '${P.id}' limit 1))`);
mail = await lastTo('co@x.com');
check('2: change requests still work; the "approved" email does not repeat the author\'s own description back to them',
  cr === false && crOk === false && crMail.subject === `طلب تغيير على المشروع ${P.code}` && !crMail.html.includes('اتصل على') && mail && mail.subject === `اعتُمد طلب التغيير على المشروع ${P.code}` && !mail.html.includes(EVIL) && mail.html.includes('CR-1') && mail.html.includes('54000'),
  `${cr} | ${crOk} | ${mail && mail.html.slice(0, 300)}`);

// ---------------------------------------------------------------------------------------------------------------
// 1 — mobile codes
// ---------------------------------------------------------------------------------------------------------------
await db.exec(`reset role; select public.set_otp(true);`);
const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
const askCode = async (who, num) => {
  await as('authenticated', who);
  await db.query(`select public.otp_request()`);
  const m = await lastTo('wa:' + num);
  return m && JSON.parse(m.raw).template.components[0].parameters[0].text;
};
const checkCode = async (who, code) => { await as('authenticated', who); return (await db.query(`select public.otp_check($1) ok`, [code])).rows[0].ok; };
const verified = async (who) => (await one(`select mobile_verified_at is not null v from public.profiles where id = $1`, [who])).v;
const setMobile = async (who, mobile) => { await as('authenticated', who); return fails(`update public.profiles set mobile = $1 where id = $2`, [mobile, who]); };

const code1 = await askCode(HO3, '966533333333');
const row1 = await one(`select code_hash, mobile_key from public.mobile_codes where user_id = '${HO3}' order by id desc limit 1`);
check('1: a code is stored as SHA-256 of the account, its number and the code (not md5)', /^\d{6}$/.test(code1 || '') && row1.code_hash === sha(`${HO3}:966533333333:${code1}`) && row1.mobile_key === '966533333333', `${code1} ${row1.code_hash}`);
const src = await one(`select prosrc from pg_proc where proname = 'otp_request'`);
check('1: codes come from gen_random_bytes, no longer from random()', /extensions\.gen_random_bytes/.test(src.prosrc) && !/random\(\)/.test(src.prosrc));
check('1: the right code verifies the number', (await checkCode(HO3, code1)) === true && (await verified(HO3)) === true);
check('1: changing to another number clears the verification', (await setMobile(HO3, '0533333334')) === false && (await verified(HO3)) === false);
const code2 = await askCode(HO3, '966533333334');
await setMobile(HO3, '0533333335');
check('1: a code sent to the previous number no longer verifies the new one', (await checkCode(HO3, code2)) === false && (await verified(HO3)) === false);
const code3 = await askCode(HO3, '966533333335');
check('1: a code for the current number does', (await checkCode(HO3, code3)) === true && (await verified(HO3)) === true);
check('1: the same number written another way stays verified', (await setMobile(HO3, '+966 53 333 3335')) === false && (await verified(HO3)) === true);
check('1: the three codes differ and are all 64-character hashes', new Set([code1, code2, code3]).size === 3 && (await n(`select count(*)::int n from public.mobile_codes where user_id = '${HO3}' and code_hash ~ '^[0-9a-f]{64}$'`)) === 3);
await as('authenticated', HO3);
check('1: the three-an-hour limit is unchanged', /too many codes/.test(await fails(`select public.otp_request()`) || ''));

// 1 — with mobile verification on, WhatsApp updates go only to verified numbers (a stranger's number typed into a profile gets nothing)
const postAs = async (who, title) => { await as('authenticated', who); await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('${title}','painting','Two rooms','riyadh',3000,5000,'month')`); };
await db.exec(`reset role; delete from public.sent;`);
await postAs(HO, 'Unverified number, otp on');     // sara: 0511111111, never verified
await postAs(HO3, 'Verified number, otp on');      // hind: verified with a code above
const waLog = (num) => one(`select status, detail from public.email_log where channel = 'whatsapp' and recipient = $1 and template = 'project_posted' order by id desc limit 1`, [num]);
const skippedUnverified = await waLog('966511111111');
check('1: otp_live on — an update to a number nobody has verified is not sent: logged "skipped", "number not verified"; its email still goes',
  (await n(`select count(*)::int n from public.sent where to_addr = 'wa:966511111111'`)) === 0 && skippedUnverified?.status === 'skipped' && skippedUnverified?.detail === 'number not verified'
  && (await n(`select count(*)::int n from public.sent where to_addr = 'sara@x.com'`)) === 1, JSON.stringify(skippedUnverified));
check('1: …a verified number still gets it (tarmem_project_posted_2)', (await lastTo('wa:966533333335'))?.subject === 'tarmem_project_posted_2');
await as('authenticated', HO);
const testUnverified = await fails(`select public.whatsapp_test()`);
check('1: …and the WhatsApp test asks for the code first ("mobile_not_verified")', /^mobile_not_verified/.test(testUnverified || '') && (await n(`select count(*)::int n from public.sent where to_addr = 'wa:966511111111'`)) === 0, testUnverified);
await db.exec(`reset role; select public.set_otp(false); delete from public.sent;`);
await postAs(HO, 'Unverified number, otp off');
check('1: otp_live off (today) — WhatsApp goes as before, verified or not', (await lastTo('wa:966511111111'))?.subject === 'tarmem_project_posted_2');

// ---------------------------------------------------------------------------------------------------------------
// 3 — the WhatsApp test, per account
// ---------------------------------------------------------------------------------------------------------------
await db.exec(`reset role; delete from public.email_log where template = 'wa_test'; select public.set_otp(false);`);
const waTest = async (who) => { await as('authenticated', who); return fails(`select public.whatsapp_test()`); };
let refusedAt = 0;
for (let i = 1; i <= 4; i++) { const e = await waTest(HO3); if (e) { refusedAt = i; check('3: three tests a day, the fourth refused', i === 4 && /test messages a day/.test(e), `${i}: ${e}`); break; } }
check('3: …each recorded as asked by this account', refusedAt === 4 && (await n(`select count(*)::int n from public.email_log where template = 'wa_test' and actor_id = '${HO3}' and status = 'sent'`)) === 3);
await setMobile(HO3, '0533333336');
const afterChange = await waTest(HO3);
check('3: changing the number does not buy more tests the same day', /test messages a day/.test(afterChange || '') && (await n(`select count(*)::int n from public.email_log where template = 'wa_test' and recipient = '966533333336'`)) === 0, afterChange);
check('3: another account is not affected', (await waTest(HO2)) === false);
let adminAt = 0;
for (let i = 1; i <= 11; i++) { if (await waTest(ADMIN)) { adminAt = i; break; } }
check('3: an admin testing the channel still gets ten', adminAt === 11, String(adminAt));

// ---------------------------------------------------------------------------------------------------------------
// 5 — messages: the site writes three columns
// ---------------------------------------------------------------------------------------------------------------
await as('authenticated', HO);
const siteInsert = await fails(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO}', 'متى تبدأون؟')`);
const forged = [];
for (const [col, val] of [['created_at', `'2020-01-01'`], ['read_at', 'now()'], ['from_id', `'${CO}'`]]) {
  await as('authenticated', HO);
  forged.push(await fails(`insert into public.project_messages (project_id, contractor_id, body, ${col}) values ('${P.id}', '${CO}', 'x', ${val})`));
}
check('5: the site\'s own insert (project, contractor, words) works', siteInsert === false, siteInsert);
check('5: the time, "read" and the sender cannot be written by the website', forged.every((e) => /permission denied/.test(e || '')), forged.join(' | '));
const msg = await one(`select from_id, created_at > now() - interval '1 minute' fresh, read_at from public.project_messages where body = 'متى تبدأون؟'`);
await as('authenticated', CO);
const marked = (await db.query(`select public.mark_messages_read('${P.id}', '${CO}') n`)).rows[0].n;
check('5: the database stamps sender and time; the other party marks it read through mark_messages_read', msg.from_id === HO && msg.fresh && msg.read_at === null && marked === 1
  && (await one(`select read_at is not null r from public.project_messages where body = 'متى تبدأون؟'`)).r === true);

// ---------------------------------------------------------------------------------------------------------------
// 6 — choosing a bid only while the project is open
// ---------------------------------------------------------------------------------------------------------------
await as('authenticated', HO2);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('دهان','painting','غرفتان','riyadh',5000,9000,'month')`);
const P2 = await one(`select id, code from public.projects where owner_id = '${HO2}' order by created_at desc limit 1`);
await as('authenticated', CO); await db.exec(`insert into public.bids (project_id, price, days) values ('${P2.id}', 7000, 10)`);
await as('authenticated', CO2); await db.exec(`insert into public.bids (project_id, price, days) values ('${P2.id}', 6500, 12)`);
const b1 = (await one(`select id from public.bids where project_id = '${P2.id}' and contractor_id = '${CO}'`)).id;
const b2 = (await one(`select id from public.bids where project_id = '${P2.id}' and contractor_id = '${CO2}'`)).id;
const chooseBid = async (bid) => { // session.ts chooseBid: move the choice, then choose
  await as('authenticated', HO2);
  const a = await fails(`update public.bids set status = 'submitted' where project_id = '${P2.id}' and status = 'chosen' and id <> '${bid}'`);
  await as('authenticated', HO2);
  return a || fails(`update public.bids set status = 'chosen' where id = '${bid}'`);
};
check("6: the site's choose-bid path works while the project is open, and the choice can move", (await chooseBid(b1)) === false && (await chooseBid(b2)) === false
  && (await one(`select status from public.bids where id = '${b2}'`)).status === 'chosen' && (await one(`select status from public.bids where id = '${b1}'`)).status === 'submitted');
await as('authenticated', HO2); const s1 = await fails(`select public.sign_agreement_homeowner('${b2}')`);
await as('authenticated', CO2); const s2 = await fails(`select public.sign_agreement_contractor('${P2.id}')`);
check('6: signing still works (the homeowner, then the contractor): the project is awarded', s1 === false && s2 === false && (await one(`select status from public.projects where id = '${P2.id}'`)).status === 'active', `${s1} | ${s2}`);
await as('authenticated', HO2);
const unchoose = await fails(`update public.bids set status = 'submitted' where id = '${b2}'`);
const rechoose = await chooseBid(b1);
check('6: once the project is awarded, the homeowner can no longer move or undo the choice', /no longer open/.test(unchoose || '') && /no longer open/.test(rechoose || '')
  && (await one(`select status from public.bids where id = '${b2}'`)).status === 'chosen', `${unchoose} | ${rechoose}`);
await as('authenticated', HO3); await db.exec(`reset role`);
await as('authenticated', CO3); await db.exec(`insert into public.bids (project_id, price, days) values ('${PH3.id}', 1500, 5)`);
const sqlEditor = await fails(`reset role; select set_config('request.jwt.claim.sub', '', false); select public.erase_account('${CO3}')`);
check('6: the database\'s own work (SQL editor, nobody signed in) can still withdraw a bid — e.g. erasing a contractor there', sqlEditor === false
  && (await one(`select status from public.bids where contractor_id = '${CO3}'`)).status === 'withdrawn', sqlEditor);

// ---------------------------------------------------------------------------------------------------------------
// 4 — erasure and the console: rows matched only by email
// ---------------------------------------------------------------------------------------------------------------
await db.exec(`reset role;
  insert into public.contact_messages (name, email, message, created_at) values ('Before','er1@x.com','sent before the account existed','2026-08-01'), ('After','ER1@x.com','sent after','2026-09-10'),
    ('Unconfirmed','er2@x.com','after, but the account never confirmed the address','2026-09-10'),
    ('Auto','er3@x.com','after, but the account was confirmed with no email sent','2026-09-10');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, created_at) values
    ('Old Co','Eid','0577777771','er1@x.com','riyadh',array['kitchen'],null,'2026-08-15'), ('New Co','Eid','0577777771','er1@x.com','riyadh',array['kitchen'],null,'2026-09-12'),
    ('Eid Co','Eid','0577777771','er1@x.com','riyadh',array['kitchen'],'${ER1}','2026-09-12'), ('Another person','Other','0577777773','er1@x.com','riyadh',array['kitchen'],'${OTHER}','2026-09-12'),
    ('Auto Co','Auto','0577777774','er3@x.com','riyadh',array['kitchen'],null,'2026-09-12');`);
await as('authenticated', ADMIN);
const d1 = (await db.query(`select public.admin_user_detail('${ER1}') d`)).rows[0].d;
await as('authenticated', ADMIN);
const d2 = (await db.query(`select public.admin_user_detail('${ER2}') d`)).rows[0].d;
await as('authenticated', ADMIN);
const d3 = (await db.query(`select public.admin_user_detail('${ER3}') d`)).rows[0].d;
check('4: the console counts only messages sent after the account existed, and only for an address the account proved (confirmed from the emailed link)',
  Number(d1.messages) === 1 && Number(d2.messages) === 0 && Number(d3.messages) === 0, `${d1.messages} ${d2.messages} ${d3.messages}`);
const proof = await one(`select public.email_proven('${ER1}') a, public.email_proven('${ER2}') b, public.email_proven('${ER3}') c, public.email_proven('${U('99')}') d`);
check('4: email_proven: the emailed link opened → yes; never confirmed → no; confirmed at sign-up with no email sent ("Confirm email" off) → no; no such account → no',
  proof.a === true && proof.b === false && proof.c === false && proof.d === false, JSON.stringify(proof));
await as('authenticated', ADMIN); const e1 = await fails(`select public.admin_delete_user('${ER1}')`);
await as('authenticated', ADMIN); const e2 = await fails(`select public.admin_delete_user('${ER2}')`);
await as('authenticated', ADMIN); const e3 = await fails(`select public.admin_delete_user('${ER3}')`);
const left = await rows(`select 'm:' || message t from public.contact_messages where lower(email) in ('er1@x.com', 'er2@x.com', 'er3@x.com') union all select 'a:' || company from public.contractor_applications where lower(email) in ('er1@x.com', 'er3@x.com') order by 1`);
check('4: erasure removes what is linked to the account, and what shares its address only when the account proved it and the row came after it',
  e1 === false && e2 === false && e3 === false && JSON.stringify(left.map((r) => r.t)) === JSON.stringify(['a:Another person', 'a:Auto Co', 'a:Old Co', 'm:after, but the account never confirmed the address', 'm:after, but the account was confirmed with no email sent', 'm:sent before the account existed']), `${e1} ${e2} ${e3} ${JSON.stringify(left)}`);

// ---------------------------------------------------------------------------------------------------------------
// 7 — the index
// ---------------------------------------------------------------------------------------------------------------
check('7: email_log has an index on (template, at)', /\(template, at\)/.test((await one(`select indexdef from pg_indexes where indexname = 'email_log_template_at_idx'`))?.indexdef || ''));

// ---------------------------------------------------------------------------------------------------------------
// 8 — thirty team alerts an hour
// ---------------------------------------------------------------------------------------------------------------
await db.exec(`reset role; delete from public.alert_log; insert into public.alert_log (what, status) select 'alert ' || g, 'sent' from generate_series(1, 30) g;`);
const teamBefore = await n(`select count(*)::int n from public.sent where to_addr = 'support@tarmem.sa'`);
await as('anon'); await db.exec(`insert into public.contact_messages (name, email, message, lang) values ('Aa','flood1@x.com','one','en')`);
await as('anon'); await db.exec(`insert into public.contact_messages (name, email, message, lang) values ('Bb','flood2@x.com','two','en')`);
check('8: after 30 alert emails in an hour the next ones are skipped, and the skip is logged once',
  (await n(`select count(*)::int n from public.sent where to_addr = 'support@tarmem.sa'`)) === teamBefore && (await n(`select count(*)::int n from public.alert_log where status = 'skipped'`)) === 1);
const skipRow = await one(`select what, detail from public.alert_log where status = 'skipped'`);
check('8: …that one row counts what was held back', /^2 alerts not emailed: 30 alert emails in the last hour/.test(skipRow.detail), JSON.stringify(skipRow));
await db.exec(`reset role; select public.send_alert('ملخص اليوم في ترميم — اختبار', array['سطر'], true); select public.send_alert('وقّع صاحب المنزل اتفاقية — اختبار', array['سطر'], true);`);
check('8: an alert the team must never miss (the daily summary, a signed agreement: priority) still goes out past the 30, and is logged "sent" as priority',
  (await n(`select count(*)::int n from public.sent where to_addr = 'support@tarmem.sa'`)) === teamBefore + 2 && (await n(`select count(*)::int n from public.alert_log where status = 'sent' and priority`)) === 2);
await db.exec(`reset role; update public.alert_log set at = at - interval '2 hours';`);
await as('anon'); await db.exec(`insert into public.contact_messages (name, email, message, lang) values ('Cc','flood3@x.com','three','en')`);
check('8: once the hour has passed, alerts go out again', (await n(`select count(*)::int n from public.sent where to_addr = 'support@tarmem.sa'`)) === teamBefore + 3);
await db.exec(`reset role; delete from public.alert_log; insert into public.alert_log (what, status) select 'alert ' || g, 'sent' from generate_series(1, 29) g;
  insert into public.alert_log (what, status, priority) select 'priority ' || g, 'sent', true from generate_series(1, 5) g;`);
await as('anon'); await db.exec(`insert into public.contact_messages (name, email, message, lang) values ('Dd','flood4@x.com','four','en')`);
check('8: priority alerts do not use up the hour: with 29 ordinary and 5 priority sent, the next ordinary alert still goes out',
  (await n(`select count(*)::int n from public.sent where to_addr = 'support@tarmem.sa'`)) === teamBefore + 4 && (await n(`select count(*)::int n from public.alert_log where status = 'skipped'`)) === 0);

// ---------------------------------------------------------------------------------------------------------------
// 9 — the public forms, per network address
// ---------------------------------------------------------------------------------------------------------------
let seq = 0;
const resetForms = () => db.exec(`reset role; update public.contact_messages set created_at = created_at - interval '1 day'; update public.contractor_applications set created_at = created_at - interval '1 day'; delete from public.form_hits;`);
const contact = async (headers) => { await as('anon', '', headers); seq++; return fails(`insert into public.contact_messages (name, email, message, lang) values ('Sender ${seq}', 'sender${seq}@x.com', 'hello', 'en')`); };
const tenThenEleventh = async (headers) => { const out = []; for (let i = 0; i < 11; i++) out.push(await contact(headers)); return out; };
await resetForms();
let r = await tenThenEleventh({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '203.0.113.7' });
check('9: ten contact messages an hour from one address (different senders) pass, the eleventh is refused with "too many"', r.slice(0, 10).every((e) => e === false) && /too many: ten in an hour from the same network/.test(r[10] || ''), r[10]);
const spoof = await contact({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.1, 203.0.113.7' });
check('9: a made-up x-forwarded-for does not escape it: cf-connecting-ip (set by Cloudflare) is read first', /too many/.test(spoof || ''), spoof);
check('9: another address is not affected', (await contact({ 'cf-connecting-ip': '203.0.113.8' })) === false);
await as('anon', '', { 'cf-connecting-ip': '203.0.113.7' });
check('9: the two forms count separately: the same address can still apply as a contractor', (await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades) values ('Net Co','Net','0588888882','net@x.com','riyadh',array['kitchen'])`)) === false);
await resetForms();
r = [];
for (let i = 0; i < 11; i++) r.push(await contact({ 'x-forwarded-for': `10.0.${i}.1, 203.0.113.9`, 'x-real-ip': `10.1.${i}.1` }));
check('9: without cf-connecting-ip, a made-up first x-forwarded-for entry and a made-up x-real-ip, new on every request, do not escape it (the last x-forwarded-for entry counts)',
  r.slice(0, 10).every((e) => e === false) && /too many: ten in an hour from the same network/.test(r[10] || ''), r[10]);
await resetForms();
for (let i = 0; i < 10; i++) await contact({ 'x-forwarded-for': '203.0.113.12', 'x-real-ip': '198.51.100.8' });
const realIpVictim = await contact({ 'x-forwarded-for': '198.51.100.8' });
check("9: an x-real-ip the visitor wrote is never read: sending a victim's address there does not use up the victim's allowance", realIpVictim === false, realIpVictim);
await resetForms();
r = [];
for (let i = 0; i < 11; i++) r.push(await contact({ 'x-forwarded-for': `10.0.${i}.1, 192.0.2.44` }));
check('9: …and with x-forwarded-for alone, its LAST entry (the one the proxy appended) counts, never the first the visitor wrote',
  r.slice(0, 10).every((e) => e === false) && /too many/.test(r[10] || ''), r[10]);
await resetForms();
for (let i = 0; i < 10; i++) await contact({ 'x-forwarded-for': '198.51.100.7, 203.0.113.11' });
const victim = await contact({ 'x-forwarded-for': '198.51.100.7' });
check("9: writing a victim's address first does not use up the victim's allowance", victim === false, victim);
await resetForms();
r = [];
for (let i = 0; i < 11; i++) r.push(await contact({ 'cf-connecting-ip': `2001:db8:1:2::${(i + 1).toString(16)}` }));
check('9: an IPv6 address counts by its /64', r.slice(0, 10).every((e) => e === false) && /too many/.test(r[10] || ''), r[10]);
check('9: no network address is stored: only one-hour salted hashes', (await n(`select count(*)::int n from public.form_hits where client !~ '^[0-9a-f]{64}$' or client like '%203.0%' or client like '%2001:%'`)) === 0
  && (await n(`select count(*)::int n from public.form_hits`)) > 0);
await resetForms();
r = await tenThenEleventh({ 'x-forwarded-for': 'unknown' });
const noHeaders = await tenThenEleventh(null);
check('9: with no usable address (a malformed header, or none at all) the forms behave as before 029', r.every((e) => e === false) && noHeaders.every((e) => e === false), `${r.find(Boolean)} ${noHeaders.find(Boolean)}`);
await db.exec(`reset role; update public.form_hits set at = at - interval '2 hours';`);
await contact({ 'cf-connecting-ip': '203.0.113.99' });
check('9: …and older hashes are cleared as new ones arrive', (await n(`select count(*)::int n from public.form_hits`)) === 1);
await resetForms();
await db.exec(`reset role; alter table public.contact_messages disable trigger user;
  insert into public.contact_messages (name, email, message, lang) select 'Bulk ' || g, 'bulk' || g || '@x.com', 'hello', 'en' from generate_series(1, 119) g;
  alter table public.contact_messages enable trigger user;`);
const c120 = await contact({ 'cf-connecting-ip': '203.0.113.50' });
const c121 = await contact({ 'cf-connecting-ip': '203.0.113.51' });
check('9: the overall ceiling is now 120 in ten minutes (it was 40): the 120th passes, the 121st waits', c120 === false && /too many right now/.test(c121 || ''), `${c120} | ${c121}`);
await resetForms();

// ---------------------------------------------------------------------------------------------------------------
// 10 — the visit log
// ---------------------------------------------------------------------------------------------------------------
await as('anon');
const flood = await fails(`insert into public.visits (session_id, event, route, path, lang, device) select 'flood000001', 'view', 'home', '/', 'ar', 'mobile' from generate_series(1, 250)`);
check('10: a visit code keeps at most 200 rows an hour; the rest are dropped without an error', flood === false && (await n(`select count(*)::int n from public.visits where session_id = 'flood000001'`)) === 200, flood);
await as('anon');
const more = await fails(`insert into public.visits (session_id, event, route, path, lang, device) values ('flood000001','view','home','/','ar','mobile')`);
await as('anon');
await db.exec(`insert into public.visits (session_id, event, route, path, lang, device) values ('calm0000001','view','home','/','ar','mobile')`);
check('10: …another visit code is not affected', more === false && (await n(`select count(*)::int n from public.visits where session_id = 'flood000001'`)) === 200 && (await n(`select count(*)::int n from public.visits where session_id = 'calm0000001'`)) === 1);
await db.exec(`reset role; update public.visits set created_at = created_at - interval '2 hours' where session_id = 'flood000001'`);
await as('anon'); await db.exec(`insert into public.visits (session_id, event, route, path, lang, device) values ('flood000001','view','home','/','ar','mobile')`);
check('10: …and after an hour the code records again', (await n(`select count(*)::int n from public.visits where session_id = 'flood000001'`)) === 201);
await as('anon', '', { 'cf-connecting-ip': '203.0.113.60' });
const rotating = await fails(`insert into public.visits (session_id, event, route, path, lang, device) select 'netv' || lpad(g::text, 7, '0'), 'view', 'home', '/', 'ar', 'mobile' from generate_series(1, 650) g`);
check('10: a new visit code on every row does not escape it: one network address adds at most 600 rows an hour, the rest are dropped without an error',
  rotating === false && (await n(`select count(*)::int n from public.visits where session_id like 'netv%'`)) === 600, rotating);
await as('anon', '', { 'cf-connecting-ip': '203.0.113.61' });
await db.exec(`insert into public.visits (session_id, event, route, path, lang, device) values ('othernet001','view','home','/','ar','mobile')`);
check('10: …another address is not affected, and the addresses are kept only as one-hour salted hashes',
  (await n(`select count(*)::int n from public.visits where session_id = 'othernet001'`)) === 1 && (await n(`select count(*)::int n from public.form_hits where form = 'visits' and client !~ '^[0-9a-f]{64}$'`)) === 0);

// ---------------------------------------------------------------------------------------------------------------
// 11 — storage
// ---------------------------------------------------------------------------------------------------------------
const put = async (who, path, bucket = 'project-files') => { await as('authenticated', who); return fails(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, path]); };
const del = async (who, path, bucket = 'project-files') => { await as('authenticated', who); return (await db.query(`delete from storage.objects where bucket_id = $1 and name = $2 returning id`, [bucket, path])).rows.length; };
const puts = [];
for (let i = 1; i <= 41; i++) puts.push(await put(HO3, `${HO3}/${PH3.id}/photo-${i}.jpg`));
check("11: a homeowner adds up to 40 files to a project's folder; the 41st is refused", puts.slice(0, 40).every((e) => e === false) && /row-level security/.test(puts[40] || ''), puts[40]);
for (let i = 1; i <= 40; i++) await put(HO2, `${HO2}/${P2.id}/photo-${i}.jpg`);
check("11: the awarded contractor's stage evidence counts separately: the homeowner's 40 photos do not block it", (await put(CO2, `${HO2}/${P2.id}/stage-0/photo-1.jpg`)) === false);
check('11: a file uploaded by someone else, under their id, cannot be deleted by another person', (await del(HO2, `${HO3}/${PH3.id}/photo-1.jpg`)) === 0 && (await del(CO2, `${HO2}/${P2.id}/photo-1.jpg`)) === 0);
check("11: the homeowner cannot delete the contractor's stage evidence, and the contractor cannot delete it once it is in the homeowner's folder",
  (await del(HO2, `${HO2}/${P2.id}/stage-0/photo-1.jpg`)) === 0 && (await del(CO2, `${HO2}/${P2.id}/stage-0/photo-1.jpg`)) === 0);
check('11: while the project is in progress, even its homeowner cannot delete its photos (they are the record of the work)', (await del(HO2, `${HO2}/${P2.id}/photo-1.jpg`)) === 0);
check('11: a homeowner deletes their own file from a project that is not in progress', (await del(HO3, `${HO3}/${PH3.id}/photo-1.jpg`)) === 1);
await as('authenticated', CO); await db.exec(`insert into public.portfolio (path, caption) values ('${CO}/one.jpg', 'x')`);
check('11: a verified contractor adds portfolio photos', (await put(CO, `${CO}/one.jpg`, 'portfolio')) === false && (await put(CO, `${CO}/two.jpg`, 'portfolio')) === false);
await as('anon');
const anonSees = (await db.query(`select (select count(*)::int from storage.objects where bucket_id = 'portfolio') o, (select count(*)::int from public.portfolio) c`)).rows[0];
check('12: a visitor still reads portfolio photos and their captions', anonSees.o === 2 && anonSees.c >= 1, JSON.stringify(anonSees));
check('11: a contractor deletes their own portfolio photo; nobody else can', (await del(HO, `${CO}/two.jpg`, 'portfolio')) === 0 && (await del(CO, `${CO}/two.jpg`, 'portfolio')) === 1);

// "delete my account" as the site does it: its own files first (session.ts deleteMyAccount), then the database
await as('authenticated', HO3);
const mine = (await db.query(`select name from storage.objects where bucket_id = 'project-files' and name like '${HO3}/%'`)).rows.map((x) => x.name);
await as('authenticated', HO3);
const removed = (await db.query(`delete from storage.objects where bucket_id = 'project-files' and name = any($1) returning id`, [mine])).rows.length;
await as('authenticated', HO3);
const gone = await fails(`select public.delete_my_account()`);
check("11/12: \"delete my account\" works as the site does it: the person's own files first, then the account", mine.length === 39 && removed === 39 && gone === false
  && (await one(`select deleted_at is not null d from public.profiles where id = '${HO3}'`)).d === true, `${mine.length} ${removed} ${gone}`);

// an awarded project's record outlives an erasure: HO2's P2 (awarded to CO2) is finished, then HO2 deletes the account
await as('authenticated', HO2);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('مجلس','gypsum','سقف','riyadh',8000,12000,'month')`);
const P2b = await one(`select id from public.projects where owner_id = '${HO2}' and status = 'open' order by created_at desc limit 1`);
await put(HO2, `${HO2}/${P2b.id}/photo-1.jpg`);
await as('authenticated', CO); await db.exec(`insert into public.bids (project_id, price, days) values ('${P2b.id}', 9000, 10)`);
await as('authenticated', HO2); await db.exec(`insert into public.project_messages (project_id, contractor_id, body) values ('${P2.id}', '${CO2}', 'awarded thread: the tiles are cracked'), ('${P2b.id}', '${CO}', 'open thread: when can you visit?')`);
await as('authenticated', CO2); await db.exec(`insert into public.project_messages (project_id, contractor_id, body) values ('${P2.id}', '${CO2}', 'awarded thread: we will fix them')`);
await db.exec(`reset role; update public.projects set status = 'completed' where id = '${P2.id}'`);
check("11: after an awarded project ends, its homeowner still cannot delete its photos (the record of the work); in a project never awarded they can",
  (await del(HO2, `${HO2}/${P2.id}/photo-2.jpg`)) === 0 && (await del(HO2, `${HO2}/${P2b.id}/photo-1.jpg`)) === 1);
await put(HO2, `${HO2}/${P2b.id}/photo-2.jpg`);
await as('authenticated', HO2);
const erasedHo2 = await fails(`select public.delete_my_account()`);
const kept = await one(`select
  (select count(*)::int from storage.objects where name like '${HO2}/${P2.id}/%' and name not like '%/stage-%') ho_files,
  (select count(*)::int from storage.objects where name like '${HO2}/${P2.id}/stage-%') stage_files,
  (select count(*)::int from storage.objects where name like '${HO2}/${P2b.id}/%') open_files,
  (select string_agg(body, ' | ' order by id) from public.project_messages where project_id in ('${P2.id}', '${P2b.id}')) msgs`);
check("4/11: erasing the homeowner keeps the awarded project's record — their photos in it, the contractor's stage evidence, and both sides' messages in its thread; what belonged to a project never awarded goes",
  erasedHo2 === false && kept.ho_files === 40 && kept.stage_files === 1 && kept.open_files === 0 && kept.msgs === 'awarded thread: the tiles are cracked | awarded thread: we will fix them', `${erasedHo2} ${JSON.stringify(kept)}`);

// a few more signed-in flows, after all of the above
await as('authenticated', CO); const perf = await fails(`select public.my_performance()`);
await as('authenticated', ADMIN); const rec = await fails(`select public.wa_reconcile()`);
await as('authenticated', ADMIN); const ana = await fails(`select public.admin_analytics('week')`);
check('12: signed-in functions still answer: a contractor\'s performance, the console\'s analytics and delivery reconcile', perf === false && rec === false && ana === false, `${perf} | ${rec} | ${ana}`);
check('the number of row rules only grew by the one new delete rule', (await n(`select count(*)::int n from pg_policies`)) === policiesBefore + 1);

console.log(results.join('\n'));
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
