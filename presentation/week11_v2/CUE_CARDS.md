# Cue cards: Week 11 v2 deck (Stand Up 2, four chapters)

Not a script. Say it in your own words. Each card: the one point, the numbers worth saying aloud, and a likely question with a short answer. All figures match `processing/phase2_key_numbers.csv` and `report/STORYBOARD.md`. Slide numbers match `index.html` / `week11_v2_deck.pdf` (24 slides; 1-19 are the talk, 20 is backup, 21-24 are the appendix).

Fallback: the v1 deck is untouched in `presentation/week11/`.

---

**1. Title**
- Point: a four-chapter data story on hospitalised road-crash injuries, 2011-2021.
- Say: your name and team (Shu).
- Q: Why "beyond the road toll"? A: Deaths get the attention; hospital admissions are the bigger, quieter burden.

**2. Where we are**
- Point: Stand Up 1 was the what; today is the how; the story grew from two chapters to four.
- Numbers: 11 charts; 86,140 traffic rows; 13/13 and 59/59 checks.
- Q: What is new since last time? A: Chapter 3 (severity, pedestrians) and Chapter 4 (the lockdown test), plus a closing section.

**3. Sam and the map**
- Point: one reader, three questions, four chapters mapped to them.
- Numbers: Sam is 52; parents in their late seventies; started riding in 2020.
- Q: Why a persona? A: It decides what we cut: if Sam would not ask it, it is not in the story.

**4. Chapter 1**
- Point: deaths fell, injuries did not.
- Numbers: 39,505 admitted in 2021 (about 108 a day); 35 admitted per death (27 in 2011); deaths -11.5%, admissions +16%.
- Q: Isn't that just population growth? A: Population grew about 15%; the per-person rate barely moved (about 152 to 154 per 100,000), so it is flat, not falling.

**5. Chapter 2**
- Point: older riders are the growing group.
- Numbers: cyclists 65-74 +138%, 75+ +142% (3-year averages); per person +78% and +92%.
- Q: Isn't this ageing? A: Partly; the population in those ages grew by a third or less, so even per person the rise is large.

**6. Chapter 3, who dies in hospital (NEW)**
- Point: counting admissions hides the worst outcomes; pedestrians are the exception.
- Numbers: 7.3% of admissions but 26.4% of in-hospital deaths (538 of 2,041, 2011-19); 22 per 1,000 for pedestrians vs 6 for drivers, 2 for cyclists.
- Q: Are pedestrians more at risk per trip? A: We cannot say. These are counts after admission; there is no data on how far people walk.
- Q: Why only deaths in hospital? A: Most road deaths happen at the scene and are not in this data. Also 2020-21 death records are incomplete, so we use 2011-19.

**7. Chapter 3, older pedestrians (NEW)**
- Point: older pedestrians are hurt less often, but far worse.
- Numbers: 61 in 1,000 aged 75+ died in hospital (28 for all road users that age; about 1 in 16); 19-day average stay vs 11; 52% of pedestrian in-hospital deaths are 65+, but 23% of injured pedestrians.
- Q: So are older pedestrians being hit more? A: No. Their per-person admission rate fell (75+: 25.2 to 19.9 per 100,000, 2011-19), partly because NSW changed counting in 2017. What changes is the outcome.
- Q: Are these rates solid? A: The whiskers are 95% intervals; cells under 100 cases or 10 deaths are withheld.

