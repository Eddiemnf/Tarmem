/* 025 (the WhatsApp test's value, and the fixes Supabase's security and performance advisors asked for) in a private Postgres, with the providers imitated. See local.mjs. */
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

await db.exec(readFileSync(repo + '024_auth_emails.sql', 'utf8'));

// A small world: two homeowners with projects, a contractor with a bid, a message and a photo, a visitor's contact message
await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد مطبخ','kitchen','خزائن','riyadh',40000,60000,'month')`);
const P = await one(`select id, code from public.projects where owner_id = '${HO}'`);
await as('authenticated', HO2);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('دهان غرفتين','painting','غرفتان','riyadh',5000,9000,'month')`);
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 52000, 30, 'ok', '{}')`);
await db.exec(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO}', 'متى يمكن معاينة الموقع؟')`);
await db.exec(`insert into public.portfolio (path, caption) values ('${CO}/one.jpg','x')`);
await as('anon');
await db.exec(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('نورة','noura@x.com',null,'billing','سؤال','ar')`);
await db.exec(`insert into public.visits (session_id, event, route, path, lang, device) values ('abcdefghij','view','home','/','ar','mobile')`);
await db.exec(`reset role`);

// What each person can read, table by table, before and after
const tables = (await rows(`select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind in ('r', 'v') order by 1`)).map((r) => r.relname);
const viewers = [['anon', ''], ['authenticated', HO], ['authenticated', HO2], ['authenticated', CO], ['authenticated', ADMIN]];
const fingerprint = async () => {
  const out = {};
  for (const [role, sub] of viewers) for (const t of tables) {
    await as(role, sub);
    const key = `${sub ? sub.slice(-2) : 'anon'}:${t}`;
    try { out[key] = (await db.query(`select count(*)::int n from public.${t}`)).rows[0].n; } catch { out[key] = 'refused'; }
  }
  await db.exec(`reset role`);
  return out;
};
const before = await fingerprint();
check('the world is not trivial: the homeowner sees their project, the contractor their bid, a visitor no secrets', before[`b1:projects`] >= 1 && before[`c1:bids`] >= 1 && (before['anon:app_secrets'] === 0 || before['anon:app_secrets'] === 'refused'), JSON.stringify({ p: before['b1:projects'], b: before['c1:bids'], s: before['anon:app_secrets'] }));

const policies = () => rows(`select tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' order by 1, 2`);
const indexes = () => n(`select count(*)::int n from pg_indexes where schemaname = 'public'`);
const twentyfive = readFileSync(repo + '025_advisor_fixes.sql', 'utf8');
await db.exec(twentyfive);
const rules1 = JSON.stringify(await policies()), idx1 = await indexes();
const second = await db.exec(twentyfive);
check('025 runs cleanly, twice; the second run changes no rule and adds no index', rules1 === JSON.stringify(await policies()) && idx1 === await indexes());
const tally = second[second.length - 1].rows[0];
check('its last line counts nothing left: no callable trigger, no loose search_path, no per-row rule, no link without an index',
  Number(tally.triggers_callable) === 0 && Number(tally.no_search_path) === 0 && Number(tally.per_row_rules) === 0 && Number(tally.unindexed_links) === 0, JSON.stringify(tally, (k, v) => typeof v === 'bigint' ? Number(v) : v));

const after = await fingerprint();
const moved = Object.keys(before).filter((k) => before[k] !== after[k]);
check(`every person still reads exactly the rows they read before (${Object.keys(before).length} person-table pairs)`, moved.length === 0, moved.map((k) => `${k}: ${before[k]} → ${after[k]}`).join('; '));

// 1 — the WhatsApp test carries its value
await db.exec(`reset role; delete from public.email_log where template = 'wa_test'; delete from public.sent;`);
const waTest = async (who) => { await as('authenticated', who); const e = await fails(`select public.whatsapp_test()`); const m = await one(`select raw from public.sent where to_addr like 'wa:%' order by id desc limit 1`); return { e, t: m ? JSON.parse(m.raw).template : null }; };
let w = await waTest(HO3);
check('the WhatsApp test sends tarmem_wa_test_2 with its one value, the number as people read it, and the settings button',
  w.e === false && w.t?.name === 'tarmem_wa_test_2' && w.t.language.code === 'en' && w.t.components[0].type === 'body' && w.t.components[0].parameters.length === 1
  && w.t.components[0].parameters[0].text === '+966 53 333 3333' && w.t.components[1].parameters[0].text === 'settings', w.e || JSON.stringify(w.t?.components));
w = await waTest(HO);
check('…in Arabic for an Arabic-speaking customer', w.e === false && w.t?.language.code === 'ar' && w.t.components[0].parameters[0].text === '+966 51 111 1111', w.e || JSON.stringify(w.t));
await db.exec(`reset role; update public.email_log set answer_code = 200 where template = 'wa_test'`);
let refused = 0;
for (let i = 2; i <= 4; i++) { const r = await waTest(HO); if (r.e) { refused = i; break; } }
check('…and the allowance of 023 is unchanged: the fourth test of the day is refused', refused === 4, String(refused));

// 2 — who may call what
const can = async (role, fn) => (await one(`select has_function_privilege('${role}', '${fn}', 'execute') ok`)).ok;
check('trigger functions can no longer be called through the API, by visitors or by signed-in people',
  !(await can('anon', 'public.alert_on_insert()')) && !(await can('authenticated', 'public.alert_on_insert()')) && !(await can('authenticated', 'public.notify_password_changed()'))
  && !(await can('anon', 'public.forms_rate_limit()')) && !(await can('authenticated', 'public.projects_before_insert()')));
check('can_message needs a signed-in caller; what must work before sign-in still does (is_admin in row rules, mobile_taken on the sign-up form)',
  !(await can('anon', 'public.can_message(uuid, uuid)')) && await can('authenticated', 'public.can_message(uuid, uuid)') && await can('anon', 'public.is_admin()') && await can('anon', 'public.mobile_taken(text)'));
const loose = await rows(`select p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.prokind = 'f' and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')`);
check('every function in public has a fixed search_path, and the helpers behave the same', loose.length === 0
  && (await one(`select public.url_encode('a b/ت') v`)).v === 'a%20b%2F%D8%AA' && (await one(`select public.wa_number('0533333333') v`)).v === '966533333333', loose.map((r) => r.proname).join(', '));

// triggers still run for people who may not call them
const sentBefore = await n(`select count(*)::int n from public.sent`);
await as('authenticated', HO);
const own = await fails(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد حمام','bathroom','بلاط','riyadh',9000,15000,'month')`);
const newest = await one(`select code from public.projects where owner_id = '${HO}' order by created_at desc, code desc limit 1`);
check('a homeowner still posts a project: its triggers give it a code and send its emails', own === false && /^P-\d+$/.test(newest?.code || '') && (await n(`select count(*)::int n from public.sent`)) > sentBefore, own || newest?.code);
await as('authenticated', HO);
const forged = await fails(`insert into public.projects (owner_id, title, trade, description, city, budget_min, budget_max, timing) values ('${HO2}','حمام','bathroom','بلاط','riyadh',9000,15000,'month')`);
check('…and still cannot post one in someone else’s name', /permission denied|row-level security|violates/.test(forged || ''), forged);
await as('authenticated', HO);
const reply = await fails(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO}', 'غدًا الساعة 5')`);
await as('authenticated', HO2);
const intrude = await fails(`insert into public.project_messages (project_id, contractor_id, body) values ('${P.id}', '${CO}', 'مرحبًا')`);
check('messages still pass their rule: the homeowner replies, a stranger cannot write into the project', reply === false && /row-level security|violates/.test(intrude || ''), `${reply} | ${intrude}`);
await as('anon');
const contact = await fails(`insert into public.contact_messages (name, email, mobile, topic, message, lang) values ('Sam','sam@x.com',null,'other','hello','en')`);
check('a visitor’s contact message still passes its spam check and gets its receipt', contact === false && (await n(`select count(*)::int n from public.sent where to_addr = 'sam@x.com'`)) === 1, contact);
const readAs = async (who, sql) => { await as('authenticated', who); const r = (await db.query(sql)).rows[0].n; await db.exec(`reset role`); return r; };
const stranger = await readAs(HO2, `select count(*)::int n from public.profiles where id = '${HO}'`);
const self = await readAs(HO, `select count(*)::int n from public.profiles where id = '${HO}' and mobile is not null`);
check('a person still reads their own profile and not another customer’s', self === 1 && stranger === 0, `${self} ${stranger}`);

// 3, 4 — the speed fixes
const bare = await rows(`select tablename, policyname from pg_policies where schemaname = 'public' and (qual ~ '(?<!SELECT )auth\\.uid\\(\\)' or with_check ~ '(?<!SELECT )auth\\.uid\\(\\)')`);
const wrapped = await n(`select count(*)::int n from pg_policies where schemaname = 'public' and (qual like '%SELECT auth.uid()%' or with_check like '%SELECT auth.uid()%')`);
check(`row rules read the signed-in person once per query (${wrapped} rules), none once per row`, bare.length === 0 && wrapped >= 10, JSON.stringify(bare));
const unindexed = await rows(`select c.conrelid::regclass::text t, c.conname from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and array_to_string((i.indkey::int2[])[0:array_length(c.conkey, 1) - 1], ',') = array_to_string(c.conkey, ','))`);
check('every link between tables has an index under it', unindexed.length === 0, JSON.stringify(unindexed));

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
