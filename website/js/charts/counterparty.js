/* Beat 3.3: sorted dot list, died in hospital per 1,000 admitted by what the person collided with.
   Two panels only (All road users, Pedestrians). Uses died_per_1000_publish; blanks are listed, not plotted. */
window.Charts = window.Charts || {};
Charts.counterparty = (function () {
  const PANELS = [{u: 'All road users', name: 'All road users'}, {u: 'Pedestrian', name: 'Pedestrians'}];
  const SHORT = {'Heavy transport vehicle or bus': 'Truck or bus', 'Car, pick-up truck or van': 'Car, pick-up or van', 'Fixed or stationary object': 'Fixed object',
    'Non-collision transport accident': 'No collision', 'Other and unspecified transport accidents': 'Other or unspecified', '2- or 3- wheeled motor vehicle': 'Motorbike',
    'Pedestrian or animal': 'Pedestrian or animal', 'Train': 'Train', 'Pedal cycle': 'Bicycle', 'Other non-motor vehicle': 'Other non-motor vehicle'};
  let el = null, data = null;

  const tipHtml = (r, panel) => `<b>${panel}: hit by ${SHORT[r.counterparty].toLowerCase()}</b><br>` +
    `<b>${r.died_per_1000_publish.toFixed(1)}</b> died per 1,000 admitted<br>${Viz.fmtInt(r.died_2011_2019)} deaths of ${Viz.fmtInt(r.cases_2011_2019)} admissions, 2011–2019` +
    `<br><span class="muted">95% interval ${r.died_per_1000_ci95_low.toFixed(1)}–${r.died_per_1000_ci95_high.toFixed(1)}</span>`;

  function render() {
    const C = (n) => Viz.css(n);
    const W = el.clientWidth, nar = Viz.narrow(W);
    const cols = nar ? 1 : 2, gapX = 40;
    const pw = (W - gapX * (cols - 1)) / cols;
    const labelW = nar ? 128 : 150, rowH = 44, headH = 30;
    const sets = PANELS.map((p) => {
      const rows = data.filter((r) => r.road_user === p.u);
      return {p, shown: rows.filter((r) => r.died_per_1000_publish != null).sort((a, b) => b.died_per_1000_publish - a.died_per_1000_publish),
        hidden: rows.filter((r) => r.died_per_1000_publish == null)};
    });
    const panelH = sets.map((s) => headH + s.shown.length * rowH);
    const H = nar ? panelH.reduce((a, b) => a + b + 24, 0) : Math.max(...panelH) + 6;
    const vmax = d3.max(sets, (s) => d3.max(s.shown, (r) => r.died_per_1000_publish));
    const x = d3.scaleLinear([0, Math.ceil(vmax / 10) * 10], [0, pw - labelW - 118]);
    const svg = Viz.svg(el, W, H, 'Dot lists of deaths in hospital per 1,000 admitted, by what the person collided with. For all road users and for pedestrians, a truck or bus is the deadliest road vehicle to be hit by; rare train collisions rate higher still. Use the up and down arrow keys to read each row.');
    const flat = [];
    let yOff = 0;
    sets.forEach((s, k) => {
      const x0 = nar ? 0 : k * (pw + gapX), y0 = nar ? yOff : 0;
      const g = svg.append('g').attr('transform', `translate(${x0},${y0})`);
      g.append('text').attr('class', 'lbl-strong').attr('y', 16).style('font-size', '14px').text(s.p.name);
      g.append('line').attr('x1', 0).attr('x2', pw).attr('y1', headH - 6).attr('y2', headH - 6).attr('stroke', C('--rule'));
      const row = g.selectAll('g.r').data(s.shown).join('g').attr('class', 'r').attr('transform', (r, i) => `translate(0,${headH + i * rowH})`);
      row.append('rect').attr('width', pw).attr('height', rowH).attr('fill', 'transparent');
      const isHeavy = (r) => r.counterparty === 'Heavy transport vehicle or bus';
      const isTrain = (r) => r.counterparty === 'Train';
      row.append('text').attr('x', 0).attr('y', rowH / 2 + 4).style('fill', (r) => (isHeavy(r) ? C('--hl-ink') : C('--ink')))
        .style('font-weight', (r) => (isHeavy(r) ? 700 : 400)).text((r) => SHORT[r.counterparty]);
      row.append('line').attr('x1', labelW).attr('x2', labelW + x.range()[1]).attr('y1', rowH / 2).attr('y2', rowH / 2).attr('stroke', C('--grid'));
      row.append('line').attr('x1', labelW).attr('x2', (r) => labelW + x(r.died_per_1000_publish)).attr('y1', rowH / 2).attr('y2', rowH / 2)
        .attr('stroke', (r) => (isHeavy(r) ? C('--hl') : C('--ctx'))).attr('stroke-width', 2);
      row.append('circle').attr('cx', (r) => labelW + x(r.died_per_1000_publish)).attr('cy', rowH / 2).attr('r', 6)
        .attr('fill', (r) => (isTrain(r) ? C('--bg') : isHeavy(r) ? C('--hl') : C('--ctx-dark')))
        .attr('stroke', (r) => (isHeavy(r) ? C('--hl') : C('--ctx-dark'))).attr('stroke-width', 2);
      row.append('text').attr('x', (r) => labelW + x(r.died_per_1000_publish) + 10).attr('y', rowH / 2 + 4)
        .style('font-weight', (r) => (isHeavy(r) ? 700 : 400)).style('fill', (r) => (isHeavy(r) ? C('--hl-ink') : C('--ink-2')))
        .text((r) => r.died_per_1000_publish.toFixed(1) + (isTrain(r) ? ` (${r.died_2011_2019} deaths)` : ''));
      Viz.bindTip(row, (r) => tipHtml(r, s.p.name));
      row.each(function (r) { flat.push({node: this, html: tipHtml(r, s.p.name)}); });
      yOff += panelH[k] + 24;
    });
    Viz.keyNav(svg, flat.length, (i) => Viz.tip.at(flat[i].node, flat[i].html), {vertical: true});

    d3.select('#cp-hidden').text('Not shown, too few cases or deaths to publish a rate: ' +
      sets.map((s) => `${s.p.name.toLowerCase()} hit by ${s.hidden.map((r) => SHORT[r.counterparty].toLowerCase()).join(', ')}`).join('; ') + '.');
    const rowsT = [];
    sets.forEach((s) => [...s.shown, ...s.hidden].forEach((r) => rowsT.push([s.p.name, SHORT[r.counterparty], Viz.fmtInt(r.cases_2011_2019), Viz.fmtInt(r.died_2011_2019),
      r.died_per_1000_publish == null ? 'not published' : r.died_per_1000_publish.toFixed(1),
      r.died_per_1000_publish == null ? '' : `${r.died_per_1000_ci95_low.toFixed(1)}–${r.died_per_1000_ci95_high.toFixed(1)}`])));
    Viz.fillTable('#tbl-cp', 'Died in hospital per 1,000 admitted by counterparty, 2011–2019', ['Road user', 'Hit by', 'Admitted', 'Died', 'Per 1,000', '95% interval'], rowsT);
  }

  function init(target, d) { el = target; data = d.cp; render(); }
  return {init, render: () => el && render()};
})();
