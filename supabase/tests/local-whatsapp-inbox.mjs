/* 026 (WhatsApp replies reach the team; delivery updates reach the log) in a private Postgres, with the providers imitated. See local.mjs. */
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
const twentythree = readFileSync(repo + '023_test_allowance.sql', 'utf8');
await db.exec(twentythree); await db.exec(twentythree);

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

import { createHmac } from 'node:crypto';
await db.exec(readFileSync(repo + '024_auth_emails.sql', 'utf8'));
await db.exec(readFileSync(repo + '025_advisor_fixes.sql', 'utf8'));
// the providers imitated, now also keeping each request's address, and giving Meta's message ids
await db.exec(`alter table public.sent add column if not exists url text;
  create or replace function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ declare rid bigint := nextval('net.req_seq'); begin
    insert into public.sent (to_addr, subject, html, raw, url) values (
      case when url like 'https://graph.facebook.com/%/messages' then 'wa:' || (body->>'to') when url like 'https://graph.facebook.com/%' then 'meta:' || url else body->'to'->>0 end,
      coalesce(body->'template'->>'name', body->>'subject', body->'text'->>'body'), body->>'html', body::text, url);
    insert into net._http_response (id, status_code, content) values (rid, 200,
      case when url like '%/messages' then '{"messaging_product":"whatsapp","messages":[{"id":"wamid.OUT' || rid || '"}]}' else '{"success":true}' end);
    return rid; end; $$;`);
const twentysix = readFileSync(repo + '026_whatsapp_inbox.sql', 'utf8');
await db.exec(twentysix);
const second = await db.exec(twentysix);
check('026 runs cleanly, twice, and says the app secret is not saved yet', second[second.length - 1].rows[0].app_secret_saved === false);

const SECRET = '0123456789abcdef0123456789abcdef';
const PHONE = '1377051788817873';
const sign = (raw, secret = SECRET) => 'sha256=' + createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
const metaJson = (obj) => JSON.stringify(obj).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')); // Meta escapes non-ASCII
const event = (value, phone = PHONE) => metaJson({ object: 'whatsapp_business_account', entry: [{ id: '2162520270999056', changes: [{ field: 'messages', value: { messaging_product: 'whatsapp', metadata: { display_phone_number: '966534507400', phone_number_id: phone }, ...value } }] }] });
let seq = 0;
const message = (from, name, fields) => ({ contacts: [{ profile: { name }, wa_id: from }], messages: [{ from, id: `wamid.IN${++seq}`, timestamp: String(Math.floor(Date.now() / 1000)), ...fields }] });
const hook = async (raw, signature = sign(raw)) => { await as('anon'); const r = (await db.query('select public.wa_webhook($1, $2) r', [raw, signature])).rows[0].r; await db.exec('reset role'); return r; };
const sentTo = (to) => n(`select count(*)::int n from public.sent where to_addr = '${to}'`);

// before the owner's step
const early = await hook(event(message('966511111111', 'Sara', { type: 'text', text: { body: 'hi' } })), 'sha256=00');
check('before the app secret is saved, events are refused as "not configured" (Meta retries later)', early.ok === false && early.error === 'not configured', JSON.stringify(early));
check('a pasted value that is not an app secret is refused with a sentence', /32 letters and digits/.test(await fails(`select public.set_wa_app_secret('EAAxxxxx not the secret')`) || ''));
await db.exec('delete from public.sent');
const saved = (await one(`select public.set_wa_app_secret(' ${SECRET.toUpperCase()} ') v`)).v;
const subs = await rows(`select url, raw from public.sent where url like 'https://graph.facebook.com/%' order by id`);
check('saving the app secret asks Meta for both subscriptions: our address for the app, the app for the WhatsApp account', /saved/.test(saved) && subs.length === 2
  && subs[0].url.endsWith('/1603887434608417/subscriptions') && /"callback_url": "https:\/\/www.tarmem.sa\/api\/wa-webhook"/.test(subs[0].raw) && /"verify_token": "tarmem-whatsapp-webhook"/.test(subs[0].raw)
  && subs[0].raw.includes(`"access_token": "1603887434608417|${SECRET}"`) && subs[1].url.endsWith('/2162520270999056/subscribed_apps'), saved + ' | ' + JSON.stringify(subs.map((s) => s.url)));

// the signature, computed by Postgres, matches Node's (and so Meta's)
const hm = async (key, msg) => (await db.query(`select encode(public.hmac_sha256(convert_to($1, 'UTF8'), convert_to($2, 'UTF8')), 'hex') h`, [key, msg])).rows[0].h;
const longKey = 'k'.repeat(100);
check('HMAC-SHA256 in the database equals Node’s, for a short key, a key over 64 bytes, and Arabic text',
  (await hm(SECRET, 'hello')) === createHmac('sha256', SECRET).update('hello').digest('hex') && (await hm(longKey, 'مرحبا {"a":1}')) === createHmac('sha256', longKey).update('مرحبا {"a":1}').digest('hex'));

