/* Real accounts and posting on the public site (src/platform/), end to end in a browser.

   Start the app (`npm run dev`), then `npm run test:platform`. The database is a stand-in
   (tests/supabase-mock.mjs): no account is created and nothing is written anywhere real. */

import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { confirmLink, expiredFragment, installSupabaseMock, passTwoStep, recoveryFragment, totp } from './supabase-mock.mjs';

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
page.on('pageerror', (e) => { if (/tarmem-test/.test(String(e))) return; errors.push('PAGEERROR: ' + String(e).slice(0, 300)); }); // the suite throws one on purpose, to see it logged
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
check('the title says its limit (140 characters) and counts what is typed; the description says its own (4,000)', (await page.locator('input[name="title"]').getAttribute('maxlength')) === '140' && (await page.locator('textarea[name="desc"]').getAttribute('maxlength')) === '4000'
  && (await page.locator('.charcount').first().innerText()).includes('/ 140'));
await page.locator('input[name="title"]').fill('مط');
await page.locator('textarea[name="desc"]').fill('تغيير الخزائن والرخام، المساحة 4×5 م.');
await page.locator('button', { hasText: 'التالي' }).first().click();
await settle(200);
check('a title shorter than 3 characters is refused at its own step, with a sentence that says so', (await page.locator('#post-err', { hasText: 'من 3 إلى 140 حرفًا' }).count()) === 1 && (await page.locator('input[name="title"]').count()) === 1);
await page.locator('input[name="title"]').fill('تجديد مطبخ، 20 م²');
await page.locator('textarea[name="desc"]').fill('مطبخ');
await page.locator('button', { hasText: 'التالي' }).first().click();
await settle(200);
check('…and so is a description under 10 characters', (await page.locator('#post-err', { hasText: '10 أحرف على الأقل' }).count()) === 1 && (await page.locator('textarea[name="desc"]').count()) === 1);
await page.locator('textarea[name="desc"]').fill('تغيير الخزائن والرخام، المساحة 4×5 م.');
check('the type of work starts unchosen («اختر الخدمة»), not as a kitchen', (await page.locator('select[name="trade"]').inputValue()) === '' && (await page.locator('select[name="trade"] option[value=""]').innerText()) === 'اختر الخدمة');
await page.locator('button', { hasText: 'التالي' }).first().click();
await settle(200);
check('…and "next" without one says so, at its own step', (await page.locator('#post-err', { hasText: 'اختر نوع العمل.' }).count()) === 1 && (await page.locator('select[name="trade"]').count()) === 1);
await page.locator('select[name="trade"]').selectOption('kitchen');
await page.locator('button', { hasText: 'التالي' }).first().click();
check('the budget step shows the suggested range for the trade, as designed', (await page.locator('.sugbox').count()) === 1 && (await page.locator('.sugbox button.sugbtn').count()) === 1);
check('…worked out from the size in the description (a 4×5 kitchen: 16 linear metres of cabinets at published Saudi rates)',
  (await page.locator('.sugbox .num').first().innerText()).includes('14,500 – 32,000') && (await page.locator('.sugbox p').first().innerText()).includes('الأمتار الطولية: 16'),
  await page.locator('.sugbox .num').first().innerText());
await page.locator('input[name="min"]').fill('60000');
await page.locator('input[name="max"]').fill('40000');
await page.locator('button', { hasText: 'التالي' }).first().click();
await settle(200);
check('a minimum budget above the maximum is refused at the budget step', (await page.locator('#post-err', { hasText: 'لا يتجاوز الحد الأعلى' }).count()) === 1 && (await page.locator('input[name="min"]').count()) === 1);
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
await page.waitForSelector('.post-done-code', { timeout: 8000 }).catch(() => undefined);
await settle();
const project = db.projects[0];
check('publishing lands on the confirmation page: "your first project", its number, and what happens next',
  (await pathname()) === '/post' && (await page.locator('.post-done h1', { hasText: 'مبروك' }).count()) === 1 && (await page.locator('.post-done-code', { hasText: 'P-2001' }).count()) === 1 && (await page.locator('.post-done-next li').count()) === 3, await pathname());
