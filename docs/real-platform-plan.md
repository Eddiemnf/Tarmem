# Making Tarmem work on the website itself

Written 21 September 2026, after the owner asked for customers to post projects, bid and run
projects on the site as designed — not through WhatsApp.

## Why it cannot simply be switched on

The design is a complete product, but it has no server. Everything a visitor does is kept in
their own browser: a posted project is invisible to every contractor, a bid is invisible to
the homeowner, and "accounts" are one shared set of invented data. Opening that to the public
would mean real people posting projects that nobody receives, beside a card form and bank
details that lead nowhere. So the public site stays in early-access mode until the pieces below
exist. Each one replaces part of it as it lands.

## What can be real soon, and what has to wait

| Part of the design | Status |
| --- | --- |
| Accounts, posting projects, bidding, comparing bids, the two-party agreement, milestones with photo/video evidence, approvals, raising an issue, change requests, in-project messaging, reviews, the admin console | **Can be built now** on a hosted database with real accounts. This is the work below. |
| Contractor verification | **Real, by hand at first**: the contractor uploads ID, commercial registration and licences; a Tarmem admin reviews them in the console. Exactly the launch plan's "verify by hand first". |
| Sign-in by mobile code, as designed | Needs an SMS provider with a sender name registered in Saudi Arabia. Until then: **email and password / email code**. The screens stay the same shape. |
| Nafath | Needs a commercial agreement with an authorised provider. No engineering can replace it. Until then the badge says what was actually checked (documents, by Tarmem). |
| Holding homeowners' money, releasing it per stage, the wallet, payouts, tax invoices for fees | **Cannot go live without a SAMA-licensed payment partner.** Holding customers' money is a regulated activity; the site must not collect card numbers or publish bank details before that. Until then the platform records what is due and what was approved, and the two parties pay each other directly. What Tarmem charges in that period is a business decision. |

## What only the owner can do (I cannot create accounts or handle passwords)

1. **Create the database project** — the one blocker for everything else. Recommended:
   [Supabase](https://supabase.com) (accounts, database, file storage and live updates in one
   service; free to start, about 25 USD a month once it must never pause).
   - supabase.com → "Start your project" → **Continue with GitHub** → New project → name it
     `tarmem`, let it generate a database password and save it somewhere safe (never send it to
     me), region **Central EU (Frankfurt)** or **South Asia (Mumbai)**.
   - Then give me two values from *Project Settings → API*: the **Project URL** and the
     **anon public** key. Both are designed to be public; neither is a secret.
   - To set up the tables, either sign in to supabase.com in the browser panel beside our chat
     (I never see your password) and I run the setup in the SQL editor, or I hand you one file to
     paste there.
   - *Ask your lawyer about data residency:* Supabase has no region inside Saudi Arabia, and PDPL
     has rules about keeping personal data abroad. Fine for a pilot; decide before scale.
