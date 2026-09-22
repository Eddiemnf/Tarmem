/* 014 (one WhatsApp template per event, submitted by the database) in a private Postgres, with Meta's endpoints imitated. See local.mjs. */
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
  create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ begin
    if url like '%/message_templates' then insert into public.sent (to_addr, subject, html) values ('meta:' || url, body->>'name', body::text);
    elsif url like 'https://graph.facebook.com/%' then insert into public.sent (to_addr, subject, html) values ('wa:' || (body->>'to'), body->'template'->>'name', body::text);
    else insert into public.sent (to_addr, subject, html) values (body->'to'->>0, body->>'subject', body->>'html'); end if; return 1; end; $$;`);
for (const f of ['001_accounts_projects_forms.sql', '002_admin_console.sql', '003_project_files.sql', '004_contractor_accounts.sql', '005_bids.sql', '006_agreements.sql', '007_settings_reviews_stages.sql', '008_contractor_profiles_wallet.sql', '009_alerts.sql']) await db.exec(readFileSync(repo + f, 'utf8').replace(/create extension if not exists (pgcrypto|pg_net);.*/g, ''));
const ten = readFileSync(repo + '010_customer_emails.sql', 'utf8');
await db.exec(ten); await db.exec(ten);
check('010 runs cleanly, twice', true);
for (const f of ['011_portfolio.sql']) await db.exec(readFileSync(repo + f, 'utf8'));
await db.exec(readFileSync(repo + '012_whatsapp.sql', 'utf8'));
await db.exec(readFileSync(repo + '013_whatsapp_settings.sql', 'utf8'));
await db.exec(`create function net.http_delete(url text, params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) returns bigint
  language plpgsql as $$ begin insert into public.sent (to_addr, subject, html) values ('delete:' || url, '', ''); return 1; end; $$;`);
const fourteen = readFileSync(repo + '014_whatsapp_templates.sql', 'utf8');
check('014 refuses to submit templates before WhatsApp is switched on', /not switched on/.test(await fails(fourteen)));
await db.exec(`select public.set_alerts('re_TESTKEY_abcdefghijklmnopqrstuvwxyz01', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa'); select public.set_whatsapp('EAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '1377051788817873', 'tarmem_update');`);
await db.exec(fourteen); await db.exec(fourteen);
check('014 runs cleanly, twice, once WhatsApp is on', true);


const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), HOEN = U('b2'), CO = U('c1'), CO2 = U('c2');
await db.exec(`insert into auth.users (id, email) values ('${ADMIN}','o@t.sa'),('${HO}','sara@x.com'),('${HOEN}','john@x.com'),('${CO}','co@x.com'),('${CO2}','co2@x.com');
  insert into public.profiles (id, role, full_name, mobile, city, company, lang) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null,'ar'),('${HO}','homeowner','سارة العتيبي','0511111111','riyadh',null,'ar'),('${HOEN}','homeowner','John Smith','+966 52 222 2222','riyadh',null,'en'),
    ('${CO}','contractor','Khalid','0533333333','riyadh','مؤسسة البناء المتقن','ar'),('${CO2}','contractor','Fahad','0544444444','jeddah','Other Co','en');
  insert into public.contractor_applications (company, person, mobile, email, city, trades, user_id, status) values ('مؤسسة البناء المتقن','Khalid','0533333333','co@x.com','riyadh',array['kitchen'],'${CO}','verified'),('Other Co','Fahad','0544444444','co2@x.com','jeddah',array['kitchen'],'${CO2}','new');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const rows = async (sql) => { await db.exec('reset role'); return (await db.query(sql)).rows; };
const lastWa = async () => { const r = (await rows(`select * from public.sent where to_addr like 'wa:%' order by id desc limit 1`))[0]; return r ? { ...r, body: JSON.parse(r.html) } : null; };
const lastLog = async () => (await rows(`select * from public.email_log where channel = 'whatsapp' and recipient <> 'meta' order by id desc limit 1`))[0];
const day = `set tarmem.now = '2026-09-22 12:00:00+03'`, night = `set tarmem.now = '2026-09-22 23:30:00+03'`, morning = `set tarmem.now = '2026-09-23 08:05:00+03'`;

