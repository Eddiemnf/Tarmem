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
