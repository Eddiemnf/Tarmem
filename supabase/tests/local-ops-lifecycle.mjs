/* 030 (operations and the project lifecycle: team alerts, the daily summary, customers' emails, finishing a project
   while payments are off, admins reading project messages, claiming an application after email confirmation) in a
   private Postgres, with the providers, the storage service and PostgREST's request headers imitated.
   Run from the repo root: node supabase/tests/local-ops-lifecycle.mjs (see local.mjs). */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../web/package.json', import.meta.url));
const { PGlite } = require('@electric-sql/pglite');
const { pgcrypto } = require('@electric-sql/pglite/contrib/pgcrypto');
const repo = new URL('../', import.meta.url).pathname;
const db = new PGlite({ extensions: { pgcrypto } });
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 300) : ''}`);
const fails = async (sql, params) => { try { if (params) await db.query(sql, params); else await db.exec(sql); return false; } catch (e) { return String(e.message || e); } };

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
  '026_whatsapp_inbox.sql', '027_change_requests.sql', '028_erasure_cleanup.sql', '029_launch_hardening.sql']) await db.exec(readFileSync(repo + f, 'utf8'));

const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), HO2 = U('b2'), HO3 = U('b3'), HO4 = U('b4'), CO = U('c1'), CO2 = U('c2'), CO3 = U('c3'), DEC = U('d1'), HOX = U('d2');
const NEWCO = U('f1'), PENDING = U('f2'), CONFIRMED = U('f3'), LATECO = U('f4');
await db.exec(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at) values
    ('${ADMIN}','o@t.sa','h0',now(),now()),('${HO}','sara@x.com','h1',now(),now()),('${HO2}','hind@x.com','h2',now(),now()),('${HO3}','noura@x.com','h3',now(),now()),('${HO4}','reem@x.com','h4',now(),now()),
    ('${CO}','co@x.com','h5',now(),now()),('${CO2}','co2@x.com','h6',now(),now()),('${CO3}','co3@x.com','h7',now(),now()),('${DEC}','dec@x.com','h8',now(),now()),('${HOX}','newco@x.com','h9',now(),now());
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),
    ('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${HO2}','homeowner','Hind','0522222222','riyadh',null,'en'),('${HO3}','homeowner','نورة','0533333333','riyadh',null,'ar'),
    ('${HO4}','homeowner','ريم','0534444444','riyadh',null,'ar'),
    ('${CO}','contractor','Khalid','0544444444','riyadh','مؤسسة البناء المتقن','ar'),('${CO2}','contractor','Fahad','0555555555','riyadh','Build Co','en'),('${CO3}','contractor','Saad','0566666666','riyadh','Saad Co','ar'),
    ('${DEC}','contractor','Dec','0577777777','riyadh','Dec Co','en'),('${HOX}','homeowner','Same Email','0578888888','riyadh',null,'ar');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values
    ('مؤسسة البناء المتقن','Khalid','0544444444','co@x.com','riyadh',array['kitchen'],'${CO}','verified'),('Build Co','Fahad','0555555555','co2@x.com','riyadh',array['kitchen'],'${CO2}','verified'),
    ('Saad Co','Saad','0566666666','co3@x.com','riyadh',array['kitchen'],'${CO3}','verified');`);
await db.exec(`select set_config('tarmem.now', '2026-09-28 12:00:00+03', false)`); // WhatsApp's quiet hours: noon in Riyadh

// ---------------------------------------------------------------------------------------------------------------
// 030 itself
// ---------------------------------------------------------------------------------------------------------------
const thirty = readFileSync(repo + '030_ops_lifecycle.sql', 'utf8');
const first = await db.exec(thirty);
const second = await db.exec(thirty);
const tally = second[second.length - 1].rows[0];
check('030 runs cleanly, twice, on top of 001–029 (pg_cron absent: it only notes that)', first.length > 0 && second.length > 0 && tally.pg_cron_installed === false);
check('its last line: visitors may still call exactly is_admin, mobile_taken and wa_webhook; every function keeps a fixed search_path',
  tally.visitors_may_call === 'is_admin, mobile_taken, wa_webhook' && Number(tally.no_search_path) === 0, JSON.stringify(tally, (k, v) => typeof v === 'bigint' ? Number(v) : v));

const as = async (role, sub, headers) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false);`);
  await db.query(`select set_config('request.headers', $1, false)`, [headers ? JSON.stringify(headers) : '']);
  await db.exec(`set role ${role};`);
};
const rows = async (sql, params) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.headers', '', false);`); return (await db.query(sql, params)).rows; };
const one = async (sql, params) => (await rows(sql, params))[0];
// the SQL editor: nobody signed in, no request headers
const asEditor = async (sql) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.headers', '', false);`); return db.exec(sql); };
const n = async (sql, params) => (await one(sql, params)).n;
const lastTo = (to) => one(`select * from public.sent where to_addr = $1 order by id desc limit 1`, [to]);
const allTo = (to) => rows(`select * from public.sent where to_addr = $1 order by id`, [to]);
const logged = (to, template) => n(`select count(*)::int n from public.email_log where lower(recipient) = lower($1) and template = $2`, [to, template]);
const alerts = () => rows(`select subject, html from public.sent where to_addr = 'support@tarmem.sa' order by id`);
const alertLike = async (start) => (await alerts()).filter((a) => a.subject.startsWith(start));
// a clean slate for what the providers received; the logs are moved two hours back so the hourly limits (30 team
// alerts, 20 emails per address) never interfere, while "once a day" rules and the failure check still see them
const fresh = () => asEditor(`delete from public.sent; update public.alert_log set at = at - interval '2 hours'; update public.email_log set at = at - interval '2 hours';`);
const can = async (role, fn) => (await one(`select has_function_privilege($1, $2, 'execute') ok`, [role, fn])).ok;
const EVIL = 'evil.example';

