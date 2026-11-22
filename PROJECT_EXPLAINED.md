# Beyond the Road Toll: the whole project explained

Written 23 November 2026. This file explains everything in the project folder: what was asked, what we found, what was built, how it fits together, what is honest and what is still missing. It is meant to be read by a person or handed to another AI model to explain in simpler terms.

> **Note for an AI model explaining this file:** The reader is the project's student presenter. They understand ideas best in plain language and they speak in their own words, not from scripts. Explain section by section, use everyday examples, keep the real numbers exactly as written here (don't round them differently or invent new ones), and say clearly when something is *not done* or *not verified*. Don't change any project files unless asked.

---

## Contents

1. The assignment in one minute
2. The data we were given
3. The traps in the data (caveats)
4. Who the story is for: "Sam"
5. The story: four chapters and their numbers
6. How the numbers were produced (the data pipeline)
7. KNIME: the second, independent check
8. The website
9. The presentations and submissions
10. The screenshot record
11. Honesty: corrections we made and things not verified
12. What is still to do
13. Where everything is (file map)
14. How to rerun things
15. Glossary
16. Likely questions and short answers

---

## 1. The assignment in one minute

- **Unit:** COS30045 Data Visualisation, Assignment 3. A team of two.
- **Topic (given):** people hospitalised after road crashes in Australia, 2011–2021.
- **What the brief wants:**
  - A **data story** told with **interactive charts built in D3** (a JavaScript charting library) and hosted on Swinburne's **Mercury** web server.
  - The story must be narrative-led ("here is what we found and why it matters"), **not a dashboard** that lets you click through every possible combination.
  - Document the **data processing** and the **design process**.
  - Run and document a **usability evaluation** (testing the site with real people).
  - Show awareness that **raw counts are not rates**: a big state will always have more injuries than a small one, so comparing counts can mislead.
  - Don't copy the government's existing Power BI dashboard.
- **Tools the brief lists:** VS Code, GitHub, KNIME, the Mercury server (and optionally Confluence or Trello).
- **Checkpoints:** Stand Up 1 (pitch) and Stand Up 2 (Week 11 design checkpoint), then the final submission.

The full brief is in `requirement.md`.

---

## 2. The data we were given

All from **BITRE** (the Bureau of Infrastructure and Transport Research Economics), in the `Datas/` folder:

| File | What it holds |
|---|---|
| `hospitalisation_injury_publication_sep2023.xlsx` | **National data, the main file.** Its `raw` sheet has 117,919 rows, one per month × remoteness × cause × age × sex × road user × counterparty. We keep only **Traffic** causes: 86,140 rows. |
| `state-and-territory-...-2023.xlsx` | State totals, six-monthly. Five tables side by side in one sheet. It leaves out people who died in hospital. |
| `First-Nations-hospitalised-injuries-2023.xlsx` | First Nations vs non-Indigenous, same layout. Some cells say `n.p.` (not published, hidden for privacy). |
| `hospitalised-injury-data-dictionary-september-2023.pdf` | Definitions and warnings. |

Key columns in the national file:
- **Count of cases:** everyone admitted.
- **Hospitalisations:** cases minus those who died, so survivors only.
- **Died_cases:** people who died in hospital within 30 days.
- **Bed days:** total days spent in hospital.
- **Road user:** what the injured person was: driver, passenger, motorcyclist, cyclist, pedestrian and so on.
- **Counterparty:** what they collided with: car, truck or bus, train, fixed object and so on.

We also added two outside datasets:
- **ABS population** by year and age, to turn counts into "per 100,000 people".
- **BITRE road deaths** (the Australian Road Deaths Database), to compare deaths with hospitalisations.

Sources and licences are in `data/supplementary/SOURCES.md`.

---

## 3. The traps in the data (caveats)

These are printed next to the charts, not hidden in footnotes:

1. **Counts are not rates.** More people means more injuries. Where it matters, we divide by population.
2. **Counting changes.** Victoria (from 2012) and NSW (from mid-2017) stopped counting some emergency-only cases. That *lowers* the counts, so the national rise we report is probably *understated*. NSW's apparent fall after 2017 is an artefact of the counting change, not a safety improvement.
3. **Bed days were counted differently from July 2015**, so we only compare bed days within 2016–2021.
4. **Deaths in hospital look incomplete for 2020–2021** (2021 shows zero). Death rates use 2011–2019 only.
5. **No exposure data.** We don't know how many kilometres people drove, walked or rode, so we can't say whether an activity got *more dangerous per trip*.
6. **Residence, not crash site.** State and remoteness describe where the patient lives, not where the crash happened.
7. **First Nations numbers** may partly reflect better recording of Indigenous status over time. On top of that, our checks found the First Nations tables don't add up properly (section 11), so we haven't published on them.

