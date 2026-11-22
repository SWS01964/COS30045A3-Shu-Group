# HANDOFF — read this first (for Claude or DeepSeek picking up mid-way)

Last updated: 2026-11-22 by Claude (Stand Up 2 build). Update the "Status" section whenever you finish a step.

## 1. What the project is
- Unit: COS30045 Data Visualisation, Assignment 3 (team project, team of 2). Full brief: `../requirement.md`. **Read it in full before doing anything.** The user is strict about this.
- Topic: **hospitalised injuries from road crashes in Australia, 2011–2021** (BITRE data).
- Deliverable (eventually): a **D3-built interactive web data story** (narrative-driven, not a "show everything" dashboard), hosted on Swinburne Mercury, plus documentation of data processing, design process, and a **usability evaluation**.
- Must NOT copy the BITRE Power BI dashboard's design/purpose.
- Must show awareness that raw counts ≠ rates (population differences, e.g. NT vs Vic). Normalising is optional, but the limitation must be stated in the narrative.

## 2. Current user goals (bottom of requirement.md)
The user is working on 3 pre-design tasks. Answers must be **professional, carefully reasoned, written as if by a newspaper data-visualisation desk**:
1. At least 3 data-visualisation research questions
2. A perspective/target audience ("whose shoes in Australia")
3. What to provide to that audience

Draft answers: `TASKS_1-3_DRAFT.md` (this folder).

