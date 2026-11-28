# Storyboard v2: Beyond the Road Toll (five chapters)

Last updated 2026-11-27. Every number below comes from `data/processed/` (KNIME workflow `knime/BeyondTheRoadToll`, validated against an independent Python reference: `processing/VALIDATION.md`). Each figure, with its source file, filter and formula, is traced in `data/processed/KEY_NUMBERS.md`. If a figure here and a CSV disagree, the CSV wins and this file gets fixed.

---

## Headlines for sign-off

| # | Chapter | Headline | Standfirst (one sentence) | Key number(s) |
|---|---|---|---|---|
| 0 | Page top | **Beyond the road toll** | Fewer Australians are dying on the roads, but the number being seriously hurt has not fallen. | 39,505 admitted in 2021 against 1,130 road deaths: 35 admitted for every death |
| 1 | Ch1 The hidden road toll | **The road toll is falling. The injury toll isn't.** | Deaths are down 11.5% since 2011, admissions are up 16%, and per person the rate has barely moved. | 39,505 admitted in 2021 (about 108 a day); 152.3 to 153.8 per 100,000 |
| 2 | Ch2 Road injury is getting older | **Cycling injuries have more than doubled among over-65s.** | The group growing fastest among the injured is older riders. | Cyclists 65-74 +138%, 75+ +142% (3-year averages); per person +78% and +92% |
| 3 | Ch3 Not every crash is equal | **Pedestrians are 1 in 14 of the injured, but 1 in 4 of those who die in hospital** | Counting admissions treats a sprained wrist and a fractured skull the same; look at what happens after admission and a different road user comes to the top. | 7.3% of admissions, 26.4% of in-hospital deaths (2011-19); 61 deaths per 1,000 pedestrians aged 75+ |
| 4 | Ch4 The lockdown test | **In the month Australia locked down, crash admissions fell by a third. Cyclist admissions rose.** | In 2020 Australians travelled less, worked from home and bought bikes; hospital records show how that played out. | April 2020: 2,357 admissions, 32% fewer than April 2019; cyclists +16% in April; 9 of 9 months Apr-Dec above the 2015-19 maximum |
| 5 | Ch5 Are the roads equally safe for everyone? | **In 2011 First Nations Australians were hospitalised after road crashes at about the same rate as everyone else. By 2021 the rate was half as high again.** | Counts hide this because the population grew; per person the gap is clear, though better recording of Indigenous status may explain part of it. | 145 to 226 per 100,000 (+56%) against 149 to 149; counts 1,167 to 2,220 (+90%) against 31,997 to 36,755 (+15%) |

---

The reader is Sam: 52, lives in outer Brisbane, drives to work, started riding on weekends in 2020, and has parents in their late seventies who still walk to the shops. Sam reads on a phone, in short sittings, and wants four things answered:

1. Is it getting safer out there?
2. Are people like me, or my parents, more at risk than I think?
3. Are the roads equally safe for everyone?
4. What should I actually take away from this?

---

## Page top

**Kicker:** Road safety · Data investigation
**Headline:** Beyond the road toll
**Standfirst:** Fewer Australians are dying on the roads. The number being seriously hurt hasn't fallen. We went through a decade of hospital records to find out who is being hurt, and how badly.
**Byline/date:** By Shu · Published 23 November 2026
**Lede graphic:** unit chart: for every road death in 2021, 35 people were admitted to hospital.
- Data: `ch1_trend.csv` (2021 row: `hosp` 39,505, `road_deaths` 1,130, `hosp_per_death` 35.0).

## Chapter 1: The hidden road toll

Sam's question: *Is it getting safer?*
Headline: **The road toll is falling. The injury toll isn't.**
Key numbers: 39,505 admitted in 2021, about 108 a day. Road deaths down 11.5% and admissions up 16% since 2011. Per person, the hospitalisation rate barely moved (about 152 to 154 per 100,000).

