# Validation of the KNIME workflow

Date: 2026-11-27. KNIME 5.5.1, workflow `knime/BeyondTheRoadToll/` (also zipped as `knime/BeyondTheRoadToll.knwf`, 8.5 MB), run headless with save (executed state kept).

## How it was validated
1. Two independent implementations: the KNIME workflow (built by `processing/knime/build_workflow.py`) and a pandas reference (`processing/reference/reference_outputs.py`, outputs in `data/reference/`). `processing/knime/compare.py` compares the 7 output files cell by cell (matched by column name).
2. Anchors independent of both: published totals in the BITRE and First Nations source tables.

## Output files (KNIME vs reference)
| File | Rows | Columns | Result | Max abs diff |
|---|---|---|---|---|
| ch1_trend.csv | 11 | 10 | PASS | 0 |
| ch2_age_roaduser.csv | 35 | 20 | PASS | 0 |
| ch4_monthly.csv | 169 | 19 | PASS | 0 |
| ch4_state_cyclists.csv | 16 | 5 | PASS | 0 |
| ch5_first_nations_profile.csv | 22 | 7 | PASS | 0 |
| ch5_first_nations_trend.csv | 22 | 6 | PASS | 0 |
| severity.csv | 280 | 13 | PASS | 0 |

(Max abs diff over numeric columns after sorting both files by their key columns; all values are identical.)

## Change log
2026-11-27: Ch5 profile now pooled 2016-21 for both views (two Row Filter "2016-21 only" nodes added at the start of the road-user and remoteness branches, `year >= 2016`; BITRE changed bed-day counting from 1 July 2015). Reference script changed the same way. All 7 files still PASS; trend file unchanged.

2026-11-27 (later): Ch5 trend now carries `population` and `hosp_per_100k`. Added 8 nodes to Ch5 (First Nations population CSV Reader, All ages Row Filter, Joiner, Math non-Indigenous population, left Joiner onto the trend, Rule Engine population by status, Math rate, Column Filter); Ch5 now takes the shared population table. New input `data/supplementary/raw/abs_first_nations_population.csv` (ABS back-cast 806,090 / 898,515 / 983,709). Rates: First Nations 144.8 / 185.8 / 225.7, non-Indigenous 148.6 / 157.5 / 148.8 (2011 / 2016 / 2021), blank for other years. Reference script changed the same way. All 7 files PASS.

## Anchors
- National annual `hosp` in `ch1_trend.csv` equals BITRE Table 1 (`T1`, sep2023 xlsx), all 11 years, exactly (34,033 ... 39,505).
- `ch5_first_nations_trend.csv`: First Nations and Non-Indigenous annual totals equal the First Nations file `T1` (calendar-year table with First Nations, Non-Indigenous and Total columns), all 11 years, exactly.

## Node counts (native nodes, from settings.xml)
Top-level clean-up 5; Population and road deaths 10; Ch1 9; Ch2 14; Ch3 26; Ch4 20; Ch5 28. Total 112 native nodes plus 6 metanodes.

## KNIME warnings in the final run (all harmless)
- String to Number, column `hosp` (124 rows) and column `cases` (370 rows): the source uses "n.p." (not published) for suppressed cells. These become missing values on purpose and are excluded or treated as missing downstream, as in the reference.

## Bugs found by cross-checking
- KNIME: age band 8-16 regex `(8|1[0-6])` missed age 9. Fixed to `(8|9|1[0-6])`. The reference was already correct for 8-16.
- Reference: ABS age code 8599 ("85 and over" aggregate) passed `isdigit()` and was added to 75+, double counting (2021 75+ = 1,886,917 correct, reference had more). `band()` now drops any numeric age above 100. KNIME already excluded it.
- KNIME `round()` rounds halves to even, the reference rounds half-up; Ch3 uses `floor(x+0.5)`. No further rounding differences appeared.

Reference values changed after the fix (ch2_age_roaduser.csv, 75+ rows only, 5 road users): `pop_2011_13` 1,858,845 -> 1,438,215; `pop_2019_21` 2,334,389 -> 1,813,998; `rate_change_3yr` (e.g. Car driver 7.2 -> 6.7, Pedestrian -35.0 -> -35.3). No other reference file changed.

## Known cosmetic issues
- Column order in `severity.csv` and `ch4_monthly.csv` differs from the contract order; `compare.py` matches by name, so it does not affect the result.
