# Handoff: Tarmem — Saudi renovation marketplace

## Overview

Tarmem (ترميم) is a two-sided marketplace connecting Saudi homeowners with verified renovation contractors. A homeowner posts a project, receives bids from verified contractors, signs an agreement, and funds the work in milestones held with a licensed payment provider. Money is released only when the homeowner approves each milestone's evidence of completion.

The design covers the full product: public marketing site, authentication, homeowner and contractor dashboards, project posting, contractor discovery, the project workspace (bids, agreement, milestones, evidence, payments, disputes, change requests), wallets, settings, help centre, legal pages, and an internal admin console.

**Primary language is Arabic (RTL).** English is a complete second locale, switchable at runtime. Every string lives in `tarmem-i18n.js` under `ar` and `en` keys — there is no hardcoded UI copy in the markup.

## About the design files

The files in `design/` are **design references created in HTML** — a working prototype that shows intended look, copy and behaviour. They are **not production code to copy directly.**

The task is to **recreate these designs in the target codebase's existing environment** (React, Next.js, Vue, SwiftUI, native — whatever the project uses) following its established patterns, component library, routing and state conventions. If no environment exists yet, choose the framework most appropriate for the project and implement there.

Two things in the prototype are scaffolding, not design intent:

- **`support.js`** is the prototype's own rendering runtime. Ignore it entirely.
- **`Tarmem.dc.html`** is a single-file prototype: one big template plus one logic class. In a real codebase this should be split into routed pages and components. The single-file structure is a constraint of the prototyping tool, not a recommendation.

What *should* carry over verbatim: **the Arabic and English copy** (`tarmem-i18n.js`), the **design tokens** below, the **layout and component specifications**, and the **business rules** in "Domain logic".

## Fidelity

**High fidelity.** Colours, typography, spacing, radii, shadows, hover and focus states, animation timings and all copy are final and should be reproduced faithfully using the target codebase's libraries and patterns.

The one exception is **photography**: the images in `design/assets/trades/` and `design/assets/locked/` are placeholders standing in for real project and partner imagery. Treat their framing and aspect ratios as the spec, not the pictures themselves.

---

## Design tokens

### Colour

| Token | Hex | Use |
|---|---|---|
| Ink | `#14113F` | Body text |
| Ink deep | `#1B1464` | Headings, emphasis, primary text on light |
| Ink mid | `#3A385C` | Secondary body copy |
| Muted | `#5B5A7A` | Supporting copy, form labels |
| Muted light | `#7A7994` | Metadata, table headers |
| Muted lighter | `#9B9AB4` | Kickers on dark panels, disabled text |
| Border | `#E6E5F0` | Card and table borders |
| Border light | `#EEEDF5` | Row dividers |
| Border input | `#DDDCEA` | Input borders |
| Border hover | `#B9B7D0` | Input hover, unchecked radio |
| Surface | `#FFFFFF` | Cards, page background |
| Surface tint | `#F7F6FC` | Panels, inset blocks |
| Surface tint 2 | `#F1F0FA` | Chips, button hover |
| Surface row hover | `#F9F8FD` | Table row hover |
| Accent | `#FF5A3C` | Links, primary accent |
| Accent hover | `#E8432A` | Link hover |
| Accent warm | `#FF7722` | Focus ring, checklist marks |
| Accent gradient | `linear-gradient(135deg, #FF8800, #FF4455)` | Primary buttons, step badges, active indicators |
| Terracotta | `#C2502F` | Section kickers, labels on light |
| Terracotta deep | `#B0612F` | Kicker variant |
| Peach fill | `#FFF6F2` / `#FFF1EC` | Badge and callout fills |
| Peach border | `#FFD9CB` / `#FFE0D3` | Badge borders |
| Success | `#15703A` | Positive amounts, verified state |
| Success deep | `#1B7A3E` | Released payments |
| Success fill | `#E8F7EE` / `#F1FBF5` | Success panels |
| Success border | `#CFE8D9` / `#BFE4CC` | Success panel borders |
| Warning | `#8A5A00` / `#B26B00` | Pending, deductions |
| Warning fill | `#FFF6E5` | Warning panels |
| Warning border | `#F5D28A` / `#F0DCAE` | Warning borders |
| Danger | `#D9401F` | Form errors, required marks |
| Danger deep | `#B3261E` / `#B3341A` | Late delivery, destructive actions |
| Danger fill | `#FDE9E7` | Danger panels |
| Danger border | `#F3C4BF` / `#E8A9A3` | Danger borders |
| WhatsApp | `#25D366` (button), `#128C4A` (text/icon) | WhatsApp surfaces only |
| Navy panel | `#14113F`, `#1E1A52`, `#302B6B` | Dark sections (bg, card, border) |
| Navy text on dark | `#C9C6E4` (body), `#9C99C6` (meta), `#FFB27A` (kicker) | Dark-panel text |

