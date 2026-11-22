"""Build BeyondTheRoadToll_DataPrep_v3: KNIME replacement for clean_data.py + supplementary_data.py + phase2_ideas.py.

Usage: python build_v3.py <out_dir>
Writes an UNEXECUTED, portable workflow folder (readers/writers relative to the workflow data area).
Only standard KNIME nodes; no scripting nodes.
"""
import re
import shutil
import sys
from pathlib import Path

from v3lib import *  # noqa

OUT = Path(sys.argv[1])
DATAS = ROOT / "Datas"
SUPP = ROOT / "data" / "supplementary" / "raw"
F_NAT = "hospitalisation_injury_publication_sep2023.xlsx"
F_STATE = "state-and-territory-hospitalisation-injury-publication-2023.xlsx"
F_FN = "First-Nations-hospitalised-injuries-2023.xlsx"

AGE = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"]
MAIN = ["Car driver", "Car passenger", "Motorcyclist", "Pedal cyclist", "Pedestrian"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
          "November", "December"]
F = Flow()
DBL, INT, STR = "DoubleCell", "IntCell", "StringCell"


def colletter(i):
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def orfilter(col, values):
    return rowfilter_model([(col, "EQ", "str", v) for v in values], match="OR")


# =====================================================================================
# A. National raw -> clean master table (R1-R6)         == clean_data.load_national
# =====================================================================================
g = "A. Load + clean national (R1-R6)"
rd = F.add("Excel Reader", "A1 Read national raw (R1)", text=excel_reader_text(F_NAT, "raw", "A", "", 1, 1), group=g)
tf = F.add("Row Filter", "A2 Traffic only (R2)", [rd], rowfilter_model([("Cause of injury", "EQ", "str", "Traffic")]), group=g)
mv = F.add("Missing Value", "A3 NaN -> 0 (R5)", [tf], text=template("Missing Value"), group=g)
rn = F.add("Column Renamer", "A4 Rename columns (R3)", [mv], renamer_model([
    ("Calendar year", "year"), ("Month", "month"), ("ABS remoteness area", "remoteness"), ("Age group", "age_group"),
    ("Sex", "sex"), ("Road user", "road_user"), ("Counterparty", "counterparty"), ("Count of cases", "cases_incl_died"),
    ("Bed days", "bed_days"), ("Died_cases", "died_cases"), ("Died_bed_days", "died_bed_days"),
    ("Hospitalisations", "hospitalisations")]), group=g)
x = rn
for c in ["month", "road_user", "counterparty"]:
    x = F.add("String Manipulation", f"A5 Trim {c} (R4)", [x], strman_model(c, f"strip(${c}$)"), group=g)
for c in ["remoteness", "age_group", "sex"]:
    x = F.add("String Manipulation", f"A5 Trim + Unknown {c} (R4)", [x], strman_model(
        c, f'regexReplace(strip(${c}$), "^(Missing|intersex or indeterminate or missing)$", "Unknown")'), group=g)
x = F.add("Rule Engine", "A6 month_num (R4)", [x], rule_model(
    [f'$month$ = "{m}" => {i}' for i, m in enumerate(MONTHS, 1)], "month_num", append=True), group=g)
x = F.add("Math Formula", "A7 bed_days_excl_died (R7)", [x], {**math_model("bed_days_excl_died", "$bed_days$ - $died_bed_days$"),
          "convert_to_int": B(True)}, group=g)
x = F.add("Rule Engine", "A8 series_break (R6)", [x], rule_model(
    ['$year$ = 2011 => "pre_vic_2012_change"', '$year$ >= 2017 => "post_nsw_2017_change"', 'TRUE => ""'],
    "series_break", append=True), group=g)
TCOLS = ["year", "month_num", "month", "remoteness", "age_group", "sex", "road_user", "counterparty",
         "hospitalisations", "cases_incl_died", "died_cases", "bed_days", "died_bed_days", "bed_days_excl_died",
         "series_break"]
x = F.add("Column Filter", "A9 Drop Cause of injury", [x], colfilter_model(TCOLS), group=g)
T = F.add("Column Resorter", "A10 Column order", [x], resorter_model(TCOLS), group=g)
srt = F.add("Sorter", "A11 Sort", [T], sorter_model(["year", "month_num", "remoteness", "age_group", "sex",
                                                       "road_user", "counterparty"]), group=g)
