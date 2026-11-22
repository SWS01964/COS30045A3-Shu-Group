# Stand Up 2 (Week 11) — Deep Plan

**Created:** 2026-11-22
**Owner:** Team member 1 (Week 11 presentation + Q&A)
**Status:** Plan only. The Phase 1 build is done; these Week 11 artefacts are not.
**Scope of this plan:** the six items in the Week 11 brief. It deliberately excludes the final-only usability study and Phase 2 chapters.

---

## 0. Strategy in one sentence

Turn the **already-built Phase 1 site** into the four Week 11 design artefacts — three report sections, a prototype pack, and a coding plan — then wrap them in a short design/progress presentation. This is a **documentation and packaging week**, not a build week.

---

## 1. What Week 11 asks for (verbatim)

- Week 11 presentation and Q&A (Team member 1)
- Draft section on Visualisation Design
- Draft section of Interaction Design
- Draft section of Website Design
- Prototype/sketches of visualisation design
- Plan for coding required (data to be loaded, charts, interactions, shared constants etc)

### Mapping: requirement → existing material → what to produce

| Requirement | What already exists | What is missing | Output |
|---|---|---|---|
| Presentation + Q&A | 16-slide pitch deck; `PRESENTER_NOTES.md`; working site | A Week 11 design/progress deck; Q&A answers on design decisions | `presentation/week11/` deck + `CLAUDE_CONTEXT/QA_BANK.md` |
| Visualisation Design draft | Chart choices and alternatives in `FOCUS_2_IDEAS.md`; implemented charts in `website/js/charts/` | Formal written section with rationale, encodings, rejected alternatives | `report/DESIGN_SECTIONS_DRAFT.md` §1 |
| Interaction Design draft | Toggles, selects, hover, click-to-trend, keyboard arrows, data tables | Written section + interaction inventory + state model + built-vs-planned | `report/DESIGN_SECTIONS_DRAFT.md` §2 |
| Website Design draft | Full site, CSS tokens, responsive rules, reduced-motion support | Written section: IA, layout, type, colour, responsive, accessibility, hosting | `report/DESIGN_SECTIONS_DRAFT.md` §3 |
| Prototype/sketches | ASCII concept sketches in `FOCUS_2_IDEAS.md`; live high-fidelity site; one screenshot | A numbered, captioned prototype pack showing concept → wireframe → build → interaction states | `report/figures/standup2/` + exported PDF |
| Coding plan | Working code, file map in `website/README.md`, data sync script | One-page plan covering data contract, charts, interactions, constants, remaining work, QA/deploy | `report/CODING_PLAN.md` |

---

## 2. Success criteria

The Week 11 work is done when:

1. Team member 1 can present for the time limit **without reading the slides**, and can answer 12+ likely questions in under 30 seconds each.
2. The three draft sections are **report-ready**: headings, prose, figure references, captions, sources.
3. The prototype pack shows a clear **concept → wireframe → high-fidelity build → interaction states** progression.
4. The coding plan lets another developer understand **what data feeds what, which module draws what, what the shared constants are, and what remains**.
5. Every number in the deck and sections matches the **canonical numbers sheet** (section 5).
6. The presentation is honest: usability testing, Mercury deployment and Phase 2 are labelled **next**, not done.

---

## 3. Assumptions to confirm before starting

| # | Assumption | Why it matters | Action |
|---|---|---|---|
| A1 | The Week 11 date and presentation length are known | Sets the rehearsal cut | Confirm from the unit site / lecturer |
| A2 | The user is Team member 1, or is preparing the material for TM1 | Ownership and rehearsal | Confirm |
| A3 | Team member 2 has a separate Week 11 deliverable list | Avoid duplicating or missing work | Compare lists and split |
| A4 | The three draft sections will be reused in the final report | Write once, reuse; match final report style | Confirm final report structure |
| A5 | Digital wireframes are acceptable (not hand-drawn) | Determines prototype production method | Ask if unsure; digital is usually fine |
| A6 | A live demo is allowed | Changes deck and backup plan | Prepare both slide-only and demo versions |

**If any assumption is wrong, adjust the plan before producing assets.**

---

## 4. Source material map

