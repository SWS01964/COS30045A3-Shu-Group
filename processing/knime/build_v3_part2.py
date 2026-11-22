# =====================================================================================
# D. Supplementary data (ABS ERP + BITRE ARDD)          == supplementary_data.py
# =====================================================================================
gs = "D. Supplementary (population, deaths, rates)"
ERP = "ABS_ERP_Q_AUS_persons_2011Q2-2021Q2.csv"
ARDD = "ardd_fatalities.csv"
e0 = F.add("CSV Reader", "D1 Read ABS ERP (raw csv)", text=csv_reader_text(ERP), group=gs)
e1 = F.add("Row Filter", "D2 Persons, Australia", [e0], rowfilter_model([
    ("MEASURE", "EQ", "int", 1), ("SEX", "EQ", "int", 3), ("REGION", "EQ", "str", "AUS")]), group=gs)
e2 = F.add("String Manipulation", "D3 Quarter label", [e1], strman_model("q", "substr($TIME_PERIOD$, 5)", append=True), group=gs)
e3 = F.add("Row Filter", "D4 Q2 = 30 June", [e2], rowfilter_model([("q", "EQ", "str", "Q2")]), group=gs)
e4 = F.add("String Manipulation", "D5 Year text", [e3], strman_model("year", "substr($TIME_PERIOD$, 0, 4)", append=True), group=gs)
e5 = F.add("String to Number", "D6 Year -> integer", [e4], str2num_model(["year"]), group=gs)
# annual total
a1 = F.add("Row Filter", "D7 AGE = TOT", [e5], rowfilter_model([("AGE", "EQ", "str", "TOT")]), group=gs)
a2 = F.add("Column Renamer", "D8 erp_total", [a1], renamer_model([("OBS_VALUE", "erp_total")]), group=gs)
a3 = F.add("Column Filter", "D9 Keep year, erp_total", [a2], colfilter_model(["erp_total", "year"]), group=gs)
POPA = F.add("Column Resorter", "D10 Column order", [a3], resorter_model(["year", "erp_total"]), group=gs)
a5 = F.add("Constant Value Column", "D11 source_id", [POPA], const_model(
    "source_id", "ABS:ERP_Q(1.0.0) MEASURE=1 SEX=3 AGE=TOT REGION=AUS Q2 (30 June)"), group=gs)
F.writer(a5, "supp_population_annual", "D12 Write supp_population_annual", gs)
# single years of age -> bands
b1 = F.add("String to Number", "D13 AGE -> integer (TOT, A04.. -> missing)", [e5], str2num_model(["AGE"]), group=gs)
b2 = F.add("Row Filter", "D14 Single years 0-100 (drops 8599)", [b1], rowfilter_model([("AGE", "GTE", "int", 0), ("AGE", "LTE", "int", 100)]), group=gs)
b3 = F.add("Rule Engine", "D15 Age band", [b2], rule_model([
    '$AGE$ <= 7 => "0-7"', '$AGE$ <= 16 => "8-16"', '$AGE$ <= 25 => "17-25"', '$AGE$ <= 39 => "26-39"',
    '$AGE$ <= 64 => "40-64"', '$AGE$ <= 74 => "65-74"', 'TRUE => "75+"'], "age_group", append=True), group=gs)
b4 = F.add("GroupBy", "D16 Population by band x year", [b3], groupby_core(["year", "age_group"], [("OBS_VALUE", INT, "Sum")]), group=gs)
POPAGE = F.add("Column Renamer", "D17 erp", [b4], renamer_model([("OBS_VALUE", "erp")]), group=gs)
F.writer(POPAGE, "supp_population_age", "D18 Write supp_population_age", gs)
# deaths
d0 = F.add("CSV Reader", "D19 Read BITRE ARDD (raw csv)", text=csv_reader_text(ARDD), group=gs)
d1 = F.add("Row Filter", "D20 Years 2011-2021", [d0], rowfilter_model([("Year", "GTE", "int", 2011), ("Year", "LTE", "int", 2021)]), group=gs)
d2 = F.add("GroupBy", "D21 Fatalities per year", [d1], groupby_core(["Year"], [("Crash ID", INT, "Count")]), group=gs)
DEATHS = F.add("Column Renamer", "D22 year, road_deaths", [d2], renamer_model([("Year", "year"), ("Crash ID", "road_deaths")]), group=gs)
d4 = F.add("Constant Value Column", "D23 source_id", [DEATHS], const_model(
    "source_id", "BITRE ARDD ardd_fatalities.csv (Oct 2023), rows by Year"), group=gs)