F.writer(srt, "traffic_national_monthly_clean", "A12 Write traffic_national_monthly_clean", g)

# =====================================================================================
# B. Idea 1 / Idea 2 tables from clean_data.build_outputs
# =====================================================================================
g = "B. National tables (Idea 1, 2)"
ga = F.add("GroupBy", "B1 Annual totals", [T], groupby_core(["year"], [
    ("hospitalisations", INT, "Sum"), ("cases_incl_died", INT, "Sum"), ("died_cases", INT, "Sum"),
    ("bed_days_excl_died", INT, "Sum"), ("series_break", STR, "First")]), group=g)
ix = F.add("Math Formula", "B2 2011 base", [ga], math_model("index_2011", "if($year$ == 2011, $hospitalisations$, 0)"), group=g)
ix = F.add("Math Formula", "B3 Index 2011 = 100", [ix], math_model(
    "index_2011", "round(1000.0 * $hospitalisations$ / COL_SUM($index_2011$)) / 10.0", replace=True), group=g)
ANN = F.add("Column Resorter", "B4 Column order", [ix], resorter_model(
    ["year", "hospitalisations", "index_2011", "cases_incl_died", "died_cases", "bed_days_excl_died", "series_break"]), group=g)
F.writer(ANN, "idea1_national_annual", "B5 Write idea1_national_annual", g)

gm = F.add("GroupBy", "B6 Monthly totals", [T], groupby_core(["year", "month_num"], [("hospitalisations", INT, "Sum")]), group=g)
dm = F.add("Math Formula", "B7 copy year", [gm], math_model("y2", "$year$", to_int=True), group=g)
dm = F.add("Math Formula", "B7 copy month_num", [dm], math_model("m2", "$month_num$", to_int=True), group=g)
dm = F.add("Number to String", "B7 numbers to text", [dm], num2str_model(["y2", "m2"]), group=g)
dm = F.add("String Manipulation", "B7 date", [dm], strman_model(
    "date", 'join($y2$, "-", substr(join("0", $m2$), length(join("0", $m2$)) - 2), "-01")', append=True), group=g)
dm = F.add("Column Filter", "B7 Keep output columns", [dm], colfilter_model(["year", "month_num", "date", "hospitalisations"]), group=g)
dm = F.add("Column Resorter", "B8 Column order", [dm], resorter_model(["year", "month_num", "date", "hospitalisations"]), group=g)
F.writer(dm, "idea1_national_monthly", "B9 Write idea1_national_monthly", g)

# idea2_roaduser_age_annual (complete grid)
f1 = F.add("Row Filter", "B10 Five main road users", [T], orfilter("road_user", MAIN), group=g)
f2 = F.add("Row Filter", "B11 Seven age bands", [f1], orfilter("age_group", AGE), group=g)
gr = F.add("GroupBy", "B12 By road user x age x year", [f2], groupby_core(["road_user", "age_group", "year"], [("hospitalisations", INT, "Sum")]), group=g)
d1 = F.add("GroupBy", "B13 Distinct road users", [f2], groupby_core(["road_user"], []), group=g)
d2 = F.add("GroupBy", "B14 Distinct age bands", [f2], groupby_core(["age_group"], []), group=g)
d3 = F.add("GroupBy", "B15 Distinct years", [f2], groupby_core(["year"], []), group=g)
c1 = F.add("Cross Joiner", "B16 Road user x age", [d1, d2], crossjoin_model(), group=g)
c2 = F.add("Cross Joiner", "B17 x year (complete grid)", [c1, d3], crossjoin_model(), group=g)
jn = F.add("Joiner", "B18 Left join counts", [c2, gr], joiner_model(
    ["road_user", "age_group", "year"], ["road_user", "age_group", "year"], ["road_user", "age_group", "year"], ["hospitalisations"], mode="left"), group=g)
GRID = F.add("Missing Value", "B19 Absent combination = 0", [jn], model=missing_fixed_double_model(["hospitalisations"]), group=g)
F.writer(GRID, "idea2_roaduser_age_annual", "B20 Write idea2_roaduser_age_annual", g)