const post = async (who, title, trade, min = 40000, max = 60000) => {
  await as('authenticated', who);
  return (await db.query(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ($1, $2, 'وصف المشروع', 'riyadh', $3, $4, 'month') returning id, code`, [title, trade, min, max])).rows[0];
};
const bid = async (co, p, price, days = 30) => {
  await as('authenticated', co);
  await db.query(`insert into public.bids (project_id, price, days, note) values ($1, $2, $3, 'ok')`, [p.id, price, days]);
  return (await one(`select id from public.bids where project_id = $1 and contractor_id = $2`, [p.id, co])).id;
};
const hoSign = async (ho, bidId) => { await as('authenticated', ho); return fails(`select * from public.sign_agreement_homeowner($1)`, [bidId]); };
const coSign = async (co, p) => { await as('authenticated', co); return fails(`select * from public.sign_agreement_contractor($1)`, [p.id]); };
const status = async (p) => (await one(`select status from public.projects where id = $1`, [p.id])).status;
const setStatus = async (who, p, st, note) => { await as('authenticated', who); return fails(`select * from public.admin_set_project_status($1, $2, $3)`, [p?.id ?? p, st, note ?? null]); };
const confirmDone = async (who, p) => { await as('authenticated', who); return fails(`select * from public.homeowner_confirm_complete($1)`, [p.id]); };
const coConfirmDone = async (who, p) => { await as('authenticated', who); return fails(`select * from public.contractor_confirm_complete($1)`, [p.id]); };

// ---------------------------------------------------------------------------------------------------------------
// who may call what
// ---------------------------------------------------------------------------------------------------------------
const rpcs = ['public.admin_set_project_status(uuid, text, text)', 'public.homeowner_confirm_complete(uuid)', 'public.contractor_confirm_complete(uuid)', 'public.claim_my_application()'];
const internal = ['public.ops_daily_digest()', 'public.send_email_bilingual(text, text, text, text, text, text[], text, text, text[], text)', 'public.ops_events()', 'public.notify_people()',
  'public.project_confirm_done(uuid, text)', 'public.receipt_allowed(text, text)', 'public.email_proven(uuid)', 'public.send_alert(text, text[], boolean)'];
const wrong = [];
for (const f of rpcs) { if (await can('anon', f)) wrong.push('anon:' + f); if (!(await can('authenticated', f))) wrong.push('not authenticated:' + f); }
for (const f of internal) { if (await can('anon', f)) wrong.push('anon:' + f); if (await can('authenticated', f)) wrong.push('authenticated:' + f); }
check('the four new RPCs are for signed-in people only; the summary, the helpers and the triggers are callable by nobody through the API', wrong.length === 0, wrong.join(', '));
await as('anon');
const anonClaim = await fails(`select * from public.claim_my_application()`);
await as('anon');
const anonDone = await fails(`select * from public.homeowner_confirm_complete('${U('00')}')`);
check('…a visitor calling one is told "permission denied"', /permission denied/.test(anonClaim || '') && /permission denied/.test(anonDone || ''), `${anonClaim} | ${anonDone}`);
const inv = await one(`select
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prorettype = 'trigger'::regtype and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) trig,
  (select count(*)::int from pg_policies where schemaname = 'public' and (qual ~ '(?<!SELECT )auth\\.(uid|jwt|role)\\(\\)' or with_check ~ '(?<!SELECT )auth\\.(uid|jwt|role)\\(\\)')) bare,
  (select count(*)::int from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and array_to_string((i.indkey::int2[])[0:array_length(c.conkey, 1) - 1], ',') = array_to_string(c.conkey, ','))) unindexed`);
check("025/029's rules still hold: no trigger function callable, no per-row auth.uid(), every link indexed", inv.trig === 0 && inv.bare === 0 && inv.unindexed === 0, JSON.stringify(inv));

// ---------------------------------------------------------------------------------------------------------------
// 2 — the daily summary, when nothing is waiting
// ---------------------------------------------------------------------------------------------------------------
await fresh();
const quiet = (await one(`select public.ops_daily_digest() d`)).d;
check('2: the daily summary sends nothing when all five counts are zero', quiet.sent === false && (await alerts()).length === 0
  && ['applications', 'contact_messages', 'unsigned_agreements', 'awarded', 'change_requests'].every((k) => quiet[k] === 0), JSON.stringify(quiet));

// ---------------------------------------------------------------------------------------------------------------
// 1 + 3 — an award: team alerts, and the bidders who were not chosen
// ---------------------------------------------------------------------------------------------------------------
await fresh();
const P1 = await post(HO, `اتصل على 0500000000 الآن ${EVIL}`, 'kitchen');
const posted = await lastTo('sara@x.com');
check('(029 unchanged) the "project posted" email still names the project by number and trade', posted && posted.subject === `نُشر مشروعك ${P1.code}: تصميم وترميم المطابخ` && !posted.html.includes(EVIL), posted && posted.subject);
const b1co = await bid(CO, P1, 52000, 30);
const b1co2 = await bid(CO2, P1, 50000, 25);
const b1co3 = await bid(CO3, P1, 55000, 35);
await as('authenticated', CO3); await db.query(`update public.bids set status = 'withdrawn' where id = $1`, [b1co3]);
await fresh();
const s1 = await hoSign(HO, b1co2);
const s2 = await hoSign(HO, b1co);   // the homeowner changes their mind before the contractor signs
let signedAlerts = await alertLike(`وقّع صاحب المنزل اتفاقية ${P1.code} — بانتظار توقيع المقاول`);
check('1: the homeowner signing (and moving to another bid) alerts the team each time, with the trade, value and company',
  s1 === false && s2 === false && signedAlerts.length === 2 && signedAlerts[0].html.includes('Build Co') && signedAlerts[0].html.includes('50,000')
  && signedAlerts[1].html.includes('مؤسسة البناء المتقن') && signedAlerts[1].html.includes('52,000') && signedAlerts[1].html.includes('تصميم وترميم المطابخ') && signedAlerts[1].html.includes('30 يوم'),
  `${s1} ${s2} ${signedAlerts.map((a) => a.subject).join(' | ')}`);
await fresh();
const s3 = await coSign(CO, P1);
const awardAlert = (await alertLike(`أُسند المشروع ${P1.code}: تصميم وترميم المطابخ بقيمة 52,000 ريال`))[0];
check('1: the contractor counter-signing alerts the team that the project is awarded: number, trade, value, contractor, next step',
  s3 === false && (await status(P1)) === 'active' && awardAlert && awardAlert.html.includes('مؤسسة البناء المتقن') && awardAlert.html.includes('موعد البدء'), `${s3} ${(await alerts()).map((a) => a.subject).join(' | ')}`);
const notChosen = await lastTo('co2@x.com');
check('3: the bidder not chosen is told, in their language, by number and trade only (bid_not_chosen)',
  notChosen && notChosen.subject === `Project ${P1.code} was awarded to another contractor` && notChosen.html.includes(`project ${P1.code} (Kitchens)`)
  && notChosen.html.includes('https://www.tarmem.sa/projects') && !notChosen.html.includes(EVIL) && !notChosen.html.includes('0500000000') && (await logged('co2@x.com', 'bid_not_chosen')) === 1,
  notChosen && `${notChosen.subject} ${notChosen.html.slice(0, 300)}`);
check('3: …the bidder who withdrew and the one who won get no such email', (await logged('co3@x.com', 'bid_not_chosen')) === 0 && (await logged('co@x.com', 'bid_not_chosen')) === 0);

// change requests: proposed, applied
await fresh();
await as('authenticated', CO);
const cr1 = await fails(`select * from public.change_request_create($1, 'بلاط إضافي للممر', 2000, 3)`, [P1.id]);
const crAlert = (await alertLike(`طلب تغيير CR-1 على المشروع ${P1.code}`))[0];
check('1: a change request alerts the team: who proposed it, the amount and days, the description', cr1 === false && crAlert && crAlert.html.includes('المقاول') && crAlert.html.includes('+2,000 ريال')
  && crAlert.html.includes('أيام إضافية: 3') && crAlert.html.includes('بلاط إضافي للممر'), crAlert && crAlert.html.slice(0, 400));
await as('authenticated', HO);
const cr1ok = await fails(`select * from public.change_request_approve((select id from public.change_requests where project_id = $1 and code = 'CR-1'))`, [P1.id]);
const crApplied = (await alertLike(`اعتُمد طلب التغيير CR-1 على المشروع ${P1.code}`))[0];
check('1: its approval alerts the team with the project\'s new value (the signed amount plus the change)', cr1ok === false && crApplied && crApplied.html.includes('قيمة المشروع الآن: 54,000 ريال')
  && (await one(`select amount from public.projects where id = $1`, [P1.id])).amount === 54000, crApplied && crApplied.html.slice(0, 400));
await fresh();
await as('authenticated', HO);
await db.query(`select * from public.change_request_create($1, 'إلغاء الدهان', -1000, 0)`, [P1.id]);
await as('authenticated', CO);
await db.query(`select * from public.change_request_approve((select id from public.change_requests where project_id = $1 and code = 'CR-2'))`, [P1.id]);
const cr2 = (await alertLike(`طلب تغيير CR-2`))[0];
const cr2ok = (await alertLike(`اعتُمد طلب التغيير CR-2`))[0];
check('1: …a reduction proposed by the homeowner reads "-1,000" and "صاحب المنزل", and the value after it is right', cr2 && cr2.html.includes('-1,000 ريال') && cr2.html.includes('صاحب المنزل')
  && cr2ok && cr2ok.html.includes('قيمة المشروع الآن: 53,000 ريال'), `${cr2 && cr2.html.slice(0, 300)} | ${cr2ok && cr2ok.html.slice(0, 300)}`);

// ---------------------------------------------------------------------------------------------------------------
// 1 + 3 — a homeowner withdraws an open project (the site's own update)
// ---------------------------------------------------------------------------------------------------------------
const P2 = await post(HO2, `Win a prize at ${EVIL}`, 'painting', 5000, 9000);
await bid(CO, P2, 7000, 10);
await bid(CO2, P2, 6500, 12);
const b2co3 = await bid(CO3, P2, 8000, 9);
await as('authenticated', CO3); await db.query(`update public.bids set status = 'withdrawn' where id = $1`, [b2co3]);
await fresh();
await as('authenticated', HO2);
const w2 = await fails(`update public.projects set status = 'withdrawn' where id = $1`, [P2.id]);
const wAlert = (await alertLike(`سحب صاحب المنزل المشروع ${P2.code}`))[0];
check('1: a homeowner withdrawing their open project alerts the team, with the trade and how many bidders were told', w2 === false && (await status(P2)) === 'withdrawn'
  && wAlert && wAlert.html.includes('دهانات') && wAlert.html.includes('العروض القائمة عليه: 2 — أُبلغ أصحابها بالبريد'), `${w2} ${wAlert && wAlert.html.slice(0, 300)}`);
const wAr = await lastTo('co@x.com');
const wEn = await lastTo('co2@x.com');
check('3: each bidder is told it is no longer open, in their own language, by number and trade only (project_withdrawn_bidder)',
  wAr && wAr.subject === `المشروع ${P2.code} لم يعد مفتوحًا` && wAr.html.includes(`(دهانات)`) && !wAr.html.includes(EVIL)
  && wEn && wEn.subject === `Project ${P2.code} is no longer open` && wEn.html.includes('(Painting)') && !wEn.html.includes(EVIL) && wEn.html.includes('https://www.tarmem.sa/projects'),
  `${wAr && wAr.subject} | ${wEn && wEn.subject}`);
check('3: …a bidder who had withdrawn is not', (await allTo('co3@x.com')).length === 0);

// ---------------------------------------------------------------------------------------------------------------
// 4 — the console: remove, complete, cancel
// ---------------------------------------------------------------------------------------------------------------
const P3 = await post(HO3, `Buy now at ${EVIL}`, 'something-else', 1000, 2000);
await bid(CO, P3, 1500, 3);
await fresh();
const notAdmin = await setStatus(HO3, P3, 'withdrawn');
const badStatus = await setStatus(ADMIN, P3, 'active');
const noProject = await setStatus(ADMIN, U('99'), 'withdrawn');
const openToDone = await setStatus(ADMIN, P3, 'completed');
check('4: admin_set_project_status: "admins only", "unknown status…", "no such project", and open → completed is not allowed',
  /^admins only$/.test(notAdmin || '') && /^unknown status: use completed or withdrawn$/.test(badStatus || '') && /^no such project$/.test(noProject || '')
  && /^status_not_allowed: a project goes from active to completed or withdrawn, or from open to withdrawn$/.test(openToDone || '') && (await status(P3)) === 'open',
  `${notAdmin} | ${badStatus} | ${noProject} | ${openToDone}`);
await as('authenticated', ADMIN);
const removed = (await db.query(`select * from public.admin_set_project_status($1, 'withdrawn', $2)`, [P3.id, '  spam: selling things  '])).rows[0];
const ev3 = await one(`select actor_id, action, detail from public.events where entity = 'project' and entity_id = $1 and action = 'removed'`, [P3.code]);
check('4: the team removes an open project (spam): the row comes back withdrawn, and the record keeps who, from, to and the note',
  removed && removed.status === 'withdrawn' && removed.code === P3.code && ev3 && ev3.actor_id === ADMIN && ev3.detail.by === 'admin' && ev3.detail.from === 'open' && ev3.detail.to === 'withdrawn' && ev3.detail.note === 'spam: selling things',
  JSON.stringify(ev3));
const removedMail = await lastTo('noura@x.com');
check('4: its owner is told it was removed (project_removed), without the note; its bidder hears it is withdrawn; the team gets no "withdrawn by its owner" alert',
  removedMail && removedMail.subject === `أُزيل مشروعك ${P3.code}` && removedMail.html.includes('(مشروع ترميم)') && !removedMail.html.includes('spam') && !removedMail.html.includes(EVIL)
  && (await lastTo('co@x.com'))?.subject === `المشروع ${P3.code} لم يعد مفتوحًا` && (await alertLike('سحب صاحب المنزل')).length === 0, removedMail && removedMail.html.slice(0, 300));
check('4: withdrawn → withdrawn again is not allowed', /^status_not_allowed/.test((await setStatus(ADMIN, P3, 'withdrawn')) || ''));

// completed by the team
const P4 = await post(HO, 'مطبخ ثان', 'kitchen');
const b4 = await bid(CO2, P4, 30000, 20);
await hoSign(HO, b4); await coSign(CO2, P4);
await fresh();
await as('authenticated', ADMIN);
const done4 = (await db.query(`select * from public.admin_set_project_status($1, 'completed')`, [P4.id])).rows[0];
const m4ho = await lastTo('sara@x.com');
const m4co = await lastTo('co2@x.com');
check('4: the team completes an active project; both parties are emailed in their language (project_completed); the record says "completed" by admin',
  done4.status === 'completed' && m4ho && m4ho.subject === `اكتمل المشروع ${P4.code}` && m4ho.html.includes('تقييم المقاول') && m4co && m4co.subject === `Project ${P4.code} is complete` && m4co.html.includes('(Kitchens)')
  && (await n(`select count(*)::int n from public.events where entity_id = $1 and action = 'completed' and detail->>'by' = 'admin'`, [P4.code])) === 1,
  `${m4ho && m4ho.subject} | ${m4co && m4co.subject}`);
check('4: completed → withdrawn is not allowed', /^status_not_allowed/.test((await setStatus(ADMIN, P4, 'withdrawn')) || '') && (await status(P4)) === 'completed');
// the review opens once the project is complete (007), including one completed by the team
await as('authenticated', HO);
const rev4 = await fails(`insert into public.reviews (project_id, contractor_id, stars, body) values ($1, $2, 5, 'عمل ممتاز')`, [P4.id, CO2]);
check('4: after the team completes it, the homeowner writes the one review', rev4 === false, rev4);

// cancelled by the team
const P5 = await post(HO2, 'Bathroom', 'bathroom', 10000, 20000);
const b5 = await bid(CO, P5, 15000, 14);
await hoSign(HO2, b5); await coSign(CO, P5);
await fresh();
await as('authenticated', ADMIN);
const cancel5 = (await db.query(`select * from public.admin_set_project_status($1, 'withdrawn', 'both asked')`, [P5.id])).rows[0];
const m5ho = await lastTo('hind@x.com');
const m5co = await lastTo('co@x.com');
check('4: the team cancels an active project (active → withdrawn); both parties are emailed (project_cancelled); the record says "cancelled"',
  cancel5.status === 'withdrawn' && m5ho && m5ho.subject === `Project ${P5.code} is cancelled` && m5ho.html.includes('(Bathrooms)') && !m5ho.html.includes('both asked')
  && m5co && m5co.subject === `أُلغي المشروع ${P5.code}` && m5co.html.includes('(حمامات)')
  && (await n(`select count(*)::int n from public.events where entity_id = $1 and action = 'cancelled' and detail->>'note' = 'both asked'`, [P5.code])) === 1,
  `${m5ho && m5ho.subject} | ${m5co && m5co.subject}`);
check('4: …no "withdrawn" emails to bidders (that is only for open projects), and no team alert', (await logged('co@x.com', 'project_withdrawn_bidder')) === 2 && (await alerts()).length === 0);

// ---------------------------------------------------------------------------------------------------------------
// 5 — admins read the messages inside a project
// ---------------------------------------------------------------------------------------------------------------
await as('authenticated', HO);
await db.query(`insert into public.project_messages (project_id, contractor_id, body) values ($1, $2, 'متى تبدأون؟')`, [P1.id, CO]);
await as('authenticated', CO);
await db.query(`insert into public.project_messages (project_id, contractor_id, body) values ($1, $2, 'الأحد القادم')`, [P1.id, CO]);
const seen = async (who) => { await as('authenticated', who); return (await db.query(`select count(*)::int n from public.project_messages where project_id = $1`, [P1.id])).rows[0].n; };
check('5: an admin reads the messages inside a project; the two parties still read theirs; another contractor or homeowner reads none',
  (await seen(ADMIN)) === 2 && (await seen(HO)) === 2 && (await seen(CO)) === 2 && (await seen(CO2)) === 0 && (await seen(HO2)) === 0);
await as('authenticated', ADMIN);
const adminWrites = await fails(`insert into public.project_messages (project_id, contractor_id, body) values ('${P1.id}', '${CO}', 'from the team')`);
await as('authenticated', ADMIN);
const adminMarks = (await db.query(`select public.mark_messages_read($1, $2) n`, [P1.id, CO])).rows[0].n;
check('5: …reading only: an admin cannot write into the thread or mark it read', Boolean(adminWrites) && adminMarks === 0, adminWrites);
await as('anon');
check('5: a visitor reads none', /permission denied/.test((await fails(`select * from public.project_messages`)) || ''));

// ---------------------------------------------------------------------------------------------------------------
// 4 — the homeowner confirms their own project complete (payments off)
// ---------------------------------------------------------------------------------------------------------------
const P6 = await post(HO, 'دهان الصالة', 'painting', 3000, 5000);
await bid(CO2, P6, 4000, 5);
const P7 = await post(HO3, 'ملحق', 'extensions', 50000, 90000);
await asEditor(`update public.projects set status = 'active', contractor_id = '${CO3}', amount = 60000 where id = '${P7.id}';`);  // made active by hand, with no agreement
await as('authenticated', HO);
const reviewEarly = await fails(`insert into public.reviews (project_id, contractor_id, stars, body) values ($1, $2, 5, 'مبكر')`, [P1.id, CO]);
await as('authenticated', HO);
const eraseEarly = await fails(`select public.delete_my_account()`);
check('4: while the project is in progress the homeowner cannot review it yet, and cannot erase the account ("active_project")',
  /row-level security/.test(reviewEarly || '') && /active_project/.test(eraseEarly || ''), `${reviewEarly} | ${eraseEarly}`);
await as('authenticated', HO);
const direct = await fails(`update public.projects set status = 'completed' where id = $1`, [P1.id]);
check('4: the homeowner still cannot complete it by editing the row', (await status(P1)) === 'active', direct);
const byContractor = await confirmDone(CO, P1);
const byStranger = await confirmDone(HO2, P1);
const onOpen = await confirmDone(HO, P6);
const onUnsigned = await confirmDone(HO3, P7);
await asEditor(`update public.platform_flags set enabled = true where key = 'payments_live';`);
const withPayments = await confirmDone(HO, P1);
await asEditor(`update public.platform_flags set enabled = false where key = 'payments_live';`);
check('4: homeowner_confirm_complete refuses the contractor, a stranger, an open project, an agreement not signed by both, and payments on — each with its exact words',
  byContractor === "only the project's owner confirms completion" && byStranger === "only the project's owner confirms completion"
  && onOpen === 'not_active: only a project in progress can be confirmed complete' && onUnsigned === 'not_signed: the agreement is not signed by both parties'
  && withPayments === 'payments_on: with payment on the site, a project completes when its last stage is approved' && (await status(P1)) === 'active',
  [byContractor, byStranger, onOpen, onUnsigned, withPayments].join(' | '));
const hoOnCo = await coConfirmDone(HO, P1);
const otherCo = await coConfirmDone(CO2, P1);
check('4: contractor_confirm_complete refuses the homeowner and another contractor ("only the project\'s contractor confirms completion")',
  hoOnCo === "only the project's contractor confirms completion" && otherCo === "only the project's contractor confirms completion", `${hoOnCo} | ${otherCo}`);
await fresh();
await as('authenticated', HO);
const half1 = (await db.query(`select * from public.homeowner_confirm_complete($1)`, [P1.id])).rows[0];
const ask1 = await lastTo('co@x.com');
const halfAlert = (await alertLike(`أكّد صاحب المنزل اكتمال المشروع ${P1.code} — بانتظار تأكيد المقاول`))[0];
const ag1 = await one(`select homeowner_done_at is not null h, contractor_done_at is not null c from public.agreements where project_id = $1`, [P1.id]);
check('4: completion is never one-sided — the owner confirming alone leaves the project in progress, records their confirmation on the agreement, asks the contractor to confirm (completion_confirm, by number and trade), alerts the team',
  half1.status === 'active' && (await status(P1)) === 'active' && ag1.h === true && ag1.c === false
  && ask1 && ask1.subject === `أكّد صاحب المنزل اكتمال المشروع ${P1.code}` && ask1.html.includes('(تصميم وترميم المطابخ)') && ask1.html.includes('أكّده أنت أيضًا') && !ask1.html.includes(EVIL)
  && (await logged('co@x.com', 'completion_confirm')) === 1 && halfAlert && halfAlert.html.includes('53,000 ريال') && halfAlert.html.includes('مؤسسة البناء المتقن')
  && (await n(`select count(*)::int n from public.events where entity_id = $1 and action = 'confirmed_complete' and actor_id = $2 and detail->>'by' = 'homeowner'`, [P1.code, HO])) === 1,
  `${half1.status} ${JSON.stringify(ag1)} ${ask1 && ask1.subject} | ${halfAlert && halfAlert.subject}`);
await as('authenticated', HO);
const eraseHalf = await fails(`select public.delete_my_account()`);
check('4: …so the erasure block stays until the contractor confirms too', /active_project/.test(eraseHalf || ''), eraseHalf);
const sentHalf = await n(`select count(*)::int n from public.sent`);
await as('authenticated', HO);
const againHalf = (await db.query(`select * from public.homeowner_confirm_complete($1)`, [P1.id])).rows[0];
check('4: the owner pressing it again changes nothing and sends nothing', againHalf.status === 'active' && (await n(`select count(*)::int n from public.sent`)) === sentHalf);
await fresh();
await as('authenticated', CO);
const done1 = (await db.query(`select * from public.contractor_confirm_complete($1)`, [P1.id])).rows[0];
const m1co = await lastTo('co@x.com');
const m1ho = await lastTo('sara@x.com');
const doneAlert = (await alertLike(`اكتمل المشروع ${P1.code} — أكّده الطرفان`))[0];
check('4: the contractor confirms too: the project is completed, both are emailed by number and trade (project_completed), the team is alerted with the value after changes',
  done1.status === 'completed' && m1co && m1co.subject === `اكتمل المشروع ${P1.code}` && m1co.html.includes('(تصميم وترميم المطابخ)') && m1co.html.includes('أكّد الطرفان') && !m1co.html.includes(EVIL)
  && m1ho && m1ho.subject === `اكتمل المشروع ${P1.code}` && m1ho.html.includes('تقييم المقاول')
  && doneAlert && doneAlert.html.includes('53,000 ريال') && doneAlert.html.includes('مؤسسة البناء المتقن')
  && (await n(`select count(*)::int n from public.events where entity_id = $1 and action = 'completed' and detail->>'by' = 'both'`, [P1.code])) === 1,
  `${done1.status} ${m1co && m1co.subject} | ${doneAlert && doneAlert.subject}`);
const sentBefore = await n(`select count(*)::int n from public.sent`);
await as('authenticated', HO);
const again = (await db.query(`select * from public.homeowner_confirm_complete($1)`, [P1.id])).rows[0];
await as('authenticated', CO);
const againCo = (await db.query(`select * from public.contractor_confirm_complete($1)`, [P1.id])).rows[0];
check('4: pressing either again returns the completed project and sends nothing', again.status === 'completed' && againCo.status === 'completed' && (await n(`select count(*)::int n from public.sent`)) === sentBefore);

// the contractor first: the homeowner is asked to check and confirm, in their language
const P11 = await post(HO2, 'Wardrobes', 'carpentry', 9000, 15000);
const b11 = await bid(CO3, P11, 12000, 12);
await hoSign(HO2, b11); await coSign(CO3, P11);
await fresh();
const coFirst = await coConfirmDone(CO3, P11);
const ask11 = await lastTo('hind@x.com');
check('4: the contractor may confirm first: the project stays in progress, and the homeowner is asked to check the work and confirm (English for an English account)',
  coFirst === false && (await status(P11)) === 'active' && ask11 && ask11.subject === `The contractor says project ${P11.code} is complete` && ask11.html.includes('(Carpentry & fitted furniture)')
  && ask11.html.includes('Review and confirm') && (await alertLike(`أكّد المقاول اكتمال المشروع ${P11.code} — بانتظار تأكيد صاحب المنزل`)).length === 1, ask11 && ask11.subject);
// …and waits (signed ten days ago, confirmed by the contractor four days ago): the daily summary lists it
await asEditor(`update public.agreements set contractor_done_at = now() - interval '4 days', contractor_signed_at = now() - interval '10 days', homeowner_signed_at = now() - interval '11 days' where project_id = '${P11.id}';`);

// the one review (007), after completion
await as('authenticated', CO);
const coReview = await fails(`insert into public.reviews (project_id, contractor_id, stars, body) values ($1, $2, 5, 'أنا')`, [P1.id, CO]);
await as('authenticated', HO);
const wrongCo = await fails(`insert into public.reviews (project_id, contractor_id, stars, body) values ($1, $2, 1, 'ليس هو')`, [P1.id, CO2]);
await as('authenticated', HO);
const review1 = await fails(`insert into public.reviews (project_id, contractor_id, stars, body) values ($1, $2, 4, 'عمل جيد والتزام بالموعد')`, [P1.id, CO]);
await as('authenticated', HO);
const review2 = await fails(`insert into public.reviews (project_id, contractor_id, stars, body) values ($1, $2, 5, 'مرة ثانية')`, [P1.id, CO]);
const vc = await one(`select rating::text r, reviews::int c, done::int d from public.verified_contractors where user_id = $1`, [CO]);
check('4: after completion the homeowner writes the one review (007): not the contractor, not for another contractor, not twice; the rating and "done" count follow',
  Boolean(coReview) && Boolean(wrongCo) && review1 === false && Boolean(review2) && vc.r === '4.0' && vc.c === 1 && vc.d === 1, `${coReview} | ${wrongCo} | ${review1} | ${review2} | ${JSON.stringify(vc)}`);

// ---------------------------------------------------------------------------------------------------------------
// 3 + 6 — contractor applications: received, declined, and the applicant reading their own status
// ---------------------------------------------------------------------------------------------------------------
await fresh();
await as('anon');
const apply1 = await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Prize at ${EVIL}', 'Call ${EVIL}', '0581000001', 'apply1@x.com', 'riyadh', array['kitchen'], 'ar')`);
const rec1 = await lastTo('apply1@x.com');
check('3: an application sent without an account is received, and its address gets "application received" in fixed words (no company, no name)',
  apply1 === false && rec1 && rec1.subject === 'وصلنا طلب انضمامك إلى ترميم' && !rec1.html.includes(EVIL) && !rec1.html.includes('Prize') && rec1.html.includes('لاستكمال التوثيق')
  && (await logged('apply1@x.com', 'application_received')) === 1, `${apply1} ${rec1 && rec1.html.slice(0, 300)}`);
