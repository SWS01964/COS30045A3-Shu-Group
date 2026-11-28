"""Independent reference implementation of the section-4 data contract.
Writes the 7 CSVs to data/reference/ (for cell-by-cell comparison with KNIME).
Run:  python -I processing/reference/reference_outputs.py
"""
import math, os
import numpy as np, pandas as pd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "data", "reference")
os.makedirs(OUT, exist_ok=True)
YEARS = list(range(2011, 2022))
AGES = ["0-7", "8-16", "17-25", "26-39", "40-64", "65-74", "75+"]
MAIN = ["Car driver", "Car passenger", "Motorcyclist", "Pedal cyclist", "Pedestrian"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]


def r(x, d):
    """Round half up (away from zero); NaN/None stays NaN."""
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return np.nan
    s = 1 if x >= 0 else -1
    return s * math.floor(abs(x) * 10 ** d + 0.5) / 10 ** d


def div(a, b):
    """Safe divide: NaN when denominator is 0/missing."""
    return np.nan if (b is None or b == 0 or pd.isna(b) or pd.isna(a)) else a / b


def write(df, name):
    # blanks for NaN; flags as TRUE/FALSE text; integers stay plain
    df.to_csv(os.path.join(OUT, name), index=False, na_rep="")
    print(f"{name}: {len(df)} rows")


# ---------------------------------------------------------------- clean base
raw = pd.read_excel(os.path.join(ROOT, "Datas/hospitalisation_injury_publication_sep2023.xlsx"),
                    sheet_name="raw")
b = raw[raw["Cause of injury"] == "Traffic"].copy()
for c in ["Count of cases", "Died_cases", "Died_bed_days"]:
    b[c] = b[c].fillna(0)
b = b.rename(columns={"Calendar year": "year", "Month": "month", "ABS remoteness area": "remoteness",
                      "Age group": "age_group", "Road user": "road_user", "Counterparty": "counterparty",
                      "Count of cases": "cases", "Bed days": "bed_days", "Died_cases": "died",
                      "Died_bed_days": "died_bed_days", "Hospitalisations": "hosp"})
b["bed_surv"] = b["bed_days"] - b["died_bed_days"]
b["year"] = b["year"].astype(int)

# ---------------------------------------------------------------- supplementary
erp = pd.read_csv(os.path.join(ROOT, "data/supplementary/raw/ABS_ERP_Q_AUS_persons_2011Q2-2021Q2.csv"),
                  dtype={"AGE": str})
erp = erp[erp["TIME_PERIOD"].str.endswith("-Q2")].copy()
erp["year"] = erp["TIME_PERIOD"].str[:4].astype(int)


def band(a):
    if a == "TOT":
        return "All ages"
    if not a.isdigit():          # codes starting with "A", "8599", etc.
        return None
    n = int(a)
    if n > 100:                  # 8599 = ABS '85 and over' aggregate; singles 0..100 already sum to TOT
        return None
    for lo, hi, lab in [(0, 7, "0-7"), (8, 16, "8-16"), (17, 25, "17-25"), (26, 39, "26-39"),
                        (40, 64, "40-64"), (65, 74, "65-74")]:
        if lo <= n <= hi:
            return lab
    return "75+"


erp["band"] = erp["AGE"].map(band)
pop = erp.dropna(subset=["band"]).groupby(["year", "band"])["OBS_VALUE"].sum()
ardd = pd.read_csv(os.path.join(ROOT, "data/supplementary/raw/ardd_fatalities.csv"), usecols=["Year"])
deaths = ardd[ardd["Year"].between(2011, 2021)].groupby("Year").size()

# ---------------------------------------------------------------- ch1
y = b.groupby("year")[["hosp", "cases", "died"]].sum()
rows = []
for yr in YEARS:
    h, c, d = y.loc[yr]
    p, rd = pop[(yr, "All ages")], deaths[yr]
    rows.append(dict(year=yr, hosp=int(h), cases=int(c), died=int(d), population=int(p), road_deaths=int(rd),
                     hosp_per_100k=r(h / p * 1e5, 1), deaths_per_100k=r(rd / p * 1e5, 2),
                     hosp_per_death=r(h / rd, 1),
                     series_note="before Vic change" if yr == 2011 else ("after NSW change" if yr >= 2017 else "")))
ch1 = pd.DataFrame(rows)
write(ch1, "ch1_trend.csv")