---

## 4. Who the story is for: "Sam"

We wrote the story for one imagined everyday reader, a **persona**:

> **Sam**, 52, lives in outer-suburban Brisbane, drives to work, took up weekend cycling in 2020, and has parents in their late seventies who still walk to the shops. Sam reads news on a phone, in short sittings.

Sam brings three questions:
1. *Is it getting safer out there?*
2. *Are people like me, or my parents, more at risk than I think?*
3. *What should I actually take away?*

**Why a persona?** The brief asks for a story, and a story needs a reader. The data's dimensions (road user, age, where you live) are exactly how a reader "finds themselves". The secondary audience is councillors, road-safety advocates and health planners, who can check the evidence in the methods notes.

---

## 5. The story: four chapters and their numbers

Every number below was computed by a script and can be traced to a CSV in `data/clean/`.

### Chapter 1: The hidden road toll (answers "is it getting safer?")
**Headline:** *The road toll is falling. The injury toll isn't.*
- **39,505** people were hospitalised in 2021, about **108 a day**, up **16%** from 34,033 in 2011.
- Road deaths fell **11.5%** (1,277 → 1,130).
- For every road death, **35** people were hospitalised in 2021, up from **27** in 2011.
- Per person, the hospitalisation rate is basically flat: about **152 → 154 per 100,000**. The population grew about 15%.
- **Charts:** a dot "unit chart" (1 dark dot = 1 death, light dots = people hospitalised) and an **indexed line chart** (2011 = 100), so deaths and hospitalisations can share one axis despite very different sizes. There's a toggle for counts vs per person.

### Chapter 2: Road injury is getting older (answers "people like me?")
**Headline:** *Cycling injuries have more than doubled among over-65s.*
- Cyclists aged **65–74: +138%**, aged **75+: +142%**, comparing 3-year averages (2011–13 vs 2019–21).
- Even per person, after allowing for an ageing population: **+78%** and **+92%**.
- Older people are hurt less often but much worse. People aged 75+ stay **11.1 days** on average, against 4.3 for ages 26–39, and die in hospital at **28.1 per 1,000** vs 3.5.
- **Why 3-year averages?** Single years are noisy. Comparing just 2011 with 2021 would say "tripled", but the averages say ×2.4, so we chose "more than doubled", which is true under both methods.
- **Charts:** a **heatmap** (road user × age, colour = % change) with a "find yourself" picker that writes a plain-English sentence, plus a severity chart by age.

### Chapter 3: Not every crash is equal (NEW; answers "my parents?")
**Headline:** *Pedestrians are 1 in 14 of the injured, but 1 in 4 of those who die in hospital.*
- Pedestrians were **7.3%** of admissions but **26.4%** of in-hospital deaths (**538 of 2,041**, 2011–2019).
- They were **6.6%** of admissions but **13.1%** of bed days (2016–2021): twice their share of hospital beds.
- Deaths in hospital per 1,000 admitted (2011–19): **pedestrian 21.8**, car passenger 7.3, car driver 5.8, motorcyclist 4.1, **cyclist 1.9**.
- **Pedestrians aged 75+: 61.3 per 1,000** die in hospital (about 1 in 16), and survivors stay **19.2 days** on average.
- Pedestrians aged 65+ are **22.9%** of injured pedestrians but **51.7%** of pedestrian deaths in hospital.
- **What hits you matters:** a **heavy vehicle or bus** gives the highest death rate for every road user we could measure (pedestrians: **52.7 per 1,000**). Trains are worse (**57.2**) but rare: 297 cases and 17 deaths in nine years.
- **The honest framing for Sam's parents is "less often hurt, far worse hurt".** Older pedestrians are *not* being admitted more often than a decade ago, but when they are, the outcome is much worse.
- **Charts:**
  - **3A:** paired horizontal bars with three buttons: Admissions → Bed days → Deaths in hospital. The title changes with each button.
  - **3B:** an age dot plot with 95% uncertainty whiskers, pedestrians vs everyone, toggling between death rate and length of stay.
  - **3.3:** a small sorted list of "what you were hit by".

