#!/usr/bin/env python3
"""
phase2_ideas.py - COS30045 A3, Phase 2 EDA and processing for Idea 3 (severity) and Idea 4 (lockdown 2020).

ONE reproducible script. Reads the cleaned national Traffic rows written by clean_data.py
(data/clean/traffic_national_monthly_clean.csv), reconciles them against the raw BITRE workbook and the
recorded canonical figures, then writes D3-ready CSVs, quick EDA figures and a run log.

Usage:   python processing/phase2_ideas.py      (any cwd; needs pandas, openpyxl, matplotlib)
Inputs:  data/clean/traffic_national_monthly_clean.csv          (primary)
         Datas/hospitalisation_injury_publication_sep2023.xlsx    (raw sheet, reconciliation only)
         data/clean/idea1_national_annual.csv, idea2_age_severity.csv (Phase 1 outputs, reconciliation only)
         data/clean/supp_population_age.csv                      (ABS ERP, older-pedestrian rates)
         data/clean/state_by_road_user.csv                       (6-monthly state file, Idea 4 check)
Outputs: data/clean/idea3_*.csv, data/clean/idea4_*.csv, processing/eda_figures/phase2/*.png,
         processing/phase2_validation.csv, processing/phase2_key_numbers.csv, processing/phase2_run_log.txt

Rules (inherit Phase 1 R1-R11; new rules P1-P8):
 P1  Shares of burden use 2016-2021 only (bed-day method change 1 Jul 2015).
     share of cases = cases_incl_died; share of bed days = bed_days AS PUBLISHED (includes died bed days).
 P2  Died in care per 1,000 = 1000 * died_cases / cases_incl_died, 2011-2019 only (2020-21 death records
     incomplete). 95% Wilson interval reported.
 P3  Average stay (primary) = bed_days_excl_died / hospitalisations, 2016-2021 (same method as Phase 1, so
     75+ = 11.1 days). Secondary column = bed_days / cases_incl_died (all cases incl. deaths).
 P4  Rate flags: died_per_1000 is flagged (and left blank in the *_publish column) where cases < 100 or
     deaths < 10; average stay is flagged where hospitalisations < 100.
 P5  Idea 4 baseline = 2015-2019 monthly mean / min / max. NSW narrowed its definition from June 2017, which
     lowers 2017-19 counts slightly inside the baseline; noted, not corrected.
 P6  Cyclist trend = OLS line on 2011-2019 annual counts, 95% prediction interval (t, df = 7). Sensitivity
     fits on 2012-2019 (drops pre-Vic-change 2011) and 2015-2019.
 P7  Percent changes on a base < 100 are flagged (small_base).
 P8  Nothing in clean_data.py, existing data/clean/*.csv or website/ is modified.
"""
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CLEAN = ROOT / "data" / "clean"
FIG = ROOT / "processing" / "eda_figures" / "phase2"
FIG.mkdir(parents=True, exist_ok=True)
F_RAW = ROOT / "Datas" / "hospitalisation_injury_publication_sep2023.xlsx"

AGE_ORDER = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"]
MAIN = ["Car driver", "Car passenger", "Motorcyclist", "Pedal cyclist", "Pedestrian"]
OTHER = "Other road users"
ALL = "All road users"
MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MIN_CASES, MIN_DEATHS, SMALL_BASE = 100, 10, 100
# validated categorical palette (dataviz skill, light mode), fixed order
PAL = {"Car driver": "#2a78d6", "Car passenger": "#eb6834", "Motorcyclist": "#1baf7a",
       "Pedal cyclist": "#eda100", "Pedestrian": "#e87ba4", OTHER: "#6250d6", ALL: "#52514e"}
INK, MUTED = "#0b0b0b", "#8a8984"

LOG_LINES, VALID, KEY = [], [], []


def log(*a):
    s = " ".join(str(x) for x in a)
    LOG_LINES.append(s)
    print(s, flush=True)


def check(name, ok, detail=""):
    VALID.append({"check": name, "result": "PASS" if ok else "FAIL", "detail": detail})
    log(f"  [{'PASS' if ok else 'FAIL'}] {name}  {detail}")


def key(idea, kid, value, unit, period, source, note=""):
    KEY.append({"idea": idea, "key_id": kid, "value": value, "unit": unit, "period": period,
                "source_csv": source, "note": note})


def save(df, name):
    df.to_csv(CLEAN / name, index=False, encoding="utf-8")
    log(f"  wrote data/clean/{name}  shape={df.shape}")


def pct(a, b):
    return np.where(np.asarray(b) > 0, (np.asarray(a) / np.asarray(b) - 1) * 100, np.nan)


def wilson(d, n, z=1.96):
    if n <= 0:
        return (np.nan, np.nan)
    p = d / n
    den = 1 + z * z / n
    c = (p + z * z / (2 * n)) / den
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (round(1000 * max(c - h, 0), 1), round(1000 * (c + h), 1))


def ru_group(s):
    return s.where(s.isin(MAIN), OTHER)


# --------------------------------------------------------------------------------------
# Load + reconcile
# --------------------------------------------------------------------------------------
def load():
    t = pd.read_csv(CLEAN / "traffic_national_monthly_clean.csv")
    t["ru"] = ru_group(t["road_user"])
    log(f"Loaded traffic_national_monthly_clean.csv: {t.shape[0]:,} rows x {t.shape[1] - 1} cols")
    return t


