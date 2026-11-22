/* Chart 2A: heatmap of change in hospitalisations, road user x age, with "find yourself" and trend line. */
window.Charts = window.Charts || {};
Charts.heatmap = (function () {
  const USERS = ['Car driver', 'Car passenger', 'Motorcyclist', 'Pedal cyclist', 'Pedestrian'];
  const USER_LABEL = {'Car driver': 'Car driver', 'Car passenger': 'Car passenger', 'Motorcyclist': 'Motorcyclist', 'Pedal cyclist': 'Pedal cyclist', 'Pedestrian': 'Pedestrian'};
  const USER_PLURAL = {'Car driver': 'car drivers', 'Car passenger': 'car passengers', 'Motorcyclist': 'motorcyclists', 'Pedal cyclist': 'pedal cyclists', 'Pedestrian': 'pedestrians'};
  const SELECT_LABEL = {'Car driver': 'Car driver', 'Car passenger': 'Car passenger', 'Motorcyclist': 'Motorcyclist', 'Pedal cyclist': 'Cyclist (pedal)', 'Pedestrian': 'Pedestrian'};
  const M = Viz.MINUS;
  // Colour is driven by the log ratio log2(1 + pct/100): halving (-50%) and doubling (+100%) are equal steps either side of 0.
  // Domain is symmetric: -60% (= halved to 0.4x) ... 0 ... +150% (= 2.5x).
  const LIM = Math.log2(2.5);
  const logr = (p) => Math.log2(1 + p / 100);
  let mode = 'count', sel = {user: 'Pedal cyclist', age: '65-74'}, cells = [], ages = [], popBy = {}, annual = null, hmEl, trEl;

  const perPerson = (c) => ((1 + c.pct_change_3yr / 100) / (1 + popBy[c.age_group] / 100) - 1) * 100;
  const val = (c) => (mode === 'count' ? c.pct_change_3yr : perPerson(c));
  const verb = (v) => (Math.abs(v) < 0.5 ? 'was unchanged' : v > 0 ? `rose ${Math.round(v)}%` : `fell ${Math.round(-v)}%`);
  const popVerb = (v) => (v >= 0 ? `grew ${Math.round(v)}%` : `shrank ${Math.round(-v)}%`);

  function scale() {
    return d3.scaleLinear().domain([-LIM, 0, LIM]).range([Viz.css('--fall'), Viz.css('--neutral'), Viz.css('--hl')]).interpolate(d3.interpolateLab).clamp(true);
  }

  function sentence() {
    const c = cells.find((d) => d.road_user === sel.user && d.age_group === sel.age);
    const age = Viz.ageLabel(sel.age), who = USER_PLURAL[sel.user];
    if (c.low_count) return `There are too few cases (${c.hosp_2011} in 2011, ${c.hosp_2021} in 2021) to report a reliable change for ${who} aged ${age}.`;
    const p = popBy[sel.age], pp = perPerson(c), cnt = c.pct_change_3yr;
    return `Hospitalisations of ${who} aged ${age} ${verb(cnt)} (2011–13 vs 2019–21). The population in this age group ${popVerb(p)}, so per person the ${pp >= 0 ? 'rise' : 'fall'} is ${Math.round(Math.abs(pp))}%.`.replace('so per person the rise is 0%', 'so per person the change is about zero');
  }

  function drawMap(data) {
    const C = (n) => Viz.css(n), col = scale(), fill = (p) => col(logr(p));
    const W = hmEl.clientWidth, narrow = Viz.narrow(W);
    const left = narrow ? 92 : 110, top = narrow ? 52 : 50, gap = 2;
    const cw = (W - left) / ages.length, ch = narrow ? 44 : 46;
    const H = top + USERS.length * ch + 2;
    d3.select(hmEl).selectAll('svg').remove();
    const svg = d3.select(hmEl).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H).attr('role', 'group')
      .attr('aria-label', `Heatmap of the change in hospitalisations between 2011–13 and 2019–21 for five road user types across seven age groups, shown as ${mode === 'count' ? 'change in number' : 'change per person'}. The largest rises are for pedal cyclists and motorcyclists aged 65 and over. Pedestrians mostly fell. Use the selectors above or the data table for exact values.`);
    const defs = svg.append('defs');
    const pat = defs.append('pattern').attr('id', 'hatch').attr('width', 6).attr('height', 6).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
    pat.append('rect').attr('width', 6).attr('height', 6).attr('fill', C('--hatch-bg'));
    pat.append('line').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 6).attr('stroke', C('--hatch-line')).attr('stroke-width', 2);

    svg.append('text').attr('x', left + (W - left) / 2).attr('y', 12).attr('text-anchor', 'middle').style('font-weight', 700).text('Age group');
    svg.append('g').selectAll('text').data(ages).join('text').attr('x', (a, i) => left + i * cw + cw / 2).attr('y', narrow ? top - 22 : top - 8).attr('text-anchor', 'middle')
      .style('font-weight', (a) => (a === sel.age ? 700 : 400)).style('fill', C('--ink'))
      .each(function (a) {
        const t = d3.select(this), x = t.attr('x'), parts = a.split('-');
        if (narrow && parts.length === 2) {
          t.append('tspan').attr('x', x).text(parts[0] + '\u2013'); t.append('tspan').attr('x', x).attr('dy', 14).text(parts[1]);
        } else t.text(Viz.ageLabel(a));
      });
    svg.append('g').selectAll('text').data(USERS).join('text').attr('x', left - 8).attr('y', (u, i) => top + i * ch + ch / 2 + 4).attr('text-anchor', 'end')
      .style('font-weight', (u) => (u === sel.user ? 700 : 400)).style('fill', C('--ink')).text((u) => USER_LABEL[u]);

    const showText = cw >= 62;
    const g = svg.append('g');
    const items = cells.map((c) => ({c, i: ages.indexOf(c.age_group), j: USERS.indexOf(c.road_user)}));
    const cell = g.selectAll('g.cell').data(items).join('g').attr('class', 'cell').style('cursor', 'pointer')
      .attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', (d) => d.c.road_user + ', age ' + Viz.ageLabel(d.c.age_group) + ': ' + (d.c.low_count ? 'too few cases' : Viz.signed(val(d.c)) + ' percent'))
      .attr('transform', (d) => `translate(${left + d.i * cw},${top + d.j * ch})`);
    cell.append('rect').attr('x', gap / 2).attr('y', gap / 2).attr('width', cw - gap).attr('height', ch - gap).attr('rx', 3)
      .attr('fill', (d) => (d.c.low_count ? 'url(#hatch)' : fill(val(d.c))));
    cell.append('text').attr('x', cw / 2).attr('y', ch / 2 + 4).attr('text-anchor', 'middle').style('font-weight', 600).style('pointer-events', 'none')
      .style('fill', (d) => (d.c.low_count ? C('--ink') : (d3.lab(fill(val(d.c))).l < 58 ? '#fff' : '#1c2230')))
      .text((d) => (d.c.low_count ? (cw >= 88 ? 'too few cases' : '–') : Viz.signed(val(d.c)) + (showText ? '%' : '')));
    // selection outline (drawn last)
    const s = items.find((d) => d.c.road_user === sel.user && d.c.age_group === sel.age);
    g.append('rect').attr('x', left + s.i * cw + 1.5).attr('y', top + s.j * ch + 1.5).attr('width', cw - 3).attr('height', ch - 3).attr('rx', 3)
      .attr('fill', 'none').attr('stroke', C('--ink')).attr('stroke-width', 3).style('pointer-events', 'none');

    const tipHtml = (c) => {
      const t = `<b>${USER_PLURAL[c.road_user][0].toUpperCase() + USER_PLURAL[c.road_user].slice(1)}, ${Viz.ageLabel(c.age_group)}</b><br>`;
      const single = `Single years: ${Viz.fmtInt(c.hosp_2011)} in 2011, ${Viz.fmtInt(c.hosp_2021)} in 2021`;
      if (c.low_count) return t + 'Too few cases for a reliable % change.<br>' + single;
      return t + `Change in number: <b>${Viz.signed(c.pct_change_3yr)}%</b> (3-yr avg ${c.avg_2011_2013.toFixed(0)} → ${c.avg_2019_2021.toFixed(0)})<br>` +
        `Population: ${Viz.signed(popBy[c.age_group])}%<br>Per person: <b>${Viz.signed(perPerson(c))}%</b><br>` + single;
    };
    Viz.bindTip(cell, (d) => tipHtml(d.c));
    cell.on('focus', (ev, d) => { const b = ev.currentTarget.getBoundingClientRect(); Viz.tip.show(tipHtml(d.c), b.left + b.width / 2, b.top); })
      .on('blur', () => Viz.tip.hide())
      .on('click', (ev, d) => { setSel(d.c.road_user, d.c.age_group, data, true); })
      .on('keydown', (ev, d) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setSel(d.c.road_user, d.c.age_group, data, true); } });
  }

  function legend() {
    const col = scale();
    const stops = d3.range(0, 1.01, 0.1).map((t) => col(-LIM + t * 2 * LIM)).join(',');
    const small = window.matchMedia('(max-width: 479px)').matches;
    // Tick positions are in log-ratio space, so they sit exactly on the bar's colour scale.
    // Halved/doubled go on a second row so their labels do not collide with the end labels.
    const ticks = [
      {v: -LIM, text: `${M}60% or more`, align: 'left', row: 0},
      {v: logr(-50), text: `${M}50% (halved)`, align: 'center', row: 1, minor: true},
      {v: 0, text: '0 (no change)', align: 'center', row: 0},
      {v: logr(100), text: '+100% (doubled)', align: 'center', row: 1, minor: true},
      {v: LIM, text: '+150% or more', align: 'right', row: 0}
    ].filter((t) => !(small && t.minor));
    const rows = Math.max(...ticks.map((t) => t.row)) + 1, rowEm = 1.4;
    const shift = {left: 'none', center: 'translateX(-50%)', right: 'translateX(-100%)'};
    const labels = ticks.map((t) => `<span style="position:absolute;top:${t.row * rowEm}em;left:${((t.v + LIM) / (2 * LIM)) * 100}%;transform:${shift[t.align]};white-space:nowrap">${t.text}</span>`).join('');
    d3.select('#hm-legend').html(`<div class="legend-bar" style="background:linear-gradient(90deg,${stops})" aria-hidden="true"></div>
      <div class="legend-ticks" style="display:block;position:relative;height:${rows * rowEm}em" aria-hidden="true">${labels}</div>
      <div class="legend-key"><span class="swatch-hatch" aria-hidden="true"></span><span>Hatched grey = too few cases to report a reliable change</span></div>`);
  }

  function drawTrend() {
    const C = (n) => Viz.css(n);
    const rows = annual.filter((d) => d.road_user === sel.user && d.age_group === sel.age).sort((a, b) => a.year - b.year);
    const c = cells.find((d) => d.road_user === sel.user && d.age_group === sel.age);
    d3.select('#trend-title').text(`${USER_LABEL[sel.user]}, age ${Viz.ageLabel(sel.age)}: hospitalisations each year`);
    const W = trEl.clientWidth, H = Viz.narrow(trEl.clientWidth) ? Math.max(210, Math.round(trEl.clientWidth * 0.6)) : 230, m = {t: 22, r: 22, b: 28, l: 42};
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = d3.scaleLinear([2011, 2021], [0, iw]);
    const ymax = Math.max(10, d3.max(rows, (d) => d.hospitalisations) * 1.2);
    const y = d3.scaleLinear([0, ymax], [ih, 0]).nice(4);
    d3.select(trEl).selectAll('svg').remove();
    const svg = d3.select(trEl).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H).attr('role', 'img')
      .attr('aria-label', `Line chart: ${USER_PLURAL[sel.user]} aged ${Viz.ageLabel(sel.age)} hospitalised each year, ${rows[0].hospitalisations} in 2011 and ${rows[rows.length - 1].hospitalisations} in 2021.`);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);
    const yt = y.ticks(4);
    g.selectAll('line.gl').data(yt).join('line').attr('class', 'gl').attr('x1', 0).attr('x2', iw).attr('y1', y).attr('y2', y).attr('stroke', C('--grid'));
    g.selectAll('text.yt').data(yt).join('text').attr('x', -6).attr('y', (d) => y(d) + 4).attr('text-anchor', 'end').text(Viz.fmtInt);
    const xt = Viz.narrow(W) ? [2011, 2016, 2021] : d3.range(2011, 2022, 2);
    g.selectAll('text.xt').data(xt).join('text').attr('x', x).attr('y', ih + 20).attr('text-anchor', 'middle').text((d) => d);
    // 3-yr average segments
    if (!c.low_count) {
      [[2011, 2013, c.avg_2011_2013], [2019, 2021, c.avg_2019_2021]].forEach(([a, b, v]) => {
        g.append('line').attr('x1', x(a)).attr('x2', x(b)).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', C('--ink')).attr('stroke-width', 2).attr('stroke-dasharray', '4 3');
      });
    }
    g.append('path').datum(rows).attr('fill', 'none').attr('stroke', C('--hl')).attr('stroke-width', 2.5).attr('stroke-linejoin', 'round')
      .attr('d', d3.line().x((d) => x(d.year)).y((d) => y(d.hospitalisations)));
    const pts = g.selectAll('circle').data(rows).join('circle').attr('cx', (d) => x(d.year)).attr('cy', (d) => y(d.hospitalisations)).attr('r', 4)
      .attr('fill', C('--hl')).attr('stroke', C('--bg')).attr('stroke-width', 1.5);
    [rows[0], rows[rows.length - 1]].forEach((d, k) => {
      g.append('text').attr('x', x(d.year) + (k ? 0 : 4)).attr('y', y(d.hospitalisations) - 10).attr('text-anchor', k ? 'end' : 'start')
        .style('font-weight', 700).style('fill', C('--ink')).text(Viz.fmtInt(d.hospitalisations));
    });
    pts.attr('r', 5);
    Viz.bindTip(pts, (d) => `<b>${d.year}</b>: ${Viz.fmtInt(d.hospitalisations)} hospitalisations`);
    d3.select('#trend-note').text(c.low_count ? 'Counts are small, so year-to-year changes are noisy.' : 'Dashed lines mark the 3-year averages (2011–13 and 2019–21) used for the colours above.');
    Viz.fillTable('#tbl-trend', `${USER_LABEL[sel.user]}, age ${Viz.ageLabel(sel.age)}: hospitalisations by year`, ['Year', 'Hospitalisations'], rows.map((d) => [d.year, Viz.fmtInt(d.hospitalisations)]));
  }

  function setSel(user, age, data, scroll) {
    sel = {user, age};
    document.getElementById('sel-user').value = user;
    document.getElementById('sel-age').value = age;
    render(data);
  }

  function render(data) {
    drawMap(data);
    drawTrend();
    document.getElementById('hm-sentence').textContent = sentence();
    document.getElementById('hm-note').textContent = mode === 'count'
      ? 'Showing: change in the number of hospitalisations, 2011–13 average to 2019–21 average.'
      : 'Showing: change per person, which adjusts the change in number for population growth in each age group.';
    Viz.fillTable('#tbl-heat', 'Change in hospitalisations, 2011–13 average vs 2019–21 average',
      ['Road user', 'Age', '2011', '2021', 'Avg 2011–13', 'Avg 2019–21', 'Change in number %', 'Population change %', 'Per person %'],
      cells.map((c) => [c.road_user, Viz.ageLabel(c.age_group), c.hosp_2011, c.hosp_2021, c.avg_2011_2013.toFixed(1), c.avg_2019_2021.toFixed(1),
        c.low_count ? 'too few cases' : c.pct_change_3yr.toFixed(1), popBy[c.age_group].toFixed(1), c.low_count ? 'too few cases' : perPerson(c).toFixed(1)]));
  }

  function init(el, tr, data) {
    hmEl = el; trEl = tr; annual = data.annual;
    cells = data.heat.map((d) => ({...d, low_count: d.low_count === true || d.low_count === 'True'}));
    ages = data.pop.map((d) => d.age_group);
    data.pop.forEach((d) => { popBy[d.age_group] = d.pct_change_3yr; });
    const su = d3.select('#sel-user'), sa = d3.select('#sel-age');
    su.selectAll('option').data(USERS).join('option').attr('value', (d) => d).text((d) => SELECT_LABEL[d]);
    sa.selectAll('option').data(ages).join('option').attr('value', (d) => d).text(Viz.ageLabel);
    su.property('value', sel.user); sa.property('value', sel.age);
    su.on('change', (ev) => setSel(ev.target.value, sel.age, data));
    sa.on('change', (ev) => setSel(sel.user, ev.target.value, data));
    document.querySelectorAll('[data-hm-mode]').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.hmMode;
      document.querySelectorAll('[data-hm-mode]').forEach((o) => o.setAttribute('aria-pressed', o === b));
      render(data);
    }));
    legend();
    render(data);
    Charts.heatmap._data = data;
  }
  return {init, redraw: () => Charts.heatmap._data && (legend(), render(Charts.heatmap._data))};
})();
