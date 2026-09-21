# The suggested budget on the project form: where the numbers come from

The owner asked (21 September 2026) for the suggested range to rest on real Saudi prices and to change
with the size of the job. It now does: **range = a published Saudi unit rate × the size the homeowner
described**, or × a typical size when they gave none. The note under the range says which of the two
was used and what was counted, so nobody mistakes it for a quote.

The rates live in the design's data file (`project/tarmem-i18n.js`, `PRICE_GUIDE`) and the formula in
the design's logic (`sugFor` in `project/Tarmem.dc.html`), so the demo and the live site always agree.
**To change a number, edit `PRICE_GUIDE` and publish** — nothing else needs touching.

## How a size is read from the description

- `4×5`, `7x7`, `4 في 5` → a room's two sides; `20 م²`, `120 متر مربع`, `90 m2`, `شقة 120 متر` → an area.
- Counts: `5 مكيفات`, `حمامين`, `3 أبواب`, `6 كاميرات`, `40 نقطة`, `8 كيلوواط`, `8 متر طولي`.
- Walls (painting, plaster) are taken as 2.8 × the floor area.
- A kitchen's cabinets are taken to run along two walls (sides a + b − 1 m), and — as most Saudi
  kitchen shops price them — upper and lower cabinets are counted separately. A 4×5 kitchen is 16
  linear metres; a 7×7 kitchen is 26.
- Electrical and lighting points: about 0.23 and 0.15 per m² of floor when no count is given.
- Results are rounded to 500 (1,000 above 50,000), never fall below a small-job minimum (10% of the
  typical job, at least 1,000), and stop at the platform's 1,000,000 ceiling.
- No city adjustment: the published city comparisons contradict each other (see below).

## The rates (SAR, materials + installation, mid-market finish, 2025–2026)

