# Tarmem — web

Implementation of the Tarmem marketplace design (`../project/Tarmem.dc.html`), built with
Vite + React + TypeScript. Arabic-first with RTL throughout and an English switcher.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check, then bundle to dist/
npm run preview    # serve the production bundle
npm run test:flows # smoke-test the core flows against a running dev server
```

`test:flows` drives a real browser with Playwright; on a fresh machine run
`npx playwright install chromium` once first.

## What's here

| Path | What it holds |
| --- | --- |
| `src/pages/` | One component per route (22 of them), generated from the design template |
| `src/components/` | Header, footer, back link, the two profile dialogs, the image slot |
| `src/state/store.tsx` | The single app state object, its updates and its persistence |
| `src/state/viewModel.ts` | Every value and handler the pages bind to (`vm.*`) |
| `src/data/tarmem-data.ts` | Seed marketplace data and all approved Arabic/English copy |
| `src/data/extra-copy.ts` | Copy added by this implementation, kept apart from the approved copy |
| `src/styles/global.css` | The design's stylesheet, carried over verbatim |
| `tools/convert-template.py` | Regenerates the page components from the design file |
| `tests/flows.mjs` | Browser smoke test for agreement signing, funding, milestones, posting |

## How the port works

The design prototype ran on Claude Design's runtime: `<sc-if>` / `<sc-for>` elements and
`{{ expr }}` bindings resolved against one big object returned by `renderVals()`.

Two halves were treated differently:

- **Markup is generated.** `tools/convert-template.py` reads the design file and emits the
  page components — classes, inline styles, SVG paths and animation hooks land exactly as
  designed, with no transcription drift. Re-run it with `npm run sync:template` after the
  design file changes, then reconcile anything new it references.
- **Logic is hand-ported.** `src/state/viewModel.ts` mirrors `renderVals()` key for key, so
  the generated markup keeps working and the two files can be diffed against the original.

Because the markup is generated, prefer editing the design file and re-running the converter
over hand-editing `src/pages/*`. If you do edit a page directly, note it — the next sync
would otherwise overwrite it.

## Data, money and identity

State lives in the browser (seed data plus `localStorage`), exactly as the prototype did.
Every visitor gets their own private copy, so this is a complete, walkable product design,
not a running marketplace — two people on two phones see two unconnected worlds.

All money arithmetic is ordinary code, never model output: 5% homeowner service fee, 10%
contractor commission, milestone splits, escrow balances and the admin revenue figures are
computed in `viewModel.ts` from project state.

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

IBM Plex Sans Arabic loads from Google Fonts in `index.html`; self-host it before launch if
you'd rather not depend on a third party. Images, logo and the three legal PDFs sit in
`public/assets/`. Contractor cards, portfolios and the About page use `ImageSlot`, which
accepts a dropped photo per browser until real photography is wired to `src`.

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
- The main bundle is ~560 kB (mostly the seeded copy and data); split it if that matters.
