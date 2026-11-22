# Presenter notes — explaining the idea to the lecturer

Deck: `presentation/beyond_the_road_toll.pdf`. Slides are referred to by title, because numbering may shift slightly.

## 60-second pitch
"Australia tracks its road toll closely, but the toll only counts deaths. Using BITRE's hospitalisation data, we show that the number of people **hospitalised** after crashes rose 16% over 2011–2021. That's 108 people a day, and 35 for every death. Per person, the death rate fell by almost a quarter, but the hospitalisation rate didn't move. Beneath that flat line, the people being hurt have changed. Cycling injuries among over-65s more than doubled, and older patients stay longer and are far more likely to die in hospital. We tell this as a two-chapter D3 data story for an everyday road user, 'Sam', with a 'find yourself' explorer and per-person toggles, so raw counts never mislead."

## Slide-by-slide talk track
- **Title.** Name the project and the dataset: BITRE hospitalised injuries, 2011–2021.
- **Hook (108 a day; 35 per death).** "Deaths get the headlines; hospitalisations are 35 times bigger and growing. In 2011 it was 27 per death."
- **Who we're telling it to (Sam).** "We chose an everyday road user, not analysts. The data's dimensions (road user, age, sex, where you live) are how a reader finds themselves. Sam's two questions drive our two chapters. Councillors and health planners are a secondary audience who use the explorer and the methods notes."
- **Research questions.** "Five questions. We're building two first, deliberately: a narrative, not a dashboard. The other three are Phase 2 chapters."
- **Idea 1 divider.** Read the headline.
- **Idea 1, counts chart.** "Everything is indexed to 2011 = 100, because deaths (about 1,100) and hospitalisations (about 39,000) can't share an axis. Hospitalisations +16%, population +15%, deaths −11.5%. The shaded area is NSW's 2017 counting change, which *lowers* counts, so the real rise is probably larger."
- **Idea 1, per person.** "This answers the brief's counts-vs-rates point directly. Per 100,000 people: hospitalisations 152 → 154 (flat), deaths 5.7 → 4.4 (−23%)."
- **Idea 2 divider.** Read the headline. Mention it was originally "tripled", and that we chose the conservative claim (below).
- **Heatmap.** "Change by road user and age, comparing 3-year averages (2011–13 vs 2019–21), so one odd year doesn't drive the story. Orange = rise, blue = fall. The colours use a log scale so halving and doubling look equally strong. The 65+ cyclists and motorcyclists stand out; pedestrian injuries mostly fell. On the website, readers pick their own group."
- **Counts vs per person (older cyclists).** "Is it just an ageing population? The 65–74 population grew 33%, but their cyclist injuries rose 138%. Per person that's still +78%, and +92% for 75+. So ageing explains only part of it."
- **Severity.** "Older people have fewer crashes but much worse outcomes. Over-75s stay 11.1 days, 2.6× as long as people aged 26–39, and die in hospital at 8× the rate (28 vs 3.5 per 1,000)."
- **Data pipeline.** "Everything is derived from the raw tabs, as the brief asks. 11 documented cleaning rules. National totals match BITRE's published tables exactly. ABS population and BITRE road deaths are added for context. The output is tidy CSVs feeding D3. The KNIME workflow mirrors the Python pipeline, with checkpoint values."
- **Caveats.** "We built the caveats into the charts, not just the footnotes": counts ≠ rates; Vic/NSW series breaks; the 2015 bed-day method change (so 2016–21 only); incomplete 2020–21 death data (so 2011–19); residence ≠ crash site; no exposure data.
- **The website.** Two chapters, 5 D3 charts, the explorer, toggles, mobile-first and accessible.
- **Next steps.** Usability testing (think-aloud with 5–6 Sam-like users; task success, time, SUS); Phase 2 chapters; Mercury deployment.
- **Sources.** BITRE, ABS (CC BY 4.0), ARDD (CC BY 3.0 AU).

## Likely lecturer questions and answers
1. **"Raw counts across groups can mislead. Did you account for population?"** Yes. Both chapters have a per-person toggle using ABS population, and the older-cyclist finding survives it (+78% / +92%).
2. **"Why 3-year averages, and why not say 'tripled'?"** Single-year endpoints are noisy: 2011 vs 2021 says ×3, 3-year averages say ×2.4. "More than doubled" is true either way, so we chose the claim we can defend.
3. **"How is this different from BITRE's Power BI dashboard?"** Theirs is an analyst tool for exploring every combination. Ours is a narrative for the public: two argued findings, a *structured* explorer, normalisation, and caveats built in.
4. **"Could more cycling injuries just mean more people cycling?"** Possibly. The data has no exposure measure, and we say so on the page. We adjust for population, not for kilometres ridden.
5. **"What about the data breaks?"** Victoria (2012) and NSW (2017) narrowed what counts as an admission. That lowers counts, so national rises are, if anything, understated. The charts shade those years.
6. **"Why bed days only from 2016 and deaths only to 2019?"** Bed-day counting changed in July 2015. Died-in-care data drops to 88 deaths in 2020 and 0 in 2021, which is clearly incomplete.
7. **"Where does KNIME come in?"** The Python script is the reproducible source of truth. The KNIME workflow reproduces it node by node, with checkpoint values that must match (in progress).
8. **"How will you evaluate usability?"** Task-based think-aloud with 5–6 participants matching the persona (for example: "find how injuries changed for your age group and travel mode"), measuring task success, time on task and SUS.