**Chart 1A, main:** indexed lines (2011 = 100) for hospitalisations, road deaths and population, with a counts ↔ per-100,000 toggle and grey bands for the 2012 Victorian and 2017 NSW counting changes.
- Data: `ch1_trend.csv` (`hosp`, `road_deaths`, `population`, `hosp_per_100k`, `deaths_per_100k`, `series_note`).
- Title: *The road toll is falling. The injury toll isn't.*
- Notes line: "Hospitalisations are people discharged alive, as in BITRE Table 1. Victoria (2012) and NSW (2017) stopped counting emergency-only cases, which lowers later counts. Per-person rates use ABS population at 30 June."

## Chapter 2: Road injury is getting older

Sam's question: *Are people like me more at risk?*
Headline: **Cycling injuries have more than doubled among over-65s.**
Key numbers: cyclists 65-74 +138%, 75+ +142% (3-year averages, 2011-13 to 2019-21). Per person, +78% and +92%.

**Chart 2A, main:** heatmap, road user by age band, % change on 3-year averages; per-person toggle; "find yourself" pickers; click a cell for its 2011-21 line. Cells with an average under 30 a year are flagged as low counts.
- Data: `ch2_age_roaduser.csv` (`avg_2011_13`, `avg_2019_21`, `pct_change_3yr`, `rate_change_3yr`, `low_count`).
**Chart 2B, supporting:** aligned panels by age: admissions, average stay, died per 1,000, all road users.
- Data: `severity.csv` (`view` = age, `road_user` = All road users).

---

## Chapter 3: Not every crash is equal

Sam's question: *Are my parents more at risk than I think?*

**Headline:** Pedestrians are 1 in 14 of the injured, but 1 in 4 of those who die in hospital

**Standfirst:** Counting admissions treats a sprained wrist and a fractured skull the same. Look at what happens after admission and a different road user comes to the top of the list.

**What to know (key points box)**
- Pedestrians were 7.3% of road-crash admissions, but 26.4% of the people who died in hospital (2011-2019).
- Of every 1,000 pedestrians admitted, about 22 died in hospital. For car drivers it was about 6, and for cyclists about 2.
- For pedestrians aged 75 and over it was 61 in 1,000, and survivors stayed in hospital for an average of 19 days.

### Beat 3.1: Two rankings, two different answers
*Chart 3A, main: paired horizontal bars.* For each of the five main road users, one bar shows their share of people admitted and a second shows their share of hospital bed days (2016-2021). A third step adds share of in-hospital deaths (2011-2019).
- Data: `severity.csv` (`view` = age, `category` = All ages; columns `hosp_1621`, `beds_1621`, `died_1119`). Each share = the road user's row ÷ the All road users row, computed in D3.
- Encoding: grey bar = share of admissions, accent bar = the harm measure. Bars sorted by share of admissions, so the pedestrian jump stands out against the order.
- Interaction: a three-way stepper: **Admissions → Bed days → Deaths in hospital**. Default is Bed days. Labels are written on the bars; there is no legend.
- Annotation: next to pedestrians, "6.5% of admissions, 13.1% of bed days".
- Title (states the finding): *Pedestrians take up twice their share of hospital beds*
- Notes line: "Share of admissions and bed days, 2016-2021; deaths in hospital, 2011-2019. Admissions and bed days both count people who left hospital alive, so the two shares are like for like; the deaths step counts everyone admitted. Shares are of all road users, so the five bars do not sum to 100%. Bed days were counted differently before July 2015, and death records for 2020-21 are incomplete. These are counts, not risk per trip: we have no data on how far people walk, ride or drive."

Body copy:
> If you only count admissions, car drivers and motorcyclists dominate the picture, and cyclists are now the third-largest group. Pedestrians barely register: about one admission in fifteen.
>
> Count the days people spend in hospital and the order shifts. Between 2016 and 2021 pedestrians made up 6.5% of admissions but 13.1% of bed days. Count the people who did not survive their stay and the gap widens again. From 2011 to 2019, pedestrians were 7.3% of admissions and 26.4% of in-hospital deaths: 538 of 2,041.

