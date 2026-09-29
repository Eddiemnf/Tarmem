/* The Content-Security-Policy in ../../vercel.json, proven against the production build.

   npm run build, then: node tests/csp.mjs
   It serves web/dist with `vite preview` on port 4180 (unless something already answers at BASE_URL) and stops it again
   at the end. Every response from the preview is given the exact header Vercel sends (read from vercel.json, so the test
   and the deployment cannot drift apart); the database is the stand-in (tests/supabase-mock.mjs), so nothing real is
   touched. It first checks the header is really enforced (an injected inline script must not run), then walks the public
   pages, the private demo, and the pages a homeowner, a contractor and the team see — every tab, the home film, the
   contact form, photos from storage — and fails on any `securitypolicyviolation`. */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { installSupabaseMock } from './supabase-mock.mjs';

const WEB = fileURLToPath(new URL('..', import.meta.url));
const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
const CSP = vercel.headers.flatMap((h) => (h.source === '/(.*)' ? h.headers : [])).find((h) => h.key === 'Content-Security-Policy')?.value;
if (!CSP) { console.log('FAIL  vercel.json sends no Content-Security-Policy on every page'); process.exit(1); }
const directives = Object.fromEntries(CSP.split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([k, ...v]) => [k, v]));
const site = JSON.parse(readFileSync(new URL('../site.config.json', import.meta.url), 'utf8'));
const BASE_URL = (process.env.BASE_URL || 'http://localhost:4180/').replace(/\/?$/, '/');
const ORIGIN = new URL(BASE_URL).origin;

const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
check('script-src is \'self\' alone: no inline scripts, no eval, no other host', (directives['script-src'] || []).join(' ') === "'self'", (directives['script-src'] || []).join(' '));
check('the policy has no \'unsafe-eval\' anywhere, and objects are off', !CSP.includes('unsafe-eval') && (directives['object-src'] || []).join(' ') === "'none'");

// ---------------------------------------------------------------- the build, served as Vercel would
const answers = async () => { try { return (await fetch(BASE_URL)).ok; } catch { return false; } };
let preview = null;
if (!(await answers())) {
  if (!existsSync(new URL('../dist/index.html', import.meta.url))) { console.log('No build found: run `npm run build` first.'); process.exit(1); }
  const port = new URL(BASE_URL).port || '4180';
  // `vite preview --port 4180 --strictPort`, run with node directly so that stopping it stops the server itself
  preview = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'preview', '--port', port, '--strictPort'], { cwd: WEB, stdio: 'ignore' });
  for (let i = 0; i < 80 && !(await answers()); i += 1) await new Promise((r) => setTimeout(r, 250));
  if (!(await answers())) { console.log(`vite preview did not start on ${BASE_URL}`); preview.kill(); process.exit(1); }
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const violations = [];
const errors = [];
let headerSeen = 0;

