# =====================================================================================
# E. Idea 3 (severity) and Idea 4 (lockdown test)       == phase2_ideas.py
# =====================================================================================
gp = "E. Idea 3 + Idea 4 (phase2_ideas.py)"
ALLRU, OTHER = "All road users", "Other road users"
MEAS = [("hospitalisations", DBL, "Sum"), ("cases_incl_died", DBL, "Sum"), ("died_cases", DBL, "Sum"),
        ("bed_days", DBL, "Sum"), ("bed_days_excl_died", DBL, "Sum")]
YEARS = lambda lo, hi: [("year", "GTE", "int", lo), ("year", "LTE", "int", hi)]


def gb(src, keys, aggs, label, pol="Keep original name(s)"):
    return F.add("GroupBy", label, [src], groupby_core(keys, aggs, pol), group=gp)


def mth(src, col, expr, label=None, replace=False, to_int=False):
    return F.add("Math Formula", label or f"E {col}", [src], math_model(col, expr, replace, to_int), group=gp)


def rul(src, rules, col, label=None, append=False):
    return F.add("Rule Engine", label or f"E {col}", [src], rule_model(rules, col, append), group=gp)


def ren(src, pairs, label="E Rename"):
    return F.add("Column Renamer", label, [src], renamer_model(pairs), group=gp)


def rfl(src, preds, label, match="AND"):
    return F.add("Row Filter", label, [src], rowfilter_model(preds, match), group=gp)


def cst(src, name, value, label=None):
    return F.add("Constant Value Column", label or f"E {name} = {value}", [src], const_model(name, value), group=gp)


def fin(src, cols, label="E Output columns"):
    x = F.add("Column Filter", label, [src], colfilter_model(cols), group=gp)
    return F.add("Column Resorter", "E Column order", [x], resorter_model(cols), group=gp)


def jn(left, right, lk, rk, lc, rc, label, mode="inner"):
    return F.add("Joiner", label, [left, right], joiner_model(lk, rk, lc, rc, mode), group=gp)


def concat(nodes, label="E Stack"):
    x = nodes[0]
    for y in nodes[1:]:
        x = F.add("Concatenate", label, [x, y], concat_model(), group=gp)
    return x


def eq_any(col, vals):
    return [(col, "EQ", "str", v) for v in vals]


# ---- P0: grouped road user + data cube
T2 = F.add("Rule Engine", "E ru: five main road users + Other", [T], rule_model(
    ['$road_user$ IN (' + ", ".join(f'"{m}"' for m in MAIN) + ') => $road_user$', f'TRUE => "{OTHER}"'], "ru", append=True), group=gp)
CUBE = gb(T2, ["ru", "road_user", "age_group", "counterparty", "year"],
          [(c, INT, "Sum") for c, _, _ in MEAS], "E Data cube (ru x road user x age x counterparty x year)")
CUBEN = [c for c, _, _ in MEAS]

# ---- Idea 3 burden share (long)
b1 = rfl(CUBE, [("year", "GTE", "int", 2016)], "E Years 2016-2021 (P1)")
b2 = gb(b1, ["ru"], [("cases_incl_died", DBL, "Sum"), ("bed_days", DBL, "Sum")], "E Cases + bed days by group")
b3 = mth(b2, "sc", "100.0 * $cases_incl_died$ / COL_SUM($cases_incl_died$)")
b4 = mth(b3, "sb", "100.0 * $bed_days$ / COL_SUM($bed_days$)")
b5 = mth(b4, "bed_to_case_ratio", "round(100.0 * $sb$ / $sc$) / 100.0")
b5 = ren(b5, [("ru", "road_user")])
parts = []
for meas, lab, cnt, share in [("cases", "Share of people hospitalised", "cases_incl_died", "sc"),
                              ("bed_days", "Share of days spent in hospital", "bed_days", "sb")]:
    x = mth(b5, "count", f"${cnt}$", f"E count ({meas})")
    x = mth(x, "total", f"COL_SUM(${cnt}$)", f"E total ({meas})")
    x = mth(x, "share_pct", f"round(10.0 * ${share}$) / 10.0", f"E share_pct ({meas})")
    x = cst(x, "measure", meas); x = cst(x, "measure_label", lab); x = cst(x, "period", "2016-2021")
    parts.append(fin(x, ["road_user", "measure", "measure_label", "count", "total", "share_pct", "bed_to_case_ratio", "period"]))
BURDEN = concat(parts)
F.writer(BURDEN, "idea3_burden_share", "E Write idea3_burden_share", gp)

