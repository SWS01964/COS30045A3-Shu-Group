# Beyond the Road Toll — Pre-design Brief (Tasks 1–3)

*COS30045 Assignment 3 · Draft v1 · 17 Nov 2026 · Prepared in the style of a newspaper data-visualisation desk*

All figures are derived from the BITRE hospitalised-injury data (2011–2021, "Road vehicle traffic accidents" only). Figures marked **(verify)** rely on supplementary sources (ABS population, BITRE road deaths) and must be confirmed before publication.

---

## Working headline and premise

> **"Fewer Australians are dying on our roads. The number ending up in hospital hasn't budged."**

The road toll is the number that makes the news, but it counts only deaths. In 2021, **39,505 Australians were hospitalised after road crashes, about 108 a day**, and roughly **35 for every road death (verify)**. Over the decade, hospitalisations rose **16%** (34,033 → 39,505). That is roughly in step with population growth, so on a per-person basis there has been **no improvement in ten years (verify)**, while road deaths per person fell. Beneath that flat national line, the people being hurt changed: **who** is injured, **how badly**, and **where they live**.

---

## Task 1 — Research questions

Five questions are proposed. **RQ1–RQ3 are the core** (they form one narrative arc on their own). RQ4 and RQ5 are strong optional chapters if scope allows.

### RQ1 · Is Australia's road safety progress real once we count the injured, not just the dead? *(core: the hook)*
- **Why it matters:** public debate and policy targets centre on fatalities. If hospitalisations are flat per capita while deaths fall, the "progress" story is incomplete.
- **Early evidence:** +16% hospitalisations 2011–2021; peak 39,866 in 2019; dip in 2020 (37,966). The rise happened **despite** Victoria (2012) and NSW (2017) narrowing what counts as an admission, so the true increase is probably understated.
- **Data:** national `raw` (year, month); supplementary ABS population and BITRE road deaths.
- **Visual:** indexed line chart (2011 = 100) comparing hospitalisations, road deaths and population; toggle between counts and per-100k rates; grey bands marking the series breaks.
- **Caveat to state:** counts vs rates; series breaks; no exposure (distance travelled) data.

### RQ2 · Who is the new face of road injury? How has the mix of road users and ages changed? *(core)*
- **Why it matters:** safety campaigns are built around stereotypes (young male drivers). The data shows the growth is somewhere else.
- **Early evidence:**
  - Pedal cyclists **+51%** (5,391 → 8,163), close to overtaking motorcyclists (8,883).
  - Cyclist hospitalisations aged 65–74 **roughly tripled** (243 → 749); 75+ also about ×3 (90 → 285); 40–64 up about 68%.
  - Motorcyclists aged 65–74 up about ×2.5 (162 → 402).
  - Pedestrians **−15%**, car passengers −7%.
  - Motorcyclists are 90% male; car passengers are 60% female.
- **Data:** national `raw` (road user × age group × sex × year).
- **Visual:** slope chart or small multiples by road user (2011 vs 2021); age × road-user heatmap of percentage change; the reader selects a road user and their age bands highlight.
- **Caveat to state:** an ageing population and more people cycling (exposure) could explain part of the rise. These are counts, not risk per person or per trip.

### RQ3 · Which crashes do the most damage? Volume vs severity *(core)*
- **Why it matters:** the most *frequent* injuries are not the most *serious*. Ranking by count alone misdirects attention and resources.
- **Early evidence (2016–2021):**
  - Cyclists are **19%** of cases but only **11%** of hospital bed days.
  - Pedestrians are **6.6%** of cases but **13.1%** of bed days, about twice their share.
  - Pedestrians die in care at about **4×** the rate of car drivers (19 vs 5 per 1,000 cases).
  - Patients aged 75+ stay about **9.8 days** on average.
  - Crashes involving trains and heavy vehicles are the most severe per case.
- **Data:** national `raw` (Count of cases, Bed days, Died_cases by road user / age / counterparty).
- **Visual:** paired "two rankings" bar or bump chart (share of cases vs share of bed days); a bubble scatter of volume × average stay × mortality.
- **Caveat to state:** bed-day counting changed in July 2015, so only 2016–21 is compared. Died-in-care data for 2020–21 is incomplete and is excluded.

### RQ4 · What did the 2020 lockdowns reveal? *(optional: a natural experiment)*
- **Early evidence:**
  - April 2020 hospitalisations fell **32%** vs April 2019 (2,369 vs 3,507).
  - Over the same year, cyclist hospitalisations **rose 14%**; June 2020 was +51% on June 2019.
  - Pedestrians fell 22%; car drivers fell 9%.
