# Beyond the road toll (website)

Static D3 v7 data story in a newspaper data-investigation layout. No build step. D3 7.9.0 is vendored; the only external request is the Google Fonts stylesheet (Source Serif 4, Inter, Newsreader), with system-font fallbacks.

## Run locally
    python3 -m http.server 8765 --directory website
then open http://localhost:8765/. Opening index.html from disk will not work, because browsers block `fetch` of the CSVs.

## Chapters
- **Lede**: unit chart, people hospitalised per road death (2011 vs 2021).
- **1 The hidden road toll**: indexed lines, counts vs per person (`lines.js`).
- **2 Road injury is getting older**: change heatmap with "find yourself" and trend line (`heatmap.js`); severity by age (`severity.js`).
- **3 Not every crash is equal**: 3A paired bars with stepper Admissions / Bed days / Deaths in hospital (`burden.js`); 3B age dot plot with 95% whiskers, died per 1,000 / average stay (`agedots.js`); 3.3 counterparty dot list, all road users and pedestrians (`counterparty.js`).
- **4 The lockdown test**: 4A monthly line with 2015-19 band, All road users / Cyclists (`lockdown.js`); 4B diverging bars, April 2020 vs April 2019 (`diverging.js`); 4.3 cyclist trend with 95% prediction band (`trend.js`).
- **What to take away**, then the **Methods and limitations** box (`#about`).

## File map
- `index.html`: page, prose and figure furniture (title, subtitle, Source, Notes, hidden one-sentence summary per figure, "View the data" tables). Numbers marked `data-fill` are recomputed from the CSVs by `js/main.js`.
- `css/style.css`: design tokens (light and `prefers-color-scheme: dark`), layout, sticky chapter bar, key-points box, pull stat, methods box.
- `js/main.js`: loads the 16 CSVs, fills prose numbers, draws every chart (each wrapped so one failure shows a `.chart-error` note instead of breaking the page), redraws on resize and theme change.
- `js/nav.js`: active chapter in the sticky bar, plus a reading-progress line (off under `prefers-reduced-motion`).
- `js/charts/common.js`: shared helpers: colour tokens, formats, text wrap, hover/tap/keyboard tooltip, gridlines, annotations (moved below the chart as a numbered list under 600px), segmented controls, arrow-key chart reading, data tables.
- `js/charts/*.js`: one module per chart: `unit`, `lines`, `heatmap`, `severity`, `burden`, `agedots`, `counterparty`, `lockdown`, `diverging`, `trend`.
- `js/vendor/d3.min.js`: D3 7.9.0.
- `data/`: the CSVs used. Refresh from `data/clean/` with `sh processing/sync_website_data.sh`.

## Conventions
- Rates in Chapter 3 use the `*_publish` columns only (blank where a rate is flagged low-count); raw rate columns are never plotted.
- Every chart works by keyboard: Tab to the chart and use the arrow keys (Home/End also work); controls are buttons with `aria-pressed`, and arrow keys move between them.
- Below 600px, line charts switch to a 4:3 aspect with fewer ticks. Text is at least 12px and controls are at least 44px tall.

## Deploy to Swinburne Mercury
Copy the whole `website/` folder (all files, keeping the structure) into your Mercury web directory. All paths are relative.

## TODO
Replace `[Team names]` and the GitHub placeholder URL (`YOUR-ORG/YOUR-REPO`) in `index.html`; confirm the BITRE licence version.
