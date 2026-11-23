/* Beat 4.3: annual cyclist admissions with the 2011-2019 linear trend and its 95% prediction band. */
window.Charts = window.Charts || {};
Charts.trend = (function () {
  let el = null, rows = null;

  const tipHtml = (r) => `<b>${r.year}</b>` +
    `<div class="row"><span>Admitted</span><b>${Viz.fmtInt(r.actual)}</b></div>` +
    `<div class="row"><span>2011–19 trend</span><span>${Viz.fmtInt(Math.round(r.trend_2011_2019))}</span></div>` +
    `<div class="row"><span>95% band</span><span>${Viz.fmtInt(Math.round(r.pi95_low_2011_2019))}–${Viz.fmtInt(Math.round(r.pi95_high_2011_2019))}</span></div>` +
    (r.in_fit_period ? '' : `<span class="muted">${Viz.signed(Math.round(r.residual_vs_2011_2019))} vs trend (${Viz.signed(r.residual_pct_vs_2011_2019, 1)}%)</span>`);

  function render() {
    const C = (n) => Viz.css(n);
    const W = el.clientWidth, nar = Viz.narrow(W);
    const H = Math.max(240, Viz.aspectH(W, 320));
    const m = {t: 18, r: 14, b: 30, l: nar ? 42 : 48};
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = d3.scaleLinear([2011, 2021], [0, iw]);
    const y = d3.scaleLinear([4500, 9000], [ih, 0]);
    const r20 = rows.find((r) => r.year === 2020);
    const svg = Viz.svg(el, W, H, `Line chart of cyclist admissions each year with the 2011 to 2019 trend. In 2020, ${Viz.fmtInt(r20.actual)} were admitted against ${Viz.fmtInt(Math.round(r20.trend_2011_2019))} expected from the trend, inside the 95% prediction band. Use the left and right arrow keys to read each year.`);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
    Viz.gridY(g, y, [5000, 6000, 7000, 8000, 9000], iw, Viz.fmtInt);
    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ih).attr('y2', ih).attr('stroke', C('--ink-2'));
    const xt = nar ? [2011, 2015, 2019, 2021] : d3.range(2011, 2022, 2);
    g.append('g').selectAll('text').data(xt).join('text').attr('x', x).attr('y', ih + 20).attr('text-anchor', 'middle').text((d) => d);

    const proj = rows.filter((r) => r.year >= 2019);
    const fit = rows.filter((r) => r.in_fit_period);
    g.append('path').datum(rows).attr('fill', C('--ctx')).attr('opacity', 0.22)
      .attr('d', d3.area().x((r) => x(r.year)).y0((r) => y(r.pi95_low_2011_2019)).y1((r) => y(r.pi95_high_2011_2019)));
    const tl = d3.line().x((r) => x(r.year)).y((r) => y(r.trend_2011_2019));
    g.append('path').datum(fit).attr('d', tl).attr('fill', 'none').attr('stroke', C('--ctx-dark')).attr('stroke-width', 1.5);
    g.append('path').datum(proj).attr('d', tl).attr('fill', 'none').attr('stroke', C('--ctx-dark')).attr('stroke-width', 1.5).attr('stroke-dasharray', '4 3');
    g.append('path').datum(rows).attr('d', d3.line().x((r) => x(r.year)).y((r) => y(r.actual))).attr('fill', 'none').attr('stroke', C('--ink-2')).attr('stroke-width', 1.5);
    g.append('g').selectAll('circle').data(rows).join('circle').attr('cx', (r) => x(r.year)).attr('cy', (r) => y(r.actual))
      .attr('r', (r) => (r.year === 2020 ? 6 : 4)).attr('fill', (r) => (r.year === 2020 ? C('--hl') : C('--ink-2'))).attr('stroke', C('--bg')).attr('stroke-width', 1.5);
    // direct labels
    const r11 = rows[0];
    g.append('text').attr('x', x(2016)).attr('y', y(rows[5].pi95_low_2011_2019) + 16).style('fill', C('--ctx-dark')).text(nar ? 'Trend, 95% band' : '2011–19 trend and 95% band');
    g.append('text').attr('x', x(2011)).attr('y', y(r11.actual) + 20).style('fill', C('--ink-2')).style('font-weight', 600).text('Admitted');

    Viz.annotate(g, el, [{x: x(2020) - 7, y: y(r20.actual), tx: x(2020) - 14, ty: y(r20.actual) - 26, lx: x(2020) - 12, ly: y(r20.actual) - 22, anchor: 'end',
      text: `2020: ${Viz.fmtInt(r20.actual)} admitted, ${Math.round(r20.residual_vs_2011_2019)} above the trend’s ${Viz.fmtInt(Math.round(r20.trend_2011_2019))}`, width: Math.min(260, x(2020) - 30), bx: -14, by: -14}], nar);

    const cw = iw / 10;
    const hits = g.append('g').selectAll('rect').data(rows).join('rect').attr('x', (r) => x(r.year) - cw / 2).attr('width', cw).attr('y', 0).attr('height', ih).attr('fill', 'transparent');
    Viz.bindTip(hits, tipHtml);
    Viz.keyNav(svg, rows.length, (i) => Viz.tip.at(hits.nodes()[i], tipHtml(rows[i])), {start: 9});
    Viz.fillTable('#tbl-trend4', 'Cyclist hospital admissions and the 2011–2019 trend', ['Year', 'Admitted', 'Trend', '95% band low', '95% band high', 'Above or below trend'],
      rows.map((r) => [r.year, Viz.fmtInt(r.actual), Viz.fmtInt(Math.round(r.trend_2011_2019)), Viz.fmtInt(Math.round(r.pi95_low_2011_2019)), Viz.fmtInt(Math.round(r.pi95_high_2011_2019)), Viz.signed(Math.round(r.residual_vs_2011_2019))]));
  }

  function init(target, data) {
    el = target;
    rows = data.trend.map((r) => ({...r, in_fit_period: r.in_fit_period === true || r.in_fit_period === 'True'})).sort((a, b) => a.year - b.year);
    render();
  }
  return {init, render: () => el && render()};
})();
