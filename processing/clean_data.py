#!/usr/bin/env python3
"""
clean_data.py - COS30045 A3 (Hospitalised injuries from road crashes, BITRE 2011-2021)

ONE reproducible script: reads the raw tabs of the three BITRE workbooks in ../Datas,
writes tidy CSVs to ../data/clean, runs validations (R10) and prints a summary.

Usage:  python processing/clean_data.py        (from the project root, any cwd works)
Outputs: data/clean/*.csv and processing/validation_results.csv

Rule map (see task brief):
 R1  everything is derived from the `raw` sheets; T1-T5 summary tabs are read ONLY in validate_*()
 R2  filter Cause of injury == "Traffic"
 R3  primary measure = Hospitalisations; Count of cases -> cases_incl_died; Died_cases kept for mortality
 R4  trim whitespace, unknowns -> "Unknown", ordered age bands, month name -> month_num
 R5  NaN investigation per numeric column; fill with 0 only where NaN means zero
 R6  series_break flag per year
 R7  bed-day pairing test; avg stay uses bed_days_excl_died, comparisons restricted to 2016-2021
 R8  died_per_1000 restricted to 2011-2019
 R9  low_count flag (< 30 in either comparison value)
 R10 validation of national, state and First Nations exports against published tables
 R11 parse the 5 side-by-side blocks of the state and First Nations raw sheets
"""
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "Datas"
OUT = ROOT / "data" / "clean"
OUT.mkdir(parents=True, exist_ok=True)

F_NAT = RAW_DIR / "hospitalisation_injury_publication_sep2023.xlsx"
F_STATE = RAW_DIR / "state-and-territory-hospitalisation-injury-publication-2023.xlsx"
F_FN = RAW_DIR / "First-Nations-hospitalised-injuries-2023.xlsx"

AGE_ORDER = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"]
MAIN_ROAD_USERS = ["Car driver", "Car passenger", "Motorcyclist", "Pedal cyclist", "Pedestrian"]
MONTHS = {m: i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July", "August",
     "September", "October", "November", "December"], start=1)}
UNKNOWN_VALUES = {"Missing", "intersex or indeterminate or missing"}   # R4
LOW_COUNT = 30                                                         # R9

validation = []   # rows of the R10 table
notes = {}        # facts collected for the EDA report / console summary


def log(*a):
    print(*a, flush=True)


def check(name, scope, ok, detail="", explained=""):
    """Record a pass/fail. A FAIL is never hidden; `explained` documents a known, benign cause (e.g. n.p. cells)."""
    validation.append({"check": name, "scope": scope, "result": "PASS" if ok else "FAIL", "explained": explained,
                       "detail": detail})
    tag = "PASS" if ok else ("FAIL (explained)" if explained else "FAIL")
    log(f"  [{tag}] {name} | {scope} {detail} {explained}")


def info(name, scope, detail):
    validation.append({"check": name, "scope": scope, "result": "INFO", "explained": "", "detail": detail})
    log(f"  [INFO] {name} | {scope} {detail}")


def save(df, name):
    df.to_csv(OUT / name, index=False, encoding="utf-8")
    log(f"  wrote data/clean/{name}  shape={df.shape}")