### Chapter 4: The lockdown test (NEW; answers "me, the new cyclist")
**Headline:** *In the month Australia locked down, crash admissions fell by a third. Cyclist admissions rose.*
- **April 2020: 2,357** admissions vs 3,488 in April 2019 (**−32.4%**), the lowest month in 2011–2021.
- In April 2020, admissions fell for pedestrians (**−59.8%**), car passengers (−52.7%), drivers (−42.9%) and motorcyclists (−37.5%). Cyclists **rose 15.9%**.
- Over the full year, cyclists went **7,302 → 8,332 (+14.1%)**, while pedestrians fell 22.5% and drivers 9.4%.
- **June 2020: 682** cyclists vs 453 in June 2019 (+50.6%). From April to December 2020, every month beat the same month of the previous five years.
- Children aged **8–16** were 14.3% of injured cyclists in 2019 but **29.8%** of the 2020 increase.
- **Was it lockdown or a trend?** Cycling injuries were already rising.
  - The 2011–19 trend predicts **7,670** for 2020, so the real 8,332 is **+662 above trend**. That's inside normal year-to-year variation.
  - A 2015–19 trend gives **+973**, outside its normal range.
  - The monthly pattern after March is the stronger evidence.
  - We show all of this rather than overclaiming.
- **The likely explanation is more riders, not riskier riding.** There's no data on trips, so we can't prove it.
- Victoria (longest lockdown) supplied **51.8%** of the national cyclist rise in July–December 2020 (**+40.5%**). The timing fits, but six-monthly state data can't prove cause.
- **Charts:**
  - **4A:** monthly line for 2020 against a grey band showing the 2015–19 range, with a switch between All road users and Cyclists.
  - **4B:** diverging bars of the April change (five bars go left, one goes right).
  - **4C:** a small trend chart with its uncertainty band.

### Closing: What to take away
1. The road toll isn't the whole story. Deaths fell, but serious injuries per person didn't.
2. If you ride, you're part of a growing group. Older riders are a growing share, and admissions rose again in 2020. This doesn't show riding got more dangerous per trip.
3. If your parents walk, the danger isn't how often they're hit but what happens when they are.

### Deferred: Chapter 5, equity (First Nations and remoteness)
This is planned but **not published**. When we checked, the First Nations tables fall short of the national totals by more than the hidden (`n.p.`) cells can explain. For example, the by-age table was short by 2,576 in 2014. A truthful newsroom doesn't publish numbers it can't reconcile.

---

## 6. How the numbers were produced (the data pipeline)

```
Datas/*.xlsx (BITRE originals)
   │
   ├── processing/clean_data.py ──► data/clean/traffic_national_monthly_clean.csv  (+ Idea 1 & 2 CSVs, state & FN tables)
   │        11 written cleaning rules; validation against BITRE's own summary tables
   │
   ├── processing/supplementary_data.py ──► data/clean/supp_*.csv  (ABS population, road deaths)
   │
   ├── processing/phase2_ideas.py ──► data/clean/idea3_*.csv, idea4_*.csv  (Chapters 3 & 4)
   │        + processing/EDA_PHASE2.md, phase2_validation.csv, phase2_key_numbers.csv (100 quotable numbers)
   │
   └── processing/sync_website_data.sh ──► website/data/  (copies the 16 CSVs the site uses)
```

**Main cleaning rules, in plain words:**
- keep only Traffic injuries;
- tidy the column names;
- treat blank counts as zero (checked: those rows have zero hospitalisations);
- keep the "counting change" flags;
- work out bed days excluding deaths where needed.

**How we know it's right:**
- National totals match BITRE's own published summary tables exactly (Phase 1).
- Phase 2 ran **13 reconciliation checks, 13 passed**. The cleaned file matches an independent re-aggregation of the raw workbook.
- I (Claude) separately recalculated the key Phase 2 numbers (538/2,041; April 3,488 → 2,357; cyclists 7,302 → 8,332; June 453 → 682), and they matched.
- **One known tiny difference:** 335,454 vs 335,453 cases. One case has an unknown age, so it's missing from the by-age table. It's harmless.

