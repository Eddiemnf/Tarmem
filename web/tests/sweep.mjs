/* A phone-screen sweep: every public page, and every signed-in page a customer, a contractor or the team can reach, in
   Arabic and English, at 320, 360 and 390 px. Width is measured against the layout viewport (clientWidth): a phone
   zooms out to fit an overflowing page, which makes innerWidth grow with it. It fails on a page error, a page wider than the screen, or an empty page. The database is
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
  { id: U(1), email: 'ho@example.com', role: 'homeowner', full_name: 'سارة عبدالرحمن العتيبي', paths: ['dashboard', 'project/P-2001', 'project/P-2003', 'post', 'signin'] },
  { id: U(2), email: 'co@example.com', role: 'contractor', full_name: 'خالد', company: 'مؤسسة البناء المتقن للمقاولات العامة', paths: ['contractor', 'projects', 'project/P-2001', 'project/P-2002', 'project/P-2003'] },
  { id: U(3), email: 'admin@example.com', role: 'admin', full_name: 'إياد', paths: ['admin', 'inbox', 'project/P-2001'] },
];
const overflowOf = () => ({ wide: document.documentElement.scrollWidth - document.documentElement.clientWidth, text: document.querySelector('main')?.innerText.trim().length || 0,
  // the header's menu button and language switch must stay on the screen (a long name once pushed them off)
  offscreen: [...document.querySelectorAll('header .burger, header .langbtn')].filter((el) => el.offsetParent && (() => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > document.documentElement.clientWidth + 1); })()).map((el) => el.className),
  worst: [...document.querySelectorAll('main *, footer *')].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && !el.closest('[style*="overflow-x"], .table, table, [role="tablist"]')).slice(0, 2).map((el) => el.tagName + '.' + String(el.className).slice(0, 30)),
  // a project's tabs are all in sight (they wrap on a phone), and a dashboard row's status pill is never cut
  hiddenTabs: [...document.querySelectorAll('main [role="tab"]')].filter((el) => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > document.documentElement.clientWidth + 1; }).map((el) => el.dataset.tab),
  // (the team's console too: a row's status, its buttons, and the controls on a project, supabase/030)
  // (and the bids: a bid's verified tag, and the homeowner's Accept button, on an open project with two bids)
  cutTags: [...document.querySelectorAll('#hdash-projects .tag, #cdash-work .tag, main .adm-t .tag, main .adm-t .btn, main .admin-controls .btn, main .inbox-table a, main .bids-card .tag, main .bids-card .btn')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > document.documentElement.clientWidth + 1); }).map((el) => el.textContent.trim()),
  // a table that fits (three columns or fewer: the files list, key-value tables) fills its card, not half of it
  shrunk: [...document.querySelectorAll('main .card > table.table')].filter((t) => t.offsetParent && !t.querySelector(':scope > thead > tr > :nth-child(4)') && (() => { const cs = getComputedStyle(t.parentElement); const inner = t.parentElement.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return t.getBoundingClientRect().width < inner * 0.95; })()).map((t) => (t.querySelector('th, td')?.textContent || '').trim().slice(0, 20)) });
// signed out: the pages every visitor sees
for (const width of [320, 360, 390]) for (const lang of ['ar', 'en']) {
  const context = await browser.newContext({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true });
  await installSupabaseMock(context, site.supabase.url);
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`visitor ${lang} ${width}: PAGE ERROR ${String(e).slice(0, 140)}`));
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('header');
  if (lang === 'en') { await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('tarmem-public-v1') || '{}'); s.lang = 'en'; localStorage.setItem('tarmem-public-v1', JSON.stringify(s)); }); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('header'); }
  for (const path of ['', 'how', 'pricing', 'about', 'faq', 'help', 'contact', 'rules', 'terms', 'privacy', 'post', 'join', 'signin']) {
    await page.goto(BASE_URL + path, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('header'); await page.waitForTimeout(600);
    pages += 1;
    const seen = await page.evaluate(overflowOf);
    if (seen.wide > 1) problems.push(`visitor ${lang} ${width} /${path}: ${seen.wide}px wider than the screen (${seen.worst.join(', ')})`);
    if (seen.offscreen.length) problems.push(`visitor ${lang} ${width} /${path}: header controls off the screen (${seen.offscreen.join(', ')})`);
    if (seen.text < 40) problems.push(`visitor ${lang} ${width} /${path}: nearly empty page`);
  }
  await context.close();
}
for (const width of [320, 360, 390]) for (const lang of ['ar', 'en']) for (const person of people) {
  const context = await browser.newContext({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true });
  const db = await installSupabaseMock(context, site.supabase.url);
  for (const p of people) { db.users.push({ id: p.id, email: p.email, password: 'password-123', data: {}, created_at: now }); db.profiles.push({ id: p.id, role: p.role, full_name: p.full_name, company: p.company || null, mobile: '0501112223', city: 'riyadh', lang, email: p.email, created_at: now }); }
  db.applications.push({ company: people[1].company, person: 'خالد', mobile: '0501112223', email: 'co@example.com', city: 'riyadh', trades: ['kitchen', 'bathroom'], cr_number: '1010101010', note: null, lang, user_id: U(2), status: 'verified' });
  const project = (n, status, extra = {}) => ({ id: `10000000-0000-4000-8000-00000000200${n}`, code: 'P-200' + n, owner_id: U(1), status, created_at: now, title: 'تجديد مطبخ وحمامين في فيلا بحي العارض، مع تغيير الأرضيات', trade: 'kitchen', description: 'مطبخ 4×5 م مع خزائن ألمنيوم وسطح رخام، وحمامين رئيسيين. المخطط: https://drive.example.com/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-kitchen-and-two-bathrooms-plan-v3', city: 'riyadh', district: 'العارض', budget_min: 40000, budget_max: 90000, timing: 'month', ...extra });
  db.projects.push(project(1, 'active', { contractor_id: U(2), amount: 64000 }), project(2, 'open'), project(3, 'open'));
  // a second verified contractor, so the open project P-2003 has two bids to compare
  db.users.push({ id: U(4), email: 'co2@example.com', password: 'password-123', data: {}, created_at: now });
  db.profiles.push({ id: U(4), role: 'contractor', full_name: 'فهد', company: 'مؤسسة الإتقان للمقاولات والتشطيبات الداخلية', mobile: '0501112224', city: 'riyadh', lang, email: 'co2@example.com', created_at: now });
  db.applications.push({ company: 'مؤسسة الإتقان للمقاولات والتشطيبات الداخلية', person: 'فهد', mobile: '0501112224', email: 'co2@example.com', city: 'riyadh', trades: ['kitchen'], cr_number: null, note: null, lang, user_id: U(4), status: 'verified' });
  db.bids.push({ id: '20000000-0000-4000-8000-000000000001', project_id: db.projects[0].id, contractor_id: U(2), price: 64000, days: 45, note: 'يشمل التوريد والتركيب والضمان.', details: { incl: 'خزائن، رخام، سباكة', excl: 'الأجهزة', brands: 'جروهي', start: '2026-10-05', warranty: '12', valid: '14', ms: [30, 40, 30], vatReg: true, visit: true }, status: 'chosen', created_at: now });
  for (const [n, co, price, days, note] of [[2, U(2), 58500, 40, 'يشمل الخزائن والرخام والسباكة والكهرباء، ولا يشمل الأجهزة. ضمان سنة على التركيب.'], [3, U(4), 61000, 35, 'تنفيذ كامل مع التوريد، والضمان سنتان على العزل.']]) {
    db.bids.push({ id: `20000000-0000-4000-8000-00000000000${n}`, project_id: db.projects[2].id, contractor_id: co, price, days, note, details: { ms: [30, 40, 30] }, status: 'submitted', created_at: now });
  }
  db.agreements.push({ project_id: db.projects[0].id, bid_id: db.bids[0].id, homeowner_id: U(1), contractor_id: U(2), amount: 64000, days: 45, homeowner_name: people[0].full_name, homeowner_signed_at: now, contractor_name: people[1].company, contractor_signed_at: now });
  // a message with a long link in it (the site masks links; the rest of the words must still wrap)
  db.messages = [{ id: 1, project_id: db.projects[0].id, contractor_id: U(2), from_id: U(1), body: 'التفاصيل هنا: https://drive.example.com/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789 و AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', created_at: now, read_at: null }];
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
      const seen = await page.evaluate(overflowOf);
      if (seen.offscreen.length) problems.push(`${person.role} ${lang} ${width} /${path}: header controls off the screen (${seen.offscreen.join(', ')})`);
      if (seen.wide > 1) problems.push(`${person.role} ${lang} ${width} /${path} tab ${t}: ${seen.wide}px wider than the screen (${seen.worst.join(', ')})`);
      if (seen.text < 40) problems.push(`${person.role} ${lang} ${width} /${path} tab ${t}: nearly empty page`);
      if (seen.hiddenTabs.length) problems.push(`${person.role} ${lang} ${width} /${path}: tabs out of sight (${seen.hiddenTabs.join(', ')})`);
      if (seen.cutTags.length) problems.push(`${person.role} ${lang} ${width} /${path}: status pill cut (${seen.cutTags.join(', ')})`);
      if (seen.shrunk.length) problems.push(`${person.role} ${lang} ${width} /${path} tab ${t}: a table narrower than its card (${seen.shrunk.join(', ')})`);
    }
  }
  if (db.unknown.length) problems.push(`${person.role}: unknown requests ${db.unknown.slice(0, 2).join(' · ')}`);
  await context.close();
}
console.log(`${pages} page views checked.`);
console.log(problems.length ? problems.join('\n') : 'no problems found');
await browser.close();
process.exit(problems.length ? 1 : 0);
