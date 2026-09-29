# Changes made in the repo's design file — mirror them in Claude Design

`project/Tarmem.dc.html` and `project/tarmem-i18n.js` in this repo are now **ahead of** the
project in Claude Design. Until the same changes are made there, the next export would undo
them. Paste the message below into Claude Design (or upload these two files over the ones in
the project), then export as usual.

---

> Please make these changes to Tarmem, in both Arabic and English where copy is involved:
>
> **Footer**
> 1. Link the X icon to `https://x.com/Tarmemsa` and the LinkedIn icon to
>    `https://www.linkedin.com/company/tarmemsa/` (new tab, like Instagram). Remove the Snapchat icon.
> 2. Show the current year instead of "© 2025".
>
> **Bids**
> 3. A contractor must never see other contractors' bids. On a project, a contractor sees only
>    their own bid row and their own count on the "العروض" tab. Under the table tell them:
>    "يرى صاحب المنزل وحده جميع العروض. لا يطّلع أي مقاول على عروض المقاولين الآخرين."
> 4. In the bid form, when the price is above the homeowner's maximum budget, show a gentle note
>    under the price panel: "عرضك أعلى من الحد الأعلى لميزانية صاحب المنزل. يمكنك إرساله، ويحسُن أن توضح السبب في نطاق العمل."
>
> **Late delivery**
> 5. A stage whose evidence has been submitted is waiting on the homeowner, so it must not be
>    labelled "متأخر منذ…" or count as the contractor's lateness. While it is under review the
>    contractor's banner should read: "قدّمت إثبات إنجاز المرحلة الحالية، وهي الآن بانتظار اعتماد
>    صاحب المنزل. لا يُحتسب تأخير جديد خلال مدة المراجعة."
>
> **Copy shown to the wrong role**
> 6. Contractor's milestones tab: the auto-review note and the footnote are written to the
>    homeowner ("يمكنك اعتمادها أو تسجيل مشكلة", "سيظهر لك التفصيل الكامل قبل التأكيد"). Give the
>    contractor their own wording.
> 7. Homeowner's wallet: "مستحقات بانتظار اعتماد صاحب المنزل" → "مراحل بانتظار اعتمادك"; a
>    released payment's status should read "مصروفة للمقاول", not "متاحة".
>
> **Small bugs**
> 8. Homeowner dashboard projects table prints the currency twice ("ريال ريال" / "SAR SAR").
> 9. Dates from date pickers and the agreement's signing date show as `2026-10-05`; show them in
>    words ("5 أكتوبر 2026" / "5 October 2026").
> 10. Message times show English weekdays ("Mon 09:40") in Arabic.
> 11. The message filter hides phone numbers, emails and links but lets "واتساب" and "تيليجرام" through.
>
> **Terminology (your own rules from the handoff brief)**
> 12. "صاحب المنزل / أصحاب المنازل" everywhere — never "مالك / مالكو / المالكين" (29 places, e.g.
>     "أنا مالك منزل" on Pricing).
> 13. Contractor-facing "رسوم خدمة", not "عمولة" ("تُخصم عمولة 9%", "تُسوَّى العمولة").
> 14. Contractor wallet: "تحويل", not "سحب" ("المستحقات والسحب", "حساب سحب", "قبل أن تتمكن من السحب").
> 15. "محفوظ لدى مزود الدفع", not "الضمان" / "escrow", until a licensed escrow agreement exists
>     (14 Arabic places, 32 English sentences — including "Money held in escrow" on the home page
>     and the agreement clause "حساب الضمان واعتماد المراحل").
>
> **Layout**
> 16. The home page's "أربع خطوات…" heading has a fixed `width: 914px; height: 51px`, which makes
>     the page scroll sideways on every phone. Remove both.
> 17. On a phone the header row over the hero (logo · language · join button · menu) is wider than
>     the screen, which pushes the menu button off it. Drop or shrink the join button on phones and
>     put a small "مقاول؟ انضم إلى ترميم" link under the hero button instead.
> 18. On a desktop the language switch is hidden over the hero above 1120px; keep it visible.
> 19. Wide tables (projects, bids, the payment ledger, admin tables) push the page sideways on a
>     phone; let them scroll inside their card.
> 20. The hero lead, the hero button, the assistant heading, the four-steps heading and the
>     contractors-page intro were typed in Arabic only, so English shows Arabic. Move them into the
>     string table.

---

## Still needs a product decision (not changed anywhere yet)