### Beat 3.2: Age turns a bad crash into a fatal one
*Chart 3B, supporting: dot plot by age band with 95% interval whiskers.* Pedestrians vs all road users, for each age band.
- Data: `severity.csv` (`view` = age, `road_user` = Pedestrian and All road users, age bands only, not "All ages"). Plot `died_per_1000` with `ci_low` / `ci_high` where `publish_rate` is TRUE, and `avg_stay` where `publish_stay` is TRUE.
- Interaction: a toggle between **Died in hospital per 1,000** and **Average stay (days)**. Hover or tap a dot for counts and the interval.
- Annotation: at 75+, "61 in 1,000 pedestrians aged 75+ died in hospital".
- Title: *For pedestrians over 75, one admission in 16 ends in death*
- Notes line: "Per 1,000 people admitted, not per head of population. Deaths within hospital stays, 2011-2019; average stay (days per person who left hospital alive), 2016-2021. Whiskers show 95% intervals."

Body copy:
> This is where Sam's parents come in. Older pedestrians are not being admitted more often than they were a decade ago. Our per-person figures for people aged 75 and over drift down, though part of that comes from a change in how New South Wales counts cases in 2017. What changes is the outcome.
>
> A pedestrian aged 75 or over who is admitted after being hit dies in hospital about 61 times in every 1,000. Across all road users of that age it is 28. Those who survive stay an average of 19 days, against 11 for older road users generally. Pedestrians aged 65 and over make up fewer than a quarter of injured pedestrians (23%), but more than half of the pedestrians who die in hospital (52%).

### Beat 3.3: What hits you matters
*Small sorted dot list, inline or in a drawer.* Died per 1,000 by what the person was hit by (counterparty), for **All road users** and **Pedestrians** only. Most other road-user and counterparty pairs are too small to publish.
- Data: `severity.csv` (`view` = counterparty; `road_user` = All road users and Pedestrian; only rows where `publish_rate` is TRUE).
- Annotations: heavy vehicle or bus, 20.4 per 1,000 for all road users (205 deaths of 10,055) and 52.7 for pedestrians (57 of 1,081). Train, shown with a "rare" badge: 57.2 for all road users (17 deaths of 297) and 125.0 for pedestrians (14 deaths of 112).
- Title: *Apart from rare train collisions, a heavy vehicle or bus is the deadliest thing to be hit by*
- Notes line: "Rates shown only where there are at least 100 cases and 10 deaths, 2011-2019. Train collisions are higher still but rest on very few deaths: 17 in nine years across all road users, 14 of them pedestrians."

Body copy:
> Among the things people were hit by in numbers big enough to measure, a heavy vehicle or bus carried the highest death rate for each of the five main road users: 25.5 per 1,000 admitted for cyclists, 18.9 for car passengers, 16.5 for car drivers and 15.2 for motorcyclists. For pedestrians it was about 53. Collisions with trains were worse again, but so rare that the figure rests on 14 deaths for pedestrians and 17 in all.

**Chapter caveat (printed once, under the chapter):** These figures describe what happens to people once they reach hospital. Most road deaths happen at the scene and never appear in this data.

---

## Chapter 4: The lockdown test

Sam's question: *I started riding in 2020. What happened to people like me?*

**Headline:** In the month Australia locked down, crash admissions fell by a third. Cyclist admissions rose.

**Standfirst:** In 2020 Australians travelled less, worked from home and bought bikes. Hospital records show how that played out on the roads.

**What to know**
- April 2020 had 2,357 road-crash admissions, 32% fewer than April 2019 and the lowest month of the decade.
- In that month admissions fell for every main road user except cyclists, which rose 16%.
- From April to December 2020, cyclist admissions beat every same month of the previous five years: 9 months out of 9.