# idea2_heatmap_change
pv = F.add("Pivot", "B21 Years side by side", [GRID], pivot_model(["road_user", "age_group"], ["year"], [("hospitalisations", DBL, "Sum")]), group=g)
hm = F.add("Column Renamer", "B22 hosp_2011 / hosp_2021", [pv], renamer_model([("2011", "hosp_2011"), ("2021", "hosp_2021")]), group=g)
hm = F.add("Math Formula", "B23 abs_change", [hm], math_model("abs_change", "$hosp_2021$ - $hosp_2011$"), group=g)
hm = F.add("Math Formula", "B24 pct_change", [hm], math_model("pct_change", "round(1000.0 * $abs_change$ / $hosp_2011$) / 10.0"), group=g)
hm = F.add("Rule Engine", "B25 pct_change only if base > 0", [hm], rule_model(["$hosp_2011$ > 0 => $pct_change$"], "pct_change"), group=g)
hm = F.add("Math Formula", "B26 avg_2011_2013", [hm], math_model("avg_2011_2013", "round(10.0 * ($hosp_2011$ + $2012$ + $2013$) / 3.0) / 10.0"), group=g)
hm = F.add("Math Formula", "B27 avg_2019_2021", [hm], math_model("avg_2019_2021", "round(10.0 * ($2019$ + $2020$ + $hosp_2021$) / 3.0) / 10.0"), group=g)
hm = F.add("Math Formula", "B28 pct_change_3yr", [hm], math_model(
    "pct_change_3yr", "round(1000.0 * (($2019$ + $2020$ + $hosp_2021$) - ($hosp_2011$ + $2012$ + $2013$)) / ($hosp_2011$ + $2012$ + $2013$)) / 10.0"), group=g)
hm = F.add("Rule Engine", "B29 3yr only if base > 0", [hm], rule_model(["$avg_2011_2013$ > 0 => $pct_change_3yr$"], "pct_change_3yr"), group=g)
hm = F.add("Rule Engine", "B30 low_count (R9)", [hm], rule_model(
    ['$hosp_2011$ < 30 OR $hosp_2021$ < 30 => "True"', 'TRUE => "False"'], "low_count", append=True), group=g)
HMC = ["road_user", "age_group", "hosp_2011", "hosp_2021", "abs_change", "pct_change", "avg_2011_2013", "avg_2019_2021",
       "pct_change_3yr", "low_count"]
hm = F.add("Column Filter", "B31 Keep output columns", [hm], colfilter_model(HMC), group=g)
HEAT = F.add("Column Resorter", "B32 Column order", [hm], resorter_model(HMC), group=g)
F.writer(HEAT, "idea2_heatmap_change", "B33 Write idea2_heatmap_change", g)

# idea2_age_severity
fa = F.add("Row Filter", "B34 Known age bands", [T], orfilter("age_group", AGE), group=g)
fy1 = F.add("Row Filter", "B35 Years 2016-2021 (R7)", [fa], rowfilter_model([("year", "GTE", "int", 2016)]), group=g)
fy2 = F.add("Row Filter", "B36 Years 2011-2019 (R8)", [fa], rowfilter_model([("year", "LTE", "int", 2019)]), group=g)
s1 = F.add("GroupBy", "B37 Hosp + bed days by age", [fy1], groupby_core(["age_group"], [("hospitalisations", INT, "Sum"), ("bed_days_excl_died", INT, "Sum")]), group=g)
s2 = F.add("GroupBy", "B38 Cases + deaths by age", [fy2], groupby_core(["age_group"], [("cases_incl_died", INT, "Sum"), ("died_cases", INT, "Sum")]), group=g)
sj = F.add("Joiner", "B39 Join by age", [s1, s2], joiner_model(["age_group"], ["age_group"], ["age_group", "hospitalisations", "bed_days_excl_died"], ["cases_incl_died", "died_cases"]), group=g)
sj = F.add("Column Renamer", "B40 Period suffixes", [sj], renamer_model([
    ("hospitalisations", "hosp_2016_2021"), ("bed_days_excl_died", "bed_days_excl_died_2016_2021"),
    ("cases_incl_died", "cases_2011_2019"), ("died_cases", "died_2011_2019")]), group=g)
