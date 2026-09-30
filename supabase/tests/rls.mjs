/* Proves the database's own rules against the REAL project, with nothing but the publishable key —
   exactly what any visitor's browser holds. Run it after every change to supabase/*.sql:

     cd web && node ../supabase/tests/rls.mjs

   It signs up two throw-away homeowners (rls-test-…@tarmem.sa) and leaves them, one withdrawn
   project, one contact message and one application behind, all marked "RLS TEST". Delete them from
   the Supabase dashboard when convenient (Authentication → Users; Table editor). The signed-in part
   needs "Confirm email" to be off; with it on, run with RLS_VISITOR_ONLY=1 (add RLS_NO_WRITES=1 to leave
   no rows behind) and only the visitor checks run. */

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

// 1 — a visitor who is not signed in
const anon = client();
check('visitor: cannot read projects', denied(await anon.from('projects').select('*')));
check('visitor: cannot read profiles', denied(await anon.from('profiles').select('*')));
check('visitor: cannot read the audit record', denied(await anon.from('events').select('*')));
check('visitor: cannot post a project', Boolean((await anon.from('projects').insert(project)).error));
const READ_ONLY = Boolean(process.env.RLS_NO_WRITES); // probes only: leaves no test rows behind
const message = READ_ONLY ? { error: null } : await anon.from('contact_messages').insert({ name: 'RLS TEST', mobile: '0500000000', message: 'Automated security test — please ignore.', lang: 'en' });
check('visitor: can send a contact message', !message.error, message.error?.message);
check('visitor: cannot read contact messages back', denied(await anon.from('contact_messages').select('*')));
check('visitor: cannot mark a message handled while sending it', Boolean((await anon.from('contact_messages').insert({ name: 'RLS TEST', mobile: '0500000000', message: 'x x x', handled: true })).error));
const application = READ_ONLY ? { error: null } : await anon.from('contractor_applications').insert({ company: 'RLS TEST', person: 'RLS TEST', mobile: '0500000000', city: 'riyadh', trades: ['kitchen'], lang: 'en' });
check('visitor: can apply as a contractor', !application.error, application.error?.message);
check('visitor: cannot read applications back', denied(await anon.from('contractor_applications').select('*')));
check('visitor: cannot pre-approve their own application', Boolean((await anon.from('contractor_applications').insert({ company: 'RLS TEST', person: 'RLS TEST', mobile: '0500000000', city: 'riyadh', trades: ['kitchen'], status: 'verified' })).error));