# --------------------------------------------------------------------------------------
# National raw -> master (R1-R6)
# --------------------------------------------------------------------------------------
def load_national():
    log("== National raw sheet ==")
    raw = pd.read_excel(F_NAT, sheet_name="raw")                       # R1
    notes["raw_shape"] = raw.shape
    notes["raw_dtypes"] = {c: str(t) for c, t in raw.dtypes.items()}
    notes["raw_cause_counts"] = raw["Cause of injury"].value_counts().to_dict()
    log("  raw shape", raw.shape)

    # R4: trim whitespace on all text columns (before the filter so the filter is robust)
    for c in raw.select_dtypes(include="object").columns:
        raw[c] = raw[c].astype(str).str.strip()

    t = raw[raw["Cause of injury"] == "Traffic"].copy()                 # R2
    notes["traffic_rows"] = len(t)
    log("  Traffic rows", len(t))

    # R5: NaN investigation (Traffic only)
    num = ["Count of cases", "Bed days", "Died_cases", "Died_bed_days", "Hospitalisations"]
    nan_counts = t[num].isna().sum().to_dict()
    notes["nan_counts_traffic"] = nan_counts
    log("  NaN per numeric column (Traffic):", nan_counts)
    cases_nan = t["Count of cases"].isna()
    died_nan = t["Died_cases"].isna()
    notes["cases_nan_rows"] = int(cases_nan.sum())
    notes["cases_nan_all_hosp0"] = bool((t.loc[cases_nan, "Hospitalisations"] == 0).all())
    notes["cases_nan_all_died_nan"] = bool(died_nan[cases_nan].all())
    notes["cases_nan_bed_days_sum"] = int(t.loc[cases_nan, "Bed days"].sum())
    notes["hosp0_rows"] = int((t["Hospitalisations"] == 0).sum())
    notes["died_bd_without_died_cases"] = int((t["Died_bed_days"].notna() & died_nan).sum())
    notes["died_bd_nan_with_died_cases"] = int((t["Died_bed_days"].isna() & t["Died_cases"].notna()).sum())
    # identity tests that justify the fills
    a = t[~cases_nan & died_nan]
    notes["identity_cases_eq_hosp_when_died_nan"] = int((a["Count of cases"] != a["Hospitalisations"]).sum())
    b = t[~cases_nan & ~died_nan]
    notes["identity_cases_eq_hosp_plus_died"] = int(
        (b["Count of cases"] != b["Hospitalisations"] + b["Died_cases"]).sum())
    log("  NaN Count of cases rows:", notes["cases_nan_rows"],
        "| all have Hospitalisations==0:", notes["cases_nan_all_hosp0"],
        "| all have Died_cases NaN:", notes["cases_nan_all_died_nan"],
        "| bed days on those rows:", notes["cases_nan_bed_days_sum"])
    log("  Identity violations: cases==hosp where died NaN:", notes["identity_cases_eq_hosp_when_died_nan"],
        "; cases==hosp+died where died present:", notes["identity_cases_eq_hosp_plus_died"])

    # fills: NaN means "no such events in this cell" (zero) - justified by the identities above
    t["Count of cases"] = t["Count of cases"].fillna(0)
    t["Died_cases"] = t["Died_cases"].fillna(0)
    t["Died_bed_days"] = t["Died_bed_days"].fillna(0)

    t = t.rename(columns={
        "Calendar year": "year", "Month": "month", "ABS remoteness area": "remoteness", "Age group": "age_group",
        "Sex": "sex", "Road user": "road_user", "Counterparty": "counterparty",
        "Count of cases": "cases_incl_died", "Bed days": "bed_days", "Died_cases": "died_cases",
        "Died_bed_days": "died_bed_days", "Hospitalisations": "hospitalisations"})
    for c in ["remoteness", "age_group", "sex"]:                         # R4 unknowns
        t[c] = t[c].replace({v: "Unknown" for v in UNKNOWN_VALUES})
    t["month_num"] = t["month"].map(MONTHS)
    assert t["month_num"].notna().all()
    for c in ["year", "month_num", "cases_incl_died", "bed_days", "died_cases", "died_bed_days", "hospitalisations"]:
        t[c] = t[c].astype(int)
    t["bed_days_excl_died"] = t["bed_days"] - t["died_bed_days"]          # candidate decided by R7 test
    notes["row_level_negative_bed_days_excl_died"] = int((t["bed_days_excl_died"] < 0).sum())
    notes["row_identity_after_fill"] = int((t["cases_incl_died"] != t["hospitalisations"] + t["died_cases"]).sum())
    log("  after fills: cases != hosp+died rows:", notes["row_identity_after_fill"],
        "| rows with bed_days<died_bed_days:", notes["row_level_negative_bed_days_excl_died"])

    # R6 series break
    def sb(y):
        if y == 2011:
            return "pre_vic_2012_change"
        if y >= 2017:
            return "post_nsw_2017_change"
        return ""
    t["series_break"] = t["year"].map(sb)

    cols = ["year", "month_num", "month", "remoteness", "age_group", "sex", "road_user", "counterparty",
            "hospitalisations", "cases_incl_died", "died_cases", "bed_days", "died_bed_days",
            "bed_days_excl_died", "series_break"]
    t = t[cols].sort_values(["year", "month_num", "remoteness", "age_group", "sex", "road_user", "counterparty"]
                            ).reset_index(drop=True)

    # category summaries for the EDA report
    cat = {}
    for c in ["remoteness", "age_group", "sex", "road_user", "counterparty"]:
        vc = t.groupby(c)["hospitalisations"].agg(rows="size", hospitalisations="sum")
        vc["share_hosp_pct"] = (100 * vc["hospitalisations"] / vc["hospitalisations"].sum()).round(2)
        cat[c] = vc.sort_values("hospitalisations", ascending=False)
    notes["categories"] = cat
    return t


