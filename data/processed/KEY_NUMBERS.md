# Key numbers: Beyond the Road Toll

Every number quoted in `report/STORYBOARD.md` and the Chapter 5 numbers in `CLAUDE_CONTEXT/REBUILD_PLAN.md` §2 and §6, traced to `data/processed/*.csv` (or to `data/supplementary/SOURCES.md` where marked CITED). Values are computed with pandas; the helper script is `/private/tmp/claude-501/-Users-tritran2411-Desktop-COS30045A3-Shu-Group/f120d774-ff5a-4cd8-bf80-3d957513403b/scratchpad/build_key_numbers.py`.

## Summary

Rows: 90. **SAME** 31, **CHANGED** 11, **DERIVED** 45, **CITED** 2, **NOT FOUND** 1.

**Status meanings.** SAME: a single processed cell, rounded, matches the story. DERIVED: a formula on processed cells, matches the story (formula given). CHANGED: the processed value differs; the story text must be updated. CITED: from SOURCES.md, not from our data. NOT FOUND: cannot be traced to a processed file.

**CHANGED items (old → new). Update the story text for these:**

- Ch3 Beat 3.1: "annotation: 6.6% of admissions (pedestrians, 2016–21)" → 6.6% → **6.5%**
- Ch3 Beat 3.1 body: "pedestrians made up 6.6% of admissions (2016–21)" → 6.6% → **6.5%**
- Ch3 Beat 3.3 title: "Being hit by a truck or bus is the worst outcome for every road user" → every road user → **Heavy vehicle or bus is the highest published non-train rate for each of the five main road users (Car driver 16.5, Car passenger 18.9, Motorcyclist 15.2, Pedal cyclist 25.5, Pedestrian 52.7). Train collisions are higher for All road users (57.2) and Pedestrians (125.0) but rest on 17 and 14 deaths** (Title needs 'apart from train collisions'. Bus occupant and Other or unknown also differ, but on very small counts)
- Ch4 Beat 4.3 body: "projecting the 2011–2019 trend gives about 7,670 admissions for 2020" → 7,670 → **7,584**
- Ch4 Beat 4.3 body: "That's 662 more than the trend" → 662 → **748**
- Ch4 caveat: "the biggest state rise in cyclist admissions (Jul–Dec 2020, +40.5%)" → Vic, +40.5% → **Tas +40.7% (54 → 76); Vic +40.5% (1,010 → 1,419), largest absolute rise (+409)** (Tas has the largest % rise (on a small base); Vic has the largest absolute rise. Reword, e.g. 'the largest rise among the large states, in absolute terms')
- Ch5 5.3: "remote residents stay longer" → remote stays longer → **FN: Remote 6.1 vs Major Cities 5.1 and Regional 5.4 (profile now 2016-21). Non-Indigenous: Remote 4.9 vs Regional 6.0, Major Cities 4.9. All people (severity, remoteness): Remote 5.4 vs Regional 6.0** (Holds for First Nations only. Reword: e.g. 'First Nations people in remote areas stay longest (6.1 days per survivor)')
- Ch5 5.2: "pedestrians about 12% of First Nations admissions vs about 7%" → 12.1% vs 6.8% (pooled 2011-21) → **11.0% vs 6.3% (2016-21)**; cyclists 11.1% vs 19.0% → **10.9% vs 19.7%**; car occupants 54.3% vs 48.2% → **54.5% vs 48.1%**; n.p. cells 31 → **14** per group
- Ch5 5.3: "First Nations about 38% of remote hospitalisations" → 38.3% (Major Cities 2.4%, Regional 6.4%) → **41.2% (2.7%, 7.1%)**; remote stay non-Indigenous 4.8 → **4.9**; 18,523 vs 18,616 (93) → **11,539 vs 11,635 (96)**
- Ch5 §6: "Tas, not Vic, has the largest % rise (54 → 76 and 1,010 → 1,419)" → Vic +40.5% → **Tas 54 → 76 (+40.7%); Vic 1,010 → 1,419 (+40.5%)** (Same as the Ch4 caveat row above)

