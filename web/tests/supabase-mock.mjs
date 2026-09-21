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
  const db = { users: [], profiles: [], projects: [], contact: [], applications: [], refused: [], unknown: [] };
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
      if (method === 'GET') return rows(db.projects.filter((p) => (admin || p.owner_id === me) && (url.searchParams.get('status') !== 'neq.withdrawn' || p.status !== 'withdrawn')).sort((a, b) => b.created_at.localeCompare(a.created_at)));
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
    for (const [table, store] of [['contact_messages', db.contact], ['contractor_applications', db.applications]]) {
      if (path !== '/rest/v1/' + table) continue;
      if (method === 'POST') {
        if (wantsRows) return refuse(route, table + ': visitors cannot read a row back');
        store.push(body);
        return send(route, 201);
      }
      if (method === 'GET') return rows(admin ? store.map((r, i) => ({ id: i + 1, created_at: new Date().toISOString(), status: 'new', ...r })) : []);
    }
    db.unknown.push(`${method} ${path}${url.search}`);
    return send(route, 404, { message: 'not mocked' });
  });
  return db;
}