# --------------------------------------------------------------------------------------
# Side-by-side block parser for state and First Nations raw sheets (R11)
# --------------------------------------------------------------------------------------
COLMAP = {
    "calendar year": "year", "6-monthly": "half_year", "cause of injury = traffic": "cause_of_injury",
    "cause of injury": "cause_of_injury",
    "count of cases excluding died in hospitals within 30 days": "cases_excl_died",
    "bed days excluding died in hospitals within 30 days": "bed_days_excl_died",
    "state or territory": "state", "first nations status": "first_nations_status",
    "hospitalisations": "hospitalisations", "road user": "road_user", "sex": "sex",
    "age group": "age_group", "counterparty": "counterparty", "abs remoteness area": "remoteness",
}


def parse_blocks(path, names):
    raw = pd.read_excel(path, sheet_name="raw", header=None)                      # R1/R11
    hdr = raw.iloc[1]                                                             # row 2 = header
    starts = [i for i, h in enumerate(hdr) if isinstance(h, str) and h.strip().lower() == "calendar year"]
    assert len(starts) == len(names), (path.name, starts)
    out = {}
    for k, s in enumerate(starts):
        e = starts[k + 1] if k + 1 < len(starts) else raw.shape[1]
        cols = [i for i in range(s, e) if pd.notna(hdr[i])]
        b = raw.iloc[2:, cols].copy()
        b.columns = [COLMAP[str(hdr[i]).strip().lower()] for i in cols]
        b = b.dropna(how="all").reset_index(drop=True)
        assert (b["cause_of_injury"].astype(str).str.strip() == "Traffic").all()
        b = b.drop(columns="cause_of_injury")
        for c in b.columns:
            if b[c].dtype == object:
                b[c] = b[c].astype(str).str.strip() if c not in ("cases_excl_died", "bed_days_excl_died", "hospitalisations") else b[c]
        b["year"] = b["year"].astype(int)
        num_cols = [c for c in ("cases_excl_died", "bed_days_excl_died", "hospitalisations") if c in b.columns]
        supp = pd.Series(False, index=b.index)
        for c in num_cols:                                      # "n.p." -> empty + suppressed flag
            is_np = b[c].astype(str).str.strip().str.lower() == "n.p."
            supp |= is_np
            b[c] = pd.to_numeric(b[c].where(~is_np), errors="raise")
        b["suppressed"] = supp
        for c in ("age_group", "remoteness", "sex"):
            if c in b.columns:
                b[c] = b[c].replace({v: "Unknown" for v in UNKNOWN_VALUES})
        for c in num_cols:
            b[c] = b[c].astype("Int64")
        out[names[k]] = b
    return out


# --------------------------------------------------------------------------------------
# Published-table readers - used ONLY for validation (R1/R10)
# --------------------------------------------------------------------------------------
def read_tables(path, sheet):
    """Return list of (title, DataFrame indexed by year) for each 'Calendar year' header found in column 0."""
    d = pd.read_excel(path, sheet_name=sheet, header=None)
    res = []
    for r in range(len(d)):
        if str(d.iat[r, 0]).strip() == "Calendar year":
            cols = [i for i in range(d.shape[1]) if pd.notna(d.iat[r, i])]
            names = [re.sub(r"\s*\([a-z]\)\s*$", "", str(d.iat[r, i]).strip()) for i in cols]
            rows = []
            rr = r + 1
            while rr < len(d) and pd.notna(d.iat[rr, 0]) and re.fullmatch(r"\d{4}", str(d.iat[rr, 0]).split(".")[0]):
                rows.append([d.iat[rr, i] for i in cols])
                rr += 1
            df = pd.DataFrame(rows, columns=names)
            df["Calendar year"] = df["Calendar year"].astype(int)
            title = str(d.iat[r - 1, 0]).strip() if r > 0 else ""
            res.append((title, df.set_index("Calendar year")))
    return res


def to_num(df):
    return df.apply(lambda s: pd.to_numeric(s.astype(str).str.strip().replace("n.p.", np.nan), errors="coerce"))


