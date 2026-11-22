# ---- Idea 4: monthly series, annual series, OLS trend (P5, P6) -------------------------------
MABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
m1 = gb(T2, ["ru", "year", "month_num"], [("hospitalisations", INT, "Sum")], "E Monthly by road-user group")
m1 = ren(m1, [("ru", "road_user")])
m2 = gb(T2, ["year", "month_num"], [("hospitalisations", INT, "Sum")], "E Monthly, all road users")
m2 = cst(m2, "road_user", ALLRU)
MONG = concat([m1, m2], "E Stack groups + total")
# idea4_monthly_2019_2021
o = rfl(MONG, YEARS(2019, 2021), "E Years 2019-2021")
o = rul(o, [f'$month_num$ = {i} => "{m}"' for i, m in enumerate(MABBR, 1)], "month", "E month abbreviation", True)
o = mth(o, "y2", "$year$", to_int=True); o = mth(o, "m2", "$month_num$", to_int=True)
o = F.add("Number to String", "E numbers to text", [o], num2str_model(["y2", "m2"]), group=gp)
o = F.add("String Manipulation", "E date", [o], strman_model(
    "date", 'join($y2$, "-", substr(join("0", $m2$), length(join("0", $m2$)) - 2), "-01")', append=True), group=gp)
o = fin(o, ["road_user", "year", "month_num", "month", "date", "hospitalisations"])
F.writer(o, "idea4_monthly_2019_2021", "E Write idea4_monthly_2019_2021", gp)
# annual series
AG = gb(MONG, ["road_user", "year"], [("hospitalisations", DBL, "Sum")], "E Annual by group")
AGX = mth(AG, "x", "$year$ - 2011", "E x = year - 2011")


def fit(tag, lo, hi):
    f = rfl(AGX, YEARS(lo, hi), f"E OLS window {lo}-{hi}")
    f = mth(f, "one", "1.0"); f = mth(f, "xy", "$x$ * $hospitalisations$"); f = mth(f, "xx", "$x$ * $x$"); f = mth(f, "yy", "$hospitalisations$ * $hospitalisations$")
    f = gb(f, ["road_user"], [("x", DBL, "Sum"), ("hospitalisations", DBL, "Sum"), ("xy", DBL, "Sum"), ("xx", DBL, "Sum"),
                              ("yy", DBL, "Sum"), ("one", DBL, "Sum")], f"E OLS sums {lo}-{hi}", "Aggregation method (column name)")
    n, sx, sy, sxy, sxx, syy = "$Sum(one)$", "$Sum(x)$", "$Sum(hospitalisations)$", "$Sum(xy)$", "$Sum(xx)$", "$Sum(yy)$"
    f = mth(f, f"b1_{tag}", f"({n} * {sxy} - {sx} * {sy}) / ({n} * {sxx} - {sx} * {sx})", f"E slope {lo}-{hi}")
    f = mth(f, f"b0_{tag}", f"({sy} - $b1_{tag}$ * {sx}) / {n}", f"E intercept {lo}-{hi}")
    f = mth(f, f"sse_{tag}", f"{syy} - $b0_{tag}$ * {sy} - $b1_{tag}$ * {sxy}")
    f = mth(f, f"s_{tag}", f"sqrt($sse_{tag}$ / ({n} - 2.0))", f"E residual SD {lo}-{hi}")
    f = mth(f, f"xbar_{tag}", f"{sx} / {n}")
    f = mth(f, f"sxxc_{tag}", f"{sxx} - {sx} * {sx} / {n}")
    f = mth(f, f"n_{tag}", "$Sum(one)$")
    return F.add("Column Filter", f"E OLS coefficients {lo}-{hi}", [f], colfilter_model(
        ["road_user", f"b0_{tag}", f"b1_{tag}", f"s_{tag}", f"n_{tag}", f"xbar_{tag}", f"sxxc_{tag}"]), group=gp)


C19, C1219, C1519 = fit("19", 2011, 2019), fit("1219", 2012, 2019), fit("1519", 2015, 2019)
TR20 = mth(C19, "tr20", "$b0_19$ + $b1_19$ * 9.0", "E 2020 trend forecast (OLS 2011-19)")
TR20 = F.add("Column Filter", "E Keep forecast", [TR20], colfilter_model(["road_user", "tr20"]), group=gp)