These came out of using the product end to end. Each needs a decision or a designed screen, so
none has been patched in code.

| # | What happens today | What to decide |
| --- | --- | --- |
| A | **How the homeowner pays is contradictory.** The project page says deposit the whole agreed amount up front, with no fees now. The wallet asks to deposit each stage separately. At approval the 1% fee and VAT are "added", with no explanation of how they are collected from money already held. | One model, stated the same way everywhere: whole amount up front, or stage by stage — and when the fee is actually charged. |
| B | **"تسجيل مشكلة" is one click** — no description, no photos — and the homeowner can mark it resolved a second later. | A form: what is wrong, photos, what outcome they want; and who is allowed to close it. |
| C | The late banner's **"طلب تمديد / تسجيل عائق / رفع إثبات الإنجاز" all just open the project overview.** | Real forms for an extension request (new date, reason) and an obstacle (what, evidence), and the homeowner's side of each. |
| D | **Signing up lands in a populated account.** A new contractor's first screen is a third late strike on a project they never took; their bid appears under "البناء للترميم"; a homeowner who signs up as "منى" becomes "إياد محمد فيرق" after a refresh. | For the demo: an empty first-run state for sign-ups, and the populated account only through "تصفّح المنصة بصفتك". In the real product this disappears. |
| E | Sign-up asks a contractor's **trades as free text**, while the profile uses chips. | Chips in both; and the open question from the brief — gating trades by licence. |
| F | The welcome gift is **500 riyals off Tarmem's fee** — which is the *entire* 1% fee on any project up to 50,000. | Whether that is intended. |
| G | The request form lists **43 trades**. | The launch plan says start with the ten you can supply. |
| H | The owner's real name is the seeded demo homeowner, and the demo data ships inside the public site's code. | Use an invented name in the seed data. |


## Added 21 September 2026 — the suggested budget now comes from real rates and the described size

Paste-ready for Claude Design:

> In `tarmem-i18n.js` add the two exports `PRICE_GUIDE` and `PRICE_TEXT` exactly as they are in the repository's
> `project/tarmem-i18n.js` (just above `CITIES`). In the logic, add the method `sugFor(f)` above `publishPost()`,
> make `post.sug` and both `useSuggestion` handlers use it, and in the project form's budget step show
> `{{ post.sug.note }}` where `{{ t.post.sugNote }}` was. Copy all three from `project/Tarmem.dc.html`.
> The old `BUDGETS` table stays as a fallback for a trade with no rate.

Why: the ranges were placeholders, and the English note claimed they were "the average actually paid on similar
projects here". Sources and method: `docs/price-guide.md`.


## Added 22 September 2026 — two class markers, no visible change

> On the contractor profile page, the grid that lists `prof.ownWork` gets `class="own-work"`. In the admin console's
> payments tab, the card holding the payments table gets `class="card pay-table"`.

Why: the public site inserts its own pieces after those two elements (the contractor's photo uploader, and the team's
list of wallet requests awaiting confirmation). Nothing renders differently in the design.


## Added 22 September 2026 — a Terms paragraph on notifications

> In `pages.terms` (both languages), after "Accounts and identity": **Notifications** — Tarmem sends project updates to
> the mobile number and email on the account, by email and by WhatsApp; payment and dispute alerts are always sent; the
> other updates, and WhatsApp itself, can be switched off on the settings page, where quiet hours hold ordinary WhatsApp
> updates from 11pm to 8am; no marketing on WhatsApp.

Why: the WhatsApp updates are live (supabase/012, 013), and Meta's rules need the customer's agreement to be on record.
Wording for the lawyer's pass; it describes exactly what the database does.


## Added 23 September 2026 — two class markers, no visible change

> On the contractor dashboard, the "profile performance" card gets `class="card perf-card"`. On the homeowner profile, the
> identity card gets `class="card hp-identity"`.

Why: the public site hides both — the first shows figures typed into the design (128 views, 31%, 4h), the second says
"verified with Nafath" while Nafath is not connected. The demo keeps both as designed.


## Added 23 September 2026 — a class marker, no visible change

> On the project page, the Messages tab's card gets `class="card msg-card"`.

Why: the public site inserts, under it, the homeowner's choice of which contractor's thread is shown (one thread per
bidder, supabase/019). The demo keeps the single in-memory thread as designed.


## Changed 23 September 2026 — the contractor button moves into the hero

