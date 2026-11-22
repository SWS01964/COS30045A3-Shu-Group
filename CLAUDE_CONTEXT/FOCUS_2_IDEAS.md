# Focus: two ideas, two headlines, supporting charts (Sam's view)

*Draft v1 · 17 Nov 2026. Builds on TASKS_1-3_DRAFT.md (persona "Sam", 52: drives, took up weekend cycling, parents in their late 70s who drive and walk).*

Sam brings two questions:
1. **"Is it actually getting safer out there?"** They want the answer in about 5 seconds.
2. **"Is that true for people like me, and for my parents?"** They want to find themselves in the data.

Each idea below answers one of these.

---

## Idea 1 — The hidden road toll

### Headline
**"The road toll is falling. The injury toll isn't."**
Subhead: *39,505 Australians were hospitalised after road crashes in 2021, about 108 a day. That is roughly 35 for every person killed (verify).*

### Chart 1A (main): indexed line chart, 2011 = 100
```
 index
 120 |                                   ___---- Hospitalised (+16%)
 110 |                  ___-------------/   \_/
 100 |=====------------                      ---- Population (+15%, dashed, verify)
  90 |      ~~~~~~~~~~~~~~~~~~~___~~~~~~~~~~~~~~~ Road deaths (-12%, verify)
     +----+----+----+----+----+----+----+----+----+----+
     2011                     [NSW counting change 2017 -> grey band]   2021
```
- **Why this form:** deaths (about 1,100) and hospitalisations (about 39,000) can't share a raw axis. Indexing both to 2011 makes the *gap between the lines* the story.
- **Annotations:**
  - "2020: lockdowns emptied the roads"
  - grey band from 2017: "NSW stopped counting ED-only cases, so the true rise is likely larger"
- **Interaction:**
  - a toggle between **Counts** and **Per 100,000 people**, which answers the brief's counts-vs-rates caveat directly
  - hover shows the actual numbers for each year
- **Data:** hospitalisations from BITRE (primary); road deaths from the BITRE road deaths database and population from ABS ERP (supplementary, both **verify**).

### Chart 1B (optional lede graphic): "For every 1 death, 35 hospitalised"
A unit chart: one dark dot and 35 light dots, with a single sentence beside it. It is cheap to build, memorable, and suits a newspaper opening.

---

## Idea 2 — Road injury is getting older (and more serious)

### Headline
**"Older riders, longer stays: cycling injuries have more than doubled among over-65s."**
*(Revised from "tripled". The single-year comparison 2011→2021 shows +212% / +228%, but 3-year averages show +138% / +142%. "More than doubled" is true under both methods.)*
Subhead: *The fastest-growing group in hospital isn't young drivers. It's Australians over 40 on two wheels, and the older you are, the longer you stay.*

### Chart 2A (main, "find yourself"): heatmap of % change 2011→2021, road user × age
```
                 0-7   8-16  17-25  26-39  40-64  65-74   75+
Car driver        -    -10   +12    +28    +16    +38    +42
Car passenger    +5     -5   -17     -3     -4     -9     +1
Motorcyclist    +33    +21    -1    +14    +23   +150   +167
Pedal cyclist    +6    +45    +9    +17    +68   +212   +228   <- hottest cells
Pedestrian      -25    -24   -36     -3     -2     +3    -22
```
- **Encoding:** a diverging scale (falls in blue, rises in orange). The 65+ two-wheeler cells stand out without explanation.
- **Values:** the table above shows single-year values. The chart's primary values are **3-year averages, 2011–13 vs 2019–21**, which are robust to single-year noise; the single-year figures go in the tooltip. 3-year values: cyclists 40–64 +45%, 65–74 +138%, 75+ +142%; motorcyclists 65–74 +119%, 75+ +105%. Source file: `data/clean/idea2_heatmap_change.csv`.
- **Interaction:**
  - "I travel by ___, I'm aged ___" pickers highlight the reader's own cell. Sam picks *cyclist, 40–64* (+68%), then *car driver, 75+* (+42%) for their parents.
  - clicking a cell opens a small 2011–2021 trend line for that group, with the actual counts
- **Caveat on the chart:**
  - These are counts. Australia's 65+ population grew roughly 40% over the decade (verify), so a tripling far outpaces ageing alone.
  - Cycling participation (exposure) is not in the data.
- **Small counts:** 0–7 car drivers are blank. Suppress or grey out any cell with fewer than about 30 cases in either year.

### Chart 2B (supporting): fewer cases, much longer stays (two aligned panels sharing the age axis)
```
Hospitalisations 2016-21   |  Avg days in hospital 2016-21
 0-7   ##                  |  3.1  .
 8-16  ######              |  2.8  .
17-25  ####################|  4.2  ..
26-39  ######################  4.3  ..
40-64  ##############################  5.5  ...
65-74  #######             |  8.0  ......
75+    ######              | 11.1  ..........   <- 2.6x a 30-something
```
- **Why two panels and not a dual axis:** dual-axis charts mislead. Two aligned bar panels sharing the age labels are honest and easy to read on a phone.
- **Annotation:** "Over-75s die in hospital at 8× the rate of 26–39-year-olds (28 vs 3.5 per 1,000 cases, 2011–19)."
- **Caveats:**
  - bed days are 2016–21 only (counting method changed in July 2015)
  - mortality is 2011–19 only (2020–21 died-in-care data incomplete)

---

## Why these two, from Sam's seat
- **Idea 1** answers the question Sam didn't know to ask: the "safer roads" they hear about only counts deaths.
- **Idea 2** turns the national story personal. Sam sees their own group (40–64 cyclist, +68%) and their parents' group (75+: longest stays, highest risk of dying in hospital).
- **Together they form a two-step arc:** *the problem is bigger than you think → and it's moving toward people like you.*
- **All main charts use the primary BITRE dataset.** Only Chart 1A's deaths and population lines need supplementary data.
- **Fallback if that data can't be sourced in time:** show the hospitalisations line alone, and put the "deaths fell" contrast in the text.

## Scope: Phase 1 of a larger story
These two ideas are the **first deliverable, not the whole story.** They will be expanded later with the remaining research questions from TASKS_1-3_DRAFT.md:
- **RQ3 (remaining half):** pedestrians are the fewest but most severely hurt (21.8 deaths per 1,000 cases, vs 5.8 for car drivers); counterparties such as trains and heavy vehicles
- **RQ4:** the 2020 lockdown natural experiment (cyclist injuries up while all other road users fell)
- **RQ5:** equity (First Nations people, remoteness)

Design implication: build each idea as a self-contained chapter, sharing one data-processing pipeline, palette, caveat style and the reader's "I'm a ___ aged ___" selection. That way later chapters can be added without reworking the first two.

## Build order suggestion (D3)
1. 2A heatmap: primary data only, it has the most interaction, and it showcases the "find yourself" idea
2. 2B aligned panels
3. 1A indexed lines, once the supplementary data is verified
4. 1B unit chart