F.writer(d4, "supp_road_deaths_annual", "D24 Write supp_road_deaths_annual", gs)
# idea1_rates
r1 = F.add("Joiner", "D25 Join population", [ANN, POPA], joiner_model(
    ["year"], ["year"], ["year", "hospitalisations", "series_break"], ["year", "erp_total"]), group=gs)
r2 = F.add("Joiner", "D26 Join deaths", [r1, DEATHS], joiner_model(
    ["year"], ["year"], ["year", "hospitalisations", "series_break", "erp_total"], ["year", "road_deaths"]), group=gs)
r3 = F.add("Math Formula", "D27 hosp per 100k", [r2], math_model("hosp_per_100k", "round(10.0 * $hospitalisations$ / $erp_total$ * 100000.0) / 10.0"), group=gs)
r4 = F.add("Math Formula", "D28 deaths per 100k", [r3], math_model("deaths_per_100k", "round(100.0 * $road_deaths$ / $erp_total$ * 100000.0) / 100.0"), group=gs)
r5 = F.add("Math Formula", "D29 hosp per death", [r4], math_model("hosp_per_death", "round(10.0 * $hospitalisations$ / $road_deaths$) / 10.0"), group=gs)
RATES = F.add("Column Resorter", "D30 Column order", [r5], resorter_model([
    "year", "hospitalisations", "erp_total", "hosp_per_100k", "road_deaths", "deaths_per_100k", "hosp_per_death", "series_break"]), group=gs)
F.writer(RATES, "idea1_rates", "D31 Write idea1_rates", gs)
# idea1_index_long
parts = []
for series, col in [("hospitalisations", "hospitalisations"), ("road_deaths", "road_deaths"), ("population", "erp_total")]:
    c1 = F.add("Constant Value Column", f"D32 series = {series}", [RATES], const_model("series", series), group=gs)
    c2 = F.add("Math Formula", f"D33 value ({series})", [c1], math_model("value", f"${col}$"), group=gs)
    c3 = F.add("Math Formula", f"D34 2011 base ({series})", [c2], math_model("index_2011", "if($year$ == 2011, $value$, 0)"), group=gs)
    c4 = F.add("Math Formula", f"D35 index 2011 = 100 ({series})", [c3], math_model(
        "index_2011", "round(1000.0 * $value$ / COL_SUM($index_2011$)) / 10.0", replace=True), group=gs)
    parts.append(F.add("Column Filter", f"D36 Keep long columns ({series})", [c4], colfilter_model(["year", "series", "value", "index_2011"]), group=gs))
cc = F.add("Concatenate", "D37 Stack series", [parts[0], parts[1]], concat_model(), group=gs)
cc = F.add("Concatenate", "D38 Stack series", [cc, parts[2]], concat_model(), group=gs)
F.writer(cc, "idea1_index_long", "D39 Write idea1_index_long", gs)
# idea2_age_population_change
p1 = F.add("Pivot", "D40 Years side by side", [POPAGE], pivot_model(["age_group"], ["year"], [("erp", DBL, "Sum")]), group=gs)
p2 = F.add("Column Renamer", "D41 erp_2011 / erp_2021", [p1], renamer_model([("2011", "erp_2011"), ("2021", "erp_2021")]), group=gs)
p3 = F.add("Math Formula", "D42 pct_change_single", [p2], math_model("pct_change_single", "round(1000.0 * ($erp_2021$ / $erp_2011$ - 1.0)) / 10.0"), group=gs)
p4 = F.add("Math Formula", "D43 avg 2011-13", [p3], math_model("erp_avg_2011_2013", "round(($erp_2011$ + $2012$ + $2013$) / 3.0)"), group=gs)
p5 = F.add("Math Formula", "D44 avg 2019-21", [p4], math_model("erp_avg_2019_2021", "round(($2019$ + $2020$ + $erp_2021$) / 3.0)"), group=gs)
p6 = F.add("Math Formula", "D45 pct_change_3yr", [p5], math_model("pct_change_3yr", "round(1000.0 * ($erp_avg_2019_2021$ / $erp_avg_2011_2013$ - 1.0)) / 10.0"), group=gs)
p7 = F.add("Column Filter", "D46 Keep output columns", [p6], colfilter_model([
    "age_group", "erp_2011", "erp_2021", "pct_change_single", "erp_avg_2011_2013", "erp_avg_2019_2021", "pct_change_3yr"]), group=gs)
F.writer(p7, "idea2_age_population_change", "D47 Write idea2_age_population_change", gs)
