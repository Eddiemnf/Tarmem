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
| `src/components/TarmemHero/` | The approved landing-page hero (villa film), and its site wiring |
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

## The landing-page hero

`src/components/TarmemHero/TarmemHero.tsx` is the approved hero export, ported to
TypeScript with the same DOM, classes and playback behaviour. Two adaptations:
text arrives through a `copy` prop so the EN toggle works on it, and `dir`/`lang`
follow the site language. `TarmemHeroSection.tsx` holds the site wiring — copy,
direction, asset URLs and the two flows the buttons run.

Three departures from the export, all deliberate:

- **The site header stays above the hero** (`header={false}`). It is shared by
  every route and carries the account menu, notifications and language toggle,
  so it cannot move inside a landing-page-only component. The export documents
  this as the supported alternative to adapting the navigation.
- **The contractor button moved into the hero's action column.** It lives in the
  hero's own header in the approved design, which this site does not render.
- **The assistant bar moved below the hero** (`components/AssistantBar.tsx`).
  It used to sit inside the old hero; without it the planning workspace would
  have no entry point.

The film is silent H.264 and plays once, holding on the finished frame, with a
poster fallback when it cannot decode and no autoplay under reduced-motion or
data-saver. The generator swaps the design file's old hero section for this
component — see `NODE_REPLACEMENTS` in `tools/convert-template.py`.

The English hero copy is a translation written during integration, not approved
wording; the Arabic is verbatim from the export.

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
