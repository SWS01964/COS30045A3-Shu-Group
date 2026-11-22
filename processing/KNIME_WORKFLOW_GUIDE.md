# KNIME 5.5.1 Workflow Guide: rebuilding the national outputs

## Generated workflow (current: v2)

**Use v2.** Full instructions (open, import, run, headless, file-level editing, packaging, validation, pitfalls): `processing/KNIME_MANUAL.md`.

- Folder: `BeyondTheRoadToll_DataPrep_v2/` in the project root (the KNIME workspace). Portable package: `processing/knime/BeyondTheRoadToll_DataPrep_v2.knwf`. The national xlsx is bundled in the workflow's `data/` folder and all paths are relative to the workflow data area, so it runs on any machine after import.
- 28 nodes: the 9 v1 nodes (A load + Traffic filter, B missing to 0, D Idea 1 yearly index, E Idea 2 pedal cyclists 65-74) plus **F. Idea 3: severity** (died in care per 1,000 by road user 2011-19; share of cases vs share of bed days 2016-21) and **G. Idea 4: lockdown test** (April 2019 vs April 2020 by road user with a total row; pedal cyclists per year). Diagram: `report/figures/knime/knime_v2_workflow.png`.
- Saved unexecuted: open it from LOCAL (File > Refresh if KNIME was already open) or import the `.knwf`, then click Execute all. Outputs go to `BeyondTheRoadToll_DataPrep_v2/data/knime_*.csv` (not to `data/clean/`).
- Checkpoints: 2011 = 34,033 / 2021 = 39,505; cyclists 65-74 2011 = 240 / 2021 = 749; died per 1,000 pedestrian 21.8 (538 of 2,041 deaths), car passenger 7.3, car driver 5.8, motorcyclist 4.1, cyclist 1.9; pedestrians 6.6% of cases vs 13.1% of bed days; April 3,488 -> 2,357 (-32.4%), cyclists +15.9%; cyclists 7,302 (2019) -> 8,332 (2020). Headless-tested 2026-11-23: 59 PASS / 0 FAIL against Python (`processing/knime/v2_validation.csv`, script `processing/knime/validate_v2.py`).
- v1 (`BeyondTheRoadToll_DataPrep/`, `processing/knime/BeyondTheRoadToll_DataPrep.knwf`) is kept unchanged for reference. It uses absolute local paths and writes `data/clean/knime_idea1_check.csv` and `data/clean/knime_idea2_cyclist_65_74_check.csv`.
- The generated workflow is the short version only; the full workflow below is still the reference for the complete cleaning rules.

Goal: reproduce `data/clean/traffic_national_monthly_clean.csv` and `idea1_*` / `idea2_*` CSVs from `Datas/hospitalisation_injury_publication_sep2023.xlsx` in the KNIME GUI, then verify against the Python outputs. Every CHECKPOINT value below comes from `processing/clean_data.py`.

**Node naming.** KNIME 5.5 ships the newer **Expression** node (Nodes > Manipulation > Column > Transform), which can replace the legacy **Math Formula** and **String Manipulator** nodes. This guide names the Expression node first and the legacy node as the fallback; if "Expression" is not in your node repository, use the legacy node.

## Suggested layout

Use one metanode per stage, left to right, each with a coloured annotation ("A. Load and filter", "B. Clean", "C. Master export", "D. Idea 1", "E. Idea 2", "F. Compare with Python"):

```
[A Load+filter] -> [B Clean] -> [C Master CSV] -> [D Idea 1 tables] 
                                               \-> [E Idea 2 tables] 
Python CSVs -> [F Compare]
```

Name every node with the rule it implements (right-click > Edit Node Description > node label, e.g. "R2 Traffic only").

## A. Load and filter (R1, R2)