> In the home hero, the primary pill and a new glass pill `ph-b2` ("join as a contractor", `t.footer.join`, `goAuth`) sit in a
> `.ph-row`; the caption stays below. Over the hero the header no longer shows its "join as a contractor" button
> (`.hdr[data-over="true"] .join-over{display:none}`); scrolled, the header is unchanged.

Why: the owner's call — a contractor's button belongs next to the customer's, not in the corner of the header. Same glass
look as before, fully rounded to match the primary pill. The public site's phone-only text link under the hero is retired.


## Changed 23 September 2026 — the post page's confirmation state, and the console's project rows

> `post` gains a `done` object (`{id, first, files}`) set by `publishPost`; the page shows `.post-done` (a check, the
> `t.post.done*` copy, the project number, three "what happens next" lines, two buttons: `postOpenDone`, `postAnother`)
> and the form only while `post.editing`. Styles `.post-done*`. In the admin console the "all projects" rows carry
> `data-id` and `onClick="{{ openAdminProject }}"` (opens the project page).

Why: the owner asked for a proper confirmation after publishing, and for the team to reach a project's photos from the
console. Both are in the design so the site keeps generating from it.


## Changed 23 September 2026 — the console's detail views

> New top-level blocks `av.app`, `av.case`, `av.user` (mapped by the converter to
> `components/Admin{Application,Case,User}Modal.tsx`), opened from "view" buttons on the verification, support and users
> rows (`openVerif`, `openCase`, `openUser`; `closeAdminView`); the case view has a reply box (`caseReply`, `setCaseReply`,
> `sendCaseReply`); state `adminView`; copy under `t.admin.dv`; styles `.dv-*`; `userRows` carry `id` and `kind`.

Why: the owner wants to see everything behind a row before approving, resolving or contacting anyone.


## Changed 23 September 2026 — erase from the person record, a legal line, a honeypot

> The console's person record shows "mobile verified" and, for the team, an "erase this account" button with a confirm
> step (`eraseUser`, `eraseUserConfirm`, `eraseUserCancel`; `av.user.canErase/eraseAsk/eraseError`). The footer's bottom
> bar has `<span class="legal-line">{{ legalLine }}</span>` (empty in the design). The contact form has a hidden
> `website` field (`.hp-field`) bots fill and people never see.

Why: the owner asked for account deletion, the site needs its legal identity in the footer, and the public forms need
spam protection that costs visitors nothing.


## Changed 24 September 2026 — settings for admins, a busy test button

> The account menu shows "Settings" for every role (the admin's own contact details and the WhatsApp test); the
> WhatsApp card's test button carries `disabled="{{ wa.busy }}"` (`wa.busy` from `setg.waBusy`). On the site an admin's
> settings page has no delete-account card, and one test goes out at a time.

Why: the owner needed to send the WhatsApp test to their own number as the admin, and three fast presses had sent three.
> Also: the WhatsApp card reports the test's outcome under its button (`wa.error`, red, beside the existing `wa.sentTo` line).

## Changed 24 September 2026 — two switches for the real site

> The analytics tab's "Connect Google Analytics 4" card is wrapped in `<sc-if value="{{ an.gaCard }}">` (the design sets
> `gaCard: true`). The project overview's owner name is a link inside `<sc-if value="{{ pj.ownerLink }}">`, with a plain-text
> twin under `pj.ownerPlain` (the design sets `ownerLink: true, ownerPlain: false`). The demo is unchanged.

Why: on the real site the GA card installed nothing and remembered the id in one browser only, so it is off there; and
only a homeowner has a profile page to open, so contractors and the team see the owner's name as text instead of a link
that bounced them to their dashboard.

## Changed 28 September 2026 — who runs Tarmem, complaints, cookies

> Copy only (`tarmem-i18n.js`, both languages): the Terms gain "Complaints"
> and "Your statutory rights" before "Governing law"; the privacy policy opens with "Who we are" (Tarmem and its support address) and gains "Cookies and
> browser storage", "Security", a fuller "Your rights", "Questions and complaints" and "Changes to this policy", and
> "Retention" covers account details. The privacy page shows its own date (`t.pages.privacyUpdated`, the template's
> privacy header used `termsUpdated`). The contact topics gain "A complaint about Tarmem" before "Something else". The
> agreement modal's `fullNote` ends with "Pressing “I agree and sign” concludes the agreement and binds you to it."

Why: the E-Commerce Law asks a store to say who runs it and how complaints are handled, and to state that signing binds;
the personal-data rules ask the privacy policy to name the controller, what the browser keeps, how to exercise rights and
where to complain. At the owner's request the site shows no establishment name, registration number or city anywhere: the footer's legal line stays empty and the legal pages name only Tarmem.