sj = F.add("Math Formula", "B41 avg stay (days)", [sj], math_model("avg_stay_days_2016_2021", "round(10.0 * $bed_days_excl_died_2016_2021$ / $hosp_2016_2021$) / 10.0"), group=g)
sj = F.add("Math Formula", "B42 died per 1,000 (R8)", [sj], math_model("died_per_1000_2011_2019", "round(10000.0 * $died_2011_2019$ / $cases_2011_2019$) / 10.0"), group=g)
SEV = F.add("Column Resorter", "B43 Column order", [sj], resorter_model([
    "age_group", "hosp_2016_2021", "bed_days_excl_died_2016_2021", "avg_stay_days_2016_2021", "cases_2011_2019",
    "died_2011_2019", "died_per_1000_2011_2019"]), group=g)
F.writer(SEV, "idea2_age_severity", "B44 Write idea2_age_severity", g)

# =====================================================================================
# C. State and First Nations side-by-side blocks (R11)
# =====================================================================================
g = "C. Block parsing (R11)"
STATE_MAP = {"calendar year": "year", "6-monthly": "half_year", "count of cases excluding died in hospitals within 30 days": "cases_excl_died",
             "bed days excluding died in hospitals within 30 days": "bed_days_excl_died", "state or territory": "state",
             "state or territory ": "state", "road user": "road_user", "sex": "sex", "age group": "age_group", "counterparty": "counterparty"}
FN_MAP = {"Calendar year": "year", "6-monthly": "half_year", "First Nations status": "first_nations_status", "Age group": "age_group",
          "Road user": "road_user", "ABS remoteness area": "remoteness", "Counterparty": "counterparty", "Hospitalisations": "hospitalisations",
          "Bed days excluding died in hospitals within 30 days": "bed_days_excl_died"}
# (file, prefix, name, first col idx, last col idx, headers, type-of-numeric cols, unknown-mapped column)
STATE_BLOCKS = [
    ("by_state", 0, 5, ["calendar year", "6-monthly", "cause of injury = traffic", "count of cases excluding died in hospitals within 30 days", "bed days excluding died in hospitals within 30 days", "state or territory"], False, None),
    ("by_road_user", 7, 13, ["calendar year", "6-monthly", "cause of injury = traffic", "road user", "count of cases excluding died in hospitals within 30 days", "bed days excluding died in hospitals within 30 days", "state or territory"], True, None),
    ("by_sex", 15, 21, ["calendar year", "6-monthly", "cause of injury = traffic", "sex", "count of cases excluding died in hospitals within 30 days", "bed days excluding died in hospitals within 30 days", "state or territory"], False, "sex"),
    ("by_age", 23, 29, ["calendar year", "6-monthly", "cause of injury = traffic", "age group", "count of cases excluding died in hospitals within 30 days", "bed days excluding died in hospitals within 30 days", "state or territory"], True, "age_group"),
    ("by_counterparty", 31, 37, ["calendar year", "6-monthly", "cause of injury = traffic", "counterparty", "count of cases excluding died in hospitals within 30 days", "bed days excluding died in hospitals within 30 days", "state or territory"], False, None),
]
FN_H = ["Calendar year", "6-monthly", "Cause of injury = traffic", "First Nations status"]
FN_T = ["Hospitalisations", "Bed days excluding died in hospitals within 30 days"]
FN_BLOCKS = [
    ("by_age", 0, 6, FN_H + ["Age group"] + FN_T, True, "age_group"),
    ("by_road_user", 8, 14, FN_H + ["Road user"] + FN_T, True, None),
    ("by_age_2", 16, 22, FN_H + ["Age group"] + FN_T, True, "age_group"),
    ("by_remoteness", 24, 30, FN_H + ["ABS remoteness area"] + FN_T, False, "remoteness"),
    ("by_counterparty", 32, 38, FN_H + ["Counterparty"] + FN_T, False, None),
]


BLK = {}


