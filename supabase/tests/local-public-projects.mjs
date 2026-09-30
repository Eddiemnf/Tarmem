/* 034 (open projects for visitors, without the homeowner) in a private Postgres: public_projects() lists exactly what a
   verified contractor is shown, the same for every caller, with only the ten safe columns; contact details, the district
   and the owner's name are masked in the text; visitors still cannot read the table itself.
   Run from the repo root: node supabase/tests/local-public-projects.mjs (see local.mjs). */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/eyad/Documents/GitHub/Tarmem/web/package.json');
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
  -- as Supabase defines it: the signed-in session's token, as the API passed it on
  create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
  create type auth.factor_status as enum ('unverified', 'verified');
  create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null, friendly_name text, factor_type text not null default 'totp',
    status auth.factor_status not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
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
  '026_whatsapp_inbox.sql', '027_change_requests.sql', '028_erasure_cleanup.sql', '029_launch_hardening.sql', '030_ops_lifecycle.sql', '031_verify_before_dealing.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
await db.exec(readFileSync(repo + '032_admin_two_step.sql', 'utf8'));
// the columns Supabase's auth.users has and 033 writes
await db.exec(`alter table auth.users add column instance_id uuid, add column aud text, add column role text, add column raw_app_meta_data jsonb,
  add column updated_at timestamptz, add column confirmation_token text, add column recovery_token text, add column email_change_token_new text, add column email_change text;`);
await db.exec(`select set_config('tarmem.now', '2026-09-30 12:00:00+03', false)`); // WhatsApp's quiet hours: noon in Riyadh

const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), CO = U('c1'), CO2 = U('c2'), REAL = '10000000-0000-4000-8000-000000000001';
await db.exec(`insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at) values
    ('${ADMIN}','o@t.sa','h0',now(),now()),('${HO}','sara@x.com','h1',now(),now()),('${CO}','co@x.com','h5',now(),now()),('${CO2}','new@x.com','h6',now(),now());
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),
    ('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${CO}','contractor','Khalid','0544444444','riyadh','مؤسسة البناء المتقن','ar'),
    ('${CO2}','contractor','Fahad','0544444445','riyadh','مؤسسة جديدة','ar');
  update public.profiles set email_verified_at = now(), email_verified_email = (select email from auth.users u where u.id = profiles.id);
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values
    ('مؤسسة البناء المتقن','Khalid','0544444444','co@x.com','riyadh',array['kitchen'],'${CO}','verified'),
    ('مؤسسة جديدة','Fahad','0544444445','new@x.com','riyadh',array['painting'],'${CO2}','new');
  select set_config('request.jwt.claim.sub', '${HO}', false); -- a real homeowner's real project
  insert into public.projects (id, title, trade, description, city, budget_min, budget_max, timing) values
    ('${REAL}','تجديد المطبخ','kitchen','تجديد المطبخ بالكامل مع الخزائن.','riyadh',10000,30000,'month');
  select set_config('request.jwt.claim.sub', '', false);`);

const n = (v) => Number(v);
const one = async (sql, params) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);`); return (await db.query(sql, params)).rows[0]; };
const as = async (role, sub, aal = 'aal1') => {
  const claims = sub ? JSON.stringify({ sub, role, aal }) : '';
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); select set_config('request.jwt.claims', '${claims}', false); set role ${role};`);
};
const tryAs = async (role, sub, sql, params, aal) => {
  await as(role, sub, aal);
  try { const r = await db.query(sql, params); return { ok: true, rows: r.rows }; } catch (e) { return { ok: false, error: String(e.message || e) }; } finally { await db.exec('reset role'); }
};
const sentCount = async () => n((await one('select count(*) c from public.sent')).c);
const alertCount = async () => n((await one('select count(*) c from public.alert_log')).c);

