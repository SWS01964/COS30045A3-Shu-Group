/* ch5.js: Chapter 5 board (A: two lines, First Nations vs non-Indigenous; B: paired horizontal bars of within-group shares).
   OWNED BY THE CHAPTER 5 AGENT.
   Interface: window.Charts['ch5'] = { init(boardEl, data) }
   Data: ch5_first_nations_trend (year, status, hosp, bed_days, population, hosp_per_100k; the population and the rate exist
         only for 2011, 2016 and 2021, blanks load as null) and ch5_first_nations_profile (view = road_user | remoteness, pooled 2016-21).
   State: Viz.bus({ aView: 'rate' | 'index', bView: 'road_user' | 'remoteness', focus: null | FN | NI }).
   Index (2011 = 100), within-group shares and the "All other" road-user row are computed here, for presentation.
   Colour: First Nations = --accent2, non-Indigenous = --context. Colour is never the only cue: solid vs dashed lines,
   filled vs open dots, direct labels, bar order (First Nations bar on top) and the named Highlight buttons.
   Every number comes from the CSVs at runtime. The prose keys used by index.html are registered in facts.js. */
(function () {
  'use strict';
  window.Charts = window.Charts || {};

  var FN = 'First Nations people', NI = 'Non-Indigenous';
  var GK = {}; GK[FN] = 'fn'; GK[NI] = 'ni';
  var GN = {}; GN[FN] = 'First Nations'; GN[NI] = 'Non-Indigenous';
  var EN = '–';
  var MINUS = '−';

  var CAR = 'Car driver, passenger or unknown position';
  var OTHER_CATS = ['Bus occupant', 'Heavy transport driver, passenger or unknown position', 'Pick-up truck or van occupant', 'Other or unknown'];
  var ROAD_ITEMS = [
    { key: 'car', label: 'Car occupant', cats: [CAR] },
    { key: 'moto', label: 'Motorcyclist', cats: ['Motorcyclist'] },
    { key: 'cyc', label: 'Cyclist', cats: ['Pedal cyclist'] },
    { key: 'ped', label: 'Pedestrian', cats: ['Pedestrian'] },
    { key: 'other', label: 'All other', cats: OTHER_CATS }
  ];
  var AREA_ITEMS = [
    { key: 'Major Cities', label: 'Major Cities', cats: ['Major Cities'] },
    { key: 'Regional', label: 'Regional', cats: ['Regional'] },
    { key: 'Remote', label: 'Remote', cats: ['Remote'] }
  ];

  function int(v) { return Viz.fmt.int(v); }
  function dp1(v) { return Viz.fmt.dp1(v); }
  function dp0(v) { return Viz.fmt.dp(v, 0); }
  function pct1(v) { return Viz.fmt.pct(v, 1); }
  function sgn(n) { return (n >= 0 ? '+' : MINUS) + Math.abs(Math.round(n)) + '%'; }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  /* Text width via canvas, using the chart's own font family. */
  function measurer(host) {
    var ctx = document.createElement('canvas').getContext('2d');
    var fam = getComputedStyle(host).fontFamily;
    return function (text, size, weight) {
      ctx.font = (weight || 400) + ' ' + size + 'px ' + fam;
      return ctx.measureText(text).width;
    };
  }

  /* One tab stop for a set of marks; arrow keys move between them. */
  function roving(nodes, current) {
    nodes.forEach(function (n, i) {
      n.setAttribute('tabindex', i === (current || 0) ? '0' : '-1');
      n.addEventListener('focus', function () {
        nodes.forEach(function (m) { m.setAttribute('tabindex', m === n ? '0' : '-1'); });
      });
      n.addEventListener('keydown', function (e) {
        var k = e.key, j = null;
        if (k === 'ArrowDown' || k === 'ArrowRight') j = Math.min(nodes.length - 1, i + 1);
        else if (k === 'ArrowUp' || k === 'ArrowLeft') j = Math.max(0, i - 1);
        else if (k === 'Home') j = 0;
        else if (k === 'End') j = nodes.length - 1;
        if (j === null) return;
        e.preventDefault();
        if (j !== i) nodes[j].focus();
      });
    });
  }

  window.Charts['ch5'] = {
    init: function (board, data) {
      var panelA = board.querySelector('#ch5-a'), panelB = board.querySelector('#ch5-b');
      if (!panelA || !panelB) return;
      var hostA = panelA.querySelector('.panel-chart'), hostB = panelB.querySelector('.panel-chart');
      var titleElA = panelA.querySelector('.panel-title'), subElA = panelA.querySelector('.panel-sub');
      var titleElB = panelB.querySelector('.panel-title'), subElB = panelB.querySelector('.panel-sub');
      var chip = board.querySelector('.board-chip');
      var ctlHost = board.querySelector('.explore-controls');
      var trend = data.ch5_first_nations_trend || [];
      var prof = data.ch5_first_nations_profile || [];

      /* ============================================================ data prep: panel A */
      function series(status) {
        return trend.filter(function (r) { return r.status === status; }).sort(function (a, b) { return a.year - b.year; });
      }
      var S = {}; S[FN] = series(FN); S[NI] = series(NI);
      if (!S[FN].length || !S[NI].length || !prof.length) return;
      var years = S[FN].map(function (r) { return r.year; });
      var Y0 = years[0], Y1 = years[years.length - 1];
      var rateYears = S[FN].filter(function (r) { return r.hosp_per_100k != null; }).map(function (r) { return r.year; });
      function rowAt(st, yr) { return S[st].filter(function (r) { return r.year === yr; })[0]; }
      var base = {}; base[FN] = S[FN][0]; base[NI] = S[NI][0];
      var last = {}; last[FN] = S[FN][S[FN].length - 1]; last[NI] = S[NI][S[NI].length - 1];
      function chg(st) { return (last[st].hosp / base[st].hosp - 1) * 100; }
      var rate11 = {}, rate21 = {};
      [FN, NI].forEach(function (st) { rate11[st] = rowAt(st, Y0).hosp_per_100k; rate21[st] = rowAt(st, Y1).hosp_per_100k; });
      var ratio21 = rate21[FN] / rate21[NI];
      /* the titles say "level" in 2011 and "half as high again" in 2021: warn (not fail) if the data stop supporting that */
      if (Math.abs(rate11[FN] / rate11[NI] - 1) > 0.05) console.warn('[ch5] title says the 2011 rates were level but they differ by ' + ((rate11[FN] / rate11[NI] - 1) * 100).toFixed(1) + '%');
      if (ratio21 < 1.4 || ratio21 > 1.6) console.warn('[ch5] title says half as high again but the 2021 ratio is ' + ratio21.toFixed(2));
      if (chg(FN) < 80 || chg(FN) >= 100) console.warn('[ch5] title says "nearly doubled" but the First Nations change is ' + chg(FN).toFixed(0) + '%');

      function pts(st, view) {
        var rows = S[st];
        if (view === 'rate') {
          return rows.filter(function (r) { return r.hosp_per_100k != null; })
            .map(function (r) { return { year: r.year, v: r.hosp_per_100k, row: r }; });
        }
        return rows.map(function (r) { return { year: r.year, v: r.hosp / base[st].hosp * 100, row: r }; });
      }
      function stepYears(view) { return view === 'rate' ? rateYears : years; }

      /* ============================================================ data prep: panel B */
      function profRows(view, status) { return prof.filter(function (r) { return r.view === view && r.status === status; }); }
      function aggregate(view, status, cats) {
        var rows = profRows(view, status).filter(function (r) { return cats.indexOf(r.category) >= 0; });
        var hosp = 0, bed = 0, np = 0;
        rows.forEach(function (r) { hosp += r.hosp || 0; bed += r.bed_days || 0; np += r.np_cells || 0; });
        var stay = rows.length === 1 && rows[0].avg_stay != null ? rows[0].avg_stay : (hosp ? bed / hosp : null);
        return { hosp: hosp, bed: bed, np: np, stay: stay, n: rows.length };
      }
      function buildItems(view) {
        var defs = view === 'road_user' ? ROAD_ITEMS : AREA_ITEMS;
        var tot = {};
        [FN, NI].forEach(function (st) {
          tot[st] = profRows(view, st).reduce(function (a, r) { return a + (r.hosp || 0); }, 0);
        });
        var items = defs.map(function (d) {
          var o = { key: d.key, label: d.label, cats: d.cats, g: {} };
          [FN, NI].forEach(function (st) {
            var a = aggregate(view, st, d.cats);
            a.share = tot[st] ? a.hosp / tot[st] * 100 : 0;
            o.g[st] = a;
          });
          return o;
        });
        if (view === 'road_user') {
          /* sort by the First Nations share, "All other" last */
          var other = items.filter(function (o) { return o.key === 'other'; });
          var main = items.filter(function (o) { return o.key !== 'other'; })
            .sort(function (a, b) { return b.g[FN].share - a.g[FN].share; });
          items = main.concat(other);
        }
        return items;
      }
      var ITEMS = { road_user: buildItems('road_user'), remoteness: buildItems('remoteness') };
      function itemBy(view, key) { return ITEMS[view].filter(function (o) { return o.key === key; })[0]; }
      var HLKEY = { road_user: 'ped', remoteness: 'Remote' };
      var pedI = itemBy('road_user', 'ped'), remI = itemBy('remoteness', 'Remote');
      if (!pedI || !remI) return;
      /* wording checks: "about one in four" and "fewer than one in fifty" */
      if (remI.g[FN].share < 22 || remI.g[FN].share > 28) console.warn('[ch5] title says about one in four but the First Nations remote share is ' + remI.g[FN].share.toFixed(1) + '%');
      if (remI.g[NI].share >= 2) console.warn('[ch5] title says fewer than one in fifty but the non-Indigenous remote share is ' + remI.g[NI].share.toFixed(1) + '%');

      /* ============================================================ words */
      function titleA(v) {
        if (v === 'rate') return 'Per person, the First Nations rate went from level with everyone else to half as high again';
        return 'First Nations hospitalisations nearly doubled; everyone else' + '’' + 's rose ' + dp0(chg(NI)) + '%';
      }
      function subA(v) {
        if (v === 'rate') {
          return 'Hospitalisations per 100,000 people · First Nations vs non-Indigenous · population estimates exist for ' +
            rateYears.slice(0, -1).join(', ') + ' and ' + rateYears[rateYears.length - 1] + ' only';
        }
        return 'Annual hospitalisations indexed to ' + Y0 + ' = 100 · First Nations vs non-Indigenous · ' + Y0 + EN + Y1 +
          ' · Vic (2012) and NSW (2017) counting changes lower later counts';
      }
      function titleB(v) {
        if (v === 'road_user') {
          return 'Pedestrians are ' + dp0(pedI.g[FN].share) + '% of First Nations hospitalisations, ' + dp0(pedI.g[NI].share) + '% of everyone else' + '’' + 's';
        }
        return 'About one in four First Nations patients lives in a remote area; fewer than one in fifty others do';
      }
      function subB(v) {
        if (v === 'road_user') return 'Share of each group' + '’' + 's hospitalisations by road user, 2016' + EN + '21 pooled · published cells only (n.p. suppressed cells excluded)';
        return 'Share of each group' + '’' + 's hospitalisations by where the person lives, 2016' + EN + '21 pooled';
      }
      function describeA(v) {
        var f0 = base[FN], n0 = base[NI], fL = last[FN], nL = last[NI];
        if (v === 'index') {
          return 'Line chart, two lines indexed to ' + Y0 + ' = 100, ' + Y0 + ' to ' + Y1 + '. First Nations hospitalisations rose ' + dp0(chg(FN)) + '% from ' +
            int(f0.hosp) + ' to ' + int(fL.hosp) + '; non-Indigenous rose ' + dp0(chg(NI)) + '% from ' + int(n0.hosp) + ' to ' + int(nL.hosp) + '.';
        }
        return 'Line chart of hospitalisations per 100,000 people for ' + rateYears.join(', ') + ' only, the years with a population estimate. In ' + Y0 +
          ' the First Nations rate was ' + dp1(rate11[FN]) + ' and the non-Indigenous rate ' + dp1(rate11[NI]) + '. In ' + Y1 + ' they were ' + dp1(rate21[FN]) +
          ' and ' + dp1(rate21[NI]) + ', so the First Nations rate was about ' + dp1(ratio21) + ' times as high.';
      }
      function rowLabel(it, view) {
        var f = it.g[FN], n = it.g[NI];
        return it.label + ': First Nations ' + pct1(f.share) + ' (' + int(f.hosp) + '), non-Indigenous ' + pct1(n.share) + ' (' + int(n.hosp) +
          '); average stay ' + dp1(f.stay) + ' and ' + dp1(n.stay) + ' days' +
          (view === 'road_user' ? '; ' + f.np + ' and ' + n.np + ' suppressed cells' : '') + '.';
      }
      function describeB(v) {
        var items = ITEMS[v];
        if (v === 'road_user') {
          return 'Paired horizontal bars of each group' + '’' + 's hospitalisations by road user, as shares within the group, 2016 to 2021 pooled, published cells only. ' +
            items.map(function (it) { return it.label + ' ' + pct1(it.g[FN].share) + ' of First Nations and ' + pct1(it.g[NI].share) + ' of non-Indigenous'; }).join('; ') + '.';
        }
        return 'Paired horizontal bars of each group' + '’' + 's hospitalisations by where the person lives, as shares within the group, 2016 to 2021 pooled. ' +
          items.map(function (it) { return it.label + ' ' + pct1(it.g[FN].share) + ' of First Nations and ' + pct1(it.g[NI].share) + ' of non-Indigenous'; }).join('; ') + '.';
      }
      function viewWords(a, b) {
        return (a === 'rate' ? 'per 100,000' : 'index (2011 = 100)') + ' · ' + (b === 'road_user' ? 'by road user' : 'by where they live');
      }

      var bus = Viz.bus({ aView: 'rate', bView: 'road_user', focus: null });
      var pinned = null;           /* the group chosen with the Highlight buttons (sticky); hover focus is transient */
      var animA = false, animB = false;

      /* ============================================================ explore bar */
      ctlHost.innerHTML = '';
      var gA = document.createElement('div');
      gA.className = 'ctl-group';
      gA.innerHTML = '<span class="ctl-label" id="ch5-seg-a-label">Chart A</span>' +
        '<div class="seg" role="group" aria-labelledby="ch5-seg-a-label">' +
        '<button type="button" data-value="rate" aria-pressed="true">Per 100,000</button>' +
        '<button type="button" data-value="index" aria-pressed="false">Index (2011 = 100)</button></div>';
      ctlHost.appendChild(gA);
      var gB = document.createElement('div');
      gB.className = 'ctl-group';
      gB.innerHTML = '<span class="ctl-label" id="ch5-seg-b-label">Chart B</span>' +
        '<div class="seg" role="group" aria-labelledby="ch5-seg-b-label">' +
        '<button type="button" data-value="road_user" aria-pressed="true">By road user</button>' +
        '<button type="button" data-value="remoteness" aria-pressed="false">By where they live</button></div>';
      ctlHost.appendChild(gB);
      var segA = Viz.segmented(gA.querySelector('.seg'), { announce: false, onChange: function (v) { bus.set({ aView: v }, 'controls'); } });
      var segB = Viz.segmented(gB.querySelector('.seg'), { announce: false, onChange: function (v) { bus.set({ bView: v }, 'controls'); } });

      /* Highlight toggle pair: the keyboard (and touch) way to set the group focus; also panel B's colour key. */
      var hl = document.createElement('div');
      hl.className = 'ch5-hl';
      hl.setAttribute('role', 'group');
      hl.setAttribute('aria-label', 'Highlight one group in both charts');
      hl.innerHTML = '<span class="ch5-hl-label" aria-hidden="true">Highlight</span>' +
        [FN, NI].map(function (st) {
          return '<button type="button" class="ch5-hl-btn" data-group="' + st + '" aria-pressed="false">' +
            '<span class="ch5-sw is-' + GK[st] + '" aria-hidden="true"></span>' + GN[st] + '</button>';
        }).join('');
      panelB.insertBefore(hl, hostB);
      var hlBtns = Array.prototype.slice.call(hl.querySelectorAll('button'));

      /* ============================================================ link: group focus */
      function setHover(group) { bus.set({ focus: group || pinned }, 'hover'); }
      function pin(group) {
        pinned = pinned === group ? null : group;
        bus.set({ focus: pinned }, 'pin');
      }
      hlBtns.forEach(function (b) {
        var st = b.getAttribute('data-group');
        b.addEventListener('click', function () { pin(st); });
        b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') setHover(st); });
        b.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') setHover(null); });
      });
      function hoverable(sel, st) {
        sel.each(function () {
          this.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') setHover(st); });
          this.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') setHover(null); });
        });
      }
      function syncFocus() {
        var f = bus.get().focus;
        board.setAttribute('data-focus', f ? GK[f] : '');
        hlBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-group') === pinned ? 'true' : 'false'); });
      }
      function setChip() {
        var s = bus.get();
        chip.textContent = 'Showing: ' + viewWords(s.aView, s.bView) + (pinned ? ' · highlighting ' + GN[pinned] : '');
      }

      /* ============================================================ panel A */
      var A = null;   /* geometry of the current drawing: x, y, view, hit, guide, gdots, innerW, innerH */

      function tipA(yr, view) {
        var a = rowAt(FN, yr), b = rowAt(NI, yr);
        if (!a || !b) return '';
        function pop(r) { return r.population != null ? '<br><span style="opacity:.85">population ' + int(r.population) + '</span>' : ''; }
        if (view === 'index') {
          return '<strong>' + yr + '</strong><br>First Nations: ' + int(a.hosp) + ' hospitalisations, index ' + dp1(a.hosp / base[FN].hosp * 100) + pop(a) +
            '<br>Non-Indigenous: ' + int(b.hosp) + ' hospitalisations, index ' + dp1(b.hosp / base[NI].hosp * 100) + pop(b);
        }
        return '<strong>' + yr + '</strong><br>First Nations: ' + dp1(a.hosp_per_100k) + ' per 100,000<br><span style="opacity:.85">' + int(a.hosp) +
          ' hospitalisations, population ' + int(a.population) + '</span><br>Non-Indigenous: ' + dp1(b.hosp_per_100k) +
          ' per 100,000<br><span style="opacity:.85">' + int(b.hosp) + ' hospitalisations, population ' + int(b.population) + '</span>';
      }

      function drawA(w) {
        var animate = animA; animA = false;
        var s = bus.get(), view = s.aView;
        var measure = measurer(hostA);
        var wide = w >= 480;

        /* end labels, computed first so the right margin fits the longest line */
        var P = {}; P[FN] = pts(FN, view); P[NI] = pts(NI, view);
        var labelLines = {};
        [FN, NI].forEach(function (st) {
          var e = P[st][P[st].length - 1];
          labelLines[st] = view === 'index'
            ? [GN[st], sgn(e.v - 100), int(base[st].hosp) + ' to ' + int(last[st].hosp)]
            : [GN[st], dp0(e.v) + ' per 100,000'];
        });
        var longest = 0;
        [FN, NI].forEach(function (st) {
          labelLines[st].forEach(function (ln, k) { longest = Math.max(longest, measure(ln, k === 2 ? 12 : 13, k === 2 ? 400 : 700)); });
        });
        var m = { top: 40, right: Math.max(100, Math.ceil(longest) + 16), bottom: 34, left: wide ? 46 : 40 };
        var h = Viz.height(w, { ratio: 0.7, min: wide ? 340 : 310, max: 430 });
        var innerW = Math.max(120, w - m.left - m.right), innerH = h - m.top - m.bottom;
        var x = d3.scaleLinear().domain([Y0, Y1]).range([0, innerW]);
        var dom = view === 'index' ? [80, 220] : [0, 250];
        var y = d3.scaleLinear().domain(dom).range([innerH, 0]);
        var ticks = view === 'index' ? d3.range(80, 221, 20) : d3.range(0, 251, 50);

        var svg = Viz.svg(hostA, w, h);
        var root = svg.append('g').attr('transform', 'translate(' + m.left + ',' + m.top + ')');
        var dyn = root.append('g').attr('class', 'ch5-fade');

        dyn.selectAll('line.ch5-grid').data(ticks).join('line')
          .attr('class', function (d) { return 'ch5-grid' + (view === 'index' && d === 100 ? ' is-base' : ''); })
          .attr('x1', 0).attr('x2', innerW).attr('y1', function (d) { return y(d); }).attr('y2', function (d) { return y(d); });
        dyn.selectAll('text.ch5-ytick').data(ticks).join('text').attr('class', 'ch5-tick ch5-ytick')
          .attr('x', -8).attr('y', function (d) { return y(d); }).attr('dy', '0.32em').attr('text-anchor', 'end').text(function (d) { return d; });
        var xt = view === 'rate' ? rateYears : (innerW >= 300 ? d3.range(Y0, Y1 + 1, 2) : [Y0, 2016, Y1]);
        xt = xt.filter(function (t) { return t >= Y0 && t <= Y1; });
        dyn.selectAll('text.ch5-xtick').data(xt).join('text').attr('class', 'ch5-tick ch5-xtick')
          .attr('x', function (d) { return x(d); }).attr('y', innerH + 22).attr('text-anchor', 'middle').text(function (d) { return d; });
        dyn.append('text').attr('class', 'ch5-ytitle').attr('x', -m.left + 2).attr('y', -18)
          .text(view === 'index' ? 'Index, ' + Y0 + ' = 100' : 'Hospitalisations per 100,000 people');
        if (view === 'index') {
          dyn.append('text').attr('class', 'ch5-basenote').attr('x', 4).attr('y', y(100) + 15).text(Y0 + ' level');
        }

        /* lines: non-Indigenous first so First Nations sits on top */
        var line = d3.line().x(function (d) { return x(d.year); }).y(function (d) { return y(d.v); });
        [NI, FN].forEach(function (st) {
          dyn.append('path').attr('class', 'ch5-line is-' + GK[st] + ' ch5-g-' + GK[st] + (view === 'rate' ? ' is-dotted' : ''))
            .attr('d', line(P[st]));
        });
        [NI, FN].forEach(function (st) {
          var dots = view === 'rate' ? P[st] : [P[st][P[st].length - 1]];
          dyn.selectAll('circle.ch5-dot.is-' + GK[st]).data(dots).join('circle')
            .attr('class', 'ch5-dot is-' + GK[st] + ' ch5-g-' + GK[st]).attr('r', 5.5)
            .attr('cx', function (d) { return x(d.year); }).attr('cy', function (d) { return y(d.v); });
        });

        /* direct labels at the right end (no legend box); hovering a label focuses its group */
        var labs = [FN, NI].map(function (st) {
          var e = P[st][P[st].length - 1];
          return { st: st, lines: labelLines[st], y: y(e.v) };
        }).sort(function (a, b) { return a.y - b.y; });
        var lineH = 15;
        for (var i = 1; i < labs.length; i++) {
          var need = labs[i - 1].y + (labs[i - 1].lines.length + labs[i].lines.length) / 2 * lineH + 6;
          if (labs[i].y < need) labs[i].y = need;
        }
        var tx = x(Y1) + 12;
        labs.forEach(function (l) {
          var t = dyn.append('text').attr('class', 'ch5-label is-' + GK[l.st] + ' ch5-g-' + GK[l.st]).attr('x', tx).attr('y', l.y).attr('dominant-baseline', 'central');
          l.lines.forEach(function (ln, k) {
            t.append('tspan').attr('x', tx).attr('dy', k === 0 ? (-(l.lines.length - 1) * lineH / 2) + 'px' : lineH + 'px')
              .style('font-weight', k < 2 ? 700 : 400).style('font-size', k === 2 ? '12px' : null).text(ln);
          });
          hoverable(t, l.st);
        });

        /* annotations (rate view): "2011: 145 vs 149" top left; "2021: 226 vs 149" under the non-Indigenous end, with a bracket */
        if (view === 'rate') {
          var ax = 2, ay = y(236);
          dyn.append('text').attr('class', 'ch5-ann').attr('x', ax).attr('y', ay).text(Y0 + ': ' + dp0(rate11[FN]) + ' vs ' + dp0(rate11[NI]));
          dyn.append('text').attr('class', 'ch5-ann-sub').attr('x', ax).attr('y', ay + 15).text('close to level');
          var bx = x(Y1) - 14, fy = y(rate21[FN]), ny = y(rate21[NI]);
          dyn.append('path').attr('class', 'ch5-bracket').attr('d', 'M' + (bx + 5) + ',' + fy + 'H' + bx + 'V' + ny + 'H' + (bx + 5));
          var rx = x(Y1) + 4, ry = y(112);
          var t2 = dyn.append('text').attr('class', 'ch5-ann').attr('text-anchor', 'end').attr('x', rx).attr('y', ry);
          t2.append('tspan').attr('x', rx).text(Y1 + ': ' + dp0(rate21[FN]) + ' vs ' + dp0(rate21[NI]));
          t2.append('tspan').attr('x', rx).attr('dy', 15).attr('class', 'ch5-ann-sub').text('about ' + dp1(ratio21) + ' times as high');
        }

        if (animate && !Viz.reducedMotion()) {
          dyn.style('opacity', 0).transition().duration(Viz.dur(380)).style('opacity', 1);
        }

        /* hover layer: one focusable plot area; arrow keys step through the points */
        var hov = root.append('g').attr('class', 'ch5-hov');
        var guide = hov.append('line').attr('class', 'ch5-guide').attr('y1', 0).attr('y2', innerH).style('opacity', 0);
        var gdots = hov.selectAll('circle.ch5-gdot').data([NI, FN]).join('circle')
          .attr('class', function (st) { return 'ch5-gdot is-' + GK[st]; }).attr('r', 7).style('opacity', 0);
        var hit = hov.append('rect').attr('class', 'ch5-hit').attr('x', -10).attr('y', 0).attr('width', innerW + 20).attr('height', innerH)
          .attr('tabindex', 0).attr('role', 'group');
        var node = hit.node();
        var yrs = stepYears(view);
        var cur = null;
        A = { view: view, x: x, y: y, hit: node };
        node.setAttribute('aria-label', 'Chart A plot area. Left and right arrow keys move between ' + yrs.length + ' points: ' +
          (view === 'rate' ? yrs.join(', ') : Y0 + ' to ' + Y1) + '. Home and End jump to the first and last.');

        function nearest(yr) { return yrs.reduce(function (b, c) { return Math.abs(c - yr) < Math.abs(b - yr) ? c : b; }, yrs[0]); }
        function valuesAt(yr) {
          var o = {};
          [FN, NI].forEach(function (st) { o[st] = P[st].filter(function (p) { return p.year === yr; })[0]; });
          return o;
        }
        function showYear(yr, cx, cy) {
          cur = yr;
          var gx = x(yr), vals = valuesAt(yr);
          guide.attr('x1', gx).attr('x2', gx).style('opacity', 1);
          gdots.each(function (st) { d3.select(this).attr('cx', gx).attr('cy', y(vals[st].v)).style('opacity', 1); });
          if (cx == null) {
            var box = node.getBoundingClientRect();
            cx = box.left + 10 + gx; cy = box.top + innerH * 0.4;
          }
          Viz.tooltip.show(tipA(yr, view), cx, cy, node);
        }
        function clearYear() {
          cur = null;
          guide.style('opacity', 0); gdots.style('opacity', 0);
          Viz.tooltip.hide();
        }
        /* group nearest the pointer (within 16px of its line), else null */
        function groupNear(px, py) {
          var best = null, bd = 16;
          [FN, NI].forEach(function (st) {
            var p = P[st], yv = null;
            for (var k = 0; k < p.length - 1; k++) {
              var xa = x(p[k].year), xb = x(p[k + 1].year);
              if (px >= xa - 8 && px <= xb + 8) {
                var tt = Math.max(0, Math.min(1, (px - xa) / (xb - xa)));
                yv = y(p[k].v) + (y(p[k + 1].v) - y(p[k].v)) * tt;
                break;
              }
            }
            if (yv != null && Math.abs(py - yv) <= bd) { bd = Math.abs(py - yv); best = st; }
          });
          return best;
        }
        node.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch') return;
          var box = node.getBoundingClientRect();
          var px = e.clientX - box.left - 10, py = e.clientY - box.top;
          showYear(nearest(x.invert(px)), e.clientX, e.clientY);
          setHover(groupNear(px, py));
        });
        node.addEventListener('pointerleave', function (e) {
          if (e.pointerType === 'touch') return;
          setHover(null);
          if (document.activeElement !== node) clearYear();
        });
        node.addEventListener('pointerdown', function (e) {
          if (e.pointerType !== 'touch') return;
          var box = node.getBoundingClientRect();
          showYear(nearest(x.invert(e.clientX - box.left - 10)), e.clientX, e.clientY);
        });
        node.addEventListener('focus', function () { showYear(cur != null ? nearest(cur) : yrs[yrs.length - 1]); });
        node.addEventListener('blur', function () { clearYear(); });
        node.addEventListener('keydown', function (e) {
          var k = e.key;
          if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].indexOf(k) < 0) return;
          e.preventDefault();
          var i = yrs.indexOf(cur != null ? nearest(cur) : yrs[yrs.length - 1]);
          if (k === 'ArrowRight') i = Math.min(yrs.length - 1, i + 1);
          else if (k === 'ArrowLeft') i = Math.max(0, i - 1);
          else if (k === 'Home') i = 0; else i = yrs.length - 1;
          showYear(yrs[i]);
          Viz.announce(Viz.plainText(tipA(yrs[i], view)));
        });
        hostA.setAttribute('aria-label', describeA(view));
      }

      /* ============================================================ panel B */
      function tipB(it, view) {
        var f = it.g[FN], n = it.g[NI];
        var t = '<strong>' + it.label + '</strong>' +
          '<br>First Nations: ' + pct1(f.share) + ' (' + int(f.hosp) + ' hospitalisations), average stay ' + dp1(f.stay) + ' days' +
          '<br>Non-Indigenous: ' + pct1(n.share) + ' (' + int(n.hosp) + '), average stay ' + dp1(n.stay) + ' days';
        if (view === 'road_user') {
          t += '<br><span style="opacity:.85">Suppressed (n.p.) cells left out: ' + f.np + ' First Nations, ' + n.np + ' non-Indigenous</span>';
        }
        return t;
      }

      function drawB(w) {
        var animate = animB; animB = false;
        var dur = animate ? Viz.dur(380) : 0;
        var s = bus.get(), view = s.bView, items = ITEMS[view];
        var measure = measurer(hostB);
        var narrow = w < 440;
        var left = narrow ? 92 : 106, right = narrow ? 52 : 58;
        var pw = Math.max(100, w - left - right);
        var n = items.length, targetH = narrow ? 280 : 320;
        var rowH = Math.max(54, Math.min(92, Math.floor(targetH / n)));
        var barH = Math.max(16, Math.min(24, Math.round(rowH * 0.3))), inner = 3;
        var h = n * rowH + 8;
        var smax = d3.max(items, function (it) { return Math.max(it.g[FN].share, it.g[NI].share); });
        var xs = d3.scaleLinear().domain([0, smax]).range([0, pw]);   /* one shared scale per view */
        var svg = Viz.svg(hostB, w, h);
        var g = svg.append('g').attr('transform', 'translate(' + left + ',4)');
        g.append('line').attr('class', 'ch5-zero').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', n * rowH);
        var hlKey = HLKEY[view];

        var rows = g.selectAll('g.ch5-row').data(items).join('g').attr('class', 'ch5-row')
          .attr('transform', function (d, i) { return 'translate(0,' + (i * rowH) + ')'; });
        rows.each(function (it) {
          var row = d3.select(this), isHl = it.key === hlKey;
          if (isHl) row.append('rect').attr('class', 'ch5-hlband').attr('x', -left).attr('width', w).attr('y', 2).attr('height', rowH - 4).attr('rx', 4);
          row.append('rect').attr('class', 'ch5-rowhit').attr('x', -left).attr('width', w).attr('y', 0).attr('height', rowH);
          row.append('text').attr('class', 'ch5-cat' + (isHl ? ' is-hl' : '')).attr('x', -10).attr('y', rowH / 2).attr('dy', '0.35em')
            .attr('text-anchor', 'end').text(it.label);
          var gy = (rowH - (2 * barH + inner)) / 2;
          [FN, NI].forEach(function (st, k) {
            var d = it.g[st], by = gy + k * (barH + inner);
            var grp = row.append('g').attr('class', 'ch5-bargrp ch5-g-' + GK[st]);
            var bar = grp.append('rect').attr('class', 'ch5-bar is-' + GK[st]).attr('x', 0).attr('y', by).attr('height', barH).attr('rx', 2)
              .attr('width', dur ? 0 : Math.max(1, xs(d.share)));
            var val = grp.append('text').attr('class', 'ch5-val is-' + GK[st]).attr('y', by + barH / 2).attr('dy', '0.35em')
              .attr('x', dur ? 6 : xs(d.share) + 6).text(pct1(d.share));
            if (dur) {
              bar.transition().duration(dur).attr('width', Math.max(1, xs(d.share)));
              val.attr('fill-opacity', 0).transition().duration(dur).attr('x', xs(d.share) + 6).attr('fill-opacity', 1);
            }
            hoverable(grp, st);
          });
          if (isHl) {
            var f = it.g[FN], nn = it.g[NI];
            var txt = pct1(f.share) + ' vs ' + pct1(nn.share);
            var tw = measure(txt, 13, 700);
            var vEnd = xs(Math.max(f.share, nn.share)) + 6 + measure(pct1(Math.max(f.share, nn.share)), 13, 700);
            var axp = Math.min(vEnd + 14, pw + right - tw - 2);
            axp = Math.max(axp, vEnd + 10);
            var at = row.append('text').attr('class', 'ch5-ann').attr('x', axp).attr('y', rowH / 2).attr('dy', '0.35em').text(txt);
            if (dur) at.attr('fill-opacity', 0).transition().delay(dur * 0.5).duration(dur).attr('fill-opacity', 1);
          }
        });
        /* tooltip + roving tab stop on the rows; the row label carries the data, so no aria-describedby */
        rows.attr('role', 'img').attr('aria-label', function (it) { return rowLabel(it, view); });
        Viz.tooltip.bind(rows, function (it) { return tipB(it, view); }, { roving: false });
        rows.each(function () { this.__tipNamed = true; });
        roving(rows.nodes());
        hostB.setAttribute('aria-label', describeB(view));
      }

      /* ============================================================ tables */
      var tabHost = board.querySelector('.board-tables');
      var tabA = document.createElement('div'), tabB = document.createElement('div');
      if (tabHost) { tabHost.appendChild(tabA); tabHost.appendChild(tabB); }
      function buildTables() {
        if (!tabHost) return;
        var s = bus.get();
        var yrs = stepYears(s.aView);
        var rowsA = yrs.map(function (yr) {
          var a = rowAt(FN, yr), b = rowAt(NI, yr);
          return {
            year: yr, fh: a.hosp, fp: a.population, fr: a.hosp_per_100k, fi: a.hosp / base[FN].hosp * 100,
            nh: b.hosp, np: b.population, nr: b.hosp_per_100k, ni: b.hosp / base[NI].hosp * 100
          };
        });
        var colsA = s.aView === 'rate' ? [
          { key: 'year', label: 'Year' },
          { key: 'fh', label: 'First Nations hospitalisations', format: int },
          { key: 'fp', label: 'First Nations population (ABS)', format: int },
          { key: 'fr', label: 'First Nations per 100,000', format: dp1 },
          { key: 'nh', label: 'Non-Indigenous hospitalisations', format: int },
          { key: 'np', label: 'Non-Indigenous population (ERP minus First Nations)', format: int },
          { key: 'nr', label: 'Non-Indigenous per 100,000', format: dp1 }
        ] : [
          { key: 'year', label: 'Year' },
          { key: 'fh', label: 'First Nations hospitalisations', format: int },
          { key: 'fp', label: 'First Nations population (ABS, where available)', format: int },
          { key: 'fi', label: 'First Nations index (' + Y0 + ' = 100)', format: dp1 },
          { key: 'nh', label: 'Non-Indigenous hospitalisations', format: int },
          { key: 'np', label: 'Non-Indigenous population (where available)', format: int },
          { key: 'ni', label: 'Non-Indigenous index (' + Y0 + ' = 100)', format: dp1 }
        ];
        Viz.fillTable(tabA, rowsA, colsA, {
          caption: s.aView === 'rate'
            ? 'Chart A: hospitalisations per 100,000 people. Only ' + rateYears.join(', ') + ' have a population estimate, so only those years have a rate.'
            : 'Chart A: annual hospitalisations indexed to ' + Y0 + ' = 100. Population estimates exist for ' + rateYears.join(', ') + ' only; other years show a dash.'
        });

        var items = ITEMS[s.bView], isRu = s.bView === 'road_user';
        var rowsB = items.map(function (it) {
          return { label: it.label, f: it.g[FN], n: it.g[NI] };
        });
        var colsB = [{ key: 'label', label: isRu ? 'Road user' : 'Where the person lives', text: true }];
        colsB.push({ key: 'f1', label: 'First Nations hospitalisations', format: function (v, r) { return int(r.f.hosp); } });
        colsB.push({ key: 'f2', label: 'First Nations share', format: function (v, r) { return pct1(r.f.share); } });
        colsB.push({ key: 'f3', label: 'First Nations average stay (days)', format: function (v, r) { return dp1(r.f.stay); } });
        if (isRu) colsB.push({ key: 'f4', label: 'First Nations n.p. cells', format: function (v, r) { return int(r.f.np); } });
        colsB.push({ key: 'n1', label: 'Non-Indigenous hospitalisations', format: function (v, r) { return int(r.n.hosp); } });
        colsB.push({ key: 'n2', label: 'Non-Indigenous share', format: function (v, r) { return pct1(r.n.share); } });
        colsB.push({ key: 'n3', label: 'Non-Indigenous average stay (days)', format: function (v, r) { return dp1(r.n.stay); } });
        if (isRu) colsB.push({ key: 'n4', label: 'Non-Indigenous n.p. cells', format: function (v, r) { return int(r.n.np); } });
        Viz.fillTable(tabB, rowsB, colsB, {
          caption: isRu
            ? 'Chart B: share of each group' + '’' + 's hospitalisations by road user, 2016' + EN + '21 pooled. Share = row count divided by the group' + '’' + 's published total. All other = bus, heavy transport, pick-up or van and other or unknown. n.p. = suppressed cells, left out.'
            : 'Chart B: share of each group' + '’' + 's hospitalisations by where the person lives, 2016' + EN + '21 pooled. Share = area count divided by the group' + '’' + 's total across the three areas.'
        });
      }

      /* ============================================================ text for the current state */
      function updateTextA() {
        var v = bus.get().aView;
        titleElA.textContent = titleA(v);
        subElA.textContent = subA(v);
        hostA.setAttribute('aria-label', describeA(v));
      }
      function updateTextB() {
        var v = bus.get().bView;
        titleElB.textContent = titleB(v);
        subElB.textContent = subB(v);
        hostB.setAttribute('aria-label', describeB(v));
      }

      /* ============================================================ link */
      var respA = null, respB = null;
      bus.on(function (state, changed, source) {
        var aC = changed.indexOf('aView') >= 0, bC = changed.indexOf('bView') >= 0, fC = changed.indexOf('focus') >= 0;
        if (aC) segA.set(state.aView, true);
        if (bC) segB.set(state.bView, true);
        if (aC) { updateTextA(); animA = true; if (respA) respA.redraw(); }
        if (bC) { updateTextB(); animB = true; Viz.tooltip.hide(); if (respB) respB.redraw(); }
        if (aC || bC) buildTables();
        if (fC) syncFocus();
        setChip();
        if (source === 'init') return;
        if (aC) {
          Viz.flash(panelA);
          Viz.announce('Chart A shows ' + (state.aView === 'rate' ? 'hospitalisations per 100,000 people' : 'hospitalisations indexed to ' + Y0 + ' = 100') + '. ' + titleA(state.aView) + '.');
        } else if (bC) {
          Viz.flash(panelB);
          Viz.announce('Chart B shows shares ' + (state.bView === 'road_user' ? 'by road user' : 'by where the person lives') + '. ' + titleB(state.bView) + '.');
        } else if (fC && source === 'pin') {
          Viz.flash(panelA);
          Viz.announce(pinned ? 'Highlighting ' + GN[pinned] + ' in both charts. The other group is dimmed.' : 'Highlight cleared.');
        }
      });

      /* first fill of text, tables, chip and focus state for the default view, then the charts */
      updateTextA(); updateTextB(); buildTables(); setChip(); syncFocus();
      respA = Viz.responsive(hostA, function (w) { drawA(w); });
      respB = Viz.responsive(hostB, function (w) { drawB(w); });
    }
  };
})();