await as('anon');
await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Again Co', 'Again', '0581000002', 'APPLY1@x.com', 'riyadh', array['kitchen'], 'ar')`);
await as('anon');
await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('English Co', 'Eng', '0581000003', 'apply-en@x.com', 'riyadh', array['kitchen'], 'en')`);
await as('anon');
const noEmail = await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('No Mail Co', 'Nomail', '0581000004', null, 'riyadh', array['kitchen'], 'ar')`);
await as('anon');
await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('RLS TEST', 'RLS TEST', '0581000005', 'rls@x.com', 'riyadh', array['kitchen'], 'en')`);
check('3: …at most once a day per address (in any letter case); in English for an English form; none without an address or for the RLS test',
  (await allTo('apply1@x.com')).length === 1 && (await lastTo('apply-en@x.com'))?.subject === 'We received your application to join Tarmem' && noEmail === false && (await allTo('rls@x.com')).length === 0);

// declined: an application with no account → its address; one linked to an account → the account's address
await as('authenticated', DEC);
const decApply = await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Dec Co', 'Dec', '0577777777', 'dec-typed@x.com', 'riyadh', array['kitchen'], 'en')`);
await fresh();
await as('authenticated', ADMIN);
await db.exec(`update public.contractor_applications set status = 'declined' where email in ('apply1@x.com', 'dec-typed@x.com')`);
const decUnlinked = await lastTo('apply1@x.com');
const decLinked = await lastTo('dec@x.com');
check('3: declining emails the applicant in fixed words (application_declined): the linked account\'s address, else the one on the form',
  decApply === false && decUnlinked && decUnlinked.subject === 'بخصوص طلب انضمامك إلى ترميم' && !decUnlinked.html.includes(EVIL) && decUnlinked.html.includes('support@tarmem.sa')
  && decLinked && decLinked.subject === 'About your application to join Tarmem' && (await allTo('dec-typed@x.com')).length === 0, `${decApply} | ${decLinked && decLinked.subject}`);
