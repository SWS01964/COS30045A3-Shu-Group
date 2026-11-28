/* ch3.js: Chapter 3 figures (fig-3a paired bars, fig-3b age dot plot, fig-3c counterparty dot list).
   OWNED BY THE CHAPTER 3 AGENT. Interface: Charts['fig-x'] = { init(el, data), update(state) }.
   Every number is computed from severity.csv. Shares = road-user row / "All road users" row,
   same view and category (All ages). No new data-fill keys: the prose uses the existing registry. */
(function () {
  'use strict';
  window.Charts = window.Charts || {};

  var SVGNS = 'http://www.w3.org/2000/svg';
  var EN = '–';

  /* ------------------------------------------------------------ helpers */
  function sevFind(data, m) { return Viz.find(data.severity, m); }
  function pct1(v) { return Viz.fmt.pct(v, 1); }
  function int(v) { return Viz.fmt.int(v); }
  function dp1(v) { return Viz.fmt.dp1(v); }

  /* Text width via canvas, using the chart's own font family. */
  function measurer(host) {
    var ctx = document.createElement('canvas').getContext('2d');
    var fam = getComputedStyle(host).fontFamily;
    return function (text, size, weight) {
      ctx.font = (weight || 400) + ' ' + size + 'px ' + fam;
      return ctx.measureText(text).width;
    };
  }
  /* Greedy word wrap -> array of lines, measured with the canvas measurer above.
     (ch5.js has a different wrap(): it writes tspans into an svg <text> and measures in the DOM.) */
  function wrap(measure, text, maxW, size, weight) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (cur && measure(t, size, weight) > maxW) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  /* Fill an SVG <text> with wrapped lines (tspans share the text's x). */
  function setLines(textSel, lines, lineH) {
    var x = textSel.attr('x') || 0;
    textSel.selectAll('tspan').remove();
    lines.forEach(function (l, i) {
      textSel.append('tspan').attr('x', x).attr('dy', i ? lineH : 0).text(l);
    });
  }
  function svgIn(host, w, h) { return Viz.svg(host, w, h); }
  function niceMax(v, step) { return Math.ceil(v / step) * step; }

  /* ------------------------------------------------------------- fig-3a */
  /* The five bar rows keep a fixed order (share of admissions, 2016-21) and a fixed
     axis across the three steps, so only the bars change when the stepper moves. */
  var STEPS = {
    admissions: {
      grey: 'hosp_1621', harm: null, greyLab: 'Share of admissions, 2016' + EN + '21', harmLab: '',
      title: function (ped) { return 'Pedestrians are about one in ' + Math.round(100 / ped.hosp_share) + ' of the people discharged alive, 2016' + EN + '21'; },
      ann: function (ped) { return pct1(ped.hosp_share) + ' of admissions (2016' + EN + '21)'; },
      period: '2016' + EN + '21'
    },
    beds: {
      grey: 'hosp_1621', harm: 'beds_1621', greyLab: 'Share of admissions, 2016' + EN + '21', harmLab: 'Share of bed days',
      title: function () { return 'Pedestrians take up twice their share of hospital beds'; },
      ann: function (ped) { return pct1(ped.hosp_share) + ' of admissions, ' + pct1(ped.beds_share) + ' of bed days'; },
      period: '2016' + EN + '21'
    },
    deaths: {
      /* the grey bar here is cases_1119 (everyone admitted 2011-19, deaths included), not hosp_1621 */
      grey: 'cases_1119', harm: 'died_1119', greyLab: 'Share of admissions, 2011' + EN + '19', harmLab: 'Share of deaths',
      title: function () { return 'Pedestrians are more than a quarter of the people who die in hospital'; },
      ann: function (ped) { return pct1(ped.adm_share_1119) + ' of admissions, ' + pct1(ped.died_share) + ' of in-hospital deaths'; },
      period: '2011' + EN + '19'
    }
  };

  function build3aRows(data) {
    var all = sevFind(data, { view: 'age', road_user: 'All road users', category: 'All ages' });
    return Viz.MAIN_ROAD_USERS.map(function (ru) {
      var r = sevFind(data, { view: 'age', road_user: ru, category: 'All ages' });
      return {
        road_user: ru,
        hosp_1621: r.hosp_1621, beds_1621: r.beds_1621, cases_1119: r.cases_1119, died_1119: r.died_1119,
        hosp_share: r.hosp_1621 / all.hosp_1621 * 100,
        beds_share: r.beds_1621 / all.beds_1621 * 100,
        adm_share_1119: r.cases_1119 / all.cases_1119 * 100,
        died_share: r.died_1119 / all.died_1119 * 100
      };
    }).sort(function (a, b) { return b.hosp_share - a.hosp_share; });
  }
  function share3a(row, key) {
    return { hosp_1621: row.hosp_share, beds_1621: row.beds_share, cases_1119: row.adm_share_1119, died_1119: row.died_share }[key];
  }

  var fig3a = {
    init: function (el, data) {
      var host = el.querySelector('.fig-chart');
      var titleEl = el.querySelector('.fig-title');
      var rows = build3aRows(data);
      var ped = rows.filter(function (r) { return r.road_user === 'Pedestrian'; })[0];
      var allShares = [];
      rows.forEach(function (r) { ['hosp_1621', 'beds_1621', 'cases_1119', 'died_1119'].forEach(function (k) { allShares.push(share3a(r, k)); }); });
      var dmax = niceMax(d3.max(allShares), 5);
      /* the step titles carry claims in words; warn (as facts.js does) if the data stops supporting them */
      var ratio = ped.beds_share / ped.hosp_share;
      if (!(ratio >= 1.9 && ratio <= 2.1)) console.warn('[ch3] fig-3a title says "twice their share of hospital beds" but the ratio is ' + ratio.toFixed(2));
      if (!(ped.died_share > 25 && ped.died_share < 50)) console.warn('[ch3] fig-3a title says "more than a quarter" of in-hospital deaths but the share is ' + ped.died_share.toFixed(1) + '%');
      var state = { step: 'beds' };
      var refs = null;

      function ariaSummary() {
        var S = STEPS[state.step];
        var parts = rows.map(function (r) {
          var t = r.road_user + ': ' + pct1(share3a(r, S.grey)) + ' of admissions';
          if (S.harm) t += ', ' + pct1(share3a(r, S.harm)) + ' of ' + (state.step === 'beds' ? 'bed days' : 'deaths in hospital');
          return t;
        });
        return 'Paired horizontal bars for the five main road users, sorted by share of admissions (' + S.period + '). ' +
          parts.join('; ') + '. Shares are of all road users, so they do not sum to 100%.';
      }

      function tipHtml(r) {
        if (state.step === 'deaths') {
          return '<strong>' + r.road_user + '</strong><br>Admissions 2011' + EN + '19: ' + int(r.cases_1119) + ' (' + pct1(r.adm_share_1119) + ')' +
            '<br>Died in hospital: ' + int(r.died_1119) + ' (' + pct1(r.died_share) + ')';
        }
        var t = '<strong>' + r.road_user + '</strong><br>Admissions 2016' + EN + '21: ' + int(r.hosp_1621) + ' (' + pct1(r.hosp_share) + ')';
        if (state.step === 'beds') t += '<br>Bed days: ' + int(r.beds_1621) + ' (' + pct1(r.beds_share) + ')';
        return t + '<br><span style="opacity:.85">People who left hospital alive</span>';
      }

      function buildChart(w) {
        var measure = measurer(host);
        var narrow = w < 640;
        var labelW = narrow ? 110 : 128, rightM = narrow ? 54 : 64;
        var pw = Math.max(120, w - labelW - rightM);
        var bh = narrow ? 20 : 24, inner = 3, gap = narrow ? 16 : 22;
        var gh = 2 * bh + inner, pitch = gh + gap;
        var xs = d3.scaleLinear().domain([0, dmax]).range([0, pw]);
        /* The measure names are written on the first row's bars. Where a name is wider than its bar
           (the 2016-21 / 2011-19 periods make them long) they move to a small key above the bars instead. */
        var first = rows[0];
        var fits = Object.keys(STEPS).every(function (k) {
          var S = STEPS[k];
          return xs(share3a(first, S.grey)) - 16 >= measure(S.greyLab, 12, 700) &&
            (!S.harm || xs(share3a(first, S.harm)) - 16 >= measure(S.harmLab, 12, 700));
        });
        var keyH = fits ? 0 : 46;
        var top = 6 + keyH, annH = narrow ? 40 : 0, axisH = 30;
        var pedIdx = rows.indexOf(ped);
        var h = top + rows.length * gh + (rows.length - 1) * gap + (narrow ? annH + 10 : 0) + axisH;
        var svg = svgIn(host, w, h);

        /* axis + gridlines (fixed across steps) */
        var plotBottom = h - axisH;
        var tickStep = pw < 400 ? 10 : 5;
        var ticks = d3.range(0, dmax + 0.001, tickStep);
        var ax = svg.append('g').attr('class', 'axis c3-axis').attr('transform', 'translate(' + labelW + ',0)');
        ax.selectAll('line.c3-grid').data(ticks).join('line').attr('class', 'c3-grid')
          .attr('x1', function (t) { return xs(t); }).attr('x2', function (t) { return xs(t); })
          .attr('y1', keyH).attr('y2', plotBottom).style('stroke', 'var(--rule)').style('stroke-width', 1);
        ax.selectAll('text').data(ticks).join('text')
          .attr('x', function (t) { return xs(t); }).attr('y', plotBottom + 18).attr('text-anchor', 'middle')
          .style('font-size', '12px').style('fill', 'var(--muted)').text(function (t) { return t + '%'; });
        /* zero baseline, stronger */
        ax.append('line').attr('x1', 0).attr('x2', 0).attr('y1', keyH).attr('y2', plotBottom)
          .style('stroke', 'var(--ink)').style('stroke-width', 1);
        /* key (only when the names do not fit on the bars) */
        var key = null;
        if (!fits) {
          key = svg.append('g').attr('class', 'c3a-key').attr('transform', 'translate(' + labelW + ',6)');
          key.append('rect').attr('class', 'c3a-grey').attr('width', 14).attr('height', 12).attr('y', 0).attr('rx', 2);
          key.append('text').attr('class', 'c3a-klab c3a-klab-grey').attr('x', 20).attr('y', 6).attr('dy', '0.35em');
          key.append('rect').attr('class', 'c3a-harm').attr('width', 14).attr('height', 12).attr('y', 20).attr('rx', 2);
          key.append('text').attr('class', 'c3a-klab c3a-klab-harm').attr('x', 20).attr('y', 26).attr('dy', '0.35em');
        }

        var g = svg.append('g').attr('transform', 'translate(0,' + top + ')');
        var rowG = g.selectAll('g.c3a-row').data(rows).join('g').attr('class', 'c3a-row')
          .attr('transform', function (d, i) { return 'translate(0,' + (i * pitch + 0) + ')'; });
        rowG.append('rect').attr('class', 'c3-hit')
          .attr('x', 0).attr('y', -gap / 2 + 2).attr('width', w).attr('height', gh + gap - 4);
        rowG.append('text').attr('class', 'c3a-name')
          .attr('x', labelW - 10).attr('y', gh / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
          .style('font-size', narrow ? '13px' : '14px')
          .style('font-weight', function (d) { return d.road_user === 'Pedestrian' ? 800 : 500; })
          .text(function (d) { return d.road_user; });
        var barsG = rowG.append('g').attr('transform', 'translate(' + labelW + ',0)');
        barsG.append('rect').attr('class', 'c3a-grey').attr('x', 0).attr('y', 0).attr('height', bh).attr('width', 0);
        barsG.append('rect').attr('class', 'c3a-harm').attr('x', 0).attr('y', bh + inner).attr('height', bh).attr('width', 0);
        barsG.append('text').attr('class', 'c3a-gval').attr('y', bh / 2).attr('dy', '0.35em').attr('x', 6);
        barsG.append('text').attr('class', 'c3a-hval').attr('y', bh + inner + bh / 2).attr('dy', '0.35em').attr('x', 6);
        /* in-bar measure names on the first row only (no legend) */
        if (fits) barsG.filter(function (d, i) { return i === 0; }).each(function () {
          var b = d3.select(this);
          b.append('text').attr('class', 'c3a-ilab c3a-ilab-grey').attr('x', 8).attr('y', bh / 2).attr('dy', '0.35em');
          b.append('text').attr('class', 'c3a-ilab c3a-ilab-harm').attr('x', 8).attr('y', bh + inner + bh / 2).attr('dy', '0.35em');
        });
        rowG.attr('aria-label', function (d) { return d.road_user; });
        Viz.tooltip.bind(rowG, tipHtml);

        /* pedestrian annotation */
        var annG = g.append('g').attr('class', 'c3a-ann');
        var annY0 = pedIdx * pitch;
        var rule = annG.append('line').attr('class', 'c3a-ann-rule');
        var annText = annG.append('text').attr('class', 'c3a-ann-text');
        refs = {
          narrow: narrow, labelW: labelW, pw: pw, rightM: rightM, xs: xs, bh: bh, measure: measure,
          key: key, rowG: rowG, barsG: barsG, annText: annText, rule: rule, annY0: annY0, gh: gh, w: w, annH: annH, pedIdx: pedIdx
        };
      }

      function render(animate) {
        if (!refs) return;
        var S = STEPS[state.step];
        var dur = animate ? Viz.dur(400) : 0;
        var xs = refs.xs, measure = refs.measure;
        function w0(d, key) { return key ? Math.max(0, xs(share3a(d, key))) : 0; }
        refs.barsG.select('.c3a-grey').transition().duration(dur).attr('width', function (d) { return w0(d, S.grey); });
        refs.barsG.select('.c3a-harm').transition().duration(dur)
          .attr('width', function (d) { return w0(d, S.harm); })
          .style('opacity', S.harm ? 1 : 0);
        refs.barsG.select('.c3a-gval').text(function (d) { return pct1(share3a(d, S.grey)); })
          .transition().duration(dur).attr('x', function (d) { return w0(d, S.grey) + 6; });
        refs.barsG.select('.c3a-hval').text(function (d) { return S.harm ? pct1(share3a(d, S.harm)) : ''; })
          .style('opacity', S.harm ? 1 : 0)
          .transition().duration(dur).attr('x', function (d) { return w0(d, S.harm) + 6; });
        refs.barsG.select('.c3a-ilab-grey').text(S.greyLab);
        refs.barsG.select('.c3a-ilab-harm').text(S.harmLab).style('opacity', S.harm ? 1 : 0);
        if (refs.key) {
          refs.key.select('.c3a-klab-grey').text(S.greyLab);
          refs.key.select('.c3a-klab-harm').text(S.harmLab);
          refs.key.selectAll('.c3a-harm, .c3a-klab-harm').style('opacity', S.harm ? 1 : 0);
        }

        /* annotation next to the pedestrians */
        var annW, ax0, ay0, lineH = 17;
        var lines;
        var pedMax = Math.max(xs(share3a(ped, S.grey)), S.harm ? xs(share3a(ped, S.harm)) : 0);
        if (!refs.narrow) {
          ax0 = refs.labelW + pedMax + 80;
          annW = Math.max(150, Math.min(300, refs.w - ax0 - 8));
          lines = wrap(measure, S.ann(ped), annW, 14, 700);
          ay0 = refs.annY0 + refs.gh / 2 - (lines.length - 1) * lineH / 2 + 5;
          refs.rule.attr('x1', ax0 - 10).attr('x2', ax0 - 10).attr('y1', refs.annY0 + 2).attr('y2', refs.annY0 + refs.gh - 2).style('opacity', 1);
          refs.annText.attr('x', ax0).attr('y', ay0).attr('text-anchor', 'start');
        } else {
          ax0 = refs.labelW; annW = refs.pw + refs.rightM - 4;
          lines = wrap(measure, S.ann(ped), annW, 13, 700);
          ay0 = refs.annY0 + refs.gh + 24;
          refs.rule.style('opacity', 0);
          refs.annText.attr('x', ax0).attr('y', ay0).attr('text-anchor', 'start');
        }
        setLines(refs.annText, lines, lineH);

        host.setAttribute('aria-label', ariaSummary());
        titleEl.textContent = S.title(ped);
      }

      function fillTable() {
        Viz.fillTable(el.querySelector('.fig-data'), rows, [
          { key: 'road_user', label: 'Road user', text: true },
          { key: 'hosp_1621', label: 'Admissions 2016' + EN + '21', format: int },
          { key: 'hosp_share', label: 'Share of admissions 2016' + EN + '21', format: pct1 },
          { key: 'beds_1621', label: 'Bed days 2016' + EN + '21', format: int },
          { key: 'beds_share', label: 'Share of bed days', format: pct1 },
          { key: 'cases_1119', label: 'Admissions 2011' + EN + '19', format: int },
          { key: 'adm_share_1119', label: 'Share of admissions 2011' + EN + '19', format: pct1 },
          { key: 'died_1119', label: 'Died in hospital 2011' + EN + '19', format: int },
          { key: 'died_share', label: 'Share of deaths', format: pct1 }
        ], { caption: 'Share = road user count divided by the All road users count, All ages.' });
      }

      var seg = Viz.segmented(el.querySelector('.fig-controls'), {
        onChange: function (v) { state.step = v; render(true); }
      });
      state.step = seg.get() || 'beds';
      fillTable();
      Viz.responsive(host, function (w) { buildChart(w); render(false); });
    },
    update: function () {}
  };

  /* ------------------------------------------------------------- fig-3b */
  var fig3b = {
    init: function (el, data) {
      var host = el.querySelector('.fig-chart');
      var titleEl = el.querySelector('.fig-title');
      var origTitle = titleEl.innerHTML;
      var bands = Viz.AGE_BANDS.map(function (b) {
        return {
          band: b,
          ped: sevFind(data, { view: 'age', road_user: 'Pedestrian', category: b }),
          all: sevFind(data, { view: 'age', road_user: 'All road users', category: b })
        };
      });
      var state = { m: 'died' };
      var NP = 'not published (too few cases)';
      var p75 = bands[bands.length - 1];

      function val(r, m) { return m === 'died' ? r.died_per_1000 : r.avg_stay; }
      function ok(r, m) { return !!(r && (m === 'died' ? r.publish_rate : r.publish_stay) && val(r, m) != null); }

      function ariaSummary() {
        var m = state.m;
        var parts = bands.map(function (b) {
          var p = ok(b.ped, m) ? dp1(val(b.ped, m)) : 'not published', a = ok(b.all, m) ? dp1(val(b.all, m)) : 'not published';
          return Viz.fmt.age(b.band) + ': pedestrians ' + p + ', all road users ' + a;
        });
        return 'Dot plot by age band comparing pedestrians (filled dots) with all road users (open dots). ' +
          (m === 'died' ? 'Deaths in hospital per 1,000 people admitted, with 95% intervals for pedestrians and all road users. ' :
            'Average hospital stay in days for people who left hospital alive; no intervals shown. ') +
          parts.join('; ') + '.';
      }

      function tipHtml(b) {
        var m = state.m, a = Viz.fmt.age(b.band), t = '<strong>Age ' + a + '</strong>';
        if (m === 'died') {
          [[b.ped, 'Pedestrians'], [b.all, 'All road users']].forEach(function (x) {
            var r = x[0];
            t += '<br><strong>' + x[1] + '</strong>: ';
            t += ok(r, m)
              ? dp1(r.died_per_1000) + ' per 1,000 (95% interval ' + dp1(r.ci_low) + ' to ' + dp1(r.ci_high) + ')<br>' + int(r.died_1119) + ' deaths of ' + int(r.cases_1119) + ' admitted, 2011' + EN + '19'
              : NP;
          });
        } else {
          [[b.ped, 'Pedestrians'], [b.all, 'All road users']].forEach(function (x) {
            var r = x[0];
            t += '<br><strong>' + x[1] + '</strong>: ';
            t += ok(r, m)
              ? dp1(r.avg_stay) + ' days on average<br>' + int(r.beds_1621) + ' bed days, ' + int(r.hosp_1621) + ' people who left hospital alive, 2016' + EN + '21'
              : NP;
          });
        }
        return t;
      }

      function fillTable() {
        var m = state.m, cols;
        var flag = function (key) { return function (v) { return v ? 'yes' : 'no'; }; };
        if (m === 'died') {
          cols = [
            { key: 'category', label: 'Age', text: true, format: Viz.fmt.age },
            { key: 'road_user', label: 'Road user', text: true },
            { key: 'cases_1119', label: 'Admitted 2011' + EN + '19', format: int },
            { key: 'died_1119', label: 'Died in hospital', format: int },
            { key: 'died_per_1000', label: 'Died per 1,000', format: function (v, r) { return r.publish_rate ? dp1(v) : 'not published'; } },
            { key: 'ci_low', label: '95% low', format: function (v, r) { return r.publish_rate ? dp1(v) : ''; } },
            { key: 'ci_high', label: '95% high', format: function (v, r) { return r.publish_rate ? dp1(v) : ''; } },
            { key: 'publish_rate', label: 'Rate published', format: flag() }
          ];
        } else {
          cols = [
            { key: 'category', label: 'Age', text: true, format: Viz.fmt.age },
            { key: 'road_user', label: 'Road user', text: true },
            { key: 'hosp_1621', label: 'Left hospital alive 2016' + EN + '21', format: int },
            { key: 'beds_1621', label: 'Bed days', format: int },
            { key: 'avg_stay', label: 'Average stay (days)', format: function (v, r) { return r.publish_stay ? dp1(v) : 'not published'; } },
            { key: 'publish_stay', label: 'Stay published', format: flag() }
          ];
        }
        var rows = [];
        bands.forEach(function (b) { rows.push(b.ped, b.all); });
        Viz.fillTable(el.querySelector('.fig-data'), rows, cols,
          { caption: m === 'died' ? 'Whiskers on the chart are the 95% interval columns.' : 'No intervals are drawn for average stay.' });
      }

      function draw(w) {
        var m = state.m, measure = measurer(host);
        var narrow = w < 560;
        var ml = narrow ? 56 : 60, mr = narrow ? 14 : 24;
        var pw = w - ml - mr;
        var rp = narrow ? 48 : 52, r = narrow ? 6 : 7;
        var keyH = (narrow && m === 'died') ? 50 : 30, axisH = 52;
        /* axis maximum from published values only (both series; whiskers count for the death rate) */
        var maxHi = d3.max(bands, function (b) {
          return Math.max(0, [b.ped, b.all].reduce(function (mx, r) {
            return ok(r, m) ? Math.max(mx, m === 'died' ? r.ci_high : r.avg_stay) : mx;
          }, 0));
        });
        var xmax = m === 'died' ? niceMax(maxHi, 10) : niceMax(maxHi, 5);
        var xs = d3.scaleLinear().domain([0, xmax]).range([0, pw]);
        /* annotation text for 75+ sits in extra space above the last row */
        var annLines = null, annH = 0;
        if (ok(p75.ped, m) && (m === 'died' || ok(p75.all, m))) {
          var annTxt = m === 'died'
            ? Math.round(p75.ped.died_per_1000) + ' in 1,000 pedestrians aged 75+ died in hospital'
            : dp1(p75.ped.avg_stay) + ' days: the average stay of pedestrians aged 75+, against ' + dp1(p75.all.avg_stay) + ' for all road users';
          annLines = wrap(measure, annTxt, Math.min(narrow ? pw - 4 : 400, pw), 13, 700);
          annH = annLines.length * 16 + 28;
        }
        var lastI = bands.length - 1;
        var h = keyH + bands.length * rp + annH + axisH;
        var svg = svgIn(host, w, h);
        host.setAttribute('aria-label', ariaSummary());

        /* key (open vs filled, also in notes) */
        var key = svg.append('g').attr('class', 'c3b-key').attr('transform', 'translate(' + ml + ',14)');
        key.append('circle').attr('class', 'c3b-open').attr('cx', 6).attr('cy', 0).attr('r', 6);
        key.append('text').attr('x', 18).attr('y', 0).attr('dy', '0.35em').text('All road users');
        var off = 18 + measure('All road users', 13, 500) + 22;
        key.append('circle').attr('class', 'c3b-fill').attr('cx', off + 6).attr('cy', 0).attr('r', 6);
        key.append('text').attr('x', off + 18).attr('y', 0).attr('dy', '0.35em').text('Pedestrians');
        if (m === 'died') {
          var kx = off + 18 + measure('Pedestrians', 13, 500) + 22;
          key.append('text').attr('class', 'c3b-key-note').attr('x', narrow ? 0 : kx).attr('y', narrow ? 24 : 0).attr('dy', '0.35em')
            .text('Lines show 95% intervals');
        }
        key.selectAll('text').style('font-size', '13px').style('font-weight', 500);

        var plot = svg.append('g').attr('transform', 'translate(' + ml + ',' + keyH + ')');
        var plotH = bands.length * rp + annH;
        var step = m === 'died' ? (pw < 380 ? 20 : 10) : (pw < 380 ? 10 : 5);
        var ticks = d3.range(0, xmax + 0.001, step);
        plot.selectAll('line.c3-grid').data(ticks).join('line').attr('class', 'c3-grid')
          .attr('x1', xs).attr('x2', xs).attr('y1', 0).attr('y2', plotH)
          .style('stroke', 'var(--rule)').style('stroke-width', 1);
        plot.append('line').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', plotH)
          .style('stroke', 'var(--ink)').style('stroke-width', 1);
        plot.selectAll('text.c3-tick').data(ticks).join('text').attr('class', 'c3-tick')
          .attr('x', xs).attr('y', plotH + 18).attr('text-anchor', 'middle')
          .style('font-size', '12px').style('fill', 'var(--muted)').text(function (t) { return t; });
        plot.append('text').attr('class', 'c3-axis-title').attr('x', w / 2 - ml).attr('y', plotH + 38).attr('text-anchor', 'middle')
          .style('font-size', '12px').style('fill', 'var(--muted)')
          .text(m === 'died'
            ? (narrow ? 'Died per 1,000 admitted, 2011' + EN + '19' : 'Died in hospital per 1,000 people admitted (2011' + EN + '19)')
            : (narrow ? 'Average stay (days), survivors, 2016' + EN + '21' : 'Average stay in days, people who left hospital alive (2016' + EN + '21)'));

        var rowG = plot.selectAll('g.c3b-row').data(bands).join('g').attr('class', 'c3b-row')
          .attr('transform', function (d, i) { return 'translate(0,' + (i * rp + rp / 2 + (i === lastI ? annH : 0)) + ')'; });
        rowG.append('line').attr('class', 'c3b-guide').attr('x1', 0).attr('x2', pw).attr('y1', 0).attr('y2', 0);
        rowG.append('rect').attr('class', 'c3-hit').attr('x', -ml).attr('y', -rp / 2).attr('width', w).attr('height', rp);
        rowG.append('text').attr('class', 'c3b-age').attr('x', -10).attr('y', 0).attr('dy', '0.35em').attr('text-anchor', 'end')
          .style('font-size', '13px').style('font-weight', 500).text(function (d) { return Viz.fmt.age(d.band); });

        rowG.each(function (b) {
          var g = d3.select(this);
          /* all road users: open dot, with whisker for the death rate */
          if (ok(b.all, m)) {
            if (m === 'died') {
              g.append('line').attr('class', 'c3b-whisker c3b-whisker-all')
                .attr('x1', xs(b.all.ci_low)).attr('x2', xs(b.all.ci_high)).attr('y1', 0).attr('y2', 0);
            }
            g.append('circle').attr('class', 'c3b-open').attr('cx', xs(val(b.all, m))).attr('cy', 0).attr('r', r);
            g.append('text').attr('class', 'c3b-val c3b-val-all').attr('x', xs(val(b.all, m))).attr('y', r + 15)
              .attr('text-anchor', 'middle').text(dp1(val(b.all, m)));
          } else {
            g.append('text').attr('class', 'c3b-np').attr('x', 6).attr('y', r + 15).text('All road users: ' + NP);
          }
          if (ok(b.ped, m)) {
            if (m === 'died') {
              var x1 = xs(b.ped.ci_low), x2 = xs(b.ped.ci_high);
              g.append('line').attr('class', 'c3b-whisker').attr('x1', x1).attr('x2', x2).attr('y1', 0).attr('y2', 0);
              g.append('line').attr('class', 'c3b-whisker').attr('x1', x1).attr('x2', x1).attr('y1', -5).attr('y2', 5);
              g.append('line').attr('class', 'c3b-whisker').attr('x1', x2).attr('x2', x2).attr('y1', -5).attr('y2', 5);
            }
            g.append('circle').attr('class', 'c3b-fill').attr('cx', xs(val(b.ped, m))).attr('cy', 0).attr('r', r);
            g.append('text').attr('class', 'c3b-val c3b-val-ped').attr('x', xs(val(b.ped, m))).attr('y', -r - 6)
              .attr('text-anchor', 'middle').text(dp1(val(b.ped, m)));
          } else {
            g.append('text').attr('class', 'c3b-np').attr('x', 6).attr('y', -r - 6).text('Pedestrians: ' + NP);
          }
        });
        Viz.tooltip.bind(rowG, tipHtml);

        /* annotation at 75+ */
        if (annLines) {
          var px = xs(val(p75.ped, m));
          var top0 = lastI * rp;                      /* start of the extra space */
          var ann = plot.append('g').attr('class', 'c3b-ann');
          var t = ann.append('text').attr('class', 'c3b-ann-text').attr('x', pw).attr('y', top0 + 16).attr('text-anchor', 'end');
          setLines(t, annLines, 16);
          var lastCy = lastI * rp + rp / 2 + annH;
          ann.append('line').attr('class', 'c3b-ann-leader').attr('x1', px).attr('x2', px)
            .attr('y1', top0 + 16 + (annLines.length - 1) * 16 + 5).attr('y2', lastCy - r - 22);
        }
      }

      function titleFor() {
        if (state.m === 'died' || !ok(p75.ped, 'stay') || !ok(p75.all, 'stay')) return origTitle;
        return 'Older pedestrians who survive stay ' + Math.round(p75.ped.avg_stay) + ' days in hospital, against ' + Math.round(p75.all.avg_stay) + ' for all road users aged 75+';
      }

      Viz.segmented(el.querySelector('.fig-controls'), {
        onChange: function (v) { state.m = v; titleEl.innerHTML = titleFor(); fillTable(); rsz.redraw(); }
      });
      state.m = (el.querySelector('.fig-controls button[aria-pressed="true"]') || { getAttribute: function () { return 'died'; } }).getAttribute('data-value');
      fillTable();
      var rsz = Viz.responsive(host, draw);
    },
    update: function () {}
  };

  /* ------------------------------------------------------------- fig-3c */
  var CP_NAME = {
    '2- or 3- wheeled motor vehicle': '2- or 3-wheeled motor vehicle',
    'Other and unspecified transport': 'Other and unspecified transport'
  };
  function cpName(c) { return CP_NAME[c] || c; }

  var fig3c = {
    init: function (el, data) {
      var host = el.querySelector('.fig-chart');
      var cpRows = data.severity.filter(function (r) { return r.view === 'counterparty'; });
      var state = { who: 'all' };
      var WHO = { all: 'All road users', ped: 'Pedestrian' };
      var RARE = { Train: true };

      function pub(who) {
        return cpRows.filter(function (r) { return r.road_user === WHO[who] && r.publish_rate; })
          .sort(function (a, b) { return b.died_per_1000 - a.died_per_1000; });
      }

      function ariaSummary(rows) {
        var who = state.who === 'all' ? 'all road users' : 'pedestrians';
        return 'Sorted dot list of deaths in hospital per 1,000 people admitted, by what the ' + (state.who === 'all' ? 'person' : 'pedestrian') + ' was hit by, for ' + who + ', published rows only. ' +
          rows.map(function (r) {
            return cpName(r.category) + ' ' + dp1(r.died_per_1000) + (RARE[r.category] ? ' (rare: ' + r.died_1119 + ' deaths in ' + r.cases_1119 + ' cases)' : '');
          }).join('; ') + '.';
      }

      function tipHtml(r) {
        var t = '<strong>Hit by: ' + cpName(r.category) + '</strong>';
        if (RARE[r.category]) t += ' <em>(rare)</em>';
        t += '<br>' + (r.road_user === 'Pedestrian' ? 'Pedestrians' : 'All road users') + ': ' + int(r.died_1119) + ' deaths in ' + int(r.cases_1119) + ' cases, 2011' + EN + '19' +
          '<br>' + dp1(r.died_per_1000) + ' per 1,000 (95% interval ' + dp1(r.ci_low) + ' to ' + dp1(r.ci_high) + ')';
        if (RARE[r.category]) t += '<br>Very few deaths: treat this rate with caution.';
        return t;
      }

      function fillTable() {
        var rows = cpRows.filter(function (r) { return r.road_user === WHO[state.who]; })
          .sort(function (a, b) { return (b.publish_rate - a.publish_rate) || (b.died_per_1000 - a.died_per_1000); });
        Viz.fillTable(el.querySelector('.fig-data'), rows, [
          { key: 'category', label: 'Hit by', text: true, format: function (v) { return cpName(v); } },
          { key: 'cases_1119', label: 'Cases 2011' + EN + '19', format: int },
          { key: 'died_1119', label: 'Deaths', format: int },
          { key: 'died_per_1000', label: 'Died per 1,000', format: function (v, r) { return r.publish_rate ? dp1(v) : 'not published'; } },
          { key: 'ci_low', label: '95% low', format: function (v, r) { return r.publish_rate ? dp1(v) : ''; } },
          { key: 'ci_high', label: '95% high', format: function (v, r) { return r.publish_rate ? dp1(v) : ''; } },
          { key: 'publish_rate', label: 'Rate published', format: function (v) { return v ? 'yes' : 'no'; } }
        ], { caption: (state.who === 'all' ? 'All road users' : 'Pedestrians') + '. A rate is published only with at least 100 cases and 10 deaths; the chart shows published rows only.' });
      }

      function draw(w) {
        var rows = pub(state.who), measure = measurer(host);
        var narrow = w < 560;
        var labelW = narrow ? 118 : 232, mr = narrow ? 68 : 76;
        var pw = Math.max(100, w - labelW - mr);
        var r = narrow ? 6 : 7, fs = narrow ? 13 : 14, lineH = fs + 3;
        /* one axis for both toggle states (so the toggle compares honestly), from published rows of either:
           large enough for the pedestrian Train dot */
        var xmax = niceMax(d3.max(pub('all').concat(pub('ped')), function (d) { return d.died_per_1000; }), 25);
        var xs = d3.scaleLinear().domain([0, xmax]).range([0, pw]);
        /* row layout */
        var y = 8;
        var lay = rows.map(function (d) {
          var lines = wrap(measure, cpName(d.category), labelW - 14, fs, 500);
          var note = (d.category === 'Heavy transport vehicle or bus' || RARE[d.category]);
          var h = Math.max(36, lines.length * lineH + 12) + (note ? 28 : 0);
          var o = { d: d, lines: lines, note: note, y: y, h: h, cy: y + (h - (note ? 28 : 0)) / 2 };
          y += h;
          return o;
        });
        var plotH = y - 8, axisH = 54;
        var H = y + axisH;
        var svg = svgIn(host, w, H);
        host.setAttribute('aria-label', ariaSummary(rows));

        var plot = svg.append('g').attr('transform', 'translate(' + labelW + ',0)');
        var step = pw < 380 ? (xmax > 80 ? 50 : 20) : (xmax > 80 ? 25 : 10);
        var ticks = d3.range(0, xmax + 0.001, step);
        plot.selectAll('line.c3-grid').data(ticks).join('line').attr('class', 'c3-grid')
          .attr('x1', xs).attr('x2', xs).attr('y1', 4).attr('y2', 8 + plotH)
          .style('stroke', 'var(--rule)').style('stroke-width', 1);
        plot.append('line').attr('x1', 0).attr('x2', 0).attr('y1', 4).attr('y2', 8 + plotH)
          .style('stroke', 'var(--ink)').style('stroke-width', 1);
        plot.selectAll('text.c3-tick').data(ticks).join('text').attr('class', 'c3-tick')
          .attr('x', xs).attr('y', 8 + plotH + 18).attr('text-anchor', 'middle')
          .style('font-size', '12px').style('fill', 'var(--muted)').text(function (t) { return t; });
        plot.append('text').attr('class', 'c3-axis-title').attr('x', w / 2 - labelW).attr('y', 8 + plotH + 38).attr('text-anchor', 'middle')
          .style('font-size', '12px').style('fill', 'var(--muted)')
          .text(narrow ? 'Died per 1,000 admitted, 2011' + EN + '19' : 'Died in hospital per 1,000 people admitted (2011' + EN + '19)');

        var ped = state.who === 'ped';
        var rowG = svg.selectAll('g.c3c-row').data(lay).join('g').attr('class', 'c3c-row')
          .attr('transform', function (o) { return 'translate(0,' + o.y + ')'; });
        rowG.append('rect').attr('class', 'c3-hit').attr('x', 0).attr('y', 0).attr('width', w).attr('height', function (o) { return o.h; });
        rowG.each(function (o) {
          var g = d3.select(this), d = o.d, rowH = o.h - (o.note ? 28 : 0), cy = rowH / 2;
          var t = g.append('text').attr('class', 'c3c-name').attr('x', labelW - 12).attr('y', cy - (o.lines.length - 1) * lineH / 2)
            .attr('dy', '0.35em').attr('text-anchor', 'end').style('font-size', fs + 'px');
          setLines(t, o.lines, lineH);
          var px = labelW + xs(d.died_per_1000);
          g.append('line').attr('class', 'c3c-stem').attr('x1', labelW).attr('x2', px).attr('y1', cy).attr('y2', cy);
          g.append('circle').attr('class', ped ? 'c3b-fill' : 'c3b-open').attr('cx', px).attr('cy', cy).attr('r', r + 1);
          g.append('text').attr('class', 'c3c-val').attr('x', px + r + 8).attr('y', cy).attr('dy', '0.35em').text(dp1(d.died_per_1000));
          if (o.note) {
            var ny = cy + r + 8, nx = labelW + 10;
            if (RARE[d.category]) {
              var bw = measure('rare', 12, 700) + 14;
              g.append('rect').attr('class', 'c3c-badge').attr('x', nx).attr('y', ny - 1).attr('width', bw).attr('height', 18).attr('rx', 9);
              g.append('text').attr('class', 'c3c-badge-text').attr('x', nx + bw / 2).attr('y', ny + 8).attr('dy', '0.35em').attr('text-anchor', 'middle').text('rare');
              nx += bw + 8;
            }
            g.append('text').attr('class', 'c3c-note').attr('x', nx).attr('y', ny + 8).attr('dy', '0.35em')
              .text(int(d.died_1119) + ' deaths in ' + int(d.cases_1119) + ' cases');
          }
        });
        rowG.each(function (o) { d3.select(this).datum(o.d); });
        Viz.tooltip.bind(rowG, tipHtml);
      }

      var rsz = null;
      Viz.segmented(el.querySelector('.fig-controls'), {
        onChange: function (v) { state.who = v; fillTable(); rsz.redraw(); }
      });
      var pressed = el.querySelector('.fig-controls button[aria-pressed="true"]');
      state.who = pressed ? pressed.getAttribute('data-value') : 'all';
      fillTable();
      rsz = Viz.responsive(host, draw);
    },
    update: function () {}
  };

  window.Charts['fig-3a'] = fig3a;
  window.Charts['fig-3b'] = fig3b;
  window.Charts['fig-3c'] = fig3c;
})();