// the specs
const specs = (await rows(`select public.wa_template_specs() s`))[0].s;
const events = specs.map((s) => s.event);
check('nine templates, one per event the site sends, plus the test message', events.join(',') === 'project_posted,new_bid,agreement_accepted,agreement_signed,application_verified,stage_submitted,stage_released,stage_disputed,wa_test', events.join(','));
const balanced = specs.every((s) => ['ar', 'en'].every((l) => { const vars = new Set((s[l].body.match(/\{\{\d+\}\}/g) || [])); const n = vars.size; return s[l].samples.length === n && [...Array(n).keys()].every((i) => vars.has(`{{${i + 1}}}`)) && s[l].button.length <= 25 && s[l].body.length <= 1024 && !/^\{\{|\}\}$/.test(s[l].body.trim()); }));
check('every body has a sample per variable, numbered 1..n, fixed words at both ends, and a button text under 26 characters', balanced);
check('every template names its event in fixed words (Meta reads those, not the variables)', specs.every((s) => /ترميم/.test(s.ar.body) && /Tarmem/.test(s.en.body) && s.ar.body.replace(/\{\{\d+\}\}/g, '').length > 40));

// the submission
const submitted = await rows(`select * from public.sent where to_addr like 'meta:%' order by id`);
check('running 014 submits all 18 (9 × 2 languages) to Meta, to the WhatsApp Business account, as Utility without allowing a category change', submitted.length === 36 && submitted.every((r) => r.to_addr === 'meta:https://graph.facebook.com/v25.0/2162520270999056/message_templates') && submitted.slice(0, 18).every((r) => { const b = JSON.parse(r.html); return b.category === 'UTILITY' && b.allow_category_change === false && ['ar', 'en'].includes(b.language) && /^tarmem_[a-z_]+$/.test(b.name); }), `${submitted.length} (two runs)`);
{
  const bid = JSON.parse(submitted.find((r) => r.subject === 'tarmem_new_bid' && JSON.parse(r.html).language === 'ar').html);
  const bodyC = bid.components.find((c) => c.type === 'BODY'), btn = bid.components.find((c) => c.type === 'BUTTONS');
  check('a template carries its body with samples, and one dynamic website button with its own sample', bodyC.example.body_text[0].length === 4 && btn.buttons[0].type === 'URL' && btn.buttons[0].url === 'https://www.tarmem.sa/{{1}}' && btn.buttons[0].example[0] === 'https://www.tarmem.sa/project/P-2001' && btn.buttons[0].text === 'قارن العروض', JSON.stringify(bid).slice(0, 300));
  const test = JSON.parse(submitted.find((r) => r.subject === 'tarmem_wa_test' && JSON.parse(r.html).language === 'en').html);
  check('the test message template has no variables and so no samples', !test.components[0].example);
  check('…and the submissions are logged', (await rows(`select count(*)::int n from public.email_log where recipient = 'meta' and status = 'submitted'`))[0].n === 36);
}
await db.exec(`select public.wa_delete_template('tarmem_update')`);
check('the old generic pair can be deleted through the API', (await rows(`select to_addr from public.sent where to_addr like 'delete:%'`))[0]?.to_addr === 'delete:https://graph.facebook.com/v25.0/2162520270999056/message_templates?name=tarmem_update');
check('…but not with a name that is not a template name', /template name/.test(await fails(`select public.wa_delete_template('x; drop')`)));

