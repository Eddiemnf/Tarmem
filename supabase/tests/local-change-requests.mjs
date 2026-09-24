/* 027 (change requests) in a private Postgres, with the providers imitated. See local.mjs. */
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

for (const f of ['024_auth_emails.sql', '025_advisor_fixes.sql', '026_whatsapp_inbox.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
const t27 = readFileSync(repo + '027_change_requests.sql', 'utf8');
await db.exec(t27); await db.exec(t27);
check('027 runs cleanly, twice, on top of 001–026', true);

// a signed project: Sara posts, Khalid bids 50,000 over 30 days, both sign
await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد مطبخ','kitchen','خزائن','riyadh',40000,60000,'month')`);
const P = await one(`select id, code from public.projects where owner_id = '${HO}'`);
await as('authenticated', CO);
const B = (await db.query(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 50000, 30, 'ok', '{}') returning id`)).rows[0].id;
const create = async (who, desc, amount = 0, days = 0) => { await as('authenticated', who); try { return (await db.query(`select * from public.change_request_create($1, $2, $3, $4)`, [P.id, desc, amount, days])).rows[0]; } catch (e) { return String(e.message); } finally { await db.exec('reset role'); } };
const approve = async (who, id) => { await as('authenticated', who); try { return (await db.query(`select * from public.change_request_approve($1)`, [id])).rows[0]; } catch (e) { return String(e.message); } finally { await db.exec('reset role'); } };
check('before both have signed, no change can be proposed', /once both parties have signed/.test(await create(HO, 'إضافة إنارة', 2500, 3)));
await as('authenticated', HO); await db.exec(`select public.sign_agreement_homeowner('${B}')`);
await as('authenticated', CO); await db.exec(`select public.sign_agreement_contractor('${P.id}')`);
await db.exec('reset role; delete from public.sent;');

// 1 — the contractor proposes, the homeowner approves
const c1 = await create(CO, 'إضافة نقاط إنارة في السقف', 2500, 3);
check('the contractor proposes a change: CR-1, their side approved, waiting for the other', c1?.code === 'CR-1' && c1.by_side === 'co' && c1.co_ok_at && !c1.ho_ok_at && !c1.applied_at, JSON.stringify(c1).slice(0, 200));
const mail1 = await one(`select to_addr, subject, html from public.sent order by id desc limit 1`);
check('…and the homeowner is emailed, in Arabic, with what changes and a link to the project', mail1?.to_addr === 'sara@x.com' && /طلب تغيير/.test(mail1.subject) && mail1.html.includes('إضافة نقاط إنارة') && mail1.html.includes('+2500') && mail1.html.includes('/project/' + P.code), mail1?.subject);
check('the proposer cannot approve their own change', /other party approves/.test(await approve(CO, c1.id)));
check('a stranger can neither propose nor approve', /two parties/.test(await create(HO2, 'x y z', 1)) && /two parties/.test(await approve(HO2, c1.id)));
const a1 = await approve(HO, c1.id);
check('the homeowner approves: the change is applied and the project’s value moves by it', a1?.applied_at && (await one(`select amount from public.projects where id = '${P.id}'`)).amount === 52500 && (await one(`select amount from public.agreements where project_id = '${P.id}'`)).amount === 50000);
check('…the contractor is told it was approved, with the new value', /اعتُمد طلب التغيير/.test((await one(`select subject from public.sent where to_addr = 'co@x.com' order by id desc limit 1`))?.subject || '') && (await one(`select html from public.sent where to_addr = 'co@x.com' order by id desc limit 1`)).html.includes('52500'));
check('approving twice changes nothing', (await approve(HO, c1.id))?.applied_at && (await one(`select amount from public.projects where id = '${P.id}'`)).amount === 52500);

// 2 — the homeowner proposes a cut; limits
const c2 = await create(HO, 'إلغاء تغيير بلاط الممر', -4000, 0);
check('the homeowner proposes a deduction: CR-2, waiting for the contractor', c2?.code === 'CR-2' && c2.by_side === 'ho' && c2.amount === -4000);
await approve(CO, c2.id);
check('…the contractor approves: 52,500 − 4,000 = 48,500', (await one(`select amount from public.projects where id = '${P.id}'`)).amount === 48500);
check('a change that would take the value below 100 riyals is refused', /limits/.test(await create(HO, 'إلغاء كل شيء', -48450)));
check('a change without words is refused', /describe the change/.test(await create(HO, '  ', 100)));
check('change_total follows the signed amount and every applied change', Number((await one(`select public.change_total('${P.id}') v`)).v) === 48500);

// 3 — who reads them
const readAs = async (who) => { await as('authenticated', who); try { return (await db.query(`select count(*)::int n from public.change_requests`)).rows[0].n; } finally { await db.exec('reset role'); } };
check('the two parties and admins read the project’s changes; another customer reads none', (await readAs(HO)) === 2 && (await readAs(CO)) === 2 && (await readAs(ADMIN)) === 2 && (await readAs(HO2)) === 0);
await as('authenticated', HO);
check('nobody writes the table directly: only through the two functions', /permission denied|row-level/.test(await fails(`insert into public.change_requests (project_id, code, by_side, description) values ('${P.id}', 'CR-9', 'ho', 'sneaky')`) || '') && /permission denied|row-level/.test(await fails(`update public.change_requests set applied_at = now()`) || ''));
await db.exec('reset role');
for (let i = 0; i < 10; i += 1) await create(HO, 'تغيير صغير ' + i, 10);
check('ten may wait at once; the eleventh is refused', /too many/.test(await create(HO, 'واحد آخر', 10)));

console.log(results.join('\n'));
const failed = results.filter((x) => x.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
