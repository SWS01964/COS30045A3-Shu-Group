# Layout spec: Beyond the Road Toll (single source for wireframes and the website)

2026-11-27. Both the wireframes (B3) and the site skeleton (C1) follow this file. The content comes from `report/STORYBOARD.md` v2 (headlines approved by the user on 2026-11-27).

## Page model
- **One long-form article page.** It's a newspaper data story, not a dashboard: one column of text, with charts set into the flow.
- **Mobile first (375px).** At 960px and up, the text column is 680px wide, centred. Figures can break out to 1040px.
- **No side panels and no tabs.** The reader scrolls; each chart's controls sit directly above that chart.
- **Breakpoints:** 600px (type and controls) and 960px (figure breakout).

## Order of blocks
1. **Masthead.**
   - A small site name, "Beyond the Road Toll", and a "Data investigation" kicker.
   - A sticky chapter nav: `1 Road toll · 2 Older · 3 Severity · 4 Lockdown · 5 Equity · Methods`. On mobile it's a horizontally scrolling pill bar; the current chapter is highlighted while scrolling.
2. **Hero.** Kicker, headline, standfirst, byline/date, then the lede figure (1B unit chart).
3. **Chapters 1–5.** Each chapter is `<section id="ch1">` … `<section id="ch5">` and contains, in order:
   - a chapter label ("Chapter 3")
   - the chapter headline (states the finding)
   - the standfirst
   - a **What to know** box (2–3 bullets, numbers bold)
   - its beats: body paragraph(s) → figure block → body paragraph(s)
   - a chapter caveat line, where the storyboard has one
4. **Closing:** "What to take away", 4 short paragraphs, no chart.
5. **Methods and limitations** box: sources, rules, processing.
6. **Download the data:** links to the 7 CSVs, each with a one-line description.
7. **Footer:** Team Shu · COS30045 Data Visualisation · Swinburne · year, plus a credits line (BITRE, ABS, ARDD).

## Figure block (the same component everywhere)
```
<figure class="fig" id="fig-3a">
  <h3 class="fig-title">States the finding</h3>
  <div class="fig-controls" role="group" aria-label="…">segmented buttons / selects</div>
  <div class="fig-chart" role="img" aria-label="one-sentence summary"></div>
  <p class="fig-notes">Notes line: caveat + source + period</p>
  <details class="fig-data"><summary>Show the numbers</summary><table>…</table></details>
</figure>
```
- **Labels:** written on the marks, with no legend boxes where avoidable.
- **Tooltip:** one shared tooltip. It opens on hover, tap or keyboard focus and closes with Esc.
- **Controls:** segmented buttons with `aria-pressed`, at least 44px tall on mobile.

## Figures (ids, data files, controls)
| id | Chart | Data file | Controls |
|---|---|---|---|
| fig-1b | Lede unit chart: 35 hospitalised per road death (2021) | ch1_trend.csv | — |
| fig-1a | Indexed lines (2011 = 100) for hospitalised, road deaths and population; grey series-break bands | ch1_trend.csv | Counts ↔ Per 100,000 |
| fig-2a | Heatmap, road user × age, % change on 3-year averages; low counts hatched; click a cell for its 2011–21 line beneath | ch2_age_roaduser.csv | "I travel by [select] · I'm aged [select]"; Counts ↔ Per person |
| fig-2b | Three aligned panels by age: admissions, average stay, died per 1,000 | severity.csv (view=age, road_user=All road users) | — |
| fig-3a | Paired bars, five road users: share of admissions vs harm | severity.csv (view=age, category=All ages) | Stepper: Admissions → Bed days → Deaths |
| fig-3b | Dot plot by age, pedestrians vs all, with 95% whiskers | severity.csv (view=age) | Died per 1,000 ↔ Average stay |
| fig-3c | Sorted dot list by counterparty (published rows only) | severity.csv (view=counterparty) | All road users ↔ Pedestrians |
| fig-4a | Monthly line: 2020 vs 2019, with the 2015–19 band | ch4_monthly.csv | All road users ↔ Cyclists |
| fig-4b | Diverging bars: April 2020 vs April 2019 by road user | ch4_monthly.csv (month=April) | — |
| fig-4c | Annual cyclist line with the compound-growth trend to 2020 | ch4_monthly.csv (month=Year, road_user=Pedal cyclist) | — |
| fig-4d | Small table/bars: cyclists Jul–Dec 2020 vs 2019 by state | ch4_state_cyclists.csv | — |
| fig-5a | Two lines, First Nations vs non-Indigenous | ch5_first_nations_trend.csv (+ ABS population, to be added) | Index 2011 = 100 ↔ Per 100,000 |
| fig-5b | Paired bars: road-user mix within each group (2016–21) | ch5_first_nations_profile.csv (view=road_user) | — |
| fig-5c | First Nations share by area ↔ average stay dumbbells | ch5_first_nations_profile.csv (view=remoteness) | Share ↔ Average stay |

## Visual tokens
- **Type:**
  - body: serif 18px desktop / 17px mobile, line height 1.55
  - headlines: a heavy serif or a strong sans
  - UI and chart labels: sans, at least 12px (13–14px preferred)
  - use system font stacks only (no licensed newspaper fonts)
- **Colour:** colour-blind safe, and colour is never the only cue.
  - `--rise` orange `#b8470f`
  - `--fall` blue `#1f5f99`
  - `--ink` `#1c2230`
  - `--muted` `#6b7280`
  - `--context` grey `#8796a8`
  - `--band` `#e6e2d8`
  - `--paper` `#faf8f3`
  - Ch5 groups: First Nations `--accent2` `#7a4fa3` vs non-Indigenous `--context`
  - Dark-mode equivalents are defined on `:root` under `prefers-color-scheme`.
- **Spacing:** 8px base unit. Figures get 40px above and below.
- **Motion:** transitions of 300–500ms. No motion under `prefers-reduced-motion`.

## Accessibility baseline
- **Every figure has:**
  - `role="img"` with an aria-label summary
  - a data table in `<details>`
  - keyboard-operable controls
  - a visible focus ring
- **Contrast:** at least 4.5:1 for text and 3:1 for marks.
- **Mobile:** no horizontal page scroll at 375px.