**Low-count rule:** rates are only shown when there are at least **100 cases and 10 deaths**. The site plots columns ending in `_publish`, which are blank when a rate is too unreliable.

Reports: `processing/EDA_REPORT.md` (Phase 1) and `processing/EDA_PHASE2.md` (Phase 2).

---

## 7. KNIME: the second, independent check

**What KNIME is:** a free drag-and-drop data tool. You connect boxes ("nodes") such as *read Excel → filter rows → group and sum → write CSV*.

**What a `.knwf` file is:** a zipped KNIME workflow folder that you import into KNIME. The unzipped folder (e.g. `BeyondTheRoadToll_DataPrep_v2/`) is the same thing, unpacked.

**Why we use it:**
- The brief lists KNIME.
- It redoes our key sums with a completely different tool. If KNIME and Python agree, we can trust the numbers. KNIME does **not** feed the website; it's a check.

**Versions:**

| Version | Where | What it does | Result |
|---|---|---|---|
| v1 (9 nodes) | `BeyondTheRoadToll_DataPrep/` and `processing/knime/BeyondTheRoadToll_DataPrep.knwf` | Read Excel → Traffic only → blanks to 0 → **Idea 1** yearly totals, indexed to 2011, and **Idea 2** cyclists 65–74 | 34,033 / 39,505 and 240 / 749 match Python |
| Stand Up 1 copy | `~/Desktop/COS30045_StandUp1_Submission/BeyondTheRoadToll_DataPrep.knwf` | v1 made portable: the Excel file is inside the workflow and paths are relative, so it runs on any computer | Tested headless |
| **v2 (28 nodes)** | `BeyondTheRoadToll_DataPrep_v2/` and `processing/knime/BeyondTheRoadToll_DataPrep_v2.knwf` | v1, plus **F1** death rate by road user, **F2** share of cases vs bed days, **G1** April 2019 vs 2020 by road user (with a total row), **G2** cyclists per year. Portable. | **59 of 59 checks match Python** (`processing/knime/v2_validation.csv`) |

- **Diagram:** `report/figures/knime/knime_v2_workflow.png`. It's drawn from the workflow files, because the KNIME app itself can't be screenshotted automatically.
- **Full manual:** `processing/KNIME_MANUAL.md`. It covers how to open, run headless, add nodes by editing files, package, and validate.
- **Rebuild script:** `processing/knime/build_v2.py`.

---

## 8. The website

**Where:** the `website/` folder. It's a static site: HTML, CSS and JavaScript, with no build step. D3 version 7.9.0 is stored locally in `js/vendor/`.

**How to view it:** run `python3 -m http.server 8765 --directory website`, then open `http://localhost:8765/`. Opening `index.html` straight from disk won't work, because browsers block it from loading the CSV files.

**How it works:**
- `index.html` holds the text.
- Many numbers in the text are marked `data-fill`, and `js/main.js` fills them in from the CSVs. That way, words and charts can't disagree.
- `js/main.js` loads all the CSVs, draws each chart, and redraws on resize and theme change.
- `js/nav.js` runs the sticky chapter bar and reading-progress line.
- `js/charts/common.js` holds the shared helpers: colours, number formats, text wrapping, tooltips, data tables.
- **One file per chart:**

| File | Chart |
|---|---|
| `unit.js` | 1B: 1 death vs 27/35 people hospitalised (dots) |
| `lines.js` | 1A: indexed lines, counts vs per-person toggle |
| `heatmap.js` | 2A: road user × age heatmap and "find yourself" picker |
| `severity.js` | 2B: stay and death rate by age |
| `burden.js` | 3A: share of admissions vs bed days vs deaths (3 buttons) |
| `agedots.js` | 3B: age dot plot with whiskers |
| `counterparty.js` | 3.3: what you were hit by |
| `lockdown.js` | 4A: monthly 2020 vs the 2015–19 band |
| `diverging.js` | 4B: April 2020 change by road user |
| `trend.js` | 4C: cyclist trend and band |

**Design: why it looks like a newspaper**
- Patterns taken from professional data journalism:
  - a masthead and headline block (kicker, headline, standfirst, byline, date);
  - a "What to know" box per chapter;
  - one big "pull stat" per chapter;
  - chart titles that **state the finding**, with the unit in a subtitle;
  - a **Source** and **Notes** line under every chart;
  - **direct labels** instead of legends;
  - **one highlight colour, everything else grey**;
  - light horizontal gridlines;
  - 1–2 annotations per chart;
  - a methods and limitations box at the end.