### Beat 4.1: The trough
*Chart 4A, main: monthly line with a baseline band.* Jan-Dec on the x-axis. A grey band shows the 2015-2019 range for each month (`base_min` to `base_max`), with a thin line for the 2015-19 average (`base_mean`), 2019 as a muted line and 2020 in the accent colour.
- Data: `ch4_monthly.csv` (`road_user` = All road users or Pedal cyclist; `month` ≠ Year; columns `2019`, `2020`, `2021`, `base_min`, `base_mean`, `base_max`).
- Interaction: a two-step switch: **All road users** (shows the April trough) → **Cyclists** (shows the rise). The y-axis rescales between views and the switch says so. Hover or tap a month for 2019, 2020 and the band.
- Annotations: All road users view, at April, "2,357: lowest month of 2011-2021". Cyclists view, at June, "682, up from 453 in June 2019".
- Title, changing with the view: *April 2020: a third fewer crash admissions* / *Cyclists: every month from April above the previous five years*
- Notes line: "Grey band = range of 2015-2019. Lockdown dates and length differed by state (Victoria's was longest); national monthly data can't be split by state."

Body copy:
> Australia's first national restrictions came in late March 2020. In April, 2,357 people were admitted to hospital after road crashes. That's 1,131 fewer than in April 2019, and the lowest monthly figure in the 11 years of data.
>
> The fall was steepest for people on foot. Pedestrian admissions fell by 60%, car passengers by 53%, drivers by 43% and motorcyclists by 38%. One line went the other way.

### Beat 4.2: The exception
*Chart 4B, supporting: diverging horizontal bars.* % change, April 2020 vs April 2019, by road user. Five bars go left and one goes right.
- Data: `ch4_monthly.csv` (`month` = April; `pct_2020_vs_2019`; the five main road users).
- Encoding: the fall colour (blue) for decreases and the rise colour (orange) for increases, with the value written at each bar end.
- Title: *Every road user went to hospital less in April 2020, except cyclists*

Body copy:
> Cyclist admissions rose 16% in April and kept climbing. June 2020 had 682, half as many again as June 2019. Over the whole year, cyclist admissions went from 7,302 to 8,332, up 14%, while pedestrian admissions fell 22% and car drivers 9%.
>
> Children were a big part of it. Riders aged 8 to 16 made up one in seven injured cyclists in 2019 but nearly 30% of the 2020 increase: 307 of the 1,030 extra cyclist admissions.

- Data for the children line: `ch2_age_roaduser.csv` (`road_user` = Pedal cyclist; `age_group` = 8-16; columns `2019`, `2020`).

### Beat 4.3: Was it lockdown, or the trend?
*Optional inset, also used in the methods: annual cyclist admissions 2011-2021 as dots on a line, with the 2011-2019 growth trend carried forward one year as a dashed line to 2020.*
- Data: `ch4_monthly.csv` (`road_user` = Pedal cyclist; `month` = Year; annual columns `2011` to `2021`, and `trend_2020`). The trend is compound growth: `trend_2020` = 2019 × (2019 ÷ 2011)^(1/8) = 7,584, which is about 3.9% a year.
- Annotation: at 2020, "8,332 real vs 7,584 trend: about 750 above".
- Title: *Cyclist injuries were already rising. 2020 added to it.*
- Notes line: "The trend assumes the 2011-2019 yearly growth rate (about 3.9% a year) simply continued. It is a rough yardstick with no error margin attached."

Body copy:
> Cycling injuries had been rising for years, so not all of 2020's increase is a lockdown effect. From 2011 to 2019 cyclist admissions grew by about 3.9% a year. Carry that growth forward one more year and 2020 would have had about 7,584 admissions; the real figure was 8,332. That's about 750 more than the trend, or roughly 10% above it. A single trend line is a rough yardstick and we haven't put an error margin on it, so we don't claim that all 750 is lockdown. Month by month the signal is clearer: from April to December 2020, every month was above the highest that month reached in 2015-2019 (9 of 9).
>
> We can't say how many more people were riding, because there is no national count of trips or kilometres. The likeliest explanation is more riders on the road, not riding becoming more dangerous, but this data cannot prove it.

