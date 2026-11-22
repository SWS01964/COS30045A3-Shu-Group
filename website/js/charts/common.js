/* Shared tokens and helpers: colours (read from CSS custom properties), formats, text wrap,
   tooltip, gridlines, annotations, segmented controls, keyboard navigation, data tables. */
window.Viz = (function () {
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MINUS = '−';
  const NARROW = 600;

  const fmtInt = d3.format(',');
  const fmt1 = (v) => (+v).toFixed(1);
  const signed = (v, dp) => {
    const r = +Math.abs(v).toFixed(dp || 0);
    return (v < 0 && r !== 0 ? MINUS : (r === 0 ? '' : '+')) + r.toLocaleString('en-AU', {minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0});
  };
  const ageLabel = (a) => String(a).replace('-', '–');
  const narrow = (w) => w < NARROW;
  // 4:3 below 600px, otherwise the chart's own desktop height.
  const aspectH = (w, desktopH) => (narrow(w) ? Math.round(w * 0.75) : desktopH);

  // Wrap `str` into tspans inside a <text> selection. Returns number of lines.
  function wrap(text, str, width, lh) {
    lh = lh || 15;
    const x = text.attr('x') || 0, y = text.attr('y') || 0;
    text.text(null);
    let line = [], n = 1;
    let ts = text.append('tspan').attr('x', x).attr('y', y);
    String(str).split(/\s+/).forEach((w) => {
      line.push(w);
      ts.text(line.join(' '));
      if (ts.node().getComputedTextLength() > width && line.length > 1) {
        line.pop(); ts.text(line.join(' ')); line = [w];
        ts = text.append('tspan').attr('x', x).attr('y', y).attr('dy', n * lh).text(w);
        n++;
      }
    });
    return n;
  }

  /* ---------- tooltip (hover, tap, keyboard) ---------- */
  const tipEl = d3.select('body').append('div').attr('class', 'tip').attr('role', 'tooltip').attr('aria-hidden', 'true');
  const tip = {
    show(html, cx, cy) {
      tipEl.html(html).classed('on', true);
      const n = tipEl.node(), w = n.offsetWidth, h = n.offsetHeight;
      let left = cx + 14, top = cy - h - 12;
      if (left + w > window.innerWidth - 8) left = cx - w - 14;
      if (left < 8) left = Math.max(8, Math.min(window.innerWidth - w - 8, cx - w / 2));
      if (top < 52) top = cy + 18;
      tipEl.style('left', left + 'px').style('top', top + 'px');
    },
    at(node, html) {
      const b = node.getBoundingClientRect();
      tip.show(html, b.left + b.width / 2, b.top + Math.min(b.height / 2, 20));
    },
    hide() { tipEl.classed('on', false); }
  };
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.chart')) tip.hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tip.hide(); });
  window.addEventListener('scroll', debounce(() => tip.hide(), 60), {passive: true});

  // Bind hover + tap (+ focus for keyboard users) on a selection of hit targets.
  function bindTip(sel, html) {
    sel.on('pointerenter pointermove', (ev, d) => { if (ev.pointerType === 'mouse') tip.show(html(d), ev.clientX, ev.clientY); })
      .on('pointerdown', (ev, d) => tip.show(html(d), ev.clientX, ev.clientY))
      .on('pointerleave', (ev) => { if (ev.pointerType === 'mouse') tip.hide(); });
  }

  function debounce(fn, ms) { let t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  /* ---------- SVG scaffolding ---------- */
  function svg(el, W, H, label) {
    const root = d3.select(el);
    root.selectAll('svg, .annot-list').remove();
    return root.append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H)
      .attr('role', 'img').attr('aria-label', label);
  }

  // Horizontal gridlines only, with left-aligned tick labels. Zero (or `base`) line in ink.
  function gridY(g, y, ticks, iw, fmt, base) {
    const C = css;
    g.append('g').selectAll('line').data(ticks).join('line').attr('x1', 0).attr('x2', iw).attr('y1', y).attr('y2', y)
      .attr('stroke', (d) => (d === base ? C('--ink-2') : C('--grid'))).attr('stroke-width', 1).attr('shape-rendering', 'crispEdges');
    g.append('g').selectAll('text').data(ticks).join('text').attr('x', -6).attr('y', (d) => y(d) + 4).attr('text-anchor', 'end').text(fmt || ((d) => d));
  }

  /* ---------- annotations ----------
     items: {x, y, tx, ty, text, anchor, width}. (x,y) is the point, (tx,ty) the text anchor.
     On narrow screens the text moves below the chart as a numbered list and a badge marks the point. */
  function annotate(g, el, items, isNarrow) {
    const C = css;
    if (isNarrow) {
      const list = d3.select(el).append('ol').attr('class', 'annot-list');
      items.forEach((a, i) => {
        const bx = a.x + (a.bx || 0), by = a.y + (a.by == null ? -16 : a.by);
        const b = g.append('g').attr('class', 'annot-badge').attr('aria-hidden', 'true').style('pointer-events', 'none');
        b.append('line').attr('x1', a.x).attr('y1', a.y).attr('x2', bx).attr('y2', by).attr('stroke', C('--ink')).attr('stroke-width', 1);
        b.append('circle').attr('cx', bx).attr('cy', by).attr('r', 9).attr('fill', C('--ink'));
        b.append('text').attr('x', bx).attr('y', by + 4).attr('text-anchor', 'middle').style('fill', C('--bg')).style('font-weight', 700).text(i + 1);
        const li = list.append('li');
        li.append('span').attr('class', 'badge').attr('aria-hidden', 'true').text(i + 1);
        li.append('span').text(a.text);
      });
      return;
    }
    items.forEach((a) => {
      const ag = g.append('g').attr('class', 'annot').style('pointer-events', 'none');
      if (a.tx != null && (Math.abs(a.tx - a.x) > 2 || Math.abs(a.ty - a.y) > 2)) {
        ag.append('line').attr('x1', a.x).attr('y1', a.y).attr('x2', a.lx == null ? a.tx : a.lx).attr('y2', a.ly == null ? a.ty : a.ly)
          .attr('stroke', C('--ink-2')).attr('stroke-width', 1);
      }
      const t = ag.append('text').attr('x', a.tx == null ? a.x : a.tx).attr('y', a.ty == null ? a.y : a.ty)
        .attr('text-anchor', a.anchor || 'start').style('fill', C('--ink')).style('font-weight', 600);
      wrap(t, a.text, a.width || 180, 15);
      // halo so text stays legible over lines
      t.clone(true).lower().style('fill', 'none').attr('stroke', C('--bg')).attr('stroke-width', 4).attr('stroke-linejoin', 'round');
    });
  }

  /* ---------- segmented control (toggle / stepper) ----------
     Buttons carry data-value; aria-pressed marks the selected one. Arrow keys move and select. */
  function segmented(groupSel, onChange) {
    const group = document.querySelector(groupSel);
    if (!group) return;
    const btns = Array.from(group.querySelectorAll('button[data-value]'));
    const select = (b, focus) => {
      btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      if (focus) b.focus();
      onChange(b.dataset.value);
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', (ev) => {
        if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
        ev.preventDefault();
        const j = (i + (ev.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length;
        select(btns[j], true);
      });
    });
  }

  /* ---------- keyboard reading of a chart ----------
     Makes the svg focusable; arrow keys step through n items and call show(i, node?). */
  function keyNav(svgSel, n, show, opts) {
    opts = opts || {};
    let i = null;
    const keys = opts.vertical ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
    svgSel.attr('tabindex', 0).on('keydown', (ev) => {
      const k = ev.key;
      if (k !== keys[0] && k !== keys[1] && k !== 'Home' && k !== 'End') return;
      ev.preventDefault();
      if (k === 'Home') i = 0; else if (k === 'End') i = n - 1;
      else i = i == null ? (opts.start || 0) : Math.max(0, Math.min(n - 1, i + (k === keys[1] ? 1 : -1)));
      show(i);
    }).on('blur', () => { i = null; tip.hide(); if (opts.onBlur) opts.onBlur(); });
  }

  function fillTable(sel, caption, head, rows) {
    const t = d3.select(sel);
    t.html('');
    t.append('caption').text(caption);
    t.append('thead').append('tr').selectAll('th').data(head).join('th').attr('scope', 'col').text((d) => d);
    t.append('tbody').selectAll('tr').data(rows).join('tr').selectAll('td').data((d) => d).join('td').text((d) => d);
  }

  // Simple vertical label relaxation: labels {y} sorted, pushed apart to at least `gap`, kept inside [lo, hi].
  function relax(labels, gap, lo, hi) {
    labels.sort((a, b) => a.y - b.y);
    for (let k = 0; k < 40; k++) {
      for (let i = 1; i < labels.length; i++) {
        const d = labels[i].y - labels[i - 1].y;
        if (d < gap) { const s = (gap - d) / 2; labels[i - 1].y -= s; labels[i].y += s; }
      }
      labels.forEach((l) => { l.y = Math.max(lo, Math.min(hi, l.y)); });
    }
    return labels;
  }

  // Run fn when the colour scheme changes, so charts pick up the new tokens.
  function onTheme(fn) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn);
  }

  // Bars/marks: grow from zero on first draw unless reduced motion.
  const dur = () => (reduced() ? 0 : 450);

  return {css, reduced, MINUS, NARROW, fmtInt, fmt1, signed, ageLabel, narrow, aspectH, wrap, tip, bindTip, debounce,
    svg, gridY, annotate, segmented, keyNav, fillTable, relax, onTheme, dur};
})();