- **Fonts:** Source Serif 4 (body), Newsreader (headlines), Inter (labels). All are free Google Fonts.
- **Colours:** orange = rise or harm, blue = fall. These two are safe for colour-blind readers, and the text always says up or down too.
- **Phones:** built for 375px-wide screens. Charts switch to a 4:3 shape with fewer ticks, annotations move under the chart, and buttons are at least 44px tall.
- **Accessibility:** keyboard controls, a one-sentence summary for every chart (for screen readers), a "View the data" table under every chart, and animation turned off for people who ask their device for reduced motion.
- **Dark mode:** follows the device setting.
- **Verified:** 0 JavaScript errors, 11 of 11 charts render, 102 of 102 filled numbers appear, and no sideways scrolling at 375px. Checked in light and dark mode.

**Interaction, and why each one exists:**
- *Orient:* the chapter bar and progress line.
- *Compare:* counts vs per-person toggles; All road users vs Cyclists.
- *Personalise:* the "find yourself" picker.
- *Drill down:* click a heatmap cell to see its trend.
- *Inspect:* tooltips and data tables.

Every chart still tells its story without being touched. The default view is the headline.

**Backup of the old (Phase 1) site:** `CLAUDE_CONTEXT/backups/website_phase1_2026-11-23.tar.gz`.

---

## 9. The presentations and submissions

| What | Where | Notes |
|---|---|---|
| Stand Up 1 pitch deck (16 slides) | `presentation/beyond_the_road_toll.pdf` | Audience, research questions, the first two findings, pipeline, caveats |
| **Stand Up 1 submission folder** (ungraded) | `~/Desktop/COS30045_StandUp1_Submission/` (+ `.zip`) | Pitch PDF, portable KNIME v1, original BITRE files, README |
| Week 11 deck v1 (11 slides, fallback) | `presentation/week11/week11_deck.pdf` | Design checkpoint: the two claims, visualisation, interaction, website design, prototype, coding plan |
| **Week 11 deck v2 (24 slides)** | `presentation/week11_v2/week11_v2_deck.pdf` | Adds chapters 3 and 4, honesty corrections, newspaper redesign, KNIME v2, code slides, screenshot appendix |
| Cue cards for v2 | `presentation/week11_v2/CUE_CARDS.md` | Per slide: the point, the numbers, a likely question. No scripts. |
| Week 11 design write-ups | `report/DESIGN_SECTIONS_DRAFT.md`, `report/CODING_PLAN.md`, `report/STANDUP2_PACK.pdf` | Drafts for the final report |
| Q&A bank | `CLAUDE_CONTEXT/QA_BANK.md` | 16 short answers |

**Slide 2** of the Week 11 decks says "Stand Up 1 was the *what*. Today is the *how*." That wording is true whatever was shown at Stand Up 1.

---

## 10. The screenshot record

`report/figures/screenshots/` (see `INDEX.md` there):
- `web/`: **66** images. The site at 1280px and 375px, light and dark, every chart and its alternative views, plus two full-page captures.
- `code/`: **10** syntax-highlighted code excerpts (cleaning, Phase 2 analysis, data sync, chart modules, design tokens, a KNIME node).
- `knime/`: the workflow diagram.
- `eda/`: **16** exploratory charts.

Useful as evidence for the design-process and data-processing sections of the final report.

---

## 11. Honesty: corrections we made and things not verified

**Headlines we softened or corrected because the data didn't fully support them:**
- "Tripled" became **"more than doubled"** (Chapter 2). Only the noisy single-year comparison gave ×3.
- "When the roads emptied" was **dropped** (Chapter 4). There's no traffic-volume data.
- We do **not** say older pedestrians are "more likely to be hit". Their admission rate didn't rise; the outcome is what got worse.
- Old figures that mixed in incomplete years were revised:
  - June 2020 cyclists is 682 (not 683);
  - train collisions are 57.2 per 1,000 (not 48.7);
  - truck or bus collisions are 20.4 (not 17.3).
- The 2020 cycling trend result shows both trend fits (+662, inside normal variation, with the 2011–19 fit; +973, outside it, with the 2015–19 fit) rather than picking the more dramatic one.