**Chapter caveat:** Restrictions differed by state. Among the states, Victoria had the largest rise in cyclist admissions in July-December 2020: 1,419 against 1,010 in 2019, which is 409 more (+40.5%). That fits the timing of Victoria's second lockdown, but six-monthly state data cannot show cause and effect. Tasmania's percentage rise is a shade higher (+40.7%) but rests on a tiny base: 54 admissions rose to 76.
- Data: `ch4_state_cyclists.csv` (`half` = Jul-Dec; `2019`, `2020`, `pct_change`; state counts exclude deaths, as in the BITRE state file). Optional small inset: absolute change by state.

---

## Chapter 5: Are the roads equally safe for everyone?

Sam's question: *Are the roads equally safe for everyone?*

**Headline:** In 2011 First Nations Australians were hospitalised after road crashes at about the same rate as everyone else. By 2021 the rate was half as high again.

**Standfirst:** Counts alone hide this, because the population grew. Per person, the picture changes. Part of the rise may be better recording of Indigenous status in hospital records, and these records cannot say why the rate moved.

**What to know**
- First Nations hospitalisations rose from 1,167 in 2011 to 2,220 in 2021 (+90%). For non-Indigenous Australians: 31,997 to 36,755 (+15%).
- Per 100,000 people, First Nations rose from about 145 to 226 (+56%); non-Indigenous stayed at about 149.
- Pedestrians were 11.0% of First Nations hospitalisations and 6.3% of non-Indigenous ones (2016-2021).
- First Nations people were 41.2% of everyone hospitalised in remote areas (2016-2021).
- Part of the rise may be better recording of Indigenous status. Records with status not stated are left out.

### Beat 5.1: Same starting line, different 2021
*Chart 5A, main: two lines, 2011 to 2021.* First Nations and non-Indigenous, with a toggle: **Hospitalisations (2011 = 100)** ↔ **Per 100,000 people**.
- Data: `ch5_first_nations_trend.csv` (`hosp` by `year` and `status`). The per-person view also needs population: First Nations from the ABS back-cast estimates (806,090 in 2011; 898,515 in 2016; 983,709 in 2021), non-Indigenous = ABS estimated resident population (`ch1_trend.csv`, `population`) minus the First Nations figure. These populations exist for three years only, so the per-person view shows three points (2011, 2016, 2021) joined by a dotted line.
- Encoding: First Nations in the accent colour, non-Indigenous in a neutral dark grey; same y-scale for both lines; values written at line ends, no legend.
- Interaction: the toggle; hover or tap a year for the count, the index or the rate.
- Annotations: counts view, line ends "First Nations +90% (1,167 to 2,220)" and "Non-Indigenous +15% (31,997 to 36,755)". Per-person view, "2011: 145 vs 149 per 100,000" and "2021: 226 vs 149". A caveat marker (an "i" icon, open by default on mobile) next to the First Nations line: "Better recording of Indigenous status may explain part of the rise."
- Title, changing with the view: *First Nations hospitalisations nearly doubled; everyone else's rose 15%* / *Per person, the First Nations rate went from level with everyone else to half as high again*
- Notes line: "Per 100,000 = hospitalisations ÷ population × 100,000. Non-Indigenous population = ABS estimated resident population (22,340,024 in 2011, 25,685,412 in 2021) minus the ABS First Nations estimate, so it also contains people whose status is unknown. Population figures are ABS estimates, back-cast after the 2021 Census (CC BY 4.0). Hospital records with Indigenous status not stated are excluded: together the two groups fall short of the national total by 869 in 2011 and 530 in 2021."

Body copy:
> In 2011, 1,167 First Nations people were hospitalised after road crashes. In 2021 it was 2,220, up 90%. Over the same decade the count for everyone else rose 15%. But the population changed too, and counts are not rates.
>
> Per 100,000 people, First Nations Australians were hospitalised about 145 times in 2011, against about 149 for everyone else: close to level. By 2021 the First Nations figure was about 226, while the rest of Australia's was still about 149. That is a rise of 56% per person for First Nations people, and almost none for everyone else. First Nations people were 3.8% of the population in 2021 but 5.6% of that year's road-crash hospitalisations.
>
> Part of the rise may be better recording. Hospital records may now identify Indigenous status more completely: the shortfall between the national total and the two groups combined (mostly records with status not stated) fell from 869 to 530. That is a sign, but a small one next to a rise of 1,053 First Nations hospitalisations, and we can't say how much of the change is recording and how much is real.