# ---------------------------------------------------------------- ch2
m = b[b.road_user.isin(MAIN) & b.age_group.isin(AGES)]
piv = m.pivot_table(index=["road_user", "age_group"], columns="year", values="hosp", aggfunc="sum", fill_value=0)
rows = []
for ru in MAIN:
    for ag in AGES:
        v = piv.loc[(ru, ag)] if (ru, ag) in piv.index else pd.Series(0, index=YEARS)
        a1 = np.mean([v.get(k, 0) for k in (2011, 2012, 2013)])
        a2 = np.mean([v.get(k, 0) for k in (2019, 2020, 2021)])
        p1 = np.mean([pop[(k, ag)] for k in (2011, 2012, 2013)])
        p2 = np.mean([pop[(k, ag)] for k in (2019, 2020, 2021)])
        row = dict(road_user=ru, age_group=ag)
        row.update({str(k): int(v.get(k, 0)) for k in YEARS})
        pct = div(a2, a1)
        rate = div(div(a2, p2), div(a1, p1))
        row.update(avg_2011_13=r(a1, 1), avg_2019_21=r(a2, 1),
                   pct_change_3yr=r((pct - 1) * 100, 1) if not pd.isna(pct) else np.nan,
                   pop_2011_13=r(p1, 0), pop_2019_21=r(p2, 0),
                   rate_change_3yr=r((rate - 1) * 100, 1) if not pd.isna(rate) else np.nan,
                   low_count="TRUE" if (a1 < 30 or a2 < 30) else "FALSE")
        rows.append(row)
ch2 = pd.DataFrame(rows)
for c in ["pop_2011_13", "pop_2019_21"]:
    ch2[c] = ch2[c].astype("int64")
write(ch2, "ch2_age_roaduser.csv")

# ---------------------------------------------------------------- severity
s = b.copy()
s["cases_1119"] = np.where(s.year <= 2019, s.cases, 0)
s["died_1119"] = np.where(s.year <= 2019, s.died, 0)
s["hosp_1621"] = np.where(s.year >= 2016, s.hosp, 0)
s["beds_1621"] = np.where(s.year >= 2016, s.bed_surv, 0)
tot = s.copy(); tot["road_user"] = "All road users"
s = pd.concat([s, tot], ignore_index=True)          # every record also under All road users
ages = s.copy(); ages["age_group"] = "All ages"
s_age = pd.concat([s, ages], ignore_index=True)     # age view only: also under All ages
meas = ["cases_1119", "died_1119", "hosp_1621", "beds_1621"]
parts = []
for view, col, src in [("age", "age_group", s_age), ("counterparty", "counterparty", s),
                       ("remoteness", "remoteness", s)]:
    g = src.groupby(["road_user", col])[meas].sum().reset_index().rename(columns={col: "category"})
    g.insert(0, "view", view)
    parts.append(g)
sev = pd.concat(parts, ignore_index=True)
Z = 1.96


def wilson(d, n):
    if n == 0:
        return np.nan, np.nan
    p = d / n
    den = 1 + Z * Z / n
    ctr = (p + Z * Z / (2 * n)) / den
    hw = Z * math.sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / den
    return (ctr - hw) * 1000, (ctr + hw) * 1000


out = []
for _, x in sev.iterrows():
    lo, hi = wilson(x.died_1119, x.cases_1119)
    dp = div(x.died_1119, x.cases_1119)
    st = div(x.beds_1621, x.hosp_1621)
    out.append(dict(died_per_1000=r(dp * 1000, 1) if not pd.isna(dp) else np.nan,
                    ci_low=r(lo, 1), ci_high=r(hi, 1),
                    avg_stay=r(st, 1) if not pd.isna(st) else np.nan,
                    publish_rate="TRUE" if x.cases_1119 >= 100 and x.died_1119 >= 10 else "FALSE",
                    publish_stay="TRUE" if x.hosp_1621 >= 100 else "FALSE"))
sev = pd.concat([sev, pd.DataFrame(out)], axis=1)
for c in meas:
    sev[c] = sev[c].astype("int64")
sev["_o"] = sev.road_user.eq("All road users")
sev = sev.sort_values(["view", "_o", "road_user", "category"]).drop(columns="_o")
write(sev, "severity.csv")

# ---------------------------------------------------------------- ch4 monthly
mm = b.copy()
mm = pd.concat([mm, mm.assign(road_user="All road users")], ignore_index=True)
mm = pd.concat([mm, mm.assign(month="Year")], ignore_index=True)
mp = mm.pivot_table(index=["road_user", "month"], columns="year", values="hosp", aggfunc="sum", fill_value=0)
mp = mp.reindex(columns=YEARS, fill_value=0)
rows = []
ru_list = sorted(set(b.road_user)) + ["All road users"]
for ru in ru_list:
    for mo in MONTHS + ["Year"]:
        if (ru, mo) not in mp.index:
            continue
        v = mp.loc[(ru, mo)]
        base = [v[k] for k in range(2015, 2020)]
        row = dict(road_user=ru, month=mo, month_num=13 if mo == "Year" else MONTHS.index(mo) + 1)
        row.update({str(k): int(v[k]) for k in YEARS})
        pct = div(v[2020], v[2019])
        tr = div(v[2019], v[2011])
        row.update(base_min=int(min(base)), base_mean=r(float(np.mean(base)), 1), base_max=int(max(base)),
                   pct_2020_vs_2019=r((pct - 1) * 100, 1) if not pd.isna(pct) else np.nan,
                   trend_2020=r(v[2019] * tr ** (1 / 8), 0) if not pd.isna(tr) else np.nan)
        rows.append(row)
