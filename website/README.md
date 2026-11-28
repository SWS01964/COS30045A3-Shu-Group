# Beyond the Road Toll: website

A static, single-page D3 v7 data story (COS30045). Plain HTML, CSS and JS: no build step, no CDN at runtime, all paths relative. Source of truth for layout is `report/LAYOUT_SPEC.md`; copy is `report/STORYBOARD.md` v2; numbers are traced in `data/processed/KEY_NUMBERS.md`.

## Structure
```
index.html            every block in LAYOUT_SPEC order; every figure is the figure-block component
css/tokens.css        :root tokens, light + dark (orchestrator)
css/base.css          reset, typography, focus rings, reduced motion (orchestrator)
css/layout.css        text column 680px, figure breakout 1040px at >= 960px, nav, hero, panels (orchestrator)
css/components.css    figure block, controls (>= 44px), tooltip, details/table (orchestrator)
css/ch1.css..ch5.css  one per chapter (chapter agents)
js/vendor/d3.min.js   D3 7.9.0 (local copy)
js/common.js          window.Viz: loader, formatters, tooltip, responsive, segmented, fillTable, tokens (orchestrator)
js/facts.js           window.Facts: data-fill registry + fillProse() (orchestrator)
js/main.js            boot: load data -> fillProse -> init figures -> scroll-spy (orchestrator)
js/charts/ch1..ch5.js one module per chapter registering window.Charts['fig-..'] (chapter agents)
data/*.csv            the 7 contract CSVs (copied by sync_data.sh)
sync_data.sh          copies data/processed/*.csv (7 contract files only) into data/
```

## Run locally
```
cd website
./sync_data.sh            # only after the CSVs change
python3 -m http.server 8000
# open http://localhost:8000/   (opening index.html as a file will not load the CSVs)
```

## FILE OWNERSHIP RULES
Chapter N (1 to 5) may edit **only**:
- `js/charts/chN.js`
- `css/chN.css` (scope every rule under `#chN`, or `#fig-Nx` for its figures)
- the inside of `<section id="chN">` in `index.html` (body copy, figure blocks, controls markup, notes, titles, `data-fill` spans)
- Chapter 1 also owns the inside of `<figure id="fig-1b">` in the hero.

**Not editable by chapter agents (orchestrator-owned):** `js/common.js`, `js/facts.js`, `js/main.js`, `css/tokens.css`, `css/base.css`, `css/layout.css`, `css/components.css`, the head/masthead/nav/closing/methods/downloads/footer parts of `index.html`, `sync_data.sh`, `data/`. Need a helper, a formatter, a token, or a new `data-fill` key? Send the orchestrator a change request (what and why, with the exact code for facts.js if it is a number). Do not fork a shared helper into your chapter file. Never add external requests, frameworks or new vendor files.

## Figure module interface
```js
window.Charts['fig-3a'] = {
  init(el, data) { /* el = the <figure class="fig" id="fig-3a">; data = all 7 CSVs */ },
  update(state) { /* optional: apply control state */ }
};
```
- `data` keys are the file names without `.csv`: `ch1_trend`, `ch2_age_roaduser`, `ch4_monthly`, `ch4_state_cyclists`, `ch5_first_nations_trend`, `ch5_first_nations_profile`, `severity`. Values are coerced: numbers, `"TRUE"/"FALSE"` to booleans, blank to `null`. Year columns keep their string keys (`row[2020]` works).
- Inside `el`: `.fig-title`, `.fig-controls` (buttons `data-value`, `aria-pressed`), `.fig-chart` (draw here; `role="img"` and its `aria-label` summary stay), `.fig-notes`, `details.fig-data` (fill with `Viz.fillTable`, rebuild when the view changes).
- Remove the `Viz.placeholder(...)` call when drawing the real chart. Keep the `fillTable` call (update its rows with the view).
- Size from the container: `Viz.responsive(el.querySelector('.fig-chart'), function (width) { ...draw... })`. It redraws on width change only (height-only changes are ignored), so do not set a CSS height on `.fig-chart`. `Viz.height(width, {ratio, min, max})` gives a height.
- Colours: use CSS tokens in styles (`.style('fill', 'var(--rise)')`) so dark mode follows automatically. `Viz.colors()` / `Viz.css('--rise')` are for colour interpolation; re-read in `Viz.onThemeChange`.
- Controls: `Viz.segmented(groupEl, { onChange(value) {} })` (aria-pressed, arrow keys). Selects: `change` listener.
- Tooltip: `Viz.tooltip.bind(d3selection, d => 'html')` (hover, tap, focus, Esc). Mark focusable marks by calling bind on them. It gives each mark `role="img"` and, if unnamed, an `aria-label` made from the tooltip text, and puts all marks of one chart on a single tab stop (arrow keys / Home / End move between them; pass `{roving: false}` to opt out, as the heatmap does).
- Accessibility plumbing (common.js): `.fig-chart` is `role="img"` while it has nothing focusable inside and is switched to `role="group"` (same `aria-label`) as soon as it holds focusable marks, by `Viz.a11y.watch` (started in main.js). Update the host's `aria-label` whenever the view changes. Announce user-driven changes with `Viz.announce(text)` (the page's single polite live region, `#viz-live`); `Viz.segmented` announces the chart's new label by itself (`announce: false` to opt out). Do not add `aria-live` nodes of your own.
- Motion: use `Viz.dur()` for transition length (0 under reduced motion). Formatters: `Viz.fmt.int/dp1/pct/signedPct/age`. Constants: `Viz.MAIN_ROAD_USERS`, `Viz.AGE_BANDS`, `Viz.MONTHS`. Row filter: `Viz.where(rows, {view:'age'})`, `Viz.find(...)`.
- One chart throwing is logged by `main.js` and does not stop the others.
- Shares (e.g. Chapter 3) = road-user row divided by the "All road users" row with the same view and category, computed in D3.
- Cited, not in the CSVs: First Nations population `Viz.CITED.fnPopulation` (2011, 2016, 2021).

## Prose numbers
Every number in body copy, standfirsts and What-to-know boxes is `<span data-fill="key">fallback</span>`. `facts.js` holds `key -> function(data)`; on load `Facts.fillProse` replaces the text and `console.warn`s `[facts] MISMATCH ...` if it differs from the fallback. Mismatch count is on `<html data-fill-mismatches>`. Years, thresholds and cited figures stay plain text.

## QA commands
```
# serve
cd website && python3 -m http.server 8765 &
# console + prose check (expect "0 mismatches, 0 errors; figures initialised: 14")
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --enable-logging=stderr --v=0 --virtual-time-budget=6000 --dump-dom http://localhost:8765/ 2>&1 | grep -E "CONSOLE|data-fill-(total|mismatches|errors)"
# screenshot (headless Chrome has a ~500px minimum window width, so check 375px by putting the page
# in a 375px-wide iframe on a wrapper page, or use DevTools device mode)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --virtual-time-budget=6000 --window-size=1280,900 --screenshot=out.png http://localhost:8765/
# no horizontal scroll: document.documentElement.scrollWidth must equal innerWidth at 375 and 1280
```
Also check by hand: keyboard-only through the controls (arrow keys move within a segmented control), Esc closes the tooltip, `prefers-reduced-motion`, dark mode, and the "Show the numbers" table of every figure.
