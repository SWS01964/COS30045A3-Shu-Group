/* ch2.js: Chapter 2 figures (fig-2a heatmap + 2011-21 line, fig-2b three aligned panels).
   OWNED BY THE CHAPTER 2 AGENT. Interface: Charts['fig-x'] = { init(el, data), update(state) }.
   Also registers this chapter's data-fill keys (c2_*) on window.Facts at script load. */
(function () {
  'use strict';
  window.Charts = window.Charts || {};

  var MINUS = '−', EN = '–';

  /* ------------------------------------------------------------------ facts */
  var dp = Viz.fmt.dp;                                              /* true minus, thousands commas */
  function pctMag(n, d) { return Viz.fmt.pct(Math.abs(n), d); }
  var find = Viz.find;
  function c2(d, ru, age) { return find(d.ch2_age_roaduser, { road_user: ru, age_group: age }); }
  function sevAll(d, cat) { return find(d.severity, { view: 'age', road_user: 'All road users', category: cat }); }
  function popGrowth(r) { return (r.pop_2019_21 / r.pop_2011_13 - 1) * 100; }

  if (window.Facts && Facts.register) {
    var reg = Facts.register;
    reg('c2_cyc65_a0', function (d) { return dp(c2(d, 'Pedal cyclist', '65-74').avg_2011_13, 0); });   /* 281 */
    reg('c2_cyc65_a1', function (d) { return dp(c2(d, 'Pedal cyclist', '65-74').avg_2019_21, 0); });   /* 669 */
    reg('c2_cyc75_a0', function (d) { return dp(c2(d, 'Pedal cyclist', '75+').avg_2011_13, 0); });     /* 99 */
    reg('c2_cyc75_a1', function (d) { return dp(c2(d, 'Pedal cyclist', '75+').avg_2019_21, 0); });     /* 239 */
    reg('c2_cyc4064', function (d) { return pctMag(c2(d, 'Pedal cyclist', '40-64').pct_change_3yr); }); /* 45% */
    reg('c2_moto65', function (d) { return pctMag(c2(d, 'Motorcyclist', '65-74').pct_change_3yr); });   /* 119% */
    reg('c2_moto75', function (d) { return pctMag(c2(d, 'Motorcyclist', '75+').pct_change_3yr); });     /* 105% */
    reg('c2_cd65', function (d) { return pctMag(c2(d, 'Car driver', '65-74').pct_change_3yr); });         /* 31% */
    reg('c2_cd75', function (d) { return pctMag(c2(d, 'Car driver', '75+').pct_change_3yr); });           /* 35% */
    reg('c2_pop65', function (d) { return pctMag(popGrowth(c2(d, 'Pedal cyclist', '65-74'))); });       /* 33% */
    reg('c2_pop75', function (d) { return pctMag(popGrowth(c2(d, 'Pedal cyclist', '75+'))); });         /* 26% */
    reg('c2_75_stay', function (d) { return dp(sevAll(d, '75+').avg_stay, 1); });                      /* 11.1 */
    reg('c2_75_died', function (d) { return dp(sevAll(d, '75+').died_per_1000, 1); });                 /* 28.1 */
    reg('c2_all_stay', function (d) { return dp(sevAll(d, 'All ages').avg_stay, 1); });                /* 5.2 */
    reg('c2_all_died', function (d) { return dp(sevAll(d, 'All ages').died_per_1000, 1); });           /* 6.1 */
  }

  /* ---------------------------------------------------------------- helpers */
  var fmt = Viz.fmt;
  var AGES = Viz.AGE_BANDS;
  var ROWS = ['Pedestrian', 'Pedal cyclist', 'Motorcyclist', 'Car driver', 'Car passenger'];
  var PLURAL = { 'Pedestrian': 'Pedestrians', 'Pedal cyclist': 'Cyclists', 'Motorcyclist': 'Motorcyclists',
    'Car driver': 'Car drivers', 'Car passenger': 'Car passengers' };
  var SHORT = { 'Pedestrian': 'Pedestrian', 'Pedal cyclist': 'Cyclist', 'Motorcyclist': 'Motorcyclist',
    'Car driver': 'Driver', 'Car passenger': 'Passenger' };
  var CAP_LO = -50, CAP_HI = 100; /* colour stops here; bigger changes are printed, not darker */

  function sp(v) { return fmt.minus(fmt.signedPct(v, 0)); }       /* "+138%" / "−28%" */
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function lum(c) {
    var k = d3.rgb(c), f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(k.r) + 0.7152 * f(k.g) + 0.0722 * f(k.b);
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function ageLabel(a) { return a === '75+' ? '75+' : fmt.age(a); }

  /* ------------------------------------------------------------------ fig-2a */
  window.Charts['fig-2a'] = {
    init: function (fig, data) {
      var host = fig.querySelector('.fig-chart');
      var lineWrap = fig.querySelector('.c2a-linewrap');
      var lineHost = fig.querySelector('.c2a-line');
      var lineTitle = fig.querySelector('.c2a-line-title');
      var sentenceEl = fig.querySelector('.c2-sentence');
      var selRU = fig.querySelector('#sel-roaduser');
      var selAge = fig.querySelector('#sel-age');
      var YEARS = d3.range(2011, 2022);

      /* ---- cell model ---- */
      var cells = {};
      data.ch2_age_roaduser.forEach(function (r) {
        var a0 = r.avg_2011_13, a1 = r.avg_2019_21;
        cells[r.road_user + '|' + r.age_group] = {
          ru: r.road_user, age: r.age_group, a0: a0, a1: a1,
          pct: r.pct_change_3yr,
          pp: ((a1 / r.pop_2019_21) / (a0 / r.pop_2011_13) - 1) * 100,
          low: r.low_count === true,
          y11: r[2011], y21: r[2021],
          series: YEARS.map(function (y) { return r[y]; })
        };
      });
      var cellList = Object.keys(cells).map(function (k) { return cells[k]; });
      function cellAt(ru, age) { return cells[ru + '|' + age]; }

      var ready = false; /* announce only user-driven changes, not the first paint */
      var state = { mode: 'counts', ru: 'Pedal cyclist', age: '65-74' };
      var C = {}, g = null, lastW = 0, geom = null, cellEls = [];

      function val(c) { return state.mode === 'counts' ? c.pct : c.pp; }
      function tval(v) { return Math.max(-1, Math.min(1, Math.log(Math.max(1 + v / 100, 1e-4)) / Math.LN2)); }
      function fillFor(v) {
        var t = tval(v);
        return d3.interpolateRgb(C.band, t >= 0 ? C.rise : C.fall)(Math.pow(Math.abs(t), 0.85));
      }
      /* ink or paper, whichever reads better; mid-tone cells (dark mode) fall back to pure black/white so text stays >= 4.5:1 */
      function inkFor(fill) {
        var best = contrast(fill, C.ink) >= contrast(fill, C.paper) ? C.ink : C.paper;
        if (contrast(fill, best) >= 4.5) return best;
        return contrast(fill, '#000000') >= contrast(fill, '#ffffff') ? '#000000' : '#ffffff';
      }

      /* ---- tooltip ---- */
      function tipHtml(c) {
        var h = '<strong>' + PLURAL[c.ru] + ' aged ' + ageLabel(c.age) + '</strong><br>' +
          '2011' + EN + '13 average: ' + fmt.dp1(c.a0) + ' a year<br>' +
          '2019' + EN + '21 average: ' + fmt.dp1(c.a1) + ' a year<br>' +
          'Change: ' + sp(c.pct) + ' &middot; per person ' + sp(c.pp) + '<br>' +
          '2011: ' + fmt.int(c.y11) + ' &middot; 2021: ' + fmt.int(c.y21);
        if (c.low) h += '<br><em>Few cases (under 30 a year): treat with care.</em>';
        return h;
      }
      function cellAria(c) {
        return PLURAL[c.ru] + ' aged ' + ageLabel(c.age) + ': ' + sp(val(c)) +
          (state.mode === 'counts' ? ' in admissions' : ' per person') + (c.low ? ', few cases' : '');
      }

      /* ---- heatmap ---- */
      function drawHeat(w) {
        C = Viz.colors();
        lastW = w;
        var narrow = w < 520;
        geom = { narrow: narrow, labelW: narrow ? 68 : 128, headH: narrow ? 24 : 30, cellH: narrow ? 40 : 46 };
        geom.cellW = (w - geom.labelW) / AGES.length;
        var H = geom.headH + ROWS.length * geom.cellH + 4;

        var svg = d3.select(host).selectAll('svg.c2-heat').data([0]).join('svg')
          .attr('class', 'c2-heat').attr('width', w).attr('height', H).attr('viewBox', '0 0 ' + w + ' ' + H);
        svg.selectAll('*').remove();

        var defs = svg.append('defs');
        var pat = defs.append('pattern').attr('id', 'c2-hatch').attr('width', 6).attr('height', 6)
          .attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
        pat.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6)
          .style('stroke', 'var(--ink)').style('stroke-width', 1.4).style('opacity', 0.5);

        /* column + row labels */
        svg.append('g').attr('class', 'axis c2-cols').selectAll('text').data(AGES).join('text')
          .attr('x', function (a, i) { return geom.labelW + (i + 0.5) * geom.cellW; })
          .attr('y', geom.headH - 8).attr('text-anchor', 'middle')
          .style('font-weight', narrow ? 500 : 600).text(ageLabel);
        svg.append('g').attr('class', 'axis c2-rows').selectAll('text').data(ROWS).join('text')
          .attr('x', geom.labelW - 8).attr('y', function (r, i) { return geom.headH + (i + 0.5) * geom.cellH; })
          .attr('text-anchor', 'end').attr('dominant-baseline', 'central')
          .style('font-size', '12px')
          .text(function (r) { return narrow ? SHORT[r] : r; });

        /* cells */
        var layer = svg.append('g').attr('class', 'c2-cells');
        cellEls = ROWS.map(function () { return []; });
        var items = [];
        ROWS.forEach(function (ru, ri) {
          AGES.forEach(function (age, ai) { var c = cellAt(ru, age); c.ri = ri; c.ai = ai; items.push(c); });
        });
        var gs = layer.selectAll('g.c2-cell').data(items).join('g').attr('class', 'c2-cell')
          .attr('transform', function (c) { return 'translate(' + (geom.labelW + c.ai * geom.cellW) + ',' + (geom.headH + c.ri * geom.cellH) + ')'; })
          .attr('role', 'button').attr('tabindex', -1);
        gs.append('rect').attr('class', 'c2-fill').attr('x', 1).attr('y', 1)
          .attr('width', Math.max(1, geom.cellW - 2)).attr('height', geom.cellH - 2).attr('rx', 2);
        gs.filter(function (c) { return c.low; }).append('rect').attr('class', 'c2-hatch').attr('x', 1).attr('y', 1)
          .attr('width', Math.max(1, geom.cellW - 2)).attr('height', geom.cellH - 2).attr('rx', 2)
          .attr('fill', 'url(#c2-hatch)').style('pointer-events', 'none');
        gs.append('text').attr('class', 'c2-val').attr('x', geom.cellW / 2).attr('y', geom.cellH / 2)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central');
        gs.each(function (c) { cellEls[c.ri][c.ai] = this; });

        /* selection + focus markers, drawn above all cells */
        var top = svg.append('g').attr('class', 'c2-top').style('pointer-events', 'none');
        top.append('rect').attr('class', 'c2-sel-halo').attr('fill', 'none').style('stroke', 'var(--paper)').style('stroke-width', 6);
        top.append('rect').attr('class', 'c2-sel').attr('fill', 'none').style('stroke', 'var(--ink)').style('stroke-width', 3);
        top.append('rect').attr('class', 'c2-focus').attr('fill', 'none').style('stroke', 'var(--focus)')
          .style('stroke-width', 3).style('stroke-dasharray', '5 3').style('display', 'none');
        g = { svg: svg, gs: gs, top: top };

        Viz.tooltip.bind(gs, function (c) { return tipHtml(c); }, { roving: false }); /* the heatmap has its own 2-D roving */
        gs.attr('tabindex', -1);
        gs.on('click.sel', function (ev, c) { choose(c.ru, c.age); });
        gs.on('keydown.nav', function (ev, c) { onKey(ev, c); });
        gs.on('focus.mark', function (ev, c) {
          gs.attr('tabindex', -1); d3.select(this).attr('tabindex', 0);
          placeRect(top.select('.c2-focus'), c, 3).style('display', null);
        });
        gs.on('blur.mark', function () { top.select('.c2-focus').style('display', 'none'); });

        paintCells(false);
        paintSelection();
        drawLegend(w);
        updateAria();
      }

      function placeRect(rect, c, inset) {
        var x = geom.labelW + c.ai * geom.cellW, y = geom.headH + c.ri * geom.cellH;
        return rect.attr('x', x + inset - 1).attr('y', y + inset - 1)
          .attr('width', geom.cellW - 2 * inset + 2).attr('height', geom.cellH - 2 * inset + 2).attr('rx', 3);
      }

      function paintCells(animate) {
        if (!g) return;
        var dur = animate ? Viz.dur(400) : 0;
        g.gs.each(function (c) {
          var f = fillFor(val(c)), node = d3.select(this);
          var r = node.select('rect.c2-fill');
          (dur ? r.transition().duration(dur) : r).style('fill', f);
          node.select('text.c2-val').text(geom.narrow ? sp(val(c)).replace('%', '') : sp(val(c)))
            .style('fill', inkFor(f)).style('font-weight', 600).style('font-size', '12px')
            .style('paint-order', c.low ? 'stroke' : null)
            .style('stroke', c.low ? f : null).style('stroke-width', c.low ? 3 : null)
            .style('stroke-linejoin', 'round');
          node.attr('aria-label', cellAria(c));
        });
      }

      function paintSelection() {
        if (!g) return;
        var c = cellAt(state.ru, state.age);
        placeRect(g.top.select('.c2-sel-halo'), c, 2);
        placeRect(g.top.select('.c2-sel'), c, 2);
        g.gs.attr('aria-pressed', function (d) { return d === c ? 'true' : 'false'; });
        /* roving tabindex rests on the selected cell unless focus is inside the grid */
        if (!g.svg.node().contains(document.activeElement)) {
          g.gs.attr('tabindex', -1);
          d3.select(cellEls[c.ri][c.ai]).attr('tabindex', 0);
        }
      }

      function onKey(ev, c) {
        var ri = c.ri, ai = c.ai, k = ev.key;
        if (k === 'Enter' || k === ' ' || k === 'Spacebar') { ev.preventDefault(); choose(c.ru, c.age); return; }
        if (k === 'ArrowRight') ai = Math.min(AGES.length - 1, ai + 1);
        else if (k === 'ArrowLeft') ai = Math.max(0, ai - 1);
        else if (k === 'ArrowDown') ri = Math.min(ROWS.length - 1, ri + 1);
        else if (k === 'ArrowUp') ri = Math.max(0, ri - 1);
        else if (k === 'Home') ai = 0;
        else if (k === 'End') ai = AGES.length - 1;
        else return;
        ev.preventDefault();
        cellEls[ri][ai].focus();
      }

      /* ---- legend (HTML + one small svg) ---- */
      function drawLegend(w) {
        var lg = host.querySelector('.c2a-legend');
        if (!lg) { lg = el('div', 'c2a-legend'); host.appendChild(lg); }
        lg.innerHTML = '';
        var title = el('p', 'c2a-legend-title');
        title.textContent = state.mode === 'counts'
          ? 'Colour and numbers = % change in admissions, 3\u2011year averages'
          : 'Colour and numbers = % change per person (admissions ÷ ABS population)';
        lg.appendChild(title);
        var barW = Math.min(260, w - 8), pos = function (pct) { return (tval(pct) + 1) / 2 * barW; };
        var svg = d3.select(lg).append('svg').attr('class', 'c2a-scale').attr('width', barW + 8).attr('height', 46)
          .attr('viewBox', '0 0 ' + (barW + 8) + ' 46');
        var grad = svg.append('defs').append('linearGradient').attr('id', 'c2-grad');
        d3.range(0, 1.001, 0.1).forEach(function (u) {
          grad.append('stop').attr('offset', u).attr('stop-color', fillFor((Math.pow(2, u * 2 - 1) - 1) * 100));
        });
        var s = svg.append('g').attr('transform', 'translate(4,2)');
        s.append('rect').attr('width', barW).attr('height', 12).attr('rx', 2).attr('fill', 'url(#c2-grad)')
          .style('stroke', 'var(--muted)').style('stroke-width', 1);
        [-50, -25, 0, 25, 100].forEach(function (p) {
          s.append('line').attr('x1', pos(p)).attr('x2', pos(p)).attr('y1', 12).attr('y2', 17).style('stroke', 'var(--muted)');
          s.append('text').attr('x', pos(p)).attr('y', 31).attr('text-anchor', p === -50 ? 'start' : p === 100 ? 'end' : 'middle')
            .style('font-size', '12px').style('fill', 'var(--muted)')
            .text(p === 0 ? '0%' : (p < 0 ? MINUS : '+') + Math.abs(p) + '%');
        });
        var note = el('p', 'c2a-legend-note');
        note.innerHTML = 'Colours stop at ' + MINUS + '50% and +100%: bigger changes are printed in the cell but not drawn darker. ' +
          '<span class="c2a-swatch" aria-hidden="true"></span> Hatched = few cases (average under 30 a year).';
        lg.appendChild(note);
      }

      /* ---- the 2011-21 line for the selected cell ---- */
      function drawLine(w) {
        var c = cellAt(state.ru, state.age);
        var narrow = w < 520;
        var m = { l: narrow ? 38 : 46, r: 12, t: 40, b: 26 };
        var h = narrow ? 200 : 230, iw = w - m.l - m.r, ih = h - m.t - m.b;
        var max = d3.max(c.series), yMax = Math.max(1, max) * 1.12;
        var x = d3.scaleLinear().domain([2011, 2021]).range([0, iw]);
        var y = d3.scaleLinear().domain([0, yMax]).nice(4).range([ih, 0]);
        var step = iw / 10;

        lineTitle.textContent = PLURAL[c.ru] + ' aged ' + ageLabel(c.age) + ': admissions a year, 2011\u2060' + EN + '\u20602021';

        var svg = d3.select(lineHost).selectAll('svg').data([0]).join('svg')
          .attr('width', w).attr('height', h).attr('viewBox', '0 0 ' + w + ' ' + h);
        svg.selectAll('*').remove();
        var gg = svg.append('g').attr('transform', 'translate(' + m.l + ',' + m.t + ')');

        /* gridlines + y axis */
        var ticks = y.ticks(4);
        gg.append('g').attr('class', 'axis').selectAll('g').data(ticks).join('g')
          .attr('transform', function (t) { return 'translate(0,' + y(t) + ')'; })
          .each(function (t) {
            var n = d3.select(this);
            n.append('line').attr('x2', iw).style('stroke', 'var(--rule)').style('stroke-width', t === 0 ? 1.5 : 1);
            n.append('text').attr('x', -8).attr('dy', '0.32em').attr('text-anchor', 'end').text(fmt.int(t));
          });
        /* x axis */
        gg.append('g').attr('class', 'axis').selectAll('text').data(YEARS.filter(function (yr) { return !narrow || yr % 2 === 1; }))
          .join('text').attr('x', x).attr('y', ih + 18).attr('text-anchor', 'middle').text(function (yr) { return yr; });

        /* the two 3-year windows, shaded, with their averages */
        [{ a: 2011, b: 2013, avg: c.a0 }, { a: 2019, b: 2021, avg: c.a1 }].forEach(function (b) {
          var x0 = x(b.a) - step / 2, x1 = x(b.b) + step / 2;
          x0 = Math.max(x0, -2); x1 = Math.min(x1, iw + 4);
          gg.append('rect').attr('x', x0).attr('y', -m.t + 6).attr('width', x1 - x0).attr('height', ih + m.t - 6)
            .style('fill', 'var(--band)').style('opacity', 0.75);
          gg.append('text').attr('x', (x0 + x1) / 2).attr('y', -m.t + 20).attr('text-anchor', 'middle')
            .style('font-size', '12px').style('font-weight', 700).text(b.a + EN + String(b.b).slice(2));
          gg.append('text').attr('x', (x0 + x1) / 2).attr('y', -m.t + 34).attr('text-anchor', 'middle')
            .style('font-size', '12px').text('avg ' + fmt.int(b.avg));
          gg.append('line').attr('x1', x0).attr('x2', x1).attr('y1', y(b.avg)).attr('y2', y(b.avg))
            .style('stroke', 'var(--ink)').style('stroke-width', 1.5).style('stroke-dasharray', '4 3');
        });

        /* the series */
        var pts = YEARS.map(function (yr, i) { return [x(yr), y(c.series[i])]; });
        gg.append('path').attr('d', d3.line()(pts)).attr('fill', 'none')
          .style('stroke', 'var(--ink)').style('stroke-width', 2.5).style('stroke-linejoin', 'round');
        gg.selectAll('circle').data(pts).join('circle').attr('cx', function (p) { return p[0]; }).attr('cy', function (p) { return p[1]; })
          .attr('r', 3.2).style('fill', 'var(--paper)').style('stroke', 'var(--ink)').style('stroke-width', 2);
        /* end labels: first, last */
        [[0, 'start'], [YEARS.length - 1, 'end']].forEach(function (e) {
          var i = e[0], p = pts[i];
          gg.append('text').attr('x', p[0]).attr('y', p[1] - 9).attr('text-anchor', e[1])
            .style('font-weight', 700).style('font-size', '12px').style('paint-order', 'stroke')
            .style('stroke', 'var(--paper)').style('stroke-width', 3).text(fmt.int(c.series[i]));
        });

        lineHost.setAttribute('aria-label',
          PLURAL[c.ru] + ' aged ' + ageLabel(c.age) + ': admissions a year ' +
          (c.series[10] > c.series[0] ? 'rose' : c.series[10] < c.series[0] ? 'fell' : 'were level') + ' from ' + fmt.int(c.series[0]) + ' in 2011 to ' +
          fmt.int(c.series[10]) + ' in 2021. The 2011' + EN + '13 average was ' + fmt.dp1(c.a0) + ' and the 2019' + EN + '21 average ' + fmt.dp1(c.a1) + '.');
      }

      /* ---- sentence, aria ---- */
      function paintSentence() {
        var c = cellAt(state.ru, state.age);
        var who = PLURAL[c.ru] + ' aged ' + ageLabel(c.age), NB = '\u2060';
        var s = state.mode === 'counts'
          ? who + ': ' + sp(c.pct) + ' since 2011' + NB + EN + NB + '13 (per person ' + sp(c.pp) + ')'
          : who + ': ' + sp(c.pp) + ' per person since 2011' + NB + EN + NB + '13 (admissions ' + sp(c.pct) + ')';
        if (c.low) s += '. Few cases: under 30 a year, so treat with care';
        sentenceEl.textContent = s + '.';
        if (ready) Viz.announce(sentenceEl.textContent);
      }
      function updateAria() {
        var ok = cellList.filter(function (c) { return !c.low; }).sort(function (a, b) { return val(b) - val(a); });
        var up = ok.slice(0, 3).map(function (c) { return PLURAL[c.ru] + ' ' + ageLabel(c.age) + ' (' + sp(val(c)) + ')'; });
        var dn = ok[ok.length - 1];
        host.setAttribute('aria-label',
          'Heatmap of the change in ' + (state.mode === 'counts' ? 'admissions' : 'admissions per person') +
          ' between 2011' + EN + '13 and 2019' + EN + '21 by road user and age band. Largest rises: ' + up.join(', ') +
          '. Largest fall: ' + PLURAL[dn.ru] + ' ' + ageLabel(dn.age) + ' (' + sp(val(dn)) + '). ' +
          sentenceEl.textContent + ' Use the pickers or the cells to choose another group.');
      }

      /* ---- state changes ---- */
      function choose(ru, age) {
        state.ru = ru; state.age = age;
        selRU.value = ru; selAge.value = age;
        paintSelection(); paintSentence(); drawLine(lastW); updateAria();
      }
      selRU.value = state.ru; selAge.value = state.age;
      selRU.addEventListener('change', function () { if (!selRU.value) { selRU.value = state.ru; return; } choose(selRU.value, state.age); });
      selAge.addEventListener('change', function () { if (!selAge.value) { selAge.value = state.age; return; } choose(state.ru, selAge.value); });

      var seg = fig.querySelector('.fig-controls .seg');
      Viz.segmented(seg, { announce: false, onChange: function (v) { Charts['fig-2a'].update({ mode: v }); } });

      this._set = function (st) {
        if (st.mode && st.mode !== state.mode) {
          state.mode = st.mode;
          paintCells(true); drawLegend(lastW); paintSentence(); updateAria();
        }
      };

      paintSentence();
      var resp = Viz.responsive(host, function (w) { drawHeat(w); drawLine(w); });
      ready = true;
      Viz.onThemeChange(function () { resp.redraw(); });

      /* ---- "Show the numbers" ---- */
      var order = [];
      ROWS.slice().sort(function (a, b) { return Viz.MAIN_ROAD_USERS.indexOf(a) - Viz.MAIN_ROAD_USERS.indexOf(b); })
        .forEach(function (ru) { AGES.forEach(function (a) { order.push(cellAt(ru, a)); }); });
      Viz.fillTable(fig.querySelector('.fig-data'), order, [
        { key: 'ru', label: 'Road user', text: true },
        { key: 'age', label: 'Age', text: true, format: ageLabel },
        { key: 'a0', label: 'Avg 2011' + EN + '13', format: fmt.dp1 },
        { key: 'a1', label: 'Avg 2019' + EN + '21', format: fmt.dp1 },
        { key: 'pct', label: 'Change', format: function (v) { return fmt.minus(fmt.signedPct(v, 1)); } },
        { key: 'pp', label: 'Per-person change', format: function (v) { return fmt.minus(fmt.signedPct(v, 1)); } },
        { key: 'y11', label: '2011', format: fmt.int },
        { key: 'y21', label: '2021', format: fmt.int },
        { key: 'low', label: 'Few cases', format: function (v) { return v ? 'yes' : 'no'; } }
      ], { caption: 'Admissions by road user and age band (change = 2019' + EN + '21 average against 2011' + EN + '13 average).' });
    },
    update: function (st) { if (this._set) this._set(st || {}); }
  };

  /* ------------------------------------------------------------------ fig-2b */
  window.Charts['fig-2b'] = {
    init: function (fig, data) {
      var host = fig.querySelector('.fig-chart');
      var rows = Viz.where(data.severity, { view: 'age', road_user: 'All road users' })
        .filter(function (r) { return AGES.indexOf(r.category) >= 0; })
        .sort(function (a, b) { return AGES.indexOf(a.category) - AGES.indexOf(b.category); });
      /* pub = the publish flag that must be TRUE before a value is drawn or used for an axis maximum */
      var PANELS = [
        { key: 'hosp_1621', title: 'Admissions', narrowTitle: 'Admissions', sub: '2016' + EN + '21', f: fmt.int,
          fn: function (v) { return v >= 10000 ? Math.round(v / 1000) + 'k' : (v / 1000).toFixed(1) + 'k'; } },
        { key: 'avg_stay', pub: 'publish_stay', title: 'Average stay (days)', narrowTitle: 'Stay (days)', sub: '2016' + EN + '21', f: fmt.dp1, fn: fmt.dp1 },
        { key: 'died_per_1000', pub: 'publish_rate', title: 'Died per 1,000', narrowTitle: 'Died per 1,000', sub: '2011' + EN + '19', f: fmt.dp1, fn: fmt.dp1 }
      ];
      var NP = 'not published';
      /* the value to draw, or null when the row's publish flag is not TRUE */
      function pv(r, p) { return (p.pub && !r[p.pub]) || r[p.key] == null ? null : r[p.key]; }
      function stay(r) { return r.publish_stay ? fmt.dp1(r.avg_stay) : NP; }
      function rate(r) { return r.publish_rate ? fmt.dp1(r.died_per_1000) : NP; }

      function tipHtml(r) {
        return '<strong>Age ' + ageLabel(r.category) + '</strong><br>' +
          'Admissions 2016' + EN + '21: ' + fmt.int(r.hosp_1621) + '<br>' +
          'Average stay: ' + (r.publish_stay ? fmt.dp1(r.avg_stay) + ' days' : NP) + '<br>' +
          'Died in hospital per 1,000 admitted (2011' + EN + '19): ' + rate(r) +
          (r.publish_rate ? ' (95% interval ' + fmt.dp1(r.ci_low) + EN + fmt.dp1(r.ci_high) + ')' : '');
      }

      function draw(w) {
        var narrow = w < 520;
        var labelW = narrow ? 42 : 60, gap = narrow ? 10 : 28, headH = narrow ? 40 : 42, rowH = narrow ? 32 : 36;
        var barH = narrow ? 18 : 20;
        var panelW = (w - labelW - 2 * gap) / 3;
        var H = headH + rows.length * rowH + 4;

        var svg = d3.select(host).selectAll('svg').data([0]).join('svg')
          .attr('width', w).attr('height', H).attr('viewBox', '0 0 ' + w + ' ' + H);
        svg.selectAll('*').remove();

        /* 75+ highlight band behind all panels (plus bold label: not colour alone) */
        rows.forEach(function (r, i) {
          if (r.category !== '75+') return;
          svg.append('rect').attr('x', 0).attr('y', headH + i * rowH).attr('width', w).attr('height', rowH)
            .attr('rx', 4).style('fill', 'var(--band)');
        });

        /* age labels */
        svg.append('g').selectAll('text').data(rows).join('text')
          .attr('x', labelW - 8).attr('y', function (r, i) { return headH + (i + 0.5) * rowH; })
          .attr('text-anchor', 'end').attr('dominant-baseline', 'central')
          .style('font-size', '12px').style('font-weight', function (r) { return r.category === '75+' ? 800 : 500; })
          .text(function (r) { return ageLabel(r.category); });

        PANELS.forEach(function (p, pi) {
          var x0 = labelW + pi * (panelW + gap);
          var labels = rows.map(function (r) { var v = pv(r, p); return v == null ? 'n.p.' : (narrow ? p.fn(v) : p.f(v)); });
          var reserve = Math.max.apply(null, labels.map(function (s) { return s.length; })) * 7.4 + 8;
          var sc = d3.scaleLinear().domain([0, d3.max(rows, function (r) { var v = pv(r, p); return v == null ? 0 : v; }) || 1])
            .range([0, Math.max(10, panelW - reserve)]);

          svg.append('text').attr('x', x0).attr('y', 14).style('font-size', '12px').style('font-weight', 700)
            .text(narrow ? p.narrowTitle : p.title);
          svg.append('text').attr('x', x0).attr('y', 29).style('font-size', '12px').style('fill', 'var(--muted)').text(p.sub);

          rows.forEach(function (r, i) {
            var hi = r.category === '75+', y0 = headH + i * rowH + (rowH - barH) / 2, v = pv(r, p);
            if (v != null) {
              svg.append('rect').attr('x', x0).attr('y', y0).attr('height', barH)
                .attr('width', Math.max(1, sc(v))).attr('rx', 1)
                .style('fill', hi ? 'var(--rise)' : 'var(--context)');
            }
            svg.append('text').attr('x', x0 + (v == null ? 0 : sc(v)) + 5).attr('y', y0 + barH / 2).attr('dominant-baseline', 'central')
              .style('font-size', '12px').style('font-weight', hi ? 800 : 500).style('font-variant-numeric', 'tabular-nums')
              .text(labels[i]);
          });
          svg.append('line').attr('x1', x0 + 0.5).attr('x2', x0 + 0.5).attr('y1', headH).attr('y2', H - 4)
            .style('stroke', 'var(--ink)').style('stroke-width', 1);
        });

        /* one focusable hit row per age band carries the tooltip */
        var hits = svg.append('g').selectAll('rect').data(rows).join('rect')
          .attr('class', 'c2b-hit').attr('x', 0).attr('y', function (r, i) { return headH + i * rowH; })
          .attr('width', w).attr('height', rowH).style('fill', 'transparent')
          .attr('role', 'img').attr('aria-label', function (r) {
            return 'Age ' + ageLabel(r.category) + ': ' + fmt.int(r.hosp_1621) + ' admissions, average stay ' +
              (r.publish_stay ? fmt.dp1(r.avg_stay) + ' days' : NP) + ', ' + (r.publish_rate ? fmt.dp1(r.died_per_1000) + ' died per 1,000' : 'death rate ' + NP);
          });
        Viz.tooltip.bind(hits, tipHtml);
      }

      var lo = rows.filter(function (r) { return r.category === '8-16'; })[0], hi = rows.filter(function (r) { return r.category === '75+'; })[0];
      var peak = rows.slice().sort(function (a, b) { return b.hosp_1621 - a.hosp_1621; })[0];
      host.setAttribute('aria-label',
        'Three aligned panels by age band for all road users. Admissions peak at ages ' + ageLabel(peak.category) + ' (' + fmt.int(peak.hosp_1621) +
        '). Average stay rises from ' + stay(lo) + ' days at 8' + EN + '16 to ' + stay(hi) +
        ' days at 75 and over. Deaths in hospital per 1,000 admitted rise from ' + rate(lo) + ' to ' + rate(hi) + '.');

      var resp = Viz.responsive(host, draw);
      Viz.onThemeChange(function () { resp.redraw(); });

      Viz.fillTable(fig.querySelector('.fig-data'), rows, [
        { key: 'category', label: 'Age', text: true, format: ageLabel },
        { key: 'hosp_1621', label: 'Admissions 2016' + EN + '21', format: fmt.int },
        { key: 'avg_stay', label: 'Average stay (days)', format: function (v, r) { return stay(r); } },
        { key: 'died_per_1000', label: 'Died per 1,000 (2011' + EN + '19)', format: function (v, r) { return rate(r); } },
        { key: 'ci_low', label: '95% low', format: function (v, r) { return r.publish_rate ? fmt.dp1(v) : ''; } },
        { key: 'ci_high', label: '95% high', format: function (v, r) { return r.publish_rate ? fmt.dp1(v) : ''; } }
      ]);
    },
    update: function () {}
  };
})();
