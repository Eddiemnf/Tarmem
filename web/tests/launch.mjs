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
const invented = await page.evaluate(() => ['.ph-live', '.sugbox', '.ai2-att'].filter((s) => document.querySelector(s)));
check('home page carries no invented visitor counter, and no photo picker that uploads nothing', invented.length === 0, invented.join(' '));
// the owner asked (23 Sep 2026) for the design's headline-figures strip back under the description box
check('the headline figures strip (contractors, projects, satisfaction) is on the home page again', (await page.locator('.ai2-stats .ai2-stat').count()) === 3);
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
// (034) with real accounts the open projects are public (tests/platform.mjs section X); without them /projects stays closed
for (const target of ['admin', 'wallet', 'hdash', 'cdash', 'project', ...(accounts ? [] : ['browse']), 'settings']) {
  // neither a saved page nor its address gets a visitor in
  await load({ key: 'tarmem-public-v1', value: { route: target, user: { role: 'admin', name: 'x' } } }, target);
  const at = await route();
  // With real accounts /admin is a real address: a visitor is asked to sign in, and never sees the console.
  // (/dashboard and /project/… behave the same way; tests/platform.mjs covers them.)
  const asksToSignIn = accounts && ['admin', 'settings', 'wallet'].includes(target);
  if (asksToSignIn ? (at !== 'auth' || (await pathname()) !== '/signin') : (at !== 'home' || (await pathname()) !== '/')) { check(`private page "${target}" is unreachable`, false, `landed on ${at} at ${await pathname()}`); break; }
  if (target === 'settings') check('private pages (admin, wallet, dashboards, projects…) are unreachable, by saved state or by address', true);
}

// C — "join as a contractor" is an application, not a dummy account
await load();
// the hero carries the join pill next to "start your project"; the header's copy is hidden while over the hero (owner, 23 Sep 2026)
check('the join pill sits in the hero row next to the main call to action, and the header hides its own copy over the hero',
  (await page.locator('.ph-row .ph-b1').count()) === 1 && (await page.locator('.ph-row .ph-b2[data-signup="contractor"]').count()) === 1
  && !(await page.locator('header button[data-signup="contractor"]').first().isVisible()));
