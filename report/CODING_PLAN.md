# Coding Plan — *Beyond the Road Toll*

One-page plan of how the Phase 1 site is put together, so another developer can see what data feeds what, which module draws what, what the shared constants are, and what remains.

## 1. Architecture

A **static site** — no build step, no CDN. `website/index.html` holds the prose and the empty chart containers. `website/js/main.js` loads six CSVs with `d3.csv`, fills every prose number marked `data-fill` (so the words and the charts are computed from the same source and cannot drift apart), then initialises four chart modules and sets up a debounced redraw on resize. D3 **7.9.0** is vendored at `js/vendor/d3.min.js`.

## 2. Data contract (six CSVs → charts)

| File | Key columns | Consumer | Notes |
|---|---|---|---|
| `idea1_rates.csv` | `year`, `hospitalisations`, `erp_total`, `hosp_per_100k`, `road_deaths`, `deaths_per_100k`, `hosp_per_death`, `series_break` | Unit chart, lines, prose | One row per year, 2011–2021 |
| `idea1_index_long.csv` | `year`, `series`, `value`, `index_2011` | Lines chart | `series` ∈ hospitalisations / population / road_deaths |
| `idea2_heatmap_change.csv` | `road_user`, `age_group`, `hosp_2011`, `hosp_2021`, `abs_change`, `pct_change`, `avg_2011_2013`, `avg_2019_2021`, `pct_change_3yr`, `low_count` | Heatmap, prose | 35 rows; the **3-yr values are the primary encoding** |
| `idea2_age_population_change.csv` | `age_group`, `erp_2011`, `erp_2021`, `pct_change_single`, `erp_avg_2011_2013`, `erp_avg_2019_2021`, `pct_change_3yr` | Heatmap per-person | 7 age groups |
| `idea2_roaduser_age_annual.csv` | `road_user`, `age_group`, `year`, `hospitalisations` | Heatmap trend line | 385 rows |
| `idea2_age_severity.csv` | `age_group`, `hosp_2016_2021`, `bed_days_excl_died_2016_2021`, `avg_stay_days_2016_2021`, `cases_2011_2019`, `died_2011_2019`, `died_per_1000_2011_2019` | Severity panels, prose | 7 age groups |

Refresh `website/data/` with `sh processing/sync_website_data.sh`.

## 3. Module map

| Module | File | Draws / owns |
|---|---|---|
| `Viz` (shared helpers) | `js/charts/common.js` | CSS-token reader, reduced-motion check, number formats (`fmtInt`, `signed`), `ageLabel`, SVG text `wrap`, the global `tip` tooltip, `debounce`, `fillTable` |
| `Charts.unit` | `js/charts/unit.js` | Chart 1B — unit chart of hospitalised people per road death (2011 vs 2021) |
| `Charts.lines` | `js/charts/lines.js` | Chart 1A — indexed line chart (2011=100), counts vs per-person modes, hover/keyboard year read-out |
| `Charts.heatmap` | `js/charts/heatmap.js` | Chart 2A — heatmap + legend + "find yourself" selectors + linked trend line |
| `Charts.severity` | `js/charts/severity.js` | Chart 2B — three aligned severity panels |
| `main.js` | `js/main.js` | Load CSVs → `fillProse` → initialise charts → debounced resize redraw |

## 4. Shared constants

- **CSS tokens** on `:root`: `--accent #b8470f` (rise/accent), `--blue #1f5f99` (fall/decrease), `--grey #6b7280`, `--bar #8796a8`, `--neutral #efece4`, `--ink #1c2230`, `--bg #faf8f3` (paper).
- **Breakpoints**: 600px (typography/finder), 560px (chart label logic), 479px (legend simplification).
- **Index convention**: 2011 = 100 everywhere.
- **Heatmap scale**: log-ratio `log2(1 + pct/100)`, symmetric domain **−60% … 0 … +150%**; `low_count` threshold ≈ 30 cases.
- **Formatting**: `Viz.fmtInt` (comma grouping), `Viz.signed` (true minus sign), `Viz.ageLabel` (en-dash in age ranges).

## 5. Interaction event map

- **Toggle click** (`[data-lines-mode]`, `[data-hm-mode]`) → set `mode` → re-render geometry + prose + `aria-pressed`.
- **Finder select change** (`#sel-user`, `#sel-age`) → `setSel` → redraw heatmap + trend + sentence + tables.
- **Heatmap cell** click / Enter / Space → `setSel`; pointer/focus → tooltip.
- **Line chart** pointer move/down → nearest-year tooltip; Left/Right arrows step years; Esc/blur dismisses.
- **Resize** → `Viz.debounce` (200ms) → redraw all charts; ignore address-bar height changes.

## 6. Remaining backlog

- **P0 (required for final):** replace `[Team names]` / GitHub / licence placeholders; downloadable processed CSV; accessibility audit; usability fixes from the evaluation.
- **P1 (if scope):** sex/remoteness filters; URL-addressable state; guided tour.
- **P2 (Phase 2 chapters):** RQ3 road-user/counterparty severity; RQ4 COVID monthly faceting; RQ5 equity (blocked until the First Nations validation gap is resolved).

## 7. QA plan

`node --check` on each JS file; all assets return 200; headless render at 375 / 768 / 1280px; all `data-fill` values populated; 5 SVGs present (unit, lines, heatmap, trend, severity); no console errors; no page-level horizontal overflow; a keyboard-only walkthrough; reduced-motion check; data-table spot check.

## 8. Deployment

Copy the whole `website/` folder to Mercury, keeping the structure (all paths are relative). Test from a phone; keep `python3 -m http.server` as a local fallback. *(Deployment is next, not done.)*
