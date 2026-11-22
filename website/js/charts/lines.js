/* Chart 1A: indexed line chart (2011 = 100), counts vs per person. */
window.Charts = window.Charts || {};
Charts.lines = (function () {
  let mode = 'counts', hoverYear = null, animate = true;
  const M = Viz.MINUS;

  function series(data) {
    const first = data.rates[0];
    const by = d3.group(data.index, (d) => d.series);
    const mk = (key) => by.get(key).map((d) => ({year: d.year, raw: d.value, idx: d.index_2011}));
    return {
      counts: [
        {key: 'hosp', name: 'Hospitalised', color: '--hl', dash: null, vals: mk('hospitalisations'), fmt: (v) => Viz.fmtInt(v) + ' people'},
        {key: 'pop', name: 'Population', color: '--ctx-dark', dash: '5 4', vals: mk('population'), fmt: (v) => (v / 1e6).toFixed(1) + ' million'},
        {key: 'deaths', name: 'Road deaths', color: '--fall', dash: null, vals: mk('road_deaths'), fmt: (v) => Viz.fmtInt(v) + ' deaths'}
      ],
      rate: [
        {key: 'hosp', name: 'Hospitalised per person', color: '--hl', dash: null,
          vals: data.rates.map((d) => ({year: d.year, raw: d.hosp_per_100k, idx: d.hosp_per_100k / first.hosp_per_100k * 100})), fmt: (v) => v.toFixed(1) + ' per 100,000'},
        {key: 'deaths', name: 'Road deaths per person', color: '--fall', dash: null,
          vals: data.rates.map((d) => ({year: d.year, raw: d.deaths_per_100k, idx: d.deaths_per_100k / first.deaths_per_100k * 100})), fmt: (v) => v.toFixed(2) + ' per 100,000'}
      ]
    };
  }

  function render(el, data) {
    const C = (n) => Viz.css(n);
    const narrow = Viz.narrow(el.clientWidth);
    const W = el.clientWidth, H = Math.max(260, Viz.aspectH(W, 440));
    const m = {t: 12, r: narrow ? 92 : 128, b: 34, l: 38};
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const S = series(data)[mode];
    const yDom = mode === 'counts' ? [80, 135] : [70, 130];
    const x = d3.scaleLinear([2011, 2021], [0, iw]);
    const y = d3.scaleLinear(yDom, [ih, 0]);
    const label = mode === 'counts' ? 'Counts' : 'Per person';
    const summary = mode === 'counts'
      ? 'Line chart indexed to 2011 = 100, counts. By 2021 hospitalisations are at 116, population at 115 and road deaths at 88.5.'
      : 'Line chart indexed to 2011 = 100, per person. By 2021 hospitalisations per 100,000 people are at 101 (flat) while road deaths per 100,000 are at 77.';

    d3.select(el).selectAll('svg').remove();
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)
      .attr('role', 'img').attr('aria-label', summary + ' Use left and right arrow keys to read each year.').attr('tabindex', 0);
    const g = svg.append('g').attr('transform', `translate(${m.l},${m.t})`);

    // band 2017-2021
    g.append('rect').attr('x', x(2017)).attr('y', 0).attr('width', iw - x(2017)).attr('height', ih).attr('fill', C('--band'));
    const bt = g.append('text').attr('x', x(2017) + 6).attr('y', 14).style('font-style', 'italic').style('fill', C('--ink'));
    Viz.wrap(bt, narrow ? 'NSW counting change' : 'NSW counting change: fewer cases recorded', iw - x(2017) - 10, 14);

    // grid + axes
    const yt = d3.range(yDom[0], yDom[1] + 1, 10);
    g.selectAll('.gl').data(yt).join('line').attr('x1', 0).attr('x2', iw).attr('y1', y).attr('y2', y)
      .attr('stroke', (d) => (d === 100 ? C('--ink-2') : C('--grid'))).attr('stroke-width', (d) => (d === 100 ? 1.2 : 1));
    g.selectAll('.yt').data(yt).join('text').attr('x', -6).attr('y', (d) => y(d) + 4).attr('text-anchor', 'end').text((d) => d);
    const xt = narrow ? [2011, 2016, 2021] : d3.range(2011, 2022, 2);
    g.selectAll('.xt').data(xt).join('text').attr('x', x).attr('y', ih + 20).attr('text-anchor', 'middle').text((d) => d);

    // Victoria marker at 2011
    g.append('line').attr('x1', x(2011)).attr('x2', x(2011)).attr('y1', 0).attr('y2', ih).attr('stroke', C('--ink-2')).attr('stroke-dasharray', '2 3');
    const vt = g.append('text').attr('x', x(2011) + 5).attr('y', 14).style('font-style', 'italic').style('fill', C('--ink'));
    Viz.wrap(vt, narrow ? 'Vic. counting change after 2011' : 'Victoria counting change after 2011', x(2017) - x(2011) - 14, 14);

    // COVID annotation
    g.append('line').attr('x1', x(2020)).attr('x2', x(2020)).attr('y1', y(mode === 'counts' ? 108 : 92)).attr('y2', y(mode === 'counts' ? 98 : 86))
      .attr('stroke', C('--ink-2'));
    const ct = g.append('text').attr('x', x(2020) - 6).attr('y', y(mode === 'counts' ? 103 : 89) - 2).attr('text-anchor', 'end').style('fill', C('--ink'));
    ct.append('tspan').attr('x', x(2020) - 6).text('COVID-19');
    ct.append('tspan').attr('x', x(2020) - 6).attr('dy', 14).text('lockdowns');

    // lines
    const line = d3.line().x((d) => x(d.year)).y((d) => y(d.idx));
    S.forEach((s) => {
      const p = g.append('path').attr('fill', 'none').attr('stroke', C(s.color)).attr('stroke-width', 2.5)
        .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('d', line(s.vals));
      if (s.dash) p.attr('stroke-dasharray', s.dash);
    });
    animate = false;

    // direct labels with simple collision relaxation
    const lab = S.map((s) => ({s, y: y(s.vals[s.vals.length - 1].idx)})).sort((a, b) => a.y - b.y);
    const minGap = 34;
    for (let k = 0; k < 20; k++) for (let i = 1; i < lab.length; i++) {
      const dd = lab[i].y - lab[i - 1].y;
      if (dd < minGap) { const s = (minGap - dd) / 2; lab[i - 1].y -= s; lab[i].y += s; }
    }
    lab.forEach((l) => {
      const last_ = l.s.vals[l.s.vals.length - 1];
      const t = g.append('text').attr('x', iw + 8).attr('y', l.y - 2).style('fill', C(l.s.color)).style('font-weight', 700);
      Viz.wrap(t, l.s.name, m.r - 12, 14);
      // value line, in ink for contrast
      const n = t.selectAll('tspan').size();
      t.append('tspan').attr('x', iw + 8).attr('dy', 14).style('font-weight', 400).style('fill', C('--ink')).text(last_.idx.toFixed(1));
    });

    // hover layer
    const hov = g.append('g').style('display', 'none');
    hov.append('line').attr('y1', 0).attr('y2', ih).attr('stroke', C('--ink')).attr('stroke-width', 1);
    const dots = hov.selectAll('circle').data(S).join('circle').attr('r', 5).attr('fill', (s) => C(s.color)).attr('stroke', C('--bg')).attr('stroke-width', 2);
    const overlay = g.append('rect').attr('width', iw).attr('height', ih).attr('fill', 'transparent').style('touch-action', 'pan-y').style('cursor', 'crosshair');

    function showYear(yr, cx, cy) {
      hoverYear = yr;
      hov.style('display', null);
      hov.select('line').attr('x1', x(yr)).attr('x2', x(yr));
      dots.attr('cx', x(yr)).attr('cy', (s) => y(s.vals.find((v) => v.year === yr).idx));
      const rows = S.map((s) => {
        const v = s.vals.find((q) => q.year === yr);
        return `<div class="row"><span><span class="sw" style="background:${C(s.color)}"></span>${s.name}</span><span><b>${s.fmt(v.raw)}</b> (${v.idx.toFixed(1)})</span></div>`;
      }).join('');
      if (cx == null) { const b = svg.node().getBoundingClientRect(); cx = b.left + (m.l + x(yr)) * b.width / W; cy = b.top + 60; }
      Viz.tip.show(`<b>${yr}</b> <span style="opacity:.8">(index, 2011 = 100)</span>${rows}`, cx, cy);
    }
    function pick(ev) {
      const b = overlay.node().getBoundingClientRect();
      const px = (ev.clientX - b.left) * iw / b.width;
      showYear(Math.max(2011, Math.min(2021, Math.round(x.invert(px)))), ev.clientX, ev.clientY);
    }
    overlay.on('pointermove', pick).on('pointerdown', pick)
      .on('pointerleave', (ev) => { if (ev.pointerType !== 'touch') { hov.style('display', 'none'); Viz.tip.hide(); } });
    svg.on('keydown', (ev) => {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      showYear(Math.max(2011, Math.min(2021, (hoverYear || 2016) + (ev.key === 'ArrowRight' ? 1 : -1))));
    }).on('blur', () => { hov.style('display', 'none'); Viz.tip.hide(); });

    d3.select('#lines-mode-label').text(label);
    // table
    Viz.fillTable('#tbl-lines', 'Hospitalisations, population and road deaths by year',
      ['Year', 'Hospitalised', 'Per 100k', 'Index', 'Population', 'Index', 'Road deaths', 'Index', 'Deaths per 100k'],
      data.rates.map((d, i) => {
        const ix = (k) => data.index.find((q) => q.series === k && q.year === d.year).index_2011.toFixed(1);
        return [d.year, Viz.fmtInt(d.hospitalisations), d.hosp_per_100k.toFixed(1), ix('hospitalisations'), Viz.fmtInt(d.erp_total), ix('population'), Viz.fmtInt(d.road_deaths), ix('road_deaths'), d.deaths_per_100k.toFixed(2)];
      }));
  }

  function init(el, data) {
    document.querySelectorAll('[data-lines-mode]').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.linesMode;
      document.querySelectorAll('[data-lines-mode]').forEach((o) => o.setAttribute('aria-pressed', o === b));
      document.getElementById('lines-sub').textContent = mode === 'counts'
        ? 'Index, 2011 = 100. Number of people hospitalised, road deaths and population, 2011–2021'
        : 'Index, 2011 = 100. Hospitalisations and road deaths per 100,000 residents, 2011–2021';
      Viz.tip.hide(); animate = true; render(el, data);
    }));
    render(el, data);
  }
  return {init, render: (el, data) => render(el, data)};
})();