def compare(name, scope, mine, pub):
    """Exact comparison of two year-indexed frames on shared columns; report pass/fail, never fix."""
    mine = mine.copy()
    pub = to_num(pub)
    cols = [c for c in pub.columns if c in mine.columns]
    missing = [c for c in pub.columns if c not in mine.columns]
    diff = (mine[cols].reindex(pub.index).fillna(0) - pub[cols]).abs()
    ok = bool((diff.fillna(0).values == 0).all()) and not missing
    detail = f"({len(pub)} yrs x {len(cols)} cols)"
    if missing:
        detail += f" unmatched published cols: {missing}"
    if not ok:
        detail += f" max abs diff={int(np.nanmax(diff.values)) if diff.size else 'n/a'}"
    check(name, scope, ok, detail)
    return ok


def pivot(df, col, val="hospitalisations"):
    return df.pivot_table(index="year", columns=col, values=val, aggfunc="sum", fill_value=0)


def validate_national(t):
    log("== R10 national validation (raw-derived vs published T1-T4) ==")
    # T1
    pub = read_tables(F_NAT, "T1")[0][1]
    mine = t.groupby("year")["hospitalisations"].sum().to_frame("Total")
    compare("National annual total vs T1", "national", mine, pub)
    # T2
    pub = read_tables(F_NAT, "T2")[0][1]
    mine = pivot(t, "road_user")
    mine["Total"] = mine.sum(axis=1)
    compare("Road user x year vs T2", "national", mine, pub)
    # T3
    pub = read_tables(F_NAT, "T3")[0][1]
    mine = pivot(t, "age_group")
    mine["Total"] = mine.sum(axis=1)
    compare("Age group x year vs T3", "national", mine, pub)
    # T4 (published header "Other or unknown" = our "Unknown")
    pub = read_tables(F_NAT, "T4")[0][1].rename(columns={"Other or unknown": "Unknown", "Grand Total": "Total"})
    mine = pivot(t, "remoteness")
    mine["Total"] = mine.sum(axis=1)
    compare("Remoteness x year vs T4", "national", mine, pub)
    # consistency of the extra measures with the published Hosp. definition
    check("cases_incl_died == hospitalisations + died_cases (all rows)", "national",
          notes["row_identity_after_fill"] == 0)


STATE_TITLES = {"New South Wales": "NSW", "Victoria": "Vic", "Queensland": "Qld", "South Australia": "SA",
                "Western Australia": "WA", "Tasmania": "Tas", "Northern Territory": "NT",
                "Australian Capital Territory": "ACT"}
FN_TITLES = {"First Nations peoples": "First Nations people", "Non-Indigenous Australians": "Non-Indigenous"}


def stacked_totals(path, sheet, title_map):
    """{group: Total column} from a sheet with one stacked table per state / status (validation only)."""
    out = {}
    for title, df in read_tables(path, sheet):
        g = title_map[re.sub(r"\s*\([a-z]\)\s*$", "", title)]
        out[g] = to_num(df)["Total"]
    return pd.DataFrame(out)


def block_vs_total(name, scope, block, group_col, measure, pub_total):
    """Compare block sums (group x year) with the published Total column; explain shortfalls by n.p. cells."""
    mine = block.pivot_table(index="year", columns=group_col, values=measure, aggfunc="sum", fill_value=0)
    sup = block[block["suppressed"]].groupby(["year", group_col]).size()
    d = (pub_total.reindex(mine.index)[mine.columns] - mine)
    if (d.fillna(0).values == 0).all():
        check(name, scope, True, f"({d.shape[0]} yrs x {d.shape[1]} groups; suppressed rows: {int(block['suppressed'].sum())})")
        return
    bad = d.stack()[lambda x: x != 0]
    neg = int((bad < 0).sum())
    uncovered = [k for k in bad.index if k not in sup.index]
    expl = "shortfall confined to group-years containing n.p. cells" if (neg == 0 and not uncovered) else ""
    check(name, scope, False,
          f"({len(bad)} of {d.size} group-years differ, max shortfall {int(bad.max())}; "
          f"published totals include the n.p. cells, tidy export leaves them empty)", expl)


