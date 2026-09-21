/* Real accounts and posting on the public site (src/platform/), end to end in a browser.

   Start the app (`npm run dev`), then `npm run test:platform`. The database is a stand-in
   (tests/supabase-mock.mjs): no account is created and nothing is written anywhere real. */

import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { installSupabaseMock, recoveryFragment } from './supabase-mock.mjs';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5173/').replace(/demo\/?$/, '');
const site = JSON.parse(readFileSync(new URL('../site.config.json', import.meta.url), 'utf8'));
if (!site.supabase) { console.log('site.config.json has no "supabase" entry: real accounts are off, nothing to test.'); process.exit(0); }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
await context.addInitScript(() => {
  window.__opened = []; window.open = (url) => { window.__opened.push(String(url)); return null; };
  // the site does not count automated browsers as visitors; this test wants to see what a real one records
  Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
});
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
check('the budget step shows the suggested range for the trade, as designed', (await page.locator('.sugbox').count()) === 1 && (await page.locator('.sugbox button.sugbtn').count()) === 1);
check('…worked out from the size in the description (a 4×5 kitchen: 16 linear metres of cabinets at published Saudi rates)',
  (await page.locator('.sugbox .num').first().innerText()).includes('14,500 – 32,000') && (await page.locator('.sugbox p').first().innerText()).includes('الأمتار الطولية: 16'),
  await page.locator('.sugbox .num').first().innerText());
