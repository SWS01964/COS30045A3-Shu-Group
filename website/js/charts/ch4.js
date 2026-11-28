/* ch4.js: Chapter 4 figures (fig-4a, fig-4b, fig-4c, fig-4d). OWNED BY THE CHAPTER 4 AGENT.
   fig-4a  monthly line, 2020 vs 2019 vs 2015-19 band; All road users <-> Cyclists; month read-out
   fig-4b  diverging bars, April 2020 vs April 2019 by road user
   fig-4c  annual cyclist admissions with the 2011-19 compound-growth trend carried to 2020
   fig-4d  cyclists by state, Jul-Dec (or Jan-Jun) 2020 vs 2019
   New data-fill key (registered below): c4_cyc_one_in. */
(function () {
  'use strict';
  window.Charts = window.Charts || {};
  var fmt = Viz.fmt;
  var MINUS = '−';
  var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function N(v) { return fmt.int(v); }
  function sp(v, dp) { return fmt.minus(fmt.signedPct(v, dp || 0)); }   /* "+16%" / "−32%" */
  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var find = Viz.find;
  function monthly(data, user) {
    return data.ch4_monthly.filter(function (r) { return r.road_user === user && r.month !== 'Year'; })
      .sort(function (a, b) { return a.month_num - b.month_num; });
  }
  function svgIn(host, w, h) { return Viz.svg(host, w, h, { reuse: true, hidden: true, clear: true }); }
  function fadeIn(sel, on) {
    if (!on || !Viz.dur()) return;
    sel.style('opacity', 0).transition().duration(Viz.dur()).style('opacity', 1);
  }

  /* ---------------------------------------------------------- prose numbers */
  if (window.Facts && Facts.register) {
    /* cyclists as a share of all admissions over 2011-21 -> "1 in N" */
    Facts.register('c4_cyc_one_in', function (d) {
      var all = 0, cyc = 0;
      d.ch4_monthly.forEach(function (r) {
        if (r.month === 'Year') return;
        var s = 0;
        for (var y = 2011; y <= 2021; y++) s += r[y];
        if (r.road_user === 'All road users') all += s;
        else if (r.road_user === 'Pedal cyclist') cyc += s;
      });
      return String(Math.round(all / cyc));
    });
  }

  /* =================================================================== 4A */
  window.Charts['fig-4a'] = {
    init: function (el, data) {
      var chart = el.querySelector('.fig-chart');
      var titleEl = el.querySelector('.fig-title');
      var segEl = el.querySelector('.fig-controls');
      var axisNote = el.querySelector('.c4-axis');
      var VIEWS = {
        all: {
          user: 'All road users', accent: 'var(--fall)', ymax: 4000, ystep: 1000, def: 4,
          title: 'April 2020: a third fewer crash admissions',
          yLabel: 'Admissions a month'
        },
        cyc: {
          user: 'Pedal cyclist', accent: 'var(--rise)', ymax: 1000, ystep: 200, def: 6,
          title: 'Cyclists: every month from April above the previous five years',
          yLabel: 'Cyclist admissions a month'
        }
      };
      /* the title/annotation claim "a third fewer" and "lowest month of 2011-2021"; warn (as facts.js does) if the data stops saying so */
      (function () {
        var all = data.ch4_monthly.filter(function (r) { return r.road_user === 'All road users' && r.month !== 'Year'; });
        var apr = find(all, { month: 'April' });
        var low = d3.min(all, function (r) { var m = Infinity; for (var y = 2011; y <= 2021; y++) m = Math.min(m, r[y]); return m; });
        if (!apr || apr[2020] !== low) console.warn('[ch4] fig-4a says April 2020 is the lowest month of 2011-2021, but the data disagrees');
        var f = apr ? -apr.pct_2020_vs_2019 / 100 : 0;
        if (!(f >= 0.30 && f <= 0.36)) console.warn('[ch4] fig-4a title says "a third fewer" but April 2020 is ' + (f * 100).toFixed(1) + '% below April 2019');
        var cyc = monthly(data, 'Pedal cyclist').filter(function (r) { return r.month_num >= 4; });
        if (!cyc.every(function (r) { return r[2020] > r.base_max; })) console.warn('[ch4] fig-4a cyclist title says every month from April is above the previous five years, but it is not');
      })();
      var view = 'all', sel = null, hover = null, animate = false;
      var ui = {};

      /* ---- legend (HTML, above the chart) ---- */
      var key = mk('div', 'c4-key');
      key.setAttribute('aria-hidden', 'true');
      key.innerHTML =
        '<span class="c4-k"><i class="k-line k-2020"></i>2020</span>' +
        '<span class="c4-k"><i class="k-line k-2019"></i>2019</span>' +
        '<span class="c4-k"><i class="k-line k-mean"></i>2015–19 average</span>' +
        '<span class="c4-k"><i class="k-band"></i>2015–19 range</span>';
      chart.parentNode.insertBefore(key, chart);

      /* ---- month read-out + slider (below the chart) ---- */
      var panel = mk('div', 'c4-readout');
      var lab = mk('label', 'c4-slider');
      lab.appendChild(mk('span', 'c4-slider-l', 'Month'));
      var slider = mk('input');
      slider.type = 'range'; slider.min = 1; slider.max = 12; slider.step = 1; slider.value = 4;
      slider.setAttribute('aria-label', 'Choose a month to read its figures');
      lab.appendChild(slider);
      var readout = mk('p', 'c4-readout-text');
      panel.appendChild(lab);
      panel.appendChild(readout);
      chart.parentNode.insertBefore(panel, chart.nextSibling);

      function current() { return hover != null ? hover : (sel != null ? sel : VIEWS[view].def); }

      function readoutHtml(m) {
        var r = ui.rows[m - 1];
        var pct = r.pct_2020_vs_2019;
        return '<strong class="c4-r-month">' + Viz.MONTHS[m - 1] + '</strong>' +
          '<span class="c4-r-item"><span class="c4-r-k">2020</span> <strong>' + N(r[2020]) + '</strong></span>' +
          '<span class="c4-r-item"><span class="c4-r-k">2019</span> ' + N(r[2019]) + '</span>' +
          '<span class="c4-r-item"><span class="c4-r-k">2015–19 range</span> ' + N(r.base_min) + '–' + N(r.base_max) +
          ' (average ' + N(r.base_mean) + ')</span>' +
          '<span class="c4-r-item"><span class="c4-r-k">2020 vs 2019</span> ' + sp(pct, 1) + '</span>';
      }
      function readoutText(m) {
        var r = ui.rows[m - 1];
        return Viz.MONTHS[m - 1] + ': 2020 ' + N(r[2020]) + '; 2019 ' + N(r[2019]) + '; 2015 to 2019 range ' +
          N(r.base_min) + ' to ' + N(r.base_max) + ', average ' + N(r.base_mean) + '.';
      }
      function setMonth() {
        var m = current();
        if (!ui.x) return;
        var r = ui.rows[m - 1], cx = ui.x(m);
        ui.guide.attr('transform', 'translate(' + cx + ',0)');
        ui.dot20.attr('cy', ui.y(r[2020]));
        ui.dot19.attr('cy', ui.y(r[2019]));
        ui.ticks.classed('is-sel', function (d) { return d === m; });
        readout.innerHTML = readoutHtml(m);
        slider.value = m;
        slider.setAttribute('aria-valuetext', readoutText(m));
      }

      function table() {
        var u = VIEWS[view].user;
        Viz.fillTable(el.querySelector('.fig-data'), monthly(data, u), [
          { key: 'month', label: 'Month', text: true },
          { key: '2019', label: '2019', format: N },
          { key: '2020', label: '2020', format: N },
          { key: 'pct_2020_vs_2019', label: '2020 vs 2019', format: function (v) { return sp(v, 1); } },
          { key: 'base_min', label: '2015–19 min', format: N },
          { key: 'base_mean', label: '2015–19 average', format: Viz.fmt.dp1 },
          { key: 'base_max', label: '2015–19 max', format: N }
        ], { caption: u === 'Pedal cyclist' ? 'Cyclist admissions by month' : 'All road users: admissions by month' });
      }

      function summary() {
        var rows = monthly(data, VIEWS[view].user), u = view;
        var apr = rows[3], jun = rows[5], dec = rows[11];
        if (u === 'all') {
          var low = d3.min(data.ch4_monthly.filter(function (r) { return r.road_user === 'All road users' && r.month !== 'Year'; }),
            function (r) { var m = Infinity; for (var y = 2011; y <= 2021; y++) m = Math.min(m, r[y]); return m; });
          return 'Monthly line chart of all road-crash admissions in 2020 against 2019 and the 2015 to 2019 range. April 2020 had ' +
            N(apr[2020]) + ' admissions, ' + fmt.dp(Math.abs(apr.pct_2020_vs_2019), 0) + ' per cent fewer than April 2019' +
            (apr[2020] === low ? ' and the lowest month of 2011 to 2021' : '') + '. By December 2020 admissions were ' +
            (dec[2020] > dec[2019] ? 'above' : 'below') + ' December 2019 (' + N(dec[2020]) + ' against ' + N(dec[2019]) + ').';
        }
        var n = 0, tot = 0;
        rows.forEach(function (r) { if (r.month_num >= 4) { tot++; if (r[2020] > r.base_max) n++; } });
        return 'Monthly line chart of cyclist admissions in 2020 against 2019 and the 2015 to 2019 range, on its own scale. ' +
          'In ' + n + ' of ' + tot + ' months from April to December 2020, admissions were above the highest of 2015 to 2019. June 2020 had ' +
          N(jun[2020]) + ' against ' + N(jun[2019]) + ' in June 2019.';
      }

      function draw(w) {
        var V = VIEWS[view];
        var rows = monthly(data, V.user);
        var narrow = w < 480;
        var m = { top: 26, right: narrow ? 40 : 52, bottom: 28, left: narrow ? 44 : 50 };
        var h = Viz.height(w, { ratio: 0.5, min: 280, max: 420 });
        var iw = w - m.left - m.right, ih = h - m.top - m.bottom;
        var x = d3.scalePoint().domain(d3.range(1, 13)).range([0, iw]).padding(0.3);
        var y = d3.scaleLinear().domain([0, V.ymax]).range([ih, 0]);
        var svg = svgIn(chart, w, h);
        fadeIn(svg, animate);
        var g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

        /* y axis (from zero) */
        var yt = d3.range(0, V.ymax + 1, V.ystep);
        var gy = g.append('g').attr('class', 'axis');
        yt.forEach(function (t) {
          gy.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y(t)).attr('y2', y(t))
            .attr('class', t === 0 ? 'c4-zero' : 'c4-grid');
          gy.append('text').attr('x', -8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').text(N(t));
        });
        g.append('text').attr('class', 'c4-ylab').attr('x', -m.left + 2).attr('y', -12).text(V.yLabel);

        /* x axis */
        var step = x.step();
        var every = step >= 36 ? 1 : 2;
        var xt = g.append('g').attr('class', 'axis c4-xaxis');
        ui.ticks = xt.selectAll('text').data(d3.range(1, 13)).join('text')
          .attr('x', function (d) { return x(d); }).attr('y', ih + 20).attr('text-anchor', 'middle')
          .style('display', function (d) { return (d - 1) % every === 0 || d === current() ? null : 'none'; })
          .text(function (d) { return MON3[d - 1]; });
        if (every > 1) ui.ticks.style('display', function (d) { return (d - 1) % every === 0 ? null : 'none'; });
        xt.selectAll('line.tk').data(d3.range(1, 13)).join('line').attr('class', 'tk')
          .attr('x1', function (d) { return x(d); }).attr('x2', function (d) { return x(d); })
          .attr('y1', ih).attr('y2', ih + 4);

        /* 2015-19 band + average */
        g.append('path').attr('class', 'c4-band')
          .attr('d', d3.area().x(function (r) { return x(r.month_num); })
            .y0(function (r) { return y(r.base_min); }).y1(function (r) { return y(r.base_max); })(rows));
        var line = function (k) { return d3.line().x(function (r) { return x(r.month_num); }).y(function (r) { return y(r[k]); })(rows); };
        g.append('path').attr('class', 'c4-mean').attr('d', line('base_mean'));
        g.append('path').attr('class', 'c4-l19').attr('d', line(2019));
        g.append('path').attr('class', 'c4-l20').attr('d', line(2020)).style('stroke', V.accent);
        g.selectAll('circle.c4-pt').data(rows).join('circle').attr('class', 'c4-pt')
          .attr('cx', function (r) { return x(r.month_num); }).attr('cy', function (r) { return y(r[2020]); })
          .attr('r', 2.5).style('fill', V.accent);

        /* end labels */
        var dec = rows[11];
        var y20 = y(dec[2020]), y19 = y(dec[2019]);
        if (Math.abs(y20 - y19) < 15) {
          var mid = (y20 + y19) / 2, up = y20 < y19;
          y20 = mid + (up ? -8 : 8); y19 = mid + (up ? 8 : -8);
        }
        g.append('text').attr('class', 'c4-end c4-end20').attr('x', iw + 8).attr('y', y20).attr('dy', '0.32em')
          .style('fill', V.accent).text('2020');
        g.append('text').attr('class', 'c4-end c4-end19').attr('x', iw + 8).attr('y', y19).attr('dy', '0.32em').text('2019');

        /* annotation */
        var ann = g.append('g').attr('class', 'c4-ann');
        if (view === 'all') {
          var a = rows[3], ax = x(4), ay = y(a[2020]);
          ann.append('circle').attr('cx', ax).attr('cy', ay).attr('r', 6).attr('class', 'c4-ring');
          var t1 = ann.append('text').attr('class', 'c4-halo c4-ann-b').attr('x', ax - 4).attr('y', ay + 26);
          t1.text(N(a[2020]) + ': lowest month');
          ann.append('text').attr('class', 'c4-halo c4-ann-t').attr('x', ax - 4).attr('y', ay + 41).text('of 2011–2021');
        } else {
          var j = rows[5], jx = x(6), jy = y(j[2020]);
          ann.append('line').attr('class', 'c4-lead').attr('x1', jx).attr('x2', jx).attr('y1', 30).attr('y2', jy - 7);
          ann.append('circle').attr('cx', jx).attr('cy', jy).attr('r', 6).attr('class', 'c4-ring');
          ann.append('text').attr('class', 'c4-halo c4-ann-b').attr('text-anchor', 'middle').attr('x', jx).attr('y', 10)
            .text(N(j[2020]) + ', up from ' + N(j[2019]));
          ann.append('text').attr('class', 'c4-halo c4-ann-t').attr('text-anchor', 'middle').attr('x', jx).attr('y', 25)
            .text('in June 2019');
        }

        /* selected-month guide */
        ui.rows = rows; ui.x = x; ui.y = y;
        ui.guide = g.append('g').attr('class', 'c4-guide');
        ui.guide.append('line').attr('y1', 0).attr('y2', ih);
        ui.dot19 = ui.guide.append('circle').attr('r', 4.5).attr('class', 'c4-d19');
        ui.dot20 = ui.guide.append('circle').attr('r', 5.5).attr('class', 'c4-d20').style('fill', V.accent);

        /* pointer layer */
        g.append('rect').attr('class', 'c4-hit').attr('x', -4).attr('y', -4).attr('width', iw + 8).attr('height', ih + 8)
          .on('pointermove', function (e) {
            var px = d3.pointer(e, this)[0];
            var i = Math.max(0, Math.min(11, Math.round((px - x(1)) / step)));
            if (hover !== i + 1) { hover = i + 1; setMonth(); }
          })
          .on('pointerdown', function (e) {
            var px = d3.pointer(e, this)[0];
            var i = Math.max(0, Math.min(11, Math.round((px - x(1)) / step)));
            sel = i + 1; hover = null; setMonth();
          })
          .on('pointerleave', function () { hover = null; setMonth(); });

        setMonth();
        animate = false;
      }

      /* ---- wiring ---- */
      var rz = Viz.responsive(chart, draw);
      function applyView() {
        var V = VIEWS[view];
        titleEl.textContent = V.title;
        el.style.setProperty('--c4-accent', V.accent);
        if (axisNote) axisNote.textContent = 'Axis now 0 to ' + N(V.ymax) + ' a month.';
        sel = null; hover = null; animate = true;
        rz.redraw();
        chart.setAttribute('aria-label', summary());
        table();
      }
      slider.addEventListener('input', function () { sel = +slider.value; hover = null; setMonth(); });
      if (segEl) {
        Viz.segmented(segEl, { onChange: function (v) { view = v; applyView(); } });
      }
      if (Viz.onThemeChange) Viz.onThemeChange(function () { rz.redraw(); });
      el.style.setProperty('--c4-accent', VIEWS.all.accent);
      if (axisNote) axisNote.textContent = 'Axis now 0 to ' + N(VIEWS.all.ymax) + ' a month.';
      chart.setAttribute('aria-label', summary());
      table();
    },
    update: function () {}
  };

  /* =================================================================== 4B */
  window.Charts['fig-4b'] = {
    init: function (el, data) {
      var chart = el.querySelector('.fig-chart');
      var April = data.ch4_monthly.filter(function (r) { return r.month === 'April'; });
      var rows = April.filter(function (r) { return Viz.MAIN_ROAD_USERS.indexOf(r.road_user) >= 0; })
        .sort(function (a, b) { return a.pct_2020_vs_2019 - b.pct_2020_vs_2019; });
      var ref = find(April, { road_user: 'All road users' });
      var all = rows.concat([ref]);

      function tipHtml(r) {
        return '<strong>' + r.road_user + '</strong><br>April 2019: ' + N(r[2019]) + '<br>April 2020: ' + N(r[2020]) +
          '<br>Change: ' + sp(r.pct_2020_vs_2019, 1);
      }

      function draw(w) {
        var narrow = w < 480;
        var labW = narrow ? 94 : 124;
        var top = 36, rowH = 44, gap = 16, bottom = 30;   /* 44 px rows: a full-size tap target */
        var h = top + rowH * rows.length + gap + rowH + bottom;
        var rs = labW + 46, re = w - 54;
        var x = d3.scaleLinear().domain([-60, 20]).range([rs, re]);
        var x0 = x(0);
        var svg = svgIn(chart, w, h);
        function yRow(i) { return top + i * rowH + (i >= rows.length ? gap : 0); }

        /* vertical gridlines + bottom axis */
        var ax = svg.append('g').attr('class', 'axis');
        [-60, -40, -20, 0, 20].forEach(function (t) {
          ax.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', top - 6).attr('y2', h - bottom)
            .attr('class', t === 0 ? 'c4-zero' : 'c4-grid');
          if (!narrow || t !== -40)
            ax.append('text').attr('x', x(t)).attr('y', h - bottom + 18).attr('text-anchor', 'middle')
              .text(t === 0 ? '0' : sp(t, 0));
        });
        /* direction hints */
        svg.append('text').attr('class', 'c4-hint').attr('x', x0 - 6).attr('y', 12).attr('text-anchor', 'end')
          .text(narrow ? '← fewer' : '← fewer admissions than April 2019');
        svg.append('text').attr('class', 'c4-hint').attr('x', x0 + 6).attr('y', 12).attr('text-anchor', 'start')
          .text(narrow ? 'more →' : 'more →');

        var barH = 22;
        all.forEach(function (r, i) {
          var isRef = i === rows.length;
          var cy = yRow(i) + rowH / 2;
          var v = r.pct_2020_vs_2019;
          var rowG = svg.append('g').attr('class', 'c4-row' + (isRef ? ' is-ref' : ''));
          /* invisible hit area: the whole row, so a tap anywhere on it opens the tooltip */
          rowG.append('rect').attr('class', 'c4-rowhit').attr('x', 0).attr('y', yRow(i)).attr('width', w).attr('height', rowH)
            .style('fill', 'transparent');
          rowG.append('line').attr('class', 'c4-rowrule').attr('x1', 0).attr('x2', w)
            .attr('y1', yRow(i) + rowH).attr('y2', yRow(i) + rowH).style('display', i === rows.length - 1 || isRef ? 'none' : null);
          rowG.append('text').attr('class', 'c4-cat').attr('x', 0).attr('y', cy).attr('dy', '0.32em')
            .text(r.road_user);
          var bx = v < 0 ? x(v) : x0, bw = Math.abs(x(v) - x0);
          var bar = rowG.append('rect').attr('class', 'c4-bar').attr('x', bx).attr('y', cy - barH / 2)
            .attr('width', bw).attr('height', barH).attr('rx', 2);
          if (isRef) bar.attr('class', 'c4-bar c4-ref');
          else bar.style('fill', v < 0 ? 'var(--fall)' : 'var(--rise)');
          var lbl = rowG.append('text').attr('class', 'c4-val').attr('y', cy).attr('dy', '0.32em')
            .text(sp(v, 0));
          if (v < 0) lbl.attr('x', bx - 6).attr('text-anchor', 'end');
          else lbl.attr('x', bx + bw + 6).attr('text-anchor', 'start');
          Viz.tooltip.bind(rowG, function () { return tipHtml(r); });
          rowG.attr('role', 'img').attr('aria-label', r.road_user + ': ' + sp(v, 1) + ' (April 2019 ' + N(r[2019]) + ', April 2020 ' + N(r[2020]) + ')');
        });
        svg.attr('aria-hidden', null);
        /* rows are tooltip targets; keep the svg itself out of the reading order (the figure has its own label) */
        svg.attr('role', 'presentation');
      }
      Viz.responsive(chart, draw);
      Viz.fillTable(el.querySelector('.fig-data'), all, [
        { key: 'road_user', label: 'Road user', text: true },
        { key: '2019', label: 'April 2019', format: N },
        { key: '2020', label: 'April 2020', format: N },
        { key: 'pct_2020_vs_2019', label: 'Change', format: function (v) { return sp(v, 1); } }
      ]);
      var cyc = find(April, { road_user: 'Pedal cyclist' });
      chart.setAttribute('aria-label', 'Diverging horizontal bars of the percentage change in admissions, April 2020 against April 2019: ' +
        rows.filter(function (r) { return r.pct_2020_vs_2019 < 0; }).map(function (r) {
          return r.road_user.toLowerCase().replace('pedal ', '') + ' ' + fmt.dp(Math.abs(r.pct_2020_vs_2019), 0) + ' per cent fewer';
        }).join(', ') + '; cyclists ' + fmt.dp(cyc.pct_2020_vs_2019, 0) + ' per cent more. All road users, shown for reference: ' +
        fmt.dp(Math.abs(ref.pct_2020_vs_2019), 0) + ' per cent fewer.');
    },
    update: function () {}
  };

  /* =================================================================== 4C */
  window.Charts['fig-4c'] = {
    init: function (el, data) {
      var chart = el.querySelector('.fig-chart');
      var r = find(data.ch4_monthly, { road_user: 'Pedal cyclist', month: 'Year' });
      var years = d3.range(2011, 2022);
      var pts = years.map(function (y) { return { year: y, v: r[y] }; });
      var rate = Math.pow(r[2019] / r[2011], 1 / 8) - 1;
      var gap = r[2020] - r.trend_2020;

      var key = mk('div', 'c4-key');
      key.setAttribute('aria-hidden', 'true');
      key.innerHTML =
        '<span class="c4-k"><i class="k-line k-act"></i>Actual admissions</span>' +
        '<span class="c4-k"><i class="k-line k-trend"></i>Trend: 2011–19 growth (' + fmt.dp(rate * 100, 1) + '% a year) carried to 2020</span>';
      chart.parentNode.insertBefore(key, chart);

      function tipHtml(p) {
        var s = '<strong>' + p.year + '</strong><br>Cyclist admissions: ' + N(p.v);
        if (p.year === 2020) s += '<br>On the 2011–19 trend: ' + N(r.trend_2020) + '<br>Above trend: about ' + N(Math.round(gap / 50) * 50);
        return s;
      }

      function draw(w) {
        var narrow = w < 480;
        var m = { top: 18, right: narrow ? 30 : 44, bottom: 30, left: narrow ? 44 : 50 };
        var h = Viz.height(w, { ratio: 0.5, min: 290, max: 420 });
        var iw = w - m.left - m.right, ih = h - m.top - m.bottom;
        var x = d3.scalePoint().domain(years).range([0, iw]).padding(0.25);
        var y = d3.scaleLinear().domain([0, 10000]).range([ih, 0]);
        var svg = svgIn(chart, w, h);
        var g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');

        var gy = g.append('g').attr('class', 'axis');
        d3.range(0, 10001, 2000).forEach(function (t) {
          gy.append('line').attr('x1', 0).attr('x2', iw).attr('y1', y(t)).attr('y2', y(t)).attr('class', t === 0 ? 'c4-zero' : 'c4-grid');
          gy.append('text').attr('x', -8).attr('y', y(t)).attr('dy', '0.32em').attr('text-anchor', 'end').text(N(t));
        });
        var every = x.step() >= 40 ? 1 : 2;
        var gx = g.append('g').attr('class', 'axis');
        years.forEach(function (yr, i) {
          gx.append('line').attr('x1', x(yr)).attr('x2', x(yr)).attr('y1', ih).attr('y2', ih + 4);
          if (i % every === 0) gx.append('text').attr('x', x(yr)).attr('y', ih + 20).attr('text-anchor', 'middle').text(yr);
        });

        /* actuals */
        g.append('path').attr('class', 'c4-act')
          .attr('d', d3.line().x(function (p) { return x(p.year); }).y(function (p) { return y(p.v); })(pts));
        /* trend: dashed, 2019 -> 2020 */
        g.append('line').attr('class', 'c4-trend')
          .attr('x1', x(2019)).attr('y1', y(r[2019])).attr('x2', x(2020)).attr('y2', y(r.trend_2020));
        /* the gap */
        g.append('line').attr('class', 'c4-gap').attr('x1', x(2020)).attr('x2', x(2020))
          .attr('y1', y(r.trend_2020) - 5).attr('y2', y(r[2020]) + 6);
        g.append('circle').attr('class', 'c4-tdot').attr('cx', x(2020)).attr('cy', y(r.trend_2020)).attr('r', 4.5);

        var dots = g.selectAll('circle.c4-dot').data(pts).join('circle').attr('class', function (p) { return 'c4-dot' + (p.year === 2020 ? ' is-2020' : ''); })
          .attr('cx', function (p) { return x(p.year); }).attr('cy', function (p) { return y(p.v); })
          .attr('r', function (p) { return p.year === 2020 ? 5.5 : 3.5; });
        /* larger invisible targets for hover / tap / keyboard */
        var hits = g.selectAll('circle.c4-hitdot').data(pts).join('circle').attr('class', 'c4-hitdot')
          .attr('cx', function (p) { return x(p.year); }).attr('cy', function (p) { return y(p.v); }).attr('r', 13)
          .attr('role', 'img').attr('aria-label', function (p) { return p.year + ': ' + N(p.v) + ' cyclist admissions'; });
        Viz.tooltip.bind(hits, tipHtml);

        /* value labels */
        function lab(p, dx, dy, anchor) {
          g.append('text').attr('class', 'c4-val c4-halo').attr('x', x(p.year) + dx).attr('y', y(p.v) + dy)
            .attr('text-anchor', anchor).text(N(p.v));
        }
        lab(pts[0], 0, 20, 'middle');
        lab(pts[8], 0, 22, 'middle');
        lab(pts[10], 6, -11, 'middle');

        /* the 2020 annotation */
        var ax = x(2020) - 12, ay = y(r[2020]);
        var a = g.append('g').attr('class', 'c4-ann');
        a.append('text').attr('class', 'c4-halo c4-ann-b').attr('text-anchor', 'end').attr('x', ax).attr('y', ay - 14)
          .text(narrow ? N(r[2020]) + ' actual vs about' : N(r[2020]) + ' actual vs about ' + N(r.trend_2020) + ' on trend:');
        a.append('text').attr('class', 'c4-halo c4-ann-b').attr('text-anchor', 'end').attr('x', ax).attr('y', ay + 1)
          .text(narrow ? N(r.trend_2020) + ' on trend: ~' + N(Math.round(gap / 50) * 50) + ' more'
            : '~' + N(Math.round(gap / 50) * 50) + ' more');
      }
      Viz.responsive(chart, draw);
      var rows = pts.map(function (p) {
        return { year: p.year, v: p.v, trend: p.year === 2020 ? r.trend_2020 : null,
          gap: p.year === 2020 ? gap : null };
      });
      Viz.fillTable(el.querySelector('.fig-data'), rows, [
        { key: 'year', label: 'Year' },
        { key: 'v', label: 'Cyclist admissions', format: N },
        { key: 'trend', label: 'On the 2011–19 trend', format: function (v) { return v == null ? '' : N(v); } },
        { key: 'gap', label: 'Above trend', format: function (v) { return v == null ? '' : N(v); } }
      ], { caption: 'Trend = 2019 × (2019 ÷ 2011)^(1/8), about ' + fmt.dp(rate * 100, 1) + '% a year' });
      chart.setAttribute('aria-label', 'Annual cyclist admissions 2011 to 2021 as dots on a line, rising from ' + N(r[2011]) + ' to ' + N(r[2019]) +
        ' in 2019, with the 2011 to 2019 growth trend of about ' + fmt.dp(rate * 100, 1) + ' per cent a year carried forward as a dashed line to 2020: ' +
        N(r[2020]) + ' actual against about ' + N(r.trend_2020) + ' on trend, roughly ' + N(Math.round(gap / 50) * 50) + ' more. 2021 had ' + N(r[2021]) + '.');
    },
    update: function () {}
  };

  /* =================================================================== 4D */
  window.Charts['fig-4d'] = {
    init: function (el, data) {
      var chart = el.querySelector('.fig-chart');
      var titleEl = el.querySelector('.fig-title');
      var segEl = el.querySelector('.fig-controls');
      var NAMES = { ACT: 'Australian Capital Territory', NSW: 'New South Wales', NT: 'Northern Territory', Qld: 'Queensland',
        SA: 'South Australia', Tas: 'Tasmania', Vic: 'Victoria', WA: 'Western Australia' };
      var MARK = { Tas: '*', NSW: '†' };
      var HALF = {
        'Jul-Dec': { title: 'Cyclist admissions by state, July–December 2020 against 2019', name: 'July to December' },
        'Jan-Jun': { title: 'Cyclist admissions by state, January–June 2020 against 2019', name: 'January to June' }
      };
      var half = 'Jul-Dec';
      /* one scale for both halves, so the two views can be compared */
      var lo = -20, hi = 45;

      function rowsFor(hf) {
        return Viz.where(data.ch4_state_cyclists, { half: hf }).sort(function (a, b) { return b.pct_change - a.pct_change; });
      }
      function render() {
        var rows = rowsFor(half);
        var span = hi - lo, z = (0 - lo) / span * 100;
        chart.innerHTML = '';
        var grid = mk('div', 'c4d');
        var head = mk('div', 'c4d-row c4d-head');
        head.setAttribute('aria-hidden', 'true');
        head.appendChild(mk('span', 'c4d-st', 'State'));
        head.appendChild(mk('span', 'c4d-track', 'Change from 2019'));
        head.appendChild(mk('span', 'c4d-val', '%'));
        head.appendChild(mk('span', 'c4d-cnt', '2019 → 2020'));
        grid.appendChild(head);
        rows.forEach(function (r) {
          var isVic = r.state === 'Vic';
          var row = mk('div', 'c4d-row' + (isVic ? ' is-vic' : ''));
          row.setAttribute('role', 'img');
          row.setAttribute('aria-label', NAMES[r.state] + ': ' + N(r[2019]) + ' in 2019, ' + N(r[2020]) + ' in 2020, ' + sp(r.pct_change, 1));
          var st = mk('span', 'c4d-st', r.state + (MARK[r.state] || ''));
          var tr = mk('span', 'c4d-track');
          var zero = mk('i', 'c4d-zero'); zero.style.left = z + '%';
          var v = r.pct_change;
          var a = Math.min(0, v), b = Math.max(0, v);
          var bar = mk('b', 'c4d-bar' + (v < 0 ? ' is-neg' : ''));
          bar.style.left = ((a - lo) / span * 100) + '%';
          bar.style.width = ((b - a) / span * 100) + '%';
          tr.appendChild(zero); tr.appendChild(bar);
          var val = mk('span', 'c4d-val', sp(v, 1));
          var cnt = mk('span', 'c4d-cnt', N(r[2019]) + ' → ' + N(r[2020]));
          row.appendChild(st); row.appendChild(tr); row.appendChild(val); row.appendChild(cnt);
          grid.appendChild(row);
          row.__r = r;
        });
        chart.appendChild(grid);
        /* bound after the grid is in the page so the rows share one tab stop (arrow keys move between them) */
        Viz.tooltip.bind(d3.select(grid).selectAll('.c4d-row:not(.c4d-head)'), function () {
          var r = this.__r, d = r[2020] - r[2019];
          return '<strong>' + NAMES[r.state] + '</strong><br>' + HALF[half].name + ' 2019: ' + N(r[2019]) +
            '<br>' + HALF[half].name + ' 2020: ' + N(r[2020]) + '<br>Change: ' + fmt.minus(d3.format('+,d')(d)) + ' (' + sp(r.pct_change, 1) + ')';
        });
        var top = rows[0], vic = find(rows, { state: 'Vic' });
        var abs = rows.slice().sort(function (p, q) { return (q[2020] - q[2019]) - (p[2020] - p[2019]); })[0];
        chart.setAttribute('aria-label', 'Table with bars of cyclist admissions by state, ' + HALF[half].name + ' 2020 against 2019. ' +
          NAMES[abs.state] + ' had the largest rise in admissions (' + N(abs[2019]) + ' to ' + N(abs[2020]) + ', ' + sp(abs.pct_change, 1) +
          '); ' + NAMES[top.state] + ' had the largest percentage rise' +
          (top.state === 'Tas' ? ', on a small base' : '') + '.');
        titleEl.textContent = HALF[half].title;
        /* a copy with the computed column, so the shared rows are never mutated */
        var tableRows = rows.map(function (r) { return Object.assign({}, r, { diff: r[2020] - r[2019] }); });
        Viz.fillTable(el.querySelector('.fig-data'), tableRows, [
          { key: 'state', label: 'State', text: true },
          { key: '2019', label: HALF[half].name + ' 2019', format: N },
          { key: '2020', label: HALF[half].name + ' 2020', format: N },
          { key: 'diff', label: 'Change in admissions', format: function (v) { return fmt.minus(d3.format('+,d')(v)); } },
          { key: 'pct_change', label: 'Change', format: function (v) { return sp(v, 1); } }
        ], { caption: 'Cyclist admissions by state (state of residence; excludes deaths)' });
      }
      if (segEl) Viz.segmented(segEl, { onChange: function (v) { half = v; render(); } });
      render();
    },
    update: function () {}
  };
})();