1. **Excel Reader** (Node: "Excel Reader (XLS)"). Source file: the national workbook. Sheet: `raw`. Row ID: none. Enable "Table contains column names in row number 1". Let KNIME guess types.
   CHECKPOINT: 117,919 rows x 13 columns. `Calendar year` Integer; `Count of cases`, `Died_cases`, `Died_bed_days` read as Double (they contain missing cells).
2. **Row Filter** (Node: "Row Filter"). Include rows by attribute value: column `Cause of injury`, pattern matching, value `Traffic` (exact match, no wildcard). (R2)
   CHECKPOINT: **86,140 rows**.
3. **Expression** (legacy: **String Manipulator**) for trimming (R4): for each text column (Month, ABS remoteness area, Age group, Sex, Road user, Counterparty) replace the column with `strip($col$)`. The current data contain no padding, so the row count does not change; the node documents that the rule was applied.

## B. Clean (R3, R4, R5, R6, R7)

4. **Column Renamer** (R3, R4). Calendar year -> year, Month -> month, ABS remoteness area -> remoteness, Age group -> age_group, Sex -> sex, Road user -> road_user, Counterparty -> counterparty, Count of cases -> cases_incl_died, Bed days -> bed_days, Died_cases -> died_cases, Died_bed_days -> died_bed_days, Hospitalisations -> hospitalisations. Drop `Cause of injury` later in step 12.
5. **Missing Value** (R5). Number (integer) and Number (double) tabs: for `cases_incl_died`, `died_cases`, `died_bed_days` choose "Fix Value" = 0 (use the column-specific settings tab, not the default type-wide tab).
   CHECKPOINT: before the node, missing counts are 4,578 (cases_incl_died), 84,142 (died_cases), 83,854 (died_bed_days); after it there are none. Convert the three columns back to Integer with **Double to Int** (Column Type Conversions: "Number to Int" if available).
   CHECK: Row Filter on `cases_incl_died != hospitalisations + died_cases` should return **0 rows** (use Rule-based Row Filter: `$cases_incl_died$ != $hospitalisations$ + $died_cases$ => TRUE`).
6. **Rule Engine** x3 for unknowns (R4), one per column, replace column:
   * remoteness: `$remoteness$ = "Missing" => "Unknown"` and `TRUE => $remoteness$`
   * age_group: `$age_group$ = "Missing" => "Unknown"` and `TRUE => $age_group$`
   * sex: `$sex$ = "intersex or indeterminate or missing" => "Unknown"` and `TRUE => $sex$`
   CHECKPOINT (GroupBy, count): remoteness Unknown = 6,645 rows; age_group Unknown = 1 row; sex Unknown = 15 rows.
7. **Rule Engine** for month_num (R4): `$month$ = "January" => 1` ... `$month$ = "December" => 12` (12 rules; set output type to Integer). Alternative: Table Creator holding month/month_num + **Cell Replacer**.
8. **Math Formula** or **Expression** (R7): new column `bed_days_excl_died` = `$bed_days$ - $died_bed_days$` (Integer). 
   CHECKPOINT: column sum = **2,007,387** (bed_days 2,018,891 minus died_bed_days 11,504); no negative values.
9. **Rule Engine** for series_break (R6), output String:
   `$year$ = 2011 => "pre_vic_2012_change"`, `$year$ >= 2017 => "post_nsw_2017_change"`, `TRUE => ""`.
   KNIME writes empty strings as empty cells in CSV; that matches Python.
10. **Column Filter** to the final order (drop Cause of injury; order columns: year, month_num, month, remoteness, age_group, sex, road_user, counterparty, hospitalisations, cases_incl_died, died_cases, bed_days, died_bed_days, bed_days_excl_died, series_break). Use **Column Resorter** if needed.

## C. Master export

11. **Sorter**: year, month_num, remoteness, age_group, sex, road_user, counterparty (ascending). 
12. **CSV Writer** to `traffic_national_monthly_clean_knime.csv` (do NOT overwrite the Python file). Settings: separator comma, write column header, do not write row ID, quote only when needed (Quote Mode: "Quote only when needed"), encoding UTF-8.
    CHECKPOINT (86,140 rows x 15 columns): sums hospitalisations **410,884**, cases_incl_died **413,013**, died_cases **2,129**, bed_days 2,018,891, died_bed_days 11,504.

