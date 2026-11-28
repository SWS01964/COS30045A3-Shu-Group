/* ch5.js: Chapter 5 figures (fig-5a trend lines, fig-5b paired road-user bars, fig-5c area share / average stay).
   OWNED BY THE CHAPTER 5 AGENT.
   Interface: window.Charts[id] = { init(el, data), update(state) }  (see ch1.js).
   Data: ch5_first_nations_trend (year, status, hosp, bed_days, population, hosp_per_100k; population and rate
         only for 2011, 2016, 2021) and ch5_first_nations_profile (view = road_user | remoteness).
   Indexes (2011 = 100), within-group shares and the First Nations share by area are computed here, for presentation.
   Colour: First Nations = --accent2, non-Indigenous = --context. Never the only cue: direct labels, solid vs
   dashed lines, filled vs open dots, bar order. */
(function () {
  'use strict';
  window.Charts = window.Charts || {};

  var FN = 'First Nations people', NI = 'Non-Indigenous';
  var MINUS = '−';
  var N = function (v) { return Viz.fmt.int(v); };
  var D1 = function (v) { return v == null ? '' : Viz.fmt.dp1(v); };
  var P1 = function (v) { return Viz.fmt.pct(v, 1); };

  /* ---------------------------------------------------------------- facts */
  /* Extra prose numbers for Chapter 5, registered before main.js runs fillProse. */
  (function registerFacts() {
    var F = window.Facts;
    if (!F || !F.register) return;
    function row(d, year, status) {
      var rows = d.ch5_first_nations_trend;
      for (var i = 0; i < rows.length; i++) if (rows[i].year === year && rows[i].status === status) return rows[i];
      throw new Error('no ch5_first_nations_trend row for ' + year + ' ' + status);
    }
    F.register('c5_fn_rate_2021_dp1', function (d) { return row(d, 2021, FN).hosp_per_100k.toFixed(1); });   /* 225.7 */
    F.register('c5_ni_rate_2021_dp1', function (d) { return row(d, 2021, NI).hosp_per_100k.toFixed(1); });   /* 148.8 */
    F.register('c5_ratio_2021', function (d) {                                                              /* 1.5 */
      return (row(d, 2021, FN).hosp_per_100k / row(d, 2021, NI).hosp_per_100k).toFixed(1);
    });
  })();

  /* --------------------------------------------------------------- helpers */
  function sel(el, q) { return el.querySelector(q); }
  /* Show only the [data-mode] children that match (titles, notes). */
  function showMode(el, mode) {
    Array.prototype.forEach.call(el.querySelectorAll('[data-mode]'), function (n) { n.hidden = n.getAttribute('data-mode') !== mode; });
  }
  function sgn(n) { return (n >= 0 ? '+' : MINUS) + Math.abs(Math.round(n)) + '%'; }
  /* Wrap an svg <text> into tspans no wider than maxW (measures in the DOM). ch3.js has a different wrap():
     it returns lines measured on a canvas, so the two are kept separate. */
  function wrap(text, str, x, maxW, lineH, maxLines) {
    text.text(null);
    var words = String(str).split(/\s+/), line = [], lines = 0;
    var tsp = text.append('tspan').attr('x', x).attr('dy', 0);
    words.forEach(function (w) {
      line.push(w);
      tsp.text(line.join(' '));
      if (tsp.node().getComputedTextLength() > maxW && line.length > 1 && (!maxLines || lines < maxLines - 1)) {
        line.pop(); tsp.text(line.join(' '));
        line = [w]; lines++;
        tsp = text.append('tspan').attr('x', x).attr('dy', lineH).text(w);
      }
    });
    return lines + 1;
  }
  function fade(selection, animate) {
    if (!animate || Viz.reducedMotion()) return;
    selection.style('opacity', 0).transition().duration(Viz.dur(350)).style('opacity', 1);
  }
  function svgFor(host, cls, w, h) { return Viz.svg(host, w, h, { cls: cls, reuse: true, hidden: true }); }

  /* =========================================================== fig-5a ===== */
  window.Charts['fig-5a'] = {
    init: function (el, data) {
      var host = sel(el, '.fig-chart');
      var all = data.ch5_first_nations_trend || [];
      function rowsOf(status) { return all.filter(function (r) { return r.status === status; }).sort(function (a, b) { return a.year - b.year; }); }
      var fnR = rowsOf(FN), niR = rowsOf(NI);
      if (!host || !fnR.length || !niR.length) return;
      var years = fnR.map(function (r) { return r.year; });
      var y0 = years[0], y1 = years[years.length - 1];
      var rateYears = fnR.filter(function (r) { return r.hosp_per_100k != null; }).map(function (r) { return r.year; });
      function at(rows, yr) { return rows.filter(function (r) { return r.year === yr; })[0]; }
      var fn0 = fnR[0], ni0 = niR[0], fnL = at(fnR, y1), niL = at(niR, y1);

      var state = { mode: 'index', year: null };
      var width = 0, svg, x, y, innerW, innerH, g = {}, wide = true;
      var m = { top: 38, right: 170, bottom: 32, left: 42 };

      function ptsIndex(rows, base) {
        return rows.map(function (r) { return { year: r.year, v: r.hosp / base.hosp * 100, row: r }; });
      }
      function ptsRate(rows) {
        return rows.filter(function (r) { return r.hosp_per_100k != null; }).map(function (r) { return { year: r.year, v: r.hosp_per_100k, row: r }; });
      }
      function pts(rows, base, mode) { return mode === 'index' ? ptsIndex(rows, base) : ptsRate(rows); }
      function stepYears() { return state.mode === 'index' ? years : rateYears; }

      /* ---------- summary, table, tooltip ---------- */
      function describe() {
        var fc = (fnL.hosp / fn0.hosp - 1) * 100, nc = (niL.hosp / ni0.hosp - 1) * 100;
        if (state.mode === 'index') {
          return 'Two lines indexed to 2011 = 100, 2011 to 2021. First Nations hospitalisations rose ' + Viz.fmt.dp(fc, 0) + '% from ' +
            N(fn0.hosp) + ' to ' + N(fnL.hosp) + '; non-Indigenous rose ' + Viz.fmt.dp(nc, 0) + '% from ' + N(ni0.hosp) + ' to ' + N(niL.hosp) + '.';
        }
        var f0 = fn0.hosp_per_100k, n0 = ni0.hosp_per_100k, f1 = fnL.hosp_per_100k, n1 = niL.hosp_per_100k;
        return 'Rates per 100,000 people for 2011, 2016 and 2021 only, the years with a First Nations population estimate. In 2011 the First Nations rate was ' +
          Viz.fmt.dp1(f0) + ' and the non-Indigenous rate ' + Viz.fmt.dp1(n0) + '. In 2021 they were ' + Viz.fmt.dp1(f1) + ' and ' + Viz.fmt.dp1(n1) +
          ', so the First Nations rate was about ' + Viz.fmt.dp(f1 / n1, 1) + ' times as high.';
      }
      function fillTable() {
        var t = el.querySelector('.fig-data');
        if (state.mode === 'index') {
          var rows = years.map(function (yr) {
            var a = at(fnR, yr), b = at(niR, yr);
            return { year: yr, fn: a.hosp, fi: a.hosp / fn0.hosp * 100, ni: b.hosp, ni_i: b.hosp / ni0.hosp * 100 };
          });
          Viz.fillTable(t, rows, [
            { key: 'year', label: 'Year' },
            { key: 'fn', label: 'First Nations hospitalisations', format: N },
            { key: 'fi', label: 'First Nations index (2011 = 100)', format: D1 },
            { key: 'ni', label: 'Non-Indigenous hospitalisations', format: N },
            { key: 'ni_i', label: 'Non-Indigenous index (2011 = 100)', format: D1 }
          ], { caption: 'Hospitalisations and index (2011 = 100), all years' });
        } else {
          var rr = rateYears.map(function (yr) {
            var a = at(fnR, yr), b = at(niR, yr);
            return { year: yr, fn: a.hosp, fp: a.population, fr: a.hosp_per_100k, ni: b.hosp, np: b.population, nr: b.hosp_per_100k };
          });
          Viz.fillTable(t, rr, [
            { key: 'year', label: 'Year' },
            { key: 'fn', label: 'First Nations hospitalisations', format: N },
            { key: 'fp', label: 'First Nations population (ABS)', format: N },
            { key: 'fr', label: 'First Nations per 100,000', format: D1 },
            { key: 'ni', label: 'Non-Indigenous hospitalisations', format: N },
            { key: 'np', label: 'Non-Indigenous population', format: N },
            { key: 'nr', label: 'Non-Indigenous per 100,000', format: D1 }
          ], { caption: 'Rates per 100,000 people: only the years with an ABS First Nations population estimate' });
        }
      }
      function tipHtml(yr) {
        var a = at(fnR, yr), b = at(niR, yr);
        if (!a || !b) return '';
        if (state.mode === 'index') {
          return '<strong>' + yr + '</strong><br>First Nations: ' + N(a.hosp) + ' (index ' + Viz.fmt.dp1(a.hosp / fn0.hosp * 100) + ')' +
            '<br>Non-Indigenous: ' + N(b.hosp) + ' (index ' + Viz.fmt.dp1(b.hosp / ni0.hosp * 100) + ')';
        }
        return '<strong>' + yr + '</strong><br>First Nations: ' + Viz.fmt.dp1(a.hosp_per_100k) + ' per 100,000<br><span style="opacity:.85">' + N(a.hosp) + ' hospitalisations, population ' + N(a.population) + '</span>' +
          '<br>Non-Indigenous: ' + Viz.fmt.dp1(b.hosp_per_100k) + ' per 100,000<br><span style="opacity:.85">' + N(b.hosp) + ' hospitalisations, population ' + N(b.population) + '</span>';
      }
      function refreshText() {
        host.setAttribute('aria-label', describe());
        showMode(el, state.mode);
        fillTable();
      }

      /* ---------- build (scales, frame) ---------- */
      function build() {
        wide = width >= 640;
        var h = Viz.height(width, { ratio: 0.6, min: wide ? 320 : 360, max: 460 });
        m.right = wide ? 176 : 106;
        m.left = wide ? 46 : 38;
        innerW = Math.max(120, width - m.left - m.right);
        innerH = h - m.top - m.bottom;
        x = d3.scaleLinear().domain([y0, y1]).range([0, innerW]);
        svg = svgFor(host, 'ch5-svg', width, h);
        var root = svg.selectAll('g.plot').data([0]).join('g').attr('class', 'plot').attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        g.dyn = root.selectAll('g.dyn').data([0]).join('g').attr('class', 'dyn');
        g.hov = root.selectAll('g.hov').data([0]).join('g').attr('class', 'hov');
        g.mark = root.selectAll('g.mark').data([0]).join('g').attr('class', 'mark');
      }

      /* ---------- render (per mode) ---------- */
      function render(animate) {
        if (!x) return;
        var mode = state.mode;
        var dom = mode === 'index' ? [80, 220] : [0, 250];   /* index axis leaves room above the 2020 peak (196) */
        y = d3.scaleLinear().domain(dom).range([innerH, 0]);
        var ticks = mode === 'index' ? d3.range(80, 221, 20) : d3.range(0, 251, 50);
        var dyn = g.dyn;
        dyn.selectAll('*').remove();
        dyn.style('opacity', 1);
        var fnP = pts(fnR, fn0, mode), niP = pts(niR, ni0, mode);

        /* grid + axes */
        dyn.selectAll('line.ch5-grid').data(ticks).join('line')
          .attr('class', function (d) { return 'ch5-grid' + (mode === 'index' && d === 100 ? ' is-base' : ''); })
          .attr('x1', 0).attr('x2', innerW).attr('y1', function (d) { return y(d); }).attr('y2', function (d) { return y(d); });
        dyn.selectAll('text.ch5-ytick').data(ticks).join('text').attr('class', 'ch5-tick ch5-ytick')
          .attr('x', -8).attr('y', function (d) { return y(d); }).attr('dy', '0.32em').attr('text-anchor', 'end').text(function (d) { return d; });
        var xt = mode === 'rate' ? rateYears : (wide ? d3.range(y0, y1 + 1, 2) : [y0, 2016, y1]);
        xt = xt.filter(function (t) { return t >= y0 && t <= y1; });
        dyn.selectAll('text.ch5-xtick').data(xt).join('text').attr('class', 'ch5-tick ch5-xtick')
          .attr('x', function (d) { return x(d); }).attr('y', innerH + 22).attr('text-anchor', 'middle').text(function (d) { return d; });
        dyn.append('text').attr('class', 'ch5-ytitle').attr('x', -m.left + 2).attr('y', -16)
          .text(mode === 'index' ? 'Index, 2011 = 100' : 'Hospitalisations per 100,000 people');
        if (mode === 'index') {
          dyn.append('text').attr('class', 'ch5-basenote').attr('x', 4).attr('y', y(100) + 14).text('2011 level');
        }

        /* lines */
        var line = d3.line().x(function (d) { return x(d.year); }).y(function (d) { return y(d.v); });
        dyn.append('path').attr('class', 'ch5-line is-ni ' + (mode === 'rate' ? 'is-thin' : '')).attr('d', line(niP));
        dyn.append('path').attr('class', 'ch5-line is-fn ' + (mode === 'rate' ? 'is-thin' : '')).attr('d', line(fnP));

        /* dots: end dots in index view, all three points in rate view */
        var dotsNI = mode === 'rate' ? niP : [niP[niP.length - 1]];
        var dotsFN = mode === 'rate' ? fnP : [fnP[fnP.length - 1]];
        dyn.selectAll('circle.ch5-dot.is-ni').data(dotsNI).join('circle').attr('class', 'ch5-dot is-ni').attr('r', 5.5)
          .attr('cx', function (d) { return x(d.year); }).attr('cy', function (d) { return y(d.v); });
        dyn.selectAll('circle.ch5-dot.is-fn').data(dotsFN).join('circle').attr('class', 'ch5-dot is-fn').attr('r', 5.5)
          .attr('cx', function (d) { return x(d.year); }).attr('cy', function (d) { return y(d.v); });

        /* direct labels at the right end */
        var fe = fnP[fnP.length - 1], ne = niP[niP.length - 1];
        var fnLines, niLines;
        if (mode === 'index') {
          fnLines = ['First Nations', sgn(fe.v - 100), N(fn0.hosp) + ' to ' + N(fnL.hosp)];
          niLines = ['Non-Indigenous', sgn(ne.v - 100), N(ni0.hosp) + ' to ' + N(niL.hosp)];
        } else {
          fnLines = ['First Nations', Viz.fmt.dp(fe.v, 0) + ' per 100,000'];
          niLines = ['Non-Indigenous', Viz.fmt.dp(ne.v, 0) + ' per 100,000'];
        }
        var labs = [
          { cls: 'is-fn', lines: fnLines, y: y(fe.v) },
          { cls: 'is-ni', lines: niLines, y: y(ne.v) }
        ].sort(function (a, b) { return a.y - b.y; });
        var lineH = 15;
        for (var i = 1; i < labs.length; i++) {
          var need = labs[i - 1].y + (labs[i - 1].lines.length + labs[i].lines.length) / 2 * lineH + 6;
          if (labs[i].y < need) labs[i].y = need;
        }
        var tx = x(y1) + 12;
        labs.forEach(function (l) {
          var t = dyn.append('text').attr('class', 'ch5-label ' + l.cls).attr('x', tx).attr('y', l.y).attr('dominant-baseline', 'central');
          l.lines.forEach(function (ln, k) {
            t.append('tspan').attr('x', tx).attr('dy', k === 0 ? (-(l.lines.length - 1) * lineH / 2) + 'px' : lineH + 'px')
              .style('font-weight', k === 0 ? 700 : (k === 1 ? 700 : 400)).style('font-size', !wide && k > 0 ? '12px' : null).text(ln);
          });
        });

        /* annotations */
        if (mode === 'rate') {
          var f11 = at(fnR, y0).hosp_per_100k, n11 = at(niR, y0).hosp_per_100k;
          var ay = wide ? y(215) : y(66);
          dyn.append('text').attr('class', 'ch5-ann').attr('x', x(y0) + (wide ? 2 : 14)).attr('y', ay)
            .text(Viz.fmt.dp(f11, 0) + ' vs ' + Viz.fmt.dp(n11, 0) + ' in ' + y0);
          /* "close to level" is a claim in words: warn (as facts.js does) if the 2011 rates stop being within 5% of each other */
          if (Math.abs(f11 / n11 - 1) > 0.05) console.warn('[ch5] fig-5a says the 2011 rates are "close to level" but they differ by ' + ((f11 / n11 - 1) * 100).toFixed(1) + '%');
          dyn.append('text').attr('class', 'ch5-ann-sub').attr('x', x(y0) + (wide ? 2 : 14)).attr('y', ay + 15).text('close to level');
          var f21 = fe.v, n21 = ne.v;
          var bx = x(y1) - 14;
          dyn.append('path').attr('class', 'ch5-bracket')
            .attr('d', 'M' + (bx + 5) + ',' + y(f21) + 'H' + bx + 'V' + y(n21) + 'H' + (bx + 5));
          var gt = dyn.append('text').attr('class', 'ch5-ann').attr('text-anchor', 'end').attr('x', bx - 8).attr('y', wide ? y((f21 + n21) / 2) - 8 : y(122));
          gt.append('tspan').attr('x', bx - 8).text(Viz.fmt.dp(f21, 0) + ' vs ' + Viz.fmt.dp(n21, 0) + ' in ' + y1);
          gt.append('tspan').attr('x', bx - 8).attr('dy', 15).style('font-weight', 400).text('about ' + Viz.fmt.dp(f21 / n21, 1) + ' times');
        }
        fade(dyn, animate);

        /* "i" caveat marker on the First Nations line (counts view) */
        g.mark.selectAll('*').remove();
        if (mode === 'index') {
          var mp = fnP.filter(function (p) { return p.year === 2015; })[0];
          var mx = x(mp.year), my = y(mp.v) - 30;
          var mg = g.mark.append('g').attr('class', 'ch5-imark').attr('role', 'img').attr('aria-label', 'Note: better recording of Indigenous status may explain part of the rise.');
          mg.append('line').attr('class', 'ch5-ileader').attr('x1', mx).attr('x2', mx).attr('y1', my + 11).attr('y2', y(mp.v) - 5);
          mg.append('circle').attr('cx', mx).attr('cy', my).attr('r', 11);
          mg.append('text').attr('x', mx).attr('y', my).attr('dy', '0.35em').attr('text-anchor', 'middle').text('i');
          mg.append('circle').attr('class', 'ch5-ihit').attr('cx', mx).attr('cy', my).attr('r', 18);
          Viz.tooltip.bind(mg, function () { return 'Better recording of Indigenous status in hospital records may explain part of the rise.'; });
        }

        buildHover();
        refreshText();
        if (state.year != null) showYear(nearest(state.year), false);
      }

      /* ---------- hover / tap / keyboard ---------- */
      var hit, guide, gdots;
      function nearest(yr) {
        var ys = stepYears();
        return ys.reduce(function (b, c) { return Math.abs(c - yr) < Math.abs(b - yr) ? c : b; }, ys[0]);
      }
      function buildHover() {
        guide = g.hov.selectAll('line.ch5-guide').data([0]).join('line').attr('class', 'ch5-guide')
          .attr('y1', 0).attr('y2', innerH).style('opacity', 0);
        gdots = g.hov.selectAll('circle.ch5-gdot').data(['is-ni', 'is-fn']).join('circle')
          .attr('class', function (d) { return 'ch5-gdot ' + d; }).attr('r', 7).style('opacity', 0);
        hit = g.hov.selectAll('rect.ch5-hit').data([0]).join('rect').attr('class', 'ch5-hit')
          .attr('x', -10).attr('y', 0).attr('width', innerW + 20).attr('height', innerH)
          .attr('tabindex', 0).attr('role', 'group')
          .attr('aria-label', 'Year read-out. Use the left and right arrow keys to move between years.');
        if (!hit.node().__ch5Wired) { hit.node().__ch5Wired = true; wireHover(hit.node()); }
      }
      function yearAt(clientX) {
        var box = hit.node().getBoundingClientRect();
        return nearest(x.invert(clientX - box.left - 10));
      }
      function showYear(yr, openTip, cx, cy) {
        state.year = yr;
        var gx = x(yr);
        guide.attr('x1', gx).attr('x2', gx).style('opacity', 1);
        var a = at(fnR, yr), b = at(niR, yr);
        var vals = state.mode === 'index'
          ? { 'is-fn': a.hosp / fn0.hosp * 100, 'is-ni': b.hosp / ni0.hosp * 100 }
          : { 'is-fn': a.hosp_per_100k, 'is-ni': b.hosp_per_100k };
        gdots.each(function (k) { d3.select(this).attr('cx', gx).attr('cy', y(vals[k])).style('opacity', 1); });
        if (openTip) {
          if (cx == null) {
            var box = hit.node().getBoundingClientRect();
            cx = box.left + 10 + gx; cy = box.top + innerH * 0.4;
          }
          Viz.tooltip.show(tipHtml(yr), cx, cy, hit.node());
        }
      }
      function clearYear() {
        state.year = null;
        if (guide) guide.style('opacity', 0);
        if (gdots) gdots.style('opacity', 0);
        Viz.tooltip.hide();
      }
      function wireHover(node) {
        node.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch') return;
          showYear(yearAt(e.clientX), true, e.clientX, e.clientY);
        });
        node.addEventListener('pointerleave', function (e) {
          if (e.pointerType === 'touch' || document.activeElement === node) return;
          clearYear();
        });
        node.addEventListener('pointerdown', function (e) {
          if (e.pointerType !== 'touch') return;
          showYear(yearAt(e.clientX), true, e.clientX, e.clientY);
        });
        node.addEventListener('focus', function () { showYear(state.year != null ? nearest(state.year) : y1, true); });
        node.addEventListener('blur', function () { clearYear(); });
        node.addEventListener('keydown', function (e) {
          var k = e.key;
          if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(k) < 0) return;
          e.preventDefault();
          var ys = stepYears();
          var i = ys.indexOf(state.year != null ? nearest(state.year) : y1);
          if (k === 'ArrowRight') i = Math.min(ys.length - 1, i + 1);
          else if (k === 'ArrowLeft') i = Math.max(0, i - 1);
          else if (k === 'Home') i = 0; else i = ys.length - 1;
          showYear(ys[i], true);
          Viz.announce(tipHtml(ys[i]).replace(/<br>/g, '. ').replace(/<[^>]+>/g, ''));
        });
      }

      /* ---------- wire up ---------- */
      var ctl = sel(el, '.fig-controls');
      if (ctl) {
        Viz.segmented(ctl, { onChange: function (v) { state.mode = v; clearYear(); render(true); } });
        var pressed = ctl.querySelector('button[aria-pressed="true"]');
        if (pressed) state.mode = pressed.getAttribute('data-value');
      }
      Viz.responsive(host, function (w) { width = w; build(); render(false); });
      host.__fig5a = { setMode: function (v) { state.mode = v; clearYear(); render(true); } };
    },
    update: function (state) {
      var host = document.querySelector('#fig-5a .fig-chart');
      if (state && state.mode && host && host.__fig5a) host.__fig5a.setMode(state.mode);
    }
  };

  /* =========================================================== fig-5b ===== */
  var SHORT = {
    'Car driver, passenger or unknown position': 'Car occupants',
    'Motorcyclist': 'Motorcyclists',
    'Pedestrian': 'Pedestrians',
    'Pedal cyclist': 'Cyclists',
    'Pick-up truck or van occupant': 'Pick-up or van',
    'Heavy transport driver, passenger or unknown position': 'Heavy transport',
    'Bus occupant': 'Bus occupants',
    'Other or unknown': 'Other or unknown'
  };

  window.Charts['fig-5b'] = {
    init: function (el, data) {
      var host = sel(el, '.fig-chart');
      var prof = (data.ch5_first_nations_profile || []).filter(function (r) { return r.view === 'road_user'; });
      if (!host || !prof.length) return;
      var cats = Array.from(new Set(prof.map(function (r) { return r.category; })));
      var tot = {};
      [FN, NI].forEach(function (s) {
        tot[s] = prof.filter(function (r) { return r.status === s; }).reduce(function (a, r) { return a + r.hosp; }, 0);
      });
      var items = cats.map(function (c) {
        var f = prof.filter(function (r) { return r.status === FN && r.category === c; })[0];
        var n = prof.filter(function (r) { return r.status === NI && r.category === c; })[0];
        return {
          cat: c, short: SHORT[c] || c,
          fn: f.hosp, ni: n.hosp, fs: f.hosp / tot[FN] * 100, ns: n.hosp / tot[NI] * 100,
          fnp: f.np_cells, nnp: n.np_cells, flag: f.np_cells > 0 || n.np_cells > 0
        };
      }).sort(function (a, b) { return b.fs - a.fs; });
      function item(c) { return items.filter(function (d) { return d.cat === c; })[0]; }
      var ped = item('Pedestrian'), cyc = item('Pedal cyclist'), car = item('Car driver, passenger or unknown position');

      host.setAttribute('aria-label',
        'Paired horizontal bars of the road-user mix within each group’s hospitalisations, pooled 2016 to 2021, sorted by the First Nations share. ' +
        'Car occupants are ' + Viz.fmt.dp1(car.fs) + '% of First Nations and ' + Viz.fmt.dp1(car.ns) + '% of non-Indigenous hospitalisations; pedestrians ' +
        Viz.fmt.dp1(ped.fs) + '% against ' + Viz.fmt.dp1(ped.ns) + '%; cyclists ' + Viz.fmt.dp1(cyc.fs) + '% against ' + Viz.fmt.dp1(cyc.ns) + '%.');

      Viz.fillTable(sel(el, '.fig-data'), items, [
        { key: 'short', label: 'Road user', text: true, format: function (v, r) { return r.cat + (r.flag ? ' *' : ''); } },
        { key: 'fn', label: 'First Nations hospitalisations', format: N },
        { key: 'fs', label: 'First Nations share', format: P1 },
        { key: 'fnp', label: 'First Nations suppressed cells (n.p.)', format: N },
        { key: 'ni', label: 'Non-Indigenous hospitalisations', format: N },
        { key: 'ns', label: 'Non-Indigenous share', format: P1 },
        { key: 'nnp', label: 'Non-Indigenous suppressed cells (n.p.)', format: N }
      ], { caption: 'Road-user mix within each group, pooled 2016 to 2021. Shares are of published cells only; * = category includes suppressed cells' });

      function tipHtml(d) {
        var out = '<strong>' + d.cat + '</strong><br>First Nations: ' + Viz.fmt.dp1(d.fs) + '% (' + N(d.fn) + ' hospitalisations)' +
          '<br>Non-Indigenous: ' + Viz.fmt.dp1(d.ns) + '% (' + N(d.ni) + ')';
        if (d.flag) out += '<br><span style="opacity:.85">Includes ' + d.fnp + ' suppressed ' + (d.fnp === 1 ? 'cell' : 'cells') + ' (n.p.) for each group; the true share is slightly higher.</span>';
        return out;
      }

      Viz.responsive(host, function (w) {
        var wide = w >= 640;
        var left = wide ? 150 : 116, right = 46;
        var innerW = Math.max(120, w - left - right);
        var rowH = 46, barH = 15, top = 30, foot = 26;
        var h = top + items.length * rowH + foot;
        var x = d3.scaleLinear().domain([0, 60]).range([0, innerW]);
        var svg = svgFor(host, 'ch5-svg', w, h);
        svg.selectAll('*').remove();
        var gg = svg.append('g').attr('transform', 'translate(' + left + ',' + top + ')');

        /* key (direct, top row) */
        var key = svg.append('g').attr('class', 'ch5-key').attr('transform', 'translate(' + left + ',4)');
        key.append('rect').attr('class', 'ch5-bar is-fn').attr('width', 14).attr('height', 12).attr('y', 0).attr('rx', 2);
        key.append('text').attr('x', 20).attr('y', 6).attr('dy', '0.35em').style('font-weight', 700).text('First Nations');
        var off = wide ? 120 : 108;
        key.append('rect').attr('class', 'ch5-bar is-ni').attr('x', off).attr('width', 14).attr('height', 12).attr('rx', 2);
        key.append('text').attr('x', off + 20).attr('y', 6).attr('dy', '0.35em').text('Non-Indigenous');

        items.forEach(function (d, i) {
          var ry = i * rowH, isPed = d === ped, isCyc = d === cyc;
          var row = gg.append('g').attr('class', 'ch5-row' + (isPed ? ' is-hl' : ''));
          if (isPed) row.append('rect').attr('class', 'ch5-hlband').attr('x', -left).attr('width', w).attr('y', ry + 1).attr('height', rowH - 4).attr('rx', 4);
          row.append('text').attr('class', 'ch5-cat' + (isPed ? ' is-hl' : '')).attr('x', -10).attr('y', ry + 7 + barH).attr('dy', '0.05em')
            .attr('text-anchor', 'end').text(d.short + (d.flag ? ' *' : ''));
          row.append('rect').attr('class', 'ch5-bar is-fn').attr('x', 0).attr('y', ry + 6).attr('width', Math.max(1, x(d.fs))).attr('height', barH).attr('rx', 2);
          row.append('rect').attr('class', 'ch5-bar is-ni').attr('x', 0).attr('y', ry + 6 + barH + 2).attr('width', Math.max(1, x(d.ns))).attr('height', barH).attr('rx', 2);
          row.append('text').attr('class', 'ch5-val is-fn').attr('x', x(d.fs) + 6).attr('y', ry + 6 + barH / 2).attr('dy', '0.35em').text(Viz.fmt.dp1(d.fs) + '%');
          row.append('text').attr('class', 'ch5-val is-ni').attr('x', x(d.ns) + 6).attr('y', ry + 6 + barH * 1.5 + 2).attr('dy', '0.35em').text(Viz.fmt.dp1(d.ns) + '%');
          if (isPed || isCyc) {
            var ax = x(Math.max(d.fs, d.ns)) + 62;
            var txt = wide
              ? Viz.fmt.dp1(d.fs) + '% of First Nations vs ' + Viz.fmt.dp1(d.ns) + '% of non-Indigenous'
              : Viz.fmt.dp1(d.fs) + '% vs ' + Viz.fmt.dp1(d.ns) + '%';
            var t = row.append('text').attr('class', 'ch5-ann').attr('x', ax).attr('y', ry + rowH / 2 - 2);
            wrap(t, txt, ax, innerW + right - ax, 14, 2);
            if (t.selectAll('tspan').size() > 1) t.attr('y', ry + rowH / 2 - 9);
          }
          var hit = row.append('rect').attr('class', 'ch5-rowhit').attr('x', -left).attr('width', w).attr('y', ry).attr('height', rowH)
            .attr('aria-label', d.cat + ': ' + Viz.fmt.dp1(d.fs) + '% of First Nations and ' + Viz.fmt.dp1(d.ns) + '% of non-Indigenous hospitalisations' + (d.flag ? ' (includes suppressed cells)' : ''));
          Viz.tooltip.bind(hit, function () { return tipHtml(d); });
        });
        /* zero line */
        gg.append('line').attr('class', 'ch5-zero').attr('y1', 0).attr('y2', items.length * rowH);
        var fn = svg.append('text').attr('class', 'ch5-foot').attr('x', 2).attr('y', h - 6);
        wrap(fn, '* includes suppressed (n.p.) cells; true share slightly higher', 2, w - 4, 14, 2);
        if (fn.selectAll('tspan').size() > 1) fn.attr('y', h - 18);
      });
    },
    update: function () {}
  };

  /* =========================================================== fig-5c ===== */
  var AREAS = ['Major Cities', 'Regional', 'Remote'];
  var AREA_LABEL = { 'Major Cities': 'Major cities', 'Regional': 'Regional areas', 'Remote': 'Remote areas' };

  window.Charts['fig-5c'] = {
    init: function (el, data) {
      var host = sel(el, '.fig-chart');
      var prof = (data.ch5_first_nations_profile || []).filter(function (r) { return r.view === 'remoteness'; });
      if (!host || !prof.length) return;
      var rows = AREAS.map(function (a) {
        var f = prof.filter(function (r) { return r.status === FN && r.category === a; })[0];
        var n = prof.filter(function (r) { return r.status === NI && r.category === a; })[0];
        return { area: a, fn: f.hosp, ni: n.hosp, share: f.hosp / (f.hosp + n.hosp) * 100, fs: f.avg_stay, ns: n.avg_stay, fb: f.bed_days, nb: n.bed_days };
      });
      var rem = rows[2], maj = rows[0], reg = rows[1];
      var state = { mode: 'share' };
      var width = 0;

      function describe() {
        if (state.mode === 'share') {
          return 'Horizontal bars of the First Nations share of road-crash hospitalisations by area of residence, pooled 2016 to 2021: ' +
            Viz.fmt.dp1(maj.share) + '% in major cities, ' + Viz.fmt.dp1(reg.share) + '% in regional areas and ' + Viz.fmt.dp1(rem.share) +
            '% in remote areas (' + N(rem.fn) + ' of ' + N(rem.fn + rem.ni) + ').';
        }
        return 'Dumbbells of average hospital stay in days by area of residence, First Nations against non-Indigenous: major cities ' +
          Viz.fmt.dp1(maj.fs) + ' and ' + Viz.fmt.dp1(maj.ns) + ', regional ' + Viz.fmt.dp1(reg.fs) + ' and ' + Viz.fmt.dp1(reg.ns) +
          ', remote ' + Viz.fmt.dp1(rem.fs) + ' and ' + Viz.fmt.dp1(rem.ns) + '.';
      }
      function fillTable() {
        var t = sel(el, '.fig-data');
        if (state.mode === 'share') {
          Viz.fillTable(t, rows, [
            { key: 'area', label: 'Area of residence', text: true, format: function (v) { return AREA_LABEL[v]; } },
            { key: 'fn', label: 'First Nations hospitalisations', format: N },
            { key: 'ni', label: 'Non-Indigenous hospitalisations', format: N },
            { key: 'share', label: 'First Nations share', format: P1 }
          ], { caption: 'First Nations share of hospitalisations by area of residence, pooled 2016 to 2021' });
        } else {
          Viz.fillTable(t, rows, [
            { key: 'area', label: 'Area of residence', text: true, format: function (v) { return AREA_LABEL[v]; } },
            { key: 'fs', label: 'First Nations average stay (days)', format: Viz.fmt.dp1 },
            { key: 'ns', label: 'Non-Indigenous average stay (days)', format: Viz.fmt.dp1 },
            { key: 'fb', label: 'First Nations bed days', format: N },
            { key: 'nb', label: 'Non-Indigenous bed days', format: N }
          ], { caption: 'Average stay (bed days ÷ hospitalisations, survivors only) by area of residence, pooled 2016 to 2021' });
        }
      }
      function tipHtml(d) {
        if (state.mode === 'share') {
          return '<strong>' + AREA_LABEL[d.area] + '</strong><br>' + Viz.fmt.dp1(d.share) + '% of those hospitalised were First Nations people<br><span style="opacity:.85">' +
            N(d.fn) + ' First Nations, ' + N(d.ni) + ' non-Indigenous (area of residence)</span>';
        }
        return '<strong>' + AREA_LABEL[d.area] + '</strong><br>First Nations: ' + Viz.fmt.dp1(d.fs) + ' days<br>Non-Indigenous: ' + Viz.fmt.dp1(d.ns) +
          ' days<br><span style="opacity:.85">Average stay, survivors only (area of residence)</span>';
      }
      function refresh() {
        host.setAttribute('aria-label', describe());
        showMode(el, state.mode);
        fillTable();
      }

      function draw(animate) {
        if (!width) return;
        var w = width, wide = w >= 640, share = state.mode === 'share';
        var left = wide ? 130 : 96, right = wide ? 56 : 44;
        var innerW = Math.max(120, w - left - right);
        var rowH = wide ? 62 : (share ? 86 : 70), top = 34, bottom = 48;
        var annLines = share ? 2 : 1;
        var h = top + rows.length * rowH + bottom;
        var svg = svgFor(host, 'ch5-svg', w, h);
        svg.selectAll('*').remove();
        var x = share ? d3.scaleLinear().domain([0, 100]).range([0, innerW]) : d3.scaleLinear().domain([0, 7]).range([0, innerW]);
        var ticks = share ? [0, 25, 50, 75, 100] : d3.range(0, 8, 1);
        var gg = svg.append('g').attr('class', 'ch5-c').attr('transform', 'translate(' + left + ',' + top + ')');
        var plotH = rows.length * rowH;

        /* axis */
        gg.selectAll('line.ch5-grid').data(ticks).join('line').attr('class', 'ch5-grid')
          .attr('x1', function (d) { return x(d); }).attr('x2', function (d) { return x(d); }).attr('y1', 0).attr('y2', plotH);
        gg.selectAll('text.ch5-xtick').data(ticks).join('text').attr('class', 'ch5-tick ch5-xtick')
          .attr('x', function (d) { return x(d); }).attr('y', plotH + 18).attr('text-anchor', 'middle')
          .text(function (d) { return share ? d + '%' : d; });
        svg.append('text').attr('class', 'ch5-ytitle').attr('x', wide ? left : 0).attr('y', 14)
          .text(share ? 'First Nations share of hospitalisations, by area of residence' : '');
        svg.append('text').attr('class', 'ch5-ytitle').attr('x', wide ? left : 0).attr('y', top + plotH + 38)
          .text(share ? 'Area of residence, not where the crash happened' : (wide ? 'Average stay in days · area of residence, not where the crash happened' : 'Average stay in days · area of residence'));

        if (!share) {
          /* key row */
          var key = svg.append('g').attr('class', 'ch5-key').attr('transform', 'translate(' + left + ',8)');
          key.append('circle').attr('class', 'ch5-dot is-fn').attr('cx', 7).attr('cy', 7).attr('r', 6);
          key.append('text').attr('x', 20).attr('y', 7).attr('dy', '0.35em').style('font-weight', 700).text('First Nations');
          var off = wide ? 130 : 112;
          key.append('circle').attr('class', 'ch5-dot is-ni').attr('cx', off + 7).attr('cy', 7).attr('r', 6);
          key.append('text').attr('x', off + 20).attr('y', 7).attr('dy', '0.35em').text('Non-Indigenous');
        }

        rows.forEach(function (d, i) {
          var ry = i * rowH, cy = ry + rowH / 2 - 6;
          var isRem = d.area === 'Remote';
          var row = gg.append('g').attr('class', 'ch5-row' + (isRem ? ' is-hl' : ''));
          row.append('text').attr('class', 'ch5-cat' + (isRem ? ' is-hl' : '')).attr('x', -10).attr('y', cy).attr('dy', '0.35em')
            .attr('text-anchor', 'end').text(AREA_LABEL[d.area]);
          if (share) {
            row.append('rect').attr('class', 'ch5-bar is-fn' + (isRem ? '' : ' is-soft')).attr('x', 0).attr('y', cy - 11)
              .attr('width', Math.max(1, x(d.share))).attr('height', 22).attr('rx', 2);
            row.append('text').attr('class', 'ch5-val is-fn').attr('x', x(d.share) + 7).attr('y', cy).attr('dy', '0.35em').text(Viz.fmt.dp1(d.share) + '%');
            if (isRem) {
              var ax = x(d.share) + 7 + 50;
              var avail = innerW + right - ax;
              var t = row.append('text').attr('class', 'ch5-ann').attr('x', ax).attr('y', cy - 7);
              if (avail >= 200) {
                wrap(t, 'of those hospitalised were First Nations people', ax, avail, 14, 3);
              } else {
                t.remove();
                t = row.append('text').attr('class', 'ch5-ann').attr('x', 0).attr('y', cy + 24);
                wrap(t, 'of those hospitalised were First Nations people', 0, innerW, 14, 2);
              }
            }
          } else {
            row.append('line').attr('class', 'ch5-dumb').attr('x1', x(Math.min(d.fs, d.ns))).attr('x2', x(Math.max(d.fs, d.ns))).attr('y1', cy).attr('y2', cy);
            row.append('circle').attr('class', 'ch5-dot is-ni').attr('cx', x(d.ns)).attr('cy', cy).attr('r', 7);
            row.append('circle').attr('class', 'ch5-dot is-fn').attr('cx', x(d.fs)).attr('cy', cy).attr('r', 7);
            /* value labels: the higher dot's label above, the lower below */
            var fnHigh = d.fs >= d.ns;
            row.append('text').attr('class', 'ch5-val is-fn').attr('x', x(d.fs)).attr('y', cy + (fnHigh ? -14 : 22)).attr('text-anchor', 'middle').text(Viz.fmt.dp1(d.fs));
            row.append('text').attr('class', 'ch5-val is-ni').attr('x', x(d.ns)).attr('y', cy + (fnHigh ? 22 : -14)).attr('text-anchor', 'middle').text(Viz.fmt.dp1(d.ns));
            if (isRem) {
              var gap = Math.abs(d.fs - d.ns);
              var lowX = x(Math.min(d.fs, d.ns));
              var annT = row.append('text').attr('class', 'ch5-ann').attr('y', cy).attr('dy', '0.35em');
              if (wide) annT.attr('x', Math.max(x(d.fs), x(d.ns)) + 18); else annT.attr('x', lowX - 14).attr('text-anchor', 'end');
              annT.text(Viz.fmt.dp1(d.fs) + ' vs ' + Viz.fmt.dp1(d.ns) + ' days');
            }
          }
          var hit = row.append('rect').attr('class', 'ch5-rowhit').attr('x', -left).attr('width', w).attr('y', ry).attr('height', rowH)
            .attr('aria-label', share
              ? AREA_LABEL[d.area] + ': ' + Viz.fmt.dp1(d.share) + '% of those hospitalised were First Nations people'
              : AREA_LABEL[d.area] + ': First Nations ' + Viz.fmt.dp1(d.fs) + ' days, non-Indigenous ' + Viz.fmt.dp1(d.ns) + ' days');
          Viz.tooltip.bind(hit, function () { return tipHtml(d); });
        });
        fade(gg, animate);
        refresh();
      }

      var ctl = sel(el, '.fig-controls');
      if (ctl) {
        Viz.segmented(ctl, { onChange: function (v) { state.mode = v; Viz.tooltip.hide(); draw(true); } });
        var pressed = ctl.querySelector('button[aria-pressed="true"]');
        if (pressed) state.mode = pressed.getAttribute('data-value');
      }
      Viz.responsive(host, function (w) { width = w; draw(false); });
      host.__fig5c = { setMode: function (v) { state.mode = v; draw(true); } };
    },
    update: function (state) {
      var host = document.querySelector('#fig-5c .fig-chart');
      if (state && state.mode && host && host.__fig5c) host.__fig5c.setMode(state.mode);
    }
  };
})();
