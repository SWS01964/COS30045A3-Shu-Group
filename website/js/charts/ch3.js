/* ch3.js: Chapter 3 board (A: paired bars, the five main road users; B: dot plot by age band).
   OWNED BY THE CHAPTER 3 AGENT.
   Interface: window.Charts['ch3'] = { init(boardEl, data) }
   Data: severity (view = "age" only). Shares = road-user row / "All road users" row, category "All ages".
   Windows: deaths in hospital 2011-19 (cases_1119, died_1119); bed days and stays 2016-21 (hosp_1621, beds_1621, avg_stay).
   Rates and stays are drawn only where publish_rate / publish_stay is TRUE; unpublished cells are never drawn as values.
   State: Viz.bus({ measure: 'deaths' | 'days', roadUser: <one of the five main road users> }).
   Every number is computed from the CSV at runtime. The prose keys in index.html are registered in facts.js. */
(function () {
  'use strict';
  window.Charts = window.Charts || {};

  var EN = '–';
  var ALL = 'All road users';
  var NP = 'not published (too few cases)';

  var MEAS = {
    deaths: {
      adm: 'cases_1119', harm: 'died_1119', win: '2011' + EN + '19',
      admLab: 'Share of admissions, 2011' + EN + '19',
      harmLab: 'Share of deaths in hospital, 2011' + EN + '19',
      harmWords: 'of deaths in hospital', chip: 'deaths in hospital',
      subA: 'Share of admissions and share of deaths in hospital · five main road users · 2011' + EN + '19'
    },
    days: {
      adm: 'hosp_1621', harm: 'beds_1621', win: '2016' + EN + '21',
      admLab: 'Share of admissions (discharged alive), 2016' + EN + '21',
      harmLab: 'Share of bed days, 2016' + EN + '21',
      harmWords: 'of bed days', chip: 'days in hospital',
      subA: 'Share of admissions (discharged alive) and share of bed days · five main road users · 2016' + EN + '21'
    }
  };
  /* plural nouns for titles */
  var PLURAL = {
    'Car driver': 'Car drivers', 'Car passenger': 'Car passengers', 'Motorcyclist': 'Motorcyclists',
    'Pedal cyclist': 'Cyclists', 'Pedestrian': 'Pedestrians'
  };

  function int(v) { return Viz.fmt.int(v); }
  function dp1(v) { return Viz.fmt.dp1(v); }
  function pct1(v) { return Viz.fmt.pct(v, 1); }
  function niceMax(v, step) { return Math.ceil(v / step) * step; }
  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  /* Text width via canvas, using the chart's own font family. */
  function measurer(host) {
    var ctx = document.createElement('canvas').getContext('2d');
    var fam = getComputedStyle(host).fontFamily;
    return function (text, size, weight) {
      ctx.font = (weight || 400) + ' ' + size + 'px ' + fam;
      return ctx.measureText(text).width;
    };
  }
  function wrap(measure, text, maxW, size, weight) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (cur && measure(t, size, weight) > maxW) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function setLines(textSel, lines, lineH) {
    var x = textSel.attr('x') || 0;
    textSel.selectAll('tspan').remove();
    lines.forEach(function (l, i) {
      textSel.append('tspan').attr('x', x).attr('dy', i ? lineH : 0).text(l);
    });
  }

  /* One tab stop for a set of marks; arrow keys move between them. activate(node) on Enter / Space (optional). */
  function roving(nodes, activate, current) {
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
        else if (activate && (k === 'Enter' || k === ' ' || k === 'Spacebar')) { e.preventDefault(); activate(n, i); return; }
        if (j === null) return;
        e.preventDefault();
        if (j !== i) nodes[j].focus();
      });
    });
  }

  window.Charts['ch3'] = {
    init: function (board, data) {
      var sev = Viz.where(data.severity, { view: 'age' });
      var panelA = board.querySelector('#ch3-a'), panelB = board.querySelector('#ch3-b');
      var allRow = Viz.find(sev, { road_user: ALL, category: 'All ages' });
      if (!allRow || !panelA || !panelB) return;
      var hostA = panelA.querySelector('.panel-chart'), hostB = panelB.querySelector('.panel-chart');
      var titleElA = panelA.querySelector('.panel-title'), subElA = panelA.querySelector('.panel-sub');
      var titleElB = panelB.querySelector('.panel-title'), subElB = panelB.querySelector('.panel-sub');
      var chip = board.querySelector('.board-chip');
      var bus = Viz.bus({ measure: 'deaths', roadUser: 'Pedestrian' });
      var USERS = Viz.MAIN_ROAD_USERS, BANDS = Viz.AGE_BANDS;

      function cell(ru, cat) { return Viz.find(sev, { road_user: ru, category: cat }); }
      function plural(ru) { return PLURAL[ru] || ru; }

      /* ============================================================ data prep */
      /* panel A rows: shares of the All road users row, both measures; order fixed by share of admissions 2011-19 */
      var rowsA = USERS.map(function (ru) {
        var r = cell(ru, 'All ages'), o = { road_user: ru, row: r };
        ['cases_1119', 'died_1119', 'hosp_1621', 'beds_1621'].forEach(function (k) { o['s_' + k] = r[k] / allRow[k] * 100; });
        return o;
      }).sort(function (a, b) { return b.s_cases_1119 - a.s_cases_1119; });
      var DMAX = niceMax(d3.max(rowsA, function (o) {
        return Math.max(o.s_cases_1119, o.s_died_1119, o.s_hosp_1621, o.s_beds_1621);
      }), 5);
      function shareA(o, measure, which) { return o['s_' + MEAS[measure][which]]; }
      function ped() { return rowsA.filter(function (o) { return o.road_user === 'Pedestrian'; })[0]; }

      /* panel B: published checks */
      function okRate(r) { return !!(r && r.publish_rate === true && r.died_per_1000 != null && r.ci_low != null && r.ci_high != null); }
      function okStay(r) { return !!(r && r.publish_stay === true && r.avg_stay != null); }
      function ok(r, m) { return m === 'deaths' ? okRate(r) : okStay(r); }
      function val(r, m) { return m === 'deaths' ? r.died_per_1000 : r.avg_stay; }
      /* stable x-domain per measure: max over all five road users + All, published cells only, CI highs included */
      var XMAX = {};
      ['deaths', 'days'].forEach(function (m) {
        var mx = 0;
        USERS.concat([ALL]).forEach(function (ru) {
          BANDS.forEach(function (b) {
            var r = cell(ru, b);
            if (ok(r, m)) mx = Math.max(mx, m === 'deaths' ? r.ci_high : r.avg_stay);
          });
        });
        XMAX[m] = niceMax(mx, m === 'deaths' ? 10 : 5);
      });

      /* ============================================================ copy computed from the CSV */
      function titleA(m) {
        var p = ped();
        if (m === 'deaths') {
          return 'Pedestrians: ' + Viz.fmt.pct(shareA(p, m, 'adm'), 0) + ' of admissions, ' +
            Viz.fmt.pct(shareA(p, m, 'harm'), 0) + ' of deaths in hospital';
        }
        return 'Pedestrians: ' + pct1(shareA(p, m, 'adm')) + ' of admissions, ' + pct1(shareA(p, m, 'harm')) + ' of bed days';
      }
      function annA(m) {
        var p = ped();
        return pct1(shareA(p, m, 'adm')) + ' of admissions, ' + pct1(shareA(p, m, 'harm')) + ' ' + MEAS[m].harmWords;
      }
      function titleB(m, ru) {
        var s = cell(ru, '75+'), a = cell(ALL, '75+');
        if (m === 'deaths') {
          if (okRate(s) && okRate(a)) {
            return plural(ru) + ' aged 75+: ' + int(s.died_per_1000) + ' deaths per 1,000 admitted, against ' +
              int(a.died_per_1000) + ' for all road users';
          }
          return plural(ru) + ' by age: deaths in hospital per 1,000 admitted, against all road users';
        }
        if (okStay(s) && okStay(a)) {
          return 'Older ' + lower(plural(ru)) + ' who survive stay ' + int(s.avg_stay) + ' days, against ' +
            int(a.avg_stay) + ' for all road users aged 75+';
        }
        return plural(ru) + ' by age: average stay of people who left hospital alive, against all road users';
      }
      function subB(m, ru) {
        return m === 'deaths'
          ? 'Deaths in hospital per 1,000 admitted, by age band · ' + lower(plural(ru)) + ' vs all road users · 2011' + EN + '19 · lines are 95% intervals'
          : 'Average stay in days of people who left hospital alive, by age band · ' + lower(plural(ru)) + ' vs all road users · 2016' + EN + '21';
      }
      function summaryA(m) {
        var M = MEAS[m];
        return 'Paired horizontal bars for the five main road users, sorted by share of admissions (' + M.win + '). ' +
          rowsA.map(function (o) {
            return o.road_user + ': ' + pct1(shareA(o, m, 'adm')) + ' of admissions, ' + pct1(shareA(o, m, 'harm')) + ' ' + M.harmWords;
          }).join('; ') + '. Shares are of all road users, so they do not sum to 100%. ' +
          'Select a road user to compare it by age in chart B.';
      }
      function summaryB(m, ru) {
        var parts = BANDS.map(function (b) {
          var s = cell(ru, b), a = cell(ALL, b);
          var f = function (r) { return ok(r, m) ? dp1(val(r, m)) : 'not published'; };
          return Viz.fmt.age(b) + ': ' + lower(plural(ru)) + ' ' + f(s) + ', all road users ' + f(a);
        });
        return 'Dot plot by age band comparing ' + lower(plural(ru)) + ' (filled dots) with all road users (open dots). ' +
          (m === 'deaths' ? 'Deaths in hospital per 1,000 people admitted, 2011' + EN + '19, with 95% intervals; cells with too few cases are not drawn. '
            : 'Average hospital stay in days for people who left hospital alive, 2016' + EN + '21; cells with too few cases are not drawn. ') +
          parts.join('; ') + '.';
      }

      /* ============================================================ explore bar */
      var ctlHost = board.querySelector('.explore-controls');
      ctlHost.innerHTML = '';
      var g1 = document.createElement('div');
      g1.className = 'ctl-group';
      g1.innerHTML = '<span class="ctl-label" id="ch3-seg-label">Measure harm by</span>' +
        '<div class="seg" role="group" aria-labelledby="ch3-seg-label">' +
        '<button type="button" data-value="deaths" aria-pressed="true">Deaths in hospital</button>' +
        '<button type="button" data-value="days" aria-pressed="false">Days in hospital</button></div>';
      ctlHost.appendChild(g1);
      var g2 = document.createElement('div');
      g2.className = 'ctl-field';
      g2.innerHTML = '<label class="ctl-label" for="ch3-ru">Compare by age</label><select id="ch3-ru">' +
        USERS.map(function (ru) { return '<option value="' + ru + '"' + (ru === 'Pedestrian' ? ' selected' : '') + '>' + ru + '</option>'; }).join('') +
        '</select>';
      ctlHost.appendChild(g2);
      var selEl = g2.querySelector('select');
      var seg = Viz.segmented(g1.querySelector('.seg'), {
        announce: false,
        onChange: function (v) { bus.set({ measure: v }, 'controls'); }
      });
      selEl.addEventListener('change', function () { bus.set({ roadUser: selEl.value }, 'select'); });

      function setChip() {
        var s = bus.get();
        chip.textContent = 'Showing: ' + MEAS[s.measure].chip + ' · ' + s.roadUser;
      }

      /* ============================================================ panel A */
      var refsA = null;

      function tipA(o) {
        var m = bus.get().measure, M = MEAS[m], r = o.row;
        var t = '<strong>' + o.road_user + '</strong><br>Admissions ' + M.win + ': ' + int(r[M.adm]) + ' (' + pct1(shareA(o, m, 'adm')) + ')';
        t += '<br>' + (m === 'deaths' ? 'Died in hospital' : 'Bed days') + ': ' + int(r[M.harm]) + ' (' + pct1(shareA(o, m, 'harm')) + ')';
        if (m === 'days') t += '<br><span style="opacity:.85">Admissions here are people who left hospital alive</span>';
        return t;
      }
      function labelA(o) {
        var s = bus.get(), m = s.measure, M = MEAS[m];
        return o.road_user + ': ' + pct1(shareA(o, m, 'adm')) + ' of admissions, ' + pct1(shareA(o, m, 'harm')) + ' ' + M.harmWords +
          ', ' + M.win + (o.road_user === s.roadUser ? '. Selected.' : '. Select to compare by age.');
      }

      function buildA(w) {
        var measure = measurer(hostA);
        var narrow = w < 440;
        var labelW = narrow ? 100 : 124, rightM = narrow ? 46 : 56;
        var pw = Math.max(100, w - labelW - rightM);
        var bh = narrow ? 22 : 30, inner = 3, gap = narrow ? 18 : 32;
        var gh = 2 * bh + inner, pitch = gh + gap;
        var xs = d3.scaleLinear().domain([0, DMAX]).range([0, pw]);
        var first = rowsA[0];
        /* window labels go on the first row's bars when they fit for both measures; otherwise in a small key above the bars */
        var fits = Object.keys(MEAS).every(function (k) {
          var M = MEAS[k];
          return xs(shareA(first, k, 'adm')) - 16 >= measure(M.admLab, 12, 700) &&
            xs(shareA(first, k, 'harm')) - 16 >= measure(M.harmLab, 12, 700);
        });
        var keyLinesN = [1, 1];
        if (!fits) {
          Object.keys(MEAS).forEach(function (k) {
            keyLinesN[0] = Math.max(keyLinesN[0], wrap(measure, MEAS[k].admLab, w - 24, 12, 600).length);
            keyLinesN[1] = Math.max(keyLinesN[1], wrap(measure, MEAS[k].harmLab, w - 24, 12, 600).length);
          });
        }
        var keyH = fits ? 0 : (keyLinesN[0] + keyLinesN[1]) * 15 + 18;
        var top = 6 + keyH;
        var annLinesN = 1;
        Object.keys(MEAS).forEach(function (k) { annLinesN = Math.max(annLinesN, wrap(measure, annA(k), w - 16, narrow ? 13 : 14, 700).length); });
        var rowsH = rowsA.length * gh + (rowsA.length - 1) * gap;
        var annH = annLinesN * 18 + 6;
        var h = top + rowsH + 18 + annH + 4;
        var svg = Viz.svg(hostA, w, h);

        /* zero baseline */
        svg.append('line').attr('class', 'c3-base').attr('x1', labelW).attr('x2', labelW).attr('y1', top - 4).attr('y2', top + rowsH + 4);

        var key = null;
        if (!fits) {
          key = svg.append('g').attr('class', 'c3a-key').attr('transform', 'translate(0,6)');
          key.append('rect').attr('class', 'c3a-grey').attr('width', 14).attr('height', 12).attr('y', 0).attr('rx', 2);
          key.append('text').attr('class', 'c3a-klab c3a-klab-grey').attr('x', 20).attr('y', 10);
          key.append('rect').attr('class', 'c3a-harm').attr('width', 14).attr('height', 12).attr('y', keyLinesN[0] * 15 + 6).attr('rx', 2);
          key.append('text').attr('class', 'c3a-klab c3a-klab-harm').attr('x', 20).attr('y', keyLinesN[0] * 15 + 16);
        }

        var g = svg.append('g').attr('transform', 'translate(0,' + top + ')');
        var rowG = g.selectAll('g.c3a-row').data(rowsA).join('g').attr('class', 'c3a-row')
          .attr('transform', function (d, i) { return 'translate(0,' + (i * pitch) + ')'; })
          .attr('role', 'button');
        rowG.append('rect').attr('class', 'c3a-sel')
          .attr('x', 2).attr('y', -gap / 2 + 2).attr('width', w - 4).attr('height', gh + gap - 4).attr('rx', 6);
        rowG.append('rect').attr('class', 'c3-hit')
          .attr('x', 0).attr('y', -gap / 2 + 2).attr('width', w).attr('height', gh + gap - 4);
        rowG.append('text').attr('class', 'c3a-name')
          .attr('x', labelW - 10).attr('y', gh / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
          .style('font-size', narrow ? '13px' : '14px').text(function (d) { return d.road_user; });
        var barsG = rowG.append('g').attr('transform', 'translate(' + labelW + ',0)');
        barsG.append('rect').attr('class', 'c3a-grey').attr('x', 0).attr('y', 0).attr('height', bh).attr('width', 0);
        barsG.append('rect').attr('class', 'c3a-harm').attr('x', 0).attr('y', bh + inner).attr('height', bh).attr('width', 0);
        barsG.append('text').attr('class', 'c3a-gval').attr('y', bh / 2).attr('dy', '0.35em').attr('x', 6);
        barsG.append('text').attr('class', 'c3a-hval').attr('y', bh + inner + bh / 2).attr('dy', '0.35em').attr('x', 6);
        if (fits) barsG.filter(function (d, i) { return i === 0; }).each(function () {
          var b = d3.select(this);
          b.append('text').attr('class', 'c3a-ilab c3a-ilab-grey').attr('x', 8).attr('y', bh / 2).attr('dy', '0.35em');
          b.append('text').attr('class', 'c3a-ilab c3a-ilab-harm').attr('x', 8).attr('y', bh + inner + bh / 2).attr('dy', '0.35em');
        });
        Viz.tooltip.bind(rowG, tipA, { roving: false });
        rowG.each(function (d) {
          var n = this;
          n.setAttribute('aria-label', labelA(d));
          n.__tipNamed = false;
          function pick() { bus.set({ roadUser: d.road_user }, 'panel-a'); }
          n.addEventListener('click', pick);
        });
        roving(rowG.nodes(), function (n) {
          var d = d3.select(n).datum();
          bus.set({ roadUser: d.road_user }, 'panel-a');
        }, Math.max(0, rowsA.map(function (o) { return o.road_user; }).indexOf(bus.get().roadUser)));

        /* pedestrian annotation, directly under the pedestrian row (the last row) */
        var annG = g.append('g').attr('class', 'c3a-ann').attr('transform', 'translate(0,' + (rowsH + 18) + ')');
        annG.append('rect').attr('class', 'c3a-ann-rule').attr('x', 0).attr('y', 0).attr('width', 3).attr('height', annH - 6);
        var annText = annG.append('text').attr('class', 'c3a-ann-text').attr('x', 12).attr('y', 14)
          .style('font-size', narrow ? '13px' : '14px');
        refsA = {
          w: w, narrow: narrow, xs: xs, bh: bh, measure: measure, key: key, rowG: rowG, barsG: barsG, annText: annText, keyLinesN: keyLinesN
        };
      }

      function renderA(animate) {
        if (!refsA) return;
        var s = bus.get(), m = s.measure, M = MEAS[m];
        var dur = animate ? Viz.dur(400) : 0, xs = refsA.xs;
        function w0(d, which) { return Math.max(0, xs(shareA(d, m, which))); }
        refsA.barsG.select('.c3a-grey').transition().duration(dur).attr('width', function (d) { return w0(d, 'adm'); });
        refsA.barsG.select('.c3a-harm').transition().duration(dur).attr('width', function (d) { return w0(d, 'harm'); });
        refsA.barsG.select('.c3a-gval').text(function (d) { return pct1(shareA(d, m, 'adm')); })
          .transition().duration(dur).attr('x', function (d) { return w0(d, 'adm') + 6; });
        refsA.barsG.select('.c3a-hval').text(function (d) { return pct1(shareA(d, m, 'harm')); })
          .transition().duration(dur).attr('x', function (d) { return w0(d, 'harm') + 6; });
        refsA.barsG.select('.c3a-ilab-grey').text(M.admLab);
        refsA.barsG.select('.c3a-ilab-harm').text(M.harmLab);
        if (refsA.key) {
          setLines(refsA.key.select('.c3a-klab-grey'), wrap(refsA.measure, M.admLab, refsA.w - 24, 12, 600), 15);
          setLines(refsA.key.select('.c3a-klab-harm'), wrap(refsA.measure, M.harmLab, refsA.w - 24, 12, 600), 15);
        }
        setLines(refsA.annText, wrap(refsA.measure, annA(m), refsA.w - 20, refsA.narrow ? 13 : 14, 700), 18);
        highlightA();
        titleElA.textContent = titleA(m);
        subElA.textContent = M.subA;
        hostA.setAttribute('aria-label', summaryA(m));
      }

      /* the selected row: bold label + outline, aria-pressed, the one tab stop */
      function highlightA() {
        if (!refsA) return;
        var s = bus.get();
        refsA.rowG.classed('is-sel', function (d) { return d.road_user === s.roadUser; })
          .attr('aria-pressed', function (d) { return d.road_user === s.roadUser ? 'true' : 'false'; })
          .attr('aria-label', labelA);
        if (!hostA.contains(document.activeElement)) {
          refsA.rowG.attr('tabindex', function (d) { return d.road_user === s.roadUser ? 0 : -1; });
        }
      }

      /* ============================================================ panel B */
      function tipB(b) {
        var s = bus.get(), m = s.measure, ru = s.roadUser, t = '<strong>Age ' + Viz.fmt.age(b.band) + '</strong>';
        [[b.sel, plural(ru)], [b.all, 'All road users']].forEach(function (x) {
          var r = x[0];
          t += '<br><strong>' + x[1] + '</strong>: ';
          if (!ok(r, m)) { t += NP; return; }
          if (m === 'deaths') {
            t += dp1(r.died_per_1000) + ' per 1,000 (95% interval ' + dp1(r.ci_low) + ' to ' + dp1(r.ci_high) + ')<br>' +
              int(r.died_1119) + ' deaths of ' + int(r.cases_1119) + ' admitted, 2011' + EN + '19';
          } else {
            t += dp1(r.avg_stay) + ' days on average<br>' + int(r.beds_1621) + ' bed days, ' + int(r.hosp_1621) +
              ' people who left hospital alive, 2016' + EN + '21';
          }
        });
        return t;
      }

      function drawB(w) {
        var s = bus.get(), m = s.measure, ru = s.roadUser;
        var bands = BANDS.map(function (b) { return { band: b, sel: cell(ru, b), all: cell(ALL, b) }; });
        var measure = measurer(hostB);
        var narrow = w < 440;
        var ml = narrow ? 44 : 52, mr = narrow ? 18 : 28;
        var pw = w - ml - mr;
        var rp = narrow ? 50 : 54, r = narrow ? 6 : 7;
        var keyH = 30, axisH = 50;
        var xmax = XMAX[m];
        var xs = d3.scaleLinear().domain([0, xmax]).range([0, pw]);
        var p75 = bands[bands.length - 1];
        /* 75+ annotation, in extra space above the last row, only when that value is published */
        var annLines = null, annH = 0;
        if (ok(p75.sel, m) && (m === 'deaths' || ok(p75.all, m))) {
          var annTxt = m === 'deaths'
            ? int(p75.sel.died_per_1000) + ' in 1,000 ' + lower(plural(ru)) + ' aged 75+ died in hospital'
            : int(p75.sel.avg_stay) + ' days: the average stay of ' + lower(plural(ru)) + ' aged 75+, against ' + int(p75.all.avg_stay) + ' for all road users';
          annLines = wrap(measure, annTxt, Math.min(narrow ? pw - 4 : 400, pw), 13, 700);
          annH = annLines.length * 16 + 36;
        }
        var lastI = bands.length - 1;
        var plotH = bands.length * rp + annH;
        var h = keyH + plotH + axisH;
        var svg = Viz.svg(hostB, w, h);

        /* direct labels for the two series (top row, no box) */
        var key = svg.append('g').attr('class', 'c3b-key').attr('transform', 'translate(' + (narrow ? 0 : ml) + ',14)');
        var lab1 = plural(ru), lab2 = 'All road users';
        key.append('circle').attr('class', 'c3b-fill').attr('cx', 6).attr('cy', 0).attr('r', 6);
        key.append('text').attr('x', 18).attr('y', 0).attr('dy', '0.35em').text(lab1);
        var off = 18 + measure(lab1, 13, 600) + 22;
        key.append('circle').attr('class', 'c3b-open').attr('cx', off + 6).attr('cy', 0).attr('r', 6);
        key.append('text').attr('x', off + 18).attr('y', 0).attr('dy', '0.35em').text(lab2);
        if (m === 'deaths') {
          var kx = off + 18 + measure(lab2, 13, 600) + 22;
          /* on narrow panels the subtitle already says the lines are 95% intervals */
          if (kx + measure('Lines are 95% intervals', 13, 400) <= w - (narrow ? 0 : ml)) {
            key.append('text').attr('class', 'c3b-key-note').attr('x', kx).attr('y', 0).attr('dy', '0.35em')
              .text('Lines are 95% intervals');
          }
        }
        key.selectAll('text').style('font-size', '13px').style('font-weight', 600);
        key.select('.c3b-key-note').style('font-weight', 400);

        var plot = svg.append('g').attr('transform', 'translate(' + ml + ',' + keyH + ')');
        var step = m === 'deaths' ? (pw < 380 ? 20 : 10) : (pw < 380 ? 10 : 5);
        var ticks = d3.range(0, xmax + 0.001, step);
        plot.selectAll('line.c3-grid').data(ticks).join('line').attr('class', 'c3-grid')
          .attr('x1', xs).attr('x2', xs).attr('y1', 0).attr('y2', plotH);
        plot.append('line').attr('class', 'c3-base').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', plotH);
        plot.selectAll('text.c3-tick').data(ticks).join('text').attr('class', 'c3-tick')
          .attr('x', xs).attr('y', plotH + 18).attr('text-anchor', 'middle').text(function (t) { return t; });
        plot.append('text').attr('class', 'c3-axis-title').attr('x', pw / 2).attr('y', plotH + 38).attr('text-anchor', 'middle')
          .text(m === 'deaths'
            ? (narrow ? 'Died per 1,000 admitted, 2011' + EN + '19' : 'Died in hospital per 1,000 people admitted (2011' + EN + '19)')
            : (narrow ? 'Average stay (days), 2016' + EN + '21' : 'Average stay in days, people who left hospital alive (2016' + EN + '21)'));

        var rowG = plot.selectAll('g.c3b-row').data(bands).join('g').attr('class', 'c3b-row')
          .attr('transform', function (d, i) { return 'translate(0,' + (i * rp + rp / 2 + (i === lastI ? annH : 0)) + ')'; });
        rowG.append('line').attr('class', 'c3b-guide').attr('x1', 0).attr('x2', pw).attr('y1', 0).attr('y2', 0);
        rowG.append('rect').attr('class', 'c3-hit').attr('x', -ml).attr('y', -rp / 2).attr('width', w).attr('height', rp);
        rowG.append('text').attr('class', 'c3b-age').attr('x', -10).attr('y', 0).attr('dy', '0.35em').attr('text-anchor', 'end')
          .text(function (d) { return Viz.fmt.age(d.band); });

        rowG.each(function (b) {
          var g = d3.select(this);
          /* All road users: open dot (with a whisker for the death rate), only where published */
          if (ok(b.all, m)) {
            if (m === 'deaths') {
              g.append('line').attr('class', 'c3b-whisker c3b-whisker-all')
                .attr('x1', xs(b.all.ci_low)).attr('x2', xs(b.all.ci_high)).attr('y1', 0).attr('y2', 0);
            }
            g.append('circle').attr('class', 'c3b-open c3b-dot').attr('data-series', 'all').attr('data-road-user', ALL).attr('data-band', b.band)
              .attr('data-value', val(b.all, m)).attr('cx', xs(val(b.all, m))).attr('cy', 0).attr('r', r);
            g.append('text').attr('class', 'c3b-val c3b-val-all').attr('x', xs(val(b.all, m))).attr('y', r + 15)
              .attr('text-anchor', 'middle').text(dp1(val(b.all, m)));
          } else {
            g.append('text').attr('class', 'c3b-np c3b-np-all').attr('data-series', 'all').attr('x', 6).attr('y', r + 15)
              .text('All road users: too few cases');
          }
          if (ok(b.sel, m)) {
            if (m === 'deaths') {
              var x1 = xs(b.sel.ci_low), x2 = xs(b.sel.ci_high);
              g.append('line').attr('class', 'c3b-whisker').attr('x1', x1).attr('x2', x2).attr('y1', 0).attr('y2', 0);
              g.append('line').attr('class', 'c3b-whisker').attr('x1', x1).attr('x2', x1).attr('y1', -5).attr('y2', 5);
              g.append('line').attr('class', 'c3b-whisker').attr('x1', x2).attr('x2', x2).attr('y1', -5).attr('y2', 5);
            }
            g.append('circle').attr('class', 'c3b-fill c3b-dot').attr('data-series', 'sel').attr('data-road-user', ru).attr('data-band', b.band)
              .attr('data-value', val(b.sel, m)).attr('cx', xs(val(b.sel, m))).attr('cy', 0).attr('r', r);
            g.append('text').attr('class', 'c3b-val c3b-val-sel').attr('x', xs(val(b.sel, m))).attr('y', -r - 6)
              .attr('text-anchor', 'middle').text(dp1(val(b.sel, m)));
          } else {
            g.append('text').attr('class', 'c3b-np c3b-np-sel').attr('data-series', 'sel').attr('x', 6).attr('y', -r - 6)
              .text(plural(ru) + ': too few cases');
          }
        });
        rowG.attr('role', 'img').attr('aria-label', function (b) { return Viz.plainText(tipB(b)); });
        Viz.tooltip.bind(rowG, tipB, { roving: false });
        roving(rowG.nodes());

        if (annLines) {
          var px = xs(val(p75.sel, m));
          var top0 = lastI * rp;
          var ann = plot.append('g').attr('class', 'c3b-ann');
          var t = ann.append('text').attr('class', 'c3b-ann-text').attr('x', pw).attr('y', top0 + 16).attr('text-anchor', 'end');
          setLines(t, annLines, 16);
          var lastCy = lastI * rp + rp / 2 + annH;
          ann.append('line').attr('class', 'c3b-ann-leader').attr('x1', px).attr('x2', px)
            .attr('y1', top0 + 16 + (annLines.length - 1) * 16 + 6).attr('y2', lastCy - r - 20);
        }
        hostB.setAttribute('aria-label', summaryB(m, ru));
      }
      var respB = null;
      function renderB() {
        var s = bus.get();
        titleElB.textContent = titleB(s.measure, s.roadUser);
        subElB.textContent = subB(s.measure, s.roadUser);
        if (respB) respB.redraw();
      }

      /* ============================================================ tables */
      var tabHost = board.querySelector('.board-tables');
      var tabA = document.createElement('div'), tabB = document.createElement('div');
      if (tabHost) { tabHost.appendChild(tabA); tabHost.appendChild(tabB); }
      function buildTables() {
        if (!tabHost) return;
        var s = bus.get(), m = s.measure, M = MEAS[m], ru = s.roadUser;
        var admLabel = 'Admissions ' + M.win + (m === 'days' ? ' (discharged alive)' : '');
        Viz.fillTable(tabA, rowsA.map(function (o) {
          return { road_user: o.road_user, adm: o.row[M.adm], sadm: shareA(o, m, 'adm'), harm: o.row[M.harm], sharm: shareA(o, m, 'harm') };
        }), [
          { key: 'road_user', label: 'Road user', text: true },
          { key: 'adm', label: admLabel, format: int },
          { key: 'sadm', label: 'Share of admissions', format: pct1 },
          { key: 'harm', label: (m === 'deaths' ? 'Died in hospital ' : 'Bed days ') + M.win, format: int },
          { key: 'sharm', label: m === 'deaths' ? 'Share of deaths in hospital' : 'Share of bed days', format: pct1 }
        ], { caption: 'Chart A: share of admissions and share of ' + (m === 'deaths' ? 'deaths in hospital' : 'bed days') + ', ' + M.win +
          '. Share = road user count divided by the All road users count, all ages; the five do not sum to 100%.' });

        var rows = [];
        BANDS.forEach(function (b) {
          rows.push({ band: b, who: ru, r: cell(ru, b) });
          rows.push({ band: b, who: ALL, r: cell(ALL, b) });
        });
        var cols;
        if (m === 'deaths') {
          cols = [
            { key: 'band', label: 'Age', text: true, format: Viz.fmt.age },
            { key: 'who', label: 'Road user', text: true },
            { key: 'n', label: 'Admitted 2011' + EN + '19', format: function (v, row) { return int(row.r.cases_1119); } },
            { key: 'd', label: 'Died in hospital', format: function (v, row) { return int(row.r.died_1119); } },
            { key: 'rate', label: 'Died per 1,000 admitted', text: true, format: function (v, row) { return okRate(row.r) ? dp1(row.r.died_per_1000) : NP; } },
            { key: 'ci', label: '95% interval', text: true, format: function (v, row) { return okRate(row.r) ? dp1(row.r.ci_low) + ' to ' + dp1(row.r.ci_high) : 'not published'; } }
          ];
        } else {
          cols = [
            { key: 'band', label: 'Age', text: true, format: Viz.fmt.age },
            { key: 'who', label: 'Road user', text: true },
            { key: 'n', label: 'Left hospital alive 2016' + EN + '21', format: function (v, row) { return int(row.r.hosp_1621); } },
            { key: 'd', label: 'Bed days', format: function (v, row) { return int(row.r.beds_1621); } },
            { key: 'stay', label: 'Average stay (days)', text: true, format: function (v, row) { return okStay(row.r) ? dp1(row.r.avg_stay) : NP; } }
          ];
        }
        Viz.fillTable(tabB, rows, cols, { caption: 'Chart B: ' + lower(plural(ru)) + ' and all road users by age band, ' +
          (m === 'deaths' ? 'deaths in hospital per 1,000 admitted, 2011' + EN + '19, with 95% intervals' : 'average stay in days, 2016' + EN + '21') +
          '. Cells with too few cases are not published.' });
      }

      /* ============================================================ link */
      bus.on(function (state, changed, source) {
        var mChanged = changed.indexOf('measure') >= 0, rChanged = changed.indexOf('roadUser') >= 0;
        if (mChanged) seg.set(state.measure, true);
        if (rChanged && selEl.value !== state.roadUser) selEl.value = state.roadUser;
        if (mChanged) renderA(true); else if (rChanged) highlightA();
        renderB();
        buildTables();
        setChip();
        if (source === 'init') return;
        if (mChanged) {
          Viz.flash(panelA); Viz.flash(panelB);
          Viz.announce('Showing ' + MEAS[state.measure].chip + '. ' + titleA(state.measure) + '. ' + titleB(state.measure, state.roadUser) + '.');
        } else if (rChanged) {
          if (source === 'select') Viz.flash(panelA);
          Viz.flash(panelB);
          Viz.announce('Comparing ' + lower(plural(state.roadUser)) + ' by age. ' + titleB(state.measure, state.roadUser) + '.');
        }
      });

      Viz.responsive(hostA, function (w) { buildA(w); renderA(false); });
      respB = Viz.responsive(hostB, function (w) { drawB(w); });
      /* first fill of titles, chip and tables for the default state */
      titleElB.textContent = titleB('deaths', 'Pedestrian');
      subElB.textContent = subB('deaths', 'Pedestrian');
      buildTables();
      setChip();
    }
  };
})();