// ---- 033 first, then the proposed 034 (twice) ----
const f33 = readFileSync(repo + '033_preview_projects.sql', 'utf8');
await db.exec(f33);
const f34 = readFileSync(repo + '034_public_projects.sql', 'utf8');
const tallyOf = (r) => r[r.length - 1].rows[0];
const a1 = tallyOf(await db.exec(f34));
const a2 = tallyOf(await db.exec(f34));
const J = (x) => JSON.stringify(x, (k, v) => typeof v === 'bigint' ? Number(v) : v);
check('034 runs twice; visitors_see == contractors_see == 31, and no example text is masked', n(a2.visitors_see) === 31 && n(a2.contractors_see) === 31 && n(a2.examples_masked) === 0, J(a2));
{
  const P2 = '10000000-0000-4000-8000-000000000002';
  await db.exec(`update public.profiles set full_name = 'سارة  العتيبي', mobile = '0551234567' where id = '${HO}';
    select set_config('request.jwt.claim.sub', '${HO}', false);
    insert into public.projects (id, title, trade, description, city, district, budget_min, budget_max, timing) values
      ('${P2}', 'ترميم حمامين في النرجس', 'bathroom', 'فيلا في النرجس لعائلة العتيبي. أنا ساره العتيبي، جوالي 055 - 123 - 4567 أو ٥٥١٢٣٤٥٦٧.', 'riyadh', 'حي النرجس / شمال الرياض', 12000, 20000, 'month');
    select set_config('request.jwt.claim.sub', '', false);`);
  const row = (await one(`select title, description from public.public_projects('P-' || (select substr(code, 3) from public.projects where id = '${P2}'))`)) || {};
  const text = `${row.title} ${row.description}`;
  check('a real project: the district written without «حي», the family name, another spelling of the name and the owner\'s number in two forms are all hidden',
    Boolean(row.title) && !/النرجس|العتيبي|ساره|4567|٥٥١٢٣٤٥٦٧/.test(text) && text.includes('•••'), text);
  await db.exec(`delete from public.projects where id = '${P2}'; update public.profiles set full_name = 'سارة العتيبي', mobile = '0511111111' where id = '${HO}';`);
}
check('visitors_may_call', a2.visitors_may_call === 'confirm_email_verification, is_admin, mobile_taken, public_projects, wa_webhook' && n(a2.no_search_path) === 0, J(a2));

const anonList = await tryAs('anon', null, 'select * from public.public_projects()');
check('anon lists 31', anonList.ok && anonList.rows.length === 31, anonList.error || anonList.rows.length);
check('columns only the safe ones', anonList.ok && Object.keys(anonList.rows[0]).join(',') === 'code,title,trade,description,city,budget_min,budget_max,timing,created_at,preview', anonList.ok && Object.keys(anonList.rows[0]).join(','));
const anonTable = await tryAs('anon', null, 'select count(*) from public.projects');
check('anon still cannot read the table', !anonTable.ok && /permission denied/.test(anonTable.error), anonTable.error);
const anonMask = await tryAs('anon', null, `select public.public_mask('x', '{}')`);
check('anon cannot call public_mask', !anonMask.ok, anonMask.error);
const authMask = await tryAs('authenticated', CO, `select public.public_mask('x', '{}')`);
check('authenticated cannot call public_mask', !authMask.ok, authMask.error);

// districts and names never appear
const districts = (await db.query(`select distinct district d from public.projects where district is not null`)).rows.map((r) => r.d);
const names = (await db.query(`select distinct full_name f from public.profiles`)).rows.map((r) => r.f);
const leaks = [];
for (const r of anonList.rows) for (const d of districts.concat(districts.flatMap((x) => x.split(/\s*[,،]\s*/)))) if (d.length >= 3 && (r.title.includes(d) || r.description.includes(d))) leaks.push(`${r.code}:${d}`);
for (const r of anonList.rows) for (const f of names) if (r.title.includes(f) || r.description.includes(f)) leaks.push(`${r.code}:${f}`);
check('no district or owner name in any title/description', leaks.length === 0, leaks.join(' | '));
const changed = (await db.query(`select p.code, p.title, x.title mt from public.projects p join public.public_projects() x on x.code = p.code where p.preview and (p.title <> x.title or p.description <> x.description)`)).rows;
check('the example projects read whole to the public: the two that named their district are reworded, so nothing in them is masked', changed.length === 0, J(changed));