## Changed 28 September 2026 — one set of rules across the pages, links you can follow, contrast

> Copy (`tarmem-i18n.js`, both languages):
> - **Stage approval** follows the Terms everywhere: a payment is released on the homeowner's approval, or the stage
>   counts as approved when its review period ends with no issue raised. Reworded: `home.trust[2]` (How it works, rule
>   03), `home.hoDesc`, `how.hoPhases[3].s`, `how.hoSteps[4]`, `about.p3` (English), `profile.protect[1]`,
>   `rules.notes[1]`, the FAQ's "paying by stage", Help's "if I do not review a stage in time", the Terms' "Milestone
>   payments", and the project page's review note `auto.*` (it said a stage was referred to the team; it now counts as
>   approved).
> - **Disputes** follow the Rules page in Help ("the three stages"), the FAQ ("if I disagree") and the Terms: 5 working
>   days between the parties, then Tarmem mediation within 10 working days ending in a written, non-binding
>   recommendation, then the competent authority. The Terms point to the Refunds & disputes page instead of "the project
>   agreement".
> - **ID** is needed before funding a project (homeowners) or bidding (contractors), not before posting: FAQ and Terms.
> - Help: sign-up is by email and password; a second account needs a different email; the stage split is set in the
>   accepted bid (commonly 30/40/30). How: `splitTitle` (English) says "an example", and `hoPhases[2].b[1]` no longer
>   says every project has three 30·40·30 stages.
> - Terms gain **"Late delivery"** (the Refunds & disputes page's rules: 3 days, SAR 500, SAR 1,500, the third).
> - Refunds: "Tarmem's inspector" (there is none) becomes the two parties with Tarmem support's help (`pen.refunds[2]`).
> - The rules page is titled **"Refunds & disputes"** (`rules.title`; kicker `rules.kicker` "Policies"; the old title's
>   question opens `rules.intro`); new `rules.jump`.
> - `footer.terms` = the page's own title, "Terms of use".
> - Contact: `pages.contactSub` no longer leads with SAR 1,000,000 projects; new `pages.cTopicPh`, `cPrivacy`,
>   `cPrivacyLink`, `cEmailLbl`; `cErr` asks for a topic.
> - Pricing: `pricing2.barBase` is a whole sentence; the split bar's labels say what their figures are (`barCo` "before
>   VAT on the commission", `barTarmem` "fees, before VAT"); English `calcCoBeforeVat` / `calcCoGets` ("net payout") no
>   longer both read "Contractor receives".
> - About: every `about.roadmap` item has a title `t`; the English plan now says what the Arabic says (more Saudi cities
>   next; an app, tools and financing later) — it had said the UAE and Kuwait.
> - `hero2.pause`, `hero2.play`.
>
> Template:
> - The header logo is a link (`<a class="brand">`, was a `<div>`).
> - The hero: `autoPlay="{{ heroAuto }}"`; a pause / play button `.ph-pause` (`toggleHeroVid`, `heroVidLabel`, shown
>   when `heroMotion`) beside "Explore", both in `.ph-bar-end` (third column of the bar).
> - Testimonials: `.tsti-track` has `tabindex="0" role="region" aria-label="{{ t.home.testiTitle }}"`.
> - Trade tiles' photos have `alt=""` (the tile already carries the name).
> - The floating WhatsApp button sits in `<aside aria-label="{{ t.wa.chat }}">` (a landmark, like the rest of the page).
> - How it works and Pricing end with a call to action (`.page-cta`: `t.home.closeTitle`, `closeSub`, `t.how.ctaHo`
>   → post, `t.how.ctaCo` → join); Pricing's closing spacer gives way to it.
> - About: the roadmap line shows `{{ r.t }}` after `{{ r.k }}`.
> - Refunds & disputes: a jump link `.rjump` (`href="rules#refunds"`, `data-to="refunds"`, `jumpTo`) under the intro; the
>   refunds block is `id="refunds" tabindex="-1"`.
> - Contact: the support address and a WhatsApp button (`.ct-reach`, `.ct-mail`, `.ct-wa`) under the hours; the topic
>   select starts on a disabled "Choose a topic" option and is required; a privacy line with a link under the button;
>   `aria-invalid` (`ct.inv.*`) and `aria-describedby="ct-err"` on the fields, `role="alert"` on the error.
> - Post: `aria-invalid` (`post.inv.*`) and `aria-describedby="post-err"` on title, description, budget and pledge;
>   `role="alert"` on the error.
> - Headings in order: How's phase cards `h2` (were `h3`) and its rule tiles `h3` (were `h4`); Help's "still stuck"
>   `h2`; the Terms' and privacy policy's section headings `h2` (were `h3`). Same sizes, set inline.
>
> Logic: `newTab(e)` — `go`, `goAuth` and `jumpTo` leave a modifier-key click on a link that has an address to the
> browser and prevent the page load on any other; `motionOk()`; `kickVideo` does nothing under reduced motion or once
> paused; `heroMotion`, `heroAuto`, `heroPaused`, `heroPlaying`, `heroVidLabel`, `toggleHeroVid`; `sendContact` needs
> a topic; `ct.inv`, `post.inv`; the post form's step list colours (done `#9A5B45`, next `#6B6986`, current ink
> `#B84522`).
>
> Stylesheet: focus rings `#C53B1C` (were `#FF7722`, 2.6:1); the error red `#C2381A` everywhere (was `#D9401F`,
> 4.5:1 short); `.hw-num` `#D2643A`, `.hw-pill b` and `.tr-badge` `#B83A1C`, `.tsti-r` `#6E685E`; grey kickers
> (`#9B9AB4`, `#7A7994`) and pricing's "before you agree" badge `#6B6986`; the home description box shows a strong
> border when focused, and its example is never cut mid-line (whole-line minimum height, `field-sizing:content`);
> trade names wrap instead of being cut with "…"; an English testimonial opens with “; `.wa-fab` at
> `inset-inline-end`; pricing amounts never break (`.calc .num{white-space:nowrap}`) and a row puts the label above
> the amount when both do not fit; new `.page-cta*`, `.rjump`, `#refunds`, `.ct-*`, `.ph-bar-end`, `.ph-pause`.