def reconcile(t):
    log("\n== Reconciliation ==")
    y = t.groupby("year")["hospitalisations"].sum()
    check("Annual hospitalisations 2011 = 34,033", y[2011] == 34033, f"got {y[2011]:,}")
    check("Annual hospitalisations 2021 = 39,505", y[2021] == 39505, f"got {y[2021]:,}")

    p1 = pd.read_csv(CLEAN / "idea1_national_annual.csv").set_index("year")["hospitalisations"]
    check("All 11 years equal Phase 1 idea1_national_annual.csv", (y == p1).all(),
          f"max abs diff {int((y - p1).abs().max())}")

    # independent re-aggregation from the raw workbook (Traffic rows, R2/R3)
    raw = pd.read_excel(F_RAW, sheet_name="raw")
    raw = raw[raw["Cause of injury"].astype(str).str.strip() == "Traffic"]
    num = ["Hospitalisations", "Count of cases", "Died_cases", "Bed days", "Died_bed_days"]
    ry = raw.groupby("Calendar year")[num].sum(min_count=1).fillna(0)
    cy = t.groupby("year")[["hospitalisations", "cases_incl_died", "died_cases", "bed_days", "died_bed_days"]].sum()
    diffs = (ry.values - cy.values)
    check("Raw workbook vs clean CSV: hosp, cases, died, bed days, died bed days by year (55 cells)",
          np.abs(diffs).max() == 0, f"max abs diff {np.abs(diffs).max():.0f}; raw Traffic rows {len(raw):,}")
    ru_raw = raw.groupby(["Calendar year", raw["Road user"].astype(str).str.strip()])["Hospitalisations"].sum()
    ru_cl = t.groupby(["year", "road_user"])["hospitalisations"].sum()
    ru_raw.index.names = ru_cl.index.names
    j = pd.concat([ru_raw, ru_cl], axis=1).fillna(0)
    check("Raw workbook vs clean CSV: road user x year hospitalisations", (j.iloc[:, 0] == j.iloc[:, 1]).all(),
          f"{len(j)} cells")

    m = t.groupby(["year", "month_num"])["hospitalisations"].sum()
    check("Monthly cells sum to annual totals", (m.groupby(level=0).sum() == y).all())

    # Phase 1 age severity reproduces with the P2/P3 methods
    sv = pd.read_csv(CLEAN / "idea2_age_severity.csv").set_index("age_group")
    a = t[t.year >= 2016].groupby("age_group")[["bed_days_excl_died", "hospitalisations"]].sum()
    d = t[t.year <= 2019].groupby("age_group")[["died_cases", "cases_incl_died"]].sum()
    st = (a.bed_days_excl_died / a.hospitalisations).round(1).reindex(AGE_ORDER)
    dr = (1000 * d.died_cases / d.cases_incl_died).round(1).reindex(AGE_ORDER)
    check("Phase 1 idea2_age_severity reproduces (avg stay + died/1000, 7 ages)",
          (st.values == sv.loc[AGE_ORDER, "avg_stay_days_2016_2021"].values).all()
          and (dr.values == sv.loc[AGE_ORDER, "died_per_1000_2011_2019"].values).all(),
          f"75+ stay {st['75+']} / died {dr['75+']}")

    # canonical Idea 3 figures
    d = t[t.year <= 2019].groupby("road_user")[["died_cases", "cases_incl_died"]].sum()
    r = (1000 * d.died_cases / d.cases_incl_died).round(1)
    canon = {"Pedestrian": 21.8, "Car passenger": 7.3, "Car driver": 5.8, "Motorcyclist": 4.1, "Pedal cyclist": 1.9}
    check("Canonical died/1,000 2011-19 (5 road users)", all(r[k] == v for k, v in canon.items()),
          "; ".join(f"{k} {r[k]}" for k in canon))
    p = t[t.year >= 2016].groupby("ru")[["cases_incl_died", "bed_days"]].sum()
    s = (100 * p / p.sum()).round(1)
    canon_s = {"Pedestrian": (6.6, 13.1), "Pedal cyclist": (19.0, 11.1), "Motorcyclist": (22.2, 25.0)}
    check("Canonical 2016-21 shares (cases_incl_died vs bed_days)",
          all((s.loc[k, "cases_incl_died"], s.loc[k, "bed_days"]) == v for k, v in canon_s.items()),
          "; ".join(f"{k} {s.loc[k, 'cases_incl_died']}% vs {s.loc[k, 'bed_days']}%" for k in canon_s))
    h = t[t.year >= 2016].groupby("ru")["hospitalisations"].sum()
    log(f"  [INFO] on the Hospitalisations column instead, pedestrians are {100 * h['Pedestrian'] / h.sum():.1f}% "
        f"of 2016-21 cases (6.6% uses cases_incl_died)")
    # legacy pooled figures from HANDOFF section 6 (2011-21 pooled, Count of cases)
    d = t.groupby("road_user")[["died_cases", "cases_incl_died"]].sum()
    lr = (1000 * d.died_cases / d.cases_incl_died).round(1)
    c = t.groupby("counterparty")[["died_cases", "cases_incl_died", "bed_days"]].sum()
    lc = (1000 * c.died_cases / c.cases_incl_died).round(1)
    ls = (c.bed_days / c.cases_incl_died).round(1)
    log(f"  [INFO] legacy pooled 2011-21 (superseded): pedestrian {lr['Pedestrian']}, car driver {lr['Car driver']}, "
        f"cyclist {lr['Pedal cyclist']}; train {lc['Train']} ({ls['Train']} days), heavy vehicle/bus "
        f"{lc['Heavy transport vehicle or bus']} ({ls['Heavy transport vehicle or bus']} days)")
    check("Legacy pooled HANDOFF figures reproduce (19.3/4.9/1.6; train 48.7, 14.5 days; heavy 17.3, 8.4 days)",
          (lr["Pedestrian"], lr["Car driver"], lr["Pedal cyclist"], lc["Train"], ls["Train"],
           lc["Heavy transport vehicle or bus"], ls["Heavy transport vehicle or bus"])
          == (19.3, 4.9, 1.6, 48.7, 14.5, 17.3, 8.4), "explains the gap vs the 2011-19 figures")

    # canonical Idea 4 figures
    check("April 2019 = 3,488 and April 2020 = 2,357", (m[(2019, 4)], m[(2020, 4)]) == (3488, 2357),
          f"{m[(2019, 4)]:,} / {m[(2020, 4)]:,} ({pct(m[(2020, 4)], m[(2019, 4)]):.1f}%)")
    cyc = t[t.road_user == "Pedal cyclist"]
    ca = cyc.groupby("year")["hospitalisations"].sum()
    check("Cyclists 2019 = 7,302 and 2020 = 8,332", (ca[2019], ca[2020]) == (7302, 8332),
          f"{pct(ca[2020], ca[2019]):+.1f}%")
    cm = cyc.groupby(["year", "month_num"])[["hospitalisations", "cases_incl_died"]].sum()
    ok = (cm.loc[(2020, 6), "cases_incl_died"], cm.loc[(2019, 6), "cases_incl_died"]) == (683, 453)
    check("Cyclists June 2020 = 683 / June 2019 = 453 reproduce on Count of cases (cases_incl_died); "
          "Hospitalisations gives 682 / 453 -> publish 682", ok and cm.loc[(2020, 6), "hospitalisations"] == 682,
          f"got {cm.loc[(2020, 6), 'hospitalisations']} / {cm.loc[(2019, 6), 'hospitalisations']}; "
          f"cases_incl_died {cm.loc[(2020, 6), 'cases_incl_died']} / {cm.loc[(2019, 6), 'cases_incl_died']}")


# --------------------------------------------------------------------------------------
# Idea 3 helpers
# --------------------------------------------------------------------------------------
def severity(t, by):
    """One row per group with mortality (2011-19) and stay/share (2016-21) metrics."""
    m = t[t.year <= 2019].groupby(by)[["cases_incl_died", "died_cases"]].sum() \
        .rename(columns={"cases_incl_died": "cases_2011_2019", "died_cases": "died_2011_2019"})
    s = t[t.year >= 2016].groupby(by)[["hospitalisations", "cases_incl_died", "bed_days", "bed_days_excl_died"]].sum() \
        .rename(columns=lambda c: f"{'hosp' if c == 'hospitalisations' else c.replace('cases_incl_died', 'cases')}_2016_2021")
    df = m.join(s, how="outer").fillna(0).astype(int).reset_index()
    df["died_per_1000_2011_2019"] = (1000 * df.died_2011_2019 / df.cases_2011_2019.replace(0, np.nan)).round(1)
    ci = [wilson(d, n) for d, n in zip(df.died_2011_2019, df.cases_2011_2019)]
    df["died_per_1000_ci95_low"] = [c[0] for c in ci]
    df["died_per_1000_ci95_high"] = [c[1] for c in ci]
    df["mortality_flag"] = np.select([df.cases_2011_2019 < MIN_CASES, df.died_2011_2019 < MIN_DEATHS],
                                     ["low_cases", "low_deaths"], "ok")
    df["died_per_1000_publish"] = df.died_per_1000_2011_2019.where(df.mortality_flag == "ok")
    df["avg_stay_days_2016_2021"] = (df.bed_days_excl_died_2016_2021 / df.hosp_2016_2021.replace(0, np.nan)).round(1)
    df["avg_stay_all_cases_2016_2021"] = (df.bed_days_2016_2021 / df.cases_2016_2021.replace(0, np.nan)).round(1)
    df["stay_flag"] = np.where(df.hosp_2016_2021 < MIN_CASES, "low_cases", "ok")
    df["avg_stay_publish"] = df.avg_stay_days_2016_2021.where(df.stay_flag == "ok")
    return df