def coef_cols(tag, full=True):
    return ["road_user"] + ([f"b0_{tag}", f"b1_{tag}", f"s_{tag}", f"n_{tag}", f"xbar_{tag}", f"sxxc_{tag}"] if full else [f"b0_{tag}", f"b1_{tag}"])


# idea4_cyclist_trend
cy = rfl(AGX, [("road_user", "EQ", "str", "Pedal cyclist")], "E Pedal cyclists")
cy = ren(cy, [("hospitalisations", "actual")])
cy = jn(cy, C19, ["road_user"], ["road_user"], ["road_user", "year", "actual", "x"], coef_cols("19"), "E + OLS 2011-19")
cy = jn(cy, C1219, ["road_user"], ["road_user"], ["road_user", "year", "actual", "x", "b0_19", "b1_19", "s_19", "n_19", "xbar_19", "sxxc_19"], coef_cols("1219", False), "E + OLS 2012-19")
cy = jn(cy, C1519, ["road_user"], ["road_user"], ["road_user", "year", "actual", "x", "b0_19", "b1_19", "s_19", "n_19", "xbar_19", "sxxc_19", "b0_1219", "b1_1219"], coef_cols("1519"), "E + OLS 2015-19")


def yh(tag):
    return f"($b0_{tag}$ + $b1_{tag}$ * $x$)"


def pi_cols(cy, tag, t):
    se = f"$s_{tag}$ * sqrt(1.0 + 1.0 / $n_{tag}$ + ($x$ - $xbar_{tag}$) * ($x$ - $xbar_{tag}$) / $sxxc_{tag}$)"
    cy = mth(cy, f"lo_u{tag}", f"{yh(tag)} - {t} * {se}", f"E PI low, unrounded ({tag})")
    cy = mth(cy, f"hi_u{tag}", f"{yh(tag)} + {t} * {se}", f"E PI high, unrounded ({tag})")
    return cy


cy = mth(cy, "trend_2011_2019", f"round(10.0 * {yh('19')}) / 10.0")
cy = pi_cols(cy, "19", "2.365")
cy = mth(cy, "pi95_low_2011_2019", "round(10.0 * $lo_u19$) / 10.0")
cy = mth(cy, "pi95_high_2011_2019", "round(10.0 * $hi_u19$) / 10.0")
cy = mth(cy, "residual_vs_2011_2019", f"round(10.0 * ($actual$ - {yh('19')})) / 10.0")
cy = mth(cy, "residual_pct_vs_2011_2019", f"round(10.0 * 100.0 * ($actual$ - {yh('19')}) / {yh('19')}) / 10.0")
cy = rul(cy, ['$actual$ > $hi_u19$ OR $actual$ < $lo_u19$ => "True"', 'TRUE => "False"'], "outside_pi95", "E outside_pi95", True)
cy = mth(cy, "trend_2012_2019", f"round(10.0 * {yh('1219')}) / 10.0")
cy = mth(cy, "trend_2015_2019", f"round(10.0 * {yh('1519')}) / 10.0")
cy = pi_cols(cy, "1519", "3.182")
cy = mth(cy, "pi95_low_2015_2019", "round(10.0 * $lo_u1519$) / 10.0")
cy = mth(cy, "pi95_high_2015_2019", "round(10.0 * $hi_u1519$) / 10.0")
cy = rul(cy, ['$actual$ > $hi_u1519$ OR $actual$ < $lo_u1519$ => "True"', 'TRUE => "False"'], "outside_pi95_2015_2019", "E outside_pi95_2015_2019", True)
cy = rul(cy, ['$year$ <= 2019 => "True"', 'TRUE => "False"'], "in_fit_period", "E in_fit_period", True)
cy = rul(cy, ['$year$ = 2011 => "pre_vic_2012_change"', '$year$ >= 2017 => "post_nsw_2017_change"', 'TRUE => ""'], "series_break", "E series_break", True)
cy = fin(cy, ["year", "actual", "in_fit_period", "series_break", "trend_2011_2019", "pi95_low_2011_2019", "pi95_high_2011_2019",
              "residual_vs_2011_2019", "residual_pct_vs_2011_2019", "outside_pi95", "trend_2012_2019", "trend_2015_2019",
              "pi95_low_2015_2019", "pi95_high_2015_2019", "outside_pi95_2015_2019"])
