# Storyboard — Beyond the Road Toll (four chapters)

Last updated 2026-11-23. Every number below comes from `data/clean/` via `processing/clean_data.py`, `processing/supplementary_data.py` or `processing/phase2_ideas.py`. Quotable figures with their source CSVs are listed in `processing/phase2_key_numbers.csv`. If a figure here and a CSV disagree, the CSV wins and this file gets fixed.

The reader is Sam: 52, lives in outer Brisbane, drives to work, started riding on weekends in 2020, and has parents in their late seventies who still walk to the shops. Sam reads on a phone, in short sittings, and wants three things answered:

1. Is it getting safer out there?
2. Are people like me, or my parents, more at risk than I think?
3. What should I actually take away from this?

Chapters 1 and 2 are already built. Chapters 3 and 4 are new, and so is the closing section.

---

## Page top

**Kicker:** Road safety · Data investigation
**Headline:** Beyond the road toll
**Standfirst:** Fewer Australians are dying on the roads. The number being seriously hurt hasn't fallen. We went through a decade of hospital records to find out who is being hurt, and how badly.
**Byline/date:** By [Team names] · Published 23 November 2026
**Lede graphic:** the existing unit chart: for every road death in 2021, 35 people were admitted to hospital.

---

## Chapter 1 — The hidden road toll *(built; copy unchanged)*

Sam's question: *Is it getting safer?*
Headline: **The road toll is falling. The injury toll isn't.**
Key numbers: 39,505 admitted in 2021, about 108 a day. Road deaths down 11.5% and admissions up 16% since 2011. Per person, the hospitalisation rate barely moved (about 152 to 154 per 100,000).

## Chapter 2 — Road injury is getting older *(built; copy unchanged)*

Sam's question: *Are people like me more at risk?*
Headline: **Cycling injuries have more than doubled among over-65s.**
Key numbers: cyclists 65–74 +138%, 75+ +142% (3-year averages). Per person, +78% and +92%.

---

## Chapter 3 — Not every crash is equal *(new)*

Sam's question: *Are my parents more at risk than I think?*

**Headline:** Pedestrians are 1 in 14 of the injured, but 1 in 4 of those who die in hospital

**Standfirst:** Counting admissions treats a sprained wrist and a fractured skull the same. Look at what happens after admission and a different road user comes to the top of the list.

**What to know (key points box)**
- Pedestrians were 7.3% of road-crash admissions, but 26.4% of the people who died in hospital (2011–2019).
- Of every 1,000 pedestrians admitted, about 22 died in hospital. For car drivers it was about 6, and for cyclists about 2.
- For pedestrians aged 75 and over it was 61 in 1,000, and survivors stayed in hospital for an average of 19 days.

### Beat 3.1 — Two rankings, two different answers
*Chart 3A, main: paired horizontal bars.* For each of the five main road users, one bar shows their share of people admitted and a second shows their share of hospital bed days (2016–2021). A third step adds share of in-hospital deaths (2011–2019).
- Data: `idea3_burden_share.csv` (cases, bed days), `idea3_severity_roaduser.csv` (deaths).
- Encoding: grey bar = share of admissions, accent bar = the harm measure. Bars sorted by share of admissions, so the pedestrian jump stands out against the order.
- Interaction: a three-way stepper: **Admissions → Bed days → Deaths in hospital**. Default is Bed days. Labels are written on the bars; there is no legend.
- Annotation: next to pedestrians, "6.6% of admissions, 13.1% of bed days".
- Title (states the finding): *Pedestrians take up twice their share of hospital beds*
- Notes line: "Share of cases and bed days, 2016–2021; deaths in hospital, 2011–2019. Bed days were counted differently before July 2015, and death records for 2020–21 are incomplete. These are counts, not risk per trip: we have no data on how far people walk, ride or drive."