// the sends, with specifics
await db.exec(day);
await as('authenticated', HO);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('تجديد مطبخ 4×5','kitchen','خزائن ورخام','riyadh',40000,60000,'month')`);
const P = (await rows(`select id, code from public.projects order by created_at desc limit 1`))[0];
let m = await lastWa();
check('a posted project sends tarmem_project_posted in Arabic with the code and the title, and the button opens the project',
  m?.body.template.name === 'tarmem_project_posted' && m.body.template.language.code === 'ar' && m.body.template.components[0].parameters.map((p) => p.text).join('|') === `${P.code}|تجديد مطبخ 4×5` && m.body.template.components[1].parameters[0].text === 'project/' + P.code, JSON.stringify(m?.body).slice(0, 300));
check('…and the email still goes as before', (await rows(`select count(*)::int n from public.sent where to_addr = 'sara@x.com' and subject like 'نُشر مشروعك%'`))[0].n === 1);
await as('authenticated', CO);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 52000, 30, '', '{}')`);
m = await lastWa();
check('a bid sends tarmem_new_bid with the code, the company, the amount and the days', m?.body.template.name === 'tarmem_new_bid' && m.body.template.components[0].parameters.map((p) => p.text).join('|') === `${P.code}|مؤسسة البناء المتقن|52,000|30`, JSON.stringify(m?.body.template.components).slice(0, 300));
await as('authenticated', HOEN);
await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('Bathroom','kitchen','tiles','riyadh',10000,20000,'month')`);
m = await lastWa();
check('an English-speaking person gets the English template', m?.body.template.language.code === 'en' && m.body.template.name === 'tarmem_project_posted' && m.body.template.components[0].parameters[1].text === 'Bathroom');
await as('authenticated', HO);
const test = (await db.query(`select public.whatsapp_test() n`)).rows[0].n;
m = await lastWa();
check('the test button sends tarmem_test with no body parameters and a button to the settings page', test === '966511111111' && m?.body.template.name === 'tarmem_wa_test' && m.body.template.components.length === 1 && m.body.template.components[0].type === 'button' && m.body.template.components[0].parameters[0].text === 'settings', JSON.stringify(m?.body.template.components));
await db.exec(`reset role; select public.send_whatsapp('0511111111', 'ar', 'no_such_event', array['x'], 'x')`);
check('an event without a template is skipped and logged, never sent', (await lastLog()).status === 'skipped' && /no template/.test((await lastLog()).detail));
await db.exec(`reset role; select public.send_whatsapp('0511111111', 'ar', 'stage_disputed', array['1', '${P.code}', E'الدهان\\nغير   مكتمل'], 'project/${P.code}')`);
m = await lastWa();
check('line breaks and runs of spaces inside a specific are flattened (Meta refuses them)', m?.body.template.components[0].parameters[2].text === 'الدهان غير مكتمل');

// verifying the second contractor (by the team, in the daytime) tells them on WhatsApp in their language
await db.exec(`reset role; update public.contractor_applications set status = 'verified' where user_id = '${CO2}'`);
m = await lastWa();
check('a verified contractor gets tarmem_application_verified with their company, in their language, with a button to sign in', m?.body.template.name === 'tarmem_application_verified' && m.body.template.language.code === 'en' && m.body.template.components[0].parameters[0].text === 'Other Co' && m.body.template.components[1].parameters[0].text === 'signin', JSON.stringify(m?.body.template).slice(0, 300));

// quiet hours still hold the specifics
await db.exec(night);
await as('authenticated', CO2);
await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P.id}', 48000, 25, '', '{}')`);
const before = (await rows(`select count(*)::int n from public.sent where to_addr like 'wa:%'`))[0].n;
check('at 23:30 the bid waits in the queue with its specifics', (await lastLog()).status === 'queued' && (await rows(`select params, event from public.wa_queue`))[0]?.params.join('|') === `${P.code}|Other Co|48,000|25`, JSON.stringify(await rows(`select * from public.wa_queue`)));
await db.exec(morning);
check('at 08:05 it goes out as the right template with them', (await rows(`select public.wa_flush() n`))[0].n === 1 && (await lastWa()).body.template.name === 'tarmem_new_bid' && (await lastWa()).body.template.components[0].parameters[1].text === 'Other Co' && (await rows(`select count(*)::int n from public.sent where to_addr like 'wa:%'`))[0].n === before + 1);

// 015: a token pasted with its line break
await db.exec(`reset role; update public.app_secrets set value = E'\\nEAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\\n' where key = 'wa_token'`);
await db.exec(readFileSync(repo + '015_secret_whitespace.sql', 'utf8'));
check('015 strips the line break a paste left on the stored token, and resubmits the templates', (await rows(`select value from public.app_secrets where key = 'wa_token'`))[0].value === 'EAAtestTOKENxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' && (await rows(`select count(*)::int n from public.sent where to_addr like 'meta:%'`))[0].n === 54);
await db.exec(`select public.set_whatsapp(E'\\n EAAtestTOKENyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy \\n', E' 1377051788817873\\n', 'x')`);
check('…set_whatsapp now stores a pasted token clean, whatever surrounds it', (await rows(`select value from public.app_secrets where key = 'wa_token'`))[0].value === 'EAAtestTOKENyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy' && (await rows(`select value from public.app_secrets where key = 'wa_phone_id'`))[0].value === '1377051788817873');
check('…and refuses anything that is not letters and digits', /does not look like/.test(await fails(`select public.set_whatsapp('EAA-bad/token+with*punctuation=======================', '1377051788817873', 'x')`)));

