"""Build supplementary CSVs from raw downloads in data/supplementary/raw/ (no network)."""
import pandas as pd, numpy as np
from pathlib import Path
R = Path("data/supplementary/raw"); C = Path("data/clean")
erp = pd.read_csv(R/"ABS_ERP_Q_AUS_persons_2011Q2-2021Q2.csv", dtype={"AGE": str})
erp = erp[(erp.MEASURE == 1) & (erp.SEX == 3) & (erp.REGION == "AUS") & (erp.TIME_PERIOD.str.endswith("-Q2"))].copy()
erp["year"] = erp.TIME_PERIOD.str[:4].astype(int)  # Q2 = 30 June
tot = erp[erp.AGE == "TOT"].set_index("year").OBS_VALUE.astype(int)
assert list(tot.index) == list(range(2011, 2022))
sing = erp[erp.AGE.str.fullmatch(r"\d+") & (erp.AGE != "8599")].copy()  # 8599 = 85-99 aggregate
sing["a"] = sing.AGE.astype(int)
assert sing.groupby("year").a.nunique().eq(101).all()
bands = [("0-7",0,7),("8-16",8,16),("17-25",17,25),("26-39",26,39),("40-64",40,64),("65-74",65,74),("75+",75,200)]
rows = []
for y in range(2011, 2022):
    s = sing[sing.year == y]
    for g, lo, hi in bands:
        rows.append((y, g, int(s[(s.a >= lo) & (s.a <= hi)].OBS_VALUE.sum())))
age = pd.DataFrame(rows, columns=["year","age_group","erp"])
chk = age.groupby("year").erp.sum()
assert (chk == tot).all(), (chk - tot)
pop = pd.DataFrame({"year": tot.index, "erp_total": tot.values, "source_id": "ABS:ERP_Q(1.0.0) MEASURE=1 SEX=3 AGE=TOT REGION=AUS Q2 (30 June)"})
pop.to_csv(C/"supp_population_annual.csv", index=False); age.to_csv(C/"supp_population_age.csv", index=False)

d = pd.read_csv(R/"ardd_fatalities.csv", low_memory=False)
dy = d[d.Year.between(2011, 2021)].groupby("Year").size()
deaths = pd.DataFrame({"year": dy.index, "road_deaths": dy.values, "source_id": "BITRE ARDD ardd_fatalities.csv (Oct 2023), rows by Year"})
deaths.to_csv(C/"supp_road_deaths_annual.csv", index=False)

h = pd.read_csv(C/"idea1_national_annual.csv")
m = h[["year","hospitalisations","series_break"]].merge(pop[["year","erp_total"]]).merge(deaths[["year","road_deaths"]])
m["hosp_per_100k"] = (m.hospitalisations/m.erp_total*1e5).round(1)
m["deaths_per_100k"] = (m.road_deaths/m.erp_total*1e5).round(2)
m["hosp_per_death"] = (m.hospitalisations/m.road_deaths).round(1)
m[["year","hospitalisations","erp_total","hosp_per_100k","road_deaths","deaths_per_100k","hosp_per_death","series_break"]].to_csv(C/"idea1_rates.csv", index=False)
L = []
for s, col in [("hospitalisations","hospitalisations"),("road_deaths","road_deaths"),("population","erp_total")]:
    b = m.loc[m.year == 2011, col].iloc[0]
    for _, r in m.iterrows(): L.append((r.year, s, r[col], round(r[col]/b*100, 1)))
pd.DataFrame(L, columns=["year","series","value","index_2011"]).to_csv(C/"idea1_index_long.csv", index=False)

p = age.pivot(index="age_group", columns="year", values="erp")
out = pd.DataFrame({"age_group": [g for g,_,_ in bands]}).set_index("age_group")
out["erp_2011"] = p[2011]; out["erp_2021"] = p[2021]
out["pct_change_single"] = ((p[2021]/p[2011]-1)*100).round(1)
out["erp_avg_2011_2013"] = p[[2011,2012,2013]].mean(axis=1).round(0)
out["erp_avg_2019_2021"] = p[[2019,2020,2021]].mean(axis=1).round(0)
out["pct_change_3yr"] = ((out.erp_avg_2019_2021/out.erp_avg_2011_2013-1)*100).round(1)
out.reset_index().to_csv(C/"idea2_age_population_change.csv", index=False)

# sanity + claims
print(m.to_string(index=False)); print(out.to_string())
t = tot; print("pop growth %", round((t[2021]/t[2011]-1)*100,2), t[2011], t[2021])
print("deaths 2011,2021", dy[2011], dy[2021], "pct", round((dy[2021]/dy[2011]-1)*100,1),
      "per-capita pct", round((m.deaths_per_100k.iloc[-1]/m.deaths_per_100k.iloc[0]-1)*100,1))
print("65+ growth single", round(((p.loc["65-74",2021]+p.loc["75+",2021])/(p.loc["65-74",2011]+p.loc["75+",2011])-1)*100,1))
hm = pd.read_csv(C/"idea2_heatmap_change.csv")
for ag in ["65-74","75+"]:
    r = hm[(hm.road_user=="Pedal cyclist")&(hm.age_group==ag)].iloc[0]
    for lab,c0,c1,e0,e1 in [("single",r.hosp_2011,r.hosp_2021,p.loc[ag,2011],p.loc[ag,2021]),
                            ("3yr",r.avg_2011_2013,r.avg_2019_2021,out.loc[ag,"erp_avg_2011_2013"],out.loc[ag,"erp_avg_2019_2021"])]:
        r0,r1 = c0/e0*1e5, c1/e1*1e5
        print(f"Cyclist {ag} {lab}: count {c0:.0f}->{c1:.0f}, rate/100k {r0:.1f}->{r1:.1f} ({(r1/r0-1)*100:+.0f}%), pop {(e1/e0-1)*100:+.1f}%")
