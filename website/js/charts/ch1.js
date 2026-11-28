/* ch1.js: Chapter 1 board (A: indexed lines, 2011 = 100; B: unit chart + strip for the selected year).
   OWNED BY THE CHAPTER 1 AGENT.
   Interface: window.Charts['ch1'] = { init(boardEl, data) }
   Data: ch1_trend (year, hosp, road_deaths, population, hosp_per_100k, deaths_per_100k, hosp_per_death, series_note).
   Indexes (2011 = 100) are computed here, for presentation only. State: Viz.bus({ mode, year }). */
(function () {
  'use strict';
  window.Charts = window.Charts || {};

  var NS = 'http://www.w3.org/2000/svg';
  function pctChange(a, b) { return (b / a - 1) * 100; }
  function sgn(n, dp) { return Viz.fmt.minus(Viz.fmt.signedPct(n, dp)); }
  function idx(v) { return Viz.fmt.dp(v, 1); }
  function rate2(v) { return Viz.fmt.dp(v, 2); }

  var SERIES = {
    counts: [
      { key: 'hosp', name: 'Hospitalised', field: 'hosp', cls: 'is-hosp' },
      { key: 'pop', name: 'Population', field: 'population', cls: 'is-pop' },
      { key: 'deaths', name: 'Road deaths', field: 'road_deaths', cls: 'is-deaths' }
    ],
    per100k: [
      { key: 'hosp', name: 'Hospitalised', field: 'hosp_per_100k', cls: 'is-hosp' },
      { key: 'deaths', name: 'Road deaths', field: 'deaths_per_100k', cls: 'is-deaths' }
    ]
  };

  window.Charts['ch1'] = {
    init: function (board, data) {
      var all = (data.ch1_trend || []).slice().sort(function (a, b) { return a.year - b.year; });
      var base = all[0], last = all[all.length - 1];
      var panelA = board.querySelector('#ch1-a'), panelB = board.querySelector('#ch1-b');
      if (!base || !last || !panelA || !panelB) return;
      var hostA = panelA.querySelector('.panel-chart'), hostB = panelB.querySelector('.panel-chart');
      var chip = board.querySelector('.board-chip');
      var bus = Viz.bus({ mode: 'counts', year: last.year });
      var Y0 = base.year, Y1 = last.year;

      function rowOf(yr) { return all.filter(function (r) { return r.year === yr; })[0]; }
      function clampYear(y) { return Math.max(Y0, Math.min(Y1, y)); }
      function perDeath(r) { return Math.round(r.hosp_per_death); }
      function modeName(m) { return m === 'counts' ? 'counts' : 'per 100,000'; }

      /* ------------------------------------------------ copy computed from the CSV */
      function titleA(mode) {
        if (mode === 'counts') {
          var d = pctChange(base.road_deaths, last.road_deaths), h = pctChange(base.hosp, last.hosp);
          return 'Deaths ' + (d < 0 ? 'down ' : 'up ') + Viz.fmt.pct(Math.abs(d), 1) + ', admissions ' +
            (h < 0 ? 'down ' : 'up ') + Viz.fmt.pct(Math.abs(h), 0) + ' since ' + Y0;
        }
        var dr = pctChange(base.deaths_per_100k, last.deaths_per_100k);
        return 'Per person, the admission rate is flat; the death rate ' + (dr < 0 ? 'fell ' : 'rose ') + Viz.fmt.pct(Math.abs(dr), 0);
      }
      function subA(mode) {
        return mode === 'counts'
          ? 'Indexed lines, 2011 = 100 · hospitalisations, road deaths and population · ' + Y0 + '–' + Y1
          : 'Indexed lines, 2011 = 100 · rates per 100,000 people (population is 100 by definition) · ' + Y0 + '–' + Y1;
      }
      function describeA(mode, year) {
        var r = rowOf(year), s;
        if (mode === 'counts') {
          s = 'Line chart, indexed to 2011 = 100, 2011 to ' + Y1 + ': hospitalisations rose ' +
            Viz.fmt.dp(pctChange(base.hosp, last.hosp), 0) + '% to ' + Viz.fmt.int(last.hosp) + ', population rose ' +
            Viz.fmt.dp(pctChange(base.population, last.population), 0) + '%, and road deaths fell ' +
            Viz.fmt.dp(Math.abs(pctChange(base.road_deaths, last.road_deaths)), 1) + '% to ' + Viz.fmt.int(last.road_deaths) + '.';
        } else {
          var hr = pctChange(base.hosp_per_100k, last.hosp_per_100k), dr = pctChange(base.deaths_per_100k, last.deaths_per_100k);
          s = 'Line chart per 100,000 people, indexed to 2011 = 100: the hospitalisation rate is nearly flat (' +
            Viz.fmt.dp(base.hosp_per_100k, 1) + ' to ' + Viz.fmt.dp(last.hosp_per_100k, 1) + ', ' + (hr >= 0 ? 'up ' : 'down ') +
            Viz.fmt.dp(Math.abs(hr), 1) + '%) while the road death rate fell ' + Viz.fmt.dp(Math.abs(dr), 0) + '% (' +
            rate2(base.deaths_per_100k) + ' to ' + rate2(last.deaths_per_100k) + ').';
        }
        return s + ' Selected year ' + year + ': ' + Viz.fmt.int(r.hosp) + ' admitted, ' + Viz.fmt.int(r.road_deaths) + ' road deaths.';
      }
      function titleB(year) {
        return 'For every road death in ' + year + ', ' + perDeath(rowOf(year)) + ' people were admitted to hospital';
      }
      function captionB(year) {
        var r = rowOf(year);
        return Viz.fmt.int(r.hosp) + ' admitted, ' + Viz.fmt.int(r.road_deaths) + ' road deaths';
      }
      function describeB(year) {
        var r = rowOf(year), n = perDeath(r);
        return 'Unit chart for ' + year + ' of ' + (n + 1) + ' squares: one solid square for the road death and ' + n +
          ' outlined squares for the people admitted to hospital (' + Viz.fmt.int(r.hosp) + ' admitted, ' + Viz.fmt.int(r.road_deaths) +
          ' road deaths). Below it, a column for each year 2011 to 2021 shows admissions per road death, from ' +
          Math.round(base.hosp_per_death) + ' in 2011 to ' + Math.round(last.hosp_per_death) + ' in 2021.';
      }

      /* ------------------------------------------------ explore bar */
      var ctlHost = board.querySelector('.explore-controls');
      ctlHost.innerHTML = '';
      var grp = document.createElement('div');
      grp.className = 'ctl-group';
      grp.innerHTML = '<span class="ctl-label" id="ch1-seg-label">Show</span>' +
        '<div class="seg" role="group" aria-labelledby="ch1-seg-label">' +
        '<button type="button" data-value="counts" aria-pressed="true">Counts</button>' +
        '<button type="button" data-value="per100k" aria-pressed="false">Per 100,000</button></div>';
      ctlHost.appendChild(grp);
      var seg = Viz.segmented(grp.querySelector('.seg'), {
        announce: false,
        onChange: function (v) {
          bus.set({ mode: v }, 'controls');
          Viz.announce('Showing ' + modeName(v) + '. ' + titleA(v) + '.');
        }
      });

      function setChip() {
        var s = bus.get();
        chip.textContent = 'Showing: ' + modeName(s.mode) + ' · ' + s.year;
        chip.hidden = false;
      }

      /* ================================================= panel A ===== */
      var titleElA = panelA.querySelector('.panel-title'), subElA = panelA.querySelector('.panel-sub');
      var widthA = 0, x, y, innerW, innerH, gA, svgA, hit, guide, hoverRule, gdots;
      var m = { top: 44, right: 100, bottom: 30, left: 36 };
      var wideA = true;

      function indexed(field) {
        return all.map(function (r) { return { year: r.year, v: r[field] / base[field] * 100, raw: r[field], row: r }; });
      }
      function seriesFor(mode) {
        return SERIES[mode].map(function (s) {
          var pts = indexed(s.field);
          return { key: s.key, name: s.name, cls: s.cls, pts: pts, end: pts[pts.length - 1], start: pts[0] };
        });
      }
      function tipHtml(r) {
        var mode = bus.get().mode;
        var out = '<strong>' + r.year + '</strong>';
        if (r.series_note) out += ' <span style="opacity:.8">(' + r.series_note + ')</span>';
        if (mode === 'counts') {
          out += '<br>Hospitalised: ' + Viz.fmt.int(r.hosp) + ' (index ' + idx(r.hosp / base.hosp * 100) + ')' +
            '<br>Road deaths: ' + Viz.fmt.int(r.road_deaths) + ' (index ' + idx(r.road_deaths / base.road_deaths * 100) + ')' +
            '<br>Population: ' + Viz.fmt.int(r.population) + ' (index ' + idx(r.population / base.population * 100) + ')';
        } else {
          out += '<br>Hospitalised: ' + Viz.fmt.dp(r.hosp_per_100k, 1) + ' per 100,000 (index ' + idx(r.hosp_per_100k / base.hosp_per_100k * 100) + ')' +
            '<br>Road deaths: ' + rate2(r.deaths_per_100k) + ' per 100,000 (index ' + idx(r.deaths_per_100k / base.deaths_per_100k * 100) + ')';
        }
        return out;
      }
      function labelLines(s, wide, mode) {
        var chg = pctChange(s.start.raw, s.end.raw);
        var val = sgn(chg, Math.abs(chg) < 12 && s.key === 'deaths' && mode === 'counts' ? 1 : (Math.abs(chg) < 5 ? 1 : 0));
        return wide ? [s.name + ' ' + val] : [s.name, val];
      }

      function buildA() {
        wideA = widthA >= 640;
        var h = Viz.height(widthA, { ratio: 0.62, min: wideA ? 340 : 340, max: 400 });
        m.right = wideA ? 176 : 92;
        m.left = wideA ? 44 : 36;
        innerW = Math.max(120, widthA - m.left - m.right);
        innerH = h - m.top - m.bottom;
        x = d3.scaleLinear().domain([Y0, Y1]).range([0, innerW]);
        y = d3.scaleLinear().domain([70, 120]).range([innerH, 0]);

        svgA = d3.select(hostA).selectAll('svg.ch1-svg').data([0]).join('svg').attr('class', 'ch1-svg')
          .attr('width', widthA).attr('height', h).attr('viewBox', '0 0 ' + widthA + ' ' + h)
          .attr('aria-hidden', 'true').attr('focusable', 'false');
        gA = svgA.selectAll('g.plot').data([0]).join('g').attr('class', 'plot')
          .attr('transform', 'translate(' + m.left + ',' + m.top + ')');

        var half = x(Y0 + 1) - x(Y0);
        var bands = [];
        var vic = all.filter(function (r) { return /before/i.test(r.series_note || ''); });
        var nsw = all.filter(function (r) { return /after nsw/i.test(r.series_note || ''); });
        if (vic.length) bands.push({ id: 'vic', x0: x(vic[0].year), x1: x(vic[vic.length - 1].year) + half / 2, label: wideA ? 'Before Vic change' : 'Vic 2012' });
        if (nsw.length) bands.push({ id: 'nsw', x0: x(nsw[0].year) - half / 2, x1: x(nsw[nsw.length - 1].year), label: wideA ? 'After NSW change' : 'NSW 2017' });
        gA.selectAll('rect.ch1-band').data(bands, function (d) { return d.id; }).join('rect')
          .attr('class', 'ch1-band').attr('x', function (d) { return d.x0; }).attr('width', function (d) { return d.x1 - d.x0; })
          .attr('y', 0).attr('height', innerH);
        gA.selectAll('text.ch1-band-label').data(bands, function (d) { return d.id; }).join('text')
          .attr('class', 'ch1-band-label').attr('x', function (d) { return d.x0 + 2; }).attr('y', -8)
          .text(function (d) { return d.label; });

        var ticks = d3.range(70, 121, 10);
        gA.selectAll('line.ch1-grid').data(ticks).join('line')
          .attr('class', function (d) { return 'ch1-grid' + (d === 100 ? ' is-base' : ''); })
          .attr('x1', 0).attr('x2', innerW).attr('y1', function (d) { return y(d); }).attr('y2', function (d) { return y(d); });
        gA.selectAll('text.ch1-ytick').data(ticks).join('text').attr('class', 'ch1-tick ch1-ytick')
          .attr('x', -8).attr('y', function (d) { return y(d); }).attr('dy', '0.32em').attr('text-anchor', 'end').text(function (d) { return d; });
        var xt = (wideA ? d3.range(Y0, Y1 + 1, 2) : [Y0, 2016, Y1]).filter(function (t) { return t >= Y0 && t <= Y1; });
        gA.selectAll('text.ch1-xtick').data(xt).join('text').attr('class', 'ch1-tick ch1-xtick')
          .attr('x', function (d) { return x(d); }).attr('y', innerH + 20).attr('text-anchor', 'middle').text(function (d) { return d; });
        svgA.selectAll('text.ch1-ytitle').data([0]).join('text').attr('class', 'ch1-ytitle')
          .attr('x', 2).attr('y', 14).text('Index, 2011 = 100');
      }

      function renderA(animate) {
        if (!x) return;
        var mode = bus.get().mode;
        var dur = animate ? Viz.dur(450) : 0;
        var line = d3.line().x(function (d) { return x(d.year); }).y(function (d) { return y(d.v); });
        var shown = seriesFor(mode);
        var lines = seriesFor('counts').map(function (s) {
          var cur = shown.filter(function (t) { return t.key === s.key; })[0];
          return { key: s.key, cls: s.cls, ser: cur || null, hidden: !cur, fallback: s };
        });
        gA.selectAll('path.ch1-line').data(lines, function (d) { return d.key; }).join(function (enter) {
          return enter.append('path').attr('class', function (d) { return 'ch1-line ' + d.cls; })
            .attr('d', function (d) { return line(d.fallback.pts); });
        }).each(function (d) {
          d3.select(this).transition().duration(dur).attr('d', line(d.ser ? d.ser.pts : d.fallback.pts)).style('opacity', d.hidden ? 0 : 1);
        });
        gA.selectAll('circle.ch1-end').data(lines, function (d) { return d.key; })
          .join('circle').attr('class', function (d) { return 'ch1-end ' + d.cls; }).attr('r', 4)
          .each(function (d) {
            var p = d.ser ? d.ser.end : d.fallback.end;
            d3.select(this).transition().duration(dur).attr('cx', x(p.year)).attr('cy', y(p.v)).style('opacity', d.hidden ? 0 : 1);
          });

        /* direct labels at the right end, spread so none overlap */
        var lineH = 15, pad = wideA ? 4 : 6;
        var labs = shown.map(function (s) {
          var ll = labelLines(s, wideA, mode);
          return { key: s.key, cls: s.cls, lines: ll, y: y(s.end.v), h: ll.length * lineH + pad };
        }).sort(function (a, b) { return a.y - b.y; });
        for (var i = 1; i < labs.length; i++) {
          var min = labs[i - 1].y + (labs[i - 1].h + labs[i].h) / 2;
          if (labs[i].y < min) labs[i].y = min;
        }
        var ltop = labs.length ? labs[0].y - (labs[0].lines.length - 1) * lineH / 2 : 0;
        if (ltop < -4) { var shift = -4 - ltop; labs.forEach(function (l) { l.y += shift; }); }
        var tx = x(Y1) + 12;
        var lg = gA.selectAll('text.ch1-label').data(labs, function (d) { return d.key; });
        lg.exit().transition().duration(dur).style('opacity', 0).remove();
        var lg2 = lg.enter().append('text').attr('class', function (d) { return 'ch1-label ' + d.cls; })
          .attr('x', tx).attr('y', function (d) { return d.y; }).style('opacity', 0).merge(lg);
        lg2.attr('x', tx);
        lg2.each(function (d) {
          var t = d3.select(this);
          t.selectAll('tspan').remove();
          d.lines.forEach(function (ln, i) {
            t.append('tspan').attr('x', tx).attr('dy', i === 0 ? (-(d.lines.length - 1) * lineH / 2) + 'px' : lineH + 'px')
              .style('font-weight', i === d.lines.length - 1 ? 700 : 600).text(ln);
          });
          t.attr('dominant-baseline', 'central');
          t.transition().duration(dur).attr('y', d.y).style('opacity', 1);
        });

        buildHover();
        titleElA.textContent = titleA(mode);
        subElA.textContent = subA(mode);
        hostA.setAttribute('aria-label', describeA(mode, bus.get().year));
        showYear(bus.get().year);
      }

      /* ---------- selected year rule + hover/tap/keyboard ---------- */
      function buildHover() {
        hoverRule = gA.selectAll('line.ch1-hover').data([0]).join('line').attr('class', 'ch1-hover')
          .attr('y1', 0).attr('y2', innerH).style('opacity', 0);
        guide = gA.selectAll('line.ch1-guide').data([0]).join('line').attr('class', 'ch1-guide')
          .attr('y1', 0).attr('y2', innerH);
        gdots = gA.selectAll('circle.ch1-gdot').data(['hosp', 'pop', 'deaths'], function (d) { return d; })
          .join('circle').attr('class', function (d) { return 'ch1-gdot is-' + d; }).attr('r', 5);
        hit = gA.selectAll('rect.ch1-hit').data([0]).join('rect').attr('class', 'ch1-hit')
          .attr('x', 0).attr('y', 0).attr('width', innerW).attr('height', innerH)
          .attr('tabindex', 0).attr('role', 'group')
          .attr('aria-label', 'Year selector, selected year ' + bus.get().year + '. Left and right arrow keys change the year; Home and End jump to ' + Y0 + ' and ' + Y1 + '.');
        if (!hit.node().__wired) { hit.node().__wired = true; wireHover(hit.node()); }
      }
      function showYear(yr) {
        if (!guide) return;
        var gx = x(yr), mode = bus.get().mode;
        guide.attr('x1', gx).attr('x2', gx);
        var cur = {};
        seriesFor(mode).forEach(function (s) { cur[s.key] = s.pts.filter(function (p) { return p.year === yr; })[0]; });
        gdots.each(function (k) {
          var p = cur[k];
          d3.select(this).attr('cx', gx).attr('cy', p ? y(p.v) : 0).style('opacity', p ? 1 : 0);
        });
        if (hit) hit.attr('aria-label', 'Year selector, selected year ' + yr + '. Left and right arrow keys change the year; Home and End jump to ' + Y0 + ' and ' + Y1 + '.');
      }
      function yearAt(clientX) {
        var box = hit.node().getBoundingClientRect();
        return clampYear(Math.round(x.invert(clientX - box.left)));
      }
      function tipAt(yr, cx, cy) {
        var gx = x(yr), box = hit.node().getBoundingClientRect();
        if (cx == null) { cx = box.left + gx; cy = box.top + innerH * 0.35; }
        Viz.tooltip.show(tipHtml(rowOf(yr)), cx, cy, hit.node());
      }
      function wireHover(node) {
        node.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch') return;
          var yr = yearAt(e.clientX);
          hoverRule.attr('x1', x(yr)).attr('x2', x(yr)).style('opacity', yr === bus.get().year ? 0 : 0.35);
          tipAt(yr, e.clientX, e.clientY);
        });
        node.addEventListener('pointerleave', function () {
          hoverRule.style('opacity', 0);
          if (document.activeElement !== node) Viz.tooltip.hide();
          else tipAt(bus.get().year);
        });
        node.addEventListener('click', function (e) {
          var yr = yearAt(e.clientX);
          bus.set({ year: yr }, 'panel-a');
          tipAt(yr, e.clientX, e.clientY);
        });
        node.addEventListener('focus', function () { tipAt(bus.get().year); });
        node.addEventListener('blur', function () { Viz.tooltip.hide(); });
        node.addEventListener('keydown', function (e) {
          var cur = bus.get().year, yr;
          if (e.key === 'ArrowRight') yr = cur + 1;
          else if (e.key === 'ArrowLeft') yr = cur - 1;
          else if (e.key === 'Home') yr = Y0;
          else if (e.key === 'End') yr = Y1;
          else return;
          e.preventDefault();
          bus.set({ year: clampYear(yr) }, 'panel-a');
          tipAt(bus.get().year);
        });
      }

      /* ================================================= panel B ===== */
      var titleElB = panelB.querySelector('.panel-title');
      panelB.querySelector('.panel-sub').textContent = 'One square is one person \u00b7 the selected year, with every year below \u00b7 ' + Y0 + '\u2013' + Y1;
      hostB.innerHTML =
        '<div class="ch1-b-top">' +
        '<div class="ch1-stepper" role="group" aria-label="Choose a year">' +
        '<button type="button" class="ch1-step" data-step="-1" aria-label="Previous year">‹</button>' +
        '<output class="ch1-step-year" aria-live="off"></output>' +
        '<button type="button" class="ch1-step" data-step="1" aria-label="Next year">›</button></div>' +
        '<p class="ch1-legend"><span class="ch1-sw is-dark" aria-hidden="true"></span> 1 road death <span class="ch1-sep" aria-hidden="true">·</span> ' +
        '<span class="ch1-sw is-light" aria-hidden="true"></span> 1 person admitted</p></div>' +
        '<div class="ch1-units"></div>' +
        '<p class="ch1-caption"></p>' +
        '<p class="ch1-strip-title">Admissions per road death, each year (click a column)</p>' +
        '<div class="ch1-strip"></div>';
      var unitsEl = hostB.querySelector('.ch1-units'), capEl = hostB.querySelector('.ch1-caption');
      var stripEl = hostB.querySelector('.ch1-strip'), stepYearEl = hostB.querySelector('.ch1-step-year');
      var btnPrev = hostB.querySelector('[data-step="-1"]'), btnNext = hostB.querySelector('[data-step="1"]');
      btnPrev.addEventListener('click', function () { bus.set({ year: clampYear(bus.get().year - 1) }, 'panel-b'); });
      btnNext.addEventListener('click', function () { bus.set({ year: clampYear(bus.get().year + 1) }, 'panel-b'); });

      var maxUnits = d3.max(all, function (r) { return perDeath(r) + 1; });
      var widthB = 0, cellB = 20, colsB = 12, gapB = 5, unitSvg, stripSvg, firstUnits = true;

      function unitPos(i) {
        return { x: (i % colsB) * (cellB + gapB), y: Math.floor(i / colsB) * (cellB + gapB) };
      }
      function layoutB() {
        colsB = widthB >= 300 ? 12 : 9;
        gapB = widthB >= 400 ? 6 : 5;
        cellB = Math.max(14, Math.min(34, Math.floor((widthB - gapB * (colsB - 1)) / colsB)));
        var rows = Math.ceil(maxUnits / colsB);
        var h = rows * cellB + (rows - 1) * gapB + 2;
        unitSvg = d3.select(unitsEl).selectAll('svg').data([0]).join('svg')
          .attr('width', widthB).attr('height', h).attr('viewBox', '0 0 ' + widthB + ' ' + h)
          .attr('aria-hidden', 'true').attr('focusable', 'false');
        unitSvg.selectAll('g.u').data([0]).join('g').attr('class', 'u').attr('transform', 'translate(1,1)');
        drawStrip();
      }
      function renderUnits(animate) {
        if (!unitSvg) return;
        var n = perDeath(rowOf(bus.get().year)) + 1;
        var g = unitSvg.select('g.u');
        var dur = animate ? Viz.dur(350) : 0;
        var data = d3.range(n);
        var sel = g.selectAll('rect.ch1-unit').data(data, function (d) { return d; });
        sel.exit().transition().duration(dur).style('opacity', 0).remove();
        var ent = sel.enter().append('rect').attr('rx', 3).style('opacity', 0);
        var all2 = ent.merge(sel)
          .attr('class', function (d) { return 'ch1-unit ' + (d === 0 ? 'is-dark' : 'is-light'); })
          .attr('width', cellB).attr('height', cellB)
          .attr('x', function (d) { return unitPos(d).x; }).attr('y', function (d) { return unitPos(d).y; });
        if (firstUnits || !animate) all2.style('opacity', 1);
        else all2.transition().delay(function (d) { return ent.nodes().length ? Math.max(0, d - (n - ent.size())) * 10 : 0; })
          .duration(dur).style('opacity', 1);
        firstUnits = false;
      }
      function drawStrip() {
        var w = widthB, h = 92, mt = 20, mb = 22;
        var yr = bus.get().year;
        stripSvg = d3.select(stripEl).selectAll('svg').data([0]).join('svg')
          .attr('width', w).attr('height', h).attr('viewBox', '0 0 ' + w + ' ' + h)
          .attr('aria-hidden', 'true').attr('focusable', 'false');
        var sx = d3.scaleBand().domain(all.map(function (r) { return r.year; })).range([0, w]).paddingInner(0.22).paddingOuter(0.05);
        var sy = d3.scaleLinear().domain([0, d3.max(all, function (r) { return r.hosp_per_death; })]).range([h - mb, mt]);
        var cols = stripSvg.selectAll('g.ch1-col').data(all, function (d) { return d.year; }).join(function (e) {
          var g = e.append('g').attr('class', 'ch1-col');
          g.append('rect').attr('class', 'ch1-colhit');
          g.append('rect').attr('class', 'ch1-colbar');
          g.append('text').attr('class', 'ch1-colval').attr('text-anchor', 'middle');
          return g;
        });
        cols.attr('class', function (d) { return 'ch1-col' + (d.year === yr ? ' is-sel' : ''); })
          .on('click', function (e, d) { bus.set({ year: d.year }, 'panel-b'); })
          .on('pointermove', function (e, d) { Viz.tooltip.show('<strong>' + d.year + '</strong><br>' + perDeath(d) + ' admitted per road death', e.clientX, e.clientY, stripEl); })
          .on('pointerleave', function () { Viz.tooltip.hide(); });
        cols.select('rect.ch1-colhit').attr('x', function (d) { return sx(d.year) - sx.step() * 0.11; }).attr('width', sx.step()).attr('y', 0).attr('height', h);
        cols.select('rect.ch1-colbar').attr('x', function (d) { return sx(d.year); }).attr('width', sx.bandwidth())
          .attr('y', function (d) { return sy(d.hosp_per_death); }).attr('height', function (d) { return sy(0) - sy(d.hosp_per_death); }).attr('rx', 2);
        cols.select('text.ch1-colval').attr('x', function (d) { return sx(d.year) + sx.bandwidth() / 2; })
          .attr('y', function (d) { return sy(d.hosp_per_death) - 5; })
          .style('opacity', function (d) { return d.year === yr ? 1 : 0; }).text(function (d) { return perDeath(d); });
        var showAll = w >= 420;
        var labYears = all.map(function (r) { return r.year; }).filter(function (t) { return showAll ? (t - Y0) % 2 === 0 || t === Y1 : (t === Y0 || t === 2016 || t === Y1); });
        stripSvg.selectAll('text.ch1-colyear').data(labYears, function (d) { return d; }).join('text').attr('class', 'ch1-colyear')
          .attr('text-anchor', 'middle').attr('x', function (d) { return sx(d) + sx.bandwidth() / 2; }).attr('y', h - 5)
          .text(function (d) { return d; });
      }
      function updateB(animate) {
        var yr = bus.get().year;
        titleElB.textContent = titleB(yr);
        capEl.textContent = captionB(yr);
        stepYearEl.textContent = yr;
        btnPrev.disabled = yr <= Y0;
        btnNext.disabled = yr >= Y1;
        hostB.setAttribute('aria-label', describeB(yr));
        if (stripSvg) {
          stripSvg.selectAll('g.ch1-col').attr('class', function (d) { return 'ch1-col' + (d.year === yr ? ' is-sel' : ''); })
            .select('text.ch1-colval').style('opacity', function (d) { return d.year === yr ? 1 : 0; });
        }
        renderUnits(animate);
      }

      /* ================================================= tables ===== */
      (function tables() {
        var host = board.querySelector('.board-tables');
        if (!host) return;
        var tAEl = document.createElement('div'), tA2 = document.createElement('div'), tBEl = document.createElement('div');
        [tAEl, tA2, tBEl].forEach(function (e) { host.appendChild(e); });
        var rowsT = all.map(function (r) {
          return Object.assign({
            hi: r.hosp / base.hosp * 100, di: r.road_deaths / base.road_deaths * 100, pi: r.population / base.population * 100,
            hri: r.hosp_per_100k / base.hosp_per_100k * 100, dri: r.deaths_per_100k / base.deaths_per_100k * 100
          }, r);
        });
        var note = function (v) { return v || ''; };
        Viz.fillTable(tAEl, rowsT, [
          { key: 'year', label: 'Year' },
          { key: 'hosp', label: 'Hospitalised', format: Viz.fmt.int },
          { key: 'hi', label: 'Index', format: idx },
          { key: 'road_deaths', label: 'Road deaths', format: Viz.fmt.int },
          { key: 'di', label: 'Index', format: idx },
          { key: 'population', label: 'Population', format: Viz.fmt.int },
          { key: 'pi', label: 'Index', format: idx },
          { key: 'series_note', label: 'Series note', text: true, format: note }
        ], { caption: 'Panel A, counts view: counts and index (2011 = 100)' });
        Viz.fillTable(tA2, rowsT, [
          { key: 'year', label: 'Year' },
          { key: 'hosp_per_100k', label: 'Hospitalised per 100,000', format: Viz.fmt.dp1 },
          { key: 'hri', label: 'Index', format: idx },
          { key: 'deaths_per_100k', label: 'Road deaths per 100,000', format: rate2 },
          { key: 'dri', label: 'Index', format: idx }
        ], { caption: 'Panel A, per 100,000 view: rates and index (2011 = 100)' });
        Viz.fillTable(tBEl, all, [
          { key: 'year', label: 'Year' },
          { key: 'hosp', label: 'Admitted to hospital', format: Viz.fmt.int },
          { key: 'road_deaths', label: 'Road deaths', format: Viz.fmt.int },
          { key: 'hosp_per_death', label: 'Admitted per road death', format: Viz.fmt.dp1 }
        ], { caption: 'Panel B: people admitted after a road crash, road deaths, and admissions per death' });
      })();

      /* ================================================= link ===== */
      bus.on(function (state, changed, source) {
        if (changed.indexOf('mode') >= 0) {
          renderA(true);
          seg.set(state.mode, true);
        }
        if (changed.indexOf('year') >= 0) {
          showYear(state.year);
          hostA.setAttribute('aria-label', describeA(state.mode, state.year));
          updateB(source !== 'init');
          if (source === 'panel-b') Viz.flash(panelA);
          else if (source === 'panel-a') Viz.flash(panelB);
          if (source !== 'init') Viz.announce(state.year + ': ' + perDeath(rowOf(state.year)) + ' people admitted for every road death');
        }
        setChip();
      });

      Viz.responsive(hostA, function (w) { widthA = w; buildA(); renderA(false); });
      Viz.responsive(hostB, function (w) { widthB = w; layoutB(); updateB(false); });
      setChip();
    }
  };
})();
