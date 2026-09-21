/* The public early-access site: what a real visitor can and cannot do.

   Start the app first (`npm run dev`), then: `npm run test:launch`.

   The design is a whole marketplace on invented data. This checks that none of
   that reaches the public: no sign-in, no dummy accounts, no invented claims —
   and that the three ways a visitor can reach Tarmem (a project request, a
   contractor application, the contact form) each produce a real WhatsApp
   message to the number in site.config.json. */

import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { installSupabaseMock } from './supabase-mock.mjs';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5173/').replace(/demo\/?$/, '');
const site = JSON.parse(readFileSync(new URL('../site.config.json', import.meta.url), 'utf8'));

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
// Record what the page tries to open instead of opening it.
await context.addInitScript(() => {
  window.__opened = [];
  window.open = (url) => { window.__opened.push(String(url)); return null; };
});
// With real accounts connected (site.config.json "supabase"), requests are saved to the database rather
// than written into WhatsApp. That flow has its own test (tests/platform.mjs); here the database is a
// stand-in, so this test still writes nothing real when it runs against the live site.
const accounts = Boolean(site.supabase);
if (accounts) await installSupabaseMock(context, site.supabase.url);
const page = await context.newPage();
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 300)));
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
const opened = async () => page.evaluate(() => window.__opened.splice(0));
const route = async () => page.evaluate(() => JSON.parse(localStorage.getItem('tarmem-public-v1') || '{}').route);
/** Open `path` on a clean browser, optionally with something already saved from an earlier visit. */
const load = async (saved, path = '') => {
  await page.goto(BASE_URL + path, { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => { localStorage.clear(); if (s) localStorage.setItem(s.key, JSON.stringify(s.value)); }, saved || null);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('header');
  await page.waitForTimeout(500);
};
const pathname = async () => page.evaluate(() => window.location.pathname);
const waText = (url) => decodeURIComponent(url.split('?text=')[1] || '');

// A — nothing invented on the home page
await load();
const invented = await page.evaluate(() => ['.ph-live', '.ai2-stats', '.sugbox', '.ai2-att'].filter((s) => document.querySelector(s)));
check('home page carries no invented visitor counter or headline figures, and no photo picker that uploads nothing', invented.length === 0, invented.join(' '));
// the owner confirmed (21 Sep 2026) the testimonials are real customers' and the partners are signed, so both show
check('testimonials and partners are shown', (await page.locator('.tsti-wrap').count()) === 1 && (await page.locator('.prtnrs').count()) === 1);
check('the early-access notice sits under the home hero', (await page.locator('[role="note"]').count()) === 1);
const signIn = await page.locator('header [data-route="auth"]:not([data-signup])').count();
check(accounts ? 'sign-in is offered, now that accounts are real' : 'there is no sign-in link', accounts ? signIn > 0 : signIn === 0, `found ${signIn}`);
const dummy = await page.evaluate((n) => [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.href).filter((h) => !h.includes('wa.me/' + n)), site.whatsapp);
check('every WhatsApp link uses the configured number', dummy.length === 0, dummy.join(' '));

// A2 — the footer still offers the contractor application (its link names a role, so it stays)
check('the footer keeps "join as a contractor" and drops "browse contractors"',
  (await page.locator('footer [data-route="auth"][data-role="contractor"]').count()) === 1
    && (await page.locator('footer [data-route="contractors"]').count()) === 0);

// B — the demo's saved state cannot follow a visitor here, and private pages cannot be opened
await load({ key: 'tarmem-state-v3', value: { route: 'admin', user: { role: 'admin', name: 'Operations' } } });
check('a demo sign-in does not carry over to the public site', (await page.locator('text=Operations').count()) === 0 && (await route()) !== 'admin');
for (const target of ['admin', 'wallet', 'hdash', 'cdash', 'project', 'browse', 'settings']) {
  // neither a saved page nor its address gets a visitor in
  await load({ key: 'tarmem-public-v1', value: { route: target, user: { role: 'admin', name: 'x' } } }, target);
  const at = await route();
  // (with real accounts, /dashboard and /project/… exist and ask a visitor to sign in: tests/platform.mjs)
  if (at !== 'home' || (await pathname()) !== '/') { check(`private page "${target}" is unreachable`, false, `landed on ${at} at ${await pathname()}`); break; }
  if (target === 'settings') check('private pages (admin, wallet, dashboards, projects…) are unreachable, by saved state or by address', true);
}

// C — "join as a contractor" is an application, not a dummy account
await load();
await page.locator('header button[data-signup="contractor"]').first().click();
await page.waitForTimeout(300);
check('join as a contractor opens the application form, not sign-up', (await route()) === 'join' && (await page.locator('#join-company').count()) === 1);
check('no demo account switcher anywhere on it', (await page.locator('text=تصفّح المنصة بصفتك').count()) === 0);
if (!accounts) {
await page.locator('#join-company').fill('مؤسسة البناء المتقن');
await page.locator('#join-person').fill('خالد العتيبي');
await page.locator('button.tchip').first().click();
await page.locator('button', { hasText: 'أرسل الطلب عبر واتساب' }).click();
await page.waitForTimeout(300);
let joinUrls = await opened();
check('the application is written into WhatsApp for the configured number',
  joinUrls.length === 1 && joinUrls[0].startsWith(`https://wa.me/${site.whatsapp}?text=`) && waText(joinUrls[0]).includes('مؤسسة البناء المتقن'), joinUrls[0]?.slice(0, 60));
check('…and the visitor is told nothing is sent until they press Send', (await route()) === 'sent' && (await page.locator('text=لن يصل شيء').count()) === 1);
}

// D — a trade tile and the "describe your project" box both lead to the request form
await load();
await page.locator('.hire-grid [data-trade]').nth(2).click();
await page.waitForTimeout(300);
const tile = await page.evaluate(() => ({ trade: document.querySelector('select[name="trade"]')?.value }));
check('a trade tile opens the request form with that trade chosen', (await route()) === 'post' && tile.trade === 'kitchen', JSON.stringify(tile));
await load();
await page.locator('#v-ai-in').fill('أريد تجديد مطبخي في الرياض، مساحته 4×5 م.');
await page.locator('button.ai2-go').click();
await page.waitForTimeout(300);
check('the description box carries its text into the request form',
  (await route()) === 'post' && (await page.locator('textarea[name="desc"]').inputValue()).includes('تجديد مطبخي'));

// E — the project request, end to end (by WhatsApp; with real accounts see tests/platform.mjs)
let urls = [];
if (!accounts) {
await page.locator('input[name="title"]').fill('تجديد مطبخ، 20 م²');
await page.locator('button', { hasText: 'التالي' }).first().click();
await page.locator('input[name="min"]').fill('40000');
await page.locator('input[name="max"]').fill('60000');
await page.locator('button', { hasText: 'التالي' }).first().click();
await page.locator('button', { hasText: 'التالي' }).first().click();
await page.waitForTimeout(200);
const sendBtn = page.locator('button', { hasText: 'أرسل الطلب عبر واتساب' }).first();
check('the last step offers to send on WhatsApp and waits for the undertaking', await sendBtn.isDisabled());
await page.locator('label.radio').first().click();
await sendBtn.click();
await page.waitForTimeout(400);
urls = await opened();
const text = urls[0] ? waText(urls[0]) : '';
check('the request is written into WhatsApp with title, budget and description',
  urls.length === 1 && urls[0].startsWith(`https://wa.me/${site.whatsapp}?text=`)
    && text.includes('تجديد مطبخ، 20 م²') && text.includes('40,000') && text.includes('60,000') && text.includes('تجديد مطبخي'),
  text.replace(/\n/g, ' ⏎ ').slice(0, 140));
const again = await page.locator('a', { hasText: 'افتح واتساب مرة أخرى' }).getAttribute('href').catch(() => null);
const byMail = await page.locator('a', { hasText: 'البريد الإلكتروني' }).getAttribute('href').catch(() => null);
check('…the next page shows the message and offers WhatsApp again, or email',
  !!again && again.startsWith(`https://wa.me/${site.whatsapp}?text=`) && waText(again).includes('تجديد مطبخ، 20 م²')
    && !!byMail && byMail.startsWith(`mailto:${site.email}?`) && (await page.locator('pre').innerText()).includes('40,000'));
check('…no account is created and no project is stored', (await route()) === 'sent' && !(await page.evaluate(() => JSON.parse(localStorage.getItem('tarmem-public-v1')).user)));

// F — the contact form really sends
await load(null, 'contact');
await page.locator('input[name="name"]').fill('سارة');
await page.locator('input[name="phone"]').fill('0555123456');
await page.locator('textarea[name="msg"]').fill('هل تغطون جدة؟');
await page.locator('button', { hasText: 'إرسال الرسالة' }).click();
await page.waitForTimeout(300);
urls = await opened();
check('the contact form writes the message into WhatsApp', urls.length === 1 && waText(urls[0]).includes('هل تغطون جدة؟') && waText(urls[0]).includes('0555123456'));
check('…and says so, without promising a reply time', (await page.locator('text=اضغط «إرسال» هناك').count()) === 1);
}

// G — the full demo is still there, at /demo, untouched
await page.goto(BASE_URL + 'demo', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.setItem('tarmem-state-v3', JSON.stringify({ route: 'auth' })));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
// Where a preview password is set (the live site) a stranger must meet the password screen instead.
const demoLocked = (await page.locator('.gate').count()) === 1;
const demoWhole = (await page.locator('text=تصفّح المنصة بصفتك').count()) === 1 && (await page.locator('[role="note"]').count()) === 0;
check('the private demo at /demo still has the full product — or is locked behind the preview password', demoLocked || demoWhole, demoLocked ? 'locked' : 'open (no password set in this build)');

// H — on a phone: no sideways scroll, and the menu button is on the screen, in both languages
const phoneProblems = [];
for (const lang of ['ar', 'en']) {
  for (const width of [360, 390, 430]) {
    const phone = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
    const p = await phone.newPage();
    await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await p.evaluate((l) => { localStorage.clear(); localStorage.setItem('tarmem-public-v1', JSON.stringify({ lang: l, route: 'home' })); }, lang);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const b = document.querySelector('.hdr .burger').getBoundingClientRect();
      return { scroll: document.documentElement.scrollWidth, burgerOn: b.width > 0 && b.left >= -0.5 && b.right <= innerWidth + 0.5 };
    });
    if (r.scroll > width || !r.burgerOn) phoneProblems.push(`${lang}@${width}px scroll=${r.scroll} burgerOnScreen=${r.burgerOn}`);
    await phone.close();
  }
}
check('on a phone the home page fits the screen and the menu button is reachable (ar + en, 360–430px)', phoneProblems.length === 0, phoneProblems.join('; '));
const english = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const ep = await english.newPage();
await ep.goto(BASE_URL + '?lang=en', { waitUntil: 'domcontentloaded' });
await ep.evaluate(() => localStorage.clear());
await ep.reload({ waitUntil: 'domcontentloaded' });
await ep.waitForTimeout(1200);
const arabicLeft = await ep.evaluate(() => [...document.querySelectorAll('main h1, main h2, main .ph-lead, main .ph-b1-t')].map((e) => e.innerText.trim()).filter((t) => /[\u0600-\u06FF]/.test(t)));
check('the English home page has no Arabic headings or hero copy left', arabicLeft.length === 0, arabicLeft.join(' | ').slice(0, 120));
await english.close();