ch4 = pd.DataFrame(rows)
ch4["_o"] = ch4.road_user.eq("All road users")
ch4 = ch4.sort_values(["_o", "road_user", "month_num"]).drop(columns="_o")
if ch4["trend_2020"].notna().all():
    ch4["trend_2020"] = ch4["trend_2020"].astype("int64")
write(ch4, "ch4_monthly.csv")

# ---------------------------------------------------------------- ch4 state cyclists
st = pd.read_excel(os.path.join(ROOT, "Datas/state-and-territory-hospitalisation-injury-publication-2023.xlsx"),
                   sheet_name="raw", header=None, skiprows=2, usecols=range(7, 14), na_values=["n.p."])
st.columns = ["year", "half", "cause", "road_user", "count", "bed", "state"]
st = st[(st.road_user == "Pedal cyclist") & st.year.isin([2019, 2020])]
sp = st.groupby(["state", "half", "year"])["count"].sum(min_count=1).unstack("year")  # all n.p. -> NaN, not 0
rows = []
for state in ["NSW", "Vic", "Qld", "WA", "SA", "Tas", "ACT", "NT"]:
    for half in ["Jan-Jun", "Jul-Dec"]:
        a, c = sp.loc[(state, half), 2019], sp.loc[(state, half), 2020]
        pc = div(c, a)
        rows.append({"state": state, "half": half, "2019": a, "2020": c,
                     "pct_change": r((pc - 1) * 100, 1) if not pd.isna(pc) else np.nan})
cs = pd.DataFrame(rows)
for c in ["2019", "2020"]:
    cs[c] = cs[c].astype("Int64")
write(cs, "ch4_state_cyclists.csv")

# ---------------------------------------------------------------- ch5
fn = pd.read_excel(os.path.join(ROOT, "Datas/First-Nations-hospitalised-injuries-2023.xlsx"),
                   sheet_name="raw", header=None, skiprows=2, na_values=["n.p."])


def block(start):
    d = fn.iloc[:, start:start + 7].copy()
    d.columns = ["year", "half", "cause", "status", "category", "hosp", "bed"]
    d = d.dropna(subset=["year"])
    d["year"] = d["year"].astype(int)
    for c in ["hosp", "bed"]:
        d[c] = pd.to_numeric(d[c], errors="coerce")   # n.p. -> NaN
    return d


cp = block(32)
tr = cp.groupby(["year", "status"])[["hosp", "bed"]].sum().reset_index().rename(columns={"bed": "bed_days"})
tr[["hosp", "bed_days"]] = tr[["hosp", "bed_days"]].astype("int64")
fnp = pd.read_csv(os.path.join(ROOT, "data/supplementary/raw/abs_first_nations_population.csv")).set_index("year")["fn_population"]
tot = {yr: int(pop[(yr, "All ages")]) for yr in YEARS}
tr["population"] = [float(fnp.get(y, np.nan)) if st == "First Nations people" else (tot[y] - fnp[y] if y in fnp.index else np.nan)
                    for y, st in zip(tr.year, tr.status)]
tr["hosp_per_100k"] = [np.floor(h / p * 100000 * 10 + 0.5) / 10 if p == p else np.nan for h, p in zip(tr.hosp, tr.population)]
write(tr, "ch5_first_nations_trend.csv")

prof = []
for view, start in [("road_user", 8), ("remoteness", 24)]:
    d = block(start)
    d = d[d.year >= 2016]   # profile is pooled 2016-21 (bed-day counting changed July 2015)
    g = d.groupby(["status", "category"]).agg(hosp=("hosp", "sum"), bed_days=("bed", "sum"),
                                              np_cells=("hosp", lambda x: int(x.isna().sum()))).reset_index()
    g.insert(0, "view", view)
    prof.append(g)
pr = pd.concat(prof, ignore_index=True)
pr["avg_stay"] = [r(x.bed_days / x.hosp, 1) if x.hosp else np.nan for x in pr.itertuples()]
pr[["hosp", "bed_days"]] = pr[["hosp", "bed_days"]].astype("int64")
write(pr, "ch5_first_nations_profile.csv")

# ---------------------------------------------------------------- sanity table
print("\nSANITY")
res = []


def chk(label, got, exp, tol=0.05):
    ok = (isinstance(exp, str) and got == exp) or (not isinstance(exp, str) and abs(got - exp) <= tol)
    print(f"{'MATCH' if ok else 'DIFF ':5} {label}: computed {got} expected {exp}")