## 3. Status
- [x] Read the brief and the data dictionary; inspected all 3 workbooks
- [x] Exploratory analysis (numbers below)
- [x] Drafted Tasks 1–3 → `TASKS_1-3_DRAFT.md`
- [x] User asked to narrow to 2 ideas + 2 headlines + 1–2 charts each → `FOCUS_2_IDEAS.md`. **Phase 1 only. The user will expand later**, so nothing is dropped. Idea 1 = RQ1; Idea 2 = RQ2 plus the age half of RQ3. Expansion backlog: RQ3 road-user/counterparty severity (pedestrians), RQ4 COVID 2020, RQ5 equity (First Nations, remoteness). Build the site as modular chapters with a shared data pipeline and style so new chapters can be added.
- [ ] Waiting for user feedback on FOCUS_2_IDEAS.md
- [x] Recomputed (scripts/focus.py), now the canonical figures: died in care per 1,000, 2011–19: pedestrian 21.8, car passenger 7.3, car driver 5.8, motorcyclist 4.1, cyclist 1.9; by age 75+ 28.1, 65–74 9.9, 26–39 3.5. Average stay (2016–21): 75+ 11.2 days, 65–74 8.0, 40–64 5.5, 26–39 4.3. Heatmap % change 2011→21 is in FOCUS_2_IDEAS.md.
- [x] Supplementary data done (2026-11-17): ABS ERP (ERP_Q API) + BITRE ARDD deaths -> `data/clean/supp_*.csv`, `idea1_rates.csv`, `idea1_index_long.csv`, `idea2_age_population_change.csv`; sources in `data/supplementary/SOURCES.md`, verification in `processing/EDA_REPORT.md`. Revisions: road deaths 2021 = 1,130 (not 1,127), -11.5%; pop +15.0% confirmed; rate ~152 -> ~154 per 100k; cyclist 65-74 / 75+ per-100k rate +78% / +92% (3-yr avg). ARDD licence is CC BY 3.0 AU.
- [x] Python data processing done: `processing/clean_data.py` (run with the scratchpad venv) -> `data/clean/*.csv` (6 national/idea files + 5 state + 5 First Nations block files), `processing/EDA_REPORT.md`, `processing/eda_figures/`, `processing/KNIME_WORKFLOW_GUIDE.md`, `processing/validation_results.csv`. Validation: national T1-T4 exact PASS; state T1 PASS; 9 block-level FAILs, all explained (n.p. cells / unknown category excluded). R7 test: national `Bed days` INCLUDES `Died_bed_days`, so `bed_days_excl_died = bed_days - died_bed_days` (75+ avg stay 11.2 -> 11.1; all else unchanged). FN blocks 1 and 3 are exact duplicates. Changed numbers: April 2019/2020 = 3,488/2,357 on Hospitalisations (earlier 3,507/2,369 were `Count of cases`). Zero-hospitalisation rows carry 4.5% of bed days (kept as published).
- [x] D3 site Phase 1 built (2026-11-17): `website/` (index.html, css, js/charts/{unit,lines,heatmap,severity}.js, vendored D3 7.9.0, 6 CSVs via `processing/sync_website_data.sh`, README). Verified: node --check, all assets 200, headless-Chrome screenshots desktop + 375px (no JS errors, no horizontal scroll). TODO: team names/GitHub URL placeholders, confirm BITRE licence version, usability testing.
- [x] Slide deck built (2026-11-17): `presentation/beyond_the_road_toll.pdf` (16 slides, Beamer 16:9; source `.tex`, `make_figures.py` -> vector charts from `data/clean`, README with build commands). Team names left as placeholder.
- [x] Short KNIME workflow generated + headless-tested (2026-11-17): `BeyondTheRoadToll_DataPrep/` (+ `processing/knime/BeyondTheRoadToll_DataPrep.knwf`) writes `data/clean/knime_idea{1,2}_*_check.csv`; matches Python (34,033 / 39,505; 240 / 749). See top of `processing/KNIME_WORKFLOW_GUIDE.md`.
- [ ] Not started: KNIME build by student, usability testing
- Heatmap now log-ratio colour scale (−60%…+150%); 2011=100 label: no such label is drawn in `lines.js` (only in the chart title), so nothing was moved.
- [x] Deep read + re-verification (2026-11-22): **no project file changed since 2026-11-17**. Site served and re-rendered headless: assets 200, 5 SVGs, all 19 `data-fill` values populated, no JS error block, no page overflow at true 375px (`scrollWidth` 375) or 1280px; the six `website/data` CSVs are byte-identical to `data/clean`. Deck PDF is 16 pages and renders cleanly. Open gaps unchanged (usability testing, design-process write-up, Mercury hosting, names/GitHub/licence placeholders, KNIME GUI run, Phase 2 chapters).
- Consistency gaps found in the deep read: (a) `TASKS_1-3_DRAFT.md` still carries superseded figures (75+ stay 9.8 vs canonical 11.1; pedestrian mortality 19 vs 21.8 per 1,000; road deaths 1,127 vs 1,130) and "(verify)" tags; (b) Task 3 promises a sex + remoteness explorer and a downloadable processed dataset that the Phase 1 site does not have; (c) deck slide 9 legend caps at +100% while the site caps at +150% (cells above +100% are clipped); (d) `git status` has every project folder untracked, no `.gitignore`, and the branch is `test/permission-check`.
- First Nations block validation shortfalls (by_age 2014 −2,576; by_road_user up to −811/yr; by_remoteness −1,110/yr) are labelled "explained" by n.p./unknown-remoteness, but the first two are too large for the suppressed cell counts and still need the investigation noted in section 9 before any FN chapter.
- [x] **Stand Up 2 / Week 11 (design checkpoint) deliverables BUILT 2026-11-22** (plan: `CLAUDE_CONTEXT/STANDUP2_PLAN.md`). Produced, all grounded in the live `website/` code and the canonical §5 numbers: `report/DESIGN_SECTIONS_DRAFT.md` (Visualisation §1, Interaction §2, Website §3); `report/CODING_PLAN.md`; `CLAUDE_CONTEXT/QA_BANK.md` (16 short answers); prototype pack `report/figures/standup2/` (P1–P4/P7/P8 SVG + P5/P6 headless-Chrome PNG + `CAPTIONS.md` + `PROTOTYPE_PACK.html`) assembled into `report/STANDUP2_PACK.pdf`; deck `presentation/week11/` (`index.html` + `SPEAKER_NOTES.md` + `week11_deck.pdf`). Assumptions locked: user is **TM1 (presenter)**, **no live demo** (slide-only), no fixed date (finish ASAP). Still TODO for the user: replace `[Team names]`/`[names]`/`YOUR-ORG` placeholders in deck + `website/index.html`; confirm the time limit/rubric; get TM2's separate deliverable list. Usability testing, Mercury deploy, Phase 2 stay **next/not done** — the deck and Q&A bank say so explicitly.
- [x] **KNIME v2 built 2026-11-23 (S5b):** `BeyondTheRoadToll_DataPrep_v2/` (28 nodes = v1 + F Idea 3 severity + G Idea 4 lockdown; portable, xlsx in `data/`, saved unexecuted) + `processing/knime/BeyondTheRoadToll_DataPrep_v2.knwf`. Headless run OK; 59 PASS / 0 FAIL vs Python (`processing/knime/v2_validation.csv`). Diagram `report/figures/knime/knime_v2_workflow.{png,svg}` (via `processing/knime/render_workflow.py`). Takeover manual: `processing/KNIME_MANUAL.md`. v1 untouched.