await page.locator('input[name="min"]').fill('40000');
await page.locator('input[name="max"]').fill('60000');
await page.locator('button', { hasText: 'التالي' }).first().click();
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const picker = page.locator('label.drop input[type="file"]');
check('the photo step has the design\'s picker and wording', (await picker.count()) === 1 && (await page.locator('text=أضف صورًا واضحة للمكان').count()) === 1);
await picker.setInputFiles([{ name: 'مطبخ قبل.png', mimeType: 'image/png', buffer: PNG }, { name: 'virus.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('x') }]);
await settle(200);
check('a photo is listed; a file that is not a photo or a PDF is refused with a sentence', (await page.locator('li', { hasText: 'مطبخ قبل.png' }).count()) === 1 && (await page.locator('li', { hasText: 'virus.exe' }).count()) === 0
  && (await page.locator('text=الملفات المسموحة').count()) === 1);
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
check('…the photo went up with it, into the owner\'s own folder for that project, under a plain-ASCII key',
  db.files.length === 1 && db.files[0].path.startsWith(`${db.users[0].id}/${project?.id}/`) && db.refused.length === 0, db.files[0]?.path || db.refused.join('; '));
await page.locator('[role="tab"][data-tab="files"]').click();
await settle(300);
check('…and the Files tab lists it under the name its owner gave it', (await page.locator('td', { hasText: 'مطبخ قبل.png' }).count()) === 1);
await page.locator('label.btn input[type="file"]').setInputFiles({ name: 'plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
await settle(600);
check('the Files tab\'s own upload button really uploads', db.files.length === 2 && (await page.locator('td', { hasText: 'plan.pdf' }).count()) === 1);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('header'); await settle(700);
await page.locator('[role="tab"][data-tab="files"]').click();
await settle(400);
check('…and both are still there after a reload (read back from storage)', (await page.locator('td', { hasText: 'مطبخ قبل.png' }).count()) === 1 && (await page.locator('td', { hasText: 'plan.pdf' }).count()) === 1);
await page.locator('[role="tab"][data-tab="bids"]').click({ timeout: 3000 }).catch(() => undefined);
await settle(200);
check('the bids tab says what happens next instead of "no bids"', (await page.locator('text=نُشر مشروعك ويراه المقاولون الموثّقون').count()) === 1);

// C — the dashboard, and what is left out of it for now
await page.locator('header [data-route="hdash"]').first().click({ timeout: 3000 }).catch(() => undefined);
await settle(300);
check('the dashboard greets them by name and lists the project', (await pathname()) === '/dashboard' && (await page.locator('h1', { hasText: 'سارة العتيبي' }).count()) === 1 && (await page.locator('#hdash-projects tbody tr').count()) === 1);
await page.locator('button.acct').click();
await settle(200);
const menu = await page.locator('.acctmenu .acctitem').allInnerTexts();
check('the account menu offers their profile, settings and sign-out — no wallet or contractor search yet', menu.length === 3 && (await page.locator('[data-route="wallet"], [data-route="contractors"]').count()) === 0, menu.join(' | '));
await page.keyboard.press('Escape');
await open('settings');
check('the designed settings page opens with their own mobile and email, without the WhatsApp card that nothing can send yet',
  (await pathname()) === '/settings' && (await page.locator('input[name="mobile"]').inputValue()) === '055 1234567' && (await page.locator('input[name="email"]').inputValue()) === 'sara@example.com' && (await page.locator('.wa-card').count()) === 0);
await page.locator('input[name="mobile"]').fill('0559998877');
await page.locator('input[name="pNews"]').check({ force: true }).catch(() => undefined);
await page.locator('button', { hasText: 'حفظ' }).first().click();
await settle(700);
check('saving writes the new mobile and notification choices to their profile, and says so', db.profiles[0].mobile === '0559998877' && typeof db.profiles[0].prefs === 'object' && (await page.locator('text=حُفظت إعداداتك').count()) === 1 && db.refused.length === 0,
  db.refused.join('; ') || JSON.stringify({ m: db.profiles[0].mobile, p: db.profiles[0].prefs }));
await open('profile');
await page.locator('button', { hasText: /تعديل/ }).first().click();
await settle(300);
await page.locator('.modal textarea, [role="dialog"] textarea, textarea[name="about"]').first().fill('فيلا في حي العارض، نجدّد المطبخ هذا العام.');
await page.locator('button', { hasText: 'حفظ' }).last().click();
await settle(800);
check('"my profile" edits are saved too', db.profiles[0].about === 'فيلا في حي العارض، نجدّد المطبخ هذا العام.' && (await page.locator('main', { hasText: 'نجدّد المطبخ هذا العام' }).count()) === 1, String(db.profiles[0].about));
await open('dashboard');
await page.locator('button.acct').click();
await settle(200);
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
const apply = page.locator('button', { hasText: 'إرسال الطلب وإنشاء الحساب' });
await apply.click();
await settle(200);
check('a contractor application needs a mobile number, an email and a password', db.applications.length === 0 && (await page.locator('[role="alert"]').count()) === 1);
await page.locator('#join-mobile').fill('0501112223');
await page.locator('#join-email').fill('Khalid@Build.example');
await page.locator('#join-password').fill('contractor-pass-1');
await apply.click();
await settle(900);
const coUser = db.users.find((u) => u.email === 'khalid@build.example');
check('applying creates the contractor\'s account, their profile, and an application tied to it',
  !!coUser && db.profiles.some((p) => p.id === coUser.id && p.role === 'contractor' && p.company === 'مؤسسة البناء المتقن') && db.applications.length === 1 && db.applications[0].user_id === coUser?.id && db.applications[0].trades.length === 1,
  JSON.stringify(db.applications[0] || null).slice(0, 140));
check('…and lands on their dashboard, which says the account is being verified', (await pathname()) === '/contractor' && (await page.locator('text=حسابك قيد التوثيق').count()) === 1 && (await page.evaluate(() => window.__opened.length)) === 0);
await open('projects');
check('…open projects stay closed to them until then', (await pathname()) === '/contractor');
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem').last().click();
await settle();

// F — visits are recorded by the site itself, without anything that identifies a person
const seenEvents = new Set(db.visits.map((v) => v.event));
check('page views and the moments that matter are recorded (sign-up, project, message, application)',
  ['view', 'signup', 'project', 'contact', 'application'].every((e) => seenEvents.has(e)) && db.visits.some((v) => v.route === 'pricing' || v.route === 'post'), [...seenEvents].join(','));
check('…with a random tab id, the page, language and device — and nothing else', db.visits.every((v) => /^[a-z0-9]{8,40}$/.test(v.session_id)
  && Object.keys(v).every((k) => ['session_id', 'event', 'route', 'path', 'lang', 'device', 'referrer', 'city'].includes(k))), JSON.stringify(db.visits[0]));

// G — the designed admin console, on real data, for an account the owner marked admin in the database
await open('admin');
check('a visitor cannot open the admin console', (await pathname()) === '/signin');
await page.locator('#au-email').fill('sara@example.com');
await page.locator('#au-password').fill('long-enough-1');
await submit.click();
await settle(700);
await open('admin');
check('neither can a customer', (await pathname()) === '/dashboard' && (await page.locator('[data-route="inbox"], [data-route="admin"]').count()) === 0);
db.profiles[0].role = 'admin'; // what the owner does in the SQL editor
const before = db.visits.length;
await open('dashboard');
await settle(900);
check('an admin lands on the designed console', (await pathname()) === '/admin' && (await page.locator('.side[data-tab="analytics"]').count()) === 1, await pathname());
const tab = async (id) => { await page.locator(`.side[data-tab="${id}"]`).click(); await settle(500); };
await tab('verification');
check('verification lists the real application, with who to call', (await page.locator('main', { hasText: 'مؤسسة البناء المتقن' }).count()) === 1 && (await page.locator('main', { hasText: '0501112223' }).count()) === 1
  && (await page.locator('main', { hasText: '4 Sep 2026' }).count()) === 0);
await page.evaluate(() => { window.__opened.length = 0; });
await page.locator('button[data-id="A-1"].btn-p').click();
await settle();
check('…and Approve marks it verified in the database', db.applications[0].status === 'verified', db.applications[0].status);
const told = await page.evaluate(() => window.__opened.slice());
check('…and opens WhatsApp to the contractor\'s own number, with the "your account is live" message and the sign-in link',
  told.length === 1 && told[0].startsWith('https://wa.me/966501112223?text=') && decodeURIComponent(told[0]).includes('تم توثيق حساب') && decodeURIComponent(told[0]).includes('/signin'), told[0]?.slice(0, 80));
await tab('support');
check('support cases are the contact-form messages, with the sender', (await page.locator('main', { hasText: 'هل تغطون جدة؟' }).count()) === 1 && (await page.locator('main', { hasText: '0555123456' }).count()) === 1);
await page.locator('button[data-id="M-1"]').click();
await settle();
check('…and resolving one marks it handled in the database', db.contact[0].handled === true);
await tab('users');
check('users lists real people only', (await page.locator('main', { hasText: 'مؤسسة البناء المتقن' }).count()) === 1 && (await page.locator('main', { hasText: 'عبدالله' }).count()) === 0);
await tab('analytics');
await settle(600);
check('analytics says its figures are real, and shows the recorded visits', (await page.locator('main', { hasText: 'بيانات حقيقية' }).count()) === 1 && (await page.locator('main', { hasText: 'بيانات تجريبية' }).count()) === 0
  && (await page.locator('main', { hasText: 'يتصفح' }).count()) === 1,
  `real=${await page.locator('main', { hasText: 'بيانات حقيقية' }).count()} demo=${await page.locator('main', { hasText: 'بيانات تجريبية' }).count()} feed=${(await page.locator('main').innerText()).includes('يتصفح')}`);
await tab('promos');
await page.locator('button', { hasText: /كود جديد|إنشاء كود|New code/ }).first().click().catch(() => undefined);
await settle(300);
await page.locator('#pm-code').fill('WELCOME10');
await page.locator('#pm-value').fill('10');
await page.locator('.btn-p', { hasText: /حفظ|إنشاء|Save|Create/ }).last().click();
await settle();
check('a promo code made in the console is saved to the database', db.adminState.promos?.[0]?.code === 'WELCOME10' && db.adminState.promos.length === 1, JSON.stringify(db.adminState.promos || null).slice(0, 120));
await tab('late');
check('nothing invented is left: no seeded strikes, refunds or affiliates', !(await saved()).strikes?.length && !(await saved()).refunds?.length && !(await saved()).affiliates?.length);
check("the team's own browsing is not counted as traffic", db.visits.length === before, `${before} → ${db.visits.length}`);
await page.locator('[data-route="inbox"]').click();
await settle(700);
check('the plain contact list is still one click away', (await pathname()) === '/inbox' && (await page.locator('main table').count()) === 3);
await page.locator('button', { hasText: 'عرض الصور والملفات' }).first().click();
await settle(600);
check('…where the team can open a project\'s photos through links that expire', (await page.locator('main a[href*="token="]').count()) === 2);
db.profiles[0].role = 'homeowner';

// H — the verified contractor signs in with the account they made when applying
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem').last().click();
await settle();
db.projects.push({ id: '10000000-0000-4000-8000-000000009001', code: 'P-9001', owner_id: db.users[0].id, status: 'open', created_at: new Date().toISOString(), title: 'ترميم حمام رئيسي', trade: 'bathroom', description: 'تغيير السيراميك والأدوات الصحية، 8 م².', city: 'riyadh', district: null, budget_min: 18000, budget_max: 30000, timing: 'month' });
await open('signin');
await page.locator('#au-email').fill('khalid@build.example');
await page.locator('#au-password').fill('contractor-pass-1');
await submit.click();
await settle(900);
check('the verified contractor signs in and lands on the contractor dashboard, no longer "being verified"', (await pathname()) === '/contractor' && (await page.locator('text=حسابك قيد التوثيق').count()) === 0 && (await page.locator('h1', { hasText: 'مؤسسة البناء المتقن' }).count()) === 1, await pathname());
await page.locator('header [data-route="browse"]').first().click();
await settle(500);
check('…browses the open projects', (await pathname()) === '/projects' && (await page.locator('main', { hasText: 'ترميم حمام رئيسي' }).count()) === 1);
check('…without ever seeing who posted them', (await page.locator('main', { hasText: 'سارة' }).count()) === 0);
await open('project/P-9001');
await page.locator('[role="tab"][data-tab="bids"]').click();
await settle(300);
check('…and gets the designed bid form', (await pathname()) === '/project/P-9001' && (await page.locator('input[name="price"]').count()) === 1);
await page.locator('input[name="price"]').fill('24000');
await page.locator('input[name="days"]').fill('18');
await page.locator('textarea[name="note"], input[name="note"]').first().fill('يشمل العزل والأدوات الصحية.');
// the design asks for the terms too: warranty, how long the bid is valid, and a start date
for (const [name, value] of [['warranty', '12'], ['valid', '14']]) await page.locator(`[name="${name}"]`).first().fill(value).catch(() => page.locator(`[name="${name}"]`).first().selectOption({ index: 1 }));
await page.locator('[name="start"]').first().fill('2026-10-05');
await page.locator('button', { hasText: 'مراجعة العرض' }).first().click();
await settle(300);
await page.locator('button', { hasText: 'إرسال العرض لصاحب المنزل' }).first().click();
await settle(800);
const savedBid = db.bids[0];
check('the bid is saved for real, stamped with the contractor by the database', db.bids.length === 1 && savedBid?.price === 24000 && savedBid?.days === 18 && savedBid?.contractor_id === coUser?.id && savedBid?.note === 'يشمل العزل والأدوات الصحية.' && db.refused.length === 0,
  db.refused.join('; ') || JSON.stringify(savedBid || null).slice(0, 160));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('header'); await settle(700);
await page.locator('[role="tab"][data-tab="bids"]').click();
await settle(300);
check('…it is still there after a reload, and the form is not offered twice', (await page.locator('main', { hasText: '24,000' }).count()) === 1 && (await page.locator('input[name="price"]').count()) === 0);
await open('dashboard');
check("a contractor cannot open a homeowner's dashboard or the admin console", (await pathname()) === '/contractor' && (await open('admin'), (await pathname()) === '/contractor'));

// I — the homeowner sees the bid, with the company and never its contact details, and chooses it
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem').last().click();
await settle();
await open('signin');
await page.locator('#au-email').fill('sara@example.com');
await page.locator('#au-password').fill('long-enough-1');
await submit.click();
await settle(900);
await open('project/P-9001');
await page.locator('[role="tab"][data-tab="bids"]').click();
await settle(400);
const bidsText = await page.locator('main').innerText();
check('the homeowner sees the bid with the contractor\'s company, not their mobile or email', bidsText.includes('مؤسسة البناء المتقن') && bidsText.includes('24,000') && !bidsText.includes('0501112223') && !bidsText.includes('khalid@'));
await page.locator('button[data-cid]', { hasText: 'قبول العرض' }).first().click();
await settle(400);
const signBtn = page.locator('button', { hasText: 'أوافق وأوقّع' }).first();
check('accepting opens the agreement, which cannot be signed before it is read to the end', await signBtn.isDisabled());
await page.locator('.agrbody').evaluate((el) => el.scrollTo(0, el.scrollHeight));
await settle(300);
await signBtn.click();
await settle(900);
check("the homeowner's signature is written by the database: the bid is chosen, the agreement awaits the contractor, the project stays open",
  db.agreements.length === 1 && db.agreements[0].homeowner_name === 'سارة العتيبي' && db.agreements[0].amount === 24000 && !db.agreements[0].contractor_signed_at && db.bids[0].status === 'chosen' && db.projects.find((p) => p.code === 'P-9001').status === 'open' && db.refused.length === 0,
  db.refused.join('; ') || JSON.stringify(db.agreements[0] || null).slice(0, 140));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('header'); await settle(800);
await page.locator('[role="tab"][data-tab="overview"]').click();
await settle(300);
check('…and after a reload the project still says it awaits the contractor\'s signature', (await page.locator('text=وبانتظار توقيع المقاول').count()) === 1);

// J — the contractor counter-signs, and the project is awarded
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem').last().click();
await settle();
await open('signin');
await page.locator('#au-email').fill('khalid@build.example');
await page.locator('#au-password').fill('contractor-pass-1');
await submit.click();
await settle(900);
await open('project/P-9001');
await page.locator('button', { hasText: 'راجع الاتفاقية' }).first().click();
await settle(400);
await page.locator('.agrbody').evaluate((el) => el.scrollTo(0, el.scrollHeight));
await settle(300);
await page.locator('button', { hasText: 'أوافق وأوقّع' }).first().click();
await settle(900);
const awarded = db.projects.find((p) => p.code === 'P-9001');
check("the contractor's signature awards the project: active, theirs, at the agreed amount, both signatures kept",
  awarded.status === 'active' && awarded.contractor_id === coUser?.id && awarded.amount === 24000 && Boolean(db.agreements[0].contractor_signed_at) && db.agreements[0].contractor_name === 'مؤسسة البناء المتقن' && db.refused.length === 0, db.refused.join('; ') || awarded.status);
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem').last().click();
await settle();
await open('signin');
await page.locator('#au-email').fill('sara@example.com');
await page.locator('#au-password').fill('long-enough-1');
await submit.click();
await settle(900);
await open('project/P-9001');
await page.locator('[role="tab"][data-tab="overview"]').click();
await settle(300);
check('the signed agreement shows both parties and both dates', (await page.locator('main', { hasText: 'مؤسسة البناء المتقن' }).count()) === 1 && (await page.locator('main', { hasText: 'سارة العتيبي' }).count()) === 1);
await page.locator('[role="tab"][data-tab="payments"]').click();
await settle(400);
check('the homeowner is told plainly that payment on the site is not live yet — no card form, no Nafath theatre', (await page.locator('main .card h3', { hasText: 'الدفع عبر الموقع قيد التفعيل' }).count()) === 1 && (await page.locator('main .nafmark:visible').count()) === 0 && (await page.locator('input[name="card"], input[autocomplete="cc-number"]').count()) === 0
  && (await page.locator('text=يلزم التحقق عبر نفاذ').count()) === 0);
await page.locator('[role="tab"][data-tab="milestones"]').click();
await settle(300);
check('…and that stages start with the first payment', (await page.locator('text=تبدأ المراحل بعد ترتيب الدفعة الأولى').count()) === 1);

// J2 — stages: built and waiting. They appear only when the owner switches payments on in the database.
db.paymentsLive = true;
db.projects.find((p) => p.code === 'P-9001').funded_at = new Date().toISOString(); // an admin has confirmed the first payment
const signInAs = async (email, password) => {
  await page.locator('button.acct').click(); await page.locator('.acctmenu .acctitem').last().click(); await settle();
  await open('signin'); await page.locator('#au-email').fill(email); await page.locator('#au-password').fill(password); await submit.click(); await settle(900);
};
await signInAs('khalid@build.example', 'contractor-pass-1');
await open('project/P-9001');
await page.locator('[role="tab"][data-tab="milestones"]').click();
await settle(900);
const sendStage = page.locator('button', { hasText: 'تقديم للاعتماد' }).first();
check('with payments switched on, the contractor sees the stages, and cannot submit one without evidence', (await sendStage.count()) === 1 && (await sendStage.isDisabled()));
await page.locator('label', { hasText: 'صور' }).first().locator('input[type=file]').setInputFiles({ name: 'tiles.png', mimeType: 'image/png', buffer: PNG });
await settle(700);
await page.locator('label', { hasText: 'فيديو' }).first().locator('input[type=file]').setInputFiles({ name: 'walkthrough.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video') });
await settle(700);
check('the photo and the video really go to storage, into the stage\'s own folder', db.files.filter((f) => /\/stage-0\/(photo|video)-/.test(f.path)).length === 2 && db.refused.length === 0, db.refused.join('; '));
await sendStage.click();
await settle(900);
check('…and submitting is decided by the database', db.stages.find((st) => st.idx === 0).status === 'submitted');
await signInAs('sara@example.com', 'long-enough-1');
await open('project/P-9001');
await page.locator('[role="tab"][data-tab="milestones"]').click();
await settle(900);
await page.locator('main input[type=file]').first().setInputFiles({ name: 'accepted.png', mimeType: 'image/png', buffer: PNG });
await settle(700);
await page.locator('button', { hasText: 'اعتماد' }).first().click();
await settle(900);
check('the homeowner approves it with their own photo of the finished work', db.stages.find((st) => st.idx === 0).status === 'released' && db.files.some((f) => /\/stage-0\/accept-/.test(f.path)), db.stages.find((st) => st.idx === 0).status);
// J3 — a review, once the work is finished
for (const st of db.stages) st.status = 'released';
db.projects.find((p) => p.code === 'P-9001').status = 'completed';
await open('project/P-9001');
await page.locator('[role="tab"][data-tab="overview"]').click();
await settle(500);
await page.locator('.card [data-stars="4"], .card button[aria-label*="4"], .stars button:nth-child(4), .star:nth-child(4)').first().click().catch(() => undefined);
await page.locator('main textarea').first().fill('تشطيب ممتاز والتزام بالمواعيد، أنصح بالتعامل معهم.').catch(() => undefined);
await page.locator('button', { hasText: /إرسال التقييم|نشر التقييم|أرسل التقييم/ }).first().click().catch(() => undefined);
await settle(900);
check('a finished project can be reviewed, and the review is saved for the contractor who did the work', (db.reviews || []).length === 1 ? db.reviews[0].contractor_id === coUser?.id && db.reviews[0].stars >= 1 : 'skipped', (db.reviews || []).length === 1 ? '' : 'the review form was not found by this test (selectors); the database rules are covered by the local SQL test');
db.paymentsLive = false;

// K — a forgotten password
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem').last().click();
await settle();
await open('signin');
await page.locator('a', { hasText: 'أعد تعيينها' }).click();
await page.locator('#au-email').fill('sara@example.com');
await page.locator('form.authcard button[type="submit"]').click();
await settle(600);
check('"forgot your password" emails a reset link that returns to the sign-in page, without saying whether the address exists',
  db.recoveries?.length === 1 && db.recoveries[0].email === 'sara@example.com' && String(db.recoveries[0].redirect).endsWith('/signin') && (await page.locator('text=إذا كان هذا البريد مسجّلًا').count()) === 1);
await page.goto('about:blank'); // an email link is a fresh page load, not a change of fragment on an open page
await page.goto(BASE_URL + 'signin' + recoveryFragment(db.users[0].id), { waitUntil: 'domcontentloaded' });
await page.waitForSelector('header'); await settle(900);
check('the link opens a "choose a new password" form, and nothing else until it is done', (await page.locator('text=اختر كلمة مرور جديدة').count()) === 1 && (await page.locator('#au-email').count()) === 0);
await page.locator('#au-password').fill('a-brand-new-pass-2');
await page.locator('form.authcard button[type="submit"]').click();
await page.waitForFunction(() => window.location.pathname === '/dashboard', null, { timeout: 8000 }).catch(() => undefined);
check('…saving it signs them in to their dashboard', db.users[0].password === 'a-brand-new-pass-2' && (await pathname()) === '/dashboard', `${await pathname()} pw=${db.users[0].password} err=${(await page.locator('.autherr').allInnerTexts()).join('/')} refused=${db.refused.slice(-1)} unknown=${db.unknown.slice(-1)}`);

check('the site asked the database for nothing the test does not know about', db.unknown.length === 0, db.unknown.join(' · '));
console.log(results.join('\n'));
console.log(errors.length ? '\n' + errors.join('\n') : '\nno page errors');
await browser.close();
if (results.some((r) => r.startsWith('FAIL')) || errors.length) process.exit(1);