// 1b — 002: visits, the analytics function and the console's lists
const visit = { session_id: 'rlstest' + stamp.slice(-6).padStart(6, '0'), event: 'view', route: 'home', path: '/', lang: 'en', device: 'desktop', referrer: null, city: null };
const recorded = READ_ONLY ? { error: null } : await anon.from('visits').insert(visit);
check('visitor: can record a visit', !recorded.error, recorded.error?.message);
check('visitor: cannot read visits', denied(await anon.from('visits').select('*')));
check('visitor: cannot back-date a visit or sign it with a user', Boolean((await anon.from('visits').insert({ ...visit, created_at: '2020-01-01T00:00:00Z' })).error) && Boolean((await anon.from('visits').insert({ ...visit, user_id: '00000000-0000-4000-8000-000000000001' })).error));
check('visitor: cannot run the analytics', Boolean((await anon.rpc('admin_analytics', { p_range: 'week' })).error));
check("visitor: cannot read or write the console's lists", denied(await anon.from('admin_state').select('*')) && Boolean((await anon.from('admin_state').insert({ key: 'promos', value: [] })).error));
// 1c — 003: project photos and files
const PIXEL = new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))], { type: 'image/png' });
const strangerUpload = await anon.storage.from('project-files').upload('00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002/x.png', PIXEL);
check('visitor: cannot add a file — and the private bucket exists', Boolean(strangerUpload.error) && !/bucket not found/i.test(strangerUpload.error?.message || ''), strangerUpload.error?.message);
check('visitor: sees no files', ((await anon.storage.from('project-files').list('')).data || []).length === 0);
// 1d — 004: contractor accounts
const probe = await anon.rpc('is_verified_contractor');
check('004 is installed: the contractor check exists, and is closed to visitors', Boolean(probe.error) && !/PGRST202|could not find/i.test(`${probe.error?.code} ${probe.error?.message}`), `${probe.error?.code} ${probe.error?.message}`);
// 1e — 005: bids
const bidsProbe = await anon.from('bids').select('id').limit(1);
check('005 is installed: bids exist, and are closed to visitors', Boolean(bidsProbe.error) && !/PGRST205|could not find/i.test(`${bidsProbe.error?.code} ${bidsProbe.error?.message}`), `${bidsProbe.error?.code} ${bidsProbe.error?.message}`);
check('visitor: cannot see the list of verified contractors', denied(await anon.from('verified_contractors').select('*')));
// 1f — 006: agreements
const signProbe = await anon.rpc('sign_agreement_contractor', { p_project: '00000000-0000-4000-8000-000000000001' });
check('006 is installed: signing exists, and is closed to visitors', Boolean(signProbe.error) && !/PGRST202|could not find/i.test(`${signProbe.error?.code} ${signProbe.error?.message}`), `${signProbe.error?.code} ${signProbe.error?.message}`);
check('visitor: cannot read agreements', denied(await anon.from('agreements').select('*')));
// 1g — 007: settings, reviews, stages behind the payments switch
const stepProbe = await anon.rpc('stage_step', { p_project: '00000000-0000-4000-8000-000000000001', p_idx: 0, p_action: 'submit' });
check('007 is installed: stage steps exist, and are closed to visitors', Boolean(stepProbe.error) && !/PGRST202|could not find/i.test(`${stepProbe.error?.code} ${stepProbe.error?.message}`), `${stepProbe.error?.code} ${stepProbe.error?.message}`);
check('visitor: cannot read reviews, stages or the switches', denied(await anon.from('reviews').select('*')) && denied(await anon.from('stages').select('*')) && denied(await anon.from('platform_flags').select('*')));
check('visitor: cannot record a payment', Boolean((await anon.rpc('mark_funded', { p_project: '00000000-0000-4000-8000-000000000001' })).error));
// 1h — 008: contractor profiles and the wallet
const walletProbe = await anon.rpc('wallet_request', { p_type: 'deposit', p_amount: 1, p_method: 'mada' });
check('008 is installed: wallet requests exist, and are closed to visitors', Boolean(walletProbe.error) && !/PGRST202|could not find/i.test(`${walletProbe.error?.code} ${walletProbe.error?.message}`), `${walletProbe.error?.code} ${walletProbe.error?.message}`);
check('visitor: cannot read wallets, bank accounts, contractor profiles or reviews', denied(await anon.from('wallet_txns').select('*')) && denied(await anon.from('payout_accounts').select('*')) && denied(await anon.from('verified_contractors').select('*')) && denied(await anon.from('contractor_reviews').select('*')));
// 1i — 029: a visitor calls only what the public pages need (is_admin, mobile_taken, wa_webhook; 031 adds
// confirm_email_verification and 034 public_projects)
const helper = await anon.rpc('wa_template_specs');
check('029 is installed: a visitor cannot call the internal helpers', Boolean(helper.error), helper.error ? `${helper.error.code} ${helper.error.message}` : 'answered');
const takenProbe = await anon.rpc('mobile_taken', { p_mobile: '0500000000' });
check('visitor: the sign-up form can still ask whether a mobile number is taken', !takenProbe.error && typeof takenProbe.data === 'boolean', takenProbe.error?.message);
// 1i' — 034: the open projects, as a visitor sees them: only the ten safe columns; an unknown code gives nothing
const pub = await anon.rpc('public_projects');
check('visitor: the open projects list answers with only the safe columns', !pub.error && Array.isArray(pub.data)
  && pub.data.every((r) => Object.keys(r).sort().join() === 'budget_max,budget_min,city,code,created_at,description,preview,timing,title,trade'), pub.error?.message);
const pubNone = await anon.rpc('public_projects', { p_code: 'P-0' });
check('visitor: an unknown project code gives nothing', !pubNone.error && Array.isArray(pubNone.data) && pubNone.data.length === 0, pubNone.error?.message);
const maskProbe = await anon.rpc('public_mask', { p_text: 'x' });
check('visitor: cannot call the masking helper', Boolean(maskProbe.error), maskProbe.error ? maskProbe.error.code : 'answered');
// 1j — 030: finishing a project, the console's status change and claiming an application exist, and are closed to visitors
const NOBODY = '00000000-0000-4000-8000-000000000001';
const doneProbe = await anon.rpc('homeowner_confirm_complete', { p_project: NOBODY });
check('030 is installed: confirming completion exists, and is closed to visitors', Boolean(doneProbe.error) && !/PGRST202|could not find/i.test(`${doneProbe.error?.code} ${doneProbe.error?.message}`), `${doneProbe.error?.code} ${doneProbe.error?.message}`);
check('visitor: cannot change a project\'s status, confirm completion as a contractor, or claim an application', Boolean((await anon.rpc('admin_set_project_status', { p_project: NOBODY, p_status: 'withdrawn' })).error)
  && Boolean((await anon.rpc('contractor_confirm_complete', { p_project: NOBODY })).error) && Boolean((await anon.rpc('claim_my_application')).error));