**8. Chapter 4, the trough (NEW)**
- Point: April 2020 was the lowest month in the 11 years of data.
- Numbers: 2,357 admissions; -32% vs April 2019 (3,488); pedestrians -60%, passengers -53%, drivers -43%, motorcyclists -38%.
- Q: So the roads emptied? A: We do not say that; there is no traffic-volume series. We say "when Australia locked down".
- Q: What about state differences? A: Restrictions differed (Victoria's was longest); national monthly data cannot be split by state.

**9. Chapter 4, the exception (NEW)**
- Point: cyclists were the only group that rose in April 2020.
- Numbers: +16% in April; June 682 vs 453; year 8,332 vs 7,302 (+14%), while pedestrians -22% and drivers -9%.
- Detail if asked: cyclists aged 8-16 went from 1,041 to 1,348 (+29.5%).
- Q: Why did cyclists rise? A: Likely more riders; this data cannot prove it because there are no trip or kilometre counts.

**10. Chapter 4, the trend test (NEW)**
- Point: cycling injuries were already rising; 2020 added to it.
- Numbers: trend predicts 7,670; actual 8,332; +662, inside the 95% band for the year; all 9 months April-December above every 2015-19 year.
- Q: So was it lockdown or not? A: The full-year jump is within normal variation on its own; the monthly pattern is the stronger signal. A trend fitted to 2015-19 only gives +973, outside its band, so we say "probably a real lift, size uncertain".

**11. Editorial honesty**
- Point: we changed three claims after checking the data.
- Numbers: train collisions 48.7 revised to 57.2 per 1,000 (17 deaths, 297 cases).
- Q: Why show corrections? A: Because every number is traceable; being open about changes is part of the credibility.
- Q: Biggest remaining caveat? A: Counts are not rates; no exposure data (kilometres, trips).

**12. Visualisation design**
- Point: the title states the finding; the chart supports it.
- Say: direct labels, one orange highlight on grey, a notes line under every chart.
- Q: Why not a pie or dual axis? A: Part-to-whole is not the question; dual axes mislead.

**13. Interaction design**
- Point: few controls, each answers one question; nothing is hover-only.
- Say: steppers (3A, 4A), toggles (3B, counts vs per person), find-yourself, keyboard and touch, reduced motion.
- Q: Why a stepper instead of three charts? A: Same bars, three measures: the change is the story, and it fits a phone.

**14. Website design**
- Point: it reads like a newspaper page, not a dashboard.
- Say: masthead, key-points boxes, pull stats, sticky chapter bar, methods box, dark mode, works at 375 px.
- Q: Why newspaper style? A: The brief asks for a narrative; Sam reads on a phone in short sittings.

**15. Data pipeline**
- Point: one traceable path from the BITRE workbook to the page.
- Numbers: 117,919 raw rows; 86,140 traffic rows; 16 CSVs; 13/13 reconciliation PASS; 100 quotable numbers; 102/102 prose numbers filled.
- Q: How do you know the prose matches the charts? A: The prose numbers are filled from the same CSVs the charts read.

**16. KNIME v2**
- Point: a second tool recomputes the headline numbers from the raw workbook.
- Numbers: 28 nodes; 59/59 checks match Python.
- Q: Does KNIME feed the site? A: No. It is an independent check on the Python pipeline.

**17. Code: Python**
- Point: the rule "no rate without enough cases" lives in the code.
- Numbers: 100 cases and 10 deaths minimum; blank `_publish` columns.
- Q: What if a rate is flagged? A: The chart never reads the raw column, only the `_publish` one.

**18. Code: D3**
- Point: one small module per chart; switching view just redraws.
- Numbers: the y-axis rescales (2,200 to 3,800 vs 350 to 900) and the page says so.
- Q: Why is the axis different between views? A: Cyclists are a much smaller group; the note under the switch states the change.

**19. What's next**
- Point: be honest about what is not done.
- Say: usability testing (think-aloud, task success, SUS) not yet run; Mercury; names; Chapter 5 deferred.
- Q: Why defer equity? A: The First Nations tables do not reconcile with national totals by more than suppressed cells explain; we will not publish what we cannot reconcile.
- Ask the room: does the Chapter 3 headline read as trustworthy?

**20. Backup: sources and methods** (Q&A only)
- Point: sources and rules in one place.
- Numbers: deaths 2011-19; bed days and stays 2016-21; Vic 2012 and NSW 2017 counting changes.
- Q: Why 2016-21 for stays? A: The bed-day method changed on 1 July 2015.

**21-24. Appendix** (Q&A only)
- 21: chart states (deaths step, stay toggle, dark mode, trend band).
- 22: phone screenshots at 375 px, light and dark.
- 23: Phase 2 exploratory figures.
- 24: more code excerpts (trend test, stepper, data loading, tokens).
- Full image list: `report/figures/screenshots/INDEX.md`.
