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
4. Run `npm run sync:template` in `web/`, then `npm run build` and check the site.
5. Merge to `main`, which publishes it.

Two things to watch on that round trip:

- **The landing-page hero is not in the design file.** It comes from a separate
  export and the generator substitutes it for the design's old hero section
  (`NODE_REPLACEMENTS` in `web/tools/convert-template.py`). If a redesign renames
  or removes that section the generator stops with an error rather than silently
  dropping something — resolve it by deciding which hero should win.
- **Editing copy inline in Claude Design writes one language only.** It replaces
  the bilingual placeholder with that literal text, so the other language stops
  updating. Change wording in both, or say what it should read and have it
  changed in the string file.

Anything genuinely new — a section with behaviour, a new page — also needs
wiring in `web/src/state/viewModel.ts`; the generator only carries markup.

## How the two relate

`project/Tarmem.dc.html` is the approved design: every page, all Arabic and English copy, the
fee structure, and the flows the business depends on. `web/` recreates it as a real app —
markup generated from the design file, logic ported by hand, styling carried over verbatim.
When the design changes, re-run `npm run sync:template` in `web/` and reconcile.

`project/` also carries two documents produced alongside the design: `Tarmem Launch Plan.dc.html`
(what launching actually requires — payment licensing first) and `Tarmem UX Audit.dc.html`.

## What works, and what it isn't yet

The whole product is walkable: public site, sign-up with the Nafath gates, both dashboards,
posting and bidding, the two-party services agreement, milestone evidence and approvals,
wallets, admin verification and dispute handling — in Arabic (RTL) and English.

It runs entirely in the browser on seed data, so it is a complete product design rather than a
running marketplace: each visitor gets a private copy and nothing is shared between devices.
The payment, identity and messaging integrations it implies are the subject of the launch plan.
