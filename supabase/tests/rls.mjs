/* Proves the database's own rules against the REAL project, with nothing but the publishable key —
   exactly what any visitor's browser holds. Run it after every change to supabase/*.sql:

     cd web && node ../supabase/tests/rls.mjs

   It signs up two throw-away homeowners (rls-test-…@tarmem.sa) and leaves them, one withdrawn
   project, one contact message and one application behind, all marked "RLS TEST". Delete them from
   the Supabase dashboard when convenient (Authentication → Users; Table editor). It needs "Confirm
   email" to be off, and refuses to run otherwise. */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../web/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const site = JSON.parse(readFileSync(new URL('../../web/site.config.json', import.meta.url), 'utf8'));
const { url, key } = site.supabase;
if (/secret|service_role/i.test(key)) throw new Error('Use the publishable key only.');
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`);
const denied = (r) => Boolean(r.error) || (Array.isArray(r.data) && r.data.length === 0) || r.data === null;
const stamp = Date.now().toString(36);
const project = { title: 'RLS TEST — please ignore', trade: 'kitchen', description: 'Automated security test.', city: 'riyadh', district: null, budget_min: 1000, budget_max: 2000, timing: 'flexible' };

const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then((r) => r.json());
if (!settings.mailer_autoconfirm) { console.log('"Confirm email" is still on (Authentication → Sign In / Providers → Email). Turn it off, then run this again.'); process.exit(2); }

// 1 — a visitor who is not signed in
const anon = client();
check('visitor: cannot read projects', denied(await anon.from('projects').select('*')));
check('visitor: cannot read profiles', denied(await anon.from('profiles').select('*')));
check('visitor: cannot read the audit record', denied(await anon.from('events').select('*')));
check('visitor: cannot post a project', Boolean((await anon.from('projects').insert(project)).error));
const message = await anon.from('contact_messages').insert({ name: 'RLS TEST', mobile: '0500000000', message: 'Automated security test — please ignore.', lang: 'en' });
check('visitor: can send a contact message', !message.error, message.error?.message);
check('visitor: cannot read contact messages back', denied(await anon.from('contact_messages').select('*')));
check('visitor: cannot mark a message handled while sending it', Boolean((await anon.from('contact_messages').insert({ name: 'RLS TEST', mobile: '0500000000', message: 'x x x', handled: true })).error));
const application = await anon.from('contractor_applications').insert({ company: 'RLS TEST', person: 'RLS TEST', mobile: '0500000000', city: 'riyadh', trades: ['kitchen'], lang: 'en' });
check('visitor: can apply as a contractor', !application.error, application.error?.message);
check('visitor: cannot read applications back', denied(await anon.from('contractor_applications').select('*')));
check('visitor: cannot pre-approve their own application', Boolean((await anon.from('contractor_applications').insert({ company: 'RLS TEST', person: 'RLS TEST', mobile: '0500000000', city: 'riyadh', trades: ['kitchen'], status: 'verified' })).error));

// 2 — two homeowners
async function homeowner(tag) {
  const c = client();
  const { data, error } = await c.auth.signUp({ email: `rls-test-${tag}-${stamp}@tarmem.sa`, password: `T3st-${stamp}-${tag}-${Math.random().toString(36).slice(2)}` });
  if (error || !data.session) throw new Error('sign-up failed: ' + (error?.message || 'no session'));
  return { c, id: data.user.id };
}
const a = await homeowner('a'), b = await homeowner('b');
const base = { full_name: 'RLS TEST', mobile: '0500000000', city: 'riyadh', lang: 'en' };
check('homeowner: cannot create their profile as admin', Boolean((await a.c.from('profiles').insert({ id: a.id, role: 'admin', ...base })).error));
check("homeowner: cannot create somebody else's profile", Boolean((await a.c.from('profiles').insert({ id: b.id, role: 'homeowner', ...base })).error));
const mine = await a.c.from('profiles').insert({ id: a.id, role: 'homeowner', ...base }).select('*').single();
check('homeowner: can create their own profile, and the email is filled in by the database', !mine.error && mine.data?.email?.startsWith('rls-test-a-'), mine.error?.message);
await b.c.from('profiles').insert({ id: b.id, role: 'homeowner', ...base });
check('homeowner: cannot make themselves admin afterwards', Boolean((await a.c.from('profiles').update({ role: 'admin' }).eq('id', a.id)).error));
check("homeowner: cannot read another person's profile", denied(await a.c.from('profiles').select('*').eq('id', b.id)));

const posted = await a.c.from('projects').insert(project).select('*').single();
check('homeowner: can post a project; the database assigns owner, code and status', !posted.error && posted.data?.owner_id === a.id && /^P-\d+$/.test(posted.data?.code || '') && posted.data?.status === 'open', posted.error?.message);
check('homeowner: cannot choose the owner, code or status of a new project',
  Boolean((await a.c.from('projects').insert({ ...project, owner_id: b.id })).error) && Boolean((await a.c.from('projects').insert({ ...project, code: 'P-1' })).error) && Boolean((await a.c.from('projects').insert({ ...project, status: 'active' })).error));
check('homeowner: a budget above SAR 1,000,000 is refused', Boolean((await a.c.from('projects').insert({ ...project, budget_max: 1000001 })).error));
check("second homeowner: cannot see the first one's project", denied(await b.c.from('projects').select('*').eq('id', posted.data?.id)));
await b.c.from('projects').update({ title: 'taken over' }).eq('id', posted.data?.id);
check("second homeowner: cannot change the first one's project", (await a.c.from('projects').select('title').eq('id', posted.data?.id).single()).data?.title === project.title);
check('homeowner: cannot mark their own project active or completed', Boolean((await a.c.from('projects').update({ status: 'active' }).eq('id', posted.data?.id)).error));
check('homeowner: cannot read the audit record', denied(await a.c.from('events').select('*')));
check('homeowner: cannot read contact messages or applications', denied(await a.c.from('contact_messages').select('*')) && denied(await a.c.from('contractor_applications').select('*')));
const withdrawn = await a.c.from('projects').update({ status: 'withdrawn' }).eq('id', posted.data?.id);
check('homeowner: can withdraw their own open project', !withdrawn.error && (await a.c.from('projects').select('status').eq('id', posted.data?.id).single()).data?.status === 'withdrawn', withdrawn.error?.message);
check('homeowner: a withdrawn project cannot be edited or re-opened', (await a.c.from('projects').update({ status: 'open' }).eq('id', posted.data?.id).select('*')).data?.length !== 1);

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} FAILED` : '\nall rules hold');
process.exit(failed ? 1 : 0);
