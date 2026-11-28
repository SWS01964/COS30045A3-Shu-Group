"""Ch2 Getting older (plan 3.3). Writes ch2_age_roaduser.csv."""
from knimelib import *

NAME = "Ch2 Getting older"
IN = (0, 1)

YEARS = [str(y) for y in range(2011, 2022)]
USERS = ["Car driver", "Car passenger", "Motorcyclist", "Pedal cyclist", "Pedestrian"]


def m_missing_zero_double(cols):
    """Missing Value: blank pivot cells (Pivot sums are Double) -> 0."""
    h = "org.knime.base.node.preproc.pmml.missingval.handlers."
    m = m_missing_zero(cols)
    m["columnSettings"]["0"]["settings"] = {"factoryID": S(h + "FixedDoubleValueMissingCellHandlerFactory"),
                                            "settings": {"fixDoubleValue": D(0.0)}}
    return m


def build():
    w = Workflow(NAME, n_in=len(IN))
    base, pop = w.inport(0), w.inport(1)

    # --- row 0: road user x age, years across
    f1 = w.node("Row Filter", "Five main road users", (1, 0), [base], m_any_of("road_user", USERS))
    f2 = w.node("Row Filter", "Age known", (2, 0), [f1], m_rowfilter([("age_group", "NEQ", "str", "Missing")]))
    pv = w.node("Pivot", "Years across", (3, 0), [f2], m_pivot(["road_user", "age_group"], ["year"], [("hosp", INT, "Sum")]))
    zf = w.node("Missing Value", "Blank years = 0", (4, 0), [pv], m_missing_zero_double(YEARS))
    a1 = w.node("Math Formula", "3-yr average 2011-13", (5, 0), [zf], m_math("avg_2011_13", "round(($2011$ + $2012$ + $2013$) / 3 * 10) / 10"))
    a2 = w.node("Math Formula", "3-yr average 2019-21", (6, 0), [a1], m_math("avg_2019_21", "round(($2019$ + $2020$ + $2021$) / 3 * 10) / 10"))
    a3 = w.node("Math Formula", "% change", (7, 0), [a2], m_math("pct_change_3yr", "round((($2019$ + $2020$ + $2021$) / ($2011$ + $2012$ + $2013$) - 1) * 1000) / 10"))

    # --- row 1: population by age band
    pv2 = w.node("Pivot", "Population years across", (3, 1), [pop], m_pivot(["age_group"], ["year"], [("population", DBL, "Sum")]))
    p1 = w.node("Math Formula", "Population 2011-13", (5, 1), [pv2], m_math("pop_2011_13", "round(($2011$ + $2012$ + $2013$) / 3)"))
    p2 = w.node("Math Formula", "Population 2019-21", (6, 1), [p1], m_math("pop_2019_21", "round(($2019$ + $2020$ + $2021$) / 3)"))

    # --- join and finish
    left = ["road_user", "age_group"] + YEARS + ["avg_2011_13", "avg_2019_21", "pct_change_3yr"]
    j = w.node("Joiner", "+ population", (8, 0), [a3, p2], m_joiner(["age_group"], ["age_group"], left, ["pop_2011_13", "pop_2019_21"]))
    r = w.node("Math Formula", "Rate change per person", (9, 0), [j],
               m_math("rate_change_3yr", "round((($2019$ + $2020$ + $2021$) / $pop_2019_21$) / (($2011$ + $2012$ + $2013$) / $pop_2011_13$) * 1000 - 1000) / 10"))
    lc = w.node("Rule Engine", "Low count flag", (10, 0), [r],
                m_rule(['$avg_2011_13$ < 30 => "TRUE"', '$avg_2019_21$ < 30 => "TRUE"', 'TRUE => "FALSE"'], "low_count"))
    w.node("CSV Writer", "ch2_age_roaduser.csv", (11, 0), [lc], out_file="ch2_age_roaduser.csv")

    w.note("Ch2  Getting older", "Hospitalised injuries by road user and age band; 3-year averages 2011-13 vs 2019-21. Writes ch2_age_roaduser.csv", (0, 0, 11, 0), "blue")
    w.note("Population", "Same years across, averaged the same way, to get the change per person", (3, 1, 6, 1), "orange")
    return w