Body copy:
> If you only count admissions, car drivers and motorcyclists dominate the picture, and cyclists are now the third-largest group. Pedestrians barely register: about one admission in fifteen.
>
> Count the days people spend in hospital and the order shifts. Between 2016 and 2021 pedestrians made up 6.6% of admissions but 13.1% of bed days. Count the people who did not survive their stay and the gap widens again. From 2011 to 2019, pedestrians were 7.3% of admissions and 26.4% of in-hospital deaths: 538 of 2,041.

### Beat 3.2 — Age turns a bad crash into a fatal one
*Chart 3B, supporting: dot plot by age band with 95% interval whiskers.* Pedestrians vs all road users, for each age band.
- Data: `idea3_older_pedestrians.csv` (`age_level == "band"`; plot `died_per_1000_publish` and `avg_stay_publish`, never the raw columns).
- Interaction: a toggle between **Died in hospital per 1,000** and **Average stay (days)**. Hover or tap a dot for counts and the interval.
- Annotation: at 75+, "61 in 1,000 pedestrians aged 75+ died in hospital".
- Title: *For pedestrians over 75, one admission in 16 ends in death*
- Notes line: "Per 1,000 people admitted, not per head of population. Deaths within hospital stays, 2011–2019; average stay, 2016–2021. Whiskers show 95% intervals."

Body copy:
> This is where Sam's parents come in. Older pedestrians are not being admitted more often than they were a decade ago. Our per-person figures for people aged 75 and over drift down, though part of that comes from a change in how New South Wales counts cases in 2017. What changes is the outcome.
>
> A pedestrian aged 75 or over who is admitted after being hit dies in hospital about 61 times in every 1,000. Across all road users of that age it is 28. Those who survive stay an average of 19 days, against 11 for older road users generally. Pedestrians aged 65 and over make up fewer than a quarter of injured pedestrians, but more than half of the pedestrians who die in hospital.

### Beat 3.3 — What hits you matters
*Small sorted dot list, inline or in a drawer.* Died per 1,000 by counterparty, for **All road users** and **Pedestrians** only. The analysis showed most other road-user and counterparty pairs are too small to publish.
- Data: `idea3_severity_counterparty.csv` (`*_publish` columns only).
- Title: *Being hit by a truck or bus is the worst outcome for every road user*
- Notes line: "Rates shown only where there are at least 100 cases and 10 deaths. Train collisions are rarer still: 297 cases and 17 deaths in nine years."

Body copy:
> For every group of road users we could measure reliably, being hit by a heavy vehicle or bus carried the highest death rate. For pedestrians it was about 53 per 1,000 admitted. Collisions with trains were worse again, but so rare that the figure rests on 17 deaths.

**Chapter caveat (printed once, under the chapter):** These figures describe what happens to people once they reach hospital. Most road deaths happen at the scene and never appear in this data.

---

## Chapter 4 — The lockdown test *(new)*

Sam's question: *I started riding in 2020. What happened to people like me?*

**Headline:** In the month Australia locked down, crash admissions fell by a third. Cyclist admissions rose.

**Standfirst:** In 2020 Australians travelled less, worked from home and bought bikes. Hospital records show how that played out on the roads.

**What to know**
- April 2020 had 2,357 road-crash admissions, 32% fewer than April 2019 and the lowest month of the decade.
- In that month admissions fell for every main road user except cyclists, which rose 16%.
- From April to December 2020, cyclist admissions beat every same month of the previous five years.

### Beat 4.1 — The trough
*Chart 4A, main: monthly line with a baseline band.* Jan–Dec on the x-axis. A grey band shows the 2015–2019 range for each month, with a thin line for the 2015–19 average, 2019 as a muted line and 2020 in the accent colour.
- Data: `idea4_baseline_band.csv`, `idea4_monthly_2019_2021.csv`.
- Interaction: a two-step switch: **All road users** (shows the April trough) → **Cyclists** (shows the rise). The y-axis rescales between views and the switch says so. Hover or tap a month for 2019, 2020 and the band.
- Annotations: All road users view, at April, "2,357 — lowest month of 2011–2021". Cyclists view, at June, "682, up from 453 in June 2019".
- Title, changing with the view: *April 2020: a third fewer crash admissions* / *Cyclists: every month from April above the previous five years*
- Notes line: "Grey band = range of 2015–2019. Lockdown dates and length differed by state (Victoria's was longest); national monthly data can't be split by state."

