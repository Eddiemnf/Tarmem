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

export async function installSupabaseMock(context, supabaseUrl) {
  const db = { users: [], profiles: [], projects: [], contact: [], applications: [], visits: [], adminState: {}, files: [], refused: [], unknown: [] };
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
    if (path === '/auth/v1/user') { const user = db.users.find((u) => u.id === me); return user ? send(route, 200, publicUser(user)) : send(route, 401, { msg: 'no session' }); }

    const admin = db.profiles.some((p) => p.id === me && p.role === 'admin');
    // storage: a private bucket, <owner>/<project>/<file>; owners add to their own projects, owners and admins read
    const BUCKET = '/storage/v1/object/';
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
      if (owner !== me || !db.projects.some((p) => p.id === project && p.owner_id === me)) return refuse(route, 'storage: not your project');
      if (!/^[\x20-\x7E]+$/.test(key)) return refuse(route, 'storage: keys must be plain ASCII');
      db.files.push({ path: key, type: headers['content-type'] || '', created_at: new Date().toISOString() });
      return send(route, 200, { Key: 'project-files/' + key, Id: 'obj' });
    }
    if (path === '/rest/v1/profiles') {
      if (method === 'GET') return rows(db.profiles.filter((p) => (admin || p.id === me) && (!eq('id') || p.id === eq('id'))));
      if (method === 'POST') {
        if (!me || body.id !== me || !['homeowner', 'contractor'].includes(body.role)) return refuse(route, 'profiles: not your own row, or not an allowed role');
        const row = { company: null, ...body, email: db.users.find((u) => u.id === me).email, created_at: new Date().toISOString() };
        db.profiles.push(row);
        return wantsRows ? rows([row]) : send(route, 201);
      }
    }
    if (path === '/rest/v1/projects') {
      const verifiedContractor = db.profiles.some((p) => p.id === me && p.role === 'contractor') && db.applications.some((a) => a.user_id === me && a.status === 'verified');
      if (method === 'GET') return rows(db.projects.filter((p) => (admin || p.owner_id === me || (verifiedContractor && p.status === 'open')) && (url.searchParams.get('status') !== 'neq.withdrawn' || p.status !== 'withdrawn')).sort((a, b) => b.created_at.localeCompare(a.created_at)));
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
