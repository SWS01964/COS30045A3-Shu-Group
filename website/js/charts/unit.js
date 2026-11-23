/* Chart 1B: unit chart, hospitalised people per road death, 2011 vs 2021. */
window.Charts = window.Charts || {};
Charts.unit = (function () {
  let drawn = false;
  function render(el, data) {
    const C = (n) => Viz.css(n);
    const rows = [2011, 2021].map((y) => {
      const r = data.rates.find((d) => d.year === y);
      return {year: y, n: Math.round(r.hosp_per_death), exact: r.hosp_per_death};
    });
    const w = el.clientWidth, cols = w < 600 ? 12 : 18;
    const d = Math.min(34, Math.floor(w / cols)), r = d * 0.36;
    const headH = 26, blockGap = 22;
    const blocks = rows.map((row) => ({...row, h: Math.ceil((row.n + 1) / cols) * d}));
    const legendH = w < 600 ? 52 : 30;
    const H = blocks.reduce((s, b) => s + headH + b.h + blockGap, 0) + legendH;
    d3.select(el).selectAll('svg').remove();
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${H}`).attr('width', w).attr('height', H)
      .attr('role', 'img')
      .attr('aria-label', `Unit chart. In 2011, for every person killed on Australian roads, ${rows[0].n} were hospitalised. In 2021 it was ${rows[1].n}. One solid dot is one death; outlined dots are people hospitalised.`);
    let y0 = 0, k = 0;
    blocks.forEach((b) => {
      svg.append('text').attr('x', 2).attr('y', y0 + 16).style('font-size', '14px').style('font-weight', 700).style('fill', C('--ink'))
        .text(`${b.year}: 1 death, ${b.n} people hospitalised`);
      const g = svg.append('g').attr('transform', `translate(0,${y0 + headH})`);
      const dots = d3.range(b.n + 1).map((i) => ({i, death: i === 0}));
      const sel = g.selectAll('circle').data(dots).join('circle')
        .attr('cx', (p) => (p.i % cols) * d + d / 2).attr('cy', (p) => Math.floor(p.i / cols) * d + d / 2)
        .attr('r', r).attr('fill', (p) => (p.death ? C('--ink') : C('--hl-soft')))
        .attr('stroke', (p) => (p.death ? C('--ink') : C('--hl'))).attr('stroke-width', 1.5);
      if (!drawn && !Viz.reduced()) {
        sel.attr('opacity', 0).transition().delay((p) => (k++ % 40) * 12 + (b.year === 2021 ? 300 : 0)).duration(200).attr('opacity', 1);
      }
      y0 += headH + b.h + blockGap;
    });
    drawn = true;
    const lg = svg.append('g').attr('transform', `translate(0,${y0 - 6})`);
    lg.append('circle').attr('cx', r + 2).attr('cy', 9).attr('r', r).attr('fill', C('--ink'));
    lg.append('text').attr('x', 2 * r + 10).attr('y', 14).text('= 1 person killed');
    const ly = w < 600 ? 30 : 9, lx = w < 600 ? 0 : 170;
    lg.append('circle').attr('cx', lx + r + 2).attr('cy', ly).attr('r', r).attr('fill', C('--hl-soft')).attr('stroke', C('--hl')).attr('stroke-width', 1.5);
    lg.append('text').attr('x', lx + 2 * r + 10).attr('y', ly + 5).text('= 1 person hospitalised');
    Viz.fillTable('#tbl-unit', 'Hospitalised people per road death', ['Year', 'Hospitalised', 'Road deaths', 'Hospitalised per death'],
      data.rates.map((d) => [d.year, Viz.fmtInt(d.hospitalisations), Viz.fmtInt(d.road_deaths), d.hosp_per_death.toFixed(1)]));
  }
  return {render};
})();