# ---- severity stack: one aggregate per (scope, k1, k2, year)
NOTMAIN = [("road_user", "NEQ", "str", m) for m in MAIN]
AGES = lambda: [orfilter("age_group", AGE)]


def var(src, scope, k1, k2, gkeys, pre=()):
    x = src
    for preds, match, lab in pre:
        x = rfl(x, preds, lab, match)
    x = gb(x, gkeys + ["year"], [(c, DBL, "Sum") for c in CUBEN], f"E Aggregate {scope} {k1}/{k2}")
    pairs = [(v[1:], k) for k, v in (("k1", k1), ("k2", k2)) if v.startswith("@")]
    if pairs:
        x = ren(x, pairs, f"E keys for {scope}")
    for k, v in (("k1", k1), ("k2", k2)):
        if not v.startswith("@"):
            x = cst(x, k, v, f"E {k} = {v}")
    return cst(x, "scope", scope, f"E scope = {scope}")


MAINONLY = ([("ru", "NEQ", "str", OTHER)], "AND", "E Five main road users")
AGEONLY = (None, "OR", "E Seven age bands")
KNOWNAGE = ([("age_group", "EQ", "str", a) for a in AGE], "OR", "E Known age bands")
V = []
V.append(var(CUBE, "ru_group", "@ru", "_", ["ru"]))
V.append(var(CUBE, "ru_detail", "@road_user", "_", ["road_user"], [(NOTMAIN, "AND", "E Detail within Other road users")]))
V.append(var(CUBE, "ru_total", ALLRU, "_", []))
V.append(var(CUBE, "ruage", "@ru", "@age_group", ["ru", "age_group"], [MAINONLY, KNOWNAGE]))
V.append(var(CUBE, "cp_all", ALLRU, "@counterparty", ["counterparty"]))
V.append(var(CUBE, "cp_ru", "@ru", "@counterparty", ["ru", "counterparty"], [MAINONLY]))
PEDF = ([("road_user", "EQ", "str", "Pedestrian")], "AND", "E Pedestrians")
V.append(var(CUBE, "op", "Pedestrian", "@age_group", ["age_group"], [PEDF, KNOWNAGE]))
V.append(var(CUBE, "op", ALLRU, "@age_group", ["age_group"], [KNOWNAGE]))
for rname, pre0, k1 in [("Pedestrian", [PEDF], "Pedestrian"), (ALLRU, [], ALLRU)]:
    for lab, ages in [("Under 65", AGE[:5]), ("65+", AGE[5:]), ("All ages", AGE)]:
        pre = pre0 + [([("age_group", "EQ", "str", a) for a in ages], "OR", f"E Ages {lab}")]
        V.append(var(CUBE, "op", k1, lab, [], pre))
STACK = concat(V, "E Stack severity inputs")

# ---- severity engine (P2-P4)
e1 = rfl(STACK, YEARS(0, 2019)[1:], "E Deaths window: years 2011-2019 (R8)")
e1 = gb(e1, ["scope", "k1", "k2"], [("cases_incl_died", DBL, "Sum"), ("died_cases", DBL, "Sum")], "E Cases + deaths 2011-19")
e2 = rfl(STACK, [("year", "GTE", "int", 2016)], "E Stay window: years 2016-2021 (R7)")
e2 = gb(e2, ["scope", "k1", "k2"], [("hospitalisations", DBL, "Sum"), ("cases_incl_died", DBL, "Sum"), ("bed_days", DBL, "Sum"),
                                    ("bed_days_excl_died", DBL, "Sum")], "E Stay measures 2016-21")
K3 = ["scope", "k1", "k2"]
x = jn(e1, e2, K3, K3, K3 + ["cases_incl_died", "died_cases"], K3 + ["hospitalisations", "cases_incl_died", "bed_days", "bed_days_excl_died"],
       "E Outer join windows", "outer")
x = F.add("Missing Value", "E Absent window = 0", [x], model=missing_fixed_double_model(
    ["cases_incl_died", "died_cases", "hospitalisations", "cases_incl_died (right)", "bed_days", "bed_days_excl_died"]), group=gp)
x = ren(x, [("cases_incl_died", "cases_2011_2019"), ("died_cases", "died_2011_2019"), ("hospitalisations", "hosp_2016_2021"),
            ("cases_incl_died (right)", "cases_2016_2021"), ("bed_days", "bed_days_2016_2021"),
            ("bed_days_excl_died", "bed_days_excl_died_2016_2021")], "E Period suffixes")