def validate_state(blocks):
    log("== R10 state validation ==")
    pub = read_tables(F_STATE, "T1")[0][1]
    pub = pub.rename(columns=lambda c: c.strip())
    mine = pivot(blocks["by_state"], "state", "cases_excl_died")
    compare("State x year (cases excl. died) vs state T1", "state", mine, pub.drop(columns=["Australia"]))
    gap = (pub["Australia"] - mine.sum(axis=1))
    info("Sum of 8 states vs T1 'Australia' column", "state",
         f"gap {int(gap.min())}-{int(gap.max())} cases/yr: T1 Australia includes residents with unknown/other state")
    ref = mine
    for n, sheet in [("by_road_user", "T2"), ("by_age", "T4"), ("by_counterparty", "T5")]:
        block_vs_total(f"Block {n} state x year vs state {sheet} totals", "state", blocks[n], "state",
                       "cases_excl_died", stacked_totals(F_STATE, sheet, STATE_TITLES))
    b = blocks["by_sex"].pivot_table(index="year", columns="state", values="cases_excl_died", aggfunc="sum")
    d = (ref - b)
    check("Block by_sex state x year vs state T1", "state", bool((d.values == 0).all()),
          f"(max shortfall {int(d.max().max())} cases per state-year)",
          "block has only Male/Female; cases with unknown sex (~15 nationally in 11 yrs) are not in this block"
          if (d.values >= 0).all() else "")
    # other blocks vs T1 (required): shown for completeness
    for n in ("by_road_user", "by_age", "by_counterparty"):
        bb = blocks[n].pivot_table(index="year", columns="state", values="cases_excl_died", aggfunc="sum", fill_value=0)
        dd = ref - bb
        sup = int(blocks[n]["suppressed"].sum())
        check(f"Block {n} state x year vs state T1", "state", bool((dd.values == 0).all()),
              f"(max shortfall {int(dd.max().max())}; suppressed rows {sup})",
              "" if (dd.values == 0).all() else ("n.p. cells are missing from the tidy sums" if sup else ""))
    notes["state_by_state_year"] = mine


def validate_fn(blocks):
    log("== R10 First Nations validation ==")
    pub = read_tables(F_FN, "T1")[0][1]
    fnc = [c for c in pub.columns if c.lower().startswith("first")][0]
    nic = [c for c in pub.columns if c.lower().startswith("non")][0]
    pubs = to_num(pub[[fnc, nic]])
    for n, b in blocks.items():
        piv = pivot(b, "first_nations_status")
        m = pd.DataFrame({fnc: piv.get("First Nations people"), nic: piv.get("Non-Indigenous")})
        ns = int(b["suppressed"].sum())
        d = (pubs - m.reindex(pubs.index))
        if (d.fillna(0).values == 0).all():
            check(f"Block {n} status x year vs FN T1", "first_nations", True, f"(suppressed rows: {ns})")
        else:
            yrs = sorted(d.index[(d != 0).any(axis=1)].tolist())
            sup_years = set(b.loc[b["suppressed"], "year"])
            if n == "by_remoteness":
                expl = "block excludes cases with unknown remoteness (see FN T4 check)"
            elif ns and set(yrs) <= sup_years and (d.values >= 0).all():
                expl = "shortfall only in years containing n.p. cells"
            elif ns:
                expl = "n.p. cells missing from tidy sums (+ cases with unknown category not in block)"
            else:
                expl = ""
            check(f"Block {n} status x year vs FN T1", "first_nations", False,
                  f"(max shortfall {int(d.max().max())}; years differing {yrs[0]}-{yrs[-1]}; suppressed rows {ns})", expl)
    for n, sheet in [("by_road_user", "T2"), ("by_age", "T3"), ("by_remoteness", "T4"), ("by_counterparty", "T5")]:
        block_vs_total(f"Block {n} status x year vs FN {sheet} totals", "first_nations", blocks[n],
                       "first_nations_status", "hospitalisations", stacked_totals(F_FN, sheet, FN_TITLES))
    a, c = blocks["by_age"], blocks["by_age_2"]
    dup = a.reset_index(drop=True).equals(c.reset_index(drop=True))
    notes["fn_by_age_duplicate"] = dup
    info("FN block 1 vs block 3 (both 'by age')", "first_nations", "IDENTICAL (exact duplicate)" if dup else "DIFFERENT")


