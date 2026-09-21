/* Real accounts and posting on the public site (src/platform/), end to end in a browser.

   Start the app (`npm run dev`), then `npm run test:platform`. The database is a stand-in
   (tests/supabase-mock.mjs): no account is created and nothing is written anywhere real. */

import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { installSupabaseMock } from './supabase-mock.mjs';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5173/').replace(/demo\/?$/, '');
const site = JSON.parse(readFileSync(new URL('../site.config.json', import.meta.url), 'utf8'));
if (!site.supabase) { console.log('site.config.json has no "supabase" entry: real accounts are off, nothing to test.'); process.exit(0); }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
await context.addInitScript(() => { window.__opened = []; window.open = (url) => { window.__opened.push(String(url)); return null; }; });
const db = await installSupabaseMock(context, site.supabase.url);
const page = await context.newPage();
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 300)));
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
const saved = async () => page.evaluate(() => JSON.parse(localStorage.getItem('tarmem-public-v1') || '{}'));
const pathname = async () => page.evaluate(() => window.location.pathname);
const open = async (path = '') => { await page.goto(BASE_URL + path, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('header'); await page.waitForTimeout(400); };
const settle = (ms = 500) => page.waitForTimeout(ms);

// A — signed out
await open();
check('guests see a sign-in link', (await page.locator('header [data-route="auth"]:not([data-signup])').count()) >= 1);
await open('dashboard');
check('the dashboard asks a signed-out visitor to sign in', (await pathname()) === '/signin' && (await page.locator('#au-email').count()) === 1, await pathname());
await page.evaluate(() => localStorage.setItem('tarmem-public-v1', JSON.stringify({ route: 'hdash', user: { role: 'homeowner', name: 'x', nafath: true }, projects: [{ id: 'P-1', ownerId: 'h1', title: { ar: 'x', en: 'x' }, bids: [], ms: [] }] })));
await open('dashboard');
check('a user written into saved state signs nobody in', (await pathname()) === '/signin' && !(await saved()).user && !((await saved()).projects || []).length);

// B — a guest fills the project form, then creates an account to publish it
await open('post');
await page.locator('input[name="title"]').fill('تجديد مطبخ، 20 م²');
await page.locator('textarea[name="desc"]').fill('تغيير الخزائن والرخام، المساحة 4×5 م.');
await page.locator('button', { hasText: 'التالي' }).first().click();
await page.locator('input[name="min"]').fill('40000');
await page.locator('input[name="max"]').fill('60000');
await page.locator('button', { hasText: 'التالي' }).first().click();
check('the photo step says uploads are on the way, and offers no picker', (await page.locator('.drop').count()) === 0 && (await page.locator('text=رفع الصور من الموقع').count()) === 1);
await page.locator('button', { hasText: 'التالي' }).first().click();
await settle(200);
const publish = page.locator('button', { hasText: 'نشر المشروع' }).first();
check('the last step publishes (no WhatsApp) and waits for the undertaking', await publish.isDisabled());
await page.locator('label.radio').first().click();
await publish.click();
await settle();
check('publishing as a guest opens sign-up, and says the project is kept', (await pathname()) === '/signin' && (await page.locator('#au-name').count()) === 1 && (await page.locator('text=مشروعك جاهز').count()) === 1);

const submit = page.locator('form.authcard button[type="submit"]');
await page.locator('#au-name').fill('سارة العتيبي');
await page.locator('#au-mobile').fill('٠٥٥ ١٢٣-٤٥٦٧');
await page.locator('#au-email').fill('not-an-email');
await page.locator('#au-password').fill('long-enough-1');
await submit.click();
check('a bad email is refused before anything is sent', (await page.locator('.autherr').count()) === 1 && db.users.length === 0);
await page.locator('#au-email').fill('Sara@Example.com');
await submit.click();
check('the terms must be accepted', (await page.locator('.autherr').innerText()).includes('الشروط') && db.users.length === 0);
await page.locator('form.authcard input[type="checkbox"]').check();
await submit.click();
await page.waitForFunction(() => window.location.pathname.startsWith('/project/'), null, { timeout: 8000 }).catch(() => undefined);
await settle();
const project = db.projects[0];
check('sign-up creates the account and the profile (mobile in Latin digits, never as admin)',
  db.users.length === 1 && db.users[0].email === 'sara@example.com' && db.profiles[0]?.role === 'homeowner' && db.profiles[0]?.mobile === '055 1234567' && db.profiles[0]?.full_name === 'سارة العتيبي',
  JSON.stringify(db.profiles[0] || null).slice(0, 160));
check('…and the project is saved with only the columns a homeowner may set',
  !!project && project.title === 'تجديد مطبخ، 20 م²' && project.budget_min === 40000 && project.budget_max === 60000 && project.timing === 'month' && db.refused.length === 0,
  db.refused.join('; ') || JSON.stringify(project || null).slice(0, 160));
check('…its page opens at its own address', (await pathname()) === '/project/P-2001' && (await page.locator('h1', { hasText: 'تجديد مطبخ، 20 م²' }).count()) === 1, await pathname());
check('…and nothing was sent to WhatsApp', (await page.evaluate(() => window.__opened.length)) === 0);
await page.locator('[role="tab"][data-tab="bids"]').click({ timeout: 3000 }).catch(() => undefined);
await settle(200);
check('the bids tab says what happens next instead of "no bids"', (await page.locator('text=استلمنا مشروعك').count()) === 1);

// C — the dashboard, and what is left out of it for now
await page.locator('header [data-route="hdash"]').first().click({ timeout: 3000 }).catch(() => undefined);
await settle(300);
check('the dashboard greets them by name and lists the project', (await pathname()) === '/dashboard' && (await page.locator('h1', { hasText: 'سارة العتيبي' }).count()) === 1 && (await page.locator('#hdash-projects tbody tr').count()) === 1);
await page.locator('button.acct').click();
await settle(200);
const menu = await page.locator('.acctmenu .acctitem').allInnerTexts();
check('no wallet, settings, profile or contractor search yet', menu.length === 1 && (await page.locator('[data-route="wallet"], [data-route="settings"], [data-route="contractors"]').count()) === 0, menu.join(' | '));
await page.keyboard.press('Escape');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('header'); await settle();
check('a reload keeps them signed in, on the dashboard, with their project', (await pathname()) === '/dashboard' && (await page.locator('#hdash-projects tbody tr').count()) === 1);
await open('signin');
check('the sign-in page sends a signed-in person to their dashboard', (await pathname()) === '/dashboard');
await open('project/P-9999');
check("somebody else's project number opens nothing", (await pathname()) === '/dashboard');

// D — withdraw, sign out, sign back in
await open('project/P-2001');
await page.locator('button', { hasText: 'سحب المشروع' }).first().click().catch(() => undefined);
await settle(200);
const confirm = page.locator('.card button.btn-p.btn-sm').first();
await confirm.click();
await settle();
check('withdrawing marks the project withdrawn in the database and leaves the dashboard empty',
  db.projects[0].status === 'withdrawn' && (await pathname()) === '/dashboard' && (await page.locator('#hdash-projects tbody tr').count()) === 0, db.projects[0].status);
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem').last().click();
await settle();
const after = await saved();
check('signing out returns home and leaves no account or projects on the device', (await pathname()) === '/' && !after.user && !(after.projects || []).length
  && (await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('tarmem-auth')).length)) === 0);
