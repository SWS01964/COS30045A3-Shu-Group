/* Chart 4A: monthly admissions, Jan-Dec. Grey band = 2015-19 range, thin line = 2015-19 average,
   2019 muted, 2020 accent. Two-view switch: All road users / Cyclists (y-axis rescales). */
window.Charts = window.Charts || {};
Charts.lockdown = (function () {
  const VIEWS = {
    all: {u: 'All road users', dom: [2200, 3800], step: 400,
      title: 'April 2020: a third fewer crash admissions', sub: 'Road-crash hospital admissions per month, all road users'},
    cyc: {u: 'Pedal cyclist', dom: [350, 900], step: 100,
      title: 'Cyclists: every month from April above the previous five years', sub: 'Road-crash hospital admissions per month, pedal cyclists'}
  };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  let view = 'all', el = null, band = null;

  const rowsFor = (v) => band.filter((r) => r.road_user === VIEWS[v].u).sort((a, b) => a.month_num - b.month_num);

  const tipHtml = (r) => `<b>${LONG[r.month_num - 1]}</b>` +
    `<div class="row"><span>2020</span><b>${Viz.fmtInt(r.hosp_2020)}</b></div>` +
    `<div class="row"><span>2019</span><span>${Viz.fmtInt(r.hosp_2019)}</span></div>` +
    `<div class="row"><span>2015–19 average</span><span>${Viz.fmtInt(Math.round(r.baseline_mean_2015_2019))}</span></div>` +
    `<div class="row"><span>2015–19 range</span><span>${Viz.fmtInt(r.baseline_min_2015_2019)}–${Viz.fmtInt(r.baseline_max_2015_2019)}</span></div>` +
    `<span class="muted">2020 vs 2019: ${Viz.signed(r.pct_2020_vs_2019, 1)}%</span>`;

  function render() {
    const C = (n) => Viz.css(n), V = VIEWS[view], rows = rowsFor(view);
    const W = el.clientWidth, nar = Viz.narrow(W);
    const H = Math.max(260, Viz.aspectH(W, 420));
    const m = {t: 22, r: nar ? 62 : 104, b: 30, l: nar ? 40 : 46};
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = d3.scaleLinear([1, 12], [0, iw]);
    const y = d3.scaleLinear(V.dom, [ih, 0]);
    const apr = rows[3], jun = rows[5];
    const label = view === 'all'
      ? `Line chart of monthly road-crash admissions. In April 2020 admissions fell to ${Viz.fmtInt(apr.hosp_2020)}, far below the 2015 to 2019 range of ${Viz.fmtInt(apr.baseline_min_2015_2019)} to ${Viz.fmtInt(apr.baseline_max_2015_2019)}, then returned to the usual range by mid-year.`
      : `Line chart of monthly cyclist admissions. From April to December 2020 every month was above the 2015 to 2019 range; June 2020 had ${jun.hosp_2020} against ${jun.hosp_2019} in June 2019.`;
    const svg = Viz.svg(el, W, H, label + ' Use the left and right arrow keys to read each month.');
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
    Viz.gridY(g, y, y.ticks(5).filter((t) => t >= V.dom[0]), iw, Viz.fmtInt);
    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', ih).attr('y2', ih).attr('stroke', C('--ink-2'));
    const xt = nar ? [1, 4, 7, 10, 12] : d3.range(1, 13);
    g.append('g').selectAll('text').data(xt).join('text').attr('x', x).attr('y', ih + 20).attr('text-anchor', 'middle').text((d) => MON[d - 1]);

    // restrictions marker (late March 2020)
    const xr = x(3.75);
    g.append('line').attr('x1', xr).attr('x2', xr).attr('y1', 0).attr('y2', ih).attr('stroke', C('--ink-2')).attr('stroke-dasharray', '2 3');
    g.append('text').attr('x', xr + 5).attr('y', -8).style('fill', C('--ink')).style('font-style', 'italic').text(nar ? 'Restrictions' : 'National restrictions, late March');

    // band + lines
    const area = d3.area().x((r) => x(r.month_num)).y0((r) => y(r.baseline_min_2015_2019)).y1((r) => y(r.baseline_max_2015_2019)).curve(d3.curveMonotoneX);
    g.append('path').datum(rows).attr('d', area).attr('fill', C('--ctx')).attr('opacity', 0.28);
    const ln = (k) => d3.line().x((r) => x(r.month_num)).y((r) => y(r[k])).curve(d3.curveMonotoneX);
    g.append('path').datum(rows).attr('d', ln('baseline_mean_2015_2019')).attr('fill', 'none').attr('stroke', C('--ctx-dark')).attr('stroke-width', 1).attr('stroke-dasharray', '4 3');
    g.append('path').datum(rows).attr('d', ln('hosp_2019')).attr('fill', 'none').attr('stroke', C('--ctx-dark')).attr('stroke-width', 1.75);
    const p20 = g.append('path').datum(rows).attr('d', ln('hosp_2020')).attr('fill', 'none').attr('stroke', C('--hl')).attr('stroke-width', 3).attr('stroke-linejoin', 'round');
    if (Viz.dur()) {
      const L = p20.node().getTotalLength();
      p20.attr('stroke-dasharray', `${L} ${L}`).attr('stroke-dashoffset', L).transition().duration(900).attr('stroke-dashoffset', 0).on('end', () => p20.attr('stroke-dasharray', null));
    }
    g.append('g').selectAll('circle').data(rows).join('circle').attr('cx', (r) => x(r.month_num)).attr('cy', (r) => y(r.hosp_2020)).attr('r', 3.5)
      .attr('fill', C('--hl')).attr('stroke', C('--bg')).attr('stroke-width', 1.5);

    // direct labels at December
    const dec = rows[11];
    const labs = Viz.relax([
      {y: y(dec.hosp_2020), t: ['2020'], col: C('--hl-ink'), w: 700},
      {y: y(dec.hosp_2019), t: ['2019'], col: C('--ctx-dark'), w: 600},
      {y: y(dec.baseline_mean_2015_2019), t: nar ? ['2015–19', 'avg, range'] : ['2015–19 avg', '(range shaded)'], col: C('--ctx-dark'), w: 400}
    ], 30, 0, ih);
    labs.forEach((l) => {
      const t = g.append('text').attr('x', iw + 8).attr('y', l.y + 4).style('fill', l.col).style('font-weight', l.w);
      l.t.forEach((s, i) => t.append('tspan').attr('x', iw + 8).attr('dy', i ? 14 : 0).text(s));
    });

    // annotation
    const ann = view === 'all'
      ? {x: x(4) + 5, y: y(apr.hosp_2020) + 2, tx: x(4) + 14, ty: y(apr.hosp_2020) + 6, text: `${Viz.fmtInt(apr.hosp_2020)}: lowest month of 2011–2021`, width: 220, bx: 0, by: 16}
      : {x: x(6), y: y(jun.hosp_2020) - 6, tx: x(6) + 6, ty: y(860), lx: x(6), ly: y(860) + 4, text: `${jun.hosp_2020}, up from ${jun.hosp_2019} in June 2019`, width: 230, bx: 0, by: -18};
    Viz.annotate(g, el, [ann], nar);

    // hover / tap / keyboard
    const hov = g.append('line').attr('y1', 0).attr('y2', ih).attr('stroke', C('--ink')).style('display', 'none');
    const cw = iw / 11;
    const hits = g.append('g').selectAll('rect').data(rows).join('rect').attr('x', (r) => x(r.month_num) - cw / 2).attr('width', cw)
      .attr('y', 0).attr('height', ih).attr('fill', 'transparent');
    Viz.bindTip(hits, (r) => { hov.style('display', null).attr('x1', x(r.month_num)).attr('x2', x(r.month_num)); return tipHtml(r); });
    hits.on('pointerleave.hov', (ev) => { if (ev.pointerType === 'mouse') hov.style('display', 'none'); });
    Viz.keyNav(svg, 12, (i) => { hov.style('display', null).attr('x1', x(i + 1)).attr('x2', x(i + 1)); Viz.tip.at(hits.nodes()[i], tipHtml(rows[i])); },
      {start: 3, onBlur: () => hov.style('display', 'none')});

    document.getElementById('lockdown-title').textContent = V.title;
    document.getElementById('lockdown-sub-text').textContent = V.sub;
    Viz.fillTable('#tbl-lockdown', `${V.u}: monthly hospital admissions`, ['Month', '2015–19 low', '2015–19 average', '2015–19 high', '2019', '2020', '2021', '2020 vs 2019 %'],
      rows.map((r) => [MON[r.month_num - 1], Viz.fmtInt(r.baseline_min_2015_2019), Viz.fmtInt(Math.round(r.baseline_mean_2015_2019)), Viz.fmtInt(r.baseline_max_2015_2019),
        Viz.fmtInt(r.hosp_2019), Viz.fmtInt(r.hosp_2020), Viz.fmtInt(r.hosp_2021), r.pct_2020_vs_2019.toFixed(1)]));
  }

  function init(target, data) {
    el = target; band = data.band;
    Viz.segmented('#lockdown-view', (v) => {
      view = v; Viz.tip.hide(); render();
      const n = document.getElementById('lockdown-scale-note');
      if (n) n.textContent = 'The vertical scale changes between views: ' + (v === 'all' ? '2,200 to 3,800 a month.' : '350 to 900 a month.');
    });
    render();
  }
  return {init, render: () => el && render()};
})();
