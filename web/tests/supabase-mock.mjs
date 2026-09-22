/* A stand-in for Tarmem's database, for browser tests.

   Every request the site makes to Supabase is answered here, in memory, so the tests create no
   accounts and write nothing real — including when they run against the live site. It imitates the
   rules in ../../supabase/*.sql closely enough to catch a client that would break them: people read
   only their own rows, the columns the database assigns (owner, status, code) are refused if sent,
   and the two public forms cannot be read back. The rules themselves are tested against the real
   database by supabase/tests (they cannot be proven from here). */

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub) => `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.test`;
const subOf = (header) => { try { return JSON.parse(Buffer.from(String(header || '').split('.')[1], 'base64url').toString()).sub || null; } catch { return null; } };

/** A signed-in session for `userId`, as the fragment a "reset your password" email link carries. */
export const recoveryFragment = (userId) => `#access_token=${jwt(userId)}&refresh_token=refresh-${userId}&expires_in=3600&token_type=bearer&type=recovery`;

export async function installSupabaseMock(context, supabaseUrl) {
  const db = { users: [], profiles: [], projects: [], contact: [], applications: [], visits: [], adminState: {}, files: [], bids: [], agreements: [], portfolio: [], captions: [], refused: [], unknown: [] };
  let nextCode = 2001;
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
  const send = (route, status, body) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: body === undefined ? '' : JSON.stringify(body) });
  const publicUser = (u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: u.data, app_metadata: { provider: 'email' }, created_at: u.created_at });
  const session = (u) => ({ access_token: jwt(u.id), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'refresh-' + u.id, user: publicUser(u) });
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

    if (path === '/auth/v1/signup' && method === 'POST') {
      if (db.users.some((u) => u.email === body.email)) return send(route, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
      const user = { id: `00000000-0000-4000-8000-${String(db.users.length + 1).padStart(12, '0')}`, email: body.email, password: body.password, data: body.data || {}, created_at: new Date().toISOString() };
      db.users.push(user);
      return send(route, 200, session(user));
    }
    if (path === '/auth/v1/token' && method === 'POST') {
      const user = url.searchParams.get('grant_type') === 'refresh_token'
        ? db.users.find((u) => 'refresh-' + u.id === body.refresh_token)
        : db.users.find((u) => u.email === body.email && u.password === body.password);
      return user ? send(route, 200, session(user)) : send(route, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, headers: cors });
    if (path === '/auth/v1/recover' && method === 'POST') { (db.recoveries ||= []).push({ email: body.email, redirect: url.searchParams.get('redirect_to') }); return send(route, 200, {}); }
    if (path === '/auth/v1/user' && method === 'PUT') { const user = db.users.find((u) => u.id === me); if (!user) return send(route, 401, { msg: 'no session' }); if (body.password) user.password = body.password; return send(route, 200, publicUser(user)); }
    if (path === '/auth/v1/user') { const user = db.users.find((u) => u.id === me); return user ? send(route, 200, publicUser(user)) : send(route, 401, { msg: 'no session' }); }

    const admin = db.profiles.some((p) => p.id === me && p.role === 'admin');
    const isVerified = (id) => db.profiles.some((p) => p.id === id && p.role === 'contractor') && db.applications.some((a) => a.user_id === id && a.status === 'verified');
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
      const prefix = body.prefix.replace(/\/$/, '') + '/';
      return send(route, 200, db.files.filter((f) => f.path.startsWith(prefix) && (admin || f.path.startsWith(me + '/'))).map((f, i) => ({ id: 'obj-' + i, name: f.path.slice(prefix.length), created_at: f.created_at })));
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
        Object.assign(db.profiles.find((p) => p.id === me), body);
        return route.fulfill({ status: 204, headers: cors });
      }
      if (method === 'POST') {
        if (!me || body.id !== me || !['homeowner', 'contractor'].includes(body.role)) return refuse(route, 'profiles: not your own row, or not an allowed role');
        const row = { company: null, ...body, email: db.users.find((u) => u.id === me).email, created_at: new Date().toISOString() };
        db.profiles.push(row);
        return wantsRows ? rows([row]) : send(route, 201);
      }
    }
    if (path === '/rest/v1/projects') {
      const verifiedContractor = db.profiles.some((p) => p.id === me && p.role === 'contractor') && db.applications.some((a) => a.user_id === me && a.status === 'verified');
      const inProj = (url.searchParams.get('id') || '').startsWith('in.(') ? url.searchParams.get('id').slice(4, -1).split(',') : null;
      if (method === 'GET') return rows(db.projects.filter((p) => (!inProj || inProj.includes(p.id)) && (admin || p.owner_id === me || (verifiedContractor && (p.status === 'open' || db.bids.some((b) => b.project_id === p.id && b.contractor_id === me)))) && (url.searchParams.get('status') !== 'neq.withdrawn' || p.status !== 'withdrawn')).sort((a, b) => b.created_at.localeCompare(a.created_at)));
      if (method === 'POST') {
        const assigned = ['id', 'code', 'owner_id', 'status', 'created_at'].filter((k) => k in body);
        if (assigned.length) return refuse(route, 'projects: the database assigns ' + assigned.join(', '));
        if (!db.profiles.some((p) => p.id === me && p.role === 'homeowner')) return send(route, 400, { code: 'P0001', message: 'Only homeowners can post projects' });
        const row = { id: `10000000-0000-4000-8000-${String(nextCode).padStart(12, '0')}`, code: 'P-' + nextCode++, owner_id: me, status: 'open', created_at: new Date().toISOString(), ...body };
        db.projects.push(row);
        return wantsRows ? rows([row]) : send(route, 201);
      }
      if (method === 'PATCH') {
        const row = db.projects.find((p) => p.id === eq('id') && p.owner_id === me);
        if (row) Object.assign(row, body);
        return route.fulfill({ status: 204, headers: cors });
      }
    }
    if (path === '/rest/v1/reviews') {
      if (method === 'GET') return rows(me ? (db.reviews || []) : []);
      const project = db.projects.find((p) => p.id === body.project_id && p.owner_id === me && p.status === 'completed' && p.contractor_id === body.contractor_id);
      if (!project || (db.reviews || []).some((r) => r.project_id === body.project_id) || 'homeowner_id' in body) return refuse(route, 'reviews: not a finished project of yours, or already reviewed');
      (db.reviews ||= []).push({ ...body, homeowner_id: me, created_at: new Date().toISOString() });
      return send(route, 201);
    }
    if (path === '/rest/v1/platform_flags') return rows(me ? [{ key: 'payments_live', enabled: Boolean(db.paymentsLive) }, { key: 'whatsapp_live', enabled: Boolean(db.whatsappLive) }] : []);
    if (path === '/rest/v1/rpc/whatsapp_test' && method === 'POST') {
      if (!me) return refuse(route, 'sign in first');
      if (!db.whatsappLive) return refuse(route, 'WhatsApp updates are not switched on yet');
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
      const project = bid && db.projects.find((p) => p.id === bid.project_id && p.owner_id === me && p.status === 'open');
      if (!project || db.agreements.some((a) => a.project_id === project.id && a.contractor_signed_at)) return refuse(route, 'agreement: not yours to sign');
      for (const b of db.bids) if (b.project_id === project.id) b.status = b.id === bid.id ? 'chosen' : b.status === 'chosen' ? 'submitted' : b.status;
      db.agreements = db.agreements.filter((a) => a.project_id !== project.id);
      const row = { project_id: project.id, bid_id: bid.id, homeowner_id: me, contractor_id: bid.contractor_id, amount: bid.price, days: bid.days, homeowner_name: db.profiles.find((p) => p.id === me).full_name, homeowner_signed_at: new Date().toISOString(), contractor_name: null, contractor_signed_at: null };
      db.agreements.push(row);
      return send(route, 200, row);
    }
    if (path === '/rest/v1/rpc/sign_agreement_contractor' && method === 'POST') {
      const row = db.agreements.find((a) => a.project_id === body.p_project && a.contractor_id === me);
      if (!row) return refuse(route, 'agreement: nothing here for you to sign');
      Object.assign(row, { contractor_name: db.applications.find((a) => a.user_id === me)?.company || '', contractor_signed_at: new Date().toISOString() });
      Object.assign(db.projects.find((p) => p.id === row.project_id), { status: 'active', contractor_id: me, amount: row.amount });
      db.stages = [...(db.stages || []), ...[0, 1, 2].map((idx) => ({ project_id: row.project_id, idx, status: 'pending' }))];
      return send(route, 200, row);
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
        if (!isVerified(me) || !db.projects.some((p) => p.id === body.project_id && p.status === 'open') || db.bids.some((b) => b.project_id === body.project_id && b.contractor_id === me)) return refuse(route, 'bids: not allowed to bid here');
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
        store.push(table === 'contractor_applications' ? { ...body, user_id: me, status: 'new' } : body);
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