await page.locator('.ph-b2[data-signup="contractor"]').first().click();
await page.waitForTimeout(300);
check('join as a contractor opens the application form, not sign-up', (await route()) === 'join' && (await page.locator('#join-company').count()) === 1);
check('no demo account switcher anywhere on it', (await page.locator('text=تصفّح المنصة بصفتك').count()) === 0);
if (!accounts) {
await page.locator('#join-company').fill('مؤسسة البناء المتقن');
await page.locator('.join-card button', { hasText: 'التالي' }).click(); await page.waitForTimeout(150);
await page.locator('#join-person').fill('خالد العتيبي');
await page.locator('.join-card button', { hasText: 'التالي' }).click(); await page.waitForTimeout(150);
await page.locator('.join-groups button[aria-expanded]').first().click(); await page.waitForTimeout(100);
await page.locator('.join-groups .tchip').first().click();
await page.locator('#join-agree').check();
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
if (!demoLocked) check('the demo\'s links stay inside /demo', (await page.locator('header a.brand').getAttribute('href')) === '/demo' && (await page.locator('footer a[data-route="how"]').getAttribute('href')) === '/demo/how');

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
check('sign in is visible over the home-page video, without scrolling', await page.locator('.hdr .ulnk[data-route="auth"]').first().isVisible());
await load();
// (load() reloads on the address the app already corrected, so the wrong one has to be opened directly)
await page.goto(BASE_URL + 'no-such-page', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('header');
await page.waitForTimeout(500);
check('an unknown address lands on the home page, which says so', (await route()) === 'home' && (await pathname()) === '/' && (await page.locator('.notfound').count()) === 1, String(await page.locator('main').innerText()).slice(0, 80));

// K — links a keyboard, a new tab and a search engine can follow (28 Sep 2026)
await load(null, 'pricing');
const hrefs = await page.evaluate(() => ({
  brand: document.querySelector('header a.brand')?.getAttribute('href'),
  nav: [...document.querySelectorAll('header .mainnav a[data-route]')].map((a) => a.getAttribute('href')),
  footer: [...document.querySelectorAll('footer a[data-route]')].map((a) => a.getAttribute('href')),
}));
check('the logo links home, and every header and footer link carries its page\'s address',
  hrefs.brand === '/' && hrefs.nav.includes('/how') && hrefs.nav.every(Boolean) && hrefs.footer.length >= 9 && hrefs.footer.every(Boolean) && hrefs.footer.includes('/rules') && hrefs.footer.includes('/terms') && hrefs.footer.includes('/join'),
  JSON.stringify(hrefs).slice(0, 180));
check('the footer names the terms page by its own title', (await page.locator('footer a[data-route="terms"]').innerText()).trim() === 'شروط الاستخدام');
await page.keyboard.press('Tab');
const skipFirst = await page.evaluate(() => document.activeElement?.className);
await page.keyboard.press('Enter');
const onMain = await page.evaluate(() => document.activeElement?.id);
check('the first Tab reaches "skip to content", which moves focus to the page', skipFirst === 'skip-link' && onMain === 'main', `${skipFirst} → ${onMain}`);
await load(null, 'pricing');
await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
const tabbed = await page.evaluate(() => document.activeElement?.getAttribute('data-route'));
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
const afterEnter = await page.evaluate(() => ({ path: location.pathname, focus: document.activeElement?.tagName, inMain: !!document.activeElement?.closest('main'), y: Math.round(scrollY) }));
check('the keyboard reaches the header\'s links, and a page change moves focus to the new page\'s heading without a scroll jump',
  tabbed === 'how' && afterEnter.path === '/how' && afterEnter.focus === 'H1' && afterEnter.inMain && afterEnter.y === 0, `${tabbed} ${JSON.stringify(afterEnter)}`);
const [tab] = await Promise.all([context.waitForEvent('page'), page.locator('footer a[data-route="terms"]').click({ modifiers: ['ControlOrMeta'] })]);
// (headless Chromium opens the tab but does not load it, so the tab itself is not inspected)
check('a link clicked with Ctrl/Cmd is left to the browser, which opens a new tab; this one stays where it was', Boolean(tab) && (await pathname()) === '/how' && (await route()) === 'how', await pathname());
await tab.close();
const meta = async () => page.evaluate(() => ({ robots: document.querySelector('meta[name="robots"]')?.content, canonical: document.querySelector('link[rel="canonical"]')?.href,
  ogUrl: document.querySelector('meta[property="og:url"]')?.content, description: document.querySelector('meta[name="description"]')?.content, title: document.title }));
const howMeta = await meta();
await load(null, 'post');
const postMeta = await meta();
await load();
const homeMeta = await meta();
check('each page names its own address and description for search engines, and /post may be indexed',
  howMeta.canonical === 'https://www.tarmem.sa/how' && howMeta.ogUrl === howMeta.canonical && howMeta.description && howMeta.description !== homeMeta.description
    && postMeta.robots === 'index,follow' && postMeta.canonical === 'https://www.tarmem.sa/post' && homeMeta.canonical === 'https://www.tarmem.sa/' && /مقاولين/.test(homeMeta.title),
  JSON.stringify({ howMeta, post: postMeta.robots, home: homeMeta.title }).slice(0, 200));
await page.goto(BASE_URL + 'no-such-page', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.notfound');
check('the home page shown for a mistyped address is not indexed', (await meta()).robots === 'noindex,nofollow');

// L — refunds & disputes, contact, the contractor application
await load(null, 'rules');
check('the refunds & disputes page is titled so', (await page.locator('main h1').innerText()).includes('الاسترداد'));
await page.locator('a.rjump').click();
await page.waitForTimeout(900);
const landed = await page.evaluate(() => ({ focus: document.activeElement?.id, top: Math.round(document.getElementById('refunds').getBoundingClientRect().top) }));
check('a link near the top jumps to the refund rules', landed.focus === 'refunds' && landed.top >= 0 && landed.top < 200, JSON.stringify(landed));
await page.goto(BASE_URL + 'rules#refunds', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#refunds');
await page.waitForTimeout(700);
const deep = await page.evaluate(() => Math.round(document.getElementById('refunds').getBoundingClientRect().top));
check('/rules#refunds opens at the refund rules', deep >= 0 && deep < 200, String(deep));
await load(null, 'contact');
const reach = await page.evaluate(() => ({ mail: !!document.querySelector('main a[href="mailto:support@tarmem.sa"]'), wa: document.querySelector('main a.ct-wa')?.getAttribute('href'),
  topic: document.querySelector('select[name="topic"]')?.value, first: document.querySelector('select[name="topic"] option')?.disabled,
  privacy: document.querySelector('main a[data-route="privacy"]')?.getAttribute('href') }));
check('the contact page shows the support address and a WhatsApp button, starts on "choose a topic", and links the privacy policy',
  reach.mail && reach.wa === `https://wa.me/${site.whatsapp}` && reach.topic === '' && reach.first === true && reach.privacy === '/privacy', JSON.stringify(reach));
await page.locator('input[name="name"]').fill('سارة');
await page.locator('input[name="phone"]').fill('0555123456');
await page.locator('textarea[name="msg"]').fill('سؤال');
await page.locator('button', { hasText: 'إرسال الرسالة' }).click();
await page.waitForTimeout(300);
check('a message without a topic is refused, and says so where a screen reader hears it',
  (await page.locator('#ct-err[role="alert"]').count()) === 1 && (await page.locator('select[name="topic"]').getAttribute('aria-invalid')) === 'true' && (await page.locator('input[name="name"]').getAttribute('aria-invalid')) === 'false');
await load(null, 'join');
// the three steps: the business, the account, then the trades with the consent
await page.locator('#join-company').fill('مؤسسة البناء المتقن');
await page.locator('.join-card button', { hasText: 'التالي' }).click(); await page.waitForTimeout(150);
await page.locator('#join-person').fill('خالد العتيبي');
if (await page.locator('#join-mobile').count()) {
  await page.locator('#join-mobile').fill('0501112223'); await page.locator('#join-email').fill('khalid@build.example'); await page.locator('#join-password').fill('contractor-pass-1');
}
await page.locator('.join-card button', { hasText: 'التالي' }).click(); await page.waitForTimeout(150);
const join = await page.evaluate(() => ({ agree: !!document.querySelector('#join-agree[required]'), terms: document.querySelector('main label a[data-route="terms"]')?.getAttribute('href'),
  cost: document.querySelector('main')?.innerText.includes('9%'), pricing: document.querySelector('main a[data-route="pricing"]')?.getAttribute('href') }));
check('the application asks to accept the terms and privacy policy, and says what joining costs', join.agree && join.terms === '/terms' && join.cost && join.pricing === '/pricing', JSON.stringify(join));

// M — the home page: the film can be paused, the testimonials take focus, the WhatsApp button keeps to the line's end
await load();
const pause = page.locator('.ph-pause');
const label0 = await pause.getAttribute('aria-label');
await pause.click();
await page.waitForTimeout(300);
const film = await page.evaluate(() => ({ paused: document.querySelector('.ph-vid').paused, label: document.querySelector('.ph-pause').getAttribute('aria-label') }));
check('the hero film has a pause button that pauses it', film.paused && film.label !== label0, `${label0} → ${film.label}`);
check('the testimonials can be reached by keyboard', (await page.locator('.tsti-track[tabindex="0"][role="region"][aria-label]').count()) === 1);
const fab = async () => page.evaluate(() => { const r = document.querySelector('.wa-fab').getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(innerWidth - r.right) }; });
const fabAr = await fab();
const calm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
if (accounts) await installSupabaseMock(calm, site.supabase.url);
const cp = await calm.newPage();
await cp.goto(BASE_URL + '?lang=en', { waitUntil: 'domcontentloaded' });
await cp.waitForSelector('.ph-vid');
await cp.waitForTimeout(600);
const still = await cp.evaluate(() => ({ src: document.querySelector('.ph-vid').getAttribute('src'), poster: document.querySelector('.ph-vid').getAttribute('poster'), button: !!document.querySelector('.ph-pause') }));
const fabEn = await cp.evaluate(() => { const r = document.querySelector('.wa-fab').getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(innerWidth - r.right) }; });
await calm.close();
check('with reduced motion the hero shows its still poster only, with no film and no pause button', !still.src && still.poster && !still.button, JSON.stringify(still));
check('the WhatsApp button sits at the end of the line: left in Arabic, right in English', fabAr.left <= 24 && fabEn.right <= 24, JSON.stringify({ fabAr, fabEn }));

// N — the phone menu: focus goes into it, Escape closes it and returns focus to the menu button
const phoneMenu = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
if (accounts) await installSupabaseMock(phoneMenu, site.supabase.url);
const pm = await phoneMenu.newPage();
await pm.goto(BASE_URL + 'pricing', { waitUntil: 'domcontentloaded' });
await pm.waitForSelector('.hdr .burger');
await pm.waitForTimeout(500);
await pm.locator('.hdr .burger').click();
await pm.waitForTimeout(400);
const opened1 = await pm.evaluate(() => ({ open: document.querySelector('.mainnav')?.getAttribute('data-open'), focus: document.activeElement?.closest('.mainnav') ? document.activeElement.getAttribute('href') : document.activeElement?.tagName }));
await pm.keyboard.press('Escape');
await pm.waitForTimeout(300);
const closed1 = await pm.evaluate(() => ({ open: document.querySelector('.mainnav')?.getAttribute('data-open'), burger: document.activeElement?.classList.contains('burger') }));
await phoneMenu.close();
check('the phone menu takes focus on its first link when it opens; Escape closes it and returns to the menu button',
  opened1.open === 'true' && opened1.focus === '/how' && closed1.open === 'false' && closed1.burger, JSON.stringify({ opened1, closed1 }));

// O — the review's layout fixes: the service tiles use the site's font, the hero's intro wraps by width, and each row of
// the pricing calculator keeps its amount on one line at the end (ar + en, desktop and phone)
const looks = [];
for (const [width, lang] of [[1366, 'ar'], [1366, 'en'], [390, 'ar'], [390, 'en']]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...(width < 500 ? { isMobile: true, hasTouch: true } : {}) });
  if (accounts) await installSupabaseMock(ctx, site.supabase.url);
  const p = await ctx.newPage();
  await p.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await p.evaluate((l) => { localStorage.clear(); localStorage.setItem('tarmem-public-v1', JSON.stringify({ lang: l, route: 'home' })); }, lang);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.hire-c');
  const home = await p.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    tiles: [...document.querySelectorAll('.hire-c')].map((b) => getComputedStyle(b).fontFamily),
    breaks: [...document.querySelectorAll('.ph-lead br')].map((b) => getComputedStyle(b).display),
  }));
  if (!home.tiles.length || home.tiles.some((f) => f !== home.body)) looks.push(`${lang}@${width} tiles in ${[...new Set(home.tiles)].join(', ')} (page: ${home.body})`);
  if (width < 1400 && home.breaks.some((d) => d !== 'none')) looks.push(`${lang}@${width} the hero intro keeps its hard line break`);
  await p.goto(BASE_URL + 'pricing', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.calcbox');
  const rows = await p.evaluate(() => [...document.querySelectorAll('.calcbox > div')].map((row) => {
    const num = row.querySelector(':scope > .num'); if (!num) return null;
    const r = row.getBoundingClientRect(), n = num.getBoundingClientRect(), line = parseFloat(getComputedStyle(num).lineHeight) || parseFloat(getComputedStyle(num).fontSize) * 1.6;
    const endGap = document.dir === 'rtl' ? n.left - r.left : r.right - n.right;
    return { text: num.textContent.trim(), oneLine: n.height < line * 1.5, firstLine: n.top - r.top < line * 0.8, atEnd: endGap < 2 };
  }).filter(Boolean));
  for (const row of rows) if (!row.oneLine || !row.firstLine || !row.atEnd) looks.push(`${lang}@${width} pricing row «${row.text}» ${JSON.stringify(row)}`);
  if (!rows.length) looks.push(`${lang}@${width} no pricing rows found`);
  await ctx.close();
}
check('the service tiles use the page\'s font, the hero intro has no forced break below 1400px, and every pricing row keeps its amount on one line at the end (ar + en, 1366 and 390px)', looks.length === 0, looks.slice(0, 4).join('; '));

// J — ready to open to the public?
const placeholder = site.whatsapp === '966500000000';
check('site.config.json has a real WhatsApp number (required before publicLaunch)', !(site.publicLaunch && placeholder),
  placeholder ? 'still the design\'s dummy number — fine while publicLaunch is false' : site.whatsapp);

console.log(results.join('\n'));
console.log(errors.length ? '\n' + errors.join('\n') : '\nno page errors');
await browser.close();
if (results.some((r) => r.startsWith('FAIL')) || errors.length) process.exit(1);