| Need | Pull from |
|---|---|
| Brief and constraints | `requirement.md` |
| Audience, RQs, feature promises | `CLAUDE_CONTEXT/TASKS_1-3_DRAFT.md` — **but do not copy its stale numbers** |
| Design rationale, chart alternatives, concept sketches | `CLAUDE_CONTEXT/FOCUS_2_IDEAS.md` |
| Data caveats, validation, processing rules | `processing/EDA_REPORT.md`, `processing/validation_results.csv` |
| Canonical figures | `data/clean/*.csv`, `CLAUDE_CONTEXT/HANDOFF.md` §3, and section 5 below |
| Actual design and interactions | `website/index.html`, `website/css/style.css`, `website/js/main.js`, `website/js/charts/*.js` |
| Coding architecture and file map | `website/README.md`, `processing/sync_website_data.sh` |
| Visual style and existing Q&A | `presentation/beyond_the_road_toll.tex`, `CLAUDE_CONTEXT/PRESENTER_NOTES.md` |
| Status and open issues | `CLAUDE_CONTEXT/HANDOFF.md` |

---

## 5. Canonical numbers sheet (use these; do not use the stale drafts)

**Do not use `TASKS_1-3_DRAFT.md` figures** — it still says 75+ average stay 9.8 days, pedestrian mortality 19 vs 5 per 1,000, and road deaths 1,127. Those are superseded.

### Headline series

| Measure | 2011 | 2021 | Change |
|---|---:|---:|---:|
| Hospitalisations | 34,033 | 39,505 | +16.1% (peak 39,866 in 2019; 2020 = 37,966) |
| Road deaths (ARDD) | 1,277 | 1,130 | −11.5% |
| Population (ABS ERP) | 22,340,024 | 25,685,412 | +15.0% |
| Hospitalisations per 100,000 | 152.3 | 153.8 | flat (peak 161.1 in 2016) |
| Road deaths per 100,000 | 5.72 | 4.40 | −23.1% |
| Hospitalisations per road death | 26.7 | 35.0 | +31% |

2021 hospitalisations = **108 per day**.

### Older riders (the Idea 2 evidence)

| Group | Single-year 2011 → 2021 | Single-year % | 3-yr avg 2011–13 → 2019–21 | 3-yr % | Per person (3-yr) |
|---|---:|---:|---:|---:|---:|
| Pedal cyclist 65–74 | 240 → 749 | +212.1% | 281.0 → 669.0 | **+138.1%** | **+77.9%** |
| Pedal cyclist 75+ | 87 → 285 | +227.6% | 98.7 → 238.7 | **+141.9%** | **+91.8%** |
| Pedal cyclist 40–64 | 2,017 → 3,393 | +68.2% | 2,230.3 → 3,239.7 | +45.3% | — |
| Motorcyclist 65–74 | 161 → 402 | +149.7% | 177.3 → 387.7 | +118.6% | — |
| Motorcyclist 75+ | 42 → 112 | +166.7% | 52.0 → 106.3 | +104.5% | — |

Population growth over the same 3-yr comparison: **65–74 +33.4%**, **75+ +26.1%**.

### Severity

| Age | Avg stay 2016–21 | Died in hospital per 1,000 cases, 2011–19 |
|---|---:|---:|
| 26–39 | 4.3 days | 3.5 |
| 65–74 | 8.0 days | 9.9 |
| 75+ | **11.1 days** | **28.1** |

75+ stay **2.6×** as long as 26–39 and die in hospital **8×** as often.

### Burden (2016–21)

| Road user | Share of cases | Share of bed days |
|---|---:|---:|
| Pedal cyclist | 19.0% | 11.1% |
| Pedestrian | 6.6% | 13.1% |
| Motorcyclist | 22.2% | 25.0% |

### Data credibility

- 117,919 raw rows → **86,140 Traffic rows**.
- 11 cleaning rules; every aggregation derived from `raw` tabs.
- **18 PASS, 9 FAIL (all explained), 0 UNEXPLAINED** against published T1–T5.
- National annual, road-user, age and remoteness totals match BITRE exactly.
- Series breaks: Victoria 2012, NSW June 2017 (both lower counts → rise understated).
- Bed-day method changed July 2015 → compare 2016–21 only.
- Died-in-care incomplete 2020–21 (88 in 2020, 0 in 2021) → mortality 2011–19 only.

