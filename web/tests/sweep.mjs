/* A phone-screen sweep of the signed-in pages: every page a customer, a contractor or the team can reach, in Arabic and
   English, at 360 and 390 px. It fails on a page error, a page wider than the screen, or an empty page. The database is
   the stand-in (tests/supabase-mock.mjs), seeded with one of everything.   npm run dev, then: node tests/sweep.mjs */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { installSupabaseMock } from './supabase-mock.mjs';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5173/').replace(/demo\/?$/, '');
const site = JSON.parse(readFileSync(new URL('../site.config.json', import.meta.url), 'utf8'));
const browser = await chromium.launch();
const problems = []; let pages = 0;
const U = (n) => `00000000-0000-4000-8000-00000000000${n}`;
const now = new Date().toISOString();
const people = [
  { id: U(1), email: 'ho@example.com', role: 'homeowner', full_name: 'سارة عبدالرحمن العتيبي', paths: ['dashboard', 'project/P-2001', 'post', 'signin'] },
  { id: U(2), email: 'co@example.com', role: 'contractor', full_name: 'خالد', company: 'مؤسسة البناء المتقن للمقاولات العامة', paths: ['contractor', 'projects', 'project/P-2001', 'project/P-2002'] },
  { id: U(3), email: 'admin@example.com', role: 'admin', full_name: 'إياد', paths: ['admin', 'inbox'] },
];
for (const width of [360, 390]) for (const lang of ['ar', 'en']) for (const person of people) {
  const context = await browser.newContext({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true });
  const db = await installSupabaseMock(context, site.supabase.url);
  for (const p of people) { db.users.push({ id: p.id, email: p.email, password: 'password-123', data: {}, created_at: now }); db.profiles.push({ id: p.id, role: p.role, full_name: p.full_name, company: p.company || null, mobile: '0501112223', city: 'riyadh', lang, email: p.email, created_at: now }); }
  db.applications.push({ company: people[1].company, person: 'خالد', mobile: '0501112223', email: 'co@example.com', city: 'riyadh', trades: ['kitchen', 'bathroom'], cr_number: '1010101010', note: null, lang, user_id: U(2), status: 'verified' });
  const project = (n, status, extra = {}) => ({ id: `10000000-0000-4000-8000-00000000200${n}`, code: 'P-200' + n, owner_id: U(1), status, created_at: now, title: 'تجديد مطبخ وحمامين في فيلا بحي العارض، مع تغيير الأرضيات', trade: 'kitchen', description: 'مطبخ 4×5 م مع خزائن ألمنيوم وسطح رخام، وحمامين رئيسيين.', city: 'riyadh', district: 'العارض', budget_min: 40000, budget_max: 90000, timing: 'month', ...extra });
  db.projects.push(project(1, 'active', { contractor_id: U(2), amount: 64000 }), project(2, 'open'));
  db.bids.push({ id: '20000000-0000-4000-8000-000000000001', project_id: db.projects[0].id, contractor_id: U(2), price: 64000, days: 45, note: 'يشمل التوريد والتركيب والضمان.', details: { incl: 'خزائن، رخام، سباكة', excl: 'الأجهزة', brands: 'جروهي', start: '2026-10-05', warranty: '12', valid: '14', ms: [30, 40, 30], vatReg: true, visit: true }, status: 'chosen', created_at: now });
  db.agreements.push({ project_id: db.projects[0].id, bid_id: db.bids[0].id, homeowner_id: U(1), contractor_id: U(2), amount: 64000, days: 45, homeowner_name: people[0].full_name, homeowner_signed_at: now, contractor_name: people[1].company, contractor_signed_at: now });
  db.contact.push({ name: 'نورة', email: null, mobile: '0555123456', topic: 'استفسار', message: 'هل تغطون المنطقة الشرقية؟ وما مدة التنفيذ المعتادة لمطبخ متوسط؟', lang });
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`${person.role} ${lang} ${width}: PAGE ERROR ${String(e).slice(0, 140)}`));
  await page.goto(BASE_URL + 'signin', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('header');
  if (lang === 'en') { await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('tarmem-public-v1') || '{}'); s.lang = 'en'; localStorage.setItem('tarmem-public-v1', JSON.stringify(s)); }); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('header'); }
  await page.locator('#au-email').fill(person.email); await page.locator('#au-password').fill('password-123');
  await page.locator('form.authcard button[type="submit"]').click();
  await page.waitForTimeout(900);
  for (const path of person.paths) {
    if (path === 'signin') continue;
    await page.goto(BASE_URL + path, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header'); await page.waitForTimeout(700);
    const tabs = path.startsWith('project/') ? await page.locator('[role="tab"]').count() : path === 'admin' ? await page.locator('.side[data-tab]').count() : 1;
    for (let t = 0; t < tabs; t += 1) {
      if (tabs > 1) { await page.locator(path === 'admin' ? '.side[data-tab]' : '[role="tab"]').nth(t).click(); await page.waitForTimeout(250); }
      pages += 1;
      const seen = await page.evaluate(() => ({ wide: document.documentElement.scrollWidth - window.innerWidth, text: document.querySelector('main')?.innerText.trim().length || 0,
        worst: [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1 && !el.closest('[style*="overflow-x"], .table, table, [role="tablist"]')).slice(0, 2).map((el) => el.tagName + '.' + String(el.className).slice(0, 30)) }));
      if (seen.wide > 1) problems.push(`${person.role} ${lang} ${width} /${path} tab ${t}: ${seen.wide}px wider than the screen (${seen.worst.join(', ')})`);
      if (seen.text < 40) problems.push(`${person.role} ${lang} ${width} /${path} tab ${t}: nearly empty page`);
    }
  }
  if (db.unknown.length) problems.push(`${person.role}: unknown requests ${db.unknown.slice(0, 2).join(' · ')}`);
  await context.close();
}
console.log(`${pages} page views checked.`);
console.log(problems.length ? problems.join('\n') : 'no problems found');
await browser.close();
process.exit(problems.length ? 1 : 0);