def block_branch(fname, prefix, mp, spec, numcols):
    name, c0, c1, headers, has_np, unk = spec
    r = F.add("Excel Reader", f"C Read {prefix}_{name} (R11)", text=excel_reader_text(
        fname, "raw", colletter(c0), colletter(c1), 2, 2, skip_empty_rows=True), group=g)
    cause = [h for h in headers if h.lower().startswith("cause of injury")][0]
    keep = [h for h in headers if h != cause]
    x = F.add("Column Filter", "C Drop cause of injury (all Traffic)", [r], colfilter_model(keep), group=g)
    x = F.add("Column Renamer", "C Short column names", [x], renamer_model([(h, mp[h]) for h in keep]), group=g)
    if unk:
        x = F.add("String Manipulation", f"C Trim + Unknown {unk} (R4)", [x], strman_model(
            unk, f'regexReplace(strip(${unk}$), "^(Missing|intersex or indeterminate or missing)$", "Unknown")'), group=g)
    if has_np:
        c_a, c_b = [mp[h] for h in keep if mp[h] in numcols]
        x = F.add("Rule Engine", "C suppressed flag (n.p.)", [x], rule_model(
            [f'${c_a}$ = "n.p." OR ${c_b}$ = "n.p." => "True"', 'TRUE => "False"'], "suppressed", append=True), group=g)
        x = F.add("String to Number", "C n.p. -> missing, text -> integer", [x], str2num_model([c_a, c_b]), group=g)
    else:
        x = F.add("Constant Value Column", "C suppressed = False (no n.p. cells)", [x], const_model("suppressed", "False"), group=g)
    F.writer(x, f"{prefix}_{name}", f"C Write {prefix}_{name}", g)
    BLK[f"{prefix}_{name}"] = x


for sp in STATE_BLOCKS:
    block_branch(F_STATE, "state", STATE_MAP, sp, ["cases_excl_died", "bed_days_excl_died"])
for sp in FN_BLOCKS:
    block_branch(F_FN, "first_nations", FN_MAP, sp, ["hospitalisations", "bed_days_excl_died"])

for _part in ("build_v3_part2.py", "build_v3_part3.py", "build_v3_part4.py"):
    if Path(__file__).with_name(_part).exists():
        exec(open(Path(__file__).with_name(_part)).read())

# =====================================================================================
# Write the workflow folder
# =====================================================================================
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
(OUT / "data").mkdir()
for fn, src in [(F_NAT, DATAS), (F_STATE, DATAS), (F_FN, DATAS)]:
    shutil.copy2(src / fn, OUT / "data" / fn)
for fn in ["ABS_ERP_Q_AUS_persons_2011Q2-2021Q2.csv", "ardd_fatalities.csv"]:
    if any(("CSV Reader" == n["typ"]) for n in F.nodes.values()):
        shutil.copy2(SUPP / fn, OUT / "data" / fn)

X0, Y0, DX, DY = 60, 40, 110, 70
pos = {}
for nid, n in F.nodes.items():
    nd = OUT / f"{n['typ']} (#{nid})"
    nd.mkdir()
    (nd / "settings.xml").write_text(n["text"], encoding="utf-8")
    pos[nid] = (X0 + DX * n["col"], Y0 + DY * n["row"])

# group annotations (bounding boxes)
COLORS = [(0xDDEBF7, 0x2E75B6), (0xFFF2CC, 0xBF9000), (0xE2F0D9, 0x548235), (0xE4DFEC, 0x7030A0),
          (0xFCE4D6, 0xC55A11), (0xDEEAF6, 0x1F4E79), (0xEDEDED, 0x7F7F7F)]
groups = {}
for nid, n in F.nodes.items():
    groups.setdefault(n["group"], []).append(nid)
ann_xml = []
for i, (gname, ids) in enumerate(groups.items()):
    xs = [pos[j][0] for j in ids]; ys = [pos[j][1] for j in ids]
    bg, bd = COLORS[i % len(COLORS)]
    x0, y0, x1, y1 = min(xs) - 25, min(ys) - 45, max(xs) + 60, max(ys) + 65
    ann_xml.append(render(f"annotation_{i}", {
        "text": S(f"<p><strong>{gname}</strong></p>"), "contentType": S("text/html"), "bgcolor": I(bg),
        "x-coordinate": I(x0), "y-coordinate": I(y0), "width": I(x1 - x0), "height": I(y1 - y0),
        "alignment": S("LEFT"), "borderSize": I(4), "borderColor": I(bd), "defFontSize": I(-1),
        "annotation-version": I(20230412), "styles": {}}, 2))