F.writer(cy, "idea4_cyclist_trend", "E Write idea4_cyclist_trend", gp)

# idea4_baseline_band
ag2 = ren(AG, [("hospitalisations", "annual")])
bj = jn(MONG, ag2, ["road_user", "year"], ["road_user", "year"], ["road_user", "year", "month_num", "hospitalisations"], ["road_user", "year", "annual"], "E + annual total")
bj = mth(bj, "share", "$hospitalisations$ / $annual$", "E seasonal share of the year")
bb = rfl(bj, YEARS(2015, 2019), "E Baseline years 2015-2019 (P5)")
bb = mth(bb, "hmin", "$hospitalisations$"); bb = mth(bb, "hmax", "$hospitalisations$")
bb = gb(bb, ["road_user", "month_num"], [("hospitalisations", DBL, "Mean"), ("hmin", DBL, "Minimum"),
                                         ("hmax", DBL, "Maximum"), ("share", DBL, "Mean")], "E Baseline mean / min / max / share")
bb = ren(bb, [("hospitalisations", "mean_u"), ("hmin", "baseline_min_2015_2019"), ("hmax", "baseline_max_2015_2019"), ("share", "seas")])
bv = rfl(MONG, YEARS(2019, 2021), "E Years 2019-2021")
bv = F.add("Pivot", "E 2019, 2020, 2021 side by side", [bv], pivot_model(["road_user", "month_num"], ["year"], [("hospitalisations", DBL, "Sum")]), group=gp)
bv = ren(bv, [("2019", "hosp_2019"), ("2020", "hosp_2020"), ("2021", "hosp_2021")])
bb = jn(bb, bv, ["road_user", "month_num"], ["road_user", "month_num"],
        ["road_user", "month_num", "mean_u", "baseline_min_2015_2019", "baseline_max_2015_2019", "seas"],
        ["road_user", "month_num", "hosp_2019", "hosp_2020", "hosp_2021"], "E + monthly values")
bb = jn(bb, TR20, ["road_user"], ["road_user"], ["road_user", "month_num", "mean_u", "baseline_min_2015_2019", "baseline_max_2015_2019",
                                                  "seas", "hosp_2019", "hosp_2020", "hosp_2021"], ["road_user", "tr20"], "E + 2020 trend forecast")
bb = rul(bb, [f'$month_num$ = {i} => "{m}"' for i, m in enumerate(MABBR, 1)], "month", "E month abbreviation", True)
bb = mth(bb, "baseline_mean_2015_2019", "round(10.0 * $mean_u$) / 10.0")
bb = mth(bb, "pct_2020_vs_baseline_mean", "round(1000.0 * ($hosp_2020$ / $mean_u$ - 1.0)) / 10.0")
bb = mth(bb, "pct_2020_vs_2019", "round(1000.0 * ($hosp_2020$ / $hosp_2019$ - 1.0)) / 10.0")
bb = rul(bb, ['$hosp_2020$ > $baseline_max_2015_2019$ => "above range"', '$hosp_2020$ < $baseline_min_2015_2019$ => "below range"',
              'TRUE => "within range"'], "position_2020", "E position_2020", True)
bb = mth(bb, "trend_adjusted_expected_2020", "round(10.0 * $seas$ * $tr20$) / 10.0")
bb = mth(bb, "pct_2020_vs_trend_adjusted", "round(1000.0 * ($hosp_2020$ / ($seas$ * $tr20$) - 1.0)) / 10.0")
bb = rul(bb, ['$mean_u$ < 100 => "True"', 'TRUE => "False"'], "small_base", "E small_base (P7)", True)
bb = fin(bb, ["road_user", "month_num", "month", "baseline_mean_2015_2019", "baseline_min_2015_2019", "baseline_max_2015_2019",
              "hosp_2019", "hosp_2020", "hosp_2021", "pct_2020_vs_baseline_mean", "pct_2020_vs_2019", "position_2020",
              "trend_adjusted_expected_2020", "pct_2020_vs_trend_adjusted", "small_base"])
