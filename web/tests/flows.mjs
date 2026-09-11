/* Smoke test for the ported business logic.

   Start the app first (`npm run dev`), then: `npm run test:flows`.
   Set BASE_URL if the dev server is not on the default port.

   These walk the flows the design chats treated as the product's spine: the
   two-party agreement gate, escrow funding and its 5% service fee, milestone
   evidence gating, and the posting undertaking. */

import { chromium } from 'playwright';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173/';
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e).slice(0, 300)));
page.on('console', m => { const t=m.text(); if (m.type()==='error' && !t.includes('ERR_CONNECTION')) errors.push('CONSOLE: '+t.slice(0,200)); });
const results = [];
const check = (name, ok, detail='') => { results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('tarmem-state-v3') || '{}'));
const setLS = async (patch) => {
  await page.evaluate((p) => {
    const k = 'tarmem-state-v3';
    const s = JSON.parse(localStorage.getItem(k) || '{}');
    Object.assign(s, p);
    localStorage.setItem(k, JSON.stringify(s));
  }, patch);
  await page.reload({ waitUntil:'domcontentloaded' }); await page.waitForTimeout(350);
};

await page.goto(BASE_URL, { waitUntil:'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil:'domcontentloaded' });
await page.waitForTimeout(500);

// A — language switch
await page.locator('button.langbtn').first().click();
await page.waitForTimeout(250);
check('language switch to English', (await state()).lang === 'en', 'dir=' + await page.evaluate(() => document.documentElement.dir));
await page.locator('button.langbtn').first().click();
await page.waitForTimeout(250);

// B — demo sign-in as homeowner
await setLS({ route: 'auth' });
await page.locator('summary').click();
await page.waitForTimeout(200);
await page.locator('button', { hasText: 'مالك منزل' }).last().click();
await page.waitForTimeout(400);
let s = await state();
check('demo sign-in as homeowner', s.user?.role === 'homeowner' && s.route === 'hdash', 'route=' + s.route);

// C — accept a bid opens the agreement, scroll unlocks signing
await setLS({ route:'project', curId:'P-1052', tab:'bids' });
await page.locator('button', { hasText: 'قبول العرض' }).first().click();
await page.waitForTimeout(300);
const signBtn = page.locator('button', { hasText: 'أوافق وأوقّع' }).first();
const disabledBefore = await signBtn.isDisabled();
await page.locator('.agrbody').evaluate(el => el.scrollTo(0, el.scrollHeight));
await page.waitForTimeout(300);
const disabledAfter = await signBtn.isDisabled();
check('agreement sign gated on reading to the end', disabledBefore && !disabledAfter, `before=${disabledBefore} after=${disabledAfter}`);
await signBtn.click();
await page.waitForTimeout(400);
s = await state();
let proj = s.projects.find(p => p.id === 'P-1052');
check('homeowner signature records a pending award, not an award', !!proj.pending && proj.status === 'open' && !!proj.sig?.ho, 'status=' + proj.status);

// D — contractor counter-signs, which awards the project
await setLS({ user: { role:'contractor', name:'نور للديكور الداخلي', nafath:true }, route:'project', curId:'P-1052', tab:'overview' });
await page.locator('button', { hasText: 'راجع الاتفاقية' }).first().click();
await page.waitForTimeout(300);
await page.locator('.agrbody').evaluate(el => el.scrollTo(0, el.scrollHeight));
await page.waitForTimeout(250);
await page.locator('button', { hasText: 'أوافق وأوقّع' }).first().click();
await page.waitForTimeout(400);
s = await state();
proj = s.projects.find(p => p.id === 'P-1052');
check('contractor signature awards the project and creates stages',
  proj.status === 'active' && proj.contractorId === 'c2' && proj.ms.length === 3 && !proj.pending,
  `status=${proj.status} contractor=${proj.contractorId} stages=${proj.ms.length}`);

// E — funding charges the 5% service fee
await setLS({ user: { role:'homeowner', name:'عبدالله القحطاني', nafath:true }, route:'project', curId:'P-1052', tab:'payments' });
await page.locator('button', { hasText: 'إيداع' }).first().click();
await page.waitForTimeout(400);
s = await state();
proj = s.projects.find(p => p.id === 'P-1052');
const fee = proj.ledger.find(l => l.label === 'fee');
check('funding holds escrow and charges the homeowner fee',
  proj.funded && fee && fee.amount === Math.round(proj.amount * 0.05),
  `amount=${proj.amount} fee=${fee?.amount}`);

// F — milestone approval is gated on the owner's acceptance photo
await setLS({ user: { role:'contractor', name:'نور للديكور الداخلي', nafath:true }, route:'project', curId:'P-1052', tab:'milestones' });
const submit = page.locator('button', { hasText: 'تقديم للاعتماد' }).first();
await submit.waitFor({ timeout: 10000 });
const submitBlocked = await submit.isDisabled();
const needNote = await page.locator('text=أرفق صورًا ومقطع فيديو').count();
check('stage cannot be submitted without photos and video', submitBlocked && needNote > 0, `disabled=${submitBlocked} note=${needNote}`);
// attaching both unlocks it
await page.locator('label', { hasText: 'صور' }).first().locator('input[type=file]').setInputFiles({ name:'a.jpg', mimeType:'image/jpeg', buffer: Buffer.from('x') });
await page.waitForTimeout(200);
await page.locator('label', { hasText: 'فيديو' }).first().locator('input[type=file]').setInputFiles({ name:'a.mp4', mimeType:'video/mp4', buffer: Buffer.from('x') });
await page.waitForTimeout(300);
const nowEnabled = await page.locator('button', { hasText: 'تقديم للاعتماد' }).first().isEnabled();
check('attaching evidence unlocks submission', nowEnabled);

// G — post a project end to end
await setLS({ user: { role:'homeowner', name:'عبدالله القحطاني', nafath:true }, route:'post' });
await page.locator('input[name="title"]').fill('تجديد غرفة الجلوس');
await page.locator('textarea[name="desc"]').fill('تغيير الأرضيات والدهانات، 30 م².');
await page.locator('button', { hasText: 'التالي' }).first().click();
await page.waitForTimeout(200);
await page.locator('input[name="min"]').fill('20000');
await page.locator('input[name="max"]').fill('35000');
await page.locator('button', { hasText: 'التالي' }).first().click();
await page.waitForTimeout(200);
await page.locator('button', { hasText: 'التالي' }).first().click();
await page.waitForTimeout(250);
const publish = page.locator('button', { hasText: 'نشر المشروع' }).first();
await publish.click();
await page.waitForTimeout(250);
const blockedByPledge = await page.locator('text=التعهد').count() > 0 || (await state()).route === 'post';
await page.locator('label.radio').first().click();
await page.waitForTimeout(150);
await publish.click();
await page.waitForTimeout(400);
s = await state();
const posted = s.projects.find(p => p.title?.ar === 'تجديد غرفة الجلوس');
check('posting requires the undertaking before publishing', blockedByPledge);
check('project publishes and opens its workspace', !!posted && s.route === 'project' && s.curId === posted?.id, 'route=' + s.route);

// H — state survives a reload
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(400);
s = await state();
check('state persists across reload', s.projects.some(p => p.title?.ar === 'تجديد غرفة الجلوس'));

console.log(results.join('\n'));
console.log(errors.length ? '\n' + errors.join('\n') : '\nno page errors');
await browser.close();
if (results.some((r) => r.startsWith('FAIL')) || errors.length) process.exit(1);