---

## 6. Deliverables and acceptance criteria

| ID | Deliverable | Format | Acceptance criteria |
|---|---|---|---|
| D1 | Week 11 presentation + Q&A | Slides (PDF/HTML/TeX) + speaker notes | 8–10 slides; fits time; demo path rehearsed; 12+ Q&A answers |
| D2 | Visualisation Design section | Markdown → final report | 900–1,200 words; chart-by-chart rationale; alternatives table; figure refs |
| D3 | Interaction Design section | Markdown → final report | 600–800 words; inventory table; state model; built-vs-planned |
| D4 | Website Design section | Markdown → final report | 600–800 words; IA, layout, type, colour, responsive, accessibility, hosting |
| D5 | Prototype pack | PNG/SVG + PDF | 6–8 numbered figures; concept → wireframe → build → states; captions |
| D6 | Coding plan | Markdown/PDF | Data contract, module map, constants, interactions, remaining work, QA/deploy |
| D7 | Integrated evidence pack | One PDF or folder | D2–D6 in order; consistent captions; canonical numbers; handoff updated |

---

## 7. Work breakdown structure

Estimates assume you already know the codebase. Times are per deliverable, not per person.

### D1 — Presentation + Q&A (3 h)

| ID | Subtask | Estimate | Depends | Output |
|---|---|---:|---|---|
| D1.1 | Confirm date, time limit, rubric, Q&A format | 15 m | A1 | Notes |
| D1.2 | Choose 8–10 slide cut (section 8.6) | 20 m | D1.1 | Slide outline |
| D1.3 | Build deck from template/pitch style | 60 m | D1.2, D5 | Deck source |
| D1.4 | Write speaker notes per slide | 30 m | D1.3 | Notes |
| D1.5 | Write Q&A bank (section 8.7) | 30 m | D1.3 | `QA_BANK.md` |
| D1.6 | Rehearse to time; record backup demo | 30 m | D1.4, D1.6 | Rehearsal log + video |

### D2 — Visualisation Design section (2.5 h)

| ID | Subtask | Estimate | Depends | Output |
|---|---|---:|---|---|
| D2.1 | Outline headings and argument | 20 m | — | Outline |
| D2.2 | Write design goals + principles | 25 m | D2.1 | §1–2 |
| D2.3 | Write chart-by-chart rationale (1B, 1A, 2A, 2B) | 60 m | D2.2, D5 | §3–6 |
| D2.4 | Build alternatives-rejected table | 20 m | D2.3 | Table |
| D2.5 | Write encodings, accessibility, data constraints | 30 m | D2.3 | §7–9 |
| D2.6 | Add figure references/captions; cross-check numbers | 15 m | D5, section 5 | Final § |

### D3 — Interaction Design section (1.5 h)

| ID | Subtask | Estimate | Depends | Output |
|---|---|---:|---|---|
| D3.1 | Write interaction goals tied to Sam | 15 m | — | §1 |
| D3.2 | Build interaction inventory table from code | 30 m | D3.1 | §2 |
| D3.3 | Write state model + feedback behaviour | 20 m | D3.2 | §3–4 |
| D3.4 | Write mobile/touch + accessibility behaviour | 15 m | D3.2 | §5–6 |
| D3.5 | Write built-vs-planned + evaluation plan paragraph | 10 m | D3.4 | §7–8 |

### D4 — Website Design section (1.5 h)

| ID | Subtask | Estimate | Depends | Output |
|---|---|---:|---|---|
| D4.1 | Write goals + information architecture | 20 m | — | §1–2 |
| D4.2 | Write layout, typography, colour system | 25 m | D4.1 | §3 |
| D4.3 | Write component inventory | 15 m | D4.2 | §4 |
| D4.4 | Write responsive + accessibility behaviour | 20 m | D4.3 | §5–6 |
| D4.5 | Write technical architecture + Mercury deployment | 10 m | D4.4 | §7–8 |

### D5 — Prototype pack (3 h)