### Typography

Single family: **IBM Plex Sans Arabic**, weights 400 / 500 / 600 / 700, with `system-ui, sans-serif` fallback. Loaded from Google Fonts. It carries both Arabic and Latin, so no font switching between locales.

| Role | Size | Weight | Line height | Tracking |
|---|---|---|---|---|
| Page H1 | `clamp(26px, 3vw, 34px)` | 600 | 1.15 | `-0.01em` |
| Marketing H1 | `clamp(26px, 3.4vw, 44px)` | 600 | 1.25 | `-0.02em` |
| Section H2 (`.sh2`) | `clamp(24px, 2.6vw, 34px)` | 600 | 1.2 | `-0.015em` |
| Card H3 | 20px | 600 | 1.15 | `-0.01em` |
| Body | 15px | 400 | 1.55 | — |
| Body small | 13.5–14px | 400 | 1.7–1.8 | — |
| Label (`.lbl`) | 12px | 500 | — | — |
| Kicker (`.kick` / `.skick`) | 11–12px | 600 | — | `0.06em`, uppercase (Latin only) |
| Meta / muted | 11.5–12.5px | 400 | 1.6–1.75 | — |
| Tag | 11.5px | 600 | — | — |
| Table header | 11px | 600 | — | `0.06em`, uppercase |

**Numerals:** always Western digits (`0-9`), never Arabic-Indic (`٠-٩`), in both locales. A `.num` utility applies `font-variant-numeric: tabular-nums` and `unicode-bidi: plaintext` for figures in prose. **Exception:** inside RTL table cells, reference codes and IBANs need `unicode-bidi: normal` with `text-align: start`, or Latin strings jump to the wrong edge of the cell.

### Spacing, radius, elevation

- Spacing runs on a loose 4px grid; common steps 4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 22 / 26 / 28 / 32 / 40 / 44.
- Section padding: `padding-block: clamp(26px, 3.2vw, 46px)`; page sections `40px 80px`.
- Content width: `.wrap` is `max-width: 1160px` centred with `24px` side padding.
- Radii: `999px` pills and buttons · `16px` cards · `14px` inset panels and banners · `12px` glass bars and small panels · `10px` inputs and sidebar items · `8px`/`6px` micro-surfaces.
- Shadows: `0 6px 18px rgba(255,90,60,.25)` primary button · `0 8px 24px rgba(255,90,60,.38)` primary hover · `0 1px 3px rgba(20,17,63,.12)` segmented thumb · `0 24px 60px rgba(27,20,100,.06)` large card · `0 2px 10px rgba(12,10,40,.18)` glass bar.

### Motion

- Standard transition `.3s ease`; travel and reveal `.35s cubic-bezier(.22, 1, .3, 1)`.
- Ken Burns drift on trade tile imagery: slow pan-and-zoom to `scale(1.04)` on hover.
- **No card lift on hover anywhere.** Hover changes border, shadow and icon fill only — never `translateY`.
- Every animated rule is wrapped in `@media (prefers-reduced-motion: reduce)` fallbacks.

---

## Domain logic

These rules drive most of the UI and must survive the port.

### Fees

- **Homeowner: 1%** of agreed work value, **added** to each milestone payment.
- **Contractor: 9%** of agreed work value, **deducted** from each milestone payout.
- **VAT 15%** applies to Tarmem's fees only, always shown as a separate line, never rounded to whole riyals (`21.60`, not `22`).
- Both fees are accepted at agreement signing but **collected per milestone**, never at signing.
- Fees are calculated on work value excluding the contractor's own VAT and excluding materials the homeowner buys directly.
- Worked example on a SAR 10,000 milestone: homeowner pays **10,100**, contractor receives **9,100**, Tarmem fees total **1,000** before VAT.

**Critical:** the contractor's net must be computed as `value − 9% − VAT(9%)`, not a flat 90%. A flat 0.9 multiplier produces 12,960 where the ledger says 12,909.60 — the two must agree everywhere.

### Milestones and escrow

- Default split **30 / 40 / 30** across three stages, editable per bid (shares must total 100%).
- Each stage: amount held → contractor uploads evidence → homeowner reviews → approval releases payment.
- **No automatic release.** If the homeowner takes no action within 7 days, the milestone is **referred to the Tarmem team for review**; no payment moves until that review completes or both sides agree.
- A raised issue holds the release until resolved.

