/* main.js: boot sequence. OWNED BY THE ORCHESTRATOR.
   load data -> fillProse -> init every board -> scroll-spy.
   A chart that throws is logged and skipped; the rest of the page carries on. */
(function () {
  'use strict';

  /* Each section.board[id] is initialised by window.Charts[id].init(boardEl, data).
     A module that throws is logged and the board is marked data-chart-error; the rest carry on. */
  function initBoards(data) {
    var charts = window.Charts || {};
    var boards = document.querySelectorAll('section.board[id]');
    var ok = 0;
    Array.prototype.forEach.call(boards, function (el) {
      var mod = charts[el.id];
      if (!mod || typeof mod.init !== 'function') { console.warn('[main] no module registered for #' + el.id); return; }
      try { mod.init(el, data); ok++; }
      catch (e) { console.error('[main] #' + el.id + ' failed to init', e); el.setAttribute('data-chart-error', 'true'); }
    });
    return ok;
  }

  /* Highlights the chapter in view in the sticky nav. */
  function scrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.chapnav a[href^="#"]'));
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var ids = Object.keys(map);
    var current = null;
    function setCurrent(id) {
      if (id === current) return;
      current = id;
      links.forEach(function (a) {
        if (a === map[id]) {
          a.setAttribute('aria-current', 'true');
          var bar = a.closest('ul');
          if (bar && bar.scrollWidth > bar.clientWidth) {
            var target = a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2;
            bar.scrollTo({ left: Math.max(0, target), behavior: Viz.reducedMotion() ? 'auto' : 'smooth' });
          }
        } else a.removeAttribute('aria-current');
      });
    }
    function compute() {
      /* the last section whose top is above 40% of the viewport (nav height as the floor) */
      var line = Math.max(80, window.innerHeight * 0.4), best = null;
      ids.forEach(function (id) {
        var s = document.getElementById(id);
        if (s && s.getBoundingClientRect().top <= line) best = id;
      });
      /* closing / downloads / footer belong to "Methods" once reached; before ch1, nothing */
      var closing = document.getElementById('closing');
      if (closing && closing.getBoundingClientRect().top <= line && best !== 'methods') best = null;
      if (best) setCurrent(best);
      else if (current) { links.forEach(function (a) { a.removeAttribute('aria-current'); }); current = null; }
    }
    var tick = false;
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { tick = false; compute(); });
    }, { passive: true });
    window.addEventListener('resize', compute);
    compute();
  }

  function boot() {
    scrollSpy();
    Viz.loadAll('data/').then(function (data) {
      if (data.__errors.length) {
        var box = document.getElementById('load-error');
        if (box) {
          box.textContent = 'Some data files could not be loaded (' + data.__errors.join(', ') +
            '). Serve the site over HTTP (python3 -m http.server) rather than opening index.html as a file.';
          box.hidden = false;
        }
      }
      var report;
      try { report = Facts.fillProse(data); }
      catch (e) { console.error('[main] fillProse failed', e); }
      var n = initBoards(data);
      Array.prototype.forEach.call(document.querySelectorAll('.panel-chart'), Viz.a11y.watch);
      window.siteData = data;
      var root = document.documentElement;
      root.setAttribute('data-ready', 'true');
      if (report) {
        root.setAttribute('data-fill-total', String(report.total));
        root.setAttribute('data-fill-mismatches', String(report.mismatches.length));
        root.setAttribute('data-fill-errors', String(report.errors.length));
        console.info('[main] prose numbers: ' + report.total + ' filled, ' + report.mismatches.length +
          ' mismatches, ' + report.errors.length + ' errors; boards initialised: ' + n);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