| ID | Subtask | Estimate | Depends | Output |
|---|---|---:|---|---|
| D5.1 | Redraw concept sketches cleanly (page flow, lines, heatmap) | 40 m | — | P1 |
| D5.2 | Build low-fi wireframes: page, Ch1, Ch2, severity, mobile | 50 m | D5.1 | P2–P4 |
| D5.3 | Capture high-fi desktop/mobile screenshots | 20 m | Site running | P5–P6 |
| D5.4 | Capture interaction-state strip (5 states) | 30 m | Site running | P7 |
| D5.5 | Annotate + number + captions + export PDF | 40 m | D5.3–D5.4 | P1–P8 |

### D6 — Coding plan (1.5 h)

| ID | Subtask | Estimate | Depends | Output |
|---|---|---:|---|---|
| D6.1 | Write data contract table (6 CSVs → charts) | 20 m | CSV headers | §1 |
| D6.2 | Write module + constants map from code | 30 m | `website/js/` | §2–3 |
| D6.3 | Write interaction event map | 15 m | D6.2 | §4 |
| D6.4 | Write remaining backlog (P0/P1/P2) | 15 m | D6.2 | §5 |
| D6.5 | Write QA + deployment plan | 10 m | D6.4 | §6–7 |

### D7 — Integration and review (1 h)

| ID | Subtask | Estimate | Depends | Output |
|---|---|---:|---|---|
| D7.1 | Cross-check every number against section 5 | 20 m | D1–D6 | Checked pack |
| D7.2 | Assemble sections + figures + coding plan in order | 20 m | D1–D6 | D7 |
| D7.3 | Update `CLAUDE_CONTEXT/HANDOFF.md` | 10 m | D7.2 | Handoff |
| D7.4 | Submission checklist (section 13) | 10 m | D7.3 | Signed-off checklist |

**Total: ~14 hours.** Across two people, ~7 each — inside the unit's 6–8 hours/week expectation.

---

## 8. Detailed content specs

### 8.1 Visualisation Design section (D2)

**Target:** 900–1,200 words, report style, figure-referenced.

Suggested headings:

1. **Design brief and audience.** Sam, 52; two questions: “Is it getting safer?” and “Is that true for people like me and my parents?” The design answer is a two-chapter narrative, not a dashboard.
2. **Design principles.** Narrative over exhaustive exploration; one chart per claim; direct labels instead of legends where possible; annotate the finding; no dual axes; counts and rates side by side; mobile-first; accessible by default.
3. **Chart 1B — unit chart: “one death, N hospitalised.”** Task: make an abstract ratio concrete. Encoding: one dot per person, one dark dot = one death. Why units: memorable, human-scale, works at the top of a story. Alternatives rejected: pie (part-to-whole is not the point), bar (compresses the ratio), log axis (abstract).
4. **Chart 1A — indexed line chart.** Task: compare hospitalisations, road deaths and population, which differ by orders of magnitude, and show the gap over time. Encoding: index 2011 = 100; position; direct labels; grey NSW band; Victoria marker; COVID annotation; Counts/Per person toggle. Alternatives rejected: dual axis (misleading), separate panels (loses the gap), slope chart (loses the time path).
5. **Chart 2A — heatmap.** Task: show change across two categorical dimensions (road user × age) and let the reader find themselves. Encoding: rows = road users, columns = age; diverging log-ratio colour (blue falls, orange rises); 3-year averages; hatching for <30 cases; selection outline; linked trend line. Alternatives rejected: small multiples (too tall on mobile), bubble chart (harder to read exact cells), grouped bars (35 groups is unreadable).
6. **Chart 2B — aligned severity panels.** Task: compare volume, average stay and in-hospital mortality by age without a dual axis. Encoding: three aligned panels sharing the age axis; 75+ highlighted; annotations. Alternatives rejected: dual axis (misleading), radar (hard to compare), table (loses the shape).
7. **Cross-cutting encodings.** Palette tokens; log-ratio colour; number formats; source notes; data tables behind every chart; small-count rule.
8. **Accessibility and mobile.** Colour-blind-safe palette; text labels not colour alone; data tables; aria labels; keyboard; reduced motion; 375px layout.
9. **Design evolution.** Concept sketches (`FOCUS_2_IDEAS.md`) → wireframes → built site; what changed and why (e.g. 3-year averages replaced single-year endpoints; heatmap got a log scale; “tripled” became “more than doubled”).
10. **Figures.** P1, P2, P5, P7.

