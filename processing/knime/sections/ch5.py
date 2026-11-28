"""Ch5 First Nations (plan 3.6). Reads the First Nations file itself; the trend also takes the shared population table (port 1) for the per-100k rates.

Raw sheet = 5 side-by-side blocks, header on Excel row 2. Used here:
  counterparty AG:AM (complete, no n.p.)  -> trend
  road user    I:O   (n.p. cells)         -> profile, 2016-21 only
  remoteness   Y:AE  (no n.p.)            -> profile
Writes ch5_first_nations_trend.csv and ch5_first_nations_profile.csv.
"""
import copy
from knimelib import *

NAME = "Ch5 First Nations"
IN = (1,)

RAW = ["Calendar year", "6-monthly", "Cause of injury = traffic", "First Nations status"]
HOSP = "Hospitalisations"
BED = "Bed days excluding died in hospitals within 30 days"


def _pooled(groups):
    """GroupBy status/category: Sum hosp, Sum bed_days, Missing value count of hosp.
    Two aggregations of 'hosp' need distinct names, so the policy 'Aggregation method (column name)'
    is used and the three result columns are renamed in the next node."""
    m = m_groupby(groups, [("hosp", INT, "Sum"), ("bed_days", INT, "Sum"), ("hosp", INT, "Missing value count")])
    m["columnNamePolicy"] = S("Aggregation method (column name)")
    return m


POOLED_NAMES = [("Sum(hosp)", "hosp"), ("Sum(bed_days)", "bed_days"), ("Missing value count(hosp)", "np_cells")]


def build():
    w = Workflow(NAME, n_in=len(IN))

    # Trend (row 0): counterparty block, complete
    r = w.node("Excel Reader", "Counterparty block (complete)", (0, 0), [],
               text=excel_reader(FIRST_NATIONS_XLSX, sheet="raw", c0="AG", c1="AM", header_row=2, skip_empty=True))
    n = w.node("Column Renamer", "Short names", (1, 0), [r], m_renamer(
        [("Calendar year", "year"), ("First Nations status", "status"), (HOSP, "hosp"), (BED, "bed_days")]))
    g = w.node("GroupBy", "Sum by year, status", (2, 0), [n],
               m_groupby(["year", "status"], [("hosp", INT, "Sum"), ("bed_days", INT, "Sum")]))
    # Denominators (row 3): All-ages population + ABS First Nations population -> non-Indigenous = total - First Nations
    pop = w.inport(0)
    fnr = w.node("CSV Reader", "First Nations population", (0, 3), [], text=csv_reader(FN_POP_CSV))
    allages = w.node("Row Filter", "All ages only", (1, 3), [pop], m_rowfilter([("age_group", "EQ", "str", "All ages")]))
    pj = w.node("Joiner", "+ First Nations pop", (2, 3), [allages, fnr], m_joiner(["year"], ["year"], ["year", "population"], ["fn_population"]))
    nm = w.node("Math Formula", "Non-Indigenous pop", (3, 3), [pj], m_math("nonindig_population", "$population$ - $fn_population$", to_int=True))
    tj = w.node("Joiner", "+ population by year", (3, 0), [g, nm], m_joiner(
        ["year"], ["year"], ["year", "status", "hosp", "bed_days"], ["fn_population", "nonindig_population"], mode="left"))
    pr = w.node("Rule Engine", "Population by status", (4, 0), [tj], m_rule(
        ['$status$ = "First Nations people" => $fn_population$', 'TRUE => $nonindig_population$'], "population"))
    rt = w.node("Math Formula", "Hosp per 100k", (5, 0), [pr], m_math("hosp_per_100k", "floor($hosp$ / $population$ * 100000 * 10 + 0.5) / 10"))
    cf = w.node("Column Filter", "Keep output columns", (6, 0), [rt], m_colfilter(["year", "status", "hosp", "bed_days", "population", "hosp_per_100k"]))
    w.node("CSV Writer", "ch5_first_nations_trend.csv", (7, 0), [cf], out_file="ch5_first_nations_trend.csv")

    # Profile, road user (row 1)
    ru = w.node("Excel Reader", "Road-user block", (0, 1), [],
                text=excel_reader(FIRST_NATIONS_XLSX, sheet="raw", c0="I", c1="O", header_row=2, skip_empty=True))
    rf = w.node("Row Filter", "2016-21 only", (1, 1), [ru], m_rowfilter([("Calendar year", "GTE", "int", 2016)]))
    rn = w.node("Column Renamer", "Short names", (2, 1), [rf], m_renamer(
        [("First Nations status", "status"), ("Road user", "category"), (HOSP, "hosp"), (BED, "bed_days")]))
    rs = w.node("String to Number", "n.p. → missing", (3, 1), [rn], m_str2num(["hosp", "bed_days"]))
    rg = w.node("GroupBy", "Pool 2016-21", (4, 1), [rs], _pooled(["status", "category"]))
    rr = w.node("Column Renamer", "Name sums", (5, 1), [rg], m_renamer(POOLED_NAMES))
    rv = w.node("Constant Value Column", "view = road_user", (6, 1), [rr], m_constant("view", "road_user"))

    # Profile, remoteness (row 2)
    re_ = w.node("Excel Reader", "Remoteness block", (0, 2), [],
                 text=excel_reader(FIRST_NATIONS_XLSX, sheet="raw", c0="Y", c1="AE", header_row=2, skip_empty=True))
    ef = w.node("Row Filter", "2016-21 only", (1, 2), [re_], m_rowfilter([("Calendar year", "GTE", "int", 2016)]))
    en = w.node("Column Renamer", "Short names", (2, 2), [ef], m_renamer(
        [("First Nations status", "status"), ("ABS remoteness area", "category"), (HOSP, "hosp"), (BED, "bed_days")]))
    eg = w.node("GroupBy", "Pool 2016-21", (4, 2), [en], _pooled(["status", "category"]))
    er = w.node("Column Renamer", "Name sums", (5, 2), [eg], m_renamer(POOLED_NAMES))
    ev = w.node("Constant Value Column", "view = remoteness", (6, 2), [er], m_constant("view", "remoteness"))

    cc = w.node("Concatenate", "Stack views", (7, 1), [rv, ev], m_concat())
    av = w.node("Math Formula", "Avg stay", (8, 1), [cc], m_math("avg_stay", "round($bed_days$ / $hosp$ * 10) / 10"))
    w.node("CSV Writer", "ch5_first_nations_profile.csv", (9, 1), [av], out_file="ch5_first_nations_profile.csv")

    w.note("Trend", "Counterparty block is complete (no n.p.), so it gives the yearly totals; rate per 100,000 only where ABS has a First Nations estimate (2011, 2016, 2021)", (0, 0, 7, 0), "blue")
    w.note("Trend: population", "Non-Indigenous = all ages minus First Nations (ABS, 30 June)", (0, 3, 3, 3), "yellow")
    w.note("Profile: road user", "2016-21 only (bed-day counting changed July 2015); n.p. text becomes a missing value, never 0; np_cells counts them", (0, 1, 7, 2), "orange")
    w.note("Profile: remoteness", "Same 2016-21 filter and pooling, then both views stacked", (0, 2, 7, 3), "green")
    w.note("Caveat", "Status not stated is excluded; n.p. = suppressed by BITRE", (7, 2, 10, 3), "yellow")
    return w
