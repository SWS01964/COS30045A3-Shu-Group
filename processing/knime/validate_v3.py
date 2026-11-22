#!/usr/bin/env python3
"""Validate the KNIME v3 outputs against the Python outputs in data/clean/.

Usage: python processing/knime/validate_v3.py <KNIME output folder (the workflow's data/)>
For every CSV that clean_data.py, supplementary_data.py and phase2_ideas.py write, checks that the same-named KNIME file
exists, has identical columns (names + order), the same row count, and equal values after sorting (numbers within 1e-6).
Writes processing/knime/v3_validation.csv (file, check, result, detail, website, source) and exits 1 on any FAIL.
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
CLEAN = ROOT / "data" / "clean"
CD, SD, P2 = "clean_data.py", "supplementary_data.py", "phase2_ideas.py"
FILES = {  # file -> source script
    **{f: CD for f in [
        "traffic_national_monthly_clean", "idea1_national_annual", "idea1_national_monthly", "idea2_roaduser_age_annual",
        "idea2_heatmap_change", "idea2_age_severity", "state_by_state", "state_by_road_user", "state_by_sex",
        "state_by_age", "state_by_counterparty", "first_nations_by_age", "first_nations_by_road_user",
        "first_nations_by_age_2", "first_nations_by_remoteness", "first_nations_by_counterparty"]},
    **{f: SD for f in ["supp_population_annual", "supp_population_age", "supp_road_deaths_annual", "idea1_rates",
                       "idea1_index_long", "idea2_age_population_change"]},
    **{f: P2 for f in ["idea3_burden_share", "idea3_severity_roaduser", "idea3_severity_roaduser_age",
                       "idea3_severity_counterparty", "idea3_older_pedestrians", "idea3_older_pedestrians_annual",
                       "idea4_monthly_2019_2021", "idea4_baseline_band", "idea4_cyclist_trend",
                       "idea4_roaduser_change_2020", "idea4_cyclist_age_2020", "idea4_state_cyclists_2020"]}}
WEBSITE = set("""idea1_rates idea1_index_long idea2_heatmap_change idea2_age_population_change idea2_roaduser_age_annual
idea2_age_severity idea3_burden_share idea3_severity_roaduser idea3_older_pedestrians idea3_severity_counterparty
idea4_baseline_band idea4_monthly_2019_2021 idea4_roaduser_change_2020 idea4_cyclist_trend idea4_cyclist_age_2020
idea4_state_cyclists_2020""".split())
TOL = 1e-6


def norm(df):
    """Booleans/True-False strings -> str; keep numerics numeric."""
    df = df.copy()
    for c in df.columns:
        if df[c].dtype == object:
            s = df[c].astype(str)
            if set(s.dropna().unique()) <= {"True", "False", "nan"}:
                df[c] = s.where(df[c].notna(), None)
        elif df[c].dtype == bool:
            df[c] = df[c].map({True: "True", False: "False"})
    return df


def sort_key(df):
    k = pd.DataFrame(index=df.index)
    for c in df.columns:
        s = df[c]
        k[c] = s.round(3).astype(str) if pd.api.types.is_float_dtype(s) else s.astype(str)
    return k


def compare(py, kn):
    py, kn = norm(py), norm(kn)
    py = py.loc[sort_key(py).sort_values(list(py.columns)).index].reset_index(drop=True)
    kn = kn.loc[sort_key(kn).sort_values(list(kn.columns)).index].reset_index(drop=True)
    bad = []
    for c in py.columns:
        a, b = py[c], kn[c]
        if pd.api.types.is_numeric_dtype(a) and pd.api.types.is_numeric_dtype(b):
            af, bf = a.astype(float), b.astype(float)
            same_na = af.isna() == bf.isna()
            close = np.isclose(af.fillna(0), bf.fillna(0), rtol=1e-9, atol=TOL)
            ok = same_na & close
        else:
            ok = (a.astype(str).where(a.notna(), "") == b.astype(str).where(b.notna(), ""))
        if not ok.all():
            i = int(np.argmin(ok.values))
            bad.append(f"{c}: {int((~ok).sum())} diffs (row {i}: python={a.iloc[i]!r} knime={b.iloc[i]!r})")
    return bad


def main():
    kdir = Path(sys.argv[1])
    rows = []
    for f, src in FILES.items():
        web = "yes" if f in WEBSITE else "no"

        def add(check, res, detail=""):
            rows.append(dict(file=f + ".csv", check=check, result=res, detail=detail, website=web, source=src))
        kp, pp = kdir / f"{f}.csv", CLEAN / f"{f}.csv"
        if not kp.exists():
            add("exists", "FAIL", "KNIME output file missing")
            continue
        add("exists", "PASS")
        py, kn = pd.read_csv(pp, low_memory=False), pd.read_csv(kp, low_memory=False)
        if list(py.columns) == list(kn.columns):
            add("columns", "PASS", f"{len(py.columns)} columns, same names and order")
        else:
            add("columns", "FAIL", f"python={list(py.columns)} knime={list(kn.columns)}")
            continue
        if len(py) == len(kn):
            add("rows", "PASS", f"{len(py)} rows")
        else:
            add("rows", "FAIL", f"python={len(py)} knime={len(kn)}")
            continue
        bad = compare(py, kn)
        add("values", "FAIL" if bad else "PASS", "; ".join(bad[:4]) if bad else "all cells equal after sorting (numbers within 1e-6)")
    v = pd.DataFrame(rows)
    v.to_csv(ROOT / "processing" / "knime" / "v3_validation.csv", index=False)
    per = v.groupby("file").result.apply(lambda s: "PASS" if (s == "PASS").all() else "FAIL")
    files_pass = [f for f, r in per.items() if r == "PASS"]
    web_files = [f + ".csv" for f in WEBSITE]
    wp = sum(1 for f in web_files if per.get(f) == "PASS")
    print(f"files: {len(files_pass)} PASS / {len(per) - len(files_pass)} FAIL of {len(FILES)}; "
          f"website files {wp}/{len(web_files)} PASS; checks {int((v.result == 'PASS').sum())} PASS / {int((v.result == 'FAIL').sum())} FAIL")
    for f, r in per.items():
        if r != "PASS":
            print("FAIL", f, "|", "; ".join(v[(v.file == f) & (v.result == "FAIL")].detail.tolist())[:300])
    return 0 if (v.result == "PASS").all() else 1


if __name__ == "__main__":
    sys.exit(main())
