/* A stand-in for Tarmem's database, for browser tests.

   Every request the site makes to Supabase is answered here, in memory, so the tests create no
   accounts and write nothing real — including when they run against the live site. It imitates the
   rules in ../../supabase/*.sql closely enough to catch a client that would break them: people read
   only their own rows, the columns the database assigns (owner, status, code) are refused if sent,
   and the two public forms cannot be read back. The rules themselves are tested against the real
   database by supabase/tests (they cannot be proven from here). */

import { createHmac, randomBytes, randomUUID } from 'node:crypto';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
/** A session's token. `aal2` is a session that has passed the second step as well as the password (supabase/032). */
const jwt = (sub, aal = 'aal1') => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600,
  aal, amr: [{ method: aal === 'aal2' ? 'totp' : 'password', timestamp: Math.floor(Date.now() / 1000) }] })}.test`;
const claimsOf = (header) => { try { return JSON.parse(Buffer.from(String(header || '').split('.')[1], 'base64url').toString()) || {}; } catch { return {}; } };
const subOf = (header) => claimsOf(header).sub || null;
const aalOf = (header) => claimsOf(header).aal || null;

/* An authenticator app, as far as the tests need one: its key in base32, and the six digits it shows (RFC 6238: SHA-1,
   thirty seconds). The stand-in checks codes the way Supabase Auth does, a step either side of now. */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const base32 = (buf) => { let bits = 0, value = 0, out = ''; for (const byte of buf) { value = ((value << 8) | byte) & 0xffffff; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } } return bits ? out + B32[(value << (5 - bits)) & 31] : out; };
const unbase32 = (text) => { let bits = 0, value = 0; const out = []; for (const ch of String(text).replace(/[\s=]/g, '').toUpperCase()) { value = ((value << 5) | B32.indexOf(ch)) & 0xffffff; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
/** The code an authenticator app shows for this key at this moment. */
export function totp(secret, at = Date.now()) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const h = createHmac('sha1', unbase32(secret)).update(counter).digest();
  return String((h.readUInt32BE(h[h.length - 1] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}
/** The team's second step (supabase/032), as an admin does it: when the console or the inbox asks, the code their app shows
    now is typed in — the app is set up first, from the key on the page, if the account has none yet. Says whether it asked. */
export async function passTwoStep(page, db) {
  await page.waitForFunction(() => document.querySelector('.twostep, .side[data-tab]') || (document.querySelector('main h1') && !document.querySelector('main [aria-busy="true"]')), null, { timeout: 8000 }).catch(() => undefined);
  const gate = page.locator('.twostep');
  if (!(await gate.count())) return false;
  let secret;
  if ((await gate.getAttribute('data-mode')) === 'setup') {
    await page.locator('#ts-secret').waitFor({ timeout: 8000 });
    secret = (await page.locator('#ts-secret').textContent()).replace(/\s+/g, '');
  } else {
    // whose app: the account of the session the page keeps (under the site's own storage key, src/platform/client.ts)
    const who = await page.evaluate(() => { for (const k of Object.keys(localStorage)) { try { const v = JSON.parse(localStorage.getItem(k)); if (v?.access_token && v.user?.id) return v.user.id; } catch { /* not a session */ } } return null; });
    secret = db.factors.find((f) => f.user_id === who && f.status === 'verified')?.secret;
  }
  await page.locator('#ts-code').fill(totp(secret));
  await page.locator('.twostep button[type="submit"]').click();
  await gate.waitFor({ state: 'detached', timeout: 8000 });
  return true;
}

/** A signed-in session for `userId`, as the fragment a "reset your password" email link carries. */
export const recoveryFragment = (userId) => `#access_token=${jwt(userId)}&refresh_token=refresh-${userId}&expires_in=3600&token_type=bearer&type=recovery`;
/** What opening the activation link does (supabase/030 F): the address is confirmed, and the page opens with a session. */
export function confirmLink(db, email) {
  const user = db.users.find((u) => u.email === email);
  user.confirmed = true; user.confirmed_at = new Date().toISOString();
  return `#access_token=${jwt(user.id)}&refresh_token=refresh-${user.id}&expires_in=3600&expires_at=${Math.floor(Date.now() / 1000) + 3600}&token_type=bearer&type=signup`;
}
/** A used or expired email link, as Supabase redirects it. */
export const expiredFragment = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';

/* The database's own rules for what a row may hold (supabase/001, 005, 019): a refused row is answered the way Postgres
   answers it, naming the rule it broke (<table>_<column>_check). */
const between = (v, lo, hi) => { const n = String(v ?? '').trim().length; return n >= lo && n <= hi; };
const MOBILE = /^\+?[0-9][0-9 ]{7,17}$/, EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RULES = {
  projects: (r) => [[!between(r.title, 3, 140), 'projects_title_check'], [!between(r.description, 3, 4000), 'projects_description_check'], [r.district != null && String(r.district).length > 120, 'projects_district_check'],
    [!(r.budget_min >= 0), 'projects_budget_min_check'], [!(r.budget_max >= r.budget_min && r.budget_max <= 1000000), 'projects_budget_max_check']],
  bids: (r) => [[!(r.price >= 100 && r.price <= 1000000), 'bids_price_check'], [!(r.days >= 1 && r.days <= 1000), 'bids_days_check'], [r.note != null && String(r.note).length > 2000, 'bids_note_check']],
  contact_messages: (r) => [[!between(r.name, 2, 120), 'contact_messages_name_check'], [r.email != null && !(String(r.email).length <= 160 && EMAIL.test(r.email)), 'contact_messages_email_check'],
    [r.mobile != null && !MOBILE.test(r.mobile), 'contact_messages_mobile_check'], [!between(r.message, 3, 4000), 'contact_messages_message_check'], [r.email == null && r.mobile == null, 'contact_messages_check']],
  contractor_applications: (r) => [[!between(r.company, 2, 160), 'contractor_applications_company_check'], [!between(r.person, 2, 120), 'contractor_applications_person_check'], [!MOBILE.test(r.mobile || ''), 'contractor_applications_mobile_check'],
    [r.cr_number != null && !/^[0-9]{5,15}$/.test(r.cr_number), 'contractor_applications_cr_number_check'], [r.note != null && String(r.note).length > 2000, 'contractor_applications_note_check'], [!(Array.isArray(r.trades) && r.trades.length >= 1 && r.trades.length <= 12), 'contractor_applications_trades_check']],
  project_messages: (r) => [[!between(r.body, 1, 2000), 'project_messages_body_check']],
  profiles: (r) => [['full_name' in r && !between(r.full_name, 2, 120), 'profiles_full_name_check'], ['mobile' in r && !MOBILE.test(r.mobile || ''), 'profiles_mobile_check']],
};
const broken = (table, row) => (RULES[table]?.(row) || []).find(([bad]) => bad)?.[1] || null;