2. Later, in this order: an email sender (so notifications don't come from a test address), an
   SMS provider, the Nafath agreement, the payment partner.

## How it will be built

In slices, each one live and useful on its own, each replacing a piece of early-access mode:

1. **Accounts and posting.** Homeowners sign up and post projects on the site; you see them in
   the admin console the moment they are posted. *This alone ends the WhatsApp hop for requests.*
2. **Contractors.** Application with document upload, your verification queue, verified
   contractors browsing open projects in their city and trade.
3. **Bids and the agreement.** Private bids (a contractor can never read another's), comparison,
   acceptance, both signatures recorded with time and identity.
4. **Running the project.** Milestones, photo and video evidence, approval, a proper
   "raise an issue" form, change requests, messaging with the contact-details filter.
5. **After the project.** Reviews tied to completed projects, email notifications, admin tools
   for disputes.

Engineering rules for all of it: every permission enforced in the database itself (row-level
security), never only in the browser; private files served through expiring links; the secret
service key never in the site's code; an append-only record of who did what, because that record
is the product's promise in a dispute.

The design's screens stay as they are. What changes is where each action's data goes: today the
design's logic writes to the browser; slice by slice, those writes go to the database instead,
behind the same buttons.

## Where it stands — slice 1 (accounts and posting), 21 September 2026

**Live on www.tarmem.sa since 21 September 2026.** The owner ran the SQL and turned off "Confirm
email"; the security test (`supabase/tests/rls.mjs`, 25 rules) passed against the real database before
anything was published; after publishing, `test:platform` (26) and `test:launch` (20) passed against
the live site. The security test left two accounts named `rls-test-…@tarmem.sa`, one withdrawn
"RLS TEST" project, one message and one application in the database; delete them whenever convenient
(Supabase → Authentication → Users, and the Table editor).

What slice 1 does on the public site:

- **Sign up / sign in** with email and a password (`web/src/platform/AuthPage.tsx`), in the design's
  own frame. The design's mobile code and Nafath return when an SMS provider and Nafath are connected.
- **Post a project** through the design's four-step form. A guest who presses publish is asked to
  create an account, and the project is then saved under their name and opens at `/project/P-2001`.
- **Dashboard** at `/dashboard`: their projects, withdraw an open one, sign out. Wallet, settings,
  profile and contractor search stay hidden until their slices are real.
- **Contact form** and **contractor application** are saved for the team instead of opening WhatsApp.
  The application now asks for a mobile number (the team needs a way to reach the applicant).
- **Team inbox** at `/inbox`, for accounts the owner has marked admin: posted projects with the
  owner's name, mobile and email; applications; messages.
- The floating WhatsApp button and footer link stay, as a way to reach Tarmem — nothing depends on them.

How it is put together: the design's logic still runs untouched. `web/src/platform/` feeds it the
signed-in person and their real projects in the shapes it expects, and replaces the three places where
the prototype only pretended to save (publish, withdraw, contact). Who is signed in is decided by the
database session alone; the guard (`web/src/launch/guard.ts`) discards any other `user`. What anybody
may read or write is decided by the database's own rules in `supabase/001_accounts_projects_forms.sql`,
not by the site.

Tests: `npm run test:platform` (26 checks, in a browser, against a stand-in database — it writes
nothing real), and `node ../supabase/tests/rls.mjs`, which proves the rules against the real database
using only the public key.

### Owner steps (1 and 2 are done; 3 is still to do)

1. Supabase → **SQL Editor** → paste `supabase/001_accounts_projects_forms.sql` → **Run**.
2. Supabase → **Authentication → Sign In / Providers → Email** → turn **off** "Confirm email" → Save.
   (Supabase's built-in mailer sends only a few emails an hour. Turn it back on once Tarmem has its
   own email sender.)
3. After it is live: sign up on the site with your own email, then in the SQL Editor run
   `update public.profiles set role = 'admin' where email = 'you@example.com';` — that opens `/inbox`.

### Known gaps in slice 1, on purpose

- **Forgotten password**: the page says to message Tarmem. Self-service reset needs the email sender.
- **Photos**: the form says uploads are on the way. They come with storage rules in a later slice.
- **No new-project alert**: the team has to look at `/inbox`. An email or WhatsApp alert per new
  project comes with the email sender.
- **PDPL**: the database is in Frankfurt. Whether Saudi residents' personal data may be kept there is
  a question for the lawyer before real volume.

## The designed admin console, on real data — 21 September 2026

The owner asked for the console exactly as designed, not the plain inbox. An account marked admin in
the database now gets the design's admin role and lands on `/admin`: the design's own page
(`web/src/pages/AdminPage.tsx`, generated from the design file) and its own handlers, fed from the
database by `web/src/platform/admin.ts` instead of seed lists. Nothing invented is shown:

| Tab | What it shows now |
|---|---|
| Overview | every posted project; real counts. Money figures are true zeros until payments exist |
| Analytics + live view | the site's own visit record (`web/src/platform/track.ts` → table `visits` → function `admin_analytics`): visitors now, today vs yesterday, week / month / year, top pages, sources, cities, devices, a live feed of sign-ups, projects, applications and messages. No cookies, no IP addresses; the team's own browsing is not counted; refreshed every 20 seconds while the tab is open |
| Verification | contractor applications, with the person and mobile to call; Approve / Reject update the application |
| Support cases | contact-form messages with the sender; Resolve marks one handled |
| Users | every homeowner account and every contractor who applied |
| Promo codes, Affiliates | created, paused and archived as designed, saved in `admin_state`. Nothing can redeem a code until payments exist, so usage figures are true zeros |
| Late & refunds, Payments | empty until milestones and payments are real |

The design's analytics were labelled "simulated data until Google Analytics 4 is connected"; they are
now first-party and real. The GA card is still the design's (it stores an ID and sends nothing).
The plain `/inbox` stays one click away (the dark bar), because it is the one place that lists a
customer's mobile and email next to their project.

Owner step: run `supabase/002_admin_console.sql` in the SQL Editor. Until then the console works but
its analytics read zero and promo codes are not kept. Both scripts are tested before the owner is
asked to run them, in a private Postgres (`supabase/tests/local.mjs`), and the visitor-side rules are
re-checked on the real database with `RLS_VISITOR_ONLY=1 node ../supabase/tests/rls.mjs` (creates no accounts).

For the lawyer: the Privacy Policy should mention that the site keeps its own record of page views
(page, language, device type, referring site; no cookies, no IP address, no name).

## Contractor accounts — 21 September 2026

The owner applied as a contractor, approved himself in the admin console, and then could not sign in:
the application had created no account. Now the application form creates it (`signUpContractor` in
`web/src/platform/session.ts`): email + password, a `contractor` profile, and an application stamped
with that account (`supabase/004_contractor_accounts.sql`).

- Until an admin verifies the application the contractor can sign in, and their dashboard says the
  account is being verified. The design's "verify through Nafath" gate is what shows it; until Nafath
  is connected it stands for Tarmem's own verification. "Check again" re-reads the status.
- **Approve** in the admin console marks the application verified and opens WhatsApp to the
  contractor's own number with a ready-written "your account is live" message and the sign-in link.
  The admin presses send. Sending it with no click at all needs the WhatsApp Business API (a Meta
  business account, a verified number, an approved message template, and a server-side token); when
  the owner has those, the same message can be sent from a database function on approval.
- A verified contractor lands on the designed contractor dashboard and can browse open projects at
  `/projects`. They never see who posted a project: the homeowner's name, mobile and email are in a
  table contractors cannot read.
- **Bidding is the next slice.** Until bids are saved for real, the project page's bid form is replaced
  by the same gate saying bidding opens soon — it never pretends to send a bid. Next: a `bids` table
  (a contractor sees only their own; a homeowner sees those on their projects), the homeowner's compare
  view, then the two-party agreement.

Owner step: run `supabase/004_contractor_accounts.sql`. An application made before this (with no
account) still shows in Verification; approving it sends a message asking the contractor to create
their account on the join page.

## Bids — 21 September 2026

`supabase/005_bids.sql` + `saveBid` / `chooseBid` in `web/src/platform/session.ts`.

- A verified contractor bids through the design's own form (price, duration, note, inclusions, exclusions,
  brands, start date, warranty, validity, stage split, VAT, site visit). The whole form is kept, so the bid
  reads back exactly as written. One bid per project; a contractor never sees another contractor's bid.
- The homeowner sees the bids on their project in the design's list and compare view, with the bidder's
  company, city and trades — never the mobile, email or licence number from the application.
- **Accept** records the homeowner's choice (`status = 'chosen'`) and tells both sides that the Tarmem team
  completes the agreement with them. The design goes on to a two-party agreement, stages and payment; those
  are the next slice, and the agreement modal is not opened until its signatures can be saved.
- The team sees every bid under its project in the contact list (`/inbox`), with the contractor's mobile
  and a tick on the chosen one.

`supabase/cleanup_test_rows.sql` removes what the security tests left behind, and only that. After it has
been run, check the database with `RLS_VISITOR_ONLY=1 RLS_NO_WRITES=1 node ../supabase/tests/rls.mjs`, which
writes nothing.

## The agreement, password reset, freshness and alerts — 21 September 2026

- **The two-party agreement** (`supabase/006_agreements.sql`, `signAgreement` in `web/src/platform/session.ts`). Accept opens the
  design's own agreement; it cannot be signed before it is read to the end. The homeowner's signature is written by a database
  function that checks who is calling, keeps a copy of the bid as signed, and marks the bid chosen; the homeowner may still switch
  to another bid until the contractor counter-signs. The contractor's signature awards the project (active, theirs, at the agreed
  amount). Both names and both times show on the project, as designed. Nothing about a signed agreement can be changed from the site.