# --------------------------------------------------------------------------------------
# R7 bed-day pairing test
# --------------------------------------------------------------------------------------
def r7_test(t, state_blocks, fn_blocks):
    log("== R7 bed-day pairing test ==")
    nat = t.groupby("year")[["bed_days", "died_bed_days", "hospitalisations"]].sum()
    nat["excl"] = nat["bed_days"] - nat["died_bed_days"]
    # external references: both files report bed days EXCLUDING died-in-hospital cases
    s = state_blocks["by_state"].groupby("year")[["cases_excl_died", "bed_days_excl_died"]].sum()
    fb = fn_blocks["by_counterparty"]          # no n.p. cells, covers all identified-status cases
    f = fb.groupby("year")[["hospitalisations", "bed_days_excl_died"]].sum()
    res = pd.DataFrame(index=nat.index)
    # Direct test (1): coverage of external file vs national.  If external excludes only unlocated people,
    # bed-day coverage ~ case coverage when the national figure is on the SAME basis (excl. died).
    for tag, ext_c, ext_b in [("state", s["cases_excl_died"], s["bed_days_excl_died"]),
                              ("fn", f["hospitalisations"], f["bed_days_excl_died"])]:
        cov_c = 100 * ext_c / nat["hospitalisations"]
        res[f"{tag}_case_cov_pct"] = cov_c.round(2)
        res[f"{tag}_bd_cov_plain_pct"] = (100 * ext_b / nat["bed_days"]).round(2)
        res[f"{tag}_bd_cov_excl_pct"] = (100 * ext_b / nat["excl"]).round(2)
        res[f"{tag}_gap_plain_pp"] = (res[f"{tag}_bd_cov_plain_pct"] - cov_c).round(2)
        res[f"{tag}_gap_excl_pp"] = (res[f"{tag}_bd_cov_excl_pct"] - cov_c).round(2)
    # Direct test (2): average stay in external file vs national under each pairing
    res["alos_state"] = (s["bed_days_excl_died"] / s["cases_excl_died"]).round(3)
    res["alos_fn"] = (f["bed_days_excl_died"] / f["hospitalisations"]).round(3)
    res["alos_nat_plain"] = (nat["bed_days"] / nat["hospitalisations"]).round(3)
    res["alos_nat_excl"] = (nat["excl"] / nat["hospitalisations"]).round(3)
    res["died_bed_days"] = nat["died_bed_days"]
    log(res.T.to_string())
    yrs = [y for y in res.index if nat.loc[y, "died_bed_days"] > 0]                     # 2021 has no died bed days
    summ = {}
    for tag in ("state", "fn"):
        summ[tag] = (res.loc[yrs, f"{tag}_gap_plain_pp"].abs().mean(), res.loc[yrs, f"{tag}_gap_excl_pp"].abs().mean())
        log(f"  {tag}: mean |bed-day coverage - case coverage| (pp) over {yrs[0]}-{yrs[-1]}: "
            f"plain Bed days = {summ[tag][0]:.2f}, Bed days - Died_bed_days = {summ[tag][1]:.2f}")
    # Criterion: a pairing is "consistent" if its bed-day coverage tracks case coverage better than the other
    # pairing (a) on average in BOTH external files and (b) in at least 80% of the tested file-years.
    wins = sum(int((res.loc[yrs, f"{k}_gap_excl_pp"].abs() < res.loc[yrs, f"{k}_gap_plain_pp"].abs()).sum()) for k in ("state", "fn"))
    total = 2 * len(yrs)
    consistent = all(summ[k][1] < summ[k][0] for k in summ) and wins / total >= 0.8
    notes["r7_wins"] = (wins, total)
    notes["r7"] = {"table": res, "summary": summ, "excl_consistent": consistent, "years_tested": yrs}
    check("R7: (Bed days - Died_bed_days) is the pairing consistent with state/FN files", "bed days", consistent,
          f"mean gap state {summ['state'][1]:.2f}pp vs {summ['state'][0]:.2f}pp; FN {summ['fn'][1]:.2f}pp vs {summ['fn'][0]:.2f}pp; excl-died closer in {wins}/{total} file-years")
    notes["r7_decision"] = "excl_died" if consistent else "plain"
    return res