### Late delivery ("حالات تأخير", not "مخالفات")

Three-strike ladder, counted per project, reset on completion:

1. First late delivery — warning, SAR 500 compensation recorded.
2. Second — SAR 1,500 compensation.
3. Third — the homeowner chooses: set a new deadline, or terminate and settle.

Contractor-side actions on the banner: **رفع إثبات الإنجاز** / **طلب تمديد** / **تسجيل عائق**.

### Verification and privacy

- Contractors must pass verification (Nafath identity + commercial registration + licences) **before appearing at all**. There is no "verified only" filter — unverified contractors are simply absent.
- The "تم التحقق" badge states what was reviewed; it is explicitly **not** a guarantee of workmanship.
- **Homeowner names are masked** to contractors (`إياد ف.`) until that contractor holds the awarded agreement. The masking helper must strip a leading `ال` from the surname before taking the initial, or every Arabic surname collapses to `ا.`.
- Contact details are never exposed; messaging stays inside the project record.

### Terminology

Wording was chosen deliberately and should be preserved:

- **صاحب المنزل**, not مالك المنزل.
- **رسوم خدمة**, not عمولة, on all contractor-facing surfaces. (The referral-programme commission keeps عمولة — it is a different thing.)
- **محفوظ لدى مزود الدفع**, not "الضمان" / escrow, unless a licensed escrow agreement genuinely exists.
- **مستحقات / تحويل**, not رصيد / سحب, in the contractor wallet.
- **حالات تأخير**, not مخالفات, in the interface. The legal term stays in the policy and agreement text.
- No unqualified promises: no "within one business day", no "no fees", no "instant" unless contractually guaranteed by the payment provider.

---

## Screens

### Public site

**Home** — Hero with looping video (`assets/hero.mp4`, poster `hero-poster.webp`) behind navy-to-transparent gradient; live visitor counter with a pulsing red dot (drifts 1–500); trust statistics (1,000+ contractors / 500+ projects / 99% satisfaction); AI brief assistant panel; trade grid; four-step relay; testimonials marquee; partners strip.

**Trade grid** — 5-up responsive grid of square-ish photo tiles (`aspect-ratio: 1/1.12`, `border-radius: 20px`). Each tile carries a **frosted-glass label bar** pinned `10px` from the bottom, stretched edge to edge: `rgba(255,255,255,.16)` over `backdrop-filter: blur(14px) saturate(160%)`, `1px solid rgba(255,255,255,.34)`, `12px` radius, `9px 13px` padding, white 12.5px/600 text, `justify-content: space-between` with a hidden arrow at the far end. On hover the glass brightens to `.26`, the border to `.55`, the arrow slides in, and the image Ken Burns drifts. A `@supports not (backdrop-filter)` fallback swaps to `rgba(20,17,63,.62)`.

**Four-step relay** — Two variants of the same content. On the home page: four gradient-tinted cards, no numbers. On the How-it-works page: the same cards with `01`–`04` badges (52px rounded squares, accent gradient, white 22px/700 numerals). Homeowner track is *Post / Compare / Fund / Approve*; contractor track is *Verify / Bid / Deliver / Get paid*. Each card has a title, a short qualifier in terracotta, and three checklist lines.

**How it works · Pricing · About · FAQ · Help centre · Dispute rules · Terms · Privacy · Contact** — Long-form pages sharing the kicker (asterisk glyph + terracotta label) → H2 → lead-paragraph rhythm. Pricing carries the 1% / 9% cards, an interactive fee calculator, the worked example, and a compact fee-policy accordion.

### Authentication

Role picker (صاحب منزل / مقاول) → mobile number → OTP → details. Nafath verification is deferred: browsing and receiving bids need no verification; it is required at first agreement and first milestone funding. Three-step progress indicator where the active step is a filled gradient circle with white digit, completed steps outlined in accent, upcoming steps grey.

### Homeowner

**Dashboard** — Quick-action tiles, active projects table, milestone approvals awaiting action, spend summary.

**Post a project** — Four steps (التفاصيل / الموقع والميزانية / الصور والملفات / المراجعة). Required fields marked with a red asterisk. Photo upload accepts JPG, PNG, PDF, max 10 files. Review step lists every section with an inline **تعديل** link and shows unset optional fields as "لم يُحدد" rather than hiding them.