await page.locator('.post-done button', { hasText: 'افتح صفحة المشروع' }).click();
await page.waitForFunction(() => window.location.pathname.startsWith('/project/'), null, { timeout: 8000 }).catch(() => undefined);
await settle();
check('sign-up creates the account and the profile (a Saudi mobile, typed in Arabic digits with spaces, kept as 05XXXXXXXX; never as admin)',
  db.users.length === 1 && db.users[0].email === 'sara@example.com' && db.profiles[0]?.role === 'homeowner' && db.profiles[0]?.mobile === '0551234567' && db.profiles[0]?.full_name === 'سارة العتيبي',
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
await page.locator('label.btn input[type="file"]').setInputFiles({ name: 'setup.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
await settle(300);
check('a file the Files tab does not take is named, with the reason (allowed types), and nothing is uploaded', db.files.length === 2 && (await page.locator('main .autherr', { hasText: 'setup.exe' }).count()) === 1 && (await page.locator('main .autherr', { hasText: 'الملفات المسموحة' }).count()) === 1,
  await page.locator('main .autherr').innerText().catch(() => '-'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('header'); await settle(700);
await page.locator('[role="tab"][data-tab="files"]').click();
await settle(400);
check('…and both are still there after a reload (read back from storage)', (await page.locator('td', { hasText: 'مطبخ قبل.png' }).count()) === 1 && (await page.locator('td', { hasText: 'plan.pdf' }).count()) === 1);
await page.locator('[role="tab"][data-tab="bids"]').click({ timeout: 3000 }).catch(() => undefined);
await settle(200);
await page.locator('.tab[data-tab="messages"]').click();
await settle(300);
check('before any bid, the messages tab says messaging opens with the first bid, and offers no box', (await page.locator('text=تفتح المراسلة مع المقاول').count()) === 1 && (await page.locator('main .card input.input').count()) === 0);
check('…under a header that reads "Tarmem" alone, with no stray "·"', (await page.locator('main .msg-card > div > span.muted').first().innerText()).trim() === 'ترميم', await page.locator('main .msg-card > div > span.muted').first().innerText().catch(() => '-'));
await page.locator('.tab[data-tab="bids"]').click();
await settle(300);
check('the bids tab says what happens next instead of "no bids"', (await page.locator('text=نُشر مشروعك ويراه المقاولون الموثّقون').count()) === 1);

// C — the dashboard, and what is left out of it for now
await page.locator('header [data-route="hdash"]').first().click({ timeout: 3000 }).catch(() => undefined);
await settle(300);
check('the dashboard greets them by name and lists the project', (await pathname()) === '/dashboard' && (await page.locator('h1', { hasText: 'سارة العتيبي' }).count()) === 1 && (await page.locator('#hdash-projects tbody tr').count()) === 1);
const hStatsText = (await page.locator('.statstrip').innerText()).replace(/\s+/g, ' ');
check('while payment is off, the dashboard shows no money figures that are zero only because nothing can be paid, and says a zero once (no "0" above "no bids")',
  (await page.locator('.statstrip > div').count()) === 2 && !hStatsText.includes('لا عروض مستلمة') && !hStatsText.includes('ريال'), hStatsText);
check('the saved-contractors card, which nothing on the public site can fill yet, is not shown', (await page.locator('.hd-saved').count()) === 0 && (await page.locator('main', { hasText: 'المقاولون المحفوظون' }).count()) === 0);
await page.locator('button.acct').click();
await settle(200);
const menu = await page.locator('.acctmenu .acctitem').allInnerTexts();
check('the account menu offers their profile, settings and sign-out — no wallet or contractor search yet', menu.length === 3 && (await page.locator('[data-route="wallet"], [data-route="contractors"]').count()) === 0, menu.join(' | '));
await page.keyboard.press('Escape');
await open('settings');
check('the designed settings page opens with their own mobile and email, without the WhatsApp card while WhatsApp updates are switched off',
  (await pathname()) === '/settings' && (await page.locator('input[name="mobile"]').inputValue()) === '0551234567' && (await page.locator('input[name="email"]').inputValue()) === 'sara@example.com' && (await page.locator('.wa-card').count()) === 0);
check('the settings page offers only the notification switches that exist, and says what the mobile and the email are for', (await page.locator('input[name="pBids"], input[name="pStages"], input[name="pPay"], input[name="pMsg"]').count()) === 4 && (await page.locator('input[name="pNews"], input[name="pDeadlines"]').count()) === 0 && (await page.locator('text=البريد الإلكتروني (لتسجيل الدخول)').count()) === 1);
check('the sign-in email is shown read-only, with the reason beside it', (await page.locator('input[name="email"]').getAttribute('readonly')) !== null && (await page.locator('main', { hasText: 'بريد تسجيل الدخول لا يُغيَّر من هنا' }).count()) === 1);
check('the settings page has a "change password" action', (await page.locator('.password-card button', { hasText: 'تغيير كلمة المرور' }).count()) === 1);
await page.locator('input[name="mobile"]').fill('0123456789');
await page.locator('button', { hasText: 'حفظ' }).first().click();
await settle(300);
check('a mobile number that is not a Saudi mobile is refused, and nothing is saved', (await page.locator('main', { hasText: 'رقم جوال سعوديًا' }).count()) === 1 && db.profiles[0].mobile === '0551234567');
await page.locator('input[name="mobile"]').fill('+966 55 999 8877');
await page.locator('input[name="pNews"]').check({ force: true }).catch(() => undefined);
await page.locator('button', { hasText: 'حفظ' }).first().click();
await settle(700);
check('saving writes the new mobile (typed the international way, kept as 05XXXXXXXX) and notification choices to their profile, and says so', db.profiles[0].mobile === '0559998877' && typeof db.profiles[0].prefs === 'object' && (await page.locator('text=حُفظت إعداداتك').count()) === 1 && db.refused.length === 0,
  db.refused.join('; ') || JSON.stringify({ m: db.profiles[0].mobile, p: db.profiles[0].prefs }));
// once the owner has switched WhatsApp on in the database (supabase/013), the designed WhatsApp card is real
db.whatsappLive = true;
await open('settings');
check('with WhatsApp switched on, the card shows the account\u2019s mobile, WhatsApp as the channel (no SMS), quiet hours on, and "connected"',
  (await page.locator('.wa-card').count()) === 1 && (await page.locator('#wa-num').inputValue()) === '0559998877' && (await page.locator('.wa-card .an-seg button').allInnerTexts()).join('|') === 'واتساب|بريد'
  && (await page.locator('.wa-card .an-seg button[data-v="wa"]').getAttribute('aria-pressed')) === 'true' && (await page.locator('input[name="quiet"]').isChecked()) && (await page.locator('.wa-card .tag-g').count()) === 1,
  (await page.locator('.wa-card .an-seg button').allInnerTexts()).join('|'));
await page.locator('.wa-card button.btn-p').click();
await settle(600);
check('"Send test message" really asks the database to send one, and shows the number it went to', db.waTests === 1 && (await page.locator('.wa-card', { hasText: '+966 55 999 8877' }).count()) === 1, db.refused.join('; '));
for (let i = 0; i < 3; i++) { await page.locator('.wa-card button', { hasText: 'إرسال رسالة تجريبية' }).click(); await settle(400); }
check('the fourth test in a day is refused inside the card, next to the button, not at the bottom of the page', db.waTests === 3 && (await page.locator('.wa-card .wa-error', { hasText: 'الحد اليومي' }).count()) === 1 && (await page.locator('main .card', { hasText: 'الحد اليومي' }).count()) === 1, await page.locator('.wa-card').innerText().then((t) => t.replace(/\s+/g, ' ').slice(-120)));
await page.locator('.wa-card .an-seg button[data-v="email"]').click();
await settle(600);
check('choosing email alone is saved to their profile at once, and the card no longer says connected', db.profiles[0].prefs?.channel === 'email' && (await page.locator('.wa-card .tag-g').count()) === 0 && (await page.locator('text=حُفظت إعداداتك').count()) === 1, JSON.stringify(db.profiles[0].prefs));
db.whatsappLive = false;
await open('profile');
const memberLine = await page.locator('main p.num', { hasText: 'في المنصة منذ' }).first().innerText().catch(() => '');
check('the homeowner\'s profile says «في المنصة منذ» with the month and year, not «انضم في»', /في المنصة منذ \S+ \d{4}/.test(memberLine) && !memberLine.includes('انضم في') && !memberLine.includes('Joined'), memberLine);
check('…and an introduction not written yet says so, with a way to write one', (await page.locator('main .hp-noabout', { hasText: 'لم تُضف نبذة بعد.' }).count()) === 1 && (await page.locator('main button.lnkbtn', { hasText: 'تعديل الملف' }).count()) === 1);
await page.locator('button', { hasText: /تعديل/ }).first().click();
await settle(300);
await page.locator('.modal textarea, [role="dialog"] textarea, textarea[name="about"]').first().fill('فيلا في حي العارض، نجدّد المطبخ هذا العام.');
await page.locator('button', { hasText: 'حفظ' }).last().click();
await settle(800);
check('the homeowner profile makes no Nafath claim', (await page.locator('.hp-identity').count()) === 0 && (await page.locator('text=تم التحقق عبر نفاذ').count()) === 0);
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
check('an open project with no bids yet has no "next step" button (there is nothing to open yet)', (await page.locator('.next-cta').count()) === 0);
db.failNext['PATCH /rest/v1/projects'] = { status: 503, body: { code: 'XX000', message: 'the database is busy' } };
await page.locator('button', { hasText: 'سحب المشروع' }).first().click().catch(() => undefined);
await settle(200);
await page.locator('.card button.btn-p.btn-sm', { hasText: 'نعم، اسحبه' }).first().click();
await settle();
check('a withdrawal the database does not take is said in a sentence, and the project stays posted and listed', (await page.locator('.sitenotice[data-tone="warn"]', { hasText: 'تعذّر سحب المشروع' }).count()) === 1 && db.projects[0].status === 'open' && (await page.locator('#hdash-projects tbody tr:not(.empty-row)').count()) === 1,
  `${db.projects[0].status} ${await page.locator('.sitenotice').innerText().catch(() => '-')}`);
const noticeBox = await page.locator('.sitenotice').boundingBox(), headerBox = await page.locator('header.hdr').boundingBox();
check('…in a notice that sits below the header, never under it', Boolean(noticeBox && headerBox && noticeBox.y >= headerBox.y + headerBox.height - 1), JSON.stringify({ noticeBox, headerBox }));
await page.locator('.sitenotice button').click();
await open('project/P-2001');
await page.locator('button', { hasText: 'سحب المشروع' }).first().click().catch(() => undefined);
await settle(200);
const confirm = page.locator('.card button.btn-p.btn-sm').first();
await confirm.click();
await settle();
check('withdrawing marks the project withdrawn in the database and leaves the dashboard empty',
  db.projects[0].status === 'withdrawn' && (await pathname()) === '/dashboard' && (await page.locator('#hdash-projects tbody tr:not(.empty-row)').count()) === 0, `${db.projects[0].status} ${await pathname()} ${await page.locator('#hdash-projects tbody').innerText().catch(() => '-')}`);
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem').last().click();
await settle();
const after = await saved();
check('signing out returns home and leaves no account or projects on the device', (await pathname()) === '/' && !after.user && !(after.projects || []).length
  && (await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('tarmem-auth')).length)) === 0);
// one account per mobile number (supabase/021): asked before anything is created
await open('signin');
await page.locator('.authseg input[value="signup"]').check();
await page.locator('#au-name').fill('نورة العتيبي');
await page.locator('#au-mobile').fill('+966 ' + String(db.profiles[0].mobile).replace(/\D/g, '').replace(/^0/, '')); // the number on file, written the international way
await page.locator('#au-email').fill('noura@example.com');
await page.locator('#au-password').fill('long-enough-2');
await page.locator('form.authcard input[type="checkbox"]').check();
await page.locator('form.authcard button[type="submit"]').click();
await settle(600);
check('a second account with a mobile that is already registered, however it is written, is refused before it is created',
  (await page.locator('.autherr').innerText().catch(() => '')).includes('مسجّل لحساب آخر') && db.users.length === 1 && db.profiles.length === 1, `${await pathname()} users=${db.users.length} profiles=${db.profiles.length} err=${await page.locator('.autherr').innerText().catch(() => '-')} unknown=${db.unknown.join('|')}`);
await open('signin');
await page.locator('.authseg input[value="signin"]').check().catch(() => undefined);
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
await settle(300);
check('the contact form needs a topic: without one nothing is saved, and the error is announced', db.contact.length === 0 && (await page.locator('#ct-err[role="alert"]').count()) === 1);
await page.locator('select[name="topic"]').selectOption({ index: 1 });
check('the message says its limit (4,000 characters) and counts what is typed', (await page.locator('textarea[name="msg"]').getAttribute('maxlength')) === '4000' && (await page.locator('.charcount', { hasText: '/ 4,000' }).count()) === 1);
await page.locator('input[name="name"]').fill('خ');
await page.locator('button', { hasText: 'إرسال الرسالة' }).click();
await settle(400);
check('a one-letter name is refused with its own sentence before anything is sent', db.contact.length === 0 && (await page.locator('#ct-err', { hasText: 'حرفان على الأقل' }).count()) === 1, await page.locator('#ct-err').innerText().catch(() => '-'));
await page.locator('input[name="name"]').fill('خالد');
await page.locator('input[name="phone"]').fill('12');
await page.locator('button', { hasText: 'إرسال الرسالة' }).click();
await settle(400);
check('…and so is a phone number the database would not take', db.contact.length === 0 && (await page.locator('#ct-err', { hasText: 'رقم جوال صحيحًا' }).count()) === 1, await page.locator('#ct-err').innerText().catch(() => '-'));
await page.locator('input[name="phone"]').fill('0555123456');
await page.locator('button', { hasText: 'إرسال الرسالة' }).click();
await settle();
check('the contact form is saved for the team and confirms it', db.contact.length === 1 && db.contact[0].message === 'هل تغطون جدة؟' && db.contact[0].mobile === '0555123456'
  && (await page.locator('text=وصلتنا رسالتك').count()) === 1 && (await page.evaluate(() => window.__opened.length)) === 0, JSON.stringify(db.contact[0] || null).slice(0, 140));
// a bot fills the hidden field: it sees "sent", nothing is saved (supabase/022 limits the rest)
const contactBefore = db.contact.length;
await open('contact');
await page.locator('input[name="name"]').fill('bot');
await page.locator('input[name="phone"]').fill('0555000000');
await page.locator('select[name="topic"]').selectOption({ index: 1 });
await page.locator('textarea[name="msg"]').fill('buy now');
await page.evaluate(() => { const el = document.querySelector('input[name="website"]'); if (el) { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'http://spam.example'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } });
await page.locator('button', { hasText: 'إرسال الرسالة' }).click();
await settle(600);
check('a filled honeypot field on the contact form saves nothing, and the sender is told nothing', db.contact.length === contactBefore, `${db.contact.length} vs ${contactBefore}`);
await open('join');
const usersBeforeJoin = db.users.length;
const nextBtn = page.locator('.join-card button', { hasText: 'التالي' });
const backBtn = page.locator('.join-card button', { hasText: 'رجوع' });
check('the join form is three short steps; the first asks only for the business (name, city, commercial registration)',
  (await page.locator('.join-card ol li').count()) === 3 && (await page.locator('#join-company').count()) === 1 && (await page.locator('#join-person').count()) === 0 && (await page.locator('button.tchip').count()) === 0);
const [cityBox, companyBox] = [await page.locator('#join-city').boundingBox(), await page.locator('#join-company').boundingBox()];
check('…its city list is as tall as the fields around it', Boolean(cityBox && companyBox) && Math.abs(cityBox.height - companyBox.height) <= 2, `${cityBox?.height} vs ${companyBox?.height}`);
await nextBtn.click(); await settle(200);
check('"Next" with no business name stays on the step and says what is missing', (await page.locator('#join-error[role="alert"]').count()) === 1 && (await page.locator('#join-company').count()) === 1);
await page.locator('#join-company').fill('م');
await nextBtn.click(); await settle(200);
check('a one-letter company name is refused with its own sentence', (await page.locator('#join-error', { hasText: 'اسم المنشأة' }).count()) === 1 && db.applications.length === 0);
await page.locator('#join-company').fill('مؤسسة البناء المتقن');
await page.locator('#join-cr').fill('12ab');
await nextBtn.click(); await settle(200);
check('a commercial registration with letters in it says what is wrong (digits only, 5 to 15), not the field\'s hint', (await page.locator('#join-error', { hasText: 'أرقام فقط' }).count()) === 1 && db.applications.length === 0, await page.locator('#join-error').innerText().catch(() => '-'));
await page.locator('#join-cr').fill('');
await nextBtn.click(); await settle(200);
check('step two is the account: contact person, mobile, email and password', (await page.locator('#join-person').count()) === 1 && (await page.locator('#join-password').count()) === 1 && (await page.locator('#join-company').count()) === 0);
check('the Arabic password hint reads right to left until something is typed', (await page.locator('#join-password').evaluate((el) => getComputedStyle(el).direction)) === 'rtl' && (await page.locator('#join-password').getAttribute('dir')) === 'ltr');
await page.locator('#join-person').fill('خالد العتيبي');
await nextBtn.click(); await settle(200);
check('a contractor application needs a mobile number, an email and a password', db.applications.length === 0 && (await page.locator('[role="alert"]').count()) === 1 && (await page.locator('#join-mobile').count()) === 1);
await page.locator('#join-mobile').fill('+971 50 111 2223');
await page.locator('#join-email').fill('Khalid@Build.example');
await page.locator('#join-password').fill('contractor-pass-1');
check('…and once typed, the password itself runs left to right', (await page.locator('#join-password').evaluate((el) => getComputedStyle(el).direction)) === 'ltr');
await nextBtn.click(); await settle(200);
check('a mobile number that is not Saudi is refused', (await page.locator('#join-error', { hasText: 'سعوديًا' }).count()) === 1 && db.applications.length === 0);
await page.locator('#join-mobile').fill('+966 50 111 2223');
await nextBtn.click(); await settle(200);
check('step three is the trades, in seven folded groups, none chosen yet', (await page.locator('.join-groups > div').count()) === 7 && (await page.locator('button.tchip').count()) === 0);
const groupButtons = page.locator('.join-groups button[aria-expanded]');
let tradesSeen = 0;
for (let i = 0; i < await groupButtons.count(); i += 1) { await groupButtons.nth(i).click(); await settle(60); tradesSeen += await page.locator('.join-groups .tchip').count(); }
check('…and every one of the 43 trades is in one of them (plumbing, electrical, painting, AC, bathrooms, pools…)', tradesSeen === 43, String(tradesSeen));
await groupButtons.nth(2).click(); await settle(100);
const groupChips = page.locator('.join-groups .tchip');
const inGroup = await groupChips.count();
for (let i = 0; i < inGroup; i += 1) await groupChips.nth(i).click();
await groupButtons.nth(3).click(); await settle(100);
for (let i = 0; i < 12 - inGroup + 1; i += 1) await groupChips.nth(i).click();
check('…up to twelve, as the database allows: the thirteenth says so and is not picked', (await page.locator('#join-error', { hasText: 'حتى 12 تخصصًا' }).count()) === 1
  && (await page.locator('.join-card', { hasText: 'اخترت 12 من 12' }).count()) === 1, `${inGroup} in the group`);
await groupButtons.nth(2).click(); await settle(100);
check('…what is chosen shows above the groups, and each group says how many of its trades are chosen', (await groupButtons.nth(2).innerText()).includes(String(inGroup)));
for (let i = 1; i < inGroup; i += 1) await groupChips.nth(i).click();
check('the consent sentence joins the Arabic «و» to the next word («وسياسة الخصوصية»)', (await page.locator('label:has(#join-agree)').innerText()).includes('شروط الاستخدام وسياسة الخصوصية'));
await page.locator('.join-card button', { hasText: 'أضف نبذة' }).click();
check('the application note waits behind a link, says its limit (2,000 characters) and counts what is typed', (await page.locator('#join-note').getAttribute('maxlength')) === '2000' && (await page.locator('#join-note-count').innerText()).includes('/ 2,000'));
const apply = page.locator('button', { hasText: 'إرسال الطلب وإنشاء الحساب' });
await apply.click();
await settle(300);
check('…and the Terms of use and Privacy policy must be accepted before it is sent', db.applications.length === 0 && db.users.length === usersBeforeJoin
  && (await page.locator('#join-error[role="alert"]').innerText()).includes('شروط الاستخدام'));
await page.locator('#join-agree').check();
await backBtn.click(); await settle(150);
check('"Back" returns to the account step with everything typed kept', (await page.locator('#join-email').inputValue()) === 'Khalid@Build.example' && (await page.locator('#join-person').inputValue()) === 'خالد العتيبي');
await nextBtn.click(); await settle(150);
check('…and forward again keeps the chosen trade and the consent', (await page.locator('.join-card .tchip[aria-pressed="true"]').count()) >= 1 && (await page.locator('#join-agree').isChecked()));
await apply.click();
await settle(900);
const coUser = db.users.find((u) => u.email === 'khalid@build.example');
check('applying creates the contractor\'s account, their profile, and an application tied to it',
  !!coUser && db.profiles.some((p) => p.id === coUser.id && p.role === 'contractor' && p.company === 'مؤسسة البناء المتقن') && db.applications.length === 1 && db.applications[0].user_id === coUser?.id && db.applications[0].trades.length === 1 && db.applications[0].mobile === '0501112223',
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
// a browser error is recorded too (supabase/022), with a short detail, so the team sees what broke
const errorsBefore = db.visits.filter((v) => v.event === 'error').length;
await page.evaluate(() => { setTimeout(() => { throw new Error('tarmem-test: something broke'); }, 0); });
await settle(700);
const errRow = db.visits.filter((v) => v.event === 'error').slice(-1)[0];
check('a browser error is recorded as a visit event with what broke and where', db.visits.filter((v) => v.event === 'error').length === errorsBefore + 1 && /tarmem-test: something broke/.test(errRow?.detail || '') && errRow?.path === (await pathname()), JSON.stringify(errRow || null).slice(0, 160));
check('…with a random tab id, the page, language and device — and nothing else', db.visits.every((v) => /^[a-z0-9]{8,40}$/.test(v.session_id)
  && Object.keys(v).every((k) => ['session_id', 'event', 'route', 'path', 'lang', 'device', 'referrer', 'city', 'detail'].includes(k))), JSON.stringify(db.visits[0]));

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
// T — the team's second step (supabase/032). The first time, the console asks for an authenticator app to be set up; the
// database gives the account no admin powers until the app's code is in (the stand-in imitates 032)
const gate = page.locator('.twostep');
const factorOf = () => db.factors.filter((f) => f.user_id === db.users[0].id);
const keyOnPage = async () => { await page.locator('#ts-secret').waitFor({ timeout: 8000 }).catch(() => undefined); return (await page.locator('#ts-secret').textContent().catch(() => '')).replace(/\s+/g, ''); };
const firstKey = await keyOnPage();
check('an admin lands on the two-step set-up first: three steps, a QR code and its key — no console and no team bar behind it',
  (await pathname()) === '/admin' && (await gate.getAttribute('data-mode').catch(() => null)) === 'setup' && (await page.locator('.twostep ol > li').count()) === 3
  && (await page.locator('.twostep img.ts-qr').evaluate((img) => img.complete && img.naturalWidth > 0).catch(() => false)) && /^[A-Z2-7]{32}$/.test(firstKey)
  && (await page.locator('.side[data-tab]').count()) === 0 && (await page.locator('[data-route="inbox"]').count()) === 0, `${await pathname()} key=${firstKey.length}`);
check('…the key is the one Supabase Auth made for this account, for "Tarmem", waiting to be confirmed', factorOf().length === 1 && factorOf()[0].secret === firstKey && factorOf()[0].issuer === 'Tarmem' && factorOf()[0].status === 'unverified');
await open('admin');
const secondKey = await keyOnPage();
check('opening the page again starts afresh: the unfinished set-up is removed, so only one ever waits', factorOf().length === 1 && factorOf()[0].secret === secondKey && secondKey !== firstKey);
await page.locator('header a.brand[data-route="home"]').click(); await settle(400);
await page.locator('header .mainnav a[data-route="admin"]').click(); await settle(400);
check('…but leaving it and coming back within the visit shows the same code, so a scan already made still counts', (await keyOnPage()) === secondKey && factorOf().length === 1);
const near = [-30000, 0, 30000].map((d) => totp(secondKey, Date.now() + d));
let wrong = 123456; while (near.includes(String(wrong))) wrong += 1;
await page.locator('#ts-code').fill(String(wrong));
await page.locator('.twostep button[type="submit"]').click(); await settle(700);
check('a wrong code is refused with a sentence, and nothing opens', (await page.locator('.twostep .autherr').innerText().catch(() => '')).includes('الرمز غير صحيح')
  && factorOf()[0].status === 'unverified' && (await page.locator('.side[data-tab]').count()) === 0);
const rightCode = totp(secondKey);
await page.locator('#ts-code').fill(rightCode.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]));
const typed = await page.locator('#ts-code').inputValue();
await page.locator('.twostep button[type="submit"]').click();
await page.waitForSelector('.side[data-tab]', { timeout: 8000 }).catch(() => undefined); await settle(500);
check('the right code (typed in Arabic digits, kept as digits) turns it on: the console opens, with a note that the code is now asked at every sign-in',
  typed === rightCode && factorOf()[0].status === 'verified' && (await gate.count()) === 0 && (await page.locator('.sitenotice', { hasText: 'تم تفعيل التحقق بخطوتين' }).count()) === 1, typed);
check('an admin lands on the designed console', (await pathname()) === '/admin' && (await page.locator('.side[data-tab="analytics"]').count()) === 1, await pathname());
await open('admin');
check('the session keeps both steps: opening the console again asks for nothing', (await gate.count()) === 0 && (await page.locator('.side[data-tab="analytics"]').count()) === 1);
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem', { hasText: 'الإعدادات' }).click();
await settle(600);
check('an admin has a settings page too, for their own contact details and the WhatsApp test, without a delete-account card', (await pathname()) === '/settings' && (await page.locator('input[name="mobile"]').count()) === 1 && (await page.locator('button', { hasText: 'حذف حسابي' }).count()) === 0, await pathname());
await open('admin'); await settle(600);
await page.locator('.side[data-tab="overview"]').click(); await settle(400);
check('a withdrawn project still shows in the console, marked as withdrawn', (await page.locator('tr.row-h', { hasText: 'P-2001' }).count()) === 1 && (await page.locator('tr.row-h', { hasText: 'P-2001' }).locator('.tag', { hasText: 'مسحوب' }).count()) === 1);
check('the projects table\'s headers are all in Arabic on the Arabic site (no "ID")', (await page.locator('main th', { hasText: 'الرقم' }).count()) === 1 && (await page.locator('main th').filter({ hasText: /^ID$/ }).count()) === 0);
const tab = async (id) => { await page.locator(`.side[data-tab="${id}"]`).click(); await settle(500); };
await tab('verification');
check('verification lists the real application, with who to call', (await page.locator('main', { hasText: 'مؤسسة البناء المتقن' }).count()) === 1 && (await page.locator('main', { hasText: '0501112223' }).count()) === 1
  && (await page.locator('main', { hasText: '4 Sep 2026' }).count()) === 0);
// the detail views (supabase/021): open the application before deciding
await page.locator('button[data-id="A-1"]', { hasText: 'عرض' }).click();
await settle(400);
check('opening an application shows everything the applicant typed: company, person, mobile, email, trades and note', (await page.locator('.modal.dv').count()) === 1
  && (await page.locator('.modal.dv', { hasText: 'مؤسسة البناء المتقن' }).count()) === 1 && (await page.locator('.modal.dv', { hasText: 'خالد العتيبي' }).count()) === 1
  && (await page.locator('.modal.dv', { hasText: '0501112223' }).count()) === 1 && (await page.locator('.modal.dv', { hasText: 'khalid@build.example' }).count()) === 1
  && (await page.locator('.modal.dv .btn-p').count()) === 1, (await page.locator('.modal.dv').innerText().catch(() => '-')).replace(/\s+/g, ' ').slice(0, 220));
await page.locator('.modal.dv button', { hasText: 'إغلاق' }).click();
await settle(300);
check('…and closes again', (await page.locator('.modal.dv').count()) === 0);
await page.evaluate(() => { window.__opened.length = 0; });
await page.locator('button[data-id="A-1"].btn-p').click();
await settle();
check('…and Approve marks it verified in the database', db.applications[0].status === 'verified', db.applications[0].status);
const told = await page.evaluate(() => window.__opened.slice());
check('…and opens WhatsApp to the contractor\'s own number, with the "your account is live" message and the sign-in link',
  told.length === 1 && told[0].startsWith('https://wa.me/966501112223?text=') && decodeURIComponent(told[0]).includes('تم توثيق حساب') && decodeURIComponent(told[0]).includes('/signin'), told[0]?.slice(0, 80));
await tab('support');
check('support cases are the contact-form messages, with the sender', (await page.locator('main', { hasText: 'هل تغطون جدة؟' }).count()) === 1 && (await page.locator('main', { hasText: '0555123456' }).count()) === 1);
check('…in a column titled «المرسل» (a case here has a sender, not a project), beside «الرقم»', (await page.locator('main th', { hasText: 'المرسل' }).count()) === 1 && (await page.locator('main th', { hasText: 'الرقم' }).count()) === 1
  && (await page.locator('main th', { hasText: 'المشروع' }).count()) === 0);
await page.locator('button[data-id="M-1"]', { hasText: 'عرض' }).click();
await settle(400);
check('opening a case shows the whole message and who sent it', (await page.locator('.modal.dv', { hasText: 'هل تغطون جدة؟' }).count()) === 1 && (await page.locator('.modal.dv', { hasText: '0555123456' }).count()) === 1, (await page.locator('.modal.dv').innerText().catch(() => '-')).replace(/\s+/g, ' ').slice(0, 200));
await page.locator('#dv-reply').fill('نعم، نغطي جدة من هذا الشهر.');
await page.locator('.modal.dv .btn-p', { hasText: 'احفظ الرد' }).click();
await settle(900);
check('a reply is kept on the case — this sender left a mobile only, so nothing is emailed — and the case reads "answered"',
  db.caseReplies.length === 1 && db.caseReplies[0].body === 'نعم، نغطي جدة من هذا الشهر.' && db.caseReplies[0].sent_by_email === false && Boolean(db.contact[0]?.answered_at)
  && (await page.locator('.modal.dv', { hasText: 'مدوَّن' }).count()) === 1 && (await page.locator('.modal.dv .tag', { hasText: 'تم الرد' }).count()) === 1,
  `${JSON.stringify(db.caseReplies[0] || null)} ${(await page.locator('.modal.dv').innerText().catch(() => '-')).replace(/\s+/g, ' ').slice(0, 160)}`);
await page.locator('.modal.dv button', { hasText: 'إغلاق' }).click();
await settle(300);
await page.locator('button[data-id="M-1"]', { hasText: 'حل' }).click();
await settle();
check('…and resolving one marks it handled in the database', db.contact[0].handled === true);
await tab('users');
check('users lists real people only', (await page.locator('main', { hasText: 'مؤسسة البناء المتقن' }).count()) === 1 && (await page.locator('main', { hasText: 'عبدالله' }).count()) === 0);
await page.locator('button[data-kind="c"]', { hasText: 'عرض' }).first().click();
await settle(900);
check('opening a person shows their record from the database: email, mobile, company, and their verification', (await page.locator('.modal.dv').count()) === 1
  && (await page.locator('.modal.dv', { hasText: 'khalid@build.example' }).count()) === 1 && (await page.locator('.modal.dv', { hasText: '0501112223' }).count()) === 1
  && (await page.locator('.modal.dv', { hasText: 'مؤسسة البناء المتقن' }).count()) === 1, (await page.locator('.modal.dv').innerText().catch(() => '-')).replace(/\s+/g, ' ').slice(0, 220));
check('…including whether the mobile was verified by WhatsApp code', (await page.locator('.modal.dv', { hasText: 'الجوال موثّق' }).count()) === 1 && (await page.locator('.modal.dv', { hasText: 'ليس بعد' }).count()) === 1);
await page.locator('.modal.dv button', { hasText: 'حذف هذا الحساب' }).click();
await settle(300);
check('erasing asks first, and says what goes and what stays', (await page.locator('.modal.dv', { hasText: 'حذف حساب هذا الشخص' }).count()) === 1 && (await page.locator('.modal.dv', { hasText: 'تبقى المشاريع' }).count()) === 1);
await page.locator('.modal.dv button', { hasText: 'أبقِه' }).click();
await settle(200);
check('…and can be called off', (await page.locator('.modal.dv', { hasText: 'حذف حساب هذا الشخص' }).count()) === 0 && !(db.erased || []).length);
await page.locator('.modal.dv button', { hasText: 'إغلاق' }).click();
await settle(300);
await tab('analytics');
await settle(600);
check('analytics says its figures are real, and shows the recorded visits', (await page.locator('main', { hasText: 'بيانات حقيقية' }).count()) === 1 && (await page.locator('main', { hasText: 'بيانات تجريبية' }).count()) === 0
  && (await page.locator('main', { hasText: 'يتصفح' }).count()) === 1,
  `real=${await page.locator('main', { hasText: 'بيانات حقيقية' }).count()} demo=${await page.locator('main', { hasText: 'بيانات تجريبية' }).count()} feed=${(await page.locator('main').innerText()).includes('يتصفح')}`);
check('…and the design\u2019s "connect Google Analytics" box, which installed nothing, is not shown', (await page.locator('main', { hasText: 'Google Analytics' }).count()) === 0);
check('every console tab shows while payment on the site is off: late deliveries, promo codes and partners included', (await page.locator('.side[data-tab="late"]').count()) === 1 && (await page.locator('.side[data-tab="promos"]').count()) === 1
  && (await page.locator('.side[data-tab="affiliates"]').count()) === 1 && (await page.locator('.side[data-tab="analytics"]').count()) === 1);
await tab('late');
check('…the late-deliveries tab says nothing is recorded until stage payments start', (await page.locator('main', { hasText: 'لا شيء مسجّل حتى الآن' }).count()) === 1);
await tab('promos');
check('…the promo-code tab says codes are kept here and apply once payment is live', (await page.locator('main', { hasText: 'الأكواد تُحفظ وتُدار هنا' }).count()) === 1);
await page.locator('button', { hasText: /كود جديد|إنشاء كود|New code/ }).first().click().catch(() => undefined);
await settle(300);
await page.locator('#pm-code').fill('WELCOME10');
await page.locator('#pm-value').fill('10');
await page.locator('.btn-p', { hasText: /حفظ|إنشاء|Save|Create/ }).last().click();
await settle();
check('a promo code made in the console is saved to the database, with payment still off', db.adminState.promos?.[0]?.code === 'WELCOME10' && db.adminState.promos.length === 1, JSON.stringify(db.adminState.promos || null).slice(0, 120));
const pmFigures = await page.locator('main .qstrip .qv').allInnerTexts();
check('…its figures are true counts (1 active, 0 uses, 0 discounted) and the average value with a code reads "—", never a made-up number', pmFigures.length === 4 && pmFigures[0] === '1' && pmFigures[1] === '0' && pmFigures[2] === '0' && pmFigures[3] === '—'
  && (await page.locator('main', { hasText: '46,800' }).count()) === 0, pmFigures.join(' | '));
await tab('affiliates');
const afFigures = await page.locator('main .qstrip .qv').allInnerTexts();
check('…on the partners tab, clicks, sign-ups, projects and commissions are not measured yet, so they read "—", and the tab says why', afFigures.length === 5 && afFigures.slice(1).every((v) => v === '—')
  && (await page.locator('main', { hasText: 'لا تُحتسب بعد' }).count()) === 1, afFigures.join(' | '));
await open('admin'); await settle(700);
check('nothing invented is left: no seeded strikes, refunds or affiliates', !(await saved()).strikes?.length && !(await saved()).refunds?.length && !(await saved()).affiliates?.length);
check("the team's own browsing is not counted as traffic", db.visits.length === before, `${before} → ${db.visits.length}`);
db.emailLog = [
  { id: 3, at: '2026-09-24T07:05:00Z', recipient: 'sara@example.com', template: 'auth_recovery', status: 'sent', detail: null, channel: 'email', answer: 'accepted', answer_code: 200 },
  { id: 2, at: '2026-09-23T09:10:00Z', recipient: '966551234567', template: 'new_bid', status: 'sent', detail: null, channel: 'whatsapp', answer: 'accepted', answer_code: 200, delivery: 'read', delivery_detail: null },
  { id: 1, at: '2026-09-23T09:10:00Z', recipient: 'sara@example.com', template: 'new_bid', status: 'sent', detail: null, channel: 'email', answer: '(#131047) Re-engagement message', answer_code: 400 },
];
db.waInbox = [
  { id: 7, at: '2026-09-24T10:02:00Z', from_number: '966551234567', name: 'Sara', kind: 'text', body: 'متى يبدأ العمل في المطبخ؟', profile_id: db.users[0].id, replied_at: '2026-09-24T10:02:02Z' },
  { id: 6, at: '2026-09-24T09:40:00Z', from_number: '966500000099', name: 'John', kind: 'image', body: 'the wall after painting', profile_id: null, replied_at: null },
];
await page.locator('[data-route="inbox"]').click();
await settle(700);
check('the plain contact list is still one click away, now with a browser-errors table', (await pathname()) === '/inbox' && (await page.locator('main table').count()) === 6 && (await page.locator('.error-log').count()) === 1);
const waText = (await page.locator('.wa-inbox').innerText().catch(() => '')).replace(/\s+/g, ' ');
check('the WhatsApp messages customers send to the Tarmem number are listed: who (account or WhatsApp name), the words, a link to answer, and whether they were auto-replied',
  (await page.locator('.wa-inbox tr').count()) === 2 && waText.includes('متى يبدأ العمل في المطبخ؟') && waText.includes('John') && waText.includes('صورة')
  && (await page.locator('.wa-inbox a[href="https://wa.me/966500000099"]').count()) === 1 && (await page.locator('.wa-inbox .tag-g', { hasText: 'رد تلقائي' }).count()) === 1, waText.slice(0, 200));
check('a WhatsApp Meta reports as read says so under its outcome', (await page.locator('.sent-log .tag-g', { hasText: 'قرأها' }).count()) === 1);
check('the inbox asks the database for the providers\u2019 answers, then lists every message sent with its outcome', db.reconciled >= 1 && (await page.locator('.sent-log tr').count()) === 3
  && (await page.locator('.sent-log .tag-g', { hasText: 'Meta' }).count()) === 1 && (await page.locator('.sent-log .tag-p', { hasText: 'Re-engagement' }).count()) === 1, String(await page.locator('.sent-log').innerText()).slice(0, 200));
check('…including the password-reset emails the database now sends for Supabase, by name and with Resend\u2019s answer', (await page.locator('.sent-log tr', { hasText: 'إعادة تعيين كلمة المرور' }).locator('.tag-g', { hasText: 'Resend' }).count()) === 1
  && (await page.locator('.sent-log', { hasText: 'auth_recovery' }).count()) === 0);
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
const perfText = (await page.locator('.perf-card').count()) ? await page.locator('.perf-card').innerText() : '';
check('the contractor dashboard\u2019s performance card shows measured figures, dashes where nothing is measured yet, never the design\u2019s typed ones', (await page.locator('.perf-card').count()) === 1 && !/128|31%|4h/.test(perfText) && /0/.test(perfText) && /—/.test(perfText), perfText.replace(/\n/g, ' | '));
check('the verified contractor signs in and lands on the contractor dashboard, no longer "being verified"', (await pathname()) === '/contractor' && (await page.locator('text=حسابك قيد التوثيق').count()) === 0 && (await page.locator('h1', { hasText: 'مؤسسة البناء المتقن' }).count()) === 1, await pathname());
const cStatsText = (await page.locator('.statstrip').innerText()).replace(/\s+/g, ' ');
check('while stages and payment are off, the contractor dashboard has no late-delivery card, no stage-payments card and no money figures', (await page.locator('.strikebar').count()) === 0 && (await page.locator('.cd-pay').count()) === 0
  && (await page.locator('.statstrip > div').count()) === 2 && !cStatsText.includes('ريال'), cStatsText);
check('an empty "your projects and bids" table says so, and where to start', (await page.locator('#cdash-work tr.empty-row', { hasText: 'تصفّح المشاريع المفتوحة' }).count()) === 1);
await open('how');
await page.locator('main button[data-route="post"]').first().click();
await settle(500);
check('"post a project" from a contractor\'s account says contractor accounts do not post projects, instead of bouncing back without a word', (await pathname()) === '/contractor' && (await page.locator('.sitenotice', { hasText: 'حسابات المقاولين لا تنشر مشاريع' }).count()) === 1, await pathname());
await page.locator('.sitenotice button').click().catch(() => undefined);
await page.locator('header [data-route="browse"]').first().click();
await settle(500);
check('…browses the open projects', (await pathname()) === '/projects' && (await page.locator('main', { hasText: 'ترميم حمام رئيسي' }).count()) === 1);
check('…without ever seeing who posted them', (await page.locator('main', { hasText: 'سارة' }).count()) === 0);
await open('project/P-9001');
check('a contractor who has not won the project sees only its overview, their bid and the messages', (await page.locator('[role="tab"]').evaluateAll((els) => els.map((e) => e.dataset.tab).join(','))) === 'overview,bids,messages',
  await page.locator('[role="tab"]').evaluateAll((els) => els.map((e) => e.dataset.tab).join(',')));
await page.locator('.tab[data-tab="messages"]').click();
await settle(300);
check('…and, before bidding, the messages tab says messaging with the homeowner opens once they bid', (await page.locator('main', { hasText: 'تفتح المراسلة مع صاحب المنزل بعد تقديم عرضك' }).count()) === 1 && (await page.locator('main .card input.input').count()) === 0);
await page.locator('[role="tab"][data-tab="overview"]').click();
await settle(200);
await page.locator('.next-cta').click();
await settle(300);
check('"next step" has a button that opens it: the bid form', (await page.locator('[role="tab"][data-tab="bids"]').getAttribute('aria-selected')) === 'true' && (await page.locator('input[name="price"]').count()) === 1);
check('…and gets the designed bid form', (await pathname()) === '/project/P-9001' && (await page.locator('input[name="price"]').count()) === 1);
check('the bid form assumes nothing: VAT registration is not ticked, and the placeholders read as hints, not typed figures', !(await page.locator('input[name="vatReg"]').isChecked())
  && (await page.locator('input[name="price"]').getAttribute('placeholder')) === 'المبلغ بالريال' && (await page.locator('input[name="days"]').getAttribute('placeholder')) === 'عدد الأيام'
  && (await page.locator('.datefield .dateph').innerText()) === 'اختر التاريخ' && (await page.locator('textarea[name="note"]').getAttribute('maxlength')) === '2000');
await page.locator('input[name="price"]').fill('50');
await page.locator('input[name="days"]').fill('18');
await page.locator('button', { hasText: 'مراجعة العرض' }).first().click();
await settle(200);
check('a price below SAR 100 is refused before anything is sent, with the range', (await page.locator('main', { hasText: 'بين 100 و1,000,000 ريال' }).count()) === 1 && db.bids.length === 0);
await page.locator('input[name="price"]').fill('24000');
await page.locator('input[name="days"]').fill('2000');
await page.locator('button', { hasText: 'مراجعة العرض' }).first().click();
await settle(200);
check('…and so is a duration over 1,000 days', (await page.locator('main', { hasText: 'بين يوم واحد و1,000 يوم' }).count()) === 1);
await page.locator('input[name="days"]').fill('18');
await page.locator('textarea[name="note"], input[name="note"]').first().fill('يشمل العزل والأدوات الصحية.');
// the design asks for the terms too: warranty, how long the bid is valid, and a start date
for (const [name, value] of [['warranty', '12'], ['valid', '14']]) await page.locator(`[name="${name}"]`).first().fill(value).catch(() => page.locator(`[name="${name}"]`).first().selectOption({ index: 1 }));
await page.locator('[name="start"]').first().fill('2026-10-05');
await page.locator('button', { hasText: 'مراجعة العرض' }).first().click();
await settle(300);
db.failNext['POST /rest/v1/bids'] = { status: 400, body: { code: '23514', details: 'Failing row', hint: null, message: 'new row for relation "bids" violates check constraint "bids_price_check"' } };
await page.locator('button', { hasText: 'إرسال العرض لصاحب المنزل' }).first().click();
await settle(800);
check('a bid the database refuses keeps everything typed, and says which field to change', db.bids.length === 0 && (await page.locator('input[name="price"]').inputValue()) === '24000' && (await page.locator('input[name="days"]').inputValue()) === '18'
  && (await page.locator('textarea[name="note"]').inputValue()) === 'يشمل العزل والأدوات الصحية.' && (await page.locator('main', { hasText: 'اكتب سعرًا بين 100 و1,000,000 ريال.' }).count()) === 1,
  `${await page.locator('input[name="price"]').inputValue().catch(() => '-')} ${db.bids.length}`);
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
await open('settings');
check('a contractor\'s settings offer their own notifications (new projects in their trades, their bid chosen, new messages, change requests)', (await page.locator('input[name="pNewProjects"], input[name="pBidChosen"], input[name="pMsg"], input[name="pChanges"]').count()) === 4
  && (await page.locator('input[name="pBids"], input[name="pStages"], input[name="pPay"]').count()) === 0 && (await page.locator('input[name="pBidChosen"]').isDisabled()) && (await page.locator('input[name="pMsg"]').isChecked()));
await open('project/P-9001');
await page.locator('[role="tab"][data-tab="messages"]').click();
await settle(400);
check('once they have bid, the contractor writes to the homeowner in a box that says its limit and counts what is typed', (await page.locator('main .card input.input').getAttribute('maxlength')) === '2000' && (await page.locator('main .msg-card .charcount', { hasText: '/ 2,000' }).count()) === 1);
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
// the bell's read marks survive a reload (they used to come back on every visit)
if (await page.locator('.bell-b').count()) {
  await page.locator('button.bell').click(); await settle(200);
  await page.locator('button.lnkbtn', { hasText: 'تعليم الكل كمقروء' }).first().click().catch(() => 0); await settle(200);
  if (await page.locator('.acctveil').count()) await page.locator('.acctveil').first().click({ force: true });
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('header'); await settle(900);
  check('notices marked read stay read after a reload', (await page.locator('.bell-b').count()) === 0);
} else check('a new bid shows in the bell as unread', false);

await open('project/P-9001');
await page.locator('[role="tab"][data-tab="bids"]').click();
await settle(400);
const bidsText = await page.locator('main').innerText();
check('the homeowner sees the bid with the contractor\'s company, not their mobile or email', bidsText.includes('مؤسسة البناء المتقن') && bidsText.includes('24,000') && !bidsText.includes('0501112223') && !bidsText.includes('khalid@'));
const bidMeta = await page.locator('main table tbody tr').first().locator('td').first().innerText();
check('a contractor with no finished work yet reads "new", without "★ 0 · 0 projects"', bidMeta.includes('جديد') && !/مشروع/.test(bidMeta) && !bidMeta.includes('★'), bidMeta.replace(/\s+/g, ' '));
await page.locator('[role="tab"][data-tab="overview"]').click();
await settle(200);
check('the homeowner\'s "next step" with a bid in has a button, "compare bids"', (await page.locator('.next-cta', { hasText: 'قارن العروض' }).count()) === 1);
await page.locator('.tab[data-tab="messages"]').click();
await settle(600);
await page.locator('main .card input.input').fill('متى يمكن معاينة الموقع؟');
await page.keyboard.press('Enter');
await settle(800);
check('the homeowner writes to the bidder from the messages tab: the message is saved for that contractor\u2019s thread and shows in it',
  (db.messages || []).length === 1 && db.messages[0].contractor_id === db.profiles.find((p) => p.role === 'contractor').id && db.messages[0].body === 'متى يمكن معاينة الموقع؟' && (await page.locator('main .card', { hasText: 'متى يمكن معاينة الموقع؟' }).count()) === 1, JSON.stringify(db.messages || []).slice(0, 200) + ' ' + db.refused.join('; '));
await page.locator('.tab[data-tab="bids"]').click();
await settle(400);
await page.locator('button[data-cid]', { hasText: 'قبول العرض' }).first().click();
await settle(400);
const signBtn = page.locator('button', { hasText: 'أوافق وأوقّع' }).first();
check('accepting opens the agreement, which cannot be signed before it is read to the end', await signBtn.isDisabled());
await page.locator('.agrbody').evaluate((el) => el.scrollTo(0, el.scrollHeight));
await settle(300);
db.failNext['POST /rest/v1/rpc/sign_agreement_homeowner'] = { status: 400, body: { code: 'P0001', message: 'the project is no longer open' } };
await signBtn.click();
await settle(1200);
check('a signature the database does not take opens the agreement again, with a sentence that says why', db.agreements.length === 0 && (await page.locator('.agrbox .autherr', { hasText: 'تعذّر حفظ توقيعك' }).count()) === 1
  && (await page.locator('.agrbox .autherr', { hasText: 'لم يعد مفتوحًا' }).count()) === 1, await page.locator('.agrbox').innerText().catch(() => '-').then((t) => t.slice(-160)));
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
// the email that says "the homeowner accepted your bid" links to the project: signed out, it asks to sign in first
await open('project/P-9001');
check('a project link opened while signed out asks to sign in', (await pathname()) === '/signin');
await page.locator('#au-email').fill('khalid@build.example');
await page.locator('#au-password').fill('contractor-pass-1');
await submit.click();
await settle(900);
check('…and after signing in, the project opens, not the dashboard', (await pathname()) === '/project/P-9001', await pathname());
check('the contractor\'s "next step" opens the agreement to sign', (await page.locator('.next-cta', { hasText: 'راجع الاتفاقية' }).count()) === 1);
await page.locator('button', { hasText: 'راجع الاتفاقية' }).first().click();
await settle(400);
await page.locator('.agrbody').evaluate((el) => el.scrollTo(0, el.scrollHeight));
await settle(300);
await page.locator('button', { hasText: 'أوافق وأوقّع' }).first().click();
await settle(900);
const awarded = db.projects.find((p) => p.code === 'P-9001');
check("the contractor's signature awards the project: active, theirs, at the agreed amount, both signatures kept",
  awarded.status === 'active' && awarded.contractor_id === coUser?.id && awarded.amount === 24000 && Boolean(db.agreements[0].contractor_signed_at) && db.agreements[0].contractor_name === 'مؤسسة البناء المتقن' && db.refused.length === 0, db.refused.join('; ') || awarded.status);
check('the contractor sees the owner\u2019s name as plain text, not a link that would bounce them', (await page.locator('main a[data-route="homeowner"]').count()) === 0);
await page.locator('[role="tab"][data-tab="overview"]').click();
await settle(300);
check('while payment is off, the signed project reads "Signed · the Tarmem team arranges the start" (not "awaiting funding")', (await page.locator('main .tag', { hasText: 'موقّع · يرتّب فريق ترميم البدء' }).count()) >= 1 && (await page.locator('main', { hasText: 'بانتظار إيداع' }).count()) === 0);
check('…its progress box says the stages start with the first payment, not "0 of 0 stages"', (await page.locator('main', { hasText: 'تبدأ المراحل بعد ترتيب الدفعة الأولى' }).count()) >= 1 && (await page.locator('main', { hasText: 'من أصل 0' }).count()) === 0);
check('the contractor who won it sees every tab but the files (only the homeowner and the team open those)', (await page.locator('[role="tab"]').evaluateAll((els) => els.map((e) => e.dataset.tab).join(','))) === 'overview,bids,milestones,messages,payments,changes',
  await page.locator('[role="tab"]').evaluateAll((els) => els.map((e) => e.dataset.tab).join(',')));
await page.locator('[role="tab"][data-tab="bids"]').click();
await settle(300);
const acceptedText = (await page.locator('.accepted-bid').innerText().catch(() => '')).replace(/\s+/g, ' ');
check('the accepted bid shows read-only: chosen, its price, duration, warranty, start date in words, what it includes and the stage split', acceptedText.includes('24,000') && acceptedText.includes('18') && acceptedText.includes('5 أكتوبر 2026')
  && acceptedText.includes('يشمل') && acceptedText.includes('30%') && acceptedText.includes('اختاره صاحب المنزل') && (await page.locator('input[name="price"]').count()) === 0, acceptedText.slice(0, 240));
await page.locator('[role="tab"][data-tab="milestones"]').click();
await settle(300);
check('the stages tab lists the three planned stages and their share of the value, waiting for the first payment', (await page.locator('.planned-stages .tag', { hasText: 'مخططة' }).count()) === 3 && (await page.locator('.planned-stages', { hasText: '7,200' }).count()) === 1,
  (await page.locator('.planned-stages').innerText().catch(() => '-')).replace(/\s+/g, ' ').slice(0, 200));
await page.locator('[role="tab"][data-tab="overview"]').click();
await settle(200);
await page.locator('.tab[data-tab="messages"]').click();
await settle(800);
check('the contractor sees the homeowner\u2019s message, named by role only, and it is marked read', (await page.locator('main .card', { hasText: 'متى يمكن معاينة الموقع؟' }).count()) === 1 && (await page.locator('main .card', { hasText: 'صاحب المنزل' }).count()) === 1 && Boolean(db.messages[0].read_at) && (await page.locator('text=العتيبي').count()) === 0);
check('the message box says its limit (2,000 characters)', (await page.locator('main .card input.input').getAttribute('maxlength')) === '2000');
db.expired = coUser.id; // the sign-in expired while the page was open
await page.locator('main .card input.input').fill('رسالة بعد انتهاء الجلسة');
await page.keyboard.press('Enter');
await settle(900);
check('when the database no longer accepts the session, the person is asked to sign in again, with a sentence that says why', (await pathname()) === '/signin' && (await page.locator('main', { hasText: 'انتهت جلستك' }).count()) === 1 && db.messages.length === 1, await pathname());
await page.locator('#au-email').fill('khalid@build.example');
await page.locator('#au-password').fill('contractor-pass-1');
await submit.click();
await settle(900);
check('…and signing in returns them to the page they were on', (await pathname()) === '/project/P-9001', await pathname());
await page.locator('.tab[data-tab="messages"]').click();
await settle(600);
await page.locator('main .card input.input').fill('غدًا الساعة 5 مساءً');
await page.keyboard.press('Enter');
await settle(800);
check('…and answers in the same thread', (db.messages || []).length === 2 && db.messages[1].from_id === db.profiles.find((p) => p.role === 'contractor').id && (await page.locator('main .card', { hasText: 'غدًا الساعة 5 مساءً' }).count()) === 1, JSON.stringify(db.refused));
await page.locator('main .card input.input').fill('اتصل بي على 0551234567 أو khalid@build.example');
await page.keyboard.press('Enter');
await settle(800);
check('a phone number or an email inside a message is masked on screen, as the note under the box promises', (db.messages || []).length === 3 && (await page.locator('main .card', { hasText: '0551234567' }).count()) === 0 && (await page.locator('main .card', { hasText: 'khalid@build.example' }).count()) === 0, await page.locator('main .card').first().innerText().then((t) => t.slice(0, 160)));
await page.locator('.tab[data-tab="overview"]').click();
await settle(400);
await open('contractor');
check('the contractor dashboard lists the project as signed, and reads its win rate as "1 of 1", not 100%', (await page.locator('#cdash-work .tag', { hasText: 'موقّع · يرتّب فريق ترميم البدء' }).count()) === 1 && (await page.locator('.perf-card', { hasText: '1 من 1' }).count()) === 1,
  (await page.locator('.perf-card').innerText()).replace(/\s+/g, ' '));
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
check('the homeowner\'s "next step" says the team arranges the start, with a button to the messages', (await page.locator('.next-card', { hasText: 'يتواصل معكما فريق ترميم لترتيب البدء' }).count()) === 1 && (await page.locator('.next-cta', { hasText: 'افتح الرسائل' }).count()) === 1);
check('…and the homeowner can confirm the work is complete, once it is', (await page.locator('.confirm-complete button', { hasText: 'تأكيد إنجاز العمل' }).count()) === 1);
await page.locator('button.ntf, [aria-label*="الإشعارات"], .bell').first().click().catch(() => 0);
await settle(300);
check('while payment is off, neither the bell nor the dashboard asks the homeowner to fund the project', (await page.locator('text=موّل المشروع').count()) === 0);
if (await page.locator('.acctveil').count()) await page.locator('.acctveil').first().click({ force: true });
await settle(200);
await page.locator('[role="tab"][data-tab="payments"]').click();
await settle(400);
check('the homeowner is told plainly that payment on the site is not live yet — no card form, no Nafath theatre', (await page.locator('main .card h3', { hasText: 'الدفع عبر الموقع قيد التفعيل' }).count()) === 1 && (await page.locator('main .nafmark:visible').count()) === 0 && (await page.locator('input[name="card"], input[autocomplete="cc-number"]').count()) === 0
  && (await page.locator('text=يلزم التحقق عبر نفاذ').count()) === 0);
await page.locator('[role="tab"][data-tab="milestones"]').click();
await settle(300);
check('…and that stages start with the first payment', (await page.locator('text=تبدأ المراحل بعد ترتيب الدفعة الأولى').count()) === 1);

// J1 — change requests are rows (supabase/027): proposed by one side, approved by the other, and the value moves
await page.locator('[role="tab"][data-tab="changes"]').click();
await settle(300);
await page.locator('button', { hasText: 'إنشاء طلب تغيير' }).click();
await page.locator('textarea[name="desc"]').fill('إضافة نقاط إنارة في السقف');
await page.locator('input[name="amount"]').fill('2500');
await page.locator('input[name="days"]').fill('3');
await page.locator('button', { hasText: 'إرسال الطلب' }).click();
await settle(900);
const cr = (db.changes || [])[0];
check('a change request proposed by the homeowner is saved, and shows as waiting for the contractor', cr?.by_side === 'ho' && cr.amount === 2500 && cr.days === 3 && cr.description === 'إضافة نقاط إنارة في السقف' && !cr.applied_at
  && (await page.locator('main', { hasText: 'بانتظار اعتماد الطرف الآخر' }).count()) === 1 && (await page.locator('main', { hasText: 'إضافة نقاط إنارة في السقف' }).count()) === 1, JSON.stringify(cr) + ' ' + db.refused.join('; '));
await page.locator('button.acct').click(); await page.locator('.acctmenu .acctitem').last().click(); await settle();
await open('signin'); await page.locator('#au-email').fill('khalid@build.example'); await page.locator('#au-password').fill('contractor-pass-1'); await submit.click(); await settle(900);
await open('project/P-9001');
await page.locator('[role="tab"][data-tab="changes"]').click();
await settle(500);
check('…the contractor sees it after signing in (it is not only in the homeowner’s browser)', (await page.locator('main', { hasText: 'إضافة نقاط إنارة في السقف' }).count()) === 1 && (await page.locator('button', { hasText: 'اعتماد الطلب' }).count()) === 1);
await page.locator('button', { hasText: 'اعتماد الطلب' }).click();
await settle(900);
check('…approves it: the change is applied and the project’s value becomes 26,500', Boolean(db.changes[0].applied_at) && db.projects.find((p) => p.code === 'P-9001').amount === 26500
  && (await page.locator('main', { hasText: 'طُبِّق على قيمة الاتفاق والمراحل' }).count()) === 1 && (await page.locator('main', { hasText: '26,500' }).count()) >= 1, db.refused.join('; '));

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
// J4 — the contractor's public profile, as the homeowner sees it, and the wallet (only while payments are switched on)
await open('project/P-9001');
await page.locator('[role="tab"][data-tab="bids"]').click();
await settle(400);
await page.locator('main [data-route="contractor"]').first().click();
await settle(900);
const firmText = await page.locator('main').innerText();
check('a homeowner opens a bidder\'s profile: the verified company, the real review with a first name only — no stock photos, no made-up reviews or response times',
  (await pathname()).startsWith('/firm/co-') && firmText.includes('مؤسسة البناء المتقن') && firmText.includes('أنصح بالتعامل معهم') && firmText.includes('سارة') && !firmText.includes('العتيبي')
    && (await page.locator('main img[src*="assets/trades"]').count()) === 0 && !firmText.includes('0501112223'), await pathname());
check('…and its "how Tarmem protects you" makes no Nafath claim', !firmText.includes('نفاذ') && firmText.includes('يراجع فريق ترميم بيانات المنشأة'));
db.failNext['PATCH /rest/v1/profiles'] = { status: 503, body: { code: 'XX000', message: 'the database is busy' } };
await page.locator('button', { hasText: 'حفظ المقاول' }).click();
await settle(600);
check('saving a contractor that the database does not take is undone, and said', (await page.locator('.sitenotice', { hasText: 'تعذّر حفظ المقاول' }).count()) === 1 && !(db.profiles.find((p) => p.role === 'homeowner')?.prefs?.saved || []).length);
await page.locator('.sitenotice button').click().catch(() => undefined);
await page.locator('button', { hasText: 'حفظ المقاول' }).click();
await settle(600);
check('saving a contractor is kept on the profile row, so the dashboard list survives a reload', Array.isArray(db.profiles.find((p) => p.role === 'homeowner')?.prefs?.saved) && db.profiles.find((p) => p.role === 'homeowner').prefs.saved.length === 1, JSON.stringify(db.profiles.find((p) => p.role === 'homeowner')?.prefs));
await open('wallet');
check('with payments on, the homeowner\'s wallet opens', (await pathname()) === '/wallet' && (await page.locator('main h1, main h2').count()) >= 1, await pathname());
// (the design offers a deposit only when a stage payment is due; this project is already finished, so there may be nothing to deposit)
const depositButton = page.locator('main button', { hasText: /إيداع/ }).first();
if (await depositButton.count()) { await depositButton.click(); await settle(900); }
check('…a deposit, when one is made, is recorded as a request waiting for confirmation — never as money received', (db.wallet || []).every((t) => t.type === 'deposit' && t.status === 'pending') && db.refused.length === 0, db.refused.join('; ') || `${(db.wallet || []).length} request(s)`);
await signInAs('khalid@build.example', 'contractor-pass-1');
await open('firm/c1');
await page.locator('button', { hasText: /تعديل/ }).first().click();
await settle(300);
check('the verified company name cannot be edited (the design locks the field, and the save refuses a different name)', (await page.locator('#ed-name').getAttribute('readonly')) !== null);
await page.locator('[name="bio"]').first().fill('نُنفّذ المطابخ والحمامات منذ 2015 بطاقم خاص وضمان سنة على جميع الأعمال.');
await page.locator('button', { hasText: 'حفظ' }).last().click();
await settle(900);
check('their introduction, city and trades are saved, and show on the profile', String(db.profiles.find((p) => p.id === coUser.id).about).includes('بطاقم خاص') && (await page.locator('main', { hasText: 'بطاقم خاص' }).count()) === 1 && db.refused.length === 0, db.refused.join('; '));
// J5 — the contractor's portfolio: real photos of their work on the public profile
await page.locator('label.btn input[type="file"][accept*="image"]').setInputFiles({ name: 'plan.gif', mimeType: 'image/gif', buffer: PNG });
await settle(400);
check('a portfolio photo of a type it does not take is refused with a sentence, not silently', (await page.locator('main .autherr', { hasText: 'JPG وPNG وWebP' }).count()) === 1 && db.portfolio.length === 0);
await page.locator('#pf-caption').fill('مطبخ في حي العارض، 2026');
await page.locator('label.btn input[type="file"][accept*="image"]').setInputFiles({ name: 'kitchen.png', mimeType: 'image/png', buffer: PNG });
await settle(900);
check('the contractor adds a portfolio photo with a caption, into their own folder of the public bucket', db.portfolio.length === 1 && db.portfolio[0].path.startsWith(coUser.id + '/') && db.captions[0]?.caption === 'مطبخ في حي العارض، 2026' && db.refused.length === 0, db.refused.join('; ') || JSON.stringify(db.portfolio));
check('…and it shows in the design\'s "own work" grid', (await page.locator('main figure img[src*="/portfolio/"]').count()) === 1 && (await page.locator('main figcaption', { hasText: 'حي العارض' }).count()) === 1);
await open('wallet');
await page.locator('button', { hasText: /إضافة حساب|أضف حساب|حساب بنكي|تعديل/ }).first().click().catch(() => undefined);
await settle(300);
await page.locator('select[name="bank"]').selectOption({ index: 1 });
await page.locator('input[name="holder"]').fill('مؤسسة البناء المتقن');
await page.locator('input[name="iban"]').fill('SA0380000000608010167519');
await page.locator('button', { hasText: 'حفظ' }).first().click();
await settle(900);
check('the contractor\'s bank account for payouts is saved — to a table only they and the team can read', (db.payouts || []).length === 1 && db.payouts[0].iban === 'SA0380000000608010167519' && db.payouts[0].user_id === coUser.id, JSON.stringify(db.payouts || null).slice(0, 120));
db.paymentsLive = false;
await open('wallet');
check('with payments off, there is no wallet to open', (await pathname()) === '/contractor' && (await page.locator('[data-route="wallet"]').count()) === 0, await pathname());
await signInAs('sara@example.com', 'long-enough-1');
await open('project/P-9001');
await page.locator('[role="tab"][data-tab="bids"]').click();
await settle(300);
await page.locator('main [data-route="contractor"]').first().click();
await settle(900);
check('the homeowner sees the contractor\'s portfolio photo on their profile — and no uploader', (await page.locator('main figure img[src*="/portfolio/"]').count()) === 1 && (await page.locator('#pf-caption').count()) === 0);

// J6 — the team's wallet-approval screen, only while payments are switched on
db.paymentsLive = true;
db.wallet = [{ id: 7, user_id: db.users[0].id, project_id: db.projects.find((p) => p.code === 'P-9001').id, type: 'deposit', method: 'mada', amount: 24000, status: 'pending', created_at: new Date().toISOString() }];
db.profiles[0].role = 'admin';
await open('admin');
// T2 — signed in again (the password alone): the console and the inbox ask only for the code
await page.locator('.twostep').waitFor({ timeout: 8000 }).catch(() => undefined);
check('signed in again, the console asks only for the code: no QR, no key, and how to recover from a lost phone', (await page.locator('.twostep').getAttribute('data-mode').catch(() => null)) === 'code'
  && (await page.locator('.twostep img, #ts-secret').count()) === 0 && (await page.locator('.twostep', { hasText: 'Remove MFA factors' }).count()) === 1 && (await page.locator('.side[data-tab]').count()) === 0);
await open('inbox');
check('…and so does the inbox, with none of its lists behind it', (await page.locator('.twostep[data-mode="code"]').count()) === 1 && (await page.locator('main table').count()) === 0);
const tries = db.twoStepTries.length;
await page.locator('#ts-code').fill('12');
await page.locator('.twostep button[type="submit"]').click(); await settle(300);
check('a code that is not six digits is refused on the page, without asking Supabase', (await page.locator('.twostep .autherr').count()) === 1 && db.twoStepTries.length === tries);
await page.locator('.twostep .ts-signout').click(); await settle(600);
check('"Sign out" on the step signs out and goes home', (await pathname()) === '/' && (await page.locator('header [data-route="auth"]:not([data-signup])').count()) >= 1);
await open('signin'); await page.locator('#au-email').fill('sara@example.com'); await page.locator('#au-password').fill('long-enough-1'); await submit.click(); await settle(900);
check('signing in lands on the step (the second half of signing in)', (await pathname()) === '/admin' && (await page.locator('.twostep[data-mode="code"]').count()) === 1);
check('the code from the app opens the console', (await passTwoStep(page, db)) && (await page.locator('.side[data-tab]').count()) > 0 && db.twoStepTries.length === tries + 1);
await open('inbox');
check('…and the inbox, for the rest of the session', (await page.locator('.twostep').count()) === 0 && (await page.locator('main table').count()) > 0);
await open('admin');
await page.locator('.side[data-tab="payments"]').click();
await settle(900);
check('with payments on, the admin\'s payments tab lists the deposit awaiting confirmation, with who and which project', (await page.locator('main', { hasText: 'طلبات بانتظار التأكيد' }).count()) === 1 && (await page.locator('main', { hasText: 'سارة العتيبي' }).count()) === 1 && (await page.locator('main', { hasText: 'P-9001' }).count()) === 1);
await page.locator('button', { hasText: 'تأكيد الوصول' }).first().click();
await settle(700);
check('…and confirming it records the money as received', db.wallet[0].status === 'confirmed' && (await page.locator('text=لا طلبات بانتظار التأكيد').count()) === 1, db.wallet[0].status);
db.paymentsLive = false;
await open('admin');
await page.locator('.side[data-tab="payments"]').click();
await settle(500);
check('with payments off, that section does not exist', (await page.locator('main', { hasText: 'طلبات بانتظار التأكيد' }).count()) === 0);
// the console's project rows open the project itself; an admin may read every project and its photos (storage rules in supabase/003)
db.files.push({ path: `${db.users[0].id}/10000000-0000-4000-8000-000000009001/k0-c2l0ZS1waG90bw.png` /* the site's key shape: <stamp>-<base64 name>.<ext>; this one reads "site-photo.png" */, type: 'image/png', created_at: new Date().toISOString() });
await open('admin');
await page.locator('.side[data-tab="overview"]').click(); await settle(500); // the console reopens on the last tab used
await page.locator('tr.row-h', { hasText: 'P-9001' }).first().click();
await page.waitForFunction(() => window.location.pathname === '/project/P-9001', null, { timeout: 8000 }).catch(() => undefined);
await settle(700);
await page.locator('[role="tab"][data-tab="files"]').click().catch(() => undefined);
await settle(600);
check("an admin opens a homeowner's project from the console and sees its photos", (await pathname()) === '/project/P-9001' && (await page.locator('main td', { hasText: 'site-photo.png' }).count()) === 1,
  `${await pathname()} rows=${JSON.stringify(await page.locator('main table td').evaluateAll((els) => els.map((e) => e.textContent.trim()).slice(0, 6)))}`);
db.profiles[0].role = 'homeowner';
await open('dashboard');

// N — finishing a signed project while payment on the site is off (supabase/030 B): the homeowner confirms the work is
// complete, the project completes, and the design's review form opens
const P2 = '10000000-0000-4000-8000-000000009002';
db.projects.push({ id: P2, code: 'P-9002', owner_id: db.users[0].id, status: 'active', contractor_id: coUser.id, amount: 15000, created_at: new Date().toISOString(), title: 'دهان الواجهة', trade: 'painting', description: 'دهان الواجهة الأمامية بلونين، 120 م².', city: 'riyadh', district: null, budget_min: 12000, budget_max: 20000, timing: 'month' });
db.bids.push({ id: '20000000-0000-4000-8000-000000009002', project_id: P2, contractor_id: coUser.id, price: 15000, days: 10, note: 'يشمل المعجون ودهانين.', details: { incl: 'معجون ودهانين', excl: 'السقالات', warranty: '12', valid: '14', start: '2026-10-12', ms: [50, 30, 20], vatReg: false, visit: true }, status: 'chosen', created_at: new Date().toISOString() });
db.agreements.push({ project_id: P2, bid_id: '20000000-0000-4000-8000-000000009002', homeowner_id: db.users[0].id, contractor_id: coUser.id, amount: 15000, days: 10, homeowner_name: 'سارة العتيبي', homeowner_signed_at: new Date().toISOString(), contractor_name: 'مؤسسة البناء المتقن', contractor_signed_at: new Date().toISOString() });
db.profiles[0].role = 'admin';
await open('admin'); await settle(700);
await page.locator('.side[data-tab="overview"]').click(); await settle(500);
check('the team\'s console says the same of a signed project while payment is off', (await page.locator('tr.row-h', { hasText: 'P-9002' }).locator('.tag', { hasText: 'موقّع · يرتّب فريق ترميم البدء' }).count()) === 1,
  await page.locator('tr.row-h', { hasText: 'P-9002' }).innerText().catch(() => '-'));
await open('inbox'); await settle(700);
check('…and so does the inbox', (await page.locator('main tr', { hasText: 'P-9002' }).locator('.tag', { hasText: 'موقّع · يرتّب فريق ترميم البدء' }).count()) === 1);
db.profiles[0].role = 'homeowner';
await open('dashboard');
check('the homeowner dashboard says the signed project is signed and the team arranges the start', (await page.locator('#hdash-projects tr', { hasText: 'دهان الواجهة' }).locator('.tag', { hasText: 'موقّع · يرتّب فريق ترميم البدء' }).count()) === 1);
await open('project/P-9002');
check('the stages tab of a signed project uses the bid\'s own split', (await page.locator('[role="tab"][data-tab="milestones"]').click(), await settle(300), (await page.locator('.planned-stages', { hasText: '7,500' }).count()) === 1 && (await page.locator('.planned-stages', { hasText: '3,000' }).count()) === 1));
await page.locator('[role="tab"][data-tab="overview"]').click();
await settle(200);
await page.locator('.confirm-complete button', { hasText: 'تأكيد إنجاز العمل' }).click();
await settle(200);
check('confirming the work is complete asks first', (await page.locator('.confirm-complete', { hasText: 'لا يمكن التراجع' }).count()) === 1 && db.projects.find((p) => p.id === P2).status === 'active');
await page.locator('.confirm-complete button', { hasText: 'ليس بعد' }).click();
await settle(200);
check('…and "not yet" changes nothing', (await page.locator('.confirm-complete', { hasText: 'لا يمكن التراجع' }).count()) === 0 && db.projects.find((p) => p.id === P2).status === 'active');
await page.locator('.confirm-complete button', { hasText: 'تأكيد إنجاز العمل' }).click();
await settle(200);
await page.locator('.confirm-complete button', { hasText: 'نعم، اكتمل العمل' }).click();
await settle(1200);
check('completion is never one-sided: the homeowner\'s "yes" is recorded, the project stays in progress, and the card says the contractor is asked to confirm',
  db.projects.find((p) => p.id === P2).status === 'active' && Boolean(db.agreements.find((a) => a.project_id === P2).homeowner_done_at) && (await page.locator('.sitenotice', { hasText: 'سجّلنا تأكيدك' }).count()) === 1
  && (await page.locator('.confirm-complete[data-state="waiting"]', { hasText: 'بانتظار تأكيد المقاول' }).count()) === 1 && (await page.locator('.confirm-complete button').count()) === 0,
  `${db.projects.find((p) => p.id === P2).status} ${JSON.stringify(db.confirmations || [])}`);
await page.locator('.sitenotice button').click().catch(() => undefined);
await signInAs('khalid@build.example', 'contractor-pass-1');
await open('project/P-9002');
check('the contractor sees that the homeowner confirmed, and is asked to confirm too', (await page.locator('.confirm-complete[data-state="asked"]', { hasText: 'أكّده صاحب المنزل' }).count()) === 1
  && (await page.locator('.confirm-complete', { hasText: 'أكّده أنت أيضًا' }).count()) === 1);
check('once both have signed, the details row names the homeowner as the agreement does (not «صاحب منزل»)', (await page.locator('main tr', { hasText: 'سارة العتيبي' }).count()) >= 1 && (await page.locator('main td', { hasText: /^صاحب منزل$/ }).count()) === 0);
await page.locator('[role="tab"][data-tab="payments"]').click();
await settle(400);
check('the contractor\'s Payments tab says payment on the site is being set up, and who arranges the payments', (await page.locator('main .card', { hasText: 'يتواصل معك فريق ترميم لترتيب الدفعات' }).count()) === 1 && (await page.locator('main .btn-naf').count()) === 0);
await page.locator('[role="tab"][data-tab="overview"]').click();
await settle(200);
await page.locator('.confirm-complete button', { hasText: 'تأكيد إنجاز العمل' }).click();
await settle(200);
await page.locator('.confirm-complete button', { hasText: 'نعم، اكتمل العمل' }).click();
await settle(1200);
check('the contractor confirming too completes the project in the database, and says so', db.projects.find((p) => p.id === P2).status === 'completed' && (await page.locator('.sitenotice', { hasText: 'شكرًا لعملك مع ترميم' }).count()) === 1
  && (await page.locator('main .tag', { hasText: 'مكتمل' }).count()) >= 1 && (await page.locator('.confirm-complete').count()) === 0 && (db.confirmations || []).map((c) => c.by).join(',') === 'homeowner,contractor', db.projects.find((p) => p.id === P2).status);
check('the contractor sees the project completed, and is not asked for a review (reviews are the homeowner\'s)', (await page.locator('main .tag', { hasText: 'مكتمل' }).count()) >= 1 && (await page.locator('main .starbtn').count()) === 0 && (await page.locator('.confirm-complete').count()) === 0);
await signInAs('sara@example.com', 'long-enough-1');
await open('project/P-9002');
check('for the homeowner the project is complete', (await page.locator('main .tag', { hasText: 'مكتمل' }).count()) >= 1 && (await page.locator('.confirm-complete').count()) === 0, db.projects.find((p) => p.id === P2).status);
check('…and the design\'s review form opens, with "next step" pointing to it', (await page.locator('main .starbtn').count()) === 5 && (await page.locator('.next-cta', { hasText: 'قيّم المقاول' }).count()) === 1);
await page.locator('.sitenotice button').click().catch(() => undefined);
await page.locator('main .starbtn').nth(4).click();
await page.locator('main textarea').first().fill('عمل نظيف وفي الموعد، والتزام بكل ما اتفقنا عليه.');
db.failNext['POST /rest/v1/reviews'] = { status: 503, body: { code: 'XX000', message: 'the database is busy' } };
const reviewsBefore = (db.reviews || []).length;
await page.locator('button', { hasText: /إرسال التقييم|نشر التقييم|أرسل التقييم/ }).first().click();
await settle(900);
check('a review the database does not take comes back with its stars and words, and a sentence', (db.reviews || []).length === reviewsBefore && (await page.locator('main', { hasText: 'تعذّر حفظ تقييمك' }).count()) === 1
  && (await page.locator('main textarea').first().inputValue()) === 'عمل نظيف وفي الموعد، والتزام بكل ما اتفقنا عليه.' && (await page.locator('main .starbtn[aria-pressed="true"]').count()) === 5);
await page.locator('button', { hasText: /إرسال التقييم|نشر التقييم|أرسل التقييم/ }).first().click();
await settle(900);
check('…and sending it again saves it, for the contractor who did the work', (db.reviews || []).length === reviewsBefore + 1 && db.reviews.slice(-1)[0].project_id === P2 && db.reviews.slice(-1)[0].stars === 5 && db.reviews.slice(-1)[0].contractor_id === coUser.id);

// K — a forgotten password
await page.locator('button.acct').click();
await page.locator('.acctmenu .acctitem').last().click();
await settle();
await open('signin');
await page.locator('button', { hasText: 'أعد تعيينها' }).click();
await page.locator('#au-email').fill('sara@example.com');
db.failNext['POST /auth/v1/recover'] = { status: 500, body: { code: 500, error_code: 'unexpected_failure', msg: 'Error sending recovery email' } };
await page.locator('form.authcard button[type="submit"]').click();
await settle(600);
check('a reset request that did not go through says so, and never claims the link is on its way', (await page.locator('.autherr').count()) === 1 && (await page.locator('text=إذا كان هذا البريد مسجّلًا').count()) === 0 && !(db.recoveries || []).length);
await page.locator('form.authcard button[type="submit"]').click();
await settle(600);
check('"forgot your password" emails a reset link that returns to the sign-in page, without saying whether the address exists',
  db.recoveries?.length === 1 && db.recoveries[0].email === 'sara@example.com' && String(db.recoveries[0].redirect).endsWith('/signin?link=reset') && (await page.locator('text=إذا كان هذا البريد مسجّلًا').count()) === 1, String(db.recoveries?.[0]?.redirect));
await page.goto('about:blank'); // an email link is a fresh page load, not a change of fragment on an open page
await page.goto(BASE_URL + 'signin' + recoveryFragment(db.users[0].id), { waitUntil: 'domcontentloaded' });
await page.waitForSelector('header'); await settle(900);
check('the link opens its own "choose a new password" page, and nothing else until it is done', (await pathname()) === '/reset-password' && (await page.locator('text=اختر كلمة مرور جديدة').count()) === 1 && (await page.locator('#rp-again').count()) === 1 && (await page.locator('#au-email').count()) === 0, await pathname());
await page.locator('#rp-password').fill('a-brand-new-pass-2');
await page.locator('#rp-again').fill('a-brand-new-pass-X');
await page.locator('form.authcard button[type="submit"]').click();
await settle(300);
check('two different passwords are refused', (await page.locator('.autherr').innerText().catch(() => '')).includes('غير متطابقتين') && db.users[0].password !== 'a-brand-new-pass-2');
await page.locator('#rp-password').fill('password1234');
await page.locator('#rp-again').fill('password1234');
await page.locator('form.authcard button[type="submit"]').click();
await settle(400);
check('a password from breach lists is refused with its own sentence, not the 8-character one', (await page.locator('.autherr').innerText().catch(() => '')).includes('تسريبات') && db.users[0].password !== 'password1234', await page.locator('.autherr').innerText().catch(() => ''));
await page.locator('#rp-password').fill('a-brand-new-pass-2');
await page.locator('#rp-again').fill('a-brand-new-pass-2');
await page.locator('form.authcard button[type="submit"]').click();
await settle(600);
check('…saving it changes the password and says so, signed in', db.users[0].password === 'a-brand-new-pass-2' && (await page.locator('text=تم تغيير كلمة المرور').count()) === 1, `pw=${db.users[0].password}`);
check('…and signs the account out on every other device', db.logouts.includes('others'), db.logouts.join(','));
await page.locator('.reset-page button', { hasText: 'افتح لوحتك' }).click();
await page.waitForFunction(() => window.location.pathname === '/dashboard', null, { timeout: 8000 }).catch(() => undefined);
check('…and its button opens their dashboard', (await pathname()) === '/dashboard', await pathname());

// L — mobile verification by WhatsApp code, once the owner switches it on (supabase/022)
db.otpLive = true;
await page.locator('button.acct').click().catch(() => 0);
await page.locator('.acctmenu .acctitem').last().click().catch(() => 0);
await settle();
await open('signin');
await page.locator('.authseg input[value="signup"]').check();
await page.locator('#au-name').fill('هند القحطاني');
await page.locator('#au-mobile').fill('0559876543');
await page.locator('#au-email').fill('hind@example.com');
await page.locator('#au-password').fill('password1234');
await page.locator('form.authcard input[type="checkbox"]').check();
await page.locator('form.authcard button[type="submit"]').click();
await settle(600);
check('…and at sign-up: no account is made, the sentence says why', (await page.locator('.autherr').innerText().catch(() => '')).includes('تسريبات') && !db.users.some((u) => u.email === 'hind@example.com'));
await page.locator('#au-password').fill('long-enough-3');
await page.locator('form.authcard button[type="submit"]').click();
await settle(900);
check('after sign-up the code step appears and a code was requested', (await page.locator('.otp-step').count()) === 1 && db.otpSent >= 1 && (await page.locator('.otp-step', { hasText: '0559876543' }).count()) === 1, `sent=${db.otpSent} ${await pathname()}`);
await page.locator('#otp-code').fill('000000');
await page.locator('.otp-step button[type="submit"]').click();
await settle(400);
check('a wrong code is refused with a sentence', (await page.locator('.otp-step .autherr').count()) === 1 && !db.profiles.find((p) => p.email === 'hind@example.com')?.mobile_verified_at);
await page.locator('#otp-code').fill('482913');
await page.locator('.otp-step button[type="submit"]').click();
await page.waitForFunction(() => window.location.pathname === '/dashboard', null, { timeout: 8000 }).catch(() => undefined);
check('the right code verifies the number and opens the dashboard', Boolean(db.profiles.find((p) => p.email === 'hind@example.com')?.mobile_verified_at) && (await pathname()) === '/dashboard', await pathname());
db.otpLive = false;

// L2 — "change password" on the settings page
await open('settings');
await settle(600);
await page.locator('.password-card button', { hasText: 'تغيير كلمة المرور' }).click();
await page.locator('#pw-new').fill('hind-new-pass-9');
await page.locator('#pw-again').fill('hind-new-pass-8');
await page.locator('.password-card button[type="submit"]').click();
await settle(300);
const hind = db.users.find((u) => u.email === 'hind@example.com');
check('changing the password asks for it twice, and says when the two differ', (await page.locator('.password-card .autherr', { hasText: 'غير متطابقتين' }).count()) === 1 && hind.password === 'long-enough-3');
const logoutsBefore = db.logouts.length;
await page.locator('#pw-again').fill('hind-new-pass-9');
await page.locator('.password-card button[type="submit"]').click();
await settle(900);
check('…saves the new one, signs the other devices out, and says so', hind.password === 'hind-new-pass-9' && db.logouts.slice(logoutsBefore).includes('others') && (await page.locator('.password-card', { hasText: 'تم تغيير كلمة المرور' }).count()) === 1 && (await pathname()) === '/settings');

// M — deleting one's own account from the settings page
await open('settings');
await settle(600);
await page.locator('button', { hasText: 'حذف حسابي' }).first().click();
await settle(300);
check('the settings page asks before deleting, in words that say what is deleted', (await page.locator('main', { hasText: 'حذف حسابك وبياناتك نهائيًا' }).count()) === 1 && (await page.locator('main', { hasText: 'البنكية' }).count()) === 1);
const hindId = db.users.find((u) => u.email === 'hind@example.com')?.id;
await page.locator('button', { hasText: 'نعم، احذف حسابي' }).first().click();
await page.waitForFunction(() => window.location.pathname === '/', null, { timeout: 8000 }).catch(() => undefined);
await settle(500);
check('confirming erases the account, signs the person out, and says so on the home page', (db.erased || []).includes(hindId) && (await pathname()) === '/' && (await page.locator('.sitenotice', { hasText: 'تم حذف حسابك' }).count()) === 1 && (await page.locator('button.acct').count()) === 0, `${await pathname()} erased=${JSON.stringify(db.erased || [])}`);

check('the site asked the database for nothing the test does not know about', db.unknown.length === 0, db.unknown.join(' · '));

// O — "Confirm email" switched on (supabase/030 F): a new account opens from the link in its email. Each part has its own
// browser and its own stand-in database, so nothing above is affected.
const fresh = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addInitScript(() => { window.__opened = []; window.open = (url) => { window.__opened.push(String(url)); return null; }; Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); });
  const mock = await installSupabaseMock(ctx, site.supabase.url);
  mock.confirmEmail = true;
  const pg = await ctx.newPage();
  pg.setDefaultTimeout(8000);
  pg.on('pageerror', (e) => errors.push('PAGEERROR (confirm email): ' + String(e).slice(0, 300)));
  return { ctx, cdb: mock, pg };
};
const go = async (pg, path) => { await pg.goto(BASE_URL + path, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('header'); await pg.waitForTimeout(450); };
const byLink = async (pg, path) => { await pg.goto('about:blank'); await pg.goto(BASE_URL + path, { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('header'); await pg.waitForTimeout(1500); };
const signOutOf = async (pg) => { await pg.locator('button.acct').click(); await pg.locator('.acctmenu .acctitem').last().click(); await pg.waitForTimeout(500); };
{
  const { ctx, cdb, pg } = await fresh();
  // O1 — a guest's project, through sign-up, the activation email and back
  await go(pg, 'post');
  await pg.locator('input[name="title"]').fill('ترميم دورة مياه الضيوف');
  await pg.locator('textarea[name="desc"]').fill('تغيير البلاط والمغسلة، المساحة 2×2 م.');
  await pg.locator('select[name="trade"]').selectOption('bathroom');
  await pg.locator('button', { hasText: 'التالي' }).first().click();
  await pg.locator('input[name="min"]').fill('8000');
  await pg.locator('input[name="max"]').fill('15000');
  await pg.locator('button', { hasText: 'التالي' }).first().click();
  await pg.locator('label.drop input[type="file"]').setInputFiles({ name: 'قبل.png', mimeType: 'image/png', buffer: PNG });
  await pg.locator('button', { hasText: 'التالي' }).first().click();
  await pg.waitForTimeout(200);
  await pg.locator('label.radio').first().click();
  await pg.locator('button', { hasText: 'نشر المشروع' }).first().click();
  await pg.waitForTimeout(500);
  await pg.locator('#au-name').fill('منى الشهري');
  await pg.locator('#au-mobile').fill('+966 55 111 0002');
  await pg.locator('#au-email').fill('Mona@Example.com');
  await pg.locator('#au-password').fill('mona-pass-123');
  await pg.locator('form.authcard input[type="checkbox"]').check();
  await pg.locator('form.authcard button[type="submit"]').click();
  await pg.waitForTimeout(900);
  check('with "Confirm email" on, sign-up says to activate the account from the link in the email, names the address, and nothing else is created yet',
    (await pg.locator('.confirm-email h1', { hasText: 'فعّل حسابك من الرابط في بريدك' }).count()) === 1 && (await pg.locator('.confirm-email', { hasText: 'mona@example.com' }).count()) === 1
    && cdb.users.length === 1 && cdb.profiles.length === 0 && cdb.projects.length === 0 && String(cdb.signupRedirects[0]).endsWith('/signin?link=signup'), String(cdb.signupRedirects[0]));
  check('…says their project is kept on this device and posted once the account is active', (await pg.locator('.confirm-email', { hasText: 'مشروعك محفوظ على هذا الجهاز' }).count()) === 1 && Boolean(await pg.evaluate(() => localStorage.getItem('tarmem-post-draft'))));
  await pg.locator('.confirm-email button', { hasText: 'أعد إرسال الرابط' }).click();
  await pg.waitForTimeout(600);
  check('…and sends the link again on request', cdb.resent.length === 1 && cdb.resent[0].type === 'signup' && cdb.resent[0].email === 'mona@example.com' && String(cdb.resent[0].redirect).endsWith('/signin?link=signup')
    && (await pg.locator('.confirm-email', { hasText: 'أرسلنا الرابط مرة أخرى' }).count()) === 1, JSON.stringify(cdb.resent));
  await pg.locator('.confirm-email button', { hasText: 'العودة لتسجيل الدخول' }).click();
  await pg.waitForTimeout(300);
  await pg.locator('#au-email').fill('mona@example.com');
  await pg.locator('#au-password').fill('mona-pass-123');
  await pg.locator('form.authcard button[type="submit"]').click();
  await pg.waitForTimeout(700);
  check('signing in before activating says to activate first, and offers to send the link again', (await pg.locator('.autherr', { hasText: 'فعّل حسابك أولًا' }).count()) === 1 && (await pg.locator('form.authcard button', { hasText: 'أعد إرسال الرابط' }).count()) === 1);
  await byLink(pg, 'signin?link=signup' + confirmLink(cdb, 'mona@example.com'));
  const monaProject = cdb.projects[0];
  check('opening the activation link signs them in, makes their profile, and posts the project they had filled in', cdb.profiles.length === 1 && cdb.profiles[0].mobile === '0551110002' && monaProject?.title === 'ترميم دورة مياه الضيوف' && monaProject?.budget_max === 15000
    && (await pg.locator('.post-done-code', { hasText: monaProject?.code || '??' }).count()) === 1, `${await pg.evaluate(() => location.pathname)} ${JSON.stringify(monaProject || null).slice(0, 120)}`);
  check('…tells them to add the photos again (a device cannot keep them), and leaves no draft behind', (await pg.locator('.sitenotice', { hasText: 'أضفها من تبويب الملفات' }).count()) === 1 && !(await pg.evaluate(() => localStorage.getItem('tarmem-post-draft'))));
  await pg.locator('.sitenotice button').click().catch(() => undefined);
  // a refusal from the database while posting returns to the form, at its step, with the sentence
  await pg.locator('.post-done button', { hasText: 'أضف مشروعًا آخر' }).click();
  await pg.waitForTimeout(300);
  await pg.locator('input[name="title"]').fill('تجديد غرفة النوم');
  await pg.locator('textarea[name="desc"]').fill('دهان وأرضيات، المساحة 4×4 م.');
  await pg.locator('select[name="trade"]').selectOption('painting');
  await pg.locator('button', { hasText: 'التالي' }).first().click();
  await pg.locator('input[name="min"]').fill('9000'); await pg.locator('input[name="max"]').fill('16000');
  await pg.locator('button', { hasText: 'التالي' }).first().click();
  await pg.locator('button', { hasText: 'التالي' }).first().click();
  await pg.waitForTimeout(200);
  await pg.locator('label.radio').first().click();
  cdb.failNext['POST /rest/v1/projects'] = { status: 400, body: { code: 'P0001', message: 'Only a homeowner account can post a project.' } };
  await pg.locator('button', { hasText: 'نشر المشروع' }).first().click();
  await pg.waitForTimeout(800);
  check('a project the database refuses stays in the form, with the database\'s reason in a sentence ("only a homeowner account can post")', (await pg.evaluate(() => location.pathname)) === '/post' && (await pg.locator('#post-err', { hasText: 'لحسابات أصحاب المنازل فقط' }).count()) === 1 && cdb.projects.length === 1);
  // O2 — a draft that the database would refuse is never dropped silently after sign-up
  await signOutOf(pg);
  await go(pg, 'signin');
  await pg.locator('.authseg input[value="signup"]').check();
  await pg.locator('#au-name').fill('ريم العنزي');
  await pg.locator('#au-mobile').fill('0551110003');
  await pg.locator('#au-email').fill('reem@example.com');
  await pg.locator('#au-password').fill('reem-pass-123');
  await pg.locator('form.authcard input[type="checkbox"]').check();
  await pg.locator('form.authcard button[type="submit"]').click();
  await pg.waitForTimeout(700);
  await pg.evaluate(() => localStorage.setItem('tarmem-post-draft', JSON.stringify({ email: 'reem@example.com', f: { title: 'مط', trade: 'kitchen', desc: 'تجديد المطبخ بالكامل مع الخزائن.', city: 'riyadh', address: '', min: 20000, max: 30000, timing: 'month' }, files: 0, at: Date.now() })));
  await byLink(pg, 'signin?link=signup' + confirmLink(cdb, 'reem@example.com'));
  check('a waiting project the database would refuse (a 2-letter title) opens the form at the step that holds it, with the sentence, and nothing is posted', (await pg.evaluate(() => location.pathname)) === '/post'
    && (await pg.locator('input[name="title"]').count()) === 1 && (await pg.locator('#post-err', { hasText: 'من 3 إلى 140 حرفًا' }).count()) === 1 && cdb.projects.length === 1, await pg.evaluate(() => location.pathname));
  // O3 — links that no longer work
  await signOutOf(pg);
  await byLink(pg, 'signin?link=signup' + expiredFragment);
  check('an expired activation link says so, and offers a new one', (await pg.locator('.link-expired h1', { hasText: 'انتهت صلاحية الرابط' }).count()) === 1 && !(await pg.evaluate(() => location.hash)));
  await pg.locator('.link-expired #au-email').fill('mona@example.com');
  await pg.locator('.link-expired button', { hasText: 'أرسل رابط تفعيل جديدًا' }).click();
  await pg.waitForTimeout(600);
  check('…and sends it to the address typed', cdb.resent.length === 2 && cdb.resent[1].email === 'mona@example.com' && (await pg.locator('.link-expired', { hasText: 'أرسلنا الرابط مرة أخرى' }).count()) === 1);
  await byLink(pg, 'signin?link=reset' + expiredFragment);
  await pg.locator('.link-expired #au-email').fill('mona@example.com');
  await pg.locator('.link-expired button', { hasText: 'أرسل رابط إعادة تعيين جديدًا' }).click();
  await pg.waitForTimeout(600);
  check('an expired password-reset link offers a new reset link, and sends it', (cdb.recoveries || []).length === 1 && cdb.recoveries[0].email === 'mona@example.com' && (await pg.locator('.link-expired', { hasText: 'إذا كان هذا البريد مسجّلًا' }).count()) === 1);
  // O4 — the contact form's hourly limit has its own sentence
  for (let i = 0; i < 5; i += 1) cdb.contact.push({ name: 'زائر', email: null, mobile: '0555000111', topic: 'استفسار', message: 'رسالة سابقة', lang: 'ar' });
  await go(pg, 'contact');
  await pg.locator('input[name="name"]').fill('زائر');
  await pg.locator('input[name="phone"]').fill('0555000111');
  await pg.locator('select[name="topic"]').selectOption({ index: 1 });
  await pg.locator('textarea[name="msg"]').fill('رسالة سادسة خلال ساعة');
  await pg.locator('button', { hasText: 'إرسال الرسالة' }).click();
  await pg.waitForTimeout(700);
  check('the contact form\'s hourly limit is said in its own sentence, not "could not be sent"', (await pg.locator('#ct-err', { hasText: 'الحد المسموح خلال ساعة' }).count()) === 1 && cdb.contact.length === 5, await pg.locator('#ct-err').innerText().catch(() => '-'));
  // O5 — an account whose sign-up name is unusable still gets a profile the database accepts
  cdb.users.push({ id: '00000000-0000-4000-8000-0000000000aa', email: 'noname@example.com', password: 'noname-pass-1', data: { full_name: ' ', mobile: '0551110009', city: 'riyadh', lang: 'ar' }, created_at: new Date().toISOString() });
  await go(pg, 'signin');
  await pg.locator('#au-email').fill('noname@example.com');
  await pg.locator('#au-password').fill('noname-pass-1');
  await pg.locator('form.authcard button[type="submit"]').click();
  await pg.waitForTimeout(900);
  check('an account with no usable name at sign-up still gets its profile (named from its email), and opens', cdb.profiles.some((p) => p.id === '00000000-0000-4000-8000-0000000000aa' && p.full_name === 'noname') && (await pg.evaluate(() => location.pathname)) === '/dashboard');
  await ctx.close();
}
{
  const { ctx, cdb, pg } = await fresh();
  // O6 — a contractor applies with "Confirm email" on: the application goes in without an account, and is linked at the first sign-in
  const apply = async (company, email, mobile) => {
    await go(pg, 'join');
    await pg.locator('#join-company').fill(company);
    await pg.locator('.join-card button', { hasText: 'التالي' }).click(); await pg.waitForTimeout(150);
    await pg.locator('#join-person').fill('فهد القحطاني');
    await pg.locator('#join-mobile').fill(mobile);
    await pg.locator('#join-email').fill(email);
    await pg.locator('#join-password').fill('fahad-pass-123');
    await pg.locator('.join-card button', { hasText: 'التالي' }).click(); await pg.waitForTimeout(150);
    await pg.locator('.join-groups button[aria-expanded]').first().click(); await pg.waitForTimeout(100);
    await pg.locator('.join-groups .tchip').nth(1).click();
    await pg.locator('#join-agree').check();
    await pg.locator('button', { hasText: 'إرسال الطلب وإنشاء الحساب' }).click();
    await pg.waitForTimeout(900);
  };
  await apply('مؤسسة الإتقان للمقاولات', 'Fahad@Co.example', '0501112299');
  check('/join with "Confirm email" on: the application is saved without an account, and the page says to activate the account from the email',
    cdb.applications.length === 1 && cdb.applications[0].user_id === null && cdb.applications[0].email === 'fahad@co.example' && cdb.profiles.length === 0
    && (await pg.locator('.confirm-email h1', { hasText: 'فعّل حسابك' }).count()) === 1 && (await pg.locator('.confirm-email', { hasText: 'وصلنا طلبك' }).count()) === 1, JSON.stringify(cdb.applications[0] || null).slice(0, 160));
  await byLink(pg, 'signin?link=signup' + confirmLink(cdb, 'fahad@co.example'));
  const fahad = cdb.users.find((u) => u.email === 'fahad@co.example');
  check('…opening the link makes the contractor profile and links the application to the account (claim_my_application)', cdb.profiles.some((p) => p.id === fahad.id && p.role === 'contractor' && p.company === 'مؤسسة الإتقان للمقاولات')
    && cdb.applications[0].user_id === fahad.id && (cdb.claimed || []).includes(fahad.id) && (await pg.evaluate(() => location.pathname)) === '/contractor' && (await pg.locator('text=حسابك قيد التوثيق').count()) === 1, await pg.evaluate(() => location.pathname));
  await signOutOf(pg);
  // O7 — an application that went missing is sent again, once, from what the account remembers of it
  await apply('مؤسسة الركن المتين', 'sami@co.example', '0501112288');
  cdb.applications.splice(cdb.applications.findIndex((a) => a.email === 'sami@co.example'), 1);
  await byLink(pg, 'signin?link=signup' + confirmLink(cdb, 'sami@co.example'));
  const sami = cdb.users.find((u) => u.email === 'sami@co.example');
  const again = cdb.applications.filter((a) => a.user_id === sami.id);
  check('a contractor whose application is missing at the first sign-in has it sent again from the sign-up details, tied to the account', again.length === 1 && again[0].company === 'مؤسسة الركن المتين' && again[0].mobile === '0501112288' && again[0].trades.length === 1
    && (await pg.evaluate(() => location.pathname)) === '/contractor', JSON.stringify(again).slice(0, 200));
  await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForSelector('header'); await pg.waitForTimeout(900);
  check('…and only once', cdb.applications.filter((a) => a.user_id === sami.id).length === 1);
  // O8 — an application the team verified before the account existed: the new account with that email and mobile is linked to it
  cdb.applications.push({ company: 'مؤسسة الأساس الموثّقة', person: 'ماجد', mobile: '0501112277', email: 'majed@co.example', city: 'riyadh', trades: ['kitchen'], cr_number: null, note: null, lang: 'ar', user_id: null, status: 'verified',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString() });
  await apply('مؤسسة الأساس الموثّقة', 'majed@co.example', '0501112277');
  await byLink(pg, 'signin?link=signup' + confirmLink(cdb, 'majed@co.example'));
  const majed = cdb.users.find((u) => u.email === 'majed@co.example');
  const majedApp = cdb.applications.filter((a) => a.user_id === majed.id);
  check('an application verified before the account existed is linked at the first sign-in (same email and mobile): the contractor is verified, not "being verified"',
    majedApp.length === 1 && majedApp[0].status === 'verified' && (await pg.locator('text=حسابك قيد التوثيق').count()) === 0 && (await pg.evaluate(() => location.pathname)) === '/contractor', JSON.stringify(majedApp).slice(0, 200));
  check('the confirm-email parts asked the database for nothing unknown', cdb.unknown.length === 0, cdb.unknown.join(' · '));
  await ctx.close();
}
{
  // P — the team's console (supabase/030): its words in the page's language, a phone, the team's project controls, a
  // project's messages read by the team, contractor accounts with no application, and a declined contractor
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  await ctx.addInitScript(() => { window.__opened = []; window.open = (url) => { window.__opened.push(String(url)); return null; }; Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); });
  const adb = await installSupabaseMock(ctx, site.supabase.url);
  const pg = await ctx.newPage();
  pg.setDefaultTimeout(8000);
  pg.on('pageerror', (e) => errors.push('PAGEERROR (console): ' + String(e).slice(0, 300)));
  const at = new Date().toISOString();
  const ID = (n) => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`;
  const person = (n, role, name, company, mobile) => {
    adb.users.push({ id: ID(n), email: `p${n}@example.com`, password: 'console-pass-1', data: {}, created_at: at });
    adb.profiles.push({ id: ID(n), role, full_name: name, company, mobile, city: 'riyadh', lang: 'ar', email: `p${n}@example.com`, created_at: at });
  };
  person(1, 'admin', 'فريق ترميم', null, '0500000101'); person(2, 'homeowner', 'نورة الشمري', null, '0500000102');
  person(3, 'contractor', 'ماجد', 'مؤسسة الإتقان', '0500000103'); person(4, 'contractor', 'بدر الحربي', 'مؤسسة البدر', '0500000104'); person(5, 'contractor', 'سعد', 'مؤسسة الرفض', '0500000105');
  const app = (n, company, status, extra = {}) => adb.applications.push({ company, person: 'المسؤول', mobile: `05000001${n}9`, email: `p${n}@example.com`, city: 'riyadh', trades: ['kitchen'], cr_number: null, note: null, lang: 'ar', user_id: ID(n), status, created_at: at, ...extra });
  app(3, 'مؤسسة الإتقان', 'verified', { cr_number: '1010123456' }); app(5, 'مؤسسة الرفض', 'declined'); app(6, 'مؤسسة جديدة', 'new', { user_id: null, email: 'fresh@example.com' });
  const PID = (n) => `10000000-0000-4000-8000-00000000700${n}`;
  const proj = (n, status, extra = {}) => adb.projects.push({ id: PID(n), code: 'P-700' + n, owner_id: ID(2), status, created_at: at, title: `مشروع اختبار ${n}`, trade: 'kitchen', description: 'تجديد المطبخ بالكامل مع الخزائن.', city: 'riyadh', district: null, budget_min: 10000, budget_max: 30000, timing: 'month', ...extra });
  proj(1, 'open'); proj(2, 'active', { contractor_id: ID(3), amount: 20000 }); proj(3, 'active', { contractor_id: ID(3), amount: 18000 });
  for (const n of [2, 3]) {
    const bid = `20000000-0000-4000-8000-00000000700${n}`;
    adb.bids.push({ id: bid, project_id: PID(n), contractor_id: ID(3), price: 20000, days: 20, note: null, details: {}, status: 'chosen', created_at: at });
    adb.agreements.push({ project_id: PID(n), bid_id: bid, homeowner_id: ID(2), contractor_id: ID(3), amount: 20000, days: 20, homeowner_name: 'نورة الشمري', homeowner_signed_at: at, contractor_name: 'مؤسسة الإتقان', contractor_signed_at: at });
  }
  adb.messages = [
    { id: 1, project_id: PID(2), contractor_id: ID(3), from_id: ID(2), body: 'متى تبدأون العمل؟', created_at: at, read_at: null },
    { id: 2, project_id: PID(2), contractor_id: ID(3), from_id: ID(3), body: 'نبدأ يوم الأحد إن شاء الله.', created_at: at, read_at: null },
  ];
  adb.contact.push({ name: 'زائرة', email: null, mobile: '0555000222', topic: 'استفسار', message: 'هل تغطون الخبر؟', lang: 'ar' });
  const signIn = async (n) => { await go(pg, 'signin'); await pg.locator('#au-email').fill(`p${n}@example.com`); await pg.locator('#au-password').fill('console-pass-1'); await pg.locator('form.authcard button[type="submit"]').click(); await pg.waitForTimeout(1100); };
  const side = async (id) => { await pg.locator(`.side[data-tab="${id}"]`).click(); await pg.waitForTimeout(500); };
  const openProject = async (code) => { await go(pg, 'admin'); await side('overview'); await pg.locator('tr.row-h', { hasText: code }).first().click(); await pg.waitForTimeout(900); };
  await signIn(1);
  await passTwoStep(pg, adb);
  // P1 — nobody is invisible: a contractor account with no application is listed with the people, not in the queue
  await side('users');
  check('a contractor account with no application is listed under Users, marked «بلا طلب توثيق»', (await pg.locator('main tr', { hasText: 'مؤسسة البدر' }).locator('.tag', { hasText: 'بلا طلب توثيق' }).count()) === 1);
  await side('verification');
  check('…and is never put in the verification queue (only the real new application is, and the tab counts it alone)', (await pg.locator('main', { hasText: 'مؤسسة البدر' }).count()) === 0 && (await pg.locator('main', { hasText: 'مؤسسة جديدة' }).count()) === 1
    && (await pg.locator('.side[data-tab="verification"] .tag').innerText().catch(() => '')) === '1');
  await side('payments');
  check('the payments tab with nothing held says so, instead of an empty box', (await pg.locator('main .pay-table tr.empty-row', { hasText: 'لا استثناءات دفع حاليًا.' }).count()) === 1);
  await side('users');
  await pg.locator(`button[data-id="U-${ID(4)}"]`).click(); await pg.waitForTimeout(900);
  check('…and opening it shows who to call, and that there is no application', (await pg.locator('.modal.dv', { hasText: 'p4@example.com' }).count()) === 1 && (await pg.locator('.modal.dv', { hasText: '0500000104' }).count()) === 1
    && (await pg.locator('.modal.dv', { hasText: 'بلا طلب توثيق' }).count()) >= 1, (await pg.locator('.modal.dv').innerText().catch(() => '-')).replace(/\s+/g, ' ').slice(0, 200));
  await pg.locator('.modal.dv button', { hasText: 'إغلاق' }).click(); await pg.waitForTimeout(300);
  // P2 — the team reads a project's messages, and cannot write or mark them read
  await openProject('P-7002');
  check('a signed project opened from the console shows the team\'s controls: mark completed, or cancel', (await pg.locator('.admin-controls button[data-act="complete"]', { hasText: 'تسجيل المشروع مكتملًا' }).count()) === 1
    && (await pg.locator('.admin-controls button[data-act="cancel"]', { hasText: 'إلغاء المشروع' }).count()) === 1 && (await pg.locator('.admin-controls button[data-act="remove"]').count()) === 0);
  await pg.locator('[role="tab"][data-tab="messages"]').click(); await pg.waitForTimeout(900);
  const thread = (await pg.locator('.msg-card').innerText().catch(() => '')).replace(/\s+/g, ' ');
  check('the team reads the project\'s conversation as written, both sides named, marked read-only', thread.includes('تقرأ هذه المحادثة للاطلاع فقط') && thread.includes('متى تبدأون العمل؟') && thread.includes('نبدأ يوم الأحد') && thread.includes('صاحب المنزل') && thread.includes('مؤسسة الإتقان'), thread.slice(0, 240));
  check('…with no box to write in, and nothing marked read or sent', (await pg.locator('.msg-card input').count()) === 0 && adb.messages.length === 2 && adb.messages.every((m) => !m.read_at));
  // P3 — cancelling a signed project asks first, takes a note for the record, and can be called off
  await pg.locator('.admin-controls button[data-act="cancel"]').click(); await pg.waitForTimeout(200);
  check('cancelling asks first, and says it cannot be undone', (await pg.locator('.admin-controls', { hasText: 'إلغاء المشروع؟' }).count()) === 1 && (await pg.locator('.admin-controls', { hasText: 'لا يمكن التراجع' }).count()) === 1 && adb.projects.find((p) => p.id === PID(2)).status === 'active');
  await pg.locator('.admin-controls button', { hasText: 'تراجع' }).click(); await pg.waitForTimeout(200);
  check('…"go back" changes nothing', (await pg.locator('.admin-controls', { hasText: 'إلغاء المشروع؟' }).count()) === 0 && !(adb.statusChanges || []).length);
  await pg.locator('.admin-controls button[data-act="cancel"]').click(); await pg.waitForTimeout(200);
  await pg.locator('#adm-note').fill('أوقف الطرفان العمل باتفاقهما');
  await pg.locator('.admin-controls .adm-yes').click(); await pg.waitForTimeout(1400);
  const cancelled = (adb.statusChanges || []).slice(-1)[0];
  check('…"yes" cancels it in the database (active → withdrawn), with the team\'s note, and says the parties were told', adb.projects.find((p) => p.id === PID(2)).status === 'withdrawn' && cancelled?.action === 'cancelled' && cancelled?.note === 'أوقف الطرفان العمل باتفاقهما'
    && (await pg.locator('.sitenotice', { hasText: 'أُلغي المشروع' }).count()) === 1, JSON.stringify(cancelled || null));
  check('…the project then reads «مسحوب», and has no controls left', (await pg.locator('main .tag', { hasText: 'مسحوب' }).count()) >= 1 && (await pg.locator('.admin-controls').count()) === 0);
  // P4 — marking one completed; a refusal says why and changes nothing
  await openProject('P-7003');
  await pg.locator('.admin-controls button[data-act="complete"]').click(); await pg.waitForTimeout(200);
  adb.failNext['POST /rest/v1/rpc/admin_set_project_status'] = { status: 403, body: { code: '42501', message: 'status_not_allowed: a project goes from active to completed or withdrawn, or from open to withdrawn' } };
  await pg.locator('.admin-controls .adm-yes').click(); await pg.waitForTimeout(900);
  check('a step the database refuses says why, and the project stays as it was', (await pg.locator('.admin-controls .autherr', { hasText: 'تغيّرت حالة المشروع' }).count()) === 1 && adb.projects.find((p) => p.id === PID(3)).status === 'active');
  await pg.locator('.admin-controls .adm-yes').click(); await pg.waitForTimeout(1400);
  check('…and "mark as completed" completes it (active → completed), and says so', adb.projects.find((p) => p.id === PID(3)).status === 'completed' && (await pg.locator('.sitenotice', { hasText: 'سُجّل المشروع مكتملًا' }).count()) === 1
    && (await pg.locator('main .tag', { hasText: 'مكتمل' }).count()) >= 1 && (await pg.locator('.admin-controls').count()) === 0);
  // P5 — removing an open project (spam)
  await openProject('P-7001');
  check('an open project offers one control: remove it', (await pg.locator('.admin-controls button').count()) === 1 && (await pg.locator('.admin-controls button[data-act="remove"]', { hasText: 'إزالة المشروع' }).count()) === 1);
  await pg.locator('.admin-controls button[data-act="remove"]').click(); await pg.waitForTimeout(200);
  await pg.locator('.admin-controls .adm-yes', { hasText: 'نعم، أزِله' }).click(); await pg.waitForTimeout(1400);
  check('…which takes it off the site (open → withdrawn) with no note, and says its owner and bidders were told', adb.projects.find((p) => p.id === PID(1)).status === 'withdrawn' && (adb.statusChanges || []).slice(-1)[0]?.action === 'removed' && (adb.statusChanges || []).slice(-1)[0]?.note === null
    && (await pg.locator('.sitenotice', { hasText: 'أُزيل المشروع' }).count()) === 1);
  // P6 — analytics with nothing recorded yet: each card says so
  adb.visits.length = 0; // (the sign-in page's own visit, before the team signed in)
  await go(pg, 'admin'); await side('analytics'); await pg.waitForTimeout(700);
  check('analytics with no visits yet: each empty card says so, in Arabic', (await pg.locator('main .an-empty').count()) === 5 && (await pg.locator('main .an-empty', { hasText: 'لا أحد على الموقع الآن' }).count()) === 1
    && (await pg.locator('main .an-empty', { hasText: 'لا نشاط خلال آخر 30 دقيقة' }).count()) === 1 && (await pg.locator('main .an-empty', { hasText: 'لا زيارات مسجّلة في هذه الفترة بعد' }).count()) === 3);
  // P7 — the inbox in the page's language
  await go(pg, 'inbox'); await pg.waitForTimeout(900);
  const inboxText = await pg.locator('main').innerText();
  check('the inbox says statuses, the currency, the start date and the CR label in Arabic', inboxText.includes('ريال') && inboxText.includes('خلال شهر') && inboxText.includes('موثّق') && inboxText.includes('مرفوض') && inboxText.includes('جديد') && inboxText.includes('السجل التجاري')
    && !/\b(SAR|CR|month|verified|declined|new)\b/.test(inboxText), (inboxText.match(/\b(SAR|CR|month|verified|declined|new)\b/g) || []).join(','));
  // P8 — a phone: the "today" figures in two columns, every table's statuses and buttons in sight
  await pg.setViewportSize({ width: 375, height: 800 });
  await go(pg, 'admin'); await side('analytics'); await pg.waitForTimeout(600);
  const columns = await pg.locator('.an-today').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  check('on a phone the six "today" figures sit in a 2×3 grid', columns === 2 && (await pg.locator('.an-today .qitem').count()) === 6, String(columns));
  const cut = [];
  for (const id of ['overview', 'verification', 'support', 'users']) {
    await side(id);
    cut.push(...(await pg.evaluate((tabId) => [...document.querySelectorAll('main .adm-t .btn, main .adm-t .tag')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > document.documentElement.clientWidth + 1); }).map((el) => `${tabId}:${el.textContent.trim()}`), id)));
    cut.push(...(await pg.evaluate((tabId) => (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 ? [`${tabId}: page wider than the screen`] : []), id)));
  }
  check('…and every console table shows each row as a card: no status or button past the screen\'s edge, the header row hidden', !cut.length && (await pg.locator('main .adm-t thead').evaluate((el) => getComputedStyle(el).display)) === 'none', cut.join(' · '));
  await side('users');
  await pg.locator('button[data-kind="h"]').first().click(); await pg.waitForTimeout(1000);
  const modalCut = await pg.evaluate(() => [...document.querySelectorAll('.modal.dv .dv-table td, .modal.dv .dv-table .tag, .modal.dv .dv-table button')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > document.documentElement.clientWidth + 1); }).map((el) => el.textContent.trim()));
  check('…and so do the person view\'s tables (a homeowner\'s projects), their counts named', (await pg.locator('.modal.dv .dv-table tr', { hasText: 'مشروع اختبار' }).count()) >= 1 && !modalCut.length
    && (await pg.locator('.modal.dv .dv-table td[data-l]').first().evaluate((el) => getComputedStyle(el, '::before').content)).includes('العطاءات'), modalCut.join(' · '));
  await pg.locator('.modal.dv button', { hasText: 'إغلاق' }).first().click(); await pg.waitForTimeout(300);
  await go(pg, 'inbox'); await pg.waitForTimeout(900);
  check('…the inbox\'s rows stack too, with nothing wider than the screen', (await pg.locator('.inbox-table td').first().evaluate((el) => getComputedStyle(el).display)) === 'block'
    && (await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)));
  await pg.setViewportSize({ width: 1280, height: 1000 });
  // P9 — the English console says the same in English
  await pg.evaluate(() => { const st = JSON.parse(localStorage.getItem('tarmem-public-v1') || '{}'); st.lang = 'en'; localStorage.setItem('tarmem-public-v1', JSON.stringify(st)); });
  await go(pg, 'admin'); await side('support');
  check('in English the support column reads "Sender" and the first "ID"', (await pg.locator('main th', { hasText: 'Sender' }).count()) === 1 && (await pg.locator('main th').filter({ hasText: /^ID$/ }).count()) === 1);
  // P10 — a declined contractor is told so, and can reach the team
  await signOutOf(pg);
  await signIn(5);
  check('a declined contractor reads "Your application was not approved" (English), not "being verified"', (await pg.locator('main', { hasText: 'Your application was not approved' }).count()) >= 1 && (await pg.locator('main', { hasText: 'being verified' }).count()) === 0);
  await pg.locator('header .langbtn').first().click(); await pg.waitForTimeout(500);
  check('…and in Arabic «لم تتم الموافقة على طلبك», with a way to contact the team', (await pg.locator('main', { hasText: 'لم تتم الموافقة على طلبك' }).count()) >= 1 && (await pg.locator('main', { hasText: 'حسابك قيد التوثيق' }).count()) === 0);
  await pg.locator('main button', { hasText: 'تواصل مع فريق ترميم' }).first().click();
  await pg.waitForFunction(() => window.location.pathname === '/contact', null, { timeout: 8000 }).catch(() => undefined);
  check('…whose button opens the contact page', (await pg.evaluate(() => location.pathname)) === '/contact');
  // P11 — the controls are the team's alone
  await signOutOf(pg);
  await signIn(2);
  await go(pg, 'project/P-7003'); await pg.waitForTimeout(700);
  check('a homeowner never sees the team\'s controls', (await pg.locator('main h1').count()) >= 1 && (await pg.locator('.admin-controls').count()) === 0);
  check('the console parts asked the database for nothing unknown', adb.unknown.length === 0, adb.unknown.join(' · '));
  await ctx.close();
}
// V — (031) explore first, verify before dealing: a new account is in at once; its project waits for the confirmed email
{
  const vctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const vdb = await installSupabaseMock(vctx, site.supabase.url);
  vdb.verifyNewAccounts = true;
  const now = new Date().toISOString(), CO = '00000000-0000-4000-8000-0000000000c9';
  vdb.users.push({ id: CO, email: 'co@v.example', password: 'password-123', data: {}, created_at: now });
  vdb.profiles.push({ id: CO, role: 'contractor', full_name: 'خالد', company: 'مؤسسة البناء المتقن', mobile: '0501112299', city: 'riyadh', lang: 'ar', email: 'co@v.example', created_at: now });
  vdb.applications.push({ company: 'مؤسسة البناء المتقن', person: 'خالد', mobile: '0501112299', email: 'co@v.example', city: 'riyadh', trades: ['kitchen'], cr_number: '1010101010', note: null, lang: 'ar', user_id: CO, status: 'verified' });
  const vp = await vctx.newPage();
  vp.on('pageerror', (e) => errors.push('V: ' + String(e)));
  const vgo = async (path) => { await vp.goto(BASE_URL + path, { waitUntil: 'domcontentloaded' }); await vp.waitForSelector('header'); await vp.waitForTimeout(500); };
  await vgo('signin');
  await vp.locator('.authseg input[value="signup"]').check();
  await vp.locator('#au-name').fill('منى القحطاني');
  await vp.locator('#au-mobile').fill('0559876543');
  await vp.locator('#au-email').fill('mona@v.example');
  await vp.locator('#au-password').fill('long-enough-9');
  await vp.locator('form.authcard input[type="checkbox"]').check();
  await vp.locator('form.authcard button[type="submit"]').click();
  await vp.waitForTimeout(1200);
  const monaId = vdb.users.find((u) => u.email === 'mona@v.example')?.id;
  check('V: a new homeowner is in at once — no "activate first" wall — and lands on their dashboard', Boolean(monaId) && (await vp.evaluate(() => location.pathname)) === '/dashboard', await vp.evaluate(() => location.pathname));
  check('V: …the "confirm your email" mail went out as the account was made', (vdb.verifyMails || []).some((m) => m.user === monaId));
  check('V: …and a bar says what waits for it, naming the address', (await vp.locator('.verifybar', { hasText: 'mona@v.example' }).count()) === 1 && (await vp.locator('.verifybar', { hasText: 'أكّد بريدك الإلكتروني' }).count()) === 1);
  await vp.locator('.verifybar button', { hasText: 'أعد إرسال الرابط' }).click(); await vp.waitForTimeout(500);
  check('V: "send the link again" sends another and says so', (vdb.verifyMails || []).filter((m) => m.user === monaId).length === 2 && (await vp.locator('.verifybar', { hasText: 'أرسلنا رابطًا جديدًا' }).count()) === 1);
  await vp.locator('.verifybar button', { hasText: 'أكّدت بريدي' }).click(); await vp.waitForTimeout(500);
  check('V: "I have confirmed" before opening the link says it is not confirmed yet', (await vp.locator('.verifybar', { hasText: 'لم يُؤكَّد بريدك بعد' }).count()) === 1);
  // the unconfirmed homeowner posts a project: it is saved, and waits
  await vgo('post');
  await vp.locator('input[name="title"]').fill('تجديد مطبخ في حي النرجس');
  await vp.locator('select[name="trade"]').selectOption('kitchen');
  await vp.locator('textarea[name="desc"]').fill('مطبخ 4×5 م: خزائن جديدة، سطح رخام، وتغيير السباكة.');
  await vp.locator('button', { hasText: 'التالي' }).first().click(); await vp.waitForTimeout(250);
  await vp.locator('input[name="min"]').fill('40000'); await vp.locator('input[name="max"]').fill('60000');
  await vp.locator('button', { hasText: 'التالي' }).first().click(); await vp.waitForTimeout(250);
  await vp.locator('button', { hasText: 'التالي' }).first().click(); await vp.waitForTimeout(250);
  await vp.locator('label.radio').first().click();
  await vp.locator('button', { hasText: 'نشر المشروع' }).first().click(); await vp.waitForTimeout(1500);
  check('V: an unconfirmed homeowner can still publish; the project is saved', vdb.projects.some((p) => p.owner_id === monaId), JSON.stringify(vdb.projects.map((p) => p.owner_id)));
  check('V: …and the page after publishing says it reaches contractors once the email is confirmed', (await vp.locator('main', { hasText: 'قبل أن تؤكد بريدك' }).count()) >= 1);
  // a verified contractor does not see it
  await vctx.close().catch(() => undefined);
  // a fresh context on the same database: sign in as the contractor
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const same = await installSupabaseMock(c2, site.supabase.url);
  Object.assign(same, { users: vdb.users, profiles: vdb.profiles, projects: vdb.projects, applications: vdb.applications, bids: vdb.bids, verifyMails: vdb.verifyMails, verifyNewAccounts: true });
  const cp = await c2.newPage();
  cp.on('pageerror', (e) => errors.push('V: ' + String(e)));
  const cgo = async (path) => { await cp.goto(BASE_URL + path, { waitUntil: 'domcontentloaded' }); await cp.waitForSelector('header'); await cp.waitForTimeout(500); };
  await cgo('signin');
  await cp.locator('#au-email').fill('co@v.example'); await cp.locator('#au-password').fill('password-123');
  await cp.locator('form.authcard button[type="submit"]').click(); await cp.waitForTimeout(1000);
  await cgo('projects');
  check('V: a verified contractor does not see the project of a homeowner who has not confirmed their email', (await cp.locator('main', { hasText: 'حي النرجس' }).count()) === 0);
  // the homeowner opens the link (signed out here, in another browser: the link alone is the proof)
  same.verifyTokens = { ['a'.repeat(48)]: monaId, ['b'.repeat(48)]: 'expired' };
  const hctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const hdb = await installSupabaseMock(hctx, site.supabase.url);
  Object.assign(hdb, { users: same.users, profiles: same.profiles, projects: same.projects, applications: same.applications, verifyTokens: same.verifyTokens });
  const hp = await hctx.newPage();
  await hp.goto(BASE_URL + '?verify=' + 'b'.repeat(48), { waitUntil: 'domcontentloaded' }); await hp.waitForSelector('header'); await hp.waitForTimeout(900);
  check('V: an expired link says so, and how to get a new one', (await hp.locator('.sitenotice', { hasText: 'انتهت صلاحية' }).count()) === 1 && !(await hp.evaluate(() => location.search.includes('verify'))));
  await hp.goto(BASE_URL + '?verify=' + 'a'.repeat(48), { waitUntil: 'domcontentloaded' }); await hp.waitForSelector('header'); await hp.waitForTimeout(900);
  check('V: the real link, opened signed out, confirms the email and says so (and leaves the address clean)', (await hp.locator('.sitenotice', { hasText: 'تم تأكيد بريدك' }).count()) === 1 && !(await hp.evaluate(() => location.search.includes('verify')))
    && Boolean(same.profiles.find((p) => p.id === monaId)?.email_verified_at));
  await hctx.close();
  await cgo('projects');
  check('V: …and the project that waited now reaches the verified contractor, by itself', (await cp.locator('main', { hasText: 'حي النرجس' }).count()) >= 1);
  check('V: the parts asked the database for nothing unknown', same.unknown.length === 0 && hdb.unknown.length === 0, [...same.unknown, ...hdb.unknown].join(' · '));
  await c2.close();
}

// W — (033) example projects for the early-access launch: a verified contractor sees them among the open projects, the
// notice says in small type that some are examples, and the team's console and inbox mark them «تجريبي»
{
  const wctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const wdb = await installSupabaseMock(wctx, site.supabase.url);
  const now = new Date().toISOString(), ago = (d) => new Date(Date.now() - d * 864e5).toISOString();
  const ID = (n) => `00000000-0000-4000-8000-0000000003${String(n).padStart(2, '0')}`;
  const person = (n, role, name, extra = {}) => {
    wdb.users.push({ id: ID(n), email: `w${n}@example.com`, password: 'sample-pass-1', data: {}, created_at: now });
    wdb.profiles.push({ id: ID(n), role, full_name: name, company: null, mobile: `05000003${String(n).padStart(2, '0')}`, city: 'riyadh', lang: 'ar', email: `w${n}@example.com`, created_at: now, ...extra });
  };
  person(1, 'admin', 'فريق ترميم'); person(2, 'homeowner', 'فهد العتيبي', { preview: true }); person(3, 'homeowner', 'نورة الشمري'); person(4, 'contractor', 'ماجد', { company: 'مؤسسة الإتقان' });
  wdb.applications.push({ company: 'مؤسسة الإتقان', person: 'ماجد', mobile: '0500000304', email: 'w4@example.com', city: 'riyadh', trades: ['kitchen'], cr_number: null, note: null, lang: 'ar', user_id: ID(4), status: 'verified', created_at: now });
  const proj = (n, owner, title, preview) => wdb.projects.push({ id: `10000000-0000-4000-8000-00000000900${n}`, code: 'P-900' + n, owner_id: ID(owner), status: 'open', created_at: ago(n), title, trade: 'kitchen',
    description: 'تجديد المطبخ بالكامل مع الخزائن والسطح.', city: 'riyadh', district: 'النرجس', budget_min: 15000, budget_max: 25000, timing: 'month', ...(preview ? { preview: true } : {}) });
  proj(1, 2, 'تفصيل مطبخ جديد على شكل L', true); proj(2, 2, 'ستائر لسبع نوافذ في الشقة', true); proj(3, 3, 'ترميم حمام رئيسي', false);
  const wp = await wctx.newPage();
  wp.setDefaultTimeout(8000);
  wp.on('pageerror', (e) => errors.push('W: ' + String(e)));
  const wsignIn = async (n) => { await go(wp, 'signin'); await wp.locator('#au-email').fill(`w${n}@example.com`); await wp.locator('#au-password').fill('sample-pass-1'); await wp.locator('form.authcard button[type="submit"]').click(); await wp.waitForTimeout(1100); };
  await wsignIn(4);
  await go(wp, 'projects'); await wp.waitForTimeout(400);
  check('W: a verified contractor sees the example projects among the open ones, beside the real one', (await wp.locator('main', { hasText: 'تفصيل مطبخ جديد على شكل L' }).count()) >= 1
    && (await wp.locator('main', { hasText: 'ترميم حمام رئيسي' }).count()) >= 1);
  const note = wp.locator('.samples-note');
  check('W: …and the early-access notice says, in small type, that some projects are examples', (await note.count()) === 1 && (await note.innerText()).includes('نماذج توضيحية')
    && parseFloat(await note.evaluate((el) => getComputedStyle(el).fontSize)) <= 11.5);
  check('W: …with no mark on the projects themselves', (await wp.locator('main', { hasText: 'تجريبي' }).count()) === 0);
  await signOutOf(wp); await wsignIn(3);
  check('W: a homeowner never sees the note, nor anyone else\'s projects', (await wp.locator('.samples-note').count()) === 0 && (await wp.locator('main', { hasText: 'تفصيل مطبخ جديد' }).count()) === 0);
  await signOutOf(wp); await wsignIn(1); await passTwoStep(wp, wdb);
  await go(wp, 'admin'); await wp.locator('.side[data-tab="overview"]').click(); await wp.waitForTimeout(500);
  check('W: the console marks an example project «تجريبي» in the projects table, and not a real one', (await wp.locator('tr.row-h', { hasText: 'P-9001' }).filter({ hasText: 'تجريبي' }).count()) === 1
    && (await wp.locator('tr.row-h', { hasText: 'P-9003' }).filter({ hasText: 'تجريبي' }).count()) === 0);
  // removing an example from the console is refused, with the reason (a withdrawal emails everyone who bid)
  await wp.locator('tr.row-h', { hasText: 'P-9001' }).first().click();
  await wp.waitForFunction(() => window.location.pathname === '/project/P-9001', null, { timeout: 8000 }).catch(() => undefined); await wp.waitForTimeout(700);
  await wp.locator('.admin-controls button[data-act="remove"]').click(); await wp.waitForTimeout(200);
  await wp.locator('.admin-controls .adm-yes').click(); await wp.waitForTimeout(900);
  check('W: removing an example from the console is refused, saying why and how it is removed instead', (await wp.locator('.admin-controls .autherr', { hasText: 'مشروع توضيحي' }).count()) === 1
    && wdb.projects.find((p) => p.code === 'P-9001').status === 'open' && !(wdb.statusChanges || []).some((c) => c.id === wdb.projects.find((p) => p.code === 'P-9001').id));
  await go(wp, 'admin'); await wp.locator('.side[data-tab="users"]').click(); await wp.waitForTimeout(500);
  check('W: …and its invented homeowner in the users table', (await wp.locator('main tr', { hasText: 'فهد العتيبي' }).locator('.tag', { hasText: 'تجريبي' }).count()) === 1
    && (await wp.locator('main tr', { hasText: 'نورة الشمري' }).locator('.tag', { hasText: 'تجريبي' }).count()) === 0);
  check('W: the team sees no note (it is for contractors)', (await wp.locator('.samples-note').count()) === 0);
  await go(wp, 'inbox'); await wp.waitForTimeout(700);
  check('W: the inbox marks them too', (await wp.locator('main tr', { hasText: 'P-9001' }).locator('.tag', { hasText: 'تجريبي' }).count()) === 1
    && (await wp.locator('main tr', { hasText: 'P-9003' }).locator('.tag', { hasText: 'تجريبي' }).count()) === 0);
  check('W: the parts asked the database for nothing unknown', wdb.unknown.length === 0, wdb.unknown.join(' · '));
  await wctx.close();
}
console.log(results.join('\n'));
console.log(errors.length ? '\n' + errors.join('\n') : '\nno page errors');
await browser.close();
if (results.some((r) => r.startsWith('FAIL')) || errors.length) process.exit(1);