if (process.env.RLS_VISITOR_ONLY) {
  console.log(results.join('\n'));
  const bad = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(bad ? `\n${bad} FAILED` : '\nall visitor rules hold (no accounts were created)');
  process.exit(bad ? 1 : 0);
}

// 2 — two homeowners (sign-ups need "Confirm email" off; with it on, run with RLS_VISITOR_ONLY=1)
const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } }).then((r) => r.json());
if (!settings.mailer_autoconfirm) { console.log(results.join('\n')); console.log('\n"Confirm email" is on (Authentication → Sign In / Providers → Email), so no test accounts can be made: the visitor checks above ran; run with RLS_VISITOR_ONLY=1, or turn it off for a full run.'); process.exit(2); }
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
check('homeowner: cannot read visits, run the analytics, or touch the console\'s lists', denied(await a.c.from('visits').select('*')) && Boolean((await a.c.rpc('admin_analytics', { p_range: 'week' })).error)
  && denied(await a.c.from('admin_state').select('*')) && Boolean((await a.c.from('admin_state').insert({ key: 'promos', value: [] })).error));
check('homeowner: cannot read contact messages or applications', denied(await a.c.from('contact_messages').select('*')) && denied(await a.c.from('contractor_applications').select('*')));
const mineKey = `${a.id}/${posted.data?.id}/rls-test.png`;
const uploaded = await a.c.storage.from('project-files').upload(mineKey, PIXEL);
check('homeowner: can add a photo to their own project', !uploaded.error, uploaded.error?.message);
check("homeowner: cannot add a photo under somebody else's id, or to somebody else's project",
  Boolean((await a.c.storage.from('project-files').upload(`${b.id}/${posted.data?.id}/x.png`, PIXEL)).error) && Boolean((await b.c.storage.from('project-files').upload(`${b.id}/${posted.data?.id}/x.png`, PIXEL)).error));
check('homeowner: a file that is not an image or a PDF is refused by the storage service', Boolean((await a.c.storage.from('project-files').upload(`${a.id}/${posted.data?.id}/x.html`, new Blob(['<p>x</p>'], { type: 'text/html' }))).error));
check('homeowner: can list and open their own photo', ((await a.c.storage.from('project-files').list(`${a.id}/${posted.data?.id}`)).data || []).length === 1 && Boolean((await a.c.storage.from('project-files').createSignedUrl(mineKey, 60)).data?.signedUrl));
check("second homeowner: cannot list or open the first one's photo", ((await b.c.storage.from('project-files').list(`${a.id}/${posted.data?.id}`)).data || []).length === 0 && !(await b.c.storage.from('project-files').createSignedUrl(mineKey, 60)).data?.signedUrl);
check('homeowner: cannot overwrite a photo from the website', Boolean((await a.c.storage.from('project-files').upload(mineKey, PIXEL, { upsert: true })).error));
check("second homeowner: cannot delete the first one's photo", ((await b.c.storage.from('project-files').remove([mineKey])).data || []).length === 0);
check('homeowner: can delete their own photo while the project is not in progress (029: "delete my account" clears files first)', ((await a.c.storage.from('project-files').remove([mineKey])).data || []).length === 1);
const withdrawn = await a.c.from('projects').update({ status: 'withdrawn' }).eq('id', posted.data?.id);
check('homeowner: can withdraw their own open project', !withdrawn.error && (await a.c.from('projects').select('status').eq('id', posted.data?.id).single()).data?.status === 'withdrawn', withdrawn.error?.message);
check('homeowner: a withdrawn project cannot be edited or re-opened', (await a.c.from('projects').update({ status: 'open' }).eq('id', posted.data?.id).select('*')).data?.length !== 1);
// 030: the lifecycle functions answer a homeowner with their own refusals
const notAdmin = await a.c.rpc('admin_set_project_status', { p_project: posted.data?.id, p_status: 'completed' });
const notActive = await a.c.rpc('homeowner_confirm_complete', { p_project: posted.data?.id });
const notContractor = await a.c.rpc('claim_my_application');
const notTheirs = await a.c.rpc('contractor_confirm_complete', { p_project: posted.data?.id });
check('homeowner (030): cannot use the console\'s status change, cannot complete a withdrawn project, cannot confirm as its contractor, cannot claim an application',
  /admins only/.test(notAdmin.error?.message || '') && /not_active|payments_on/.test(notActive.error?.message || '') && /only the project's contractor/.test(notTheirs.error?.message || '')
  && /only a contractor account/.test(notContractor.error?.message || ''),
  `${notAdmin.error?.message} | ${notActive.error?.message} | ${notTheirs.error?.message} | ${notContractor.error?.message}`);

console.log(results.join('\n'));
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(failed ? `\n${failed} FAILED` : '\nall rules hold');
process.exit(failed ? 1 : 0);
