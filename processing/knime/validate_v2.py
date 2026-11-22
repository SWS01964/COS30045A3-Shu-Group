"""Compare the KNIME v2 output CSVs with the Python outputs in data/clean/.

Usage (from the project root, with the project venv):
    python processing/knime/validate_v2.py <folder holding the knime_*.csv files>

The folder is the `data/` folder of an EXECUTED copy of BeyondTheRoadToll_DataPrep_v2
(the CSV Writers write to the workflow data area). Writes processing/knime/v2_validation.csv
with one PASS/FAIL row per figure and exits 1 if any check fails.
"""
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
CLEAN = ROOT / "data" / "clean"
KN = Path(sys.argv[1])
OUT = ROOT / "processing" / "knime" / "v2_validation.csv"
MAIN5 = ["Pedestrian", "Car passenger", "Car driver", "Motorcyclist", "Pedal cyclist"]

rows = []


def check(section, figure, knime, python, expected, tol=0.0):
    """PASS when KNIME == Python == the briefed figure (within tol, after rounding)."""
    ok = abs(knime - python) <= tol and (expected is None or abs(knime - expected) <= tol)
    rows.append(dict(section=section, figure=figure, knime=knime, python=python,
                     expected=("" if expected is None else expected),
                     result="PASS" if ok else "FAIL"))


def kcsv(name):
    return pd.read_csv(KN / name)


# ---- v1 checkpoints (must still hold in v2)
k1 = kcsv("knime_idea1_check.csv").set_index("Calendar year")["Sum(Hospitalisations)"]
p1 = pd.read_csv(CLEAN / "idea1_national_annual.csv").set_index("year")["hospitalisations"]
check("v1 D", "Hospitalisations 2011", k1[2011], p1[2011], 34033)
check("v1 D", "Hospitalisations 2021", k1[2021], p1[2021], 39505)
check("v1 D", "All 11 years equal (max abs diff)", float((k1 - p1).abs().max()), 0, 0)
k2 = kcsv("knime_idea2_cyclist_65_74_check.csv").set_index("Calendar year")["Sum(Hospitalisations)"]
p2 = (pd.read_csv(CLEAN / "idea2_roaduser_age_annual.csv")
      .query("road_user == 'Pedal cyclist' and age_group == '65-74'").set_index("year")["hospitalisations"])
check("v1 E", "Pedal cyclists 65-74, 2011", k2[2011], p2[2011], 240)
check("v1 E", "Pedal cyclists 65-74, 2021", k2[2021], p2[2021], 749)

# ---- F1 died in care per 1,000, 2011-2019
sev_k = kcsv("knime_idea3_severity_check.csv").set_index("Road user")
sev_p = pd.read_csv(CLEAN / "idea3_severity_roaduser.csv").set_index("road_user")
exp_f1 = {"Pedestrian": 21.8, "Car passenger": 7.3, "Car driver": 5.8, "Motorcyclist": 4.1,
          "Pedal cyclist": 1.9}
for ru in MAIN5:
    check("F1", f"{ru} died per 1,000 (2011-19)", round(sev_k.loc[ru, "died_per_1000"], 1),
          sev_p.loc[ru, "died_per_1000_2011_2019"], exp_f1[ru])
    check("F1", f"{ru} cases 2011-19", sev_k.loc[ru, "Sum(Count of cases)"],
          sev_p.loc[ru, "cases_2011_2019"], None)
    check("F1", f"{ru} deaths 2011-19", sev_k.loc[ru, "Sum(Died_cases)"],
          sev_p.loc[ru, "died_2011_2019"], 538 if ru == "Pedestrian" else None)
check("F1", "Total deaths 2011-19 (sum of column)", sev_k["Sum(Died_cases)"].sum(),
      sev_p.loc["All road users", "died_2011_2019"], 2041)
check("F1", "Total cases 2011-19 (sum of column)", sev_k["Sum(Count of cases)"].sum(),
      sev_p.loc["All road users", "cases_2011_2019"], 335454)
all_rate = 1000 * sev_k["Sum(Died_cases)"].sum() / sev_k["Sum(Count of cases)"].sum()
check("F1", "All road users died per 1,000", round(all_rate, 1),
      sev_p.loc["All road users", "died_per_1000_2011_2019"], 6.1)