**Not traced:** 1 (the 95% prediction band behind 'within the normal year-to-year swing'). Years and date ranges (2011–2019, 2016–2021, 'July 2015', 'NSW 2017') are labels, not data points, and are not rows.

**Notes on rounding and definitions.** Headline counts use `hosp`; deaths use cases_1119 / died_1119 (2011–19); stays and bed-day shares use hosp_1621 / beds_1621 (2016–21). Shares are row ÷ the All road users (or All ages) row with the same view and category. Per-person changes are computed from unrounded averages and population, not from the stored 1-decimal rate columns.

**Other items to check when the copy is edited.** (a) The Ch4 trend uses the processed `trend_2020` (2019 × 2011–19 compound growth, per REBUILD §3.5), which differs from a linear fit (7,670). (b) The First Nations vs non-Indigenous gap to national totals is 462–869 a year (2011–2021), not the 500–900 stated in REBUILD §1. (c) Several rows are repeats of the same number in the body copy, marked 'repeat'.

## Table

| # | chapter/beat | quote (short) | old value | new value | status | source (file → filter → column, or formula) |
|---|---|---|---|---|---|---|
| 1 | Page top | for every road death in 2021, 35 people were admitted | 35 | 35 | SAME | ch1_trend → year 2021 → hosp_per_death (= hosp / road_deaths) |
| 2 | Ch1 | 39,505 admitted in 2021 | 39,505 | 39,505 | SAME | ch1_trend → year 2021 → hosp |
| 3 | Ch1 | about 108 a day | 108 | 108 | DERIVED | ch1_trend hosp 2021 / 365 |
| 4 | Ch1 | Road deaths down 11.5% since 2011 | -11.5% | -11.5% | DERIVED | ch1_trend → road_deaths: 2021/2011 - 1 |
| 5 | Ch1 | admissions up 16% since 2011 | 16% | 16% | DERIVED | ch1_trend → hosp: 2021/2011 - 1 |
| 6 | Ch1 | hospitalisation rate barely moved (about 152 to 154 per 100,000) | 152 to 154 | 152.3 (2011) to 153.8 (2021) | SAME | ch1_trend → hosp_per_100k, years 2011 and 2021 (rounds to 152 and 154) |
| 7 | Ch2 | cyclists 65–74 +138% (3-year averages) | +138% | 138% | SAME | ch2_age_roaduser → age 65-74, Pedal cyclist → pct_change_3yr |
| 8 | Ch2 | cyclists 75+ +142% | +142% | 142% | SAME | ch2_age_roaduser → age 75+, Pedal cyclist → pct_change_3yr |
| 9 | Ch2 | Per person, +78% (65–74) | +78% | 78% | DERIVED | ch2 → ((avg_2019_21/pop_2019_21)/(avg_2011_13/pop_2011_13) - 1); unrounded 78.48 (stored rate_change_3yr is 78.5, which rounds to 79 if re-rounded) |
| 10 | Ch2 | Per person, +92% (75+) | +92% | 92% | DERIVED | ch2 → same per-person formula, 75+ row (stored rate_change_3yr 91.8). Note: Expected change in brief was ~91.8%; it rounds to 92, so the story text is unchanged |
| 11 | Ch2 (closing) | cyclists over 65 more than doubled (headline) | more than doubled | 139% rise on 3-year averages (65–74 + 75+ combined, x2.39) | DERIVED | ch2 → Pedal cyclist 65-74 + 75+ → avg_2011_13 and avg_2019_21 summed |
| 12 | Ch3 key points | Pedestrians were 7.3% of road-crash admissions (2011–2019) | 7.3% | 7.3% | DERIVED | severity → view=age, road_user=Pedestrian, All ages → cases_1119 ÷ same row for All road users → ×100 |
| 13 | Ch3 key points | 26.4% of the people who died in hospital (2011–2019) | 26.4% | 26.4% | DERIVED | severity → view=age, Pedestrian, All ages → died_1119 ÷ All road users, All ages → died_1119 ×100 |
| 14 | Ch3 key points | about 22 died in hospital per 1,000 pedestrians admitted | 22 | 22 | SAME | severity → view=age, Pedestrian, All ages → died_per_1000 |
| 15 | Ch3 key points | For car drivers it was about 6 | 6 | 6 | SAME | severity → view=age, Car driver, All ages → died_per_1000 |
| 16 | Ch3 key points | for cyclists about 2 | 2 | 2 | SAME | severity → view=age, Pedal cyclist, All ages → died_per_1000 |
| 17 | Ch3 key points | pedestrians aged 75 and over it was 61 in 1,000 | 61 | 61 | SAME | severity → view=age, Pedestrian, 75+ → died_per_1000 |
| 18 | Ch3 key points | survivors stayed in hospital for an average of 19 days | 19 | 19 | SAME | severity → view=age, Pedestrian, 75+ → avg_stay (days per survivor, 2016–21) |
| 19 | Ch3 headline | Pedestrians are 1 in 14 of the injured | 1 in 14 | 1 in 13.6 | DERIVED | 1 ÷ (cases_1119 share, Pedestrian ÷ All road users, All ages). Note: Uses 2011–19 admissions (cases_1119), the same basis as the 7.3% key point. On the 2016–21 survivors basis (hosp_1621) it is 1 in 15.4; see the 6.5% row |
| 20 | Ch3 headline | but 1 in 4 of those who die in hospital | 1 in 4 | 1 in 3.8 | DERIVED | 1 ÷ (died_1119 share, Pedestrian ÷ All road users, All ages). Note: Exact value is 1 in 3.8 (26.4%); '1 in 4' is a round-up. Consider '1 in 4' vs '26%' wording |
| 21 | Ch3 Beat 3.1 | Pedestrians take up twice their share of hospital beds (title) | twice | ratio 2.02× (beds share ÷ admissions share, 2016–21) | DERIVED | severity → Pedestrian ÷ All road users, All ages → beds_1621 and hosp_1621 |
| 22 | Ch3 Beat 3.1 | annotation: 6.6% of admissions (pedestrians, 2016–21) | 6.6% | 6.5% | CHANGED | severity → Pedestrian ÷ All road users, All ages → hosp_1621 ÷ hosp_1621 ×100 (survivors basis; replaces 6.6%) |
| 23 | Ch3 Beat 3.1 | annotation: 13.1% of bed days | 13.1% | 13.1% | DERIVED | severity → Pedestrian ÷ All road users, All ages → beds_1621 ÷ beds_1621 ×100 |
| 24 | Ch3 Beat 3.1 body | about one admission in fifteen (pedestrians) | 1 in 15 | 1 in 15.4 | DERIVED | 1 ÷ (hosp_1621 share, pedestrians). Note: Share is 6.5%, 1 in 15.4 |
| 25 | Ch3 Beat 3.1 body | pedestrians made up 6.6% of admissions (2016–21) | 6.6% | 6.5% | CHANGED | as annotation above (hosp_1621 share) |
| 26 | Ch3 Beat 3.1 body | but 13.1% of bed days (2016–21) | 13.1% | 13.1% | DERIVED | as annotation above (beds_1621 share) |
| 27 | Ch3 Beat 3.1 body | 2011 to 2019, pedestrians were 7.3% of admissions (repeat) | 7.3% | 7.3% | DERIVED | as key point (cases_1119 share) |
| 28 | Ch3 Beat 3.1 body | and 26.4% of in-hospital deaths (repeat) | 26.4% | 26.4% | DERIVED | as key point (died_1119 share) |
| 29 | Ch3 Beat 3.1 body | 538 of 2,041 in-hospital deaths | 538 of 2,041 | 538 of 2041 | SAME | severity → Pedestrian, All ages → died_1119; All road users, All ages → died_1119 |
| 30 | Ch3 Beat 3.1 body | cyclists are now the third-largest group (admissions) | third | rank 3 of 5 by hosp_1621 (Car driver, Motorcyclist, Pedal cyclist) | DERIVED | severity → view=age, All ages, main road users → hosp_1621 ranked |
| 31 | Ch3 Beat 3.2 | For pedestrians over 75, one admission in 16 ends in death (title) | 1 in 16 | 1 in 16.3 | DERIVED | 1 ÷ (died_per_1000 / 1000), Pedestrian 75+ |
| 32 | Ch3 Beat 3.2 | annotation: 61 in 1,000 pedestrians aged 75+ | 61 | 61 | SAME | severity → Pedestrian, 75+ → died_per_1000 |
| 33 | Ch3 Beat 3.2 body | about 61 times in every 1,000 (pedestrians 75+, repeat) | 61 | 61 | SAME | as above |
| 34 | Ch3 Beat 3.2 body | Across all road users of that age it is 28 | 28 | 28 | SAME | severity → All road users, 75+ → died_per_1000 |
| 35 | Ch3 Beat 3.2 body | survivors stay an average of 19 days (pedestrians 75+) | 19 | 19 | SAME | severity → Pedestrian, 75+ → avg_stay |
| 36 | Ch3 Beat 3.2 body | against 11 for older road users generally | 11 | 11 | SAME | severity → All road users, 75+ → avg_stay |
| 37 | Ch3 Beat 3.2 body | pedestrians aged 65+ fewer than a quarter of injured pedestrians | under 25% | 23.2% of pedestrian admissions (2011–19) | DERIVED | severity → Pedestrian, 65-74 + 75+ → cases_1119 ÷ Pedestrian All ages → cases_1119 |
| 38 | Ch3 Beat 3.2 body | pedestrians aged 65+ more than half of pedestrians who die in hospital | over 50% | 51.7% of pedestrian in-hospital deaths (2011–19) | DERIVED | severity → Pedestrian, 65-74 + 75+ → died_1119 ÷ Pedestrian All ages → died_1119 |
| 39 | Ch3 Beat 3.3 body | For pedestrians it was about 53 per 1,000 admitted | 53 | 53 | SAME | severity → view=counterparty, Pedestrian, Heavy transport vehicle or bus → died_per_1000 |
| 40 | Ch3 Beat 3.3 body | Train collisions: 297 cases and 17 deaths in nine years | 297 / 17 | 297 / 17 | SAME | severity → view=counterparty, All road users, Train → cases_1119, died_1119 |
| 41 | Ch3 Beat 3.3 title | Being hit by a truck or bus is the worst outcome for every road user | every road user | Heavy vehicle or bus is the highest published non-train rate for each of the five main road users (Car driver 16.5, Car passenger 18.9, Motorcyclist 15.2, Pedal cyclist 25.5, Pedestrian 52.7). Train collisions are higher for All road users (57.2) and Pedestrians (125.0) but rest on 17 and 14 deaths | CHANGED | severity → view=counterparty, publish_rate=TRUE → died_per_1000 ranked per road user. Note: Title needs 'apart from train collisions'. Bus occupant and Other or unknown also differ, but on very small counts |
| 42 | Ch3 Beat 3.3 notes | rates shown only where at least 100 cases and 10 deaths | 100 / 10 | publish_rate = TRUE on all rows with cases_1119 ≥ 100 and died_1119 ≥ 10 (rule check, 0 violations) | DERIVED | severity → view=counterparty, publish_rate vs cases_1119 / died_1119 |
| 43 | Ch4 Beat 4 standfirst | April 2020 had 2,357 road-crash admissions | 2,357 | 2,357 | SAME | ch4_monthly → month=April, All road users → 2020 |
| 44 | Ch4 Beat 4 standfirst | 32% fewer than April 2019 | 32% | 32% fewer | SAME | ch4_monthly → April, All road users → pct_2020_vs_2019 |
| 45 | Ch4 standfirst | the lowest month of the decade (2011–2021) | lowest | minimum of all 132 months, All road users = 2357 (April 2020) | DERIVED | ch4_monthly → month≠Year, All road users → 2011…2021 minimum |
| 46 | Ch4 Beat 4 standfirst | admissions fell for every main road user except cyclists | all fell but cyclists | April pct_2020_vs_2019: Car driver -42.9%, Car passenger -52.7%, Motorcyclist -37.5%, Pedal cyclist +15.9%, Pedestrian -59.8% | DERIVED | ch4_monthly → April → pct_2020_vs_2019 for the 5 main road users |
| 47 | Ch4 Beat 4 bullets | April to December 2020, cyclist admissions beat every same month of the previous five years | every month | 2020 value exceeds 2015–19 max for all 9 months (e.g. June 682 vs max 510) | DERIVED | ch4_monthly → Pedal cyclist, Apr–Dec → 2020 vs base_max (2015–19) |
| 48 | Ch4 Beat 4 bullets / 4.2 | Cyclist admissions rose 16% in April | 16% | 16% | SAME | ch4_monthly → April, Pedal cyclist → pct_2020_vs_2019 |
| 49 | Ch4 Beat 4.1 | annotation: 2,357 — lowest month of 2011–2021 | 2,357 | 2,357 | SAME | ch4_monthly → April, All road users → 2020 (repeat) |
| 50 | Ch4 Beat 4.1 | annotation: 682, up from 453 in June 2019 | 682 / 453 | 682 / 453 | SAME | ch4_monthly → June, Pedal cyclist → 2020 and 2019 |
| 51 | Ch4 Beat 4.1 title | April 2020: a third fewer crash admissions | a third (33%) | 32% fewer | DERIVED | ch4_monthly → April, All road users → -pct_2020_vs_2019 (32.4%). Note: Rounded to 'a third' (32.4%) |
| 52 | Ch4 Beat 4.1 body | That's 1,131 fewer than in April 2019 | 1,131 | 1,131 | DERIVED | ch4_monthly → April, All road users → 2019 − 2020 |
| 53 | Ch4 Beat 4.1 body | Pedestrian admissions fell by 60% | 60% | 60% fewer | SAME | ch4_monthly → April, Pedestrian → pct_2020_vs_2019 |
| 54 | Ch4 Beat 4.1 body | car passengers by 53% | 53% | 53% fewer | SAME | ch4_monthly → April, Car passenger → pct_2020_vs_2019 |
| 55 | Ch4 Beat 4.1 body | drivers by 43% | 43% | 43% fewer | SAME | ch4_monthly → April, Car driver → pct_2020_vs_2019 |
| 56 | Ch4 Beat 4.1 body | motorcyclists by 38% | 38% | 38% fewer | SAME | ch4_monthly → April, Motorcyclist → pct_2020_vs_2019 (stored -37.5, unrounded -37.52) |
| 57 | Ch4 Beat 4.2 body | June 2020 had 682, half as many again as June 2019 | half as many again | ratio 1.51 (682 ÷ 453) | DERIVED | ch4_monthly → June, Pedal cyclist → 2020 ÷ 2019 |
| 58 | Ch4 Beat 4.2 body | cyclist admissions went from 7,302 to 8,332 | 7,302 → 8,332 | 7,302 → 8,332 | SAME | ch4_monthly → month=Year, Pedal cyclist → 2019, 2020 |
| 59 | Ch4 Beat 4.2 body | up 14% | 14% | 14% | SAME | ch4_monthly → Year, Pedal cyclist → pct_2020_vs_2019 |
| 60 | Ch4 Beat 4.2 body | pedestrian admissions fell 22% | 22% | 22% fewer | DERIVED | ch4_monthly → Year, Pedestrian → 2020 ÷ 2019 − 1 (stored -22.5) |
| 61 | Ch4 Beat 4.2 body | car drivers 9% | 9% | 9% fewer | DERIVED | ch4_monthly → Year, Car driver → 2020 ÷ 2019 − 1 (stored -9.4) |
| 62 | Ch4 Beat 4.2 body | Riders aged 8 to 16 made up one in seven injured cyclists in 2019 | 1 in 7 | 1 in 7.0 | DERIVED | ch2_age_roaduser → 8-16, Pedal cyclist → 2019 ÷ sum of all ages 2019 (7,302) |
| 63 | Ch4 Beat 4.2 body | but almost a third of the 2020 increase | almost a third (~33%) | 29.8% (307 of 1,030) | DERIVED | ch2 → 8-16, Pedal cyclist: (2020−2019) ÷ all-ages (2020−2019) = 307 ÷ 1,030 |
| 64 | Ch4 Beat 4.3 body | projecting the 2011–2019 trend gives about 7,670 admissions for 2020 | 7,670 | 7,584 | CHANGED | ch4_monthly → Year, Pedal cyclist → trend_2020 (2019 × 2011–19 compound growth). A linear fit to 2011–19 gives 7,670, so the storyboard used a different method |
| 65 | Ch4 Beat 4.3 body | the real figure was 8,332 | 8,332 | 8,332 | SAME | ch4_monthly → Year, Pedal cyclist → 2020 |
| 66 | Ch4 Beat 4.3 body | That's 662 more than the trend | 662 | 748 | CHANGED | ch4_monthly → Year, Pedal cyclist → 2020 − trend_2020 |
| 67 | Ch4 Beat 4.3 body | that is within the normal year-to-year swing on its own | claim (no number) | - | NOT FOUND | No prediction band or year-to-year variability column in the processed files; the 95% prediction band in the storyboard is not in data/processed |
| 68 | Ch4 Beat 4.3 body | from April to December, every month came in above what the trend predicted | every month | 2020 > trend_2020 for all 9 months (smallest margin: April 773 vs 700) | DERIVED | ch4_monthly → Pedal cyclist, Apr–Dec → 2020 vs trend_2020 |
| 69 | Ch4 caveat | Victoria's rise July–December 2020, +40.5% | +40.5% | 40.5% | SAME | ch4_state_cyclists → half=Jul-Dec, state=Vic → pct_change |
| 70 | Ch4 caveat | the biggest state rise in cyclist admissions (Jul–Dec 2020, +40.5%) | Vic, +40.5% | Tas +40.7% (54 → 76); Vic +40.5% (1,010 → 1,419), largest absolute rise (+409) | CHANGED | ch4_state_cyclists → half=Jul-Dec → pct_change, 2019, 2020 for all states. Note: Tas has the largest % rise (on a small base); Vic has the largest absolute rise. Reword, e.g. 'the largest rise among the large states, in absolute terms' |
| 71 | Closing | more than 100 admissions a day in 2021 | more than 100 | 108.2 per day (39,505 ÷ 365) | DERIVED | ch1_trend → 2021 hosp ÷ 365 |
| 72 | Closing | cycling admissions rose faster than any other group's over the decade | fastest | 2011→2021 change (main road users): Pedal cyclist +51.4%, Car driver +21.7%, Motorcyclist +17.4%, Car passenger -7.4%, Pedestrian -15.3% | DERIVED | ch4_monthly → Year → 2021 ÷ 2011 − 1, main road users (road users only, not age groups) |
| 73 | Closing | more than doubled among people over 65 | more than doubled | 65+ combined 3-year averages ×2.39 | DERIVED | ch2 → Pedal cyclist 65-74 + 75+ (repeat of Ch2 check) |
| 74 | Closing | cyclist admissions rose again when the country locked down | rose | 2020 8,332 vs 2019 7,302 | DERIVED | ch4_monthly → Year, Pedal cyclist |
| 75 | Closing | about one in sixteen of those aged 75 and over doesn't come home | 1 in 16 | 1 in 16.3 | DERIVED | 1 ÷ (died_per_1000/1000), Pedestrian 75+ (repeat) |
| 76 | Ch5 headline | First Nations road injuries nearly doubled in a decade (+90%) | +90% | 90% | DERIVED | ch5_first_nations_trend → First Nations people → hosp 2021 ÷ 2011 − 1 |
| 77 | Ch5 headline | The rest of Australia's rose 15% | +15% | 15% | DERIVED | ch5_first_nations_trend → Non-Indigenous → hosp 2021 ÷ 2011 − 1 |
| 78 | Ch5 5.1 | First Nations people are about 3.8% of the population (June 2021) | 3.8% | 3.8% | DERIVED | ch5_first_nations_trend → First Nations people, 2021, `population` (983,709, ABS back-cast via data/supplementary/raw/abs_first_nations_population.csv) ÷ ch1_trend population 2021 (25,685,412) |
| 79 | Ch5 5.1 | but 5.6% of 2021 hospitalisations | 5.6% | 5.6% | DERIVED | ch5_first_nations_trend 2021 hosp ÷ ch1_trend hosp 2021 (national). Against FN + non-Indigenous (38,975) it is 5.7% |
| 80 | Ch5 §6 | population share 3.6% in 2011 | 3.6% | 3.6% | DERIVED | ch5_first_nations_trend → First Nations people, 2011, `population` (806,090) ÷ ch1_trend population 2011 (22,340,024) |
| 81 | Ch5 §6 | population growth of +22% | +22% | 22% | DERIVED | ch5_first_nations_trend → First Nations people → `population` 2021 ÷ 2011 − 1 (superseded 669,900 would give +47%) |
| 82 | Ch5 §6 | about +56% per person (First Nations) | +56% | 56% | DERIVED | ch5_first_nations_trend → First Nations people → `hosp_per_100k` 2021 ÷ 2011 − 1 (225.7 ÷ 144.8; KNIME-computed rate, 1 dp) |
| 83 | Ch5 5.2 | pedestrians about 12% of First Nations admissions | 12% | CHANGED: 11.0% (2016-21; was 12.1% pooled 2011-21) | CHANGED | ch5_first_nations_profile (now pooled 2016-21) → view=road_user, First Nations, Pedestrian → hosp ÷ sum of First Nations road-user rows (11,635; was 18,616). Same file: cyclists 10.9% (was 11.1%), car occupants 54.5% (was 54.3%) |
| 84 | Ch5 5.2 | vs about 7% for non-Indigenous | 7% | CHANGED: 6.3% (was 6.8%) | CHANGED | ch5_first_nations_profile → Non-Indigenous, Pedestrian → hosp ÷ sum of road-user rows (218,188; was 380,684). Same file: cyclists 19.7% (was 19.0%), car occupants 48.1% (was 48.2%). n.p. cells now 14 per group (was 31) |
| 85 | Ch5 5.3 | First Nations people account for about 38% of remote-area hospitalisations | 38% | CHANGED: 41.2% (was 38.3%; 2,767 of 6,716) | CHANGED | ch5_first_nations_profile → view=remoteness, Remote → FN hosp ÷ (FN + non-Indigenous Remote). Major Cities 2.7% (was 2.4%), Regional 7.1% (was 6.4%). Remoteness total FN 11,539 vs road-user total 11,635: difference 96 (unknown remoteness is excluded from the remoteness block; road-user block excludes n.p. cells) |
| 86 | Ch5 5.3 | remote residents stay longer | remote stays longer | FN: Remote 6.1 vs Major Cities 5.1 and Regional 5.4 (profile now 2016-21). Non-Indigenous: Remote 4.9 vs Regional 6.0, Major Cities 4.9. All people (severity, remoteness): Remote 5.4 vs Regional 6.0 | CHANGED | ch5_first_nations_profile → view=remoteness → avg_stay; severity → view=remoteness, All road users → avg_stay. Note: Holds for First Nations only. Reword: e.g. 'First Nations people in remote areas stay longest (6.1 days per survivor)' |
| 87 | Ch5 5.1 | indexed 2011 = 100: First Nations and non-Indigenous 2021 values | - | FN 190.2; non-Indigenous 114.9 | DERIVED | ch5_first_nations_trend → hosp 2021 ÷ 2011 × 100 |
| 88 | Ch5 §6 | ABS back-cast First Nations population 806,090 (2011), 898,515 (2016), 983,709 (2021) | 806,090 / 898,515 / 983,709 | same | CITED | data/supplementary/SOURCES.md (ABS; CC BY 4.0), not in processed files |
| 89 | Ch5 §6 | older 669,900 for 2011 is superseded | 669,900 | superseded | CITED | SOURCES.md; not used in the story |
| 90 | Ch5 §6 | Tas, not Vic, has the largest % rise (54 → 76 and 1,010 → 1,419) | Vic +40.5% | Tas 54 → 76 (+40.7%); Vic 1,010 → 1,419 (+40.5%) | CHANGED | ch4_state_cyclists → Jul-Dec → 2019, 2020, pct_change. Note: Same as the Ch4 caveat row above |

**Update 2026-11-27:** Chapter 5 per-100,000 rates are now a column of `ch5_first_nations_trend.csv` (`population`, `hosp_per_100k`, computed in KNIME; blank for years without an ABS First Nations estimate). First Nations 144.8 / 185.8 / 225.7 and non-Indigenous 148.6 / 157.5 / 148.8 (2011 / 2016 / 2021). The website reads them from that file.