- **Payment and stages are honest about not being live.** After both signatures the design asks for Nafath and a card. Until a
  payment partner is connected that card says "payment on the site is being set up" and that the team arranges the first payment;
  the stages tab says stages start with the first payment. No fake card form, no Nafath theatre, no Nafath branding on Tarmem's
  own messages.
- **Forgotten password**: a reset link by email, then a "choose a new password" form, then their dashboard. It never says whether an
  address has an account. **Owner step, once**: Supabase → Authentication → URL Configuration → Site URL = `https://www.tarmem.sa`,
  and add `https://www.tarmem.sa/**` under Redirect URLs — otherwise the emailed link points at `localhost`. Supabase's built-in
  mailer sends only a few emails an hour; connect a real sender (Authentication → Emails → SMTP) before real volume.
- **Freshness**: every signed-in page re-reads its data once a minute while it is in front, and when the tab comes back to the
  front — new bids, signatures and status changes appear without a reload (the design's bell counts them).
- **Alerts for the team**: while the admin console is open in a tab, new projects, applications, messages and bids put a count in
  the tab's title and, if the browser was allowed, a desktop notification. Alerts with no tab open (email / WhatsApp) need a sender.
- **Phone check**: `npm run test:sweep` opens every signed-in page for a customer, a contractor and the team, in Arabic and
  English at 360 and 390 px (140 page views), and fails on a page error, a page wider than the screen, or an empty page.
  It found the signed-in header running off a phone's edge (fixed: the account chip shows the initial only on phones).
- A bug the tests caught before any customer did: a reset-password link was signed out the moment it opened, because the page
  restored a saved "nobody is signed in" over the session the link had just created.

Still to build: stages with photo/video evidence and approvals (they go live with payment), settings / profile pages, reviews,
alerts with no tab open, automatic WhatsApp on approval (needs the WhatsApp Business API), Nafath, payment.

## Settings, profiles, reviews, photos for contractors, and stages waiting behind a switch — 22 September 2026

`supabase/007_settings_reviews_stages.sql` (26 local checks) and the code beside it.

- **Settings** (`/settings`) and **my profile** (`/profile`) are the designed pages, saved to the person's own profile row: mobile,
  notification choices, language; name, city and "about". The sign-in email is shown but not changed there. "Close my account" is a
  request to the team, as the design words it. The WhatsApp-notifications card stays hidden until the WhatsApp Business API exists.
- **Verified contractors see a project's photos** while it is open for bids (or theirs): they need them to price the work.
- **Reviews**: one per finished project, by its homeowner, for the contractor who did the work; a contractor's rating, review count
  and finished projects now come from real rows (they show beside their bids).
- **Stages are built and switched off.** Every awarded project gets three stages. The contractor submits one with photos and a
  video (really uploaded, into the stage's own folder); the homeowner approves with their own photo of the finished work, or
  disputes; the last approval completes the project, which opens the review. Every step is a database function that checks the
  caller, the order of stages, that the project's payment is in, and that the evidence is really in storage.
  Nothing moves — and the site shows no stages — until the owner runs, in the SQL editor:
  `update public.platform_flags set enabled = true where key = 'payments_live';`
  Until a payment provider reports payments by itself, an admin records "payment received" per project (a button in `/inbox`,
  shown only once the switch is on). **The provider integration itself (taking and releasing money) is not written**: it depends
  on which licensed partner is signed, and must not be switched on before that.
- **Alerts with no tab open**: `supabase/functions/notify/index.ts` + `docs/alerts-setup.md` (email through Resend now; WhatsApp when
  its API is set up). The owner deploys it, because it holds secrets.

## Contractor profiles, and the wallet behind the payments switch — 22 September 2026

`supabase/008_contractor_profiles_wallet.sql` (16 local checks).

- **A contractor's public profile** (`/firm/<id>`) is the designed page on real rows only: the verified company name, the city,
  trades and introduction the contractor maintains, their real rating, review count and finished projects, and their real reviews
  with the reviewer's first name only. The design's stock "work" photos, its two made-up reviews and its made-up response and
  on-time figures are not shown; a portfolio of real photos is a later slice. Homeowners open it from a bid; a contractor opens
  their own from the account menu. No contact details are ever part of it.
- **The contractor's edit form** saves the introduction (50–500 characters), city and trades to their profile. The company name
  stays the one Tarmem verified (the design locks the field; the save refuses a different name too).
- **The wallet is built and switched off** with the same switch as stages (`platform_flags.payments_live`). With it on:
  a contractor saves a Saudi IBAN for payouts (a table only they and admins can read), homeowners' deposits and contractors'
  payouts are recorded as REQUESTS that an admin confirms (`wallet_decide`) until a payment provider reports money by itself,
  and balances come from confirmed rows only. With it off there is no wallet link, `/wallet` opens nothing, and the database
  refuses every wallet write.
  **Before switching on**: the bank-transfer details the design shows for deposits (escrow IBAN, bank, beneficiary, reference)
  are the design's placeholders and must be replaced with the payment partner's real account; the provider integration that
  actually takes and releases money is still to be written against that partner's API.

## Emails to customers and contractors, portfolios, and the wallet-approval screen — 22 September 2026

- **`supabase/010_customer_emails.sql`** (21 local checks). The database emails, the moment it happens: a posted project → its
  owner; a bid → the owner (settings: bids); the owner's signature → the chosen contractor ("review and sign"); the
  counter-signature → the owner ("awarded"); a verified application → the contractor ("sign in"); a contact message with an
  email → a receipt (once a day per address); a stage moving → the other party (settings: stages; only once payments are
  live). In the person's language; nobody's contact details ever appear in somebody else's email; every send in `email_log`;
  at most 20 an hour per address; a failure never blocks the action. The team's own bid alert now names the project and company.
- **`supabase/011_portfolio.sql`** (11 local checks). A second, public bucket `portfolio`: a verified contractor adds up to
  12 photos of their work under their own id (8 MB, images only), captions them, removes their own; nobody touches anyone
  else's. The design's "own work" grid on the profile shows them; the uploader sits under it, only for the profile's owner.
- **The wallet-approval screen**: under the admin console's payments table, every deposit or payout awaiting confirmation,
  with who asked and which project; Confirm / Reject call `wallet_decide`. It exists only while payments are live.
- Two class markers were added to the design file for the inserts (`own-work`, `pay-table`): docs/design-changes-to-mirror.md.

Browser test: 91 checks. Owner steps: run 010 and 011 in the SQL editor.

## WhatsApp, built and waiting — 22 September 2026

`supabase/012_whatsapp.sql` (with 010, 29 local checks). Every update the database emails it can also send to the person's
WhatsApp through Meta's official Cloud API, with one approved template (`tarmem_update`: two lines + a URL button) in Arabic and
English. Saudi numbers are normalised (`wa_number`); non-Saudi numbers are skipped and logged; contact-form senders never get one;
the same settings as the emails apply; at most 20 an hour per number; failures never block. Switched on with
`set_whatsapp(token, phone_number_id, template)`, which refuses a malformed token; off with `set_whatsapp(null)`. The token lives in
`app_secrets`. Owner's guide with drawn screens: the "Tarmem WhatsApp" artifact. Still to do when it is on: make the design's
WhatsApp card on the settings page real (opt-out toggle), a line in the Terms about WhatsApp updates, and later a receiver for replies.

## A walk through the site as a customer, a contractor and the team — 22 September 2026

Checked: every kind of page on desktop and phone, WCAG 2.1 AA with axe-core (`scratchpad/audit.mjs`, not in the repo),
every link on the public pages, what a visitor sees when the database is unreachable, bundle and asset sizes.

Fixed:
- **The hero video was 6.6 MB** on every home visit. Re-encoded (no tool on the Mac; ffmpeg via npm in a scratch folder):
  1.05 MB at 720p for desktops, 0.41 MB at 480p for phones, and none at all when the browser asks to save data
  (`heroVideo` in viewModel.ts; the converter rewrites the video's `src`). The frame quality was checked by eye.
- **Accessibility**: 27 form labels are now linked to their controls and 5 nameless controls (search filters, the
  pricing slider and calculator) have spoken names — done in the converter (`a11y_pass`), so it survives every
  regeneration; parity ignores those additions. Contrast: the language switch, small orange text (kickers, in-page
  links, phone/email links), table headers and inactive tabs were between 3:1 and 4.4:1; on the public site they use
  one step deeper shades (#6B6986 grey, #C53B1C orange). The demo keeps the design's exact colours. Result: 0 violations.
- A brand-new contractor's bid read "★ 0.0 · 0 projects" — now "★ New". An open project's headline figure is its
  budget range, not the top figure alone. Signed-in and transactional pages carry `noindex`. The early-access notice
  says contractors are verified by hand for now.
- Confirmed already fine: the home page renders without the database; sign-in and the contact form explain a
  failure in a sentence; all links work (x.com answers 403 to robots, which is X, not us).

For the owner (not changed): the public how / pricing / FAQ / rules pages describe Nafath verification and money held
with a payment provider as facts — true of the full product, not of early access. Worth a sentence per page, or a
lawyer's pass, before real volume. The JS bundle is one 303 kB (gzipped) file; splitting the admin console out would
trim a visitor's first load, at some risk to the generated-page architecture — left as is.

## WhatsApp switched on — 22 September 2026

Done live with the owner, screen by screen, in Safari (Chrome is not connected; Safari is view-only for Claude): a new
SIM **+966 53 450 7400** registered on Meta's Cloud API (PIN kept by the owner), a permanent token pasted by the owner into
the SQL editor (`set_whatsapp`, phone number ID `1377051788817873`), and `tarmem_update` submitted in Arabic and English.
Meta's category checker rejected the first wording as Marketing because of the closing slogan; the template now reads as an
account update (the exact texts are in `supabase/012_whatsapp.sql`'s header and the owner's guide). Still the owner's:
a card on the WhatsApp account (Meta refuses business-initiated messages without one), business verification (Security Center),
and re-running 012 once — the copy in the database calls Graph API v21.0, which Meta retires around October 2026; the file
says v25.0. Then a real test: post a project from an account whose mobile is the owner's number.

Still to do on the site once messages flow: a WhatsApp switch on the settings page (the email switches already apply to
WhatsApp), a line in the Terms, and later a receiver for replies.

## The WhatsApp card on the settings page — 22 September 2026

`supabase/013_whatsapp_settings.sql` (22 local checks in `supabase/tests/local-whatsapp-settings.mjs`). The design's card is now
real: the account's mobile with a **Send test message** button that really sends (`whatsapp_test()`, three a day); the channel
choice — WhatsApp with the emails, or the emails alone (`prefs.channel = 'email'`; SMS is not offered, it does not exist);
**quiet hours** — between 11pm and 8am Riyadh an ordinary update waits in `wa_queue` until 8am (`prefs.quiet = false` turns
this off; payment and dispute alerts and test messages go at once), emptied by pg_cron every 10 minutes and by any other send.
`set_whatsapp` keeps `platform_flags.whatsapp_live` in step, which is what shows the card (`vm.whatsapp`; the converter's
`LAUNCH_HIDDEN_CONDITIONS`). The card's two untrue lines ("reply to open the project", "a new verification code") are replaced
on the public site (`waSub`, `waNumberNote` in copy.ts). The Terms gained a Notifications paragraph (design-changes-to-mirror.md).

A gotcha that cost an hour: `npm run typecheck` was `tsc -b --noEmit false`, which wrote a compiled `.js` next to every source
file; Vite then served those stale copies and every browser test failed in ways that pointed nowhere. The script is now plain
`tsc -b`. If tests fail inexplicably, `git status` for untracked `.js` under `web/src`.

Owner steps: run 013; the card appears on /settings for every signed-in person the moment the templates are Active.

## One WhatsApp template per event, submitted by the database — 22 September 2026

Meta's classifier moved both `tarmem_update` templates from Utility to Marketing ("did not meet our utility guidelines"):
a body that is almost entirely variables reads as a blank cheque. `supabase/014_whatsapp_templates.sql` (22 local checks in
`supabase/tests/local-whatsapp-templates.mjs`) defines nine templates that name their event in fixed words — project posted,
new bid, bid accepted, agreement signed, account verified, stage submitted / released / disputed, and the test message — in
Arabic and English (`wa_template_specs()`), and `wa_submit_templates()` posts all eighteen to Meta's template API through
pg_net with the stored token, as Utility with `allow_category_change: false` (a mismatch now rejects instead of silently
re-filing). The last line of 014 runs it. Sending changed with it: `send_whatsapp(mobile, lang, event, params[], path)`,
and `notify_people` passes the specifics (code, company, amount, days…); the Meta template is `tarmem_<event>`. Quiet hours,
the channel choice, the throttle and the test button are unchanged; `wa_delete_template('tarmem_update')` removes the old pair.
Meta's answers to the submission are in `net._http_response`. If Meta's reply says the token lacks permission, the token from
"Generate token" has messaging rights only, and a system-user token with `whatsapp_business_management` is needed — or the
nine templates are typed in by hand from `wa_template_specs()`.

**015 (same night):** the first submission never reached Meta — pg_net logged "A libcurl function was given a bad argument"
with no status code. Cause: the switch-on block trimmed spaces around the pasted token, and `trim()` leaves line breaks alone,
so the stored token carried the line's newline and libcurl refused the Authorization header. `015_secret_whitespace.sql` strips
whitespace from the stored secrets, makes `set_whatsapp` strip and validate (`^[A-Za-z0-9]{40,}$`), and resubmits the templates.
Lesson for every pasted secret: strip `\s`, then validate the shape; `set_alerts` already did (its regex would have refused).

**016 (same night):** Meta's Arabic checker re-filed five of the eighteen as Marketing: project posted, new bid, account verified,
agreement signed (Arabic only) and the test message (both languages). The pattern was the word عرض/عروض — "bid" but also
"promotional offer" — present in every flagged Arabic body and absent from every Arabic one that passed; the test message named
no account. `016_arabic_templates_reworded.sql` rewords the five with عطاء and status wording ("confirmation", "status: open for
bids", "account status: verified", "the number linked to your account is confirmed"), deletes the old five and resubmits them
under `_2` names (`wa_template_name(event)` resolves the name; `wa_submit_templates(p_events)` submits a subset). All eighteen
were accepted as Utility on submission. Lesson for Arabic utility templates: avoid عرض, name the transaction and its status.

**017 (same night):** one template was re-filed once more, the Arabic bid message. It still said "a new bid arrived" with a
plural of bids — the shape of an offer. `017_bid_template_as_record.sql` writes it as a status record ("status update for
project no. …: bid number {{2}} was received from {{3}}, {{4}} riyals, {{5}} days"), the bid's number on the project being a
new variable that `notify_people` counts; both languages under `tarmem_new_bid_3`. Rules that held for Meta's Arabic checker:
no عرض, no جديد, no plurals, and name the transaction and its status.

## The delivery log in the admin inbox, with the providers' real answers — 23 September 2026

`supabase/018_delivery_answers.sql` (11 local checks in `supabase/tests/local-delivery-answers.mjs`): every email and WhatsApp
the database sends keeps pg_net's request id on its `email_log` row, and `wa_reconcile()` copies the provider's reply back —
`answer` = accepted, the provider's refusal in its own words, or "timed out" — for rows of the last day (pg_net forgets sooner).
It runs every ten minutes under pg_cron where that exists, and the admin console calls it whenever the inbox opens (admins
only; the cron runs with no user). The inbox (`InboxPage.tsx`) gained a "Messages sent" table: time, channel, event, recipient,
outcome. Also: approving a contractor no longer pops a ready-written WhatsApp once `whatsapp_live` is on — the database sends
the "account verified" template itself. Owner step: run 018.

## A visitor's full walk — 23 September 2026

Fourteen public pages on desktop and phone in both languages (80 screenshots), then 101 signed-in states as customer,
contractor and team. Fixed and live (commit be66399): sign in shown over the home video (`[data-launch] .ulnk.hide-over`);
settings wording (email signs in, mobile is for contact/WhatsApp) and only the three real notification switches; the
homeowner "verified with Nafath" card and the contractor dashboard's typed-in performance figures hidden (design markers
`hp-identity`, `perf-card`); the contractor profile's protect line without Nafath; saved contractors kept in `prefs.saved`;
the Messages tab honest (`messagesVals`: no composer, a note) until messaging is real; contact topics reordered; bids-tab copy
names WhatsApp when it is on; the portfolio grid fills columns. Report for the owner: the "Tarmem visitor walk" artifact.
Next builds it recommends: real in-project messaging; measured profile performance; a "page not found" line; WebP trade
photos; hiding the WhatsApp fab on form pages on phones.

## Messages inside a project — 23 September 2026

`supabase/019_messages.sql` (15 local checks in `supabase/tests/local-messages.mjs`): `project_messages` rows, a thread being one
project and one contractor. Rules: the owner and that contractor read it; the owner writes to any contractor with a live bid or
the award, a verified contractor writes on projects they bid on or were awarded; `mark_messages_read(project, contractor)` is
the reader's. `notify_people` tells the other party by email and WhatsApp (`tarmem_new_message`, submitted by the script) with a
snippet, naming the homeowner by first name and the contractor by company, unless "new messages" is off in their settings. Site:
`loadMessages` / `sendMessage` / `markMessagesRead` (session.ts), the thread loaded on opening a project and refreshed every
minute (bind.ts `loadProjectMessages`), `messagesVals` builds the design's `msgRows`, the tab count is the unread count, Enter
sends, and a homeowner with several bidders picks the thread under the card (`ThreadPicker.tsx`, inserted after the design's
`msg-card` marker). The "new messages" switch on the settings page is real again. Owner step: run 019.

**Also today, from the walk (quick wins):** a wrong address shows a one-line notice on the home page (`notFound` state,
urls.ts/App.tsx); an error screen instead of a blank page (`ErrorScreen.tsx`); the ten trade photos re-encoded to 800px
(2.6 MB → 0.8 MB, same files); security headers and a year's cache for assets in vercel.json; the floating WhatsApp button
stays off the form pages on phones; an open project's progress box says stages start once it is awarded.