### 8.2 Interaction Design section (D3)

**Target:** 600–800 words + inventory table.

Suggested headings:

1. **Interaction goals.** Orient (what am I looking at?), compare (counts vs rates), personalise (“find yourself”), drill down (yearly trend), inspect (exact values).
2. **Principles.** Direct manipulation; visible state; progressive disclosure; no hover-only content; keyboard/touch parity; reduced motion.
3. **Interaction inventory.** Table with columns: control, location, action, response, feedback, keyboard/touch, state.
   - Lines: Counts/Per person toggle; pointer hover/tap; left/right arrows; data table.
   - Heatmap: road-user select; age select; click/Enter/Space on cell; hover/focus tooltip; per-person toggle; linked trend chart; data tables.
   - Severity: hover/focus tooltips; data table.
   - Unit: entry animation (respects reduced motion); data table.
   - Global: Escape dismisses tooltip; resize redraws with debounce; details/summary tables.
4. **State model.** Default → hovered → selected → mode (counts/per person) → low-count (hatched) → resized. Describe what persists and what resets.
5. **Feedback and affordances.** Cursor changes; selection outline; aria-live sentence; highlighted labels; tooltip placement.
6. **Mobile and touch.** Tap targets; `touch-action: pan-y`; tooltips on tap; horizontal scroll only inside data tables.
7. **Accessibility.** Focus order; roles (`button`, `img`); aria labels; keyboard; reduced motion; text alternatives.
8. **Built vs planned.** Built: everything above. Planned: sex/remoteness filters, URL-addressable state, downloadable processed CSV, guided tour. (Only claim what is actually built.)
9. **Evaluation plan (future).** 5–6 Sam-like participants; think-aloud; tasks (“find your group’s change”, “which age group stays longest”); success rate, time on task, SUS; changes log. One paragraph — this is for the final submission, not Week 11.

### 8.3 Website Design section (D4)

**Target:** 600–800 words.

Suggested headings:

1. **Goals.** News-story reading experience; mobile-first; fast; accessible; no build step.
2. **Information architecture and page flow.** Masthead → Chapter 1 → Chapter 2 → About/methods → footer. No top nav; the story is the navigation; one anchor link to methods.
3. **Layout system.** `.wrap` 760px, `.wide` 980px, 16px gutters; prose in `.wrap`, figures in `.wide`; chart SVGs fill the container.
4. **Typography and colour.** Serif body for reading; sans labels/UI; type scale via `clamp`; colour tokens in `:root`; orange = rise/accent, blue = fall/decrease; paper background.
5. **Component inventory.** Chapter header, figure head, controls/toggle, finder, sentence callout, legend, trend block, source note, data table, tooltip, about cards.
6. **Responsive behaviour.** Breakpoints at 600px (body/finder), 560px (chart label logic), 479px (legend simplification); chart-specific adaptations; no page-level horizontal scroll; tables scroll inside their container.
7. **Accessibility.** Semantic HTML; headings; aria labels/roles; focus-visible styles; keyboard; reduced motion; data tables; colour-blind palette.
8. **Technical architecture.** Static HTML/CSS/JS; D3 7.9.0 vendored; six CSVs fetched with `d3.csv`; relative paths; no CDN or build step.
9. **Hosting and deployment.** Copy `website/` to Mercury; keep structure; test from another device; fallback local server instructions.
10. **Known gaps.** Team names/GitHub/licence placeholders; no downloadable dataset yet; explorer covers road user + age only.

### 8.4 Prototype pack (D5)

**Format:** 6–8 numbered figures, each with a caption and source note. Export PNG at ≥1600px wide and assemble into a PDF.

| Figure | Content | How to produce |
|---|---|---|
| P1 | Concept sketches: page flow, indexed lines, heatmap | Redraw the ASCII sketches from `FOCUS_2_IDEAS.md` cleanly in SVG/HTML |
| P2 | Low-fi wireframe: overall page (desktop) | Greyscale boxes, labelled regions |
| P3 | Low-fi wireframe: Chapter 1 + Chapter 2 (desktop) | Greyscale; show figure placement and controls |
| P4 | Low-fi wireframe: mobile layout | 375px frame; stacked charts; finder |
| P5 | High-fidelity desktop screenshot, annotated | Headless Chrome full-page capture + numbered callouts |
| P6 | High-fidelity mobile screenshot, annotated | CDP device emulation at 375px + callouts |
| P7 | Interaction-state strip | Five crops: default heatmap; hover tooltip; selected cell + trend; per-person mode; low-count hatch. Also lines counts vs per person |
| P8 | Design evolution strip | Concept → wireframe → build, side by side |

