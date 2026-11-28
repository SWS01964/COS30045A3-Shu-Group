/* ch4.js: Chapter 4 board, "The lockdown test". OWNED BY THE CHAPTER 4 AGENT.
   Two linked panels share one state { roadUser, month } through Viz.bus:
     A  #ch4-a  monthly line, January to December, for the selected road user
                (2020 and 2019 against the 2015-19 band). Click, tap or arrow keys set the month.
     B  #ch4-b  diverging bars, % change 2020 vs 2019 for the selected month, by road user.
                Click, tap or Enter on a bar (or the All road users reference) sets the road user.
   The Explore bar (road user, month) and the chip stay in sync with clicks on the marks.
   Data: data.ch4_monthly. Every number is read from the CSV at runtime. */
(function () {
  'use strict';
  window.Charts = window.Charts || {};
  var fmt = Viz.fmt;

  var USERS = ['All road users', 'Car driver', 'Car passenger', 'Motorcyclist', 'Pedal cyclist', 'Pedestrian'];
  var MAIN = Viz.MAIN_ROAD_USERS;
  var SHORT = { 'Pedal cyclist': 'Cyclists' };
  var PLURAL = {
    'All road users': 'all road users', 'Car driver': 'car drivers', 'Car passenger': 'car passengers',
    'Motorcyclist': 'motorcyclists', 'Pedal cyclist': 'cyclists', 'Pedestrian': 'pedestrians'
  };
  var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function lab(u) { return SHORT[u] || u; }
  function N(v) { return fmt.int(v); }
  function sp(v, dp) { return fmt.minus(fmt.signedPct(v, dp || 0)); }   /* "+16%" / "−32%" */
  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  window.Charts['ch4'] = {
    init: function (board, data) {
      var rowsBy = {};
      USERS.forEach(function (u) {
        rowsBy[u] = data.ch4_monthly
          .filter(function (r) { return r.road_user === u && r.month !== 'Year'; })
          .sort(function (a, b) { return a.month_num - b.month_num; });
      });
      function rowFor(u, m) { return rowsBy[u][Viz.MONTHS.indexOf(m)]; }

      /* fixed x-domain for B across all 12 months and all six road users */
      var pcts = [];
      USERS.forEach(function (u) { rowsBy[u].forEach(function (r) { pcts.push(r.pct_2020_vs_2019); }); });
      var pctDom = [Math.min(0, d3.min(pcts)), Math.max(0, d3.max(pcts))];
      /* B's row order is fixed (by the April change) so bars stay comparable as the month changes */
      var order = MAIN.slice().sort(function (a, b) {
        return rowFor(a, 'April').pct_2020_vs_2019 - rowFor(b, 'April').pct_2020_vs_2019;
      });

      /* claims used in titles and annotations, checked against the data */
      var allRows = rowsBy['All road users'];
      var allLow = d3.min(allRows, function (r) { return d3.min([2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021], function (y) { return r[y]; }); });
      var aprAll = rowFor('All road users', 'April');
      var aprAllLowest = aprAll[2020] === allLow;
      var aprFrac = -aprAll.pct_2020_vs_2019 / 100;
      var thirdFewer = aprFrac >= 0.30 && aprFrac <= 0.36;
      var cycAbove = rowsBy['Pedal cyclist'].filter(function (r) { return r.month_num >= 4; })
        .every(function (r) { return r[2020] > r.base_max; });
      var aprOthersFell = MAIN.filter(function (u) { return u !== 'Pedal cyclist'; })
        .every(function (u) { return rowFor(u, 'April').pct_2020_vs_2019 < 0; }) &&
        rowFor('Pedal cyclist', 'April').pct_2020_vs_2019 > 0;
      if (!aprAllLowest) console.warn('[ch4] April 2020 is no longer the lowest month of 2011-2021');
      if (!thirdFewer) console.warn('[ch4] title says "a third fewer" but April 2020 is ' + (aprFrac * 100).toFixed(1) + '% below April 2019');
      if (!cycAbove) console.warn('[ch4] cyclist title says every month from April is above the previous five years, but it is not');
      if (!aprOthersFell) console.warn('[ch4] April title says every road user fell except cyclists, but the data disagrees');

      var bus = Viz.bus({ roadUser: 'All road users', month: 'April' });

      var panelA = board.querySelector('#ch4-a'), panelB = board.querySelector('#ch4-b');
      var chartA = panelA.querySelector('.panel-chart'), chartB = panelB.querySelector('.panel-chart');
      var titleA = panelA.querySelector('.panel-title'), subA = panelA.querySelector('.panel-sub');
      var titleB = panelB.querySelector('.panel-title'), subB = panelB.querySelector('.panel-sub');
      var chip = board.querySelector('output.board-chip');
      var tablesHost = board.querySelector('.board-tables');

      /* ------------------------------------------------------- phrases */
      function dirPhrase(r, m) {
        var p = r.pct_2020_vs_2019, a = Math.round(Math.abs(p));
        if (a === 0) return m + ' 2020 level with ' + m + ' 2019';
        return m + ' 2020 ' + (p > 0 ? 'up ' : 'down ') + a + '% on ' + m + ' 2019';
      }

      /* =========================================================== controls */
      var ctl = board.querySelector('.explore-controls');
      ctl.innerHTML = '';
      var userWrap = mk('div', 'ctl-field c4-user');
      var userLab = mk('label', 'ctl-label', 'Road user');
      userLab.id = 'c4-user-label';
      userLab.setAttribute('for', 'c4-user-select');
      var userSel = mk('select', 'c4-user-select');
      userSel.id = 'c4-user-select';
      var segEl = mk('div', 'seg c4-seg');
      segEl.setAttribute('role', 'group');
      segEl.setAttribute('aria-labelledby', 'c4-user-label');
      USERS.forEach(function (u) {
        var o = mk('option', null, lab(u)); o.value = u; userSel.appendChild(o);
        var b = mk('button', null, lab(u)); b.type = 'button'; b.setAttribute('data-value', u);
        b.setAttribute('aria-pressed', u === bus.get().roadUser ? 'true' : 'false');
        segEl.appendChild(b);
      });
      userWrap.appendChild(userLab); userWrap.appendChild(segEl); userWrap.appendChild(userSel);
      var monWrap = mk('div', 'ctl-field c4-month');
      var monLab = mk('label', 'ctl-label', 'Month');
      monLab.setAttribute('for', 'c4-month-select');
      var monSel = mk('select', 'c4-month-select');
      monSel.id = 'c4-month-select';
      Viz.MONTHS.forEach(function (m) { var o = mk('option', null, m); o.value = m; monSel.appendChild(o); });
      monWrap.appendChild(monLab); monWrap.appendChild(monSel);
      ctl.appendChild(userWrap); ctl.appendChild(monWrap);
      userSel.value = bus.get().roadUser; monSel.value = bus.get().month;

      var seg = Viz.segmented(segEl, {
        announce: false,
        onChange: function (v) { bus.set({ roadUser: v }, 'controls'); }
      });
      userSel.addEventListener('change', function () { bus.set({ roadUser: userSel.value }, 'controls'); });
      monSel.addEventListener('change', function () { bus.set({ month: monSel.value }, 'controls'); });

      function syncControls(st) {
        seg.set(st.roadUser, true);
        userSel.value = st.roadUser;
        monSel.value = st.month;
      }
      function setChip(st) {
        chip.textContent = 'Showing: ' + lab(st.roadUser) + ' · ' + st.month;
        chip.hidden = false;
      }

      /* ================================================================ A */
      var A = {};   /* drawing refs, rebuilt on resize */

      function textA(st) {
        var u = st.roadUser, m = st.month, rows = rowsBy[u], r = rowFor(u, m);
        var title;
        if (u === 'All road users' && thirdFewer) title = 'April 2020: a third fewer crash admissions';
        else if (u === 'Pedal cyclist' && cycAbove) title = 'Cyclists: every month from April above the previous five years';
        else title = lab(u) + ': 2020 against 2019 and the 2015–19 range';
        titleA.textContent = title;
        subA.textContent = 'Monthly admissions, ' + PLURAL[u] + ' · 2020 and 2019 against the 2015–19 range (dotted line: its average)';

        var s = 'Monthly line chart of ' + (u === 'All road users' ? 'all road-crash admissions' : PLURAL[u] + ' admissions') +
          ' in 2020 against 2019 and the 2015 to 2019 range, on its own scale. ';
        if (u === 'All road users') {
          var apr = rows[3];
          s += 'April 2020 had ' + N(apr[2020]) + ' admissions, ' + fmt.dp(Math.abs(apr.pct_2020_vs_2019), 0) +
            ' per cent ' + (apr.pct_2020_vs_2019 < 0 ? 'fewer' : 'more') + ' than April 2019' +
            (apr[2020] === allLow ? ' and the lowest month of 2011 to 2021' : '') + '. ';
        } else if (u === 'Pedal cyclist') {
          var n = 0, tot = 0;
          rows.forEach(function (x) { if (x.month_num >= 4) { tot++; if (x[2020] > x.base_max) n++; } });
          s += 'In ' + n + ' of ' + tot + ' months from April to December 2020, admissions were above the highest month of 2015 to 2019. ';
        }
        s += 'Selected month, ' + m + ': 2020 ' + N(r[2020]) + ', 2019 ' + N(r[2019]) + ', 2015 to 2019 range ' +
          N(r.base_min) + ' to ' + N(r.base_max) + '. Click or use the arrow keys to choose another month.';
        chartA.setAttribute('aria-label', s);
      }

      function tipA(i) {
        var r = rowsBy[bus.get().roadUser][i];
        return '<strong>' + r.month + '</strong><br>2020: ' + N(r[2020]) + '<br>2019: ' + N(r[2019]) +
          '<br>2015–19 range: ' + N(r.base_min) + '–' + N(r.base_max) + ' (average ' + N(r.base_mean) + ')<br>2020 vs 2019: ' + sp(r.pct_2020_vs_2019, 1);
      }
      function valueTextA(i) {
        var r = rowsBy[bus.get().roadUser][i];
        return r.month + ': 2020 ' + N(r[2020]) + '; 2019 ' + N(r[2019]) + '; 2015 to 2019 range ' + N(r.base_min) + ' to ' + N(r.base_max);
      }

      function buildA(w) {
        var narrow = w < 480;
        var m = { top: 46, right: narrow ? 40 : 46, bottom: 28, left: narrow ? 42 : 48 };
        var h = Viz.height(w, { ratio: 0.58, min: 300, max: 400 });
        var iw = w - m.left - m.right, ih = h - m.top - m.bottom;
        var x = d3.scalePoint().domain(d3.range(1, 13)).range([0, iw]).padding(0.3);
        var y = d3.scaleLinear().range([ih, 0]);
        var svg = Viz.svg(chartA, w, h, { hidden: true });
        var g = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        A = { w: w, iw: iw, ih: ih, m: m, x: x, y: y, step: x.step(), narrow: narrow, hover: null };

        A.grid = g.append('g').attr('class', 'axis');
        g.append('text').attr('class', 'c4-ylab').attr('x', -m.left + 2).attr('y', -30).text('Admissions a month');

        /* x axis (month labels; every second month when tight) */
        var every = A.step >= 36 ? 1 : 2;
        var xt = g.append('g').attr('class', 'axis c4-xaxis');
        A.every = every;
        A.ticks = xt.selectAll('text').data(d3.range(1, 13)).join('text')
          .attr('x', function (d) { return x(d); }).attr('y', ih + 20).attr('text-anchor', 'middle')
          .text(function (d) { return MON3[d - 1]; });
        xt.selectAll('line.tk').data(d3.range(1, 13)).join('line').attr('class', 'tk')
          .attr('x1', function (d) { return x(d); }).attr('x2', function (d) { return x(d); })
          .attr('y1', ih).attr('y2', ih + 4);

        A.band = g.append('path').attr('class', 'c4-band');
        A.bandLab = g.append('text').attr('class', 'c4-halo c4-bandlab').text('2015–19 range');
        A.mean = g.append('path').attr('class', 'c4-mean');
        A.l19 = g.append('path').attr('class', 'c4-l19');
        A.l20 = g.append('path').attr('class', 'c4-l20');
        A.pts = g.append('g');
        A.end20 = g.append('text').attr('class', 'c4-end c4-end20').attr('x', iw + 8).attr('dy', '0.32em').text('2020');
        A.end19 = g.append('text').attr('class', 'c4-end c4-end19').attr('x', iw + 8).attr('dy', '0.32em').text('2019');
        A.ann = g.append('g').attr('class', 'c4-ann');

        A.hoverRule = g.append('line').attr('class', 'c4-hover').attr('y1', 0).attr('y2', ih).style('display', 'none');
        A.guide = g.append('g').attr('class', 'c4-guide');
        A.guide.append('line').attr('y1', 0).attr('y2', ih);
        A.dot19 = A.guide.append('circle').attr('r', 4.5).attr('class', 'c4-d19');
        A.dot20 = A.guide.append('circle').attr('r', 5.5).attr('class', 'c4-d20');

        /* one focusable plot area: arrow keys move the month */
        function monthAt(e) {
          var px = d3.pointer(e, A.hit.node())[0];
          return Math.max(0, Math.min(11, Math.round((px - x(1)) / A.step)));
        }
        A.hit = g.append('rect').attr('class', 'c4-hit').attr('x', -4).attr('y', -4)
          .attr('width', iw + 8).attr('height', ih + 8)
          .attr('tabindex', 0).attr('role', 'slider').attr('aria-orientation', 'horizontal')
          .attr('aria-label', 'Month, chart A')
          .attr('aria-valuemin', 1).attr('aria-valuemax', 12)
          .on('pointermove', function (e) {
            if (e.pointerType === 'touch') return;
            var i = monthAt(e);
            A.hover = i;
            A.hoverRule.style('display', null).attr('transform', 'translate(' + x(i + 1) + ',0)');
            Viz.tooltip.show(tipA(i), e.clientX, e.clientY, A.hit.node());
          })
          .on('pointerleave', function () {
            A.hover = null; A.hoverRule.style('display', 'none');
            if (document.activeElement !== A.hit.node()) Viz.tooltip.hide();
          })
          .on('pointerdown', function (e) {
            var i = monthAt(e);
            bus.set({ month: Viz.MONTHS[i] }, 'panel-a');
            if (e.pointerType === 'touch') Viz.tooltip.show(tipA(i), e.clientX, e.clientY, A.hit.node());
          })
          .on('keydown', function (e) {
            var i = Viz.MONTHS.indexOf(bus.get().month), j = null;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') j = Math.min(11, i + 1);
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') j = Math.max(0, i - 1);
            else if (e.key === 'Home') j = 0;
            else if (e.key === 'End') j = 11;
            if (j === null) return;
            e.preventDefault();
            if (j !== i) bus.set({ month: Viz.MONTHS[j] }, 'panel-a');
          })
          .on('blur', function () { Viz.tooltip.hide(); });
      }

      /* where the "2015–19 range" label sits: above the band, away from the lines */
      function bandLabelPos(rows) {
        var y = A.y, span = Math.ceil(96 / A.step) + 1, first = null, pass, i, j;
        for (pass = 0; pass < 2; pass++) {            /* 0: above the band, 1: below it */
          for (i = 0; i + span <= 11; i++) {
            var edge = pass ? 0 : Infinity, clash = false;
            for (j = i; j <= i + span; j++) edge = pass ? Math.max(edge, y(rows[j].base_min)) : Math.min(edge, y(rows[j].base_max));
            var base = pass ? edge + 16 : edge - 6;
            if (base < 12 || base > A.ih - 2) clash = true;
            for (j = i; j <= i + span && !clash; j++) {
              [y(rows[j][2019]), y(rows[j][2020])].forEach(function (ly) { if (ly > base - 16 && ly < base + 5) clash = true; });
            }
            if (!first) first = { i: i, base: base };
            if (!clash) return { i: i, base: base };
          }
        }
        return first || { i: 0, base: y(rows[0].base_max) - 6 };
      }

      function updateA(animate) {
        if (!A.y) return;
        var st = bus.get(), u = st.roadUser, rows = rowsBy[u];
        var x = A.x, y = A.y, iw = A.iw;
        var dur = animate ? Viz.dur() : 0;
        function T(sel) { return dur ? sel.transition().duration(dur) : sel; }
        var maxv = d3.max(rows, function (r) { return Math.max(r[2019], r[2020], r.base_max); });
        y.domain([0, maxv]).nice(5);
        A.ymax = y.domain()[1];

        /* y axis: keyed ticks that fade in and out as the scale changes */
        var ticks = y.ticks(5);
        var sel = A.grid.selectAll('g.tk').data(ticks, function (d) { return d; });
        sel.exit().transition().duration(dur).style('opacity', 0).remove();
        var en = sel.enter().append('g').attr('class', 'tk')
          .attr('transform', function (d) { return 'translate(0,' + y(d) + ')'; })
          .style('opacity', dur ? 0 : 1);
        en.append('line').attr('class', function (d) { return d === 0 ? 'c4-zero' : 'c4-grid'; }).attr('x2', iw);
        en.append('text').attr('x', -8).attr('dy', '0.32em').attr('text-anchor', 'end').text(function (d) { return N(d); });
        var all = en.merge(sel);
        T(all).attr('transform', function (d) { return 'translate(0,' + y(d) + ')'; }).style('opacity', 1);

        function line(k) { return d3.line().x(function (r) { return x(r.month_num); }).y(function (r) { return y(r[k]); })(rows); }
        T(A.band).attr('d', d3.area().x(function (r) { return x(r.month_num); })
          .y0(function (r) { return y(r.base_min); }).y1(function (r) { return y(r.base_max); })(rows));
        T(A.mean).attr('d', line('base_mean'));
        T(A.l19).attr('d', line(2019));
        T(A.l20).attr('d', line(2020));
        var pts = A.pts.selectAll('circle').data(rows).join('circle').attr('class', 'c4-pt')
          .attr('cx', function (r) { return x(r.month_num); }).attr('r', 2.5);
        T(pts).attr('cy', function (r) { return y(r[2020]); });

        /* end labels, nudged apart when the lines finish close together */
        var dec = rows[11], y20 = y(dec[2020]), y19 = y(dec[2019]);
        if (Math.abs(y20 - y19) < 15) {
          var mid = (y20 + y19) / 2, up = y20 < y19;
          y20 = mid + (up ? -8 : 8); y19 = mid + (up ? 8 : -8);
        }
        T(A.end20).attr('y', y20);
        T(A.end19).attr('y', y19);

        /* band label */
        var bp = bandLabelPos(rows);
        A.bandLab.attr('x', x(bp.i + 1) - 4).attr('y', bp.base);
        if (dur) A.bandLab.style('opacity', 0).transition().delay(dur).duration(150).style('opacity', 1);
        else A.bandLab.style('opacity', 1);

        /* annotations: only where they apply, values from the data */
        A.ann.selectAll('*').remove();
        if (u === 'All road users') {
          var a = rows[3], ax = x(4), ay = y(a[2020]);
          A.ann.append('circle').attr('cx', ax).attr('cy', ay).attr('r', 6).attr('class', 'c4-ring');
          if (aprAllLowest) {
            A.ann.append('text').attr('class', 'c4-halo c4-ann-b').attr('x', ax + 12).attr('y', ay + 22)
              .text(N(a[2020]) + ': lowest month');
            A.ann.append('text').attr('class', 'c4-halo c4-ann-t').attr('x', ax + 12).attr('y', ay + 37).text('of 2011–2021');
          } else {
            A.ann.append('text').attr('class', 'c4-halo c4-ann-b').attr('x', ax + 12).attr('y', ay + 22)
              .text(N(a[2020]) + ' in April 2020');
          }
        } else if (u === 'Pedal cyclist') {
          var j = rows[5], jx = x(6), jy = y(j[2020]);
          if (j[2020] > j[2019]) {
            A.ann.append('line').attr('class', 'c4-lead').attr('x1', jx).attr('x2', jx).attr('y1', -8).attr('y2', jy - 7);
            A.ann.append('circle').attr('cx', jx).attr('cy', jy).attr('r', 6).attr('class', 'c4-ring');
            var t = A.ann.append('text').attr('class', 'c4-halo c4-ann-b').attr('text-anchor', 'middle')
              .attr('x', jx).attr('y', -12).text(N(j[2020]) + ', up from ' + N(j[2019]) + ' in June 2019');
            var tw = t.node().getComputedTextLength ? t.node().getComputedTextLength() : 180;
            var cx = Math.max(-A.m.left + 2 + tw / 2, Math.min(A.w - A.m.left - 2 - tw / 2, jx));
            t.attr('x', cx);
          }
        }
        if (dur) A.ann.style('opacity', 0).transition().delay(dur * 0.6).duration(dur * 0.6).style('opacity', 1);

        moveGuide();
      }

      function moveGuide() {
        if (!A.y || !A.guide) return;
        var st = bus.get(), rows = rowsBy[st.roadUser], mi = Viz.MONTHS.indexOf(st.month), r = rows[mi];
        A.guide.attr('transform', 'translate(' + A.x(mi + 1) + ',0)');
        A.dot20.attr('cy', A.y(r[2020]));
        A.dot19.attr('cy', A.y(r[2019]));
        A.ticks.style('display', function (d) {
          if (A.every === 1 || d === mi + 1) return null;
          return (d - 1) % A.every === 0 && Math.abs(d - (mi + 1)) > 1 ? null : 'none';
        })
          .classed('is-sel', function (d) { return d === mi + 1; });
        A.hit.attr('aria-valuenow', mi + 1).attr('aria-valuetext', valueTextA(mi));
      }

      /* ================================================================ B */
      var B = {};

      function monthNow() { return bus.get().month; }
      function tipB(u) {
        var m = monthNow(), r = rowFor(u, m);
        return '<strong>' + lab(u) + '</strong><br>' + m + ' 2019: ' + N(r[2019]) + '<br>' + m + ' 2020: ' + N(r[2020]) +
          '<br>Change: ' + sp(r.pct_2020_vs_2019, 1) + '<br><em>Select to show it in chart A</em>';
      }
      function rowLabelB(u) {
        var m = monthNow(), r = rowFor(u, m);
        return lab(u) + ': ' + dirPhrase(r, m) + ' (' + N(r[2019]) + ' to ' + N(r[2020]) + '). Show it in chart A.';
      }

      function buildB(w) {
        var rowH = 58, top = 44, bottom = 48;
        var h = top + rowH * order.length + bottom;
        var svg = Viz.svg(chartB, w, h, { hidden: true });
        var padL = 50, padR = 52;
        var x = d3.scaleLinear().domain(pctDom).range([padL, w - padR]);
        B = { w: w, h: h, x: x, top: top, rowH: rowH, bottom: bottom };

        /* gridlines + bottom axis */
        var ax = svg.append('g').attr('class', 'axis');
        var tk = x.ticks(6).filter(function (t) { return t >= pctDom[0] - 1e-6 && t <= pctDom[1] + 1e-6 && (w >= 400 || t % 40 === 0); });
        tk.forEach(function (t) {
          ax.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', top - 4).attr('y2', h - bottom)
            .attr('class', t === 0 ? 'c4-zero' : 'c4-grid');
          ax.append('text').attr('x', x(t)).attr('y', h - bottom + 18).attr('text-anchor', 'middle')
            .text(t === 0 ? '0' : sp(t, 0));
        });
        svg.append('text').attr('class', 'c4-hint').attr('x', x(0) - 6).attr('y', h - 6).attr('text-anchor', 'end').text('← fewer admissions');
        svg.append('text').attr('class', 'c4-hint').attr('x', x(0) + 6).attr('y', h - 6).attr('text-anchor', 'start').text('more →');

        function activate(u) { bus.set({ roadUser: u }, 'panel-b'); }
        function onKey(u) {
          return function (e) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); activate(u); }
          };
        }

        /* the reference: All road users as a dashed vertical line, labelled at the top */
        B.ref = svg.append('g').attr('class', 'c4-refg').attr('role', 'button').attr('tabindex', 0)
          .on('click', function () { activate('All road users'); })
          .on('keydown', onKey('All road users'));
        B.refLine = B.ref.append('line').attr('class', 'c4-ref').attr('y1', top - 6).attr('y2', h - bottom);
        B.refHit = B.ref.append('rect').attr('class', 'c4-refhit').attr('height', 30).attr('y', 2).attr('rx', 4);
        B.refFocus = B.ref.append('rect').attr('class', 'c4-focus').attr('height', 30).attr('y', 2).attr('rx', 4);
        B.refText = B.ref.append('text').attr('class', 'c4-halo c4-reflab').attr('y', 22).attr('text-anchor', 'middle');
        Viz.tooltip.bind(B.ref, function () { return tipB('All road users'); }, { roving: false });

        B.rows = svg.selectAll('g.c4-row').data(order).join('g').attr('class', 'c4-row')
          .attr('transform', function (d, i) { return 'translate(0,' + (top + i * rowH) + ')'; })
          .attr('role', 'button').attr('tabindex', 0)
          .on('click', function (e, d) { activate(d); })
          .on('keydown', function (e, d) { onKey(d)(e); });
        B.rows.append('rect').attr('class', 'c4-rowbg').attr('x', 0).attr('y', 0).attr('width', w).attr('height', rowH - 4).attr('rx', 4);
        B.rows.append('text').attr('class', 'c4-cat').attr('x', 4).attr('y', 18).text(function (d) { return lab(d); });
        B.rows.append('rect').attr('class', 'c4-bar').attr('y', 24).attr('height', 26);
        B.rows.append('text').attr('class', 'c4-halo c4-val').attr('y', 38).attr('dy', '0.35em');
        B.rows.append('rect').attr('class', 'c4-focus').attr('x', 0).attr('y', 0).attr('width', w).attr('height', rowH - 4).attr('rx', 4);
        Viz.tooltip.bind(B.rows, function (d) { return tipB(d); }, { roving: false });
      }

      function updateB(animate) {
        if (!B.x) return;
        var st = bus.get(), m = st.month, u = st.roadUser, x = B.x, x0 = x(0);
        var dur = animate ? Viz.dur() : 0;
        function T(sel) { return dur ? sel.transition().duration(dur) : sel; }

        B.rows.classed('is-sel', function (d) { return d === u; })
          .attr('aria-pressed', function (d) { return d === u ? 'true' : 'false'; })
          .attr('aria-label', function (d) { return rowLabelB(d); });
        function pct(d) { return rowFor(d, m).pct_2020_vs_2019; }
        T(B.rows.select('rect.c4-bar'))
          .attr('x', function (d) { return Math.min(x0, x(pct(d))); })
          .attr('width', function (d) { return Math.max(1.5, Math.abs(x(pct(d)) - x0)); });
        B.rows.select('rect.c4-bar').classed('is-up', function (d) { return pct(d) > 0; })
          .classed('is-down', function (d) { return pct(d) <= 0; });
        B.rows.select('text.c4-val').text(function (d) { return sp(pct(d), 0); })
          .attr('text-anchor', function (d) { return pct(d) < 0 ? 'end' : 'start'; });
        T(B.rows.select('text.c4-val'))
          .attr('x', function (d) { return pct(d) < 0 ? x(pct(d)) - 6 : x(pct(d)) + 6; });

        /* reference line */
        var refP = rowFor('All road users', m).pct_2020_vs_2019, rx = x(refP);
        var refSel = u === 'All road users';
        B.ref.classed('is-sel', refSel)
          .attr('aria-pressed', refSel ? 'true' : 'false')
          .attr('aria-label', rowLabelB('All road users'));
        T(B.refLine).attr('x1', rx).attr('x2', rx);
        B.refText.text('All road users ' + sp(refP, 0));
        var tw = B.refText.node().getComputedTextLength ? B.refText.node().getComputedTextLength() : 120;
        var cx = Math.max(tw / 2 + 4, Math.min(B.w - tw / 2 - 4, rx));
        T(B.refText).attr('x', cx);
        [B.refHit, B.refFocus].forEach(function (r) {
          T(r).attr('x', cx - tw / 2 - 6).attr('width', tw + 12);
        });

        /* title, subtitle, summary */
        var mm = m;
        if (m === 'April' && aprOthersFell) {
          titleB.textContent = 'In April 2020 every road user fell except cyclists (' + sp(pct('Pedal cyclist'), 0) + ')';
        } else {
          titleB.textContent = mm + ' 2020 against ' + mm + ' 2019, by road user';
        }
        subB.textContent = 'Change in admissions, ' + mm + ' 2020 vs ' + mm + ' 2019 · by road user';
        var parts = order.map(function (d) { return lab(d) + ' ' + sp(pct(d), 0).replace(fmt.minusChar, 'minus '); });
        chartB.setAttribute('aria-label', 'Diverging bars of the change in admissions between ' + mm + ' 2019 and ' + mm +
          ' 2020 by road user: ' + parts.join(', ') + '. All road users ' + sp(refP, 0).replace(fmt.minusChar, 'minus ') +
          ', shown as a dashed reference line. Select a bar to show that road user in chart A.');
      }

      /* =============================================================== tables */
      var tblA = mk('div', 'c4-tbl'), tblB = mk('div', 'c4-tbl');
      tablesHost.innerHTML = '';
      tablesHost.appendChild(tblA); tablesHost.appendChild(tblB);
      function tableA() {
        var u = bus.get().roadUser;
        Viz.fillTable(tblA, rowsBy[u], [
          { key: 'month', label: 'Month', text: true },
          { key: '2019', label: '2019', format: N },
          { key: '2020', label: '2020', format: N },
          { key: 'base_min', label: '2015–19 min', format: N },
          { key: 'base_mean', label: '2015–19 mean', format: fmt.dp1 },
          { key: 'base_max', label: '2015–19 max', format: N }
        ], { caption: 'Chart A: monthly admissions, ' + PLURAL[u] + ', 2019, 2020 and the 2015–19 range' });
      }
      function tableB() {
        var m = monthNow();
        var rows = USERS.map(function (u) {
          var r = rowFor(u, m);
          return { road_user: lab(u), a2019: r[2019], a2020: r[2020], pct: r.pct_2020_vs_2019 };
        });
        Viz.fillTable(tblB, rows, [
          { key: 'road_user', label: 'Road user', text: true },
          { key: 'a2019', label: m + ' 2019', format: N },
          { key: 'a2020', label: m + ' 2020', format: N },
          { key: 'pct', label: 'Change', format: function (v) { return sp(v, 1); } }
        ], { caption: 'Chart B: ' + m + ' 2020 against ' + m + ' 2019 by road user' });
      }

      /* ================================================================ link */
      bus.on(function (st, changed, source) {
        var userChanged = changed.indexOf('roadUser') >= 0, monthChanged = changed.indexOf('month') >= 0;
        var prevMax = A.ymax;
        syncControls(st);
        setChip(st);
        if (userChanged) { textA(st); updateA(true); tableA(); }
        if (monthChanged) { textA(st); moveGuide(); tableB(); }
        updateB(monthChanged);

        if (source !== 'panel-a') Viz.flash(panelA);
        if (source !== 'panel-b') Viz.flash(panelB);

        var r = rowFor(st.roadUser, st.month), msg;
        if (userChanged) {
          msg = lab(st.roadUser) + ' selected: ' + dirPhrase(r, st.month) + '.';
          if (A.ymax !== prevMax) msg += ' Chart A scale is now 0 to ' + N(A.ymax) + ' admissions a month.';
        } else {
          msg = st.month + ' selected: ' + lab(st.roadUser) + ', ' + dirPhrase(r, st.month) + '.';
        }
        Viz.announce(msg);
      });

      /* ============================================================== initial */
      Viz.responsive(chartA, function (w) { buildA(w); updateA(false); });
      Viz.responsive(chartB, function (w) { buildB(w); updateB(false); });
      var st0 = bus.get();
      textA(st0); setChip(st0); tableA(); tableB();
      updateB(false);
    }
  };
})();