def idea3(t):
    log("\n== Idea 3: Not every crash is equal ==")
    p = t[t.year >= 2016]
    # --- burden share (long) ---
    g = p.groupby("ru")[["cases_incl_died", "bed_days", "hospitalisations", "bed_days_excl_died"]].sum() \
        .reindex(MAIN + [OTHER])
    rows = []
    for ru, r in g.iterrows():
        sc = 100 * r.cases_incl_died / g.cases_incl_died.sum()
        sb = 100 * r.bed_days / g.bed_days.sum()
        for meas, lab, cnt, tot, sh in [
            ("cases", "Share of people hospitalised", r.cases_incl_died, g.cases_incl_died.sum(), sc),
            ("bed_days", "Share of days spent in hospital", r.bed_days, g.bed_days.sum(), sb)]:
            rows.append({"road_user": ru, "measure": meas, "measure_label": lab, "count": int(cnt),
                         "total": int(tot), "share_pct": round(sh, 1), "bed_to_case_ratio": round(sb / sc, 2),
                         "period": "2016-2021"})
    bs = pd.DataFrame(rows)
    save(bs, "idea3_burden_share.csv")
    for ru in MAIN:
        r = bs[bs.road_user == ru].set_index("measure")
        log(f"  {ru:14s} cases {r.loc['cases', 'share_pct']:5.1f}%  bed days {r.loc['bed_days', 'share_pct']:5.1f}%  "
            f"ratio {r.loc['cases', 'bed_to_case_ratio']}")
    ped = bs[bs.road_user == "Pedestrian"].set_index("measure")
    key(3, "ped_share_cases", ped.loc["cases", "share_pct"], "% of cases", "2016-21", "idea3_burden_share.csv")
    key(3, "ped_share_bed_days", ped.loc["bed_days", "share_pct"], "% of bed days", "2016-21", "idea3_burden_share.csv")
    key(3, "ped_bed_to_case_ratio", ped.loc["cases", "bed_to_case_ratio"], "x", "2016-21", "idea3_burden_share.csv")

    # --- severity by road user ---
    a = severity(t, "ru").rename(columns={"ru": "road_user"}).assign(level="group")
    d = severity(t[~t.road_user.isin(MAIN)], "road_user").assign(level="detail (within Other road users)")
    tot = severity(t.assign(road_user=ALL), "road_user").assign(level="total")
    sr = pd.concat([a.set_index("road_user").reindex(MAIN + [OTHER]).reset_index(), d, tot], ignore_index=True)
    share = sr.cases_2016_2021 / tot.cases_2016_2021.iloc[0] * 100
    sr.insert(1, "share_of_cases_2016_2021", share.round(1))
    sr.insert(2, "share_of_bed_days_2016_2021", (sr.bed_days_2016_2021 / tot.bed_days_2016_2021.iloc[0] * 100).round(1))
    sr = sr[["level"] + [c for c in sr.columns if c != "level"]]
    save(sr, "idea3_severity_roaduser.csv")
    for _, r in sr[sr.level != "detail (within Other road users)"].iterrows():
        log(f"  {r.road_user:16s} died/1000 {r.died_per_1000_2011_2019:5.1f} [{r.died_per_1000_ci95_low}-"
            f"{r.died_per_1000_ci95_high}] n={r.cases_2011_2019:,} d={r.died_2011_2019}  stay {r.avg_stay_days_2016_2021} "
            f"(all cases {r.avg_stay_all_cases_2016_2021})")
    s = sr.set_index("road_user")
    for ru, k in [("Pedestrian", "ped"), ("Car driver", "driver"), ("Pedal cyclist", "cyclist"),
                  ("Motorcyclist", "moto"), ("Car passenger", "passenger"), (ALL, "all")]:
        key(3, f"{k}_died_per_1000", s.loc[ru, "died_per_1000_2011_2019"], "per 1,000 cases", "2011-19",
            "idea3_severity_roaduser.csv", f"{s.loc[ru, 'died_2011_2019']} deaths / {s.loc[ru, 'cases_2011_2019']:,} cases")
        key(3, f"{k}_avg_stay", s.loc[ru, "avg_stay_days_2016_2021"], "days", "2016-21", "idea3_severity_roaduser.csv")
    log(f"  pedestrian vs car driver died ratio: {s.loc['Pedestrian', 'died_per_1000_2011_2019'] / s.loc['Car driver', 'died_per_1000_2011_2019']:.1f}x; "
        f"vs cyclist {s.loc['Pedestrian', 'died_per_1000_2011_2019'] / s.loc['Pedal cyclist', 'died_per_1000_2011_2019']:.1f}x")
    key(3, "ped_vs_driver_died_ratio",
        round(s.loc["Pedestrian", "died_per_1000_2011_2019"] / s.loc["Car driver", "died_per_1000_2011_2019"], 1),
        "x", "2011-19", "idea3_severity_roaduser.csv")
    key(3, "ped_deaths_share", round(100 * s.loc["Pedestrian", "died_2011_2019"] / s.loc[ALL, "died_2011_2019"], 1),
        "% of in-hospital deaths", "2011-19", "idea3_severity_roaduser.csv")
    key(3, "ped_cases_share_2011_19", round(100 * s.loc["Pedestrian", "cases_2011_2019"] / s.loc[ALL, "cases_2011_2019"], 1),
        "% of cases", "2011-19", "idea3_severity_roaduser.csv")

    # --- road user x age ---
    ra = severity(t[t.road_user.isin(MAIN) & t.age_group.isin(AGE_ORDER)], ["road_user", "age_group"])
    ra["age_group"] = pd.Categorical(ra.age_group, AGE_ORDER, ordered=True)
    ra = ra.sort_values(["road_user", "age_group"])
    save(ra, "idea3_severity_roaduser_age.csv")
    log(f"  road user x age: {int((ra.mortality_flag != 'ok').sum())} of {len(ra)} cells flagged for mortality, "
        f"{int((ra.stay_flag != 'ok').sum())} for stay")

    # --- counterparty (all road users + each main road user) ---
    cp_all = severity(t.assign(road_user=ALL), ["road_user", "counterparty"])
    cp_ru = severity(t[t.road_user.isin(MAIN)], ["road_user", "counterparty"])
    cp = pd.concat([cp_all, cp_ru], ignore_index=True)
    tot_ru = cp.groupby("road_user").cases_2016_2021.transform("sum")
    cp.insert(2, "share_of_road_user_cases_2016_2021", (100 * cp.cases_2016_2021 / tot_ru).round(1))
    cp = cp.sort_values(["road_user", "died_per_1000_2011_2019"], ascending=[True, False])
    save(cp, "idea3_severity_counterparty.csv")
    c = cp[cp.road_user == ALL].set_index("counterparty")
    for cpn, r in c.iterrows():
        log(f"  {cpn[:38]:38s} died/1000 {r.died_per_1000_2011_2019:5.1f} [{r.mortality_flag}] n={r.cases_2011_2019:>7,} "
            f"d={r.died_2011_2019:>4}  stay {r.avg_stay_days_2016_2021} [{r.stay_flag}]")
    for cpn, k in [("Train", "train"), ("Heavy transport vehicle or bus", "heavy"),
                   ("Car, pick-up truck or van", "car"), ("Fixed or stationary object", "fixed"),
                   ("Non-collision transport accident", "noncollision")]:
        key(3, f"cp_{k}_died_per_1000", c.loc[cpn, "died_per_1000_2011_2019"], "per 1,000 cases", "2011-19",
            "idea3_severity_counterparty.csv", f"{c.loc[cpn, 'died_2011_2019']} deaths / {c.loc[cpn, 'cases_2011_2019']:,}; "
            f"flag {c.loc[cpn, 'mortality_flag']}")
        key(3, f"cp_{k}_avg_stay", c.loc[cpn, "avg_stay_days_2016_2021"], "days", "2016-21",
            "idea3_severity_counterparty.csv", f"{c.loc[cpn, 'hosp_2016_2021']:,} hospitalisations")
    pc = cp[cp.road_user == "Pedestrian"].set_index("counterparty")
    log("  Pedestrians by counterparty:")
    for cpn, r in pc.iterrows():
        log(f"    {cpn[:38]:38s} died/1000 {r.died_per_1000_2011_2019:5.1f} [{r.mortality_flag}] n={r.cases_2011_2019:>6,} "
            f"d={r.died_2011_2019:>4} share {r.share_of_road_user_cases_2016_2021}%  stay {r.avg_stay_days_2016_2021}")
    for cpn, k in [("Car, pick-up truck or van", "car"), ("Heavy transport vehicle or bus", "heavy")]:
        key(3, f"ped_hit_by_{k}_died_per_1000", pc.loc[cpn, "died_per_1000_2011_2019"], "per 1,000 cases", "2011-19",
            "idea3_severity_counterparty.csv", f"{pc.loc[cpn, 'died_2011_2019']} deaths / {pc.loc[cpn, 'cases_2011_2019']:,}; "
            f"flag {pc.loc[cpn, 'mortality_flag']}")
    key(3, "ped_hit_by_car_share", pc.loc["Car, pick-up truck or van", "share_of_road_user_cases_2016_2021"],
        "% of pedestrian cases", "2016-21", "idea3_severity_counterparty.csv")

    # --- older pedestrians ---
    rows = []
    for ru_lab, sub in [("Pedestrian", t[t.road_user == "Pedestrian"]), (ALL, t)]:
        sub = sub[sub.age_group.isin(AGE_ORDER)].copy()
        grp = {**{a: [a] for a in AGE_ORDER}, "Under 65": AGE_ORDER[:5], "65+": ["65-74", "75+"], "All ages": AGE_ORDER}
        for lab, ages in grp.items():
            df = severity(sub[sub.age_group.isin(ages)].assign(g=lab), "g").rename(columns={"g": "age_group"})
            df.insert(0, "road_user", ru_lab)
            rows.append(df)
    op = pd.concat(rows, ignore_index=True)
    allages = op[op.age_group == "All ages"].set_index("road_user")
    op["share_of_road_user_cases_2016_2021"] = (100 * op.cases_2016_2021 / op.road_user.map(allages.cases_2016_2021)).round(1)
    op["share_of_road_user_bed_days_2016_2021"] = (100 * op.bed_days_2016_2021 / op.road_user.map(allages.bed_days_2016_2021)).round(1)
    op["age_level"] = np.where(op.age_group.isin(AGE_ORDER), "band", "combined")
    save(op, "idea3_older_pedestrians.csv")
    o = op.set_index(["road_user", "age_group"])
    for ag in ["Under 65", "65-74", "75+", "65+", "All ages"]:
        r = o.loc[("Pedestrian", ag)]
        log(f"  Pedestrian {ag:8s} died/1000 {r.died_per_1000_2011_2019:5.1f} [{r.died_per_1000_ci95_low}-{r.died_per_1000_ci95_high}] "
            f"d={r.died_2011_2019}  stay {r.avg_stay_days_2016_2021}  share cases {r.share_of_road_user_cases_2016_2021}% "
            f"bed days {r.share_of_road_user_bed_days_2016_2021}%")
    for ag, k in [("65+", "65p"), ("75+", "75p"), ("65-74", "65_74"), ("Under 65", "u65")]:
        r = o.loc[("Pedestrian", ag)]
        key(3, f"ped_{k}_died_per_1000", r.died_per_1000_2011_2019, "per 1,000 cases", "2011-19",
            "idea3_older_pedestrians.csv", f"{r.died_2011_2019} deaths / {r.cases_2011_2019:,} cases")
        key(3, f"ped_{k}_avg_stay", r.avg_stay_days_2016_2021, "days", "2016-21", "idea3_older_pedestrians.csv")
        key(3, f"ped_{k}_share_cases", r.share_of_road_user_cases_2016_2021, "% of pedestrian cases", "2016-21",
            "idea3_older_pedestrians.csv")
        key(3, f"ped_{k}_share_bed_days", r.share_of_road_user_bed_days_2016_2021, "% of pedestrian bed days",
            "2016-21", "idea3_older_pedestrians.csv")
        key(3, f"ped_{k}_share_deaths", round(100 * r.died_2011_2019 / o.loc[("Pedestrian", "All ages"), "died_2011_2019"], 1),
            "% of pedestrian in-hospital deaths", "2011-19", "idea3_older_pedestrians.csv")
    r75, rall75 = o.loc[("Pedestrian", "75+")], o.loc[(ALL, "75+")]
    log(f"  75+ pedestrians vs all 75+ road users: died {r75.died_per_1000_2011_2019} vs {rall75.died_per_1000_2011_2019}; "
        f"stay {r75.avg_stay_days_2016_2021} vs {rall75.avg_stay_days_2016_2021}")
    key(3, "all_75p_died_per_1000", rall75.died_per_1000_2011_2019, "per 1,000 cases", "2011-19", "idea3_older_pedestrians.csv")

    # --- older pedestrians annual counts + per-100k (ERP) ---
    pop = pd.read_csv(CLEAN / "supp_population_age.csv")
    pe = t[(t.road_user == "Pedestrian") & t.age_group.isin(AGE_ORDER)]
    rows = []
    for lab, ages in {"65-74": ["65-74"], "75+": ["75+"], "65+": ["65-74", "75+"], "Under 65": AGE_ORDER[:5],
                      "All ages": AGE_ORDER}.items():
        h = pe[pe.age_group.isin(ages)].groupby("year")["hospitalisations"].sum()
        e = pop[pop.age_group.isin(ages)].groupby("year")["erp"].sum()
        for yr in range(2011, 2022):
            rows.append({"age_group": lab, "year": yr, "pedestrian_hospitalisations": int(h.get(yr, 0)),
                         "erp": int(e[yr]), "per_100k": round(1e5 * h.get(yr, 0) / e[yr], 1),
                         "series_break": "pre_vic_2012_change" if yr == 2011 else ("post_nsw_2017_change" if yr >= 2017 else "")})
    pa = pd.DataFrame(rows)
    save(pa, "idea3_older_pedestrians_annual.csv")
    q = pa.set_index(["age_group", "year"])
    for ag in ["65-74", "75+", "Under 65"]:
        log(f"  Pedestrian {ag:8s} per 100k: 2011 {q.loc[(ag, 2011), 'per_100k']}  2019 {q.loc[(ag, 2019), 'per_100k']}  "
            f"2021 {q.loc[(ag, 2021), 'per_100k']}  (count {q.loc[(ag, 2011), 'pedestrian_hospitalisations']} -> "
            f"{q.loc[(ag, 2021), 'pedestrian_hospitalisations']})")
        key(3, f"ped_{ag}_per100k_2019", q.loc[(ag, 2019), "per_100k"], "per 100k population", "2019",
            "idea3_older_pedestrians_annual.csv")
    return bs, sr, ra, cp, op, pa