## 4. Data files (`../Datas/`)
| File | Key sheet | Shape / notes |
|---|---|---|
| `hospitalisation_injury_publication_sep2023.xlsx` (national) | `raw` (117,919 rows, tidy) | Cols: Calendar year, Month, ABS remoteness area, Cause of injury (6 causes; **filter `Traffic`**), Age group, Sex, Road user (12 + N/A), Counterparty (10 + N/A), Count of cases, Bed days, Died_cases, Died_bed_days, Hospitalisations. Monthly. Summary tables T1–T4 use the **Hospitalisations** column (= cases − died). |
| `state-and-territory-...-2023.xlsx` | `raw` | **5 side-by-side blocks separated by blank columns** (by state / road user / sex / age / counterparty). Header on row 2. 6-monthly (Jan-Jun, Jul-Dec). Counts EXCLUDE died within 30 days. Road users are aggregated (car driver/passenger/unknown merged; heavy transport merged). |
| `First-Nations-hospitalised-injuries-2023.xlsx` | `raw` | Same 5-block layout (by age / road user / age again / remoteness / counterparty). Values include the string **`n.p.`** (not published, i.e. suppressed); parse with `errors='coerce'`. Status: "First Nations people" vs "Non-Indigenous". |
| `hospitalised-injury-data-dictionary-september-2023.pdf` | | Definitions and caveats (summarised below). |

## 5. Data caveats (must appear in the story/method notes)
- **Series breaks:** Vic from 2012 (ED-only cases excluded, about −2.8% nationally in 2012) and NSW from June 2017 (same kind of change). BITRE grey-shades 2011 and 2017+. These narrowings *reduce* counts, so the national rise is probably understated. NSW's post-2017 fall is an artefact, not a safety gain.
- **Bed days method change from 1 Jul 2015** (ICD-10-AM 9th ed., Z50 rehab rule). National average length of stay jumps from 4.0 days (2014) to 5.6 (2016). Compare bed days only within 2016–2021.
- **Died in care looks incomplete:** 2020 = 88 deaths (vs about 200/yr before), 2021 = 0. Exclude 2020–21 from mortality analysis.
- Counts only; no exposure data (kilometres travelled, cycling participation). Population figures are needed for rates.
- First Nations trends may partly reflect better Indigenous identification in hospital records.
- Remoteness and state refer to the patient's **usual residence**, not the crash location.

## 6. Key findings so far (traffic only; Hospitalisations column unless noted)
- National: 34,033 (2011) → 39,505 (2021), +16%; peak 39,866 (2019); 2020 = 37,966. About 108 people per day in 2021.
- (verify) Population +15% (ABS ERP 22.3m → 25.7m), so the per-capita rate is flat at about 153 per 100k. Road deaths fell 1,277 → 1,127 (BITRE), about −23% per capita. Hook: "deaths fell, hospitalisations didn't"; about 35 hospitalised per death.
- Road user 2011→2021 (T2): pedal cyclist 5,391→8,163 (+51%); car driver 10,948→13,327 (+22%); motorcyclist 7,565→8,883 (+17%); car passenger −7%; pedestrian 2,754→2,334 (−15%).
- Cyclists by age (raw): 40–64 +68%; 65–74 243→749 (×3.1); 75+ 90→285 (×3.2). Motorcyclists 65–74 162→402 (×2.5).
- Burden ≠ volume (2016–21): cyclists 19.0% of cases but 11.1% of bed days; pedestrians 6.6% of cases but 13.1% of bed days; motorcyclists 22.2% vs 25.0%.
- Severity (2011–21 pooled; recompute for 2011–19): died in care per 1,000 cases: pedestrians 19.3, car drivers 4.9, cyclists 1.6. By age, 75+ = 24.1 (length of stay 9.8 days) vs 26–39 = 3.0. Counterparties: train 48.7 per 1,000 (14.5 days); heavy vehicle/bus 17.3 (8.4 days).
- COVID 2020: April 2020 = 2,369 vs April 2019 = 3,507 (−32%). Yet cyclists went 7,302→8,332 (+14%) for 2020; June 2020 683 vs June 2019 453 (+51%). Pedestrians −22%, car drivers −9%.
- Sex: motorcyclists 90% male, heavy transport drivers 97% male; car passengers 60% female, bus occupants 63% female.
- Remoteness: average length of stay Regional 5.5 days vs Major Cities 4.6. Cyclists are 21% of cases in Major Cities vs 8% in Remote; car passengers are 21% in Remote vs 12% in Major Cities.
- States: Qld 6,322→10,447 (+65%); Tas +63%; NT +56%; NSW −15% (break). ACT: 34% of hospitalisations are cyclists (NT 12%).
- First Nations: 1,167→2,220 (+90%) vs non-Indigenous +15%. 5.6% of 2021 hospitalisations (verify: about 3.8% of the population, 2021 Census). Pedestrians are 12.1% of First Nations cases vs 6.8% for non-Indigenous. First Nations make up about 38% of remote-resident hospitalisations; remote First Nations average length of stay 6.1 days vs 4.8 for non-Indigenous.

