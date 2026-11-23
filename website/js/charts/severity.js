/* Chart 2B: three aligned horizontal-bar panels sharing the age axis. */
window.Charts = window.Charts || {};
Charts.severity = (function () {
  function render(el, data) {
    const C = (n) => Viz.css(n);
    const rows = data.sev;
    const W = el.clientWidth, narrow = Viz.narrow(W);
    const labelW = 46, gap = narrow ? 14 : 24;
    const pw = (W - labelW - 2 * gap) / 3;
    const titleH = narrow ? 64 : 36, rowH = 44, barH = narrow ? 20 : 22, annH = narrow ? 70 : 46;
    const H = titleH + rows.length * rowH + annH;
    const idx = (a) => rows.findIndex((r) => r.age_group === a);
    const r75 = rows[idx('75+')], r26 = rows[idx('26-39')];
    const panels = [
      {title: 'Hospitalised people, 2016–21', key: 'hosp_2016_2021', fmt: (v) => (v / 1000).toFixed(1) + 'k', tip: (r) => `${Viz.fmtInt(r.hosp_2016_2021)} hospitalisations, 2016–21`},
      {title: 'Average days in hospital, 2016–21', key: 'avg_stay_days_2016_2021', fmt: (v) => v.toFixed(1), tip: (r) => `${r.avg_stay_days_2016_2021.toFixed(1)} days on average (${Viz.fmtInt(r.bed_days_excl_died_2016_2021)} bed days)`,
        ann: `${r75.avg_stay_days_2016_2021.toFixed(1)} days: ${(r75.avg_stay_days_2016_2021 / r26.avg_stay_days_2016_2021).toFixed(1)}× the 26–39 group’s ${r26.avg_stay_days_2016_2021.toFixed(1)}`},
      {title: 'Died in hospital per 1,000 cases, 2011–19', key: 'died_per_1000_2011_2019', fmt: (v) => v.toFixed(1), tip: (r) => `${r.died_per_1000_2011_2019.toFixed(1)} per 1,000 cases (${r.died_2011_2019} of ${Viz.fmtInt(r.cases_2011_2019)}), 2011–19`,
        ann: `${r75.died_per_1000_2011_2019.toFixed(1)} vs ${r26.died_per_1000_2011_2019.toFixed(1)} per 1,000 (26–39): ${Math.round(r75.died_per_1000_2011_2019 / r26.died_per_1000_2011_2019)}×`}
    ];
    d3.select(el).selectAll('svg').remove();
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H).attr('role', 'img')
      .attr('aria-label', `Three bar panels by age group. Adults aged 75 and over have fewer hospitalisations than younger adults, but stay ${r75.avg_stay_days_2016_2021.toFixed(1)} days on average against ${r26.avg_stay_days_2016_2021.toFixed(1)} for ages 26 to 39, and ${r75.died_per_1000_2011_2019.toFixed(1)} per 1,000 die in hospital against ${r26.died_per_1000_2011_2019.toFixed(1)}.`);
    // shared age axis
    svg.append('g').selectAll('text').data(rows).join('text').attr('x', labelW - 8).attr('y', (d, i) => titleH + i * rowH + rowH / 2 + 4).attr('text-anchor', 'end')
      .style('font-weight', (d) => (d.age_group === '75+' ? 700 : 400)).style('fill', C('--ink')).text((d) => Viz.ageLabel(d.age_group));
    panels.forEach((p, k) => {
      const x0 = labelW + k * (pw + gap);
      const t = svg.append('text').attr('x', x0).attr('y', 12).style('font-weight', 700).style('fill', C('--ink'));
      Viz.wrap(t, p.title, pw, 14);
      const g = svg.append('g').attr('transform', `translate(${x0},${titleH})`);
      const vmax = d3.max(rows, (d) => d[p.key]);
      const bw = pw - 40;
      const x = d3.scaleLinear([0, vmax], [0, bw]);
      g.append('line').attr('y1', 0).attr('y2', rows.length * rowH).attr('stroke', C('--ink-2'));
      const row = g.selectAll('g').data(rows).join('g').attr('transform', (d, i) => `translate(0,${i * rowH})`).style('cursor', 'default');
      row.append('rect').attr('width', pw).attr('height', rowH).attr('fill', 'transparent');
      row.append('rect').attr('x', 0).attr('y', (rowH - barH) / 2).attr('height', barH).attr('width', (d) => Math.max(1, x(d[p.key])))
        .attr('fill', (d) => (d.age_group === '75+' ? C('--hl') : C('--ctx'))).attr('rx', 2);
      row.append('text').attr('x', (d) => x(d[p.key]) + 4).attr('y', rowH / 2 + 4).style('fill', C('--ink'))
        .style('font-weight', (d) => (d.age_group === '75+' ? 700 : 400)).text((d) => p.fmt(d[p.key]));
      Viz.bindTip(row, (d) => `<b>Age ${Viz.ageLabel(d.age_group)}</b><br>${p.tip(d)}`);
      if (p.ann) {
        const a = svg.append('text').attr('x', x0).attr('y', titleH + rows.length * rowH + 20).style('fill', C('--hl-ink')).style('font-weight', 700);
        Viz.wrap(a, p.ann, pw + (k < 2 ? gap - 4 : 0), 14);
      }
    });
    const sevTip = (r) => `<b>Age ${Viz.ageLabel(r.age_group)}</b><br>` + panels.map((p) => p.tip(r)).join('<br>');
    Viz.keyNav(svg, rows.length, (i) => {
      const b = svg.node().getBoundingClientRect();
      Viz.tip.show(sevTip(rows[i]), b.left + labelW + 40, b.top + titleH + i * rowH + 6);
    }, {vertical: true});
    svg.attr('aria-label', svg.attr('aria-label') + ' Use the up and down arrow keys to read each age group.');
    Viz.fillTable('#tbl-sev', 'Severity by age group', ['Age', 'Hospitalisations 2016–21', 'Bed days 2016–21', 'Avg days in hospital', 'Cases 2011–19', 'Died in hospital 2011–19', 'Died per 1,000 cases'],
      rows.map((r) => [Viz.ageLabel(r.age_group), Viz.fmtInt(r.hosp_2016_2021), Viz.fmtInt(r.bed_days_excl_died_2016_2021), r.avg_stay_days_2016_2021.toFixed(1), Viz.fmtInt(r.cases_2011_2019), r.died_2011_2019, r.died_per_1000_2011_2019.toFixed(1)]));
  }
  return {render};
})();
