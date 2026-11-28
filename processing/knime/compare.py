"""Compare the CSVs the KNIME workflow wrote against the independent Python reference.

    python -I processing/knime/compare.py [--dir DIR] [--files a.csv,b.csv] [--copy]

Looks at every data/reference/<name>.csv. If the workflow wrote the same name in knime/BeyondTheRoadToll/data/, the two
are compared: columns matched by name, rows sorted by the text key columns (then the leading whole-number columns),
numbers within 0.051, blank == blank, TRUE/FALSE as text. Reference files with no KNIME output yet are skipped.
--copy first copies the workflow's output CSVs (everything in its data/ that is not an input file) to data/processed/.
Exit code 0 if nothing FAILed. Needs pandas (use the venv python).
"""
import shutil, sys
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
WF_DATA = ROOT / "knime" / "BeyondTheRoadToll" / "data"
REF = ROOT / "data" / "reference"
PROCESSED = ROOT / "data" / "processed"
INPUT_NAMES = {"hospitalisation_injury_publication_sep2023.xlsx", "state-and-territory-hospitalisation-injury-publication-2023.xlsx",
               "First-Nations-hospitalised-injuries-2023.xlsx", "ABS_ERP_Q_AUS_persons_2011Q2-2021Q2.csv", "ardd_fatalities.csv"}
TOL = 0.051
MAX_SHOW = 8


def read(p):
    return pd.read_csv(p, dtype=str, keep_default_na=False, na_values=["", "NaN", "Infinity", "-Infinity"])   # all text; blank, NaN, +-Infinity -> missing


def to_num(s):
    return pd.to_numeric(s, errors="coerce")


def is_numeric_col(s):
    v = s.dropna()
    return len(v) > 0 and to_num(v).notna().all()


def compare(name, wf_data):
    ref, got = read(REF / name), read(wf_data / name)
    msgs = []
    miss = [c for c in ref.columns if c not in got.columns]
    extra = [c for c in got.columns if c not in ref.columns]
    if miss:
        msgs.append(f"missing columns in KNIME output: {miss}")
    if extra:
        msgs.append(f"extra columns in KNIME output: {extra}")
    cols = [c for c in ref.columns if c in got.columns]
    if len(ref) != len(got):
        msgs.append(f"row count: reference {len(ref)}, KNIME {len(got)}")
    # sort keys: text columns (not TRUE/FALSE flags), then leading whole-number columns
    keys = []
    for c in cols:
        vals = set(ref[c].dropna())
        if not is_numeric_col(ref[c]) and not vals <= {"TRUE", "FALSE"} and len(vals) > 0:
            keys.append(c)
    for c in cols:
        if not is_numeric_col(ref[c]):
            continue
        if ref[c].notna().all() and (to_num(ref[c]) % 1 == 0).all():
            keys.append(c)
        else:
            break
    a = ref[cols].sort_values(keys, kind="mergesort", na_position="last").reset_index(drop=True)
    b = got[cols].sort_values(keys, kind="mergesort", na_position="last").reset_index(drop=True)
    n = min(len(a), len(b))
    diffs = []
    for c in cols:
        numeric = is_numeric_col(ref[c])
        for i in range(n):
            x, y = a.at[i, c], b.at[i, c]
            if pd.isna(x) and pd.isna(y):
                continue
            if pd.isna(x) or pd.isna(y):
                diffs.append((i, c, x, y)); continue
            if numeric:
                fx, fy = to_num(pd.Series([x])).iloc[0], to_num(pd.Series([y])).iloc[0]
                if pd.isna(fy) or abs(fx - fy) > TOL:
                    diffs.append((i, c, x, y))
            elif str(x).strip() != str(y).strip():
                diffs.append((i, c, x, y))
    ok = not (msgs or diffs)
    print(f"{'PASS' if ok else 'FAIL'}  {name}  ({len(ref)} rows, {len(cols)} columns compared)")
    for m in msgs:
        print("      " + m)
    for i, c, x, y in diffs[:MAX_SHOW]:
        label = " | ".join(str(a.at[i, k]) for k in keys[:3])
        print(f"      row {i} [{label}] {c}: reference={x!r}  knime={y!r}")
    if len(diffs) > MAX_SHOW:
        print(f"      ... {len(diffs) - MAX_SHOW} more differing cells")
    return ok


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=str(WF_DATA), help="folder holding the workflow's output CSVs")
    ap.add_argument("--files", help="comma list of CSV names to compare (default: every reference file)")
    ap.add_argument("--copy", action="store_true", help="copy outputs to data/processed/ (only with the default --dir)")
    a = ap.parse_args()
    wf_data = Path(a.dir).resolve()
    if a.copy and wf_data == WF_DATA.resolve():
        PROCESSED.mkdir(parents=True, exist_ok=True)
        for p in sorted(wf_data.glob("*.csv")):
            if p.name not in INPUT_NAMES:
                shutil.copy(p, PROCESSED / p.name)
                print(f"copied {p.name} -> data/processed/")
    elif a.copy:
        print("--copy ignored: --dir is not the default workflow folder")
    names = a.files.split(",") if a.files else [p.name for p in sorted(REF.glob("*.csv"))]
    allok = True
    for name in names:
        if not (REF / name).exists():
            print(f"FAIL  {name}  (no reference file)"); allok = False
        elif not (wf_data / name).exists():
            print(f"skip  {name}  (no KNIME output yet)")
        else:
            allok &= compare(name, wf_data)
    return 0 if allok else 1


if __name__ == "__main__":
    sys.exit(main())
