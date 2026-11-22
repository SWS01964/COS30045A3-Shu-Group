/* Chart 3B: dot plot by age band, pedestrians vs all road users, with 95% interval whiskers.
   Toggle: died in hospital per 1,000 admitted / average stay (days). Uses *_publish columns only. */
window.Charts = window.Charts || {};
Charts.agedots = (function () {
  const AGES = ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+'];
  const MODES = {
    died: {key: 'died_per_1000_publish', lo: 'died_per_1000_ci95_low', hi: 'died_per_1000_ci95_high', dom: [0, 75], ticks: [0, 20, 40, 60],
      title: (p) => `For pedestrians over 75, one admission in ${Math.round(1000 / p)} ends in death`,
      sub: 'Died in hospital per 1,000 people admitted, by age, 2011–2019',
      fmt: (v) => v.toFixed(1)},
    stay: {key: 'avg_stay_publish', dom: [0, 22], ticks: [0, 5, 10, 15, 20],
      title: (p) => `Pedestrians aged 75 and over who survive stay ${Math.round(p)} days on average`,
      sub: 'Average days in hospital for people who survived their stay, by age, 2016–2021',
      fmt: (v) => v.toFixed(1)}
  };
  let mode = 'died', el = null, ped = null, all = null;

  const tipHtml = (i) => {
    const p = ped[i], a = all[i], M = MODES[mode];
    const line = (r, nm) => {
      const v = r[M.key];
      if (v == null) return `${nm}: too few cases to publish`;
      if (mode === 'died') return `${nm}: <b>${M.fmt(v)}</b> per 1,000 (${Viz.fmtInt(r.died_2011_2019)} of ${Viz.fmtInt(r.cases_2011_2019)}; 95% interval ${r.died_per_1000_ci95_low.toFixed(1)}–${r.died_per_1000_ci95_high.toFixed(1)})`;
      return `${nm}: <b>${M.fmt(v)}</b> days (${Viz.fmtInt(r.bed_days_excl_died_2016_2021)} bed days, ${Viz.fmtInt(r.hosp_2016_2021)} survivors)`;
    };
    return `<b>Age ${Viz.ageLabel(AGES[i])}</b><br>${line(p, 'Pedestrians')}<br>${line(a, 'All road users')}`;
  };

  function render() {
    const C = (n) => Viz.css(n), M = MODES[mode];
    const W = el.clientWidth, nar = Viz.narrow(W);
    const H = Math.max(280, Viz.aspectH(W, 380));
    const m = {t: 18, r: 8, b: 34, l: 34};
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = d3.scaleBand(AGES, [0, iw]).padding(0);
    const y = d3.scaleLinear(M.dom, [ih, 0]);
    const off = Math.min(9, x.bandwidth() * 0.18);
    const p75 = ped[AGES.length - 1], a75 = all[AGES.length - 1];
    const label = mode === 'died'
      ? `Dot plot by age. Deaths in hospital per 1,000 admitted rise with age and are higher for pedestrians at every age: ${p75[M.key]} for pedestrians aged 75 and over against ${a75[M.key]} for all road users of that age.`
      : `Dot plot by age. Average stay rises with age and is longer for pedestrians at every age: ${p75[M.key]} days for pedestrians aged 75 and over against ${a75[M.key]} for all road users of that age.`;
    const svg = Viz.svg(el, W, H, label + ' Use the left and right arrow keys to read each age group.');
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
    Viz.gridY(g, y, M.ticks, iw, (d) => d, 0);
    g.append('g').selectAll('text').data(AGES).join('text').attr('x', (a) => x(a) + x.bandwidth() / 2).attr('y', ih + 20)
      .attr('text-anchor', 'middle').style('font-weight', (a) => (a === '75+' ? 700 : 400)).style('fill', C('--ink')).text(Viz.ageLabel);
    g.append('text').attr('x', -m.l).attr('y', -6).style('fill', C('--muted')).text(mode === 'died' ? 'per 1,000' : 'days');

    const series = [{rows: all, dx: -off, col: C('--ctx-dark'), r: 5}, {rows: ped, dx: off, col: C('--hl'), r: 6}];
    const d = Viz.dur();
    series.forEach((s) => {
      const sg = g.append('g');
      s.rows.forEach((r, i) => {
        const v = r[M.key];
        if (v == null) return;
        const cx = x(AGES[i]) + x.bandwidth() / 2 + s.dx;
        if (mode === 'died' && M.lo) {
          const lo = y(r[M.lo]), hi = y(Math.min(M.dom[1], r[M.hi]));
          sg.append('line').attr('x1', cx).attr('x2', cx).attr('y1', lo).attr('y2', hi).attr('stroke', s.col).attr('stroke-width', 1.5);
          [lo, hi].forEach((yy) => sg.append('line').attr('x1', cx - 3).attr('x2', cx + 3).attr('y1', yy).attr('y2', yy).attr('stroke', s.col).attr('stroke-width', 1.5));
        }
        const c = sg.append('circle').attr('cx', cx).attr('r', s.r).attr('fill', s.col).attr('stroke', C('--bg')).attr('stroke-width', 1.5);
        if (d) c.attr('cy', y(0)).transition().duration(d).delay(i * 40).attr('cy', y(v)); else c.attr('cy', y(v));
      });
    });

    // annotation at 75+
    const px = x('75+') + x.bandwidth() / 2 + off, py = y(p75[M.key]);
    const txt = mode === 'died'
      ? `${Math.round(p75[M.key])} in 1,000 pedestrians aged 75+ died in hospital, against ${Math.round(a75[M.key])} for all road users that age`
      : `${Math.round(p75[M.key])} days for pedestrians aged 75+, against ${Math.round(a75[M.key])} for all road users that age`;
    Viz.annotate(g, el, [{x: px - 8, y: py, tx: px - 16, ty: Math.max(14, py - 4), lx: px - 14, ly: py, text: txt, anchor: 'end', width: Math.min(300, x('65-74') - 10), bx: -16, by: 0}], nar);

    // hit columns
    const cols = g.append('g').selectAll('rect').data(AGES.map((a, i) => i)).join('rect')
      .attr('x', (i) => x(AGES[i])).attr('width', x.bandwidth()).attr('y', 0).attr('height', ih + 26).attr('fill', 'transparent');
    Viz.bindTip(cols, tipHtml);
    Viz.keyNav(svg, AGES.length, (i) => Viz.tip.at(cols.nodes()[i], tipHtml(i)), {start: AGES.length - 1});

    document.getElementById('agedots-title').textContent = M.title(p75[M.key]);
    document.getElementById('agedots-sub-text').textContent = M.sub;
    const fmtOr = (v, f) => (v == null ? 'not published' : f(v));
    Viz.fillTable('#tbl-agedots', 'Outcomes after admission by age: pedestrians and all road users',
      ['Group', 'Age', 'Admitted 2011–19', 'Died 2011–19', 'Died per 1,000', '95% interval', 'Survivors 2016–21', 'Bed days', 'Average stay (days)'],
      [...ped.map((r) => ['Pedestrians', r]), ...all.map((r) => ['All road users', r])].map(([nm, r]) => [nm, Viz.ageLabel(r.age_group),
        Viz.fmtInt(r.cases_2011_2019), Viz.fmtInt(r.died_2011_2019), fmtOr(r.died_per_1000_publish, (v) => v.toFixed(1)),
        r.died_per_1000_publish == null ? '' : `${r.died_per_1000_ci95_low.toFixed(1)}–${r.died_per_1000_ci95_high.toFixed(1)}`,
        Viz.fmtInt(r.hosp_2016_2021), Viz.fmtInt(r.bed_days_excl_died_2016_2021), fmtOr(r.avg_stay_publish, (v) => v.toFixed(1))]));
  }

  function init(target, data) {
    el = target;
    const band = data.older.filter((r) => r.age_level === 'band');
    const pick = (u) => AGES.map((a) => band.find((r) => r.road_user === u && r.age_group === a));
    ped = pick('Pedestrian'); all = pick('All road users');
    Viz.segmented('#agedots-mode', (v) => { mode = v; Viz.tip.hide(); render(); });
    render();
  }
  return {init, render: () => el && render()};
})();
