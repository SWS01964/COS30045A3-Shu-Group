/* Chart 4B: diverging horizontal bars, % change April 2020 vs April 2019, by road user.
   Fall colour (blue) for decreases, rise colour (orange) for increases; value written at each bar. */
window.Charts = window.Charts || {};
Charts.diverging = (function () {
  const USERS = ['Pedestrian', 'Car passenger', 'Car driver', 'Motorcyclist', 'Pedal cyclist'];
  const NAME = {'Pedestrian': 'Pedestrians', 'Car passenger': 'Car passengers', 'Car driver': 'Car drivers', 'Motorcyclist': 'Motorcyclists', 'Pedal cyclist': 'Cyclists', 'All road users': 'All road users'};
  let el = null, rows = null;

  const tipHtml = (r) => `<b>${NAME[r.road_user]}</b><br>April 2019: ${Viz.fmtInt(r.base_value)}<br>April 2020: ${Viz.fmtInt(r.value_2020)}<br>` +
    `<b>${r.pct_change < 0 ? 'Down' : 'Up'} ${Math.abs(r.pct_change).toFixed(1)}%</b> (${Viz.signed(r.abs_change)} admissions)`;

  function render() {
    const C = (n) => Viz.css(n);
    const W = el.clientWidth, nar = Viz.narrow(W);
    const labelW = nar ? 108 : 140, rowH = 44, barH = 24, sepH = 14;
    const H = rows.length * rowH + sepH + 24;
    const plotW = W - labelW;
    const x = d3.scaleLinear([-65, nar ? 40 : 35], [0, plotW]);
    const x0 = x(0);
    const falls = rows.filter((r) => r.pct_change < 0).map((r) => `${NAME[r.road_user].toLowerCase()} ${Math.abs(r.pct_change).toFixed(1)}%`).join(', ');
    const rises = rows.filter((r) => r.pct_change >= 0).map((r) => `${NAME[r.road_user].toLowerCase()} rose ${r.pct_change.toFixed(1)}%`).join(', ');
    const svg = Viz.svg(el, W, H, `Diverging bar chart of the change in admissions from April 2019 to April 2020. Falls: ${falls}. Only ${rises}. Use the up and down arrow keys to read each bar.`);
    const g = svg.append('g').attr('transform', `translate(${labelW},0)`);
    const yOf = (i) => i * rowH + (i === rows.length - 1 ? sepH : 0);
    // axis ticks at top
    [-60, -40, -20, 0, 20].forEach((t) => {
      g.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', 18).attr('y2', H - 4).attr('stroke', t === 0 ? C('--ink') : C('--grid'))
        .attr('stroke-width', t === 0 ? 1.5 : 1).attr('shape-rendering', 'crispEdges');
      g.append('text').attr('x', x(t)).attr('y', 12).attr('text-anchor', 'middle').style('fill', C('--muted')).text(t === 0 ? '0' : Viz.signed(t) + '%');
    });
    const top = 24;
    const row = g.selectAll('g.r').data(rows).join('g').attr('class', 'r').attr('transform', (r, i) => `translate(0,${top + yOf(i)})`);
    row.append('rect').attr('x', -labelW).attr('width', W).attr('height', rowH).attr('fill', 'transparent');
    row.append('text').attr('x', -10).attr('y', rowH / 2 + 4).attr('text-anchor', 'end')
      .style('font-weight', (r) => (r.road_user === 'Pedal cyclist' || r.road_user === 'All road users' ? 700 : 400))
      .style('fill', (r) => (r.road_user === 'Pedal cyclist' ? C('--rise') : C('--ink'))).text((r) => NAME[r.road_user]);
    const isTot = (r) => r.road_user === 'All road users';
    const bar = row.append('rect').attr('y', (rowH - barH) / 2).attr('height', barH)
      .attr('fill', (r) => (isTot(r) ? C('--fall-soft') : r.pct_change < 0 ? C('--fall') : C('--rise')))
      .attr('stroke', (r) => (isTot(r) ? C('--fall') : 'none')).attr('stroke-width', 1.5)
      .attr('x', x0).attr('width', 0);
    const end = (r) => ({x: r.pct_change < 0 ? x(r.pct_change) : x0, w: Math.abs(x(r.pct_change) - x0)});
    if (Viz.dur()) bar.transition().duration(Viz.dur()).attr('x', (r) => end(r).x).attr('width', (r) => end(r).w);
    else bar.attr('x', (r) => end(r).x).attr('width', (r) => end(r).w);
    // values: inside negative bars (near the end), outside the positive bar
    row.append('text').attr('y', rowH / 2 + 4).style('font-weight', 700)
      .attr('x', (r) => (r.pct_change < 0 ? x(r.pct_change) + 6 : x(r.pct_change) + 6))
      .attr('text-anchor', 'start')
      .style('fill', (r) => (r.pct_change >= 0 ? C('--rise') : isTot(r) ? C('--ink') : C('--on-ink')))
      .text((r) => Viz.signed(r.pct_change, 1) + '%');
    // separator before the total
    g.append('line').attr('x1', -labelW).attr('x2', plotW).attr('y1', top + yOf(rows.length - 1) - sepH / 2 + 2).attr('y2', top + yOf(rows.length - 1) - sepH / 2 + 2)
      .attr('stroke', C('--rule'));

    const cyc = rows.find((r) => r.road_user === 'Pedal cyclist'), ci = rows.indexOf(cyc);
    const cx = x(cyc.pct_change) + 58, cy = top + yOf(ci) + rowH / 2;
    const narAnn = nar || plotW - x0 < 220;
    const ax = x0 + (x(cyc.pct_change) - x0) / 2, ay = cy - barH / 2;
    Viz.annotate(g, el, [{x: ax, y: ay, tx: x0 + 10, ty: cy - rowH / 2 - 4, lx: ax, ly: cy - rowH / 2 + 2, text: `The only one to rise: ${Viz.fmtInt(cyc.base_value)} to ${Viz.fmtInt(cyc.value_2020)}`, width: plotW - x0 - 14, bx: 0, by: -10}], narAnn);

    Viz.bindTip(row, tipHtml);
    Viz.keyNav(svg, rows.length, (i) => Viz.tip.at(row.nodes()[i], tipHtml(rows[i])), {vertical: true});
    Viz.fillTable('#tbl-div', 'Hospital admissions, April 2019 vs April 2020', ['Road user', 'April 2019', 'April 2020', 'Change', 'Change %'],
      rows.map((r) => [NAME[r.road_user], Viz.fmtInt(r.base_value), Viz.fmtInt(r.value_2020), Viz.signed(r.abs_change), Viz.signed(r.pct_change, 1)]));
  }

  function init(target, data) {
    el = target;
    const apr = data.change.filter((r) => r.comparison === 'april_vs_2019');
    rows = USERS.map((u) => apr.find((r) => r.road_user === u)).sort((a, b) => a.pct_change - b.pct_change);
    rows.push(apr.find((r) => r.road_user === 'All road users'));
    render();
  }
  return {init, render: () => el && render()};
})();