// same answer for everyone
const coList = await tryAs('authenticated', CO, 'select * from public.public_projects()');
const adminList = await tryAs('authenticated', ADMIN, 'select * from public.public_projects()', [], 'aal2');
const hoList = await tryAs('authenticated', HO, 'select * from public.public_projects()');
check('same rows for visitor, contractor, admin(aal2), homeowner', J(anonList.rows) === J(coList.rows) && J(anonList.rows) === J(adminList.rows) && J(anonList.rows) === J(hoList.rows));

// one by code, withdrawn/unknown give nothing
const real = await one(`select code from public.projects where id = '${REAL}'`);
const byCode = await tryAs('anon', null, 'select * from public.public_projects($1)', [real.code.toLowerCase()]);
check('by code (lower case ok)', byCode.ok && byCode.rows.length === 1 && byCode.rows[0].code === real.code, J(byCode));
await db.exec(`reset role; update public.projects set status = 'withdrawn' where id = '${REAL}'`);
const gone = await tryAs('anon', null, 'select * from public.public_projects($1)', [real.code]);
const missing = await tryAs('anon', null, 'select * from public.public_projects($1)', ['P-999999']);
check('withdrawn and unknown codes: both empty, indistinguishable', gone.ok && gone.rows.length === 0 && missing.ok && missing.rows.length === 0);
await db.exec(`reset role; update public.projects set status = 'open' where id = '${REAL}'`);

// an owner who cannot deal yet: hidden
await db.exec(`reset role; update public.profiles set email_verified_at = null where id = '${HO}'`);
const hidden = await tryAs('anon', null, 'select * from public.public_projects($1)', [real.code]);
check('an owner who has not confirmed email: project not listed', hidden.ok && hidden.rows.length === 0);
await db.exec(`reset role; update public.profiles set email_verified_at = now() where id = '${HO}'`);