**Wallet** — Deposits are always tied to one project and one milestone with a derived, non-editable amount; there is no general top-up. Breakdown shows work value → 1% fee → VAT on fee → processing fee → VAT on processing → final total.

### Contractor

**Dashboard** — Quick-action tiles (تصفح المشاريع / أعمالي / ملف المقاول / المستحقات والدفعات), the late-delivery banner, a four-figure statistics strip, projects table, milestone earnings panel with per-row "عرض تفصيل المستحقات" links, and a performance card.

**Late-delivery banner** — Three stacked rows inside a white card with a tinted border (no filled block): (1) title with a small pulsing severity dot plus the due-date pill; (2) explanation at a readable measure, with the live day count interpolated; (3) three actions with the policy link pushed to the opposite edge. Only one button carries colour.

**Browse projects** — Filter bar (كل المدن / كل التخصصات / جميع الميزانيات) with a grammatical Arabic count ("مشروعان متاحان", "مشروعان من أصل مشروعين"). Project cards show trade kicker, posting date ("نُشر في 2 سبتمبر 2026"), title, clamped description, a single budget sentence ("الميزانية من 20,000 إلى 30,000 ريال") with a VAT note beneath, and a **عرض التفاصيل** button — bidding happens inside the project, not from the card.

**Submit a bid** — Two steps. *Edit:* work value before VAT, expected duration, VAT-registration toggle, live price panel (value → contractor VAT → total including VAT, with a "not registered" note when off), earliest start date, bid validity, inclusions, exclusions, proposed brands, warranty period, three milestone shares validated to 100%, scope note, and a site-visit request checkbox. Both the warranty and validity selects carry an empty placeholder option and are **required** — a select whose visible value is not in state will silently invent contract terms. *Review:* every field echoed back, then the contractor's expected net in a green panel, then **إرسال العرض لصاحب المنزل** / **تعديل العرض**.

**Public profile** — Header (name, verified chip, city, rating, "42 مشروعًا مكتملًا عبر ترميم", "في المنصة منذ 2019"), bio, statistics, a verification card listing الهوية / السجل التجاري / بيانات المنشأة والتراخيص with the badge caveat, and the Tarmem-protection panel. Portfolio is split into **مشاريع مكتملة عبر ترميم** (each photo badged) and **معرض أعمال رفعه المقاول** (unbadged). Reviews use masked names, carry "✓ مشروع مكتمل عبر ترميم · سبتمبر 2026", and a "عرض جميع التقييمات (37)" button. **No upload affordances on the public profile** — plain images only; uploading belongs in the edit dialog.

**Edit business profile** — Modal. Business name is **read-only** (tied to the commercial registration) with a "طلب تعديل بيانات المنشأة" link. Bio is 50–500 characters with a live counter that turns red below the minimum. A live preview panel shows the profile as the homeowner will see it. Cancelling with unsaved changes asks for confirmation.

**Wallet** — "المستحقات والسحب". Three figures: مستحق للتحويل / مستحقات بانتظار اعتماد صاحب المنزل / المحوّل حتى الآن. Amount field formats as "10,000 ريال" inside the input and rejects anything above available. A confirmation panel precedes submission showing amount, masked IBAN (•••• 9012), expected arrival ("حسب مدة مزود الدفع") and fees. Incoming ledger rows carry **no** `+` sign.

### Project workspace

Tabs: الوصف / العروض / المراحل / الرسائل / الملفات / الدفعات. Holds the brief, bids table, signed agreement, milestone list with evidence upload and approval, change requests, messaging, files, the payment ledger, and the dispute flow.