await as('authenticated', ADMIN);
await db.exec(`update public.contractor_applications set status = 'declined' where email = 'apply1@x.com'`);
check('3: …once: setting "declined" again sends nothing more', (await allTo('apply1@x.com')).length === 1);
await as('authenticated', DEC);
const mine = (await db.query(`select company, status from public.contractor_applications`)).rows;
check('6: the applicant reads their own application and sees "declined" — and only their own', mine.length === 1 && mine[0].company === 'Dec Co' && mine[0].status === 'declined', JSON.stringify(mine));

// ---------------------------------------------------------------------------------------------------------------
// 7 — "Confirm email" on: the application goes in without an account, and is claimed after confirmation
// ---------------------------------------------------------------------------------------------------------------
// an application that used this address before the account existed (somebody else's, or an old one)
await asEditor(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang, created_at) values ('Old Co', 'Old', '0591000000', 'newco@x.com', 'riyadh', array['kitchen'], 'ar', '2026-08-01');
  update public.email_log set at = '2026-08-01' where lower(recipient) = 'newco@x.com';`);   // its receipt went out back then
// 1) signUp: the account exists, unconfirmed, no session, no profile
await asEditor(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, confirmation_sent_at, raw_user_meta_data) values
  ('${NEWCO}', 'newco@x.com', 'h', null, now() - interval '5 seconds', now() - interval '5 seconds', '{"role":"contractor","lang":"ar"}');`);
