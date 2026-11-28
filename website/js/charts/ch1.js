/* ch1.js: Chapter 1 figures (fig-1b lede unit chart, fig-1a indexed lines).
   OWNED BY THE CHAPTER 1 AGENT.
   Interface: window.Charts[id] = { init(el, data), update(state) }
   Data: ch1_trend (year, hosp, road_deaths, population, hosp_per_100k, deaths_per_100k,
         hosp_per_death, series_note). Indexes (2011 = 100) are computed here, for presentation only. */
(function () {
  'use strict';
  window.Charts = window.Charts || {};

  /* ---------------------------------------------------------------- facts */
  /* Extra prose numbers for Chapter 1, registered at load (before main.js runs fillProse). */
  (function registerFacts() {
    var F = window.Facts;
    if (!F || !F.register) return;
    function y(d, year) {
      var r = Viz.find(d.ch1_trend, { year: year });
      if (!r) throw new Error('no ch1_trend row for ' + year);
      return r;
    }
    var int = Viz.fmt.int;
    function pct(n) { return Viz.fmt.pct(Math.abs(n)); }
    F.register('c1_deaths_2011', function (d) { return int(y(d, 2011).road_deaths); });
    F.register('c1_deaths_fall_n', function (d) { return int(y(d, 2011).road_deaths - y(d, 2021).road_deaths); });
    F.register('c1_per_death_2011', function (d) { return int(y(d, 2011).hosp_per_death); });
    F.register('c1_pop_chg', function (d) { return pct((y(d, 2021).population / y(d, 2011).population - 1) * 100); });
    F.register('c1_death_rate_2011', function (d) { return Viz.fmt.dp(y(d, 2011).deaths_per_100k, 2); });
    F.register('c1_death_rate_2021', function (d) { return Viz.fmt.dp(y(d, 2021).deaths_per_100k, 2); });
    F.register('c1_death_rate_chg', function (d) {
      return pct((y(d, 2021).deaths_per_100k / y(d, 2011).deaths_per_100k - 1) * 100);
    });
  })();

  function sgn(n, dp) { return Viz.fmt.minus(Viz.fmt.signedPct(n, dp)); }   /* +16% / −11.5% with a true minus */
  function pctChange(a, b) { return (b / a - 1) * 100; }
  function rows(data) { return (data.ch1_trend || []).slice().sort(function (a, b) { return a.year - b.year; }); }

  /* =========================================================== fig-1b ===== */
  window.Charts['fig-1b'] = {
    init: function (el, data) {
      var all = rows(data);
      var r21 = all.filter(function (r) { return r.year === 2021; })[0];
      var r11 = all.filter(function (r) { return r.year === 2011; })[0];
      var host = el.querySelector('.fig-chart');
      if (!r21 || !host) return;

      var perDeath = Math.round(r21.hosp_per_death);
      var perDeath11 = r11 ? Math.round(r11.hosp_per_death) : null;
      host.setAttribute('aria-label',
        'Unit chart of ' + (perDeath + 1) + ' squares: in 2021, ' + Viz.fmt.int(r21.hosp) + ' people were admitted to hospital after road crashes and ' +
        Viz.fmt.int(r21.road_deaths) + ' people died on the roads, so one road death for every ' + perDeath +
        ' admissions' + (perDeath11 ? ' (' + perDeath11 + ' in 2011)' : '') + '. One square is solid and ' + perDeath + ' are outlined.');

      Viz.fillTable(el.querySelector('.fig-data'), all, [
        { key: 'year', label: 'Year' },
        { key: 'hosp', label: 'Admitted to hospital', format: Viz.fmt.int },
        { key: 'road_deaths', label: 'Road deaths', format: Viz.fmt.int },
        { key: 'hosp_per_death', label: 'Admitted per road death', format: Viz.fmt.dp1 }
      ], { caption: 'People admitted to hospital after a road crash, road deaths, and admissions per death' });

      var firstDraw = true;
      Viz.responsive(host, function (w) {
        var cols = w >= 520 ? 18 : 9;
        var n = perDeath + 1;
        var nRows = Math.ceil(n / cols);
        var gap = w >= 520 ? 6 : 5;
        var cell = Math.min(40, Math.floor((w - gap * (cols - 1)) / cols));
        var gridW = cols * cell + (cols - 1) * gap;
        var x0 = 0;
        var top = 26, bottom = 30;
        var h = top + nRows * cell + (nRows - 1) * gap + bottom;

        var svg = d3.select(host).selectAll('svg').data([0]).join('svg')
          .attr('width', w).attr('height', h).attr('viewBox', '0 0 ' + w + ' ' + h)
          .attr('aria-hidden', 'true').attr('focusable', 'false');
        svg.selectAll('*').remove();

        var units = d3.range(n).map(function (i) {
          return { i: i, dark: i === 0, x: x0 + (i % cols) * (cell + gap), y: top + Math.floor(i / cols) * (cell + gap) };
        });

        /* annotation for the dark unit */
        svg.append('text').attr('class', 'ch1-unit-label').attr('x', x0).attr('y', 14)
          .style('font-size', '13px').style('font-weight', 700).text('1 road death');
        svg.append('line').attr('class', 'ch1-unit-leader').attr('x1', x0 + cell / 2).attr('x2', x0 + cell / 2)
          .attr('y1', 18).attr('y2', top - 2);

        var rects = svg.selectAll('rect.ch1-unit').data(units).join('rect')
          .attr('class', function (d) { return 'ch1-unit ' + (d.dark ? 'is-dark' : 'is-light'); })
          .attr('x', function (d) { return d.x; }).attr('y', function (d) { return d.y; })
          .attr('width', cell).attr('height', cell).attr('rx', 3);

        if (firstDraw && !Viz.reducedMotion()) {
          rects.style('opacity', 0)
            .transition().delay(function (d) { return 80 + d.i * 12; }).duration(Viz.dur(300))
            .style('opacity', 1);
        }
        firstDraw = false;

        /* bottom label: swatch + text */
        var by = top + nRows * cell + (nRows - 1) * gap + 20;
        svg.append('rect').attr('class', 'ch1-unit is-light').attr('x', x0).attr('y', by - 11)
          .attr('width', 12).attr('height', 12).attr('rx', 2);
        svg.append('text').attr('class', 'ch1-unit-label').attr('x', x0 + 18).attr('y', by)
          .style('font-size', '13px').style('font-weight', 700)
          .text(perDeath + ' people admitted to hospital (2021)');
        svg.attr('width', Math.max(w, gridW));
      });
    },
    update: function () {}
  };

  /* =========================================================== fig-1a ===== */
  var SERIES = {
    counts: [
      { key: 'hosp', name: 'Hospitalised', field: 'hosp', cls: 'is-hosp', unit: 'people' },
      { key: 'pop', name: 'Population', field: 'population', cls: 'is-pop', unit: 'people' },
      { key: 'deaths', name: 'Road deaths', field: 'road_deaths', cls: 'is-deaths', unit: 'deaths' }
    ],
    per100k: [
      { key: 'hosp', name: 'Hospitalised', field: 'hosp_per_100k', cls: 'is-hosp' },
      { key: 'deaths', name: 'Road deaths', field: 'deaths_per_100k', cls: 'is-deaths' }
    ]
  };

  window.Charts['fig-1a'] = {
    init: function (el, data) {
      var all = rows(data);
      var base = all.filter(function (r) { return r.year === 2011; })[0];
      var last = all[all.length - 1];
      var host = el.querySelector('.fig-chart');
      if (!base || !last || !host) return;
      var modeNote = el.querySelector('.ch1-modenote');

      var state = { mode: 'counts', year: null };
      var width = 0, svg, tl = {}, hasDrawn = false;

      function indexed(field) {
        return all.map(function (r) { return { year: r.year, v: r[field] / base[field] * 100, raw: r[field], row: r }; });
      }
      function seriesFor(mode) {
        return SERIES[mode].map(function (s) {
          var pts = indexed(s.field);
          return { key: s.key, name: s.name, cls: s.cls, field: s.field, pts: pts, end: pts[pts.length - 1], start: pts[0] };
        });
      }

      /* ---------- aria summary + table + notes (per mode) ---------- */
      function describe() {
        var hp = pctChange(base.hosp, last.hosp), dp = pctChange(base.road_deaths, last.road_deaths);
        var pp = pctChange(base.population, last.population);
        if (state.mode === 'counts') {
          return 'Indexed lines, 2011 = 100, to ' + last.year + ': hospitalisations rose ' + Viz.fmt.dp(hp, 0) + '% to ' + Viz.fmt.int(last.hosp) +
            ', population rose ' + Viz.fmt.dp(pp, 0) + '%, and road deaths fell ' + Viz.fmt.dp(Math.abs(dp), 1) + '% to ' + Viz.fmt.int(last.road_deaths) + '.';
        }
        var hr = pctChange(base.hosp_per_100k, last.hosp_per_100k), dr = pctChange(base.deaths_per_100k, last.deaths_per_100k);
        return 'Indexed lines per 100,000 people, 2011 = 100, to ' + last.year + ': the hospitalisation rate is nearly flat (' +
          Viz.fmt.dp(base.hosp_per_100k, 1) + ' to ' + Viz.fmt.dp(last.hosp_per_100k, 1) + ', ' + (hr >= 0 ? 'up ' : 'down ') + Viz.fmt.dp(Math.abs(hr), 1) +
          '%) while the road death rate fell ' + Viz.fmt.dp(Math.abs(dr), 0) + '% (' + Viz.fmt.dp(base.deaths_per_100k, 2) + ' to ' + Viz.fmt.dp(last.deaths_per_100k, 2) + ').';
      }
      function idx(v) { return Viz.fmt.dp(v, 1); }
      function fillTable() {
        var note = function (v) { return v || ''; };
        var cols;
        if (state.mode === 'counts') {
          cols = [
            { key: 'year', label: 'Year' },
            { key: 'hosp', label: 'Hospitalised', format: Viz.fmt.int },
            { key: 'hi', label: 'Index', format: idx },
            { key: 'road_deaths', label: 'Road deaths', format: Viz.fmt.int },
            { key: 'di', label: 'Index', format: idx },
            { key: 'population', label: 'Population', format: Viz.fmt.int },
            { key: 'pi', label: 'Index', format: idx },
            { key: 'series_note', label: 'Series note', text: true, format: note }
          ];
        } else {
          cols = [
            { key: 'year', label: 'Year' },
            { key: 'hosp_per_100k', label: 'Hospitalised per 100,000', format: Viz.fmt.dp1 },
            { key: 'hri', label: 'Index', format: idx },
            { key: 'deaths_per_100k', label: 'Road deaths per 100,000', format: function (v) { return Viz.fmt.dp(v, 2); } },
            { key: 'dri', label: 'Index', format: idx },
            { key: 'series_note', label: 'Series note', text: true, format: note }
          ];
        }
        var tr = all.map(function (r) {
          return Object.assign({
            hi: r.hosp / base.hosp * 100, di: r.road_deaths / base.road_deaths * 100, pi: r.population / base.population * 100,
            hri: r.hosp_per_100k / base.hosp_per_100k * 100, dri: r.deaths_per_100k / base.deaths_per_100k * 100
          }, r);
        });
        Viz.fillTable(el.querySelector('.fig-data'), tr, cols, {
          caption: state.mode === 'counts' ? 'Counts and index (2011 = 100)' : 'Rates per 100,000 people and index (2011 = 100)'
        });
      }
      function refreshText() {
        host.setAttribute('aria-label', describe());
        if (modeNote) {
          modeNote.textContent = state.mode === 'counts'
            ? 'Each line is divided by its 2011 value, then multiplied by 100.'
            : 'Each rate is divided by its 2011 value, then multiplied by 100. The population line is hidden: per person it is 100 by definition.';
        }
        fillTable();
      }

      /* ---------- tooltip html ---------- */
      function tipHtml(r) {
        var out = '<strong>' + r.year + '</strong>';
        if (r.series_note) out += ' <span style="opacity:.8">(' + r.series_note + ')</span>';
        if (state.mode === 'counts') {
          out += '<br>Hospitalised: ' + Viz.fmt.int(r.hosp) + ' (index ' + idx(r.hosp / base.hosp * 100) + ')' +
            '<br>Road deaths: ' + Viz.fmt.int(r.road_deaths) + ' (index ' + idx(r.road_deaths / base.road_deaths * 100) + ')' +
            '<br>Population: ' + Viz.fmt.int(r.population) + ' (index ' + idx(r.population / base.population * 100) + ')';
        } else {
          out += '<br>Hospitalised: ' + Viz.fmt.dp(r.hosp_per_100k, 1) + ' per 100,000 (index ' + idx(r.hosp_per_100k / base.hosp_per_100k * 100) + ')' +
            '<br>Road deaths: ' + Viz.fmt.dp(r.deaths_per_100k, 2) + ' per 100,000 (index ' + idx(r.deaths_per_100k / base.deaths_per_100k * 100) + ')';
        }
        return out;
      }

      /* ---------- draw ---------- */
      var m = { top: 44, right: 100, bottom: 30, left: 36 };
      var x, y, innerW, innerH;
      var sel = {};

      function labelLines(s, wide) {
        var chg = pctChange(s.start.raw, s.end.raw);
        var val = sgn(chg, Math.abs(chg) < 12 && s.key === 'deaths' && state.mode === 'counts' ? 1 : (Math.abs(chg) < 5 ? 1 : 0));
        return wide ? [s.name + ' ' + val] : [s.name, val];
      }

      function build() {
        var wide = width >= 640;
        var h = Viz.height(width, { ratio: 0.62, min: wide ? 300 : 340, max: 460 });
        m.right = wide ? 176 : 92;
        m.left = wide ? 44 : 36;
        innerW = Math.max(120, width - m.left - m.right);
        innerH = h - m.top - m.bottom;

        x = d3.scaleLinear().domain([all[0].year, last.year]).range([0, innerW]);
        y = d3.scaleLinear().domain([70, 120]).range([innerH, 0]);

        svg = d3.select(host).selectAll('svg.ch1-svg').data([0]).join('svg').attr('class', 'ch1-svg')
          .attr('width', width).attr('height', h).attr('viewBox', '0 0 ' + width + ' ' + h)
          .attr('aria-hidden', 'true').attr('focusable', 'false');
        var g = svg.selectAll('g.plot').data([0]).join('g').attr('class', 'plot')
          .attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        sel.g = g;

        /* bands (2011 before Vic change; 2017+ after NSW change, from series_note) */
        var half = x(all[0].year + 1) - x(all[0].year);
        var bands = [];
        var vic = all.filter(function (r) { return /before/i.test(r.series_note || ''); });
        var nsw = all.filter(function (r) { return /after nsw/i.test(r.series_note || ''); });
        if (vic.length) bands.push({ id: 'vic', x0: x(vic[0].year), x1: x(vic[vic.length - 1].year) + half / 2, label: 'Before Vic change' });
        if (nsw.length) bands.push({ id: 'nsw', x0: x(nsw[0].year) - half / 2, x1: x(nsw[nsw.length - 1].year), label: 'After NSW change' });
        g.selectAll('rect.ch1-band').data(bands, function (d) { return d.id; }).join('rect')
          .attr('class', 'ch1-band').attr('x', function (d) { return d.x0; }).attr('width', function (d) { return d.x1 - d.x0; })
          .attr('y', 0).attr('height', innerH);
        g.selectAll('text.ch1-band-label').data(bands, function (d) { return d.id; }).join('text')
          .attr('class', 'ch1-band-label').attr('x', function (d) { return d.x0 + 2; }).attr('y', -8)
          .text(function (d) { return d.label; });

        /* axes */
        var ticks = d3.range(70, 121, 10);
        g.selectAll('line.ch1-grid').data(ticks).join('line')
          .attr('class', function (d) { return 'ch1-grid' + (d === 100 ? ' is-base' : ''); })
          .attr('x1', 0).attr('x2', innerW).attr('y1', function (d) { return y(d); }).attr('y2', function (d) { return y(d); });
        g.selectAll('text.ch1-ytick').data(ticks).join('text').attr('class', 'ch1-tick ch1-ytick')
          .attr('x', -8).attr('y', function (d) { return y(d); }).attr('dy', '0.32em').attr('text-anchor', 'end').text(function (d) { return d; });
        var xt = width >= 640 ? d3.range(2011, 2022, 2) : [2011, 2016, 2021];
        xt = xt.filter(function (t) { return t >= all[0].year && t <= last.year; });
        g.selectAll('text.ch1-xtick').data(xt).join('text').attr('class', 'ch1-tick ch1-xtick')
          .attr('x', function (d) { return x(d); }).attr('y', innerH + 20).attr('text-anchor', 'middle').text(function (d) { return d; });
        svg.selectAll('text.ch1-ytitle').data([0]).join('text').attr('class', 'ch1-ytitle')
          .attr('x', 2).attr('y', 14).text('Index, 2011 = 100');
        sel.wide = wide;
      }

      function render(animate) {
        if (!x) return;
        var g = sel.g;
        var mode = state.mode;
        var dur = animate ? Viz.dur(450) : 0;
        var line = d3.line().x(function (d) { return x(d.year); }).y(function (d) { return y(d.v); });

        var shown = seriesFor(mode);
        /* lines: keep all three keys, hide population in per-100k */
        var allKeys = seriesFor('counts');
        var lines = allKeys.map(function (s) {
          var cur = shown.filter(function (t) { return t.key === s.key; })[0];
          return { key: s.key, cls: s.cls, name: s.name, ser: cur || null, hidden: !cur, fallback: s };
        });

        var paths = g.selectAll('path.ch1-line').data(lines, function (d) { return d.key; });
        paths = paths.join(function (enter) {
          return enter.append('path').attr('class', function (d) { return 'ch1-line ' + d.cls; })
            .attr('d', function (d) { return line(d.fallback.pts); });
        });
        paths.each(function (d) {
          var p = d3.select(this);
          var target = d.ser ? d.ser.pts : d.fallback.pts;
          p.transition().duration(dur).attr('d', line(target)).style('opacity', d.hidden ? 0 : 1);
        });

        /* end markers */
        var dots = g.selectAll('circle.ch1-end').data(lines, function (d) { return d.key; })
          .join('circle').attr('class', function (d) { return 'ch1-end ' + d.cls; }).attr('r', 4);
        dots.each(function (d) {
          var tpts = d.ser ? d.ser.end : d.fallback.end;
          d3.select(this).transition().duration(dur).attr('cx', x(tpts.year)).attr('cy', y(tpts.v)).style('opacity', d.hidden ? 0 : 1);
        });

        /* direct labels at the right end, spread apart so none overlap */
        var wide = sel.wide, lineH = 15, pad = wide ? 4 : 6;
        var labs = shown.map(function (s) {
          var ll = labelLines(s, wide);
          return { key: s.key, cls: s.cls, lines: ll, y: y(s.end.v), h: ll.length * lineH + pad };
        }).sort(function (a, b) { return a.y - b.y; });
        for (var i = 1; i < labs.length; i++) {
          var min = labs[i - 1].y + (labs[i - 1].h + labs[i].h) / 2;
          if (labs[i].y < min) labs[i].y = min;
        }
        var ltop = labs.length ? labs[0].y - (labs[0].lines.length - 1) * lineH / 2 : 0;
        if (ltop < -4) { var shift = -4 - ltop; labs.forEach(function (l) { l.y += shift; }); }
        var tx = x(last.year) + 12;
        var lg = g.selectAll('text.ch1-label').data(labs, function (d) { return d.key; });
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

        /* line-style key hint is carried by the label text; hover layer */
        buildHover();
        refreshText();
        if (state.year != null) showYear(state.year, false);
      }

      /* ---------- hover / tap / keyboard ---------- */
      var hit, guide, gdots, tipOwnerEl;
      function buildHover() {
        var g = sel.g;
        guide = g.selectAll('line.ch1-guide').data([0]).join('line').attr('class', 'ch1-guide')
          .attr('y1', 0).attr('y2', innerH).style('opacity', 0);
        gdots = g.selectAll('circle.ch1-gdot').data(seriesFor('counts').map(function (s) { return s.key; }), function (d) { return d; })
          .join('circle').attr('class', function (d) { return 'ch1-gdot is-' + (d === 'hosp' ? 'hosp' : d === 'pop' ? 'pop' : 'deaths'); })
          .attr('r', 5).style('opacity', 0);
        hit = g.selectAll('rect.ch1-hit').data([0]).join('rect').attr('class', 'ch1-hit')
          .attr('x', 0).attr('y', 0).attr('width', innerW).attr('height', innerH)
          .attr('tabindex', 0).attr('role', 'group')
          .attr('aria-label', 'Year read-out. Use the left and right arrow keys to move between years.');
        tipOwnerEl = hit.node();
        if (!hit.node().__ch1Wired) {
          hit.node().__ch1Wired = true;
          wireHover(hit.node());
        }
      }
      function yearAt(clientX) {
        var box = hit.node().getBoundingClientRect();
        var yr = Math.round(x.invert(clientX - box.left));
        return Math.max(all[0].year, Math.min(last.year, yr));
      }
      function rowOf(yr) { return all.filter(function (r) { return r.year === yr; })[0]; }
      function showYear(yr, openTip, cx, cy) {
        state.year = yr;
        var r = rowOf(yr);
        if (!r) return;
        var gx = x(yr);
        guide.attr('x1', gx).attr('x2', gx).style('opacity', 1);
        var cur = {};
        seriesFor(state.mode).forEach(function (s) { cur[s.key] = s.pts.filter(function (p) { return p.year === yr; })[0]; });
        gdots.each(function (k) {
          var p = cur[k];
          d3.select(this).attr('cx', gx).attr('cy', p ? y(p.v) : 0).style('opacity', p ? 1 : 0);
        });
        if (openTip) {
          if (cx == null) {
            var box = hit.node().getBoundingClientRect();
            cx = box.left + gx; cy = box.top + innerH * 0.35;
          }
          Viz.tooltip.show(tipHtml(r), cx, cy, hit.node());
        }
      }
      function clearYear() {
        state.year = null;
        guide.style('opacity', 0); gdots.style('opacity', 0);
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
        node.addEventListener('focus', function () {
          var yr = state.year != null ? state.year : last.year;
          showYear(yr, true);
        });
        node.addEventListener('blur', function () { clearYear(); });
        node.addEventListener('keydown', function (e) {
          var step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? 'home' : e.key === 'End' ? 'end' : 0;
          if (!step) return;
          e.preventDefault();
          var yr = state.year != null ? state.year : last.year;
          if (step === 'home') yr = all[0].year; else if (step === 'end') yr = last.year; else yr += step;
          yr = Math.max(all[0].year, Math.min(last.year, yr));
          showYear(yr, true);
          var r = rowOf(yr);
          Viz.announce(tipHtml(r).replace(/<br>/g, '. ').replace(/<[^>]+>/g, ''));
        });
      }

      /* ---------- wire up ---------- */
      var ctl = el.querySelector('.fig-controls');
      if (ctl) {
        Viz.segmented(ctl, {
          onChange: function (v) { state.mode = v; render(true); }
        });
        var pressed = ctl.querySelector('button[aria-pressed="true"]');
        if (pressed) state.mode = pressed.getAttribute('data-value');
      }

      Viz.responsive(host, function (w) {
        width = w;
        build();
        render(false);
        hasDrawn = true;
      });
      host.__fig1a = { setMode: function (v) { state.mode = v; render(true); } };
    },
    update: function (state) {
      /* optional external state: { mode: 'counts' | 'per100k' } */
      var host = document.querySelector('#fig-1a .fig-chart');
      if (state && state.mode && host && host.__fig1a) host.__fig1a.setMode(state.mode);
    }
  };
})();