// 1 — a customer writes
await db.exec('delete from public.sent');
const first = event(message('966511111111', 'Sara', { type: 'text', text: { body: 'متى يبدأ العمل في المطبخ؟' } }));
let r = await hook(first);
const row = await one(`select * from public.wa_inbox order by id desc limit 1`);
check('a signed message is kept: the words, the number, the WhatsApp name, and the customer’s account', r.ok === true && r.messages === 1 && row.body === 'متى يبدأ العمل في المطبخ؟'
  && row.from_number === '966511111111' && row.name === 'Sara' && row.profile_id === HO && row.kind === 'text', JSON.stringify(r) + ' ' + JSON.stringify(row).slice(0, 200));
const mail = await one(`select subject, html from public.sent where to_addr = 'support@tarmem.sa' order by id desc limit 1`);
check('…emailed to the team, with the account’s name, the number and the words', /سارة العتيبي/.test(mail?.subject || '') && (mail?.html || '').includes('متى يبدأ العمل') && (mail?.html || '').includes('+966 51 111 1111') && Boolean(row.emailed_at), mail?.subject);
const reply = await one(`select subject, raw from public.sent where to_addr = 'wa:966511111111' order by id desc limit 1`);
check('…and answered once, in Arabic, with a plain text message saying it arrived', /وصلت إلى فريق ترميم/.test(reply?.subject || '') && /"type": "text"/.test(reply?.raw || '') && Boolean(row.replied_at), reply?.subject);
const beforeRetry = await n(`select count(*)::int n from public.sent`);
r = await hook(first);
check('Meta sending the same event again changes nothing: no second row, email or reply', r.ok === true && r.messages === 0 && (await n(`select count(*)::int n from public.wa_inbox`)) === 1 && (await n(`select count(*)::int n from public.sent`)) === beforeRetry);
r = await hook(event(message('966511111111', 'Sara', { type: 'text', text: { body: 'وأيضًا الحمام' } })));
check('a second message the same day is kept and emailed, but not answered again', r.messages === 1 && (await sentTo('wa:966511111111')) === 1 && (await n(`select count(*)::int n from public.sent where to_addr = 'support@tarmem.sa'`)) === 2);

// 2 — a stranger writes in English, reacts, sends a photo; another number's events are not ours
r = await hook(event(message('966500000099', 'John', { type: 'text', text: { body: 'Hello, do you work in Jeddah?' } })));
const en = await one(`select subject from public.sent where to_addr = 'wa:966500000099' order by id desc limit 1`);
const strangerMail = await one(`select subject from public.sent where to_addr = 'support@tarmem.sa' order by id desc limit 1`);
check('someone without an account writing in English gets the English reply; the email names them by their WhatsApp name', /reached the Tarmem team/.test(en?.subject || '')
  && /John/.test(strangerMail?.subject || '') && (await one(`select profile_id from public.wa_inbox order by id desc limit 1`)).profile_id === null, en?.subject);
const sentBefore = await n(`select count(*)::int n from public.sent`);
r = await hook(event(message('966500000099', 'John', { type: 'reaction', reaction: { message_id: 'wamid.OUT1', emoji: '👍' } })));
check('a reaction is kept, but neither emailed nor answered', r.messages === 1 && (await n(`select count(*)::int n from public.sent`)) === sentBefore && (await one(`select body from public.wa_inbox order by id desc limit 1`)).body === '👍');
r = await hook(event(message('966544444444', 'Khalid', { type: 'image', image: { id: 'media1', caption: 'صورة الجدار بعد الدهان', mime_type: 'image/jpeg' } })));
const photoMail = await one(`select html from public.sent where to_addr = 'support@tarmem.sa' order by id desc limit 1`);
check('a photo is kept with its caption, and the email says it is a photo', (await one(`select kind, body from public.wa_inbox order by id desc limit 1`)).body === 'صورة الجدار بعد الدهان' && (photoMail?.html || '').includes('صورة'));
r = await hook(event(message('966511111111', 'Sara', { type: 'text', text: { body: 'other number' } }), '999999999999'));
check('an event for another phone number on the account is ignored', r.ok === true && r.messages === 0);

