"""Ch1 The hidden road toll (plan 3.2). Worked example of a section module.

Convention (see README_SECTIONS.md):
  NAME  metanode title shown on the canvas
  IN    which shared tables this section takes, in order: 0 = clean base, 1 = population, 2 = road deaths
  build() returns a knimelib.Workflow with n_in=len(IN); metanode in-port k carries shared table IN[k]
Writes ch1_trend.csv into the workflow's data/ folder.
"""
from knimelib import *

NAME = "Ch1 The hidden road toll"
IN = (0, 1, 2)


def build():
    w = Workflow(NAME, n_in=len(IN))
    base, pop, deaths = w.inport(0), w.inport(1), w.inport(2)

    year = w.node("GroupBy", "Sum by year", (1, 0), [base], m_groupby(["year"], [("hosp", INT, "Sum"), ("cases", INT, "Sum"), ("died", INT, "Sum")]))
    allages = w.node("Row Filter", "All ages only", (1, 1), [pop], m_rowfilter([("age_group", "EQ", "str", "All ages")]))
    j1 = w.node("Joiner", "+ population", (2, 0), [year, allages], m_joiner(["year"], ["year"], ["year", "hosp", "cases", "died"], ["population"]))
    j2 = w.node("Joiner", "+ road deaths", (3, 0), [j1, deaths], m_joiner(["year"], ["year"], ["year", "hosp", "cases", "died", "population"], ["road_deaths"]))
    m1 = w.node("Math Formula", "Hosp per 100k", (4, 0), [j2], m_math("hosp_per_100k", "round($hosp$ / $population$ * 100000 * 10) / 10"))
    m2 = w.node("Math Formula", "Deaths per 100k", (5, 0), [m1], m_math("deaths_per_100k", "round($road_deaths$ / $population$ * 100000 * 100) / 100"))
    m3 = w.node("Math Formula", "Hosp per death", (6, 0), [m2], m_math("hosp_per_death", "round($hosp$ / $road_deaths$ * 10) / 10"))
    note = w.node("Rule Engine", "Series note", (7, 0), [m3], m_rule(['$year$ = 2011 => "before Vic change"', '$year$ >= 2017 => "after NSW change"'], "series_note"))
    w.node("CSV Writer", "ch1_trend.csv", (8, 0), [note], out_file="ch1_trend.csv")

    w.note("Ch1  The hidden road toll", "Hospitalised injuries vs road deaths per year, with per-100k rates. Writes ch1_trend.csv", (0, 0, 8, 1), "blue")
    return w