F.writer(bb, "idea4_baseline_band", "E Write idea4_baseline_band", gp)

# idea4_roaduser_change_2020
agp = F.add("Pivot", "E Annual, years side by side", [AG], pivot_model(["road_user"], ["year"], [("hospitalisations", DBL, "Sum")]), group=gp)
ja = jn(agp, TR20, ["road_user"], ["road_user"], ["road_user"] + [str(y) for y in range(2011, 2022)], ["road_user", "tr20"], "E + trend forecast")
ap = rfl(MONG, [("month_num", "EQ", "int", 4)], "E April only")
ap = F.add("Pivot", "E April, years side by side", [ap], pivot_model(["road_user"], ["year"], [("hospitalisations", DBL, "Sum")]), group=gp)
q2 = rfl(MONG, [("month_num", "GTE", "int", 4), ("month_num", "LTE", "int", 6)], "E April-June")
q2 = gb(q2, ["road_user", "year"], [("hospitalisations", DBL, "Sum")], "E Q2 by year")
q2 = F.add("Pivot", "E Q2, years side by side", [q2], pivot_model(["road_user"], ["year"], [("hospitalisations", DBL, "Sum")]), group=gp)
mean5 = "($2015$ + $2016$ + $2017$ + $2018$ + $2019$) / 5.0"
comps = [(ja, "year_vs_2019", "2020 vs 2019 (full year)", "$2019$"),
         (ja, "year_vs_mean_2015_2019", "2020 vs 2015-19 average (full year)", mean5),
         (ja, "year_vs_trend_2011_2019", "2020 vs 2011-19 trend line (full year)", "$tr20$"),
         (ap, "april_vs_2019", "April 2020 vs April 2019", "$2019$"),
         (ap, "april_vs_mean_2015_2019", "April 2020 vs April 2015-19 average", mean5),
         (q2, "q2_vs_2019", "Apr-Jun 2020 vs Apr-Jun 2019", "$2019$")]
pcs = []
for src, cid, lab, expr in comps:
    x = mth(src, "base_u", expr, f"E base ({cid})")
    x = mth(x, "value_2020", "$2020$", f"E value_2020 ({cid})")
    x = cst(x, "comparison", cid); x = cst(x, "comparison_label", lab)
    pcs.append(F.add("Column Filter", f"E Keep columns ({cid})", [x], colfilter_model(
        ["road_user", "comparison", "comparison_label", "base_u", "value_2020"]), group=gp))
ch = concat(pcs, "E Stack comparisons")
ch = mth(ch, "base_value", "round(10.0 * $base_u$) / 10.0")
ch = mth(ch, "abs_change", "round(10.0 * ($value_2020$ - $base_u$)) / 10.0")
ch = mth(ch, "pct_change", "round(1000.0 * ($value_2020$ / $base_u$ - 1.0)) / 10.0")
ch = rul(ch, ['$base_u$ < 100 => "True"', 'TRUE => "False"'], "small_base", "E small_base (P7)", True)
ch = fin(ch, ["road_user", "comparison", "comparison_label", "base_value", "value_2020", "abs_change", "pct_change", "small_base"])
F.writer(ch, "idea4_roaduser_change_2020", "E Write idea4_roaduser_change_2020", gp)

