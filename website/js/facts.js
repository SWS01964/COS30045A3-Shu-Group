/* facts.js: registry of prose numbers. OWNED BY THE ORCHESTRATOR.

   Every number in the body copy, standfirsts and What-to-know boxes is written in
   index.html as   <span data-fill="key">fallback</span>
   where the fallback is the storyboard value. On load, Facts.fillProse(data)
   replaces each span's text with the value computed here from the CSVs, and
   console.warn()s when the computed text differs from the fallback, so a stale
   storyboard or a data change is visible.

   Formulas follow data/processed/KEY_NUMBERS.md:
     shares  = row / the "All road users" (or "All ages") row of the same view and category
     windows = admissions/deaths 2011-19 (cases_1119, died_1119); stays and bed days 2016-21
     per-person changes use unrounded averages and ABS population.
   Chapter 5 rates and populations come from ch5_first_nations_trend.csv (computed in KNIME from the ABS First Nations population).

   To add a number: add <span data-fill="new_key">value</span> in the HTML and
   one line here. Formatters and row lookups come from common.js (Viz.fmt, Viz.find). Chapter agents may use data-fill inside their own section: send the
   registry line to the orchestrator (or put it in your chN.js via Facts.register). */
(function () {
  'use strict';
  var Facts = (window.Facts = window.Facts || {});
  var R = (Facts.registry = {});
  Facts.register = function (key, fn) { R[key] = fn; };
  var reg = Facts.register;

  /* ---------- formatters and lookups: shared with the charts (common.js loads first) ---------- */
  var int = Viz.fmt.int;                                   /* 1,234 */
  var dp = Viz.fmt.dp;                                     /* 1,234.5 with a true minus */
  function pct(n, d) { return Viz.fmt.pct(Math.abs(n), d); } /* magnitude; the sentence supplies up/down/fewer */
  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  function word(n) { n = Math.round(n); return WORDS[n] || String(n); }

  /* ---------- row lookups ---------- */
  var find = Viz.find;
  function y1(d, year) { return find(d.ch1_trend, { year: year }); }
  function sev(d, view, ru, cat) { return find(d.severity, { view: view, road_user: ru, category: cat }); }
  function sevAge(d, ru, cat) { return sev(d, 'age', ru, cat); }
  function mon(d, ru, month) { return find(d.ch4_monthly, { road_user: ru, month: month }); }
  function c2(d, ru, age) { return find(d.ch2_age_roaduser, { road_user: ru, age_group: age }); }
  function fnRow(d, year, status) { return find(d.ch5_first_nations_trend, { year: year, status: status }); }
  function fn(d, year, status) { return fnRow(d, year, status).hosp; }
  var FN = 'First Nations people', NI = 'Non-Indigenous';
  function prof(d, view, status, cat) { return find(d.ch5_first_nations_profile, { view: view, status: status, category: cat }); }
  function fnPop(d, y) { return fnRow(d, y, FN).population; }
  function r100(d, y, status) { return fnRow(d, y, status).hosp_per_100k; }
  var CAR = 'Car driver, passenger or unknown position';

  /* hospitalisations in a share-style row: ratio of road-user row to the All road users row */
  function share(d, view, ru, cat, col) {
    return sev(d, view, ru, cat)[col] / sev(d, view, 'All road users', cat)[col] * 100;
  }
  /* road-user mix in ch5 profile: category / sum of that group's categories */
  function mix(d, status, cat) {
    var rows = d.ch5_first_nations_profile.filter(function (r) { return r.view === 'road_user' && r.status === status; });
    var tot = rows.reduce(function (a, r) { return a + r.hosp; }, 0);
    return find(rows, { category: cat }).hosp / tot * 100;
  }
  function fnShare(d, area) {
    var a = prof(d, 'remoteness', FN, area).hosp, b = prof(d, 'remoteness', NI, area).hosp;
    return a / (a + b) * 100;
  }
  function pedHeavy(d, ru) { return sev(d, 'counterparty', ru, 'Heavy transport vehicle or bus').died_per_1000; }

  /* ================= Hero + Chapter 1 ================= */
  reg('hosp_2021', function (d) { return int(y1(d, 2021).hosp); });                  /* 39,505 */
  reg('deaths_2021', function (d) { return int(y1(d, 2021).road_deaths); });          /* 1,130 */
  reg('per_death_2021', function (d) { return int(y1(d, 2021).hosp_per_death); });    /* 35 */
  reg('per_day_2021', function (d) { return int(y1(d, 2021).hosp / 365); });          /* 108 */
  reg('deaths_chg', function (d) { return pct((y1(d, 2021).road_deaths / y1(d, 2011).road_deaths - 1) * 100, 1); }); /* 11.5% */
  reg('hosp_chg', function (d) { return pct((y1(d, 2021).hosp / y1(d, 2011).hosp - 1) * 100); });                  /* 16% */
  reg('rate_2011', function (d) { return dp(y1(d, 2011).hosp_per_100k, 1); });        /* 152.3 */
  reg('rate_2021', function (d) { return dp(y1(d, 2021).hosp_per_100k, 1); });        /* 153.8 */

  /* ================= Chapter 2 ================= */
  reg('cyc_65_74', function (d) { return pct(c2(d, 'Pedal cyclist', '65-74').pct_change_3yr); }); /* 138% */
  reg('cyc_75', function (d) { return pct(c2(d, 'Pedal cyclist', '75+').pct_change_3yr); });      /* 142% */
  function perPerson(r) { return ((r.avg_2019_21 / r.pop_2019_21) / (r.avg_2011_13 / r.pop_2011_13) - 1) * 100; }
  reg('cyc_65_74_pp', function (d) { return pct(perPerson(c2(d, 'Pedal cyclist', '65-74'))); }); /* 78% */
  reg('cyc_75_pp', function (d) { return pct(perPerson(c2(d, 'Pedal cyclist', '75+'))); });      /* 92% */

  /* ================= Chapter 3 ================= */
  reg('ped_adm_share_1119', function (d) { return pct(share(d, 'age', 'Pedestrian', 'All ages', 'cases_1119'), 1); }); /* 7.3% */
  reg('ped_died_share_1119', function (d) { return pct(share(d, 'age', 'Pedestrian', 'All ages', 'died_1119'), 1); }); /* 26.4% */
  reg('ped_one_in_adm', function (d) { return int(100 / share(d, 'age', 'Pedestrian', 'All ages', 'cases_1119')); });  /* 14 */
  reg('ped_one_in_died', function (d) { return int(100 / share(d, 'age', 'Pedestrian', 'All ages', 'died_1119')); });  /* 4 */
  reg('ped_died_per1000', function (d) { return int(sevAge(d, 'Pedestrian', 'All ages').died_per_1000); });            /* 22 */
  reg('cardriver_died_per1000', function (d) { return int(sevAge(d, 'Car driver', 'All ages').died_per_1000); });      /* 6 */
  reg('cyclist_died_per1000', function (d) { return int(sevAge(d, 'Pedal cyclist', 'All ages').died_per_1000); });    /* 2 */
  reg('ped75_died_per1000', function (d) { return int(sevAge(d, 'Pedestrian', '75+').died_per_1000); });              /* 61 */
  reg('ped75_stay', function (d) { return int(sevAge(d, 'Pedestrian', '75+').avg_stay); });                           /* 19 */
  reg('all75_died_per1000', function (d) { return int(sevAge(d, 'All road users', '75+').died_per_1000); });          /* 28 */
  reg('all75_stay', function (d) { return int(sevAge(d, 'All road users', '75+').avg_stay); });                       /* 11 */
  reg('ped_one_in_adm_1621', function (d) { return word(100 / share(d, 'age', 'Pedestrian', 'All ages', 'hosp_1621')); }); /* fifteen */
  reg('ped_adm_share_1621', function (d) { return pct(share(d, 'age', 'Pedestrian', 'All ages', 'hosp_1621'), 1); });   /* 6.5% */
  reg('ped_beds_share_1621', function (d) { return pct(share(d, 'age', 'Pedestrian', 'All ages', 'beds_1621'), 1); });  /* 13.1% */
  reg('ped_died_n', function (d) { return int(sevAge(d, 'Pedestrian', 'All ages').died_1119); });                      /* 538 */
  reg('all_died_n', function (d) { return int(sevAge(d, 'All road users', 'All ages').died_1119); });                  /* 2,041 */
  reg('ped75_one_in', function (d) { return int(1000 / sevAge(d, 'Pedestrian', '75+').died_per_1000); });              /* 16 */
  reg('ped75_one_in_word', function (d) { return word(1000 / sevAge(d, 'Pedestrian', '75+').died_per_1000); });         /* sixteen */
  function ped65(d, col) {
    var a = sevAge(d, 'Pedestrian', '65-74')[col] + sevAge(d, 'Pedestrian', '75+')[col];
    return a / sevAge(d, 'Pedestrian', 'All ages')[col] * 100;
  }
  reg('ped65_adm_share', function (d) { return pct(ped65(d, 'cases_1119')); });   /* 23% */
  reg('ped65_died_share', function (d) { return pct(ped65(d, 'died_1119')); });   /* 52% */
  reg('hv_cyclist', function (d) { return dp(pedHeavy(d, 'Pedal cyclist'), 1); });     /* 25.5 */
  reg('hv_carpass', function (d) { return dp(pedHeavy(d, 'Car passenger'), 1); });     /* 18.9 */
  reg('hv_cardriver', function (d) { return dp(pedHeavy(d, 'Car driver'), 1); });      /* 16.5 */
  reg('hv_moto', function (d) { return dp(pedHeavy(d, 'Motorcyclist'), 1); });         /* 15.2 */
  reg('hv_ped', function (d) { return int(pedHeavy(d, 'Pedestrian')); });              /* 53 */
  reg('train_ped_deaths', function (d) { return int(sev(d, 'counterparty', 'Pedestrian', 'Train').died_1119); });         /* 14 */
  reg('train_all_deaths', function (d) { return int(sev(d, 'counterparty', 'All road users', 'Train').died_1119); });      /* 17 */

  /* ================= Chapter 4 ================= */
  reg('apr_2020', function (d) { return int(mon(d, 'All road users', 'April')[2020]); });           /* 2,357 */
  reg('apr_fewer_pct', function (d) { return pct(mon(d, 'All road users', 'April').pct_2020_vs_2019); }); /* 32% */
  reg('apr_fewer_n', function (d) { var r = mon(d, 'All road users', 'April'); return int(r[2019] - r[2020]); }); /* 1,131 */
  reg('apr_ped', function (d) { return pct(mon(d, 'Pedestrian', 'April').pct_2020_vs_2019); });        /* 60% */
  reg('apr_carpass', function (d) { return pct(mon(d, 'Car passenger', 'April').pct_2020_vs_2019); });  /* 53% */
  reg('apr_cardriver', function (d) { return pct(mon(d, 'Car driver', 'April').pct_2020_vs_2019); });   /* 43% */
  reg('apr_moto', function (d) { return pct(mon(d, 'Motorcyclist', 'April').pct_2020_vs_2019); });      /* 38% */
  reg('apr_cyclist', function (d) { return pct(mon(d, 'Pedal cyclist', 'April').pct_2020_vs_2019); });  /* 16% */
  function monthsAbove(d, col) {
    var n = 0, tot = 0;
    d.ch4_monthly.forEach(function (r) {
      if (r.road_user === 'Pedal cyclist' && r.month !== 'Year' && r.month_num >= 4) { tot++; if (r[2020] > r[col]) n++; }
    });
    return [n, tot];
  }
  reg('cyc_months_above', function (d) { return String(monthsAbove(d, 'base_max')[0]); });      /* 9 */
  reg('cyc_months_total', function (d) { return String(monthsAbove(d, 'base_max')[1]); });      /* 9 */
  reg('cyc_jun_2020', function (d) { return int(mon(d, 'Pedal cyclist', 'June')[2020]); });     /* 682 */
  reg('cyc_jun_2019', function (d) { return int(mon(d, 'Pedal cyclist', 'June')[2019]); });     /* 453 */
  reg('cyc_year_2019', function (d) { return int(mon(d, 'Pedal cyclist', 'Year')[2019]); });    /* 7,302 */
  reg('cyc_year_2020', function (d) { return int(mon(d, 'Pedal cyclist', 'Year')[2020]); });    /* 8,332 */
  reg('cyc_year_pct', function (d) { return pct(mon(d, 'Pedal cyclist', 'Year').pct_2020_vs_2019); });   /* 14% */
  reg('ped_year_pct', function (d) { var r = mon(d, 'Pedestrian', 'Year'); return pct((r[2020] / r[2019] - 1) * 100); }); /* 22% */
  reg('cardriver_year_pct', function (d) { var r = mon(d, 'Car driver', 'Year'); return pct((r[2020] / r[2019] - 1) * 100); }); /* 9% */
  function kids(d) {
    var rows = d.ch2_age_roaduser.filter(function (r) { return r.road_user === 'Pedal cyclist'; });
    var all19 = 0, all20 = 0;
    rows.forEach(function (r) { all19 += r[2019]; all20 += r[2020]; });
    var k = find(rows, { age_group: '8-16' });
    return { k19: k[2019], inc: k[2020] - k[2019], all19: all19, allInc: all20 - all19 };
  }
  reg('kids_one_in_word', function (d) { var k = kids(d); return word(k.all19 / k.k19); });      /* seven */
  reg('kids_inc_pct', function (d) { var k = kids(d); return pct(k.inc / k.allInc * 100); });     /* 30% */
  reg('kids_inc_n', function (d) { return int(kids(d).inc); });                                   /* 307 */
  reg('cyc_inc_n', function (d) { return int(kids(d).allInc); });                                 /* 1,030 */
  reg('cyc_trend_rate', function (d) {
    var r = mon(d, 'Pedal cyclist', 'Year');
    return pct((Math.pow(r[2019] / r[2011], 1 / 8) - 1) * 100, 1);                                /* 3.9% */
  });
  reg('cyc_trend_2020', function (d) { return int(mon(d, 'Pedal cyclist', 'Year').trend_2020); }); /* 7,584 */
  reg('cyc_above_trend_n', function (d) {                                                          /* 750 (to the nearest 50) */
    var r = mon(d, 'Pedal cyclist', 'Year');
    return int(Math.round((r[2020] - r.trend_2020) / 50) * 50);
  });
  reg('cyc_above_trend_pct', function (d) { var r = mon(d, 'Pedal cyclist', 'Year'); return pct((r[2020] / r.trend_2020 - 1) * 100); }); /* 10% */
  function stJul(d, st) { return find(d.ch4_state_cyclists, { half: 'Jul-Dec', state: st }); }
  reg('vic_jd_2020', function (d) { return int(stJul(d, 'Vic')[2020]); });         /* 1,419 */
  reg('vic_jd_2019', function (d) { return int(stJul(d, 'Vic')[2019]); });         /* 1,010 */
  reg('vic_jd_more', function (d) { var r = stJul(d, 'Vic'); return int(r[2020] - r[2019]); }); /* 409 */
  reg('vic_jd_pct', function (d) { return dp(stJul(d, 'Vic').pct_change, 1) + '%'; });          /* 40.5% */
  reg('tas_jd_pct', function (d) { return dp(stJul(d, 'Tas').pct_change, 1) + '%'; });          /* 40.7% */
  reg('tas_jd_2019', function (d) { return int(stJul(d, 'Tas')[2019]); });         /* 54 */
  reg('tas_jd_2020', function (d) { return int(stJul(d, 'Tas')[2020]); });         /* 76 */

  /* ================= Chapter 5 ================= */
  reg('fn_2011', function (d) { return int(fn(d, 2011, FN)); });                     /* 1,167 */
  reg('fn_2021', function (d) { return int(fn(d, 2021, FN)); });                     /* 2,220 */
  reg('fn_chg', function (d) { return pct((fn(d, 2021, FN) / fn(d, 2011, FN) - 1) * 100); });  /* 90% */
  reg('fn_rise_n', function (d) { return int(fn(d, 2021, FN) - fn(d, 2011, FN)); }); /* 1,053 */
  reg('ni_2011', function (d) { return int(fn(d, 2011, NI)); });                     /* 31,997 */
  reg('ni_2021', function (d) { return int(fn(d, 2021, NI)); });                     /* 36,755 */
  reg('ni_chg', function (d) { return pct((fn(d, 2021, NI) / fn(d, 2011, NI) - 1) * 100); }); /* 15% */
  reg('fn_rate_2011', function (d) { return int(r100(d, 2011, FN)); });     /* 145 */
  reg('fn_rate_2021', function (d) { return int(r100(d, 2021, FN)); });     /* 226 */
  reg('ni_rate_2011', function (d) { return int(r100(d, 2011, NI)); });  /* 149 */
  reg('ni_rate_2021', function (d) { return int(r100(d, 2021, NI)); });  /* 149 */
  reg('fn_rate_chg', function (d) {
    return pct((r100(d, 2021, FN) / r100(d, 2011, FN) - 1) * 100); /* 56% */
  });
  reg('pop_2011', function (d) { return int(y1(d, 2011).population); });             /* 22,340,024 */
  reg('pop_2021', function (d) { return int(y1(d, 2021).population); });             /* 25,685,412 */
  function gap(d, y) { return y1(d, y).hosp - fn(d, y, FN) - fn(d, y, NI); }
  reg('gap_2011', function (d) { return int(gap(d, 2011)); });                       /* 869 */
  reg('gap_2021', function (d) { return int(gap(d, 2021)); });                       /* 530 */
  reg('fn_pop_share_2021', function (d) { return pct(fnPop(d, 2021) / y1(d, 2021).population * 100, 1); });   /* 3.8% */
  reg('fn_hosp_share_2021', function (d) { return pct(fn(d, 2021, FN) / y1(d, 2021).hosp * 100, 1); });    /* 5.6% */
  reg('fn_ped_share', function (d) { return pct(mix(d, FN, 'Pedestrian'), 1); });    /* 11.0% */
  reg('ni_ped_share', function (d) { return pct(mix(d, NI, 'Pedestrian'), 1); });    /* 6.3% */
  reg('fn_ped_share0', function (d) { return pct(mix(d, FN, 'Pedestrian')); });      /* 11% */
  reg('ni_ped_share0', function (d) { return pct(mix(d, NI, 'Pedestrian')); });      /* 6% */
  reg('fn_cyc_share', function (d) { return pct(mix(d, FN, 'Pedal cyclist'), 1); }); /* 10.9% */
  reg('ni_cyc_share', function (d) { return pct(mix(d, NI, 'Pedal cyclist'), 1); }); /* 19.7% */
  reg('fn_car_share', function (d) { return pct(mix(d, FN, CAR), 1); });             /* 54.5% */
  reg('ni_car_share', function (d) { return pct(mix(d, NI, CAR), 1); });             /* 48.1% */
  reg('np_cells_each', function (d) {                                                /* 14 */
    return int(d.ch5_first_nations_profile.filter(function (r) { return r.view === 'road_user' && r.status === FN; })
      .reduce(function (a, r) { return a + r.np_cells; }, 0));
  });
  reg('fn_remote_share', function (d) { return pct(fnShare(d, 'Remote'), 1); });     /* 41.2% */
  reg('fn_regional_share', function (d) { return pct(fnShare(d, 'Regional'), 1); }); /* 7.1% */
  reg('fn_major_share', function (d) { return pct(fnShare(d, 'Major Cities'), 1); }); /* 2.7% */
  reg('fn_remote_share0', function (d) { return pct(fnShare(d, 'Remote')); });       /* 41% */
  reg('fn_stay_remote', function (d) { return dp(prof(d, 'remoteness', FN, 'Remote').avg_stay, 1); });       /* 6.1 */
  reg('ni_stay_remote', function (d) { return dp(prof(d, 'remoteness', NI, 'Remote').avg_stay, 1); });       /* 4.9 */
  reg('fn_stay_major', function (d) { return dp(prof(d, 'remoteness', FN, 'Major Cities').avg_stay, 1); });  /* 5.1 */
  reg('ni_stay_major', function (d) { return dp(prof(d, 'remoteness', NI, 'Major Cities').avg_stay, 1); });  /* 4.9 */
  function remTotal(d, st) {
    return d.ch5_first_nations_profile.filter(function (r) { return r.view === 'remoteness' && r.status === st; })
      .reduce(function (a, r) { return a + r.hosp; }, 0);
  }
  function roadTotal(d, st) {
    return d.ch5_first_nations_profile.filter(function (r) { return r.view === 'road_user' && r.status === st; })
      .reduce(function (a, r) { return a + r.hosp; }, 0);
  }
  reg('fn_rem_total', function (d) { return int(remTotal(d, FN)); });                /* 11,539 */
  reg('fn_road_total', function (d) { return int(roadTotal(d, FN)); });              /* 11,635 */
  reg('fn_total_diff', function (d) { return int(roadTotal(d, FN) - remTotal(d, FN)); }); /* 96 */

  /* ---------------- engine ---------------- */
  Facts.compute = function (key, data) {
    var fn_ = R[key];
    if (!fn_) throw new Error('unknown data-fill key: ' + key);
    return fn_(data);
  };
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  /* Replaces every span[data-fill]. Returns {total, mismatches:[{key, fallback, computed}], errors:[]}. */
  Facts.fillProse = function (data, root) {
    var report = { total: 0, mismatches: [], errors: [] };
    var spans = (root || document).querySelectorAll('[data-fill]');
    Array.prototype.forEach.call(spans, function (el) {
      var key = el.getAttribute('data-fill');
      var fallback = norm(el.textContent);
      report.total++;
      var computed;
      try {
        computed = Facts.compute(key, data);
      } catch (e) {
        report.errors.push({ key: key, fallback: fallback, error: String(e.message || e) });
        console.warn('[facts] ' + key + ': could not compute (' + (e.message || e) + '); keeping fallback "' + fallback + '"');
        el.setAttribute('data-fill-state', 'error');
        return;
      }
      if (computed !== fallback) {
        report.mismatches.push({ key: key, fallback: fallback, computed: computed });
        console.warn('[facts] MISMATCH ' + key + ': storyboard says "' + fallback + '", data gives "' + computed + '"');
        el.setAttribute('data-fill-state', 'mismatch');
        el.setAttribute('data-fill-was', fallback);
      } else {
        el.setAttribute('data-fill-state', 'ok');
      }
      el.textContent = computed;
    });
    Facts.report = report;
    return report;
  };
})();