// 016: two reworded, under new names, submitted alone
await db.exec(readFileSync(repo + '016_arabic_templates_reworded.sql', 'utf8'));
{
  const after = await rows(`select * from public.sent where to_addr like 'meta:%' order by id desc limit 10`);
  const renamed = ['tarmem_project_posted_2', 'tarmem_new_bid_2', 'tarmem_application_verified_2', 'tarmem_agreement_signed_2', 'tarmem_wa_test_2'];
  check('016 submits only the five reworded events, both languages, under their new names', after.length === 10 && after.every((r) => renamed.includes(r.subject)) && new Set(after.map((r) => r.subject)).size === 5 && (await rows(`select count(*)::int n from public.sent where to_addr like 'meta:%'`))[0].n === 64, after.map((r) => r.subject).join(','));
  check('…and asked Meta to delete the five it re-filed', (await rows(`select count(*)::int n from public.sent where to_addr like 'delete:%' and (to_addr like '%name=tarmem_project_posted' or to_addr like '%name=tarmem_new_bid' or to_addr like '%name=tarmem_application_verified' or to_addr like '%name=tarmem_agreement_signed' or to_addr like '%name=tarmem_wa_test')`))[0].n === 5);
  const specsNow = (await rows(`select public.wa_template_specs() s`))[0].s;
  check('no reworded Arabic body uses the word عرض, which Meta reads as "offer"; the four that passed are untouched', specsNow.filter((x) => ['project_posted', 'new_bid', 'application_verified', 'agreement_signed', 'wa_test'].includes(x.event)).every((x) => !/عرض|عروض/.test(x.ar.body)) && specsNow.find((x) => x.event === 'stage_released').ar.body.includes('صُرفت دفعتها'));
  const spec = (await rows(`select public.wa_template_specs() s`))[0].s.find((x) => x.event === 'wa_test');
  check('the test message now carries the confirmed number as its one variable', spec.ar.samples.length === 1 && /\{\{1\}\}/.test(spec.ar.body) && /confirmed/.test(spec.en.body));
  await db.exec(day);
  await as('authenticated', HO);
  await db.exec(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('حمام','kitchen','بلاط','riyadh',10000,20000,'month')`);
  const m1 = await lastWa();
  check('a posted project is now sent with the reworded template\u2019s name', m1?.body.template.name === 'tarmem_project_posted_2' && m1.body.template.components[0].parameters[1].text === 'حمام');
  const P3 = (await rows(`select id from public.projects order by created_at desc limit 1`))[0];
  await as('authenticated', CO);
  await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P3.id}', 9000, 7, '', '{}')`);
  const m1b = await lastWa();
  check('…and a bid with tarmem_new_bid_2, the same four specifics, button to the project', m1b?.body.template.name === 'tarmem_new_bid_2' && m1b.body.template.components[0].parameters.map((p) => p.text).join('|') === 'P-2003|مؤسسة البناء المتقن|9,000|7' && m1b.body.template.components[1].parameters[0].text === 'project/P-2003', JSON.stringify(m1b?.body.template.components).slice(0, 200));
  await as('authenticated', HOEN);
  await db.exec(`update public.profiles set mobile = '0522222222' where id = '${HOEN}'`);
  await db.exec(`select public.whatsapp_test()`);
  const m2 = await lastWa();
  check('…and the test message with the pretty number and the settings button', m2?.body.template.name === 'tarmem_wa_test_2' && m2.body.template.components[0].parameters[0].text === '+966 52 222 2222' && m2.body.template.components[1].parameters[0].text === 'settings', JSON.stringify(m2?.body.template.components));
}

// 017: the bid message as a numbered record
await db.exec(readFileSync(repo + '017_bid_template_as_record.sql', 'utf8'));
{
  const after = await rows(`select * from public.sent where to_addr like 'meta:%' order by id desc limit 2`);
  check('017 submits only the bid template, both languages, as tarmem_new_bid_3 with five variables', after.length === 2 && after.every((r) => r.subject === 'tarmem_new_bid_3' && JSON.parse(r.html).components[0].example.body_text[0].length === 5) && (await rows(`select count(*)::int n from public.sent where to_addr like 'meta:%'`))[0].n === 66);
  const spec = (await rows(`select public.wa_template_specs() s`))[0].s.find((x) => x.event === 'new_bid');
  check('…its Arabic has no "new" and no plural of bid', !/جديد|عطاءات|عروض|عرض/.test(spec.ar.body) && /تم استلام العطاء رقم/.test(spec.ar.body));
  await db.exec(day);
  const P4 = (await rows(`select id, code from public.projects order by created_at desc limit 1`))[0];
  await as('authenticated', CO2);
  await db.exec(`insert into public.bids (project_id, price, days, note, details) values ('${P4.id}', 8500, 6, '', '{}')`);
  const m3 = await lastWa();
  check('a bid now sends tarmem_new_bid_3 with the project, the bid number on it, the company, the amount and the days', m3?.body.template.name === 'tarmem_new_bid_3' && m3.body.template.components[0].parameters.map((p) => p.text).join('|') === `${P4.code}|2|Other Co|8,500|6`, JSON.stringify(m3?.body.template.components[0]).slice(0, 220));
}

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