# ---- F2 share of cases vs share of bed days, 2016-2021
bur_k = kcsv("knime_idea3_burden_check.csv").set_index("Road user")
bur_p = pd.read_csv(CLEAN / "idea3_burden_share.csv").pivot(index="road_user", columns="measure",
                                                            values="share_pct")
exp_f2 = {"Pedestrian": (6.6, 13.1), "Pedal cyclist": (19.0, 11.1), "Motorcyclist": (22.2, 25.0),
          "Car driver": (33.6, 30.4), "Car passenger": (None, None)}
for ru in MAIN5:
    ec, eb = exp_f2[ru]
    check("F2", f"{ru} share of cases % (2016-21)", round(bur_k.loc[ru, "share_cases_pct"], 1),
          bur_p.loc[ru, "cases"], ec)
    check("F2", f"{ru} share of bed days % (2016-21)", round(bur_k.loc[ru, "share_bed_days_pct"], 1),
          bur_p.loc[ru, "bed_days"], eb)
check("F2", "Total cases 2016-21 (sum of column)", bur_k["Sum(Count of cases)"].sum(),
      sev_p.loc["All road users", "cases_2016_2021"], 236178)
check("F2", "Total bed days 2016-21 (sum of column)", bur_k["Sum(Bed days)"].sum(),
      sev_p.loc["All road users", "bed_days_2016_2021"], 1236107)
check("F2", "Shares sum to 100", round(bur_k["share_cases_pct"].sum(), 6), 100.0, 100.0)

# ---- G1 April 2019 vs April 2020, Hospitalisations
apr_k = kcsv("knime_idea4_april_check.csv").set_index("Road user")
apr_p = (pd.read_csv(CLEAN / "idea4_roaduser_change_2020.csv")
         .query("comparison == 'april_vs_2019'").set_index("road_user"))
ru_all = "All road users"
check("G1", "All road users April 2019", apr_k.loc[ru_all, "2019"], apr_p.loc[ru_all, "base_value"], 3488)
check("G1", "All road users April 2020", apr_k.loc[ru_all, "2020"], apr_p.loc[ru_all, "value_2020"], 2357)
check("G1", "All road users % change", round(apr_k.loc[ru_all, "pct_change"], 1),
      apr_p.loc[ru_all, "pct_change"], -32.4)
body = apr_k.drop(index=ru_all)
check("G1", "Total row = sum of road-user rows (2019)", body["2019"].sum(), apr_k.loc[ru_all, "2019"], 3488)
check("G1", "Total row = sum of road-user rows (2020)", body["2020"].sum(), apr_k.loc[ru_all, "2020"], 2357)
exp_g1 = {"Pedal cyclist": 15.9, "Pedestrian": -59.8, "Car passenger": -52.7, "Car driver": -42.9,
          "Motorcyclist": -37.5}
for ru in MAIN5:
    check("G1", f"{ru} April % change", round(apr_k.loc[ru, "pct_change"], 1),
          apr_p.loc[ru, "pct_change"], exp_g1[ru])
    check("G1", f"{ru} April 2019 count", apr_k.loc[ru, "2019"], apr_p.loc[ru, "base_value"], None)
    check("G1", f"{ru} April 2020 count", apr_k.loc[ru, "2020"], apr_p.loc[ru, "value_2020"], None)

# ---- G2 annual cyclists
cyc_k = kcsv("knime_idea4_cyclists_annual_check.csv").set_index("Calendar year")["Sum(Hospitalisations)"]
cyc_p = pd.read_csv(CLEAN / "idea4_cyclist_trend.csv").set_index("year")["actual"]
check("G2", "Pedal cyclists 2019", cyc_k[2019], cyc_p[2019], 7302)
check("G2", "Pedal cyclists 2020", cyc_k[2020], cyc_p[2020], 8332)
check("G2", "All 11 years equal (max abs diff)", float((cyc_k - cyc_p).abs().max()), 0, 0)

df = pd.DataFrame(rows)
df.to_csv(OUT, index=False)
print(df.to_string(index=False))
n_fail = (df["result"] == "FAIL").sum()
print(f"\n{len(df) - n_fail} PASS / {n_fail} FAIL -> {OUT}")
sys.exit(1 if n_fail else 0)