// 2) then, still without a session, the application — through the same rate limit as every visitor
await fresh();
const net = { 'cf-connecting-ip': '203.0.113.20' };
await as('anon', '', net);
const anonApp = await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('New Co', 'Nasser', '0591111111', 'NewCo@x.com', 'riyadh', array['kitchen','painting'], 'ar')`);
await as('anon', '', net);
const anonRead = (await db.query(`select count(*)::int n from public.contractor_applications`).catch((e) => ({ rows: [{ n: String(e.message) }] }))).rows[0].n;
check('7: a visitor\'s application (no user_id) is accepted, counted by 029\'s per-network limit, cannot be read back, and gets "application received"',
  anonApp === false && (await n(`select count(*)::int n from public.form_hits where form = 'contractor_applications'`)) >= 1 && anonRead !== 1
  && (await one(`select user_id from public.contractor_applications where company = 'New Co'`)).user_id === null && (await lastTo('NewCo@x.com'))?.subject === 'وصلنا طلب انضمامك إلى ترميم',
  `${anonApp} | read: ${anonRead}`);
// someone else later puts the same address on the form with another number
await as('anon');
await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Other Co', 'Other', '0592222222', 'newco@x.com', 'riyadh', array['kitchen'], 'ar')`);
// 3) claiming: before confirming, then with no profile yet, then as a contractor
const claim = async (who) => { await as('authenticated', who); try { return { rows: (await db.query(`select * from public.claim_my_application()`)).rows }; } catch (e) { return { error: String(e.message) }; } };
const c0 = await claim(NEWCO);
await asEditor(`update auth.users set email_confirmed_at = now() where id = '${NEWCO}';`);
const c1 = await claim(NEWCO);
await as('authenticated', NEWCO);   // ensureProfile: the contractor's profile, from the sign-up form's details
await db.exec(`insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${NEWCO}', 'contractor', 'Nasser', '+966 59 111 1111', 'riyadh', 'New Co', 'ar')`);
const c2 = await claim(NEWCO);
check('7: claim_my_application refuses before the email is confirmed ("confirm your email first") and before there is a contractor profile',
  c0.error === 'confirm your email first' && c1.error === 'only a contractor account can claim an application', `${c0.error} | ${c1.error}`);
check('7: once confirmed, it links the application sent after the account, preferring the one whose mobile matches the profile, and returns it',
  c2.rows && c2.rows.length === 1 && c2.rows[0].company === 'New Co' && c2.rows[0].user_id === NEWCO
  && (await n(`select count(*)::int n from public.events where entity = 'application' and action = 'claimed' and actor_id = $1`, [NEWCO])) === 1, JSON.stringify(c2));
const c3 = await claim(NEWCO);
const left = await rows(`select company, user_id from public.contractor_applications where lower(email) = 'newco@x.com' order by company`);
check('7: calling it again returns the same row and links nothing more; the older application and the stranger\'s stay unlinked',
  c3.rows && c3.rows.length === 1 && c3.rows[0].company === 'New Co' && JSON.stringify(left) === JSON.stringify([{ company: 'New Co', user_id: NEWCO }, { company: 'Old Co', user_id: null }, { company: 'Other Co', user_id: null }])
  && (await n(`select count(*)::int n from public.events where entity = 'application' and action = 'claimed'`)) === 1, JSON.stringify(left));