# --------------------------------------------------------------------------------------
# Idea 4
# --------------------------------------------------------------------------------------
def ols(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    b1, b0 = np.polyfit(x, y, 1)
    res = y - (b0 + b1 * x)
    n = len(x)
    s = math.sqrt((res ** 2).sum() / (n - 2))
    return b0, b1, s, n, x.mean(), ((x - x.mean()) ** 2).sum()


T975 = {7: 2.365, 6: 2.447, 3: 3.182}   # two-sided 95% t quantiles


def predict(fit, x0):
    b0, b1, s, n, xb, sxx = fit
    yhat = b0 + b1 * x0
    se = s * math.sqrt(1 + 1 / n + (x0 - xb) ** 2 / sxx)
    return yhat, yhat - T975[n - 2] * se, yhat + T975[n - 2] * se


def idea4(t):
    log("\n== Idea 4: The lockdown test ==")
    groups = [ALL] + MAIN + [OTHER]

    def monthly(sub_label):
        sub = t if sub_label == ALL else t[t.ru == sub_label]
        return sub.groupby(["year", "month_num"])["hospitalisations"].sum().unstack().reindex(columns=range(1, 13)).fillna(0)

    M = {g: monthly(g) for g in groups}
    # monthly 2019-2021, long
    rows = []
    for g in groups:
        for yr in (2019, 2020, 2021):
            for mo in range(1, 13):
                rows.append({"road_user": g, "year": yr, "month_num": mo, "month": MONTH_ABBR[mo - 1],
                             "date": f"{yr}-{mo:02d}-01", "hospitalisations": int(M[g].loc[yr, mo])})
    mon = pd.DataFrame(rows)
    save(mon, "idea4_monthly_2019_2021.csv")

    # annual series + trend per group (used by band + change files)
    A = {g: M[g].sum(axis=1) for g in groups}
    yrs = np.arange(2011, 2020)
    trend20 = {g: predict(ols(yrs, A[g].loc[2011:2019].values), 2020) for g in groups}

    # baseline band
    rows = []
    for g in groups:
        base = M[g].loc[2015:2019]
        seas = (base.div(base.sum(axis=1), axis=0)).mean()        # average seasonal share 2015-19
        for mo in range(1, 13):
            mean, lo, hi = base[mo].mean(), base[mo].min(), base[mo].max()
            v20 = M[g].loc[2020, mo]
            rows.append({"road_user": g, "month_num": mo, "month": MONTH_ABBR[mo - 1],
                         "baseline_mean_2015_2019": round(mean, 1), "baseline_min_2015_2019": int(lo),
                         "baseline_max_2015_2019": int(hi), "hosp_2019": int(M[g].loc[2019, mo]),
                         "hosp_2020": int(v20), "hosp_2021": int(M[g].loc[2021, mo]),
                         "pct_2020_vs_baseline_mean": round(float(pct(v20, mean)), 1),
                         "pct_2020_vs_2019": round(float(pct(v20, M[g].loc[2019, mo])), 1),
                         "position_2020": "above range" if v20 > hi else ("below range" if v20 < lo else "within range"),
                         "trend_adjusted_expected_2020": round(seas[mo] * trend20[g][0], 1),
                         "pct_2020_vs_trend_adjusted": round(float(pct(v20, seas[mo] * trend20[g][0])), 1),
                         "small_base": bool(mean < SMALL_BASE)})
    band = pd.DataFrame(rows)
    save(band, "idea4_baseline_band.csv")
    b = band.set_index(["road_user", "month_num"])
    for g in [ALL, "Pedal cyclist"]:
        above = b.loc[g][b.loc[g].position_2020 == "above range"].month.tolist()
        below = b.loc[g][b.loc[g].position_2020 == "below range"].month.tolist()
        log(f"  {g}: 2020 months above 2015-19 range {above}; below range {below}")
    ab = b.loc[ALL, 4]
    log(f"  April all: 2020 {ab.hosp_2020:,} vs 2019 {ab.hosp_2019:,} ({ab.pct_2020_vs_2019}%), vs 2015-19 mean "
        f"{ab.baseline_mean_2015_2019:,} ({ab.pct_2020_vs_baseline_mean}%), range {ab.baseline_min_2015_2019:,}-{ab.baseline_max_2015_2019:,}")
    key(4, "april_2020_all", int(ab.hosp_2020), "hospitalisations", "Apr 2020", "idea4_baseline_band.csv")
    key(4, "april_2019_all", int(ab.hosp_2019), "hospitalisations", "Apr 2019", "idea4_baseline_band.csv")
    key(4, "april_pct_vs_2019", ab.pct_2020_vs_2019, "%", "Apr 2020 vs Apr 2019", "idea4_baseline_band.csv")
    key(4, "april_baseline_mean", ab.baseline_mean_2015_2019, "hospitalisations", "Apr 2015-19 mean", "idea4_baseline_band.csv")
    key(4, "april_pct_vs_baseline", ab.pct_2020_vs_baseline_mean, "%", "Apr 2020 vs Apr 2015-19 mean", "idea4_baseline_band.csv")
    allm = M[ALL].stack()
    lowest = tuple(int(v) for v in allm.idxmin())
    log(f"  lowest month 2011-2021 (all road users): {lowest} = {allm.min():,}; 2nd lowest {tuple(int(v) for v in allm.drop(lowest).idxmin())} = {allm.drop(lowest).min():,}")
    key(4, "april_2020_lowest_month", f"{lowest[0]}-{lowest[1]:02d}", "lowest month 2011-21", "2011-21",
        "idea4_monthly_2019_2021.csv", f"{allm.min():,}; next lowest {tuple(int(v) for v in allm.drop(lowest).idxmin())} {allm.drop(lowest).min():,}")
    # largest single-month fall vs the same month previous year
    yoy = (M[ALL] / M[ALL].shift(1) - 1) * 100
    log(f"  largest year-on-year monthly fall 2012-2021: {tuple(int(v) for v in yoy.stack().idxmin())} {yoy.stack().min():.1f}%")

    for mo in (4, 5, 6):
        r = b.loc[("Pedal cyclist", mo)]
        log(f"  cyclists {r.month}: 2020 {r.hosp_2020} vs 2019 {r.hosp_2019} ({r.pct_2020_vs_2019:+}%), vs 2015-19 mean "
            f"{r.baseline_mean_2015_2019} ({r.pct_2020_vs_baseline_mean:+}%), max {r.baseline_max_2015_2019}; "
            f"vs trend-adjusted {r.trend_adjusted_expected_2020} ({r.pct_2020_vs_trend_adjusted:+}%)")
    cj = b.loc[("Pedal cyclist", 6)]
    key(4, "cyc_june_2020", int(cj.hosp_2020), "hospitalisations", "Jun 2020", "idea4_baseline_band.csv")
    key(4, "cyc_june_2019", int(cj.hosp_2019), "hospitalisations", "Jun 2019", "idea4_baseline_band.csv")
    key(4, "cyc_june_pct_vs_2019", cj.pct_2020_vs_2019, "%", "Jun 2020 vs Jun 2019", "idea4_baseline_band.csv")
    key(4, "cyc_june_pct_vs_baseline", cj.pct_2020_vs_baseline_mean, "%", "Jun 2020 vs Jun 2015-19 mean", "idea4_baseline_band.csv")
    pk = b.loc["Pedal cyclist"].pct_2020_vs_baseline_mean.idxmax()
    log(f"  cyclists: biggest 2020 excess over baseline mean = {MONTH_ABBR[pk - 1]} "
        f"({b.loc[('Pedal cyclist', pk)].pct_2020_vs_baseline_mean:+}%); highest 2020 count = "
        f"{MONTH_ABBR[int(M['Pedal cyclist'].loc[2020].idxmax()) - 1]} {int(M['Pedal cyclist'].loc[2020].max())}")
    key(4, "cyc_peak_excess_month", MONTH_ABBR[pk - 1], "month", "2020", "idea4_baseline_band.csv",
        f"{b.loc[('Pedal cyclist', pk)].pct_2020_vs_baseline_mean:+}% vs 2015-19 mean")
    c = M["Pedal cyclist"]
    for lab, ms in [("Jan-Mar", [1, 2, 3]), ("Apr-Dec", list(range(4, 13)))]:
        v20, v19, vb = c.loc[2020, ms].sum(), c.loc[2019, ms].sum(), c.loc[2015:2019, ms].sum(axis=1).mean()
        log(f"  cyclists {lab}: 2020 {int(v20):,} vs 2019 {int(v19):,} ({float(pct(v20, v19)):+.1f}%); vs 2015-19 mean "
            f"{vb:,.0f} ({float(pct(v20, vb)):+.1f}%)")
        key(4, f"cyc_{lab.replace('-', '_').lower()}_pct_vs_2019", round(float(pct(v20, v19)), 1), "%",
            f"{lab} 2020 vs 2019", "idea4_monthly_2019_2021.csv", f"{int(v20):,} vs {int(v19):,}")

    # cyclist trend
    cy = A["Pedal cyclist"]
    fits = {"2011_2019": ols(yrs, cy.loc[2011:2019].values),
            "2012_2019": ols(np.arange(2012, 2020), cy.loc[2012:2019].values),
            "2015_2019": ols(np.arange(2015, 2020), cy.loc[2015:2019].values)}
    rows = []
    for yr in range(2011, 2022):
        r = {"year": yr, "actual": int(cy[yr]), "in_fit_period": yr <= 2019,
             "series_break": "pre_vic_2012_change" if yr == 2011 else ("post_nsw_2017_change" if yr >= 2017 else "")}
        for k, f in fits.items():
            yh, lo, hi = predict(f, yr)
            r[f"trend_{k}"] = round(yh, 1)
            if k == "2015_2019":
                r["pi95_low_2015_2019"], r["pi95_high_2015_2019"] = round(lo, 1), round(hi, 1)
                r["outside_pi95_2015_2019"] = bool(cy[yr] > hi or cy[yr] < lo)
            if k == "2011_2019":
                r["pi95_low_2011_2019"], r["pi95_high_2011_2019"] = round(lo, 1), round(hi, 1)
                r["residual_vs_2011_2019"] = round(cy[yr] - yh, 1)
                r["residual_pct_vs_2011_2019"] = round(100 * (cy[yr] - yh) / yh, 1)
                r["outside_pi95"] = bool(cy[yr] > hi or cy[yr] < lo)
        rows.append(r)
    tr = pd.DataFrame(rows)
    save(tr, "idea4_cyclist_trend.csv")
    tt = tr.set_index("year")
    log(f"  cyclist trend 2011-19 slope {fits['2011_2019'][1]:+.1f}/yr; residual SD {fits['2011_2019'][2]:.0f}")
    for yr in (2019, 2020, 2021):
        r = tt.loc[yr]
        log(f"  {yr}: actual {r.actual:,} vs trend {r.trend_2011_2019:,} (PI95 {r.pi95_low_2011_2019:,}-{r.pi95_high_2011_2019:,}) "
            f"resid {r.residual_vs_2011_2019:+} ({r.residual_pct_vs_2011_2019:+}%) outside PI: {r.outside_pi95}; "
            f"alt fits 2012-19 {r.trend_2012_2019:,} / 2015-19 {r.trend_2015_2019:,}")
    r = tt.loc[2020]
    key(4, "cyc_2019", int(tt.loc[2019, "actual"]), "hospitalisations", "2019", "idea4_cyclist_trend.csv")
    key(4, "cyc_2020", int(r.actual), "hospitalisations", "2020", "idea4_cyclist_trend.csv")
    key(4, "cyc_pct_2019_2020", round(float(pct(r.actual, tt.loc[2019, 'actual'])), 1), "%", "2020 vs 2019", "idea4_cyclist_trend.csv")
    key(4, "cyc_trend_expected_2020", r.trend_2011_2019, "hospitalisations", "2020 (2011-19 OLS)", "idea4_cyclist_trend.csv",
        f"PI95 {r.pi95_low_2011_2019}-{r.pi95_high_2011_2019}")
    key(4, "cyc_excess_vs_trend", r.residual_vs_2011_2019, "hospitalisations", "2020", "idea4_cyclist_trend.csv",
        f"{r.residual_pct_vs_2011_2019:+}%; outside PI95 = {r.outside_pi95}")
    key(4, "cyc_excess_vs_trend_2015_19_fit", round(r.actual - r.trend_2015_2019, 1), "hospitalisations", "2020",
        "idea4_cyclist_trend.csv", f"{100 * (r.actual - r.trend_2015_2019) / r.trend_2015_2019:+.1f}% (sensitivity)")
    log(f"  2020 vs 2015-19 fit: expected {r.trend_2015_2019:,} PI95 {r.pi95_low_2015_2019:,}-{r.pi95_high_2015_2019:,}; "
        f"outside: {r.outside_pi95_2015_2019}")
    key(4, "cyc_2015_19_fit_pi95", f"{r.pi95_low_2015_2019}-{r.pi95_high_2015_2019}", "hospitalisations", "2020",
        "idea4_cyclist_trend.csv", f"outside = {r.outside_pi95_2015_2019}")
    bc = band[band.road_user == "Pedal cyclist"].set_index("month_num")
    ad = bc.loc[4:12]
    log(f"  cyclists Apr-Dec 2020 vs trend-adjusted monthly expectation: {int((ad.hosp_2020 > ad.trend_adjusted_expected_2020).sum())} "
        f"of 9 months above; total {int(ad.hosp_2020.sum()):,} vs {ad.trend_adjusted_expected_2020.sum():,.0f} "
        f"({float(pct(ad.hosp_2020.sum(), ad.trend_adjusted_expected_2020.sum())):+.1f}%)")
    key(4, "cyc_apr_dec_vs_trend_adjusted", round(float(pct(ad.hosp_2020.sum(), ad.trend_adjusted_expected_2020.sum())), 1),
        "%", "Apr-Dec 2020", "idea4_baseline_band.csv",
        f"{int(ad.hosp_2020.sum()):,} vs {ad.trend_adjusted_expected_2020.sum():,.0f} expected; "
        f"{int((ad.hosp_2020 > ad.trend_adjusted_expected_2020).sum())}/9 months above")
    key(4, "cyc_months_above_2015_19_max", int((ad.hosp_2020 > ad.baseline_max_2015_2019).sum()), "of 9 months",
        "Apr-Dec 2020", "idea4_baseline_band.csv")
    key(4, "cyc_2021_vs_trend", tt.loc[2021, "residual_pct_vs_2011_2019"], "%", "2021", "idea4_cyclist_trend.csv")

    # road user change 2020 (long)
    rows = []
    for g in groups:
        a = A[g]
        mm = M[g]
        comps = [("year_vs_2019", "2020 vs 2019 (full year)", a[2019], a[2020]),
                 ("year_vs_mean_2015_2019", "2020 vs 2015-19 average (full year)", a.loc[2015:2019].mean(), a[2020]),
                 ("year_vs_trend_2011_2019", "2020 vs 2011-19 trend line (full year)", trend20[g][0], a[2020]),
                 ("april_vs_2019", "April 2020 vs April 2019", mm.loc[2019, 4], mm.loc[2020, 4]),
                 ("april_vs_mean_2015_2019", "April 2020 vs April 2015-19 average", mm.loc[2015:2019, 4].mean(), mm.loc[2020, 4]),
                 ("q2_vs_2019", "Apr-Jun 2020 vs Apr-Jun 2019", mm.loc[2019, [4, 5, 6]].sum(), mm.loc[2020, [4, 5, 6]].sum())]
        for cid, lab, base, v in comps:
            rows.append({"road_user": g, "comparison": cid, "comparison_label": lab, "base_value": round(float(base), 1),
                         "value_2020": int(v), "abs_change": round(float(v - base), 1),
                         "pct_change": round(float(pct(v, base)), 1), "small_base": bool(base < SMALL_BASE)})
    ch = pd.DataFrame(rows)
    save(ch, "idea4_roaduser_change_2020.csv")
    cc = ch.set_index(["road_user", "comparison"])
    log("  road user change 2020: year vs 2019 | vs 2015-19 mean | vs trend | April vs 2019 | April vs mean")
    for g in groups:
        log(f"    {g:15s} {cc.loc[(g, 'year_vs_2019'), 'pct_change']:+6.1f}% | {cc.loc[(g, 'year_vs_mean_2015_2019'), 'pct_change']:+6.1f}% | "
            f"{cc.loc[(g, 'year_vs_trend_2011_2019'), 'pct_change']:+6.1f}% | {cc.loc[(g, 'april_vs_2019'), 'pct_change']:+6.1f}% | "
            f"{cc.loc[(g, 'april_vs_mean_2015_2019'), 'pct_change']:+6.1f}%  ({int(cc.loc[(g, 'year_vs_2019'), 'base_value']):,} -> "
            f"{cc.loc[(g, 'year_vs_2019'), 'value_2020']:,})")
    for g, k in [(ALL, "all"), ("Pedestrian", "ped"), ("Car driver", "driver"), ("Car passenger", "passenger"),
                 ("Motorcyclist", "moto"), ("Pedal cyclist", "cyc")]:
        key(4, f"{k}_pct_2020_vs_2019", cc.loc[(g, "year_vs_2019"), "pct_change"], "%", "2020 vs 2019",
            "idea4_roaduser_change_2020.csv", f"{int(cc.loc[(g, 'year_vs_2019'), 'base_value']):,} -> {cc.loc[(g, 'year_vs_2019'), 'value_2020']:,}")
        key(4, f"{k}_april_pct_vs_2019", cc.loc[(g, "april_vs_2019"), "pct_change"], "%", "Apr 2020 vs Apr 2019",
            "idea4_roaduser_change_2020.csv")

    # cyclist age profile
    cyc = t[(t.road_user == "Pedal cyclist") & t.age_group.isin(AGE_ORDER)]
    ag = cyc.groupby(["age_group", "year"])["hospitalisations"].sum().unstack()
    ca = pd.DataFrame({"age_group": AGE_ORDER})
    ca["hosp_2017_2019_mean"] = ag.loc[AGE_ORDER, [2017, 2018, 2019]].mean(axis=1).round(1).values
    ca["hosp_2019"] = ag.loc[AGE_ORDER, 2019].values
    ca["hosp_2020"] = ag.loc[AGE_ORDER, 2020].values
    ca["hosp_2021"] = ag.loc[AGE_ORDER, 2021].values
    ca["change_2019_2020"] = ca.hosp_2020 - ca.hosp_2019
    ca["pct_2019_2020"] = pct(ca.hosp_2020, ca.hosp_2019).round(1)
    ca["pct_2020_vs_2017_2019_mean"] = pct(ca.hosp_2020, ca.hosp_2017_2019_mean).round(1)
    ca["share_of_total_rise_pct"] = (100 * ca.change_2019_2020 / ca.change_2019_2020.sum()).round(1)
    ca["share_of_2019_cases_pct"] = (100 * ca.hosp_2019 / ca.hosp_2019.sum()).round(1)
    ca["small_base"] = ca.hosp_2019 < SMALL_BASE
    save(ca, "idea4_cyclist_age_2020.csv")
    for _, r in ca.iterrows():
        log(f"  cyclists {r.age_group:6s} {r.hosp_2019:>5} -> {r.hosp_2020:>5} ({r.pct_2019_2020:+.1f}%), "
            f"share of rise {r.share_of_total_rise_pct}% (share of 2019 cases {r.share_of_2019_cases_pct}%)"
            f"{' [small base]' if r.small_base else ''}")
    top = ca.sort_values("share_of_total_rise_pct", ascending=False).iloc[0]
    key(4, "cyc_rise_top_age", top.age_group, "age band", "2019->2020", "idea4_cyclist_age_2020.csv",
        f"{top.share_of_total_rise_pct}% of the rise; {top.pct_2019_2020:+}%")
    for a_ in ["8-16", "40-64", "65-74"]:
        r = ca.set_index("age_group").loc[a_]
        key(4, f"cyc_{a_}_pct_2019_2020", r.pct_2019_2020, "%", "2020 vs 2019", "idea4_cyclist_age_2020.csv",
            f"{r.hosp_2019} -> {r.hosp_2020}")

    # state check (6-monthly; excludes died in hospital)
    st = pd.read_csv(CLEAN / "state_by_road_user.csv")
    st = st[st.road_user == "Pedal cyclist"]
    piv = st.pivot_table(index=["state", "half_year"], columns="year", values="cases_excl_died", aggfunc="sum")
    sup = st.groupby(["state", "half_year"]).suppressed.any()
    rows = []
    for (s_, h), r in piv.iterrows():
        rows.append({"state": s_, "half_year": h, "cases_excl_died_2019": r.get(2019), "cases_excl_died_2020": r.get(2020),
                     "cases_excl_died_2021": r.get(2021)})
    sc = pd.DataFrame(rows)
    sc["change_2019_2020"] = sc.cases_excl_died_2020 - sc.cases_excl_died_2019
    sc["pct_2019_2020"] = pct(sc.cases_excl_died_2020, sc.cases_excl_died_2019).round(1)
    tot = sc.groupby("half_year").change_2019_2020.transform("sum")
    sc["share_of_half_year_rise_pct"] = (100 * sc.change_2019_2020 / tot).round(1)
    sc["any_suppressed_2011_2021"] = sc.set_index(["state", "half_year"]).index.map(sup).values
    sc["small_base"] = sc.cases_excl_died_2019 < SMALL_BASE
    sc["note"] = np.where(sc.state == "NSW", "NSW narrowed its definition from mid-2017; 2019 and 2020 are both post-change", "")
    sc["half_year"] = pd.Categorical(sc.half_year, ["Jan-Jun", "Jul-Dec"], ordered=True)
    sc = sc.sort_values(["half_year", "state"])
    save(sc, "idea4_state_cyclists_2020.csv")
    for _, r in sc.iterrows():
        log(f"  {r.state:4s} {r.half_year}: {r.cases_excl_died_2019:.0f} -> {r.cases_excl_died_2020:.0f} "
            f"({r.pct_2019_2020:+.1f}%), share of national rise {r.share_of_half_year_rise_pct}%"
            f"{' [small base]' if r.small_base else ''}")
    n_up = sc.groupby("half_year", observed=True).apply(lambda d: int((d.change_2019_2020 > 0).sum()), include_groups=False)
    log(f"  states with a rise: {n_up.to_dict()} of 8")
    for h in ["Jan-Jun", "Jul-Dec"]:
        d = sc[sc.half_year == h].set_index("state")
        key(4, f"state_rise_count_{h}", int((d.change_2019_2020 > 0).sum()), "of 8 states", f"{h} 2020 vs {h} 2019",
            "idea4_state_cyclists_2020.csv", "; ".join(f"{s_} {d.loc[s_, 'pct_2019_2020']:+.0f}%" for s_ in d.index))
        key(4, f"state_vic_share_of_rise_{h}", d.loc["Vic", "share_of_half_year_rise_pct"], "% of rise", h,
            "idea4_state_cyclists_2020.csv")
        key(4, f"state_qld_share_of_rise_{h}", d.loc["Qld", "share_of_half_year_rise_pct"], "% of rise", h,
            "idea4_state_cyclists_2020.csv")
    return mon, band, tr, ch, ca, sc


# --------------------------------------------------------------------------------------
# EDA figures (internal checking only)
# --------------------------------------------------------------------------------------
def style(ax, title):
    ax.set_title(title, loc="left", fontsize=11, color=INK)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    ax.spines["left"].set_color(MUTED)
    ax.spines["bottom"].set_color(MUTED)
    ax.tick_params(colors="#52514e", labelsize=8)
    ax.grid(axis="y" if ax.name != "polar" else "both", color="#e6e5e0", lw=0.6)
    ax.set_axisbelow(True)


def fsave(fig, name):
    fig.tight_layout()
    fig.savefig(FIG / name, dpi=130, facecolor="#fcfcfb")
    plt.close(fig)
    log(f"  wrote processing/eda_figures/phase2/{name}")


def figures(bs, sr, ra, cp, op, pa, mon, band, tr, ch, ca, sc):
    log("\n== Figures ==")
    plt.rcParams.update({"font.size": 9, "axes.facecolor": "#fcfcfb"})
    # 1 burden share: paired bars
    fig, ax = plt.subplots(figsize=(7, 3.8))
    order = MAIN + [OTHER]
    x = np.arange(len(order))
    for i, (meas, c) in enumerate([("cases", "#86b6ef"), ("bed_days", "#1c5cab")]):
        v = bs[bs.measure == meas].set_index("road_user").loc[order, "share_pct"]
        ax.bar(x + (i - 0.5) * 0.38, v, 0.36, color=c, label=bs[bs.measure == meas].measure_label.iloc[0])
        for xi, vi in zip(x, v):
            ax.text(xi + (i - 0.5) * 0.38, vi + 0.4, f"{vi}", ha="center", fontsize=7)
    ax.set_xticks(x, [o.replace(" ", "\n") for o in order])
    ax.set_ylabel("% of total, 2016-2021")
    ax.legend(frameon=False, fontsize=8)
    style(ax, "idea3_burden_share: share of people vs share of bed days (2016-21)")
    fsave(fig, "idea3_burden_share.png")

    # 2 severity road user: died per 1000 with CI + stay
    s = sr[sr.level != "detail (within Other road users)"].set_index("road_user").loc[MAIN + [OTHER, ALL]]
    s = s.sort_values("died_per_1000_2011_2019")
    fig, axs = plt.subplots(1, 2, figsize=(9, 3.6), sharey=True)
    y = np.arange(len(s))
    axs[0].hlines(y, s.died_per_1000_ci95_low, s.died_per_1000_ci95_high, color=MUTED, lw=2)
    axs[0].scatter(s.died_per_1000_2011_2019, y, color=[PAL[i] for i in s.index], s=40, zorder=3)
    for yi, v in zip(y, s.died_per_1000_2011_2019):
        axs[0].text(v + 0.6, yi + 0.15, f"{v}", fontsize=7)
    axs[0].set_yticks(y, s.index)
    axs[0].set_xlabel("Died in hospital per 1,000 cases (2011-19), 95% CI")
    style(axs[0], "idea3_severity_roaduser")
    axs[1].barh(y, s.avg_stay_days_2016_2021, color=[PAL[i] for i in s.index], height=0.6)
    for yi, v in zip(y, s.avg_stay_days_2016_2021):
        axs[1].text(v + 0.1, yi, f"{v}", va="center", fontsize=7)
    axs[1].set_xlabel("Average stay, days (2016-21, survivors)")
    style(axs[1], "")
    fsave(fig, "idea3_severity_roaduser.png")

    # 3 road user x age: died per 1000 lines (flagged hollow)
    fig, axs = plt.subplots(1, 2, figsize=(9, 3.6))
    for ru in MAIN:
        d = ra[ra.road_user == ru]
        axs[0].plot(d.age_group.astype(str), d.died_per_1000_2011_2019, color=PAL[ru], lw=2, label=ru)
        f = d[d.mortality_flag != "ok"]
        axs[0].scatter(f.age_group.astype(str), f.died_per_1000_2011_2019, facecolor="white", edgecolor=PAL[ru], s=30, zorder=3)
        axs[1].plot(d.age_group.astype(str), d.avg_stay_days_2016_2021, color=PAL[ru], lw=2, label=ru)
    axs[0].set_ylabel("Died per 1,000 (2011-19); hollow = flagged")
    axs[1].set_ylabel("Average stay, days (2016-21)")
    axs[1].legend(frameon=False, fontsize=7)
    style(axs[0], "idea3_severity_roaduser_age")
    style(axs[1], "")
    fsave(fig, "idea3_severity_roaduser_age.png")

    # 4 counterparty: ranked dots with CI (hollow = flagged) + stay bars
    d = cp[cp.road_user == ALL].sort_values("died_per_1000_2011_2019")
    fig, axs = plt.subplots(1, 2, figsize=(10, 4), sharey=True)
    y = np.arange(len(d))
    ok = (d.mortality_flag == "ok").values
    axs[0].hlines(y, d.died_per_1000_ci95_low, d.died_per_1000_ci95_high, color=MUTED, lw=2)
    axs[0].scatter(d.died_per_1000_2011_2019, y, s=40, zorder=3, color=np.where(ok, "#2a78d6", "white"), edgecolor="#2a78d6")
    for yi, r in zip(y, d.itertuples()):
        axs[0].text(r.died_per_1000_ci95_high + 1, yi, f"{r.died_per_1000_2011_2019} (d={r.died_2011_2019})", va="center", fontsize=7)
    axs[0].set_yticks(y, [f"{c[:30]} (n={n:,})" for c, n in zip(d.counterparty, d.cases_2011_2019)])
    axs[0].set_xlabel("Died per 1,000 cases (2011-19), 95% CI; hollow = <10 deaths")
    style(axs[0], "idea3_severity_counterparty (all road users)")
    axs[1].barh(y, d.avg_stay_days_2016_2021, color="#86b6ef", height=0.6)
    for yi, v in zip(y, d.avg_stay_days_2016_2021):
        axs[1].text(v + 0.2, yi, f"{v}", va="center", fontsize=7)
    axs[1].set_xlabel("Average stay, days (2016-21)")
    style(axs[1], "")
    fsave(fig, "idea3_severity_counterparty.png")

    # 5 older pedestrians
    d = op[(op.age_level == "band")]
    fig, axs = plt.subplots(1, 2, figsize=(9, 3.6))
    for ru, c in [("Pedestrian", PAL["Pedestrian"]), (ALL, PAL[ALL])]:
        e = d[d.road_user == ru]
        axs[0].plot(e.age_group, e.died_per_1000_2011_2019, color=c, lw=2, marker="o", ms=4, label=ru)
        axs[1].plot(e.age_group, e.avg_stay_days_2016_2021, color=c, lw=2, marker="o", ms=4, label=ru)
    axs[0].set_ylabel("Died per 1,000 (2011-19)")
    axs[1].set_ylabel("Average stay, days (2016-21)")
    axs[0].legend(frameon=False, fontsize=8)
    style(axs[0], "idea3_older_pedestrians")
    style(axs[1], "")
    fsave(fig, "idea3_older_pedestrians.png")

    # 6 older pedestrians annual rate
    fig, ax = plt.subplots(figsize=(7, 3.6))
    for ag, c in [("65-74", "#2a78d6"), ("75+", "#eb6834"), ("Under 65", "#8a8984")]:
        e = pa[pa.age_group == ag]
        ax.plot(e.year, e.per_100k, color=c, lw=2, label=ag)
    ax.axvspan(2016.5, 2021.5, color="#f0efec", zorder=0)
    ax.set_ylabel("Pedestrian hospitalisations per 100k")
    ax.legend(frameon=False, fontsize=8)
    style(ax, "idea3_older_pedestrians_annual (shaded = post NSW change)")
    fsave(fig, "idea3_older_pedestrians_annual.png")

    # 7 monthly 2019-2021 small multiples
    groups = [ALL] + MAIN
    fig, axs = plt.subplots(2, 3, figsize=(10, 5.5))
    for ax, g in zip(axs.flat, groups):
        bb = band[band.road_user == g]
        ax.fill_between(bb.month_num, bb.baseline_min_2015_2019, bb.baseline_max_2015_2019, color="#e6e5e0", label="2015-19 range")
        for yr, c in [(2019, "#8a8984"), (2020, "#eb6834"), (2021, "#2a78d6")]:
            e = mon[(mon.road_user == g) & (mon.year == yr)]
            ax.plot(e.month_num, e.hospitalisations, color=c, lw=2 if yr == 2020 else 1.2, label=str(yr))
        ax.set_xticks(range(1, 13), [m[0] for m in MONTH_ABBR])
        style(ax, g)
    axs[0, 0].legend(frameon=False, fontsize=7)
    fig.suptitle("idea4_monthly_2019_2021 (band = 2015-19 min-max)", x=0.01, ha="left", fontsize=11)
    fsave(fig, "idea4_monthly_2019_2021.png")

    # 8 baseline band: 2020 % vs baseline mean, all + cyclists
    fig, ax = plt.subplots(figsize=(7.5, 3.6))
    for g in [ALL, "Pedal cyclist", "Pedestrian"]:
        e = band[band.road_user == g]
        ax.plot(e.month_num, e.pct_2020_vs_baseline_mean, color=PAL[g], lw=2, marker="o", ms=4, label=g)
    ax.axhline(0, color=INK, lw=0.8)
    ax.set_xticks(range(1, 13), MONTH_ABBR)
    ax.set_ylabel("2020 vs 2015-19 monthly mean (%)")
    ax.legend(frameon=False, fontsize=8)
    style(ax, "idea4_baseline_band: 2020 relative to a normal year")
    fsave(fig, "idea4_baseline_band.png")

    # 9 cyclist trend
    fig, ax = plt.subplots(figsize=(7, 3.8))
    ax.fill_between(tr.year, tr.pi95_low_2011_2019, tr.pi95_high_2011_2019, color="#e6e5e0", label="95% prediction interval")
    ax.plot(tr.year, tr.trend_2011_2019, color=MUTED, lw=1.5, ls="--", label="2011-19 trend")
    ax.plot(tr.year, tr.trend_2015_2019, color="#c3c2b7", lw=1, ls=":", label="2015-19 trend (sensitivity)")
    ax.plot(tr.year, tr.actual, color=PAL["Pedal cyclist"], lw=2, marker="o", ms=5, label="Actual")
    for _, r in tr[tr.year >= 2019].iterrows():
        ax.text(r.year, r.actual + 120, f"{r.actual:,}", ha="center", fontsize=7)
    ax.set_ylabel("Cyclist hospitalisations")
    ax.legend(frameon=False, fontsize=7, loc="upper left")
    style(ax, "idea4_cyclist_trend")
    fsave(fig, "idea4_cyclist_trend.png")

    # 10 road user change
    fig, ax = plt.subplots(figsize=(8, 3.8))
    comps = ["year_vs_2019", "year_vs_trend_2011_2019", "april_vs_2019"]
    cols = ["#2a78d6", "#1baf7a", "#eb6834"]
    gs = [ALL] + MAIN + [OTHER]
    y = np.arange(len(gs))
    for i, (cid, c) in enumerate(zip(comps, cols)):
        e = ch[ch.comparison == cid].set_index("road_user").loc[gs]
        ax.barh(y + (i - 1) * 0.27, e["pct_change"], 0.25, color=c, label=e.comparison_label.iloc[0])
    ax.axvline(0, color=INK, lw=0.8)
    ax.set_yticks(y, gs)
    ax.invert_yaxis()
    ax.set_xlabel("% change")
    ax.legend(frameon=False, fontsize=7)
    style(ax, "idea4_roaduser_change_2020")
    fsave(fig, "idea4_roaduser_change_2020.png")

    # 11 cyclist age
    fig, ax = plt.subplots(figsize=(7, 3.4))
    x = np.arange(len(ca))
    ax.bar(x - 0.2, ca.hosp_2019, 0.38, color="#c3c2b7", label="2019")
    ax.bar(x + 0.2, ca.hosp_2020, 0.38, color=PAL["Pedal cyclist"], label="2020")
    for xi, r in zip(x, ca.itertuples()):
        ax.text(xi + 0.2, r.hosp_2020 + 30, f"{r.pct_2019_2020:+.0f}%", ha="center", fontsize=7)
    ax.set_xticks(x, ca.age_group)
    ax.legend(frameon=False, fontsize=8)
    style(ax, "idea4_cyclist_age_2020: cyclist hospitalisations by age")
    fsave(fig, "idea4_cyclist_age_2020.png")

    # 12 state
    fig, axs = plt.subplots(1, 2, figsize=(9, 3.4), sharey=True)
    for ax, h in zip(axs, ["Jan-Jun", "Jul-Dec"]):
        e = sc[sc.half_year == h]
        ax.bar(e.state, e.pct_2019_2020, color=np.where(e.small_base, "white", "#eda100"), edgecolor="#c98500")
        for xi, v in enumerate(e.pct_2019_2020):
            ax.text(xi, v + (1 if v >= 0 else -4), f"{v:+.0f}%", ha="center", fontsize=7)
        ax.axhline(0, color=INK, lw=0.8)
        style(ax, f"idea4_state_cyclists_2020 {h} (2020 vs 2019)")
    axs[0].set_ylabel("% change, cyclists (excl. died)")
    fsave(fig, "idea4_state_cyclists_2020.png")


def main():
    t = load()
    reconcile(t)
    out3 = idea3(t)
    out4 = idea4(t)
    figures(*out3, *out4)
    pd.DataFrame(VALID).to_csv(ROOT / "processing" / "phase2_validation.csv", index=False)
    pd.DataFrame(KEY).to_csv(ROOT / "processing" / "phase2_key_numbers.csv", index=False)
    n_fail = sum(v["result"] == "FAIL" for v in VALID)
    log(f"\nReconciliation: {len(VALID) - n_fail} PASS, {n_fail} FAIL. Key numbers: {len(KEY)} -> processing/phase2_key_numbers.csv")
    (ROOT / "processing" / "phase2_run_log.txt").write_text("\n".join(LOG_LINES) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