Why: the site promised in some places that nothing is ever released automatically, while the Terms (the owner's rule)
approve a stage whose review period ends with no issue; disputes, ID timing and sign-up were described three different
ways. The Business Center asks for a findable refund policy. The rest came from an accessibility and search review: links
without addresses could not be reached by keyboard, opened in a new tab or crawled; small text and focus rings fell
short of WCAG AA contrast; the film could not be stopped.

> Site only (not the design): the converter gives every `<a data-route>` an `href` (`routeHref`, src/launch/urls.ts;
> /demo/… on the demo; a contractor's sign-up link is /join, the application form the public site opens for it), splits the signed-in and demo-only pages out of the main bundle (`routes.ts`, `React.lazy`),
> serves the header and footer logo from 240px copies (`tarmem-logo-sm.png`, `tarmem-logo-white-sm.png`) and a phone
> poster (`hero-poster-800.webp`, the middle 800px of the frame, preloaded on phones), and lazy-loads the partner logos.
> The parity test ignores those hrefs and the logo copies.

## Changed 28 September 2026 — forms that say their rules, a "next step" you can press, empty tables that say so

> Copy (`tarmem-i18n.js`, both languages):
> - `post.errTitleLen` (a title of 3 to 140 characters), `post.errDescLen` (a description of at least 10), `post.errBudgetOrder`
>   (the minimum budget cannot pass the maximum).
> - `ws.errPrice` (SAR 100 to 1,000,000), `ws.errDays` (1 to 1,000 days), `ws.pricePh` ("Amount in SAR"), `ws.daysPh`
>   ("Number of days"), `ws.datePh` ("Choose a date"), `ws.newCo` ("New"), `ws.noFiles`, and `ws.nextCta` — the labels of the
>   "next step" button (compare bids, submit your bid, open payments, open milestones, leave a review, open messages).
> - `hdash.noProjects`, `cdash.noWork` (what an empty projects table says).
> - `cdash.sPending` / `sEarned`: the "(ريال)" / "(SAR)" is joined to the words before it by a no-break space, so it never
>   wraps onto a line by itself.
>
> Template:
> - Post form: the title has `maxlength="140"` and a counter (`post.titleCount`), the description `maxlength="4000"` and a
>   counter (`post.descCount`), the address `maxlength="120"`.
> - Bid form: price and days take their placeholders from `ws.pricePh` / `ws.daysPh` (they were "45000" and "30", which read as
>   typed figures) and carry `min`/`max`; the start date sits in `<div class="datefield" data-empty="{{ bidF.noStart }}">` with a
>   `.dateph` hint in the page's language; inclusions/exclusions `maxlength="1500"`, brands `200`, the scope note `2000` with a
>   counter (`bidF.noteCount`).
> - Agreement modal: `<sc-if value="{{ agr.error }}">` — why a signature did not go in — above the scroll hint.
> - Overview: the "next step" card is `.next-card` and gains a button (`pj.nextCta`, `data-tab="{{ pj.nextTab }}"`,
>   `nextGo`); the signed-agreement card carries the class `agr-card`.
> - Messages: a message's header shows " · {{ m.time }}" only when there is a time (a note from Tarmem has none, and read
>   "ترميم ·"); the bubble is `.msg-text`; the box has `maxlength="2000"` and a counter (`msgCount`).
> - Bids: a contractor with no rating and no finished project reads `ws.newCo` instead of "★ 0 · 0 projects"
>   (`b.hasRecord` / `b.isNew`); the bids table's card carries the class `bids-card`.
> - Files: an empty table shows one row `tr.empty-row` with `ws.noFiles`; a refused file is said in `filesError`; the upload
>   input has an `accept` list.
> - Milestones: the "no milestones" line carries the class `ms-empty`.
> - Dashboards: an empty projects table (homeowner) / projects-and-bids table (contractor) shows `tr.empty-row` with
>   `hdash.noProjects` / `cdash.noWork` (`noMyProjects`, `noCProjects`); the saved-contractors card is `.hd-saved`, the stage
>   payments card `.cd-pay`; the performance card's rows have `gap:12px` (the figure touched its label).
> - Settings: the contact card is `.st-contact`; the email field takes `readonly="{{ st.emailLocked }}"` and an optional note
>   `st.emailNote` (false / empty in the design).
> - Contact form: name `maxlength="120"`, email `160`, phone `type="tel"` `20`, message `4000` with a counter (`ct.msgCount`).
>
> Logic: `postNext` refuses a title under 3 or over 140 characters, a description under 10, and a minimum above the maximum,
> each at its own step (`post.inv` marks the field); `reviewBid` refuses a price outside 100–1,000,000 and days outside
> 1–1,000; the bid form's VAT box starts unticked (`bidF.vatReg: false`; after a bid the next form keeps the last answer);
> `agr.error`; `hStats` says a zero once (the plain label, not "0" over "no bids received"); `pj.nextTab` / `pj.nextCta`,
> `nextGo` (opens the tab); `pj.noFiles`, `filesError`, `noMyProjects`, `noCProjects`, `msgCount`, `bidF.noteCount`,
> `bidF.noStart`, `ct.msgCount`, `st.emailLocked` / `st.emailNote`.
>
> Stylesheet: `.charcount`, `.datefield`, `.dateph` (hidden once a date is chosen or the field is focused, and in browsers
> without `::-webkit-datetime-edit`), `.next-card .next-cta`.

Why: people typed into fields whose limits they could not see and were refused only by the database; the bid form's
placeholders read as prices someone had already entered, and it assumed every contractor is VAT-registered; the "next step"
box described a step without a way to take it; empty tables showed nothing at all; a brand-new contractor read "★ 0 · 0
projects". The demo shows all of it too.

> Site only (not the design): the converter hides `.strikebar` while stages are off (`vm.stagesLive`), `.cd-pay` while the
> wallet is off, and `.hd-saved` on the public site (there is no contractor search to save one from yet); it inserts
> `PasswordCard` after `.st-contact`, `AcceptedBid` after `.bids-card`, `PlannedStages` after `.ms-empty` and
> `ConfirmComplete` after `.agr-card` (src/platform/). While payment on the site is off, the site's copy of the design's
> strings says "Signed · the Tarmem team arranges the start" for a signed project (not "awaiting funding"), everywhere.

## Changed 28 September 2026 — the admin console in the page's language, on a phone, with empty cards that say so

> Admin template:
> - Overview and support tables: the id column's header is `{{ t.admin.hId }}` (was the literal "ID" in both languages).
>   The support table's second header is `{{ t.admin.hCaseFrom }}` (was `t.project`); in the design it still reads
>   "المشروع" / "Project".
> - Every admin table (projects, verification queue, support cases, payment exceptions, users, promo codes, partners) has the
>   class `adm-t`. Cells that only make sense with their column's name carry it in `data-l`:
>   - projects: the homeowner, the contractor and the amount;
>   - verification: the date submitted;
>   - payments: the milestone and the amount;
>   - promo codes: the uses;
>   - partners: the funnel and the earnings;
>   - the person view's two tables (`dv-table`): the bid count on a project, and a bid's amount, days and status.
> - Analytics: each list card has an empty-state sentence (`p.muted.an-empty`):
>   - "where they are" (`live.noPages`, `t.admin.an.emptyNow`);
>   - the live feed (`live.noFeed`, `t.admin.an.emptyFeed`);
>   - top pages, sources and cities (`an.noTop` / `an.noSources` / `an.noCities`, `t.admin.an.emptyPeriod`).
> - Project page: the header row (status, title, value) has the class `pj-head`.
>
> Logic: `analytics()` returns `noTop`, `noSources` and `noCities`, and `liveView()` returns `noPages` (nobody online) and
> `noFeed`. `pmView()`'s "average project value with a code" reads "—" when there are no codes.
>
> Stylesheet:
> - `.an-empty` added.
> - The "today so far" strip's grid rules are now `.qstrip.an-today`. `.qstrip` (display:flex) comes later in the sheet
>   and overrode `.an-today{display:grid}`, so the 3-column (≤1100px) and 2-column (≤560px) layouts never applied: on a
>   phone the six figures were squeezed into one row. They now show as 2×3.
>
> Copy (both languages): `admin.hId` («الرقم» / "ID"), `admin.hCaseFrom` («المشروع» / "Project"), `admin.an.emptyNow`,
> `admin.an.emptyFeed`, `admin.an.emptyPeriod`.

Why:
- The Arabic console showed "ID" headers in English.
- On a phone the console's tables cut a row's status and buttons at the screen's edge, and the "today" figures were
  squeezed into one row.
- Analytics cards with nothing to show stood empty with no explanation.
- The promo tab showed a fixed average even with no codes at all.

The demo shows all of this too. The design's lists are always full, so the empty sentences never appear there.

> Site only (not the design):
> - **Phone layout.** Under 640px each `adm-t` row becomes a small card, with the `data-l` names in front of their values;
>   the person view's `dv-table` rows and the inbox's rows stack the same way (app-only rules in global.css).
> - **Support cases.** The column is titled «المرسل» / "Sender", because on the site a case is a contact-form message with
>   a sender, not a project.
> - **Tabs while payment is off.** The promo-code and partner tabs are hidden, like "late & refunds". Once payment is on
>   they show, but every figure the site does not measure (redemptions, discounts, average value with a code, clicks,
>   sign-ups, earnings) reads "—".
> - **Contractors without an application.** A contractor account with no application is listed under Users as «بلا طلب
>   توثيق» / "No application", and is never put in the verification queue.
> - **Project controls.** On a project opened from the console the team sees `AdminProjectControls`, inserted after
>   `.pj-head`: complete or cancel a signed project, or remove an open one. Each asks first and takes an internal note
>   (supabase/030 A).
> - **Project messages.** The team can read the project's messages, one thread per contractor. Nothing can be sent from
>   there and nothing is marked as read.
> - **Declined contractors.** A declined contractor reads «لم تتم الموافقة على طلبك» with a button to the contact page,
>   instead of "being verified".
> - **Inbox wording.** The inbox says application statuses, the currency, the start date and the CR label in the page's
>   language.

## Changed 29 September 2026 — the review's fixes: the Arabic "fund & follow" step, a service you choose, labels on a phone

> Copy (`tarmem-i18n.js`):
> - `how.hoPhases[2].b[1]` (Arabic) reads «مراحل الدفع يحددها العرض، مثل 30 · 40 · 30», like the English ("Stages set in the
>   bid, e.g. 30 · 40 · 30"). The Arabic still said the payment is split into three stages.
> - `admin.finToTm` (Arabic) is «لترميم» (it rendered «لـ ترميم»).
> - `cdash.avgResponse` (new: "Average response" / «متوسط وقت الرد»): the contractor dashboard's performance row had borrowed
>   `profile.response`, whose English is the lower-case "avg. response" of the profile page.
> - `cdash.sOpen` is "Projects to bid on" / «مشاريع متاحة للعرض»: the English dashboard said "Open projects" three times
>   (the button, the quick card and this figure).
> - `admin.noPayRows` (new): "No payment exceptions right now." / «لا استثناءات دفع حاليًا.».
> - `hprofile.noAbout` (new): "No introduction yet." / «لم تُضف نبذة بعد.».
> - `post.chooseService` ("Choose the service" / «اختر الخدمة») and `post.errTrade` ("Choose the type of work." / «اختر نوع
>   العمل.») — new.
> - `hdash.bidsL` (new: "Bids" / «العروض»): the name of the bid count on a phone card (the column heading is hidden there).
> - The privacy policy's "Your rights" and the console's `admin.dv.eraseBody` say that deleting an account keeps the photos
>   and messages of a project that was awarded, with its record (supabase/029: erasure no longer deletes them).
> - `CO_TRADES` (new export): the 21 trades a contractor picks from first — the home page's headline services plus plumbing,
>   electrical, painting, air conditioning, bathrooms, flooring, gypsum, aluminium, insulation, structural work and general
>   maintenance.
>
> Template:
> - Post form: the type of work has a first option `<option value="">{{ t.post.chooseService }}</option>`, a required mark (*)
>   on its label, and `aria-invalid="{{ post.inv.trade }}" aria-describedby="post-err"`.
> - Homeowner profile: the introduction shows only when there is one (`hp.hasAbout`); otherwise `.hp-noabout` says
>   `hprofile.noAbout`, with an "Edit profile" link for the owner (`hp.noAbout`, `openHoEdit`).
> - Admin, payments tab: an empty table shows one `tr.empty-row` with `admin.noPayRows` (`noPayRows`).
> - Dashboards: the homeowner's bid-count cell carries `data-l="{{ t.hdash.bidsL }}"`; the contractor's bid cell
>   `data-l="{{ t.cdash.myBid }}"` and the next-stage cell `data-l="{{ t.cdash.nextMilestone }}"` and
>   `data-none="{{ p.noNextMs }}"`. The performance card's third row reads `cdash.avgResponse`.
> - Bids table: the price, duration and scope cells carry `data-l` (`ws.price`, `ws.duration`, `ws.scopeNote`).
> - Bid form: the brands/warranty row is `.bid-2col`, the three stage shares `.bid-ms`.
>
> Logic: `post.f.trade` starts as '' (it was 'kitchen', so a homeowner who never touched the field posted a kitchen job) and
> `postNext` refuses step 1 without it (`post.errTrade`, after the title and description checks; `post.inv.trade`); `hp.hasAbout` / `hp.noAbout`; `noPayRows`; `cProjects[].noNextMs`;
> the contractor profile editor offers `CO_TRADES` plus whatever the contractor already has (its list had 12 trades, one of
> them an id that does not exist, 'ac' for 'hvac').
>
> Stylesheet:
> - `.hire-c` has `font:inherit` (the service tiles are buttons, and their labels showed in the browser's default font).
> - `.ph-lead br` is hidden below 1400px, so the hero's intro wraps where the width says (at 1366 the Arabic left «مشروعك،»
>   alone on its line).
> - Pricing calculator: a row keeps its amount on the label's line, at the end, and never wraps it; a long label wraps
>   instead (`.calcbox > div`).
> - Under 560px the "open projects" filters take one row each, with the count under them (`.bfil`), and the bid form's
>   brands and warranty fields are one per row (`.bid-2col`); the three stage shares line up at the bottom (`.bid-ms`).

Why: the Arabic "how it works" still promised three stages where the bid sets them; a homeowner could post a kitchen job by
not touching a field; an empty introduction or payments table looked unfinished; on a phone the dashboards' figures had no
names; the tiles' font, the hero's lone word, the pricing rows and the bid form's placeholder looked broken. The demo shows
all of it too (the design's seed data has an introduction and payment rows, so its empty states do not appear there).

> Site only (not the design):
> - **Bids on a phone.** Under 640px each bid is a small card (app-only rules in global.css): the contractor and their tags,
>   then price and days with their `data-l` names, the scope, and the Accept button across the card. Only tables with four
>   columns or more scroll sideways now; the files list and the key-value tables fill the card again.
> - **Dashboard phone cards** show the `data-l` names ("Bids: 1", "Your bid: SAR 64,000") and hide a next stage of "—".
> - **Completion needs both parties** (supabase/030 B): `ConfirmComplete` is shown to the homeowner and to the contractor, and
>   says whose confirmation is awaited. The contractor's Payments tab says payment on the site is being set up; the
>   homeowner's button there is "Check payment status" and answers.
> - **The join page** offers `CO_TRADES` first and every other trade one tap away, grouped, up to 12 (the database's limit);
>   the Arabic «و» in the consent line joins the next word; the Arabic password hint reads right to left until something is
>   typed.
> - The homeowner's profile says "Member since September 2026" (month and year), and a contractor sees the homeowner's full
>   name in the project's details once both have signed, as the agreement card above it does.