await as('authenticated', NEWCO);
const own = (await db.query(`select company, status from public.contractor_applications`)).rows;
check('6/7: the claimed application is now the contractor\'s own to read (status "new")', own.length === 1 && own[0].status === 'new', JSON.stringify(own));
const hox = await claim(HOX);   // a confirmed homeowner whose address matches applications
check('7: a homeowner account with the same address claims nothing ("only a contractor account…")', hox.error === 'only a contractor account can claim an application', hox.error);
// a contractor whose account came after the only application with their address: nothing to claim
await asEditor(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang, created_at) values ('Before Co', 'Late', '0593000000', 'late@x.com', 'riyadh', array['kitchen'], 'ar', now() - interval '2 hours');
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, confirmation_sent_at) values ('${LATECO}', 'late@x.com', 'h', now(), now(), now());
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${LATECO}', 'contractor', 'Late', '0593000000', 'riyadh', 'Before Co', 'ar');`);
const late = await claim(LATECO);
check('7: an application sent before the account existed is not claimed: [] comes back (the site then shows the application form)', late.rows && late.rows.length === 0, JSON.stringify(late));
await as('authenticated', LATECO);
const lateApply = await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Before Co', 'Late', '0593000000', 'late@x.com', 'riyadh', array['kitchen'], 'ar')`);
check('7: …and the form, sent signed in, links itself as before', lateApply === false && (await one(`select count(*)::int n from public.contractor_applications where user_id = $1`, [LATECO])).n === 1, lateApply);

// an application the team verified BEFORE the account existed: linked when the account proved the address and has the same mobile
const VETU = U('f5'), MISU = U('f6'), AUTOU = U('f7');
await asEditor(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang, status, created_at) values
    ('Vet Co', 'Vv', '0598000001', 'vet@x.com', 'riyadh', array['kitchen'], 'ar', 'verified', now() - interval '3 days'),
    ('Mis Co', 'Mm', '0598000002', 'mis@x.com', 'riyadh', array['kitchen'], 'ar', 'verified', now() - interval '3 days');
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, confirmation_sent_at) values
    ('${VETU}', 'vet@x.com', 'h', now(), now() - interval '10 minutes', now() - interval '10 minutes'), ('${MISU}', 'mis@x.com', 'h', now(), now() - interval '10 minutes', now() - interval '10 minutes'),
    ('${AUTOU}', 'auto@x.com', 'h', now() - interval '10 minutes', now() - interval '10 minutes', null);
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${VETU}', 'contractor', 'Vv', '+966 59 800 0001', 'riyadh', 'Vet Co', 'ar'),
    ('${MISU}', 'contractor', 'Mm', '0598000009', 'riyadh', 'Mis Co', 'ar'), ('${AUTOU}', 'contractor', 'Aa', '0598000003', 'riyadh', 'Auto Co', 'ar');`);
await as('authenticated', VETU);   // the sign-up's own application (signed in: linked to the account, 'new')
await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Vet Co', 'Vv', '0598000001', 'vet@x.com', 'riyadh', array['kitchen'], 'ar')`);
await as('anon');                  // and a copy sent without a session, as with "Confirm email" on
await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Vet Co', 'Vv', '0598000001', 'vet@x.com', 'riyadh', array['kitchen'], 'ar')`);
const vet = await claim(VETU);
const vetRows = await rows(`select status, user_id from public.contractor_applications where lower(email) = 'vet@x.com' order by created_at`);
await as('authenticated', VETU);
const vetOpen = (await db.query(`select public.is_verified_contractor() v`)).rows[0].v;
check('7: an application verified before the account existed is linked (same proven address, same mobile): it replaces the account\'s own "new" one, the sign-up\'s copies go, and the contractor is verified',
  vet.rows && vet.rows.length === 1 && vet.rows[0].company === 'Vet Co' && vet.rows[0].status === 'verified' && JSON.stringify(vetRows) === JSON.stringify([{ status: 'verified', user_id: VETU }]) && vetOpen === true
  && (await n(`select count(*)::int n from public.events where entity = 'application' and action = 'claimed' and actor_id = $1 and detail->>'status' = 'verified' and detail->>'replaced' is not null`, [VETU])) === 1,
  `${JSON.stringify(vet)} ${JSON.stringify(vetRows)} ${vetOpen}`);
const mis = await claim(MISU);
check('7: …but not with another mobile number: nothing is linked', mis.rows && mis.rows.length === 0 && (await one(`select user_id from public.contractor_applications where company = 'Mis Co'`)).user_id === null, JSON.stringify(mis));
await as('anon');
await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Auto Co', 'Aa', '0598000003', 'auto@x.com', 'riyadh', array['kitchen'], 'ar')`);
const auto = await claim(AUTOU);
check('7: an account confirmed automatically ("Confirm email" off: no email was ever sent) never claims by address — [] and the application stays unlinked',
  auto.rows && auto.rows.length === 0 && (await one(`select user_id from public.contractor_applications where company = 'Auto Co'`)).user_id === null, JSON.stringify(auto));

// verified after claiming: the contractor opens fully
await as('authenticated', ADMIN);
await db.exec(`update public.contractor_applications set status = 'verified' where user_id = '${NEWCO}'`);
await as('authenticated', NEWCO);
const nowVerified = (await db.query(`select public.is_verified_contractor() v`)).rows[0].v;
const vMail = await lastTo('newco@x.com');
check('7: verified after the claim: the contractor is a verified contractor, and the email is the usual "sign in" one',
  nowVerified === true && vMail && vMail.subject === 'تم توثيق حسابك في ترميم' && vMail.html.includes('سجّل دخولك لتصفّح المشاريع المفتوحة') && vMail.html.includes('https://www.tarmem.sa/signin'), vMail && vMail.html.slice(0, 300));

// verified BEFORE any claim: the email fits where the applicant stands
await asEditor(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at) values
  ('${PENDING}', 'pending@x.com', 'h', null, now() - interval '1 minute'), ('${CONFIRMED}', 'confirmed@x.com', 'h', now(), now() - interval '1 minute');`);
for (const [co, mob, mail, lang] of [['Pending Co', '0594000001', 'pending@x.com', 'ar'], ['Confirmed Co', '0594000002', 'confirmed@x.com', 'en'], ['Nobody Co', '0594000003', 'nobody@x.com', 'en']]) {
  await as('anon'); await db.query(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ($1, 'Pp', $2, $3, 'riyadh', array['kitchen'], $4)`, [co, mob, mail, lang]);
}
await fresh();
await as('authenticated', ADMIN);
await db.exec(`update public.contractor_applications set status = 'verified' where company in ('Pending Co', 'Confirmed Co', 'Nobody Co')`);
const vPending = await lastTo('pending@x.com'), vConfirmed = await lastTo('confirmed@x.com'), vNobody = await lastTo('nobody@x.com');
check('7: verified before the applicant confirmed their email: "confirm your email…, then sign in" (not "create your account")',
  vPending && vPending.html.includes('أكّد بريدك من الرسالة التي أرسلناها عند إنشاء حسابك') && vPending.html.includes('https://www.tarmem.sa/signin') && !vPending.html.includes('/join'), vPending && vPending.html.slice(0, 400));
check('7: …confirmed but not signed in yet: "sign in with the email and password you created"; no account at all: "create your account" as before',
  vConfirmed && vConfirmed.html.includes('Sign in with the email and password you created') && vConfirmed.html.includes('https://www.tarmem.sa/signin')
  && vNobody && vNobody.html.includes('Create your account on the contractor page') && vNobody.html.includes('https://www.tarmem.sa/join'),
  `${vConfirmed && vConfirmed.html.slice(0, 300)} | ${vNobody && vNobody.html.slice(0, 300)}`);
const waV = await one(`select raw from public.sent where to_addr = 'wa:966594000001' order by id desc limit 1`);
check('7: the WhatsApp for it is the approved application_verified template with its one value, the company', waV && JSON.parse(waV.raw).template.name === 'tarmem_application_verified_2'
  && JSON.stringify(JSON.parse(waV.raw).template.components.find((c) => c.type === 'body').parameters.map((p) => p.text)) === JSON.stringify(['Pending Co']), waV && waV.raw.slice(0, 200));