x = mth(x, "died_per_1000_2011_2019", "round(10000.0 * $died_2011_2019$ / $cases_2011_2019$) / 10.0")
x = mth(x, "wc", "(($died_2011_2019$ / $cases_2011_2019$) + 3.8416 / (2.0 * $cases_2011_2019$)) / (1.0 + 3.8416 / $cases_2011_2019$)")
x = mth(x, "wh", "1.96 * sqrt(($died_2011_2019$ / $cases_2011_2019$) * (1.0 - $died_2011_2019$ / $cases_2011_2019$) / $cases_2011_2019$ + 3.8416 / (4.0 * $cases_2011_2019$ * $cases_2011_2019$)) / (1.0 + 3.8416 / $cases_2011_2019$)")
x = mth(x, "died_per_1000_ci95_low", "round(10000.0 * if($wc$ - $wh$ > 0.0, $wc$ - $wh$, 0.0)) / 10.0", "E Wilson 95% low (P2)")
x = mth(x, "died_per_1000_ci95_high", "round(10000.0 * ($wc$ + $wh$)) / 10.0", "E Wilson 95% high (P2)")
x = rul(x, ['$cases_2011_2019$ < 100 => "low_cases"', '$died_2011_2019$ < 10 => "low_deaths"', 'TRUE => "ok"'], "mortality_flag", "E mortality_flag (P4)", True)
x = rul(x, ['$mortality_flag$ = "ok" => $died_per_1000_2011_2019$'], "died_per_1000_publish", "E died_per_1000_publish (P4)", True)
x = mth(x, "avg_stay_days_2016_2021", "round(10.0 * $bed_days_excl_died_2016_2021$ / $hosp_2016_2021$) / 10.0", "E avg stay (P3)")
x = mth(x, "avg_stay_all_cases_2016_2021", "round(10.0 * $bed_days_2016_2021$ / $cases_2016_2021$) / 10.0", "E avg stay, all cases (P3)")
x = rul(x, ['$hosp_2016_2021$ < 100 => "low_cases"', 'TRUE => "ok"'], "stay_flag", "E stay_flag (P4)", True)
x = rul(x, ['$stay_flag$ = "ok" => $avg_stay_days_2016_2021$'], "avg_stay_publish", "E avg_stay_publish (P4)", True)
SEV = x
SEVC = ["cases_2011_2019", "died_2011_2019", "hosp_2016_2021", "cases_2016_2021", "bed_days_2016_2021",
        "bed_days_excl_died_2016_2021", "died_per_1000_2011_2019", "died_per_1000_ci95_low", "died_per_1000_ci95_high",
        "mortality_flag", "died_per_1000_publish", "avg_stay_days_2016_2021", "avg_stay_all_cases_2016_2021",
        "stay_flag", "avg_stay_publish"]
PART = lambda scopes, lab: rfl(SEV, eq_any("scope", scopes), lab, "OR")