// 3 — the lock
const inboxBefore = await n(`select count(*)::int n from public.wa_inbox`);
const forged = event(message('966511111111', 'Sara', { type: 'text', text: { body: 'forged' } }));
r = await hook(forged, sign(forged, 'ffffffffffffffffffffffffffffffff'));
const r2 = await hook(forged, 'sha256=deadbeef');
check('a call signed with another secret, or not signed at all, is refused and changes nothing', r.ok === false && r.error === 'signature' && r2.error === 'signature' && (await n(`select count(*)::int n from public.wa_inbox`)) === inboxBefore);
check('…and the team sees one line about it in the log, not one per attempt', (await n(`select count(*)::int n from public.email_log where template = 'wa_webhook' and status = 'failed'`)) === 1);

// 4 — our messages report back
await db.exec(`reset role; delete from public.email_log where template = 'wa_test';`);
await as('authenticated', HO3);
await db.exec(`select public.whatsapp_test()`);
await db.exec('reset role');
await rows(`select public.wa_reconcile()`);
const test = await one(`select id, wamid, answer from public.email_log where template = 'wa_test' order by id desc limit 1`);
check('a message we send keeps Meta’s id for it once Meta has answered', /^wamid\.OUT\d+$/.test(test?.wamid || '') && test.answer === 'accepted', JSON.stringify(test));
const statuses = (list) => event({ statuses: list.map(([id, status, extra]) => ({ id, status, timestamp: String(Math.floor(Date.now() / 1000)), recipient_id: '966533333333', ...(extra || {}) })) });
r = await hook(statuses([[test.wamid, 'delivered'], [test.wamid, 'read'], [test.wamid, 'sent']]));
check('delivered, then read, then a late "sent": the row says read', r.statuses === 3 && (await one(`select delivery from public.email_log where id = ${test.id}`)).delivery === 'read');
await as('authenticated', HO2);
await db.exec(`select public.whatsapp_test()`);
await db.exec('reset role');
await rows(`select public.wa_reconcile()`);
const lost = await one(`select id, wamid from public.email_log where template = 'wa_test' order by id desc limit 1`);
await hook(statuses([[lost.wamid, 'failed', { errors: [{ code: 131026, title: 'Message undeliverable', error_data: { details: 'The number is not on WhatsApp' } }] }]]));
const failedRow = await one(`select delivery, delivery_detail from public.email_log where id = ${lost.id}`);
check('a message Meta could not deliver says so, with Meta’s code and reason', failedRow.delivery === 'failed' && /131026/.test(failedRow.delivery_detail) && /Message undeliverable/.test(failedRow.delivery_detail), JSON.stringify(failedRow));
await hook(statuses([['wamid.EARLY', 'delivered']]));
await db.exec(`insert into net._http_response (id, status_code, content) values (9001, 200, '{"messages":[{"id":"wamid.EARLY"}]}');
  insert into public.email_log (recipient, template, status, channel, request_id) values ('966522222222', 'new_bid', 'sent', 'whatsapp', 9001);`);
await rows(`select public.wa_reconcile()`);
check('an update that arrives before Meta’s answer is kept and applied when the answer comes', (await one(`select delivery from public.email_log where request_id = 9001`)).delivery === 'delivered');

// 5 — who may see and call what
const readAs = async (role, sub) => { await as(role, sub); try { return (await db.query(`select count(*)::int n from public.wa_inbox`)).rows[0].n; } catch { return 'refused'; } finally { await db.exec('reset role'); } };
check('only admins read the WhatsApp messages', (await readAs('anon', '')) === 'refused' && (await readAs('authenticated', HO)) === 0 && (await readAs('authenticated', ADMIN)) >= 5);
const can = async (role, fn) => (await one(`select has_function_privilege('${role}', '${fn}', 'execute') ok`)).ok;
check('the webhook is the only new door, open to the site’s key; the secret, sending and signing stay closed',
  await can('anon', 'public.wa_webhook(text, text)') && !(await can('authenticated', 'public.wa_webhook(text, text)')) && !(await can('anon', 'public.set_wa_app_secret(text)'))
  && !(await can('anon', 'public.wa_send_text(text, text, text)')) && !(await can('anon', 'public.hmac_sha256(bytea, bytea)')) && !(await can('anon', 'public.wa_setup_webhook(text, text)'))
  && !(await can('anon', 'public.wa_inbox_forget()')));
const loose = await rows(`select p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.prokind = 'f' and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')`);
check('025’s rules still hold: every function has a fixed search_path', loose.length === 0, loose.map((x) => x.proname).join(', '));

// 6 — erasure
await db.exec(`select public.erase_account('${HO}')`);
check('erasing an account erases its WhatsApp messages, and only its own', (await n(`select count(*)::int n from public.wa_inbox where from_number = '966511111111'`)) === 0 && (await n(`select count(*)::int n from public.wa_inbox where from_number = '966500000099'`)) === 2);

console.log(results.join('\n'));
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
