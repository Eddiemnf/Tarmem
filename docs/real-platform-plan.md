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
