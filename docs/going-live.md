# Going live

Written 21 September 2026. Read alongside `project/Tarmem Launch Plan.dc.html`, which sets
out the full road to a marketplace that can hold money; this file is the short version of
*what has to be true before each switch is flipped*.

## Where things stand

- **`/` is an early-access site.** Marketing pages, a project request, a contractor
  application and a contact form. Each request is written into a WhatsApp message that the
  visitor sends to the Tarmem team themselves. No accounts, no payments, nothing stored, no
  invented figures, testimonials or partner logos.
- **`/demo` is the full product**, walkable on invented data — the sales tool. It always sits
  behind the preview password.
- **`/` opened to the public on 21 September 2026** (`"publicLaunch": true` in
  `web/site.config.json`), with the real WhatsApp number in place. Setting it back to `false`
  and publishing puts the public site behind the preview password again.

## Still open after opening

Item 1 is done. The rest went live as they stood, by the owner's decision on the day; each is
still something only the business can settle, and none needs an engineer beyond a small change.

| # | What | Why it blocks |
| --- | --- | --- |
| 1 | ~~The real WhatsApp Business number~~ — done, +966 53 037 3026 | `npm run test:launch` refuses a public launch with the design's dummy number. |
| 2 | **Confirm `support@tarmem.sa` is a monitored mailbox** | It is the fallback on every request and is printed in the footer. |
| 3 | **Someone answers.** Decide who watches that WhatsApp, and when | The contact page (approved design copy) says Sunday–Thursday 9–6 and "usually within one business day". Either make that true or change the wording. |
| 4 | **What does early access cost a customer?** | The request form's last step still carries the platform's terms: a 1% service fee added to each milestone payment, and an undertaking not to take the project off-platform. With no payments on the site yet, say what actually applies during early access — or confirm these terms stand. |
| 5 | **Contractors ready to recommend** | The launch plan's point: the first homeowner who asks and hears nothing does not come back. Recruit and verify by hand first. |
| 6 | **Terms and privacy reviewed** | They are readable drafts, not reviewed by a lawyer. The privacy policy should describe what really happens now: the visitor sends their own details over WhatsApp; the site stores nothing. |

Worth doing, not blocking:

- The How-it-works, Pricing, Help, FAQ and Rules pages describe the full platform (money held
  with a payment partner, Nafath verification, staged release). The notice on every page says
  accounts and payments are not active yet; once a payment partner is signed, re-read them
  against the real contract.
- The footer reads "© 2025" — a literal in the design file.
- The English wording for eight strings the design has in Arabic only (`web/tools/departures.json`)
  was written for the site. Have it read before English matters commercially.
- Two phone problems came from the design and are corrected on the site, not in it: a heading
  with a fixed 914px width made the home page scroll sideways, and the header row pushed the
  menu button off the screen. Fix both in Claude Design when convenient.
- The design's English copy still says "Money held in escrow" on the home page, which the
  handoff brief asks to avoid until a licensed escrow agreement exists.
- A visitor counter and analytics: add a GA4 measurement ID when you have one.
- Requests live only in WhatsApp. When volume justifies it, add a record (a sheet or CRM):
  `web/src/launch/deliver.ts` is the one place that changes.

**To close it again:** set `publicLaunch` to `false` in `site.config.json` and publish.

## After that: the real platform

The launch plan's sequence still holds. In terms of what the site can honestly turn on, and
what each step waits for:

| Step | What visitors gain | What it needs that only the business can arrange |
| --- | --- | --- |
| 1. Accounts and a shared record | Homeowners post, contractors bid, both message and share files — one world instead of one per browser. Admin verification on real documents. | A hosting/database account and an SMS provider for login codes (accounts in the company's name; keys go into the host's settings, never into the code). |
| 2. Identity | The "verified" badge backed by Nafath and the commercial register. | A commercial agreement with an authorised Nafath provider. Lead time is mostly waiting. |
| 3. Money | Funding a project, staged release on approval, payouts, the three ledger documents, ZATCA-compliant invoices for Tarmem's fees. | **A SAMA-licensed payment partner.** Holding a homeowner's money between stages is a regulated activity; this is the critical path, and the partner's rules may change the product. VAT registration. |
| 4. Closed pilot, then open launch | Real projects in one city, operated by hand at first. | The written verification standard and dispute procedure the launch plan describes. |

Until step 3 is real, the site must not collect, hold or appear to hold money: no card forms,
no bank details, no wallet. The guard in `web/src/launch/guard.ts` and `tests/launch.mjs`
enforce that the demo's versions of those can never reach a public visitor.
