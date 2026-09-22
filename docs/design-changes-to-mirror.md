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
