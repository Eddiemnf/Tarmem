/* Parity test: the app must render exactly what the design prototype renders.

   Start the app first (`npm run dev`), then: `npm run test:parity`.
   Set BASE_URL if the dev server is not on the default port.

   The pages, stylesheet, copy and logic are all generated from
   ../project/Tarmem.dc.html, so the React app and the prototype should produce
   the same DOM for the same state. This drives both into each scenario below
   (through the saved-state key they share), serialises the rendered tree, and
   fails on the first difference. Run it after every `npm run sync:template`:
   a difference means the converter or the host no longer matches the design
   runtime, which no type-check would catch.

   Normalised away, because they are not differences in what a visitor sees:
   the runtime's <span class="sc-interp"> text wrappers, <image-slot> vs the
   ImageSlot component, the JPEG copies of the trade photographs, the one
   STYLE_FIXUPS departure, and figures that animate or tick (the live visitor
   counter, the count-up statistics). */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const APP = process.env.BASE_URL || 'http://localhost:5173/';
const PROJECT = resolve(fileURLToPath(new URL('../../project/', import.meta.url)));
const only = process.argv[2];

// ---------------------------------------------------------------- the prototype, served locally
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.pdf': 'application/pdf',
};
const server = createServer(async (req, res) => {
  try {
    const file = join(PROJECT, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!file.startsWith(PROJECT) || (await stat(file)).isDirectory()) throw new Error('not a file');
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const DESIGN = `http://127.0.0.1:${server.address().port}/Tarmem.dc.html`;

// ---------------------------------------------------------------- scenarios
const HO = { role: 'homeowner', name: 'عبدالله القحطاني', nafath: true };
const CO = { role: 'contractor', name: 'نور للديكور الداخلي', nafath: true };
const AD = { role: 'admin', name: 'Operations' };
const S = (name, state) => ({ name, state });
const scenarios = [
  S('home-ar', { route: 'home', lang: 'ar' }),
  S('home-en', { route: 'home', lang: 'en' }),
  ...['how', 'pricing', 'about', 'help', 'faq', 'rules', 'terms', 'privacy', 'contact', 'auth', 'contractors', 'plan']
    .map((route) => S(`${route}-ar`, { route, lang: 'ar' })),
  S('pricing-en', { route: 'pricing', lang: 'en' }),
  S('contractor-profile', { route: 'contractor', curId: 'c1', lang: 'ar' }),
  S('hdash-ar', { route: 'hdash', lang: 'ar', user: HO }),
  S('hdash-en', { route: 'hdash', lang: 'en', user: { ...HO, name: 'Abdullah Al-Qahtani' } }),
  S('post', { route: 'post', lang: 'ar', user: HO }),
  S('wallet-homeowner', { route: 'wallet', lang: 'ar', user: HO }),
  S('settings', { route: 'settings', lang: 'ar', user: HO }),
  ...['overview', 'bids', 'milestones', 'messages', 'files', 'payments']
    .map((tab) => S(`project-homeowner-${tab}`, { route: 'project', curId: 'P-1041', tab, lang: 'ar', user: HO })),
  S('project-open-bids', { route: 'project', curId: 'P-1052', tab: 'bids', lang: 'ar', user: HO }),
  S('cdash', { route: 'cdash', lang: 'ar', user: CO }),
  S('browse', { route: 'browse', lang: 'ar', user: CO }),
  S('wallet-contractor', { route: 'wallet', lang: 'ar', user: CO }),
  ...['overview', 'milestones', 'payments']
    .map((tab) => S(`project-contractor-${tab}`, { route: 'project', curId: 'P-1041', tab, lang: 'ar', user: CO })),
  S('project-contractor-open', { route: 'project', curId: 'P-1052', tab: 'overview', lang: 'ar', user: CO }),
  S('homeowner-profile-masked', { route: 'homeowner', curId: 'h1', lang: 'ar', user: CO }),
  ...['overview', 'verification', 'support', 'payments', 'users', 'analytics', 'late', 'promos', 'affiliates']
    .map((atab) => S(`admin-${atab}`, { route: 'admin', atab, lang: 'ar', user: AD })),
];

// ---------------------------------------------------------------- DOM snapshot (runs in the page)
const snapshot = () => {
  const root = [...document.querySelectorAll('div[dir]')].find((d) => d.querySelector('header') && d.querySelector('main'));
  if (!root) return null;
  const KEEP = ['class', 'style', 'href', 'src', 'type', 'name', 'placeholder', 'role', 'dir', 'disabled', 'readonly',
    'aria-label', 'aria-current', 'aria-selected', 'aria-expanded', 'aria-pressed'];
  const clean = (v) => String(v).replace(/\s+/g, ' ').trim();
  const lines = [];
  const walk = (node, depth) => {
    const pad = '  '.repeat(depth);
    if (node.nodeType === 3) {
      const text = clean(node.nodeValue);
      if (text) lines.push(`${pad}"${text}"`);
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') return;
    if (tag === 'span' && node.className === 'sc-interp') {
      for (const child of node.childNodes) walk(child, depth);
      return;
    }
    if (tag === 'image-slot' || node.hasAttribute('data-image-slot')) {
      lines.push(`${pad}<image-slot>`);
      return;
    }
    const attrs = [];
    for (const key of KEEP) {
      if (!node.hasAttribute(key)) continue;
      let value = clean(node.getAttribute(key));
      if (key === 'style') {
        value = value.split(';').map((d) => d.trim().replace(/\s*:\s*/, ':')).filter(Boolean).sort().join(';');
      }
      if (key === 'src') value = value.replace(/^\.?\//, '').replace(/(assets\/trades\/\d\d)\.(png|jpg)/, '$1.IMG');
      attrs.push(`${key}=${value}`);
    }
    for (const attr of node.attributes) {
      if (attr.name.startsWith('data-') && !/^data-(sc|dc|omelette)/.test(attr.name)) attrs.push(`${attr.name}=${clean(attr.value)}`);
    }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') attrs.push(`.value=${clean(node.value)}`);
    if (tag === 'input' && (node.type === 'checkbox' || node.type === 'radio')) attrs.push(`.checked=${node.checked}`);
    lines.push(`${pad}<${tag}${attrs.length ? ' ' + attrs.sort().join(' | ') : ''}>`);
    for (const child of node.childNodes) walk(child, depth + 1);
  };
  walk(root, 0);
  // The two renderers split adjacent text nodes differently — join them.
  const merged = [];
  for (const line of lines) {
    const last = merged[merged.length - 1];
    const indent = line.match(/^\s*/)[0];
    if (last && line.trimStart().startsWith('"') && last.trimStart().startsWith('"') && last.match(/^\s*/)[0] === indent) {
      merged[merged.length - 1] = `${last.slice(0, -1)} ${line.trim().slice(1)}`;
    } else {
      merged.push(line);
    }
  }
  return merged;
};

const volatile = (line) => line
  .replace(/;min-height:519px/, '').replace(/;height:519px/, '')
  .replace(/"[\d,]+\+?"|"\d+%"/g, '"#"')
  .replace(/opacity:[\d.]+/g, 'opacity:#')
  .replace(/transform:[^;|>]+/g, 'transform:#');

// ---------------------------------------------------------------- run
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const render = async (url, state) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate((saved) => {
    localStorage.clear();
    localStorage.setItem('tarmem-state-v3', JSON.stringify(saved));
  }, state);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => [...document.querySelectorAll('div[dir]')].some((d) => d.querySelector('header') && d.querySelector('main')),
    null, { timeout: 15000 },
  ).catch(() => {});
  await page.waitForTimeout(3300); // entrance animations and the statistic count-up settle
  const lines = ((await page.evaluate(snapshot)) || []).map(volatile);
  await page.close();
  return { lines, errors };
};

let failed = 0;
for (const scenario of scenarios) {
  if (only && scenario.name !== only) continue;
  const [app, design] = [await render(APP, scenario.state), await render(DESIGN, scenario.state)];
  let at = 0;
  while (at < app.lines.length && at < design.lines.length && app.lines[at] === design.lines[at]) at++;
  const same = app.lines.length > 0 && app.lines.length === design.lines.length && at === app.lines.length;
  if (!same || app.errors.length) failed++;
  console.log(`${same && !app.errors.length ? 'PASS' : 'FAIL'}  ${scenario.name.padEnd(30)} ${app.lines.length} nodes`
    + (app.errors.length ? `  page errors: ${app.errors.join(' | ')}` : ''));
  if (!same) {
    console.log(`      first difference at node ${at}`);
    console.log(`      app:    ${(app.lines[at] || '(end)').trim().slice(0, 220)}`);
    console.log(`      design: ${(design.lines[at] || '(end)').trim().slice(0, 220)}`);
  }
}
await browser.close();
server.close();
console.log(failed ? `\n${failed} scenario(s) differ from the design` : '\nthe app renders every scenario exactly as the design does');
if (failed) process.exit(1);