c1 = ch1.set_index("year")
chk("ch1 hosp 2011", c1.hosp[2011], 34033); chk("ch1 hosp 2021", c1.hosp[2021], 39505)
chk("ch1 deaths 2011", c1.road_deaths[2011], 1277); chk("ch1 deaths 2021", c1.road_deaths[2021], 1130)
chk("ch1 pop 2011", c1.population[2011], 22340024); chk("ch1 pop 2021", c1.population[2021], 25685412)
chk("ch1 hosp_per_100k 2011", c1.hosp_per_100k[2011], 152.3); chk("ch1 hosp_per_100k 2021", c1.hosp_per_100k[2021], 153.8)
chk("ch1 hosp_per_death 2011", c1.hosp_per_death[2011], 26.7); chk("ch1 hosp_per_death 2021", c1.hosp_per_death[2021], 35.0)
c2 = ch2.set_index(["road_user", "age_group"])
for k, a, bb, p in [(("Pedal cyclist", "65-74"), 281.0, 669.0, 138.1), (("Pedal cyclist", "75+"), 98.7, 238.7, 141.9)]:
    chk(f"ch2 {k} avg1", c2.loc[k, "avg_2011_13"], a); chk(f"ch2 {k} avg2", c2.loc[k, "avg_2019_21"], bb)
    chk(f"ch2 {k} pct", c2.loc[k, "pct_change_3yr"], p)
chk("ch2 Car driver 0-7 low_count", c2.loc[("Car driver", "0-7"), "low_count"], "TRUE")
sv = sev.set_index(["view", "road_user", "category"])
P = ("age", "Pedestrian", "All ages"); A = ("age", "All road users", "All ages")
chk("sev Ped All died_per_1000", sv.loc[P, "died_per_1000"], 21.8)
chk("sev Ped All cases_1119", sv.loc[P, "cases_1119"], 24633); chk("sev Ped All died_1119", sv.loc[P, "died_1119"], 538)
chk("sev All All cases_1119", sv.loc[A, "cases_1119"], 335454); chk("sev All All died_1119", sv.loc[A, "died_1119"], 2041)
chk("sev Ped 75+ per1000", sv.loc[("age", "Pedestrian", "75+"), "died_per_1000"], 61.3)
chk("sev Ped 75+ stay", sv.loc[("age", "Pedestrian", "75+"), "avg_stay"], 19.2)
chk("sev All 75+ per1000", sv.loc[("age", "All road users", "75+"), "died_per_1000"], 28.1)
chk("sev All 75+ stay", sv.loc[("age", "All road users", "75+"), "avg_stay"], 11.1)
chk("sev All x Train per1000", sv.loc[("counterparty", "All road users", "Train"), "died_per_1000"], 57.2)
chk("sev All x Train stay", sv.loc[("counterparty", "All road users", "Train"), "avg_stay"], 18.5)
chk("sev Ped x HTV/bus", sv.loc[("counterparty", "Pedestrian", "Heavy transport vehicle or bus"), "died_per_1000"], 52.7)
mo = ch4.set_index(["road_user", "month"])
chk("ch4 All Apr 2019", mo.loc[("All road users", "April"), "2019"], 3488); chk("ch4 All Apr 2020", mo.loc[("All road users", "April"), "2020"], 2357)
chk("ch4 All Apr pct", mo.loc[("All road users", "April"), "pct_2020_vs_2019"], -32.4)
chk("ch4 Cyc Jun 2019", mo.loc[("Pedal cyclist", "June"), "2019"], 453); chk("ch4 Cyc Jun 2020", mo.loc[("Pedal cyclist", "June"), "2020"], 682)
chk("ch4 Cyc Year 2019", mo.loc[("Pedal cyclist", "Year"), "2019"], 7302); chk("ch4 Cyc Year 2020", mo.loc[("Pedal cyclist", "Year"), "2020"], 8332)
top = cs.sort_values("pct_change").iloc[-1]
chk("ch4 state largest rise", f"{top.state} {top.half}", "Vic Jul-Dec")
t = tr.set_index(["year", "status"])
fnn = sorted(set(tr.status)); print("statuses:", fnn)
for stt, e1, e2 in [(fnn[0], None, None)]:
    pass
for stt in fnn:
    print(stt, t.loc[(2011, stt), "hosp"], "->", t.loc[(2021, stt), "hosp"],
          f"{(t.loc[(2021, stt), 'hosp'] / t.loc[(2011, stt), 'hosp'] - 1) * 100:.0f}%")
for stt in fnn:
    q = pr[(pr.view == "road_user") & (pr.status == stt)]
    print(stt, "pedestrian share", round(q[q.category.str.contains("edestrian")].hosp.sum() / q.hosp.sum() * 100, 1), "%")
