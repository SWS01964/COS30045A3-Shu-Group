/* common.js: shared helpers, namespace window.Viz.
   OWNED BY THE ORCHESTRATOR. Chapter agents: request changes, do not edit.

   Contents
     Viz.FILES, Viz.loadAll()            CSV loader with type coercion
     Viz.MAIN_ROAD_USERS, AGE_BANDS, MONTHS, CITED
     Viz.where(rows, {k: v})             tiny row filter
     Viz.fmt                             formatters (int, dp1, pct, signedPct, minus, age, range)
     Viz.tooltip                         one shared accessible tooltip
     Viz.responsive(el, draw)            width-driven redraw (debounced, ignores height-only changes)
     Viz.svg(host, w, h, opts)           (re)create a chart's svg with width/height/viewBox
     Viz.reducedMotion(), Viz.dur()      motion preference
     Viz.segmented(group, opts)          segmented button control (aria-pressed, arrow keys)
     Viz.fillTable(details, rows, cols)  "Show the numbers" table
     Viz.css(name), Viz.colors()         CSS token reader
     Viz.onThemeChange(cb)               light/dark switch
     Viz.announce(text)                  the page's single polite live region (status messages)
     Viz.a11y.watch(chartHost)           keeps a .fig-chart's role/aria-hidden consistent (see below)
     Viz.placeholder(figEl, id)          temporary chart placeholder (chapter agents delete the call)
     Viz.bus(initialState)               tiny shared state for one board's two linked panels:
                                           bus.get()               -> shallow copy of the state
                                           bus.set(patch, source)  -> merges patch; listeners fire only if a value changed (===)
                                           bus.on(fn)              -> fn(state, changedKeys[], source); returns an unsubscribe function
                                         source is a free string ('panel-a', 'controls', 'init'...) so a listener can ignore its own changes.
     Viz.flash(panelEl)                  adds .is-linked-flash to a panel for 600ms (the receiving panel's title flashes);
                                         a no-op under prefers-reduced-motion. Call it when ANOTHER panel changed this one.
*/
(function () {
  'use strict';
  var Viz = (window.Viz = window.Viz || {});

  /* ------------------------------------------------------------------ data */

  Viz.FILES = [
    'ch1_trend',
    'ch2_age_roaduser',
    'ch4_monthly',
    'ch4_state_cyclists',
    'ch5_first_nations_trend',
    'ch5_first_nations_profile',
    'severity'
  ];

  /* "123" -> 123, "1.5" -> 1.5, "TRUE"/"FALSE" -> boolean, "" -> null, else string. */
  function coerce(v) {
    if (v === undefined || v === null) return null;
    var s = String(v).trim();
    if (s === '') return null;
    if (s === 'TRUE') return true;
    if (s === 'FALSE') return false;
    if (/^-?\d+(\.\d+)?$/.test(s)) return +s;
    return s;
  }
  Viz.coerce = coerce;

  Viz.parseCsv = function (text) {
    return d3.csvParse(text, function (row) {
      var out = {};
      for (var k in row) if (Object.prototype.hasOwnProperty.call(row, k)) out[k] = coerce(row[k]);
      return out;
    });
  };

  /* Resolves to { ch1_trend: [...], ch2_age_roaduser: [...], ... } (keys = file names
     without .csv). A file that fails to load becomes [] and is listed in data.__errors. */
  Viz.loadAll = function (base) {
    base = base || 'data/';
    var data = { __errors: [] };
    return Promise.all(
      Viz.FILES.map(function (name) {
        return fetch(base + name + '.csv')
          .then(function (r) {
            if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
            return r.text();
          })
          .then(function (t) { data[name] = Viz.parseCsv(t); })
          .catch(function (e) {
            console.error('Could not load ' + name + '.csv', e);
            data[name] = [];
            data.__errors.push(name);
          });
      })
    ).then(function () { return data; });
  };

  Viz.MAIN_ROAD_USERS = ['Car driver', 'Car passenger', 'Motorcyclist', 'Pedal cyclist', 'Pedestrian'];
  Viz.AGE_BANDS = ['0-7', '8-16', '17-25', '26-39', '40-64', '65-74', '75+'];
  Viz.MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  /* Citation text only. The First Nations population now comes from ch5_first_nations_trend.csv
     (population column, computed in KNIME from data/supplementary/raw/abs_first_nations_population.csv).
     ABS back-cast after the 2021 Census (CC BY 4.0), estimates at 30 June.
     fnPopulation is kept empty so older chart code that reads it does not throw. */
  Viz.CITED = {
    fnPopulation: {},
    source: 'ABS, Estimates of Aboriginal and Torres Strait Islander Australians (back-cast after the 2021 Census), CC BY 4.0'
  };

  /* Viz.where(rows, {view: 'age', road_user: 'Pedestrian'}) -> matching rows. */
  Viz.where = function (rows, match) {
    return (rows || []).filter(function (r) {
      for (var k in match) if (r[k] !== match[k]) return false;
      return true;
    });
  };
  /* First match or undefined. */
  Viz.find = function (rows, match) { return Viz.where(rows, match)[0]; };

  /* ------------------------------------------------------------- formatters */

  var fInt = function (n) { return d3.format(',d')(Math.round(n)); };
  var fmt = (Viz.fmt = {});
  var MINUS = '−';
  fmt.int = function (n) { return n == null || isNaN(n) ? '–' : fInt(n); };
  fmt.dp = function (n, dp) { return n == null || isNaN(n) ? '–' : d3.format(',.' + (dp == null ? 1 : dp) + 'f')(n); };
  fmt.dp1 = function (n) { return fmt.dp(n, 1); };
  /* n is already a percentage number (16.3 -> "16%"). */
  fmt.pct = function (n, dp) { return n == null || isNaN(n) ? '–' : fmt.dp(n, dp || 0) + '%'; };
  /* "+16%" / "−32%" with a true minus sign. */
  fmt.signedPct = function (n, dp) {
    if (n == null || isNaN(n)) return '–';
    return d3.format('+,.' + (dp || 0) + 'f')(n) + '%';
  };
  /* Replace a leading hyphen-minus with a true minus sign. */
  fmt.minus = function (s) { return String(s).replace(/^-/, MINUS); };
  /* Age bands use an en dash: "65-74" -> "65–74"; "75+" unchanged. */
  fmt.range = function (a, b) { return a + '–' + b; };
  fmt.age = function (band) { return String(band).replace(/^(\d+)-(\d+)$/, '$1–$2'); };
  fmt.minusChar = MINUS;

  /* --------------------------------------------------------- motion + theme */

  var rmq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  Viz.reducedMotion = function () { return !!(rmq && rmq.matches); };
  /* Transition duration in ms (0 under reduced motion). Spec: 300-500 ms. */
  Viz.dur = function (ms) { return Viz.reducedMotion() ? 0 : (ms == null ? 400 : ms); };

  Viz.css = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };
  /* Current token values as plain strings (for canvas or d3 colour interpolation). */
  Viz.colors = function () {
    var o = {};
    ['rise', 'fall', 'ink', 'muted', 'context', 'band', 'paper', 'accent2', 'rule', 'surface']
      .forEach(function (k) { o[k] = Viz.css('--' + k); });
    return o;
  };
  var themeCbs = [];
  Viz.onThemeChange = function (cb) { themeCbs.push(cb); };
  if (window.matchMedia) {
    var dq = window.matchMedia('(prefers-color-scheme: dark)');
    var onTheme = function () { themeCbs.forEach(function (cb) { try { cb(); } catch (e) { console.error(e); } }); };
    if (dq.addEventListener) dq.addEventListener('change', onTheme);
    else if (dq.addListener) dq.addListener(onTheme);
  }

  /* ------------------------------------------------------------ live region */
  /* The page has ONE polite live region (#viz-live). Charts and controls call
     Viz.announce(text) instead of owning their own aria-live nodes, so a single
     interaction can never be announced twice. Created at load so screen readers
     have registered it before the first message. */
  var liveEl = document.getElementById('viz-live');
  if (!liveEl && document.body) {
    liveEl = document.createElement('div');
    liveEl.id = 'viz-live';
    liveEl.className = 'visually-hidden';
    liveEl.setAttribute('role', 'status');
    liveEl.setAttribute('aria-live', 'polite');
    liveEl.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveEl);
  }
  var liveTimer = null;
  Viz.announce = function (msg) {
    if (!liveEl) return;
    clearTimeout(liveTimer);
    liveEl.textContent = '';
    liveTimer = setTimeout(function () { liveEl.textContent = String(msg == null ? '' : msg); }, 60);
  };
  function plainText(html) {
    var d = document.createElement('div');
    d.innerHTML = String(html).replace(/<br\s*\/?>/gi, '. ');
    return (d.textContent || '').replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim();
  }
  Viz.plainText = plainText;

  /* ------------------------------------------------------------------ a11y */
  /* A chart host (.fig-chart) is role="img" with a summary aria-label only while it
     has nothing focusable inside. As soon as it holds focusable marks (heatmap cells,
     hit rows, year read-outs) role="img" would hide them from assistive tech, so the
     host becomes role="group" with the same summary label, svg wrappers are un-hidden,
     and every drawing part that is not itself a named mark is hidden (the summary and
     the named marks carry the information; the pickers and tables are the other paths).
     Charts redraw on resize and on state change, so a MutationObserver re-applies this. */
  var FOCUSABLE = '[tabindex], a[href], button, input, select, textarea';
  Viz.a11y = {
    tidy: function (host) {
      var hasFocus = !!host.querySelector(FOCUSABLE);
      if (!hasFocus) {
        if (host.getAttribute('role') !== 'img') host.setAttribute('role', 'img');
        return;
      }
      if (host.getAttribute('role') !== 'group') host.setAttribute('role', 'group');
      Array.prototype.forEach.call(host.querySelectorAll('svg'), function (svg) {
        if (svg.getAttribute('aria-hidden') === 'true' && svg.querySelector(FOCUSABLE)) svg.removeAttribute('aria-hidden');
        if (svg.getAttribute('role') === 'presentation') svg.removeAttribute('role');
        Array.prototype.forEach.call(svg.querySelectorAll('*'), function (n) {
          if (n.tagName === 'defs' || n.tagName === 'pattern' || n.tagName === 'linearGradient') return;
          if (n.matches(FOCUSABLE) || n.querySelector(FOCUSABLE)) {
            /* a group hidden while it was empty (e.g. a marker layer between redraws) must be shown once it holds a focusable mark */
            if (n.__tidyHidden && n.getAttribute('aria-hidden') === 'true') { n.removeAttribute('aria-hidden'); n.__tidyHidden = false; }
            return;
          }
          if (n.hasAttribute('aria-hidden')) return;
          var named = n.closest('[aria-label]');
          if (named && named !== host && host.contains(named)) return;
          n.setAttribute('aria-hidden', 'true');
          n.__tidyHidden = true;
        });
      });
    },
    watch: function (host) {
      if (!host || host.__a11yWatched) return;
      host.__a11yWatched = true;
      Viz.a11y.tidy(host);
      if (!window.MutationObserver) return;
      var t = null;
      new MutationObserver(function () {
        clearTimeout(t);
        t = setTimeout(function () { Viz.a11y.tidy(host); }, 0);
      }).observe(host, { childList: true, subtree: true });
    }
  };

  /* ---------------------------------------------------------------- tooltip */
  /* One shared tooltip. Opens on hover, tap, or keyboard focus; closes on
     mouseleave, blur, tap elsewhere, or Esc.
       Viz.tooltip.bind(selection, d => '<strong>Title</strong><br>text')
       Viz.tooltip.show(html, clientX, clientY) / Viz.tooltip.hide()
     bind() makes the elements focusable (tabindex 0) unless they already are, and gives the
     marks of one chart a single tab stop with arrow-key movement (see rove()). */
  var tipEl = null;
  var tipOwner = null;
  function ensureTip() {
    if (tipEl) return tipEl;
    tipEl = document.createElement('div');
    tipEl.className = 'viz-tooltip';
    tipEl.id = 'viz-tooltip';
    tipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tipEl);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') tip.hide();
    });
    document.addEventListener('pointerdown', function (e) {
      if (tipOwner && !(tipOwner.contains && tipOwner.contains(e.target))) tip.hide();
    }, true);
    window.addEventListener('scroll', function () { if (tipOwner && tipOwner.__tipTouch) tip.hide(); }, { passive: true });
    /* a redraw removes the element the tooltip belongs to (no blur or pointerleave fires on removal): close it */
    if (window.MutationObserver && document.body) {
      new MutationObserver(function () {
        if (tipOwner && !tipOwner.isConnected) tip.hide();
      }).observe(document.body, { childList: true, subtree: true });
    }
    return tipEl;
  }
  function place(x, y) {
    var el = ensureTip();
    var pad = 8, w = el.offsetWidth, h = el.offsetHeight;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var left = x + 14, top = y + 14;
    if (left + w + pad > vw) left = Math.max(pad, x - w - 14);
    if (top + h + pad > vh) top = Math.max(pad, y - h - 14);
    el.style.transform = 'translate(' + Math.round(left) + 'px,' + Math.round(top) + 'px)';
  }
  /* Marks bound inside one chart form ONE tab stop (roving tabindex): Tab enters the chart,
     arrow keys / Home / End move between its marks, Tab leaves. Same model as the heatmap,
     the year read-outs and the segmented controls. bind(sel, fn, {roving: false}) opts out. */
  function roveList(host) {
    var list = (host.__rove || []).filter(function (n) { return n.isConnected; });
    list.sort(function (a, b) { return (a.compareDocumentPosition(b) & 4) ? -1 : 1; });
    host.__rove = list;
    return list;
  }
  function rove(node) {
    var host = node.closest ? node.closest('.fig-chart') : null;
    if (!host) return;
    var list = roveList(host);
    list.push(node);
    host.__rove = list;
    node.setAttribute('tabindex', list.length === 1 ? '0' : '-1');
    node.addEventListener('focus', function () {
      roveList(host).forEach(function (n) { n.setAttribute('tabindex', n === node ? '0' : '-1'); });
    });
    node.addEventListener('keydown', function (e) {
      var k = e.key, l = roveList(host), i = l.indexOf(node), j = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') j = Math.min(l.length - 1, i + 1);
      else if (k === 'ArrowUp' || k === 'ArrowLeft') j = Math.max(0, i - 1);
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = l.length - 1;
      if (j === null || j === i) return;
      e.preventDefault();
      l.forEach(function (n) { n.setAttribute('tabindex', '-1'); });
      l[j].setAttribute('tabindex', '0');
      l[j].focus();
    });
  }
  var tip = (Viz.tooltip = {
    show: function (html, x, y, owner) {
      var el = ensureTip();
      el.innerHTML = html;
      el.classList.add('is-open');
      place(x, y);
      if (owner) {
        if (tipOwner && tipOwner !== owner && tipOwner.removeAttribute) tipOwner.removeAttribute('aria-describedby');
        tipOwner = owner;
        /* marks named from the tooltip text itself must not also be described by it (read twice) */
        if (owner.setAttribute && !owner.__tipNamed) owner.setAttribute('aria-describedby', 'viz-tooltip');
      }
    },
    hide: function () {
      if (!tipEl) return;
      tipEl.classList.remove('is-open');
      if (tipOwner && tipOwner.removeAttribute) tipOwner.removeAttribute('aria-describedby');
      tipOwner = null;
    },
    bind: function (selection, htmlFn, opts) {
      ensureTip();
      opts = opts || {};
      selection.each(function (d, i, nodes) {
        var node = this;
        if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
        var html = function () { return typeof htmlFn === 'function' ? htmlFn.call(node, d, i, nodes) : htmlFn; };
        /* a focusable mark needs a role and a name (an aria-label needs a role): default to role="img"
           and, if unnamed, a name made from the tooltip text, so it is announced with its data */
        if (!node.hasAttribute('role')) node.setAttribute('role', 'img');
        if (!node.hasAttribute('aria-label')) {
          node.__tipNamed = true;
          node.setAttribute('aria-label', plainText(html()));
        }
        node.addEventListener('pointerenter', function (e) {
          if (e.pointerType === 'touch') return;
          tip.show(html(), e.clientX, e.clientY, node);
        });
        node.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch' || !tipOwner) return;
          place(e.clientX, e.clientY);
        });
        node.addEventListener('pointerleave', function (e) {
          if (e.pointerType === 'touch') return;
          if (document.activeElement !== node) tip.hide();
        });
        node.addEventListener('click', function (e) { /* tap: first tap opens, second closes */
          if (e.pointerType !== 'touch') return; /* mouse = hover, keyboard = focus */
          if (tipOwner === node) { tip.hide(); node.__tipTouch = false; return; }
          node.__tipTouch = true;
          tip.show(html(), e.clientX, e.clientY, node);
        });
        node.addEventListener('focus', function () {
          if (node.__tipNamed) node.setAttribute('aria-label', plainText(html()));
          var r = node.getBoundingClientRect();
          tip.show(html(), r.left + r.width / 2, r.top + r.height / 2, node);
          node.__tipTouch = false;
        });
        node.addEventListener('blur', function () { tip.hide(); });
        if (opts.roving !== false) rove(node);
      });
      return selection;
    }
  });

  /* ------------------------------------------------------------- responsive */
  /* Viz.responsive(container, draw, {debounce: 150}) -> { redraw(), destroy(), width() }
     draw(width) is called once now and again when the container WIDTH changes
     (debounced). Height-only changes are ignored: mobile address bars resize the
     viewport height while scrolling, and a chart changing its own height would
     otherwise loop. Do not set a fixed CSS height on the container. */
  Viz.responsive = function (el, draw, opts) {
    opts = opts || {};
    var wait = opts.debounce == null ? 150 : opts.debounce;
    var lastW = -1, timer = null, ro = null;
    function w() { return Math.floor(el.getBoundingClientRect().width); }
    function run(force) {
      var cw = w();
      if (cw <= 0) return;
      if (!force && cw === lastW) return;
      lastW = cw;
      try { draw(cw); } catch (e) { console.error('chart draw failed', e); }
    }
    function schedule() { clearTimeout(timer); timer = setTimeout(function () { run(false); }, wait); }
    run(true);
    if (window.ResizeObserver) {
      ro = new ResizeObserver(schedule);
      ro.observe(el);
    } else {
      window.addEventListener('resize', schedule);
    }
    return {
      redraw: function () { run(true); },
      width: function () { return lastW; },
      destroy: function () {
        clearTimeout(timer);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', schedule);
      }
    };
  };

  /* Viz.svg(host, w, h, {cls, reuse, hidden, clear}) -> d3 selection of the chart's <svg>.
     Default: remove any svg in host and append a fresh one (width/height/viewBox set).
     reuse:true  keeps one svg (selector 'svg' or 'svg.' + cls) and re-joins it.
     cls         class on the svg. hidden:true  aria-hidden + focusable=false.
     clear:true  empties a reused svg. */
  Viz.svg = function (host, w, h, o) {
    o = o || {};
    var sel = d3.select(host), s;
    if (o.reuse) {
      s = sel.selectAll('svg' + (o.cls ? '.' + o.cls : '')).data([0]).join('svg');
    } else {
      sel.selectAll('svg').remove();
      s = sel.append('svg');
    }
    if (o.cls) s.attr('class', o.cls);
    s.attr('width', w).attr('height', h).attr('viewBox', '0 0 ' + w + ' ' + h);
    if (o.hidden) s.attr('aria-hidden', 'true').attr('focusable', 'false');
    if (o.clear) s.selectAll('*').remove();
    return s;
  };

  /* Height from width with sensible limits: Viz.height(width, {ratio: 0.6, min: 220, max: 520}) */
  Viz.height = function (width, o) {
    o = o || {};
    var h = width * (o.ratio || 0.6);
    return Math.round(Math.max(o.min || 180, Math.min(o.max || 640, h)));
  };

  /* -------------------------------------------------------------- segmented */
  /* Viz.segmented(groupEl, {onChange(value, button), initial})
     Wires every button[data-value] inside groupEl as a one-of-N control:
     aria-pressed, click, and arrow/Home/End keys (roving tabindex).
     Returns {get(), set(value, silent)}. Initial value = the button already
     marked aria-pressed="true" in the HTML, unless opts.initial is given. */
  Viz.segmented = function (group, opts) {
    opts = opts || {};
    var buttons = Array.prototype.slice.call(group.querySelectorAll('button[data-value]'));
    if (!buttons.length) return { get: function () { return null; }, set: function () {} };
    var current = opts.initial;
    if (current == null) {
      var pre = buttons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0];
      current = (pre || buttons[0]).getAttribute('data-value');
    }
    function apply(value, silent, focus) {
      var changed = value !== current;
      current = value;
      buttons.forEach(function (b) {
        var on = b.getAttribute('data-value') === value;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      if (!silent && changed && opts.onChange) {
        var btn = buttons.filter(function (b) { return b.getAttribute('data-value') === value; })[0];
        opts.onChange(value, btn);
        /* tell screen-reader users what changed: the chart's new summary (its aria-label is rewritten
           by onChange). Pass announce:false when the chart announces its own message. */
        if (opts.announce !== false) {
          setTimeout(function () {
            var fig = group.closest ? group.closest('.fig') : null;
            var host = fig && fig.querySelector('.fig-chart');
            var label = host && host.getAttribute('aria-label');
            Viz.announce(label || ((btn && btn.textContent) ? 'Showing ' + btn.textContent.trim() : ''));
          }, 120);
        }
      }
    }
    buttons.forEach(function (b, i) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-value'), false, false); });
      b.addEventListener('keydown', function (e) {
        var n = buttons.length, j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        if (j === null) return;
        e.preventDefault();
        apply(buttons[j].getAttribute('data-value'), false, true);
      });
    });
    apply(current, true, false);
    return {
      get: function () { return current; },
      set: function (v, silent) { apply(v, !!silent, false); }
    };
  };

  /* -------------------------------------------------------------- fillTable */
  /* Viz.fillTable(detailsEl, rows, columns, {caption})
     columns: [{key: 'year', label: 'Year', format: fn(value, row), text: true}]
     Builds <table> inside detailsEl (inside a scrollable .table-wrap).
     Safe to call again whenever the view changes: the table is rebuilt. */
  Viz.fillTable = function (details, rows, columns, opts) {
    if (!details) return;
    opts = opts || {};
    var wrap = details.querySelector('.table-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      var old = details.querySelector('table');
      if (old) wrap.appendChild(old);
      details.appendChild(wrap);
    }
    var table = wrap.querySelector('table');
    if (!table) { table = document.createElement('table'); wrap.appendChild(table); }
    table.innerHTML = '';
    var fig = details.closest ? details.closest('.fig') : null;
    var titleEl = fig && fig.querySelector('.fig-title');
    var captionText = opts.caption ||
      (titleEl ? 'Data for: ' + titleEl.textContent.replace(/\s+/g, ' ').trim() : 'Data table');
    var cap = document.createElement('caption');
    cap.textContent = captionText;
    table.appendChild(cap);
    /* the scrollable wrapper must be reachable by keyboard and named */
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', captionText);
    /* 14 identical "Show the numbers" summaries: give each a distinct name that still starts with its visible text */
    var sum = details.querySelector('summary');
    if (sum) sum.setAttribute('aria-label', (sum.textContent || 'Show the numbers').trim() + ': ' + captionText);
    var thead = table.createTHead().insertRow();
    columns.forEach(function (c) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = c.label;
      if (c.text) th.className = 'is-text';
      thead.appendChild(th);
    });
    var tbody = table.createTBody();
    (rows || []).forEach(function (r) {
      var tr = tbody.insertRow();
      columns.forEach(function (c, ci) {
        var v = r[c.key];
        var s = c.format ? c.format(v, r) : (v == null ? '–' : (typeof v === 'boolean' ? (v ? 'yes' : 'no') : v));
        var cell = ci === 0 ? document.createElement('th') : document.createElement('td');
        if (ci === 0) cell.scope = 'row';
        cell.textContent = s;
        if (c.text) cell.className = 'is-text';
        tr.appendChild(cell);
      });
    });
    details.setAttribute('data-rows', String((rows || []).length));
  };

  /* -------------------------------------------------------------------- bus */
  /* Viz.bus(initial) -> { get, set(patch, source), on(fn) }
     One bus per board. Listeners get (state copy, changedKeys, source) and only when at
     least one key's value really changed (===). A listener may call set() (re-entrant sets
     are delivered after the current round, in order), but must not loop on its own change. */
  Viz.bus = function (initialState) {
    var state = {}, k, listeners = [], queue = [], busy = false;
    for (k in (initialState || {})) if (Object.prototype.hasOwnProperty.call(initialState, k)) state[k] = initialState[k];
    function copy() { var c = {}, key; for (key in state) c[key] = state[key]; return c; }
    function deliver(changed, source) {
      listeners.slice().forEach(function (fn) {
        try { fn(copy(), changed.slice(), source); }
        catch (e) { console.error('[bus] listener failed', e); }
      });
    }
    return {
      get: copy,
      set: function (patch, source) {
        var changed = [], key;
        for (key in (patch || {})) {
          if (Object.prototype.hasOwnProperty.call(patch, key) && state[key] !== patch[key]) {
            state[key] = patch[key];
            changed.push(key);
          }
        }
        if (!changed.length) return;
        queue.push([changed, source]);
        if (busy) return;
        busy = true;
        try { while (queue.length) { var q = queue.shift(); deliver(q[0], q[1]); } }
        finally { busy = false; }
      },
      on: function (fn) {
        listeners.push(fn);
        return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
      }
    };
  };

  /* -------------------------------------------------------------------- flash */
  /* Link feedback: the receiving panel's title gets a 600ms background flash (see components.css). */
  Viz.flash = function (panelEl) {
    if (!panelEl || Viz.reducedMotion()) return;
    panelEl.classList.remove('is-linked-flash');
    void panelEl.offsetWidth; /* restart the animation if it is already running */
    panelEl.classList.add('is-linked-flash');
    clearTimeout(panelEl.__flashTimer);
    panelEl.__flashTimer = setTimeout(function () { panelEl.classList.remove('is-linked-flash'); }, 600);
  };

  /* -------------------------------------------------------------- placeholder */
  /* Temporary placeholder so every figure proves its wiring. Chapter agents
     delete the Viz.placeholder() call when they draw the real chart.
     Returns {setText(str)}. */
  Viz.placeholder = function (figEl, id, text) {
    var host = figEl.querySelector('.fig-chart');
    var label = text || 'chart to come';
    var textEl = null, rect = null, svg = null;
    Viz.responsive(host, function (w) {
      var h = Viz.height(w, { ratio: 0.45, min: 140, max: 320 });
      var s = d3.select(host).selectAll('svg').data([0]).join('svg')
        .attr('width', w).attr('height', h).attr('viewBox', '0 0 ' + w + ' ' + h)
        .attr('aria-hidden', 'true');
      s.selectAll('rect.placeholder-frame').data([0]).join('rect').attr('class', 'placeholder-frame')
        .attr('x', 0.5).attr('y', 0.5).attr('width', w - 1).attr('height', h - 1).attr('rx', 6);
      textEl = s.selectAll('text.ph').data([0]).join('text').attr('class', 'ph')
        .attr('x', w / 2).attr('y', h / 2).attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .style('font-size', '14px').text(id + ' · ' + label);
    });
    return {
      setText: function (t) {
        label = t;
        if (textEl) textEl.text(id + ' · ' + label);
      }
    };
  };
})();