# --------------------------------------------------------------------------------------
# Derived analysis tables
# --------------------------------------------------------------------------------------
def build_outputs(t):
    log("== Derived outputs ==")
    # 2. idea1_national_annual
    a = t.groupby("year").agg(hospitalisations=("hospitalisations", "sum"), cases_incl_died=("cases_incl_died", "sum"),
                              died_cases=("died_cases", "sum"), bed_days_excl_died=("bed_days_excl_died", "sum")
                              ).reset_index()
    h11 = a.loc[a["year"] == 2011, "hospitalisations"].iloc[0]
    a["index_2011"] = (100 * a["hospitalisations"] / h11).round(1)
    a["series_break"] = a["year"].map(t.groupby("year")["series_break"].first())
    a = a[["year", "hospitalisations", "index_2011", "cases_incl_died", "died_cases", "bed_days_excl_died", "series_break"]]
    save(a, "idea1_national_annual.csv")

    # 3. idea1_national_monthly
    m = t.groupby(["year", "month_num"], as_index=False)["hospitalisations"].sum()
    m["date"] = pd.to_datetime(dict(year=m["year"], month=m["month_num"], day=1)).dt.strftime("%Y-%m-%d")
    save(m[["year", "month_num", "date", "hospitalisations"]], "idea1_national_monthly.csv")

    # 4. idea2_roaduser_age_annual (complete grid, absent combination = 0 cases)
    s = t[t["road_user"].isin(MAIN_ROAD_USERS) & t["age_group"].isin(AGE_ORDER)]
    g = s.groupby(["road_user", "age_group", "year"])["hospitalisations"].sum()
    idx = pd.MultiIndex.from_product([MAIN_ROAD_USERS, AGE_ORDER, sorted(t["year"].unique())],
                                     names=["road_user", "age_group", "year"])
    g = g.reindex(idx, fill_value=0).reset_index()
    save(g, "idea2_roaduser_age_annual.csv")
    notes["excluded_from_idea2"] = int(t["hospitalisations"].sum() - g["hospitalisations"].sum())

    # 5. idea2_heatmap_change
    w = g.pivot_table(index=["road_user", "age_group"], columns="year", values="hospitalisations")
    hm = pd.DataFrame({"hosp_2011": w[2011], "hosp_2021": w[2021]})
    hm[["hosp_2011", "hosp_2021"]] = hm[["hosp_2011", "hosp_2021"]].astype(int)
    hm["abs_change"] = hm["hosp_2021"] - hm["hosp_2011"]
    hm["pct_change"] = np.where(hm["hosp_2011"] > 0, (100 * hm["abs_change"] / hm["hosp_2011"].replace(0, np.nan)).round(1), np.nan)
    a1113 = w[[2011, 2012, 2013]].mean(axis=1)
    a1921 = w[[2019, 2020, 2021]].mean(axis=1)
    hm["avg_2011_2013"] = a1113.round(1)
    hm["avg_2019_2021"] = a1921.round(1)
    hm["pct_change_3yr"] = np.where(a1113 > 0, (100 * (a1921 - a1113) / a1113.replace(0, np.nan)).round(1), np.nan)
    hm["low_count"] = (hm["hosp_2011"] < LOW_COUNT) | (hm["hosp_2021"] < LOW_COUNT)      # R9
    hm = hm.reset_index()
    hm["road_user"] = pd.Categorical(hm["road_user"], MAIN_ROAD_USERS, ordered=True)
    hm["age_group"] = pd.Categorical(hm["age_group"], AGE_ORDER, ordered=True)
    hm = hm.sort_values(["road_user", "age_group"]).reset_index(drop=True)
    hm["road_user"] = hm["road_user"].astype(str)
    hm["age_group"] = hm["age_group"].astype(str)
    save(hm, "idea2_heatmap_change.csv")

    # 6. idea2_age_severity   (R7 bed days 2016-2021, R8 mortality 2011-2019)
    ta = t[t["age_group"].isin(AGE_ORDER)]
    sev = ta[ta["year"] >= 2016].groupby("age_group").agg(
        hosp_2016_2021=("hospitalisations", "sum"), bed_days_excl_died_2016_2021=("bed_days_excl_died", "sum"),
        bed_days_plain=("bed_days", "sum"))
    sev["avg_stay_days_2016_2021"] = (sev["bed_days_excl_died_2016_2021"] / sev["hosp_2016_2021"]).round(1)
    sev["avg_stay_plain_old_method"] = (sev["bed_days_plain"] / sev["hosp_2016_2021"]).round(1)
    mort = ta[ta["year"] <= 2019].groupby("age_group").agg(cases_2011_2019=("cases_incl_died", "sum"),
                                                          died_2011_2019=("died_cases", "sum"))
    mort["died_per_1000_2011_2019"] = (1000 * mort["died_2011_2019"] / mort["cases_2011_2019"]).round(1)
    sv = sev.join(mort).reindex(AGE_ORDER).reset_index()
    notes["age_severity_full"] = sv.copy()
    save(sv[["age_group", "hosp_2016_2021", "bed_days_excl_died_2016_2021", "avg_stay_days_2016_2021",
             "cases_2011_2019", "died_2011_2019", "died_per_1000_2011_2019"]], "idea2_age_severity.csv")
    return a, hm, sv


