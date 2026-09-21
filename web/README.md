# Tarmem — web

Implementation of the Tarmem marketplace design (`../project/Tarmem.dc.html`), built with
Vite + React + TypeScript. Arabic-first with RTL throughout and an English switcher.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, then bundle to dist/
npm run preview    # serve the production bundle
npm run test:launch # the public site: nothing invented, nothing private, requests really leave
npm run test:flows  # the demo: smoke-test the core flows against a running dev server
npm run test:parity # the demo: prove it renders exactly what the design prototype renders
```

Both tests drive a real browser with Playwright; on a fresh machine run
`npx playwright install chromium` once first.

## Two sites in one build

| Address | What it is |
| --- | --- |
| `/` | **The public early-access site.** Only what is true today: the marketing pages, a project request, a contractor application and the contact form. Each of those writes a WhatsApp message to the Tarmem team, which the visitor sends themselves. No accounts, no payments, nothing stored. |
| `/demo` | **The full product design**, walkable on invented data — every dashboard, wallet and admin screen. A sales tool, always behind the preview password. |

`site.config.json` holds the facts the design only has placeholders for:

```json
{ "whatsapp": "9665XXXXXXXX", "email": "support@tarmem.sa", "publicLaunch": false }
```

`publicLaunch` is the switch that opens `/` to the world. While it is `false` the public site
sits behind the preview password too, so it can be reviewed on the real domain first.
**Do not switch it on while `whatsapp` is still the design's dummy number** — requests would
go to a stranger; `npm run test:launch` fails in that case.

How the public site is made (all in `src/launch/` plus three rule tables in the converter):

- **Nothing private can become the current page.** The design's logic runs unchanged, but every
  state it adopts passes through `guard.ts` first: private routes are redirected to the request
  form, the application form or home; nobody can be signed in; the demo's saved state lives
  under a different storage key and cannot follow a visitor across.
- **Nothing invented is rendered.** `LAUNCH_HIDDEN_*` in the converter wrap the live-visitor
  counter, the headline figures, the testimonials, the partner logos and the links into the
  product in `vm.launch ? null : (…)`. The footer's line about a licensed payment partner is
  blanked until one is signed.
- **Requests really leave.** Publishing the project form as a guest, sending the contact form,
  and the contractor application each open WhatsApp with the message written out
  (`deliver.ts`), then a page that says plainly nothing is sent until the visitor presses Send,
  with the same message by email as the fallback. When a backend exists, `deliver.ts` is the
  file that changes.

The early-access copy is in `src/launch/copy.ts`. It is this implementation's wording, not
approved design copy: it makes no promise about reply times, fees or payments.

## What's here

| Path | What it holds |
| --- | --- |
| `src/pages/` | One component per route (23 of them), generated from the design template |
| `src/components/` | Header, footer, back link, the dialogs and shell blocks (generated); the image slot and the preview gate (hand-written) |
| `src/state/designLogic.generated.ts` | The design's own logic class, carried over verbatim |
| `src/state/designRuntime.ts` | The small host that class runs on — the prototype runtime's contract |
| `src/state/viewModel.ts` | Binds that class to React; pages read its `renderVals()` as `vm.*` |
| `src/data/tarmem-data.ts` | Seed marketplace data and all approved Arabic/English copy (generated) |
| `src/data/extra-copy.ts` | Copy added by this implementation, kept apart from the approved copy |
| `src/styles/global.css` | The design's stylesheet, verbatim, then app-only rules below a marker |
| `tools/convert-template.py` | Regenerates all of the above from the design file |
| `tools/optimize-assets.sh` | Makes the lighter copies of the design's trade photographs |
| `src/launch/` | The public early-access site: mode, state guard, WhatsApp delivery, its two pages and copy |
| `site.config.json` | WhatsApp number, mailbox, and the `publicLaunch` switch |
| `tests/launch.mjs` | The public site: nothing invented or private is reachable, and every request produces a real message |
| `tests/flows.mjs` | The demo: browser smoke test for agreement signing, funding, milestones and fees, posting |
| `tests/parity.mjs` | Renders 45 states in the app and in the prototype and compares the DOM |

## How the port works

The design prototype runs on Claude Design's runtime: `<sc-if>` / `<sc-for>` elements and
`{{ expr }}` bindings, resolved against the object returned by `renderVals()` on one logic
class (`class Component extends DCLogic`). That runtime is React underneath, and the class
only ever touches `props`, `state`, `setState` and the three lifecycle methods.

So nothing is transcribed by hand. `tools/convert-template.py` reads the design file and emits:

- **the markup** as page components — classes, inline styles, SVG paths and animation hooks
  land exactly as designed;
- **the stylesheet**, verbatim;
- **the copy and seed data**, verbatim, from `../project/tarmem-i18n.js`;
- **the logic class**, verbatim, onto `designRuntime.ts` — a ~100-line host with the same
  contract as the prototype's. The fee, VAT and escrow arithmetic is therefore the design's
  own code, not a re-implementation of it.

`npm run test:parity` is what keeps this honest: it puts the app and the prototype into the
same state, 45 times over, and fails if their rendered DOM differs anywhere.

The site departs from the prototype in a few deliberate, named places, all in the converter
and all fail-loud if the design moves underneath them:

| What | Why |
| --- | --- |
| `LOGIC_PATCHES` — the assistant calls `ai/client.ts` | A deployed site has no `window.claude`, and no model key may sit in client code |
| `LOGIC_PATCHES` — the data module is imported, not fetched | It is bundled with the app |
| `LOGIC_PATCHES` — both `componentWillUnmount`s run | The design declares the method twice, which silently drops its first cleanup |
| `ASSET_REWRITES` — trade photographs are 900px JPEGs | The design's PNG placeholders are 2-3 MB each, 24 MB on the landing page |
| `tools/departures.json` → `styleFixups` — fixed sizes become limits | Sizes left behind by dragging in the visual editor: a fixed height clips the longer English, and the "four steps" heading's fixed 914px width made the home page scroll sideways on every phone |
| `tools/departures.json` → `literalTranslations` — English for eight Arabic-only strings | Copy typed straight into the design replaces the bilingual binding, so English visitors got Arabic in the hero and two headings. The English is this implementation's, not approved wording |
| `LOGIC_PATCHES` — the saved-state key comes from `launch/mode.ts` | The public site and the demo must never share saved state |
| `LAUNCH_HIDDEN_*` — invented content and links into the product | The public site shows only what is true today (see above) |
| The WhatsApp links use `site.config.json` | The design points them all at a dummy number |

Because everything in `src/pages/`, `src/components/{Header,Footer,…}`, `src/state/designLogic.generated.ts`,
`src/data/tarmem-data.ts` and the top of `global.css` is generated, change the design file and
re-run the converter rather than editing them — the next sync would overwrite a hand edit.

`?lang=en` opens a fresh visit in English, and on the demo `?role=homeowner|contractor|admin`
opens one in that role — the prototype's two editor props. They never override a returning
visitor's saved state, and the public site ignores `role` entirely.

## Data, money and identity

State lives in the browser (seed data plus `localStorage`), exactly as the prototype did.
Every visitor gets their own private copy, so this is a complete, walkable product design,
not a running marketplace — two people on two phones see two unconnected worlds.

All money arithmetic is ordinary code, never model output: the 1% homeowner service fee
added to each milestone, the 9% contractor service fee deducted from it, 15% VAT on each of
those fees (never rounded to whole riyals), milestone splits, held balances and the admin
revenue figures are computed by the design's logic (`feeOf` and friends) from project state.
Fees are collected per milestone at approval, never at funding — `tests/flows.mjs` checks it.

Nafath verification, OTP sign-in and payments are **illustrative flows**, not integrations.
They demonstrate the gates the real product needs — contractors verify before bidding,
homeowners before funding — and the corresponding contracts (a licensed payment partner,
an SMS provider, a real Nafath integration) are what `../project/Tarmem Launch Plan.dc.html`
sets out.

## The assistant

The brief assistant and contractor matching call the endpoint named by `VITE_AI_ENDPOINT`
(see `.env.example`). That endpoint holds the API key server-side; no key belongs in client
code. With none configured the planning workspace says the assistant isn't connected and
leaves the brief editable by hand — an honest preview rather than a simulated service.

Matching itself stays split the way the brief asked: code filters contractors by city and
verification, and the model only ranks and explains using facts present in those records.

## Fonts and assets

IBM Plex Sans Arabic (plus Tajawal and Manrope, which the hero uses) loads from Google Fonts
in `index.html`; the converter checks that list against the design's. Self-host them before
launch if you'd rather not depend on a third party.

Everything the design references sits in `public/assets/` under the same path it has in
`../project/assets/`: the hero film and its poster, both logos, the partner logos and About
photograph (`locked/`), and the three legal PDFs. Two folders are produced rather than copied:
`trades/` holds the JPEG copies from `tools/optimize-assets.sh`, and `slots/` holds the
photographs the designer dropped onto image slots in Claude Design, written by the converter.

Contractor cards use `ImageSlot`. A slot the designer filled shows that photograph; an empty
one accepts a dropped photo, kept per browser, until real photography is wired to `src`.
The trade and partner imagery is placeholder — see "Before shipping" in the handoff brief.

## Publishing

Pushing to `main` builds this app and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`) at https://eddiemnf.github.io/Tarmem/.

Pages serves the site from a sub-path, so `vite.config.ts` sets `base` to
`/Tarmem/`. Building for a domain root instead — a custom domain, Netlify,
Vercel, or any plain static host — just needs `BASE_PATH=/ npm run build`.

## Known gaps

- No backend, so no shared state, accounts, uploads or notifications between devices.
- No routing in the URL: `state.route` drives the page, so pages aren't linkable or
  bookmarkable yet, and there's no 404. Worth fixing when this goes on a real domain.
- The main bundle is ~810 kB, ~210 kB gzipped (mostly the seeded copy, data and the admin
  console's logic); split it if that matters.
- Eight strings were typed straight into the design in Arabic only (the home hero's lead and
  button, the assistant and four-steps headings, the contractors page intro). The site gives
  them English from `tools/departures.json`; that wording has not been approved. Move them
  into the design's string table and the converter will say the entries can go.
- On a phone the design's header row is wider than the screen over the hero, which put the
  menu button off it in both languages. An app-only rule at the bottom of `global.css` hides
  the join button below the width where the row stops fitting (it is the first item in the
  menu). The design itself still has the problem.