// the visitor's application stays rate-limited (029)
const limited = [];
for (let i = 0; i < 6; i++) { await as('anon'); limited.push(await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Same ${i}', 'Ss', '059500000${i}', 'same@x.com', 'riyadh', array['kitchen'], 'ar')`)); }
const perNet = [];
for (let i = 0; i < 11; i++) { await as('anon', '', { 'cf-connecting-ip': '203.0.113.77' }); perNet.push(await fails(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Net ${i}', 'Nn', '05960000${String(i).padStart(2, '0')}', 'net${i}@x.com', 'riyadh', array['kitchen'], 'ar')`)); }
check('7: a visitor\'s applications are still limited: five an hour per address, ten an hour per network (029)',
  limited.slice(0, 5).every((e) => e === false) && limited[5] === 'too many: five in an hour from the same address or number'
  && perNet.slice(0, 10).every((e) => e === false) && perNet[10] === 'too many: ten in an hour from the same network', `${limited[5]} | ${perNet[10]}`);

// the Send Email hook (024/029) for a sign-up, and for an email change
await fresh();
const hook = (ev) => db.query(`select public.auth_send_email($1::jsonb) r`, [JSON.stringify(ev)]);
await hook({ user: { id: U('e9'), email: 'fresh@x.com', user_metadata: { full_name: `Prize ${EVIL}`, lang: 'en', role: 'contractor' } },
  email_data: { email_action_type: 'signup', token: '123456', token_hash: 'abc123hash', redirect_to: 'https://www.tarmem.sa/contractor?welcome=1', site_url: 'https://www.tarmem.sa' } });
const conf = await lastTo('fresh@x.com');
const expectLink = 'https://rdqlnsqdmaosghpxexup.supabase.co/auth/v1/verify?token=abc123hash&type=signup&redirect_to=https%3A%2F%2Fwww.tarmem.sa%2Fcontractor%3Fwelcome%3D1';
check('7: the sign-up confirmation: exact link /auth/v1/verify?token=<token_hash>&type=signup&redirect_to=<the page, encoded>, in the form\'s language, no typed name (auth_signup)',
  conf && conf.subject === 'Confirm your email for Tarmem' && conf.html.includes(`href="${expectLink}"`) && conf.html.includes('Confirm my email') && !conf.html.includes(EVIL)
  && (await logged('fresh@x.com', 'auth_signup')) === 1, conf && conf.html.slice(0, 500));
await hook({ user: { id: U('e8'), email: 'fresh-ar@x.com', user_metadata: {} }, email_data: { email_action_type: 'signup', token_hash: 'h2', redirect_to: '', site_url: 'https://www.tarmem.sa' } });
await hook({ user: { id: U('e7'), email: 'bare@x.com' }, email_data: { email_action_type: 'signup', token_hash: 'h3' } });
const confAr = await lastTo('fresh-ar@x.com'), bare = await lastTo('bare@x.com');
check('7: …in Arabic by default; with no redirect it goes back to the Site URL, and with neither to https://www.tarmem.sa',
  confAr && confAr.subject === 'أكّد بريدك الإلكتروني في ترميم' && confAr.html.includes('token=h2&type=signup&redirect_to=https%3A%2F%2Fwww.tarmem.sa"')
  && bare && bare.html.includes('token=h3&type=signup&redirect_to=https%3A%2F%2Fwww.tarmem.sa"'), `${confAr && confAr.html.slice(0, 300)}`);
await hook({ user: { id: HO2, email: 'hind@x.com', new_email: 'hind-new@x.com' }, email_data: { email_action_type: 'email_change', token_hash: 'toNew', token_hash_new: 'toCurrent', redirect_to: 'https://www.tarmem.sa/settings' } });
const chNew = await lastTo('hind-new@x.com'), chCur = await lastTo('hind@x.com');
check('7: an email change sends both links, type=email_change: the new address gets token_hash, the current one token_hash_new',
  chNew && chNew.html.includes('token=toNew&type=email_change') && chCur && chCur.html.includes('token=toCurrent&type=email_change') && chNew.subject === 'Confirm your new email for Tarmem', `${chNew && chNew.html.slice(0, 200)}`);

// ---------------------------------------------------------------------------------------------------------------
// 2 — the daily summary, with something in each line
// ---------------------------------------------------------------------------------------------------------------
await asEditor(`update public.contractor_applications set status = 'contacted' where status = 'new' and created_at < now() - interval '1 day';
  insert into public.contractor_applications (company, person, mobile, email, city, trades, created_at) values
    ('Late Co', 'Ll', '0597000001', null, 'riyadh', array['kitchen'], now() - interval '2 days'), ('Late Co 2', 'Ll', '0597000002', null, 'riyadh', array['kitchen'], now() - interval '30 hours'),
    ('RLS TEST', 'RLS TEST', '0597000003', null, 'riyadh', array['kitchen'], now() - interval '2 days'), ('Recent Co', 'Rr', '0597000004', null, 'riyadh', array['kitchen'], now() - interval '3 hours');
  insert into public.contact_messages (name, email, message, handled, created_at) values ('Aa', 'a1@x.com', 'waiting', false, now() - interval '2 days'), ('Bb', 'b1@x.com', 'waiting too', false, now() - interval '26 hours'),
    ('Cc', 'c1@x.com', 'done', true, now() - interval '2 days'), ('Dd', 'd1@x.com', 'new today', false, now() - interval '2 hours');`);
const P8 = await post(HO4, 'مجلس', 'gypsum', 8000, 12000);
const b8 = await bid(CO2, P8, 10000, 10);
await hoSign(HO4, b8);
await asEditor(`update public.agreements set homeowner_signed_at = now() - interval '3 days' where project_id = '${P8.id}';`);
const P9 = await post(HO4, 'سطح', 'roofing', 20000, 30000);
const b9 = await bid(CO2, P9, 25000, 15);
await hoSign(HO4, b9); await coSign(CO2, P9);
await as('authenticated', HO4);
await db.query(`select * from public.change_request_create($1, 'عزل إضافي', 3000, 2)`, [P9.id]);
await asEditor(`update public.change_requests set created_at = now() - interval '4 days' where project_id = '${P9.id}';`);
await fresh();
const digest = (await one(`select public.ops_daily_digest() d`)).d;
const dMail = (await alertLike('ملخص اليوم في ترميم'))[0];
check('2: the daily summary counts each line right: 2 applications, 2 messages, 1 agreement waiting for the contractor, 1 award, 1 change request, 1 completion waiting for the other side',
  digest.sent === true && digest.applications === 2 && digest.contact_messages === 2 && digest.unsigned_agreements === 1 && digest.awarded === 1 && digest.change_requests === 1 && digest.completion_waiting === 1, JSON.stringify(digest));
check('2: …and sends one alert to the team naming them: the companies, the project numbers (with trade), the change request',
  dMail && dMail.subject === 'ملخص اليوم في ترميم — ما يحتاج متابعة الفريق (8)' && dMail.html.includes('Late Co، Late Co 2') && !dMail.html.includes('Recent Co') && !dMail.html.includes('RLS TEST')
  && dMail.html.includes(`ولم يؤكده الآخر منذ أكثر من ثلاثة أيام: 1 — ${P11.code} (بانتظار صاحب المنزل)`)
  && dMail.html.includes('رسائل تواصل لم تُعالج منذ أكثر من يوم: 2') && dMail.html.includes(`منذ أكثر من يومين: 1 — ${P8.code}`)
  && dMail.html.includes(`${P9.code} (أسطح وتصريف أمطار)`) && dMail.html.includes(`${P9.code} CR-1`) && (await alerts()).length === 1, dMail && dMail.html.slice(0, 900));
await asEditor(`update public.contact_messages set handled = true;`);
await fresh();
const digest2 = (await one(`select public.ops_daily_digest() d`)).d;
const d2Mail = (await alertLike('ملخص اليوم في ترميم'))[0];
check('2: a line with nothing in it is left out', digest2.contact_messages === 0 && d2Mail && !d2Mail.html.includes('رسائل تواصل') && d2Mail.subject.endsWith('(6)'), d2Mail && d2Mail.subject);

// ---------------------------------------------------------------------------------------------------------------
// erasure after completion, and a homeowner's own erasure with an open project
// ---------------------------------------------------------------------------------------------------------------
await fresh();
await as('authenticated', HO);
const eraseHo = await fails(`select public.delete_my_account()`);
const erasedAlert = (await alertLike(`سُحب المشروع ${P6.code}: حذف صاحب المنزل حسابه`))[0];
check('4: once the project is completed, the homeowner can erase the account; their open project is withdrawn, its bidder told, the team alerted',
  eraseHo === false && (await status(P6)) === 'withdrawn' && (await lastTo('co2@x.com'))?.subject === `Project ${P6.code} is no longer open` && Boolean(erasedAlert), `${eraseHo}`);
await as('authenticated', CO);
const eraseCo = await fails(`select public.delete_my_account()`);
check('4: …and so can its contractor (completed and cancelled projects do not block erasure)', eraseCo === false && (await one(`select deleted_at is not null d from public.profiles where id = $1`, [CO])).d === true, eraseCo);
await as('authenticated', HO3);
check('4: a project still in progress keeps blocking it', /active_project/.test((await fails(`select public.delete_my_account()`)) || ''));

// ---------------------------------------------------------------------------------------------------------------
// the site's other flows after 030, and nothing failed quietly
// ---------------------------------------------------------------------------------------------------------------
await as('anon');
const vContact = await fails(`insert into public.contact_messages (name, email, message, lang) values ('Sam', 'sam@x.com', 'hello there', 'en')`);
await as('anon');
const vVisit = await fails(`insert into public.visits (session_id, event, route, path, lang, device) values ('visitor0030', 'view', 'home', '/', 'ar', 'mobile')`);
await as('anon');
const taken = (await db.query(`select public.mobile_taken('0522222222') a`)).rows[0].a;
check('visitors still send a contact message (with its receipt), record a visit and ask mobile_taken', vContact === false && vVisit === false && taken === true && (await lastTo('sam@x.com'))?.subject === 'We received your message');
await as('authenticated', CO2); const perf = await fails(`select public.my_performance()`);
await as('authenticated', ADMIN); const ana = await fails(`select public.admin_analytics('week')`);
await as('authenticated', ADMIN); const det = await fails(`select public.admin_user_detail('${CO2}')`);
check('signed-in functions still answer: performance, analytics, the console\'s user detail', perf === false && ana === false && det === false, `${perf} | ${ana} | ${det}`);
const failedRows = await rows(`select recipient, template, detail from public.email_log where status = 'failed'`);
check('no email, WhatsApp or trigger failed quietly along the way (email_log has no "failed" rows)', failedRows.length === 0, JSON.stringify(failedRows));

// a notice that breaks never blocks what caused it: the withdrawal goes through, and the failure is written down
const P10 = await post(HO2, 'Garden', 'landscape', 5000, 8000);
await bid(CO2, P10, 6000, 7);
await asEditor(`alter function public.send_email_bilingual(text, text, text, text, text, text[], text, text, text[], text) rename to send_email_bilingual_away;`);
await as('authenticated', HO2);
const brokenWithdraw = await fails(`update public.projects set status = 'withdrawn' where id = $1`, [P10.id]);
await asEditor(`alter function public.send_email_bilingual_away(text, text, text, text, text, text[], text, text, text[], text) rename to send_email_bilingual;`);
check('if a notice cannot be sent, the action still succeeds and the failure is logged ("ops projects UPDATE")', brokenWithdraw === false && (await status(P10)) === 'withdrawn'
  && (await n(`select count(*)::int n from public.email_log where status = 'failed' and template = 'ops projects UPDATE'`)) === 1, brokenWithdraw);

// ---------------------------------------------------------------------------------------------------------------
// 029's hourly cap on team alerts never holds back what the team must see
// ---------------------------------------------------------------------------------------------------------------
await fresh();
await asEditor(`delete from public.alert_log; insert into public.alert_log (what, status) select 'form alert ' || g, 'sent' from generate_series(1, 30) g;`);
await as('anon');
await db.exec(`insert into public.contact_messages (name, email, message, lang) values ('Flood', 'flood-a@x.com', 'one more', 'en')`);
const P12 = await post(HO4, 'باب', 'doors', 3000, 6000);
const b12 = await bid(CO2, P12, 4500, 6);
await hoSign(HO4, b12);
await asEditor(`update public.contact_messages set handled = false, created_at = now() - interval '2 days' where email = 'a1@x.com';`);
const capped = (await one(`select public.ops_daily_digest() d`)).d;
check('029/030: after 30 ordinary alerts in the hour (visitors\' forms), the next form alert is held, but a signed agreement and the daily summary still reach the team',
  (await alertLike('وقّع صاحب المنزل اتفاقية ' + P12.code)).length === 1 && (await alertLike('ملخص اليوم في ترميم')).length === 1 && capped.sent === true
  && (await n(`select count(*)::int n from public.alert_log where status = 'skipped'`)) >= 1 && (await n(`select count(*)::int n from public.alert_log where status = 'sent' and priority`)) === 2,
  `${JSON.stringify(capped)} ${(await alerts()).map((a) => a.subject).join(' | ')}`);
await asEditor(`update public.contact_messages set handled = true where email = 'a1@x.com'; delete from public.app_secrets where key = 'resend_key';`);
await fresh();
const unconfigured = (await one(`select public.ops_daily_digest() d`)).d;
await asEditor(`select public.set_alerts('re_TESTKEY_abcdefghijklmnopqrstuvwxyz01', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa');`);
check('2: ops_daily_digest reports sent = true only when the alert log shows the email went (with alerts switched off: false, though there is something to report)',
  unconfigured.sent === false && unconfigured.completion_waiting === 1 && (await alerts()).length === 0, JSON.stringify(unconfigured));

// receipts to a typed address: one a day per address, whichever form (029's limit, used by 030's application receipt)
await fresh();
await as('anon');
await db.exec(`insert into public.contact_messages (name, email, message, lang) values ('Both', 'both-forms@x.com', 'a question first', 'en')`);
await as('anon');
await db.exec(`insert into public.contractor_applications (company, person, mobile, email, city, trades, lang) values ('Both Co', 'Bb', '0599100001', 'BOTH-forms@x.com', 'riyadh', array['kitchen'], 'en')`);
check('3: a contact receipt and an application receipt to the same address the same day: only the first goes',
  (await allTo('both-forms@x.com')).length === 1 && (await lastTo('both-forms@x.com'))?.subject === 'We received your message' && (await allTo('BOTH-forms@x.com')).length === 0);

// running 029 again after 030 keeps 030's newer notify_people (029 checks for the "(030)" marker)
const marker = async () => (await one(`select prosrc like '%(030)%' m from pg_proc where proname = 'notify_people'`)).m;
const before029 = await marker();
await asEditor(readFileSync(repo + '029_launch_hardening.sql', 'utf8'));
const after029 = await marker();
check('re-running 029 after 030 leaves 030\'s notify_people in place (its application_verified wording survives)', before029 === true && after029 === true, `${before029} ${after029}`);
await asEditor(`update public.contractor_applications set status = 'contacted' where company = 'Both Co';`);
await fresh();
await asEditor(`update public.contractor_applications set status = 'verified' where company = 'Both Co';`);
const bothV = await lastTo('BOTH-forms@x.com');
check('…and the "verified, no account yet" email still asks for the same email and mobile (030\'s wording)', bothV && bothV.html.includes('with this email and the same mobile number'), bothV && bothV.html.slice(0, 300));

// ---------------------------------------------------------------------------------------------------------------
// 2 — the clock: where pg_cron exists, 030 puts the summary on it at 04:00 UTC (07:00 Riyadh), once
// ---------------------------------------------------------------------------------------------------------------
await asEditor(`create schema cron; create table cron.job (jobid serial primary key, jobname text unique, schedule text, command text);
  create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint language sql as $$
    insert into cron.job (jobname, schedule, command) values (p_name, p_schedule, p_command)
    on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;`);
const withCron = thirty.replace('create extension if not exists pg_cron;', '');
await db.exec(withCron);
const third = await db.exec(withCron);
const jobs = await rows(`select jobname, schedule, command from cron.job`);
check('2: with pg_cron, the summary is scheduled once as "tarmem-daily-digest", 0 4 * * * (UTC), running select public.ops_daily_digest(); the last line says so',
  JSON.stringify(jobs) === JSON.stringify([{ jobname: 'tarmem-daily-digest', schedule: '0 4 * * *', command: 'select public.ops_daily_digest()' }]) && third[third.length - 1].rows[0].pg_cron_installed === true,
  JSON.stringify(jobs));

console.log(results.join('\n'));
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