async function newContext(label, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport });
  // Vercel's header on every response from the site; the database's host is answered by the stand-in
  await context.route(`${ORIGIN}/**`, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': CSP } });
  });
  const db = await installSupabaseMock(context, site.supabase.url);
  await context.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push({ directive: e.effectiveDirective || e.violatedDirective, blocked: e.blockedURI, source: e.sourceFile, line: e.lineNumber, sample: e.sample }));
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); // count visits, as a real browser would (connect-src)
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => errors.push(`${label}: PAGE ERROR ${String(e).slice(0, 200)}`));
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) violations.push(`${label}: console: ${m.text().slice(0, 240)}`); });
  page.on('response', (r) => { if (r.request().resourceType() === 'document' && r.url().startsWith(ORIGIN) && r.headers()['content-security-policy'] === CSP) headerSeen += 1; });
  return { context, db, page };
}
/** What the page reported, since it loaded; read before every navigation. */
async function collect(page, label) {
  const found = await page.evaluate(() => window.__csp || []).catch(() => []);
  for (const v of found) violations.push(`${label}: ${v.directive} blocked ${v.blocked || '(inline)'}${v.source ? ` from ${v.source}:${v.line}` : ''}${v.sample ? ` «${v.sample}»` : ''}`);
  await page.evaluate(() => { window.__csp = []; }).catch(() => undefined);
}
let views = 0;
async function visit(page, label, path, act) {
  await page.goto(BASE_URL + path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('header, .gate', { timeout: 10000 }).catch(() => undefined);
  await page.waitForTimeout(700);
  views += 1;
  if (act) await act(page).catch((e) => errors.push(`${label} /${path}: ${String(e).split('\n')[0].slice(0, 160)}`));
  await page.waitForTimeout(300);
  await collect(page, `${label} /${path}`);
}
const clickAll = async (page, selector) => {
  const n = await page.locator(selector).count();
  for (let i = 0; i < n; i += 1) { await page.locator(selector).nth(i).click(); await page.waitForTimeout(350); views += 1; }
};

// ---------------------------------------------------------------- 1. the header is there, and enforced
{
  const { context, page } = await newContext('control');
  const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('header');
  check('the preview answers with the exact header vercel.json sends', response.headers()['content-security-policy'] === CSP);
  const ran = await page.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__inlineRan = true'; document.head.appendChild(s); return window.__inlineRan === true; });
  await page.waitForTimeout(200);
  const caught = await page.evaluate(() => (window.__csp || []).some((v) => v.directive === 'script-src-elem' || v.directive === 'script-src'));
  check('…and the browser enforces it: an injected inline script does not run, and is reported', !ran && caught);
  await context.close();
  violations.length = 0; // that one was on purpose
}

// ---------------------------------------------------------------- 2. every visitor's page, and the demo
for (const lang of ['ar', 'en']) {
  const { context, db, page } = await newContext(`visitor ${lang}`);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('header');
  if (lang === 'en') { await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('tarmem-public-v1') || '{}'); s.lang = 'en'; localStorage.setItem('tarmem-public-v1', JSON.stringify(s)); }); }
  await visit(page, `visitor ${lang}`, '', async (p) => {
    // the home film plays from the site itself (media-src), and the page scrolls through its sections
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(600);
  });
  for (const path of ['how', 'pricing', 'about', 'faq', 'help', 'rules', 'terms', 'privacy', 'join', 'signin', 'reset-password']) await visit(page, `visitor ${lang}`, path);
  await visit(page, `visitor ${lang}`, 'post', async (p) => {
    await p.locator('input[name="title"]').fill('تجديد مطبخ صغير');
    await p.locator('textarea[name="desc"]').fill('تغيير الخزائن والرخام، المساحة 3×4 م.');
    await p.locator('select[name="trade"]').selectOption('kitchen');
    await p.locator('button', { hasText: /التالي|Next/ }).first().click(); await p.waitForTimeout(400);
  });
  if (lang === 'ar') {
    await visit(page, 'visitor ar', 'contact', async (p) => {
      // a message sent to the database (connect-src)
      await p.locator('input[name="name"]').fill('زائر');
      await p.locator('input[name="phone"]').fill('0555000111');
      await p.locator('select[name="topic"]').selectOption({ index: 1 });
      await p.locator('textarea[name="msg"]').fill('سؤال عن المدن التي تغطونها');
      await p.locator('button', { hasText: 'إرسال الرسالة' }).click(); await p.waitForTimeout(900);
    });
    check('the contact form reached the database under the policy', db.contact.length === 1);
    check('…and so did the visit record', db.visits.length > 0);
    await visit(page, 'visitor ar', 'demo');
  } else await visit(page, `visitor ${lang}`, 'contact');
  await context.close();
}