await open('signin');
await page.locator('#au-email').fill('sara@example.com');
await page.locator('#au-password').fill('wrong-password');
await submit.click();
await settle();
check('a wrong password is refused with a plain sentence', (await page.locator('.autherr').innerText()).includes('غير صحيحة') && (await pathname()) === '/signin');
await page.locator('#au-password').fill('long-enough-1');
await submit.click();
await settle(700);
check('the right one opens the dashboard', (await pathname()) === '/dashboard');

// D2 — the team inbox: nobody but an account marked admin in the database
check('a customer sees no inbox link, and /inbox sends them to their dashboard', (await page.locator('[data-route="inbox"]').count()) === 0
  && (await open('inbox'), (await pathname()) === '/dashboard'));
db.profiles[0].role = 'admin'; // what the owner does in the SQL editor
await open('dashboard');
await page.locator('[data-route="inbox"]').click();
await settle(700);
check('an admin gets a link to the inbox, which lists projects with the owner\'s contact details',
  (await pathname()) === '/inbox' && (await page.locator('main table').count()) === 3 && (await page.locator('main', { hasText: 'تجديد مطبخ، 20 م²' }).count()) === 1
    && (await page.locator('main a[href^="tel:"]').first().innerText()).includes('055'), await pathname());
db.profiles[0].role = 'homeowner';
await open('dashboard');
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem').last().click();
await settle();

// E — the two public forms are saved, not sent by WhatsApp
await open('contact');
await page.locator('input[name="name"]').fill('خالد');
await page.locator('input[name="phone"]').fill('0555123456');
await page.locator('textarea[name="msg"]').fill('هل تغطون جدة؟');
await page.locator('button', { hasText: 'إرسال الرسالة' }).click();
await settle();
check('the contact form is saved for the team and confirms it', db.contact.length === 1 && db.contact[0].message === 'هل تغطون جدة؟' && db.contact[0].mobile === '0555123456'
  && (await page.locator('text=وصلتنا رسالتك').count()) === 1 && (await page.evaluate(() => window.__opened.length)) === 0, JSON.stringify(db.contact[0] || null).slice(0, 140));
await open('join');
await page.locator('#join-company').fill('مؤسسة البناء المتقن');
await page.locator('#join-person').fill('خالد العتيبي');
await page.locator('button.tchip').first().click();
await page.locator('button', { hasText: 'إرسال الطلب' }).click();
await settle(200);
check('a contractor application needs a mobile number', db.applications.length === 0 && (await page.locator('[role="alert"]').count()) === 1);
await page.locator('#join-mobile').fill('0501112223');
await page.locator('button', { hasText: 'إرسال الطلب' }).click();
await settle();
check('…then it is saved, and the next page says the team will be in touch', db.applications.length === 1 && db.applications[0].company === 'مؤسسة البناء المتقن' && db.applications[0].trades.length === 1
  && (await page.locator('text=وصلنا طلبك').count()) === 1 && (await page.evaluate(() => window.__opened.length)) === 0, JSON.stringify(db.applications[0] || null).slice(0, 140));

check('the site asked the database for nothing the test does not know about', db.unknown.length === 0, db.unknown.join(' · '));
console.log(results.join('\n'));
console.log(errors.length ? '\n' + errors.join('\n') : '\nno page errors');
await browser.close();
if (results.some((r) => r.startsWith('FAIL')) || errors.length) process.exit(1);