**Annotations to include:** why the chart form; where the reader’s eye goes; which control changes what; how low counts are handled; where the caveat lives.

**Timebox: 3 hours.** Do not redraw the entire site by hand — use screenshots for high fidelity.

### 8.5 Coding plan (D6)

**Format:** 1–2 pages.

1. **Architecture.** Static site; no build step; D3 7.9.0 vendored; `main.js` loads six CSVs, fills prose, initialises charts; charts redraw on resize.
2. **Data contract.**

| File | Key columns | Consumer | Notes |
|---|---|---|---|
| `idea1_rates.csv` | year, hospitalisations, erp_total, hosp_per_100k, road_deaths, deaths_per_100k, hosp_per_death, series_break | Unit chart, lines, prose | One row per year |
| `idea1_index_long.csv` | year, series, value, index_2011 | Lines | series = hospitalisations / population / road_deaths |
| `idea2_heatmap_change.csv` | road_user, age_group, hosp_2011, hosp_2021, abs_change, pct_change, avg_2011_2013, avg_2019_2021, pct_change_3yr, low_count | Heatmap, prose | 35 rows; 3-yr values are primary |
| `idea2_age_population_change.csv` | age_group, erp_2011, erp_2021, pct_change_single, erp_avg_2011_2013, erp_avg_2019_2021, pct_change_3yr | Heatmap per-person | 7 age groups |
| `idea2_roaduser_age_annual.csv` | road_user, age_group, year, hospitalisations | Heatmap trend | 385 rows |
| `idea2_age_severity.csv` | age_group, hosp_2016_2021, bed_days_excl_died_2016_2021, avg_stay_days_2016_2021, cases_2011_2019, died_2011_2019, died_per_1000_2011_2019 | Severity, prose | 7 age groups |

3. **Module map.** `common.js` (helpers, tooltip, tables), `unit.js`, `lines.js`, `heatmap.js` (+ trend), `severity.js`, `main.js` (load/fill/init/resize).
4. **Shared constants.** CSS tokens for palette; `Viz` helpers (`fmtInt`, `signed`, `ageLabel`, `wrap`, `tip`, `debounce`, `fillTable`); breakpoints (600/560/479); chart margins; 2011 = 100 index convention.
5. **Interaction event map.** Toggle clicks → mode state → re-render; select changes → `setSel` → map + trend + sentence; pointer/keyboard → tooltip/selection; resize → debounced redraw.
6. **Remaining coding backlog.**
   - P0 (required for final): placeholders, licence, downloadable CSV, accessibility audit, usability fixes.
   - P1 (if scope): sex/remoteness filters; URL state; guided tour.
   - P2 (Phase 2): RQ3 road-user/counterparty severity; RQ4 COVID monthly faceting; RQ5 equity (only after FN validation is resolved).
7. **QA plan.** `node --check`; assets 200; headless render at 375/768/1280; all `data-fill` populated; 5 SVGs; no console errors; no page overflow; keyboard walkthrough; reduced-motion check; data-table check.
8. **Deployment.** Copy `website/` to Mercury; relative paths; test from phone; keep a local fallback.

### 8.6 Presentation deck (D1)

**Target:** 8–10 slides for a 6–8 minute talk + Q&A. Adjust if the limit differs.

| # | Slide | Content | Time |
|---|---|---|---|
| 1 | Title | Project, team, “Week 11 design checkpoint” | 15 s |
| 2 | Since Stand Up 1 | Pitch → built and validated; one-line progress claim | 30 s |
| 3 | Claim 1 | 39,505 / 108 a day / 35 per death; annotated lines | 60 s |
| 4 | Claim 2 | Older riders; heatmap with two hot cells | 60 s |
| 5 | Visualisation design | Chart-choice rationale; alternatives rejected | 75 s |
| 6 | Interaction design | Find-yourself + state strip | 75 s |
| 7 | Website design | Layout, mobile, accessibility | 45 s |
| 8 | Prototype evolution | Concept → wireframe → build | 30 s |
| 9 | Coding plan | Data → charts → constants; what remains | 30 s |
| 10 | Next steps + asks | Usability, design doc, Mercury; feedback wanted | 15 s |
| 11 | Backup | Validation result, caveats, sources | Q&A |