node_xml = [render(f"node_{nid}", {
    "id": I(nid), "node_settings_file": S(f"{n['typ']} (#{nid})/settings.xml"), "node_is_meta": B(False),
    "node_type": S("NativeNode"), "ui_classname": S("org.knime.core.node.workflow.NodeUIInformation"),
    "ui_settings": {"extrainfo.node.bounds": {"array-size": I(4), "0": I(pos[nid][0]), "1": I(pos[nid][1]),
                                              "2": I(32), "3": I(32)}}}, 2) for nid, n in F.nodes.items()]
conn_xml = [render(f"connection_{k}", {"sourceID": I(s), "destID": I(d), "sourcePort": I(sp), "destPort": I(dp)}, 2)
            for k, (s, sp, d, dp) in enumerate(F.conns)]
wf = f'''<?xml version="1.0" encoding="UTF-8"?>
<config xmlns="http://www.knime.org/2008/09/XMLConfig" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.knime.org/2008/09/XMLConfig http://www.knime.org/XMLConfig_2008_09.xsd" key="workflow.knime">
    <entry key="created_by" type="xstring" value="5.5.1.v202507241444"/>
    <entry key="created_by_nightly" type="xboolean" value="false"/>
    <entry key="version" type="xstring" value="5.1.0"/>
    <entry key="name" type="xstring" isnull="true" value=""/>
    <config key="authorInformation">
        <entry key="authored-by" type="xstring" value="Claude"/>
        <entry key="authored-when" type="xstring" value="2026-11-23 15:00:00 +1100"/>
        <entry key="lastEdited-by" type="xstring" value="Claude"/>
        <entry key="lastEdited-when" type="xstring" value="2026-11-23 15:00:00 +1100"/>
    </config>
    <entry key="customDescription" type="xstring" isnull="true" value=""/>
    <entry key="state" type="xstring" value="IDLE"/>
    <config key="workflow_credentials"/>
    <config key="annotations">
{chr(10).join(ann_xml)}
    </config>
    <config key="nodes">
{chr(10).join(node_xml)}
    </config>
    <config key="connections">
{chr(10).join(conn_xml)}
    </config>
    <config key="workflow_editor_settings">
        <entry key="workflow.editor.snapToGrid" type="xboolean" value="false"/>
        <entry key="workflow.editor.ShowGrid" type="xboolean" value="false"/>
        <entry key="workflow.editor.gridX" type="xint" value="-1"/>
        <entry key="workflow.editor.gridY" type="xint" value="-1"/>
        <entry key="workflow.editor.zoomLevel" type="xdouble" value="1.0"/>
        <entry key="workflow.editor.curvedConnections" type="xboolean" value="false"/>
        <entry key="workflow.editor.connectionWidth" type="xint" value="1"/>
    </config>
</config>
'''
(OUT / "workflow.knime").write_text(wf, encoding="utf-8")
desc = ("Data-prep workflow v3 for Beyond the Road Toll. Replaces processing/clean_data.py, supplementary_data.py and "
        "phase2_ideas.py: every CSV they write to data/clean is produced here with standard KNIME nodes (no scripting nodes). "
        "Raw workbooks are bundled in data/; outputs are written to the workflow data area (data/).")
(OUT / "workflow-metadata.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<workflow-metadata content-type="text/plain" xmlns="http://www.knime.org/core/node/workflow/metadata/v1.0">\n'
    '    <created>2026-11-23T15:00:00.000+11:00</created>\n    <last-modified>2026-11-23T15:00:00.000+11:00</last-modified>\n'
    f'    <description>{desc}</description>\n</workflow-metadata>', encoding="utf-8")
(OUT / "workflowset.meta").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<KNIMEMetaInfo nrOfElements="2" xmlns="http://www.knime.org/2.9/metainfo">\n'
    '    <element form="date" name="Creation Date" read-only="false">23/11/2026/15:00:00 +11:00</element>\n'
    f'    <element form="multiline" name="Comments" read-only="false">{desc}</element>\n</KNIMEMetaInfo>', encoding="utf-8")
print("built", OUT, "nodes:", len(F.nodes), "writers:", sum(1 for n in F.nodes.values() if n["typ"] == "CSV Writer"))