# ---- idea3_severity_roaduser
o = PART(["ru_group", "ru_detail", "ru_total"], "E Road user scopes")
o = rul(o, ['$scope$ = "ru_group" => "group"', '$scope$ = "ru_detail" => "detail (within Other road users)"', 'TRUE => "total"'], "level", "E level", True)
o = ren(o, [("k1", "road_user")])
tot = rfl(SEV, [("scope", "EQ", "str", "ru_total")], "E Total row")
tot = F.add("Column Filter", "E Keep total columns", [tot], colfilter_model(["cases_2016_2021", "bed_days_2016_2021"]), group=gp)
tot = ren(tot, [("cases_2016_2021", "tot_cases"), ("bed_days_2016_2021", "tot_bed")])
o = F.add("Cross Joiner", "E Attach total", [o, tot], crossjoin_model(), group=gp)
o = mth(o, "share_of_cases_2016_2021", "round(1000.0 * $cases_2016_2021$ / $tot_cases$) / 10.0")
o = mth(o, "share_of_bed_days_2016_2021", "round(1000.0 * $bed_days_2016_2021$ / $tot_bed$) / 10.0")
o = fin(o, ["level", "road_user", "share_of_cases_2016_2021", "share_of_bed_days_2016_2021"] + SEVC)
F.writer(o, "idea3_severity_roaduser", "E Write idea3_severity_roaduser", gp)
# ---- idea3_severity_roaduser_age
o = PART(["ruage"], "E Road user x age scope")
o = ren(o, [("k1", "road_user"), ("k2", "age_group")])
o = fin(o, ["road_user", "age_group"] + SEVC)
F.writer(o, "idea3_severity_roaduser_age", "E Write idea3_severity_roaduser_age", gp)
# ---- idea3_severity_counterparty
o = PART(["cp_all", "cp_ru"], "E Counterparty scopes")
o = ren(o, [("k1", "road_user"), ("k2", "counterparty")])
t_ = gb(o, ["road_user"], [("cases_2016_2021", DBL, "Sum")], "E Cases per road user")
t_ = ren(t_, [("cases_2016_2021", "tot_ru")])
o = jn(o, t_, ["road_user"], ["road_user"], ["road_user", "counterparty"] + SEVC, ["road_user", "tot_ru"], "E Join road user total")
o = mth(o, "share_of_road_user_cases_2016_2021", "round(1000.0 * $cases_2016_2021$ / $tot_ru$) / 10.0")
o = fin(o, ["road_user", "counterparty", "share_of_road_user_cases_2016_2021"] + SEVC)
F.writer(o, "idea3_severity_counterparty", "E Write idea3_severity_counterparty", gp)
# ---- idea3_older_pedestrians
o = PART(["op"], "E Older pedestrian scope")
o = ren(o, [("k1", "road_user"), ("k2", "age_group")])
al = rfl(o, [("age_group", "EQ", "str", "All ages")], "E All ages rows")
al = F.add("Column Filter", "E Keep all-ages totals", [al], colfilter_model(["road_user", "cases_2016_2021", "bed_days_2016_2021"]), group=gp)
al = ren(al, [("cases_2016_2021", "all_c"), ("bed_days_2016_2021", "all_b")])
o = jn(o, al, ["road_user"], ["road_user"], ["road_user", "age_group"] + SEVC, ["road_user", "all_c", "all_b"], "E Join all-ages totals")
o = mth(o, "share_of_road_user_cases_2016_2021", "round(1000.0 * $cases_2016_2021$ / $all_c$) / 10.0")
o = mth(o, "share_of_road_user_bed_days_2016_2021", "round(1000.0 * $bed_days_2016_2021$ / $all_b$) / 10.0")
o = rul(o, ['$age_group$ IN (' + ", ".join(f'"{a}"' for a in AGE) + ') => "band"', 'TRUE => "combined"'], "age_level", "E age_level", True)
o = fin(o, ["road_user", "age_group"] + SEVC + ["share_of_road_user_cases_2016_2021", "share_of_road_user_bed_days_2016_2021", "age_level"])
F.writer(o, "idea3_older_pedestrians", "E Write idea3_older_pedestrians", gp)

# ---- idea3_older_pedestrians_annual (ped counts + ERP, 5 age labels)
def age_pieces(src, val, tag):
    """src: (age_group, year, val). Returns stacked (age_group, year, val) for 65-74, 75+, 65+, Under 65, All ages."""
    pcs = [rfl(src, [("age_group", "EQ", "str", a) for a in AGE[5:]], f"E {tag} 65-74 and 75+", "OR")]
    for lab, ages in [("Under 65", AGE[:5]), ("65+", AGE[5:]), ("All ages", AGE)]:
        x = rfl(src, [("age_group", "EQ", "str", a) for a in ages], f"E {tag} {lab}", "OR")
        x = gb(x, ["year"], [(val, DBL, "Sum")], f"E {tag} sum {lab}")
        pcs.append(cst(x, "age_group", lab, f"E {tag} age_group = {lab}"))
    return concat(pcs, f"E {tag} stack")


pd_ = rfl(CUBE, [("road_user", "EQ", "str", "Pedestrian")], "E Pedestrians (annual)")
pd_ = rfl(pd_, [("age_group", "EQ", "str", a) for a in AGE], "E Known ages (annual)", "OR")
pd_ = gb(pd_, ["age_group", "year"], [("hospitalisations", DBL, "Sum")], "E Pedestrians by age x year")
ped = age_pieces(pd_, "hospitalisations", "ped")
pop = age_pieces(POPAGE, "erp", "pop")
o = jn(ped, pop, ["age_group", "year"], ["age_group", "year"], ["age_group", "year", "hospitalisations"], ["age_group", "year", "erp"], "E Join population")
o = mth(o, "per_100k", "round(10.0 * 100000.0 * $hospitalisations$ / $erp$) / 10.0")
o = rul(o, ['$year$ = 2011 => "pre_vic_2012_change"', '$year$ >= 2017 => "post_nsw_2017_change"', 'TRUE => ""'], "series_break", "E series_break", True)
o = ren(o, [("hospitalisations", "pedestrian_hospitalisations")])
o = fin(o, ["age_group", "year", "pedestrian_hospitalisations", "erp", "per_100k", "series_break"])
F.writer(o, "idea3_older_pedestrians_annual", "E Write idea3_older_pedestrians_annual", gp)