# idea4_cyclist_age_2020
ca = rfl(CUBE, [("road_user", "EQ", "str", "Pedal cyclist")], "E Pedal cyclists (age profile)")
ca = rfl(ca, [("age_group", "EQ", "str", a) for a in AGE], "E Known age bands", "OR")
ca = gb(ca, ["age_group", "year"], [("hospitalisations", DBL, "Sum")], "E By age x year")
ca = F.add("Pivot", "E Years side by side", [ca], pivot_model(["age_group"], ["year"], [("hospitalisations", DBL, "Sum")]), group=gp)
ca = mth(ca, "hosp_2017_2019_mean", "round(10.0 * ($2017$ + $2018$ + $2019$) / 3.0) / 10.0")
ca = ren(ca, [("2019", "hosp_2019"), ("2020", "hosp_2020"), ("2021", "hosp_2021")])
ca = mth(ca, "change_2019_2020", "$hosp_2020$ - $hosp_2019$")
ca = mth(ca, "pct_2019_2020", "round(1000.0 * ($hosp_2020$ / $hosp_2019$ - 1.0)) / 10.0")
ca = mth(ca, "pct_2020_vs_2017_2019_mean", "round(1000.0 * ($hosp_2020$ / $hosp_2017_2019_mean$ - 1.0)) / 10.0")
ca = mth(ca, "share_of_total_rise_pct", "round(1000.0 * $change_2019_2020$ / COL_SUM($change_2019_2020$)) / 10.0")
ca = mth(ca, "share_of_2019_cases_pct", "round(1000.0 * $hosp_2019$ / COL_SUM($hosp_2019$)) / 10.0")
ca = rul(ca, ['$hosp_2019$ < 100 => "True"', 'TRUE => "False"'], "small_base", "E small_base (P7)", True)
ca = fin(ca, ["age_group", "hosp_2017_2019_mean", "hosp_2019", "hosp_2020", "hosp_2021", "change_2019_2020", "pct_2019_2020",
              "pct_2020_vs_2017_2019_mean", "share_of_total_rise_pct", "share_of_2019_cases_pct", "small_base"])
F.writer(ca, "idea4_cyclist_age_2020", "E Write idea4_cyclist_age_2020", gp)

# idea4_state_cyclists_2020 (uses the KNIME state_by_road_user table)
sc = rfl(BLK["state_by_road_user"], [("road_user", "EQ", "str", "Pedal cyclist")], "E Pedal cyclists (state file)")
sc = rul(sc, ['$suppressed$ = "True" => 1', 'TRUE => 0'], "supp_n", "E suppressed as 0/1", True)
sp = F.add("Pivot", "E State x half-year, years side by side", [sc], pivot_model(["state", "half_year"], ["year"], [("cases_excl_died", DBL, "Sum")]), group=gp)
sp = ren(sp, [("2019", "cases_excl_died_2019"), ("2020", "cases_excl_died_2020"), ("2021", "cases_excl_died_2021")])
sp = mth(sp, "change_2019_2020", "$cases_excl_died_2020$ - $cases_excl_died_2019$")
sp = mth(sp, "pct_2019_2020", "round(1000.0 * ($cases_excl_died_2020$ / $cases_excl_died_2019$ - 1.0)) / 10.0")
st_tot = gb(sp, ["half_year"], [("change_2019_2020", DBL, "Sum")], "E Rise per half-year")
st_tot = ren(st_tot, [("change_2019_2020", "tot_change")])
ss = gb(sc, ["state", "half_year"], [("supp_n", DBL, "Maximum")], "E any suppressed 2011-21")
ss = ren(ss, [("supp_n", "supp_max")])
SPC = ["state", "half_year", "cases_excl_died_2019", "cases_excl_died_2020", "cases_excl_died_2021", "change_2019_2020", "pct_2019_2020"]
sp = jn(sp, st_tot, ["half_year"], ["half_year"], SPC, ["half_year", "tot_change"], "E + half-year total")
sp = jn(sp, ss, ["state", "half_year"], ["state", "half_year"], SPC + ["tot_change"], ["state", "half_year", "supp_max"], "E + suppressed flag")
sp = mth(sp, "share_of_half_year_rise_pct", "round(1000.0 * $change_2019_2020$ / $tot_change$) / 10.0")
sp = rul(sp, ['$supp_max$ > 0 => "True"', 'TRUE => "False"'], "any_suppressed_2011_2021", "E any_suppressed_2011_2021", True)
sp = rul(sp, ['$cases_excl_died_2019$ < 100 => "True"', 'TRUE => "False"'], "small_base", "E small_base (P7)", True)
sp = rul(sp, ['$state$ = "NSW" => "NSW narrowed its definition from mid-2017; 2019 and 2020 are both post-change"', 'TRUE => ""'], "note", "E note", True)
sp = fin(sp, SPC + ["share_of_half_year_rise_pct", "any_suppressed_2011_2021", "small_base", "note"])
F.writer(sp, "idea4_state_cyclists_2020", "E Write idea4_state_cyclists_2020", gp)
