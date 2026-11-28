"""Ch3 Severity profiles (plan 3.4). Writes severity.csv: death rate per 1,000 and average stay by road user x age /
counterparty / remoteness.

Windows are tagged once (Row A) so one GroupBy gives both periods: deaths are only complete to 2019, and bed-day counting
changed in July 2015, so stay is measured 2016-21. Every record is also copied under "All road users" and "All ages"
(Row B) so no extra GroupBy is needed for the totals. Measures are calculated once on the stacked table (Row C).
"""
from knimelib import *

NAME = "Ch3 Severity profiles"
IN = (0,)

Z2 = "1.96^2"
WILSON = "(($p$ + {z2}/(2*$n$) {sg} 1.96*sqrt($p$*(1-$p$)/$n$ + {z2}/(4*$n$^2))) / (1 + {z2}/$n$) * 1000)"


def wilson(sign):
    """Wilson 95% interval bound per 1000, with p = died_1119/cases_1119 and n = cases_1119 written out in place."""
    e = WILSON.format(z2=Z2, sg=sign)
    e = e.replace("$p$", "($died_1119$/$cases_1119$)").replace("$n$", "$cases_1119$")
    return f"round({e} * 10) / 10"


def build():
    w = Workflow(NAME, n_in=len(IN))
    base = w.inport(0)

    # ---- Row A: analysis windows
    a1 = w.node("Math Formula", "Cases window 2011-19", (0, 0), [base], m_math("cases_1119", "if($year$ <= 2019, $cases$, 0)", to_int=True))
    a2 = w.node("Math Formula", "Deaths window 2011-19", (1, 0), [a1], m_math("died_1119", "if($year$ <= 2019, $died$, 0)", to_int=True))
    a3 = w.node("Math Formula", "Hosp window 2016-21", (2, 0), [a2], m_math("hosp_1621", "if($year$ >= 2016, $hosp$, 0)", to_int=True))
    a4 = w.node("Math Formula", "Bed-days window 2016-21", (3, 0), [a3], m_math("beds_1621", "if($year$ >= 2016, $bed_days_surv$, 0)", to_int=True))

    # ---- Row B: totals by copying rows, then three views
    b1 = w.node("Constant Value Column", "Road user = All", (0, 2), [a4], m_constant("road_user", "All road users", replace=True))
    t2 = w.node("Concatenate", "Add All road users", (1, 2), [a4, b1], m_concat())
    b2 = w.node("Constant Value Column", "Age = All ages", (2, 2), [t2], m_constant("age_group", "All ages", replace=True))
    t4 = w.node("Concatenate", "Add All ages", (3, 2), [t2, b2], m_concat())

    sums = [("cases_1119", INT, "Sum"), ("died_1119", INT, "Sum"), ("hosp_1621", INT, "Sum"), ("beds_1621", INT, "Sum")]
    views = []
    for row, (src, dim, view) in enumerate([(t4, "age_group", "age"), (t2, "counterparty", "counterparty"), (t2, "remoteness", "remoteness")]):
        r = 3 + row
        g = w.node("GroupBy", f"Sum by road user x {view}", (4, r), [src], m_groupby(["road_user", dim], sums))
        rn = w.node("Column Renamer", f"{dim} -> category", (5, r), [g], m_renamer([(dim, "category")]))
        views.append(w.node("Constant Value Column", f"View = {view}", (6, r), [rn], m_constant("view", view)))
    s1 = w.node("Concatenate", "Stack age + counterparty", (7, 4), [views[0], views[1]], m_concat())
    s2 = w.node("Concatenate", "Stack views", (8, 4), [s1, views[2]], m_concat())

    # ---- Row C: measures, once, on the stacked table
    c1 = w.node("Math Formula", "Died per 1,000", (0, 6), [s2], m_math("died_per_1000", "floor($died_1119$ * 10000 / $cases_1119$ + 0.5) / 10"))
    c2 = w.node("Math Formula", "Low end of range", (1, 6), [c1], m_math("ci_low", wilson("-")))
    c3 = w.node("Math Formula", "High end of range", (2, 6), [c2], m_math("ci_high", wilson("+")))
    c4 = w.node("Math Formula", "Average stay", (3, 6), [c3], m_math("avg_stay", "floor($beds_1621$ * 10 / $hosp_1621$ + 0.5) / 10"))
    c5 = w.node("Rule Engine", "Rate publishable?", (4, 6), [c4], m_rule(
        ['$cases_1119$ >= 100 AND $died_1119$ >= 10 => "TRUE"', 'TRUE => "FALSE"'], "publish_rate"))
    c6 = w.node("Rule Engine", "Stay publishable?", (5, 6), [c5], m_rule(
        ['$hosp_1621$ >= 100 => "TRUE"', 'TRUE => "FALSE"'], "publish_stay"))
    w.node("CSV Writer", "severity.csv", (6, 6), [c6], out_file="severity.csv")

    w.note("A  Analysis windows", "Deaths 2011-19 only (2020-21 incomplete); stay 2016-21 (bed-day counting changed July 2015).", (0, 0, 3, 0), "yellow")
    w.note("B  Totals and three views", "Copy every record as All road users and All ages, group by road user x age / counterparty / remoteness, stack.", (0, 2, 8, 5), "blue")
    w.note("C  Measures", "Died per 1,000, Wilson 95% range, average stay, publish flags. Writes severity.csv", (0, 6, 6, 6), "green")
    return w