## D. Idea 1 tables (R3, R6, R7)

13. **GroupBy** (group: `year`; aggregations: Sum of hospitalisations, cases_incl_died, died_cases, bed_days_excl_died; column naming "Keep original name(s)").
   CHECKPOINT: 11 rows; 2011 = 34,033; 2012 = 34,024; 2013 = 35,001; 2014 = 35,515; 2015 = 37,082; 2016 = 38,963; 2017 = 39,339; 2018 = 39,590; 2019 = 39,866; 2020 = 37,966; 2021 = 39,505 (these equal published T1). died_cases 2020 = 88, 2021 = 0.
14. **Math Formula / Expression**: `index_2011 = round(100 * $hospitalisations$ / 34033, 1)`. (Or Column Aggregator + Joiner with the 2011 value to avoid a hard-coded constant.) CHECKPOINT: 2016 = 114.5; 2019 = 117.1; 2021 = 116.1.
15. Re-attach `series_break` (Rule Engine on year, as step 9), then **Column Resorter** to year, hospitalisations, index_2011, cases_incl_died, died_cases, bed_days_excl_died, series_break. **CSV Writer** -> `idea1_national_annual_knime.csv`. CHECKPOINT: 11 x 7; bed_days_excl_died 2016 = 217,765.
16. Monthly: **GroupBy** (group: year, month_num; Sum hospitalisations), then **Expression** (legacy **String Manipulator**) to build `date` as text `YYYY-MM-01`: year, a zero-padded month_num, and "-01" (legacy: `join($year$, "-", substr(join("0", $month_num$), length(join("0", $month_num$)) - 2, 2), "-01")`). Optionally convert with **String to Date&Time** (format `yyyy-MM-dd`, date only) and write as text. CHECKPOINT: 132 rows; Jan 2011 = 2,657; Feb 2011 = 2,597; April 2019 = 3,488; April 2020 = 2,357; column sum 410,884.

## E. Idea 2 tables (R3, R4, R7, R8, R9)

17. **Row Filter** (two criteria, AND): `road_user` in {Car driver, Car passenger, Motorcyclist, Pedal cyclist, Pedestrian} (use Rule-based Row Filter: `$road_user$ IN ("Car driver","Car passenger","Motorcyclist","Pedal cyclist","Pedestrian") AND $age_group$ IN ("0-7","8-16","17-25","26-39","40-64","65-74","75+") => TRUE`). 
    CHECKPOINT: hospitalisations sum = **384,520**.
