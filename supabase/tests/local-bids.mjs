/* 005 (bids) and the test-row cleanup, in a private Postgres. See local.mjs for how to run. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { PGlite } = createRequire(new URL('../../web/package.json', import.meta.url))('@electric-sql/pglite');
const repo = new URL('../', import.meta.url).pathname;
const db = new PGlite();
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 200) : ''}`);
const fails = async (sql) => { try { await db.exec(sql); return false; } catch (e) { return String(e.message || e); } };
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;`);
for (const f of ['001_accounts_projects_forms.sql', '002_admin_console.sql', '004_contractor_accounts.sql']) await db.exec(readFileSync(repo + f, 'utf8').replace(/create extension if not exists pgcrypto;/, ''));
const five = readFileSync(repo + '005_bids.sql', 'utf8');
await db.exec(five); await db.exec(five);
check('005 runs cleanly, twice', true);
const U = (n) => `00000000-0000-4000-8000-0000000000${n}`;
const ADMIN = U('aa'), HO = U('b1'), HO2 = U('b2'), CO = U('c1'), CO2 = U('c2'), COP = U('c3');
await db.exec(`insert into auth.users (id, email) values ('${ADMIN}','owner@tarmem.sa'),('${HO}','ho@x.com'),('${HO2}','ho2@x.com'),('${CO}','co@x.com'),('${CO2}','co2@x.com'),('${COP}','pending@x.com'),
    ('${U('d1')}','rls-test-a-1@tarmem.sa');
  insert into public.profiles (id, role, full_name, mobile, city, company) values ('${ADMIN}','admin','Owner','0500000000','riyadh',null),('${HO}','homeowner','Sara','0511111111','riyadh',null),('${HO2}','homeowner','Noura','0522222222','riyadh',null),
    ('${CO}','contractor','Khalid','0533333333','riyadh','Build Co'),('${CO2}','contractor','Fahad','0544444444','jeddah','Other Co'),('${COP}','contractor','Pending','0555555555','riyadh','Pending Co'),('${U('d1')}','homeowner','RLS TEST','0500000000','riyadh',null);
  insert into public.contractor_applications (company, person, mobile, email, city, trades, cr_number, user_id, status) values ('Build Co','Khalid','0533333333','co@x.com','riyadh',array['kitchen'],'1010101010','${CO}','verified'),
    ('Other Co','Fahad','0544444444',null,'jeddah',array['kitchen'],null,'${CO2}','verified'),('Pending Co','Pending','0555555555',null,'riyadh',array['kitchen'],null,'${COP}','new'),('RLS TEST','RLS TEST','0500000000',null,'riyadh',array['kitchen'],null,null,'new');
  insert into public.contact_messages (name, mobile, message) values ('RLS TEST','0500000000','Automated security test'), ('Real Person','0566666666','A real question');
  insert into public.visits (session_id, route, path, device) values ('rlstestabc123','home','/','desktop'), ('realvisit0001','home','/','mobile');`);
const as = async (role, sub) => { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub || ''}', false); set role ${role};`); };
const project = async (sub, title) => { await as('authenticated', sub); return (await db.query(`insert into public.projects (title, trade, description, city, budget_min, budget_max, timing) values ('${title}','kitchen','A kitchen','riyadh',1000,2000,'month') returning id`)).rows[0].id; };
const P1 = await project(HO, 'Kitchen'), P2 = await project(HO2, 'Other kitchen'), PT = await project(U('d1'), 'RLS TEST — please ignore');
const bid = (p, extra = '', vals = '') => `insert into public.bids (project_id, price, days, note, details${extra}) values ('${p}', 30000, 20, 'Our bid', '{"incl":"all"}'${vals})`;
await as('authenticated', CO);
check('verified contractor: bids on an open project', !(await fails(bid(P1))));
check('…once only, and never in another contractor\'s name or already chosen', Boolean(await fails(bid(P1))) && Boolean(await fails(bid(P2, ', contractor_id', `, '${CO2}'`))) && Boolean(await fails(bid(P2, ', status', `, 'chosen'`))));
check('…can edit it', !(await fails(`update public.bids set price = 28000 where project_id = '${P1}'`)) && (await db.query(`select price from public.bids`)).rows[0].price === 28000);
check('…cannot choose their own bid', Boolean(await fails(`update public.bids set status = 'chosen' where project_id = '${P1}'`)));
await as('authenticated', CO2);
check('second contractor: bids too, and sees only their own bid', !(await fails(bid(P1))) && (await db.query(`select count(*)::int n from public.bids`)).rows[0].n === 1);
await as('authenticated', COP);
check('unverified contractor: cannot bid, sees no bids', Boolean(await fails(bid(P1))) && (await db.query(`select count(*)::int n from public.bids`)).rows[0].n === 0);
await as('authenticated', HO2);
check("another homeowner: sees none of this project's bids, cannot bid", (await db.query(`select count(*)::int n from public.bids`)).rows[0].n === 0 && Boolean(await fails(bid(P1))));
await as('authenticated', HO);
check('the owner: sees both bids', (await db.query(`select count(*)::int n from public.bids`)).rows[0].n === 2);
check('the owner: sees the bidders\' company and city, but no contact details', (await db.query(`select * from public.verified_contractors order by company`)).rows.map((r) => r.company).join() === 'Build Co,Other Co'
  && !('mobile' in (await db.query(`select * from public.verified_contractors`)).rows[0]) && (await db.query(`select count(*)::int n from public.contractor_applications`)).rows[0].n === 0);
check('the owner: cannot change a bid\'s price or wording', Boolean(await fails(`update public.bids set price = 1 where contractor_id = '${CO}'`)) && Boolean(await fails(`update public.bids set note = 'x' where contractor_id = '${CO}'`)));
check('the owner: chooses a bid', !(await fails(`update public.bids set status = 'chosen' where contractor_id = '${CO}'`)) && (await db.query(`select status from public.bids where contractor_id = '${CO}'`)).rows[0].status === 'chosen');
await as('authenticated', CO);
check('a chosen bid can no longer be changed or withdrawn by the contractor', Boolean(await fails(`update public.bids set price = 99999 where project_id = '${P1}'`)) && Boolean(await fails(`update public.bids set status = 'withdrawn' where project_id = '${P1}'`)));
await as('authenticated', HO);
await db.exec(`update public.projects set status = 'withdrawn' where id = '${P1}'`);
await as('authenticated', CO2);
check('after the project closes: the contractor still sees it, cannot edit the bid, and nobody can bid', (await db.query(`select count(*)::int n from public.projects where id = '${P1}'`)).rows[0].n === 1 && Boolean(await fails(`update public.bids set price = 25000 where project_id = '${P1}'`)));
await as('anon');
check('visitor: sees no bids and no contractor list', Boolean(await fails(`select * from public.bids`)) && Boolean(await fails(`select * from public.verified_contractors`)));

// ---- the cleanup script removes the tests' rows and nothing else
await db.exec('reset role');
const clean = readFileSync(repo + 'cleanup_test_rows.sql', 'utf8');
await db.exec(clean);
const report = Object.fromEntries((await db.query('select * from cleanup_report')).rows.map((r) => [r.what, Number(r.removed)]));
check('cleanup: removes the test project, message, application, visit and account', report['test projects'] === 1 && report['test messages'] === 1 && report['test applications'] === 1 && report['test visits'] === 1 && report['test accounts'] === 1, JSON.stringify(report));
const left = (await db.query(`select (select count(*) from auth.users)::int u, (select count(*) from public.profiles)::int p, (select count(*) from public.projects)::int pr, (select count(*) from public.contact_messages)::int m, (select count(*) from public.contractor_applications)::int a, (select count(*) from public.visits)::int v, (select count(*) from public.bids)::int b`)).rows[0];
check('cleanup: every real row is still there', left.u === 6 && left.p === 6 && left.pr === 2 && left.m === 1 && left.a === 3 && left.v === 1 && left.b === 2, JSON.stringify(left));
await db.exec(clean);
check('cleanup: running it again removes nothing', (await db.query('select sum(removed)::int n from cleanup_report')).rows[0].n === 0);
console.log(results.join('\n')); process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