## 7. How to re-run the analysis
pandas/openpyxl are NOT installed system-wide. Create a venv:
```
python3 -m venv /tmp/venv && /tmp/venv/bin/pip install pandas openpyxl pypdf
cd CLAUDE_CONTEXT/scripts
/tmp/venv/bin/python sheets.py ../../Datas/*.xlsx                          # list sheets
/tmp/venv/bin/python dump.py <xlsx> <Sheet1,Sheet2> <nrows>                 # print sheets
/tmp/venv/bin/python nat.py ../../Datas/hospitalisation_injury_publication_sep2023.xlsx nat.pkl
/tmp/venv/bin/python explore.py nat.pkl                                     # national trends/severity
/tmp/venv/bin/python explore2.py nat.pkl ../../Datas/First-Nations-hospitalised-injuries-2023.xlsx ../../Datas/state-and-territory-hospitalisation-injury-publication-2023.xlsx
```

## 8. Working notes for the next model
- The user is short on usage. Be efficient, don't redo analysis that is recorded here, and update this file as you go.
- Tone for deliverables: professional newspaper data desk, evidence-led, caveats stated honestly.
- Git: branch `test/permission-check`; `Datas/` and `requirement.md` are untracked. Don't commit unless asked.

## 9. Decisions log (Opus review of cleaning step, 2026-11-17)
- **Headline revised for robustness.** The single-year comparison (2011→2021) gives cyclists 65–74 +212% and 75+ +228%, but 3-yr averages (2011–13 → 2019–21) give only +138% and +142%. Motorcyclists: +150% / +167% single-year vs +119% / +105% on 3-yr averages. New Idea 2 headline: **"cycling injuries have more than doubled among over-65s"** (true under both methods). The heatmap's primary encoding = 3-yr averages; single-year values go in the tooltip.
- Rows with 0 hospitalisations but positive bed days are transfer bed days (data dictionary). They are retained; a note was added to EDA_REPORT.md.
- **OPEN (needed for RQ5 later, not Phase 1):** several First Nations block validations fail by large amounts (by_age 2014 shortfall 2,576; by_road_user shortfall up to 811/yr). That is too large for n.p. suppression alone. Investigate before building the First Nations chapter.
- Phase 1 figure corrections: 75+ average stay = 11.1 days (not 11.2). April 2019 vs April 2020 = 3,488 vs 2,357 (Hospitalisations column), −32%.