**Not verified, so say so if asked:**
- **Newspaper design research:** most news sites (Guardian, FT, SMH, Le Monde, Zeit, NZZ and others) block automated tools. Only ABC News, The Conversation and the BBC's public chart-style guide were actually read, as text only. The rest of `report/NEWS_DESIGN_RESEARCH.md` is labelled "general knowledge". To make it solid, open 3 or 4 real data articles yourself and record what you see (checklist in section 5 of that report).
- **First Nations data:** the tables don't reconcile, so there's no chapter yet.
- **Usability:** not tested with real people yet.

---

## 12. What is still to do

1. **Confirm the licence, then reprint the PDFs.** Team names are now "Shu" everywhere; the presenter-name and GitHub-URL placeholders were removed rather than filled. Confirm the BITRE licence version, then reprint the PDFs.
2. **Usability evaluation**, required by the brief:
   - think-aloud sessions with 5–6 people like Sam;
   - tasks such as "find how injuries changed for your age and road-user type" and "which group stays longest in hospital?";
   - measure task success, time on task and a SUS score;
   - fix what fails and document it.
3. **Deploy to Mercury.** Copy the whole `website/` folder as is; all paths are relative.
4. **Design-process write-up** for the final report. Start from `report/DESIGN_SECTIONS_DRAFT.md`, `report/STORYBOARD.md` and the screenshots.
5. **Git.** Nothing is committed yet; the branch is `test/permission-check` and there's no `.gitignore`. Commit to a proper branch and push to GitHub.
6. Optional: verify the newspaper research by hand; open KNIME v2 in the app once; fix the old figures still in `CLAUDE_CONTEXT/TASKS_1-3_DRAFT.md`.
7. Later: Chapter 5 (equity), only after the First Nations totals are explained.

---

## 13. Where everything is (file map)

```
COS30045A3-Shu-Group/
├── requirement.md                  the assignment brief
├── PROJECT_EXPLAINED.md            this file
├── Datas/                          BITRE original data (3 workbooks + dictionary)
├── data/
│   ├── clean/                      every processed CSV (ideas 1–4, state, First Nations, supplementary)
│   └── supplementary/SOURCES.md    outside data sources and licences
├── processing/
│   ├── clean_data.py               main cleaning + validation (Phase 1)
│   ├── supplementary_data.py       ABS population + road deaths
│   ├── phase2_ideas.py             Chapters 3 & 4 analysis
│   ├── sync_website_data.sh        copies CSVs into website/data
│   ├── EDA_REPORT.md / EDA_PHASE2.md   exploration reports
│   ├── phase2_key_numbers.csv      100 quotable numbers with sources
│   ├── KNIME_MANUAL.md / KNIME_WORKFLOW_GUIDE.md
│   └── knime/                      .knwf files, v2 validation, build/render scripts
├── BeyondTheRoadToll_DataPrep/     KNIME v1 workflow folder
├── BeyondTheRoadToll_DataPrep_v2/  KNIME v2 workflow folder (portable)
├── website/                        the D3 data story (index.html, css/, js/, data/)
├── presentation/
│   ├── beyond_the_road_toll.pdf    Stand Up 1 pitch
│   ├── week11/                     Week 11 deck v1 (fallback)
│   └── week11_v2/                  Week 11 deck v2 + CUE_CARDS.md
├── report/
│   ├── STORYBOARD.md               the four-chapter story with all copy
│   ├── NEWS_DESIGN_RESEARCH.md     newspaper design patterns (partly verified)
│   ├── DESIGN_SECTIONS_DRAFT.md, CODING_PLAN.md, STANDUP2_PACK.pdf
│   └── figures/                    screenshots/, knime/, standup2/
└── CLAUDE_CONTEXT/                 working notes for AI assistants
    ├── HANDOFF.md                  status log: read this first when taking over
    ├── PHASE2_PLAN.md, QA_BANK.md, FOCUS_2_IDEAS.md, TASKS_1-3_DRAFT.md
    └── backups/                    Phase 1 website backup
```

---

## 14. How to rerun things