// ---------------------------------------------------------------- 3. signed in: a homeowner, a contractor, the team
const U = (n) => `0000000${n}-0000-4000-8000-00000000000${n}`;
const now = new Date().toISOString();
const people = [
  { n: 1, email: 'ho@example.com', role: 'homeowner', full_name: 'سارة العتيبي' },
  { n: 2, email: 'co@example.com', role: 'contractor', full_name: 'خالد', company: 'مؤسسة البناء المتقن' },
  { n: 3, email: 'admin@example.com', role: 'admin', full_name: 'فريق ترميم' },
];
let portfolioShown = false;
for (const person of people) {
  const label = person.role;
  const { context, db, page } = await newContext(label);
  for (const p of people) {
    db.users.push({ id: U(p.n), email: p.email, password: 'password-123', data: {}, created_at: now });
    db.profiles.push({ id: U(p.n), role: p.role, full_name: p.full_name, company: p.company || null, mobile: `050111222${p.n}`, city: 'riyadh', lang: 'ar', email: p.email, created_at: now });
  }
  db.applications.push({ company: 'مؤسسة البناء المتقن', person: 'خالد', mobile: '0501112222', email: 'co@example.com', city: 'riyadh', trades: ['kitchen'], cr_number: '1010101010', note: null, lang: 'ar', user_id: U(2), status: 'verified', created_at: now });
  const project = (n, status, extra = {}) => ({ id: `10000000-0000-4000-8000-00000000200${n}`, code: 'P-200' + n, owner_id: U(1), status, created_at: now, title: 'تجديد مطبخ وحمامين', trade: 'kitchen', description: 'مطبخ 4×5 م مع خزائن ألمنيوم وسطح رخام، وحمامين.', city: 'riyadh', district: 'العارض', budget_min: 40000, budget_max: 90000, timing: 'month', ...extra });
  db.projects.push(project(1, 'active', { contractor_id: U(2), amount: 64000 }), project(2, 'open'));
  db.bids.push({ id: '20000000-0000-4000-8000-000000000001', project_id: db.projects[0].id, contractor_id: U(2), price: 64000, days: 45, note: 'يشمل التوريد والتركيب.', details: { incl: 'خزائن', excl: 'الأجهزة', start: '2026-10-05', warranty: '12', valid: '14', ms: [30, 40, 30], vatReg: false, visit: true }, status: 'chosen', created_at: now });
  db.bids.push({ id: '20000000-0000-4000-8000-000000000002', project_id: db.projects[1].id, contractor_id: U(2), price: 30000, days: 20, note: null, details: {}, status: 'submitted', created_at: now });
  db.agreements.push({ project_id: db.projects[0].id, bid_id: db.bids[0].id, homeowner_id: U(1), contractor_id: U(2), amount: 64000, days: 45, homeowner_name: 'سارة العتيبي', homeowner_signed_at: now, contractor_name: 'مؤسسة البناء المتقن', contractor_signed_at: now });
  db.messages = [{ id: 1, project_id: db.projects[0].id, contractor_id: U(2), from_id: U(1), body: 'متى تبدأون؟', created_at: now, read_at: null }];
  db.files.push({ path: `${U(1)}/${db.projects[0].id}/k0-c2l0ZS1waG90bw.png`, type: 'image/png', created_at: now });
  db.portfolio.push({ path: `${U(2)}/pf-1.png`, created_at: now });
  db.contact.push({ name: 'نورة', email: null, mobile: '0555123456', topic: 'استفسار', message: 'هل تغطون الشرقية؟', lang: 'ar' });
  await page.goto(BASE_URL + 'signin', { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#au-email');
  await page.locator('#au-email').fill(person.email); await page.locator('#au-password').fill('password-123');
  await page.locator('form.authcard button[type="submit"]').click();
  await page.waitForTimeout(1200);
  await collect(page, `${label} /signin`);
  const projectTabs = async (p) => clickAll(p, 'main [role="tab"]');
  if (person.role === 'homeowner') {
    await visit(page, label, 'dashboard');
    await visit(page, label, 'project/P-2001', projectTabs);
    await visit(page, label, 'project/P-2002', async (p) => {
      await p.locator('[role="tab"][data-tab="bids"]').click(); await p.waitForTimeout(400);
      // the contractor's public profile, with a portfolio photo from storage (img-src)
      await p.locator('main [data-route="contractor"]').first().click(); await p.waitForTimeout(1500);
      portfolioShown = await p.evaluate(() => [...document.querySelectorAll('main img')].some((img) => img.src.includes('/storage/v1/object/public/portfolio/') && img.complete && img.naturalWidth > 0));
    });
    for (const path of ['settings', 'profile', 'post']) await visit(page, label, path);
  } else if (person.role === 'contractor') {
    for (const path of ['contractor', 'projects', 'settings']) await visit(page, label, path);
    await visit(page, label, 'project/P-2001', projectTabs);
    await visit(page, label, 'project/P-2002', projectTabs);
  } else {
    await visit(page, label, 'admin', async (p) => clickAll(p, '.side[data-tab]'));
    await visit(page, label, 'inbox', async (p) => { await p.locator('button', { hasText: 'عرض الصور والملفات' }).first().click(); await p.waitForTimeout(700); });
    await visit(page, label, 'project/P-2001', projectTabs);
  }
  if (person.role === 'homeowner') check('a portfolio photo was loaded from storage under the policy (img-src)', portfolioShown);
  await context.close();
}

await browser.close();
if (preview) preview.kill();

check(`every page the site served carried the header (${headerSeen} page loads)`, headerSeen >= 30, String(headerSeen));
check(`no Content-Security-Policy violation on ${views} page views and tabs`, !violations.length, violations.slice(0, 12).join('\n   '));
console.log(results.join('\n'));
console.log(errors.length ? '\n' + errors.join('\n') : '\nno page errors');
process.exit(results.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