Body copy:
> Australia's first national restrictions came in late March 2020. In April, 2,357 people were admitted to hospital after road crashes. That's 1,131 fewer than in April 2019, and the lowest monthly figure in the 11 years of data.
>
> The fall was steepest for people on foot. Pedestrian admissions fell by 60%, car passengers by 53%, drivers by 43% and motorcyclists by 38%. One line went the other way.

### Beat 4.2 — The exception
*Chart 4B, supporting: diverging horizontal bars.* % change, April 2020 vs April 2019, by road user. Five bars go left and one goes right.
- Data: `idea4_roaduser_change_2020.csv` (`comparison == "april_vs_2019"`).
- Encoding: the fall colour (blue) for decreases and the rise colour (orange) for increases, with the value written at each bar end.
- Title: *Every road user went to hospital less in April 2020, except cyclists*

Body copy:
> Cyclist admissions rose 16% in April and kept climbing. June 2020 had 682, half as many again as June 2019. Over the whole year, cyclist admissions went from 7,302 to 8,332, up 14%, while pedestrian admissions fell 22% and car drivers 9%.
>
> Children were a big part of it. Riders aged 8 to 16 made up one in seven injured cyclists in 2019 but almost a third of the 2020 increase.

### Beat 4.3 — Was it lockdown, or the trend?
*Optional inset, also used in the methods: annual cyclist admissions with the 2011–2019 trend line and a 95% prediction band.*
- Data: `idea4_cyclist_trend.csv`.
- Title: *Cyclist injuries were already rising. 2020 added to it.*

Body copy:
> Cycling injuries had been rising for years, so not all of 2020's increase is a lockdown effect. Projecting the 2011–2019 trend forward gives about 7,670 admissions for 2020; the real figure was 8,332. That's 662 more than the trend, within the normal year-to-year swing on its own. Month by month the signal is clearer: from April to December, every month came in above what the trend predicted.
>
> We can't say how many more people were riding, because there is no national count of trips or kilometres. The likeliest explanation is more riders on the road, not riding becoming more dangerous, but this data cannot prove it.

**Chapter caveat:** Restrictions differed by state. Victoria's second lockdown fits the timing of the biggest state rise in cyclist admissions (July–December 2020, +40.5%), but six-monthly state data cannot show cause and effect.

---

## Closing — What to take away

Three short paragraphs, no chart. For Sam, in plain words:

> **The road toll isn't the whole story.** Deaths have fallen, but the number of Australians seriously hurt has stayed the same per person: more than 100 admissions a day in 2021.
>
> **If you ride, you're part of a growing group.** Cycling admissions rose faster than any other group's over the decade, more than doubled among people over 65, and rose again when the country locked down. None of this shows that riding got more dangerous per trip. It does show that more riders are ending up in hospital, and that older riders are a growing share of them.
>
> **If your parents walk, the danger isn't how often they're hit but what happens when they are.** Older pedestrians aren't admitted more often than they were, but when they are, about one in sixteen of those aged 75 and over doesn't come home.

## Methods and limitations box (end of page)

Sources: BITRE hospitalised injury data (Sept 2023 release); ABS estimated resident population; BITRE Australian Road Deaths Database. Rules: counts are not rates; per-person figures use ABS population; deaths in hospital 2011–2019 only; bed days 2016–2021 only; Victorian (2012) and NSW (2017) counting changes lower counts; residence, not crash location; no exposure data. Processing: Python scripts and a KNIME workflow, with links to the repository.

## Deferred, and why

Chapter 5, on equity (First Nations people and remoteness), is planned but not published. The First Nations tables don't add up to the national totals by more than suppressed cells can explain, and we won't publish findings we can't reconcile.