**Talk track opening:** “In Stand Up 1 we pitched two claims. Since then we’ve built both, validated the data against BITRE’s published tables, and shipped a working D3 prototype. This week is about the design decisions behind it.”

### 8.7 Q&A bank (D1.5)

Keep answers under 30 seconds. Full answers in `CLAUDE_CONTEXT/QA_BANK.md`.

1. **Why a heatmap?** Two categorical dimensions plus magnitude; compact; colour shows the pattern, text/data table gives exact values.
2. **Why a log-ratio colour scale?** Halving and doubling are equal perceptual steps; a linear scale would let the biggest rises dominate. Capped at −60%…+150%.
3. **Why three-year averages?** Endpoint years are noisy. Single-year says +212%/+228%; 3-year says +138%/+142%. “More than doubled” is true under both, so it is the defensible claim.
4. **Why not say “tripled”?** Only the single-year comparison supports it.
5. **Isn’t this just ageing?** 65–74 population +33%, injuries +138% → per person +78%. 75+ +26% vs +142% → +92%. Ageing explains part, not most.
6. **Counts vs rates?** Counts rise with population; we provide per-person toggles. Rates are per resident, not per kilometre or trip.
7. **Why not a dashboard?** The brief asks for a narrative, not exhaustive exploration. BITRE already has a Power BI explorer.
8. **How is this different from BITRE’s Power BI?** Theirs is an analyst tool; ours is a public narrative with structured exploration, per-person views and built-in caveats.
9. **Why only two chapters?** Deliberate scope: RQ1 + RQ2 + the age half of RQ3. Phase 2 is in the backlog.
10. **What about the series breaks?** Victoria 2012 and NSW 2017 narrowed what counts as an admission; both lower counts, so the rise is understated and NSW’s post-2017 fall is an artefact.
11. **Why bed days only from 2016, deaths only to 2019?** Bed-day method changed July 2015; died-in-care data is incomplete in 2020–21.
12. **What about exposure?** No kilometres, trips or cycling participation in the data. We adjust for population, not exposure; stated on the page.
13. **How accessible is it?** Semantic HTML, aria labels, keyboard access, data tables, colour-blind palette, reduced motion, true 375px layout.
14. **How will you evaluate usability?** 5–6 Sam-like participants, think-aloud, three tasks, success/time/SUS. **Not done yet** — it is the next step.
15. **What remains?** Usability testing, design-process write-up, Mercury deployment; optional Phase 2. First Nations data has an unresolved validation gap.
16. **Why D3?** Required by the brief; gives custom annotated charts; vendored v7.9.0, no build step.

---

## 9. Timeline

### 7-day plan (replace D0 with the Week 11 date)

| Day | Work | Output |
|---|---|---|
| D-7 | Confirm rubric/date/time; gather sources; agree canonical numbers | Notes + numbers sheet |
| D-6 | D5.1–D5.2: concept sketches + wireframes | P1–P4 |
| D-5 | D5.3–D5.5: screenshots, states, annotations | P5–P8 + PDF |
| D-4 | D2: Visualisation Design section | D2 draft |
| D-3 | D3 + D4: Interaction and Website Design sections | D3–D4 drafts |
| D-2 | D6 coding plan; D1 deck | D6 + deck draft |
| D-1 | Speaker notes, Q&A bank, rehearsal, backup demo | D1 final + QA bank |
| D0 | Present + Q&A | — |

### 3-day compressed plan

| Day | Work |
|---|---|
| Day 1 | D5 prototype pack (concept → screenshots → states) + D2 Visualisation section |
| Day 2 | D3 + D4 sections + D6 coding plan |
| Day 3 | D1 deck + speaker notes + Q&A + rehearsal + backup |

### If solo