// masking unit cases
const mask = async (t, hide = [], mobile = null) => (await one('select public.public_mask($1, $2::text[], $3) m', [t, hide, mobile])).m;
const cases = [
  ['اتصل 0551234567', 'اتصل •••'],
  ['جوالي ٠٥٥١٢٣٤٥٦٧ شكرا', 'جوالي ••• شكرا'],
  ['+966 55 123 4567', '•••'],
  ['00966-55-123-4567', '•••'],
  ['(055) 123-4567', '(•••'],
  ['055 123 4567', '•••'],
  ['واتس 966551234567', 'واتس •••'],
  ['fahad.o@gmail.com', '•••'],
  ['fahad @ gmail.com', '•••'],
  ['https://wa.me/966551234567 ok', '••• ok'],
  ['wa.me/966551234567', '•••'],
  ['instagram.com/fahad', '•••'],
  ['سناب @fahad_99', 'سناب •••'],
  ['www.example.org/x', '•••'],
  ['3×6 م بعمق 1.2 إلى 1.6 م', '3×6 م بعمق 1.2 إلى 1.6 م'],
  ['الميزانية 280000 - 450000 ريال', 'الميزانية 280000 - 450000 ريال'],
  ['خزان 2000 لتر، 30 يوم، 5.1.2', 'خزان 2000 لتر، 30 يوم، 5.1.2'],
  ['1,500,000', '1,500,000'],
  ['Cat6 to 8 data points, Wi-Fi', 'Cat6 to 8 data points, Wi-Fi'],
  ['the room.Saad said', 'the room.Saad said'],
  ['فيلا في الربوة قريبة', 'فيلا في ••• قريبة', ['الربوة']],
  ['نسكن بالربوة', 'نسكن ب•••', ['الربوة']],
  ['الربوةالجديدة', 'الربوةالجديدة', ['الربوة']],
  ['near Al Yasmin park', 'near ••• park', ['Al Yasmin']],
  ['in al yasmin.', 'in •••.', ['Al Yasmin']],
  ['المدينة المنورة', 'المدينة المنورة', ['نورة']],
  ['أنا فهد العتيبي', 'أنا •••', ['فهد العتيبي']],
  ['a (b) c+', 'a ••• c+', ['(b)']],
  // (review) the separators phones and keyboards really produce
  ['+966\u00A055\u00A0123\u00A04567', '•••'],
  ['055 - 123 - 4567', '•••'],
  ['05 - 51 - 23 - 45 - 67', '•••'],
  ['055 – 123 – 4567', '•••'],
  ['٠٥٥–١٢٣–٤٥٦٧', '•••'],
  ['055\u2011123\u20114567', '•••'],
  ['055/123/4567', '•••'],
  ['055، 123، 4567', '•••'],
  ['055\u200F123\u200F4567', '•••'],
  ['رقمي 05 51 2 3 45 67 تواصل', 'رقمي ••• تواصل', [], '0551234567'],
  ['واتسابي ٥٥١٢٣٤٥٦٧', 'واتسابي •••', [], '0551234567'],
  ['سنابي fahad_99 انستا fahad.home', 'سنابي ••• انستا •••'],
  ['snap: fahad_99', 'snap: •••'],
  ['الموقع 24.7136, 46.6753', 'الموقع •••'],
  ['العنوان المختصر RHMA3697', 'العنوان المختصر •••'],
  ['linktr.ee/fahad', '•••'],
  ['ali@gmail. com', '•••'],
  ['في ابحر الشمالية', 'في •••', ['أبحر الشمالية']],
  ['near Al-Yasmin park', 'near ••• park', ['Al Yasmin']],
  ['near AlYasmin park', 'near ••• park', ['Al Yasmin']],
  ['حي الملقى', 'حي •••', ['الملقا']],
  ['أنا ساره العتيبي', 'أنا •••', ['سارة العتيبي']],
  // and what must stay
  ['من 50,000 إلى 550,000 ريال', 'من 50,000 إلى 550,000 ريال'],
  ['مكيفات سبليت 18000 وحدة، 2 طن', 'مكيفات سبليت 18000 وحدة، 2 طن'],
  ['WiFi 2024 router, Cat6', 'WiFi 2024 router, Cat6'],
  ['نورة الصغيرة ومنيرة', 'نورة الصغيرة ومنيرة', ['العتيبي']],
];
for (const [inp, want, hide, mobile] of cases) { const got = await mask(inp, hide || [], mobile || null); check(`mask ${JSON.stringify(inp)}`, got === want, `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }

// scale: 3000 more open projects from 300 more owners who can deal, 300 who cannot
await db.exec(`reset role; alter table public.projects disable trigger user;
  insert into auth.users (id, email, email_confirmed_at, created_at) select ('20000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'o' || g || '@x.com', now(), now() from generate_series(1, 600) g;
  insert into public.profiles (id, role, full_name, mobile, city, lang, email_verified_at, email_verified_email)
    select ('20000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid, 'homeowner', 'Owner ' || g, '05' || lpad(g::text, 8, '0'), 'riyadh', 'ar',
           case when g <= 300 then now() end, case when g <= 300 then 'o' || g || '@x.com' end from generate_series(1, 600) g;
  insert into public.projects (code, owner_id, title, trade, description, city, district, budget_min, budget_max, timing, status, created_at)
    select 'P-' || (900000 + g), ('20000000-0000-4000-8000-' || lpad((1 + g % 600)::text, 12, '0'))::uuid, 'مشروع ' || g, 'kitchen',
           repeat('وصف طويل للمشروع مع تفاصيل كثيرة ورقم 0551234567 ', 60), 'riyadh', 'حي ' || g, 1000, 2000, 'month', 'open', now() - (g || ' minutes')::interval
      from generate_series(1, 6000) g;
  alter table public.projects enable trigger user; analyze;`);
const t0 = Date.now();
const big = await tryAs('anon', null, 'select * from public.public_projects()');
const ms = Date.now() - t0;
check(`scale: 6,000 more open projects (600 owners, half can deal) → capped at 300 in ${ms} ms`, big.ok && big.rows.length === 300, big.error || big.rows.length);
const plan = (await db.query(`explain analyze select * from public.public_projects()`)).rows.map((r) => r['QUERY PLAN']).join('\n');
console.log(plan);

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
