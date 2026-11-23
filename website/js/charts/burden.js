/* Chart 3A: paired horizontal bars. Grey = share of admissions, accent = the harm measure.
   Three-way stepper: Admissions -> Bed days (default) -> Deaths in hospital. */
window.Charts = window.Charts || {};
Charts.burden = (function () {
  const USERS = ['Car driver', 'Car passenger', 'Motorcyclist', 'Pedal cyclist', 'Pedestrian'];
  const NAME = {'Car driver': 'Car drivers', 'Car passenger': 'Car passengers', 'Motorcyclist': 'Motorcyclists', 'Pedal cyclist': 'Cyclists', 'Pedestrian': 'Pedestrians'};
  const STEPS = {
    cases: {base: 'casesShare', harm: null, baseLbl: 'of admissions', title: 'Counted by admissions, pedestrians barely register', sub: 'Share of people admitted to hospital, five main road users, 2016–2021 (%)'},
    bed: {base: 'casesShare', harm: 'bedShare', baseLbl: 'of admissions', harmLbl: 'of bed days', title: 'Pedestrians take up twice their share of hospital beds', sub: 'Share of people admitted and share of days spent in hospital, 2016–2021 (%)'},
    deaths: {base: 'cases19Share', harm: 'diedShare', baseLbl: 'of admissions', harmLbl: 'of deaths in hospital', title: 'Pedestrians are 1 in 14 admissions, but 1 in 4 deaths in hospital', sub: 'Share of people admitted and share of those who died in hospital, 2011–2019 (%)'}
  };
  let step = 'bed', rows = null, el = null, prevW = {};

  function prep(data) {
    const tot = data.sevRU.find((r) => r.level === 'total');
    rows = USERS.map((u) => {
      const c = data.burden.find((b) => b.road_user === u && b.measure === 'cases');
      const b = data.burden.find((q) => q.road_user === u && q.measure === 'bed_days');
      const s = data.sevRU.find((r) => r.level === 'group' && r.road_user === u);
      return {u, cases: c.count, casesTot: c.total, casesShare: c.share_pct, bed: b.count, bedTot: b.total, bedShare: b.share_pct,
        cases19: s.cases_2011_2019, cases19Tot: tot.cases_2011_2019, cases19Share: +(s.cases_2011_2019 / tot.cases_2011_2019 * 100).toFixed(1),
        died: s.died_2011_2019, diedTot: tot.died_2011_2019, diedShare: +(s.died_2011_2019 / tot.died_2011_2019 * 100).toFixed(1)};
    }).sort((a, b) => b.casesShare - a.casesShare);
  }

  function tipHtml(r) {
    if (step === 'deaths') {
      return `<b>${NAME[r.u]}, 2011–2019</b><br>${Viz.fmtInt(r.cases19)} of ${Viz.fmtInt(r.cases19Tot)} admissions (${r.cases19Share.toFixed(1)}%)<br>` +
        `${Viz.fmtInt(r.died)} of ${Viz.fmtInt(r.diedTot)} deaths in hospital (<b>${r.diedShare.toFixed(1)}%</b>)`;
    }
    let h = `<b>${NAME[r.u]}, 2016–2021</b><br>${Viz.fmtInt(r.cases)} of ${Viz.fmtInt(r.casesTot)} admissions (${r.casesShare.toFixed(1)}%)`;
    if (step === 'bed') h += `<br>${Viz.fmtInt(r.bed)} of ${Viz.fmtInt(r.bedTot)} bed days (<b>${r.bedShare.toFixed(1)}%</b>)`;
    return h;
  }

  function render() {
    const C = (n) => Viz.css(n), S = STEPS[step];
    const W = el.clientWidth, nar = Viz.narrow(W);
    const labelW = nar ? 0 : 128, reserve = nar ? 128 : 160;
    const labH = nar ? 20 : 0, barH = nar ? 16 : 18, barGap = 4, pad = nar ? 16 : 18;
    const rowH = labH + barH * 2 + barGap + pad;
    const annH = 0;
    const H = rows.length * rowH + annH + 4;
    const plotW = W - labelW;
    const x = d3.scaleLinear([0, 36], [0, plotW - reserve]);
    const ped = rows.find((r) => r.u === 'Pedestrian');
    const label = step === 'cases'
      ? `Bar chart of each road user's share of hospital admissions, 2016 to 2021. Pedestrians are ${ped.casesShare}%, the smallest of the five.`
      : step === 'bed'
        ? `Paired bar chart. Pedestrians are ${ped.casesShare}% of admissions but ${ped.bedShare}% of bed days, 2016 to 2021; cyclists take a smaller share of bed days than of admissions.`
        : `Paired bar chart. Pedestrians are ${ped.cases19Share}% of admissions but ${ped.diedShare}% of deaths in hospital, 2011 to 2019.`;
    const svg = Viz.svg(el, W, H, label + ' Use the up and down arrow keys to read each road user.');
    const g = svg.append('g').attr('transform', `translate(${labelW},0)`);
    const d = Viz.dur();

    const rowG = g.selectAll('g.row').data(rows).join('g').attr('class', 'row').attr('transform', (r, i) => `translate(0,${i * rowH})`);
    rowG.append('rect').attr('x', -labelW).attr('width', W).attr('height', rowH).attr('fill', 'transparent');
    // road user label
    rowG.append('text').attr('class', 'lbl-strong').attr('x', nar ? 0 : -10).attr('y', nar ? 14 : barH + barGap / 2 + 4)
      .attr('text-anchor', nar ? 'start' : 'end').style('font-size', nar ? '13px' : '13px')
      .style('fill', (r) => (r.u === 'Pedestrian' ? C('--hl-ink') : C('--ink'))).text((r) => NAME[r.u]);

    const bars = [
      {key: S.base, lbl: S.baseLbl, y: labH, fill: C('--ctx'), kind: 'base'},
      {key: S.harm, lbl: nar && step === 'deaths' ? 'of deaths' : S.harmLbl, y: labH + barH + barGap, fill: C('--hl'), kind: 'harm'}
    ];
    bars.forEach((b, bi) => {
      const wOf = (r) => (b.key ? x(r[b.key]) : 0);
      const rect = rowG.append('rect').attr('x', 0).attr('y', b.y).attr('height', barH).attr('fill', b.fill)
        .attr('width', (r) => (prevW[r.u + bi] != null ? prevW[r.u + bi] : 0));
      if (d) rect.transition().duration(d).attr('width', wOf); else rect.attr('width', wOf);
      rows.forEach((r) => { prevW[r.u + bi] = wOf(r); });
      if (!b.key) return;
      const full = (r, i) => i === 0 || r.u === 'Pedestrian';
      rowG.append('text').attr('x', (r) => wOf(r) + 6).attr('y', b.y + barH / 2 + 4)
        .style('fill', b.kind === 'harm' ? C('--hl-ink') : C('--ink-2')).style('font-weight', b.kind === 'harm' ? 700 : 400)
        .text((r, i) => `${r[b.key].toFixed(1)}%${full(r, i) ? ' ' + b.lbl : ''}`);
    });
    // zero line
    g.append('line').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', rows.length * rowH - pad).attr('stroke', C('--ink-2'));

    // annotation next to pedestrians
    const pi = rows.indexOf(ped);
    const annText = step === 'cases' ? `About 1 admission in ${Math.round(100 / ped.casesShare)}`
      : step === 'bed' ? `${ped.casesShare}% of admissions, ${ped.bedShare}% of bed days: twice their share`
        : `${ped.cases19Share}% of admissions, ${ped.diedShare}% of deaths in hospital: ${Viz.fmtInt(ped.died)} of ${Viz.fmtInt(ped.diedTot)}`;
    const key = S.harm || S.base, by = pi * rowH + (S.harm ? labH + barH + barGap : labH) + barH / 2;
    const tmp = g.append('text').style('font-weight', 700).text(`${ped[key].toFixed(1)}% ${S.harm ? (nar && step === 'deaths' ? 'of deaths' : S.harmLbl) : S.baseLbl}`);
    const lblEnd = x(ped[key]) + 6 + tmp.node().getComputedTextLength();
    tmp.remove();
    Viz.annotate(g, el, [{x: lblEnd + 6, y: by - 4, tx: lblEnd + 22, ty: by, text: annText, width: Math.max(160, plotW - lblEnd - 30), bx: 14, by: -2}], nar || plotW - lblEnd < 220);

    Viz.bindTip(rowG, tipHtml);
    Viz.keyNav(svg, rows.length, (i) => Viz.tip.at(rowG.nodes()[i], tipHtml(rows[i])), {vertical: true});

    Viz.fillTable('#tbl-burden', 'Share of admissions, bed days and deaths in hospital by road user',
      ['Road user', 'Admissions 2016–21', '% of admissions', 'Bed days 2016–21', '% of bed days', 'Admissions 2011–19', '% of admissions', 'Died in hospital 2011–19', '% of deaths'],
      rows.map((r) => [NAME[r.u], Viz.fmtInt(r.cases), r.casesShare.toFixed(1), Viz.fmtInt(r.bed), r.bedShare.toFixed(1), Viz.fmtInt(r.cases19), r.cases19Share.toFixed(1), Viz.fmtInt(r.died), r.diedShare.toFixed(1)]));
    const sub = document.getElementById('burden-sub');
    if (sub) sub.textContent = S.sub;
    const ttl = document.getElementById('burden-title');
    if (ttl) ttl.textContent = S.title;
  }

  function init(target, data) {
    el = target;
    prep(data);
    Viz.segmented('#burden-step', (v) => { step = v; Viz.tip.hide(); render(); });
    render();
  }
  return {init, render: () => el && render(), rows: () => rows};
})();