**Python (pandas isn't installed system-wide):**
```
python3 -m venv .venv && .venv/bin/pip install -r processing/requirements.txt
.venv/bin/python processing/clean_data.py
.venv/bin/python processing/supplementary_data.py
.venv/bin/python processing/phase2_ideas.py
sh processing/sync_website_data.sh
```

**Website:** `python3 -m http.server 8765 --directory website`, then open `http://localhost:8765/`.

**KNIME, in the app:** File → Import KNIME Workflow → choose `processing/knime/BeyondTheRoadToll_DataPrep_v2.knwf` → Execute all.

**KNIME, headless** (no window): see `processing/KNIME_MANUAL.md`. It uses `/Applications/KNIME 5.5.1.app/Contents/MacOS/knime -application org.knime.product.KNIME_BATCH_APPLICATION ...`

**Reprint a deck PDF:**
```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --print-to-pdf=<out>.pdf "file://<path>/index.html"
```

---

## 15. Glossary

| Term | Meaning |
|---|---|
| **BITRE** | Bureau of Infrastructure and Transport Research Economics, the government source of the data |
| **ABS** | Australian Bureau of Statistics, the source of the population figures |
| **Hospitalisation / admission** | One person admitted to hospital after a road crash |
| **Died in care / in-hospital death** | Died in hospital within 30 days of admission |
| **Bed days** | Total days spent in hospital; a measure of how serious and costly injuries are |
| **Per 100,000 / per 1,000** | A rate: divides by population (or by admissions) so groups of different sizes can be compared |
| **Indexed (2011 = 100)** | Every series is rescaled so 2011 equals 100; 116 means 16% higher than 2011 |
| **3-year average** | The average of three years, to smooth out one-off highs or lows |
| **Series break** | A point where the counting method changed, so before and after aren't fully comparable |
| **Counterparty** | What the injured person collided with (car, truck, train, fixed object) |
| **Exposure** | How much people travel (km, trips); not in this data |
| **95% interval / prediction band** | The range we'd expect a value to fall in by normal chance; outside it means unusual |
| **Persona** | An imagined typical reader (Sam) used to guide design decisions |
| **D3** | A JavaScript library for building custom interactive charts |
| **KNIME** | A drag-and-drop data-processing tool; `.knwf` is its zipped workflow file |
| **Node** | One step in a KNIME workflow |
| **Headless** | Running a program (Chrome, KNIME) with no window, from the command line |
| **EDA** | Exploratory data analysis: looking through the data for patterns before deciding the story |
| **Heatmap** | A grid where colour shows a value |
| **Diverging bars** | Bars going left for decreases and right for increases from a zero line |
| **Unit chart** | A chart where each dot or icon is one person |
| **Think-aloud / SUS** | Usability methods: users talk while doing tasks; SUS is a 10-question usability score |
| **Mercury** | Swinburne's web server where the site will be hosted |

---

## 16. Likely questions and short answers

- **"Did you account for population?"** Yes. Chapters 1 and 2 have per-person views, and the older-cyclist finding survives them: +78% and +92%.
- **"Isn't the older-cyclist rise just ageing?"** Partly. The 65–74 population grew 33%, but their cyclist injuries grew 138%.
- **"Could more cycling injuries just mean more cyclists?"** Probably, yes. There's no exposure data, and we say so on the page.
- **"Why do pedestrians come out worst?"** No protection, and older pedestrians are frailer. The same impact does more harm. Being hit by a truck or bus is the worst case.
- **"Why not show deaths in 2020–21?"** The death records for those years are incomplete; 2021 shows zero.
- **"Why stop bed days before 2016?"** The counting method changed in July 2015.
- **"Was the 2020 cycling rise really lockdown?"** The monthly pattern after March is unusual: every month beat the previous five years. The annual figure is partly the existing upward trend. More riders is the likely cause, but we can't prove it.
- **"How is this different from BITRE's Power BI dashboard?"** Theirs is a tool for analysts to explore every combination. Ours is a story for the public, with four argued findings, built-in caveats and per-person rates.
- **"Why no First Nations chapter?"** Those tables don't add up to the national totals by more than suppression explains. We won't publish until we understand why.
- **"Why KNIME as well as Python?"** It's an independent check. Two tools, same answers: 59 of 59.
- **"How do you know the numbers are right?"** They match BITRE's own tables, 13 of 13 Phase 2 reconciliation checks pass, the KNIME cross-check is 59 of 59, and the site fills its text from the same CSVs as the charts.
- **"Did you test it with users?"** Not yet. It's the next step: think-aloud with 5–6 Sam-like readers, measuring task success, time and SUS.