**Change requests** — Scope changes must go through a structured request (description of added or cancelled work, amount delta, additional duration, both parties' approval), never through chat. Approval updates the agreement value and milestones.

**Financial progress** — Percentage must be weighted by milestone value, not by count. Three stages at 30/40/30 with the first released is **30%**, not 33%. Where weights are unavailable, show "تم صرف مرحلة واحدة من أصل 3" and no percentage.

**Documents** — Three distinct documents per ledger row, each from a different issuer: a **payment receipt** from the payment provider (no VAT line), a **contractor work invoice** for the milestone work, and a **Tarmem tax invoice** for Tarmem's fee only (with the ZATCA note). The tax-invoice action appears only on fee and VAT rows.

### Settings

Contact details, WhatsApp notifications, notification preferences, language, account closure.

**WhatsApp card** — Deliberately minimal: number field with a test-message button and a "changing this number requires a new code" note; primary-channel segmented control; a single do-not-disturb checkbox with its explanation indented beneath; a collapsed disclosure holding the sample message; the consent line. Phone format `+966 5X XXX XXXX`.

**Notifications** — Payment and dispute alerts are permanently on, labelled "تنبيه أساسي". Marketing is off by default.

**Language** — Segmented **العربية | English**, not a single toggle button.

**Account closure** — A *request*, not an immediate action. Blocked while a project is in progress or a dispute is open. The confirmation explains the 5-business-day review, what is deleted (public profile, contact details) and what is retained (project records and invoices, for the statutory period).

### Admin

Internal console: overview, users, verification queue, projects, disputes, finance, promo codes, referral partners. Not customer-facing; lowest implementation priority.

---

## Interactions and behaviour

- **Routing** — 22 top-level routes (see `r.*` in the prototype): `home, how, pricing, about, help, faq, contact, rules, terms, privacy, auth, plan, post, hdash, cdash, browse, project, contractors, contractor, homeowner, wallet, settings, admin`.
- **Locale switching** — Flips `dir` between `rtl` and `ltr` and swaps the whole string table at runtime; no reload. All layout uses logical properties (`inset-inline-start`, `margin-inline-end`, `text-align: start`) so mirroring is automatic.
- **Forms** — Validate on submit, not on blur. Errors render inline in `#D9401F` beneath the field group. Required fields carry a red asterisk.
- **Focus** — `:focus-visible { outline: 2px solid #FF7722; outline-offset: 2px }` globally; default focus removed.
- **Tables** — Row hover `#F9F8FD`; whole rows are clickable where they lead somewhere.
- **Dates** — Rendered long-form per locale: "26 أغسطس 2026" / "26 August 2026". Never bare "Aug 26".
- **Arabic pluralisation** — Counts use proper dual and plural forms (مشروع واحد / مشروعان / 3 مشاريع / 11 مشروعًا), not a single form with a number.

## State

The prototype holds everything in one component's state. In a real build this splits into:

- **Session** — role (`homeowner` / `contractor` / `admin`), authentication step, Nafath status, locale.
- **Server data** — contractors, projects (with nested bids, milestones, messages, files, ledger), users, disputes, transactions, referral partners, promo codes.
- **UI/form state** — post-project draft, bid draft, profile-edit draft, wallet draft, filters, active tab, open modal, confirmation flags.

Milestone amounts, fee breakdowns, contractor net, wallet availability and financial progress are all **derived**, never stored. Deriving them in one place is what keeps the ledger and the wallet in agreement.

## Assets

In `design/assets/`:

- `hero.mp4`, `hero-poster.webp` — home hero video and poster.
- `tarmem-logo.png`, `tarmem-logo-white.png` — wordmark, light and dark grounds.
- `trades/01.png` … `10.png` — trade-category and portfolio photography. **Placeholders.**
- `locked/logo-*.png`, `locked/partner-*.webp` — partner logos (Saudi Contractors Authority, Monsha'at, Tawuniya, Aqar, Bayut, and others). Confirm usage rights before shipping.
- `locked/about.webp` — About-page photograph.
- `room-*.png`, `ref-*.png`, `building-lines.png` — illustration and reference plates.
- `tarmem-services-agreement.pdf`, `tarmem-homeowner-guide.pdf`, `tarmem-contractor-guidelines.pdf` — downloadable documents linked from the legal and help pages.

Icons are inline SVG, 24×24 viewBox, `stroke-width: 1.6–1.7`, round caps and joins — Lucide-compatible. Swap for the codebase's icon library.

## Files

| Path | What it is |
|---|---|
| `design/Tarmem.dc.html` | The complete prototype — all screens, styles and logic. Open in a browser to explore. |
| `design/tarmem-i18n.js` | **The string table.** Every Arabic and English string, plus seed data (contractors, projects, trades, cities, banks). Port this nearly as-is. |
| `design/support.js` | Prototype runtime. **Ignore.** |
| `design/assets/` | Images, video, logos and PDFs. |

To view: serve the `design/` folder over HTTP (`npx serve design`) and open `Tarmem.dc.html`. Opening via `file://` will fail — the i18n module is loaded as an ES module.

## Before shipping

Three things in the prototype are deliberately unresolved and need decisions:

1. **Trade selection is ungated.** A contractor can currently claim any trade. Gating needs a per-trade licence or evidence model that does not exist in the data yet.
2. **Reviews and partner logos are seed content.** Both need to be real before launch.
3. **Legal wording** — the compensation, cancellation and settlement language should be reviewed by a Saudi lawyer and tied explicitly to the electronic agreement text.
