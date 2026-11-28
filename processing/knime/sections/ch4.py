"""Ch4 The lockdown test (plan 3.5). Writes ch4_monthly.csv and ch4_state_cyclists.csv.

Row 0: monthly table (12 road users + "All road users", 12 months + "Year", years across, 2015-19 baseline, 2020 change, trend).
Row 2: state check on the state file's raw sheet (ROAD USER block, Excel columns H:N).
"""
from knimelib import *

NAME = "Ch4 The lockdown test"
IN = (0,)

YEARS = [str(y) for y in range(2011, 2022)]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November",
          "December"]
BASE = ["$2015$", "$2016$", "$2017$", "$2018$", "$2019$"]


def _lowest(cols):
    """min() written as nested if(): Math Formula has no min()/max()."""
    e = cols[0]
    for c in cols[1:]:
        e = f"if({c} < {e}, {c}, {e})"
    return e


def _highest(cols):
    e = cols[0]
    for c in cols[1:]:
        e = f"if({c} > {e}, {c}, {e})"
    return e


def m_missing_zero_double(cols):
    """Missing Value: Pivot's year columns are Double, so use the fixed-Double handler (m_missing_zero only does Integer)."""
    m = m_missing_zero(cols)
    m["columnSettings"]["0"]["settings"] = {
        "factoryID": S("org.knime.base.node.preproc.pmml.missingval.handlers.FixedDoubleValueMissingCellHandlerFactory"),
        "settings": {"fixDoubleValue": D(0.0)}}
    return m


def build():
    w = Workflow(NAME, n_in=len(IN))
    base = w.inport(0)

    # ---- 4A-4C monthly (row 0)
    allru = w.node("Constant Value Column", "Copy as All road users", (1, 0), [base], m_constant("road_user", "All road users", replace=True))
    cat1 = w.node("Concatenate", "+ base", (2, 0), [base, allru], m_concat())
    yr = w.node("Constant Value Column", "Copy as Year", (3, 0), [cat1], m_constant("month", "Year", replace=True))
    cat2 = w.node("Concatenate", "Add year totals", (4, 0), [cat1, yr], m_concat())
    mnum = w.node("Rule Engine", "month_num", (5, 0), [cat2],
                  m_rule([f'$month$ = "{m}" => {i}' for i, m in enumerate(MONTHS, start=1)] + ['$month$ = "Year" => 13'], "month_num"))
    piv = w.node("Pivot", "Years across", (6, 0), [mnum], m_pivot(["road_user", "month", "month_num"], ["year"], [("hosp", INT, "Sum")]))
    fill = w.node("Missing Value", "No cases = 0", (7, 0), [piv], m_missing_zero_double(YEARS))
    bmin = w.node("Math Formula", "2015-19 low", (8, 0), [fill], m_math("base_min", _lowest(BASE)))
    mean = w.node("Math Formula", "2015-19 mean", (9, 0), [bmin], m_math("base_mean", "round((" + " + ".join(BASE) + ") / 5 * 10) / 10"))
    bmax = w.node("Math Formula", "2015-19 high", (10, 0), [mean], m_math("base_max", _highest(BASE)))
    pct = w.node("Math Formula", "% 2020 vs 2019", (11, 0), [bmax], m_math("pct_2020_vs_2019", "round(($2020$ / $2019$ - 1) * 1000) / 10"))
    trend = w.node("Math Formula", "2020 trend", (12, 0), [pct], m_math("trend_2020", "round($2019$ * ($2019$ / $2011$) ^ (1 / 8))"))
    w.node("CSV Writer", "ch4_monthly.csv", (13, 0), [trend], out_file="ch4_monthly.csv")

    # ---- 4D state check (row 2)
    rd = w.node("Excel Reader", "State file, road user", (1, 2), [],
                text=excel_reader(STATE_XLSX, sheet="raw", c0="H", c1="N", header_row=2, skip_empty=True))
    ren = w.node("Column Renamer", "Short names", (2, 2), [rd], m_renamer([
        ("calendar year", "year"), ("6-monthly", "half"), ("road user", "road_user"),
        ("count of cases excluding died in hospitals within 30 days", "cases"),
        ("bed days excluding died in hospitals within 30 days", "bed_days"), ("state or territory", "state")]))
    num = w.node("String to Number", "n.p. to missing", (3, 2), [ren], m_str2num(["cases", "bed_days"]))
    flt = w.node("Row Filter", "Cyclists 2019-20", (4, 2), [num], m_rowfilter([
        ("road_user", "EQ", "str", "Pedal cyclist"), ("year", "GTE", "int", 2019), ("year", "LTE", "int", 2020)]))
    pv2 = w.node("Pivot", "Years across", (5, 2), [flt], m_pivot(["state", "half"], ["year"], [("cases", INT, "Sum")]))
    pc = w.node("Math Formula", "pct_change", (6, 2), [pv2], m_math("pct_change", "round(($2020$ / $2019$ - 1) * 1000) / 10"))
    w.node("CSV Writer", "ch4_state_cyclists.csv", (7, 2), [pc], out_file="ch4_state_cyclists.csv")

    w.note("4A-4C  Monthly", "Months of 2011-21 per road user plus All road users and Year totals; 2015-19 range, 2020 vs 2019, 2020 trend. Writes ch4_monthly.csv", (0, 0, 13, 0), "blue")
    w.note("4D  State check (6-monthly)", "Pedal cyclists by state and half-year, 2019 vs 2020, from the state file. Writes ch4_state_cyclists.csv", (0, 2, 7, 2), "orange")
    return w