### Beat 5.2: Who is hurt on the road
*Chart 5B, supporting: paired horizontal bars.* The mix of road users within each group's hospitalisations: for each of the eight BITRE road-user categories, one bar for the First Nations share and one for the non-Indigenous share, sorted by the First Nations share.
- Data: `ch5_first_nations_profile.csv` (`view` = road_user; `hosp`, `np_cells`). Shares = category ÷ sum of that group's published categories, pooled 2016-2021, computed in D3 (First Nations 11,635; non-Indigenous 218,188).
- Encoding: accent bars for First Nations, grey bars for non-Indigenous, value written at each bar end. The pedestrian pair is highlighted; other labels stay muted.
- Interaction: hover or tap for the count and for the number of suppressed cells.
- Annotation: at pedestrians, "11.0% of First Nations hospitalisations vs 6.3% of non-Indigenous". At pedal cyclists, "10.9% vs 19.7%".
- Title: *Pedestrians are a bigger share of First Nations road-crash hospitalisations: 11% against 6%*
- Notes line: "Shares of each group's hospitalisations, pooled 2016-2021; not rates, and no data on how much each group walks, rides or drives. BITRE suppresses small cells (n.p.): 14 half-year cells for each group, all in bus occupants, heavy transport, pick-up or van occupants and 'other'. Those cells are excluded, so shares are of published cells only. Car, motorcycle, cycling and pedestrian counts have none."

Body copy:
> The mix of people hurt looks different too. Pedestrians were 11.0% of First Nations hospitalisations over 2016-2021, against 6.3% for everyone else. Cyclists were a smaller share (10.9% against 19.7%), and car occupants a slightly bigger one (54.5% against 48.1%).
>
> This is the make-up of those hospitalised, not the risk of any one way of travelling. The data has no count of how far or how often each group walks, rides or drives, so it can't say who faces more danger per trip.

### Beat 5.3: Where people live
*Chart 5C, supporting: two small panels with a toggle.* **First Nations share of hospitalisations** by area of residence (Major Cities, Regional, Remote) ↔ **Average stay (days)** by area, First Nations and non-Indigenous side by side (dumbbells).
- Data: `ch5_first_nations_profile.csv` (`view` = remoteness; `hosp`, `bed_days`, `avg_stay`). Share = First Nations ÷ (First Nations + non-Indigenous) within each area: Major Cities 2.7%, Regional 7.1%, Remote 41.2% (2,767 of 6,716), pooled 2016-2021.
- Encoding: share view, three horizontal bars on a 0-100% scale, Remote highlighted. Stay view, a dumbbell per area (accent dot = First Nations, grey dot = non-Indigenous).
- Annotations: share view, at Remote, "41.2% of those hospitalised were First Nations people". Stay view, at Remote, "6.1 days vs 4.9".
- Title, changing with the view: *In remote areas, First Nations people are 41% of those hospitalised after road crashes* / *In remote areas, First Nations patients stay 6.1 days on average; others stay 4.9*
- Notes line: "Remoteness is where people usually live, not where the crash happened. We have no population by remoteness in this data, so we can't say whether 41% is high or low relative to the share of residents. Average stay = bed days ÷ hospitalisations for each group and area, counting survivors only (people who died within 30 days of admission are excluded from both), the same basis and the same 2016-2021 window as the stays in Chapter 3; it comes from a different BITRE table (the First Nations file). Pooled 2016-2021. The remoteness table counts 11,539 First Nations hospitalisations and the road-user table 11,635, a difference of 96: the remoteness table has no "unknown remoteness" category (those records are excluded), while the road-user table includes them and leaves out the suppressed n.p. cells."

Body copy:
> Where people live matters. In remote areas, First Nations people were 41.2% of everyone hospitalised after road crashes, against 7.1% in regional areas and 2.7% in the major cities. In the same remote areas, First Nations patients stayed 6.1 days on average, compared with 4.9 days for non-Indigenous patients. In the major cities the figures were 5.1 and 4.9 days.
>
> Longer stays can reflect how badly someone was hurt, transfers between hospitals or the distance to care. The data cannot separate these. Nor does it say where the crash happened, only where the person lives.

