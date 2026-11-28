/* ch2.js: Chapter 2 board, "Road injury is getting older". OWNED BY THE CHAPTER 2 AGENT.
   Two linked panels share one state { roadUser, age, mode } through Viz.bus:
     A  #ch2-a  heatmap, road user x age band, % change on 3-year averages (Counts or Per person),
                low counts hatched. Click, tap or arrow keys + Enter select a cell.
     B  #ch2-b  yearly line 2011-2021 (counts) for the selected cell, both 3-year windows shaded
                with their averages (per 100,000 people in Per person mode).
   The Explore bar (two selects, Counts | Per person) and the chip stay in sync.
   Data: data.ch2_age_roaduser. Every number is read from the CSV at runtime.
   The prose keys (cyc_65_74, c2_cyc65_2011, ...) are registered in facts.js. */
(function () {
  'use strict';
  window.Charts = window.Charts || {};

  var fmt = Viz.fmt;
  var EN = '–', MINUS = '−', NB = '⁠';
  var AGES = Viz.AGE_BANDS;
  var ROWS = ['Pedestrian', 'Pedal cyclist', 'Motorcyclist', 'Car driver', 'Car passenger'];
  var PLURAL = { 'Pedestrian': 'Pedestrians', 'Pedal cyclist': 'Cyclists', 'Motorcyclist': 'Motorcyclists',
    'Car driver': 'Car drivers', 'Car passenger': 'Car passengers' };
  var LOWER = { 'Pedestrian': 'pedestrians', 'Pedal cyclist': 'cyclists', 'Motorcyclist': 'motorcyclists',
    'Car driver': 'car drivers', 'Car passenger': 'car passengers' };
  var SHORT = { 'Pedestrian': 'Pedestrian', 'Pedal cyclist': 'Cyclist', 'Motorcyclist': 'Motorcyclist',
    'Car driver': 'Driver', 'Car passenger': 'Passenger' };
  var YEARS = d3.range(2011, 2022);
  var CAP_LO = -50, CAP_HI = 100;   /* colour stops here; bigger changes are printed, not drawn darker */

  function sp(v) { return fmt.minus(fmt.signedPct(v, 0)); }                 /* "+138%" / "−28%" */
  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function ageLabel(a) { return a === '75+' ? '75+' : fmt.age(a); }
  function ageWords(a) { return a === '75+' ? 'aged 75 and over' : 'aged ' + fmt.age(a); }
  function lum(c) {
    var k = d3.rgb(c), f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(k.r) + 0.7152 * f(k.g) + 0.0722 * f(k.b);
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  window.Charts['ch2'] = {
    init: function (board, data) {
      /* ---------------------------------------------------- cell model */
      var cells = {}, cellList = [];
      data.ch2_age_roaduser.forEach(function (r) {
        var a0 = r.avg_2011_13, a1 = r.avg_2019_21;
        var c = {
          ru: r.road_user, age: r.age_group, a0: a0, a1: a1,
          pct: r.pct_change_3yr,
          pp: ((a1 / r.pop_2019_21) / (a0 / r.pop_2011_13) - 1) * 100,
          r0: a0 / r.pop_2011_13 * 1e5, r1: a1 / r.pop_2019_21 * 1e5,
          low: r.low_count === true,
          series: YEARS.map(function (y) { return r[y]; })
        };
        cells[r.road_user + '|' + r.age_group] = c;
        cellList.push(c);
      });
      function cellAt(ru, age) { return cells[ru + '|' + age]; }

      var bus = Viz.bus({ roadUser: 'Pedal cyclist', age: '65-74', mode: 'counts' });

      var panelA = board.querySelector('#ch2-a'), panelB = board.querySelector('#ch2-b');
      var chartA = panelA.querySelector('.panel-chart'), chartB = panelB.querySelector('.panel-chart');
      var titleB = panelB.querySelector('.panel-title');
      var subA = panelA.querySelector('.panel-sub'), subB = panelB.querySelector('.panel-sub');
      var chip = board.querySelector('output.board-chip');
      var tablesHost = board.querySelector('.board-tables');

      var sentenceEl = mk('p', 'c2-sentence');
      panelA.insertBefore(sentenceEl, chartA);
      var lowNote = mk('p', 'c2-lownote', 'Few cases (average under 30 a year): read with care');
      lowNote.hidden = true;
      panelB.appendChild(lowNote);

      /* ------------------------------------------------------ controls */
      var ctl = board.querySelector('.explore-controls');
      ctl.innerHTML = '';
      function field(labelText, id, options, cur) {
        var wrap = mk('div', 'ctl-field');
        var lab = mk('label', 'ctl-label', labelText); lab.setAttribute('for', id);
        var sel = mk('select'); sel.id = id;
        options.forEach(function (o) { var op = mk('option', null, o[1]); op.value = o[0]; sel.appendChild(op); });
        sel.value = cur;
        wrap.appendChild(lab); wrap.appendChild(sel);
        ctl.appendChild(wrap);
        return sel;
      }
      var st0 = bus.get();
      var selRU = field('I travel by', 'c2-roaduser', ROWS.map(function (r) { return [r, r]; }), st0.roadUser);
      var selAge = field('I’m aged', 'c2-age', AGES.map(function (a) { return [a, ageLabel(a)]; }), st0.age);
      var modeWrap = mk('div', 'ctl-field');
      var modeLab = mk('span', 'ctl-label', 'Show'); modeLab.id = 'c2-mode-label';
      var segEl = mk('div', 'seg c2-seg'); segEl.setAttribute('role', 'group'); segEl.setAttribute('aria-labelledby', 'c2-mode-label');
      [['counts', 'Counts'], ['pp', 'Per person']].forEach(function (m) {
        var b = mk('button', null, m[1]); b.type = 'button'; b.setAttribute('data-value', m[0]);
        b.setAttribute('aria-pressed', m[0] === st0.mode ? 'true' : 'false');
        segEl.appendChild(b);
      });
      modeWrap.appendChild(modeLab); modeWrap.appendChild(segEl); ctl.appendChild(modeWrap);
      var seg = Viz.segmented(segEl, { announce: false, onChange: function (v) { bus.set({ mode: v }, 'controls'); } });
      selRU.addEventListener('change', function () { bus.set({ roadUser: selRU.value }, 'controls'); });
      selAge.addEventListener('change', function () { bus.set({ age: selAge.value }, 'controls'); });

      /* ---------------------------------------------------- phrases */
      function sel() { var s = bus.get(); return cellAt(s.roadUser, s.age); }
      function who(c) { return PLURAL[c.ru] + ' ' + ageWords(c.age); }
      function val(c, mode) { return (mode || bus.get().mode) === 'pp' ? c.pp : c.pct; }
      function sentence(c, mode) {
        var s = mode === 'pp'
          ? who(c) + ': ' + sp(c.pp) + ' per person since 2011' + NB + EN + NB + '13 (admissions ' + sp(c.pct) + ')'
          : who(c) + ': ' + sp(c.pct) + ' since 2011' + NB + EN + NB + '13 (per person ' + sp(c.pp) + ')';
        return s;
      }
      function per100(v) { return fmt.dp(v, 1); }

      /* ================================================================ A */
      var C = {}, A = null, lastWA = 0;
      function tval(v) { return Math.max(-1, Math.min(1, Math.log(Math.max(1 + v / 100, 1e-4)) / Math.LN2)); }
      function fillFor(v) {
        var t = tval(v);
        return d3.interpolateRgb(C.band, t >= 0 ? C.rise : C.fall)(Math.pow(Math.abs(t), 0.85));
      }
      /* ink or paper, whichever reads better; mid-tones fall back to pure black/white so text stays >= 4.5:1 */
      function inkFor(fill) {
        var best = contrast(fill, C.ink) >= contrast(fill, C.paper) ? C.ink : C.paper;
        if (contrast(fill, best) >= 4.5) return best;
        return contrast(fill, '#000000') >= contrast(fill, '#ffffff') ? '#000000' : '#ffffff';
      }
      function tipA(c) {
        var h = '<strong>' + who(c) + '</strong><br>' +
          '2011' + EN + '13 average: ' + fmt.dp(c.a0, 1) + ' a year<br>' +
          '2019' + EN + '21 average: ' + fmt.dp(c.a1, 1) + ' a year<br>' +
          'Change: ' + sp(c.pct) + ' · per person ' + sp(c.pp) + '<br>' +
          '2011: ' + fmt.int(c.series[0]) + ' · 2021: ' + fmt.int(c.series[10]) +
          '<br><em>Select to show it in chart B</em>';
        if (c.low) h += '<br><em>Few cases (under 30 a year): treat with care.</em>';
        return h;
      }
      function cellAria(c, mode) {
        return who(c) + ': ' + sp(val(c, mode)) + (mode === 'pp' ? ' per person' : ' in admissions') + (c.low ? ', few cases' : '');
      }

      function buildA(w) {
        C = Viz.colors();
        lastWA = w;
        var narrow = w < 520;
        var geom = { narrow: narrow, labelW: narrow ? 66 : 124, headH: narrow ? 42 : 30, cellH: narrow ? 42 : 48 };
        geom.cellW = (w - geom.labelW) / AGES.length;
        var H = geom.headH + ROWS.length * geom.cellH + 4;
        var svg = Viz.svg(chartA, w, H, { cls: 'c2-heat', reuse: true, clear: true });
        var defs = svg.append('defs');
        var pat = defs.append('pattern').attr('id', 'c2-hatch').attr('width', 6).attr('height', 6)
          .attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
        pat.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('class', 'c2-hatchline');

        svg.append('g').attr('class', 'axis c2-cols').selectAll('text').data(AGES).join('text')
          .attr('x', function (a, i) { return geom.labelW + (i + 0.5) * geom.cellW; })
          .attr('y', function (a, i) { return geom.headH - 9 - (narrow && i % 2 ? 15 : 0); }).attr('text-anchor', 'middle').text(ageLabel);
        svg.append('g').attr('class', 'axis c2-rows').selectAll('text').data(ROWS).join('text')
          .attr('x', geom.labelW - 8).attr('y', function (r, i) { return geom.headH + (i + 0.5) * geom.cellH; })
          .attr('text-anchor', 'end').attr('dominant-baseline', 'central')
          .text(function (r) { return narrow ? SHORT[r] : r; });

        var items = [], els = ROWS.map(function () { return []; });
        ROWS.forEach(function (ru, ri) {
          AGES.forEach(function (age, ai) { var c = cellAt(ru, age); c.ri = ri; c.ai = ai; items.push(c); });
        });
        var gs = svg.append('g').attr('class', 'c2-cells').selectAll('g.c2-cell').data(items).join('g').attr('class', 'c2-cell')
          .attr('transform', function (c) { return 'translate(' + (geom.labelW + c.ai * geom.cellW) + ',' + (geom.headH + c.ri * geom.cellH) + ')'; })
          .attr('role', 'button').attr('tabindex', -1);
        gs.append('rect').attr('class', 'c2-fill').attr('x', 1).attr('y', 1)
          .attr('width', Math.max(1, geom.cellW - 2)).attr('height', geom.cellH - 2).attr('rx', 2);
        gs.filter(function (c) { return c.low; }).append('rect').attr('class', 'c2-hatch').attr('x', 1).attr('y', 1)
          .attr('width', Math.max(1, geom.cellW - 2)).attr('height', geom.cellH - 2).attr('rx', 2)
          .attr('fill', 'url(#c2-hatch)');
        gs.append('text').attr('class', 'c2-val').attr('x', geom.cellW / 2).attr('y', geom.cellH / 2)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central');
        gs.each(function (c) { els[c.ri][c.ai] = this; });

        var top = svg.append('g').attr('class', 'c2-top');
        top.append('rect').attr('class', 'c2-sel-halo').attr('fill', 'none');
        top.append('rect').attr('class', 'c2-sel').attr('fill', 'none');
        top.append('rect').attr('class', 'c2-focus').attr('fill', 'none').style('display', 'none');
        A = { svg: svg, gs: gs, top: top, geom: geom, els: els, w: w };

        Viz.tooltip.bind(gs, function (c) { return tipA(c); }, { roving: false });
        gs.on('click.sel', function (ev, c) { bus.set({ roadUser: c.ru, age: c.age }, 'panel-a'); });
        gs.on('keydown.nav', function (ev, c) { onKey(ev, c); });
        gs.on('focus.mark', function (ev, c) {
          gs.attr('tabindex', -1); d3.select(this).attr('tabindex', 0);
          placeRect(top.select('.c2-focus'), c, 3).style('display', null);
        });
        gs.on('blur.mark', function () { top.select('.c2-focus').style('display', 'none'); });

        paintCells(false);
        paintSelection();
        drawLegend(w);
      }
      function placeRect(rect, c, inset) {
        var g = A.geom, x = g.labelW + c.ai * g.cellW, y = g.headH + c.ri * g.cellH;
        return rect.attr('x', x + inset - 1).attr('y', y + inset - 1)
          .attr('width', g.cellW - 2 * inset + 2).attr('height', g.cellH - 2 * inset + 2).attr('rx', 3);
      }
      function paintCells(animate) {
        if (!A) return;
        var mode = bus.get().mode, dur = animate ? Viz.dur(400) : 0, narrow = A.geom.narrow;
        A.gs.each(function (c) {
          var v = val(c, mode), f = fillFor(v), node = d3.select(this), r = node.select('rect.c2-fill');
          (dur ? r.transition().duration(dur) : r).style('fill', f);
          node.select('text.c2-val').text(narrow ? sp(v).replace('%', '') : sp(v))
            .style('fill', inkFor(f))
            .style('stroke', c.low ? f : null).style('stroke-width', c.low ? 3 : null);
          node.attr('aria-label', cellAria(c, mode));
        });
      }
      function paintSelection() {
        if (!A) return;
        var c = sel();
        placeRect(A.top.select('.c2-sel-halo'), c, 2);
        placeRect(A.top.select('.c2-sel'), c, 2);
        A.gs.attr('aria-pressed', function (d) { return d === c ? 'true' : 'false'; });
        if (!A.svg.node().contains(document.activeElement)) {
          A.gs.attr('tabindex', -1);
          d3.select(A.els[c.ri][c.ai]).attr('tabindex', 0);
        }
      }
      /* arrow keys move focus AND the selection; each move sets the state */
      function onKey(ev, c) {
        var ri = c.ri, ai = c.ai, k = ev.key;
        if (k === 'Enter' || k === ' ' || k === 'Spacebar') { ev.preventDefault(); bus.set({ roadUser: c.ru, age: c.age }, 'panel-a'); return; }
        if (k === 'ArrowRight') ai = Math.min(AGES.length - 1, ai + 1);
        else if (k === 'ArrowLeft') ai = Math.max(0, ai - 1);
        else if (k === 'ArrowDown') ri = Math.min(ROWS.length - 1, ri + 1);
        else if (k === 'ArrowUp') ri = Math.max(0, ri - 1);
        else if (k === 'Home') ai = 0;
        else if (k === 'End') ai = AGES.length - 1;
        else return;
        ev.preventDefault();
        var n = cellAt(ROWS[ri], AGES[ai]);
        A.els[ri][ai].focus();
        bus.set({ roadUser: n.ru, age: n.age }, 'panel-a');
      }

      function drawLegend(w) {
        var lg = chartA.querySelector('.c2-legend');
        if (!lg) { lg = mk('div', 'c2-legend'); chartA.appendChild(lg); }
        lg.innerHTML = '';
        var mode = bus.get().mode;
        lg.appendChild(mk('p', 'c2-legend-title', mode === 'pp'
          ? 'Colour and numbers: % change per person (admissions ÷ ABS population)'
          : 'Colour and numbers: % change in admissions, 3‑year averages'));
        var barW = Math.min(280, w - 8), pos = function (pct) { return (tval(pct) + 1) / 2 * barW; };
        var svg = d3.select(lg).append('svg').attr('class', 'c2-scale').attr('aria-hidden', 'true').attr('focusable', 'false')
          .attr('width', barW + 8).attr('height', 40).attr('viewBox', '0 0 ' + (barW + 8) + ' 40');
        var grad = svg.append('defs').append('linearGradient').attr('id', 'c2-grad');
        d3.range(0, 1.001, 0.1).forEach(function (u) {
          grad.append('stop').attr('offset', u).attr('stop-color', fillFor((Math.pow(2, u * 2 - 1) - 1) * 100));
        });
        var s = svg.append('g').attr('transform', 'translate(4,2)');
        s.append('rect').attr('class', 'c2-bar').attr('width', barW).attr('height', 12).attr('rx', 2).attr('fill', 'url(#c2-grad)');
        [CAP_LO, -25, 0, 25, CAP_HI].forEach(function (p) {
          s.append('line').attr('class', 'c2-tick').attr('x1', pos(p)).attr('x2', pos(p)).attr('y1', 12).attr('y2', 17);
          s.append('text').attr('class', 'c2-ticklab').attr('x', pos(p)).attr('y', 31)
            .attr('text-anchor', p === CAP_LO ? 'start' : p === CAP_HI ? 'end' : 'middle')
            .text(p === 0 ? '0%' : (p < 0 ? MINUS : '+') + Math.abs(p) + '%');
        });
        var note = mk('p', 'c2-legend-note');
        note.innerHTML = 'Colours stop at ' + MINUS + '50% and +100%: bigger changes are printed but not drawn darker. ' +
          '<span class="c2-swatch" aria-hidden="true"></span> Hatched = few cases (average under 30 a year).';
        lg.appendChild(note);
      }

      function textA() {
        var mode = bus.get().mode, c = sel();
        subA.textContent = mode === 'pp'
          ? '% change in admissions per 100,000 people of that age, 2011–13 to 2019–21'
          : '% change in yearly admissions, 2011–13 to 2019–21 averages';
        sentenceEl.textContent = sentence(c, mode) + (c.low ? '. Few cases: under 30 a year, so treat with care' : '') + '.';
        var ok = cellList.filter(function (x) { return !x.low; }).sort(function (a, b) { return val(b, mode) - val(a, mode); });
        var up = ok.slice(0, 3).map(function (x) { return PLURAL[x.ru] + ' ' + ageLabel(x.age) + ' (' + sp(val(x, mode)) + ')'; });
        var dn = ok[ok.length - 1];
        chartA.setAttribute('aria-label',
          'Heatmap of the change in ' + (mode === 'pp' ? 'admissions per person' : 'admissions') +
          ' between 2011' + EN + '13 and 2019' + EN + '21 by road user and age band. Largest rises: ' + up.join(', ') +
          '. Largest fall: ' + PLURAL[dn.ru] + ' ' + ageLabel(dn.age) + ' (' + sp(val(dn, mode)) + '). ' +
          sentenceEl.textContent + ' Use the pickers above, or the arrow keys on the grid, to choose another group.');
      }

      /* ================================================================ B */
      var B = null, lastWB = 0, lastYMax = 0;

      function buildB(w) {
        lastWB = w;
        var narrow = w < 440;
        var m = { l: narrow ? 52 : 58, r: narrow ? 10 : 14, t: 64, b: 28 };
        var h = Math.round(Math.max(narrow ? 270 : 300, Math.min(380, w * 0.7)));
        var iw = w - m.l - m.r, ih = h - m.t - m.b;
        var x = d3.scaleLinear().domain([2011, 2021]).range([0, iw]);
        var y = d3.scaleLinear().range([ih, 0]);
        var svg = Viz.svg(chartB, w, h, { hidden: true });
        var g = svg.append('g').attr('transform', 'translate(' + m.l + ',' + m.t + ')');
        B = { w: w, h: h, m: m, iw: iw, ih: ih, x: x, y: y, narrow: narrow, step: iw / 10 };

        B.wins = [{ a: 2011, b: 2013, k: 'a0', r: 'r0' }, { a: 2019, b: 2021, k: 'a1', r: 'r1' }].map(function (win) {
          var x0 = Math.max(x(win.a) - B.step / 2, -2), x1 = Math.min(x(win.b) + B.step / 2, iw + 4);
          var o = { def: win, x0: x0, x1: x1, cx: (x0 + x1) / 2 };
          g.append('rect').attr('class', 'c2-win').attr('x', x0).attr('y', -m.t + 6).attr('width', x1 - x0).attr('height', ih + m.t - 6);
          return o;
        });
        B.grid = g.append('g').attr('class', 'axis');
        g.append('text').attr('class', 'c2-ylab').attr('transform', 'rotate(-90)')
          .attr('x', -ih / 2).attr('y', -m.l + 14).attr('text-anchor', 'middle').text('Admissions a year');
        g.append('g').attr('class', 'axis').selectAll('text').data(YEARS.filter(function (yr) { return !narrow || yr % 2 === 1; }))
          .join('text').attr('x', x).attr('y', ih + 19).attr('text-anchor', 'middle').text(function (yr) { return yr; });
        B.wins.forEach(function (o) {
          var d = o.def, cx = o.cx;
          g.append('text').attr('class', 'c2-wlab c2-wyears').attr('x', cx).attr('y', -m.t + 22).attr('text-anchor', 'middle')
            .text(d.a + EN + String(d.b).slice(2));
          o.l1 = g.append('text').attr('class', 'c2-wlab').attr('x', cx).attr('y', -m.t + 37).attr('text-anchor', 'middle');
          o.l2 = g.append('text').attr('class', 'c2-wlab').attr('x', cx).attr('y', -m.t + 51).attr('text-anchor', 'middle');
          o.avg = g.append('line').attr('class', 'c2-avg').attr('x1', o.x0).attr('x2', o.x1);
        });
        B.path = g.append('path').attr('class', 'c2-line');
        B.dots = g.append('g').selectAll('circle').data(YEARS).join('circle').attr('class', 'c2-dot').attr('cx', x).attr('r', 3.2);
        B.first = g.append('text').attr('class', 'c2-endlab').attr('x', x(2011) + 5).attr('text-anchor', 'start');
        B.last = g.append('text').attr('class', 'c2-endlab').attr('x', x(2021)).attr('text-anchor', 'end');
        /* invisible per-year hit targets carry the tooltip */
        B.hits = g.append('g').selectAll('rect').data(YEARS).join('rect').attr('class', 'c2-hit')
          .attr('x', function (yr) { return x(yr) - B.step / 2; }).attr('width', B.step).attr('y', 0).attr('height', ih);
        Viz.tooltip.bind(B.hits, function (yr) {
          var c = sel(), i = yr - 2011;
          return '<strong>' + who(c) + '</strong><br>' + yr + ': ' + fmt.int(c.series[i]) + ' admitted';
        }, { roving: false });
        B.hits.attr('tabindex', null);
      }

      function updateB(animate) {
        if (!B) return;
        var st = bus.get(), c = sel(), mode = st.mode, y = B.y, x = B.x;
        var dur = animate ? Viz.dur(400) : 0;
        function T(s) { return dur ? s.transition().duration(dur) : s; }
        y.domain([0, Math.max(1, d3.max(c.series)) * 1.12]).nice(4);
        lastYMax = y.domain()[1];

        var ticks = y.ticks(4);
        var s = B.grid.selectAll('g.tk').data(ticks, function (d) { return d; });
        s.exit().transition().duration(dur).style('opacity', 0).remove();
        var en = s.enter().append('g').attr('class', 'tk')
          .attr('transform', function (d) { return 'translate(0,' + y(d) + ')'; }).style('opacity', dur ? 0 : 1);
        en.append('line').attr('class', function (d) { return d === 0 ? 'c2-zero' : 'c2-grid'; }).attr('x2', B.iw);
        en.append('text').attr('x', -8).attr('dy', '0.32em').attr('text-anchor', 'end').text(function (d) { return fmt.int(d); });
        T(en.merge(s)).attr('transform', function (d) { return 'translate(0,' + y(d) + ')'; }).style('opacity', 1);

        B.wins.forEach(function (o) {
          var d = o.def;
          if (mode === 'pp') { o.l1.text(per100(c[d.r])); o.l2.text('per 100,000').style('display', null); }
          else { o.l1.text('avg ' + fmt.int(c[d.k])); o.l2.text('').style('display', 'none'); }
          T(o.avg).attr('y1', y(c[d.k])).attr('y2', y(c[d.k]));
        });
        T(B.path).attr('d', d3.line().x(function (yr) { return x(yr); }).y(function (yr) { return y(c.series[yr - 2011]); })(YEARS));
        T(B.dots).attr('cy', function (yr) { return y(c.series[yr - 2011]); });
        B.first.text(fmt.int(c.series[0])); B.last.text(fmt.int(c.series[10]));
        T(B.first).attr('y', y(c.series[0]) - 9);
        T(B.last).attr('y', y(c.series[10]) - 9);

        subB.textContent = 'Yearly admissions for the selected road user and age band · 2011–2021' +
          (mode === 'pp' ? '. Per-person figures exist only for the two 3-year windows (population by year is not in this file)' : '');
        lowNote.hidden = !c.low;
        var trend = c.series[10] > c.series[0] ? 'rose' : c.series[10] < c.series[0] ? 'fell' : 'was level';
        chartB.setAttribute('aria-label',
          'Line chart of yearly admissions, ' + who(c) + ', 2011 to 2021: ' + trend + ' from ' + fmt.int(c.series[0]) +
          ' in 2011 to ' + fmt.int(c.series[10]) + ' in 2021. The 2011' + EN + '13 average was ' + fmt.dp(c.a0, 1) +
          ' a year and the 2019' + EN + '21 average ' + fmt.dp(c.a1, 1) + '.' +
          (mode === 'pp' ? ' Per 100,000 people of that age: ' + per100(c.r0) + ' then ' + per100(c.r1) + '.' : '') +
          (c.low ? ' Few cases: average under 30 a year, read with care.' : ''));
      }
      function textB() {
        var c = sel();
        titleB.textContent = who(c) + ': ' + fmt.int(c.series[0]) + ' admitted in 2011, ' + fmt.int(c.series[10]) + ' in 2021';
      }

      /* =============================================================== tables */
      var tblA = mk('div', 'c2-tbl'), tblB = mk('div', 'c2-tbl');
      tablesHost.innerHTML = '';
      tablesHost.appendChild(tblA); tablesHost.appendChild(tblB);
      function tableA() {
        var mode = bus.get().mode;
        var rows = ROWS.map(function (ru) {
          var o = { ru: PLURAL[ru] };
          AGES.forEach(function (a) { var c = cellAt(ru, a); o[a] = sp(val(c, mode)) + (c.low ? ' (few cases)' : ''); });
          return o;
        });
        var cols = [{ key: 'ru', label: 'Road user', text: true }];
        AGES.forEach(function (a) { cols.push({ key: a, label: ageLabel(a) }); });
        Viz.fillTable(tblA, rows, cols, { caption: 'Chart A: % change ' + (mode === 'pp' ? 'per person' : 'in yearly admissions') +
          ', 2011' + EN + '13 to 2019' + EN + '21, by road user (rows) and age band (columns). “Few cases” = average under 30 a year.' });
      }
      function tableB() {
        var c = sel();
        var rows = YEARS.map(function (yr) { return { p: String(yr), n: fmt.int(c.series[yr - 2011]), r: '' }; });
        rows.push({ p: 'Average 2011' + EN + '13', n: fmt.dp(c.a0, 1), r: per100(c.r0) });
        rows.push({ p: 'Average 2019' + EN + '21', n: fmt.dp(c.a1, 1), r: per100(c.r1) });
        Viz.fillTable(tblB, rows, [
          { key: 'p', label: 'Year', text: true },
          { key: 'n', label: 'Admissions' },
          { key: 'r', label: 'Per 100,000 of that age' }
        ], { caption: 'Chart B: yearly admissions, ' + who(c) + ', with the two 3-year averages' + (c.low ? ' (few cases)' : '') });
      }

      /* ================================================================ link */
      function setChip(st) {
        var c = cellAt(st.roadUser, st.age);
        chip.textContent = 'Showing: ' + LOWER[c.ru] + ' ' + ageWords(c.age).replace('aged ', 'aged ') + ' · ' + (st.mode === 'pp' ? 'per person' : 'counts');
        chip.hidden = false;
      }
      function sync(st) {
        selRU.value = st.roadUser; selAge.value = st.age; seg.set(st.mode, true);
      }

      bus.on(function (st, changed, source) {
        var cellChanged = changed.indexOf('roadUser') >= 0 || changed.indexOf('age') >= 0;
        var modeChanged = changed.indexOf('mode') >= 0;
        sync(st); setChip(st);
        textA();
        if (modeChanged) { paintCells(true); drawLegend(lastWA); }
        if (cellChanged) { paintSelection(); textB(); updateB(true); tableB(); }
        else updateB(false);
        if (modeChanged) tableA();
        /* the receiving panel flashes */
        if (cellChanged) { if (source !== 'panel-a') Viz.flash(panelA); if (source === 'panel-a' || source === 'controls') Viz.flash(panelB); }
        if (modeChanged) { Viz.flash(panelA); Viz.flash(panelB); }
        var c = cellAt(st.roadUser, st.age);
        Viz.announce(who(c) + ': ' + (st.mode === 'pp'
          ? sp(c.pp) + ' per person (admissions ' + sp(c.pct) + ')'
          : sp(c.pct) + ' (per person ' + sp(c.pp) + ')') + (c.low ? '. Few cases, read with care' : '') + '.');
      });

      /* ============================================================== initial */
      Viz.responsive(chartA, function (w) { buildA(w); });
      Viz.responsive(chartB, function (w) { buildB(w); updateB(false); });
      Viz.onThemeChange(function () { if (lastWA) { buildA(lastWA); } });
      setChip(st0); textA(); tableA(); tableB();
    }
  };
})();