export async function installSupabaseMock(context, supabaseUrl) {
  const db = { users: [], profiles: [], projects: [], contact: [], applications: [], visits: [], adminState: {}, files: [], bids: [], agreements: [], portfolio: [], captions: [], caseReplies: [], refused: [], unknown: [],
    /** "Confirm email" (supabase/030 F): a new account has no session until its link is opened. */
    confirmEmail: false, resent: [], logouts: [], signupRedirects: [],
    /** Requests that fail once, as `METHOD /path` → { status, body }: for the tests of what the site says when something is refused. */
    failNext: {},
    /** An account whose session the database no longer accepts (its sign-in expired): its requests answer 401 until it signs in again. */
    expired: null,
    /** (032) authenticator apps set up (`secret` is the app's key), open challenges, and every code typed, as { user_id, code }. */
    factors: [], challenges: [], twoStepTries: [] };
  let nextCode = 2001;
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
  const send = (route, status, body) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });
  const publicUser = (u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: u.data, app_metadata: { provider: 'email' }, created_at: u.created_at,
    email_confirmed_at: u.confirmed === false ? null : (u.confirmed_at || u.created_at), identities: [{ id: u.id, provider: 'email', identity_data: { email: u.email, sub: u.id } }],
    factors: db.factors.filter((f) => f.user_id === u.id).map((f) => ({ id: f.id, friendly_name: f.friendly_name, factor_type: 'totp', status: f.status, created_at: f.created_at, updated_at: f.updated_at })) });
  const checkError = (route, rule, table) => send(route, 400, { code: '23514', details: 'Failing row contains (…).', hint: null, message: `new row for relation "${table}" violates check constraint "${rule}"` });
  // a session keeps the level it reached: renewing an aal2 session gives an aal2 token again, as Supabase Auth does
  const session = (u, aal = 'aal1') => ({ access_token: jwt(u.id, aal), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: (aal === 'aal2' ? 'refresh2-' : 'refresh-') + u.id, user: publicUser(u) });
  const refuse = (route, why) => { db.refused.push(why); return send(route, 403, { code: '42501', message: why }); };

  await context.route(supabaseUrl.replace(/\/$/, '') + '/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const body = (() => { try { return request.postDataJSON(); } catch { return null; } })();
    const headers = request.headers();
    const me = subOf(headers.authorization);
    const wantsObject = (headers.accept || '').includes('vnd.pgrst.object');
    const wantsRows = (headers.prefer || '').includes('return=representation');
    const rows = (list) => (wantsObject ? (list.length === 1 ? send(route, 200, list[0]) : send(route, 406, { code: 'PGRST116', message: 'not exactly one row' })) : send(route, 200, list));
    const eq = (name) => (url.searchParams.get(name) || '').replace(/^eq\./, '');
    const path = url.pathname;
    const forced = db.failNext[`${method} ${path}`];
    if (forced) { delete db.failNext[`${method} ${path}`]; return send(route, forced.status || 400, forced.body || { code: 'P0001', message: 'refused for the test' }); }
    // a session the database no longer accepts: every data request with it answers as PostgREST does for an expired token
    if (db.expired && me === db.expired && !path.startsWith('/auth/')) return send(route, 401, { code: 'PGRST301', details: null, hint: null, message: 'JWT expired' });

    const leaked = { code: 422, error_code: 'weak_password', msg: 'Password is known to be weak and easy to guess, please choose a different one.', weak_password: { reasons: ['pwned'] } };
    if ((path === '/auth/v1/signup' || path === '/auth/v1/user') && ['POST', 'PUT'].includes(method) && body?.password === 'password1234') return send(route, 422, leaked);
    if (path === '/auth/v1/signup' && method === 'POST') {
      const taken = db.users.find((u) => u.email === body.email);
      // with "Confirm email" on, Supabase answers an address that has an account with a user that has no identities, and sends nothing
      if (taken && db.confirmEmail) return send(route, 200, { ...publicUser(taken), id: '00000000-0000-4000-8000-ffffffffffff', identities: [] });
      if (taken) return send(route, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
      const user = { id: `00000000-0000-4000-8000-${String(db.users.length + 1).padStart(12, '0')}`, email: body.email, password: body.password, data: body.data || {}, created_at: new Date().toISOString(), ...(db.confirmEmail ? { confirmed: false } : {}) };
      db.users.push(user);
      db.signupRedirects.push(url.searchParams.get('redirect_to'));
      return send(route, 200, db.confirmEmail ? { ...publicUser(user), confirmation_sent_at: new Date().toISOString() } : session(user));
    }
    if (path === '/auth/v1/resend' && method === 'POST') { db.resent.push({ email: body.email, type: body.type, redirect: url.searchParams.get('redirect_to') }); return send(route, 200, {}); }
    if (path === '/auth/v1/token' && method === 'POST') {
      const renewing = url.searchParams.get('grant_type') === 'refresh_token';
      const user = renewing
        ? db.users.find((u) => 'refresh-' + u.id === body.refresh_token || 'refresh2-' + u.id === body.refresh_token)
        : db.users.find((u) => u.email === body.email && u.password === body.password);
      if (user && user.confirmed === false) return send(route, 400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
      if (user && db.expired === user.id && url.searchParams.get('grant_type') === 'password') db.expired = null; // a new sign-in is a new session
      return user ? send(route, 200, session(user, renewing && String(body.refresh_token).startsWith('refresh2-') ? 'aal2' : 'aal1')) : send(route, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    }
    if (path === '/auth/v1/logout') { db.logouts.push(url.searchParams.get('scope') || 'global'); return route.fulfill({ status: 204, headers: cors }); }
    if (path === '/auth/v1/recover' && method === 'POST') { (db.recoveries ||= []).push({ email: body.email, redirect: url.searchParams.get('redirect_to') }); return send(route, 200, {}); }
    // (032) the second step: an authenticator app set up (enrolled), challenged and verified as Supabase Auth does it
    const aal = aalOf(headers.authorization);
    if (path === '/auth/v1/factors' && method === 'POST') {
      const user = db.users.find((u) => u.id === me); if (!user) return send(route, 401, { msg: 'no session' });
      const mine = db.factors.filter((f) => f.user_id === me);
      if (mine.some((f) => f.status === 'verified') && aal !== 'aal2') return send(route, 422, { code: 422, error_code: 'insufficient_aal', msg: 'AAL2 required to enroll a new factor' });
      if (body.friendly_name && mine.some((f) => f.friendly_name === body.friendly_name)) return send(route, 422, { code: 422, error_code: 'mfa_factor_name_conflict', msg: `A factor with the friendly name "${body.friendly_name}" for this user already exists` });
      const at = new Date().toISOString();
      const factor = { id: randomUUID(), user_id: me, friendly_name: body.friendly_name || '', issuer: body.issuer || '', status: 'unverified', secret: base32(randomBytes(20)), created_at: at, updated_at: at };
      db.factors.push(factor);
      const uri = `otpauth://totp/${encodeURIComponent(factor.issuer)}:${encodeURIComponent(user.email)}?secret=${factor.secret}&issuer=${encodeURIComponent(factor.issuer)}`;
      // (a picture standing in for the QR code: raw SVG, as Supabase Auth sends it)
      return send(route, 200, { id: factor.id, type: 'totp', friendly_name: factor.friendly_name, totp: { qr_code: '<svg xmlns="http://www.w3.org/2000/svg" width="176" height="176" viewBox="0 0 8 8"><rect width="8" height="8" fill="white"/><path d="M0 0h3v3H0zM5 0h3v3H5zM0 5h3v3H0z" fill="black"/></svg>', secret: factor.secret, uri } });
    }
    const factorPath = /^\/auth\/v1\/factors\/([^/]+)(?:\/(challenge|verify))?$/.exec(path);
    if (factorPath) {
      const factor = db.factors.find((f) => f.id === factorPath[1] && f.user_id === me);
      if (!factor) return send(route, 404, { code: 404, error_code: 'mfa_factor_not_found', msg: 'Factor not found' });
      if (factorPath[2] === 'challenge' && method === 'POST') {
        const challenge = { id: randomUUID(), factor_id: factor.id, expires_at: Math.floor(Date.now() / 1000) + 300 };
        db.challenges.push(challenge);
        return send(route, 200, { id: challenge.id, type: 'totp', expires_at: challenge.expires_at });
      }
      if (factorPath[2] === 'verify' && method === 'POST') {
        const challenge = db.challenges.find((c) => c.id === body.challenge_id && c.factor_id === factor.id);
        if (!challenge || challenge.expires_at < Date.now() / 1000) return send(route, 422, { code: 422, error_code: 'mfa_challenge_expired', msg: 'MFA challenge has expired, verify against another challenge or create a new challenge.' });
        db.challenges = db.challenges.filter((c) => c !== challenge);
        db.twoStepTries.push({ user_id: me, code: String(body.code) });
        if (![-30000, 0, 30000].some((d) => totp(factor.secret, Date.now() + d) === String(body.code))) return send(route, 422, { code: 422, error_code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' });
        factor.status = 'verified'; factor.updated_at = new Date().toISOString();
        return send(route, 200, session(db.users.find((u) => u.id === me), 'aal2'));
      }
      if (!factorPath[2] && method === 'DELETE') {
        if (factor.status === 'verified' && aal !== 'aal2') return send(route, 422, { code: 422, error_code: 'insufficient_aal', msg: 'AAL2 required to unenroll a verified factor' });
        db.factors = db.factors.filter((f) => f !== factor);
        return send(route, 200, { id: factor.id });
      }
    }
    if (path === '/auth/v1/user' && method === 'PUT') { const user = db.users.find((u) => u.id === me); if (!user) return send(route, 401, { msg: 'no session' }); if (body.password) user.password = body.password; return send(route, 200, publicUser(user)); }
    if (path === '/auth/v1/user') { const user = db.users.find((u) => u.id === me); return user ? send(route, 200, publicUser(user)) : send(route, 401, { msg: 'no session' }); }

    // (032) an admin's powers need a session with both steps: with the password alone the account is an ordinary one
    const admin = db.profiles.some((p) => p.id === me && p.role === 'admin') && aal === 'aal2';
    const isVerified = (id) => db.profiles.some((p) => p.id === id && p.role === 'contractor') && db.applications.some((a) => a.user_id === id && a.status === 'verified');
    // (031) a confirmed email (a profile from before 031, with no such field, counts as confirmed)
    const confirmedEmail = (id) => { const p = db.profiles.find((x) => x.id === id); return !p || p.role === 'admin' || !('email_verified_at' in p) || Boolean(p.email_verified_at && String(p.email_verified_email || '').toLowerCase() === String(p.email || '').toLowerCase()); };
    const canDeal = (id) => confirmedEmail(id);
    // storage: a private bucket, <owner>/<project>/<file>; owners add to their own projects, owners and admins read
    const BUCKET = '/storage/v1/object/';
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    if (path.startsWith(BUCKET + 'public/portfolio/') && method === 'GET') return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png' }, body: PNG });
    if (path.startsWith(BUCKET + 'list/portfolio')) {
      const prefix = body.prefix.replace(/\/$/, '') + '/';
      return send(route, 200, db.portfolio.filter((f) => f.path.startsWith(prefix)).map((f, i) => ({ id: 'pf-' + i, name: f.path.slice(prefix.length), created_at: f.created_at })));
    }
    if (path.startsWith(BUCKET + 'portfolio/') && method === 'POST') {
      const key = decodeURIComponent(path.slice((BUCKET + 'portfolio/').length));
      if (!isVerified(me) || key.split('/')[0] !== me || db.portfolio.filter((f) => f.path.startsWith(me + '/')).length >= 12) return refuse(route, 'portfolio: refused');
      db.portfolio.push({ path: key, created_at: new Date().toISOString() });
      return send(route, 200, { Key: 'portfolio/' + key, Id: 'obj' });
    }
    if (path === BUCKET + 'portfolio' && method === 'DELETE') {
      const mine = (body.prefixes || []).filter((k) => k.split('/')[0] === me);
      db.portfolio = db.portfolio.filter((f) => !mine.includes(f.path));
      return send(route, 200, mine.map((k) => ({ name: k })));
    }
    if (path.startsWith(BUCKET + 'list/project-files')) {
      // like Storage itself: one level only — a file directly under the prefix is a row, a sub-folder is a row with no id
      const prefix = body.prefix.replace(/\/$/, '') + '/';
      const seen = new Set(); const out = [];
      for (const [i, f] of db.files.entries()) {
        if (!f.path.startsWith(prefix) || !(admin || f.path.startsWith(me + '/'))) continue;
        const rest = f.path.slice(prefix.length);
        if (rest.includes('/')) { const folder = rest.split('/')[0]; if (!seen.has(folder)) { seen.add(folder); out.push({ id: null, name: folder, created_at: null }); } }
        else out.push({ id: 'obj-' + i, name: rest, created_at: f.created_at });
      }
      return send(route, 200, out);
    }
    if (path.startsWith(BUCKET + 'sign/project-files/')) {
      const key = decodeURIComponent(path.slice((BUCKET + 'sign/project-files/').length));
      return admin || key.startsWith(me + '/') ? send(route, 200, { signedURL: `/object/sign/project-files/${key}?token=test` }) : refuse(route, 'storage: not yours to open');
    }
    if (path.startsWith(BUCKET + 'project-files/') && method === 'POST') {
      const key = decodeURIComponent(path.slice((BUCKET + 'project-files/').length));
      const [owner, project] = key.split('/');
      const theirs = db.projects.some((p) => p.id === project && p.owner_id === owner && (p.owner_id === me || (p.contractor_id === me && /^stage-\d$/.test(key.split('/')[2] || ''))));
      if (!theirs) return refuse(route, 'storage: not your project');
      if (!/^[\x20-\x7E]+$/.test(key)) return refuse(route, 'storage: keys must be plain ASCII');
      db.files.push({ path: key, type: headers['content-type'] || '', created_at: new Date().toISOString() });
      return send(route, 200, { Key: 'project-files/' + key, Id: 'obj' });
    }
    if (path === '/rest/v1/profiles') {
      const inIds = (url.searchParams.get('id') || '').startsWith('in.(') ? url.searchParams.get('id').slice(4, -1).split(',') : null;
      if (method === 'GET') return rows(db.profiles.filter((p) => (admin || p.id === me) && (!eq('id') || p.id === eq('id') || (inIds && inIds.includes(p.id)))));
      if (method === 'PATCH') {
        const forbidden = Object.keys(body).filter((k) => !['full_name', 'mobile', 'city', 'company', 'lang', 'prefs', 'about', 'trades'].includes(k));
        if (forbidden.length || eq('id') !== me) return refuse(route, 'profiles: may not change ' + (forbidden.join(', ') || "somebody else's row"));
        const rule = broken('profiles', body); if (rule) return checkError(route, rule, 'profiles');
        Object.assign(db.profiles.find((p) => p.id === me), body);
        return route.fulfill({ status: 204, headers: cors });
      }
      if (method === 'POST') {
        if (!me || body.id !== me || !['homeowner', 'contractor'].includes(body.role)) return refuse(route, 'profiles: not your own row, or not an allowed role');
        const rule = broken('profiles', body); if (rule) return checkError(route, rule, 'profiles');
        const row = { company: null, ...body, email: db.users.find((u) => u.id === me).email, created_at: new Date().toISOString(),
          // (031) with db.verifyNewAccounts on, a new account starts unconfirmed and the "confirm your email" mail goes out
          ...(db.verifyNewAccounts ? { email_verified_at: null, email_verified_email: null } : {}) };
        db.profiles.push(row);
        if (db.verifyNewAccounts) (db.verifyMails ||= []).push({ user: me, email: row.email });
        return wantsRows ? rows([row]) : send(route, 201);
      }
    }
    if (path === '/rest/v1/projects') {
      const verifiedContractor = db.profiles.some((p) => p.id === me && p.role === 'contractor') && db.applications.some((a) => a.user_id === me && a.status === 'verified');
      const inProj = (url.searchParams.get('id') || '').startsWith('in.(') ? url.searchParams.get('id').slice(4, -1).split(',') : null;
      if (method === 'GET') return rows(db.projects.filter((p) => (!inProj || inProj.includes(p.id)) && (admin || p.owner_id === me || (verifiedContractor && ((p.status === 'open' && canDeal(p.owner_id)) || p.contractor_id === me || db.bids.some((b) => b.project_id === p.id && b.contractor_id === me)))) && (url.searchParams.get('status') !== 'neq.withdrawn' || p.status !== 'withdrawn')).sort((a, b) => b.created_at.localeCompare(a.created_at)));
      if (method === 'POST') {
        const assigned = ['id', 'code', 'owner_id', 'status', 'created_at'].filter((k) => k in body);
        if (assigned.length) return refuse(route, 'projects: the database assigns ' + assigned.join(', '));
        if (!db.profiles.some((p) => p.id === me && p.role === 'homeowner')) return send(route, 400, { code: 'P0001', message: 'Only a homeowner account can post a project.' });
        const rule = broken('projects', body); if (rule) return checkError(route, rule, 'projects');
        const row = { id: `10000000-0000-4000-8000-${String(nextCode).padStart(12, '0')}`, code: 'P-' + nextCode++, owner_id: me, status: 'open', created_at: new Date().toISOString(), ...body };
        db.projects.push(row);
        return wantsRows ? rows([row]) : send(route, 201);
      }
      if (method === 'PATCH') {
        // the owner may withdraw a project that is still open (supabase/001); anything else changes no row
        const row = db.projects.find((p) => p.id === eq('id') && p.owner_id === me && p.status === 'open');
        if (row) Object.assign(row, body);
        return wantsRows ? rows(row ? [row] : []) : route.fulfill({ status: 204, headers: cors });
      }
    }
    if (path === '/rest/v1/reviews') {
      if (method === 'GET') return rows(me ? (db.reviews || []) : []);
      const project = db.projects.find((p) => p.id === body.project_id && p.owner_id === me && p.status === 'completed' && p.contractor_id === body.contractor_id);
      if (!project || (db.reviews || []).some((r) => r.project_id === body.project_id) || 'homeowner_id' in body) return refuse(route, 'reviews: not a finished project of yours, or already reviewed');
      (db.reviews ||= []).push({ ...body, homeowner_id: me, created_at: new Date().toISOString() });
      return send(route, 201);
    }
    if (path === '/rest/v1/platform_flags') return rows(me ? [{ key: 'payments_live', enabled: Boolean(db.paymentsLive) }, { key: 'whatsapp_live', enabled: Boolean(db.whatsappLive) }, { key: 'otp_live', enabled: Boolean(db.otpLive) }] : []);
    // (031) explore first, verify before dealing
    const gateError = (r) => send(r, 403, { code: '42501', details: null, hint: null, message: 'verify your account first: confirm your email and add your name and mobile' });
    if (path === '/rest/v1/rpc/request_email_verification' && method === 'POST') {
      if (!me) return refuse(route, 'sign in first');
      const n = (db.verifyMails || []).filter((m) => m.user === me).length;
      if (confirmedEmail(me)) return send(route, 200, { ok: true, status: 'already' });
      if (n >= 3) return send(route, 200, { ok: false, status: 'too_many' });
      (db.verifyMails ||= []).push({ user: me, email: db.profiles.find((p) => p.id === me)?.email });
      return send(route, 200, { ok: true, status: 'sent' });
    }
    if (path === '/rest/v1/rpc/confirm_email_verification' && method === 'POST') {
      const hit = (db.verifyTokens || {})[body.p_token];
      if (!hit) return send(route, 200, { ok: false, error: 'invalid' });
      if (hit === 'expired') return send(route, 200, { ok: false, error: 'expired' });
      const p = db.profiles.find((x) => x.id === hit);
      if (!p) return send(route, 200, { ok: false, error: 'invalid' });
      p.email_verified_at = new Date().toISOString(); p.email_verified_email = p.email;
      return send(route, 200, { ok: true, role: p.role });
    }
    if (method === 'POST' && me && !canDeal(me) && (path === '/rest/v1/bids' || path === '/rest/v1/project_messages' || /^\/rest\/v1\/rpc\/(sign_agreement_(homeowner|contractor)|change_request_(create|approve))$/.test(path))) return gateError(route);
    if (method === 'PATCH' && me && !canDeal(me) && path === '/rest/v1/bids') return gateError(route);
    // a verified contractor does not see the open project of a homeowner who has not confirmed their email
    if (path === '/rest/v1/project_messages') {
      // the two parties read their thread; the team reads every message (supabase/030: "admins read project messages")
      const mine = (r) => me && (admin || db.projects.some((p) => p.id === r.project_id && p.owner_id === me) || r.contractor_id === me);
      if (method === 'GET') return rows((db.messages || []).filter((r) => mine(r) && (!eq('project_id') || r.project_id === eq('project_id'))));
      if (method === 'POST') {
        const p = db.projects.find((x) => x.id === body.project_id);
        const canMsg = p && (p.contractor_id === body.contractor_id || (db.bids || []).some((b) => b.project_id === p.id && b.contractor_id === body.contractor_id && b.status !== 'withdrawn'));
        const owner = Boolean(p && p.owner_id === me);
        const rule = broken('project_messages', body); if (rule) return checkError(route, rule, 'project_messages');
        if (!me || !canMsg || 'from_id' in body || !(owner || (body.contractor_id === me && isVerified(me)))) return refuse(route, 'project_messages: refused');
        (db.messages ||= []).push({ id: (db.messages || []).length + 1, ...body, from_id: me, created_at: new Date().toISOString(), read_at: null });
        return send(route, 201);
      }
    }
    if (path === '/rest/v1/case_replies' && method === 'GET') return admin ? rows(db.caseReplies) : rows([]);
    if (path === '/rest/v1/rpc/admin_reply_case' && method === 'POST') {
      if (!admin) return refuse(route, 'admins only');
      const m = db.contact[Number(body.p_case) - 1]; if (!m) return send(route, 400, { message: 'no such case' }); m.id = Number(body.p_case); // rows carry no id until read back
      if (!String(body.p_body || '').trim()) return send(route, 400, { message: 'the reply is empty' });
      const reply = { id: db.caseReplies.length + 1, case_id: m.id, admin_id: me, body: String(body.p_body).trim(), sent_by_email: Boolean(m.email), created_at: new Date().toISOString() };
      db.caseReplies.push(reply); m.answered_at = reply.created_at;
      return send(route, 200, { id: reply.id, sent: reply.sent_by_email });
    }
    if (path === '/rest/v1/rpc/admin_user_detail' && method === 'POST') {
      if (!admin) return refuse(route, 'admins only');
      const p = db.profiles.find((x) => x.id === body.p_user); const u = db.users.find((x) => x.id === body.p_user);
      if (!p || !u) return send(route, 400, { message: 'no such user' });
      const projects = db.projects.filter((x) => x.owner_id === p.id).map((x) => ({ id: x.id, code: x.code, title: x.title, status: x.status, city: x.city, trade: x.trade, budget_min: x.budget_min, budget_max: x.budget_max, created_at: x.created_at, bids: (db.bids || []).filter((b) => b.project_id === x.id && b.status !== 'withdrawn').length }));
      const bids = (db.bids || []).filter((b) => b.contractor_id === p.id).map((b) => { const x = db.projects.find((y) => y.id === b.project_id) || {}; return { id: b.id, project_code: x.code, project_title: x.title, price: b.price, days: b.days ?? null, status: b.status || 'submitted', created_at: b.created_at || new Date().toISOString() }; });
      const application = db.applications.find((a) => a.user_id === p.id) || null;
      return send(route, 200, { profile: p, email: u.email, created_at: u.created_at, last_sign_in_at: null, email_confirmed_at: u.created_at, projects, bids, application, messages: db.contact.filter((m) => m.email && u.email && m.email.toLowerCase() === u.email.toLowerCase()).length, portfolio: db.portfolio.filter((f) => f.path.startsWith(p.id + '/')).length, reviews: 0 });
    }
    if (path === '/rest/v1/rpc/delete_my_account' && method === 'POST') {
      if (!me) return refuse(route, 'sign in first');
      const p = db.profiles.find((x) => x.id === me); if (p?.role === 'admin') return send(route, 400, { message: 'an admin account is removed by another admin' });
      if (db.projects.some((x) => x.status === 'active' && (x.owner_id === me || x.contractor_id === me))) return send(route, 400, { message: 'active_project: a project in progress must be finished first' });
      Object.assign(p, { full_name: 'حساب محذوف', email: null, mobile: '0' + me.replace(/\D/g, '').slice(0, 11).padEnd(11, '0'), deleted_at: new Date().toISOString() });
      const u = db.users.find((x) => x.id === me); if (u) { u.email = `deleted-${me.replace(/-/g, '')}@deleted.tarmem.sa`; u.password = null; u.banned = true; }
      (db.erased ||= []).push(me);
      return send(route, 200, null);
    }
    if (path === '/rest/v1/rpc/admin_delete_user' && method === 'POST') {
      if (!admin) return refuse(route, 'admins only');
      if (body.p_user === me) return send(route, 400, { message: 'not yourself' });
      const p = db.profiles.find((x) => x.id === body.p_user); if (!p) return send(route, 400, { message: 'no such account' });
      if (p.role === 'admin') return send(route, 400, { message: 'another admin is removed in the SQL editor, not here' });
      if (db.projects.some((x) => x.status === 'active' && (x.owner_id === p.id || x.contractor_id === p.id))) return send(route, 400, { message: 'active_project: a project in progress must be finished first' });
      Object.assign(p, { full_name: 'حساب محذوف', email: null, deleted_at: new Date().toISOString() });
      (db.erased ||= []).push(p.id);
      return send(route, 200, null);
    }
    if (path === '/rest/v1/rpc/otp_request' && method === 'POST') {
      if (!me) return refuse(route, 'sign in first');
      if (!db.otpLive) return send(route, 400, { message: 'otp_off: mobile verification is not switched on' });
      db.otpCode = '482913'; db.otpSent = (db.otpSent || 0) + 1;
      return send(route, 200, { sent: true, to: '966551234567' });
    }
    if (path === '/rest/v1/rpc/otp_check' && method === 'POST') {
      if (!me) return refuse(route, 'sign in first');
      const ok = db.otpCode && body.p_code === db.otpCode;
      if (ok) { const p = db.profiles.find((x) => x.id === me); if (p) p.mobile_verified_at = new Date().toISOString(); db.otpCode = null; }
      return send(route, 200, Boolean(ok));
    }
    // (034) the open projects as everyone sees them: the ten safe columns, contact details, district and owner name masked
    if (path === '/rest/v1/rpc/public_projects' && method === 'POST') {
      const mask = (t) => String(t ?? '').replace(/[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+/g, '•••').replace(/(https?:\/\/|www\.)\S+/gi, '•••')
        .replace(/\+?[0-9٠-٩](?:[\s.()-]{0,2}[0-9٠-٩]){8,}/g, '•••');
      const code = body?.p_code ? String(body.p_code).trim().toUpperCase() : null;
      db.publicCalls = (db.publicCalls || 0) + 1;
      if (db.publicDown) return send(route, 503, { code: 'PGRST000', message: 'the database cannot be reached (for the test)' });
      return send(route, 200, db.projects.filter((p) => p.status === 'open' && canDeal(p.owner_id) && (!code || p.code === code))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 300)
        .map((p) => {
          const hide = [p.district, db.profiles.find((x) => x.id === p.owner_id)?.full_name].filter((w) => w && String(w).trim().length >= 3);
          const m = (t) => hide.reduce((acc, w) => acc.split(w).join('•••'), mask(t));
          return { code: p.code, title: m(p.title), trade: p.trade, description: m(p.description), city: p.city, budget_min: p.budget_min, budget_max: p.budget_max, timing: p.timing, created_at: p.created_at, preview: Boolean(p.preview) };
        }));
    }
    if (path === '/rest/v1/rpc/mobile_taken' && method === 'POST') { const key = (m) => { const d = String(m || '').replace(/[^0-9]/g, ''); return !d ? null : d.startsWith('00') ? d.slice(2) : d.startsWith('0') ? '966' + d.slice(1) : d.length === 9 && d.startsWith('5') ? '966' + d : d; }; return send(route, 200, key(body.p_mobile) !== null && db.profiles.some((p) => key(p.mobile) === key(body.p_mobile))); }
    if (path === '/rest/v1/rpc/my_performance' && method === 'POST') { if (!me) return refuse(route, 'sign in first'); return send(route, 200, { views: (db.visits || []).filter((v) => v.path === '/firm/co-' + String(me).slice(0, 8) && v.user_id !== me).length, bids: (db.bids || []).filter((b) => b.contractor_id === me && b.status !== 'withdrawn').length, won: (db.bids || []).filter((b) => b.contractor_id === me && b.status === 'chosen').length }); }
    if (path === '/rest/v1/rpc/mark_messages_read' && method === 'POST') { let n = 0; for (const r of db.messages || []) if (r.project_id === body.p_project && r.contractor_id === body.p_contractor && r.from_id !== me && !r.read_at) { r.read_at = new Date().toISOString(); n += 1; } return send(route, 200, n); }
    if (path === '/rest/v1/email_log') return rows(admin ? (db.emailLog || []) : []);
    if (path === '/rest/v1/wa_inbox') return rows(admin ? (db.waInbox || []) : []);
    if (path === '/rest/v1/rpc/wa_reconcile' && method === 'POST') { if (!admin) return refuse(route, 'admins only'); db.reconciled = (db.reconciled || 0) + 1; return send(route, 200, 0); }
    if (path === '/rest/v1/rpc/whatsapp_test' && method === 'POST') {
      if (!me) return refuse(route, 'sign in first');
      if (!db.whatsappLive) return refuse(route, 'WhatsApp updates are not switched on yet');
      if ((db.waTests || 0) >= 3) return send(route, 400, { code: '42501', message: 'test messages a day: 3 reached' }); // the allowance, not a rule violation
      const digits = String(db.profiles.find((p) => p.id === me)?.mobile || '').replace(/\D/g, '');
      const num = /^05\d{8}$/.test(digits) ? '966' + digits.slice(1) : /^9665\d{8}$/.test(digits) ? digits : null;
      if (!num) return send(route, 400, { code: '22023', message: 'not a Saudi mobile number' });
      db.waTests = (db.waTests || 0) + 1;
      if (db.waTests > 3) return refuse(route, 'three test messages a day');
      return send(route, 200, num);
    }
    if (path === '/rest/v1/stages') return rows((db.stages || []).filter((st) => admin || db.projects.some((p) => p.id === st.project_id && (p.owner_id === me || p.contractor_id === me))));
    if (path === '/rest/v1/rpc/mark_funded' && method === 'POST') { const p = db.projects.find((x) => x.id === body.p_project && x.status === 'active'); if (!admin || !db.paymentsLive || !p) return refuse(route, 'mark_funded: refused'); p.funded_at = new Date().toISOString(); return send(route, 200, p.funded_at); }
    if (path === '/rest/v1/rpc/stage_step' && method === 'POST') {
      if (!db.paymentsLive) return refuse(route, 'stages open when payment on the site is live');
      const project = db.projects.find((p) => p.id === body.p_project), stage = (db.stages || []).find((st) => st.project_id === body.p_project && st.idx === body.p_idx);
      const has = (kind) => db.files.some((f) => f.path.startsWith(`${project?.owner_id}/${project?.id}/stage-${body.p_idx}/${kind}-`));
      if (!project || !stage) return refuse(route, 'stage: none');
      if (!project.funded_at) return refuse(route, 'stage: the payment has not been received');
      if (body.p_action === 'submit') { if (project.contractor_id !== me || !has('photo') || !has('video')) return refuse(route, 'stage: cannot submit'); stage.status = 'submitted'; }
      else if (project.owner_id !== me || stage.status !== 'submitted' || (body.p_action === 'approve' && !has('accept'))) return refuse(route, 'stage: cannot decide');
      else stage.status = body.p_action === 'approve' ? 'released' : 'disputed';
      return send(route, 200, stage);
    }
    if (path === '/rest/v1/agreements') return rows(db.agreements.filter((a) => admin || a.homeowner_id === me || a.contractor_id === me));
    if (path === '/rest/v1/rpc/sign_agreement_homeowner' && method === 'POST') {
      const bid = db.bids.find((b) => b.id === body.p_bid && b.status !== 'withdrawn');
      if (!bid) return send(route, 400, { code: 'P0001', message: 'this bid is not available' });
      const project = db.projects.find((p) => p.id === bid.project_id && p.owner_id === me);
      if (!project) return refuse(route, 'only the project\'s owner accepts a bid');
      if (project.status !== 'open' || db.agreements.some((a) => a.project_id === project.id && a.contractor_signed_at)) return send(route, 400, { code: 'P0001', message: 'the project is no longer open' });
      for (const b of db.bids) if (b.project_id === project.id) b.status = b.id === bid.id ? 'chosen' : b.status === 'chosen' ? 'submitted' : b.status;
      db.agreements = db.agreements.filter((a) => a.project_id !== project.id);
      const row = { project_id: project.id, bid_id: bid.id, homeowner_id: me, contractor_id: bid.contractor_id, amount: bid.price, days: bid.days, homeowner_name: db.profiles.find((p) => p.id === me).full_name, homeowner_signed_at: new Date().toISOString(), contractor_name: null, contractor_signed_at: null };
      db.agreements.push(row);
      return send(route, 200, row);
    }
    if (path === '/rest/v1/rpc/sign_agreement_contractor' && method === 'POST') {
      const row = db.agreements.find((a) => a.project_id === body.p_project && a.contractor_id === me);
      if (!row) return send(route, 400, { code: 'P0001', message: 'there is no agreement here for you to sign' });
      if (row.contractor_signed_at) return send(route, 400, { code: 'P0001', message: 'the agreement is already signed by both sides' });
      Object.assign(row, { contractor_name: db.applications.find((a) => a.user_id === me)?.company || '', contractor_signed_at: new Date().toISOString() });
      Object.assign(db.projects.find((p) => p.id === row.project_id), { status: 'active', contractor_id: me, amount: row.amount });
      db.stages = [...(db.stages || []), ...[0, 1, 2].map((idx) => ({ project_id: row.project_id, idx, status: 'pending' }))];
      return send(route, 200, row);
    }
    // change requests (supabase/027): the two parties read them; proposing and approving go through the two functions
    if (path === '/rest/v1/change_requests') return rows((db.changes || []).filter((c) => { const p = db.projects.find((x) => x.id === c.project_id); return admin || p?.owner_id === me || p?.contractor_id === me; }));
    if ((path === '/rest/v1/rpc/change_request_create' || path === '/rest/v1/rpc/change_request_approve') && method === 'POST') {
      db.changes ||= [];
      const c = path.endsWith('approve') ? db.changes.find((x) => x.id === body.p_id) : null;
      const project = db.projects.find((p) => p.id === (c ? c.project_id : body.p_project));
      const side = project?.owner_id === me ? 'ho' : project?.contractor_id === me ? 'co' : null;
      if (!side) return refuse(route, 'only the project\'s two parties can propose a change');
      if (project.status !== 'active') return refuse(route, 'change requests open once both parties have signed');
      const total = Number(project.amount) + (c ? c.amount : Number(body.p_amount) || 0);
      if (total < 100 || total > 1000000) return send(route, 400, { code: '22023', message: 'the project\'s value would leave its limits (100 to 1,000,000 riyals)' });
      if (!c) {
        const row = { id: db.changes.length + 1, project_id: project.id, code: 'CR-' + (db.changes.filter((x) => x.project_id === project.id).length + 1), by_side: side, description: String(body.p_desc || '').trim(), amount: Number(body.p_amount) || 0, days: Number(body.p_days) || 0,
          ho_ok_at: side === 'ho' ? new Date().toISOString() : null, co_ok_at: side === 'co' ? new Date().toISOString() : null, applied_at: null, created_at: new Date().toISOString() };
        db.changes.push(row);
        return send(route, 200, row);
      }
      if ((side === 'ho' && c.ho_ok_at) || (side === 'co' && c.co_ok_at)) return refuse(route, 'the other party approves a change you proposed');
      Object.assign(c, { ho_ok_at: c.ho_ok_at || new Date().toISOString(), co_ok_at: c.co_ok_at || new Date().toISOString(), applied_at: new Date().toISOString() });
      project.amount = total;
      return send(route, 200, c);
    }
    // each party confirms the work is complete; the project completes on the second confirmation (supabase/030 B)
    if ((path === '/rest/v1/rpc/homeowner_confirm_complete' || path === '/rest/v1/rpc/contractor_confirm_complete') && method === 'POST') {
      if (!me) return refuse(route, 'sign in first');
      const ho = path.endsWith('homeowner_confirm_complete');
      const p = db.projects.find((x) => x.id === body.p_project);
      if (ho && (!p || p.owner_id !== me)) return refuse(route, 'only the project\'s owner confirms completion');
      if (!ho && (!p || p.contractor_id !== me)) return refuse(route, 'only the project\'s contractor confirms completion');
      if (p.status === 'completed') return send(route, 200, p);
      if (db.paymentsLive) return refuse(route, 'payments_on: with payment on the site, a project completes when its last stage is approved');
      if (p.status !== 'active') return refuse(route, 'not_active: only a project in progress can be confirmed complete');
      const a = db.agreements.find((x) => x.project_id === p.id && x.contractor_signed_at);
      if (!a) return refuse(route, 'not_signed: the agreement is not signed by both parties');
      const field = ho ? 'homeowner_done_at' : 'contractor_done_at';
      if (a[field]) return send(route, 200, p);
      a[field] = new Date().toISOString();
      (db.confirmations ||= []).push({ id: p.id, by: ho ? 'homeowner' : 'contractor' });
      if (a.homeowner_done_at && a.contractor_done_at) { p.status = 'completed'; (db.completed ||= []).push(p.id); }
      return send(route, 200, p);
    }
    // the team completes, cancels or removes a project (supabase/030 A)
    if (path === '/rest/v1/rpc/admin_set_project_status' && method === 'POST') {
      if (!admin) return refuse(route, 'admins only');
      if (!['completed', 'withdrawn'].includes(body.p_status)) return send(route, 400, { code: '22023', message: 'unknown status: use completed or withdrawn' });
      const p = db.projects.find((x) => x.id === body.p_project);
      if (!p) return send(route, 400, { code: '22023', message: 'no such project' });
      // (033) an example project is never withdrawn (that would email everyone who bid): preview_clear removes it instead
      if (p.preview && body.p_status === 'withdrawn') return refuse(route, `example project ${p.code}: remove it with select public.preview_clear('${p.code}') — a withdrawal would email everyone who bid`);
      const move = `${p.status}>${body.p_status}`;
      if (!['active>completed', 'active>withdrawn', 'open>withdrawn'].includes(move)) return refuse(route, 'status_not_allowed: a project goes from active to completed or withdrawn, or from open to withdrawn');
      (db.statusChanges ||= []).push({ id: p.id, from: p.status, to: body.p_status, note: body.p_note ?? null, action: move === 'active>completed' ? 'completed' : move === 'active>withdrawn' ? 'cancelled' : 'removed' });
      p.status = body.p_status;
      return send(route, 200, p);
    }
    if (path === '/rest/v1/rpc/claim_my_application' && method === 'POST') {
      if (!me) return refuse(route, 'sign in first');
      const u = db.users.find((x) => x.id === me);
      if (!u || u.confirmed === false) return refuse(route, 'confirm your email first');
      const prof = db.profiles.find((x) => x.id === me && x.role === 'contractor');
      if (!prof) return refuse(route, 'only a contractor account can claim an application');
      const own = db.applications.find((a) => a.user_id === me);
      const key = (m) => String(m || '').replace(/\D/g, '').replace(/^(00966|966|0)/, '');
      if (!own || own.status === 'new') {
        const same = (a) => !a.user_id && a.email && a.email.toLowerCase() === u.email.toLowerCase();
        // (b) checked by the team, of any age, with the same mobile — preferred, and it replaces a 'new' one
        const checked = db.applications.filter((a) => same(a) && ['verified', 'contacted'].includes(a.status) && key(a.mobile) === key(prof.mobile))
          .sort((x, y) => (y.status === 'verified') - (x.status === 'verified')).slice(0, 1)[0];
        // (a) sent after the account existed, when it has none yet
        const after = !own && db.applications.filter((a) => same(a) && Date.parse(a.created_at || 0) >= Date.parse(u.created_at) - 60000).slice(-1)[0];
        const pick = checked || after;
        if (pick) {
          if (own && checked) db.applications = db.applications.filter((a) => a !== own);
          pick.user_id = me; (db.claimed ||= []).push(me);
        }
      }
      return send(route, 200, db.applications.map((a, i) => ({ id: i + 1, ...a })).filter((a) => a.user_id === me));
    }
    if (path === '/rest/v1/portfolio') {
      if (method === 'GET') return rows(db.captions.filter((c) => !eq('user_id') || c.user_id === eq('user_id')));
      if (!isVerified(me) || String(body.path || '').split('/')[0] !== me) return refuse(route, 'portfolio captions: refused');
      if (method === 'POST') { db.captions = [...db.captions.filter((c) => c.path !== body.path), { ...body, user_id: me }]; return send(route, 201); }
      if (method === 'DELETE') { db.captions = db.captions.filter((c) => !(c.path === eq('path') && c.user_id === me)); return route.fulfill({ status: 204, headers: cors }); }
    }
    if (path === '/rest/v1/rpc/wallet_decide' && method === 'POST') {
      const t = (db.wallet || []).find((x) => x.id === body.p_id && x.status === 'pending');
      if (!t || (body.p_status === 'cancelled' ? t.user_id !== me : !admin)) return refuse(route, 'wallet_decide: refused');
      t.status = body.p_status; t.decided_at = new Date().toISOString();
      return send(route, 200, t);
    }
    if (path === '/rest/v1/verified_contractors') {
      const all = me ? db.applications.filter((a) => a.status === 'verified' && a.user_id).map((a) => { const p = db.profiles.find((x) => x.id === a.user_id) || {}; const theirs = (db.reviews || []).filter((r) => r.contractor_id === a.user_id);
        return { user_id: a.user_id, company: a.company, city: p.city || a.city, trades: p.trades || a.trades, since: '2026-09-21', rating: theirs.length ? theirs.reduce((t, r) => t + r.stars, 0) / theirs.length : null, reviews: theirs.length, done: db.projects.filter((x) => x.contractor_id === a.user_id && x.status === 'completed').length, bio: p.about || null }; }) : [];
      return rows(all.filter((c) => !eq('user_id') || c.user_id === eq('user_id')));
    }
    if (path === '/rest/v1/contractor_reviews') return rows(me ? (db.reviews || []).filter((r) => r.contractor_id === eq('contractor_id')).map((r) => ({ contractor_id: r.contractor_id, stars: r.stars, body: r.body, created_at: r.created_at, reviewer: String(db.profiles.find((p) => p.id === r.homeowner_id)?.full_name || '').split(' ')[0] })) : []);
    if (path === '/rest/v1/wallet_txns') return rows((db.wallet || []).filter((t) => (admin || t.user_id === me) && (!eq('status') || t.status === eq('status'))));
    if (path === '/rest/v1/payout_accounts') {
      if (method === 'GET') return rows((db.payouts || []).filter((a) => a.user_id === me));
      if (!db.paymentsLive || !db.profiles.some((p) => p.id === me && p.role === 'contractor') || !/^SA\d{22}$/.test(body.iban || '') || 'user_id' in body) return refuse(route, 'payout_accounts: refused');
      db.payouts = [...(db.payouts || []).filter((a) => a.user_id !== me), { ...body, user_id: me }];
      return send(route, 201);
    }
    if (path === '/rest/v1/rpc/wallet_request' && method === 'POST') {
      const role = db.profiles.find((p) => p.id === me)?.role;
      if (!db.paymentsLive || (body.p_type === 'deposit' ? role !== 'homeowner' : role !== 'contractor' || !(db.payouts || []).some((a) => a.user_id === me))) return refuse(route, 'wallet_request: refused');
      const row = { id: (db.wallet || []).length + 1, user_id: me, project_id: body.p_project, type: body.p_type, method: body.p_type === 'payout' ? 'bank' : body.p_method, amount: body.p_amount, status: 'pending', created_at: new Date().toISOString() };
      db.wallet = [row, ...(db.wallet || [])];
      return send(route, 200, row);
    }
    if (path === '/rest/v1/bids') {
      const mayRead = (b) => admin || b.contractor_id === me || db.projects.some((p) => p.id === b.project_id && p.owner_id === me);
      if (method === 'GET') return rows(db.bids.filter((b) => mayRead(b) && (url.searchParams.get('status') !== 'neq.withdrawn' || b.status !== 'withdrawn')));
      if (method === 'POST') {
        const assigned = ['id', 'contractor_id', 'status', 'created_at'].filter((k) => k in body);
        if (assigned.length) return refuse(route, 'bids: the database assigns ' + assigned.join(', '));
        const rule = broken('bids', body); if (rule) return checkError(route, rule, 'bids');
        if (!isVerified(me) || !db.projects.some((p) => p.id === body.project_id && p.status === 'open') || db.bids.some((b) => b.project_id === body.project_id && b.contractor_id === me)) return refuse(route, 'new row violates row-level security policy for table "bids"');
        const row = { id: `20000000-0000-4000-8000-${String(db.bids.length + 1).padStart(12, '0')}`, contractor_id: me, status: 'submitted', created_at: new Date().toISOString(), ...body };
        db.bids.push(row);
        return wantsRows ? rows([row]) : send(route, 201);
      }
      if (method === 'PATCH') {
        for (const b of db.bids) {
          const hit = (!eq('id') || b.id === eq('id')) && (!eq('project_id') || b.project_id === eq('project_id')) && (!url.searchParams.get('status') || 'eq.' + b.status === url.searchParams.get('status')) && (!url.searchParams.get('id')?.startsWith('neq.') || 'neq.' + b.id !== url.searchParams.get('id'));
          const owner = db.projects.some((p) => p.id === b.project_id && p.owner_id === me);
          if (hit && owner && Object.keys(body).join() === 'status' && ['submitted', 'chosen'].includes(body.status)) Object.assign(b, body);
        }
        return route.fulfill({ status: 204, headers: cors });
      }
    }
    if (path === '/rest/v1/rpc/admin_analytics' && method === 'POST') {
      if (!admin) return refuse(route, 'admin_analytics: admins only');
      const sessions = new Set(db.visits.map((v) => v.session_id)).size;
      const count = (key) => Object.entries(db.visits.reduce((m, v) => ({ ...m, [v[key] ?? 'direct']: (m[v[key] ?? 'direct'] || 0) + 1 }), {})).map(([k, n]) => ({ k, n }));
      const stats = { visitors: sessions, views: db.visits.filter((v) => v.event === 'view').length, signups: db.visits.filter((v) => v.event === 'signup').length, posts: db.visits.filter((v) => v.event === 'project').length, avg_seconds: 75, bounce_pct: 0 };
      const points = body.p_range === 'month' ? 30 : body.p_range === 'year' ? 12 : 7;
      return send(route, 200, { range: ['month', 'year'].includes(body.p_range) ? body.p_range : 'week',
        series: Array.from({ length: points }, (_, k) => ({ k: body.p_range === 'year' ? `2026-${String(k + 1).padStart(2, '0')}` : `2026-09-${String(k + 1).padStart(2, '0')}`, n: k === points - 1 ? sessions : 0 })),
        prev_total: 0, today: stats, yesterday: { ...stats, visitors: 0, views: 0, signups: 0, posts: 0 }, top_pages: count('route'), sources: count('referrer'), cities: [{ k: 'unknown', n: sessions }],
        live: { now: sessions, devices: count('device'), pages: count('route').slice(0, 5), feed: db.visits.slice(-8).reverse().map((v, i) => ({ city: v.city, event: v.event, route: v.route, age: i * 7 })) } });
    }
    if (path === '/rest/v1/admin_state') {
      if (!admin) return method === 'GET' ? rows([]) : refuse(route, 'admin_state: admins only');
      if (method === 'GET') return rows(Object.entries(db.adminState).map(([key, value]) => ({ key, value })));
      if (method === 'POST') { db.adminState[body.key] = body.value; return send(route, 201); }
    }
    for (const [table, store] of [['contact_messages', db.contact], ['contractor_applications', db.applications], ['visits', db.visits]]) {
      if (path !== '/rest/v1/' + table) continue;
      if (method === 'POST') {
        if (wantsRows) return refuse(route, table + ': visitors cannot read a row back');
        const rule = broken(table, body); if (rule) return checkError(route, rule, table);
        // the forms' limits (supabase/029): five in an hour from the same address or number
        if (table !== 'visits' && store.filter((r) => (body.email && r.email === body.email) || (body.mobile && r.mobile === body.mobile)).length >= 5) return send(route, 400, { code: 'P0001', message: 'too many: five in an hour from the same address or number' });
        if (table === 'contractor_applications' && me && store.some((r) => r.user_id === me)) return send(route, 409, { code: '23505', message: 'duplicate key value violates unique constraint "contractor_applications_user_idx"' });
        store.push(table === 'contractor_applications' ? { ...body, user_id: me, status: 'new', created_at: new Date().toISOString() } : body);
        return send(route, 201);
      }
      if (method === 'GET') return rows(store.map((r, i) => ({ id: i + 1, created_at: new Date().toISOString(), status: 'new', handled: false, ...r })).filter((r) => admin || (table === 'contractor_applications' && me && r.user_id === me)));
      if (method === 'PATCH') {
        if (!admin) return refuse(route, table + ': only admins change a row');
        Object.assign(store[Number(eq('id')) - 1] || {}, body);
        return route.fulfill({ status: 204, headers: cors });
      }
    }
    db.unknown.push(`${method} ${path}${url.search}`);
    return send(route, 404, { message: 'not mocked' });
  });
  return db;
}