**Chapter caveat (printed once, under the chapter):** This chapter describes hospital records. It is not about blame or choices, and it cannot say why rates differ. It cannot tell us how much of the rise is better recording, how much each group travels by foot, bike or car, or where the crashes happened. Records with Indigenous status not stated are excluded, and BITRE suppresses small cells (n.p.). Population figures are ABS estimates (Estimates of Aboriginal and Torres Strait Islander Australians, back-cast after the 2021 Census). We use BITRE's terms, "First Nations people" and "non-Indigenous". Questions about why belong with First Nations communities and the people who work on road safety alongside them.

---

## Closing: What to take away

Four short paragraphs, no chart. For Sam, in plain words:

> **The road toll isn't the whole story.** Deaths have fallen, but the number of Australians seriously hurt has stayed the same per person: more than 100 admissions a day in 2021.
>
> **If you ride, you're part of a growing group.** Cycling admissions rose faster than any other road user's over the decade, more than doubled among people over 65, and rose again when the country locked down. None of this shows that riding got more dangerous per trip. It does show that more riders are ending up in hospital, and that older riders are a growing share of them.
>
> **If your parents walk, the danger isn't how often they're hit but what happens when they are.** Older pedestrians aren't admitted more often than they were, but when they are, about one in sixteen of those aged 75 and over doesn't come home.
>
> **The roads are not equally safe for everyone, and counts alone hide it.** Per person, First Nations Australians were hospitalised after road crashes at about the same rate as everyone else in 2011 (145 and 149 per 100,000) and at a rate half as high again in 2021 (226 and 149). Better recording explains part of that, and we can't say how much. The records also show more pedestrians among First Nations patients and longer stays in remote areas. What they can't tell us is why.

## Methods and limitations box (end of page)

**Sources:** BITRE hospitalised injury data (September 2023 release: national, state and First Nations files, and the data dictionary); ABS estimated resident population (CC BY 4.0); BITRE Australian Road Deaths Database (ARDD fatalities, October 2023); ABS Estimates of Aboriginal and Torres Strait Islander Australians, June 2021, and the ABS estimates and projections back-cast for 2011 and 2016 (CC BY 4.0): https://www.abs.gov.au/statistics/people/aboriginal-and-torres-strait-islander-peoples/estimates-aboriginal-and-torres-strait-islander-australians/30-june-2021 and https://www.abs.gov.au/statistics/people/aboriginal-and-torres-strait-islander-peoples/estimates-and-projections-aboriginal-and-torres-strait-islander-australians/latest-release. The BITRE and ARDD licences are still to be confirmed.

**Rules:**
- Counts are not rates. Per-person figures use ABS population.
- Headline counts are hospitalisations (people discharged alive), as in BITRE Table 1. Death rates use everyone admitted.
- Deaths in hospital: 2011-2019 only (2020-21 records are incomplete). Bed days: 2016-2021 only (counting changed in July 2015). Average stay is days per person who left hospital alive.
- Rates are shown only where there are at least 100 cases and 10 deaths. Suppressed cells (n.p.) are treated as missing, never as zero.
- Victorian (2012) and NSW (2017) counting changes lower later counts.
- First Nations figures leave out records with Indigenous status not stated, and recording may have improved over the decade.
- Remoteness and state are where the patient lives, not where the crash happened.
- No exposure data (trips, distance): we cannot say which way of travelling is riskier per trip.

**Processing:** KNIME workflow `BeyondTheRoadToll`, 102 nodes in 6 sections, validated against an independent Python implementation and BITRE Table 1 (`processing/VALIDATION.md`). Links to the repository and the KNIME workflow go here.

**Reconciliation note:** The First Nations totals were reconciled with the national totals: the shortfall is records with Indigenous status not stated, plus whole cells BITRE suppressed (n.p.).
