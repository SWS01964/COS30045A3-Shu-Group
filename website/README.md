# Beyond the Road Toll: website

A static, single-page D3 v7 data story (COS30045). Plain HTML, CSS and JS: no build step, no CDN at runtime, all paths relative. Source of truth for layout is `report/LAYOUT_SPEC.md`; copy is `report/STORYBOARD.md` v2; numbers are traced in `data/processed/KEY_NUMBERS.md`.

## Structure
Source of truth for page structure and copy: `CLAUDE_CONTEXT/DASHBOARD_PLAN.md` (§2 copy, §3 board component). Numbers are traced in `data/processed/KEY_NUMBERS.md`.
```
index.html            hero + Five findings, five <section class="board" id="ch1..ch5">, closing, methods, downloads
css/tokens.css        :root tokens, light + dark (incl. --board-tint, --panel)   (shell agent)
css/base.css          reset, typography, focus rings, reduced motion              (shell agent)
css/layout.css        masthead, sticky nav, hero, boards (band, header, Explore bar, grid, panels), closing, methods (shell agent)
css/components.css    link flash, segmented buttons and selects (>= 44px), tooltip, details/table (shell agent)
css/ch1.css..ch5.css  one per chapter, scoped under #chN                          (chapter agents)
js/vendor/d3.min.js   D3 7.9.0 (local copy)
js/common.js          window.Viz: loader, formatters, tooltip, responsive, segmented, fillTable, tokens, bus, flash (shell agent)
js/facts.js           window.Facts: data-fill registry + fillProse()              (shell agent)
js/main.js            boot: load data -> fillProse -> init boards -> a11y watch -> scroll-spy (shell agent)
js/charts/ch1..ch5.js one module per chapter: window.Charts['chN']                (chapter agents)
data/*.csv            the 7 contract CSVs (copied by sync_data.sh)
```

## Run locally
```
cd website
./sync_data.sh            # only after the CSVs change
python3 -m http.server 8000
# open http://localhost:8000/   (opening index.html as a file will not load the CSVs)
```

## FILE OWNERSHIP RULES
- **Shell agent / orchestrator:** `index.html` (head, hero, nav, closing, methods, downloads, footer, and the board header copy), `css/{tokens,base,layout,components}.css`, `js/{common,facts,main}.js`, `sync_data.sh`, `data/`.
- **Chapter N agent (1 to 5):** `js/charts/chN.js`, `css/chN.css` (scope every rule under `#chN`), and markup only inside `section#chN .board-explore` and `.board-grid` (controls, panel titles/subtitles/aria-labels). Do not change the headline, kicker or topic sentences; copy changes go through Opus.
- Need a helper, token or new `data-fill` key? Ask the shell agent (or call `Facts.register` from your chN.js). Do not fork shared helpers. No external requests, frameworks or new vendor files.

## Board module interface
```js
window.Charts['ch3'] = {
  init(boardEl, data) { /* boardEl = <section class="board" id="ch3">; data = all 7 CSVs */ }
};
```
- `data` keys are the file names without `.csv` (`ch1_trend`, `ch2_age_roaduser`, `ch4_monthly`, `ch4_state_cyclists`, `ch5_first_nations_trend`, `ch5_first_nations_profile`, `severity`). Values are coerced: numbers, `"TRUE"/"FALSE"` to booleans, blank to `null`. Year columns keep string keys (`row[2020]`).
- DOM hooks inside the board: `.explore-controls` (put `Viz.segmented` groups and selects here), `.board-chip` (live "Showing: ..." text), panels `#chN-a` / `#chN-b` each with `.panel-title`, `.panel-sub`, `.panel-chart` (draw here; keep `role="img"` and update its `aria-label` on every view change), `.board-tables` (append one `<details>`-style table per panel with `Viz.fillTable`, or fill the board's own `details.board-data`), `.board-notes` (copy is fixed).
- Linking: create `var bus = Viz.bus({year: 2021})`; panels call `bus.set({year}, 'panel-a')` and subscribe with `bus.on(function (state, changedKeys, source) {...})` (fires only for keys that changed). When one panel changes the other, call `Viz.flash(otherPanelEl)` and `Viz.announce(text)`.
- Size from the container: `Viz.responsive(panelChartEl, function (width) {...})`. It redraws on width change only, so do not set a CSS height on `.panel-chart` (it has a min-height).
- Colours: CSS tokens in styles (`'var(--rise)'`) so dark mode follows; `Viz.colors()` / `Viz.css('--rise')` only for interpolation (re-read in `Viz.onThemeChange`).
- Controls: `Viz.segmented(groupEl, { onChange, announce: false })` (the built-in announcement looks for a `.fig`, so pass `announce: false` and call `Viz.announce` yourself). Selects: `change` listener.
- Tooltip: `Viz.tooltip.bind(selection, d => 'html')`. `Viz.a11y.watch` runs on every `.panel-chart` (started in main.js) and switches it between `role="img"` and `role="group"` as marks become focusable.
- Motion: `Viz.dur()` (0 under reduced motion). Formatters `Viz.fmt.int/dp/dp1/pct/signedPct/age`; constants `Viz.MAIN_ROAD_USERS`, `AGE_BANDS`, `MONTHS`; row filter `Viz.where` / `Viz.find`. One board throwing is logged by `main.js` and sets `data-chart-error`; the others carry on.
- Cited, not in the CSVs: `Viz.CITED.fnPopulation`.

## Prose numbers
Every number in topic sentences, panel titles, notes and the closing is `<span data-fill="key">fallback</span>`. `facts.js` holds `key -> function(data)`; on load `Facts.fillProse` replaces the text and `console.warn`s `[facts] MISMATCH ...` if it differs from the fallback. Mismatch count is on `<html data-fill-mismatches>`. Years, thresholds and cited figures stay plain text.

## QA commands
```
# serve
cd website && python3 -m http.server 8765 &
# console + prose check (expect "0 mismatches, 0 errors; boards initialised: 5 (0 until the chapter modules are rewritten)")
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --enable-logging=stderr --v=0 --virtual-time-budget=6000 --dump-dom http://localhost:8765/ 2>&1 | grep -E "CONSOLE|data-fill-(total|mismatches|errors)"
# screenshot (headless Chrome has a ~500px minimum window width, so check 375px by putting the page
# in a 375px-wide iframe on a wrapper page, or use DevTools device mode)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --virtual-time-budget=6000 --window-size=1280,900 --screenshot=out.png http://localhost:8765/
# no horizontal scroll: document.documentElement.scrollWidth must equal innerWidth at 375 and 1280
```
Also check by hand: keyboard-only through the controls (arrow keys move within a segmented control), Esc closes the tooltip, `prefers-reduced-motion`, dark mode, and the "Show the numbers" table of every figure.