Prioritise in this order: **D1 (presentation) → D5 (prototype) → D2 (visualisation) → D3 (interaction) → D6 (coding plan) → D4 (website)**. The presentation and prototype are the visible marks; the sections can be tightened after.

---

## 10. Team split and cadence

Assuming the user is Team member 1:

| Owner | Deliverables |
|---|---|
| **TM1 (presenter)** | D1 deck + Q&A + live demo; D2 Visualisation Design |
| **TM2** | D4 Website Design; D6 coding plan; screenshot capture for D5 |
| **Both** | D3 Interaction Design; D5 review; canonical-number check; rehearsal |

**Cadence:** one 20-minute check-in at D-4 and D-1. Async rule: every figure and number must have an owner and a source.

---

## 11. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Rubric/date/time unknown | Medium | High | Confirm before building the deck |
| Stale numbers creep in from old drafts | High | High | Use section 5 only; ban `TASKS_1-3_DRAFT.md` figures |
| Prototype pack becomes a time sink | Medium | Medium | Timebox 3 h; screenshots are the high-fidelity prototype |
| Live demo fails | Medium | High | Local server tested beforehand; 90-second backup video + slide screenshots |
| Overclaiming usability/Phase 2 | Medium | High | Script says “next”; Q&A answer 14 |
| Team member availability | Medium | Medium | Split by deliverable; async review |
| Report sections don’t fit final structure | Low | Medium | Use report-style headings now; adjust later |
| Scope creep into sex/remoteness/Phase 2 | High | High | Out-of-scope list (section 12) |
| First Nations validation anomaly surfaces in Q&A | Low | Medium | Say it is Phase 2 and not yet used; do not defend the numbers |

---

## 12. Explicitly out of scope for Week 11

- Running usability sessions (final submission item; only the *plan* is written here).
- Phase 2 chapters: RQ3 road-user/counterparty severity, RQ4 COVID, RQ5 equity.
- Resolving the First Nations validation shortfall.
- Mercury deployment (do it after Week 11 if time is short).
- New chart types or a redesign of the site.
- Sex/remoteness explorer filters, unless they are needed to make the Task 3 claims honest — in that case, either build them or change the claim to “road user + age”.

---

## 13. Definition of done / submission checklist

- [ ] Week 11 date, time limit, format and rubric confirmed
- [ ] Canonical numbers sheet agreed by both team members
- [ ] D2, D3, D4 drafted with headings, prose, figure references and captions
- [ ] D5 has 6–8 numbered figures with captions and source notes
- [ ] D6 covers data, charts, interactions, shared constants, remaining work, QA and deployment
- [ ] D1 deck is 8–10 slides and fits the time
- [ ] Speaker notes exist for every slide
- [ ] Q&A bank has 12+ questions with short answers
- [ ] Rehearsed at least twice, timed
- [ ] Backup demo recorded and stored locally
- [ ] Every number cross-checked against section 5
- [ ] No claim says usability, Phase 2 or deployment is finished
- [ ] `CLAUDE_CONTEXT/HANDOFF.md` updated with status and file locations
- [ ] Files named and stored in the agreed folders

---

## 14. Suggested file map

```
CLAUDE_CONTEXT/
  STANDUP2_PLAN.md          <- this plan
  QA_BANK.md                <- D1.5
  HANDOFF.md                <- status pointer
report/
  DESIGN_SECTIONS_DRAFT.md  <- D2 + D3 + D4
  CODING_PLAN.md            <- D6
  figures/standup2/         <- P1–P8 PNG/SVG
  STANDUP2_PACK.pdf         <- D7 assembled
presentation/
  week11/                   <- D1 deck source + PDF
```

If the unit requires a different report structure, keep these as working drafts and paste them into the final template.

---

## 15. Next actions (start here)

1. **Confirm A1–A6** (date, time limit, rubric, TM1 ownership, TM2 list, demo allowed).
2. **Agree the canonical numbers sheet** (section 5) with your teammate.
3. **Create the `report/` and `presentation/week11/` folders.**
4. **Start D5** — capture the desktop/mobile screenshots and the five interaction states first; they feed every other deliverable.
5. **Then D2** — write the Visualisation Design section around those figures.
6. **Then D3/D4/D6**, then the deck, then rehearse.

**Do not start with the deck.** The deck is the summary; the figures and sections are the evidence.