18. **GroupBy** (road_user, age_group, year; Sum hospitalisations). CHECKPOINT: fewer than 385 rows (absent combinations are missing). To get the full 385-row grid with zeros: **Table Creator**/**Cross Joiner** of road users x age bands x years, **Left Outer Join** the GroupBy result, then **Missing Value** -> 0. CHECKPOINT: **385 rows**; Car driver 0-7 2011 = 0, 2012 = 2. **CSV Writer** -> `idea2_roaduser_age_annual_knime.csv`.
19. Heatmap: **Pivoting** (group: road_user, age_group; pivot: year; aggregate hospitalisations Sum; missing -> 0) giving columns 2011 ... 2021 (named `2011+Sum(hospitalisations)`; rename with Column Renamer/Regex). Then **Expression / Math Formula** nodes:
    * `abs_change = $hosp_2021$ - $hosp_2011$`
    * `pct_change = $hosp_2011$ = 0 ? missing : round(100*($hosp_2021$-$hosp_2011$)/$hosp_2011$, 1)`
    * `avg_2011_2013 = round(($2011$+$2012$+$2013$)/3, 1)`; `avg_2019_2021` likewise; `pct_change_3yr = 100*(avg1921-avg1113)/avg1113` computed from unrounded means, rounded to 1 dp.
    * `low_count = $hosp_2011$ < 30 OR $hosp_2021$ < 30` (R9; Rule Engine to "true"/"false", or Expression with boolean output)
    CHECKPOINT (35 rows): Pedal cyclist 65-74: 240 -> 749, +212.1%; 75+: 87 -> 285, +227.6%; Motorcyclist 65-74: 161 -> 402, +149.7%; Car driver 0-7: pct_change empty; low_count = true only for Car driver 0-7 and Motorcyclist 0-7 (2 rows).
20. Age severity (R7, R8): from the step-9 table filter `age_group` in the 7 bands.
    * Branch 1: **Row Filter** `year >= 2016` -> **GroupBy** age_group (Sum hospitalisations, Sum bed_days_excl_died) -> **Math Formula** `avg_stay_days_2016_2021 = round($bd$/$h$, 1)`.
    * Branch 2: **Row Filter** `year <= 2019` -> **GroupBy** age_group (Sum cases_incl_died, Sum died_cases) -> **Math Formula** `died_per_1000 = round(1000*$died$/$cases$, 1)`.
    * **Joiner** on age_group, then order the 7 bands with a Rule Engine sort key + **Sorter**. 
    CHECKPOINT: 75+: hosp 14,664; bed_days_excl_died 162,270; avg stay **11.1**; cases 21,184; died 596; **28.1** per 1,000. 65-74: 17,195 / 137,345 / 8.0 / 22,496 / 222 / 9.9. 26-39: 56,961 / 245,674 / 4.3 / 81,156 / 286 / 3.5. 

## F. Compare with Python CSVs

21. **CSV Reader** each Python file (`data/clean/*.csv`) and the matching KNIME file. 
22. **Table Difference Checker** (reference = Python CSV, test = KNIME table; compare by row key if rows are in the same order, else sort both first with Sorter). Or: **Joiner** on all key columns then **Rule-based Row Filter** `$hospitalisations$ != $hospitalisations (Right)$ => TRUE`; the result must have 0 rows. Add a **Row Counter** to check equal row counts.
    CHECKPOINT: all six comparisons show identical row counts (86,140 / 11 / 132 / 385 / 35 / 7) and zero differing cells. Rounded columns may differ in the last digit due to rounding mode; allow +/- 0.1.
23. Optional **Statistics** or **GroupBy** on both sides for the totals in the checkpoints above.

## Notes for state and First Nations files (later chapters)

Each `raw` sheet holds five tables side by side separated by empty columns, with block titles on row 1 and headers on row 2.
* Use one **Excel Reader** per block with "Read from: sheet `raw`", column range (Excel Reader > Advanced settings > "Read only part of the sheet"): state blocks A:F, H:N, P:V, X:AD, AF:AL; First Nations blocks A:G, I:O, Q:W, Y:AE, AG:AM (verify by opening the sheet: blocks start at each "Calendar year" header; Python found them at 0-based column 0, 8, 16, 24, 32 for First Nations and 0, 7, 15, 23, 31 for state). Header row 2, skip row 1 ("Start reading at row 2").
* Column "n.p." makes numeric columns read as String: use **String to Number** with "Fail on error" off, then a **Rule Engine** to set `suppressed = $col$ = "n.p."` before the conversion.
* Row Filter `cause of injury = traffic` is not needed (all rows are Traffic). First Nations block 3 is an exact duplicate of block 1.
* Compare with `data/clean/state_*.csv` and `first_nations_*.csv`; expected rows: state 176 / 1,371 / 352 / 1,232 / 704; First Nations 264 / 351 / 264 / 132 / 176.

## Honesty note for documentation

All numbers are counts of hospitalisations (not rates). Bed-day figures cover 2016-2021 only; mortality 2011-2019 only. Cite the R7 test (EDA_REPORT section 7) when describing `bed_days_excl_died`.
