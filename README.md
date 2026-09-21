# Tarmem

A Saudi renovation marketplace: homeowners describe a project, verified contractors bid, and
payment is held in escrow and released stage by stage as the homeowner approves the work.

This repository holds both the design and its implementation.

| Path | What it is |
| --- | --- |
| `web/` | **The implementation** — Vite + React + TypeScript. Start here: [`web/README.md`](web/README.md) |
| `project/` | The Claude Design prototype the implementation was built from, with its assets, copy and legal PDFs |
| `chats/` | The design conversations — where the intent behind each decision lives |

Live preview: **https://eddiemnf.github.io/Tarmem/** (published from `main` on every push).

```bash
cd web
npm install
npm run dev
```

## Changing the design

Layout and visual changes belong in Claude Design, not in the code:

1. Open the project at claude.ai/design and make the changes there.
2. Export the bundle, the same way the one in `project/` was produced.
3. Replace `project/` with the new export.
4. Run `npm run sync:template` in `web/`. It regenerates the pages, the
   stylesheet, the copy and the logic from the design file in one pass.
5. `npm run build`, then with `npm run dev` running: `npm run test:parity` (the
   app must render exactly what the design renders) and `npm run test:flows`.
6. Merge to `main`, which publishes it.

Things to watch on that round trip:

- **The generator stops rather than guess.** A new page needs one line in its
  route map; a new kind of top-level block needs a name. It says which. The
  same goes for the handful of places the site deliberately differs from the
  prototype (`LOGIC_PATCHES`, `STYLE_FIXUPS`, `ASSET_REWRITES` in
  `web/tools/convert-template.py`): if the design changes underneath one, the
  run fails and names it.
- **Editing copy inline in Claude Design writes one language only.** It replaces
  the bilingual placeholder with that literal text, so the other language stops
  updating. Change wording in both, or say what it should read and have it
  changed in the string file.
- **Export the file itself, not the preview of it.** Claude Design's preview
  injects a script into the HTML it serves; the generator refuses a design file
  that still carries it. Large files also exceed the design API's 256 KiB read
  limit, so use the handoff download.
- **New trade photographs need `web/tools/optimize-assets.sh`.** The design's
  PNGs are 2-3 MB each; the site serves 900px JPEG copies.

## How the two relate

`project/Tarmem.dc.html` is the approved design: every page, all Arabic and English copy, the
fee structure, and the flows the business depends on. `web/` recreates it as a real app —
markup, styling, copy and logic all generated from the design file, so the two cannot drift.
When the design changes, re-run `npm run sync:template` in `web/` and reconcile.

`project/design_handoff_tarmem/README.md` is the designer's brief for whoever builds this
for real: design tokens, the fee and escrow rules, terminology, and every screen.

`project/` also carries two documents produced alongside the design: `Tarmem Launch Plan.dc.html`
(what launching actually requires — payment licensing first) and `Tarmem UX Audit.dc.html`.

## What the public sees

The site's root is an **early-access site**: the marketing pages, plus a project request, a
contractor application and a contact form that each reach the Tarmem team on WhatsApp. It
carries no accounts, payments or invented figures. The full walkable product below lives at
`/demo` behind the preview password, as a sales tool. `web/README.md` has the detail, and
`docs/going-live.md` lists what has to be true before each next step.

## What works, and what it isn't yet

The whole product is walkable: public site, sign-up with the Nafath gates, both dashboards,
posting and bidding, the two-party services agreement, milestone evidence and approvals,
wallets, admin verification and dispute handling — in Arabic (RTL) and English.

It runs entirely in the browser on seed data, so it is a complete product design rather than a
running marketplace: each visitor gets a private copy and nothing is shared between devices.
The payment, identity and messaging integrations it implies are the subject of the launch plan.