- **Visual:** monthly lines for 2019, 2020 and 2021, faceted by road user, annotated with lockdown periods.
- **Caveat:** lockdown timing differed by state (Victoria's was longest), and state data is only 6-monthly.

### RQ5 · Are Australia's roads equally safe for everyone? Remoteness and First Nations *(optional: equity)*
- **Early evidence:**
  - First Nations hospitalisations **+90%** (1,167 → 2,220) vs **+15%** for non-Indigenous Australians.
  - First Nations people are 5.6% of 2021 hospitalisations, against about 3.8% of the population (verify).
  - Pedestrians are 12% of First Nations cases vs 7% for non-Indigenous Australians.
  - Regional residents stay longer in hospital than city residents (5.5 vs 4.6 days).
- **Visual:** dumbbell / dot plots comparing groups; a ribbon chart of remoteness composition.
- **Caveat:** better Indigenous identification in hospital records may inflate the trend. Small counts are suppressed ("n.p."). Location is the patient's **usual residence**, not the crash site. State totals must not be shown as a raw-count choropleth.

---

## Task 2 — Perspective and target audience

### Recommendation: the everyday Australian road user, reading the news on their phone
We tell the story **from the perspective of ordinary Australians who drive, ride and walk**, and of their families. These readers see "road toll" headlines but rarely see the much larger number of people who are injured.

**Primary persona: "Sam", 52, outer-suburban Brisbane**
- Drives to work, took up weekend cycling during 2020, and has parents in their late 70s who still drive and walk to the shops.
- Reads news on a phone in short sessions. Data-curious but not a data specialist.
- **Questions Sam brings:** *Is it getting safer out there? Are people like me, or my parents, more at risk than I think? What should I actually take away?*

**Secondary audience: informed decision-makers who read the same outlet**
Local councillors, road-safety advocates and health planners. They read the story and then use the structured explorer and the methods notes to check the evidence for themselves.

### Why this perspective
1. **It fits the data's dimensions.** Road user, age, sex and where you live are exactly the attributes a reader uses to "find themselves". The data supports personal relevance; it does not support crash-location or causal analysis.
2. **It meets the brief's dual requirement.** The narrative covers explanatory communication, and the "find your group" layer covers structured exploration.
3. **It differs from BITRE's Power BI tool,** which serves analysts. That avoids the replication the brief discourages.
4. **It suits a newspaper.** Public-interest framing ("the hidden road toll") and personal stakes drive engagement.

### Alternatives considered
- **Policymakers as the primary audience:** the dataset lacks crash location, cause and exposure, which limits actionable policy insight. Kept as the secondary audience.
- **Cyclists only:** compelling (RQ2, RQ4) but too narrow; it discards most of the data.
- **Hospital planners (bed days):** a valid angle, but it suits a health-sector report more than a news story. Its insight is absorbed into RQ3.

---

## Task 3 — What we provide to that audience

1. **A clear headline finding up front.** One sentence and one number, for example *"108 Australians a day are hospitalised after road crashes, and that rate hasn't fallen in a decade."*
2. **A scrollytelling data story in four or five short chapters (RQ1 → RQ5).** Each chapter has one chart, one annotated takeaway sentence and plain-language labels, with no jargon such as "separations" or "ALOS".
3. **A structured "Find your road" explorer** (not an open-ended dashboard). The reader picks a road user type, age group, sex and where they live, and sees:
   - their group's 2011–2021 trend against the national line
   - how severe injuries in their group typically are (days in hospital)
   - how their group ranks by volume vs by severity

   Choices are limited to meaningful combinations, and small counts are suppressed or flagged.
4. **Honest context, built into the visuals:**
   - a short "counts vs rates" explainer, with a per-100k toggle where ABS population data allows
   - grey bands marking the Vic 2012 and NSW 2017 series breaks
   - notes on the bed-day method change and the incomplete died-in-care data
   - the First Nations identification caveat
   - no misleading raw-count maps
5. **"What this means" takeaways** grounded in the evidence: older cyclists and riders are the fastest-growing group; pedestrians are fewest but most severely hurt; deaths alone understate the problem. Each links to official road-safety resources. We avoid giving advice the data cannot support.
6. **A mobile-first, accessible design:**
   - colour-blind-safe palette, with no reliance on colour alone
   - large touch targets
   - a text summary and a data table behind every chart
   - fast loading on the D3 build
7. **Transparency for the secondary audience.** A methods and sources page covering data processing steps, definitions, caveats and a downloadable processed dataset.
8. **Evaluation tied to the persona (for the assignment's usability component).** Task-based think-aloud tests with five or six participants who match "Sam". Example tasks: *"Find how injuries for your age group and road-user type changed since 2011"* and *"Which group spends longest in hospital?"* Record success rate, time on task and SUS score.

---

### Open items before finalising
- Verify the ABS population and BITRE road-death figures (RQ1, RQ5) and add them as supplementary datasets in the methods notes.
- Recompute died-in-care rates using 2011–2019 only.
- Agree with your teammate whether to cover three or five chapters, given the five-week timeline.
