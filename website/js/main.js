/* Loads the CSVs, fills prose numbers from the data, draws every chart, redraws on resize and theme change. */
(function () {
  const files = {
    rates: 'idea1_rates', index: 'idea1_index_long', heat: 'idea2_heatmap_change',
    pop: 'idea2_age_population_change', annual: 'idea2_roaduser_age_annual', sev: 'idea2_age_severity',
    burden: 'idea3_burden_share', sevRU: 'idea3_severity_roaduser', older: 'idea3_older_pedestrians', cp: 'idea3_severity_counterparty',
    band: 'idea4_baseline_band', monthly: 'idea4_monthly_2019_2021', change: 'idea4_roaduser_change_2020', trend: 'idea4_cyclist_trend',
    cycAge: 'idea4_cyclist_age_2020', state: 'idea4_state_cyclists_2020'
  };

  function values(d) {
    const r11 = d.rates.find((r) => r.year === 2011), r21 = d.rates.find((r) => r.year === 2021);
    const idx = (s) => d.index.find((q) => q.series === s && q.year === 2021).index_2011;
    const heat = (u, a) => d.heat.find((c) => c.road_user === u && c.age_group === a).pct_change_3yr;
    const pop = (a) => d.pop.find((p) => p.age_group === a).pct_change_3yr;
    const pp = (u, a) => ((1 + heat(u, a) / 100) / (1 + pop(a) / 100) - 1) * 100;
    const sev = (a) => d.sev.find((r) => r.age_group === a);

    // Chapter 3
    const ru = (u) => d.sevRU.find((r) => r.road_user === u);
    const tot = d.sevRU.find((r) => r.level === 'total');
    const ped = ru('Pedestrian');
    const share = (u, m) => d.burden.find((b) => b.road_user === u && b.measure === m).share_pct;
    const old = (u, a) => d.older.find((r) => r.road_user === u && r.age_group === a);
    const cp = (u, c) => d.cp.find((r) => r.road_user === u && r.counterparty === c);
    const pedShare1119 = ped.cases_2011_2019 / tot.cases_2011_2019 * 100, pedDeathShare = ped.died_2011_2019 / tot.died_2011_2019 * 100;
    const p75 = old('Pedestrian', '75+'), a75 = old('All road users', '75+');
    const train = cp('All road users', 'Train');

    // Chapter 4
    const ch = (u, c) => d.change.find((r) => r.road_user === u && r.comparison === c);
    const aprAll = ch('All road users', 'april_vs_2019');
    const aprPct = (u) => Math.round(Math.abs(ch(u, 'april_vs_2019').value_2020 - ch(u, 'april_vs_2019').base_value) / ch(u, 'april_vs_2019').base_value * 100);
    const yrPct = (u) => { const r = ch(u, 'year_vs_2019'); return Math.round(Math.abs(r.value_2020 - r.base_value) / r.base_value * 100); };
    const cycJun = d.band.find((r) => r.road_user === 'Pedal cyclist' && r.month_num === 6);
    const cycYr = ch('Pedal cyclist', 'year_vs_2019');
    const t20 = d.trend.find((r) => r.year === 2020);
    const kids = d.cycAge.find((r) => r.age_group === '8-16');
    const vic = d.state.find((r) => r.state === 'Vic' && r.half_year === 'Jul-Dec');
    const cycAprDec = d.band.filter((r) => r.road_user === 'Pedal cyclist' && r.month_num >= 4);

    return {
      // Chapter 1
      hosp21: Viz.fmtInt(r21.hospitalisations), perDay: Math.round(r21.hospitalisations / 365),
      ratio21: Math.round(r21.hosp_per_death), ratio11: Math.round(r11.hosp_per_death),
      ratio21x: r21.hosp_per_death.toFixed(1), ratio11x: r11.hosp_per_death.toFixed(1),
      deaths21: Viz.fmtInt(r21.road_deaths), deaths11: Viz.fmtInt(r11.road_deaths),
      hospPct: Math.round(idx('hospitalisations') - 100), popPct: Math.round(idx('population') - 100),
      deathsPct: (100 - idx('road_deaths')).toFixed(1),
      deathRateFall: Math.round((1 - r21.deaths_per_100k / r11.deaths_per_100k) * 100),
      rate11: Math.round(r11.hosp_per_100k), rate21: Math.round(r21.hosp_per_100k),
      dr11: r11.deaths_per_100k.toFixed(2), dr21: r21.deaths_per_100k.toFixed(2),
      // Chapter 2
      cyc6574: Math.round(heat('Pedal cyclist', '65-74')), cyc75: Math.round(heat('Pedal cyclist', '75+')),
      cycpp6574: Math.round(pp('Pedal cyclist', '65-74')), cycpp75: Math.round(pp('Pedal cyclist', '75+')),
      pop6574: Math.round(pop('65-74')), pop75: Math.round(pop('75+')),
      cyc4064: Math.round(heat('Pedal cyclist', '40-64')),
      stay75: sev('75+').avg_stay_days_2016_2021.toFixed(1), stay2639: sev('26-39').avg_stay_days_2016_2021.toFixed(1),
      stayX: (sev('75+').avg_stay_days_2016_2021 / sev('26-39').avg_stay_days_2016_2021).toFixed(1),
      diedX: Math.round(sev('75+').died_per_1000_2011_2019 / sev('26-39').died_per_1000_2011_2019),
      died75: sev('75+').died_per_1000_2011_2019.toFixed(1), died2639: sev('26-39').died_per_1000_2011_2019.toFixed(1),
      // Chapter 3
      pedShare1119: pedShare1119.toFixed(1), pedDeathShare: pedDeathShare.toFixed(1),
      pedOneIn: Math.round(100 / pedShare1119), pedDeathOneIn: Math.round(100 / pedDeathShare),
      pedDeaths: Viz.fmtInt(ped.died_2011_2019), allDeaths: Viz.fmtInt(tot.died_2011_2019),
      pedDied: Math.round(ped.died_per_1000_publish), driverDied: Math.round(ru('Car driver').died_per_1000_publish), cycDied: Math.round(ru('Pedal cyclist').died_per_1000_publish),
      pedCases: share('Pedestrian', 'cases').toFixed(1), pedBed: share('Pedestrian', 'bed_days').toFixed(1),
      pedCasesOneIn: Math.round(100 / share('Pedestrian', 'cases')),
      ped75Died: Math.round(p75.died_per_1000_publish), ped75Stay: Math.round(p75.avg_stay_publish), ped75OneIn: Math.round(1000 / p75.died_per_1000_publish),
      all75Died: Math.round(a75.died_per_1000_publish), all75Stay: Math.round(a75.avg_stay_publish),
      pedHeavy: Math.round(cp('Pedestrian', 'Heavy transport vehicle or bus').died_per_1000_publish),
      trainCases: Viz.fmtInt(train.cases_2011_2019), trainDeaths: train.died_2011_2019,
      // Chapter 4
      apr20: Viz.fmtInt(aprAll.value_2020), apr19: Viz.fmtInt(aprAll.base_value), aprFewer: Viz.fmtInt(Math.abs(aprAll.abs_change)), aprPct: aprPct('All road users'),
      cycApr: aprPct('Pedal cyclist'), pedApr: aprPct('Pedestrian'), passApr: aprPct('Car passenger'), drvApr: aprPct('Car driver'), motoApr: aprPct('Motorcyclist'),
      cycJun20: cycJun.hosp_2020, cycJun19: cycJun.hosp_2019,
      cyc19: Viz.fmtInt(cycYr.base_value), cyc20: Viz.fmtInt(cycYr.value_2020), cycYrPct: yrPct('Pedal cyclist'),
      pedYrPct: yrPct('Pedestrian'), drvYrPct: yrPct('Car driver'),
      trendExp: Viz.fmtInt(Math.round(t20.trend_2011_2019)), trendExcess: Math.round(t20.residual_vs_2011_2019),
      kidsShare19: Math.round(100 / kids.share_of_2019_cases_pct), kidsRise: kids.share_of_total_rise_pct.toFixed(1),
      vicJulDec: vic.pct_2019_2020.toFixed(1),
      cycAboveMonths: cycAprDec.filter((r) => r.position_2020 === 'above range').length
    };
  }

  function fillProse(d) {
    const v = values(d);
    document.querySelectorAll('[data-fill]').forEach((el) => {
      const k = el.dataset.fill;
      if (v[k] === undefined || v[k] === null || Number.isNaN(v[k])) { el.setAttribute('data-fill-missing', ''); console.warn('No value for data-fill', k); return; }
      el.textContent = v[k];
      el.setAttribute('data-filled', '');
    });
  }

  // Draw one chart; if it throws, leave a visible marker instead of breaking the rest of the page.
  function safe(name, el, fn) {
    try { fn(); } catch (err) {
      console.error('Chart failed:', name, err);
      if (el && !el.querySelector('.chart-error')) {
        const e = document.createElement('p');
        e.className = 'chart-error';
        e.textContent = 'This chart could not be drawn. The data table below still has the numbers.';
        el.appendChild(e);
      }
    }
  }

  Promise.all(Object.values(files).map((f) => d3.csv('data/' + f + '.csv', d3.autoType))).then((arr) => {
    const d = {};
    Object.keys(files).forEach((k, i) => { d[k] = arr[i]; });
    fillProse(d);
    const $ = (id) => document.getElementById(id);
    const els = {unit: $('chart-unit'), lines: $('chart-lines'), heat: $('chart-heat'), trend2: $('chart-trend'), sev: $('chart-sev'),
      burden: $('chart-burden'), agedots: $('chart-agedots'), cp: $('chart-cp'), lockdown: $('chart-lockdown'), div: $('chart-div'), trend4: $('chart-trend4')};
    safe('unit', els.unit, () => Charts.unit.render(els.unit, d));
    safe('lines', els.lines, () => Charts.lines.init(els.lines, d));
    safe('heatmap', els.heat, () => Charts.heatmap.init(els.heat, els.trend2, d));
    safe('severity', els.sev, () => Charts.severity.render(els.sev, d));
    safe('burden', els.burden, () => Charts.burden.init(els.burden, d));
    safe('agedots', els.agedots, () => Charts.agedots.init(els.agedots, d));
    safe('counterparty', els.cp, () => Charts.counterparty.init(els.cp, d));
    safe('lockdown', els.lockdown, () => Charts.lockdown.init(els.lockdown, d));
    safe('diverging', els.div, () => Charts.diverging.init(els.div, d));
    safe('trend', els.trend4, () => Charts.trend.init(els.trend4, d));

    const redraw = () => {
      Viz.tip.hide();
      safe('unit', els.unit, () => Charts.unit.render(els.unit, d));
      safe('lines', els.lines, () => Charts.lines.render(els.lines, d));
      safe('heatmap', els.heat, () => Charts.heatmap.redraw());
      safe('severity', els.sev, () => Charts.severity.render(els.sev, d));
      ['burden', 'agedots', 'counterparty', 'lockdown', 'diverging', 'trend'].forEach((k) => safe(k, null, () => Charts[k].render()));
    };
    let w = window.innerWidth;
    window.addEventListener('resize', Viz.debounce(() => {
      if (window.innerWidth === w) return; // ignore mobile address-bar height changes
      w = window.innerWidth;
      redraw();
    }, 200));
    Viz.onTheme(redraw);
    document.documentElement.setAttribute('data-charts', 'ready');
  }).catch((err) => {
    console.error(err);
    const e = document.createElement('div');
    e.className = 'error';
    e.textContent = 'The charts could not load their data. If you opened this file directly, serve the folder with a web server instead (see README).';
    document.querySelector('main').prepend(e);
  });
})();