| Trade | Rate | Per | Typical size | Confidence | Main sources |
|---|---|---|---|---|---|
| full | 600–1,400 | m² built | 350 m² | medium | mqawla.com/hasibat-binaa · pybcco.com (finishing price per metre, Riyadh) |
| interior | 700–2,000 | m² | 150 m² | low (sources disagree) | spaces-sa.com · smddecoration.com |
| architectural | 40–100 | m² built | 400 m² | medium | alwathaaeq.sa pricing plan · firstdesign-sa.com |
| inspection | 1,000–3,000 | job | 1 villa | medium | argaam.com/ar/article/articledetail/id/588125 (2019) · super-saudi.com |
| pm | 35–65 | m² built | 400 m² | medium | alwathaaeq.sa · innostandards.com |
| demolition | 25–65 | m² | 150 m² | medium | alhazmest.com/building-demolition-costs · pybcco.com |
| structural | 10,000–50,000 | job | 1 repair | low (estimate) | dura-gulf.com · homejeddah.com |
| extensions | 1,200–2,500 | m² | 30 m² | medium | demamdecor.com · pybcco.com/…/annex-construction-cost-riyadh |
| plaster | 22–30 | m² of wall | 700 m² | medium | alittihad.sa/plastering-price-per-meter-saudi-2025 |
| kitchen | 900–2,000 | linear metre | 12 lm | medium | alaniq-kitchen.com (2026) · raghdan.sa kitchen guide 2026 |
| bathroom | 6,000–12,000 | bathroom | 2 | high | pybcco.com/…/bathroom-renovation-cost-riyadh · dura-gulf.com |
| flooring | 70–180 | m² | 200 m² | high | pybcco.com/…/porcelain-installation-price-riyadh · rakeen.pro |
| stone | 200–450 | m² | 60 m² | medium | pricesworld.net · bajco-sa.com/marble |
| painting | 18–45 | m² of wall | 700 m² | high | pybcco.com/…/painting-price-per-square-meter-riyadh · masaratdecor.sa |
| wallcover | 40–180 | m² | 40 m² | medium | youmats.com · decormnzily.com |
| gypsum | 50–130 | m² | 150 m² | high | pybcco.com/…/gypsum-board-price-riyadh · masaratdecor.sa |
| carpentry | 400–850 | m² of front | 12 m² | low (one source) | tahtem.sa |
| doors | 800–2,500 | door | 12 | medium | amerdecor.store · diyar-sa.com |
| aluminium | 350–900 | m² | 35 m² | medium | teknohousealum.com · magico-sa.com (2026) |
| metalwork | 300–900 | m² | 12 m² | medium | aldiraa.com/article.php?id=55 |
| electrical | 80–180 | point | 80 | medium | gulflighthouse.com · homerun.com.sa job logs |
| lighting | 60–150 | point | 50 | low (estimate) | fannikahraba.com |
| plumbing | 2,000–5,000 | wet room | 4 | medium | house-dt.com · pybcco.com |
| watersys | 3,000–10,000 | job | 1 system | low | youmats.com · goldenfiltersa.com |
| hvac | 1,900–4,500 | split unit | 6 | medium | 3orod.net · makkahexperts.com |
| gasheat | 700–2,200 | heater | 4 | medium | shop.saudiceramics.com · house-dt.com |
| insulation | 20–75 | m² of roof | 250 m² | high | albaarq.com · awazel-alsafrrat.sa |
| roofing | 110–300 | m² | 80 m² | medium | masaa.com.sa · shakeljadeed.com |
| facades | 150–340 | m² | 250 m² | medium | aluminum.sammangroup.com · almrj3.com |
| entrances | 8,000–40,000 | job | 1 | low (estimate) | aldiraa.com · bajco-sa.com |
| landscape | 60–200 | m² | 100 m² | medium | abshirgardening.com · naseemlandscape.com |
| shades | 100–300 | m² | 30 m² | medium | shakeljadeed.com · delaaal.com/sw-prices |
| paving | 45–90 | m² | 120 m² | low (estimate) | scbm.sa |
| pools | 35,000–120,000 | job | 4×8 m pool | medium | esnadriyadh.com · mehwaralmadar.com.sa |
| smarthome | 5,000–40,000 | job | 1 villa | low (estimate) | anasmart.com · bacuratec.sa |
| security | 300–600 | camera | 6 | medium | smart-vision-camera.com · homerun.com.sa |
| networks | 100–250 | point | 10 | low (estimate) | ksa1net.com |
| av | 15,000–80,000 | job | 1 room | low (estimate) | lmsatt.com |
| energy | 3,800–6,000 | kW | 8 kW | medium | surgepv.com · voltiat.com |
| accessibility | 55,000–145,000 | job | home lift, 3 stops | medium | swiftlifts.com |
| furnishings | 150–400 | linear metre | 20 lm | low (estimate) | alamaldecor-ksa.com · 5msh.com |
| postclean | 4–8 | m² | 350 m² | low (derived) | almaheron.com |
| maintenance | 6,000–14,000 | year | 1 contract | medium | bluematrix.sa · servicezone.sa |

Cross-check for whole homes (finishing a shell, SAR per m² built): economy 500–1,000, medium 900–1,500,
luxury 1,600–3,000 (sa.aqar.fm, updated September 2026; mqawla.com; masaratdecor.sa; pybcco.com, June
2026; mentorksa.com). Renovation per mqawla.com: cosmetic 80–200, partial 200–450, comprehensive 500–1,100.

## What must not be overclaimed

- Nearly every source is a contractor's price guide, a blog or a calculator — not an audited survey.
  The form calls the range indicative, and it is. Once Tarmem has its own agreed prices, those should
  replace these rates, trade by trade.
- Nine trades have no firm Saudi unit rate (structural, entrances, carpentry, lighting, paving, smarthome,
  networks, av, furnishings): their note says the estimate is a first guide and that prices vary widely.
- Many Saudi quotes are labour-only and exclude the 15% VAT; with-materials figures were used where they
  existed, and VAT treatment is mostly unstated. Pool and lift prices exclude civil works.
- City differences: two 2026 calculators put Jeddah 5–7% and Makkah 13–25% above Riyadh, while other
  sources say Jeddah is 10–20% *below* Riyadh. With the evidence contradicting itself, no city factor is
  applied.
- Researched on 21 September 2026. Prices move: review the table at least twice a year.