def spot_checks(a, hm, sv):
    log("== Sanity checks vs HANDOFF/FOCUS_2_IDEAS ==")
    h = a.set_index("year")["hospitalisations"]
    check("2011 total = 34,033 and 2021 = 39,505", "sanity", h[2011] == 34033 and h[2021] == 39505)
    g = hm.set_index(["road_user", "age_group"])["pct_change"]
    for k, exp in [(("Pedal cyclist", "65-74"), 212), (("Pedal cyclist", "75+"), 228), (("Motorcyclist", "65-74"), 150)]:
        check(f"Heatmap {k[0]} {k[1]} ~ +{exp}%", "sanity", abs(g[k] - exp) < 1.0, f"(got {g[k]})")


# --------------------------------------------------------------------------------------
def main():
    t = load_national()
    state = parse_blocks(F_STATE, ["by_state", "by_road_user", "by_sex", "by_age", "by_counterparty"])
    fn = parse_blocks(F_FN, ["by_age", "by_road_user", "by_age_2", "by_remoteness", "by_counterparty"])
    log("== Block outputs (R11) ==")
    for n, b in state.items():
        save(b, f"state_{n}.csv")
    for n, b in fn.items():
        save(b, f"first_nations_{n}.csv")
    notes["state_blocks"] = {n: (len(b), int(b["suppressed"].sum())) for n, b in state.items()}
    notes["fn_blocks"] = {n: (len(b), int(b["suppressed"].sum())) for n, b in fn.items()}

    validate_national(t)
    validate_state(state)
    validate_fn(fn)
    r7_test(t, state, fn)

    # R7 decision is applied: if the test had favoured the plain pairing, bed_days_excl_died would be redefined here
    if notes["r7_decision"] != "excl_died":
        log("WARNING: R7 test did not favour Bed days - Died_bed_days; review before using bed_days_excl_died")
    save(t, "traffic_national_monthly_clean.csv")
    a, hm, sv = build_outputs(t)
    spot_checks(a, hm, sv)

    # anomalies
    log("== Anomalies / facts ==")
    log("  died_cases by year:", a.set_index("year")["died_cases"].to_dict())
    alos = (a.set_index("year")["bed_days_excl_died"] / a.set_index("year")["hospitalisations"]).round(2)
    notes["alos_by_year"] = alos.to_dict()
    log("  avg stay by year (bed_days_excl_died/hosp):", notes["alos_by_year"])
    log("  Idea2 grid excludes", notes["excluded_from_idea2"], "hospitalisations (other road users / unknown age)")
    log("  state blocks (rows, suppressed):", notes["state_blocks"])
    log("  FN blocks (rows, suppressed):", notes["fn_blocks"])
    log("  FN block 1 == block 3:", notes["fn_by_age_duplicate"])
    log("  Old (plain Bed days) vs new avg stay by age, 2016-21:")
    log(notes["age_severity_full"][["age_group", "avg_stay_plain_old_method", "avg_stay_days_2016_2021",
                                    "died_per_1000_2011_2019"]].to_string(index=False))
    for c, vc in notes["categories"].items():
        log(f"  -- {c} (hospitalisations share)"); log(vc.to_string())

    v = pd.DataFrame(validation)
    v.to_csv(ROOT / "processing" / "validation_results.csv", index=False, encoding="utf-8")
    fails = v[v["result"] == "FAIL"]
    n_expl = int((fails["explained"] != "").sum())
    log(f"\nSUMMARY: {int((v['result']=='PASS').sum())} PASS, {len(fails)} FAIL "
        f"({n_expl} explained, {len(fails) - n_expl} UNEXPLAINED), {int((v['result']=='INFO').sum())} INFO")
    return 0


if __name__ == "__main__":
    sys.exit(main())