- [x] 2026-11-22: Stand Up 1 (ungraded) submission packaged at `~/Desktop/COS30045_StandUp1_Submission/` (+ `.zip`): pitch PDF, portable `.knwf` (paths changed to relative "workflow data area"; national xlsx bundled inside; headless re-run OK, 2011=34,033 / 2021=39,505 / cyclists 65-74 2011=240), `Datas/` originals, README.txt. Project copies were left unchanged (copy, not move).
- [x] 2026-11-22: Week 11 slide 2 reworded to 'Stand Up 1 was the what. Today is the how.' (safe whether or not SU1 showed the site); notes updated; PDF reprinted (11 pages).
- [ ] **Phase 2 started 2026-11-23** — plan: `CLAUDE_CONTEXT/PHASE2_PLAN.md` (Idea 3 severity / pedestrians & counterparty; Idea 4 lockdown 2020; FN/remoteness deferred because of the validation gaps). Sequential subagents S2 research → S3 EDA → S4 storyboard → S5 website → S6 screenshots+slides. Keep `presentation/week11/week11_deck.pdf` (v1) intact as the fallback deck.
  - S2 done (fetch tool blocked most outlets; only ABC, The Conversation, BBC bbplot verified; rest labelled general knowledge; headless-Chrome screenshots of news sites were denied by the permission classifier) → `report/NEWS_DESIGN_RESEARCH.md`
  - S3 done 2026-11-23: `processing/phase2_ideas.py` -> 12 `data/clean/idea3_*`/`idea4_*` CSVs, `processing/eda_figures/phase2/` (12 PNG), `processing/EDA_PHASE2.md`, `phase2_validation.csv` (13 PASS / 0 FAIL), `phase2_key_numbers.csv`, `phase2_run_log.txt`. Revisions: June 2020 cyclists = 682 on Hospitalisations (683 was Count of cases); counterparty train 57.2/1,000 & 18.5 days, heavy vehicle/bus 20.4 & 9.2 days (2011-19 / 2016-21; old 48.7/17.3 were pooled 2011-21). Idea 4: 2020 cyclists +8.6% above 2011-19 trend but inside PI95; Apr-Dec +17.4% vs trend-adjusted monthly, 9/9 months above 2015-19 max. Idea 3: pedestrians 7.3% of cases vs 26.4% of in-hospital deaths (2011-19); 75+ pedestrians 61.3/1,000, 19.2 days; but per-100k hospitalisation of older pedestrians fell -> "less often hurt, far worse hurt". D3 must plot the `*_publish` columns (flags applied).
  - S3 verified by orchestrator (538/2,041 ped deaths; April 3,488→2,357; cyclists 7,302→8,332; June 453→682). S4 done: `report/STORYBOARD.md` (ch3 severity, ch4 lockdown, closing, methods box). Backup of Phase 1 site: `CLAUDE_CONTEXT/backups/website_phase1_2026-11-23.tar.gz`. S5 website redesign: running.
  - S5 done + reviewed (11 SVGs, 102/102 data-fill, 0 JS errors, scrollWidth 375; 64 screenshots in scratchpad/site_check — copy to report/figures/screenshots in S6). 1-case gap 335,454 vs 335,453 = one unknown-age case excluded from age bands (benign). Site served at http://localhost:8765 for user review; user approved the look.
  - S5b KNIME v2 (Ideas 3+4 branches, portable, + `processing/KNIME_MANUAL.md` for DeepSeek): running. Next: S6 screenshots + v2 PDF slides.
  - S5b verified by orchestrator (59/59 PASS; diagram OK); build script kept at processing/knime/build_v2.py. S6 screenshots + v2 deck (presentation/week11_v2/, CUE_CARDS.md) running; v1 deck untouched.
- [x] **Phase 2 COMPLETE 2026-11-23.** S6 done: `report/figures/screenshots/` (web 66, code 10, knime 1, eda 16, INDEX.md); v2 deck `presentation/week11_v2/` (24 slides: 19 talk + backup + 4 appendix; `week11_v2_deck.pdf` 960x540pt; `CUE_CARDS.md` = point/numbers/likely Q per slide, user prefers cue cards not scripts). Orchestrator fix: chart 3A title now changes per step (`website/js/charts/burden.js`, STEPS[].title); re-captured burden screenshots + deck img/ch3a_deaths.png; PDF reprinted.
  - Open items: replace `[names]`/`[Team names]`/`YOUR-ORG` (site, both decks); usability testing (think-aloud, 5–6 Sam-like users, SUS); Mercury deploy; git commit (all untracked, on `test/permission-check`); news-site research only partly verified (fetch blocked; headless screenshots of external sites denied); Chapter 5 equity deferred (FN totals don't reconcile).
- 2026-11-23: `PROJECT_EXPLAINED.md` (project root) = full plain-language explainer of the whole project for the user / DeepSeek to simplify. Keep it in sync if numbers or files change.