// I — pages have real addresses: deep links, the address bar, Back, and tab titles
await load(null, 'pricing');
check('a page opens from its own address, with its own title', (await route()) === 'pricing' && (await page.title()).includes('الأسعار'), await page.title());
await page.locator('header a[data-route="how"]').first().click();
await page.waitForTimeout(300);
const afterClick = await pathname();
await page.goBack();
await page.waitForTimeout(400);
check('navigation updates the address, and Back returns to the previous page',
  afterClick === '/how' && (await pathname()) === '/pricing' && (await route()) === 'pricing', `${afterClick} → ${await pathname()}`);
await load({ key: 'tarmem-public-v1', value: { route: 'faq' } });
check('the site root is always the home page, whatever was open last time', (await route()) === 'home' && (await pathname()) === '/');
await load(null, 'no-such-page');
check('an unknown address lands on the home page', (await route()) === 'home' && (await pathname()) === '/');

// J — ready to open to the public?
const placeholder = site.whatsapp === '966500000000';
check('site.config.json has a real WhatsApp number (required before publicLaunch)', !(site.publicLaunch && placeholder),
  placeholder ? 'still the design\'s dummy number — fine while publicLaunch is false' : site.whatsapp);

console.log(results.join('\n'));
console.log(errors.length ? '\n' + errors.join('\n') : '\nno page errors');
await browser.close();
if (results.some((r) => r.startsWith('FAIL')) || errors.length) process.exit(1);
